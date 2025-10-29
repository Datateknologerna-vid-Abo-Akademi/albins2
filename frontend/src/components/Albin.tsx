import { AnimationEvent, useEffect, useRef, useState } from "react";
import note from "../assets/note.svg";
import albin from "../assets/Albin.svg";

type AlbinProps = {
    onFall?: () => void;
};

const Albin = ({ onFall }: AlbinProps) => {
    const [isFlipping, setIsFlipping] = useState(false);
    const [isFalling, setIsFalling] = useState(false);
    const clickTrackerRef = useRef<{
        count: number;
        lastTimestamp: number;
        timeoutId: ReturnType<typeof window.setTimeout> | null;
    }>({
        count: 0,
        lastTimestamp: 0,
        timeoutId: null,
    });
    const flipCountRef = useRef(0);

    useEffect(() => {
        const tracker = clickTrackerRef.current;
        return () => {
            const { timeoutId } = tracker;
            if (timeoutId) {
                window.clearTimeout(timeoutId);
            }
        };
    }, []);

    const notes = Array.from({ length: 5 }, (_, index) => (
        <img
            key={index}
            src={note}
            className="note"
            alt=""
            aria-hidden="true"
            style={{ animationDelay: `${-index * 0.8}s` }}
        />
    ));

    const triggerFlip = () => {
        if (isFlipping || isFalling) {
            return;
        }
        const nextFlipCount = flipCountRef.current + 1;

        if (nextFlipCount >= 10) {
            flipCountRef.current = nextFlipCount;
            setIsFlipping(false);
            setIsFalling(true);
            onFall?.();
            return;
        }

        flipCountRef.current = nextFlipCount;
        setIsFlipping(true);
    };

    const handleLogoClick = () => {
        if (isFalling) {
            return;
        }
        const now = window.performance.now();
        const tapWindowMs = 600;
        const tracker = clickTrackerRef.current;

        if (tracker.timeoutId) {
            window.clearTimeout(tracker.timeoutId);
            tracker.timeoutId = null;
        }

        if (now - tracker.lastTimestamp > tapWindowMs) {
            tracker.count = 1;
        } else {
            tracker.count += 1;
        }

        tracker.lastTimestamp = now;

        if (tracker.count >= 3) {
            triggerFlip();
            tracker.count = 0;
            return;
        }

        tracker.timeoutId = window.setTimeout(() => {
            tracker.count = 0;
            tracker.timeoutId = null;
        }, tapWindowMs);
    };

    const handleLogoAnimationEnd = (event: AnimationEvent<HTMLImageElement>) => {
        if (event.animationName === "albin-logo-flip") {
            setIsFlipping(false);
        }
    };

    return (
        <div className="albin">
            <div className="albin__notes" aria-hidden="true">
                {notes}
            </div>
            <img
                src={albin}
                className={
                    isFalling
                        ? "albin__logo albin__logo--fall"
                        : isFlipping
                        ? "albin__logo albin__logo--flip"
                        : "albin__logo"
                }
                alt="Albins logotype"
                loading="eager"
                onClick={handleLogoClick}
                onAnimationEnd={handleLogoAnimationEnd}
            />
        </div>
    );
};

export default Albin;
