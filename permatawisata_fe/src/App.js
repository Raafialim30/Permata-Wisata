import {
  BrowserRouter,
  Navigate,
  Route,
  Routes,
} from "react-router-dom";

import { LanguageProvider } from "./context/LanguageContext";
import ProtectedRoute from "./components/ProtectedRoute";

import AdminDashboard from "./admin/AdminDashboard";
import AdminChangeRequests from "./admin/AdminChangeRequests";
import AdminOwnerRegistrations from "./admin/AdminOwnerRegistrations";
import Login from "./auth/Login";
import OwnerRegister from "./auth/OwnerRegister";
import AdminManageVillas from "./admin/AdminManageVillas";
import AdminPayment from "./admin/AdminPayment";
import AdminTransactions from "./admin/AdminTransactions";

import OwnerAvailability from "./owner/OwnerAvailability";
import OwnerDashboard from "./owner/OwnerDashboard";
import OwnerLayout from "./owner/OwnerLayout";
import OwnerPriceRequest from "./owner/OwnerPriceRequest";

import Booking from "./pages/Booking";
import Landingpage from "./pages/Landingpage";
import Payment from "./pages/Payment";
import Success from "./pages/Success";
import VillaDetail from "./pages/VillaDetail";
import Villas from "./pages/Villas";
import ReviewPage from "./pages/ReviewPage";

import "./css/responsive.css";


function App() {
  return (
    <LanguageProvider>

      <BrowserRouter>

        <Routes>

          {/* ==================================================
              CUSTOMER
          ================================================== */}

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


          {/* ==================================================
              LOGIN
          ================================================== */}

          <Route
            path="/login"
            element={<Login />}
          />

          <Route
            path="/owner/register"
            element={<OwnerRegister />}
          />

          {/* ==================================================
              ADMIN
          ================================================== */}

          <Route
            path="/admin/dashboard"
            element={
              <ProtectedRoute
                allowedRole="admin"
              >
                <AdminDashboard />
              </ProtectedRoute>
            }
          />

          <Route
            path="/admin/villas"
            element={
              <ProtectedRoute
                allowedRole="admin"
              >
                <AdminManageVillas />
              </ProtectedRoute>
            }
          />

          <Route
            path="/admin/transactions"
            element={
              <ProtectedRoute
                allowedRole="admin"
              >
                <AdminTransactions />
              </ProtectedRoute>
            }
          />

          <Route
            path="/admin/payment"
            element={
              <ProtectedRoute
                allowedRole="admin"
              >
                <AdminPayment />
              </ProtectedRoute>
            }
          />

          <Route
            path="/admin/change-requests"
            element={
              <ProtectedRoute
                allowedRole="admin"
              >
                <AdminChangeRequests />
              </ProtectedRoute>
            }
          />

          <Route
            path="/admin/owner-registrations"
            element={
              <ProtectedRoute
                allowedRole="admin"
              >
                <AdminOwnerRegistrations />
              </ProtectedRoute>
            }
          />


          {/* ==================================================
              OWNER
              
              OwnerLayout menjadi parent.

              Semua halaman Owner berada di dalam
              OwnerLayout sehingga sidebar/menu Owner
              tetap digunakan.

              Struktur:
              
              /owner
                ├── dashboard
                ├── availability
                └── price-request
              
              OwnerLayout:
                  ├── Owner Sidebar
                  └── Outlet
                      
              Outlet akan menampilkan halaman child:
                  ├── OwnerDashboard
                  ├── OwnerAvailability
                  └── OwnerPriceRequest
          ================================================== */}

          <Route
            path="/owner"
            element={
              <ProtectedRoute
                allowedRole="owner"
              >
                <OwnerLayout />
              </ProtectedRoute>
            }
          >

            {/* ================================================
                OWNER DASHBOARD
                URL:
                /owner/dashboard
            ================================================= */}

            <Route
              path="dashboard"
              element={
                <OwnerDashboard />
              }
            />


            {/* ================================================
                OWNER AVAILABILITY
                URL:
                /owner/availability
            ================================================= */}

            <Route
              path="availability"
              element={
                <OwnerAvailability />
              }
            />


            {/* ================================================
                OWNER PRICE ADJUSTMENT
                URL:
                /owner/price-request

                Halaman ini digunakan Owner untuk mengajukan
                PENYESUAIAN harga.

                Harga dapat:
                - Naik
                - Turun

                Pengajuan akan masuk ke Admin untuk diperiksa
                sebelum harga benar-benar berubah.
            ================================================= */}

            <Route
              path="price-request"
              element={
                <OwnerPriceRequest />
              }
            />

          </Route>


          {/* ==================================================
              DEFAULT
          ================================================== */}

          <Route
            path="*"
            element={
              <Navigate
                to="/"
                replace
              />
            }
          />

        </Routes>

      </BrowserRouter>

    </LanguageProvider>
  );
}

export default App;