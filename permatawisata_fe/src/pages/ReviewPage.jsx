import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import Navbar from "../components/Navbar";
import API_BASE_URL from "../config";
import "./css/ReviewPage.css"; // We will create this

function ReviewPage() {
    const [villas, setVillas] = useState([]);
    const [formData, setFormData] = useState({
        reviewer_name: "",
        villa_id: "",
        room_id: "",
        rating: 5,
        comment: ""
    });
    const [loading, setLoading] = useState(false);
    const [success, setSuccess] = useState(false);

    const [searchVilla, setSearchVilla] = useState("");
    const [searchRoom, setSearchRoom] = useState("");

    const filteredVillas = villas.filter(v => v.name.toLowerCase().includes(searchVilla.toLowerCase()));
    
    const selectedVillaObj = villas.find(v => String(v.id) === String(formData.villa_id));
    const availableRooms = selectedVillaObj?.rooms || [];
    const filteredRooms = availableRooms.filter(r => (r.bed_info || r.room_type || "").toLowerCase().includes(searchRoom.toLowerCase()));

    useEffect(() => {
        fetch(`${API_BASE_URL}/api/villas`)
            .then(res => res.json())
            .then(data => setVillas(data))
            .catch(err => console.error("Error fetching villas:", err));
    }, []);

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        try {
            const res = await fetch(`${API_BASE_URL}/api/reviews`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(formData)
            });
            if (res.ok) {
                setSuccess(true);
            } else {
                alert("Gagal mengirim ulasan.");
            }
        } catch (error) {
            console.error("Error:", error);
            alert("Terjadi kesalahan.");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="review-page">
            <Navbar />
            <div className="review-container">
                {success ? (
                    <div className="review-success">
                        <h2>Terima Kasih! 🎉</h2>
                        <p>Ulasan Anda sangat berarti bagi kami. Kami berharap dapat menyambut Anda kembali di Jogja Villa!</p>
                        <Link to="/" className="btn-home">Kembali ke Beranda</Link>
                    </div>
                ) : (
                    <form className="review-form" onSubmit={handleSubmit}>
                        <h2>Bagikan Pengalaman Anda</h2>
                        <p>Bantu kami menjadi lebih baik dengan memberikan ulasan tentang pengalaman menginap Anda.</p>
                        
                        <div className="form-group">
                            <label>Nama Anda</label>
                            <input 
                                type="text" 
                                required 
                                placeholder="Masukkan nama Anda"
                                value={formData.reviewer_name}
                                onChange={e => setFormData({...formData, reviewer_name: e.target.value})}
                            />
                        </div>

                        <div className="form-group">
                            <label>Villa yang Disewa</label>
                            <input 
                                type="text" 
                                placeholder="🔍 Ketik untuk mencari nama villa..." 
                                value={searchVilla}
                                onChange={e => setSearchVilla(e.target.value)}
                                style={{ marginBottom: "8px" }}
                            />
                            <select 
                                required
                                value={formData.villa_id}
                                onChange={e => {
                                    setFormData({...formData, villa_id: e.target.value, room_id: ""});
                                    setSearchVilla(""); // Reset search after select
                                }}
                                size={searchVilla ? 4 : 1}
                            >
                                <option value="" disabled>Pilih Villa</option>
                                {filteredVillas.map(v => (
                                    <option key={v.id} value={v.id}>{v.name}</option>
                                ))}
                            </select>
                        </div>

                        {formData.villa_id && (
                            <div className="form-group">
                                <label>Kamar/Unit yang Disewa (Opsional)</label>
                                <input 
                                    type="text" 
                                    placeholder="🔍 Ketik untuk mencari nama kamar..." 
                                    value={searchRoom}
                                    onChange={e => setSearchRoom(e.target.value)}
                                    style={{ marginBottom: "8px" }}
                                />
                                <select 
                                    value={formData.room_id}
                                    onChange={e => {
                                        setFormData({...formData, room_id: e.target.value});
                                        setSearchRoom(""); // Reset search after select
                                    }}
                                    size={searchRoom ? 4 : 1}
                                >
                                    <option value="">Tidak ingat / Seluruh Villa</option>
                                    {filteredRooms.map(r => (
                                        <option key={r.id_detail} value={r.id_detail}>{r.bed_info || r.room_type}</option>
                                    ))}
                                </select>
                            </div>
                        )}

                        <div className="form-group">
                            <label>Penilaian (Rating)</label>
                            <div className="star-rating">
                                {[1, 2, 3, 4, 5].map(star => (
                                    <span 
                                        key={star} 
                                        className={star <= formData.rating ? "star active" : "star"}
                                        onClick={() => setFormData({...formData, rating: star})}
                                    >
                                        ★
                                    </span>
                                ))}
                            </div>
                        </div>

                        <div className="form-group">
                            <label>Ulasan Anda</label>
                            <textarea 
                                required 
                                rows="4" 
                                placeholder="Ceritakan pengalaman menginap Anda..."
                                value={formData.comment}
                                onChange={e => setFormData({...formData, comment: e.target.value})}
                            ></textarea>
                        </div>

                        <button type="submit" className="btn-submit" disabled={loading}>
                            {loading ? "Mengirim..." : "Kirim Ulasan"}
                        </button>
                    </form>
                )}
            </div>
        </div>
    );
}

export default ReviewPage;
