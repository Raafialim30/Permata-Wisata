import { useEffect, useState, useRef } from "react";
import {
    FaArrowLeft,
    FaBath,
    FaBed,
    FaChevronLeft,
    FaChevronRight,
    FaClock,
    FaEnvelope,
    FaFacebookF,
    FaInstagram,
    FaMapMarkerAlt,
    FaPhone,
    FaUsers
} from "react-icons/fa";
import { useNavigate, useParams } from "react-router-dom";
import Navbar from "../components/Navbar";
import { useLang } from "../context/LanguageContext";
import API_BASE_URL from "../config";
import villaImageUrl, { handleVillaImageError } from "../utils/villaImageUrl";
import "./css/VillaDetail.css";

function VillaDetail() {
    const { id } = useParams();
    const navigate = useNavigate();
    const { t } = useLang();
    const sliderRef = useRef(null);

    const [villa, setVilla] = useState(null);
    const [selectedRoom, setSelectedRoom] = useState(null);
    const [checkIn, setCheckIn] = useState(null);
    const [checkOut, setCheckOut] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [reviews, setReviews] = useState([]);
    const [showAllNearby, setShowAllNearby] = useState(false);
    const [commissionRate, setCommissionRate] = useState(10);

    useEffect(() => {
        fetch(`${API_BASE_URL}/api/settings/commission`)
            .then(res => res.json())
            .then(data => {
                if (data.status === "success" && data.commission_rate !== undefined) {
                    setCommissionRate(Number(data.commission_rate));
                }
            })
            .catch(err => console.error("Gagal memuat komisi:", err));
    }, []);

    const getPublicPrice = (price) => {
        const base = Number(price) || 0;
        return Math.round(base * (1 + commissionRate / 100));
    };

    const currentYear = new Date().getFullYear();
    const [currentMonth, setCurrentMonth] = useState(new Date().getMonth());
    const [chosenYear, setChosenYear] = useState(currentYear);

    const monthNames = [
        "Januari", "Februari", "Maret", "April", "Mei", "Juni",
        "Juli", "Agustus", "September", "Oktober", "November", "Desember"
    ];

    const daysInMonth = new Date(chosenYear, currentMonth + 1, 0).getDate();
    const days = Array.from({ length: daysInMonth }, (_, i) => i + 1);

    const nearbyAttractions = [
        { name: "Maha Sky Batu Angkruk", dist: "± 3 min (1,0 km)" },
        { name: "Wisata bukit awan sikapuk", dist: "± 3 min (1,2 km)" },
        { name: "HeHa Sky View", dist: "± 10 min (4,5 km)" },
        { name: "Candi Prambanan", dist: "± 20 min (12 km)" },
        { name: "Malioboro", dist: "± 15 min (8 km)" },
        { name: "Taman Sari", dist: "± 18 min (9,5 km)" },
        { name: "Keraton Yogyakarta", dist: "± 17 min (9 km)" },
        { name: "Pantai Parangtritis", dist: "± 45 min (28 km)" },
        { name: "Tebing Breksi", dist: "± 25 min (15 km)" },
        { name: "Gua Pindul", dist: "± 60 min (40 km)" }
    ];

    useEffect(() => {
        fetch(`${API_BASE_URL}/api/villas/${id}`)
            .then(res => {
                if (!res.ok) {
                    throw new Error("Villa tidak ditemukan di database");
                }
                return res.json();
            })
            .then(data => {
                const facilitiesList = data.facilities ? data.facilities.split(',') : [];
                const otherFacilitiesList = data.other_facilities ? data.other_facilities.split(',') : [];
                const initialRoom = data.rooms && data.rooms.length > 0 ? data.rooms[0] : null;

                const defaultImages = (initialRoom && initialRoom.images && initialRoom.images.length > 0)
                    ? initialRoom.images
                    : (data.images && data.images.length > 0 ? data.images : [data.img]);

                const mappedVilla = {
                    ...data,
                    img: villaImageUrl(data.id || id, data.img),
                    images: defaultImages,
                    facilitiesList: facilitiesList,
                    otherFacilitiesArray: otherFacilitiesList
                };

                setVilla(mappedVilla);

                if (initialRoom) {
                    setSelectedRoom(initialRoom);
                }

                try {
                    const savedHistory = localStorage.getItem("recentlyViewedVillas");
                    let history = savedHistory ? JSON.parse(savedHistory) : [];
                    history = history.filter(v => v.id !== mappedVilla.id);

                    const villaToSave = {
                        id: mappedVilla.id,
                        name: mappedVilla.name,
                        guests: mappedVilla.guests || 10,
                        price: mappedVilla.price,
                        viewedAt: new Date().getTime(),
                        img: mappedVilla.img
                    };

                    history.unshift(villaToSave);
                    if (history.length > 3) {
                        history = history.slice(0, 3);
                    }
                    localStorage.setItem("recentlyViewedVillas", JSON.stringify(history));
                } catch (e) {
                    console.error("Gagal menyimpan history:", e);
                }

                fetch(`${API_BASE_URL}/api/reviews?villa_id=${id}`)
                    .then(res => res.json())
                    .then(rData => {
                        if (rData.status === "success") {
                            setReviews(rData.data);
                        }
                    })
                    .catch(err => console.error("Error fetching reviews", err));

                setLoading(false);
            })
            .catch(err => {
                console.error("Gagal memuat data detail:", err);
                setError(err.message);
                setLoading(false);
            });
    }, [id]);

    const handleRoomSelect = (room) => {
        setSelectedRoom(room);
        if (room && room.images && room.images.length > 0) {
            setVilla(prev => ({
                ...prev,
                images: room.images
            }));
        }
    };

    const handleDateClick = (day) => {
        const rawDate = new Date(chosenYear, currentMonth, day);

        const isoString = rawDate.getFullYear() + "-" +
            String(rawDate.getMonth() + 1).padStart(2, '0') + "-" +
            String(rawDate.getDate()).padStart(2, '0');

        const selectedFormattedDate = {
            day,
            month: currentMonth,
            year: chosenYear,
            displayString: `${day} ${monthNames[currentMonth]} ${chosenYear}`,
            rawDate: rawDate,
            isoString: isoString,
            timeValue: rawDate.getTime()
        };

        if (!checkIn) {
            setCheckIn(selectedFormattedDate);
        } else if (!checkOut) {
            if (selectedFormattedDate.timeValue > checkIn.timeValue) {
                setCheckOut(selectedFormattedDate);
            } else {
                setCheckIn(selectedFormattedDate);
                setCheckOut(null);
            }
        } else {
            setCheckIn(selectedFormattedDate);
            setCheckOut(null);
        }
    };

    const getTodayStart = () => {
        const today = new Date();
        return new Date(
            today.getFullYear(),
            today.getMonth(),
            today.getDate()
        ).getTime();
    };

    const isPastDate = (day) => {
        const selectedDate = new Date(
            chosenYear,
            currentMonth,
            day
        ).getTime();

        return selectedDate < getTodayStart();
    };

    const getDayClassName = (day) => {
        const thisTime = new Date(
            chosenYear,
            currentMonth,
            day
        ).getTime();

        if (isPastDate(day)) return "disabled-date";

        if (checkIn && thisTime === checkIn.timeValue) return "checkin";
        if (checkOut && thisTime === checkOut.timeValue) return "checkout";
        if (checkIn && checkOut && thisTime > checkIn.timeValue && thisTime < checkOut.timeValue) return "range";

        return "";
    };

    const nextImage = () => {
        if (sliderRef.current) {
            sliderRef.current.scrollBy({ left: window.innerWidth * 0.5, behavior: "smooth" });
        }
    };

    const prevImage = () => {
        if (sliderRef.current) {
            sliderRef.current.scrollBy({ left: -(window.innerWidth * 0.5), behavior: "smooth" });
        }
    };

    if (loading) {
        return (
            <div style={{ textAlign: "center", padding: "100px 0", fontSize: "1.2rem" }}>
                Memuat detail villa...
            </div>
        );
    }

    if (error || !villa) {
        return (
            <div style={{ textAlign: "center", padding: "100px 0", color: "#d9534f" }}>
                <h2>{error || "Villa tidak ditemukan"}</h2>
                <button
                    onClick={() => navigate(-1)}
                    style={{ marginTop: "20px", padding: "10px 20px", cursor: "pointer" }}
                >
                    Kembali
                </button>
            </div>
        );
    }

    const rawCurrentPrice = selectedRoom && selectedRoom.price_raw && selectedRoom.price_raw > 0
        ? selectedRoom.price_raw
        : (villa.price || 0);

    const currentPrice = getPublicPrice(rawCurrentPrice);

    const getRoomImageUrl = (room) => {
        if (!room) return villaImageUrl(id);
        if (room.images && room.images.length > 0) return room.images[0];
        if (room.img) return room.img;
        return villa.img;
    };

    return (
        <div className="villa-detail-page">
            <Navbar />

            {/* HEADER ATAS */}
            <div className="detail-header-top" style={{ padding: "35px 80px 20px 80px", maxWidth: "1200px", margin: "auto" }}>
                <button
                    onClick={() => navigate("/villas")}
                    style={{
                        display: "inline-flex",
                        alignItems: "center",
                        gap: "8px",
                        backgroundColor: "#fff",
                        border: "1px solid #ddd",
                        color: "#555",
                        cursor: "pointer",
                        fontSize: "0.85rem",
                        fontWeight: "600",
                        padding: "8px 16px",
                        borderRadius: "20px",
                        marginBottom: "20px",
                        boxShadow: "0 2px 5px rgba(0,0,0,0.05)",
                        transition: "all 0.2s"
                    }}
                >
                    <FaArrowLeft /> {t("back_to_list")}
                </button>

                <h1 style={{ margin: "0 0 10px 0", fontSize: "2.2rem", color: "#1a1a1a" }}>{villa.name}</h1>

                <div style={{ display: "flex", alignItems: "center", gap: "15px", color: "#555", fontSize: "0.95rem" }}>
                    <span style={{ display: "flex", alignItems: "center", gap: "5px" }}>
                        <FaMapMarkerAlt style={{ color: "#0d6efd" }} /> {(selectedRoom && selectedRoom.location) ? selectedRoom.location : villa.location}
                    </span>
                </div>
            </div>

            {/* HERO BANNER SLIDER */}
            <div className="slider-wrapper" style={{ position: "relative", width: "100%", maxWidth: "1200px", margin: "0 auto", padding: "0 80px", backgroundColor: "transparent", borderBottom: "1px solid #eaeaea", boxSizing: "border-box" }}>
                <button className="slider-btn left" onClick={prevImage} style={{ zIndex: 10 }}>
                    <FaChevronLeft />
                </button>

                <div className="slider-track" ref={sliderRef}>
                    {villa.images && villa.images.map((imgUrl, index) => (
                        <img
                            key={index}
                            src={villaImageUrl(id, imgUrl)}
                            alt={`${villa.name} - Foto ${index + 1}`}
                            className="slider-item-img"
                            loading={index === 0 ? "eager" : "lazy"}
                            decoding="async"
                            onError={handleVillaImageError}
                        />
                    ))}
                </div>

                <button className="slider-btn right" onClick={nextImage} style={{ zIndex: 10 }}>
                    <FaChevronRight />
                </button>
            </div>

            <div className="detail-container">
                <div className="detail-left">
                    <div className="detail-spec">
                        <span><FaUsers /> {selectedRoom ? selectedRoom.max_guests : (villa.guests || 4)} {t("tamu")}</span>
                        <span><FaBed /> {selectedRoom ? selectedRoom.room_count : (villa.room_count || 1)} Kamar</span>
                        <span><FaBath /> {selectedRoom ? selectedRoom.bathroom_count : (villa.baths || 1)} {t("bath")}</span>
                    </div>

                    {/* PILIHAN TIPE KAMAR */}
                    <div className="detail-card" style={{ border: "2px solid #0d6efd", borderRadius: "10px", padding: "20px" }}>
                        <h3 style={{ color: "#0d6efd", marginBottom: "5px" }}>{t("choose_room")}</h3>
                        <p style={{ color: "#777", fontSize: "0.85rem", marginBottom: "15px" }}>{t("choose_room_desc")}</p>

                        <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
                            {villa.rooms && villa.rooms.length > 0 ? (
                                villa.rooms.map((room, idx) => {
                                    const isSelected = selectedRoom?.id_detail === room.id_detail;
                                    const finalRoomSrc = getRoomImageUrl(room);

                                    return (
                                        <div
                                            key={idx}
                                            onClick={() => handleRoomSelect(room)}
                                            className="room-item-row"
                                            style={{
                                                padding: "15px",
                                                border: isSelected ? "2px solid #0d6efd" : "1px solid #ddd",
                                                backgroundColor: isSelected ? "#f0f7ff" : "#fff",
                                                borderRadius: "8px",
                                                cursor: "pointer",
                                                transition: "0.2s"
                                            }}
                                        >
                                            <div style={{ display: "flex", alignItems: "center", gap: "15px" }}>
                                                <img
                                                    src={villaImageUrl(id, finalRoomSrc)}
                                                    alt={room.bed_info}
                                                    style={{ width: "70px", height: "50px", objectFit: "cover", borderRadius: "4px" }}
                                                    onError={handleVillaImageError}
                                                />
                                                <div>
                                                    <h4 style={{ margin: "0 0 5px 0", color: isSelected ? "#0d6efd" : "#333" }}>
                                                        {room.bed_info} {isSelected && " 🌟 (Dipilih)"}
                                                    </h4>
                                                    {room.description && (
                                                        <p style={{ margin: "0 0 4px 0", fontSize: "0.85rem", color: "#444", fontWeight: "500" }}>
                                                            Deskripsi: {room.description}
                                                        </p>
                                                    )}
                                                    <p style={{ margin: 0, fontSize: "0.85rem", color: "#666" }}>
                                                        Fasilitas: {room.facilities && room.facilities.length > 60 ? `${room.facilities.slice(0, 60)}...` : (room.facilities || "-")}
                                                    </p>
                                                </div>
                                            </div>
                                            <div style={{ textAlign: "right" }}>
                                                <span style={{ fontWeight: "bold", color: "#2ece7a", fontSize: "1.05rem" }}>
                                                    {room.price_raw && room.price_raw > 0 ? `Rp ${getPublicPrice(room.price_raw).toLocaleString("id-ID")}` : "Hubungi CS"}
                                                </span>
                                                <p style={{ margin: "2px 0 0 0", fontSize: "0.75rem", color: "#999" }}>/malam</p>
                                            </div>
                                        </div>
                                    );
                                })
                            ) : (
                                <p style={{ fontSize: "0.9rem", color: "#999" }}>{t("no_rooms")}</p>
                            )}
                        </div>
                    </div>

                    {/* KAPASITAS DAN UKURAN KASUR */}
                    <div className="detail-card">
                        <h3>{t("capacity_title")}</h3>
                        <div className="capacity-grid" style={{ marginBottom: "15px", backgroundColor: "#f8f9fa", padding: "15px", borderRadius: "8px" }}>
                            <div>
                                <p style={{ fontSize: "0.85rem", color: "#666", margin: "0 0 5px 0" }}>{t("capacity_peserta")}</p>
                                <p style={{ fontWeight: "bold", margin: "0", color: "#1e293b", display: "flex", alignItems: "center", gap: "6px" }}><FaUsers style={{ color: "#0d6efd" }} /> {selectedRoom ? selectedRoom.max_guests : (villa.guests || 4)} {t("tamu")}</p>
                            </div>
                            <div>
                                <p style={{ fontSize: "0.85rem", color: "#666", margin: "0 0 5px 0" }}>{t("capacity_kamar")}</p>
                                <p style={{ fontWeight: "bold", margin: "0", color: "#1e293b" }}>{selectedRoom ? selectedRoom.room_count : (villa.room_count || 1)} Kamar</p>
                            </div>
                            <div>
                                <p style={{ fontSize: "0.85rem", color: "#666", margin: "0 0 5px 0" }}>{t("capacity_bed_type")}</p>
                                <div style={{ fontWeight: "bold", margin: "0", color: "#1e293b", fontSize: "0.9rem" }}>
                                    {(() => {
                                        const bt = selectedRoom ? (selectedRoom.description || selectedRoom.room_type) : villa.bed_type;
                                        if (bt) {
                                            return (
                                                <ul style={{ margin: "0", paddingLeft: "15px", display: "flex", flexDirection: "column", gap: "2px" }}>
                                                    {bt.split(',').filter(i => i.trim()).map((item, i) => <li key={i}>{item.trim()}</li>)}
                                                </ul>
                                            );
                                        }
                                        return "Standard";
                                    })()}
                                </div>
                            </div>
                        </div>

                        <h4 style={{ marginBottom: "10px", color: "#444" }}>{t("bed_main")}</h4>
                        <div style={{ display: "flex", alignItems: "center", gap: "12px", color: "#2c3e50", fontSize: "1.05rem", paddingLeft: "2px" }}>
                            <FaBed style={{ fontSize: "1.4rem", color: "#1e293b" }} />
                            <div style={{ fontWeight: "500", width: "100%" }}>
                                {(() => {
                                    const bt = selectedRoom ? (selectedRoom.description || selectedRoom.room_type) : villa.bed_type;
                                    if (bt) {
                                        return (
                                            <ul style={{ margin: "0", paddingLeft: "20px", display: "flex", flexDirection: "column", gap: "4px" }}>
                                                {bt.split(',').filter(i => i.trim()).map((item, i) => <li key={i}>{item.trim()}</li>)}
                                            </ul>
                                        );
                                    }
                                    return "Queen: 160 x 200 cm";
                                })()}
                            </div>
                        </div>
                    </div>

                    {/* DETAIL KAMAR MANDI */}
                    <div className="detail-card">
                        <h3>{t("bathroom_title")}</h3>
                        <div className="bathroom-grid" style={{ backgroundColor: "#f0fdf4", padding: "15px", border: "1px solid #bbf7d0", borderRadius: "8px" }}>
                            <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                                <div style={{ backgroundColor: "#dcfce7", padding: "10px", borderRadius: "50%" }}>
                                    <FaBath style={{ fontSize: "1.4rem", color: "#16a34a" }} />
                                </div>
                                <div>
                                    <p style={{ fontSize: "0.85rem", color: "#166534", margin: "0 0 2px 0" }}>{t("bathroom_count")}</p>
                                    <p style={{ fontWeight: "bold", margin: "0", fontSize: "1.1rem", color: "#14532d" }}>{selectedRoom ? selectedRoom.bathroom_count : (villa.baths || 1)}</p>
                                </div>
                            </div>
                            <div>
                                <p style={{ fontSize: "0.85rem", color: "#166534", margin: "0 0 2px 0" }}>{t("bathroom_type")}</p>
                                <div style={{ fontWeight: "bold", margin: "0", fontSize: "1rem", color: "#14532d" }}>
                                    {(() => {
                                        const bt = selectedRoom && selectedRoom.bathroom_type ? selectedRoom.bathroom_type : villa.bathroom_type;
                                        if (bt) {
                                            return (
                                                <ul style={{ margin: "0", paddingLeft: "15px", display: "flex", flexDirection: "column", gap: "2px" }}>
                                                    {bt.split(',').filter(i => i.trim()).map((item, i) => <li key={i}>{item.trim()}</li>)}
                                                </ul>
                                            );
                                        }
                                        return "-";
                                    })()}
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className="detail-card">
                        <h3>{t("about_villa")}</h3>
                        <p>{(selectedRoom && selectedRoom.description) || villa.description || "-"}</p>
                    </div>

                    <div className="detail-card">
                        <h3 style={{ marginBottom: "20px" }}>{t("facilities_title")}</h3>
                        <div className="facilities-grid">
                            <div style={{ padding: "15px", backgroundColor: "#fff", borderRadius: "8px", border: "1px solid #e2e8f0", boxShadow: "0 2px 4px rgba(0,0,0,0.02)" }}>
                                <h4 style={{ color: "#0d6efd", margin: "0 0 10px 0", borderBottom: "1px solid #e2e8f0", paddingBottom: "8px" }}>{t("facilities")}</h4>
                                <ul style={{ margin: "0", paddingLeft: "20px", color: "#475569", fontSize: "0.9rem", display: "flex", flexDirection: "column", gap: "5px" }}>
                                    {(() => {
                                        const fac = selectedRoom && selectedRoom.facilities ? selectedRoom.facilities : villa.facilities;
                                        return fac && fac.trim() !== "" ? fac.split(',').filter(i=>i.trim()).map((item, i) => <li key={i}>{item.trim()}</li>) : <li>Fasilitas standar</li>;
                                    })()}
                                </ul>
                            </div>
                            
                            <div style={{ padding: "15px", backgroundColor: "#fff", borderRadius: "8px", border: "1px solid #e2e8f0", boxShadow: "0 2px 4px rgba(0,0,0,0.02)" }}>
                                <h4 style={{ color: "#0d6efd", margin: "0 0 10px 0", borderBottom: "1px solid #e2e8f0", paddingBottom: "8px" }}>{t("equipment")}</h4>
                                <ul style={{ margin: "0", paddingLeft: "20px", color: "#475569", fontSize: "0.9rem", display: "flex", flexDirection: "column", gap: "5px" }}>
                                    {(() => {
                                        const eq = selectedRoom && selectedRoom.equipment ? selectedRoom.equipment : villa.equipment;
                                        return eq && eq.trim() !== "" ? eq.split(',').filter(i=>i.trim()).map((item, i) => <li key={i}>{item.trim()}</li>) : <li>-</li>;
                                    })()}
                                </ul>
                            </div>
                            
                            <div style={{ padding: "15px", backgroundColor: "#fff", borderRadius: "8px", border: "1px solid #e2e8f0", boxShadow: "0 2px 4px rgba(0,0,0,0.02)" }}>
                                <h4 style={{ color: "#0d6efd", margin: "0 0 10px 0", borderBottom: "1px solid #e2e8f0", paddingBottom: "8px" }}>{t("amenities")}</h4>
                                <ul style={{ margin: "0", paddingLeft: "20px", color: "#475569", fontSize: "0.9rem", display: "flex", flexDirection: "column", gap: "5px" }}>
                                    {(() => {
                                        const am = selectedRoom && selectedRoom.amenities ? selectedRoom.amenities : villa.amenities;
                                        return am && am.trim() !== "" ? am.split(',').filter(i=>i.trim()).map((item, i) => <li key={i}>{item.trim()}</li>) : <li>-</li>;
                                    })()}
                                </ul>
                            </div>
                            
                            <div style={{ padding: "15px", backgroundColor: "#fff", borderRadius: "8px", border: "1px solid #e2e8f0", boxShadow: "0 2px 4px rgba(0,0,0,0.02)" }}>
                                <h4 style={{ color: "#0d6efd", margin: "0 0 10px 0", borderBottom: "1px solid #e2e8f0", paddingBottom: "8px" }}>Jam Operasional / Aturan</h4>
                                <div style={{ display: "flex", alignItems: "flex-start", gap: "8px", color: "#475569", fontSize: "0.9rem", marginBottom: "10px" }}>
                                    <FaClock style={{ marginTop: "4px", color: "#f59e0b" }} />
                                    <span>
                                        {(() => {
                                            const h = selectedRoom && selectedRoom.hours && selectedRoom.hours.trim() !== "-" ? selectedRoom.hours : villa.hours;
                                            return h && h.trim() !== "-" ? h : `Check-in: ${villa.check_in_time || "14:00"}, Check-out: ${villa.check_out_time || "12:00"}`;
                                        })()}
                                    </span>
                                </div>
                                <div style={{ color: "#475569", fontSize: "0.9rem" }}>
                                    <p style={{ margin: "0 0 5px 0" }}>🚭 Dilarang merokok di dalam</p>
                                    <p style={{ margin: "0" }}>🐾 Tidak diperbolehkan membawa hewan</p>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* LAYANAN TAMBAHAN (RENTAL & TRIP) */}
                    {selectedRoom && selectedRoom.addons && selectedRoom.addons.length > 0 && (
                        <div className="detail-card">
                            <h3 style={{ marginBottom: "16px" }}>🚗 Layanan Tambahan (Rental &amp; Trip)</h3>
                            <p style={{ fontSize: "0.88rem", color: "#64748b", marginBottom: "16px" }}>
                                Layanan tambahan berikut tersedia khusus untuk kamar yang Anda pilih. Hubungi kami via WhatsApp untuk konfirmasi ketersediaan.
                            </p>
                            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(220px, 1fr))", gap: "12px" }}>
                                {selectedRoom.addons.map((addon, idx) => (
                                    <div key={idx} style={{
                                        padding: "14px 16px",
                                        backgroundColor: "#f0fdf4",
                                        borderRadius: "10px",
                                        border: "1px solid #bbf7d0",
                                        display: "flex",
                                        flexDirection: "column",
                                        gap: "6px"
                                    }}>
                                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                                            <span style={{ fontSize: "0.72rem", backgroundColor: "#dcfce7", color: "#15803d", padding: "2px 10px", borderRadius: "99px", fontWeight: "700" }}>
                                                {addon.addon_type === "Motor" && "🏍️ "}
                                                {addon.addon_type === "Mobil" && "🚗 "}
                                                {addon.addon_type === "Trip" && "🗺️ "}
                                                {addon.addon_type === "Sepeda" && "🚲 "}
                                                {!["Motor","Mobil","Trip","Sepeda"].includes(addon.addon_type) && "📦 "}
                                                {addon.addon_type}
                                            </span>
                                        </div>
                                        <strong style={{ fontSize: "0.95rem", color: "#1e293b" }}>{addon.name}</strong>
                                        <span style={{ fontSize: "0.9rem", color: "#16a34a", fontWeight: "700" }}>
                                            Rp {Number(addon.price).toLocaleString("id-ID")}<span style={{ fontWeight: "400", fontSize: "0.8rem", color: "#64748b" }}>/hari</span>
                                        </span>
                                        {addon.description && (
                                            <p style={{ margin: 0, fontSize: "0.8rem", color: "#64748b" }}>{addon.description}</p>
                                        )}
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    <div className="detail-card">
                        <h3>Wisata Terdekat</h3>
                        <div style={{ display: "flex", flexWrap: "wrap", gap: "15px", marginTop: "15px", fontSize: "0.95rem", color: "#333" }}>
                            {(showAllNearby ? nearbyAttractions : nearbyAttractions.slice(0, 2)).map((place, idx) => (
                                <div key={idx} style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                                    <FaMapMarkerAlt style={{ color: "#888", fontSize: "0.85rem" }} />
                                    <span><strong>{place.name}</strong> {place.dist}</span>
                                </div>
                            ))}
                        </div>
                        <div style={{ marginTop: "12px" }}>
                            <span
                                onClick={() => setShowAllNearby(!showAllNearby)}
                                style={{ color: "#0d6efd", cursor: "pointer", fontSize: "0.9rem" }}
                            >
                                {showAllNearby ? "Sembunyikan" : "Lihat Jarak ke Wisata lainnya"}
                            </span>
                        </div>
                    </div>

                    <div className="detail-card">
                        <h3>Lokasi</h3>
                        <div className="map">
                            <iframe
                                title="villa-location"
                                src={`https://maps.google.com/maps?q=${encodeURIComponent((selectedRoom && selectedRoom.location) ? selectedRoom.location : (villa.location || 'Yogyakarta'))}&output=embed`}
                                width="100%"
                                height="300"
                                style={{ border: 0 }}
                                loading="lazy"
                            />
                        </div>
                    </div>

                    {/* ULASAN TAMU */}
                    <div className="detail-card">
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "16px" }}>
                            <h3 style={{ margin: 0 }}>Ulasan Tamu</h3>
                            
                            <button 
                                onClick={() => navigate("/review")}
                                style={{
                                    backgroundColor: "#0d6efd",
                                    color: "#fff",
                                    border: "none",
                                    padding: "8px 14px",
                                    borderRadius: "6px",
                                    fontSize: "0.85rem",
                                    fontWeight: "600",
                                    cursor: "pointer"
                                }}
                            >
                                + Tulis Ulasan
                            </button>
                        </div>

                        {reviews.length > 0 ? (
                            <div style={{ display: "flex", flexDirection: "column", gap: "15px" }}>
                                {reviews.map((r) => (
                                    <div key={r.id} style={{ padding: "15px", backgroundColor: "#f8fafc", borderRadius: "8px", border: "1px solid #e2e8f0" }}>
                                        <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "8px" }}>
                                            <strong>{r.reviewer_name}</strong>
                                            <span style={{ color: "#f59e0b", letterSpacing: "2px" }}>{"★".repeat(r.rating)}</span>
                                        </div>
                                        {r.room_id && (
                                            <div style={{ fontSize: "0.8rem", color: "#64748b", marginBottom: "8px" }}>
                                                Menginap di kamar: {villa.rooms?.find(rm => String(rm.id_detail) === String(r.room_id))?.bed_info || r.room_id}
                                            </div>
                                        )}
                                        <p style={{ margin: "0", fontSize: "0.9rem", color: "#475569" }}>"{r.comment}"</p>
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <p style={{ color: "#64748b", fontStyle: "italic", fontSize: "0.95rem" }}>
                                Belum ada ulasan saat ini. Jadilah yang pertama memberikan penilaian!
                            </p>
                        )}
                    </div>
                </div>

                {/* BOOKING BOX KANAN */}
                <div className="booking-box">
                    <p className="start-text">Harga Kamar Dipilih</p>
                    <h2>
                        Rp {Number(currentPrice).toLocaleString("id-ID")}
                        <span>/malam</span>
                    </h2>

                    {selectedRoom && (
                        <p style={{ fontSize: "0.85rem", color: "#0d6efd", marginTop:"-5px", marginBottom: "15px", fontWeight: "500" }}>
                            Room: {selectedRoom.bed_info}
                        </p>
                    )}

                    <div className="calendar-box">
                        <h4>Pilih Tanggal Booking</h4>

                        <div style={{ display: "flex", gap: "8px", marginBottom: "12px" }}>
                            <select
                                value={currentMonth}
                                onChange={(e) => {
                                    setCurrentMonth(Number(e.target.value));
                                    setCheckIn(null);
                                    setCheckOut(null);
                                }}
                                style={{ flex: 1, padding: "6px", borderRadius: "4px", border: "1px solid #ccc", fontSize: "0.85rem" }}
                            >
                                {monthNames.map((m, idx) => (
                                    <option key={idx} value={idx}>{m}</option>
                                ))}
                            </select>

                            <select
                                value={chosenYear}
                                onChange={(e) => {
                                    setChosenYear(Number(e.target.value));
                                    setCheckIn(null);
                                    setCheckOut(null);
                                }}
                                style={{ padding: "6px", borderRadius: "4px", border: "1px solid #ccc", fontSize: "0.85rem" }}
                            >
                                <option value={currentYear}>{currentYear}</option>
                                <option value={currentYear + 1}>{currentYear + 1}</option>
                            </select>
                        </div>

                        <div className="calendar-grid" style={{ fontSize: "0.85rem", gap: "4px" }}>
                            {days.map((day) => {
                                const pastDate = isPastDate(day);

                                return (
                                    <div
                                        key={day}
                                        className={`day ${getDayClassName(day)}`}
                                        onClick={() => {
                                            if (pastDate) return;
                                            handleDateClick(day);
                                        }}
                                        aria-disabled={pastDate}
                                        style={{
                                            padding: "6px 0",
                                            fontSize: "0.85rem",
                                            borderRadius: "4px",
                                            cursor: pastDate ? "not-allowed" : "pointer",
                                            pointerEvents: pastDate ? "none" : "auto",
                                            opacity: pastDate ? 0.45 : 1
                                        }}
                                    >
                                        {day}
                                    </div>
                                );
                            })}
                        </div>

                        <div className="selected-date" style={{ fontSize: "0.85rem", marginTop: "12px" }}>
                            <p>Check-in: {checkIn ? checkIn.displayString : "-"}</p>
                            <p>Check-out: {checkOut ? checkOut.displayString : "-"}</p>
                        </div>
                    </div>

                    <div className="booking-features">
                        <p>✔ Tanpa biaya pemesanan</p>
                        <p>✔ Pembatalan gratis</p>
                        <p>✔ Konfirmasi instan</p>
                        <p>✔ Pembayaran aman</p>
                    </div>

                    <button
                        className="book-now"
                        disabled={!checkIn || !checkOut || !selectedRoom}
                        onClick={() => {
                            const combinedRoomName = selectedRoom
                                ? `${villa.name} - ${selectedRoom.bed_info}`
                                : villa.name;

                            const chosenRoomImage = getRoomImageUrl(selectedRoom || villa);

                            navigate("/booking", {
                                state: {
                                    villa: {
                                        ...villa,
                                        id: villa.id || id,
                                        name: combinedRoomName,
                                        price: currentPrice,
                                        img: chosenRoomImage,
                                        chosen_room_detail: selectedRoom,
                                    },
                                    room: selectedRoom,
                                    checkIn: checkIn?.displayString,
                                    checkOut: checkOut?.displayString,
                                    checkInRaw: checkIn?.rawDate,
                                    checkOutRaw: checkOut?.rawDate,
                                    checkInISO: checkIn?.isoString,
                                    checkOutISO: checkOut?.isoString
                                }
                            });
                        }}
                    >
                        Pesan Sekarang
                    </button>
                </div>
            </div>

            {/* FOOTER */}
            <footer className="footer-container">
                <div className="footer-content">
                    <div className="footer-section footer-left">
                        <h2>jogjavilla.id</h2>
                        <span>Jogja Tourism</span>
                        <p>Your trusted partner for villa and homestay bookings in Jogja.</p>
                    </div>
                    <div className="footer-section footer-center">
                        <h3>Contact Us</h3>
                        <p><FaEnvelope /> info@jogjavilla.id</p>
                        <p><FaPhone /> +62 812-3456-7890</p>
                    </div>
                    <div className="footer-section footer-right">
                        <h3>Follow Us</h3>
                        <div className="social-icons">
                            <span className="social-icon"><FaInstagram /></span>
                            <span className="social-icon"><FaFacebookF /></span>
                        </div>
                    </div>
                </div>
                <hr className="footer-divider" />
                <div className="footer-bottom">
                    © 2026 jogjavilla.id. All rights reserved.
                </div>
            </footer>
        </div>
    );
}

export default VillaDetail;