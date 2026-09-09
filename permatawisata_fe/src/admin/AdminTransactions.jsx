import {
  FaBell,
  FaCalendarAlt,
  FaCheckCircle,
  FaHome,
  FaSignOutAlt,
  FaThLarge,
  FaArrowRight,
  FaTimes,
  FaMoneyBillWave
} from "react-icons/fa";

import { useEffect, useRef, useState } from "react";
import { Link, useNavigate } from "react-router-dom";

import API_BASE_URL from "../config";
import "./css/AdminTransactions.css";

function AdminTransactions() {
  const navigate = useNavigate();

  const [data, setData] = useState([]);
  const [search, setSearch] = useState("");
  const [showNotif, setShowNotif] = useState(false);

  // Referensi dropdown notifikasi
  const notifRef = useRef(null);

  // =========================================================
  // AMBIL DATA TRANSAKSI DARI BACKEND
  // =========================================================
  useEffect(() => {
    fetch(`${API_BASE_URL}/api/admin/bookings`)
      .then((res) => res.json())
      .then((resData) => {
        if (resData.status === "success") {
          setData(resData.data || []);
        }
      })
      .catch((err) =>
        console.error(
          "Gagal memuat data transaksi pemesanan:",
          err
        )
      );
  }, []);

  // =========================================================
  // NOTIFIKASI ADMIN
  // Menggunakan DATA ASLI dari transaksi.
  //
  // Booking dengan status Pending dianggap masih perlu
  // divalidasi oleh admin.
  // =========================================================
  const pendingNotifications = data
    .filter((item) => {
      const status = String(item.status || "").toLowerCase();

      return (
        status === "pending" ||
        status === "menunggu"
      );
    })
    .sort((a, b) => {
      return Number(b.id || 0) - Number(a.id || 0);
    });

  const notificationCount = pendingNotifications.length;

  // =========================================================
  // TUTUP DROPDOWN JIKA KLIK DI LUAR DROPDOWN
  // =========================================================
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (
        notifRef.current &&
        !notifRef.current.contains(event.target)
      ) {
        setShowNotif(false);
      }
    };

    if (showNotif) {
      document.addEventListener(
        "mousedown",
        handleClickOutside
      );
    }

    return () => {
      document.removeEventListener(
        "mousedown",
        handleClickOutside
      );
    };
  }, [showNotif]);

  // =========================================================
  // KLIK NOTIFIKASI
  // =========================================================
  const handleNotificationClick = (bookingId) => {
    setShowNotif(false);

    // Arahkan admin ke halaman validasi pembayaran.
    // Jika halaman payment Anda mempunyai sistem filter ID,
    // nantinya bisa dikembangkan untuk langsung membuka booking.
    navigate("/admin/payment");
  };

  // =========================================================
  // KLIK "LIHAT SEMUA VALIDASI PEMBAYARAN"
  // =========================================================
  const handleViewAllNotifications = () => {
    setShowNotif(false);
    navigate("/admin/payment");
  };

  // =========================================================
  // SEARCH
  // =========================================================
  const filteredData = data.filter((item) => {
    const searchLower = search.toLowerCase();

    const idString = item.id
      ? String(item.id)
      : "";

    const nameString = item.full_name
      ? item.full_name.toLowerCase()
      : "";

    const villaString = item.villa_name
      ? item.villa_name.toLowerCase()
      : "";

    return (
      idString.includes(searchLower) ||
      nameString.includes(searchLower) ||
      villaString.includes(searchLower)
    );
  });

  // =========================================================
  // LOGOUT
  // =========================================================
  const handleLogout = () => {
    localStorage.removeItem("adminLogin");
    navigate("/admin/login");
    window.location.reload();
  };

  return (
    <div className="admin-layout">

      {/* =====================================================
          SIDEBAR
      ====================================================== */}
      <div className="sidebar">

        <div>

          <div className="sidebar-logo">
            <img
              src="/images/logo-jogjavilla.png"
              alt="Jogja Villa"
              style={{
                height: "40px",
                objectFit: "contain",
                filter: "brightness(0) invert(1)"
              }}
            />
          </div>

          <div className="menu">

            <Link
              to="/admin/dashboard"
              className="menu-item"
            >
              <FaThLarge />
              Dashboard
            </Link>

            <Link
              to="/admin/villas"
              className="menu-item"
            >
              <FaHome />
              Kelola Villa
            </Link>

            <Link
              to="/admin/transactions"
              className="menu-item active"
            >
              <FaCalendarAlt />
              Transaksi Pemesanan
            </Link>

            <Link
              to="/admin/payment"
              className="menu-item"
            >
              <FaCheckCircle />
              Validasi Pembayaran
            </Link>

          </div>
        </div>

        <div
          className="logout"
          onClick={handleLogout}
          style={{ cursor: "pointer" }}
        >
          <FaSignOutAlt />
          Keluar
        </div>

      </div>

      {/* =====================================================
          MAIN
      ====================================================== */}
      <div className="main">

        {/* ===================================================
            TOPBAR
        ==================================================== */}
        <div className="topbar">

          <div>
            <p className="welcome">
              Selamat datang kembali,
            </p>

            <h2>
              Admin
            </h2>
          </div>

          <div className="top-right">

            {/* =================================================
                🔔 NOTIFIKASI ADMIN
            ================================================== */}
            <div
              className="bell-wrapper"
              ref={notifRef}
            >

              <button
                type="button"
                className={`bell-button ${
                  showNotif ? "active" : ""
                }`}
                onClick={() =>
                  setShowNotif((prev) => !prev)
                }
                aria-label="Notifikasi admin"
                title="Notifikasi"
              >
                <FaBell className="bell" />

                {notificationCount > 0 && (
                  <span className="notif-badge">
                    {notificationCount > 99
                      ? "99+"
                      : notificationCount}
                  </span>
                )}
              </button>

              {/* =================================================
                  DROPDOWN NOTIFIKASI
              ================================================== */}
              {showNotif && (
                <div className="notif-dropdown">

                  {/* HEADER */}
                  <div className="notif-header">

                    <div>
                      <h4>
                        Aktivitas Admin
                      </h4>

                      <span>
                        {notificationCount > 0
                          ? `${notificationCount} aktivitas perlu ditangani`
                          : "Tidak ada aktivitas yang perlu ditangani"}
                      </span>
                    </div>

                    <button
                      type="button"
                      className="notif-close"
                      onClick={() =>
                        setShowNotif(false)
                      }
                      aria-label="Tutup notifikasi"
                    >
                      <FaTimes />
                    </button>

                  </div>

                  {/* =================================================
                      LIST NOTIFIKASI
                  ================================================== */}
                  <div className="notif-list">

                    {pendingNotifications.length > 0 ? (

                      pendingNotifications.map(
                        (item) => (
                          <button
                            type="button"
                            className="notification-item"
                            key={item.id}
                            onClick={() =>
                              handleNotificationClick(
                                item.id
                              )
                            }
                          >

                            <div className="notification-icon">
                              <FaMoneyBillWave />
                            </div>

                            <div className="notification-content">

                              <strong>
                                Pembayaran perlu divalidasi
                              </strong>

                              <span>
                                Booking #{item.id}
                              </span>

                              <span>
                                {item.full_name || "Pelanggan"}
                              </span>

                              <span className="notification-villa">
                                {item.villa_name ||
                                  "Villa tidak tersedia"}
                              </span>

                            </div>

                            <FaArrowRight className="notification-arrow" />

                          </button>
                        )
                      )

                    ) : (

                      <div className="notification-empty">

                        <FaCheckCircle />

                        <p>
                          Semua aktivitas sudah ditangani.
                        </p>

                      </div>

                    )}

                  </div>

                  {/* =================================================
                      FOOTER
                  ================================================== */}
                  <button
                    type="button"
                    className="notif-footer"
                    onClick={handleViewAllNotifications}
                  >
                    <FaCheckCircle />

                    <span>
                      Lihat semua validasi pembayaran
                    </span>

                    <FaArrowRight />

                  </button>

                </div>
              )}

            </div>

            {/* =================================================
                ADMIN PROFILE
            ================================================== */}
            <div className="admin-profile">

              <div className="avatar">
                A
              </div>

              <div className="admin-info">

                <span className="admin-name">
                  Admin
                </span>

                <span className="admin-status">
                  Aktif
                </span>

              </div>

            </div>

          </div>

        </div>

        {/* =====================================================
            HEADER
        ====================================================== */}
        <div className="page-header">

          <h1>
            Transaksi Pemesanan
          </h1>

          <p>
            Lihat dan kelola semua data pemesanan
          </p>

        </div>

        {/* =====================================================
            SEARCH
        ====================================================== */}
        <div className="search-bar">

          <input
            placeholder="Cari nama, villa, atau ID booking..."
            value={search}
            onChange={(e) =>
              setSearch(e.target.value)
            }
          />

          <button>
            Semua Status
          </button>

        </div>

        {/* =====================================================
            TABLE
        ====================================================== */}
        <div className="table-container">

          <table>

            <thead>

              <tr>
                <th>ID Booking</th>
                <th>Pelanggan</th>
                <th>Villa</th>
                <th>Check-in</th>
                <th>Check-out</th>
                <th>Jumlah</th>
                <th>Pembayaran</th>
                <th>Status</th>
              </tr>

            </thead>

            <tbody>

              {filteredData.length > 0 ? (

                filteredData.map((item, i) => (

                  <tr
                    key={item.id || i}
                  >

                    <td>
                      {item.id}
                    </td>

                    <td className="customer">

                      <div className="avatar small">
                        👤
                      </div>

                      {item.full_name}

                    </td>

                    <td>

                      <div>
                        {item.villa_name}
                      </div>

                      {item.addons_info && (
                        <div
                          style={{
                            fontSize: "0.75rem",
                            color: "#e67e22",
                            marginTop: "4px",
                            fontWeight: "600"
                          }}
                        >
                          ➕ Addons:{" "}
                          {item.addons_info}
                        </div>
                      )}

                    </td>

                    <td>
                      <FaCalendarAlt />{" "}
                      {item.check_in}
                    </td>

                    <td>
                      <FaCalendarAlt />{" "}
                      {item.check_out}
                    </td>

                    {/* FORMAT RUPIAH */}
                    <td>

                      {item.total_price
                        ? `Rp ${Number(
                            item.total_price
                          ).toLocaleString("id-ID")}`
                        : "Rp 0"}

                    </td>

                    {/* STATUS PEMBAYARAN */}
                    <td>

                      <span
                        className={`badge ${
                          item.status
                            ? item.status.toLowerCase()
                            : "pending"
                        }`}
                      >
                        {item.status === "Success"
                          ? "Lunas"
                          : "Menunggu"}
                      </span>

                    </td>

                    {/* STATUS TRANSAKSI */}
                    <td>

                      <span
                        className={`badge ${
                          item.status
                            ? item.status.toLowerCase()
                            : "pending"
                        }`}
                      >

                        {item.status === "Success" &&
                          "Dikonfirmasi"}

                        {item.status === "Pending" &&
                          "Menunggu"}

                        {item.status === "Reject" &&
                          "Ditolak"}

                      </span>

                    </td>

                  </tr>

                ))

              ) : (

                <tr>

                  <td
                    colSpan="8"
                    className="empty"
                    style={{
                      textAlign: "center",
                      padding: "20px",
                      color: "#888"
                    }}
                  >
                    Data tidak ditemukan
                  </td>

                </tr>

              )}

            </tbody>

          </table>

        </div>

      </div>

    </div>
  );
}

export default AdminTransactions;