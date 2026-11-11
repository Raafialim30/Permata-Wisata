import { FaEnvelope, FaPhone } from "react-icons/fa";
import { Link } from "react-router-dom";
import { useLang } from "../context/LanguageContext";
import "./css/Footer.css";

function Footer() {
  const { t } = useLang();

  return (
    <footer className="pw-footer">
      <div className="pw-footer-wrapper">
        <div className="pw-footer-content">
          
          {/* Kolom Branding */}
          <div className="pw-footer-section">
            <img
              src="/images/logo-jogjavilla.png"
              alt="jogjavilla.id"
              className="footer-logo-img"
            />
            <p className="pw-brand-desc">
              {t("footer_tagline")}
            </p>
          </div>

          {/* Kolom Kontak & Navigasi */}
          <div className="pw-footer-section">
            <h3>{t("footer_contact")}</h3>
            <div className="pw-contact-item">
              <FaEnvelope className="pw-icon" /> 
              <span>info@jogjavilla.id</span>
            </div>
            <div className="pw-contact-item" style={{ marginBottom: "12px" }}>
              <FaPhone className="pw-icon" /> 
              <span>+62 812-3456-7890</span>
            </div>

            {/* Link Tulis Ulasan / Rating */}
            <div className="pw-contact-item">
              <Link 
                to="/review" 
                style={{ 
                  color: "#f59e0b", 
                  fontWeight: "bold", 
                  textDecoration: "none", 
                  fontSize: "0.9rem",
                  display: "inline-flex",
                  alignItems: "center",
                  gap: "6px"
                }}
              >
                ⭐ Tulis Ulasan / Rating
              </Link>
            </div>
          </div>

          {/* Kolom Social Media */}
          <div className="pw-footer-section">
            <h3>{t("footer_follow")}</h3>
            <div className="pw-social">
              <span className="pw-dot"></span>
              <span className="pw-dot"></span>
            </div>
          </div>

        </div>

        <hr className="pw-divider" />

        <div className="pw-bottom">
          © 2026 jogjavilla.id. {t("footer_rights")}
        </div>
      </div>
    </footer>
  );
}

export default Footer;