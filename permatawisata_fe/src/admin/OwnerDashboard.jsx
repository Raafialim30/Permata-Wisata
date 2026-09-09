import {
    FaBell,
    FaCalendarAlt,
    FaClock,
    FaDollarSign,
    FaSignOutAlt,
    FaThLarge,
    FaUsers
} from "react-icons/fa";

import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";

import API_BASE_URL from "../config";
import "./css/OwnerDashboard.css";

function OwnerDashboard() {
  const navigate = useNavigate();
  const [showNotif, setShowNotif] = useState(false);
  
  // State untuk data dinamis backend
  const [stats, setStats] = useState({
    total_bookings: 0,
    total_revenue: 0,
    total_guests: 0,
    upcoming_bookings: 0
  });
  const [bookings, setBookings] = useState([]);
  const [activities, setActivities] = useState([]);

  // Ambil data dari backend Flask
  const fetchOwnerData = () => {
    fetch(`${API_BASE_URL}/api/owner/dashboard-stats`)
      .then((res) => res.json())
      .then((resData) => {
        if (resData.status === "success") {
          setStats(resData.stats);
          setBookings(resData.bookings);
          setActivities(resData.activities);
        }
      })
      .catch((err) => console.error("Gagal memuat data dashboard owner:", err));
  };

  useEffect(() => {
    fetchOwnerData();
  }, []);

  /* LOGOUT FIX */
  const logout = () => {
    localStorage.removeItem("ownerLogin"); // jika ada session owner
    navigate("/admin/login");
    window.location.reload();
  };

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
            <Link to="/owner/dashboard" className="menu-item active">
              <FaThLarge /> Dashboard
            </Link>
            <Link to="/owner/availability" className="menu-item">
              <FaCalendarAlt /> Update Ketersediaan
            </Link>
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
            <h2>Pengguna Owner</h2>
          </div>

          <div className="top-right">
            <div className="notif-area">
              <FaBell className="bell" onClick={() => setShowNotif(!showNotif)} />
              {showNotif && (
                <div className="notif-box">
                  <p>🔔 Pemesanan baru</p>
                  <p>💰 Pembayaran diterima</p>
                  <p>📅 Jadwal villa diperbarui</p>
                </div>
              )}
            </div>

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
        <div className="dashboard-title">
          <h1>Dashboard Pemilik Villa</h1>
          <p>Pantau performa villa Anda dan pemesanan yang akan datang</p>
        </div>

        {/* STATS CARDS */}
        <div className="stats">
          <div className="stat-card">
            <div className="icon blue">
              <FaCalendarAlt />
            </div>
            <div className="stat-info">
              <p>Total Pemesanan</p>
              <h2>{stats.total_bookings}</h2>
            </div>
          </div>

          <div className="stat-card">
            <div className="icon green">
              <FaDollarSign />
            </div>
            <div className="stat-info">
              <p>Total Pendapatan</p>
              <h2>
                {stats.total_revenue >= 1000000
                  ? `Rp ${(stats.total_revenue / 1000000).toFixed(1)}Jt`
                  : `Rp ${Number(stats.total_revenue).toLocaleString("id-ID")}`}
              </h2>
            </div>
          </div>

          <div className="stat-card">
            <div className="icon gold">
              <FaUsers />
            </div>
            <div className="stat-info">
              <p>Total Tamu</p>
              <h2>{stats.total_guests}</h2>
            </div>
          </div>

          <div className="stat-card">
            <div className="icon navy">
              <FaClock />
            </div>
            <div className="stat-info">
              <p>Pemesanan Mendatang</p>
              <h2>{stats.upcoming_bookings}</h2>
            </div>
          </div>
        </div>

        {/* GRID */}
        <div className="owner-grid">
          {/* UPCOMING BOOKINGS */}
          <div className="upcoming-card">
            <h2>Pemesanan Mendatang</h2>
            <p>Pemesanan ter-update dari database</p>

            {bookings.length > 0 ? (
              bookings.map((b, index) => (
                <div className="booking-item" key={index}>
                  <div>
                    <h4>{b.name}</h4>
                    <p>{b.villa}</p>
                    <p className="booking-date">
                      {b.date} • {b.guests}
                    </p>
                  </div>
                  <span className={`status ${b.status}`}>
                    {b.status === "success" ? "dikonfirmasi" : b.status === "pending" ? "menunggu" : b.status}
                  </span>
                </div>
              ))
            ) : (
              <p style={{ color: "#888", fontSize: "14px", marginTop: "15px" }}>
                Belum ada pemesanan mendatang.
              </p>
            )}
          </div>

          {/* ACTIVITY */}
          <div className="activity-card">
            <h2>Aktivitas Terbaru</h2>
            <p>Pembaruan terbaru pada villa Anda</p>

            {activities.length > 0 ? (
              activities.map((a, index) => (
                <div className="activity-item" key={index}>
                  <div className="activity-icon">
                    <FaCalendarAlt />
                  </div>
                  <div>
                    <h4>{a.title}</h4>
                    <p>{a.id}</p>
                    <small>{a.time}</small>
                  </div>
                </div>
              ))
            ) : (
              <p style={{ color: "#888", fontSize: "14px", marginTop: "15px" }}>
                Belum ada aktivitas transaksi terbaru.
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default OwnerDashboard;