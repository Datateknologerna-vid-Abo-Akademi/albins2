import { useNavigate } from "react-router-dom";

const Footer = () => {
    const navigate = useNavigate();

    return (
        <div className="footer">
            <button className="footer-nav" onClick={() => navigate("/categories")}>Categories</button>
            <button className="footer-nav" onClick={() => navigate("/search")}>Search</button>
        </div>
    );
};

export default Footer;
