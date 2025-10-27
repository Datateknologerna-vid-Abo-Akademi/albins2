import note from "../assets/note.svg";
import albin from "../assets/Albin.svg";

const Albin = () => {
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

    return (
        <div className="albin">
            <div className="albin__notes" aria-hidden="true">
                {notes}
            </div>
            <img src={albin} className="albin__logo" alt="Albins logotype" loading="eager" />
        </div>
    );
};

export default Albin;
