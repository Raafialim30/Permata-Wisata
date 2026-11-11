import {
  FaCheckCircle,
  FaEye,
  FaTimesCircle,
  FaMoneyBillWave,
  FaUser,
  FaBuilding,
  FaReceipt,
  FaTimes
} from "react-icons/fa";
import { useCallback, useEffect, useState } from "react";
import Swal from "sweetalert2";

import API_BASE_URL from "../config";
import AdminSidebar from "./AdminSidebar";
import AdminTopbar from "./AdminTopbar";
import "./css/AdminPayment.css";

function AdminPayment() {
  const [data, setData] = useState([]);
  const [paymentLoadError, setPaymentLoadError] = useState("");
  const [selectedTransaction, setSelectedTransaction] = useState(null);
  const [actionLoading, setActionLoading] = useState(false);

  const getAdminHeaders = () => {
    const token = localStorage.getItem("token");
    return token ? { Authorization: `Bearer ${token}` } : {};
  };

  const fetchPayments = useCallback(() => {
    setPaymentLoadError("");
    const token = localStorage.getItem("token");
    fetch(`${API_BASE_URL}/api/admin/payments`, {
      headers: token ? { Authorization: `Bearer ${token}` } : {}
    })
      .then(async (res) => {
        const resData = await res.json();
        if (res.status === 401 || res.status === 403) {
          localStorage.removeItem("token");
          localStorage.removeItem("user");
          window.location.assign("/login");
          throw new Error("Sesi Admin berakhir. Silakan login kembali.");
        }
        if (!res.ok || resData.status !== "success") {
          throw new Error(
            resData.error || "Gagal mengambil data pembayaran."
          );
        }
        setData(Array.isArray(resData.data) ? resData.data : []);
      })
      .catch((err) => {
        if (err.message.startsWith("Sesi Admin berakhir")) return;
        console.error("Gagal memuat data validasi pembayaran:", err);
        setPaymentLoadError(
          err.message || "Gagal memuat data pembayaran."
        );
      });
  }, []);

  useEffect(() => {
    fetchPayments();
  }, [fetchPayments]);

  const handleView = (item) => {
    setSelectedTransaction(item);
  };

  const closeDetailModal = () => {
    setSelectedTransaction(null);
  };

  const handleApprove = async (item) => {
    const result = await Swal.fire({
      title: "Setujui Pembayaran?",
      html: `Booking <strong>#${item.id}</strong> atas nama <strong>${item.full_name}</strong><br/>Total: <strong>Rp ${Number(item.total_price || 0).toLocaleString("id-ID")}</strong>`,
      icon: "question",
      showCancelButton: true,
      confirmButtonColor: "#16a36e",
      cancelButtonColor: "#64748b",
      confirmButtonText: "Ya, Setujui",
      cancelButtonText: "Batal"
    });

    if (result.isConfirmed) {
      executeStatusUpdate(item.id, "Lunas", "approve");
    }
  };

  const handleReject = async (item) => {
    const result = await Swal.fire({
      title: "Tolak Pembayaran?",
      html: `Booking <strong>#${item.id}</strong> atas nama <strong>${item.full_name}</strong><br/>Total: <strong>Rp ${Number(item.total_price || 0).toLocaleString("id-ID")}</strong>`,
      icon: "warning",
      showCancelButton: true,
      confirmButtonColor: "#d94242",
      cancelButtonColor: "#64748b",
      confirmButtonText: "Ya, Tolak",
      cancelButtonText: "Batal"
    });

    if (result.isConfirmed) {
      executeStatusUpdate(item.id, "Batal", "reject");
    }
  };

  const executeStatusUpdate = (id, newStatus, type) => {
    setActionLoading(true);

    fetch(`${API_BASE_URL}/api/admin/payments/${id}/status`, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
        ...getAdminHeaders()
      },
      body: JSON.stringify({ status: newStatus })
    })
      .then((res) => res.json())
      .then((resData) => {
        if (resData.status === "success") {
          Swal.fire({
            icon: type === "approve" ? "success" : "info",
            title: type === "approve" ? "Berhasil Disetujui! 🎉" : "Pembayaran Ditolak",
            text: type === "approve"
              ? "Bukti pembayaran telah dikonfirmasi dan status otomatis menjadi Lunas."
              : "Bukti pembayaran telah berhasil ditolak.",
            confirmButtonColor: "#123e57"
          });

          fetchPayments();
          setSelectedTransaction(null);
        } else {
          Swal.fire({
            icon: "error",
            title: "Proses Gagal",
            text: resData.error || resData.message || "Perubahan status pembayaran tidak dapat diproses.",
            confirmButtonColor: "#123e57"
          });
        }
      })
      .catch((err) => {
        console.error("Error saat mengubah status pembayaran:", err);
        Swal.fire({
          icon: "error",
          title: "Terjadi Kesalahan",
          text: "Tidak dapat terhubung ke server. Silakan coba lagi.",
          confirmButtonColor: "#123e57"
        });
      })
      .finally(() => {
        setActionLoading(false);
      });
  };

  const getStatusLabel = (status) => {
    if (
      status === "Menunggu Pembayaran" ||
      status === "Menunggu Verifikasi" ||
      status === "Pending"
    ) {
      return "Menunggu";
    }

    if (status === "Lunas" || status === "Success") {
      return "Berhasil";
    }

    if (status === "Batal" || status === "Reject") {
      return "Dibatalkan";
    }

    return status || "Tidak diketahui";
  };

  const getStatusClass = (status) => {
    if (status === "Lunas" || status === "Success") {
      return "success";
    }

    if (status === "Batal" || status === "Reject") {
      return "reject";
    }

    return "pending";
  };

  const isWaitingPayment = (status) => {
    return (
      status === "Menunggu Pembayaran" ||
      status === "Menunggu Verifikasi" ||
      status === "Pending"
    );
  };

  const canValidatePayment = (status) => {
    return (
      status === "Menunggu Verifikasi" ||
      status === "Pending"
    );
  };

  return (
    <div className="admin-layout">
      <AdminSidebar />

      <div className="main">
        {/* TOPBAR */}
        <AdminTopbar
          title="Validasi Pembayaran"
          subtitle="Kelola dan verifikasi pembayaran pelanggan"
        />

        {/* CARDS COUNTER */}
        <div className="stats-cards">
          <div className="card orange">
            <h3>Menunggu</h3>
            <h1>{data.filter((d) => isWaitingPayment(d.status)).length}</h1>
          </div>

          <div className="card green">
            <h3>Berhasil</h3>
            <h1>{data.filter((d) => d.status === "Lunas").length}</h1>
          </div>

          <div className="card red">
            <h3>Ditolak</h3>
            <h1>{data.filter((d) => d.status === "Batal").length}</h1>
          </div>
        </div>

        {/* TABLE */}
        <div className="table-container">
          <table>
            <thead>
              <tr>
                <th>ID Booking</th>
                <th>Nama</th>
                <th>Villa</th>
                <th>Jumlah</th>
                <th>Status</th>
                <th>Aksi</th>
              </tr>
            </thead>

            <tbody>
              {paymentLoadError ? (
                <tr>
                  <td colSpan="6" style={{ textAlign: "center", padding: "20px", color: "#be123c" }}>
                    {paymentLoadError}
                  </td>
                </tr>
              ) : data.length > 0 ? (
                data.map((item, i) => (
                  <tr key={item.id || i}>
                    <td>{item.id}</td>
                    <td>{item.full_name}</td>
                    <td>{item.villa_name}</td>
                    <td>
                      {item.total_price
                        ? `Rp ${Number(item.total_price).toLocaleString("id-ID")}`
                        : "Rp 0"}
                    </td>

                    <td>
                      <span className={`badge ${getStatusClass(item.status)}`}>
                        {getStatusLabel(item.status)}
                      </span>
                    </td>

                    <td>
                      <button
                        className="action-btn view"
                        onClick={() => handleView(item)}
                        title="Lihat detail transaksi"
                      >
                        <FaEye />
                      </button>

                      {canValidatePayment(item.status) && (
                        <>
                          <button
                            className="action-btn approve"
                            disabled={actionLoading}
                            onClick={() => handleApprove(item)}
                            title="Setujui pembayaran"
                          >
                            <FaCheckCircle />
                          </button>

                          <button
                            className="action-btn reject"
                            disabled={actionLoading}
                            onClick={() => handleReject(item)}
                            title="Tolak pembayaran"
                          >
                            <FaTimesCircle />
                          </button>
                        </>
                      )}
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td
                    colSpan="6"
                    style={{
                      textAlign: "center",
                      padding: "20px",
                      color: "#888"
                    }}
                  >
                    Tidak ada riwayat pembayaran di database.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* MODAL DETAIL */}
      {selectedTransaction && (
        <div
          onClick={(e) => {
            if (e.target === e.currentTarget) {
              closeDetailModal();
            }
          }}
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(10, 25, 38, 0.62)",
            backdropFilter: "blur(7px)",
            WebkitBackdropFilter: "blur(7px)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 9999,
            padding: "20px",
            animation: "adminPaymentFadeIn 0.22s ease"
          }}
        >
          <div
            style={{
              width: "100%",
              maxWidth: "520px",
              background: "#ffffff",
              borderRadius: "22px",
              overflow: "hidden",
              boxShadow: "0 30px 80px rgba(0,0,0,0.30)",
              animation: "adminPaymentModalIn 0.25s ease",
              position: "relative"
            }}
          >
            <div
              style={{
                background: "linear-gradient(135deg, #123e57 0%, #1c5d7c 100%)",
                padding: "25px 28px",
                color: "#ffffff",
                position: "relative"
              }}
            >
              <button
                onClick={closeDetailModal}
                title="Tutup"
                style={{
                  position: "absolute",
                  top: "18px",
                  right: "18px",
                  width: "36px",
                  height: "36px",
                  borderRadius: "50%",
                  border: "1px solid rgba(255,255,255,0.25)",
                  background: "rgba(255,255,255,0.12)",
                  color: "#ffffff",
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontSize: "14px",
                  transition: "all 0.2s ease"
                }}
              >
                <FaTimes />
              </button>

              <div style={{ display: "flex", alignItems: "center", gap: "15px" }}>
                <div
                  style={{
                    width: "52px",
                    height: "52px",
                    borderRadius: "16px",
                    background: "rgba(255,255,255,0.15)",
                    border: "1px solid rgba(255,255,255,0.22)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontSize: "22px"
                  }}
                >
                  <FaReceipt />
                </div>

                <div>
                  <div
                    style={{
                      fontSize: "13px",
                      opacity: 0.75,
                      marginBottom: "3px",
                      letterSpacing: "0.4px"
                    }}
                  >
                    INFORMASI TRANSAKSI
                  </div>
                  <h2
                    style={{
                      margin: 0,
                      fontSize: "22px",
                      fontWeight: 700,
                      letterSpacing: "-0.3px"
                    }}
                  >
                    Detail Pembayaran
                  </h2>
                </div>
              </div>
            </div>

            <div style={{ padding: "26px 28px 28px" }}>
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  marginBottom: "22px",
                  paddingBottom: "18px",
                  borderBottom: "1px solid #edf0f2"
                }}
              >
                <div style={{ color: "#7b8790", fontSize: "13px" }}>ID Booking</div>
                <div style={{ fontWeight: 700, color: "#123e57", fontSize: "16px" }}>
                  #{selectedTransaction.id}
                </div>
              </div>

              <div style={{ display: "flex", gap: "14px", alignItems: "center", marginBottom: "20px" }}>
                <div
                  style={{
                    width: "42px",
                    height: "42px",
                    minWidth: "42px",
                    borderRadius: "13px",
                    background: "#edf5f8",
                    color: "#15536d",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center"
                  }}
                >
                  <FaUser />
                </div>
                <div>
                  <div style={{ fontSize: "12px", color: "#8a949b", marginBottom: "3px" }}>
                    Nama Pelanggan
                  </div>
                  <div style={{ fontWeight: 600, color: "#253746", fontSize: "15px" }}>
                    {selectedTransaction.full_name || "-"}
                  </div>
                </div>
              </div>

              <div style={{ display: "flex", gap: "14px", alignItems: "center", marginBottom: "20px" }}>
                <div
                  style={{
                    width: "42px",
                    height: "42px",
                    minWidth: "42px",
                    borderRadius: "13px",
                    background: "#f5f1e7",
                    color: "#b18a22",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center"
                  }}
                >
                  <FaBuilding />
                </div>
                <div>
                  <div style={{ fontSize: "12px", color: "#8a949b", marginBottom: "3px" }}>
                    Villa Pilihan
                  </div>
                  <div style={{ fontWeight: 600, color: "#253746", fontSize: "15px", lineHeight: "1.45" }}>
                    {selectedTransaction.villa_name || "-"}
                  </div>
                </div>
              </div>

              <div style={{ display: "flex", gap: "14px", alignItems: "center", marginBottom: "22px" }}>
                <div
                  style={{
                    width: "42px",
                    height: "42px",
                    minWidth: "42px",
                    borderRadius: "13px",
                    background: "#edf8f3",
                    color: "#149968",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center"
                  }}
                >
                  <FaMoneyBillWave />
                </div>
                <div>
                  <div style={{ fontSize: "12px", color: "#8a949b", marginBottom: "3px" }}>
                    Total Pembayaran
                  </div>
                  <div style={{ fontWeight: 700, color: "#149968", fontSize: "18px" }}>
                    Rp {Number(selectedTransaction.total_price || 0).toLocaleString("id-ID")}
                  </div>
                </div>
              </div>

              <div
                style={{
                  background: "#f7f9fa",
                  borderRadius: "15px",
                  padding: "15px 17px",
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  marginBottom: "25px"
                }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                  <FaCheckCircle
                    style={{
                      color:
                        selectedTransaction.status === "Lunas"
                          ? "#16a36e"
                          : selectedTransaction.status === "Batal"
                          ? "#dc4242"
                          : "#d49b18"
                    }}
                  />
                  <span style={{ color: "#65727b", fontSize: "14px" }}>Status Validasi</span>
                </div>

                <span
                  style={{
                    padding: "7px 14px",
                    borderRadius: "20px",
                    fontSize: "12px",
                    fontWeight: 700,
                    background:
                      selectedTransaction.status === "Lunas"
                        ? "#e5f7ef"
                        : selectedTransaction.status === "Batal"
                        ? "#fdeaea"
                        : "#fff4d8",
                    color:
                      selectedTransaction.status === "Lunas"
                        ? "#14865c"
                        : selectedTransaction.status === "Batal"
                        ? "#cf3d3d"
                        : "#ad7b09"
                  }}
                >
                  {getStatusLabel(selectedTransaction.status)}
                </span>
              </div>

              <button
                onClick={closeDetailModal}
                style={{
                  width: "100%",
                  height: "46px",
                  border: "none",
                  borderRadius: "12px",
                  background: "linear-gradient(135deg, #123e57 0%, #1c5d7c 100%)",
                  color: "#ffffff",
                  fontSize: "14px",
                  fontWeight: 600,
                  cursor: "pointer",
                  boxShadow: "0 7px 18px rgba(18,62,87,0.20)",
                  transition: "all 0.2s ease"
                }}
              >
                Tutup Detail
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default AdminPayment;