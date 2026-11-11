import React, {
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";
import { useNavigate } from "react-router-dom";
import Swal from "sweetalert2";
import API_BASE_URL from "../config";
import "./css/OwnerPriceRequest.css";

const REQUEST_STATUS = {
  MENUNGGU: "Menunggu",
  DISETUJUI: "Disetujui",
  DITOLAK: "Ditolak",
  DIBATALKAN: "Dibatalkan",
};

function getStoredUser() {
  try {
    return JSON.parse(localStorage.getItem("user") || "null");
  } catch (error) {
    console.error("Gagal membaca data user:", error);
    return null;
  }
}

function getHeaders() {
  const headers = {
    "Content-Type": "application/json",
  };

  const token =
    localStorage.getItem("token") ||
    localStorage.getItem("owner_token");

  const user = getStoredUser();

  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }

  if (user?.id) {
    headers["X-Owner-User-Id"] = String(user.id);
  }

  return headers;
}

function formatRupiah(value) {
  const number = Number(value || 0);

  return new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    maximumFractionDigits: 0,
  }).format(number);
}

function formatDate(value) {
  if (!value) return "-";

  const raw = String(value);
  const normalized = raw.includes("T")
    ? raw
    : raw.replace(" ", "T");

  const date = new Date(normalized);

  if (Number.isNaN(date.getTime())) {
    return raw;
  }

  return date.toLocaleString("id-ID", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function getStatusClass(status) {
  if (status === REQUEST_STATUS.MENUNGGU) {
    return "pending";
  }

  if (status === REQUEST_STATUS.DISETUJUI) {
    return "approved";
  }

  if (status === REQUEST_STATUS.DITOLAK) {
    return "rejected";
  }

  return "cancelled";
}

function getRequestLabel(request) {
  if (request?.request_type === "price") {
    return request.villa_detail_id
      ? "Penyesuaian Harga Kamar"
      : "Penyesuaian Harga Villa";
  }

  if (request?.request_type === "edit_unit") {
    return "Penyesuaian Harga Kamar";
  }

  return request?.request_type || "Penyesuaian";
}

function getPriceFromRequest(request) {
  return Number(
    request?.new_data?.price ??
      request?.new_data?.updates?.price ??
      0
  );
}

function getOldPriceFromRequest(request) {
  return Number(request?.old_data?.price ?? 0);
}

function getPriceDirection(oldPrice, newPrice) {
  if (newPrice > oldPrice) {
    return "naik";
  }

  if (newPrice < oldPrice) {
    return "turun";
  }

  return "tetap";
}

export default function OwnerPriceRequest() {
  const navigate = useNavigate();

  const [user, setUser] = useState(null);
  const [villas, setVillas] = useState([]);
  const [units, setUnits] = useState([]);
  const [requests, setRequests] = useState([]);

  const [selectedVillaId, setSelectedVillaId] = useState("");
  const [selectedTarget, setSelectedTarget] = useState("villa");
  const [selectedUnitId, setSelectedUnitId] = useState("");

  const [newPrice, setNewPrice] = useState("");
  const [reason, setReason] = useState("");

  const [loadingVillas, setLoadingVillas] = useState(true);
  const [loadingUnits, setLoadingUnits] = useState(false);
  const [loadingRequests, setLoadingRequests] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const selectedVilla = useMemo(
    () =>
      villas.find(
        (villa) =>
          String(villa.id) ===
          String(selectedVillaId)
      ) || null,
    [villas, selectedVillaId]
  );

  const selectedUnit = useMemo(
    () =>
      units.find(
        (unit) =>
          String(unit.id) ===
          String(selectedUnitId)
      ) || null,
    [units, selectedUnitId]
  );

  const selectedCurrentPrice =
    selectedTarget === "unit"
      ? Number(selectedUnit?.price || 0)
      : Number(selectedVilla?.price || 0);

  const parsedNewPrice = Number(newPrice);

  const priceDifference =
    Number.isFinite(parsedNewPrice)
      ? parsedNewPrice - selectedCurrentPrice
      : 0;

  const pricePercentage =
    selectedCurrentPrice > 0 &&
    Number.isFinite(parsedNewPrice)
      ? (Math.abs(priceDifference) /
          selectedCurrentPrice) *
        100
      : 0;

  const priceDirection = getPriceDirection(
    selectedCurrentPrice,
    parsedNewPrice
  );

  const loadVillas = useCallback(async () => {
    try {
      setLoadingVillas(true);
      setError("");

      const response = await fetch(
        `${API_BASE_URL}/api/owner/villas-list`,
        {
          method: "GET",
          headers: getHeaders(),
        }
      );

      const data = await response.json();

      if (!response.ok || data.status !== "success") {
        throw new Error(
          data.error ||
            "Gagal mengambil daftar villa."
        );
      }

      const list = Array.isArray(data.data)
        ? data.data
        : [];

      setVillas(list);

      if (list.length > 0) {
        setSelectedVillaId(
          String(list[0].id)
        );
      } else {
        setSelectedVillaId("");
      }
    } catch (err) {
      console.error(
        "Load Owner Villas Error:",
        err
      );

      setVillas([]);
      setSelectedVillaId("");

      setError(
        err.message ||
          "Gagal mengambil daftar villa."
      );
    } finally {
      setLoadingVillas(false);
    }
  }, []);

  const loadUnits = useCallback(
    async (villaId) => {
      if (!villaId) {
        setUnits([]);
        setSelectedUnitId("");
        return;
      }

      try {
        setLoadingUnits(true);
        setError("");

        const response = await fetch(
          `${API_BASE_URL}/api/owner/villa-details?villa_id=${encodeURIComponent(
            villaId
          )}`,
          {
            method: "GET",
            headers: getHeaders(),
          }
        );

        const data = await response.json();

        if (
          !response.ok ||
          data.status !== "success"
        ) {
          throw new Error(
            data.error ||
              "Gagal mengambil unit/kamar."
          );
        }

        const list = Array.isArray(data.data)
          ? data.data
          : [];

        setUnits(list);

        if (list.length > 0) {
          setSelectedUnitId(
            String(list[0].id)
          );
        } else {
          setSelectedUnitId("");
        }
      } catch (err) {
        console.error(
          "Load Owner Units Error:",
          err
        );

        setUnits([]);
        setSelectedUnitId("");

        setError(
          err.message ||
            "Gagal mengambil unit/kamar."
        );
      } finally {
        setLoadingUnits(false);
      }
    },
    []
  );

  const loadRequests = useCallback(async () => {
    try {
      setLoadingRequests(true);

      const response = await fetch(
        `${API_BASE_URL}/api/owner/change-requests?limit=100`,
        {
          method: "GET",
          cache: "no-store",
          headers: getHeaders(),
        }
      );

      const data = await response.json();

      if (
        !response.ok ||
        data.status !== "success"
      ) {
        throw new Error(
          data.error ||
            "Gagal mengambil riwayat pengajuan."
        );
      }

      setRequests(
        Array.isArray(data.requests)
          ? data.requests
          : []
      );
    } catch (err) {
      console.error(
        "Load Change Requests Error:",
        err
      );

      setError(
        err.message ||
          "Gagal mengambil riwayat pengajuan."
      );
    } finally {
      setLoadingRequests(false);
    }
  }, []);

  useEffect(() => {
    const storedUser = getStoredUser();

    if (!storedUser) {
      navigate("/login", {
        replace: true,
      });
      return;
    }

    const role = String(
      storedUser.role || ""
    ).toLowerCase();

    if (role !== "owner") {
      Swal.fire({
        icon: "error",
        title: "Akses Ditolak",
        text: "Halaman ini hanya dapat diakses oleh Owner.",
        confirmButtonColor: "#27ae60"
      }).then(() => {
        navigate("/login", { replace: true });
      });
      return;
    }

    setUser(storedUser);

    loadVillas();
    loadRequests();
  }, [
    navigate,
    loadVillas,
    loadRequests,
  ]);

  useEffect(() => {
    if (selectedVillaId) {
      loadUnits(selectedVillaId);
    } else {
      setUnits([]);
      setSelectedUnitId("");
    }
  }, [
    selectedVillaId,
    loadUnits,
  ]);

  useEffect(() => {
    setNewPrice("");
  }, [
    selectedVillaId,
    selectedTarget,
    selectedUnitId,
  ]);

  const resetForm = () => {
    setNewPrice("");
    setReason("");
    setError("");
    setSuccess("");
  };

  const handleSubmit = async (event) => {
    event.preventDefault();

    setError("");
    setSuccess("");

    if (!selectedVillaId) {
      Swal.fire({ icon: "warning", title: "Pilih Villa", text: "Silakan pilih villa terlebih dahulu.", confirmButtonColor: "#27ae60" });
      return;
    }

    if (
      selectedTarget === "unit" &&
      !selectedUnitId
    ) {
      Swal.fire({ icon: "warning", title: "Pilih Kamar", text: "Silakan pilih kamar/unit terlebih dahulu.", confirmButtonColor: "#27ae60" });
      return;
    }

    if (
      !Number.isFinite(parsedNewPrice) ||
      parsedNewPrice <= 0
    ) {
      Swal.fire({ icon: "warning", title: "Harga Tidak Valid", text: "Harga baru harus lebih dari Rp 0.", confirmButtonColor: "#27ae60" });
      return;
    }

    if (
      parsedNewPrice ===
      selectedCurrentPrice
    ) {
      Swal.fire({ icon: "warning", title: "Harga Sama", text: "Harga baru harus berbeda dari harga saat ini.", confirmButtonColor: "#27ae60" });
      return;
    }

    if (!reason.trim()) {
      Swal.fire({ icon: "warning", title: "Alasan Diperlukan", text: "Alasan penyesuaian harga wajib diisi.", confirmButtonColor: "#27ae60" });
      return;
    }

    setSubmitting(true);

    try {
      let requestType = "price";

      let newData = {
        price: parsedNewPrice,
      };

      let oldData = {
        price: selectedCurrentPrice,
      };

      if (selectedTarget === "unit") {
        requestType = "edit_unit";

        newData = {
          updates: {
            price: parsedNewPrice,
          },
        };

        oldData = {
          price: selectedCurrentPrice,
          room_name:
            selectedUnit?.room_name ||
            selectedUnit?.name ||
            selectedUnit?.bed_info ||
            selectedUnit?.room_type ||
            `Unit ${selectedUnitId}`,
        };
      }

      const response = await fetch(
        `${API_BASE_URL}/api/owner/change-requests`,
        {
          method: "POST",
          headers: getHeaders(),
          body: JSON.stringify({
            request_type: requestType,
            villa_id: Number(
              selectedVillaId
            ),
            villa_detail_id:
              selectedTarget === "unit"
                ? Number(selectedUnitId)
                : null,
            old_data: oldData,
            new_data: newData,
            reason: reason.trim(),
          }),
        }
      );

      const data = await response.json();

      if (
        !response.ok ||
        data.status !== "success"
      ) {
        throw new Error(
          data.error ||
            "Pengajuan penyesuaian harga gagal dikirim."
        );
      }

      const directionText =
        priceDirection === "naik"
          ? "kenaikan"
          : "penurunan";

      Swal.fire({
        icon: "success",
        title: "Pengajuan Terkirim! 🎉",
        text: `Pengajuan ${directionText} harga berhasil dikirim dan menunggu persetujuan Admin.`,
        confirmButtonColor: "#27ae60"
      });

      setNewPrice("");
      setReason("");

      await loadRequests();
    } catch (err) {
      console.error(
        "Submit Change Request Error:",
        err
      );

      Swal.fire({
        icon: "error",
        title: "Gagal Mengirim",
        text: err.message || "Pengajuan penyesuaian harga gagal dikirim.",
        confirmButtonColor: "#27ae60"
      });
    } finally {
      setSubmitting(false);
    }
  };

  const handleCancel = async (requestId) => {
    const result = await Swal.fire({
      title: "Batalkan Pengajuan?",
      text: "Apakah Anda yakin ingin membatalkan pengajuan harga ini?",
      icon: "warning",
      showCancelButton: true,
      confirmButtonColor: "#e74c3c",
      cancelButtonColor: "#64748b",
      confirmButtonText: "Ya, Batalkan",
      cancelButtonText: "Kembali"
    });

    if (!result.isConfirmed) return;

    try {
      setError("");
      setSuccess("");

      const response = await fetch(
        `${API_BASE_URL}/api/owner/change-requests/${requestId}/cancel`,
        {
          method: "PUT",
          headers: getHeaders(),
        }
      );

      const data = await response.json();

      if (
        !response.ok ||
        data.status !== "success"
      ) {
        throw new Error(
          data.error ||
            "Pengajuan tidak dapat dibatalkan."
        );
      }

      Swal.fire({
        icon: "success",
        title: "Pengajuan Dibatalkan",
        text: "Pengajuan penyesuaian harga berhasil dibatalkan.",
        timer: 1500,
        showConfirmButton: false
      });

      await loadRequests();
    } catch (err) {
      console.error(
        "Cancel Change Request Error:",
        err
      );

      Swal.fire({
        icon: "error",
        title: "Gagal Membatalkan",
        text: err.message || "Pengajuan tidak dapat dibatalkan.",
        confirmButtonColor: "#27ae60"
      });
    }
  };

  if (!user) {
    return null;
  }

  return (
    <div className="owner-price-page">
      <main className="owner-price-main">
        <div className="owner-price-topbar">
          <div>
            <div className="owner-breadcrumb">
              OWNER / PENYESUAIAN HARGA
            </div>

            <h1>
              Pengajuan Penyesuaian Harga
            </h1>

            <p>
              Ajukan perubahan harga villa atau
              kamar/unit untuk diperiksa dan
              disetujui oleh Admin.
            </p>
          </div>

          <div className="owner-price-top-badge">
            <span>Proses</span>
            <strong>
              Persetujuan Admin
            </strong>
          </div>
        </div>

        {error && (
          <div className="owner-alert error">
            <strong>Terjadi masalah</strong>
            <span>{error}</span>
            <button type="button" onClick={() => setError("")} aria-label="Tutup pesan">×</button>
          </div>
        )}

        {success && (
          <div className="owner-alert success">
            <strong>Berhasil</strong>
            <span>{success}</span>
            <button type="button" onClick={() => setSuccess("")} aria-label="Tutup pesan">×</button>
          </div>
        )}

        <section className="owner-request-layout">
          <div className="owner-request-card">
            <div className="request-card-header">
              <div className="request-card-icon">
                Rp
              </div>

              <div>
                <h2>
                  Form Penyesuaian Harga
                </h2>

                <p>
                  Harga dapat dinaikkan atau
                  diturunkan. Semua perubahan
                  tetap membutuhkan persetujuan
                  Admin.
                </p>
              </div>
            </div>

            <form onSubmit={handleSubmit}>
              <div className="form-group">
                <label>
                  Pilih Villa <span>*</span>
                </label>

                <select
                  value={selectedVillaId}
                  onChange={(event) =>
                    setSelectedVillaId(
                      event.target.value
                    )
                  }
                  disabled={
                    loadingVillas ||
                    submitting
                  }
                >
                  <option value="">
                    {loadingVillas
                      ? "Memuat villa..."
                      : "Pilih villa"}
                  </option>

                  {villas.map(
                    (villa) => (
                      <option
                        key={villa.id}
                        value={villa.id}
                      >
                        {villa.name ||
                          `Villa #${villa.id}`}
                      </option>
                    )
                  )}
                </select>
              </div>

              <div className="form-group">
                <label>
                  Bagian yang Disesuaikan <span>*</span>
                </label>

                <div className="target-options">
                  <label
                    className={`target-option ${
                      selectedTarget === "villa"
                        ? "selected"
                        : ""
                    }`}
                  >
                    <input
                      type="radio"
                      name="priceTarget"
                      value="villa"
                      checked={
                        selectedTarget === "villa"
                      }
                      onChange={() =>
                        setSelectedTarget(
                          "villa"
                        )
                      }
                      disabled={submitting}
                    />

                    <span>
                      Harga Villa
                    </span>
                  </label>

                  <label
                    className={`target-option ${
                      selectedTarget === "unit"
                        ? "selected"
                        : ""
                    }`}
                  >
                    <input
                      type="radio"
                      name="priceTarget"
                      value="unit"
                      checked={
                        selectedTarget === "unit"
                      }
                      onChange={() =>
                        setSelectedTarget(
                          "unit"
                        )
                      }
                      disabled={
                        submitting ||
                        loadingUnits
                      }
                    />

                    <span>
                      Harga Kamar / Unit
                    </span>
                  </label>
                </div>
              </div>

              {selectedTarget === "unit" && (
                <div className="form-group">
                  <label>
                    Pilih Kamar / Unit <span>*</span>
                  </label>

                  <select
                    value={selectedUnitId}
                    onChange={(event) =>
                      setSelectedUnitId(
                        event.target.value
                      )
                    }
                    disabled={
                      loadingUnits ||
                      submitting
                    }
                  >
                    <option value="">
                      {loadingUnits
                        ? "Memuat unit..."
                        : units.length === 0
                        ? "Belum ada unit"
                        : "Pilih kamar/unit"}
                    </option>

                    {units.map(
                      (unit) => (
                        <option
                          key={unit.id}
                          value={unit.id}
                        >
                          {unit.room_name ||
                            unit.name ||
                            unit.bed_info ||
                            unit.room_type ||
                            `Unit #${unit.id}`}
                        </option>
                      )
                    )}
                  </select>

                  {units.length === 0 && !loadingUnits && (
                    <small className="field-helper">
                      Villa ini belum memiliki unit/kamar yang tersedia.
                    </small>
                  )}
                </div>
              )}

              <div className="current-price-box">
                <div>
                  <span>Harga Saat Ini</span>
                  <strong>{formatRupiah(selectedCurrentPrice)}</strong>
                </div>

                <div className="current-price-label">
                  {selectedTarget === "villa" ? "Villa" : "Kamar / Unit"}
                </div>
              </div>

              <div className="form-group">
                <label>
                  Harga Baru <span>*</span>
                </label>

                <div className="price-input-wrapper">
                  <span>Rp</span>

                  <input
                    type="number"
                    min="1"
                    step="1"
                    value={newPrice}
                    onChange={(event) =>
                      setNewPrice(
                        event.target.value
                      )
                    }
                    placeholder="Contoh: 750000"
                    disabled={
                      submitting ||
                      !selectedVillaId ||
                      (selectedTarget === "unit" && !selectedUnitId)
                    }
                  />
                </div>

                <small className="field-helper">
                  Harga boleh lebih tinggi atau lebih rendah dari harga saat ini, tetapi tidak boleh sama.
                </small>
              </div>

              {newPrice &&
                Number.isFinite(parsedNewPrice) &&
                parsedNewPrice > 0 &&
                selectedCurrentPrice > 0 &&
                parsedNewPrice !== selectedCurrentPrice && (
                  <div
                    className={`price-change-preview ${
                      priceDirection === "naik" ? "increase" : "decrease"
                    }`}
                  >
                    <div className="change-preview-title">
                      <span>{priceDirection === "naik" ? "↑" : "↓"}</span>
                      <strong>Harga {priceDirection === "naik" ? "Naik" : "Turun"}</strong>
                    </div>

                    <div className="change-preview-values">
                      <div>
                        <small>Perubahan</small>
                        <strong>
                          {priceDifference > 0 ? "+" : "-"}
                          {formatRupiah(Math.abs(priceDifference))}
                        </strong>
                      </div>

                      <div>
                        <small>Persentase</small>
                        <strong>
                          {priceDifference > 0 ? "+" : "-"}
                          {pricePercentage.toFixed(2)}%
                        </strong>
                      </div>

                      <div>
                        <small>Harga setelah disetujui</small>
                        <strong>{formatRupiah(parsedNewPrice)}</strong>
                      </div>
                    </div>
                  </div>
                )}

              <div className="form-group">
                <label>
                  Alasan Penyesuaian <span>*</span>
                </label>

                <textarea
                  rows="5"
                  value={reason}
                  onChange={(event) => setReason(event.target.value)}
                  placeholder="Contoh: Penyesuaian harga karena perubahan biaya operasional, musim liburan, atau strategi harga villa."
                  disabled={submitting}
                />

                <small className="field-helper">
                  Jelaskan alasan penyesuaian harga agar Admin dapat memahami dasar pengajuan.
                </small>
              </div>

              <div className="request-notice">
                <div className="notice-icon">i</div>
                <div>
                  <strong>Harga tidak langsung berubah</strong>
                  <p>Pengajuan akan dikirim kepada Admin. Harga lama tetap digunakan sampai Admin menyetujui pengajuan.</p>
                </div>
              </div>

              <div className="form-actions">
                <button
                  type="button"
                  className="btn-secondary"
                  onClick={resetForm}
                  disabled={submitting}
                >
                  Reset
                </button>

                <button
                  type="submit"
                  className="btn-primary"
                  disabled={
                    submitting ||
                    loadingVillas ||
                    !selectedVillaId ||
                    (selectedTarget === "unit" && !selectedUnitId)
                  }
                >
                  {submitting ? "Mengirim..." : "Kirim Pengajuan"}
                </button>
              </div>
            </form>
          </div>

          <div className="owner-request-info">
            <div className="info-card">
              <div className="info-icon">1</div>
              <div>
                <strong>Ajukan Penyesuaian</strong>
                <p>Pilih villa atau unit, masukkan harga baru, dan jelaskan alasannya.</p>
              </div>
            </div>

            <div className="info-card">
              <div className="info-icon">2</div>
              <div>
                <strong>Diperiksa Admin</strong>
                <p>Admin akan menerima pengajuan dan memeriksa perubahan yang diajukan.</p>
              </div>
            </div>

            <div className="info-card">
              <div className="info-icon">3</div>
              <div>
                <strong>Harga Diperbarui</strong>
                <p>Jika disetujui, sistem akan menerapkan harga baru secara otomatis.</p>
              </div>
            </div>
          </div>
        </section>

        <section className="owner-history-card">
          <div className="history-header">
            <div>
              <h2>Riwayat Pengajuan</h2>
              <p>Pantau semua pengajuan penyesuaian harga Anda.</p>
            </div>

            <button
              type="button"
              className="refresh-button"
              onClick={loadRequests}
              disabled={loadingRequests}
            >
              ↻ {loadingRequests ? "Memuat..." : "Refresh"}
            </button>
          </div>

          {loadingRequests ? (
            <div className="empty-history">Memuat riwayat pengajuan...</div>
          ) : requests.length === 0 ? (
            <div className="empty-history">
              <div className="empty-icon">Rp</div>
              <strong>Belum ada pengajuan</strong>
              <p>Pengajuan penyesuaian harga yang Anda kirim akan muncul di sini.</p>
            </div>
          ) : (
            <div className="request-table-wrap">
              <table className="request-table">
                <thead>
                  <tr>
                    <th>Pengajuan</th>
                    <th>Villa</th>
                    <th>Harga Lama</th>
                    <th>Harga Baru</th>
                    <th>Perubahan</th>
                    <th>Alasan</th>
                    <th>Status</th>
                    <th>Diajukan</th>
                    <th>Aksi</th>
                  </tr>
                </thead>

                <tbody>
                  {requests.map((request) => {
                    const oldPrice = getOldPriceFromRequest(request);
                    const newPriceValue = getPriceFromRequest(request);
                    const difference = newPriceValue - oldPrice;
                    const percentage = oldPrice > 0 ? (Math.abs(difference) / oldPrice) * 100 : 0;
                    const direction = getPriceDirection(oldPrice, newPriceValue);
                    const roomName = request.old_data?.room_name || request.new_data?.room_name || "";

                    return (
                      <tr key={request.id}>
                        <td>
                          <strong>{getRequestLabel(request)}</strong>
                          {roomName && <small>{roomName}</small>}
                        </td>
                        <td>{request.villa_name || "-"}</td>
                        <td>{formatRupiah(oldPrice)}</td>
                        <td className="table-new-price">{formatRupiah(newPriceValue)}</td>
                        <td>
                          <span
                            className={`change-mini ${
                              direction === "naik"
                                ? "increase"
                                : direction === "turun"
                                ? "decrease"
                                : ""
                            }`}
                          >
                            {direction === "naik" ? "↑" : direction === "turun" ? "↓" : "→"}{" "}
                            {difference > 0 ? "+" : ""}
                            {formatRupiah(difference)}
                            <small> ({percentage.toFixed(2)}%)</small>
                          </span>
                        </td>
                        <td>
                          <span className="reason-text">{request.reason || "-"}</span>
                          {request.admin_note && (
                            <small className="admin-note">Balasan Admin: {request.admin_note}</small>
                          )}
                        </td>
                        <td>
                          <span className={`status-pill ${getStatusClass(request.status)}`}>
                            {request.status}
                          </span>
                        </td>
                        <td>{formatDate(request.created_at)}</td>
                        <td>
                          {request.status === REQUEST_STATUS.MENUNGGU && (
                            <button
                              type="button"
                              className="cancel-request-button"
                              onClick={() => handleCancel(request.id)}
                            >
                              Batalkan
                            </button>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </section>
      </main>
    </div>
  );
}