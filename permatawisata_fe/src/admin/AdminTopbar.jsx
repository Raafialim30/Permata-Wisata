import React, { useState, useEffect, useCallback, useRef } from "react";
import {
  FaBell,
  FaReceipt,
  FaExchangeAlt,
  FaChevronRight,
  FaTimes,
  FaCheckCircle,
} from "react-icons/fa";
import { useNavigate } from "react-router-dom";
import API_BASE_URL from "../config";
import "./css/AdminTopbar.css";

export default function AdminTopbar({ title, subtitle }) {
  const navigate = useNavigate();
  const [showDropdown, setShowDropdown] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(false);
  const dropdownRef = useRef(null);

  // Ambil Header dengan Token Admin
  const getAdminHeaders = useCallback(() => {
    const token = localStorage.getItem("token");
    return token ? { Authorization: `Bearer ${token}` } : {};
  }, []);

  // Fetch Ringkasan Notifikasi / Tugas dari Backend
  const fetchNotifications = useCallback(async () => {
    setLoading(true);
    try {
      const list = [];

      // 1. Cek Validasi Pembayaran Pending
      try {
        const resPayments = await fetch(`${API_BASE_URL}/api/admin/payments`, {
          headers: getAdminHeaders(),
        });
        if (resPayments.ok) {
          const dataP = await resPayments.json();
          const paymentsArray = Array.isArray(dataP?.data) ? dataP.data : [];
          const pendingPayments = paymentsArray.filter(
            (p) =>
              p?.status === "Menunggu Verifikasi" ||
              p?.status === "Menunggu Pembayaran"
          );
          pendingPayments.forEach((item) => {
            list.push({
              id: `pay-${item.id}`,
              type: "payment",
              title: "Validasi Pembayaran",
              message: `${item.full_name || "Pelanggan"} (${item.villa_name || "Villa"})`,
              time: "Perlu ditinjau",
              targetPath: "/admin/payment",
              icon: <FaReceipt className="notif-icon payment" />,
            });
          });
        }
      } catch (errPayment) {
        console.warn("Gagal memuat notifikasi pembayaran:", errPayment);
      }

      // 2. Cek Pengajuan Perubahan Owner
      try {
        const resRequests = await fetch(
          `${API_BASE_URL}/api/admin/change-requests?status=Menunggu`,
          { headers: getAdminHeaders() }
        );
        if (resRequests.ok) {
          const dataR = await resRequests.json();
          const requestsArray = Array.isArray(dataR?.requests) ? dataR.requests : [];
          requestsArray.forEach((item) => {
            list.push({
              id: `req-${item.id}`,
              type: "request",
              title: "Pengajuan Perubahan Owner",
              message: `${item.villa_name || "Villa"} - ${
                item.owner_username || "Owner"
              }`,
              time: "Menunggu persetujuan",
              targetPath: "/admin/change-requests",
              icon: <FaExchangeAlt className="notif-icon request" />,
            });
          });
        }
      } catch (errReq) {
        console.warn("Gagal memuat notifikasi pengajuan:", errReq);
      }

      setNotifications(list);
    } catch (err) {
      console.error("Gagal memuat notifikasi topbar:", err);
    } finally {
      setLoading(false);
    }
  }, [getAdminHeaders]);

  useEffect(() => {
    fetchNotifications();
  }, [fetchNotifications]);

  // Event listener untuk menutup dropdown saat mengklik di luar area
  useEffect(() => {
    function handleClickOutside(event) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setShowDropdown(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleNotifClick = (targetPath) => {
    setShowDropdown(false);
    navigate(targetPath);
  };

  const unreadCount = notifications.length;

  return (
    <div className="admin-topbar-container">
      {/* JUDUL HALAMAN HARI INI */}
      <div className="topbar-page-info">
        {title ? (
          <>
            <h1>{title}</h1>
            {subtitle && <p>{subtitle}</p>}
          </>
        ) : (
          <>
            <p className="welcome">Selamat datang kembali,</p>
            <h2>Administrator</h2>
          </>
        )}
      </div>

      {/* AREA KANAN: LONCENG NOTIFIKASI & PROFIL */}
      <div className="topbar-right-area" ref={dropdownRef}>
        {/* LONCENG NOTIFIKASI */}
        <div className="bell-wrapper">
          <button
            type="button"
            className={`bell-btn ${showDropdown ? "active" : ""}`}
            onClick={() => setShowDropdown(!showDropdown)}
            title="Notifikasi & Tugas"
          >
            <FaBell />
            {unreadCount > 0 && (
              <span className="notif-badge">{unreadCount}</span>
            )}
          </button>

          {/* DROPDOWN MENU NOTIFIKASI */}
          {showDropdown && (
            <div className="notif-dropdown">
              <div className="notif-dropdown-header">
                <div>
                  <h3>Aktivitas & Tugas</h3>
                  <p>{unreadCount} hal perlu tindakan Anda</p>
                </div>
                <button
                  type="button"
                  className="close-dropdown-btn"
                  onClick={() => setShowDropdown(false)}
                >
                  <FaTimes />
                </button>
              </div>

              <div className="notif-dropdown-body">
                {loading ? (
                  <div className="notif-empty">Memuat aktivitas...</div>
                ) : notifications.length === 0 ? (
                  <div className="notif-empty">
                    <FaCheckCircle style={{ color: "#16a34a", fontSize: "24px" }} />
                    <p>Semua tugas telah selesai!</p>
                  </div>
                ) : (
                  notifications.map((item) => (
                    <div
                      key={item.id}
                      className="notif-item"
                      onClick={() => handleNotifClick(item.targetPath)}
                    >
                      <div className="notif-icon-box">{item.icon}</div>
                      <div className="notif-content">
                        <strong>{item.title}</strong>
                        <p>{item.message}</p>
                        <small>{item.time}</small>
                      </div>
                      <FaChevronRight className="notif-arrow" />
                    </div>
                  ))
                )}
              </div>
            </div>
          )}
        </div>

        {/* PROFIL ADMIN */}
        <div className="admin-profile">
          <div className="avatar">A</div>
          <div className="admin-info">
            <span className="admin-name">Admin</span>
            <span className="admin-status">Aktif</span>
          </div>
        </div>
      </div>
    </div>
  );
}