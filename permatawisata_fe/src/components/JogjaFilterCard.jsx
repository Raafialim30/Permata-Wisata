import React, { useState } from "react";
import {
  FaCalendarAlt,
  FaClock,
  FaSortAmountDown,
  FaSortAmountUp,
  FaUsers,
  FaBed,
  FaMapMarkerAlt,
  FaTimes,
  FaArrowUp
} from "react-icons/fa";
import "./css/JogjaFilterCard.css";

const JOGJA_SPOTS = [
  "Malioboro",
  "Candi Prambanan",
  "Pantai Parangtritis",
  "HeHa Sky View",
  "Tugu Jogja",
  "Keraton Yogyakarta",
  "Taman Sari",
  "Kaliurang",
  "Alun-Alun Kidul",
  "Hutan Pinus Mangunan",
  "Pantai Indrayanti",
  "Candi Ratu Boko",
  "Benteng Vredeburg",
  "Candi Plaosan",
  "Puncak Becici",
  "Obelix Sea View",
  "Lava Tour Merapi",
  "Gembira Loka Zoo"
];

const GUEST_OPTIONS = [
  { label: "Semua Tamu", value: "" },
  { label: "1-2 Tamu", value: "2" },
  { label: "3-5 Tamu", value: "5" },
  { label: "6-10 Tamu", value: "10" },
  { label: "10+ Tamu", value: "15" }
];

const ROOM_OPTIONS = [
  { label: "Semua Kamar", value: "" },
  { label: "1 Kamar", value: "1" },
  { label: "2 Kamar", value: "2" },
  { label: "3 Kamar", value: "3" },
  { label: "4+ Kamar", value: "4" }
];

