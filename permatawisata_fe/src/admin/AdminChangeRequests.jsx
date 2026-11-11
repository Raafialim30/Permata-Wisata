import { useCallback, useEffect, useState } from "react";
import {
  FaCheck,
  FaClock,
  FaCommentDots,
  FaRedo,
  FaTimes,
  FaBed,
  FaArrowRight,
  FaUser,
  FaTag,
  FaExclamationCircle,
  FaCheckCircle,
} from "react-icons/fa";
import Swal from "sweetalert2";
import API_BASE_URL from "../config";
import AdminSidebar from "./AdminSidebar";
import AdminTopbar from "./AdminTopbar";
import "./css/AdminChangeRequests.css";

const STATUSES = ["Menunggu", "Disetujui", "Ditolak", "Dibatalkan"];

function getAdminHeaders() {
  const headers = {
    "Content-Type": "application/json",
  };
  const token = localStorage.getItem("token");

  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }
  return headers;
}

function formatDate(value) {
  if (!value) return "-";
  const date = new Date(String(value).replace(" ", "T"));
  return Number.isNaN(date.getTime())
    ? String(value)
    : date.toLocaleString("id-ID", {
        dateStyle: "medium",
        timeStyle: "short",
      });
}

function formatRupiah(amount) {
  if (amount == null || isNaN(amount)) return null;
  return new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    maximumFractionDigits: 0,
  }).format(Number(amount));
}

function getRequestLabel(request) {
  if (request.request_type === "price") {
    return request.villa_detail_id
      ? "Penyesuaian Harga Kamar/Unit"
      : "Penyesuaian Harga Villa";
  }
  if (request.request_type === "edit_unit") {
    return "Penyesuaian Harga Kamar/Unit";
  }
  return String(request.request_type || "Pengajuan")
    .replaceAll("_", " ")
    .replace(/^./, (character) => character.toUpperCase());
}

function getStatusClass(status) {
  return String(status || "")
    .toLowerCase()
    .replaceAll(" ", "-");
}

