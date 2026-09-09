  import { useEffect, useState, useMemo } from "react";
  import {
    FaBath,
    FaBed,
    FaEnvelope,
    FaMapMarkerAlt,
    FaPhone,
    FaRegFrownOpen,
    FaSearch,
    FaStar,
    FaUsers,
    FaWhatsapp
  } from "react-icons/fa";

  import { Link, useLocation } from "react-router-dom";
import Navbar from "../components/Navbar";
import JogjaFilterCard from "../components/JogjaFilterCard";
import { useLang } from "../context/LanguageContext";
import API_BASE_URL from "../config";
import "./css/Villas.css";

  /* KOMPONEN FOOTER */
  function Footer() {
    const { t } = useLang();
    return (
      <footer className="footer-container">
        <div className="footer-content">
          <div className="footer-section footer-left">
            <h2>jogjavilla.id</h2>
            <span>Jogja Tourism</span>
            <p>{t("footer_tagline")}</p>
          </div>
          <div className="footer-section footer-center">
            <h3>{t("footer_contact")}</h3>
            <p><FaEnvelope /> info@jogjavilla.id</p>
            <p><FaPhone /> +62 812-3456-7890</p>
          </div>
          <div className="footer-section footer-right">
            <h3>{t("footer_follow")}</h3>
            <div className="social-icons">
              <span className="social-icon">IG</span>
              <span className="social-icon">FB</span>
            </div>
          </div>
        </div>
        <div className="footer-divider" />
        <div className="footer-bottom">
          &copy; 2026 jogjavilla.id. {t("footer_rights")}
        </div>
      </footer>
    );
  }

  const SkeletonCard = () => (
    <div className="skeleton-card">
      <div className="skeleton-img pulse"></div>
      <div className="skeleton-info">
        <div className="skeleton-line pulse" style={{ width: '80%' }}></div>
        <div className="skeleton-line pulse" style={{ width: '60%' }}></div>
        <div className="skeleton-line pulse" style={{ width: '40%' }}></div>
      </div>
    </div>
  );

  const JOGJA_SPOT_COORDS = {
  "Malioboro": { lat: -7.7926, lng: 110.3658 },
  "Candi Prambanan": { lat: -7.7520, lng: 110.4915 },
  "Pantai Parangtritis": { lat: -8.0253, lng: 110.3297 },
  "HeHa Sky View": { lat: -7.8492, lng: 110.4789 },
  "Tugu Jogja": { lat: -7.7829, lng: 110.3671 },
  "Keraton Yogyakarta": { lat: -7.8053, lng: 110.3642 },
  "Taman Sari": { lat: -7.8101, lng: 110.3592 },
  "Tebing Breksi": { lat: -7.7816, lng: 110.5046 },
  "Obelix Hills": { lat: -7.7955, lng: 110.5147 },
  "Kaliurang": { lat: -7.5960, lng: 110.4288 },
  "Alun-Alun Kidul": { lat: -7.8118, lng: 110.3633 },
  "Hutan Pinus Mangunan": { lat: -7.9254, lng: 110.4320 },
  "Goa Pindul": { lat: -7.9304, lng: 110.6481 },
  "Pantai Indrayanti": { lat: -8.1504, lng: 110.6125 },
  "Bukit Bintang": { lat: -7.8427, lng: 110.4612 },
  "Candi Ratu Boko": { lat: -7.7705, lng: 110.4893 },
  "Benteng Vredeburg": { lat: -7.8003, lng: 110.3661 },
  "Studio Alam Gamplong": { lat: -7.7963, lng: 110.2289 },
  "HeHa Ocean View": { lat: -8.1251, lng: 110.4187 },
  "Pantai Timang": { lat: -8.1741, lng: 110.6622 },
  "Pantai Glagah": { lat: -7.9103, lng: 110.0768 },
  "Candi Sambisari": { lat: -7.7624, lng: 110.4471 },
  "Candi Plaosan": { lat: -7.7419, lng: 110.5034 },
  "Puncak Becici": { lat: -7.9108, lng: 110.4371 },
  "Obelix Sea View": { lat: -8.0315, lng: 110.3458 },
  "Sungai Mudal": { lat: -7.7712, lng: 110.1165 },
  "Lava Tour Merapi": { lat: -7.6083, lng: 110.4462 },
  "Kebun Teh Nglinggo": { lat: -7.6321, lng: 110.1481 },
  "Gembira Loka Zoo": { lat: -7.8038, lng: 110.3975 }
};

