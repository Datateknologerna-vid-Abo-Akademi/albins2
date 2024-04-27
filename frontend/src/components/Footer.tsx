const Footer = () => {

    const handleLeftButton = () => {
        console.log("Left button clicked");
    }

    const HandleRightButton = () => {
        console.log("Right button clicked");
    }

    return (
        <div className="footer">
          <button className="footer-nav" onClick={handleLeftButton}>Home</button>
          <button className="footer-nav" onClick={HandleRightButton}>Search</button>
        </div>
    );
}

export default Footer;
