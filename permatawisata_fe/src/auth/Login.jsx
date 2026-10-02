import { Lock, User } from "lucide-react";
import { useState } from "react";
import { useNavigate } from "react-router-dom";

import API_BASE_URL from "../config";
import "./Login.css";

function Login() {
  const navigate = useNavigate();

  const [role, setRole] = useState("admin");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  // ==========================================================
  // LOGIN
  // ==========================================================

  const handleLogin = async (e) => {
    e.preventDefault();

    const cleanUsername = username.trim();

    // Validasi input
    if (!cleanUsername || !password) {
      alert("Silakan isi username dan password.");
      return;
    }

    setLoading(true);

    try {
      // ========================================================
      // REQUEST KE BACKEND
      // ========================================================

      const response = await fetch(
        `${API_BASE_URL}/api/login`,
        {
          method: "POST",

          headers: {
            "Content-Type": "application/json",
          },

          body: JSON.stringify({
            username: cleanUsername,
            password: password,
            role: role,
          }),
        }
      );

      // ========================================================
      // BACA RESPONSE
      // ========================================================

      const data = await response.json();

      // ========================================================
      // LOGIN BERHASIL
      // ========================================================

      if (
        response.ok &&
        data.status === "success"
      ) {
        // ------------------------------------------------------
        // Bersihkan session lama
        // ------------------------------------------------------

        localStorage.removeItem("token");
        localStorage.removeItem("user");

        // ------------------------------------------------------
        // Simpan JWT
        // ------------------------------------------------------

        if (data.token) {
          localStorage.setItem(
            "token",
            data.token
          );
        }

        // ------------------------------------------------------
        // Simpan informasi user
        // ------------------------------------------------------

        if (data.user) {
          localStorage.setItem(
            "user",
            JSON.stringify(data.user)
          );
        }

        // ------------------------------------------------------
        // Redirect berdasarkan role
        // ------------------------------------------------------

        const loginRole = String(
          data.user?.role || role
        ).toLowerCase();

        if (loginRole === "admin") {
          navigate(
            "/admin/dashboard",
            {
              replace: true,
            }
          );
        } else if (loginRole === "owner") {
          navigate(
            "/owner/dashboard",
            {
              replace: true,
            }
          );
        } else {
          alert(
            "Role pengguna tidak dikenali."
          );
        }

        return;
      }

      // ========================================================
      // LOGIN GAGAL
      // ========================================================

      alert(
        data.message ||
          "Username, password, atau role salah!"
      );
    } catch (error) {
      console.error(
        "ERROR LOGIN FRONTEND:",
        error
      );

      alert(
        "Gagal terhubung ke server Backend. Pastikan Flask sedang berjalan."
      );
    } finally {
      setLoading(false);
    }
  };

  // ==========================================================
  // RENDER
  // ==========================================================

  return (
    <div className="login-page">

      <div className="login-wrapper">

        {/* ==================================================
            HEADER
        ================================================== */}

        <div className="login-header">

          <img
            src="/images/logo-jogjavilla.png"
            alt="Jogja Villa"
            className="login-logo"
          />

          <p>
            Villa & Homestay Management System
          </p>

        </div>

        {/* ==================================================
            LOGIN CARD
        ================================================== */}

        <div className="login-card">

          <h2>
            Welcome Back
          </h2>

          <p className="login-description">
            Silakan masuk untuk mengelola akun Anda.
          </p>

          {/* ==================================================
              ROLE SWITCH
          ================================================== */}

          <div className="role-switch">

            <button
              type="button"
              className={
                role === "admin"
                  ? "active"
                  : ""
              }
              onClick={() =>
                setRole("admin")
              }
              disabled={loading}
            >
              Admin
            </button>

            <button
              type="button"
              className={
                role === "owner"
                  ? "active"
                  : ""
              }
              onClick={() =>
                setRole("owner")
              }
              disabled={loading}
            >
              Villa Owner
            </button>

          </div>

          {/* ==================================================
              FORM LOGIN
          ================================================== */}

          <form onSubmit={handleLogin}>

            {/* USERNAME */}

            <div className="input-group">

              <label htmlFor="username">
                Username
              </label>

              <div className="input-box">

                <User
                  size={18}
                  className="input-icon"
                />

                <input
                  id="username"
                  type="text"
                  placeholder="Enter your username"
                  value={username}
                  onChange={(e) =>
                    setUsername(
                      e.target.value
                    )
                  }
                  disabled={loading}
                  autoComplete="username"
                />

              </div>

            </div>

            {/* PASSWORD */}

            <div className="input-group">

              <label htmlFor="password">
                Password
              </label>

              <div className="input-box">

                <Lock
                  size={18}
                  className="input-icon"
                />

                <input
                  id="password"
                  type="password"
                  placeholder="Enter your password"
                  value={password}
                  onChange={(e) =>
                    setPassword(
                      e.target.value
                    )
                  }
                  disabled={loading}
                  autoComplete="current-password"
                />

              </div>

            </div>

            {/* LOGIN BUTTON */}

            <button
              type="submit"
              className="login-btn"
              disabled={loading}
            >
              {loading
                ? "Memproses..."
                : "Sign In"}
            </button>

          </form>

        </div>

        {/* ==================================================
            COPYRIGHT
        ================================================== */}

        <p className="copyright">
          © 2026 jogjavilla.id. All rights reserved.
        </p>

      </div>

    </div>
  );
}

export default Login;