export default function AdminChangeRequests() {
  const [requests, setRequests] = useState([]);
  const [filter, setFilter] = useState("Menunggu");
  const [replies, setReplies] = useState({});
  const [loading, setLoading] = useState(true);
  const [activeRequestId, setActiveRequestId] = useState(null);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const loadRequests = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const query = new URLSearchParams({ limit: "200" });
      if (filter !== "Semua") query.set("status", filter);

      const response = await fetch(
        `${API_BASE_URL}/api/admin/change-requests?${query.toString()}`,
        {
          cache: "no-store",
          headers: getAdminHeaders(),
        }
      );
      const data = await response.json();
      if (!response.ok || data.status !== "success") {
        throw new Error(data.error || "Gagal memuat pengajuan owner.");
      }

      setRequests(Array.isArray(data.requests) ? data.requests : []);
    } catch (loadError) {
      console.error("Load Owner Change Requests Error:", loadError);
      setError(loadError.message || "Gagal memuat pengajuan owner.");
    } finally {
      setLoading(false);
    }
  }, [filter]);

  useEffect(() => {
    loadRequests();
  }, [loadRequests]);

  const handleDecision = async (request, decision) => {
    const adminNote = String(replies[request.id] || "").trim();
    if (!adminNote) {
      Swal.fire({
        icon: "warning",
        title: "Catatan Wajib Diisi",
        text: "Catatan balasan untuk Owner wajib diisi sebelum menyimpan keputusan.",
        confirmButtonColor: "#2980b9"
      });
      return;
    }

    const actionText = decision === "approve" ? "menyetujui" : "menolak";
    const confirmResult = await Swal.fire({
      title: "Konfirmasi Keputusan",
      text: `Apakah Anda yakin ingin ${actionText} pengajuan harga ini?`,
      icon: "question",
      showCancelButton: true,
      confirmButtonColor: decision === "approve" ? "#16a34a" : "#dc2626",
      cancelButtonColor: "#64748b",
      confirmButtonText: `Ya, ${actionText.toUpperCase()}`,
      cancelButtonText: "Batal"
    });

    if (!confirmResult.isConfirmed) return;

    setActiveRequestId(request.id);
    setError("");
    setSuccess("");
    try {
      const action = decision === "approve" ? "approve" : "reject";
      const response = await fetch(
        `${API_BASE_URL}/api/admin/change-requests/${request.id}/${action}`,
        {
          method: "PUT",
          headers: getAdminHeaders(),
          body: JSON.stringify({ admin_note: adminNote }),
        }
      );
      const data = await response.json();
      if (!response.ok || data.status !== "success") {
        throw new Error(data.error || "Keputusan pengajuan gagal disimpan.");
      }

      Swal.fire({
        icon: "success",
        title: "Berhasil Diproses!",
        text: decision === "approve"
          ? "Pengajuan disetujui & catatan berhasil dikirimkan ke Owner."
          : "Pengajuan ditolak & catatan berhasil dikirimkan ke Owner.",
        confirmButtonColor: "#2980b9"
      });

      setReplies((current) => {
        const next = { ...current };
        delete next[request.id];
        return next;
      });
      await loadRequests();
    } catch (actionError) {
      console.error("Process Owner Change Request Error:", actionError);
      Swal.fire({
        icon: "error",
        title: "Gagal Memproses",
        text: actionError.message || "Keputusan pengajuan gagal disimpan.",
        confirmButtonColor: "#2980b9"
      });
    } finally {
      setActiveRequestId(null);
    }
  };

  const renderReadableDetails = (request) => {
    const oldData = request.old_data || {};
    const newData = request.new_data || {};

    const roomName =
      oldData.room_name ||
      newData.room_name ||
      oldData.name ||
      newData.name ||
      (request.villa_detail_id
        ? `Kamar Unit #${request.villa_detail_id}`
        : "Seluruh Villa");

    const oldPriceRaw = oldData.price ?? oldData.updates?.price ?? null;
    const newPriceRaw = newData.price ?? newData.updates?.price ?? null;

    const formattedOldPrice = formatRupiah(oldPriceRaw);
    const formattedNewPrice = formatRupiah(newPriceRaw);

    return (
      <div className="change-request-details-box">
        <div className="change-request-target-header">
          <div className="target-room-info">
            <div className="bed-icon-wrapper">
              <FaBed />
            </div>
            <div>
              <span className="target-label">Target Perubahan</span>
              <strong className="target-room-name">{roomName}</strong>
            </div>
          </div>

          {request.villa_detail_id && (
            <span className="unit-badge">
              Unit #{request.villa_detail_id}
            </span>
          )}
        </div>

        {formattedOldPrice || formattedNewPrice ? (
          <div className="price-comparison-widget">
            <div className="price-item old-price-box">
              <span className="price-label">Harga Semula</span>
              <strong className="price-value old">
                {formattedOldPrice || "Tidak ada data"}
              </strong>
            </div>

            <div className="price-arrow-icon">
              <FaArrowRight />
            </div>

            <div className="price-item new-price-box">
              <span className="price-label">Harga Diajukan</span>
              <strong className="price-value new">
                {formattedNewPrice || "Tidak ada data"}
              </strong>
            </div>
          </div>
        ) : (
          <div className="raw-json-box">
            <pre>{JSON.stringify({ data_lama: oldData, data_baru: newData }, null, 2)}</pre>
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="admin-layout admin-change-requests-layout">
      <AdminSidebar />
      <main className="main admin-change-requests-main">
        {/* TOPBAR */}
        <AdminTopbar
          title="Pengajuan Owner"
          subtitle="Tinjau pengajuan perubahan dan kirim keputusan beserta catatan balasan kepada Owner."
        />

        {/* TOOLBAR CONTROL */}
        <div className="change-requests-toolbar">
          <div className="toolbar-left">
            <label htmlFor="request-status-filter">Filter Status:</label>
            <select
              id="request-status-filter"
              value={filter}
              onChange={(event) => setFilter(event.target.value)}
            >
              <option>Menunggu</option>
              <option>Semua</option>
              {STATUSES.filter((status) => status !== "Menunggu").map((status) => (
                <option key={status}>{status}</option>
              ))}
            </select>
          </div>

          <div className="toolbar-right">
            <span className="total-badge">
              Total: {requests.length} Pengajuan
            </span>
            <button
              type="button"
              className="refresh-btn"
              onClick={loadRequests}
              disabled={loading}
            >
              <FaRedo className={loading ? "spin-icon" : ""} />
              {loading ? "Memuat..." : "Muat Ulang"}
            </button>
          </div>
        </div>

        {/* ALERTS */}
        {error && (
          <div className="change-requests-alert error" role="alert">
            <FaExclamationCircle />
            <span>{error}</span>
          </div>
        )}
        {success && (
          <div className="change-requests-alert success" role="status">
            <FaCheckCircle />
            <span>{success}</span>
          </div>
        )}

        {/* CONTENT STATES */}
        {loading ? (
          <div className="change-requests-empty loading">
            Memuat daftar pengajuan...
          </div>
        ) : requests.length === 0 ? (
          <div className="change-requests-empty">
            <FaCommentDots className="empty-icon" />
            <strong>Tidak ada pengajuan ditemukan</strong>
            <span>Pengajuan dengan filter status ini belum tersedia saat ini.</span>
          </div>
        ) : (
          <section className="change-request-list" aria-label="Daftar pengajuan owner">
            {requests.map((request) => {
              const isPending = request.status === "Menunggu";
              const isBusy = activeRequestId === request.id;
              const requestReply = replies[request.id] || "";
              const statusClass = getStatusClass(request.status);

              return (
                <article
                  key={request.id}
                  className={`change-request-card status-${statusClass}`}
                >
                  {/* CARD HEADER */}
                  <div className="change-request-card-heading">
                    <div className="heading-left">
                      <span className="change-request-type">
                        <FaTag className="tag-icon" />
                        {getRequestLabel(request)}
                      </span>
                      <h2>{request.villa_name || "Villa tidak diketahui"}</h2>
                      <p className="owner-info">
                        <FaUser className="user-icon" />
                        Owner: <strong>{request.owner_username || "-"}</strong>
                      </p>
                    </div>

                    <span className={`status-badge status-${statusClass}`}>
                      {request.status}
                    </span>
                  </div>

                  {/* TIME META */}
                  <div className="change-request-meta">
                    <span className="meta-time">
                      <FaClock /> Diajukan {formatDate(request.created_at)}
                    </span>
                    {request.processed_at && (
                      <span className="meta-processed">
                        Diproses {formatDate(request.processed_at)}
                      </span>
                    )}
                  </div>

                  {/* READABLE DETAILS (ROOM & PRICE) */}
                  {renderReadableDetails(request)}

                  {/* REASON FROM OWNER */}
                  <div className="change-request-reason">
                    <h3>Alasan Pengajuan Owner</h3>
                    <p>{request.reason || "Owner tidak menambahkan alasan spesifik."}</p>
                  </div>

                  {/* EXISTING ADMIN REPLY IF PROCESSED */}
                  {request.admin_note && (
                    <div className="change-request-existing-reply">
                      <strong>Catatan Balasan Admin</strong>
                      <p>{request.admin_note}</p>
                    </div>
                  )}

                  {/* RESPONSE FORM FOR PENDING REQUESTS */}
                  {isPending && (
                    <div className="change-request-response">
                      <label htmlFor={`admin-reply-${request.id}`}>
                        Balasan untuk Owner <span className="required-star">(wajib diisi)</span>
                      </label>
                      <textarea
                        id={`admin-reply-${request.id}`}
                        value={requestReply}
                        maxLength={1000}
                        rows={3}
                        placeholder="Tuliskan alasan keputusan atau informasi detail untuk Owner..."
                        onChange={(event) =>
                          setReplies((current) => ({
                            ...current,
                            [request.id]: event.target.value,
                          }))
                        }
                        disabled={isBusy}
                      />

                      <div className="change-request-actions">
                        <button
                          type="button"
                          className="change-request-reject"
                          onClick={() => handleDecision(request, "reject")}
                          disabled={isBusy}
                        >
                          <FaTimes />
                          {isBusy ? "Menyimpan..." : "Tolak Pengajuan"}
                        </button>

                        <button
                          type="button"
                          className="change-request-approve"
                          onClick={() => handleDecision(request, "approve")}
                          disabled={isBusy}
                        >
                          <FaCheck />
                          {isBusy ? "Menyimpan..." : "Setujui Pengajuan"}
                        </button>
                      </div>
                    </div>
                  )}
                </article>
              );
            })}
          </section>
        )}
      </main>
    </div>
  );
}