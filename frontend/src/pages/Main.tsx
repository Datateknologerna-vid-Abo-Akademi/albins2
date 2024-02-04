const Main = ({ onBackClick }: {onBackClick: () => void}) => {
    const backarrowstyle: React.CSSProperties = {
        position: "absolute",
        top: "0",
        left: "0",
        fontSize: "3rem",
        color: "white",
        cursor: "pointer",
        background: "transparent",
        border: "none"
    };
    return (
        <div>
            <button className={"back"} onClick={onBackClick} style={backarrowstyle}>
                <i className="las la-arrow-circle-left"></i>
            </button>
            <h1 style={{marginTop: "10vh"}}>Search bar and songs go here</h1>
        </div>
    );
}

export default Main;