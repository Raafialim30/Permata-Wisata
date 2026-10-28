import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import API_BASE_URL from "../config";
import "./OwnerRegister.css";

export default function OwnerRegister() {
  const [villas, setVillas] = useState([]);
  const [loadingVillas, setLoadingVillas] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [form, setForm] = useState({
    villa_id: "",
    contact_name: "",
    phone: "",
    username: "",
    password: "",
    confirm_password: "",
  });

  useEffect(() => {
    const loadVillas = async () => {
      try {
        const response = await fetch(
          `${API_BASE_URL}/api/owner/registration-villas`,
          { cache: "no-store" }
        );
        const data = await response.json();
        if (!response.ok || data.status !== "success") {
          throw new Error(data.error || "Daftar villa gagal dimuat.");
        }
        setVillas(Array.isArray(data.villas) ? data.villas : []);
      } catch (loadError) {
        console.error("Load owner registration villas:", loadError);
        setError(loadError.message || "Daftar villa gagal dimuat.");
      } finally {
        setLoadingVillas(false);
      }
    };
    loadVillas();
  }, []);

  const updateField = (event) => {
    setForm((current) => ({
      ...current,
      [event.target.name]: event.target.value,
    }));
  };

  const submitRegistration = async (event) => {
    event.preventDefault();
    setError("");
    setSuccess("");
    if (form.password !== form.confirm_password) {
      setError("Konfirmasi password belum sama.");
      return;
    }

    setSubmitting(true);
    try {
      const response = await fetch(`${API_BASE_URL}/api/owner/register`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          villa_id: form.villa_id,
          contact_name: form.contact_name,
          phone: form.phone,
          username: form.username,
          password: form.password,
        }),
      });
      const data = await response.json();
      if (!response.ok || data.status !== "success") {
        throw new Error(data.error || "Pendaftaran Owner gagal dikirim.");
      }
      setSuccess(
        "Pendaftaran berhasil dikirim dan menunggu persetujuan Admin. Setelah Admin menghubungi dan menyetujui pendaftaran, Anda dapat login dengan username dan password yang dibuat."
      );
      setForm({
        villa_id: "",
        contact_name: "",
        phone: "",
        username: "",
        password: "",
        confirm_password: "",
      });
    } catch (submitError) {
      console.error("Submit owner registration:", submitError);
      setError(submitError.message || "Pendaftaran Owner gagal dikirim.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <main className="owner-register-page">
      <section className="owner-register-card">
        <img src="/images/logo-jogjavilla.png" alt="Jogja Villa" />
        <p className="owner-register-eyebrow">AKUN MITRA</p>
        <h1>Daftar sebagai Villa Owner</h1>
        <p className="owner-register-intro">
          Pilih villa yang telah ditambahkan Admin dan buat akun untuk dashboard
          Owner. Pendaftaran harus diverifikasi Admin terlebih dahulu.
        </p>

        {error && <div className="owner-register-message error" role="alert">{error}</div>}
        {success && <div className="owner-register-message success" role="status">{success}</div>}

        {!success && (
          <form onSubmit={submitRegistration}>
            <label htmlFor="register-villa">Villa</label>
            <select
              id="register-villa"
              name="villa_id"
              value={form.villa_id}
              onChange={updateField}
              required
              disabled={loadingVillas || villas.length === 0 || submitting}
            >
              <option value="">
                {loadingVillas ? "Memuat villa..." : "Pilih villa Anda"}
              </option>
              {villas.map((villa) => (
                <option key={villa.id} value={villa.id}>
                  {villa.name} — {villa.location}
                </option>
              ))}
            </select>
            {!loadingVillas && villas.length === 0 && (
              <small>
                Belum ada villa yang tersedia untuk didaftarkan. Hubungi Admin
                agar villa ditambahkan atau dibuka untuk pendaftaran.
              </small>
            )}

            <label htmlFor="register-name">Nama pemilik/mitra</label>
            <input
              id="register-name"
              name="contact_name"
              value={form.contact_name}
              onChange={updateField}
              autoComplete="name"
              required
              disabled={submitting}
            />

            <label htmlFor="register-phone">Nomor WhatsApp</label>
            <input
              id="register-phone"
              name="phone"
              type="tel"
              value={form.phone}
              onChange={updateField}
              autoComplete="tel"
              required
              disabled={submitting}
            />

            <label htmlFor="register-username">Username</label>
            <input
              id="register-username"
              name="username"
              value={form.username}
              onChange={updateField}
              autoComplete="username"
              minLength={3}
              maxLength={50}
              pattern="[A-Za-z0-9_.-]{3,50}"
              title="3–50 karakter: huruf, angka, titik, garis bawah, atau tanda hubung."
              required
              disabled={submitting}
            />

            <label htmlFor="register-password">Password</label>
            <input
              id="register-password"
              name="password"
              type="password"
              value={form.password}
              onChange={updateField}
              autoComplete="new-password"
              minLength={8}
              maxLength={128}
              required
              disabled={submitting}
            />

            <label htmlFor="register-confirm-password">Konfirmasi password</label>
            <input
              id="register-confirm-password"
              name="confirm_password"
              type="password"
              value={form.confirm_password}
              onChange={updateField}
              autoComplete="new-password"
              minLength={8}
              maxLength={128}
              required
              disabled={submitting}
            />

            <p className="owner-register-note">
              Password disimpan dalam bentuk hash dan baru dapat dipakai login
              setelah Admin menyetujui pendaftaran.
            </p>
            <button type="submit" disabled={submitting || loadingVillas || villas.length === 0}>
              {submitting ? "Mengirim pendaftaran..." : "Kirim Pendaftaran"}
            </button>
          </form>
        )}

        <Link className="owner-register-login-link" to="/login">
          Kembali ke halaman login
        </Link>
      </section>
    </main>
  );
}
