import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  FaCalendarAlt,
  FaDollarSign,
  FaHome,
  FaPercent,
  FaSave
} from "react-icons/fa";
import API_BASE_URL from "../config";
import AdminSidebar from "./AdminSidebar";
import AdminTopbar from "./AdminTopbar";
import "./css/AdminDashboard.css";

function AdminDashboard() {
  const navigate = useNavigate();

  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [stats, setStats] = useState({
    total_bookings: 0,
    total_revenue: "Rp 0",
    total_villas: 0,
    pending_payments: 0
  });

  const [commissionRate, setCommissionRate] = useState(10);
  const [savingCommission, setSavingCommission] = useState(false);
  const [commissionMsg, setCommissionMsg] = useState({ type: "", text: "" });

  useEffect(() => {
    const fetchCommission = async () => {
      try {
        const res = await fetch(`${API_BASE_URL}/api/settings/commission`);
        const data = await res.json();
        if (data.status === "success" && data.commission_rate !== undefined) {
          setCommissionRate(Number(data.commission_rate));
        }
      } catch (err) {
        console.error("Gagal mengambil data komisi:", err);
      }
    };
    fetchCommission();
  }, []);

  useEffect(() => {
    const token = localStorage.getItem("token");
    if (!token) {
      navigate("/login", { replace: true });
      return undefined;
    }

    let active = true;
    const loadDashboard = async () => {
      setLoading(true);
      setLoadError("");
      try {
        const response = await fetch(`${API_BASE_URL}/api/admin/dashboard-data`, {
          headers: { 
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}` 
          },
        });

        if (response.status === 401 || response.status === 403) {
          localStorage.removeItem("token");
          localStorage.removeItem("user");
          navigate("/login", { replace: true });
          return;
        }

        const data = await response.json();

        if (!response.ok || data.status !== "success") {
          throw new Error(data.error || data.message || "Gagal memuat ringkasan dashboard.");
        }

        if (active) {
          setBookings(Array.isArray(data.bookings) ? data.bookings : []);
          setStats(data.stats || {
            total_bookings: 0,
            total_revenue: "Rp 0",
            total_villas: 0,
            pending_payments: 0
          });
        }
      } catch (error) {
        console.error("Gagal memuat data dashboard Admin:", error);
        if (active) setLoadError(error.message || "Gagal memuat dashboard.");
      } finally {
        if (active) setLoading(false);
      }
    };

    loadDashboard();
    return () => {
      active = false;
    };
  }, [navigate]);

  const handleSaveCommission = async () => {
    setSavingCommission(true);
    setCommissionMsg({ type: "", text: "" });
    try {
      const token = localStorage.getItem("token");
      const res = await fetch(`${API_BASE_URL}/api/admin/settings/commission`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ commission_rate: commissionRate })
      });
      const data = await res.json();
      if (res.ok && data.status === "success") {
        setCommissionMsg({ type: "success", text: "Komisi berhasil diperbarui & tersinkron!" });
      } else {
        throw new Error(data.error || "Gagal memperbarui komisi");
      }
    } catch (err) {
      setCommissionMsg({ type: "error", text: err.message || "Gagal menyimpan komisi" });
    } finally {
      setSavingCommission(false);
    }
  };

  const calculateAdminRevenue = (rawRevenue) => {
    if (!rawRevenue) return "Rp 0";
    const numericValue = Number(String(rawRevenue).replace(/[^0-9]/g, "")) || 0;
    const adminShare = numericValue * (commissionRate / 100);
    return `Rp ${Math.round(adminShare).toLocaleString("id-ID")}`;
  };

  return (
    <div className="admin-layout">
      <AdminSidebar />

      {/* MAIN CONTENT */}
      <div className="main">
        {/* TOPBAR */}
        <AdminTopbar
          title="Ringkasan Dashboard"
          subtitle="Pantau performa pemesanan villa dan aktivitas terbaru"
        />

        {/* COMMISSION SETTING CARD */}
        <div className="commission-setting-card">
          <div className="commission-info">
            <div className="commission-icon">
              <FaPercent />
            </div>
            <div>
              <h3>Potongan Komisi Platform</h3>
              <p>Atur persentase komisi yang berlaku untuk seluruh Owner secara terpusat.</p>
            </div>
          </div>
          <div className="commission-action">
            <div className="input-group">
              <input
                type="number"
                min="0"
                max="100"
                step="0.1"
                value={commissionRate}
                onChange={(e) => setCommissionRate(Number(e.target.value))}
                disabled={savingCommission}
              />
              <span className="unit">%</span>
            </div>
            <button
              type="button"
              className="save-commission-btn"
              onClick={handleSaveCommission}
              disabled={savingCommission}
            >
              <FaSave />
              {savingCommission ? "Menyimpan..." : "Simpan Komisi"}
            </button>
          </div>
        </div>

        {commissionMsg.text && (
          <div className={`commission-alert ${commissionMsg.type}`}>
            {commissionMsg.text}
          </div>
        )}

        {/* STATS */}
        <div className="stats">
          <div className="stat-card">
            <div className="icon blue">
              <FaCalendarAlt />
            </div>
            <div className="stat-info">
              <p>Total Pemesanan</p>
              <h2>{stats?.total_bookings ?? 0}</h2>
            </div>
          </div>

          <div className="stat-card">
            <div className="icon green">
              <FaDollarSign />
            </div>
            <div className="stat-info">
              <p>Total Pendapatan (Komisi {commissionRate}%)</p>
              <h2>{calculateAdminRevenue(stats?.total_revenue)}</h2>
            </div>
          </div>

          <div className="stat-card">
            <div className="icon navy">
              <FaHome />
            </div>
            <div className="stat-info">
              <p>Villa Aktif</p>
              <h2>{stats?.total_villas ?? 0}</h2>
            </div>
          </div>

          <div className="stat-card">
            <div className="icon gold">
              <FaCalendarAlt />
            </div>
            <div className="stat-info">
              <p>Pembayaran Menunggu</p>
              <h2>{stats?.pending_payments ?? 0}</h2>
            </div>
          </div>
        </div>

        {/* BOOKING TABLE */}
        <div className="booking-table">
          <h2>Aktivitas Pemesanan Terbaru</h2>
          <p>Pemesanan terbaru dari pelanggan</p>
          {loadError && (
            <p role="alert" style={{ color: "red", marginTop: "10px" }}>
              {loadError}
            </p>
          )}

          <table>
            <thead>
              <tr>
                <th>ID Booking</th>
                <th>Pelanggan</th>
                <th>Villa</th>
                <th>Check-in</th>
                <th>Check-out</th>
                <th>Jumlah</th>
                <th>Status</th>
              </tr>
            </thead>

            <tbody>
              {loading ? (
                <tr>
                  <td colSpan="7" style={{ textAlign: "center", padding: "20px" }}>
                    Memuat data...
                  </td>
                </tr>
              ) : loadError ? (
                <tr>
                  <td colSpan="7" style={{ textAlign: "center", color: "red", padding: "20px" }}>
                    {loadError}
                  </td>
                </tr>
              ) : bookings.length === 0 ? (
                <tr>
                  <td colSpan="7" style={{ textAlign: "center", padding: "20px" }}>
                    Belum ada pemesanan.
                  </td>
                </tr>
              ) : (
                bookings.map((b, index) => (
                  <tr key={b.id || index}>
                    <td>{b.id || "-"}</td>
                    <td>{b.full_name || "-"}</td>
                    <td>{b.villa_name || "-"}</td>
                    <td>{b.check_in || "-"}</td>
                    <td>{b.check_out || "-"}</td>

                    <td>
                      {b.total_price
                        ? `Rp ${Number(b.total_price).toLocaleString("id-ID", {
                            minimumFractionDigits: 0,
                            maximumFractionDigits: 0,
                          })}`
                        : "Rp 0"}
                    </td>

                    <td>
                      <span className={`status ${b.status ? b.status.toLowerCase() : ""}`}>
                        {b.status || "-"}
                      </span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

export default AdminDashboard;