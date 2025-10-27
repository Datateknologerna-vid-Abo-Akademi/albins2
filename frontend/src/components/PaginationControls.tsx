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
                {Array.from({ length: totalPages }, (_, index) => {
                    const pageNumber = index + 1;
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
