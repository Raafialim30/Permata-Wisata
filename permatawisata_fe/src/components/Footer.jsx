import { FaEnvelope, FaPhone } from "react-icons/fa";
import "./Footer.css";

function Footer() {
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
              Your trusted partner for villa and homestay bookings in Jogja. 
              Experience comfort and natural beauty.
            </p>
          </div>

          {/* Kolom Kontak */}
          <div className="pw-footer-section">
            <h3>Contact Us</h3>
            <div className="pw-contact-item">
              <FaEnvelope className="pw-icon" /> 
              <span>info@jogjavilla.id</span>
            </div>
            <div className="pw-contact-item">
              <FaPhone className="pw-icon" /> 
              <span>+62 812-3456-7890</span>
            </div>
          </div>

          {/* Kolom Social Media */}
          <div className="pw-footer-section">
            <h3>Follow Us</h3>
            <div className="pw-social">
              <span className="pw-dot"></span>
              <span className="pw-dot"></span>
            </div>
          </div>

        </div>

        <hr className="pw-divider" />

        <div className="pw-bottom">
          © 2026 jogjavilla.id. All rights reserved.
        </div>
      </div>
    </footer>
  );
}

export default Footer;