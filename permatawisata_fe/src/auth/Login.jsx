import { Lock, User } from "lucide-react";
import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import Swal from "sweetalert2";

import API_BASE_URL from "../config";
import "./Login.css";

function Login() {
  const navigate = useNavigate();

  const [role, setRole] = useState("admin");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  // ==========================================================
  // LOGIN HANDLER
  // ==========================================================
  const handleLogin = async (e) => {
    e.preventDefault();

    const cleanUsername = username.trim();

    // Validasi input
    if (!cleanUsername || !password) {
      Swal.fire({
        icon: "warning",
        title: "Input Belum Lengkap",
        text: "Silakan isi username dan password Anda.",
        confirmButtonColor: "#0d6efd",
      });
      return;
    }

    setLoading(true);

    try {
      // ========================================================
      // REQUEST KE BACKEND
      // ========================================================
      const response = await fetch(`${API_BASE_URL}/api/login`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          username: cleanUsername,
          password: password,
          role: role,
        }),
      });

      const data = await response.json();

      // ========================================================
      // LOGIN BERHASIL
      // ========================================================
      if (response.ok && data.status === "success") {
        // Bersihkan session lama
        localStorage.removeItem("token");
        localStorage.removeItem("role");
        localStorage.removeItem("user");

        const loginRole = String(data.user?.role || role).toLowerCase();

        // Simpan token & user baru
        if (data.token) {
          localStorage.setItem("token", data.token);
        }
        localStorage.setItem("role", loginRole);

        if (data.user) {
          localStorage.setItem("user", JSON.stringify(data.user));
        }

        Swal.fire({
          icon: "success",
          title: "Login Berhasil!",
          text: `Selamat datang kembali, ${data.user?.username || loginRole}.`,
          timer: 1500,
          showConfirmButton: false,
        }).then(() => {
          // Redirect berdasarkan role
          if (loginRole === "admin") {
            navigate("/admin/dashboard", { replace: true });
          } else if (loginRole === "owner") {
            navigate("/owner/dashboard", { replace: true });
          } else {
            Swal.fire({
              icon: "error",
              title: "Akses Ditolak",
              text: "Role pengguna tidak dikenali.",
              confirmButtonColor: "#0d6efd",
            });
          }
        });

        return;
      }

      // LOGIN GAGAL
      Swal.fire({
        icon: "error",
        title: "Login Gagal",
        text: data.message || "Username, password, atau role salah!",
        confirmButtonColor: "#0d6efd",
      });
    } catch (error) {
      console.error("ERROR LOGIN FRONTEND:", error);
      Swal.fire({
        icon: "error",
        title: "Koneksi Gagal",
        text: "Gagal terhubung ke server Backend. Pastikan Flask sedang berjalan.",
        confirmButtonColor: "#0d6efd",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-page">
      <div className="login-wrapper">
        {/* HEADER */}
        <div className="login-header">
          <img
            src="/images/logo-jogjavilla.png"
            alt="Jogja Villa"
            className="login-logo"
          />
          <p>Villa & Homestay Management System</p>
        </div>

        {/* LOGIN CARD */}
        <div className="login-card">
          <h2>Welcome Back</h2>
          <p className="login-description">
            Silakan masuk untuk mengelola akun Anda.
          </p>

          {/* ROLE SWITCH */}
          <div className="role-switch">
            <button
              type="button"
              className={role === "admin" ? "active" : ""}
              onClick={() => setRole("admin")}
              disabled={loading}
            >
              Admin
            </button>

            <button
              type="button"
              className={role === "owner" ? "active" : ""}
              onClick={() => setRole("owner")}
              disabled={loading}
            >
              Villa Owner
            </button>
          </div>

          {/* FORM LOGIN */}
          <form onSubmit={handleLogin}>
            {/* USERNAME */}
            <div className="input-group">
              <label htmlFor="username">Username</label>
              <div className="input-box">
                <User size={18} className="input-icon" />
                <input
                  id="username"
                  type="text"
                  placeholder="Enter your username"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  disabled={loading}
                  autoComplete="username"
                />
              </div>
            </div>

            {/* PASSWORD */}
            <div className="input-group">
              <label htmlFor="password">Password</label>
              <div className="input-box">
                <Lock size={18} className="input-icon" />
                <input
                  id="password"
                  type="password"
                  placeholder="Enter your password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  disabled={loading}
                  autoComplete="current-password"
                />
              </div>
            </div>

            {/* SUBMIT BUTTON */}
            <button type="submit" className="login-btn" disabled={loading}>
              {loading ? "Memproses..." : "Sign In"}
            </button>
          </form>

          {role === "owner" && (
            <Link className="owner-register-login-link" to="/owner/register">
              Belum punya akun Owner? Daftar di sini
            </Link>
          )}
        </div>

        <p className="copyright">© 2026 jogjavilla.id. All rights reserved.</p>
      </div>
    </div>
  );
}

export default Login;