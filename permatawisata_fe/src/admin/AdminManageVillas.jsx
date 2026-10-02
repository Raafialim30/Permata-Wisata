import { useEffect, useRef, useState } from "react";
import {
    FaEdit,
    FaFileCsv,
    FaPlus,
    FaTrash,
    FaTimes,
    FaSave,
    FaImages,
    FaUpload,
    FaMapMarkerAlt
} from "react-icons/fa";

import API_BASE_URL from "../config";
import AdminSidebar from "./AdminSidebar";
import "./css/AdminManageVillas.css";

function AdminManageVillas() {
    // ==========================================================
    // 1. STATE MANAGEMENT UTAMA
    // ==========================================================
    const [villas, setVillas] = useState([]);
    const [showModal, setShowModal] = useState(false);
    const [editIndex, setEditIndex] = useState(null);

    const [relatedRooms, setRelatedRooms] = useState([]);
    const [activeTab, setActiveTab] = useState("villa-info");

    // Input file dipisahkan agar setiap tombol selalu mengarah ke input yang benar.
    const villaCsvInputRef = useRef(null);
    const singleImageUploadRef = useRef(null);
    const mainImageUploadRef = useRef(null);

    // State dinamis galeri gambar admin
    const [uploadedImagesInFE, setUploadedImagesInFE] = useState([]);

    const [form, setForm] = useState({
        id: "", name: "", location: "", mitra_name: "-", whatsapp: "-",
        price: "", rating: "5", guests: "4", beds: "2", baths: "1",
        bed_type: "1 King Size", check_in_time: "14:00", check_out_time: "12:00", status: "available", img: "utama.png",
        room_count: "1", bathroom_type: "-", hours: "-", description: "", amenities: "", equipment: "", facilities: "", promo: "0"
    });

    const [selectedRoomIndex, setSelectedRoomIndex] = useState("");
    const [roomForm, setRoomForm] = useState({
        id: "",
        bed_info: "",
        room_type: "Standard Room",
        price: "",
        facilities: "",
        snk: "",
        description: "",
        img: "room_1_1.png",
        max_guests: "",
        max_age_rule: "",
        other_facilities: "",
        room_count: "",
        bathroom_count: "",
        bathroom_type: "",
        amenities: "",
        equipment: "",
        hours: ""
    });

    // State untuk Layanan Tambahan (Addon)
    const [addonList, setAddonList] = useState([]);
    const [addonEditIndex, setAddonEditIndex] = useState(null);
    const [addonForm, setAddonForm] = useState({ addon_type: "Motor", name: "", price: "", description: "" });

    // ==========================================================
    // 2. FETCH DATA DARI FLASK BACKEND
    // ==========================================================
    const fetchVillas = () => {
        fetch(`${API_BASE_URL}/api/admin/villas`)
            .then((res) => {
                if (!res.ok) throw new Error("Gagal mengambil data");
                return res.json();
            })
            .then((resData) => {
                const dataArr = resData.data || resData;
                if (Array.isArray(dataArr)) {
                    setVillas(dataArr);
                }
            })
            .catch((err) => console.error("Error fetch data villa:", err));
    };

    const fetchRelatedRooms = async (villaId) => {
        if (!villaId) return;
        try {
            const res = await fetch(`${API_BASE_URL}/api/admin/villa-details?villa_id=${villaId}`);
            if (res.ok) {
                const dataRes = await res.json();
                const roomList = dataRes.data || dataRes;
                setRelatedRooms(Array.isArray(roomList) ? roomList : []);
            } else {
                setRelatedRooms([]);
            }
        } catch (error) {
            console.error("Gagal memuat data kamar terkait:", error);
            setRelatedRooms([]);
        }
    };

    useEffect(() => {
        if (showModal && form.id && activeTab === "rooms-info") {
            fetchRelatedRooms(form.id);
        }
    }, [activeTab, showModal, form.id]);

    useEffect(() => {
        fetchVillas();
    }, []);

    // ==========================================================
    // 3. HANDLER INPUT & SINKRONISASI GAMBAR otomatis
    // ==========================================================
    const openAddModal = async () => {
        setEditIndex(null);
        setRelatedRooms([]);
        setActiveTab("villa-info");
        
        let tempId = Math.floor(1000 + Math.random() * 9000).toString();
        try {
            const res = await fetch(`${API_BASE_URL}/api/admin/villas/next_id`);
            if (res.ok) {
                const data = await res.json();
                if (data.next_id) {
                    tempId = data.next_id.toString();
                }
            }
        } catch (e) {
            console.error("Gagal mendapatkan next_id", e);
        }

        setForm({
            id: tempId, name: "", location: "", mitra_name: "-", whatsapp: "-",
            price: "", rating: "5", guests: "4", beds: "2", baths: "1",
            bed_type: "1 King Size", check_in_time: "14:00", check_out_time: "12:00", status: "available", img: "utama.png",
            room_count: "1", bathroom_type: "-", hours: "-", description: "", amenities: "", equipment: "", facilities: "", promo: "0"
        });
        resetRoomForm();
        setShowModal(true);
    };

    const openEditModal = (index) => {
        setEditIndex(index);
        setActiveTab("villa-info");
        const selectedVilla = villas[index];
        const targetId = selectedVilla.id || selectedVilla._id || "";

        // Mengatur default nama gambar agar sesuai nama villa (permintaan user)
        let defaultImg = selectedVilla.img;
        if (!defaultImg || defaultImg === "default_mitra.jpg" || defaultImg === "utama.png") {
            const safeName = (selectedVilla.name || "Villa").replace(/[^a-zA-Z0-9\-_ ]/g, '');
            defaultImg = `${safeName}.jpg`;
        }

        setForm({
            id: targetId,
            name: selectedVilla.name || "",
            location: selectedVilla.location || "",
            mitra_name: selectedVilla.mitra_name || "-",
            whatsapp: selectedVilla.whatsapp || "-",
            price: selectedVilla.price || "",
            rating: selectedVilla.rating || "5",
            guests: (selectedVilla.guests && selectedVilla.guests !== '-') ? selectedVilla.guests : "",
            beds: (selectedVilla.beds && selectedVilla.beds !== '-') ? selectedVilla.beds : "",
            baths: (selectedVilla.baths && selectedVilla.baths !== '-') ? selectedVilla.baths : "",
            bed_type: (selectedVilla.bed_type && selectedVilla.bed_type !== '-') ? selectedVilla.bed_type : "",
            check_in_time: selectedVilla.check_in_time || "14:00",
            check_out_time: selectedVilla.check_out_time || "12:00",
            status: selectedVilla.status || "available",
            img: defaultImg,
            room_count: (selectedVilla.room_count && selectedVilla.room_count !== '-') ? selectedVilla.room_count : "",
            bathroom_type: (selectedVilla.bathroom_type && selectedVilla.bathroom_type !== '-') ? selectedVilla.bathroom_type : "",
            hours: (selectedVilla.hours && selectedVilla.hours !== '-') ? selectedVilla.hours : "",
            description: selectedVilla.description || "",
            amenities: selectedVilla.amenities || "",
            equipment: selectedVilla.equipment || "",
            facilities: selectedVilla.facilities || "",
            promo: selectedVilla.promo || "0"
        });

        resetRoomForm();
        fetchRelatedRooms(targetId);
        setShowModal(true);
    };

    const handleChange = (e) => {
        setForm({ ...form, [e.target.name]: e.target.value });
    };

    const handleRoomChange = (e) => {
        const { name, value } = e.target;
        setRoomForm(prev => ({ ...prev, [name]: value }));
    };

    const resetRoomForm = () => {
        setSelectedRoomIndex("");
        setAddonList([]);
        setAddonEditIndex(null);
        setAddonForm({ addon_type: "Motor", name: "", price: "", description: "" });
        setRoomForm({
            id: "",
            bed_info: "",
            room_type: "Standard Room",
            price: "",
            facilities: "",
            snk: "",
            description: "",
            img: "room_1_1.png",
            max_guests: "",
            max_age_rule: "",
            other_facilities: "",
            room_count: "",
            bathroom_count: "",
            bathroom_type: "",
            amenities: "",
            equipment: "",
            hours: "",
            location: ""
        });
    };

    const fetchAddons = async (roomId) => {
        if (!roomId) return;
        try {
            // Ambil addons dari endpoint villa detail yang sudah menyertakan addons per room
            const res = await fetch(`${API_BASE_URL}/api/villas/${form.id}`);
            if (res.ok) {
                const data = await res.json();
                const rooms = data.rooms || [];
                const room = rooms.find(r => String(r.id_detail) === String(roomId));
                setAddonList(room ? (room.addons || []) : []);
            }
        } catch (e) {
            console.error("Gagal load addon:", e);
            setAddonList([]);
        }
    };

    const saveAddon = async () => {
        const currentRoomId = roomForm.id;
        if (!currentRoomId) { alert("Simpan data kamar terlebih dahulu sebelum menambahkan layanan tambahan."); return; }
        if (!addonForm.name.trim()) { alert("Nama layanan tidak boleh kosong."); return; }
        try {
            let url = `${API_BASE_URL}/api/admin/room-addons`;
            let method = "POST";
            const body = { ...addonForm, room_id: currentRoomId, price: parseInt(addonForm.price) || 0 };
            if (addonEditIndex !== null) {
                const editId = addonList[addonEditIndex].id;
                url = `${API_BASE_URL}/api/admin/room-addons/${editId}`;
                method = "PUT";
            }
            const res = await fetch(url, { method, headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
            if (!res.ok) throw new Error("Gagal menyimpan addon");
            alert(addonEditIndex !== null ? "Layanan diperbarui!" : "Layanan berhasil ditambahkan!");
            setAddonForm({ addon_type: "Motor", name: "", price: "", description: "" });
            setAddonEditIndex(null);
            fetchAddons(currentRoomId);
        } catch (e) {
            alert("Error: " + e.message);
        }
    };

    const deleteAddon = async (addonId) => {
        if (!window.confirm("Hapus layanan tambahan ini?")) return;
        try {
            const res = await fetch(`${API_BASE_URL}/api/admin/room-addons/${addonId}`, { method: "DELETE" });
            if (!res.ok) throw new Error();
            fetchAddons(roomForm.id);
        } catch (e) {
            alert("Gagal menghapus layanan.");
        }
    };

    const loadRoomToForm = async (index) => {
        if (index === "") {
            resetRoomForm();
            return;
        }
        const target = relatedRooms[index];
        setSelectedRoomIndex(index);

        const roomId = target.id || target.id_detail || target._id;
        const isGenericFallback = !target.img || target.img === "room_1_1.png" || target.img === "default_room.jpg";
        
        let dbImage = target.img || target.image || target.room_name;
        if (isGenericFallback || (dbImage && !dbImage.endsWith(".png") && !dbImage.endsWith(".jpg"))) {
            const rawRoomName = target.bed_info || target.room_name || "Kamar";
            const safeRoomName = rawRoomName.replace(/[^a-zA-Z0-9\-_ ]/g, '');
            dbImage = `${safeRoomName}.jpg`;
        }

        setRoomForm({
            id: roomId || "",
            bed_info: target.bed_info || "",
            room_type: target.room_type || "Standard Room",
            price: target.price || target.price_raw || "",
            facilities: target.facilities || "",
            snk: target.snk || "-",
            description: target.description || "",
            img: dbImage,
            max_guests: target.max_guests || "",
            max_age_rule: target.max_age_rule || "",
            other_facilities: target.other_facilities || "",
            room_count: target.room_count || "",
            bathroom_count: target.bathroom_count || "",
            bathroom_type: target.bathroom_type || "",
            amenities: target.amenities || "",
            equipment: target.equipment || "",
            hours: target.hours || "",
            location: target.location || ""
        });

        // Ambil daftar gambar FISIK asli dari server untuk menjamin semua foto (termasuk .jpg) tampil
        try {
            const res = await fetch(`${API_BASE_URL}/api/admin/gallery?villa_id=${form.id || '1'}&folder_type=room&room_id=${roomId}`);
            if (res.ok) {
                const data = await res.json();
                let realImages = data.data || [];
                
                // Jika API mengembalikan gambar nyata, gunakan gambar pertama sebagai gambar aktif
                // agar tidak terjebak pada nama file lama dari DB yang sudah tidak ada
                if (realImages.length > 0) {
                    // Cek apakah dbImage benar-benar ada di folder (case-insensitive check)
                    const dbImageExists = realImages.some(f => f.toLowerCase() === dbImage?.toLowerCase());
                    if (!dbImageExists) {
                        // Nama di DB sudah stale/tidak cocok → pakai gambar pertama dari folder
                        dbImage = realImages[0];
                        setRoomForm(prev => ({ ...prev, img: dbImage }));
                    }
                } else if (dbImage) {
                    // Belum ada file di subfolder, tambahkan nama dari DB sebagai hint
                    realImages = [dbImage];
                }
                setUploadedImagesInFE(realImages);
            } else {
                throw new Error("Gagal load galeri fisik");
            }
        } catch (e) {
            console.error(e);
            setUploadedImagesInFE(dbImage ? [dbImage] : []);
        }

        // Ambil daftar layanan tambahan untuk kamar ini
        fetchAddons(roomId);
    };

    // ==========================================================
    // 4. CRUD ACTIONS (SAVE VILLA, SAVE ROOM, DELETE)
    // ==========================================================
    const saveVilla = async () => {
        if (!form.name || !form.location) {
            alert("Mohon isi data wajib");
            return;
        }
        try {
            let response = editIndex !== null
                ? await fetch(`${API_BASE_URL}/api/admin/villas/${form.id}`, { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify(form) })
                : await fetch(`${API_BASE_URL}/api/admin/villas`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(form) });

            if (response.ok) {
                alert("Data induk Villa berhasil disimpan!");
                setShowModal(false);
                fetchVillas();
            }
        } catch (error) {
            console.error("Error saving data:", error);
        }
    };

    const buildRoomPayload = (imageName = null) => {
        const safeFallbackName = (roomForm.bed_info || "Kamar")
            .replace(/[^a-zA-Z0-9\-_ ]/g, '')
            .trim();

        const chosenImage =
            imageName ||
            roomForm.img ||
            `${safeFallbackName || "Kamar"}.jpg`;

        return {
            villa_id: parseInt(form.id),
            bed_info: roomForm.bed_info,
            room_name: roomForm.bed_info,
            room_type: roomForm.room_type || "Standard Room",
            price: roomForm.price ? parseInt(roomForm.price) : 0,
            facilities: roomForm.facilities || "",
            img: chosenImage,
            image: chosenImage,
            description: roomForm.description || "",
            max_guests: roomForm.max_guests || "",
            max_age_rule: roomForm.max_age_rule || "",
            other_facilities: roomForm.other_facilities || "",
            snk: roomForm.snk || "",
            room_count: roomForm.room_count || "",
            bathroom_count: roomForm.bathroom_count || "",
            bathroom_type: roomForm.bathroom_type || "",
            amenities: roomForm.amenities || "",
            equipment: roomForm.equipment || "",
            hours: roomForm.hours || "",
            location: roomForm.location || ""
        };
    };

    /*
     * Jika user memilih foto sebelum kamar baru disimpan,
     * sistem otomatis membuat record kamar terlebih dahulu.
     * Setelah room_id didapat, backend membuat folder:
     *
     * villa_<villa_id>/rooms/room_<room_id>/
     */
    const createRoomBeforeUpload = async () => {
        if (!form.id) {
            throw new Error("ID villa belum tersedia.");
        }

        if (!roomForm.bed_info || !roomForm.bed_info.trim()) {
            throw new Error(
                "Isi Nama Kamar terlebih dahulu sebelum menambahkan foto."
            );
        }

        const payloadData = buildRoomPayload();

        const response = await fetch(
            `${API_BASE_URL}/api/admin/villa-details`,
            {
                method: "POST",
                headers: {
                    "Content-Type": "application/json"
                },
                body: JSON.stringify(payloadData)
            }
        );

        let result = {};
        try {
            result = await response.json();
        } catch (_) {
            result = {};
        }

        if (!response.ok || !result.room_id) {
            throw new Error(
                result.error ||
                "Gagal membuat data kamar sebelum upload foto."
            );
        }

        const newRoomId = String(result.room_id);

        // Refresh daftar kamar supaya dropdown langsung mengetahui kamar baru.
        const roomsResponse = await fetch(
            `${API_BASE_URL}/api/admin/villa-details?villa_id=${form.id}`
        );

        let rooms = [];
        if (roomsResponse.ok) {
            const roomsData = await roomsResponse.json();
            rooms = roomsData.data || roomsData || [];
            if (!Array.isArray(rooms)) {
                rooms = [];
            }
        }

        setRelatedRooms(rooms);

        const newIndex = rooms.findIndex(
            (room) =>
                String(room.id || room.id_detail || room._id) === newRoomId
        );

        if (newIndex >= 0) {
            setSelectedRoomIndex(String(newIndex));
        }

        setRoomForm((prev) => ({
            ...prev,
            id: newRoomId
        }));

        return newRoomId;
    };

    const saveRoomData = async () => {
        if (!roomForm.bed_info || !roomForm.bed_info.trim()) {
            alert("Nama unit (Bed Info) wajib diisi!");
            return;
        }

        const payloadData = buildRoomPayload();

        try {
            let response;

            if (selectedRoomIndex === "" || !roomForm.id) {
                response = await fetch(
                    `${API_BASE_URL}/api/admin/villa-details`,
                    {
                        method: "POST",
                        headers: {
                            "Content-Type": "application/json"
                        },
                        body: JSON.stringify(payloadData)
                    }
                );
            } else {
                response = await fetch(
                    `${API_BASE_URL}/api/admin/villa-details/${roomForm.id}`,
                    {
                        method: "PUT",
                        headers: {
                            "Content-Type": "application/json"
                        },
                        body: JSON.stringify({
                            ...payloadData,
                            id: roomForm.id,
                            id_detail: roomForm.id
                        })
                    }
                );
            }

            if (response.ok) {
                alert(
                    "Data unit dan relasi foto berhasil disimpan ke database! 🚀"
                );
                resetRoomForm();
                fetchRelatedRooms(form.id);
            } else {
                let errData = {};
                try {
                    errData = await response.json();
                } catch (_) {
                    errData = {};
                }

                alert(
                    `Gagal: ${
                        errData.error ||
                        errData.message ||
                        "Periksa koneksi Flask"
                    }`
                );
            }
        } catch (error) {
            console.error("Error saving room:", error);
            alert(`Gagal menyimpan kamar: ${error.message}`);
        }
    };

    const deleteRoomData = async (roomId) => {
        if (!window.confirm("Apakah Anda yakin ingin menghapus unit ini?")) return;
        try {
            const response = await fetch(`${API_BASE_URL}/api/admin/villa-details/${roomId}`, { method: "DELETE" });
            if (response.ok) {
                alert("Unit berhasil dihapus!");
                fetchRelatedRooms(form.id);
                resetRoomForm();
            }
        } catch (error) {
            console.error("Gagal menghapus kamar:", error);
        }
    };

    const deleteVilla = async (index) => {
        const selectedVilla = villas[index];
        if (window.confirm(`Apakah Anda yakin ingin menghapus ${selectedVilla.name}?`)) {
            try {
                const response = await fetch(`${API_BASE_URL}/api/admin/villas/${selectedVilla.id}`, { method: "DELETE" });
                if (response.ok) {
                    alert("Villa berhasil dihapus!");
                    fetchVillas();
                }
            } catch (error) {
                console.error("Error deleting data:", error);
            }
        }
    };

    // ==========================================================
    // 5. MANAJEMEN GALERI FOTO (TAMBAH & HAPUS ELEMENT)
    // ==========================================================
    const [isUploading, setIsUploading] = useState(false);

    const uploadImageFile = async (
        file,
        villaId,
        folderType,
        targetFilename,
        roomId = null
    ) => {
        setIsUploading(true);

        try {
            const formData = new FormData();
            formData.append("file", file);
            formData.append("villa_id", villaId);
            formData.append("folder_type", folderType);
            formData.append("filename", targetFilename);

            if (folderType === "room") {
                if (!roomId) {
                    throw new Error(
                        "Room ID belum tersedia. Sistem akan membuat kamar terlebih dahulu."
                    );
                }

                formData.append("room_id", roomId);
            }

            const response = await fetch(
                `${API_BASE_URL}/api/admin/upload`,
                {
                    method: "POST",
                    body: formData
                }
            );

            if (!response.ok) {
                let err = {};

                try {
                    err = await response.json();
                } catch (_) {
                    err = {};
                }

                throw new Error(
                    err.error ||
                    err.message ||
                    "Gagal upload gambar"
                );
            }

            return true;
        } catch (error) {
            console.error("Upload error:", error);
            alert(`Error Upload: ${error.message}`);
            return false;
        } finally {
            setIsUploading(false);
        }
    };

    const selectImageFromGallery = (fileName) => {
        setRoomForm(prev => ({ ...prev, img: fileName }));
    };

    const handleSingleImageUpload = async (e) => {
        if (e.target.files && e.target.files[0]) {
            const file = e.target.files[0];

            // VALIDASI FILE
            const allowedExts = [
                'image/png',
                'image/jpeg',
                'image/webp',
                'image/gif'
            ];

            if (!allowedExts.includes(file.type)) {
                alert(
                    "❌ Tipe file tidak didukung. Gunakan PNG, JPG, WEBP, atau GIF"
                );
                e.target.value = '';
                return;
            }

            if (file.size > 5 * 1024 * 1024) {
                alert("❌ Ukuran file terlalu besar (max 5MB)");
                e.target.value = '';
                return;
            }

            try {
                /*
                 * SOLUSI:
                 * Kalau kamar baru belum punya room_id, sistem otomatis
                 * menyimpan kamar terlebih dahulu. Setelah itu backend
                 * membuat folder room_<room_id> secara otomatis.
                 */
                let roomId = roomForm.id;

                if (!roomId) {
                    roomId = await createRoomBeforeUpload();
                }

                const ext = file.name
                    .substring(file.name.lastIndexOf('.'))
                    .toLowerCase();

                const nextNum = uploadedImagesInFE.length + 1;
                const safeFileName = `image_${nextNum}${ext}`;

                const success = await uploadImageFile(
                    file,
                    form.id,
                    "room",
                    safeFileName,
                    roomId
                );

                if (success) {
                    setUploadedImagesInFE((prev) =>
                        prev.includes(safeFileName)
                            ? prev
                            : [...prev, safeFileName]
                    );

                    // Foto pertama otomatis menjadi foto utama kamar.
                    setRoomForm((prev) => ({
                        ...prev,
                        id: String(roomId),
                        ...(uploadedImagesInFE.length === 0
                            ? { img: safeFileName }
                            : {})
                    }));

                    alert(
                        `✅ Gambar "${safeFileName}" berhasil diunggah ke folder kamar ${roomId}!`
                    );
                }
            } catch (error) {
                console.error("Upload error:", error);
                alert(`❌ Gagal upload: ${error.message}`);
            }
        }

        // Reset input agar file dengan nama sama tetap bisa dipilih lagi.
        e.target.value = '';
    };

    const removeImageFromGallery = (e, imgName) => {
        e.stopPropagation();
        if (window.confirm(`Hapus gambar "${imgName}" dari server? ⚠️ Ini akan menghapus file secara permanen!`)) {
            deleteImageFromServer(imgName);
        }
    };

    const deleteImageFromServer = async (imgName) => {
        try {
            const roomId = roomForm.id || "";
            const response = await fetch(
                `${API_BASE_URL}/api/admin/gallery?villa_id=${form.id || '1'}&folder_type=room&room_id=${roomId}&filename=${encodeURIComponent(imgName)}`,
                { method: "DELETE" }
            );

            if (!response.ok) {
                const err = await response.json();
                throw new Error(err.error || "Gagal hapus gambar");
            }

            await response.json();
            setUploadedImagesInFE(uploadedImagesInFE.filter(item => item !== imgName));
            
            // Jika gambar yang dihapus adalah gambar aktif, pilih gambar lain
            if (roomForm.img === imgName) {
                const remaining = uploadedImagesInFE.filter(item => item !== imgName);
                if (remaining.length > 0) {
                    setRoomForm(prev => ({ ...prev, img: remaining[0] }));
                } else {
                    setRoomForm(prev => ({ ...prev, img: "room_1_1.png" }));
                }
            }

            alert(`✅ Gambar "${imgName}" berhasil dihapus dari server!`);
        } catch (error) {
            console.error("Delete error:", error);
            alert(`❌ Error hapus gambar: ${error.message}`);
        }
    };

    // ==========================================================
    // 6. IMPORT CSV GABUNGAN VILLA + ROOM
    // ==========================================================

    // Membaca CSV secara aman, termasuk nilai yang mengandung koma / titik koma
    // di dalam tanda kutip. CSV dari Excel umumnya menggunakan ; di project ini,
    // tetapi parser juga mendukung koma.
    const parseCSV = (text) => {
        const cleanText = String(text || '').replace(/^\uFEFF/, '');
        const firstLine = cleanText.split(/\r?\n/, 1)[0] || '';

        const detectDelimiter = (line) => {
            let comma = 0;
            let semicolon = 0;
            let quoted = false;

            for (let i = 0; i < line.length; i++) {
                const char = line[i];
                if (char === '"') {
                    if (quoted && line[i + 1] === '"') {
                        i++;
                    } else {
                        quoted = !quoted;
                    }
                } else if (!quoted && char === ',') {
                    comma++;
                } else if (!quoted && char === ';') {
                    semicolon++;
                }
            }

            return semicolon >= comma ? ';' : ',';
        };

        const delimiter = detectDelimiter(firstLine);
        const rows = [];
        let row = [];
        let cell = '';
        let quoted = false;

        for (let i = 0; i < cleanText.length; i++) {
            const char = cleanText[i];

            if (char === '"') {
                if (quoted && cleanText[i + 1] === '"') {
                    cell += '"';
                    i++;
                } else {
                    quoted = !quoted;
                }
                continue;
            }

            if (!quoted && char === delimiter) {
                row.push(cell);
                cell = '';
                continue;
            }

            if (!quoted && (char === '\n' || char === '\r')) {
                if (char === '\r' && cleanText[i + 1] === '\n') i++;
                row.push(cell);
                cell = '';
                if (row.some(value => String(value).trim() !== '')) rows.push(row);
                row = [];
                continue;
            }

            cell += char;
        }

        // Baris terakhir
        row.push(cell);
        if (row.some(value => String(value).trim() !== '')) rows.push(row);

        if (rows.length === 0) return [];

        const normalizeHeader = (value) => String(value || '')
            .trim()
            .toLowerCase()
            .replace(/[\u00a0]/g, ' ')
            .replace(/[^a-z0-9]+/g, '_')
            .replace(/^_+|_+$/g, '');

        const headers = rows[0].map(normalizeHeader);

        return rows.slice(1).map((values, index) => {
            const obj = { __rowNumber: index + 2 };
            headers.forEach((header, columnIndex) => {
                if (!header) return;
                obj[header] = String(values[columnIndex] ?? '').trim();
            });
            return obj;
        });
    };

    const getCSVValue = (row, aliases, fallback = '') => {
        for (const alias of aliases) {
            const key = alias.toLowerCase();
            if (Object.prototype.hasOwnProperty.call(row, key)) {
                const value = String(row[key] ?? '').trim();
                if (value !== '') return value;
            }
        }
        return fallback;
    };

    const cleanCSVPrice = (value) => {
        if (value === null || value === undefined || value === '') return 0;
        let raw = String(value).trim();
        if (raw.includes('-')) raw = raw.split('-')[0].trim();
        const cleaned = raw.replace(/[^0-9]/g, '');
        const number = parseInt(cleaned, 10);
        return Number.isFinite(number) ? number : 0;
    };

    const normalizeCSVId = (value) => {
        const raw = String(value ?? '').trim();
        if (!raw) return '';
        const number = Number(raw);
        return Number.isInteger(number) && number >= 0 ? String(number) : raw;
    };

    const postJSON = async (url, method, body) => {
        const response = await fetch(url, {
            method,
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(body)
        });

        let data = {};
        try {
            data = await response.json();
        } catch (_) {
            data = {};
        }

        if (!response.ok) {
            throw new Error(data.error || data.message || `HTTP ${response.status}`);
        }

        return data;
    };

    const triggerFileSelect = () => {
        if (villaCsvInputRef.current) villaCsvInputRef.current.click();
    };

    const importCombinedCSV = async (e) => {
        const file = e.target.files?.[0];
        if (!file) return;

        try {
            if (!/\.csv$/i.test(file.name)) {
                alert("File harus berformat CSV.");
                return;
            }

            const text = await file.text();
            const rows = parseCSV(text);

            if (rows.length === 0) {
                alert("CSV kosong atau header tidak ditemukan.");
                return;
            }

            /*
             * Nama header yang didukung.
             * Admin tidak wajib mengisi semuanya. Header yang tidak ada akan
             * menggunakan nilai kosong/default dan tidak membuat import gagal.
             */
            const aliases = {
                villaId: ["id_villa", "villa_id", "id_mitra", "mitra_id", "id"],
                villaName: ["nama_villa", "villa_name", "nama_mitra_penginapan", "nama_mitra", "name", "nama_properti", "properti"],
                location: ["lokasi", "alamat", "alamat_lokasi", "villa_location", "location"],
                whatsapp: ["whatsapp", "no_whatsapp", "nomor_whatsapp", "link_whatsapp", "link_wa", "wa"],
                villaPrice: ["harga_villa", "harga", "price", "villa_price"],
                rating: ["rating"],
                guests: ["guests", "kapasitas", "kapasitas_tamu", "kapasitas_peserta"],
                beds: ["beds", "jumlah_bed", "bed"],
                baths: ["baths", "jumlah_kamar_mandi", "bath_count"],
                bedType: ["bed_type", "tipe_bed", "tipe_kasur", "tipe_kamar_bed"],
                checkIn: ["check_in_time", "check_in", "jam_check_in"],
                checkOut: ["check_out_time", "check_out", "jam_check_out"],
                status: ["status"],
                img: ["img", "image", "gambar", "foto", "gambar_utama", "foto_utama"],
                roomCount: ["room_count", "jumlah_kamar", "jumlah_room"],
                bathroomType: ["bathroom_type", "tipe_kamar_mandi"],
                hours: ["hours", "jam_operasional", "operasional"],
                description: ["description", "deskripsi", "deskripsi_villa", "deskripsi_properti"],
                amenities: ["amenities"],
                equipment: ["equipment", "perlengkapan"],
                facilities: ["facilities", "fasilitas"],
                promo: ["promo", "status_promo"],
                roomName: ["room_name", "nama_room", "nama_kamar", "bed_info", "nama_unit", "unit"],
                roomType: ["room_type", "tipe_room", "tipe_kamar"],
                roomPrice: ["harga_room", "harga_kamar", "room_price", "harga_per_malam", "price_room"],
                roomFacilities: ["room_facilities", "fasilitas_kamar", "facilities_room"],
                roomImg: ["room_img", "room_image", "gambar_room", "gambar_kamar", "foto_kamar"],
                snk: ["snk", "syarat_ketentuan", "syarat_dan_ketentuan"],
                roomDescription: ["room_description", "deskripsi_room", "deskripsi_kamar"],
                maxGuests: ["max_guests", "maks_tamu", "kapasitas_room", "kapasitas_kamar"],
                maxAgeRule: ["max_age_rule", "aturan_usia", "batas_usia"],
                otherFacilities: ["other_facilities", "fasilitas_tambahan"],
                roomRoomCount: ["room_room_count", "jumlah_unit", "room_count_detail"],
                bathroomCount: ["bathroom_count", "jumlah_bathroom", "jumlah_kamar_mandi_room"],
                roomBathroomType: ["room_bathroom_type", "tipe_bathroom_room"],
                roomAmenities: ["room_amenities", "amenities_room", "amenities_kamar"],
                roomEquipment: ["room_equipment", "equipment_room", "perlengkapan_kamar"],
                roomHours: ["room_hours", "jam_room", "jam_operasional_room"],
                roomLocation: ["room_location", "lokasi_kamar", "alamat_kamar"]
            };

            let lastVilla = null;
            const villaIdsHandled = new Set();
            const results = {
                villasCreated: 0,
                villasUpdated: 0,
                roomsCreated: 0,
                skipped: 0,
                failed: []
            };

            // Ambil data villa terbaru supaya kita tidak membuat ID/nama duplikat.
            let existingVillas = Array.isArray(villas) ? villas : [];
            try {
                const res = await fetch(`${API_BASE_URL}/api/admin/villas`);
                if (res.ok) {
                    const data = await res.json();
                    const list = data.data || data;
                    if (Array.isArray(list)) existingVillas = list;
                }
            } catch (error) {
                console.warn("Tidak bisa mengambil daftar villa terbaru sebelum import:", error);
            }

            for (const row of rows) {
                const rowNumber = row.__rowNumber;

                // Mendukung CSV dengan cell villa yang di-merge: data villa kosong
                // pada baris berikutnya akan mengikuti villa pada baris sebelumnya.
                const currentVillaId = normalizeCSVId(getCSVValue(row, aliases.villaId));
                const currentVillaName = getCSVValue(row, aliases.villaName);
                const currentLocation = getCSVValue(row, aliases.location);

                if (currentVillaId || currentVillaName || currentLocation) {
                    lastVilla = {
                        id: currentVillaId,
                        name: currentVillaName,
                        location: currentLocation,
                        whatsapp: getCSVValue(row, aliases.whatsapp),
                        price: getCSVValue(row, aliases.villaPrice),
                        rating: getCSVValue(row, aliases.rating),
                        guests: getCSVValue(row, aliases.guests),
                        beds: getCSVValue(row, aliases.beds),
                        baths: getCSVValue(row, aliases.baths),
                        bed_type: getCSVValue(row, aliases.bedType),
                        check_in_time: getCSVValue(row, aliases.checkIn),
                        check_out_time: getCSVValue(row, aliases.checkOut),
                        status: getCSVValue(row, aliases.status),
                        img: getCSVValue(row, aliases.img),
                        room_count: getCSVValue(row, aliases.roomCount),
                        bathroom_type: getCSVValue(row, aliases.bathroomType),
                        hours: getCSVValue(row, aliases.hours),
                        description: getCSVValue(row, aliases.description),
                        amenities: getCSVValue(row, aliases.amenities),
                        equipment: getCSVValue(row, aliases.equipment),
                        facilities: getCSVValue(row, aliases.facilities),
                        promo: getCSVValue(row, aliases.promo)
                    };
                } else if (lastVilla) {
                    // Jika cell kosong karena merge di Excel, gunakan konteks villa terakhir.
                    lastVilla = { ...lastVilla };
                }

                const villaName = lastVilla?.name || '';
                let villaId = normalizeCSVId(lastVilla?.id || '');

                // Tentukan apakah baris ini memang mempunyai data villa.
                const hasVillaData = Boolean(villaId || villaName || currentLocation || getCSVValue(row, aliases.whatsapp));

                // Tentukan apakah baris ini mempunyai data room.
                const roomName = getCSVValue(row, aliases.roomName);
                const hasRoomData = Boolean(roomName);

                if (!hasVillaData && !hasRoomData) {
                    results.skipped++;
                    continue;
                }

                try {
                    // ======================================================
                    // A. SIMPAN / UPDATE VILLA
                    // ======================================================
                    if (hasVillaData) {
                        // Jika ID kosong, coba cari berdasarkan nama villa yang sudah ada.
                        if (!villaId && villaName) {
                            const foundByName = existingVillas.find(v =>
                                String(v.name || '').trim().toLowerCase() === villaName.trim().toLowerCase()
                            );
                            if (foundByName) villaId = normalizeCSVId(foundByName.id || foundByName._id || '');
                        }

                        // Jika tetap belum punya ID, minta ID AUTO_INCREMENT berikutnya.
                        if (!villaId) {
                            const nextRes = await fetch(`${API_BASE_URL}/api/admin/villas/next_id`);
                            if (!nextRes.ok) throw new Error("Tidak bisa mendapatkan ID villa berikutnya.");
                            const nextData = await nextRes.json();
                            villaId = normalizeCSVId(nextData.next_id);
                            if (!villaId) throw new Error("ID villa berikutnya tidak valid.");
                        }

                        // Hanya proses villa satu kali meskipun muncul berkali-kali karena
                        // satu villa mempunyai banyak room.
                        if (!villaIdsHandled.has(villaId)) {
                            const existing = existingVillas.find(v =>
                                normalizeCSVId(v.id || v._id) === villaId
                            );

                            const villaPayload = {
                                id: villaId,
                                name: villaName || existing?.name || `Villa ${villaId}`,
                                location: lastVilla?.location || existing?.location || "",
                                whatsapp: lastVilla?.whatsapp || existing?.whatsapp || "",
                                price: cleanCSVPrice(lastVilla?.price || existing?.price),
                                rating: lastVilla?.rating || existing?.rating || "5",
                                guests: lastVilla?.guests || existing?.guests || "4",
                                beds: lastVilla?.beds || existing?.beds || "2",
                                baths: lastVilla?.baths || existing?.baths || "1",
                                bed_type: lastVilla?.bed_type || existing?.bed_type || "1 King Size",
                                check_in_time: lastVilla?.check_in_time || existing?.check_in_time || "14:00",
                                check_out_time: lastVilla?.check_out_time || existing?.check_out_time || "12:00",
                                status: lastVilla?.status || existing?.status || "available",
                                img: lastVilla?.img || existing?.img || "utama.png",
                                room_count: lastVilla?.room_count || existing?.room_count || "1",
                                bathroom_type: lastVilla?.bathroom_type || existing?.bathroom_type || "-",
                                hours: lastVilla?.hours || existing?.hours || "-",
                                description: lastVilla?.description || existing?.description || "",
                                amenities: lastVilla?.amenities || existing?.amenities || "",
                                equipment: lastVilla?.equipment || existing?.equipment || "",
                                facilities: lastVilla?.facilities || existing?.facilities || "",
                                promo: lastVilla?.promo || existing?.promo || "0"
                            };

                            if (existing) {
                                await postJSON(`${API_BASE_URL}/api/admin/villas/${villaId}`, "PUT", villaPayload);
                                results.villasUpdated++;
                            } else {
                                await postJSON(`${API_BASE_URL}/api/admin/villas`, "POST", villaPayload);
                                results.villasCreated++;
                                existingVillas.push(villaPayload);
                            }

                            villaIdsHandled.add(villaId);
                        }
                    }

                    // ======================================================
                    // B. SIMPAN ROOM JIKA ADA
                    // ======================================================
                    if (hasRoomData) {
                        if (!villaId) {
                            throw new Error("Room memiliki data tetapi ID Villa tidak ditemukan. Isi kolom id_villa atau nama_villa.");
                        }

                        const safeRoomName = roomName || "Standard Room";
                        const roomImage = getCSVValue(row, aliases.roomImg) || `${safeRoomName.replace(/[^a-zA-Z0-9\-_ ]/g, '') || 'room'}.jpg`;

                        const roomPayload = {
                            villa_id: parseInt(villaId, 10),
                            bed_info: safeRoomName,
                            room_name: safeRoomName,
                            room_type: getCSVValue(row, aliases.roomType, "Standard Room"),
                            price: cleanCSVPrice(getCSVValue(row, aliases.roomPrice)),
                            facilities: getCSVValue(row, aliases.roomFacilities, getCSVValue(row, aliases.facilities, "")),
                            img: roomImage,
                            image: roomImage,
                            snk: getCSVValue(row, aliases.snk, ""),
                            description: getCSVValue(row, aliases.roomDescription, getCSVValue(row, aliases.description, "")),
                            max_guests: getCSVValue(row, aliases.maxGuests, ""),
                            max_age_rule: getCSVValue(row, aliases.maxAgeRule, ""),
                            other_facilities: getCSVValue(row, aliases.otherFacilities, ""),
                            room_count: getCSVValue(row, aliases.roomRoomCount, ""),
                            bathroom_count: getCSVValue(row, aliases.bathroomCount, ""),
                            bathroom_type: getCSVValue(row, aliases.roomBathroomType, getCSVValue(row, aliases.bathroomType, "")),
                            amenities: getCSVValue(row, aliases.roomAmenities, getCSVValue(row, aliases.amenities, "")),
                            equipment: getCSVValue(row, aliases.roomEquipment, getCSVValue(row, aliases.equipment, "")),
                            hours: getCSVValue(row, aliases.roomHours, getCSVValue(row, aliases.hours, "")),
                            location: getCSVValue(row, aliases.roomLocation, getCSVValue(row, aliases.location, ""))
                        };

                        await postJSON(`${API_BASE_URL}/api/admin/villa-details`, "POST", roomPayload);
                        results.roomsCreated++;
                    }
                } catch (error) {
                    results.failed.push(`Baris ${rowNumber}: ${error.message}`);
                }
            }

            await fetchVillas();
            if (form.id && activeTab === "rooms-info") await fetchRelatedRooms(form.id);

            const failedText = results.failed.length > 0
                ? `\n\nGagal ${results.failed.length} baris:\n${results.failed.slice(0, 8).join("\n")}${results.failed.length > 8 ? "\n..." : ""}`
                : "";

            alert(
                `Import CSV selesai!\n\n` +
                `Villa baru: ${results.villasCreated}\n` +
                `Villa diperbarui: ${results.villasUpdated}\n` +
                `Room berhasil: ${results.roomsCreated}\n` +
                `Baris dilewati: ${results.skipped}` +
                failedText
            );
        } catch (error) {
            console.error("Error import CSV gabungan:", error);
            alert(`Import CSV gagal: ${error.message}`);
        } finally {
            // Reset supaya file dengan nama yang sama bisa dipilih lagi.
            e.target.value = "";
        }
    };

    return (
        <div className="admin-layout">

<AdminSidebar />
            

            <div className="main">
                <div className="topbar">
                    <div>
                        <p className="welcome">Selamat datang kembali,</p>
                        <h2>Admin</h2>
                    </div>
                </div>

                <div className="page-header">
                    <div>
                        <h1>Kelola Villa (Mitra Utama)</h1>
                        <p>Tambah, edit, dan konfigurasi properti serta relasi gambar unit</p>
                    </div>
                    <div style={{ display: "flex", gap: "10px" }}>
                        <input type="file" accept=".csv" ref={villaCsvInputRef} onChange={importCombinedCSV} style={{ display: "none" }} />
                        <button type="button" className="import-csv-btn" onClick={triggerFileSelect} style={{ backgroundColor: "#27ae60", color: "white", border: "none", padding: "10px 15px", borderRadius: "6px", display: "flex", alignItems: "center", gap: "8px", cursor: "pointer", fontWeight: "600" }}><FaFileCsv /> Import CSV Villa & Room</button>

                        <button className="add-btn" onClick={openAddModal}><FaPlus /> Tambah Villa</button>
                    </div>
                </div>

                <div className="villa-table">
                    <table>
                        <thead>
                            <tr>
                                <th>ID Mitra</th>
                                <th>Nama Mitra Penginapan</th>
                                <th>Alamat / Lokasi</th>
                                <th>Link WhatsApp Resmi</th>
                                <th>Status</th>
                                <th>Aksi</th>
                            </tr>
                        </thead>
                        <tbody>
                            {villas.map((villa, index) => (
                                <tr key={villa.id || villa._id || index}>
                                    <td>{villa.id}</td>
                                    <td><strong>{villa.name}</strong></td>
                                    <td>{villa.location}</td>
                                    <td>
                                        {villa.whatsapp && villa.whatsapp !== "-" ? (
                                            <a href={villa.whatsapp.startsWith("http") ? villa.whatsapp : `https://wa.me/${villa.whatsapp}`} target="_blank" rel="noreferrer" style={{ color: "#27ae60", fontWeight: "600" }}>Hubungi WA Mitra</a>
                                        ) : ("-")}
                                    </td>
                                    <td><span className={`status ${villa.status || 'available'}`}>{villa.status || 'available'}</span></td>
                                    <td className="actions">
                                        <FaEdit className="edit" style={{ cursor: "pointer", marginRight: "10px", color: "#2980b9" }} onClick={() => openEditModal(index)} />
                                        <FaTrash className="delete" style={{ cursor: "pointer", color: "#e74c3c" }} onClick={() => deleteVilla(index)} />
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>

            {showModal && (
                <div className="modal-overlay" style={{ position: "fixed", top: 0, left: 0, width: "100%", height: "100%", backgroundColor: "rgba(0,0,0,0.5)", display: "flex", justifyContent: "center", alignItems: "center", zIndex: 9999 }}>
                    <div className="modal-content" style={{ backgroundColor: "#fff", padding: "25px", borderRadius: "8px", width: "820px", maxHeight: "90vh", overflowY: "auto", boxShadow: "0 4px 15px rgba(0,0,0,0.2)" }}>

                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "15px", borderBottom: "1px solid #eee", paddingBottom: "10px" }}>
                            <h2>{editIndex !== null ? `🔧 Pengaturan: ${form.name}` : "➕ Tambah Villa Baru"}</h2>
                            <FaTimes style={{ cursor: "pointer", fontSize: "1.2rem", color: "#666" }} onClick={() => setShowModal(false)} />
                        </div>

                        <div style={{ display: "flex", gap: "10px", marginBottom: "20px" }}>
                            <button type="button" onClick={() => setActiveTab("villa-info")} style={{ padding: "8px 16px", cursor: "pointer", fontWeight: "bold", border: "none", borderRadius: "4px", backgroundColor: activeTab === "villa-info" ? "#2980b9" : "#fff", color: activeTab === "villa-info" ? "#fff" : "#333" }}>ℹ️ Informasi Dasar Utama</button>
                            <button type="button" onClick={() => setActiveTab("rooms-info")} style={{ padding: "8px 16px", cursor: "pointer", fontWeight: "bold", border: "none", borderRadius: "4px", backgroundColor: activeTab === "rooms-info" ? "#2980b9" : "#fff", color: activeTab === "rooms-info" ? "#fff" : "#333" }}>🛏️ Pilihan Room Kamar ({relatedRooms.length})</button>
                        </div>

                        {activeTab === "villa-info" && (
                            <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
                                <label style={{ fontWeight: "bold" }}>Nama Properti *</label>
                                <input type="text" name="name" value={form.name || ""} onChange={handleChange} style={{ padding: "8px", borderRadius: "4px", border: "1px solid #ccc" }} />
                                <label style={{ fontWeight: "bold" }}>Alamat / Lokasi *</label>
                                <input type="text" name="location" value={form.location || ""} onChange={handleChange} style={{ padding: "8px", borderRadius: "4px", border: "1px solid #ccc" }} />
                                
                                <label style={{ fontWeight: "bold" }}>Status Promo</label>
                                <select name="promo" value={form.promo || "0"} onChange={handleChange} style={{ padding: "8px", borderRadius: "4px", border: "1px solid #ccc" }}>
                                    <option value="0">Tidak Ada Promo</option>
                                    <option value="1">Sedang Promo 🔥</option>
                                </select>
                                
                                <label style={{ fontWeight: "bold", display: "block", marginTop: "10px", color: "#1e293b" }}><FaImages /> Foto Utama Villa: <span style={{ color: "#2563eb" }}>{form.img || "utama.png"}</span></label>
                                <div style={{ display: "flex", gap: "15px", alignItems: "center", marginBottom: "12px" }}>
                                    <img
                                        src={`/images/villas/villa_${form.id || '1'}/${form.img || "utama.png"}`}
                                        alt="Preview Utama"
                                        onError={(e) => { e.target.src = `/images/villas/villa_1/utama.png`; }}
                                        style={{ width: "100px", height: "70px", objectFit: "cover", borderRadius: "6px", border: "2px solid #2563eb" }}
                                    />
                                    <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: "8px" }}>
                                        <input type="text" name="img" value={form.img || ""} onChange={handleChange} placeholder="Nama file gambar (cth: utama.png)" style={{ padding: "8px", borderRadius: "4px", border: "1px solid #cbd5e1" }} />
                                        <div>
                                            <input type="file" ref={mainImageUploadRef} onChange={async (e) => {
                                                const file = e.target.files[0];
                                                if(file) {
                                                    const safeFileName = file.name.replace(/[^a-zA-Z0-9.\-_]/g, '');
                                                    const success = await uploadImageFile(file, form.id || '1', "main", safeFileName);
                                                    if (success) {
                                                        setForm(prev => ({...prev, img: safeFileName}));
                                                        alert(`Gambar utama "${safeFileName}" berhasil diunggah ke server!`);
                                                    }
                                                }
                                            }} style={{ display: "none" }} accept="image/*" />
                                            <button type="button" disabled={isUploading} onClick={() => mainImageUploadRef.current?.click()} style={{ padding: "8px 12px", backgroundColor: isUploading ? "#94a3b8" : "#27ae60", color: "white", border: "none", borderRadius: "4px", cursor: isUploading ? "not-allowed" : "pointer", display: "inline-flex", alignItems: "center", gap: "5px", fontWeight: "600" }}><FaUpload /> {isUploading ? "Mengunggah..." : "Pilih Gambar Baru"}</button>
                                        </div>
                                    </div>
                                </div>

                                <label style={{ fontWeight: "bold" }}>Nomor WhatsApp Mitra</label>
                                <input type="text" name="whatsapp" value={form.whatsapp || ""} onChange={handleChange} style={{ padding: "8px", borderRadius: "4px", border: "1px solid #ccc" }} />
                                
                                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "10px", marginTop: "10px" }}>
                                    <div>
                                        <label style={{ fontWeight: "bold" }}>Kapasitas Peserta</label>
                                        <input type="text" name="guests" value={form.guests || ""} onChange={handleChange} placeholder="Contoh: 15-16 atau 4" style={{ padding: "8px", borderRadius: "4px", border: "1px solid #ccc", width: "100%" }} />
                                    </div>
                                    <div>
                                        <label style={{ fontWeight: "bold" }}>Jumlah Kamar</label>
                                        <input type="text" name="room_count" value={form.room_count || ""} onChange={handleChange} placeholder="Contoh: 1" style={{ padding: "8px", borderRadius: "4px", border: "1px solid #ccc", width: "100%" }} />
                                    </div>
                                    <div>
                                        <label style={{ fontWeight: "bold" }}>Tipe Kamar (Bed)</label>
                                        <input type="text" name="bed_type" value={form.bed_type || ""} onChange={handleChange} placeholder="Contoh: 1 King Size" style={{ padding: "8px", borderRadius: "4px", border: "1px solid #ccc", width: "100%" }} />
                                    </div>
                                    <div>
                                        <label style={{ fontWeight: "bold" }}>Jumlah Kamar Mandi</label>
                                        <input type="text" name="baths" value={form.baths || ""} onChange={handleChange} placeholder="Contoh: 1" style={{ padding: "8px", borderRadius: "4px", border: "1px solid #ccc", width: "100%" }} />
                                    </div>
                                    <div>
                                        <label style={{ fontWeight: "bold" }}>Tipe Kamar Mandi</label>
                                        <input type="text" name="bathroom_type" value={form.bathroom_type || ""} onChange={handleChange} placeholder="Dalam/Luar" style={{ padding: "8px", width: "100%", borderRadius: "4px", border: "1px solid #ccc" }} />
                                    </div>
                                    <div>
                                        <label style={{ fontWeight: "bold" }}>Jam (Operasional)</label>
                                        <input type="text" name="hours" value={form.hours || ""} onChange={handleChange} placeholder="Check-in 14:00..." style={{ padding: "8px", width: "100%", borderRadius: "4px", border: "1px solid #ccc" }} />
                                    </div>
                                </div>
                                <div style={{ marginTop: "10px" }}>
                                    <label style={{ fontWeight: "bold" }}>Deskripsi Kamar / Properti</label>
                                    <textarea name="description" rows="2" value={form.description || ""} onChange={handleChange} style={{ padding: "8px", width: "100%", borderRadius: "4px", border: "1px solid #ccc" }}></textarea>
                                </div>
                                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px", marginTop: "10px" }}>
                                    <div>
                                        <label style={{ fontWeight: "bold" }}>Amenities (Pisahkan dgn koma)</label>
                                        <textarea name="amenities" rows="2" value={form.amenities || ""} onChange={handleChange} placeholder="Handuk, Sabun, dll..." style={{ padding: "8px", width: "100%", borderRadius: "4px", border: "1px solid #ccc" }}></textarea>
                                    </div>
                                    <div>
                                        <label style={{ fontWeight: "bold" }}>Perlengkapan (Pisahkan dgn koma)</label>
                                        <textarea name="equipment" rows="2" value={form.equipment || ""} onChange={handleChange} placeholder="TV, AC, dll..." style={{ padding: "8px", width: "100%", borderRadius: "4px", border: "1px solid #ccc" }}></textarea>
                                    </div>
                                </div>
                                <div style={{ marginTop: "10px" }}>
                                    <label style={{ fontWeight: "bold" }}>Fasilitas Kamar (Pisahkan dengan Koma)</label>
                                    <input type="text" name="facilities" value={form.facilities || ""} onChange={handleChange} style={{ padding: "8px", width: "100%", borderRadius: "4px", border: "1px solid #ccc" }} />
                                </div>

                                <div style={{ display: "flex", justifyContent: "flex-end", gap: "10px", marginTop: "15px" }}>
                                    <button type="button" onClick={() => setShowModal(false)} style={{ padding: "8px 16px", borderRadius: "4px", border: "1px solid #ccc" }}>Batal</button>
                                    <button type="button" onClick={saveVilla} style={{ padding: "8px 16px", borderRadius: "4px", border: "none", backgroundColor: "#2980b9", color: "#fff" }}>Simpan Data Utama</button>
                                </div>
                            </div>
                        )}

                        {activeTab === "rooms-info" && (
                            <div style={{ paddingBottom: "30px" }}>
                                <label style={{ fontWeight: "bold", display: "block", marginBottom: "8px" }}>Pilih Unit yang Ingin Dikelola / Diedit:</label>

                                <select
                                    value={selectedRoomIndex}
                                    onChange={(e) => loadRoomToForm(e.target.value)}
                                    style={{ width: "100%", padding: "10px", borderRadius: "6px", border: "1px solid #cbd5e1", backgroundColor: "#fff", fontSize: "1rem", fontWeight: "500", color: "#334155", marginBottom: "25px", cursor: "pointer" }}
                                >
                                    <option value="">➕ -- Tambah Variasi Unit Baru -- </option>
                                    {relatedRooms.map((room, idx) => (
                                        <option key={room.id || room.id_detail || idx} value={idx}>
                                            🛏️ {room.bed_info || "Tanpa Nama"}
                                        </option>
                                    ))}
                                </select>

                                <h3 style={{ marginBottom: "15px", color: "#2980b9", borderBottom: "2px solid #cbd5e1", paddingBottom: "6px" }}>
                                    {selectedRoomIndex !== "" ? `📝 Formulir Edit Unit: ${roomForm.bed_info}` : "➕ Formulir Tambah Unit Baru"}
                                </h3>

                                <div style={{ display: "flex", flexDirection: "column", gap: "14px" }}>

                                    {/* GALERI MANAJEMEN SELECTION */}
                                    <div className="gallery-section" style={{ backgroundColor: "#f8fafc", border: "1px solid #e2e8f0", padding: "15px", borderRadius: "6px" }}>
                                        <label style={{ fontWeight: "bold", display: "block", marginBottom: "8px", color: "#1e293b" }}><FaImages /> Foto Kamar Terpilih: <span style={{ color: "#2563eb" }}>{roomForm.img || "image_1.png"}</span></label>
                                        <div style={{ display: "flex", gap: "15px", alignItems: "center", marginBottom: "12px" }}>
                                            <img
                                                src={roomForm.id ? `/images/villas/villa_${form.id || '1'}/rooms/room_${roomForm.id}/${roomForm.img || "image_1.png"}` : `/images/villas/villa_${form.id || '1'}/rooms/${roomForm.img || "image_1.png"}`}
                                                alt="Preview"
                                                onError={(e) => { e.target.src = `/images/villas/villa_1/rooms/${roomForm.img || "image_1.png"}`; }}
                                                style={{ width: "100px", height: "70px", objectFit: "cover", borderRadius: "6px", border: "2px solid #2563eb" }}
                                            />
                                            <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: "8px" }}>
                                                <input type="text" name="img" value={roomForm.img || ""} readOnly style={{ padding: "8px", borderRadius: "4px", border: "1px solid #cbd5e1", backgroundColor: "#f1f5f9" }} />
                                                <div>
                                                    <input type="file" ref={singleImageUploadRef} onChange={handleSingleImageUpload} style={{ display: "none" }} accept="image/*" />
                                                    <button type="button" disabled={isUploading} onClick={() => singleImageUploadRef.current.click()} style={{ padding: "8px 12px", backgroundColor: isUploading ? "#94a3b8" : "#27ae60", color: "white", border: "none", borderRadius: "4px", cursor: isUploading ? "not-allowed" : "pointer", display: "inline-flex", alignItems: "center", gap: "5px", fontWeight: "600" }}><FaUpload /> {isUploading ? "Mengunggah..." : "Tambah Gambar Baru"}</button>
                                                </div>
                                            </div>
                                        </div>

                                        <div className="image-grid" style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: "12px", maxHeight: "180px", overflowY: "auto", border: "1px solid #cbd5e1", padding: "10px", borderRadius: "6px", backgroundColor: "#fff" }}>
                                            {[...uploadedImagesInFE].map((imgName, i) => {
                                                const targetRoomId = roomForm.id;
                                                return (
                                                <div
                                                    key={i}
                                                    className="gallery-item"
                                                    onClick={() => selectImageFromGallery(imgName)}
                                                    style={{
                                                        position: "relative",
                                                        border: roomForm.img === imgName ? "3px solid #2563eb" : "1px solid #e2e8f0",
                                                        padding: "6px",
                                                        borderRadius: "6px",
                                                        cursor: "pointer",
                                                        textAlign: "center",
                                                        backgroundColor: roomForm.img === imgName ? "#eff6ff" : "#fff"
                                                    }}
                                                >
                                                    <button
                                                        type="button"
                                                        onClick={(e) => removeImageFromGallery(e, imgName)}
                                                        style={{ position: "absolute", top: "2px", right: "2px", backgroundColor: "#e74c3c", color: "white", border: "none", borderRadius: "50%", width: "20px", height: "20px", display: "flex", justifyContent: "center", alignItems: "center", fontSize: "0.65rem", cursor: "pointer", zIndex: 10 }}
                                                        title="Hapus"
                                                    >
                                                        <FaTrash />
                                                    </button>

                                                    <img
                                                        src={targetRoomId ? `/images/villas/villa_${form.id || '1'}/rooms/room_${targetRoomId}/${imgName}` : `/images/villas/villa_${form.id || '1'}/rooms/${imgName}`}
                                                        alt={imgName}
                                                        onError={(e) => {
                                                            const fallbackSrc = `/images/villas/villa_1/rooms/${imgName}`;
                                                            // Jika url src saat ini adalah fallbackSrc, berarti gambar benar-benar tidak ada
                                                            if (e.target.src.endsWith(fallbackSrc)) {
                                                                const parent = e.target.closest('.gallery-item');
                                                                if (parent) parent.style.display = 'none';
                                                            } else {
                                                                e.target.src = fallbackSrc;
                                                            }
                                                        }}
                                                        style={{ width: "100%", height: "65px", objectFit: "cover", borderRadius: "4px", marginBottom: "4px" }}
                                                    />
                                                    <span style={{ fontSize: "0.75rem", wordBreak: "break-all", display: "block", color: "#475569" }}>{imgName}</span>
                                                </div>
                                                );
                                            })}
                                        </div>
                                    </div>

                                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px" }}>
                                        <div>
                                            <label style={{ fontWeight: "bold" }}>Nama Kamar *</label>
                                            <input
                                                type="text"
                                                name="bed_info"
                                                value={roomForm.bed_info || ""}
                                                onChange={handleRoomChange}
                                                placeholder="Contoh: Kamar: Semeru Room"
                                                style={{ padding: "8px", width: "100%", borderRadius: "4px", border: "1px solid #ccc" }}
                                            />
                                        </div>
                                        <div>
                                            <label style={{ fontWeight: "bold" }}>Harga Per Malam (Rp) *</label>
                                            <input
                                                type="number"
                                                name="price"
                                                value={roomForm.price || ""}
                                                onChange={handleRoomChange}
                                                placeholder="Contoh: 450000"
                                                style={{ padding: "8px", width: "100%", borderRadius: "4px", border: "1px solid #ccc" }}
                                            />
                                        </div>
                                    </div>
                                    
                                    <div style={{ marginTop: "10px" }}>
                                        <label style={{ fontWeight: "bold" }}>
                                            <FaMapMarkerAlt style={{ color: "#e74c3c", marginRight: "5px" }} />
                                            Lokasi / Alamat Kamar
                                        </label>
                                        <input
                                            type="text"
                                            name="location"
                                            value={roomForm.location || ""}
                                            onChange={handleRoomChange}
                                            placeholder="Contoh: Jl. Malioboro No. 1, Yogyakarta"
                                            style={{ padding: "8px", width: "100%", borderRadius: "4px", border: "1px solid #ccc" }}
                                        />
                                    </div>

                                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px", marginTop: "10px" }}>
                                        <div>
                                            <label style={{ fontWeight: "bold" }}>Kapasitas Tamu</label>
                                            <input
                                                type="text"
                                                name="max_guests"
                                                value={roomForm.max_guests || ""}
                                                onChange={handleRoomChange}
                                                placeholder="Contoh: 4"
                                                style={{ padding: "8px", width: "100%", borderRadius: "4px", border: "1px solid #ccc" }}
                                            />
                                        </div>
                                        <div>
                                            <label style={{ fontWeight: "bold" }}>Jumlah Kamar</label>
                                            <input
                                                type="text"
                                                name="room_count"
                                                value={roomForm.room_count || ""}
                                                onChange={handleRoomChange}
                                                placeholder="Contoh: 1"
                                                style={{ padding: "8px", width: "100%", borderRadius: "4px", border: "1px solid #ccc" }}
                                            />
                                        </div>
                                        <div>
                                            <label style={{ fontWeight: "bold" }}>Jumlah Kamar Mandi</label>
                                            <input
                                                type="text"
                                                name="bathroom_count"
                                                value={roomForm.bathroom_count || ""}
                                                onChange={handleRoomChange}
                                                placeholder="Contoh: 1"
                                                style={{ padding: "8px", width: "100%", borderRadius: "4px", border: "1px solid #ccc" }}
                                            />
                                        </div>
                                        <div>
                                            <label style={{ fontWeight: "bold" }}>Tipe Kamar Mandi</label>
                                            <input
                                                type="text"
                                                name="bathroom_type"
                                                value={roomForm.bathroom_type || ""}
                                                onChange={handleRoomChange}
                                                placeholder="Contoh: Shower, Bathtub"
                                                style={{ padding: "8px", width: "100%", borderRadius: "4px", border: "1px solid #ccc" }}
                                            />
                                        </div>
                                        <div>
                                            <label style={{ fontWeight: "bold" }}>Jam Operasional</label>
                                            <input
                                                type="text"
                                                name="hours"
                                                value={roomForm.hours || ""}
                                                onChange={handleRoomChange}
                                                placeholder="Contoh: Check-in 14:00 | Check-out 12:00"
                                                style={{ padding: "8px", width: "100%", borderRadius: "4px", border: "1px solid #ccc" }}
                                            />
                                        </div>
                                        <div>
                                            <label style={{ fontWeight: "bold" }}>Deskripsi Kamar</label>
                                            <input
                                                type="text"
                                                name="description"
                                                value={roomForm.description || ""}
                                                onChange={handleRoomChange}
                                                placeholder="Tuliskan deskripsi singkat kamar"
                                                style={{ padding: "8px", width: "100%", borderRadius: "4px", border: "1px solid #ccc" }}
                                            />
                                        </div>
                                    </div>

                                    <div style={{ marginTop: "10px" }}>
                                        <label style={{ fontWeight: "bold" }}>Fasilitas Kamar (Pisahkan dengan koma)</label>
                                        <textarea
                                            name="facilities"
                                            value={roomForm.facilities || ""}
                                            onChange={handleRoomChange}
                                            placeholder="Contoh: Free Wifi, AC, TV"
                                            style={{ padding: "8px", width: "100%", borderRadius: "4px", border: "1px solid #ccc", minHeight: "60px" }}
                                        />
                                    </div>
                                    <div style={{ marginTop: "10px" }}>
                                        <label style={{ fontWeight: "bold" }}>Perlengkapan Kamar (Pisahkan dengan koma)</label>
                                        <textarea
                                            name="equipment"
                                            value={roomForm.equipment || ""}
                                            onChange={handleRoomChange}
                                            placeholder="Contoh: Handuk, Sabun, Sampo"
                                            style={{ padding: "8px", width: "100%", borderRadius: "4px", border: "1px solid #ccc", minHeight: "60px" }}
                                        />
                                    </div>
                                    <div style={{ marginTop: "10px" }}>
                                        <label style={{ fontWeight: "bold" }}>Amenities (Pisahkan dengan koma)</label>
                                        <textarea
                                            name="amenities"
                                            value={roomForm.amenities || ""}
                                            onChange={handleRoomChange}
                                            placeholder="Contoh: Kopi, Teh, Gula"
                                            style={{ padding: "8px", width: "100%", borderRadius: "4px", border: "1px solid #ccc", minHeight: "60px" }}
                                        />
                                    </div>

                                    {/* ===== LAYANAN TAMBAHAN (RENTAL & TRIP) ===== */}
                                    {roomForm.id && (
                                        <div style={{ marginTop: "24px", padding: "16px", backgroundColor: "#f0fdf4", borderRadius: "8px", border: "2px dashed #27ae60" }}>
                                            <h4 style={{ margin: "0 0 14px 0", color: "#166534", display: "flex", alignItems: "center", gap: "8px" }}>
                                                🚗 Layanan Tambahan Kamar Ini (Rental & Trip)
                                            </h4>

                                            {/* Form Tambah/Edit Addon */}
                                            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr 1fr auto", gap: "8px", alignItems: "flex-end", marginBottom: "12px" }}>
                                                <div>
                                                    <label style={{ fontSize: "0.8rem", fontWeight: "600", display: "block", marginBottom: "4px" }}>Kategori</label>
                                                    <select
                                                        value={addonForm.addon_type}
                                                        onChange={e => setAddonForm(p => ({ ...p, addon_type: e.target.value }))}
                                                        style={{ padding: "8px", width: "100%", borderRadius: "4px", border: "1px solid #ccc", fontSize: "0.85rem" }}
                                                    >
                                                        <option value="Motor">🏍️ Motor</option>
                                                        <option value="Mobil">🚗 Mobil</option>
                                                        <option value="Trip">🗺️ Trip / Paket Wisata</option>
                                                        <option value="Sepeda">🚲 Sepeda</option>
                                                        <option value="Lainnya">📦 Lainnya</option>
                                                    </select>
                                                </div>
                                                <div>
                                                    <label style={{ fontSize: "0.8rem", fontWeight: "600", display: "block", marginBottom: "4px" }}>Nama Layanan *</label>
                                                    <input
                                                        type="text"
                                                        value={addonForm.name}
                                                        onChange={e => setAddonForm(p => ({ ...p, name: e.target.value }))}
                                                        placeholder="Contoh: Honda Vario 125"
                                                        style={{ padding: "8px", width: "100%", borderRadius: "4px", border: "1px solid #ccc", fontSize: "0.85rem" }}
                                                    />
                                                </div>
                                                <div>
                                                    <label style={{ fontSize: "0.8rem", fontWeight: "600", display: "block", marginBottom: "4px" }}>Harga / Hari (Rp)</label>
                                                    <input
                                                        type="number"
                                                        value={addonForm.price}
                                                        onChange={e => setAddonForm(p => ({ ...p, price: e.target.value }))}
                                                        placeholder="Contoh: 100000"
                                                        style={{ padding: "8px", width: "100%", borderRadius: "4px", border: "1px solid #ccc", fontSize: "0.85rem" }}
                                                    />
                                                </div>
                                                <div>
                                                    <label style={{ fontSize: "0.8rem", fontWeight: "600", display: "block", marginBottom: "4px" }}>Keterangan (Opsional)</label>
                                                    <input
                                                        type="text"
                                                        value={addonForm.description}
                                                        onChange={e => setAddonForm(p => ({ ...p, description: e.target.value }))}
                                                        placeholder="Contoh: Termasuk helm"
                                                        style={{ padding: "8px", width: "100%", borderRadius: "4px", border: "1px solid #ccc", fontSize: "0.85rem" }}
                                                    />
                                                </div>
                                                <button
                                                    type="button"
                                                    onClick={saveAddon}
                                                    style={{ padding: "8px 14px", backgroundColor: addonEditIndex !== null ? "#2980b9" : "#27ae60", color: "white", border: "none", borderRadius: "4px", fontWeight: "bold", cursor: "pointer", whiteSpace: "nowrap" }}
                                                >
                                                    {addonEditIndex !== null ? "Update" : "+ Tambah"}
                                                </button>
                                            </div>

                                            {/* Daftar Addon */}
                                            {addonList.length === 0 ? (
                                                <p style={{ color: "#6b7280", fontSize: "0.85rem", margin: 0 }}>Belum ada layanan tambahan untuk kamar ini. Tambahkan di atas!</p>
                                            ) : (
                                                <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
                                                    {addonList.map((addon, idx) => (
                                                        <div key={addon.id} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "8px 12px", backgroundColor: "white", borderRadius: "6px", border: "1px solid #d1fae5" }}>
                                                            <div style={{ display: "flex", gap: "10px", alignItems: "center" }}>
                                                                <span style={{ fontSize: "0.75rem", backgroundColor: "#d1fae5", color: "#065f46", padding: "2px 8px", borderRadius: "99px", fontWeight: "600" }}>{addon.addon_type}</span>
                                                                <strong style={{ fontSize: "0.9rem" }}>{addon.name}</strong>
                                                                <span style={{ fontSize: "0.85rem", color: "#059669", fontWeight: "600" }}>Rp {Number(addon.price).toLocaleString("id-ID")}/hari</span>
                                                                {addon.description && <span style={{ fontSize: "0.8rem", color: "#6b7280" }}>— {addon.description}</span>}
                                                            </div>
                                                            <div style={{ display: "flex", gap: "6px" }}>
                                                                <button type="button" onClick={() => { setAddonEditIndex(idx); setAddonForm({ addon_type: addon.addon_type, name: addon.name, price: addon.price, description: addon.description || "" }); }} style={{ padding: "4px 10px", backgroundColor: "#2980b9", color: "white", border: "none", borderRadius: "4px", cursor: "pointer", fontSize: "0.8rem" }}><FaEdit /></button>
                                                                <button type="button" onClick={() => deleteAddon(addon.id)} style={{ padding: "4px 10px", backgroundColor: "#e74c3c", color: "white", border: "none", borderRadius: "4px", cursor: "pointer", fontSize: "0.8rem" }}><FaTrash /></button>
                                                            </div>
                                                        </div>
                                                    ))}
                                                </div>
                                            )}
                                        </div>
                                    )}

                                    <div style={{ display: "flex", justifyContent: "flex-end", gap: "10px", marginTop: "20px" }}>
                                        {selectedRoomIndex !== "" && (
                                            <>
                                                <button type="button" onClick={() => deleteRoomData(roomForm.id)} style={{ padding: "8px 14px", backgroundColor: "#e74c3c", color: "white", border: "none", borderRadius: "4px", fontWeight: "600", cursor: "pointer" }}>Hapus Kamar</button>
                                                <button type="button" onClick={resetRoomForm} style={{ padding: "8px 14px", backgroundColor: "#94a3b8", color: "white", border: "none", borderRadius: "4px", cursor: "pointer" }}>Batal Edit</button>
                                            </>
                                        )}
                                        <button type="button" onClick={saveRoomData} style={{ padding: "10px 20px", backgroundColor: "#27ae60", color: "white", border: "none", borderRadius: "4px", fontWeight: "bold", cursor: "pointer", display: "flex", alignItems: "center", gap: "6px" }}><FaSave /> Simpan Kamar</button>
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
}

export default AdminManageVillas;