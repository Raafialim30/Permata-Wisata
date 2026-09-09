import { Lock, User } from "lucide-react";
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import API_BASE_URL from "../config";
import "./css/AdminLogin.css";

function AdminLogin(){

const navigate = useNavigate();

  const [role, setRole] = useState("admin");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  /* FUNCTION LOGIN */
  const handleLogin = async (e) => {
    if (e) e.preventDefault();

    const cleanUsername = username.trim();
    if (!cleanUsername || !password) {
      alert("Silakan isi username dan password");
      return;
    }

    setLoading(true);

    try {
      // Menyambungkan ke backend sesuai konfigurasi aplikasi
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

      if (response.ok && data.status === "success") {
        // Menyimpan JWT Token dan data user terverifikasi
        if (data.token) {
          localStorage.setItem("token", data.token);
        }
        if (data.user) {
          localStorage.setItem("user", JSON.stringify(data.user));
        }

        /* jika admin */
        if (role === "admin") {
          navigate("/admin/dashboard");
        }
        /* jika owner */
        else if (role === "owner") {
          navigate("/owner/dashboard");
        }
      } else {
        // Menampilkan pesan error umum jika verifikasi gagal
        alert(data.message || "Username, Password, atau Role salah!");
      }
    } catch (error) {
      console.error("Error connection:", error);
      alert("Gagal terhubung ke server Backend. Pastikan koneksi server menyala.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="admin-login-page">
      <div className="login-wrapper">
        {/* LOGO AREA */}
        <div className="login-header">
          <img
            src="/images/logo-jogjavilla.png"
            alt="Jogja Villa"
            style={{ height: "52px", objectFit: "contain", marginBottom: "10px" }}
          />
          <p>Villa & Homestay Management System</p>
        </div>

        {/* LOGIN CARD */}
        <div className="login-card">
          <h2>Welcome Back</h2>

          {/* ROLE SWITCH */}
          <div className="role-switch">
            <button
              className={role === "admin" ? "active" : ""}
              onClick={() => setRole("admin")}
              type="button"
            >
              Admin
            </button>
            <button
              className={role === "owner" ? "active" : ""}
              onClick={() => setRole("owner")}
              type="button"
            >
              Villa Owner
            </button>
          </div>

          <form onSubmit={handleLogin}>
            {/* USERNAME */}
            <div className="input-group">
              <label>Username</label>
              <div className="input-box">
                <User size={18} className="input-icon" />
                <input
                  type="text"
                  placeholder="Enter your username"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  disabled={loading}
                />
              </div>
            </div>

            {/* PASSWORD */}
            <div className="input-group">
              <label>Password</label>
              <div className="input-box">
                <Lock size={18} className="input-icon" />
                <input
                  type="password"
                  placeholder="Enter your password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  disabled={loading}
                />
              </div>
            </div>

            {/* LOGIN BUTTON */}
            <button
              type="submit"
              className="login-btn"
              disabled={loading}
            >
              {loading ? "Memproses..." : "Sign In"}
            </button>
          </form>
        </div>

        <p className="copyright">
          © 2026 jogjavilla.id. All rights reserved.
        </p>
      </div>
    </div>
  );
}

export default AdminLogin;