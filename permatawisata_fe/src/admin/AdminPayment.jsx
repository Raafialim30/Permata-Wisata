import {
  FaBell,
  FaCheckCircle,
  FaEye,
  FaHome,
  FaSignOutAlt,
  FaThLarge,
  FaTimesCircle,
  FaMoneyBillWave,
  FaUser,
  FaBuilding,
  FaReceipt,
  FaTimes,
  FaExclamationTriangle
} from "react-icons/fa";

import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";

import API_BASE_URL from "../config";
import "./css/AdminPayment.css";

function AdminPayment() {
  const navigate = useNavigate();

  const [notif, setNotif] = useState(true);
  const [data, setData] = useState([]);

  // =========================================================
  // MODAL DETAIL TRANSAKSI
  // =========================================================
  const [selectedTransaction, setSelectedTransaction] = useState(null);

  // =========================================================
  // MODAL KONFIRMASI APPROVE / REJECT
  // =========================================================
  const [confirmAction, setConfirmAction] = useState(null);

  // =========================================================
  // NOTIFIKASI HASIL AKSI
  // =========================================================
  const [resultNotification, setResultNotification] = useState(null);

  // =========================================================
  // LOADING AKSI
  // =========================================================
  const [actionLoading, setActionLoading] = useState(false);

  // =========================================================
  // AMBIL DATA DARI MYSQL VIA API FLASK
  // =========================================================
  const fetchPayments = () => {
    fetch(`${API_BASE_URL}/api/admin/payments`)
      .then((res) => res.json())
      .then((resData) => {
        if (resData.status === "success") {
          setData(resData.data);
        }
      })
      .catch((err) =>
        console.error(
          "Gagal memuat data validasi pembayaran:",
          err
        )
      );
  };

  useEffect(() => {
    fetchPayments();
  }, []);

  // =========================================================
  // NOTIFIKASI LONCENG
  // =========================================================
  const handleBell = () => {
    setNotif(false);
    alert("Tidak ada notifikasi baru");
  };

  // =========================================================
  // LIHAT DETAIL
  // =========================================================
  const handleView = (item) => {
    setSelectedTransaction(item);
  };

  // =========================================================
  // TUTUP MODAL DETAIL
  // =========================================================
  const closeDetailModal = () => {
    setSelectedTransaction(null);
  };

  // =========================================================
  // BUKA MODAL KONFIRMASI APPROVE
  // =========================================================
  const handleApprove = (item) => {
    setConfirmAction({
      type: "approve",
      id: item.id,
      transaction: item
    });
  };

  // =========================================================
  // BUKA MODAL KONFIRMASI REJECT
  // =========================================================
  const handleReject = (item) => {
    setConfirmAction({
      type: "reject",
      id: item.id,
      transaction: item
    });
  };

  // =========================================================
  // TUTUP MODAL KONFIRMASI
  // =========================================================
  const closeConfirmModal = () => {
    if (actionLoading) return;

    setConfirmAction(null);
  };

  // =========================================================
  // EKSEKUSI APPROVE / REJECT
  // =========================================================
  const executeAction = () => {
    if (!confirmAction || actionLoading) return;

    const { type, id } = confirmAction;

    const newStatus =
      type === "approve" ? "Success" : "Reject";

    setActionLoading(true);

    fetch(`${API_BASE_URL}/api/admin/payments/${id}/status`, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        status: newStatus
      })
    })
      .then((res) => res.json())
      .then((resData) => {
        if (resData.status === "success") {
          setConfirmAction(null);

          setResultNotification({
            type: type === "approve" ? "success" : "reject",
            title:
              type === "approve"
                ? "Pembayaran Berhasil Disetujui"
                : "Pembayaran Berhasil Ditolak",
            message:
              type === "approve"
                ? "Bukti pembayaran telah berhasil dikonfirmasi."
                : "Bukti pembayaran telah berhasil ditolak."
          });

          fetchPayments();

          setSelectedTransaction(null);
        } else {
          setResultNotification({
            type: "error",
            title: "Proses Gagal",
            message:
              resData.message ||
              "Perubahan status pembayaran tidak dapat diproses."
          });
        }
      })
      .catch((err) => {
        console.error("Error saat mengubah status pembayaran:", err);

        setResultNotification({
          type: "error",
          title: "Terjadi Kesalahan",
          message:
            "Tidak dapat terhubung ke server. Silakan coba lagi."
        });
      })
      .finally(() => {
        setActionLoading(false);
      });
  };

  // =========================================================
  // TUTUP NOTIFIKASI HASIL
  // =========================================================
  const closeResultNotification = () => {
    setResultNotification(null);
  };

  // =========================================================
  // LOGOUT
  // =========================================================
  const handleLogout = () => {
    localStorage.removeItem("adminLogin");
    navigate("/admin/login");
    window.location.reload();
  };

  // =========================================================
  // HELPER STATUS
  // =========================================================
  const getStatusLabel = (status) => {
    if (status === "Pending") return "Menunggu";
    if (status === "Success") return "Berhasil";
    if (status === "Reject") return "Ditolak";

    return status || "Tidak diketahui";
  };

  return (
    <div className="admin-layout">

      {/* =====================================================
          SIDEBAR
      ===================================================== */}
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
              <FaThLarge /> Dashboard
            </Link>

            <Link
              to="/admin/villas"
              className="menu-item"
            >
              <FaHome /> Kelola Villa
            </Link>

            <Link
              to="/admin/transactions"
              className="menu-item"
            >
              <FaThLarge /> Transaksi
            </Link>

            <Link
              to="/admin/payment"
              className="menu-item active"
            >
              <FaCheckCircle /> Validasi Pembayaran
            </Link>

          </div>
        </div>

        <div
          className="logout"
          onClick={handleLogout}
          style={{ cursor: "pointer" }}
        >
          <FaSignOutAlt /> Keluar
        </div>

      </div>

      {/* =====================================================
          MAIN CONTENT
      ===================================================== */}
      <div className="main">

        {/* ===================================================
            TOPBAR
        =================================================== */}
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

            <div className="bell-wrapper">

              <FaBell
                className="bell"
                onClick={handleBell}
                style={{
                  cursor: "pointer"
                }}
              />

              {notif && (
                <span className="notif-dot"></span>
              )}

            </div>

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

        {/* ===================================================
            HEADER
        =================================================== */}
        <div className="page-header">

          <h1>
            Validasi Pembayaran
          </h1>

          <p>
            Kelola dan verifikasi pembayaran pelanggan
          </p>

        </div>

        {/* ===================================================
            CARDS COUNTER
        =================================================== */}
        <div className="stats-cards">

          <div className="card orange">

            <h3>
              Menunggu
            </h3>

            <h1>
              {
                data.filter(
                  (d) => d.status === "Pending"
                ).length
              }
            </h1>

          </div>

          <div className="card green">

            <h3>
              Berhasil
            </h3>

            <h1>
              {
                data.filter(
                  (d) => d.status === "Success"
                ).length
              }
            </h1>

          </div>

          <div className="card red">

            <h3>
              Ditolak
            </h3>

            <h1>
              {
                data.filter(
                  (d) => d.status === "Reject"
                ).length
              }
            </h1>

          </div>

        </div>

        {/* ===================================================
            TABLE
        =================================================== */}
        <div className="table-container">

          <table>

            <thead>

              <tr>

                <th>
                  ID Booking
                </th>

                <th>
                  Nama
                </th>

                <th>
                  Villa
                </th>

                <th>
                  Jumlah
                </th>

                <th>
                  Status
                </th>

                <th>
                  Aksi
                </th>

              </tr>

            </thead>

            <tbody>

              {data.length > 0 ? (

                data.map((item, i) => (

                  <tr key={item.id || i}>

                    <td>
                      {item.id}
                    </td>

                    <td>
                      {item.full_name}
                    </td>

                    <td>
                      {item.villa_name}
                    </td>

                    <td>
                      {
                        item.total_price
                          ? `Rp ${Number(
                              item.total_price
                            ).toLocaleString("id-ID")}`
                          : "Rp 0"
                      }
                    </td>

                    <td>

                      <span
                        className={`badge ${
                          item.status
                            ? item.status.toLowerCase()
                            : "pending"
                        }`}
                      >
                        {getStatusLabel(item.status)}
                      </span>

                    </td>

                    <td>

                      {/* ===================================
                          TOMBOL LIHAT
                      =================================== */}

                      <button
                        className="action-btn view"
                        onClick={() =>
                          handleView(item)
                        }
                        title="Lihat detail transaksi"
                      >
                        <FaEye />
                      </button>

                      {/* ===================================
                          TOMBOL SETUJUI & TOLAK
                          HANYA UNTUK PENDING
                      =================================== */}

                      {item.status === "Pending" && (
                        <>

                          <button
                            className="action-btn approve"
                            onClick={() =>
                              handleApprove(item)
                            }
                            title="Setujui pembayaran"
                          >
                            <FaCheckCircle />
                          </button>

                          <button
                            className="action-btn reject"
                            onClick={() =>
                              handleReject(item)
                            }
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

      {/* =====================================================
          MODAL DETAIL TRANSAKSI
      ===================================================== */}

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
              boxShadow:
                "0 30px 80px rgba(0,0,0,0.30)",
              animation:
                "adminPaymentModalIn 0.25s ease",
              position: "relative"
            }}
          >

            {/* HEADER */}

            <div
              style={{
                background:
                  "linear-gradient(135deg, #123e57 0%, #1c5d7c 100%)",
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
                  border:
                    "1px solid rgba(255,255,255,0.25)",
                  background:
                    "rgba(255,255,255,0.12)",
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

              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "15px"
                }}
              >

                <div
                  style={{
                    width: "52px",
                    height: "52px",
                    borderRadius: "16px",
                    background:
                      "rgba(255,255,255,0.15)",
                    border:
                      "1px solid rgba(255,255,255,0.22)",
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

            {/* CONTENT */}

            <div
              style={{
                padding: "26px 28px 28px"
              }}
            >

              {/* ID BOOKING */}

              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  marginBottom: "22px",
                  paddingBottom: "18px",
                  borderBottom:
                    "1px solid #edf0f2"
                }}
              >

                <div
                  style={{
                    color: "#7b8790",
                    fontSize: "13px"
                  }}
                >
                  ID Booking
                </div>

                <div
                  style={{
                    fontWeight: 700,
                    color: "#123e57",
                    fontSize: "16px"
                  }}
                >
                  #{selectedTransaction.id}
                </div>

              </div>

              {/* CUSTOMER */}

              <div
                style={{
                  display: "flex",
                  gap: "14px",
                  alignItems: "center",
                  marginBottom: "20px"
                }}
              >

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

                  <div
                    style={{
                      fontSize: "12px",
                      color: "#8a949b",
                      marginBottom: "3px"
                    }}
                  >
                    Nama Pelanggan
                  </div>

                  <div
                    style={{
                      fontWeight: 600,
                      color: "#253746",
                      fontSize: "15px"
                    }}
                  >
                    {selectedTransaction.full_name || "-"}
                  </div>

                </div>

              </div>

              {/* VILLA */}

              <div
                style={{
                  display: "flex",
                  gap: "14px",
                  alignItems: "center",
                  marginBottom: "20px"
                }}
              >

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

                  <div
                    style={{
                      fontSize: "12px",
                      color: "#8a949b",
                      marginBottom: "3px"
                    }}
                  >
                    Villa Pilihan
                  </div>

                  <div
                    style={{
                      fontWeight: 600,
                      color: "#253746",
                      fontSize: "15px",
                      lineHeight: "1.45"
                    }}
                  >
                    {selectedTransaction.villa_name || "-"}
                  </div>

                </div>

              </div>

              {/* TOTAL PEMBAYARAN */}

              <div
                style={{
                  display: "flex",
                  gap: "14px",
                  alignItems: "center",
                  marginBottom: "22px"
                }}
              >

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

                  <div
                    style={{
                      fontSize: "12px",
                      color: "#8a949b",
                      marginBottom: "3px"
                    }}
                  >
                    Total Pembayaran
                  </div>

                  <div
                    style={{
                      fontWeight: 700,
                      color: "#149968",
                      fontSize: "18px"
                    }}
                  >
                    Rp{" "}
                    {Number(
                      selectedTransaction.total_price || 0
                    ).toLocaleString("id-ID")}
                  </div>

                </div>

              </div>

              {/* STATUS */}

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

                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "10px"
                  }}
                >

                  <FaCheckCircle
                    style={{
                      color:
                        selectedTransaction.status === "Success"
                          ? "#16a36e"
                          : selectedTransaction.status === "Reject"
                          ? "#dc4242"
                          : "#d49b18"
                    }}
                  />

                  <span
                    style={{
                      color: "#65727b",
                      fontSize: "14px"
                    }}
                  >
                    Status Validasi
                  </span>

                </div>

                <span
                  style={{
                    padding: "7px 14px",
                    borderRadius: "20px",
                    fontSize: "12px",
                    fontWeight: 700,

                    background:
                      selectedTransaction.status === "Success"
                        ? "#e5f7ef"
                        : selectedTransaction.status === "Reject"
                        ? "#fdeaea"
                        : "#fff4d8",

                    color:
                      selectedTransaction.status === "Success"
                        ? "#14865c"
                        : selectedTransaction.status === "Reject"
                        ? "#cf3d3d"
                        : "#ad7b09"
                  }}
                >
                  {getStatusLabel(
                    selectedTransaction.status
                  )}
                </span>

              </div>

              {/* TOMBOL */}

              <button
                onClick={closeDetailModal}
                style={{
                  width: "100%",
                  height: "46px",
                  border: "none",
                  borderRadius: "12px",
                  background:
                    "linear-gradient(135deg, #123e57 0%, #1c5d7c 100%)",
                  color: "#ffffff",
                  fontSize: "14px",
                  fontWeight: 600,
                  cursor: "pointer",
                  boxShadow:
                    "0 7px 18px rgba(18,62,87,0.20)",
                  transition: "all 0.2s ease"
                }}
              >
                Tutup Detail
              </button>

            </div>

          </div>

        </div>

      )}

      {/* =====================================================
          MODAL KONFIRMASI SETUJUI / TOLAK
      ===================================================== */}

      {confirmAction && (

        <div
          onClick={(e) => {

            if (
              e.target === e.currentTarget &&
              !actionLoading
            ) {
              closeConfirmModal();
            }

          }}
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(10, 25, 38, 0.62)",
            backdropFilter: "blur(8px)",
            WebkitBackdropFilter: "blur(8px)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 10000,
            padding: "20px",
            animation: "adminPaymentFadeIn 0.2s ease"
          }}
        >

          <div
            style={{
              width: "100%",
              maxWidth: "470px",
              background: "#ffffff",
              borderRadius: "22px",
              overflow: "hidden",
              boxShadow:
                "0 30px 80px rgba(0,0,0,0.30)",
              animation:
                "adminPaymentModalIn 0.25s ease"
            }}
          >

            {/* HEADER */}

            <div
              style={{
                background:
                  confirmAction.type === "approve"
                    ? "linear-gradient(135deg, #0e7557 0%, #16a36e 100%)"
                    : "linear-gradient(135deg, #a82e35 0%, #d94242 100%)",
                padding: "26px 28px",
                color: "#ffffff",
                position: "relative"
              }}
            >

              <button
                onClick={closeConfirmModal}
                disabled={actionLoading}
                title="Tutup"
                style={{
                  position: "absolute",
                  top: "18px",
                  right: "18px",
                  width: "36px",
                  height: "36px",
                  borderRadius: "50%",
                  border:
                    "1px solid rgba(255,255,255,0.28)",
                  background:
                    "rgba(255,255,255,0.13)",
                  color: "#ffffff",
                  cursor: actionLoading
                    ? "not-allowed"
                    : "pointer",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontSize: "14px"
                }}
              >
                <FaTimes />
              </button>

              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "15px"
                }}
              >

                <div
                  style={{
                    width: "54px",
                    height: "54px",
                    borderRadius: "16px",
                    background:
                      "rgba(255,255,255,0.16)",
                    border:
                      "1px solid rgba(255,255,255,0.22)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontSize: "23px"
                  }}
                >
                  {confirmAction.type === "approve" ? (
                    <FaCheckCircle />
                  ) : (
                    <FaTimesCircle />
                  )}
                </div>

                <div>

                  <div
                    style={{
                      fontSize: "12px",
                      opacity: 0.75,
                      marginBottom: "4px",
                      letterSpacing: "0.5px"
                    }}
                  >
                    KONFIRMASI ADMIN
                  </div>

                  <h2
                    style={{
                      margin: 0,
                      fontSize: "21px",
                      fontWeight: 700
                    }}
                  >
                    {confirmAction.type === "approve"
                      ? "Setujui Pembayaran"
                      : "Tolak Pembayaran"}
                  </h2>

                </div>

              </div>

            </div>

            {/* CONTENT */}

            <div
              style={{
                padding: "28px"
              }}
            >

              <div
                style={{
                  display: "flex",
                  justifyContent: "center",
                  marginBottom: "20px"
                }}
              >

                <div
                  style={{
                    width: "64px",
                    height: "64px",
                    borderRadius: "50%",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",

                    background:
                      confirmAction.type === "approve"
                        ? "#e8f8f1"
                        : "#fdecec",

                    color:
                      confirmAction.type === "approve"
                        ? "#16a36e"
                        : "#d94242",

                    fontSize: "27px"
                  }}
                >

                  {confirmAction.type === "approve" ? (
                    <FaCheckCircle />
                  ) : (
                    <FaExclamationTriangle />
                  )}

                </div>

              </div>

              <h3
                style={{
                  margin: "0 0 10px",
                  textAlign: "center",
                  color: "#253746",
                  fontSize: "18px",
                  fontWeight: 700
                }}
              >
                {confirmAction.type === "approve"
                  ? "Apakah Anda yakin ingin menyetujui pembayaran ini?"
                  : "Apakah Anda yakin ingin menolak pembayaran ini?"}
              </h3>

              <p
                style={{
                  margin: "0 auto 22px",
                  maxWidth: "380px",
                  textAlign: "center",
                  color: "#7b8790",
                  fontSize: "14px",
                  lineHeight: "1.6"
                }}
              >
                Booking #
                {confirmAction.transaction?.id || "-"}
                {" "}
                atas nama{" "}
                <strong
                  style={{
                    color: "#253746"
                  }}
                >
                  {confirmAction.transaction?.full_name ||
                    "-"}
                </strong>
                .
              </p>

              <div
                style={{
                  background:
                    confirmAction.type === "approve"
                      ? "#f2faf6"
                      : "#fff5f5",
                  border:
                    confirmAction.type === "approve"
                      ? "1px solid #d9f0e5"
                      : "1px solid #f4dcdc",
                  borderRadius: "14px",
                  padding: "14px 16px",
                  marginBottom: "24px",
                  textAlign: "center"
                }}
              >

                <span
                  style={{
                    fontSize: "12px",
                    color: "#89949c"
                  }}
                >
                  Total pembayaran
                </span>

                <div
                  style={{
                    marginTop: "3px",
                    fontSize: "17px",
                    fontWeight: 700,

                    color:
                      confirmAction.type === "approve"
                        ? "#159667"
                        : "#d94242"
                  }}
                >
                  Rp{" "}
                  {Number(
                    confirmAction.transaction?.total_price ||
                      0
                  ).toLocaleString("id-ID")}
                </div>

              </div>

              {/* BUTTON */}

              <div
                style={{
                  display: "flex",
                  gap: "10px"
                }}
              >

                <button
                  onClick={closeConfirmModal}
                  disabled={actionLoading}
                  style={{
                    flex: 1,
                    height: "46px",
                    border: "1px solid #dfe4e7",
                    borderRadius: "12px",
                    background: "#ffffff",
                    color: "#53616b",
                    fontSize: "14px",
                    fontWeight: 600,
                    cursor: actionLoading
                      ? "not-allowed"
                      : "pointer"
                  }}
                >
                  Kembali
                </button>

                <button
                  onClick={executeAction}
                  disabled={actionLoading}
                  style={{
                    flex: 1.5,
                    height: "46px",
                    border: "none",
                    borderRadius: "12px",

                    background:
                      confirmAction.type === "approve"
                        ? "linear-gradient(135deg, #0e7557 0%, #16a36e 100%)"
                        : "linear-gradient(135deg, #a82e35 0%, #d94242 100%)",

                    color: "#ffffff",
                    fontSize: "14px",
                    fontWeight: 700,
                    cursor: actionLoading
                      ? "not-allowed"
                      : "pointer",

                    opacity: actionLoading ? 0.7 : 1,

                    boxShadow:
                      confirmAction.type === "approve"
                        ? "0 7px 18px rgba(22,163,110,0.22)"
                        : "0 7px 18px rgba(217,66,66,0.22)"
                  }}
                >
                  {actionLoading
                    ? "Memproses..."
                    : confirmAction.type === "approve"
                    ? "Ya, Setujui"
                    : "Ya, Tolak"}
                </button>

              </div>

            </div>

          </div>

        </div>

      )}

      {/* =====================================================
          NOTIFIKASI HASIL AKSI
      ===================================================== */}

      {resultNotification && (

        <div
          onClick={closeResultNotification}
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(10, 25, 38, 0.42)",
            backdropFilter: "blur(5px)",
            WebkitBackdropFilter: "blur(5px)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 11000,
            padding: "20px",
            animation: "adminPaymentFadeIn 0.2s ease"
          }}
        >

          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              width: "100%",
              maxWidth: "430px",
              background: "#ffffff",
              borderRadius: "22px",
              padding: "30px",
              boxShadow:
                "0 30px 80px rgba(0,0,0,0.28)",
              textAlign: "center",
              animation:
                "adminPaymentModalIn 0.25s ease"
            }}
          >

            <div
              style={{
                width: "68px",
                height: "68px",
                borderRadius: "50%",
                margin: "0 auto 18px",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",

                background:
                  resultNotification.type === "success"
                    ? "#e7f8f0"
                    : resultNotification.type === "reject"
                    ? "#fdeaea"
                    : "#fff2df",

                color:
                  resultNotification.type === "success"
                    ? "#16a36e"
                    : resultNotification.type === "reject"
                    ? "#d94242"
                    : "#d49117",

                fontSize: "28px"
              }}
            >

              {resultNotification.type === "success" ? (
                <FaCheckCircle />
              ) : resultNotification.type === "reject" ? (
                <FaTimesCircle />
              ) : (
                <FaExclamationTriangle />
              )}

            </div>

            <h2
              style={{
                margin: "0 0 10px",
                color: "#253746",
                fontSize: "20px",
                fontWeight: 700
              }}
            >
              {resultNotification.title}
            </h2>

            <p
              style={{
                margin: "0 auto 24px",
                maxWidth: "340px",
                color: "#7b8790",
                fontSize: "14px",
                lineHeight: "1.6"
              }}
            >
              {resultNotification.message}
            </p>

            <button
              onClick={closeResultNotification}
              style={{
                width: "100%",
                height: "46px",
                border: "none",
                borderRadius: "12px",
                background:
                  "linear-gradient(135deg, #123e57 0%, #1c5d7c 100%)",
                color: "#ffffff",
                fontSize: "14px",
                fontWeight: 700,
                cursor: "pointer",
                boxShadow:
                  "0 7px 18px rgba(18,62,87,0.20)"
              }}
            >
              Mengerti
            </button>

          </div>

        </div>

      )}

      {/* =====================================================
          ANIMASI MODAL
      ===================================================== */}

      <style>
        {`
          @keyframes adminPaymentFadeIn {
            from {
              opacity: 0;
            }

            to {
              opacity: 1;
            }
          }

          @keyframes adminPaymentModalIn {
            from {
              opacity: 0;
              transform: translateY(15px) scale(0.97);
            }

            to {
              opacity: 1;
              transform: translateY(0) scale(1);
            }
          }
        `}
      </style>

    </div>
  );
}

export default AdminPayment;