const getVillaCoords = (villa) => {
  const loc = ((villa.location || "") + " " + (villa.name || "")).toLowerCase();
  
  if (loc.includes("malioboro")) return { lat: -7.792, lng: 110.365 };
  if (loc.includes("sambisari")) return { lat: -7.762, lng: 110.447 };
  if (loc.includes("nayan") || loc.includes("siji")) return { lat: -7.775, lng: 110.435 };
  if (loc.includes("condongcatur") || loc.includes("seturan") || loc.includes("depok")) return { lat: -7.758, lng: 110.402 };
  if (loc.includes("bodeh") || loc.includes("omah sawah")) return { lat: -7.785, lng: 110.320 };
  if (loc.includes("pakem") || loc.includes("kaliurang") || loc.includes("padi") || loc.includes("roemah oetara")) return { lat: -7.625, lng: 110.420 };
  if (loc.includes("seruma") || loc.includes("renajan") || loc.includes("pondok gajah") || loc.includes("sardan")) return { lat: -7.860, lng: 110.365 };
  if (loc.includes("magelang") || loc.includes("sumbing") || loc.includes("bhuni") || loc.includes("maz ale")) return { lat: -7.470, lng: 110.210 };
  if (loc.includes("pangandaran")) return { lat: -7.696, lng: 108.650 };
  if (loc.includes("banjarnegara") || loc.includes("dieng")) return { lat: -7.200, lng: 109.900 };
  if (loc.includes("sleman")) return { lat: -7.720, lng: 110.360 };
  if (loc.includes("bantul")) return { lat: -7.890, lng: 110.330 };
  
  return { lat: -7.797, lng: 110.370 };
};

const calculateDistanceKm = (lat1, lon1, lat2, lon2) => {
  const R = 6371;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
            Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
            Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
};

