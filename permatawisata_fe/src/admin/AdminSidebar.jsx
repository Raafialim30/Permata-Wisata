import React from "react";
import { NavLink, useNavigate } from "react-router-dom";
import {
  FaBell,
  FaCalendarAlt,
  FaCheckCircle,
  FaChevronRight,
  FaHome,
  FaReply,
  FaSignOutAlt,
  FaThLarge,
  FaUserPlus
} from "react-icons/fa";
import Swal from "sweetalert2";

import "./css/AdminSidebar.css";

const AdminSidebar = () => {
  const navigate = useNavigate();

  const handleLogout = async () => {
    const result = await Swal.fire({
      title: "Konfirmasi Keluar",
      text: "Apakah Anda yakin ingin keluar dari halaman Admin?",
      icon: "warning",
      showCancelButton: true,
      confirmButtonColor: "#dc2626",
      cancelButtonColor: "#64748b",
      confirmButtonText: "Ya, Keluar",
      cancelButtonText: "Batal"
    });

    if (!result.isConfirmed) {
      return;
    }

    /*
      Hapus seluruh key login Admin yang mungkin digunakan
      oleh versi sebelumnya.
    */
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    localStorage.removeItem("adminLogin");
    localStorage.removeItem("adminToken");
    localStorage.removeItem("adminUser");

    navigate("/login", {
      replace: true
    });
  };

  const menuItems = [
    {
      label: "Dashboard",
      path: "/admin/dashboard",
      icon: FaThLarge
    },
    {
      label: "Kelola Villa",
      path: "/admin/villas",
      icon: FaHome
    },
    {
      label: "Transaksi Pemesanan",
      path: "/admin/transactions",
      icon: FaCalendarAlt
    },
    {
      label: "Validasi Pembayaran",
      path: "/admin/payment",
      icon: FaCheckCircle
    },
    {
      label: "Pengajuan Owner",
      path: "/admin/change-requests",
      icon: FaReply
    },
    {
      label: "Pendaftaran Owner",
      path: "/admin/owner-registrations",
      icon: FaUserPlus
    }
  ];

  return (
    <aside className="admin-sidebar">
      {/* LOGO */}
      <div className="admin-sidebar-logo">
        <img
          src="/images/logo-jogjavilla.png"
          alt="Jogja Villa"
          className="admin-sidebar-logo-image"
        />
      </div>

      {/* LABEL */}
      <div className="admin-sidebar-label">
        <span className="admin-sidebar-status-dot" />
        <span>ADMIN PANEL</span>
      </div>

      {/* MENU */}
      <nav className="admin-sidebar-menu">
        {menuItems.map((item) => {
          const Icon = item.icon;

          return (
            <NavLink
              key={item.path}
              to={item.path}
              end
              className={({ isActive }) =>
                `admin-menu-item ${isActive ? "active" : ""}`
              }
            >
              <span className="admin-menu-icon">
                <Icon size={18} />
              </span>

              <span className="admin-menu-text">
                {item.label}
              </span>

              <FaChevronRight className="admin-menu-arrow" />
            </NavLink>
          );
        })}
      </nav>

      {/* SPACER */}
      <div className="admin-sidebar-spacer" />

      {/* INFO */}
      <div className="admin-sidebar-info">
        <div className="admin-sidebar-info-icon">
          <FaBell size={14} />
        </div>

        <div>
          <strong>Admin</strong>
          <span>
            Kelola villa, pemesanan, pembayaran, dan akun owner.
          </span>
        </div>
      </div>

      {/* LOGOUT */}
      <button
        type="button"
        className="admin-sidebar-logout"
        onClick={handleLogout}
      >
        <FaSignOutAlt size={17} />
        <span>Keluar</span>
      </button>
    </aside>
  );
};

export default AdminSidebar;