import { useCallback, useEffect, useState } from "react";
import { FaCheckCircle, FaDownload, FaHome, FaWhatsapp, FaClock } from "react-icons/fa";
import { useLocation, useNavigate } from "react-router-dom";
import Swal from "sweetalert2";
import Navbar from "../components/Navbar";
import Footer from "../components/Footer";
import { useLang } from "../context/LanguageContext";
import API_BASE_URL from "../config";
import "./css/Success.css";
import html2canvas from 'html2canvas';
import { jsPDF } from 'jspdf';

const escapeHtml = (value) => String(value ?? "").replace(/[&<>"']/g, (character) => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#39;",
}[character]));

function Success() {
    const location = useLocation();
    const navigate = useNavigate();
    const { t } = useLang();
    const routeBooking = location.state?.bookingData || null;
    const routeVilla = location.state?.villa || null;
    const [savedLookup] = useState(() => {
        try {
            return JSON.parse(sessionStorage.getItem("bookingLookup") || "null");
        } catch (error) {
            console.error("Data pencarian pesanan tersimpan tidak valid:", error);
            return null;
        }
    });
    const [bookingData, setBookingData] = useState(
        routeBooking || savedLookup?.bookingData || null
    );
    const [villa, setVilla] = useState(
        routeVilla || (savedLookup?.bookingData?.villa_name
            ? { name: savedLookup.bookingData.villa_name }
            : null)
    );
    const [orderInput, setOrderInput] = useState(
        routeBooking?.order_id || savedLookup?.bookingData?.order_id || ""
    );
    const [email, setEmail] = useState(routeBooking?.email || savedLookup?.email || "");
    const [lookupError, setLookupError] = useState("");
    const [loading, setLoading] = useState(false);
    const [refreshError, setRefreshError] = useState("");

    const bookingId = bookingData?.order_id || "";

    const refreshBooking = useCallback(async (code, customerEmail, quiet = false) => {
        if (!code || !customerEmail) {
            setLookupError("Kode pesanan dan email wajib diisi.");
            return false;
        }

        if (!quiet) {
            setLoading(true);
            setLookupError("");
        }

        try {
            const response = await fetch(`${API_BASE_URL}/api/bookings/lookup`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                cache: "no-store",
                body: JSON.stringify({ order_id: code, email: customerEmail }),
            });
            const result = await response.json();
            if (!response.ok || result.status !== "success" || !result.data) {
                throw new Error(result.error || "Pesanan tidak dapat ditemukan.");
            }

            const currentBooking = result.data;
            setBookingData(currentBooking);
            setVilla((currentVilla) => ({
                ...currentVilla,
                name: currentBooking.villa_name || currentVilla?.name || "",
            }));
            setOrderInput(currentBooking.order_id);
            setEmail(customerEmail);
            setRefreshError("");
            sessionStorage.setItem("bookingLookup", JSON.stringify({
                email: customerEmail,
                bookingData: currentBooking,
            }));

            if (!quiet) {
                Swal.fire({
                    toast: true,
                    position: "top-end",
                    icon: "success",
                    title: "Status pesanan berhasil diperbarui!",
                    showConfirmButton: false,
                    timer: 2500
                });
            }

            return true;
        } catch (error) {
            if (quiet) {
                setRefreshError("Status terbaru belum dapat dimuat. Periksa koneksi, lalu coba perbarui kembali.");
            } else {
                setLookupError(error.message || "Terjadi kesalahan saat mencari pesanan.");
                Swal.fire({
                    icon: "error",
                    title: "Pencarian Gagal",
                    text: error.message || "Pesanan tidak dapat ditemukan.",
                    confirmButtonColor: "#0B3C5D"
                });
            }
            return false;
        } finally {
            if (!quiet) setLoading(false);
        }
    }, []);

    useEffect(() => {
        window.scrollTo(0, 0);
    }, []);

    useEffect(() => {
        if (!bookingData?.order_id || !email) return undefined;

        refreshBooking(bookingData.order_id, email, true);
        if (bookingData.status !== "Menunggu Verifikasi") return undefined;

        const intervalId = window.setInterval(() => {
            refreshBooking(bookingData.order_id, email, true);
        }, 15000);

        return () => window.clearInterval(intervalId);
    }, [bookingData?.order_id, bookingData?.status, email, refreshBooking]);

    const generatePDF = async () => {
        if (!bookingData) return;
        const actionButtons = document.getElementById('pdf-exclude-actions');
        let _prevActionDisplay = null;
        if (actionButtons) {
            _prevActionDisplay = actionButtons.style.display || window.getComputedStyle(actionButtons).display;
            actionButtons.style.display = 'none';
        }

        // Build a clean invoice HTML for PDF to ensure consistent layout
        const invoiceHtml = `
            <div class="invoice-root">
                <div class="invoice-topbar">
                    <div class="brand-wrap">
                        <div class="brand-mark">J</div>
                        <span>Jogja Villa</span>
                    </div>
                    <div class="status-pill">${escapeHtml(bookingData.status || 'Menunggu Pembayaran')}</div>
                </div>

                <div class="invoice-header">
                    <div>
                        <div class="eyebrow">Bukti Reservasi</div>
                        <div class="inv-title">Pemesanan Dikonfirmasi</div>
                    </div>
                    <div class="invoice-no-box">
                        <div class="small-label">${escapeHtml(t("booking_number"))}</div>
                        <div class="booking-id">${bookingId}</div>
                    </div>
                </div>

                <div class="summary-card">
                    <div class="summary-row">
                        <span>Villa</span>
                        <strong>${escapeHtml(villa?.name || bookingData.villa_name || '-')}</strong>
                    </div>
                    <div class="summary-row">
                        <span>Check-in</span>
                        <strong>${escapeHtml(bookingData.check_in || '-')}</strong>
                    </div>
                    <div class="summary-row">
                        <span>Check-out</span>
                        <strong>${escapeHtml(bookingData.check_out || '-')}</strong>
                    </div>
                    <div class="summary-row">
                        <span>${escapeHtml(t("guest_info"))}</span>
                        <strong>${escapeHtml(bookingData.full_name || '-')} (${escapeHtml(bookingData.guests || '-')} ${escapeHtml(t("tamu"))})</strong>
                    </div>
                    <div class="summary-row total-row">
                        <span>${escapeHtml(t("total_payment"))}</span>
                        <strong>Rp ${Number(bookingData.total_price || 0).toLocaleString('id-ID')}</strong>
                    </div>
                </div>

                <div class="invoice-footer">
                    <div class="footer-title">Catatan</div>
                    <div>Harap tunjukkan bukti ini saat proses check-in. Terima kasih.</div>
                </div>
            </div>
        `;

        const wrapper = document.createElement('div');
        wrapper.style.background = '#ffffff';
        wrapper.style.width = '794px';
        wrapper.style.padding = '24px';
        wrapper.style.boxSizing = 'border-box';
        wrapper.style.fontFamily = 'Arial, Helvetica, sans-serif';
        wrapper.style.color = '#0f172a';
        wrapper.style.border = '1px solid #edf2f7';
        wrapper.style.borderRadius = '12px';
        wrapper.innerHTML = invoiceHtml;

        const s = document.createElement('style');
        s.textContent = `
            .invoice-root { width:100%; }
            .invoice-topbar {
                display:flex; justify-content:space-between; align-items:center;
                background:#0B3C5D; color:#fff; border-radius:10px 10px 0 0; padding:16px 18px;
            }
            .brand-wrap { display:flex; align-items:center; gap:10px; font-weight:700; font-size:18px }
            .brand-mark {
                width:22px; height:22px; border-radius:50%; background:#f5b84f; color:#0B3C5D;
                display:flex; align-items:center; justify-content:center; font-weight:700; font-size:12px
            }
            .status-pill {
                background:#f8b14a; color:#0f172a; font-weight:700; font-size:12px;
                border-radius:999px; padding:8px 12px; white-space:nowrap;
            }
            .invoice-header {
                display:flex; justify-content:space-between; align-items:center;
                padding:18px 0 12px; border-bottom:1px solid #e5edf5;
            }
            .eyebrow { font-size:11px; color:#64748b; text-transform:uppercase; letter-spacing:0.08em; margin-bottom:6px; }
            .inv-title { font-size:28px; color:#0B3C5D; font-weight:700; line-height:1.2; }
            .invoice-no-box { background:#f8fafc; border:1px solid #e2e8f0; border-radius:10px; padding:12px 14px; min-width:220px }
            .small-label { font-size:11px; color:#64748b; margin-bottom:4px }
            .booking-id { font-size:28px; font-weight:700; color:#0f172a; }
            .summary-card {
                background:#ffffff; border:1px solid #edf2f7; border-radius:10px; margin-top:18px; padding:8px 0 0;
            }
            .summary-row {
                display:flex; justify-content:space-between; align-items:center; gap:12px; padding:12px 18px;
                border-bottom:1px dashed #e5edf5; font-size:14px;
            }
            .summary-row:last-child { border-bottom:none; }
            .summary-row span { color:#64748b; }
            .summary-row strong { color:#0f172a; font-weight:700; text-align:right }
            .total-row { background:#f8fafc; padding-top:18px; padding-bottom:18px; border-radius:0 0 10px 10px }
            .total-row span { color:#0f172a; font-size:16px; font-weight:700 }
            .total-row strong { color:#0ea5e9; font-size:22px; }
            .invoice-footer {
                margin-top:18px; background:#fff7ed; border-left:4px solid #f59e0b; border-radius:8px; padding:12px 14px;
                color:#7c4a00; font-size:12px; line-height:1.5;
            }
            .footer-title { font-weight:700; color:#b45309; margin-bottom:4px; }
        `;
        wrapper.appendChild(s);

        document.body.appendChild(wrapper);

        try {
            const scale = 3;
            const canvas = await html2canvas(wrapper, { scale, useCORS: true, backgroundColor: '#ffffff' });

            const pxPerMm = 96 / 25.4;
            const pageWidthCss = Math.round(210 * pxPerMm);
            const pageHeightCss = Math.round(297 * pxPerMm);
            const pageWidthCanvas = pageWidthCss * scale;
            const pageHeightCanvas = pageHeightCss * scale;

            const pdf = new jsPDF({ unit: 'px', format: [pageWidthCss, pageHeightCss] });

            const totalHeight = canvas.height;
            let y = 0;
            while (y < totalHeight) {
                const pageCanvas = document.createElement('canvas');
                pageCanvas.width = pageWidthCanvas;
                pageCanvas.height = pageHeightCanvas;
                const ctx = pageCanvas.getContext('2d');
                ctx.fillStyle = '#ffffff';
                ctx.fillRect(0, 0, pageCanvas.width, pageCanvas.height);

                ctx.drawImage(canvas, 0, y, pageWidthCanvas, pageHeightCanvas, 0, 0, pageWidthCanvas, pageHeightCanvas);
                const imgData = pageCanvas.toDataURL('image/jpeg', 1.0);
                if (y > 0) pdf.addPage();
                pdf.addImage(imgData, 'JPEG', 0, 0, pageWidthCss, pageHeightCss);
                y += pageHeightCanvas;
            }

            pdf.save(`Invoice_${bookingId}.pdf`);

            Swal.fire({
                toast: true,
                position: 'top-end',
                icon: 'success',
                title: 'Bukti reservasi (PDF) berhasil diunduh!',
                showConfirmButton: false,
                timer: 3000
            });
        } catch (err) {
            console.error('PDF generation failed', err);
            Swal.fire({
                icon: 'error',
                title: 'Gagal Mengunduh PDF',
                text: 'Silakan coba perbarui halaman dan ulangi kembali.',
                confirmButtonColor: '#0B3C5D'
            });
        } finally {
            if (actionButtons) { try { actionButtons.style.display = _prevActionDisplay || ''; } catch (e) {} }
            try { document.body.removeChild(wrapper); } catch (e) {}
        }
    };

    const handleWhatsAppAdmin = () => {
        const message = `Halo Admin jogjavilla.id, saya ingin konfirmasi pembayaran untuk booking:\n\n` +
            `*ID Booking:* ${bookingId}\n` +
            `*Villa:* ${villa?.name}\n` +
            `*Nama Pemesan:* ${bookingData.full_name}\n` +
            `*Check-in:* ${bookingData.check_in}\n` +
            `*Total:* Rp ${Number(bookingData.total_price).toLocaleString('id-ID')}\n\n` +
            `Berikut saya lampirkan bukti transfer. Terima kasih.`;
            
        const whatsappUrl = `https://wa.me/6282355139595?text=${encodeURIComponent(message)}`;
        window.open(whatsappUrl, '_blank');
    };

    // TAMPILAN FORM PENCARIAN PESANAN (TIDAK ADA DATA BOOKING)
    if (!bookingData) {
        return (
            <div className="success-page">
                <Navbar />
                <main className="success-content-wrapper">
                    <section className="success-container slide-up">
                        <div className="success-card booking-lookup-card">
                            <h1>{t("lookup_title")}</h1>
                            <p>{t("lookup_subtitle")}</p>
                            <form
                                className="booking-lookup-form"
                                onSubmit={(event) => {
                                    event.preventDefault();
                                    refreshBooking(orderInput, email);
                                }}
                            >
                                <label htmlFor="booking-order-id">{t("lookup_order_code")}</label>
                                <input
                                    id="booking-order-id"
                                    type="text"
                                    value={orderInput}
                                    onChange={(event) => setOrderInput(event.target.value)}
                                    placeholder={t("lookup_order_placeholder")}
                                    autoComplete="off"
                                    required
                                />
                                <label htmlFor="booking-email">{t("lookup_email")}</label>
                                <input
                                    id="booking-email"
                                    type="email"
                                    value={email}
                                    onChange={(event) => setEmail(event.target.value)}
                                    placeholder={t("lookup_email_placeholder")}
                                    autoComplete="email"
                                    required
                                />
                                {lookupError && <p className="booking-lookup-error" role="alert">{lookupError}</p>}
                                <button type="submit" disabled={loading}>
                                    {loading ? t("processing") : t("lookup_btn")}
                                </button>
                            </form>
                            <button className="booking-lookup-home" onClick={() => navigate("/")}>
                                {t("lookup_back")}
                            </button>
                        </div>
                    </section>
                </main>
                <Footer />
            </div>
        );
    }

    // TAMPILAN DETAIL HASIL PESANAN
    return (
        <div className="success-page">
            <Navbar />
            
            <div className="success-content-wrapper">
                <div className="success-container slide-up">
                    <div className="success-card" id="invoice-content">
                        
                        {/* HEADER INVOICE */}
                        <div className="success-header" style={{ paddingBottom: '20px', borderBottom: '1px solid #eef2f6', marginBottom: '20px' }}>
                            <FaCheckCircle className="success-icon pulse" style={{ fontSize: '60px', color: '#2ecc71', marginBottom: '15px' }} />
                            <h1 style={{ color: '#0B3C5D', margin: '0 0 10px 0' }}>
                                {bookingData.status === "Lunas"
                                    ? t("booking_confirmed")
                                    : bookingData.status === "Batal"
                                        ? "Pesanan Dibatalkan"
                                        : t("booking_confirmed")}
                            </h1>
                            <p style={{ color: '#64748b', margin: 0 }}>
                                {bookingData.status === "Lunas"
                                    ? t("booking_confirmed_desc")
                                    : bookingData.status === "Batal"
                                        ? "Pesanan ini dibatalkan."
                                        : t("booking_confirmed_desc")}
                            </p>
                        </div>

                        {/* RINGKASAN ORDER & STATUS */}
                        <div className="booking-reference" style={{ display: 'flex', justifyContent: 'space-between', backgroundColor: '#f8fafc', padding: '20px', borderRadius: '12px', marginBottom: '25px', textAlign: 'left' }}>
                            <div className="ref-item">
                                <span style={{ fontSize: '13px', color: '#64748b', display: 'block', marginBottom: '5px' }}>{t("booking_number")}</span>
                                <h3 style={{ margin: 0, color: '#0f172a', fontSize: '20px' }}>{bookingId}</h3>
                            </div>
                            <div className="ref-item" style={{ textAlign: 'right' }}>
                                <span style={{ fontSize: '13px', color: '#64748b', display: 'block', marginBottom: '5px' }}>Status</span>
                                <h3 className="status-badge" style={{ margin: 0, color: bookingData.status === "Lunas" ? '#15803d' : '#d97706', fontSize: '16px', display: 'flex', alignItems: 'center', gap: '5px', justifyContent: 'flex-end' }}>
                                    {bookingData.status === "Lunas" ? <FaCheckCircle /> : <FaClock />} {bookingData.status || t("pending_verification")}
                                </h3>
                            </div>
                        </div>
                        {refreshError && <p className="booking-lookup-error" role="status">{refreshError}</p>}
                        <div className="invoice-refresh-actions" id="pdf-exclude-refresh">
                            <button
                                type="button"
                                onClick={() => refreshBooking(bookingId, email)}
                                disabled={loading}
                            >
                                {loading ? t("processing") : "Perbarui status"}
                            </button>
                        </div>

                        {/* DETAIL VILLA & TAMU */}
                        <div className="booking-details-card" style={{ textAlign: 'left', marginBottom: '30px' }}>
                            <h3 style={{ color: '#0B3C5D', fontSize: '18px', borderBottom: '2px solid #eef2f6', paddingBottom: '10px', marginBottom: '15px' }}>
                                {t("booking_details_title")}
                            </h3>
                            
                            <div className="detail-row" style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '12px' }}>
                                <span style={{ color: '#64748b' }}>Villa</span>
                                <strong style={{ color: '#0f172a' }}>{villa?.name || bookingData.villa_name || "-"}</strong>
                            </div>
                            <div className="detail-row" style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '12px' }}>
                                <span style={{ color: '#64748b' }}>{t("checkin_label")}</span>
                                <strong style={{ color: '#0f172a' }}>{bookingData.check_in}</strong>
                            </div>
                            <div className="detail-row" style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '12px' }}>
                                <span style={{ color: '#64748b' }}>{t("checkout_label")}</span>
                                <strong style={{ color: '#0f172a' }}>{bookingData.check_out}</strong>
                            </div>
                            <div className="detail-row" style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '12px' }}>
                                <span style={{ color: '#64748b' }}>{t("guest_info")}</span>
                                <strong style={{ color: '#0f172a' }}>{bookingData.full_name} ({bookingData.guests} {t("tamu")})</strong>
                            </div>
                            
                            <div className="detail-row total-row" style={{ display: 'flex', justifyContent: 'space-between', marginTop: '20px', paddingTop: '15px', borderTop: '2px dashed #eef2f6' }}>
                                <span style={{ color: '#0f172a', fontWeight: '600', fontSize: '18px' }}>{t("total_payment")}</span>
                                <strong style={{ color: '#0ea5e9', fontSize: '22px' }}>Rp {Number(bookingData.total_price).toLocaleString('id-ID')}</strong>
                            </div>
                        </div>

                        {/* TOMBOL AKSI & PETUNJUK */}
                        <div id="pdf-exclude-actions">
                            <div className="next-steps" style={{ textAlign: 'left', backgroundColor: '#fffbeb', padding: '20px', borderRadius: '12px', marginBottom: '25px', borderLeft: '4px solid #f59e0b' }}>
                                <h3 style={{ margin: '0 0 10px 0', color: '#b45309', fontSize: '16px' }}>{t("whats_next")}</h3>
                                <ul style={{ margin: 0, paddingLeft: '20px', color: '#92400e', fontSize: '14px', lineHeight: '1.6' }}>
                                    <li>{t("next_1")}</li>
                                    <li>{t("next_2")}</li>
                                    <li>{t("next_3")}</li>
                                    <li>{t("next_4")}</li>
                                </ul>
                            </div>

                            <div className="action-buttons" style={{ display: 'flex', gap: '15px', justifyContent: 'center', flexWrap: 'wrap' }}>
                                <button onClick={handleWhatsAppAdmin} style={{ padding: '12px 24px', backgroundColor: '#25D366', color: 'white', border: 'none', borderRadius: '8px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px', fontWeight: '600', fontSize: '14px' }}>
                                    <FaWhatsapp size={18} /> {t("btn_whatsapp")}
                                </button>
                                <button onClick={generatePDF} style={{ padding: '12px 24px', backgroundColor: '#0B3C5D', color: 'white', border: 'none', borderRadius: '8px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px', fontWeight: '600', fontSize: '14px' }}>
                                    <FaDownload size={16} /> {t("download_pdf")}
                                </button>
                                <button onClick={() => {
                                    setBookingData(null);
                                    setVilla(null);
                                    setLookupError("");
                                    sessionStorage.removeItem("bookingLookup");
                                }} style={{ padding: '12px 24px', backgroundColor: '#f1f5f9', color: '#0f172a', border: '1px solid #cbd5e1', borderRadius: '8px', cursor: 'pointer', fontWeight: '600', fontSize: '14px' }}>
                                    {t("lookup_btn")}
                                </button>
                                <button onClick={() => navigate("/")} style={{ padding: '12px 24px', backgroundColor: '#f1f5f9', color: '#0f172a', border: '1px solid #cbd5e1', borderRadius: '8px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px', fontWeight: '600', fontSize: '14px' }}>
                                    <FaHome size={16} /> {t("back_home")}
                                </button>
                            </div>
                        </div>

                    </div>
                </div>
            </div>
            
            <Footer />
        </div>
    );
}

export default Success;