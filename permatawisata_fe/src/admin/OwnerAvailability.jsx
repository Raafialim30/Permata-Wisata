import {
    FaBell,
    FaCalendarAlt,
    FaChevronLeft,
    FaChevronRight,
    FaSignOutAlt,
    FaThLarge
} from "react-icons/fa";

import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";

import API_BASE_URL from "../config";
import "./css/OwnerAvailability.css";

function OwnerAvailability() {
  const navigate = useNavigate();

  // State Dinamis Properti & Kalender
  const [villasList, setVillasList] = useState([]);
  const [selectedVilla, setSelectedVilla] = useState("");
  const [showNotif, setShowNotif] = useState(false);

  // Default Bulan Maret (indeks 2) Tahun 2026 sesuai template Anda
  const [month, setMonth] = useState(2); 
  const [year, setYear] = useState(2026);

  /* Tanggal ter-booking otomatis dari database */
  const [bookedDates, setBookedDates] = useState([]);

  /* Tanggal blokir manual dari owner (lokal state) */
  const [unavailable, setUnavailable] = useState([10, 11]);

  // 1. Ambil daftar villa milik owner saat komponen dimuat
  useEffect(() => {
    fetch(`${API_BASE_URL}/api/owner/villas-list`)
      .then((res) => res.json())
      .then((resData) => {
        if (resData.status === "success" && resData.data.length > 0) {
          setVillasList(resData.data);
          setSelectedVilla(resData.data[0].name); // Set default ke villa pertama
        }
      })
      .catch((err) => console.error("Gagal memuat list villa owner:", err));
  }, []);

  // 2. Ambil tanggal booked berdasarkan villa, bulan, & tahun terpilih
  useEffect(() => {
    if (!selectedVilla) return;

    fetch(`${API_BASE_URL}/api/owner/booked-dates?villa_name=${encodeURIComponent(selectedVilla)}&month=${month}&year=${year}`)
      .then((res) => res.json())
      .then((resData) => {
        if (resData.status === "success") {
          setBookedDates(resData.booked_dates);
        }
      })
      .catch((err) => console.error("Gagal memuat tanggal booked:", err));
  }, [selectedVilla, month, year]);

  const logout = () => {
    localStorage.removeItem("ownerLogin");
    navigate("/admin/login");
    window.location.reload();
  };

  /* Klik ganti status tanggal */
  const toggleDate = (day) => {
    if (bookedDates.includes(day)) return; // Jika booked (hijau), tidak bisa di-klik

    if (unavailable.includes(day)) {
      setUnavailable(unavailable.filter((d) => d !== day));
    } else {
      setUnavailable([...unavailable, day]);
    }
  };

  /* Bulan sebelumnya */
  const prevMonth = () => {
    setMonth((m) => {
      if (m === 0) {
        setYear((y) => y - 1);
        return 11;
      }
      return m - 1;
    });
  };

  /* Bulan berikutnya */
  const nextMonth = () => {
    setMonth((m) => {
      if (m === 11) {
        setYear((y) => y + 1);
        return 0;
      }
      return m + 1;
    });
  };

  const monthNames = [
    "Januari", "Februari", "Maret", "April", "Mei", "Juni",
    "Juli", "Agustus", "September", "Oktober", "November", "Desember"
  ];

  /* Jumlah hari */
  const daysInMonth = new Date(year, month + 1, 0).getDate();

  /* Hari pertama bulan */
  const firstDay = new Date(year, month, 1).getDay();

  /* Build array kalender */
  const calendar = [];

  /* Slot kosong sebelum tanggal 1 */
  for (let i = 0; i < firstDay; i++) {
    calendar.push(null);
  }

  /* Isi tanggal */
  for (let i = 1; i <= daysInMonth; i++) {
    calendar.push(i);
  }

  return (
    <div className="owner-layout">
      {/* SIDEBAR */}
      <div className="sidebar">
        <div>
          <div className="sidebar-logo">
            <img
              src="/images/logo-jogjavilla.png"
              alt="Jogja Villa"
              style={{ height: "40px", objectFit: "contain", filter: "brightness(0) invert(1)" }}
            />
          </div>

          <div className="menu">
            <div className="menu-item" onClick={() => navigate("/owner/dashboard")} style={{ cursor: "pointer" }}>
              <FaThLarge /> Dashboard
            </div>
            <div className="menu-item active">
              <FaCalendarAlt /> Update Ketersediaan
            </div>
          </div>
        </div>

        <div className="logout" onClick={logout} style={{ cursor: "pointer" }}>
          <FaSignOutAlt /> Keluar
        </div>
      </div>

      {/* MAIN */}
      <div className="main">
        {/* TOPBAR */}
        <div className="topbar">
          <div>
            <p className="welcome">Selamat datang kembali,</p>
            <h2>Owner</h2>
          </div>

          <div className="top-right">
            <FaBell className="bell" onClick={() => setShowNotif(!showNotif)} />
            {showNotif && (
              <div className="notif-box">
                <p>🔔 Pemesanan baru</p>
                <p>💰 Pembayaran diterima</p>
                <p>📅 Jadwal villa diperbarui</p>
              </div>
            )}

            <div className="admin-profile">
              <div className="avatar">O</div>
              <div className="admin-info">
                <span className="admin-name">Owner</span>
                <span className="admin-status">Aktif</span>
              </div>
            </div>
          </div>
        </div>

        {/* TITLE */}
        <div className="page-title">
          <h1>Update Ketersediaan</h1>
          <p>Kelola kalender ketersediaan villa Anda</p>
        </div>

        {/* SELECT VILLA (Dinamis Berdasarkan Database) */}
        <div className="villa-select">
          <label>Pilih Villa</label>
          <select value={selectedVilla} onChange={(e) => setSelectedVilla(e.target.value)}>
            {villasList.length > 0 ? (
              villasList.map((v) => (
                <option key={v.id} value={v.name}>
                  {v.name}
                </option>
              ))
            ) : (
              <option>Memuat daftar villa...</option>
            )}
          </select>
        </div>

        {/* LEGEND */}
        <div className="legend">
          <div className="legend-item">
            <div className="box available"></div>
            Tersedia
          </div>
          <div className="legend-item">
            <div className="box booked"></div>
            Sudah dipesan
          </div>
          <div className="legend-item">
            <div className="box unavailable"></div>
            Tidak tersedia
          </div>
        </div>

        {/* CALENDAR */}
        <div className="calendar-card">
          <div className="calendar-header">
            <h2>
              {monthNames[month]} {year}
            </h2>
            <div className="calendar-nav" style={{ cursor: "pointer" }}>
              <FaChevronLeft onClick={prevMonth} style={{ marginRight: "15px" }} />
              <FaChevronRight onClick={nextMonth} />
            </div>
          </div>

          {/* NAMA HARI */}
          <div className="calendar-week">
            <span>Min</span>
            <span>Sen</span>
            <span>Sel</span>
            <span>Rab</span>
            <span>Kam</span>
            <span>Jum</span>
            <span>Sab</span>
          </div>

          {/* GRID TANGGAL */}
          <div className="calendar-grid">
            {calendar.map((day, index) => {
              if (day === null) {
                return <div key={index}></div>;
              }

              let status = "available";
              if (bookedDates.includes(day)) status = "booked";
              else if (unavailable.includes(day)) status = "unavailable";

              return (
                <div key={index} className={`day ${status}`} onClick={() => toggleDate(day)}>
                  <span className="date-number">{day}</span>
                  {status === "booked" && <span className="check">✓</span>}
                </div>
              );
            })}
          </div>

          <div className="tip">
            💡 Tips: Klik tanggal putih untuk menjadikannya tidak tersedia. Tanggal hijau sudah dipesan oleh customer (lunas) dan tidak bisa diganggu gugat.
          </div>
        </div>
      </div>
    </div>
  );
}

export default OwnerAvailability;