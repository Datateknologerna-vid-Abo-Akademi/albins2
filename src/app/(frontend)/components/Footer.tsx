import { useRouter } from "next/navigation";

const Footer = () => {
    const router = useRouter();

    return (
        <div className="footer">
            <button className="footer-nav" onClick={() => router.push("/categories")}>Categories</button>
            <button className="footer-nav" onClick={() => router.push("/search")}>Search</button>
        </div>
    );
};

export default Footer;
