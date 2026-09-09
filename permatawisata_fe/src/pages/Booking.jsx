import { useEffect, useState, useRef } from "react";
import {
    FaCalendarAlt, FaEnvelope, FaFacebookF, FaInstagram,
    FaMapMarkerAlt, FaPhone, FaUsers
} from "react-icons/fa";
import { Link, useLocation, useNavigate } from "react-router-dom";
import Navbar from "../components/Navbar";
import { useLang } from "../context/LanguageContext";
import API_BASE_URL from "../config";
import "./css/Booking.css";

function Booking() {
    const location = useLocation();
    const navigate = useNavigate();
    const { t } = useLang();

    const data = location.state || {};
    const villa = data.villa || null;
    const selectedRoom = data.room || data.selectedRoom || null;
    const passedCheckInISO = data.checkInISO || "";
    const passedCheckOutISO = data.checkOutISO || "";

    const [checkIn, setCheckIn] = useState("");
    const [checkOut, setCheckOut] = useState("");
    const [guests, setGuests] = useState(2);
    const [fullName, setFullName] = useState("");
    const [email, setEmail] = useState("");
    const [whatsapp, setWhatsapp] = useState("");
    const [loading, setLoading] = useState(false);
    const [selectedAddons, setSelectedAddons] = useState({});

    const checkInInputRef = useRef(null);
    const checkOutInputRef = useRef(null);

    useEffect(() => {
        if (passedCheckInISO) setCheckIn(passedCheckInISO);
        if (passedCheckOutISO) setCheckOut(passedCheckOutISO);
    }, [passedCheckInISO, passedCheckOutISO]);

    const getNights = () => {
        if (!checkIn || !checkOut) return 0;
        const diffTime = new Date(checkOut).getTime() - new Date(checkIn).getTime();
        const diffDays = Math.round(diffTime / (1000 * 60 * 60 * 24));
        return diffDays > 0 ? diffDays : 0;
    };

    const handleAddonToggle = (addonId, isChecked) => {
        setSelectedAddons(prev => ({ ...prev, [addonId]: isChecked }));
    };

    const addonsTotalPerNight = (selectedRoom?.addons || []).reduce((total, addon) => {
        if (selectedAddons[addon.id]) {
            return total + Number(addon.price);
        }
        return total;
    }, 0);

    const pricePerNight = Number(selectedRoom?.price_raw || villa?.price) || 0;
    const nights = getNights();
    const roomTotal = nights * pricePerNight;
    const addonsTotal = nights * addonsTotalPerNight;
    const totalPrice = roomTotal + addonsTotal;
    const villaImage = villa?.img || "https://via.placeholder.com/300x200?text=No+Image";

    const handleIconClick = (ref) => {
        if (ref.current && typeof ref.current.showPicker === "function") ref.current.showPicker();
        else if (ref.current) ref.current.focus();
    };

    const handlePayment = async () => {
        if (!fullName || !email || !whatsapp || !checkIn || !checkOut) {
            alert("Harap lengkapi semua formulir!"); return;
        }
        const finalVillaId = villa?.id || data?.id;
        if (!finalVillaId) { alert("ID Villa tidak ditemukan."); return; }
        setLoading(true);
        const activeAddons = (selectedRoom?.addons || []).filter(a => selectedAddons[a.id]).map(a => a.name).join(", ");

        const bookingData = {
            villa_id: finalVillaId, villa_name: villa?.name || "Villa",
            room_name: selectedRoom?.bed_info || "", check_in: checkIn, check_out: checkOut,
            guests, full_name: fullName, email, whatsapp, total_price: totalPrice,
            payment_method: "Transfer Bank BCA", payment_type: "Manual", status: "Menunggu Pembayaran", villa_img: villaImage,
            addons_info: activeAddons
        };
        try {
            const response = await fetch(`${API_BASE_URL}/api/bookings`, {
                method: "POST", headers: { "Content-Type": "application/json" },
                body: JSON.stringify(bookingData)
            });
            const result = await response.json();
            if (response.ok) { 
                const paymentData = { ...bookingData, order_id: result.order_id, booking_id: result.booking_id };
                navigate("/payment", { state: { bookingData: paymentData, villa } }); 
            }
            else { alert("Gagal menyimpan: " + result.error); }
        } catch (error) { alert("Terjadi kesalahan koneksi ke server."); }
        finally { setLoading(false); }
    };

    return (
        <div className="booking-page">
            <Navbar />
            <div className="booking-header">
                <Link to="#" className="back-link" onClick={(e) => { e.preventDefault(); navigate(-1); }}>
                    {t("back_booking")}
                </Link>
                <h1>{t("booking_title")}</h1>
            </div>
            <div className="booking-container">
                <div className="booking-form">
                    <h3>{t("booking_details")}</h3>
                    <div className="form-row">
                        <div className="form-group">
                            <label onClick={() => handleIconClick(checkInInputRef)} style={{ cursor: "pointer" }}>
                                <FaCalendarAlt /> {t("checkin_label")}
                            </label>
                            <input type="date" ref={checkInInputRef} value={checkIn} onChange={(e) => setCheckIn(e.target.value)} />
                        </div>
                        <div className="form-group">
                            <label onClick={() => handleIconClick(checkOutInputRef)} style={{ cursor: "pointer" }}>
                                <FaCalendarAlt /> {t("checkout_label")}
                            </label>
                            <input type="date" ref={checkOutInputRef} value={checkOut} onChange={(e) => setCheckOut(e.target.value)} />
                        </div>
                    </div>
                    <div className="form-group">
                        <label><FaUsers /> {t("guests_label")}</label>
                        <input type="number" min="2" value={guests}
                            onChange={(e) => setGuests(e.target.value === "" ? "" : parseInt(e.target.value))} />
                    </div>

                    {selectedRoom && selectedRoom.addons && selectedRoom.addons.length > 0 && (
                        <div className="form-group addons-section">
                            <h3 className="contact-title" style={{ marginTop: "20px", marginBottom: "10px" }}>Layanan Tambahan (Opsional)</h3>
                            <div className="addons-list" style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
                                {selectedRoom.addons.map((addon) => (
                                    <label key={addon.id} style={{ display: "flex", alignItems: "center", gap: "10px", padding: "10px", border: "1px solid #ccc", borderRadius: "8px", cursor: "pointer" }}>
                                        <input 
                                            type="checkbox" 
                                            checked={!!selectedAddons[addon.id]} 
                                            onChange={(e) => handleAddonToggle(addon.id, e.target.checked)}
                                            style={{ width: "18px", height: "18px", cursor: "pointer" }}
                                        />
                                        <div style={{ flex: 1 }}>
                                            <div style={{ fontWeight: "bold" }}>{addon.name}</div>
                                            <div style={{ fontSize: "0.85rem", color: "#666" }}>{addon.description}</div>
                                        </div>
                                        <div style={{ fontWeight: "bold", color: "#27ae60" }}>
                                            + Rp {Number(addon.price).toLocaleString('id-ID')} <span style={{fontSize: "0.75rem", color: "#888", fontWeight: "normal"}}>/hari</span>
                                        </div>
                                    </label>
                                ))}
                            </div>
                        </div>
                    )}

                    <h3 className="contact-title" style={{ marginTop: "20px" }}>{t("contact_info")}</h3>
                    <div className="form-group">
                        <label>{t("fullname_label")}</label>
                        <input type="text" placeholder={t("fullname_placeholder")} value={fullName} onChange={(e) => setFullName(e.target.value)} />
                    </div>
                    <div className="form-group">
                        <label><FaEnvelope /> Email</label>
                        <input type="email" placeholder="email@example.com" value={email} onChange={(e) => setEmail(e.target.value)} />
                    </div>
                    <div className="form-group">
                        <label><FaPhone /> {t("whatsapp_label")}</label>
                        <input type="text" placeholder="+62..." value={whatsapp} onChange={(e) => setWhatsapp(e.target.value)} />
                    </div>
                    <button className="payment-btn" onClick={handlePayment} disabled={loading}>
                        {loading ? t("processing") : t("btn_continue")}
                    </button>
                </div>
                <div className="booking-summary">
                    <h3>{t("booking_summary")}</h3>
                    <div className="summary-card">
                        <img src={villaImage} alt={villa?.name} className="summary-img" />
                        <h4>{villa?.name || "Nama Villa"}</h4>
                        <p className="location"><FaMapMarkerAlt /> {villa?.location || "-"}</p>
                        <div className="summary-row"><span>{t("price_per_night_summary")}</span><span>Rp {pricePerNight.toLocaleString('id-ID')}</span></div>
                        {addonsTotalPerNight > 0 && (
                            <div className="summary-row"><span>Addon/hari</span><span>+ Rp {addonsTotalPerNight.toLocaleString('id-ID')}</span></div>
                        )}
                        <div className="summary-row"><span>{t("duration")}</span><span>{nights} {t("nights")}</span></div>
                        <hr />
                        <div className="summary-row total"><span>{t("total")}</span><span className="price">Rp {totalPrice.toLocaleString('id-ID')}</span></div>
                    </div>
                </div>
            </div>
            <footer className="footer-container">
                <div className="footer-content">
                    <div className="footer-section footer-left">
                        <img
                            src="/images/logo-jogjavilla.png"
                            alt="jogjavilla.id"
                            style={{ height: "44px", objectFit: "contain", marginBottom: "12px", filter: "brightness(0) invert(1)" }}
                        />
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
                            <span className="social-icon"><FaInstagram /></span>
                            <span className="social-icon"><FaFacebookF /></span>
                        </div>
                    </div>
                </div>
                <hr className="footer-divider" />
                <div className="footer-bottom">&copy; 2026 jogjavilla.id. {t("footer_rights")}</div>
            </footer>
        </div>
    );
}

export default Booking;