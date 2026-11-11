import { useCallback, useEffect, useState } from "react";
import { FaCheck, FaRedo, FaTimes } from "react-icons/fa";
import Swal from "sweetalert2";
import API_BASE_URL from "../config";
import AdminSidebar from "./AdminSidebar";
import AdminTopbar from "./AdminTopbar";
import "./css/AdminOwnerRegistrations.css";

function getHeaders() {
  const token = localStorage.getItem("token");
  return {
    "Content-Type": "application/json",
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };
}

function formatDate(value) {
  if (!value) return "-";
  const date = new Date(String(value).replace(" ", "T"));
  return Number.isNaN(date.getTime())
    ? String(value)
    : date.toLocaleString("id-ID", { dateStyle: "medium", timeStyle: "short" });
}

export default function AdminOwnerRegistrations() {
  const [registrations, setRegistrations] = useState([]);
  const [status, setStatus] = useState("Menunggu");
  const [notes, setNotes] = useState({});
  const [loading, setLoading] = useState(true);
  const [processingId, setProcessingId] = useState(null);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const loadRegistrations = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const query = new URLSearchParams({ status });
      const response = await fetch(
        `${API_BASE_URL}/api/admin/owner-registrations?${query}`,
        { headers: getHeaders(), cache: "no-store" }
      );
      const data = await response.json();
      if (!response.ok || data.status !== "success") {
        throw new Error(data.error || "Pendaftaran Owner gagal dimuat.");
      }
      setRegistrations(Array.isArray(data.registrations) ? data.registrations : []);
    } catch (loadError) {
      console.error("Load owner registrations:", loadError);
      setError(loadError.message || "Pendaftaran Owner gagal dimuat.");
    } finally {
      setLoading(false);
    }
  }, [status]);

  useEffect(() => {
    loadRegistrations();
  }, [loadRegistrations]);

  const processRegistration = async (registration, decision) => {
    const note = String(notes[registration.id] || "").trim();
    if (decision === "reject" && !note) {
      Swal.fire({
        icon: "warning",
        title: "Alasan Penolakan Wajib",
        text: "Tuliskan alasan penolakan sebelum menolak pendaftaran.",
        confirmButtonColor: "#2980b9"
      });
      return;
    }

    const confirmTitle = decision === "approve" ? "Setujui Pendaftaran?" : "Tolak Pendaftaran?";
    const confirmText = decision === "approve"
      ? `Setujui akun ${registration.username} dan tautkan ke ${registration.villa_name}?`
      : `Tolak pendaftaran akun ${registration.username}?`;

    const confirmResult = await Swal.fire({
      title: confirmTitle,
      text: confirmText,
      icon: "question",
      showCancelButton: true,
      confirmButtonColor: decision === "approve" ? "#16a34a" : "#dc2626",
      cancelButtonColor: "#64748b",
      confirmButtonText: "Ya, Lanjutkan",
      cancelButtonText: "Batal"
    });

    if (!confirmResult.isConfirmed) return;

    setProcessingId(registration.id);
    setError("");
    setSuccess("");
    try {
      const response = await fetch(
        `${API_BASE_URL}/api/admin/owner-registrations/${registration.id}/${decision}`,
        {
          method: "PUT",
          headers: getHeaders(),
          body: JSON.stringify({ admin_note: note }),
        }
      );
      const data = await response.json();
      if (!response.ok || data.status !== "success") {
        throw new Error(data.error || "Pendaftaran gagal diproses.");
      }

      Swal.fire({
        icon: "success",
        title: decision === "approve" ? "Akun Disetujui!" : "Pendaftaran Ditolak",
        text: decision === "approve"
          ? `Akun Owner ${registration.username} aktif dan telah ditautkan ke villa.`
          : `Pendaftaran ${registration.username} berhasil ditolak.`,
        confirmButtonColor: "#2980b9"
      });

      setNotes((current) => {
        const next = { ...current };
        delete next[registration.id];
        return next;
      });
      await loadRegistrations();
    } catch (processError) {
      console.error("Process owner registration:", processError);
      Swal.fire({
        icon: "error",
        title: "Gagal Memproses",
        text: processError.message || "Pendaftaran gagal diproses.",
        confirmButtonColor: "#2980b9"
      });
    } finally {
      setProcessingId(null);
    }
  };

  return (
    <div className="admin-layout admin-owner-registrations-layout">
      <AdminSidebar />
      <main className="main admin-owner-registrations-main">
        {/* TOPBAR */}
        <AdminTopbar
          title="Pendaftaran Owner"
          subtitle="Verifikasi mitra sebelum mengaktifkan akun dan menghubungkannya dengan villa."
        />

        <div className="owner-registrations-filter">
          <label htmlFor="owner-registration-status">Status pendaftaran</label>
          <select
            id="owner-registration-status"
            value={status}
            onChange={(event) => setStatus(event.target.value)}
          >
            <option>Menunggu</option>
            <option>Disetujui</option>
            <option>Ditolak</option>
            <option>Semua</option>
          </select>
          <button
            type="button"
            onClick={loadRegistrations}
            disabled={loading}
            style={{ marginLeft: "auto", display: "flex", alignItems: "center", gap: "6px" }}
          >
            <FaRedo /> {loading ? "Memuat..." : "Muat ulang"}
          </button>
          <span>{registrations.length} pendaftaran</span>
        </div>

        {error && <div className="owner-registration-alert error" role="alert">{error}</div>}
        {success && <div className="owner-registration-alert success" role="status">{success}</div>}

        {loading ? (
          <div className="owner-registration-empty">Memuat pendaftaran...</div>
        ) : registrations.length === 0 ? (
          <div className="owner-registration-empty">Tidak ada pendaftaran dengan status ini.</div>
        ) : (
          <section className="owner-registration-list">
            {registrations.map((registration) => {
              const isPending = registration.status === "Menunggu";
              const isProcessing = processingId === registration.id;
              return (
                <article className="owner-registration-card" key={registration.id}>
                  <div className="owner-registration-card-heading">
                    <div>
                      <span className={`owner-registration-status ${registration.status.toLowerCase()}`}>
                        {registration.status}
                      </span>
                      <h2>{registration.villa_name}</h2>
                      <p>{registration.location || "Lokasi tidak tersedia"}</p>
                    </div>
                    <span className="owner-registration-date">
                      Didaftarkan {formatDate(registration.created_at)}
                    </span>
                  </div>
                  <dl>
                    <div><dt>Nama pemilik/mitra</dt><dd>{registration.contact_name}</dd></div>
                    <div><dt>WhatsApp</dt><dd><a href={`https://wa.me/${String(registration.phone).replace(/\D/g, "")}`} target="_blank" rel="noreferrer">{registration.phone}</a></dd></div>
                    <div><dt>Username Owner</dt><dd>{registration.username}</dd></div>
                  </dl>
                  {registration.admin_note && (
                    <p className="owner-registration-admin-note">
                      Catatan Admin: {registration.admin_note}
                    </p>
                  )}
                  {isPending && (
                    <div className="owner-registration-actions">
                      <label htmlFor={`registration-note-${registration.id}`}>
                        Catatan Admin (wajib jika ditolak)
                      </label>
                      <textarea
                        id={`registration-note-${registration.id}`}
                        value={notes[registration.id] || ""}
                        maxLength={1000}
                        rows={2}
                        disabled={isProcessing}
                        placeholder="Catatan verifikasi atau alasan penolakan..."
                        onChange={(event) => setNotes((current) => ({
                          ...current,
                          [registration.id]: event.target.value,
                        }))}
                      />
                      <div>
                        <button
                          type="button"
                          className="owner-registration-approve"
                          disabled={isProcessing}
                          onClick={() => processRegistration(registration, "approve")}
                        >
                          <FaCheck /> {isProcessing ? "Memproses..." : "Setujui akun & tautkan villa"}
                        </button>
                        <button
                          type="button"
                          className="owner-registration-reject"
                          disabled={isProcessing}
                          onClick={() => processRegistration(registration, "reject")}
                        >
                          <FaTimes /> Tolak pendaftaran
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