import { useCallback, useEffect, useRef, useState, type CSSProperties, type TouchEvent } from "react";
import { useNavigate, useParams } from "react-router-dom";
import Footer from "../components/Footer";
import "../styles/song.css";
import { fetchCategories, getCachedCategories } from "../services/categoryClient";
import type { CategoryWithSongs, SongSummary } from "../services/categoryClient";

interface SongDetail {
    id: number;
    title: string;
    author: string | null;
    melody: string | null;
    content: string | null;
    categoryId: number | null;
    categoryName: string;
    page_number: number | null;
    negative_page_number: number | null;
}

type OrderedSongDetail = SongDetail & {
    categoryOrder: number;
    categoryPosition: number;
    songPosition: number;
    songOrder: number;
};

const normalisedValue = (value: number | null | undefined): number => value ?? Number.MAX_SAFE_INTEGER;

const toSongDetail = (song: SongSummary, category: CategoryWithSongs): SongDetail => ({
    id: song.id,
    title: song.title,
    author: song.author,
    melody: song.melody,
    content: song.content,
    categoryId: category.id,
    categoryName: category.name,
    page_number: song.page_number ?? null,
    negative_page_number: song.negative_page_number ?? null,
});

const buildOrderedSongDetails = (categories: CategoryWithSongs[] | null): OrderedSongDetail[] => {
    if (!categories) {
        return [];
    }

    const ordered: OrderedSongDetail[] = [];
    categories.forEach((category, categoryPosition) => {
        const categoryOrder = normalisedValue(category.order);
        category.songs?.forEach((song, songPosition) => {
            ordered.push({
                ...toSongDetail(song, category),
                categoryOrder,
                categoryPosition,
                songPosition,
                songOrder: normalisedValue(song.order),
            });
        });
    });

    const usePageOrder = ordered.some((song) => song.page_number !== null);

    return ordered.sort((a, b) => {
        if (usePageOrder) {
            const pageComparison = normalisedValue(a.page_number) - normalisedValue(b.page_number);
            if (pageComparison !== 0) {
                return pageComparison;
            }
        }

        if (a.categoryOrder !== b.categoryOrder) {
            return a.categoryOrder - b.categoryOrder;
        }

        if (a.categoryPosition !== b.categoryPosition) {
            return a.categoryPosition - b.categoryPosition;
        }

        if (a.songOrder !== b.songOrder) {
            return a.songOrder - b.songOrder;
        }

        if (a.songPosition !== b.songPosition) {
            return a.songPosition - b.songPosition;
        }

        return a.title.localeCompare(b.title);
    });
};

const getSongWindow = (ordered: OrderedSongDetail[], centerIndex: number, radius: number): {
    songs: OrderedSongDetail[];
    startIndex: number;
} => {
    const start = Math.max(centerIndex - radius, 0);
    const end = Math.min(centerIndex + radius + 1, ordered.length);
    return {
        songs: ordered.slice(start, end),
        startIndex: start,
    };
};

