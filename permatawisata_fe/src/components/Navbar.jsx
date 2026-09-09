import { Link } from "react-router-dom";
import { useLang } from "../context/LanguageContext";
import { useState } from "react";
import { FaBars, FaTimes } from "react-icons/fa";
import "./css/Navbar.css";

function Navbar({ scrolled = false }) {
    const { lang, toggleLang, t } = useLang();
    const [isOpen, setIsOpen] = useState(false);

    return (
        <nav className={`navbar ${scrolled ? "scrolled" : ""}`}>
            <Link to="/" className="logo-link">
                <img
                    src="/images/logo-jogjavilla.png"
                    alt="jogjavilla.id"
                    className="nav-logo-img"
                />
            </Link>

            <button className="hamburger" onClick={() => setIsOpen(!isOpen)}>
                {isOpen ? <FaTimes /> : <FaBars />}
            </button>

            <div className={`nav-menu ${isOpen ? "active" : ""}`}>
                <Link to="/" onClick={() => setIsOpen(false)}>{t("nav_home")}</Link>
                <Link to="/villas" onClick={() => setIsOpen(false)}>{t("nav_villas")}</Link>
                <a
                    href="https://wa.me/6282355139595?text=Halo%20admin%20jogjavilla.id,%20saya%20ingin%20bertanya%20tentang%20villa"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="contact-btn"
                    onClick={() => setIsOpen(false)}
                >
                    {t("nav_contact")}
                </a>

                {/* LANGUAGE SWITCHER */}
                <div className="lang-switcher">
                    <button
                        className={`lang-btn ${lang === "id" ? "active" : ""}`}
                        onClick={() => toggleLang("id")}
                        title="Bahasa Indonesia"
                    >
                        🇮🇩 ID
                    </button>
                    <span className="lang-divider">|</span>
                    <button
                        className={`lang-btn ${lang === "en" ? "active" : ""}`}
                        onClick={() => toggleLang("en")}
                        title="English"
                    >
                        🇬🇧 EN
                    </button>
                </div>
            </div>
        </nav>
    );
}

export default Navbar;