function Villas() {
    const location = useLocation();
    const { t } = useLang();
    const params = new URLSearchParams(location.search);
    const locationQuery = params.get("location") || "";
    const guestQuery = params.get("guests") || "";
    const bedsQuery = params.get("beds") || "";

    const [villas, setVillas] = useState([]);
    const [loading, setLoading] = useState(true);
    const [sort, setSort] = useState("recommended");
    const [search, setSearch] = useState(locationQuery);
    const [type, setType] = useState("all");
    const [guestFilter, setGuestFilter] = useState(guestQuery);
    const [bedsFilter, setBedsFilter] = useState(bedsQuery);
    const [selectedSpot, setSelectedSpot] = useState("");
    const [radiusFilter, setRadiusFilter] = useState(10);
    const [checkInDate, setCheckInDate] = useState("");
    const [duration, setDuration] = useState("");
    const [isScrolled, setIsScrolled] = useState(false);

    useEffect(() => {
      const handleScroll = () => setIsScrolled(window.scrollY > 50);
      window.addEventListener("scroll", handleScroll);
      return () => window.removeEventListener("scroll", handleScroll);
    }, []);

    useEffect(() => {
  fetch(`${API_BASE_URL}/api/villas`, {
    cache: "force-cache"
  })
    .then(res => {
      if (!res.ok) throw new Error();
      return res.json();
    })
    .then(data => {
      setVillas(data);
      setLoading(false);
    })
    .catch(err => {
      console.error("ERROR FETCH:", err);
      setLoading(false);
    });
}, []);

    const getMaxGuests = (guestStr) => {
      if (!guestStr) return 0;
      const str = String(guestStr);
      const numbers = str.match(/\d+/g);
      if (!numbers) return 0;
      return Math.max(...numbers.map(Number));
    };

    const handleResetAll = () => {
      setSearch("");
      setType("all");
      setGuestFilter("");
      setBedsFilter("");
      setSelectedSpot("");
      setRadiusFilter(10);
      setCheckInDate("");
      setDuration("");
      setSort("recommended");
    };

    const filtered = villas.filter(villa => {
      const maxCapacity = getMaxGuests(villa.guests);
      const roomCount = parseInt(villa.room_count || villa.beds || 1, 10);

      // Search text query
      const matchSearch = !search ||
        (villa.name || "").toLowerCase().includes(search.toLowerCase()) ||
        (villa.location || "").toLowerCase().includes(search.toLowerCase()) ||
        (villa.description || "").toLowerCase().includes(search.toLowerCase());

      // Type filter (All, Villa, Homestay, Pool, Promo)
      const villaType = (villa.type || "").toLowerCase();
      const matchType = type === "all" ||
        (type === "promo" && (villa.promo === 1 || villa.promo === true)) ||
        (type === "pool" && ((villa.facilities || "") + (villa.description || "")).toLowerCase().includes("pool")) ||
        villaType.includes(type);

      // URL query guest filter & card guest filter
      const matchGuestUrl = !guestQuery || maxCapacity >= parseInt(guestQuery, 10);
      let matchGuestCard = true;
      if (guestFilter) {
        const targetGuest = parseInt(guestFilter, 10);
        if (targetGuest <= 2) matchGuestCard = maxCapacity >= 1;
        else if (targetGuest <= 5) matchGuestCard = maxCapacity >= 3;
        else if (targetGuest <= 10) matchGuestCard = maxCapacity >= 6;
        else matchGuestCard = maxCapacity >= 10;
      }

      // URL query beds filter & card beds filter
      const matchBedsUrl = !bedsQuery || roomCount >= parseInt(bedsQuery, 10);
      const matchBedsCard = !bedsFilter || roomCount >= parseInt(bedsFilter, 10);

      // Spot Wisata Precise Radius Matching
      let matchSpot = true;
      if (selectedSpot) {
        const spotCoords = JOGJA_SPOT_COORDS[selectedSpot];
        if (spotCoords) {
          const villaCoords = getVillaCoords(villa);
          const dist = calculateDistanceKm(spotCoords.lat, spotCoords.lng, villaCoords.lat, villaCoords.lng);
          villa._distanceToSpot = dist.toFixed(1);
          matchSpot = dist <= radiusFilter;
        } else {
          const sLower = selectedSpot.toLowerCase();
          const vLoc = ((villa.location || "") + " " + (villa.name || "")).toLowerCase();
          matchSpot = vLoc.includes(sLower);
        }
      }

      return matchSearch && matchType && matchGuestUrl && matchGuestCard && matchBedsUrl && matchBedsCard && matchSpot;
    });

    const sorted = useMemo(() => {

  return [...filtered].sort((a, b) => {

    if (sort === "low")
      return a.price - b.price;

    if (sort === "high")
      return b.price - a.price;

    return b.rating - a.rating;

  });

}, [filtered, sort]);

    const guestOptions = [
      { value: "1", key: "guest_2", label: t("guest_2") },
      { value: "2", key: "guest_2", label: t("guest_2") },
      { value: "3", key: "guest_3", label: t("guest_3") },
      { value: "4", key: "guest_4", label: t("guest_4") },
      { value: "5", key: "guest_5", label: t("guest_5") },
      { value: "6", key: "guest_6", label: t("guest_6") },
      { value: "7", key: "guest_7", label: t("guest_7") },
      { value: "8", key: "guest_8", label: t("guest_8") },
      { value: "9", key: "guest_9", label: t("guest_9") },
      { value: "10", key: "guest_10", label: t("guest_10") },
      { value: "11", key: "guest_11", label: t("guest_11") },
      { value: "12", key: "guest_12", label: t("guest_12") },
      { value: "13", key: "guest_13", label: t("guest_13") },
      { value: "14", key: "guest_14", label: t("guest_14") },
      { value: "15", key: "guest_15", label: t("guest_15") },
      { value: "16", key: "guest_15plus", label: t("guest_15plus") },
      { value: "21", key: "guest_20plus", label: t("guest_20plus") },
    ];

    return (
      <div className="villa-page">
        <Navbar scrolled={isScrolled} />

        <header className="villas-hero">
          <div className="hero-content">
            <h1>{t("villas_hero_title")}</h1>
            <p>{t("villas_hero_sub")}</p>
            <div className="search-bar-modern">
              <FaSearch className="search-icon-inside" />
              <input
                type="text"
                placeholder={t("villas_search_placeholder")}
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
          </div>
        </header>

        <main className="container">
          {/* JOGJA FILTER CARD (MATCHING SS ATTRACTIONS & FILTER STYLE) */}
          <JogjaFilterCard
            sort={sort}
            setSort={setSort}
            guestFilter={guestFilter}
            setGuestFilter={setGuestFilter}
            bedsFilter={bedsFilter}
            setBedsFilter={setBedsFilter}
            selectedSpot={selectedSpot}
            setSelectedSpot={setSelectedSpot}
            radiusFilter={radiusFilter}
            setRadiusFilter={setRadiusFilter}
            checkInDate={checkInDate}
            setCheckInDate={setCheckInDate}
            duration={duration}
            setDuration={setDuration}
            onReset={handleResetAll}
          />

          {/* TYPE FILTER PILLS */}
          <div className="filter-wrapper">
            <div className="type-pills">
              {["all", "villa", "homestay", "pool", "promo"].map((t_type) => (
                <button
                  key={t_type}
                  className={type === t_type ? "pill active" : "pill"}
                  onClick={() => setType(t_type)}
                >
                  {t_type.charAt(0).toUpperCase() + t_type.slice(1)}
                </button>
              ))}
            </div>

            <div className="dropdown-filters">
              <select value={guestFilter} onChange={(e) => setGuestFilter(e.target.value)}>
                <option value="">{t("filter_capacity")}</option>
                {guestOptions.slice(1).map((opt, i) => (
                  <option key={i} value={opt.value}>{opt.label}</option>
                ))}
              </select>

              <select value={sort} onChange={(e) => setSort(e.target.value)}>
                <option value="recommended">{t("filter_sort")}</option>
                <option value="low">{t("sort_low")}</option>
                <option value="high">{t("sort_high")}</option>
              </select>
            </div>
          </div>

          {/* GRID */}
          <section className="villa-grid">
            {loading ? (
              Array(6).fill(0).map((_, i) => <SkeletonCard key={i} />)
            ) : sorted.length === 0 ? (
              <div className="no-results">
                <FaRegFrownOpen size={50} />
                <h3>{t("no_results_title")}</h3>
                <p>{t("no_results_desc")}</p>
                <button onClick={handleResetAll}>{t("reset_filter")}</button>
              </div>
            ) : (
              sorted.map((villa) => (
                <div className="luxury-card" key={villa.id}>
                  <Link to={`/villas/${villa.id}`} className="card-link-wrapper">
                    <div className="card-image">
                      <img
    loading="lazy"
    decoding="async"
    fetchPriority="low"
    src={`/images/villas/villa_${villa.id}/utama.png`}
    alt={villa.name}
    onError={(e) => {
        e.target.style.display = "none";
    }}
/>
                      {villa.promo === 1 && <div className="badge-promo">Special Offer</div>}
                      <div className="card-rating"><FaStar /> {villa.rating}</div>
                    </div>

                    <div className="card-details">
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '4px' }}>
                        <span className="villa-type-label">{villa.type}</span>
                        {selectedSpot && villa._distanceToSpot && (
                          <span style={{ fontSize: '11px', background: '#fff7ed', color: '#ea580c', border: '1px solid #ffedd5', padding: '2px 8px', borderRadius: '12px', fontWeight: '600' }}>
                            📍 {villa._distanceToSpot} km dari {selectedSpot}
                          </span>
                        )}
                      </div>
                      <h3>{villa.name}</h3>
                      <p className="loc"><FaMapMarkerAlt /> {villa.location}</p>
                      <div className="amenities">
                        <span><FaUsers /> {villa.guests} {t("tamu")}</span>
                        <span><FaBed /> {villa.beds} {t("bed")}</span>
                        <span><FaBath /> {villa.baths} {t("bath")}</span>
                      </div>
                    </div>
                  </Link>

                  <div className="card-footer-action" style={{ padding: '0 24px 24px 24px' }}>
                    <div className="card-footer" style={{ borderTop: '1px solid #eee', paddingTop: '15px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <div className="price-tag">
                        <span style={{ fontSize: '13px', color: '#888', fontStyle: 'italic' }}>{t("price_varies")}</span>
                        <Link to={`/villas/${villa.id}`} style={{ display: 'block', fontSize: '13px', color: '#0d6efd', fontWeight: '600', textDecoration: 'none', marginTop: '2px' }}>
                          {t("check_price")}
                        </Link>
                      </div>
                      {villa.catalog_link && (
                        <a
                          href={villa.catalog_link}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="wa-catalog-btn"
                          style={{ display: 'flex', alignItems: 'center', gap: '6px', backgroundColor: '#25D366', color: '#fff', padding: '8px 12px', borderRadius: '6px', textDecoration: 'none', fontWeight: 'bold', fontSize: '14px' }}
                        >
                          <FaWhatsapp /> Katalog
                        </a>
                      )}
                    </div>
                  </div>
                </div>
              ))
            )}
          </section>
        </main>

        <Footer />
      </div>
    );
  }

  export default Villas;