const Song = () => {
    const { id } = useParams();
    const navigate = useNavigate();
    const [song, setSong] = useState<SongDetail | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [nextSong, setNextSong] = useState<SongDetail | null>(null);
    const [prevSong, setPrevSong] = useState<SongDetail | null>(null);
    const [swipeOffset, setSwipeOffset] = useState(0);
    const [isDragging, setIsDragging] = useState(false);
    const [isAdvancing, setIsAdvancing] = useState(false);
    const [isTransitionLocked, setIsTransitionLocked] = useState(false);
    const [advanceDirection, setAdvanceDirection] = useState<"prev" | "next" | null>(null);
    const [animationStartOffset, setAnimationStartOffset] = useState(0);
    const stackRef = useRef<HTMLDivElement | null>(null);
    const [stackWidth, setStackWidth] = useState(360);
    const swipeStartRef = useRef<number | null>(null);
    const swipeStartYRef = useRef<number | null>(null);
    const swipeDeltaRef = useRef(0);
    const advanceTimeoutRef = useRef<number | null>(null);
    const transitionUnlockFrameRef = useRef<number | null>(null);
    const isVerticalScrollRef = useRef(false);
    const WINDOW_RADIUS = 2;
    const [prevSongBuffer, setPrevSongBuffer] = useState<SongDetail | null>(null);
    const [nextSongBuffer, setNextSongBuffer] = useState<SongDetail | null>(null);
    const PEEK_PERCENT = 12;
    const idlePercent = 100 - PEEK_PERCENT;
    const PEEK_EDGE_PERCENT = 5;
    const PEEK_PARALLAX_FACTOR = PEEK_EDGE_PERCENT / idlePercent;
    const PEEK_SCALE = 0.96;
    const travelDistance = Math.max(stackWidth * (idlePercent / 100), 160);
    const SWIPE_THRESHOLD = Math.min(120, travelDistance * 0.3);

    useEffect(() => {
        const songId = Number(id);
        if (!songId) {
            navigate("/");
            return;
        }

        const auth = JSON.parse(localStorage.getItem("auth") ?? "{}");

        if (!auth?.token) {
            console.error("No authentication token found");
            navigate("/");
            return;
        }

        let cancelled = false;

        const updateFromCategories = (categoriesData: CategoryWithSongs[] | null, finalAttempt: boolean) => {
            if (!categoriesData) {
                return false;
            }

            const ordered = buildOrderedSongDetails(categoriesData);
            const centerIndex = ordered.findIndex((item) => item.id === songId);
            if (centerIndex !== -1) {
                const centerSong = ordered[centerIndex];
                setSong(centerSong);
                setError(null);
                setNextSong(ordered[centerIndex + 1] ?? null);
                setPrevSong(ordered[centerIndex - 1] ?? null);
                const window = getSongWindow(ordered, centerIndex, WINDOW_RADIUS);
                setPrevSongBuffer(ordered[centerIndex - 2] ?? window.songs[0] ?? null);
                setNextSongBuffer(ordered[centerIndex + 2] ?? window.songs[window.songs.length - 1] ?? null);
                return true;
            }

            if (finalAttempt) {
                setSong(null);
                setError("No song found.");
                setNextSong(null);
                setPrevSong(null);
                setPrevSongBuffer(null);
                setNextSongBuffer(null);
            }

            return false;
        };

        const cachedCategories = getCachedCategories();
        const hasCachedSong = updateFromCategories(cachedCategories, false);
        setIsLoading(!hasCachedSong);

        (async () => {
            try {
                const categories = await fetchCategories(auth.token);
                if (cancelled) return;

                const found = updateFromCategories(categories, true);
                if (!found) {
                    setNextSong(null);
                    setPrevSong(null);
                }
                setIsLoading(false);
            } catch (err) {
                console.error("Fetching categories failed:", err);
                if (cancelled) return;
                if (!hasCachedSong) {
                    setError("Failed to load song.");
                    setIsLoading(false);
                    setNextSong(null);
                    setPrevSong(null);
                }
            }
        })();

        return () => {
            cancelled = true;
        };
    }, [id, navigate]);

    useEffect(() => {
        return () => {
            if (advanceTimeoutRef.current) {
                window.clearTimeout(advanceTimeoutRef.current);
            }
            if (transitionUnlockFrameRef.current !== null) {
                window.cancelAnimationFrame(transitionUnlockFrameRef.current);
            }
        };
    }, []);

    useEffect(() => {
        const updateWidth = () => {
            if (stackRef.current) {
                setStackWidth(Math.max(stackRef.current.offsetWidth, 1));
            }
        };
        updateWidth();
        window.addEventListener("resize", updateWidth);
        return () => window.removeEventListener("resize", updateWidth);
    }, []);

    useEffect(() => {
        setIsDragging(false);
        setIsAdvancing(false);
        setAdvanceDirection(null);
        setIsTransitionLocked(true);
        swipeStartRef.current = null;
        swipeStartYRef.current = null;
        swipeDeltaRef.current = 0;
        isVerticalScrollRef.current = false;
        setSwipeOffset(0);

        if (transitionUnlockFrameRef.current !== null) {
            window.cancelAnimationFrame(transitionUnlockFrameRef.current);
            transitionUnlockFrameRef.current = null;
        }

        transitionUnlockFrameRef.current = window.requestAnimationFrame(() => {
            setIsTransitionLocked(false);
            transitionUnlockFrameRef.current = null;
        });
    }, [id]);

    const finishSwipe = useCallback((targetOffset = 0) => {
        setSwipeOffset(targetOffset);
        setIsDragging(false);
        swipeStartRef.current = null;
        swipeStartYRef.current = null;
        swipeDeltaRef.current = 0;
    }, []);

    const requestNavigation = useCallback(
        (direction: "prev" | "next"): boolean => {
            if (isAdvancing) {
                return false;
            }
            const target = direction === "prev" ? prevSong : nextSong;
            if (!target) {
                return false;
            }

            // Store the exact current visual state for the animation start point
            setAnimationStartOffset(swipeOffset);
            setIsAdvancing(true);
            setAdvanceDirection(direction);
            
            // We do NOT call finishSwipe with travelDistance anymore.
            // Instead, we let the Render loop switch to "Shuffle Mode".
            
            advanceTimeoutRef.current = window.setTimeout(() => {
                navigate(`/song/${target.id}`);
            }, 500); // Wait for the 500ms shuffle animation
            isVerticalScrollRef.current = false;
            return true;
        },
        [isAdvancing, navigate, nextSong, prevSong, swipeOffset],
    );

    const handleTouchStart = (event: TouchEvent<HTMLElement>) => {
        if (event.touches.length !== 1 || isAdvancing) {
            return;
        }
        swipeStartRef.current = event.touches[0].clientX;
        swipeStartYRef.current = event.touches[0].clientY;
        swipeDeltaRef.current = 0;
        isVerticalScrollRef.current = false;
        setIsDragging(true);
    };

    const handleTouchMove = (event: TouchEvent<HTMLElement>) => {
        if (swipeStartRef.current === null || isAdvancing) {
            return;
        }

        const currentX = event.touches[0].clientX;
        const currentY = event.touches[0].clientY;
        const rawDelta = currentX - swipeStartRef.current;
        const verticalDelta = swipeStartYRef.current === null ? 0 : Math.abs(currentY - swipeStartYRef.current);
        if (!isVerticalScrollRef.current && verticalDelta > Math.abs(rawDelta) && verticalDelta > 8) {
            isVerticalScrollRef.current = true;
            finishSwipe(0);
            return;
        }

        if (isVerticalScrollRef.current) {
            return;
        }

        swipeDeltaRef.current = rawDelta;

        if (rawDelta === 0) {
            setSwipeOffset(0);
            return;
        }

        const hasTarget = rawDelta > 0 ? Boolean(prevSong) : Boolean(nextSong);
        let offset: number;

        if (hasTarget) {
            if (Math.abs(rawDelta) > travelDistance) {
                const overflow = Math.abs(rawDelta) - travelDistance;
                const resistance = 1 + overflow / (travelDistance * 0.5);
                offset = Math.sign(rawDelta) * (travelDistance + overflow / resistance);
            } else {
                offset = rawDelta;
            }
        } else {
            const resistance = 1 + Math.abs(rawDelta) / (travelDistance * 0.5);
            offset = Math.sign(rawDelta) * (Math.abs(rawDelta) / resistance);
        }

        const limit = hasTarget ? travelDistance * 1.1 : travelDistance / 4;
        const finalOffset = Math.sign(offset) * Math.min(Math.abs(offset), limit);
        setSwipeOffset(finalOffset);
    };

    const handleTouchEnd = () => {
        if (swipeStartRef.current === null || isAdvancing) {
            return;
        }

        if (isVerticalScrollRef.current) {
            finishSwipe(0);
            isVerticalScrollRef.current = false;
            return;
        }

        const delta = swipeDeltaRef.current;
        const shouldAdvancePrev = Boolean(prevSong && delta > SWIPE_THRESHOLD);
        const shouldAdvanceNext = Boolean(nextSong && delta < -SWIPE_THRESHOLD);
        if (shouldAdvancePrev) {
            requestNavigation("prev");
            return;
        }
        if (shouldAdvanceNext) {
            requestNavigation("next");
            return;
        }

        finishSwipe(0);
        isVerticalScrollRef.current = false;
    };

    const handleTouchCancel = () => {
        if (isAdvancing) {
            return;
        }
        finishSwipe(0);
        isVerticalScrollRef.current = false;
    };

    useEffect(() => {
        const handleKeyDown = (event: KeyboardEvent) => {
            if (event.defaultPrevented) return;

            const target = event.target as HTMLElement | null;
            if (target) {
                const tag = target.tagName;
                if (tag === "INPUT" || tag === "TEXTAREA" || target.isContentEditable) {
                    return;
                }
            }

            if (event.key === "ArrowLeft") {
                const handled = requestNavigation("prev");
                if (handled) {
                    event.preventDefault();
                }
            } else if (event.key === "ArrowRight") {
                const handled = requestNavigation("next");
                if (handled) {
                    event.preventDefault();
                }
            }
        };

        window.addEventListener("keydown", handleKeyDown);
        return () => {
            window.removeEventListener("keydown", handleKeyDown);
        };
    }, [requestNavigation]);

    if (isLoading && !song) {
        return (
            <div className="page-shell page-shell--centered song-page">
                <p className="empty-state">Loading…</p>
                <Footer />
            </div>
        );
    }

    if (error && !song) {
        return (
            <div className="page-shell page-shell--centered song-page">
                <p className="empty-state">{error}</p>
                <Footer />
            </div>
        );
    }

    if (!song) {
        return (
            <div className="page-shell page-shell--centered song-page">
                <p className="empty-state">No song found.</p>
                <Footer />
            </div>
        );
    }

    const renderSongBody = (songData: SongDetail, variant: "active" | "peek" = "active") => {
        const HeadingTag = variant === "peek" ? "h2" : "h1";
        return (
            <>
                <header className={`song-header${variant === "peek" ? " song-header--peek" : ""}`}>
                    {songData.page_number !== null && songData.negative_page_number !== null && (
                        <div className="song-page-number song-page-number--header" aria-hidden="true">
                            {songData.page_number}
                        </div>
                    )}
                    <HeadingTag>{songData.title}</HeadingTag>
                    <div className="song-meta">
                        {songData.author && <p><strong>Author:</strong> {songData.author}</p>}
                        <p><strong>Mel:</strong> {songData.melody || "Unknown"}</p>
                    </div>
                </header>
                <div className="song-lyrics" dangerouslySetInnerHTML={{ __html: songData.content || "" }} />
                {songData.page_number !== null && songData.negative_page_number === null && (
                    <div className="song-page-number" aria-label="Songbook page number">
                        {songData.page_number}
                    </div>
                )}
                {songData.negative_page_number !== null && (
                    <div className="song-page-number song-page-number--negative" aria-label="Flipped songbook page number">
                        {songData.negative_page_number}
                    </div>
                )}
            </>
        );
    };

    const swipeProgress = Math.min(Math.abs(swipeOffset) / travelDistance, 1);
    const offsetPercent = stackWidth ? (swipeOffset / stackWidth) * 100 : 0;
    const transitionsDisabled = isDragging || isTransitionLocked;
    
    // Default Styles (Interactive)
    let swipeStyle: CSSProperties & { [key: string]: string | number | undefined } = {
        transform: `translateX(${offsetPercent}%) scale(${1 - swipeProgress * 0.06}) rotate(${offsetPercent * 0.01}deg)`,
        transition: transitionsDisabled ? "none" : "transform 450ms cubic-bezier(0.16, 1, 0.3, 1), opacity 450ms ease",
        opacity: 1 - swipeProgress * 0.2,
        zIndex: 2,
        "--song-swipe-progress": swipeProgress.toString(),
    };

    const rightProgress = swipeOffset > 0 ? Math.min(swipeOffset / travelDistance, 1) : 0;
    const leftProgress = swipeOffset < 0 ? Math.min(-swipeOffset / travelDistance, 1) : 0;

    let prevPeekStyle: CSSProperties | undefined = prevSong
        ? {
              transform: `translateX(${-PEEK_EDGE_PERCENT + offsetPercent * PEEK_PARALLAX_FACTOR}%) scale(${PEEK_SCALE + (1 - PEEK_SCALE) * rightProgress})`,
              opacity: 0.15 + rightProgress * 0.85,
              transition: transitionsDisabled ? "none" : "transform 450ms cubic-bezier(0.16, 1, 0.3, 1), opacity 450ms ease",
              zIndex: rightProgress > 0.01 ? 5 : 1,
          }
        : undefined;

    let nextPeekStyle: CSSProperties | undefined = nextSong
        ? {
              transform: `translateX(${PEEK_EDGE_PERCENT + offsetPercent * PEEK_PARALLAX_FACTOR}%) scale(${PEEK_SCALE + (1 - PEEK_SCALE) * leftProgress})`,
              opacity: 0.15 + leftProgress * 0.85,
              transition: transitionsDisabled ? "none" : "transform 450ms cubic-bezier(0.16, 1, 0.3, 1), opacity 450ms ease",
              zIndex: leftProgress > 0.01 ? 5 : 1,
          }
        : undefined;

    // Shuffle Animation Overrides
    if (isAdvancing && advanceDirection) {
        // Set CSS Variables for the start position of the shuffle animation
        const startPercent = stackWidth ? (animationStartOffset / stackWidth) * 100 : 0;
        const distanceRatio = travelDistance ? Math.min(Math.abs(animationStartOffset) / travelDistance, 1) : 0;
        const startScale = 1 - distanceRatio * 0.06;
        const startRotate = startPercent * 0.01;
        
        // Active Card -> Shuffles Away
        swipeStyle = {
            ...swipeStyle,
            "--start-offset": `${startPercent}%`,
            "--start-scale": startScale.toString(),
            "--start-rotate": `${startRotate}deg`,
            // We don't set animation name here, we set class below.
            // But we must ensure transition is off so animation takes over instantly.
            transition: "none",
        };

        if (advanceDirection === "prev" && prevPeekStyle) {
            // Incoming (Prev) -> Moves to Center
            prevPeekStyle = {
                transform: "translateX(0) scale(1)",
                opacity: 1,
                zIndex: 10,
                transition: "transform 450ms cubic-bezier(0.16, 1, 0.3, 1), opacity 450ms ease",
            };
        } else if (advanceDirection === "next" && nextPeekStyle) {
             // Incoming (Next) -> Moves to Center
             nextPeekStyle = {
                transform: "translateX(0) scale(1)",
                opacity: 1,
                zIndex: 10,
                transition: "transform 450ms cubic-bezier(0.16, 1, 0.3, 1), opacity 450ms ease",
            };
        }
    }

    const prevIndicatorStyle: CSSProperties = {
        opacity: prevSong ? 0.3 + rightProgress * 0.7 : 0.3,
    };
    const nextIndicatorStyle: CSSProperties = {
        opacity: nextSong ? 0.3 + leftProgress * 0.7 : 0.3,
    };
   
    const renderPeekCard = (direction: "prev" | "next", data: SongDetail, style: CSSProperties | undefined) => {
        if (!style) return null;
        return (
            <article
                className={`song-container song-container--peek song-container--peek-${direction}`}
                style={style}
                aria-hidden="true"
            >
                {renderSongBody(data)}
            </article>
        );
    };

    const containerClassNames = [
        "song-container",
        "song-container--active",
        isDragging ? "song-container--dragging" : "",
        isAdvancing ? "song-container--advancing" : "",
        isAdvancing && advanceDirection === "prev" ? "song-container--shuffle-right" : "",
        isAdvancing && advanceDirection === "next" ? "song-container--shuffle-left" : "",
    ]
        .filter(Boolean)
        .join(" ");

    return (
        <div className="page-shell page-shell--centered song-page">
            <div className="song-stack" ref={stackRef}>
                {prevSong && renderPeekCard("prev", prevSong, prevPeekStyle)}
                <article
                    className={containerClassNames}
                    style={swipeStyle}
                    onTouchStart={handleTouchStart}
                    onTouchMove={handleTouchMove}
                    onTouchEnd={handleTouchEnd}
                    onTouchCancel={handleTouchCancel}
                >
                    {renderSongBody(song)}
                </article>
                {nextSong && renderPeekCard("next", nextSong, nextPeekStyle)}
                <div className="song-preload-cache" aria-hidden="true">
                    {[prevSongBuffer, nextSongBuffer].map((bufferSong) =>
                        bufferSong ? (
                            <article key={`preload-${bufferSong.id}`}>
                                {renderSongBody(bufferSong, "active")}
                            </article>
                        ) : null,
                    )}
                </div>
            </div>
            {prevSong && (
                <div className="song-next-indicator song-next-indicator--left" style={prevIndicatorStyle} aria-live="polite">
                    <p className="song-next-indicator__label">Swipe right for previous</p>
                    <p className="song-next-indicator__title">
                        {prevSong.title}
                        {typeof prevSong.page_number === "number" && (
                            <span className="song-next-indicator__page"> · Page {prevSong.page_number}</span>
                        )}
                    </p>
                </div>
            )}
            {nextSong && (
                <div className="song-next-indicator song-next-indicator--right" style={nextIndicatorStyle} aria-live="polite">
                    <p className="song-next-indicator__label">Swipe left for next</p>
                    <p className="song-next-indicator__title">
                        {nextSong.title}
                        {typeof nextSong.page_number === "number" && (
                            <span className="song-next-indicator__page"> · Page {nextSong.page_number}</span>
                        )}
                    </p>
                </div>
            )}
            <Footer />
        </div>
    );
};

export default Song;
