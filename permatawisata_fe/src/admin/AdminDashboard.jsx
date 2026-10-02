import { useEffect, useState } from "react";
import {
  FaBell,
  FaCalendarAlt,
  FaDollarSign,
  FaHome
} from "react-icons/fa";
import API_BASE_URL from "../config";
import AdminSidebar from "./AdminSidebar";
import "./css/AdminDashboard.css";

function AdminDashboard(){

const [bookings, setBookings] = useState([]);
const [stats, setStats] = useState({
    total_bookings: 0,
    total_revenue: "Rp 0",
    total_villas: 0, // Diubah default dari 32 ke 0 agar sinkron dengan database saat loading awal
    pending_payments: 0
});

useEffect(() => {
  fetch(`${API_BASE_URL}/api/admin/dashboard-data`)
        .then((res) => res.json())
        .then((data) => {
            if (data.status === "success") {
                setBookings(data.bookings);
                setStats(data.stats);
            }
        })
        .catch((err) => console.error("Gagal memuat data dashboard:", err));
}, []);

return(

<div className="admin-layout">

<AdminSidebar />

{/* MAIN CONTENT */}

<div className="main">

{/* TOPBAR */}

<div className="topbar">

<div>
<p className="welcome">Selamat datang kembali,</p>
<h2>Admin</h2>
</div>

<div className="top-right">

<FaBell className="bell"/>

<div className="admin-profile">

<div className="avatar">
A
</div>

<div className="admin-info">
<span className="admin-name">Admin</span>
<span className="admin-status">Aktif</span>
</div>

</div>

</div>

</div>

{/* TITLE */}

<div className="dashboard-title">

<h1>Ringkasan Dashboard</h1>
<p>Pantau performa pemesanan villa dan aktivitas terbaru</p>

</div>

{/* STATS */}

<div className="stats">

<div className="stat-card">

<div className="icon blue">
<FaCalendarAlt/>
</div>

<div className="stat-info">
<p>Total Pemesanan</p>
<h2>{stats.total_bookings}</h2>
</div>

</div>

<div className="stat-card">

<div className="icon green">
<FaDollarSign/>
</div>

<div className="stat-info">
<p>Total Pendapatan</p>
<h2>{stats.total_revenue}</h2>
</div>

</div>

<div className="stat-card">

<div className="icon navy">
<FaHome/>
</div>

<div className="stat-info">
<p>Villa Aktif</p>
<h2>{stats.total_villas}</h2>
</div>

</div>

<div className="stat-card">

<div className="icon gold">
<FaCalendarAlt/>
</div>

<div className="stat-info">
<p>Pembayaran Menunggu</p>
<h2>{stats.pending_payments}</h2>
</div>

</div>

</div>

{/* BOOKING TABLE */}

<div className="booking-table">

<h2>Aktivitas Pemesanan Terbaru</h2>
<p>Pemesanan terbaru dari pelanggan</p>

<table>

<thead>

<tr>
<th>ID Booking</th>
<th>Pelanggan</th>
<th>Villa</th>
<th>Check-in</th>
<th>Check-out</th>
<th>Jumlah</th>
<th>Status</th>
</tr>

</thead>

<tbody>

{bookings.map((b, index) => (

<tr key={index}>

<td>{b.id}</td>
<td>{b.full_name}</td>
<td>{b.villa_name}</td>
<td>{b.check_in}</td>
<td>{b.check_out}</td>

{/* PERBAIKAN FORMAT UANG: Mengubah string angka mentah database menjadi rupiah yang rapi */}
<td>
  {b.total_price 
    ? `Rp ${Number(b.total_price).toLocaleString('id-ID', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}` 
    : "Rp 0"}
</td>

<td>
{/* Mengubah class status menjadi lowercase agar css tetap berjalan lancar jika ada style khusus */}
<span className={`status ${b.status ? b.status.toLowerCase() : ''}`}>
{b.status}
</span>
</td>

</tr>

))}

</tbody>

</table>

</div>

</div>

</div>

)

}

export default AdminDashboard;