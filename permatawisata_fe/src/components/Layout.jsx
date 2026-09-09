import { FaMountain } from "react-icons/fa";
import { Link, Outlet } from "react-router-dom"; // 🔥 TAMBAH Outlet
import Footer from "./MainFooter";

function Layout() {
  return (
    <>
      {/* NAVBAR */}
      <nav className="navbar">
        <div className="logo">
          <img
            src="/images/logo-jogjavilla.png"
            alt="Jogja Villa"
            style={{ height: "44px", objectFit: "contain" }}
          />
        </div>

        <div className="nav-menu">
          <Link to="/">Home</Link>
          <Link to="/villas">Villas</Link>

          <a
            href="https://wa.me/6282355139595?text=Halo%20admin%20jogjavilla.id,%20saya%20ingin%20bertanya%20tentang%20villa"
            target="_blank"
            rel="noopener noreferrer"
            className="contact-btn"
          >
            Contact Us
          </a>
        </div>
      </nav>

      {/* 🔥 INI PENGGANTI CHILDREN */}
      <Outlet />

      {/* FOOTER */}
      <Footer />
    </>
  );
}

export default Layout;