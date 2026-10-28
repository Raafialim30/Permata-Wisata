import React from "react";
import { NavLink, useNavigate } from "react-router-dom";
import {
  Home,
  CalendarDays,
  CircleDollarSign,
  LogOut,
  ChevronRight,
  Sparkles,
  Building2,
} from "lucide-react";

import "./css/OwnerSidebar.css";

const OwnerSidebar = () => {
  const navigate = useNavigate();

  // ==========================================================
  // USER / OWNER DATA
  // ==========================================================

  let storedUser = null;

  try {
    const userData = localStorage.getItem("user");

    if (userData) {
      storedUser = JSON.parse(userData);
    }
  } catch (error) {
    console.error("Gagal membaca data user:", error);
  }

  const username =
    storedUser?.username ||
    localStorage.getItem("owner_username") ||
    localStorage.getItem("username") ||
    "Villa Owner";

  const villaName =
    localStorage.getItem("owner_villa_name") ||
    localStorage.getItem("villa_name") ||
    "Villa Anda";

  const avatarLetter =
    villaName?.trim()?.charAt(0)?.toUpperCase() ||
    username?.trim()?.charAt(0)?.toUpperCase() ||
    "V";

  // ==========================================================
  // LOGOUT
  // ==========================================================

  const handleLogout = () => {
    const confirmed = window.confirm(
      "Apakah Anda yakin ingin keluar dari halaman Owner?"
    );

    if (!confirmed) {
      return;
    }

    // Session owner
    localStorage.removeItem("owner_token");
    localStorage.removeItem("owner_username");
    localStorage.removeItem("owner_villa_name");

    // Session umum
    localStorage.removeItem("token");
    localStorage.removeItem("username");
    localStorage.removeItem("villa_name");
    localStorage.removeItem("user");

    navigate("/login", {
      replace: true,
    });
  };

  return (
    <aside className="owner-sidebar">
      {/* =====================================================
          DECORATION
      ====================================================== */}

      <div className="owner-sidebar-decoration owner-sidebar-decoration-one" />
      <div className="owner-sidebar-decoration owner-sidebar-decoration-two" />

      {/* =====================================================
          BRAND
      ====================================================== */}

      <div className="owner-sidebar-brand">
        <div className="owner-brand-mark">
          <span className="owner-brand-leaf leaf-one" />
          <span className="owner-brand-leaf leaf-two" />
          <span className="owner-brand-leaf leaf-three" />
        </div>

        <div className="owner-brand-copy">
          <span className="owner-brand-text">
            JogjaVilla
          </span>

          <span className="owner-brand-subtitle">
            Property Management
          </span>
        </div>
      </div>

      {/* =====================================================
          PANEL LABEL
      ====================================================== */}

      <div className="owner-sidebar-label">
        <span className="owner-sidebar-status-dot" />
        <span>OWNER PANEL</span>
      </div>

      {/* =====================================================
          NAVIGATION
      ====================================================== */}

      <nav className="owner-sidebar-nav">
        {/* DASHBOARD */}
        <NavLink
          to="/owner/dashboard"
          end
          className={({ isActive }) =>
            `owner-nav-item ${isActive ? "active" : ""}`
          }
        >
          <span className="owner-nav-icon">
            <Home size={20} strokeWidth={2} />
          </span>

          <span className="owner-nav-text">
            Dashboard
          </span>

          <ChevronRight
            className="owner-nav-arrow"
            size={17}
            strokeWidth={2}
          />
        </NavLink>

        {/* KETERSEDIAAN */}
        <NavLink
          to="/owner/availability"
          className={({ isActive }) =>
            `owner-nav-item ${isActive ? "active" : ""}`
          }
        >
          <span className="owner-nav-icon">
            <CalendarDays size={20} strokeWidth={2} />
          </span>

          <span className="owner-nav-text">
            Ketersediaan
          </span>

          <ChevronRight
            className="owner-nav-arrow"
            size={17}
            strokeWidth={2}
          />
        </NavLink>

        {/* ===================================================
            PENYESUAIAN HARGA
            Halaman: /owner/price-request
        ==================================================== */}
        <NavLink
          to="/owner/price-request"
          className={({ isActive }) =>
            `owner-nav-item ${isActive ? "active" : ""}`
          }
        >
          <span className="owner-nav-icon">
            <CircleDollarSign size={20} strokeWidth={2} />
          </span>

          <span className="owner-nav-text">
            Penyesuaian Harga
          </span>

          <ChevronRight
            className="owner-nav-arrow"
            size={17}
            strokeWidth={2}
          />
        </NavLink>
      </nav>

      {/* =====================================================
          INFO CARD
      ====================================================== */}

      <div className="owner-sidebar-info">
        <div className="owner-sidebar-info-icon">
          <Sparkles size={18} strokeWidth={2} />
        </div>

        <div className="owner-sidebar-info-content">
          <strong>Kelola villa Anda</strong>

          <span>
            Pantau booking, ketersediaan, dan
            penyesuaian harga villa dengan mudah.
          </span>
        </div>
      </div>

      {/* =====================================================
          SPACER
      ====================================================== */}

      <div className="owner-sidebar-spacer" />

      {/* =====================================================
          PROFILE
      ====================================================== */}

      <div className="owner-sidebar-bottom">
        <div className="owner-profile">
          <div className="owner-profile-avatar">
            {avatarLetter}
          </div>

          <div className="owner-profile-info">
            <strong>{username}</strong>

            <span>
              Villa Owner
            </span>
          </div>

          <span className="owner-profile-online" />
        </div>

        <div className="owner-profile-villa">
          <Building2 size={14} />

          <span title={villaName}>
            {villaName}
          </span>
        </div>

        <button
          type="button"
          className="owner-logout-button"
          onClick={handleLogout}
        >
          <LogOut
            size={18}
            strokeWidth={2}
          />

          <span>Keluar</span>
        </button>
      </div>
    </aside>
  );
};

export default OwnerSidebar;