export default function JogjaFilterCard({
  sort,
  setSort,
  guestFilter,
  setGuestFilter,
  bedsFilter,
  setBedsFilter,
  selectedSpot,
  setSelectedSpot,
  radiusFilter,
  setRadiusFilter,
  checkInDate,
  setCheckInDate,
  duration,
  setDuration,
  onReset
}) {
  const [activeTab, setActiveTab] = useState("spot"); // "harga", "kapasitas", "kamar", "spot"
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [showDurationPicker, setShowDurationPicker] = useState(false);

  const handleSpotClick = (spot) => {
    if (selectedSpot === spot) {
      setSelectedSpot("");
    } else {
      setSelectedSpot(spot);
    }
  };

  const handleToggleSort = () => {
    if (sort === "low") {
      setSort("high");
    } else if (sort === "high") {
      setSort("recommended");
    } else {
      setSort("low");
    }
  };

  const scrollToTop = () => {
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  return (
    <div className="jogja-filter-card shadow-sm">
      {/* Accent Orange Header Bar */}
      <div className="filter-top-accent-bar" />

      {/* Top Date & Duration Buttons */}
      <div className="filter-top-controls">
        <div className="filter-control-btn-wrapper">
          <button
            type="button"
            className={`filter-control-btn ${checkInDate ? "active" : ""}`}
            onClick={() => {
              setShowDatePicker(!showDatePicker);
              setShowDurationPicker(false);
            }}
          >
            <FaCalendarAlt className="btn-icon" />
            <span>{checkInDate ? `Tgl: ${checkInDate}` : "Pilih Tgl."}</span>
          </button>

          {showDatePicker && (
            <div className="filter-popover">
              <div className="popover-header">
                <span>Pilih Tanggal Check-in</span>
                <button
                  className="close-popover-btn"
                  onClick={() => setShowDatePicker(false)}
                >
                  <FaTimes />
                </button>
              </div>
              <input
                type="date"
                className="popover-date-input"
                value={checkInDate || ""}
                onChange={(e) => {
                  setCheckInDate(e.target.value);
                  setShowDatePicker(false);
                }}
              />
              {checkInDate && (
                <button
                  className="popover-clear-btn"
                  onClick={() => setCheckInDate("")}
                >
                  Reset Tanggal
                </button>
              )}
            </div>
          )}
        </div>

        <div className="filter-control-btn-wrapper">
          <button
            type="button"
            className={`filter-control-btn ${duration ? "active" : ""}`}
            onClick={() => {
              setShowDurationPicker(!showDurationPicker);
              setShowDatePicker(false);
            }}
          >
            <FaClock className="btn-icon" />
            <span>{duration ? `${duration} Malam` : "Durasi"}</span>
          </button>

          {showDurationPicker && (
            <div className="filter-popover">
              <div className="popover-header">
                <span>Pilih Durasi Menginap</span>
                <button
                  className="close-popover-btn"
                  onClick={() => setShowDurationPicker(false)}
                >
                  <FaTimes />
                </button>
              </div>
              <div className="duration-options-list">
                {[1, 2, 3, 4, 5, 7, 10, 14].map((n) => (
                  <button
                    key={n}
                    type="button"
                    className={`duration-chip ${
                      duration === String(n) ? "selected" : ""
                    }`}
                    onClick={() => {
                      setDuration(String(n));
                      setShowDurationPicker(false);
                    }}
                  >
                    {n} Malam
                  </button>
                ))}
              </div>
              {duration && (
                <button
                  className="popover-clear-btn"
                  onClick={() => setDuration("")}
                >
                  Reset Durasi
                </button>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Center Subtitle Divider */}
      <div className="filter-divider-title">
        <span className="divider-line" />
        <span className="divider-text">Permudah pencarian dengan filter</span>
        <span className="divider-line" />
      </div>

      {/* Main Filter Tabs Row */}
      <div className="filter-tabs-row">
        <button
          type="button"
          className={`filter-tab-pill ${
            sort === "low" || sort === "high" ? "active" : ""
          }`}
          onClick={() => {
            setActiveTab("harga");
            handleToggleSort();
          }}
        >
          {sort === "low" ? (
            <>
              <FaSortAmountUp className="pill-icon" /> ↑ Harga
            </>
          ) : sort === "high" ? (
            <>
              <FaSortAmountDown className="pill-icon" /> ↓ Harga
            </>
          ) : (
            <>
              <FaSortAmountUp className="pill-icon" /> ↑ Harga
            </>
          )}
        </button>

        <button
          type="button"
          className={`filter-tab-pill ${
            activeTab === "kapasitas" || guestFilter ? "active" : ""
          }`}
          onClick={() => setActiveTab(activeTab === "kapasitas" ? "spot" : "kapasitas")}
        >
          <FaUsers className="pill-icon" />
          Kapasitas {guestFilter ? `(${guestFilter} Tamu)` : ""}
        </button>

        <button
          type="button"
          className={`filter-tab-pill ${
            activeTab === "kamar" || bedsFilter ? "active" : ""
          }`}
          onClick={() => setActiveTab(activeTab === "kamar" ? "spot" : "kamar")}
        >
          <FaBed className="pill-icon" />
          Kamar {bedsFilter ? `(${bedsFilter}+)` : ""}
        </button>

        <button
          type="button"
          className={`filter-tab-pill bold-tab ${
            activeTab === "spot" || selectedSpot ? "active" : ""
          }`}
          onClick={() => setActiveTab("spot")}
        >
          <FaMapMarkerAlt className="pill-icon" />
          Spot Wisata {selectedSpot ? `: ${selectedSpot}` : ""}
        </button>
      </div>

      {/* Active Sub-Filter Content */}
      <div className="filter-chips-container">
        {/* Spot Wisata Chips (Default / Selected) */}
        {activeTab === "spot" && (
          <div className="spot-tab-wrapper">
            {selectedSpot && (
              <div className="radius-selector-bar">
                <span className="radius-label">📍 Filter Radius dari {selectedSpot}:</span>
                <div className="radius-chips">
                  {[
                    { label: "≤ 5 km (Sangat Dekat)", value: 5 },
                    { label: "≤ 10 km (Dekat)", value: 10 },
                    { label: "≤ 15 km (Area Sekitar)", value: 15 },
                    { label: "≤ 25 km (Semua Area)", value: 25 }
                  ].map((r) => (
                    <button
                      key={r.value}
                      type="button"
                      className={`radius-chip ${radiusFilter === r.value ? "active" : ""}`}
                      onClick={() => setRadiusFilter(r.value)}
                    >
                      {r.label}
                    </button>
                  ))}
                </div>
              </div>
            )}
            <div className="chips-grid">
              {JOGJA_SPOTS.map((spot, idx) => (
                <button
                  key={idx}
                  type="button"
                  className={`spot-chip ${selectedSpot === spot ? "selected" : ""}`}
                  onClick={() => handleSpotClick(spot)}
                >
                  {spot}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Kapasitas Chips */}
        {activeTab === "kapasitas" && (
          <div className="chips-row">
            {GUEST_OPTIONS.map((opt, i) => (
              <button
                key={i}
                type="button"
                className={`sub-filter-chip ${
                  guestFilter === opt.value ? "selected" : ""
                }`}
                onClick={() => setGuestFilter(opt.value)}
              >
                {opt.label}
              </button>
            ))}
          </div>
        )}

        {/* Kamar Chips */}
        {activeTab === "kamar" && (
          <div className="chips-row">
            {ROOM_OPTIONS.map((opt, i) => (
              <button
                key={i}
                type="button"
                className={`sub-filter-chip ${
                  bedsFilter === opt.value ? "selected" : ""
                }`}
                onClick={() => setBedsFilter(opt.value)}
              >
                {opt.label}
              </button>
            ))}
          </div>
        )}

        {/* Harga Info */}
        {activeTab === "harga" && (
          <div className="price-sort-info">
            <span>
              Urutan harga saat ini:{" "}
              <strong>
                {sort === "low"
                  ? "Harga Terendah → Tertinggi"
                  : sort === "high"
                  ? "Harga Tertinggi → Terendah"
                  : "Rekomendasi (Default)"}
              </strong>
            </span>
            <button
              type="button"
              className="change-sort-btn"
              onClick={handleToggleSort}
            >
              Ubah Urutan Harga
            </button>
          </div>
        )}
      </div>

      {/* Active Filters Summary Bar */}
      {(selectedSpot || guestFilter || bedsFilter || checkInDate || duration || sort !== "recommended") && (
        <div className="filter-active-summary">
          <div className="active-tags">
            {selectedSpot && (
              <span className="active-tag">
                Spot: {selectedSpot}{" "}
                <FaTimes onClick={() => setSelectedSpot("")} />
              </span>
            )}
            {guestFilter && (
              <span className="active-tag">
                {guestFilter} Tamu <FaTimes onClick={() => setGuestFilter("")} />
              </span>
            )}
            {bedsFilter && (
              <span className="active-tag">
                {bedsFilter}+ Kamar <FaTimes onClick={() => setBedsFilter("")} />
              </span>
            )}
            {checkInDate && (
              <span className="active-tag">
                Tgl: {checkInDate} <FaTimes onClick={() => setCheckInDate("")} />
              </span>
            )}
            {duration && (
              <span className="active-tag">
                Durasi: {duration} Malam <FaTimes onClick={() => setDuration("")} />
              </span>
            )}
            {sort !== "recommended" && (
              <span className="active-tag">
                {sort === "low" ? "Harga Terendah" : "Harga Tertinggi"}{" "}
                <FaTimes onClick={() => setSort("recommended")} />
              </span>
            )}
          </div>
          <button type="button" className="reset-all-btn" onClick={onReset}>
            Reset Filter
          </button>
        </div>
      )}

      {/* Scroll to Top floating arrow icon matching reference SS */}
      <button
        type="button"
        className="scroll-top-float-btn"
        onClick={scrollToTop}
        title="Kembali ke Atas"
      >
        <FaArrowUp />
      </button>
    </div>
  );
}
