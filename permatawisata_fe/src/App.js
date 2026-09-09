import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";

import { LanguageProvider } from "./context/LanguageContext";
import AdminDashboard from "./admin/AdminDashboard";
import AdminLogin from "./admin/AdminLogin";
import AdminManageVillas from "./admin/AdminManageVillas";
import AdminPayment from "./admin/AdminPayment";
import AdminTransactions from "./admin/AdminTransactions";
import OwnerAvailability from "./admin/OwnerAvailability";
import OwnerDashboard from "./admin/OwnerDashboard";
import Booking from "./pages/Booking";
import Landingpage from "./pages/Landingpage";
import Payment from "./pages/Payment";
import Success from "./pages/Success";
import VillaDetail from "./pages/VillaDetail";
import Villas from "./pages/Villas";
import ReviewPage from "./pages/ReviewPage";
import "./css/responsive.css";

/*
==========================================================
PROTECTED ROUTE
==========================================================

Fungsi:
- Memastikan user sudah login sebelum membuka halaman Admin/Owner.
- Mengecek token yang disimpan setelah login.
- Mengecek role user.
- Admin hanya bisa masuk halaman Admin.
- Owner hanya bisa masuk halaman Owner.
==========================================================
*/

function ProtectedRoute({ children, allowedRole }) {
  const token = localStorage.getItem("token");
  const userData = localStorage.getItem("user");

  /*
  Jika tidak ada token atau data user,
  berarti user belum login.
  */
  if (!token || !userData) {
    return <Navigate to="/admin/login" replace />;
  }

  let user;

  try {
    user = JSON.parse(userData);
  } catch (error) {
    console.error("Data user di localStorage tidak valid:", error);

    /*
    Bersihkan data login yang rusak
    */
    localStorage.removeItem("token");
    localStorage.removeItem("user");

    return <Navigate to="/admin/login" replace />;
  }

  /*
  Ambil role user dan ubah menjadi huruf kecil
  agar "Admin", "ADMIN", dan "admin"
  tetap dianggap sama.
  */
  const userRole = String(user?.role || "").toLowerCase();
  const requiredRole = String(allowedRole || "").toLowerCase();

  /*
  Jika role tidak sesuai dengan halaman yang ingin dibuka,
  arahkan ke dashboard sesuai role user.
  */
  if (requiredRole && userRole !== requiredRole) {
    if (userRole === "admin") {
      return <Navigate to="/admin/dashboard" replace />;
    }

    if (userRole === "owner") {
      return <Navigate to="/owner/dashboard" replace />;
    }

    /*
    Jika role tidak dikenali,
    kembalikan ke halaman login.
    */
    localStorage.removeItem("token");
    localStorage.removeItem("user");

    return <Navigate to="/admin/login" replace />;
  }

  /*
  Jika token dan role benar,
  halaman boleh ditampilkan.
  */
  return children;
}


function App() {
  return (
    <LanguageProvider>
      <BrowserRouter>

        <Routes>

          {/* =====================================================
              HALAMAN CUSTOMER
              Tidak diubah
          ===================================================== */}

          <Route
            path="/"
            element={<Landingpage />}
          />

          <Route
            path="/villas"
            element={<Villas />}
          />

          <Route
            path="/villas/:id"
            element={<VillaDetail />}
          />

          <Route
            path="/booking"
            element={<Booking />}
          />

          <Route
            path="/payment"
            element={<Payment />}
          />

          <Route
            path="/success"
            element={<Success />}
          />

          <Route
            path="/review"
            element={<ReviewPage />}
          />


          {/* =====================================================
              LOGIN ADMIN / OWNER
              Tetap public
          ===================================================== */}

          <Route
            path="/admin/login"
            element={<AdminLogin />}
          />


          {/* =====================================================
              HALAMAN ADMIN
              Hanya bisa dibuka oleh user dengan role "admin"
          ===================================================== */}

          <Route
            path="/admin/dashboard"
            element={
              <ProtectedRoute allowedRole="admin">
                <AdminDashboard />
              </ProtectedRoute>
            }
          />

          <Route
            path="/admin/villas"
            element={
              <ProtectedRoute allowedRole="admin">
                <AdminManageVillas />
              </ProtectedRoute>
            }
          />

          <Route
            path="/admin/transactions"
            element={
              <ProtectedRoute allowedRole="admin">
                <AdminTransactions />
              </ProtectedRoute>
            }
          />

          <Route
            path="/admin/payment"
            element={
              <ProtectedRoute allowedRole="admin">
                <AdminPayment />
              </ProtectedRoute>
            }
          />


          {/* =====================================================
              HALAMAN OWNER
              Hanya bisa dibuka oleh user dengan role "owner"
          ===================================================== */}

          <Route
            path="/owner/dashboard"
            element={
              <ProtectedRoute allowedRole="owner">
                <OwnerDashboard />
              </ProtectedRoute>
            }
          />

          <Route
            path="/owner/availability"
            element={
              <ProtectedRoute allowedRole="owner">
                <OwnerAvailability />
              </ProtectedRoute>
            }
          />


          {/* =====================================================
              JIKA URL TIDAK DITEMUKAN
              Kembali ke halaman utama
          ===================================================== */}

          <Route
            path="*"
            element={<Navigate to="/" replace />}
          />

        </Routes>

      </BrowserRouter>
    </LanguageProvider>
  );
}

export default App;