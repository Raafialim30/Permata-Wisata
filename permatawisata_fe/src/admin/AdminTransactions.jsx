import { FaCalendarAlt } from "react-icons/fa";
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";

import API_BASE_URL from "../config";
import AdminSidebar from "./AdminSidebar";
import AdminTopbar from "./AdminTopbar";
import "./css/AdminTransactions.css";

function AdminTransactions() {
  const navigate = useNavigate();

  const [data, setData] = useState([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");

  useEffect(() => {
    const token = localStorage.getItem("token");
    if (!token) {
      navigate("/login", { replace: true });
      return undefined;
    }

    let active = true;
    const loadBookings = async () => {
      setLoading(true);
      setLoadError("");
      try {
        const response = await fetch(`${API_BASE_URL}/api/admin/bookings`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        const result = await response.json();
        if (response.status === 401 || response.status === 403) {
          localStorage.removeItem("token");
          localStorage.removeItem("user");
          navigate("/login", { replace: true });
          return;
        }
        if (!response.ok || result.status !== "success") {
          throw new Error(result.error || "Gagal memuat transaksi pemesanan.");
        }
        if (active) setData(Array.isArray(result.data) ? result.data : []);
      } catch (error) {
        console.error("Gagal memuat data transaksi pemesanan:", error);
        if (active) setLoadError(error.message || "Gagal memuat transaksi.");
      } finally {
        if (active) setLoading(false);
      }
    };

    loadBookings();
    return () => {
      active = false;
    };
  }, [navigate]);

  const filteredData = data.filter((item) => {
    const searchLower = search.toLowerCase();
    const idString = item.id ? String(item.id) : "";
    const nameString = item.full_name ? item.full_name.toLowerCase() : "";
    const villaString = item.villa_name ? item.villa_name.toLowerCase() : "";

    return (
      idString.includes(searchLower) ||
      nameString.includes(searchLower) ||
      villaString.includes(searchLower)
    );
  });

  return (
    <div className="admin-layout">
      <AdminSidebar />

      <div className="main">
        {/* TOPBAR */}
        <AdminTopbar
          title="Transaksi Pemesanan"
          subtitle="Lihat dan kelola semua data pemesanan"
        />

        {/* SEARCH BAR */}
        <div className="search-bar">
          <input
            placeholder="Cari nama, villa, atau ID booking..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          <button>Semua Status</button>
        </div>

        {/* TABLE */}
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
              {loading ? (
                <tr><td colSpan="8" className="empty">Memuat data transaksi...</td></tr>
              ) : loadError ? (
                <tr><td colSpan="8" className="empty" role="alert">{loadError}</td></tr>
              ) : filteredData.length > 0 ? (
                filteredData.map((item, i) => (
                  <tr key={item.id || i}>
                    <td>{item.id}</td>
                    <td className="customer">
                      <div className="avatar small">👤</div>
                      {item.full_name}
                    </td>

                    <td>
                      <div>{item.villa_name}</div>
                      {item.addons_info && (
                        <div
                          style={{
                            fontSize: "0.75rem",
                            color: "#e67e22",
                            marginTop: "4px",
                            fontWeight: "600"
                          }}
                        >
                          ➕ Addons: {item.addons_info}
                        </div>
                      )}
                    </td>

                    <td>
                      <FaCalendarAlt /> {item.check_in}
                    </td>

                    <td>
                      <FaCalendarAlt /> {item.check_out}
                    </td>

                    <td>
                      {item.total_price
                        ? `Rp ${Number(item.total_price).toLocaleString("id-ID")}`
                        : "Rp 0"}
                    </td>

                    <td>
                      <span
                        className={`badge ${
                          item.status ? item.status.toLowerCase() : "pending"
                        }`}
                      >
                        {item.status === "Lunas"
                          ? "Lunas"
                          : item.status === "Batal"
                            ? "Dibatalkan"
                            : "Belum lunas"}
                      </span>
                    </td>

                    <td>
                      <span
                        className={`badge ${
                          item.status ? item.status.toLowerCase() : "pending"
                        }`}
                      >
                        {item.status === "Lunas" && "Dikonfirmasi"}
                        {item.status === "Menunggu Verifikasi" && "Menunggu Verifikasi"}
                        {item.status === "Menunggu Pembayaran" && "Menunggu Pembayaran"}
                        {item.status === "Batal" && "Dibatalkan"}
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