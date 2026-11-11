import { Link, NavLink, useLocation } from "react-router-dom";
import { useLang } from "../context/LanguageContext";
import { useState } from "react";
import { FaBars, FaTimes } from "react-icons/fa";
import "./css/Navbar.css";

function Navbar({ scrolled = false }) {
    const { lang, toggleLang, t } = useLang();
    const [isOpen, setIsOpen] = useState(false);
    
    // Menggunakan useLocation untuk mengecek rute halaman aktif saat ini
    const location = useLocation();
    const currentPath = location.pathname;

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
                {/* Home / Beranda */}
                <NavLink
                    to="/"
                    end
                    className={({ isActive }) =>
                        `nav-item ${isActive ? "active" : ""}`
                    }
                    onClick={() => setIsOpen(false)}
                >
                    {t("nav_home")}
                </NavLink>

                {/* Villa (Aktif juga jika di sub-halaman /villas/1, dll) */}
                <NavLink
                    to="/villas"
                    className={({ isActive }) =>
                        `nav-item ${isActive || currentPath.startsWith("/villas") ? "active" : ""}`
                    }
                    onClick={() => setIsOpen(false)}
                >
                    {t("nav_villas")}
                </NavLink>

                {/* Cek Pesanan / Success */}
                <NavLink
                    to="/success"
                    className={({ isActive }) =>
                        `nav-item ${isActive || currentPath.startsWith("/success") ? "active" : ""}`
                    }
                    onClick={() => setIsOpen(false)}
                >
                    {t("nav_orders")}
                </NavLink>

                {/* Tombol Kontak WA */}
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