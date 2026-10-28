import { useEffect, useState } from "react";
import {
  CalendarDays,
  Users,
  Wallet,
  RefreshCw,
  Clock,
  AlertCircle,
  Building2,
  ClipboardList,
  ArrowUpRight,
  Sparkles,
  CheckCircle2,
  ChevronRight,
} from "lucide-react";
import { useNavigate } from "react-router-dom";

import API_BASE_URL from "../config";

import "./css/OwnerDashboard.css";

function OwnerDashboard() {
  const navigate = useNavigate();

  // ==========================================================
  // STATE
  // ==========================================================

  const [dashboard, setDashboard] = useState(null);
  const [totalVillas, setTotalVillas] = useState(0);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  // ==========================================================
  // GET STORED USER
  // ==========================================================

  const getStoredUser = () => {
    try {
      const storedUser = localStorage.getItem("user");

      if (!storedUser) {
        return null;
      }

      return JSON.parse(storedUser);
    } catch (err) {
      console.error(
        "Gagal membaca data user:",
        err
      );

      return null;
    }
  };

  const user = getStoredUser();

  // ==========================================================
  // AUTH HEADERS
  // ==========================================================

  const getHeaders = () => {
    const token =
      localStorage.getItem("token");

    const storedUser =
      getStoredUser();

    const headers = {
      "Content-Type": "application/json",
    };

    if (token) {
      headers.Authorization =
        `Bearer ${token}`;
    }

    if (storedUser?.id) {
      headers["X-Owner-User-Id"] =
        String(storedUser.id);
    }

    return headers;
  };

  // ==========================================================
  // LOAD DASHBOARD
  // ==========================================================

  const loadDashboard = async () => {
    try {
      setLoading(true);
      setError("");

      const headers =
        getHeaders();

      // ------------------------------------------------------
      // DASHBOARD STATS
      // ------------------------------------------------------

      const dashboardResponse =
        await fetch(
          `${API_BASE_URL}/api/owner/dashboard-stats`,
          {
            method: "GET",
            headers,
          }
        );

      const dashboardData =
        await dashboardResponse.json();

      if (
        !dashboardResponse.ok ||
        dashboardData.status !== "success"
      ) {
        throw new Error(
          dashboardData.error ||
            dashboardData.message ||
            "Gagal mengambil data Dashboard Owner."
        );
      }

      setDashboard(
        dashboardData
      );

      // ------------------------------------------------------
      // OWNER VILLAS
      // ------------------------------------------------------

      const villasResponse =
        await fetch(
          `${API_BASE_URL}/api/owner/villas-list`,
          {
            method: "GET",
            headers,
          }
        );

      const villasData =
        await villasResponse.json();

      if (
        villasResponse.ok &&
        villasData.status === "success" &&
        Array.isArray(
          villasData.data
        )
      ) {
        setTotalVillas(
          villasData.data.length
        );
      } else {
        setTotalVillas(0);
      }
    } catch (err) {
      console.error(
        "Owner Dashboard Error:",
        err
      );

      setError(
        err.message ||
          "Terjadi kesalahan saat mengambil data Dashboard Owner."
      );
    } finally {
      setLoading(false);
    }
  };

  // ==========================================================
  // CHECK LOGIN
  // ==========================================================

  useEffect(() => {
    const token =
      localStorage.getItem("token");

    const storedUser =
      getStoredUser();

    if (!token || !storedUser) {
      navigate("/login", {
        replace: true,
      });

      return;
    }

    const role =
      String(
        storedUser.role || ""
      ).toLowerCase();

    if (role !== "owner") {
      alert(
        "Halaman ini hanya dapat diakses oleh Owner."
      );

      navigate("/login", {
        replace: true,
      });

      return;
    }

    loadDashboard();

    // loadDashboard sengaja tidak dimasukkan
    // ke dependency karena hanya dijalankan
    // ketika halaman pertama kali dibuka.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [navigate]);

  // ==========================================================
  // FORMAT RUPIAH
  // ==========================================================

  const formatRupiah = (value) => {
    const number =
      Number(value || 0);

    return new Intl.NumberFormat(
      "id-ID",
      {
        style: "currency",
        currency: "IDR",
        maximumFractionDigits: 0,
      }
    ).format(number);
  };

  // ==========================================================
  // FORMAT NUMBER
  // ==========================================================

  const formatNumber = (value) => {
    return new Intl.NumberFormat(
      "id-ID"
    ).format(
      Number(value || 0)
    );
  };

  // ==========================================================
  // DATA
  // ==========================================================

  const stats =
    dashboard?.stats || {};

  const bookings =
    Array.isArray(
      dashboard?.bookings
    )
      ? dashboard.bookings
      : [];

  const activities =
    Array.isArray(
      dashboard?.activities
    )
      ? dashboard.activities
      : [];

  // ==========================================================
  // LOADING
  // ==========================================================

  if (loading) {
    return (
      <div className="owner-content-state">
        <div className="owner-loading-card">
          <div className="owner-loading-logo">
            <Building2 size={28} />
          </div>

          <RefreshCw
            size={30}
            className="owner-spin"
          />

          <h2>
            Memuat Dashboard Owner...
          </h2>

          <p>
            Sedang mengambil data villa
            dan booking Anda.
          </p>
        </div>
      </div>
    );
  }

  // ==========================================================
  // ERROR
  // ==========================================================

  if (error) {
    return (
      <div className="owner-content-state">
        <div className="owner-error-card">
          <div className="owner-error-icon-wrapper">
            <AlertCircle size={32} />
          </div>

          <h2>
            Dashboard gagal dimuat
          </h2>

          <p className="owner-error-text">
            {error}
          </p>

          <button
            type="button"
            onClick={loadDashboard}
            className="owner-primary-button"
          >
            <RefreshCw size={17} />
            Coba Lagi
          </button>
        </div>
      </div>
    );
  }

  // ==========================================================
  // RENDER
  // ==========================================================

  return (
    <div className="owner-dashboard-page">

      {/* ====================================================
          HEADER
      ==================================================== */}

      <header className="owner-header">
        <div className="owner-header-content">

          <div className="owner-breadcrumb">
            <span>Owner</span>
            <span>/</span>
            <strong>Dashboard</strong>
          </div>

          <h1 className="owner-page-title">
            Dashboard Owner
          </h1>

          <p className="owner-page-subtitle">
            Pantau performa dan aktivitas
            villa Anda dalam satu tempat.
          </p>
        </div>

        <button
          type="button"
          onClick={loadDashboard}
          className="owner-refresh-button"
          title="Refresh data"
        >
          <RefreshCw size={17} />
          <span>Refresh</span>
        </button>
      </header>


      {/* ====================================================
          WELCOME CARD
      ==================================================== */}

      <section className="owner-welcome-card">

        <div className="owner-welcome-background-shape shape-one" />
        <div className="owner-welcome-background-shape shape-two" />

        <div className="owner-welcome-content">

          <div className="owner-welcome-icon">
            <Building2 size={28} />
          </div>

          <div className="owner-welcome-text-wrapper">

            <div className="owner-welcome-small">
              <Sparkles size={14} />
              OWNER AREA
            </div>

            <h2 className="owner-welcome-title">
              Selamat datang,{" "}
              <span>
                {user?.username ||
                  "Owner"}
              </span>
            </h2>

            <p className="owner-welcome-text">
              Anda sedang mengelola{" "}
              <strong>
                {formatNumber(
                  totalVillas
                )}
              </strong>{" "}
              villa.
            </p>

          </div>
        </div>

        <div className="owner-welcome-status">

          <div className="owner-status-dot">
            <CheckCircle2 size={15} />
          </div>

          <div>
            <span>Status akun</span>
            <strong>Aktif</strong>
          </div>

        </div>
      </section>


      {/* ====================================================
          STATISTICS
      ==================================================== */}

      <section className="owner-stats-grid">

        <StatCard
          icon={
            <Building2 size={23} />
          }
          label="Total Villa"
          value={formatNumber(
            totalVillas
          )}
          description="Villa milik Anda"
          iconClass="stat-blue"
          numberClass="number-blue"
        />

        <StatCard
          icon={
            <ClipboardList size={23} />
          }
          label="Total Booking"
          value={formatNumber(
            stats.total_bookings
          )}
          description="Seluruh booking"
          iconClass="stat-green"
          numberClass="number-green"
        />

        <StatCard
          icon={
            <Users size={23} />
          }
          label="Total Tamu"
          value={formatNumber(
            stats.total_guests
          )}
          description="Jumlah tamu"
          iconClass="stat-orange"
          numberClass="number-orange"
        />

        <StatCard
          icon={
            <Wallet size={23} />
          }
          label="Pendapatan"
          value={formatRupiah(
            stats.total_revenue
          )}
          description="Pendapatan dari booking"
          iconClass="stat-purple"
          numberClass="number-purple"
        />

      </section>


      {/* ====================================================
          QUICK ACTION
      ==================================================== */}

      <section className="owner-quick-section">

        <div className="owner-quick-content">

          <div className="owner-quick-icon">
            <CalendarDays size={21} />
          </div>

          <div>
            <h3>
              Cek ketersediaan villa
            </h3>

            <p>
              Lihat tanggal yang sudah
              dipesan dan tanggal yang
              masih tersedia.
            </p>
          </div>

        </div>

        <button
          type="button"
          className="owner-quick-button"
          onClick={() =>
            navigate(
              "/owner/availability"
            )
          }
        >
          Lihat Kalender
          <ArrowUpRight size={17} />
        </button>

      </section>


      {/* ====================================================
          UPCOMING BOOKINGS
      ==================================================== */}

      <section className="owner-section">

        <div className="owner-section-header">

          <div>

            <div className="owner-section-label">
              <CalendarDays size={15} />
              BOOKING
            </div>

            <h2 className="owner-section-title">
              Booking Mendatang
            </h2>

            <p className="owner-section-subtitle">
              Daftar booking yang akan datang
            </p>

          </div>

          <button
            type="button"
            onClick={() =>
              navigate(
                "/owner/availability"
              )
            }
            className="owner-secondary-button"
          >
            <CalendarDays size={16} />
            Lihat Ketersediaan
            <ArrowUpRight size={15} />
          </button>

        </div>


        {bookings.length === 0 ? (
          <EmptyState
            icon={
              <CalendarDays size={34} />
            }
            title="Belum ada booking mendatang"
            description="Booking yang akan datang akan muncul di sini."
          />
        ) : (
          <div className="owner-table-wrapper">

            <table className="owner-table">

              <thead>
                <tr>
                  <th>Tamu</th>
                  <th>Villa</th>
                  <th>Tanggal</th>
                  <th>Jumlah Tamu</th>
                  <th>Status</th>
                </tr>
              </thead>

              <tbody>

                {bookings.map(
                  (booking, index) => (
                    <tr
                      key={
                        booking.id ||
                        index
                      }
                    >

                      <td>
                        <div className="owner-guest-cell">

                          <div className="owner-guest-avatar">
                            {(
                              booking.name ||
                              "T"
                            )
                              .charAt(0)
                              .toUpperCase()}
                          </div>

                          <strong>
                            {booking.name ||
                              "-"}
                          </strong>

                        </div>
                      </td>

                      <td>
                        {booking.villa ||
                          "-"}
                      </td>

                      <td>
                        {booking.date ||
                          "-"}
                      </td>

                      <td>
                        {booking.guests ||
                          "-"}
                      </td>

                      <td>
                        <StatusBadge
                          status={
                            booking.status
                          }
                        />
                      </td>

                    </tr>
                  )
                )}

              </tbody>
            </table>
          </div>
        )}

      </section>


      {/* ====================================================
          RECENT ACTIVITIES
      ==================================================== */}

      <section className="owner-section">

        <div className="owner-section-header">

          <div>

            <div className="owner-section-label">
              <Clock size={15} />
              AKTIVITAS
            </div>

            <h2 className="owner-section-title">
              Aktivitas Terbaru
            </h2>

            <p className="owner-section-subtitle">
              Aktivitas terbaru pada villa Anda
            </p>

          </div>

        </div>


        {activities.length === 0 ? (
          <EmptyState
            icon={
              <Clock size={34} />
            }
            title="Belum ada aktivitas"
            description="Aktivitas booking akan muncul di sini."
          />
        ) : (
          <div className="owner-activity-list">

            {activities.map(
              (activity, index) => (
                <div
                  key={
                    activity.id ||
                    index
                  }
                  className="owner-activity-item"
                >

                  <div className="owner-activity-icon">
                    <Clock size={19} />
                  </div>

                  <div className="owner-activity-content">

                    <div className="owner-activity-title">
                      {activity.title ||
                        "Aktivitas booking"}
                    </div>

                    <div className="owner-activity-time">
                      {activity.time ||
                        "Baru saja"}
                    </div>

                  </div>

                  <div className="owner-activity-arrow">
                    <ChevronRight size={17} />
                  </div>

                </div>
              )
            )}

          </div>
        )}

      </section>


      {/* ====================================================
          FOOTER
      ==================================================== */}

      <footer className="owner-footer">

        <span>
          JogjaVilla Owner Panel
        </span>

        <span>
          Dashboard
        </span>

      </footer>

    </div>
  );
}


// ==========================================================
// STAT CARD
// ==========================================================

function StatCard({
  icon,
  label,
  value,
  description,
  iconClass,
  numberClass,
}) {
  return (
    <div className="owner-stat-card">

      <div
        className={`owner-stat-icon ${iconClass}`}
      >
        {icon}
      </div>

      <div className="owner-stat-content">

        <div className="owner-stat-label">
          {label}
        </div>

        <div
          className={`owner-stat-value ${numberClass}`}
        >
          {value}
        </div>

        <div className="owner-stat-description">

          <span className="owner-stat-check">
            <CheckCircle2 size={12} />
          </span>

          {description}

        </div>

      </div>

    </div>
  );
}


// ==========================================================
// STATUS BADGE
// ==========================================================

function StatusBadge({
  status,
}) {
  const normalized =
    String(
      status || ""
    ).toLowerCase();

  let className =
    "status-default";

  if (
    normalized.includes("lunas") ||
    normalized.includes("success") ||
    normalized.includes("berhasil")
  ) {
    className =
      "status-success";
  } else if (
    normalized.includes(
      "menunggu verifikasi"
    )
  ) {
    className =
      "status-warning";
  } else if (
    normalized.includes(
      "menunggu pembayaran"
    ) ||
    normalized.includes("pending")
  ) {
    className =
      "status-info";
  } else if (
    normalized.includes("batal") ||
    normalized.includes("reject") ||
    normalized.includes("ditolak")
  ) {
    className =
      "status-danger";
  }

  return (
    <span
      className={`owner-status-badge ${className}`}
    >
      <span className="status-dot" />

      {status || "-"}
    </span>
  );
}


// ==========================================================
// EMPTY STATE
// ==========================================================

function EmptyState({
  icon,
  title,
  description,
}) {
  return (
    <div className="owner-empty-state">

      <div className="owner-empty-icon">
        {icon}
      </div>

      <div className="owner-empty-title">
        {title}
      </div>

      <div className="owner-empty-description">
        {description}
      </div>

    </div>
  );
}


export default OwnerDashboard;