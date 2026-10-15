type PaginationControlsProps = {
    currentPage: number;
    totalPages: number;
    onNext: () => void;
    onPrev: () => void;
    onSelectPage: (page: number) => void;
};

const PaginationControls = ({
    currentPage,
    totalPages,
    onNext,
    onPrev,
    onSelectPage,
}: PaginationControlsProps) => {
    const buildPageItems = () => {
        const pages = new Set<number>();
        pages.add(1);
        pages.add(totalPages);
        pages.add(currentPage);

        if (currentPage - 1 >= 1) {
            pages.add(currentPage - 1);
        }

        if (currentPage + 1 <= totalPages) {
            pages.add(currentPage + 1);
        }

        const sortedPages = Array.from(pages).sort((a, b) => a - b);

        const items: Array<{ type: "page"; value: number } | { type: "ellipsis"; key: string }> = [];

        sortedPages.forEach((page, index) => {
            if (index > 0) {
                const previous = sortedPages[index - 1];
                if (page - previous > 1) {
                    items.push({
                        type: "ellipsis",
                        key: `ellipsis-${previous}-${page}`,
                    });
                }
            }

            items.push({ type: "page", value: page });
        });

        return items;
    };

    if (totalPages <= 1) {
        return null;
    }

    return (
        <div className="pagination-controls">
            <button
                className="nav-button"
                onClick={onPrev}
                disabled={currentPage === 1}
                aria-label="Previous page"
            >
                ←
            </button>
            <div className="pagination-pages">
                {buildPageItems().map((item) => {
                    if (item.type === "ellipsis") {
                        return (
                            <span key={item.key} className="page-ellipsis" aria-hidden="true">
                                …
                            </span>
                        );
                    }

                    const pageNumber = item.value;

                    return (
                        <button
                            key={pageNumber}
                            className={`page-button ${currentPage === pageNumber ? "active" : ""}`}
                            onClick={() => onSelectPage(pageNumber)}
                            aria-label={`Go to page ${pageNumber}`}
                        >
                            {pageNumber}
                        </button>
                    );
                })}
            </div>
            <button
                className="nav-button"
                onClick={onNext}
                disabled={currentPage === totalPages}
                aria-label="Next page"
            >
                →
            </button>
        </div>
    );
};

export default PaginationControls;
