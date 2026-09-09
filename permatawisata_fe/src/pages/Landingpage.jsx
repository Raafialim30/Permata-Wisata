import { useEffect, useState } from "react";
import AOS from "aos";
import "aos/dist/aos.css";

import {
  FaBath,
  FaDoorOpen,
  FaCalendarAlt,
  FaClock,
  FaMapMarkerAlt,
  FaSearch,
  FaShieldAlt,
  FaStar,
  FaUsers
} from "react-icons/fa";

import { Link, useNavigate } from "react-router-dom";

import heroImage from "../assets/herovilla1.jpg";
import Footer from "../components/Footer";
import Navbar from "../components/Navbar";
import { useLang } from "../context/LanguageContext";
import API_BASE_URL from "../config";
import "./css/Landingpage.css";

function Landingpage() {
  const navigate = useNavigate();
  const { t } = useLang();

  const [location, setLocation] = useState("");
  const [guests, setGuests] = useState("2");
  const [beds, setBeds] = useState("");

  const [villas, setVillas] = useState([]);
  const [loading, setLoading] = useState(true);
  const [testimonials, setTestimonials] = useState([]);
  const [loadingTestimonial, setLoadingTestimonial] = useState(true);
  const [isScrolled, setIsScrolled] = useState(false);
  const [recentlyViewed, setRecentlyViewed] = useState([]);

  useEffect(() => {
    AOS.init({ duration: 1000, once: true });

    const handleScroll = () => setIsScrolled(window.scrollY > 50);
    window.addEventListener("scroll", handleScroll);

    fetch(`${API_BASE_URL}/api/villas`)
      .then(res => { if (!res.ok) throw new Error(); return res.json(); })
      .then(data => { setVillas(data); setLoading(false); })
      .catch(() => setLoading(false));

    // fetch(`${API_BASE_URL}/api/testimonials`)
    //   .then(res => { if (!res.ok) throw new Error(); return res.json(); })
    //   .then(data => { setTestimonials(data); setLoadingTestimonial(false); })
    //   .catch(() => setLoadingTestimonial(false));

    // Sembunyikan dummy review untuk sementara persiapan hosting
    setTestimonials([]);
    setLoadingTestimonial(false);

    try {
      const saved = localStorage.getItem("recentlyViewedVillas");
      if (saved) setRecentlyViewed(JSON.parse(saved));
    } catch (e) { console.error(e); }

    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  const handleSearch = () => {
    navigate(`/villas?location=${location}&guests=${guests}${beds ? `&beds=${beds}` : ""}`);
  };

  const handleClearHistory = () => {
    localStorage.removeItem("recentlyViewedVillas");
    setRecentlyViewed([]);
  };

  const formatTimeAgo = (timestamp) => {
    if (!timestamp) return "";
    const seconds = Math.floor((new Date() - timestamp) / 1000);
    let interval = seconds / 86400;
    if (interval >= 1) return Math.floor(interval) + " days ago";
    interval = seconds / 3600;
    if (interval >= 1) return Math.floor(interval) + " hours ago";
    interval = seconds / 60;
    if (interval >= 1) return Math.floor(interval) + " minutes ago";
    return "just now";
  };

  // Guest options keyed by translation
  const guestOptions = [
    { value: "2", key: "guest_2" },
    { value: "3", key: "guest_3" },
    { value: "4", key: "guest_4" },
    { value: "5", key: "guest_5" },
    { value: "6", key: "guest_6" },
    { value: "7", key: "guest_7" },
    { value: "8", key: "guest_8" },
    { value: "9", key: "guest_9" },
    { value: "10", key: "guest_10" },
    { value: "11", key: "guest_11" },
    { value: "12", key: "guest_12" },
    { value: "13", key: "guest_13" },
    { value: "14", key: "guest_14" },
    { value: "15", key: "guest_15" },
    { value: "16", key: "guest_15plus" },
    { value: "21", key: "guest_20plus" },
  ];

  return (
    <div className="landing">

      {/* NAVBAR */}
      <Navbar scrolled={isScrolled} />

      {/* HERO SECTION */}
      <section className="hero" style={{ backgroundImage: `url(${heroImage})` }}>
        <div className="hero-overlay">
          <h1 data-aos="zoom-in">{t("hero_title")}</h1>
          <p data-aos="fade-up" data-aos-delay="200">{t("hero_subtitle")}</p>

          <div className="search-box" data-aos="fade-up" data-aos-delay="400">
            <div className="search-item">
              <label><FaMapMarkerAlt /> {t("search_location")}</label>
              <input
                placeholder={t("search_location_placeholder")}
                value={location}
                onChange={(e) => setLocation(e.target.value)}
              />
            </div>

            <div className="search-item">
              <label><FaCalendarAlt /> {t("search_checkin")}</label>
              <input type="date" />
            </div>

            <div className="search-item">
              <label><FaCalendarAlt /> {t("search_checkout")}</label>
              <input type="date" />
            </div>

            <div className="search-item">
              <label><FaUsers /> {t("search_guests")}</label>
              <select value={guests} onChange={(e) => setGuests(e.target.value)}>
                {guestOptions.map(opt => (
                  <option key={opt.value} value={opt.value}>{t(opt.key)}</option>
                ))}
              </select>
            </div>

            <div className="search-item">
              <label><FaDoorOpen /> {t("search_beds")}</label>
              <select value={beds} onChange={(e) => setBeds(e.target.value)}>
                <option value="">{t("search_beds_all")}</option>
                <option value="1">1 {t("search_beds")}</option>
                <option value="2">2 {t("search_beds")}</option>
                <option value="3">3 {t("search_beds")}</option>
                <option value="4">4 {t("search_beds")}</option>
                <option value="5">5+ {t("search_beds")}</option>
              </select>
            </div>

            <button className="search-btn" onClick={handleSearch}>
              <FaSearch /> {t("search_btn")}
            </button>
          </div>
        </div>
      </section>

      {/* RECENTLY VIEWED */}
      {recentlyViewed.length > 0 && (
        <section className="recent" data-aos="fade-right">
          <div className="container">
            <div className="recent-header">
              <h3>{t("recently_viewed")}</h3>
              <span className="clear" onClick={handleClearHistory} style={{ cursor: "pointer" }}>{t("clear_history")}</span>
            </div>
            <div className="recent-cards-container" style={{ display: "flex", gap: "20px", flexWrap: "wrap", marginTop: "15px" }}>
              {recentlyViewed.map(villa => (
                <Link
                  to={`/villas/${villa.id}`}
                  key={villa.id}
                  style={{ textDecoration: 'none', color: 'inherit', flex: "1 1 300px", maxWidth: "400px" }}
                >
                  <div className="recent-card" style={{ display: "flex", alignItems: "center", gap: "15px", backgroundColor: "#fff", border: "1px solid #eaeaea", borderRadius: "10px", padding: "10px", boxShadow: "0 2px 5px rgba(0,0,0,0.05)" }}>
                    <img src={villa.img} alt={villa.name} style={{ width: "90px", height: "90px", objectFit: "cover", borderRadius: "8px" }} />
                    <div className="recent-info">
                      <h4 style={{ margin: "0 0 5px 0", fontSize: "1.05rem", color: "#333", display: "-webkit-box", WebkitLineClamp: 1, WebkitBoxOrient: "vertical", overflow: "hidden" }}>{villa.name}</h4>
                      <p style={{ margin: "0 0 5px 0", fontSize: "0.85rem", color: "#666" }}>max. {villa.guests} {t("tamu")}</p>
                      <span className="price" style={{ fontWeight: "bold", color: "#2ece7a", fontSize: "0.95rem" }}>From Rp {villa.price?.toLocaleString()}</span>
                      <small style={{ display: "block", marginTop: "5px", fontSize: "0.75rem", color: "#999" }}>Viewed {formatTimeAgo(villa.viewedAt)}</small>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* STATS */}
      <section className="stats">
        <div className="container">
          <div className="stat" data-aos="fade-up" data-aos-delay="100"><h2>120+</h2><p>{t("stat_villas")}</p></div>
          <div className="stat" data-aos="fade-up" data-aos-delay="200"><h2>5K+</h2><p>{t("stat_guests")}</p></div>
          <div className="stat" data-aos="fade-up" data-aos-delay="300"><h2>4.9</h2><p>{t("stat_rating")}</p></div>
          <div className="stat" data-aos="fade-up" data-aos-delay="400"><h2>24/7</h2><p>{t("stat_support")}</p></div>
        </div>
      </section>

      {/* HOW IT WORKS */}
      <section className="how">
        <div className="container">
          <h2 data-aos="fade-down">{t("how_title")}</h2>
          <p className="how-subtitle" data-aos="fade-down">{t("how_subtitle")}</p>
          <div className="how-container">
            <div className="how-card" data-aos="flip-left" data-aos-delay="100"><div className="how-icon">🔍</div><h3>{t("how_step1_title")}</h3><p>{t("how_step1_desc")}</p></div>
            <div className="how-card" data-aos="flip-left" data-aos-delay="200"><div className="how-icon">📅</div><h3>{t("how_step2_title")}</h3><p>{t("how_step2_desc")}</p></div>
            <div className="how-card" data-aos="flip-left" data-aos-delay="300"><div className="how-icon">💳</div><h3>{t("how_step3_title")}</h3><p>{t("how_step3_desc")}</p></div>
            <div className="how-card" data-aos="flip-left" data-aos-delay="400"><div className="how-icon">🏡</div><h3>{t("how_step4_title")}</h3><p>{t("how_step4_desc")}</p></div>
          </div>
        </div>
      </section>

      {/* WHY CHOOSE US */}
      <section className="why">
        <div className="container">
          <h2 data-aos="fade-up">{t("why_title")}</h2>
          <div className="why-container">
            <div className="why-card" data-aos="zoom-in-up" data-aos-delay="100"><div className="why-icon"><FaShieldAlt /></div><h3>{t("why_1_title")}</h3><p>{t("why_1_desc")}</p></div>
            <div className="why-card" data-aos="zoom-in-up" data-aos-delay="200"><div className="why-icon"><FaStar /></div><h3>{t("why_2_title")}</h3><p>{t("why_2_desc")}</p></div>
            <div className="why-card" data-aos="zoom-in-up" data-aos-delay="300"><div className="why-icon"><FaClock /></div><h3>{t("why_3_title")}</h3><p>{t("why_3_desc")}</p></div>
          </div>
        </div>
      </section>

      {/* FEATURED VILLAS */}
      <section className="villas">
        <div className="container">
          <div className="villa-header" data-aos="fade-right">
            <div>
              <h2>{t("featured_title")}</h2>
              <p>{t("featured_subtitle")}</p>
            </div>
            <Link to="/villas" className="view-btn">{t("view_all")}</Link>
          </div>

          <div className="villa-container" style={{ display: "flex", justifyContent: "center", flexWrap: "wrap", gap: "25px", margin: "0 auto", width: "100%" }}>
            {loading ? (
              <p style={{ textAlign: "center", width: "100%", padding: "40px 0" }}>Memuat data villa...</p>
            ) : villas.length === 0 ? (
              <p style={{ textAlign: "center", width: "100%", padding: "40px 0" }}>Tidak ada data villa ditemukan di database.</p>
            ) : (
              villas.slice(0, 3).map((villa, index) => (
                <Link
                  to={`/villas/${villa.id}`}
                  key={villa.id}
                  className="villa-card-link"
                  style={{ textDecoration: "none", color: "inherit", display: "flex" }}
                >
                  <div
                    className="villa-card"
                    data-aos="fade-up"
                    data-aos-delay={index * 100}
                    style={{ width: "280px", display: "flex", flexDirection: "column", height: "100%", minHeight: "420px", boxSizing: "border-box" }}
                  >
                    <div className="villa-img" style={{ height: "170px", overflow: "hidden" }}>
                      <img
                        src={`/images/villas/villa_${villa.id}/utama.png`}
                        alt={villa.name}
                        style={{ width: "100%", height: "100%", objectFit: "cover" }}
                        onError={(e) => { e.target.style.display = 'none'; }}
                      />
                      <span className="badge green">Available</span>
                    </div>
                    <div className="villa-info" style={{ padding: "15px", flexGrow: 1, display: "flex", flexDirection: "column", justifyContent: "space-between" }}>
                      <div>
                        <h3 style={{ fontSize: "1.05rem", marginBottom: "6px", minHeight: "44px", display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden" }}>{villa.name}</h3>
                        <p className="location" style={{ fontSize: "0.85rem", marginBottom: "10px" }}><FaMapMarkerAlt /> {villa.location}</p>
                        <div className="villa-spec" style={{ fontSize: "0.8rem", gap: "8px", marginBottom: "10px" }}>
                          <span><FaUsers /> {villa.guests} {t("tamu")}</span>
                          <span><FaDoorOpen /> {villa.beds} {t("search_beds")}</span>
                          <span><FaBath /> {villa.baths} {t("bath")}</span>
                        </div>
                        <p className="rating" style={{ fontSize: "0.85rem", marginBottom: "10px" }}><FaStar className="star" /> {villa.rating}</p>
                      </div>
                      <div className="price-row" style={{ paddingTop: "10px", borderTop: "1px solid #f0f0f0" }}>
                        <div>
                          <h4 style={{ fontSize: "1rem" }}>Rp {villa.price?.toLocaleString()}</h4>
                          <span style={{ fontSize: "0.75rem" }}>{t("per_night")}</span>
                        </div>
                        <button className="book-btn" style={{ padding: "6px 12px", fontSize: "0.85rem" }}>{t("book_now")}</button>
                      </div>
                    </div>
                  </div>
                </Link>
              ))
            )}
          </div>
        </div>
      </section>

      {/* TESTIMONIALS */}
      <section className="testimonial" data-aos="zoom-out" style={{ width: "100%", overflow: "hidden" }}>
        <div className="container" style={{ display: "flex", flexDirection: "column", alignItems: "center", width: "100%" }}>
          <h2>{t("testimonial_title")}</h2>
          <p className="testimonial-sub">{t("testimonial_sub")}</p>

          <div className="testimonial-slider" style={{ display: "flex", alignItems: "center", justifyContent: "center", width: "100%", maxWidth: "1200px", position: "relative" }}>
            <button className="slider-btn left" onClick={() => { document.querySelector(".testimonial-track").scrollBy({ left: -320, behavior: "smooth" }); }}>‹</button>
            <div className="testimonial-track" style={{ display: "flex", gap: "20px", overflowX: "auto", scrollBehavior: "smooth", padding: "20px 10px", width: "100%", justifyContent: "center" }}>
              {loadingTestimonial ? (
                <p style={{ textAlign: "center", width: "100%" }}>Memuat ulasan...</p>
              ) : testimonials.length === 0 ? (
                <p style={{ textAlign: "center", width: "100%" }}>Belum ada ulasan saat ini.</p>
              ) : (
                testimonials.map((testi) => (
                  <div className="testimonial-card" key={testi.id} style={{ flex: "0 0 290px", maxWidth: "290px", boxSizing: "border-box" }}>
                    <p>"{testi.comment}"</p>
                    <h4>{testi.name}</h4>
                    <span>{"⭐".repeat(testi.rating)}</span>
                  </div>
                ))
              )}
            </div>
            <button className="slider-btn right" onClick={() => { document.querySelector(".testimonial-track").scrollBy({ left: 320, behavior: "smooth" }); }}>›</button>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="cta" data-aos="zoom-in">
        <div className="cta-icon"><FaMapMarkerAlt /></div>
        <h2>{t("cta_title")}</h2>
        <p>{t("cta_desc")}</p>
        <Link to="/villas"><button>{t("cta_btn")}</button></Link>
      </section>

      <Footer />
    </div>
  );
}

export default Landingpage;