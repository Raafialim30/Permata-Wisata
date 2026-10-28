import { useCallback, useEffect, useMemo, useState } from "react";
import {
    FaArrowLeft,
    FaArrowRight,
    FaCalendarAlt,
    FaCheckCircle,
    FaMapMarkerAlt,
    FaMinus,
    FaPlus,
    FaUsers
} from "react-icons/fa";
import { useLocation, useNavigate } from "react-router-dom";
import Navbar from "../components/Navbar";
import API_BASE_URL from "../config";
import villaImageUrl, { handleVillaImageError } from "../utils/villaImageUrl";
import "./css/Booking.css";

function Booking() {
    const location = useLocation();
    const navigate = useNavigate();

    const passedData = location.state || {};
    const passedVilla = passedData.villa || null;

    const passedRoom =
        passedData.room ||
        passedData.selectedRoom ||
        passedVilla?.chosen_room_detail ||
        null;

    const [step, setStep] = useState(passedVilla ? 2 : 1);
    const [villas, setVillas] = useState([]);
    const [selectedVilla, setSelectedVilla] = useState(passedVilla);
    const [guests, setGuests] = useState(2);
    const [checkIn, setCheckIn] = useState(passedData.checkInISO || "");
    const [checkOut, setCheckOut] = useState(passedData.checkOutISO || "");
    const [units, setUnits] = useState([]);
    const [selectedUnit, setSelectedUnit] = useState(passedRoom);

    const [loadingVillas, setLoadingVillas] = useState(false);
    const [loadingUnits, setLoadingUnits] = useState(false);
    const [loadingBooking, setLoadingBooking] = useState(false);
    const [error, setError] = useState("");

    const [fullName, setFullName] = useState("");
    const [email, setEmail] = useState("");
    const [whatsapp, setWhatsapp] = useState("");
    const [selectedAddons, setSelectedAddons] = useState({});
    const [commissionRate, setCommissionRate] = useState(10);

    useEffect(() => {
        window.scrollTo(0, 0);
        fetch(`${API_BASE_URL}/api/settings/commission`)
            .then(res => res.json())
            .then(data => {
                if (data.status === "success" && data.commission_rate !== undefined) {
                    setCommissionRate(Number(data.commission_rate));
                }
            })
            .catch(err => console.error("Gagal memuat komisi:", err));
    }, [step]);

    const getPublicPrice = useCallback((price) => {
        const base = Number(price) || 0;
        return Math.round(base * (1 + commissionRate / 100));
    }, [commissionRate]);

    useEffect(() => {
        if (passedVilla) return;

        const loadVillas = async () => {
            try {
                setLoadingVillas(true);
                setError("");
                const response = await fetch(`${API_BASE_URL}/api/villas`);
                if (!response.ok) throw new Error("Gagal mengambil daftar villa.");
                const data = await response.json();
                const villaData = Array.isArray(data) ? data : data.data || [];
                setVillas(villaData);
            } catch (err) {
                console.error("Load villas error:", err);
                setError(err.message || "Gagal mengambil daftar villa.");
            } finally {
                setLoadingVillas(false);
            }
        };

        loadVillas();
    }, [passedVilla]);

    useEffect(() => {
        setSelectedUnit(null);
        setUnits([]);
        setSelectedAddons({});
    }, [selectedVilla?.id]);

    const loadUnits = useCallback(async () => {
        if (!selectedVilla?.id || !checkIn || !checkOut) return;

        try {
            setLoadingUnits(true);
            setError("");

            const params = new URLSearchParams({
                villa_id: String(selectedVilla.id),
                check_in: checkIn,
                check_out: checkOut,
                guests: String(guests)
            });

            const response = await fetch(
                `${API_BASE_URL}/api/bookings/available-units?${params.toString()}`
            );

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.error || "Gagal mengecek ketersediaan unit.");
            }

            const unitData = Array.isArray(data.data) ? data.data : [];
            setUnits(unitData);

            if (
                selectedUnit &&
                !unitData.some(
                    (unit) =>
                        String(unit.id_detail) === String(selectedUnit.id_detail) &&
                        unit.is_available
                )
            ) {
                setSelectedUnit(null);
            }
        } catch (err) {
            console.error("Load units error:", err);
            setError(err.message || "Gagal mengecek unit.");
            setUnits([]);
        } finally {
            setLoadingUnits(false);
        }
    }, [selectedVilla?.id, checkIn, checkOut, guests, selectedUnit]);

    const nights = useMemo(() => {
        if (!checkIn || !checkOut) return 0;
        const start = new Date(`${checkIn}T00:00:00`);
        const end = new Date(`${checkOut}T00:00:00`);
        const difference = end.getTime() - start.getTime();
        return Math.max(0, Math.ceil(difference / (1000 * 60 * 60 * 24)));
    }, [checkIn, checkOut]);

    const getUnitPrice = useCallback((unit) => {
        if (!unit) return 0;
        const raw = unit.price ?? unit.price_raw ?? unit.harga ?? unit.room_price;
        const parsed = Number(raw);
        if (!isNaN(parsed) && parsed > 0) {
            return parsed;
        }
        return getPublicPrice(selectedVilla?.price);
    }, [selectedVilla?.price, getPublicPrice]);

    const addonsTotalPerNight = useMemo(() => {
        if (!selectedUnit?.addons) return 0;
        return selectedUnit.addons.reduce((total, addon) => {
            if (selectedAddons[addon.id]) {
                return total + (Number(addon.price) || 0);
            }
            return total;
        }, 0);
    }, [selectedUnit, selectedAddons]);

    const pricePerNight = useMemo(() => {
        if (selectedUnit) {
            return getUnitPrice(selectedUnit);
        }
        return getPublicPrice(selectedVilla?.price);
    }, [selectedUnit, selectedVilla?.price, getUnitPrice, getPublicPrice]);

    const roomTotal = nights * pricePerNight;
    const addonsTotal = nights * addonsTotalPerNight;
    const totalPrice = roomTotal + addonsTotal;

    const handleSelectVilla = (villa) => {
        setSelectedVilla(villa);
        setSelectedUnit(null);
        setCheckIn("");
        setCheckOut("");
        setUnits([]);
        setError("");
        setStep(2);
    };

    const increaseGuests = () => {
        const villaMax = Number(selectedVilla?.guests) || 50;
        if (guests < villaMax) setGuests((current) => current + 1);
    };

    const decreaseGuests = () => {
        if (guests > 1) setGuests((current) => current - 1);
    };

    const handleDateChange = (type, value) => {
        setError("");
        setSelectedUnit(null);
        setUnits([]);

        if (type === "checkIn") {
            setCheckIn(value);
            if (checkOut && value >= checkOut) {
                setCheckOut("");
            }
        } else {
            setCheckOut(value);
        }
    };

    const handleContinueToUnits = async () => {
        setError("");
        if (!selectedVilla) {
            setError("Silakan pilih villa terlebih dahulu.");
            setStep(1);
            return;
        }
        if (!guests || guests < 1) {
            setError("Jumlah tamu minimal 1 orang.");
            return;
        }
        if (!checkIn || !checkOut) {
            setError("Silakan pilih tanggal check-in dan check-out.");
            return;
        }
        const start = new Date(`${checkIn}T00:00:00`);
        const end = new Date(`${checkOut}T00:00:00`);
        if (end <= start) {
            setError("Tanggal check-out harus setelah check-in.");
            return;
        }
        await loadUnits();
        setStep(3);
    };

    const handleSelectUnit = (unit) => {
        if (!unit.is_available) return;
        setSelectedUnit(unit);
        setSelectedAddons({});
        setError("");
    };

    const handleContinueToCustomer = () => {
        if (!selectedUnit) {
            setError("Silakan pilih unit yang masih tersedia.");
            return;
        }
        if (!selectedUnit.is_available) {
            setError("Unit tersebut sudah tidak tersedia.");
            return;
        }
        setError("");
        setStep(4);
    };

    const toggleAddon = (addonId) => {
        setSelectedAddons((current) => ({
            ...current,
            [addonId]: !current[addonId]
        }));
    };

    const validateCustomer = () => {
        if (!fullName.trim()) { setError("Nama lengkap wajib diisi."); return false; }
        if (!email.trim()) { setError("Email wajib diisi."); return false; }
        if (!whatsapp.trim()) { setError("Nomor WhatsApp wajib diisi."); return false; }
        return true;
    };

    const handlePayment = async () => {
        if (loadingBooking) return;
        setError("");

        if (!selectedVilla) { setError("Villa belum dipilih."); setStep(1); return; }
        if (!selectedUnit) { setError("Unit belum dipilih."); setStep(3); return; }
        if (!selectedUnit.is_available) {
            setError("Unit sudah tidak tersedia. Silakan pilih unit lain.");
            await loadUnits();
            setStep(3);
            return;
        }
        if (!checkIn || !checkOut) { setError("Tanggal booking belum lengkap."); setStep(2); return; }
        if (!validateCustomer()) return;
        if (nights <= 0) { setError("Durasi menginap tidak valid."); return; }
        if (!Number.isFinite(totalPrice) || totalPrice <= 0) {
            setError("Harga booking belum tersedia. Silakan hubungi pengelola villa.");
            return;
        }

        try {
            setLoadingBooking(true);

            const activeAddons = (selectedUnit.addons || [])
                .filter((addon) => selectedAddons[addon.id])
                .map((addon) => ({
                    id: addon.id,
                    name: addon.name,
                    price: Number(addon.price) || 0,
                    addon_type: addon.addon_type || ""
                }));

            const villaImage = villaImageUrl(
                selectedVilla.id,
                selectedUnit.image_url || selectedVilla.img
            );

            const payload = {
                villa_id: Number(selectedVilla.id),
                villa_detail_id: Number(selectedUnit.id_detail),
                villa_name: selectedVilla.name || "Villa",
                room_name: selectedUnit.bed_info || selectedUnit.room_type || "Unit Villa",
                check_in: checkIn,
                check_out: checkOut,
                guests: Number(guests),
                full_name: fullName.trim(),
                email: email.trim(),
                whatsapp: whatsapp.trim(),
                total_price: Number(totalPrice),
                payment_method: "Transfer Bank BCA",
                payment_type: "Manual",
                status: "Menunggu Pembayaran",
                villa_img: villaImage,
                addons_info: activeAddons
            };

            const response = await fetch(`${API_BASE_URL}/api/bookings`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(payload)
            });

            const data = await response.json();

            if (response.status === 409) {
                setError(data.error || "Unit baru saja dipesan oleh pelanggan lain.");
                await loadUnits();
                setSelectedUnit(null);
                setStep(3);
                return;
            }

            if (!response.ok) {
                throw new Error(data.error || "Gagal membuat booking.");
            }

            const bookingData = {
                ...payload,
                booking_id: data.booking_id,
                order_id: data.order_id,
                total_price: Number(data.total_price ?? payload.total_price),
                status: data.booking_status || "Menunggu Pembayaran"
            };

            navigate("/payment", {
                state: {
                    bookingData,
                    villa: selectedVilla
                }
            });
        } catch (err) {
            console.error("Booking error:", err);
            setError(err.message || "Terjadi kesalahan saat membuat booking.");
        } finally {
            setLoadingBooking(false);
        }
    };

    const getUnitImage = (unit) => {
        if (unit?.image_url) {
            return villaImageUrl(selectedVilla?.id, unit.image_url);
        }
        if (unit?.img && String(unit.img).startsWith("http")) {
            return villaImageUrl(selectedVilla?.id, unit.img);
        }
        if (unit?.img) {
            return villaImageUrl(
                selectedVilla?.id,
                `rooms/room_${unit.id_detail}/${unit.img}`
            );
        }
        return villaImageUrl(selectedVilla?.id, "utama.png");
    };

    const formatRupiah = (value) => {
        return `Rp ${Number(value || 0).toLocaleString("id-ID")}`;
    };

    const formatDate = (date) => {
        if (!date) return "-";
        const parsed = new Date(`${date}T00:00:00`);
        return parsed.toLocaleDateString("id-ID", {
            day: "numeric",
            month: "long",
            year: "numeric"
        });
    };

    const availableUnits = units.filter((unit) => unit.is_available);

    const now = new Date();
    const todayISO = [
        now.getFullYear(),
        String(now.getMonth() + 1).padStart(2, "0"),
        String(now.getDate()).padStart(2, "0")
    ].join("-");

    return (
        <div className="booking-page">
            <Navbar />
            <main className="booking-container">
                <div className="booking-header">
                    <button className="booking-back" onClick={() => navigate(-1)}>
                        <FaArrowLeft /> Kembali
                    </button>
                    <h1>Pesan Villa</h1>
                    <p>Pilih villa, tanggal, jumlah tamu, dan unit yang tersedia.</p>
                </div>

                <div className="booking-stepper">
                    {[
                        { number: 1, label: "Villa" },
                        { number: 2, label: "Tanggal" },
                        { number: 3, label: "Unit" },
                        { number: 4, label: "Data Pemesan" }
                    ].map((item) => (
                        <div
                            key={item.number}
                            className={`step-item ${step >= item.number ? "active" : ""}`}
                        >
                            <div className="step-number">
                                {step > item.number ? <FaCheckCircle /> : item.number}
                            </div>
                            <span>{item.label}</span>
                        </div>
                    ))}
                </div>

                {error && <div className="booking-error">{error}</div>}

                {step === 1 && (
                    <section className="booking-section">
                        <div className="section-title">
                            <span>1</span>
                            <div>
                                <h2>Pilih Villa</h2>
                                <p>Pilih villa yang ingin Anda pesan.</p>
                            </div>
                        </div>

                        {loadingVillas ? (
                            <div className="booking-loading">Memuat daftar villa...</div>
                        ) : (
                            <div className="villa-selection-grid">
                                {villas.map((villa) => (
                                    <button
                                        type="button"
                                        key={villa.id}
                                        className={`villa-select-card ${String(selectedVilla?.id) === String(villa.id) ? "selected" : ""}`}
                                        onClick={() => handleSelectVilla(villa)}
                                    >
                                        <img
                                            src={villaImageUrl(villa.id, villa.img)}
                                            alt={villa.name}
                                            onError={(event) => handleVillaImageError(event, villa.id)}
                                        />
                                        <div className="villa-select-content">
                                            <h3>{villa.name}</h3>
                                            <p><FaMapMarkerAlt /> {villa.location || "Yogyakarta"}</p>
                                            <div className="villa-meta">
                                                <span><FaUsers /> {villa.guests || 0} tamu</span>
                                                <strong>{formatRupiah(getPublicPrice(villa.price))}/malam</strong>
                                            </div>
                                        </div>
                                        {String(selectedVilla?.id) === String(villa.id) && (
                                            <div className="villa-selected-badge">
                                                <FaCheckCircle /> Dipilih
                                            </div>
                                        )}
                                    </button>
                                ))}
                            </div>
                        )}

                        {selectedVilla && (
                            <div className="section-actions">
                                <button className="primary-button" onClick={() => setStep(2)}>
                                    Lanjut <FaArrowRight />
                                </button>
                            </div>
                        )}
                    </section>
                )}

                {step === 2 && (
                    <section className="booking-section">
                        <div className="section-title">
                            <span>2</span>
                            <div>
                                <h2>Tanggal &amp; Jumlah Tamu</h2>
                                <p>Tentukan tanggal menginap dan jumlah orang.</p>
                            </div>
                        </div>

                        {selectedVilla && (
                            <div className="selected-villa-summary">
                                <img
                                    src={villaImageUrl(selectedVilla.id, selectedVilla.img)}
                                    alt={selectedVilla.name}
                                    onError={(event) => handleVillaImageError(event, selectedVilla.id)}
                                />
                                <div>
                                    <strong>{selectedVilla.name}</strong>
                                    <span><FaMapMarkerAlt /> {selectedVilla.location || "Yogyakarta"}</span>
                                </div>
                                <button type="button" onClick={() => setStep(1)}>Ganti Villa</button>
                            </div>
                        )}

                        <div className="booking-form-grid">
                            <div className="form-card">
                                <label><FaCalendarAlt /> Check-in</label>
                                <input
                                    type="date"
                                    min={todayISO}
                                    value={checkIn}
                                    onChange={(e) => handleDateChange("checkIn", e.target.value)}
                                />
                            </div>

                            <div className="form-card">
                                <label><FaCalendarAlt /> Check-out</label>
                                <input
                                    type="date"
                                    min={checkIn || todayISO}
                                    value={checkOut}
                                    onChange={(e) => handleDateChange("checkOut", e.target.value)}
                                />
                            </div>

                            <div className="form-card">
                                <label><FaUsers /> Jumlah Tamu</label>
                                <div className="guest-counter">
                                    <button type="button" onClick={decreaseGuests} disabled={guests <= 1}>
                                        <FaMinus />
                                    </button>
                                    <div>
                                        <strong>{guests}</strong>
                                        <span>orang</span>
                                    </div>
                                    <button
                                        type="button"
                                        onClick={increaseGuests}
                                        disabled={guests >= Number(selectedVilla?.guests)}
                                    >
                                        <FaPlus />
                                    </button>
                                </div>
                                <small>Maksimal kapasitas villa: {selectedVilla?.guests || "-"} orang</small>
                            </div>
                        </div>

                        {checkIn && checkOut && nights > 0 && (
                            <div className="stay-info">
                                <FaCheckCircle />
                                <div>
                                    <strong>{nights} malam</strong>
                                    <span>{formatDate(checkIn)} — {formatDate(checkOut)}</span>
                                </div>
                            </div>
                        )}

                        <div className="section-actions">
                            <button className="secondary-button" onClick={() => setStep(1)}>
                                <FaArrowLeft /> Kembali
                            </button>
                            <button className="primary-button" onClick={handleContinueToUnits}>
                                Cek Unit Tersedia <FaArrowRight />
                            </button>
                        </div>
                    </section>
                )}

                {step === 3 && (
                    <section className="booking-section">
                        <div className="section-title">
                            <span>3</span>
                            <div>
                                <h2>Pilih Unit</h2>
                                <p>Unit yang sudah penuh tidak dapat dipilih.</p>
                            </div>
                        </div>

                        <div className="booking-info-strip">
                            <div><span>Villa</span><strong>{selectedVilla?.name}</strong></div>
                            <div><span>Tanggal</span><strong>{formatDate(checkIn)} - {formatDate(checkOut)}</strong></div>
                            <div><span>Tamu</span><strong>{guests} orang</strong></div>
                            <button type="button" onClick={() => setStep(2)}>Ubah</button>
                        </div>

                        {loadingUnits ? (
                            <div className="booking-loading">
                                <div className="loading-spinner"></div>
                                <p>Mengecek ketersediaan unit...</p>
                            </div>
                        ) : units.length === 0 ? (
                            <div className="empty-units">
                                <div>🏠</div>
                                <h3>Belum ada unit</h3>
                                <p>Tidak ada unit yang dapat ditampilkan untuk pilihan tersebut.</p>
                            </div>
                        ) : (
                            <>
                                <div className="availability-summary">
                                    <FaCheckCircle />
                                    <span>
                                        <strong>{availableUnits.length} unit tersedia</strong> dari {units.length} unit
                                    </span>
                                </div>

                                <div className="unit-selection-grid">
                                    {units.map((unit) => {
                                        const isSelected = String(selectedUnit?.id_detail) === String(unit.id_detail);
                                        const disabled = !unit.is_available;
                                        const displayPrice = getUnitPrice(unit);

                                        return (
                                            <button
                                                type="button"
                                                key={unit.id_detail}
                                                disabled={disabled}
                                                className={`unit-select-card ${isSelected ? "selected" : ""} ${disabled ? "unavailable" : ""}`}
                                                onClick={() => handleSelectUnit(unit)}
                                            >
                                                <div className="unit-image-wrapper">
                                                    <img
                                                        src={villaImageUrl(selectedVilla?.id, getUnitImage(unit))}
                                                        alt={unit.bed_info}
                                                        onError={(event) => handleVillaImageError(event, selectedVilla?.id)}
                                                    />
                                                    {disabled && (
                                                        <div className="unit-unavailable-overlay">
                                                            <span>Tidak Tersedia</span>
                                                        </div>
                                                    )}
                                                    {isSelected && !disabled && (
                                                        <div className="unit-selected-icon">
                                                            <FaCheckCircle />
                                                        </div>
                                                    )}
                                                </div>

                                                <div className="unit-content">
                                                    <div className="unit-title-row">
                                                        <h3>{unit.bed_info || unit.room_type || "Unit Villa"}</h3>
                                                        {isSelected && !disabled && (
                                                            <span className="selected-label">Dipilih</span>
                                                        )}
                                                    </div>

                                                    <div className="unit-capacity">
                                                        <span><FaUsers /> Maks. {unit.max_guests} tamu</span>
                                                    </div>

                                                    <p className="unit-description">
                                                        {unit.description || "Unit nyaman dengan fasilitas lengkap."}
                                                    </p>

                                                    <div className="unit-bottom">
                                                        <strong>
                                                            {formatRupiah(displayPrice)}
                                                            <small>/malam</small>
                                                        </strong>

                                                        {disabled ? (
                                                            <span className="unavailable-text">
                                                                {unit.unavailable_reason || "Tidak tersedia"}
                                                            </span>
                                                        ) : (
                                                            <span className="available-text">✓ Tersedia</span>
                                                        )}
                                                    </div>
                                                </div>
                                            </button>
                                        );
                                    })}
                                </div>
                            </>
                        )}

                        <div className="section-actions">
                            <button className="secondary-button" onClick={() => setStep(2)}>
                                <FaArrowLeft /> Kembali
                            </button>
                            <button
                                className="primary-button"
                                disabled={!selectedUnit || !selectedUnit.is_available}
                                onClick={handleContinueToCustomer}
                            >
                                Lanjut <FaArrowRight />
                            </button>
                        </div>
                    </section>
                )}

                {step === 4 && (
                    <section className="booking-section">
                        <div className="section-title">
                            <span>4</span>
                            <div>
                                <h2>Data Pemesan</h2>
                                <p>Masukkan data yang dapat dihubungi.</p>
                            </div>
                        </div>

                        <div className="customer-layout">
                            <div className="customer-form">
                                <div className="input-group">
                                    <label>Nama Lengkap</label>
                                    <input
                                        type="text"
                                        placeholder="Masukkan nama lengkap"
                                        value={fullName}
                                        onChange={(e) => setFullName(e.target.value)}
                                    />
                                </div>

                                <div className="input-group">
                                    <label>Email</label>
                                    <input
                                        type="email"
                                        placeholder="contoh@email.com"
                                        value={email}
                                        onChange={(e) => setEmail(e.target.value)}
                                    />
                                </div>

                                <div className="input-group">
                                    <label>Nomor WhatsApp</label>
                                    <input
                                        type="tel"
                                        placeholder="08xxxxxxxxxx"
                                        value={whatsapp}
                                        onChange={(e) => setWhatsapp(e.target.value)}
                                    />
                                </div>

                                {selectedUnit?.addons && selectedUnit.addons.length > 0 && (
                                    <div className="addon-section">
                                        <h3>Layanan Tambahan</h3>
                                        <p>Pilih jika membutuhkan layanan tambahan.</p>
                                        <div className="addon-list">
                                            {selectedUnit.addons.map((addon) => (
                                                <label
                                                    key={addon.id}
                                                    className={`addon-item ${selectedAddons[addon.id] ? "selected" : ""}`}
                                                >
                                                    <input
                                                        type="checkbox"
                                                        checked={!!selectedAddons[addon.id]}
                                                        onChange={() => toggleAddon(addon.id)}
                                                    />
                                                    <div>
                                                        <strong>{addon.name}</strong>
                                                        <span>{addon.addon_type}</span>
                                                    </div>
                                                    <b>{formatRupiah(addon.price)}/hari</b>
                                                </label>
                                            ))}
                                        </div>
                                    </div>
                                )}
                            </div>

                            <aside className="booking-summary">
                                <h3>Ringkasan Booking</h3>
                                <div className="summary-villa">
                                    <img
                                        src={villaImageUrl(selectedVilla?.id, getUnitImage(selectedUnit))}
                                        alt={selectedVilla?.name}
                                        onError={(event) => handleVillaImageError(event, selectedVilla?.id)}
                                    />
                                    <div>
                                        <strong>{selectedVilla?.name}</strong>
                                        <span>{selectedUnit?.bed_info || selectedUnit?.room_type}</span>
                                    </div>
                                </div>

                                <div className="summary-row"><span>Check-in</span><strong>{formatDate(checkIn)}</strong></div>
                                <div className="summary-row"><span>Check-out</span><strong>{formatDate(checkOut)}</strong></div>
                                <div className="summary-row"><span>Tamu</span><strong>{guests} orang</strong></div>
                                <div className="summary-row"><span>Durasi</span><strong>{nights} malam</strong></div>
                                <hr />
                                <div className="summary-row">
                                    <span>Kamar ({formatRupiah(pricePerNight)} x {nights} malam)</span>
                                    <strong>{formatRupiah(roomTotal)}</strong>
                                </div>

                                {addonsTotal > 0 && (
                                    <div className="summary-row">
                                        <span>Layanan</span>
                                        <strong>{formatRupiah(addonsTotal)}</strong>
                                    </div>
                                )}

                                <div className="summary-total">
                                    <span>Total</span>
                                    <strong>{formatRupiah(totalPrice)}</strong>
                                </div>

                                <div className="payment-method-info">
                                    <strong>Metode Pembayaran</strong>
                                    <span>Transfer Bank BCA</span>
                                    <small>Setelah booking dibuat, ikuti instruksi pembayaran yang ditampilkan.</small>
                                </div>
                            </aside>
                        </div>

                        <div className="section-actions">
                            <button className="secondary-button" onClick={() => setStep(3)}>
                                <FaArrowLeft /> Kembali
                            </button>
                            <button
                                className="primary-button payment-button"
                                onClick={handlePayment}
                                disabled={loadingBooking}
                            >
                                {loadingBooking ? "Memproses..." : <>Buat Booking <FaArrowRight /></>}
                            </button>
                        </div>
                    </section>
                )}
            </main>
        </div>
    );
}

export default Booking;