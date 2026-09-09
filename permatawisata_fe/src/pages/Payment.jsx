import { useState } from "react";
import { FaLock } from "react-icons/fa";
import { useLocation, useNavigate } from "react-router-dom";
import Navbar from "../components/Navbar";
import Footer from "../components/Footer";
import { useLang } from "../context/LanguageContext";
import API_BASE_URL from "../config";
import "./css/Payment.css";

function Payment() {
    const location = useLocation();
    const navigate = useNavigate();
    const { t } = useLang();

    const { bookingData, villa } = location.state || {};
    const [loading, setLoading] = useState(false);

    if (!bookingData) {
        return (
            <div className="payment-page" style={{ textAlign: "center", padding: "100px 20px" }}>
                <Navbar />
                <h2>Data Pemesanan Tidak Ditemukan</h2>
                <button className="back-btn" onClick={() => navigate("/villas")}>Kembali ke Daftar Villa</button>
            </div>
        );
    }

    const totalPrice = Number(bookingData.total_price) || 0;

    const handlePayNow = async () => {
        setLoading(true);
        try {
            // Memanggil API backend untuk update status ke "Menunggu Verifikasi"
            const response = await fetch(`${API_BASE_URL}/api/bookings/${bookingData.booking_id}/confirm`, {
                method: "PUT",
                headers: { "Content-Type": "application/json" }
            });
            
            if (response.ok) {
                const updatedBooking = { ...bookingData, status: "Menunggu Verifikasi" };
                navigate("/success", { state: { bookingData: updatedBooking, villa } });
            } else {
                alert("Gagal mengkonfirmasi pembayaran. Silakan coba lagi.");
            }
        } catch (error) {
            console.error("Error confirming payment:", error);
            alert("Terjadi kesalahan koneksi ke server.");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="payment-page">
            <Navbar />

            <div className="payment-header">
                <button className="back-link" onClick={() => navigate(-1)}>{t("back_payment")}</button>
                <h1>{t("payment_title")}</h1>
            </div>

            <div className="payment-container">
                <div className="payment-methods">
                    <div className="payment-card payment-info-card">
                        <div className="bank-logo-box" style={{ marginBottom: "20px", textAlign: "center" }}>
                            <h2 style={{ color: "#0B3C5D", margin: "0" }}>Bank BCA</h2>
                        </div>
                        <h3>Selesaikan Pembayaran Anda</h3>
                        <p className="payment-description" style={{ fontSize: "16px", marginBottom: "15px" }}>
                            Silakan lakukan transfer ke rekening berikut atau scan QRIS:
                        </p>
                        <div style={{ backgroundColor: "#f8fafc", padding: "15px", borderRadius: "8px", border: "1px solid #e2e8f0", marginBottom: "20px", textAlign: "center" }}>
                            <p style={{ margin: "5px 0", color: "#64748b", fontSize: "14px" }}>Bank BCA</p>
                            <h2 style={{ margin: "5px 0", color: "#0f172a", letterSpacing: "1px" }}>357-115-2396</h2>
                            <p style={{ margin: "5px 0", color: "#0f172a", fontWeight: "bold" }}>a.n CV Permata Wisata</p>
                            
                            <hr style={{ border: "none", borderTop: "1px dashed #cbd5e1", margin: "15px 0" }} />
                            
                            <p style={{ margin: "5px 0 10px 0", color: "#64748b", fontSize: "14px" }}>Atau Scan QRIS di bawah ini:</p>
                            <img 
                                src="/images/qris.jpeg" 
                                alt="QRIS JOGJA VILLA" 
                                style={{ width: "100%", maxWidth: "450px", height: "auto", border: "1px solid #e2e8f0", padding: "10px", borderRadius: "12px", backgroundColor: "#fff", display: "block", margin: "0 auto" }}
                            />
                            <div style={{ backgroundColor: "#fffbeb", color: "#b45309", padding: "12px", borderRadius: "8px", marginTop: "15px", fontSize: "14px", border: "1px solid #fde68a", textAlign: "left" }}>
                                <strong>⚠️ Perhatian:</strong> Harap <strong>masukkan nominal transfer secara manual</strong> sesuai dengan Total Pembayaran (<strong>Rp {totalPrice.toLocaleString('id-ID')}</strong>).
                            </div>
                        </div>
                        <p className="payment-description" style={{ fontSize: "14px", color: "#64748b" }}>
                            Setelah melakukan transfer, silakan klik tombol di bawah ini untuk konfirmasi pembayaran Anda.
                        </p>
                        <button className="confirm-btn" onClick={handlePayNow} disabled={loading} style={{ backgroundColor: "#2ecc71" }}>
                            <FaLock /> {loading ? "Memproses..." : "Saya Sudah Transfer"}
                        </button>
                    </div>
                </div>

                <div className="order-summary">
                    <h3>{t("order_summary")}</h3>
                    <div className="summary-card">
                        <div className="villa-mini-info">
                            <img src={villa?.img || "https://via.placeholder.com/100"} alt={villa?.name} />
                            <div>
                                <h4>{villa?.name}</h4>
                                <p>{bookingData.room_name}</p>
                            </div>
                        </div>
                        
                        <div className="summary-details">
                            <div className="s-row"><span>{t("checkin_sum")}</span><strong>{bookingData.check_in}</strong></div>
                            <div className="s-row"><span>{t("checkout_sum")}</span><strong>{bookingData.check_out}</strong></div>
                            <div className="s-row"><span>{t("guests_sum")}</span><strong>{bookingData.guests} Orang</strong></div>
                            <div className="s-row"><span>{t("guest_name")}</span><strong>{bookingData.full_name}</strong></div>
                            <div className="s-row" style={{ borderTop: '1px solid #e2e8f0', paddingTop: '10px', marginTop: '10px' }}>
                                <span>Order ID</span>
                                <strong>{bookingData.order_id}</strong>
                            </div>
                        </div>

                        <div className="total-box">
                            <span>{t("total_payment")}</span>
                            <h2>Rp {totalPrice.toLocaleString('id-ID')}</h2>
                        </div>
                    </div>
                </div>
            </div>

            <Footer />
        </div>
    );
}

export default Payment;