import note from "../assets/note.svg";
import albin from "../assets/Albin.svg";

const Albin = () => {
    return (
        <div className="albin">
            <img src={note} className="note" alt="note"/>
            <img src={note} className="note" alt="note" style={{animationDelay: '-1s'}}/>
            <img src={note} className="note" alt="note" style={{animationDelay: '-2s'}}/>
            <img src={note} className="note" alt="note" style={{animationDelay: '-3s'}}/>
            <img src={note} className="note" alt="note" style={{animationDelay: '-4s'}}/>
            <object data={albin} type="image/svg+xml" aria-label="logo">
            </object>
        </div>
    );
}

export default Albin;