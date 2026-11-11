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
import { useLang } from "../context/LanguageContext";
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
  const { lang } = useLang();
  const isEn = lang === "en";

  const [activeTab, setActiveTab] = useState("spot"); // "harga", "kapasitas", "kamar", "spot"
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [showDurationPicker, setShowDurationPicker] = useState(false);

  // Kamus Bahasa
  const txt = {
    selectDateBtn: checkInDate 
      ? (isEn ? `Date: ${checkInDate}` : `Tgl: ${checkInDate}`)
      : (isEn ? "Select Date" : "Pilih Tgl."),
    datePickerTitle: isEn ? "Select Check-in Date" : "Pilih Tanggal Check-in",
    resetDateBtn: isEn ? "Reset Date" : "Reset Tanggal",
    
    durationBtn: duration 
      ? (isEn ? `${duration} Night(s)` : `${duration} Malam`)
      : (isEn ? "Duration" : "Durasi"),
    durationTitle: isEn ? "Select Stay Duration" : "Pilih Durasi Menginap",
    nightLabel: isEn ? "Night" : "Malam",
    resetDurationBtn: isEn ? "Reset Duration" : "Reset Durasi",

    dividerText: isEn ? "Simplify search with filters" : "Permudah pencarian dengan filter",
    
    tabPrice: isEn ? "Price" : "Harga",
    tabCapacity: isEn ? "Capacity" : "Kapasitas",
    tabRooms: isEn ? "Rooms" : "Kamar",
    tabSpot: isEn ? "Tourist Spot" : "Spot Wisata",

    guestUnit: isEn ? "Guests" : "Tamu",
    roomUnit: isEn ? "Rooms" : "Kamar",

    radiusLabel: isEn ? "Filter Radius from" : "Filter Radius dari",
    
    priceSortLabel: isEn ? "Current price order:" : "Urutan harga saat ini:",
    priceLowToHigh: isEn ? "Lowest → Highest Price" : "Harga Terendah → Tertinggi",
    priceHighToLow: isEn ? "Highest → Lowest Price" : "Harga Tertinggi → Terendah",
    priceDefault: isEn ? "Recommended (Default)" : "Rekomendasi (Default)",
    changeSortBtn: isEn ? "Change Price Order" : "Ubah Urutan Harga",

    resetAllBtn: isEn ? "Reset Filter" : "Reset Filter",
    scrollTopTooltip: isEn ? "Back to Top" : "Kembali ke Atas",

    guestOptions: [
      { label: isEn ? "All Guests" : "Semua Tamu", value: "" },
      { label: isEn ? "1-2 Guests" : "1-2 Tamu", value: "2" },
      { label: isEn ? "3-5 Guests" : "3-5 Tamu", value: "5" },
      { label: isEn ? "6-10 Guests" : "6-10 Tamu", value: "10" },
      { label: isEn ? "10+ Guests" : "10+ Tamu", value: "15" }
    ],

    roomOptions: [
      { label: isEn ? "All Rooms" : "Semua Kamar", value: "" },
      { label: isEn ? "1 Room" : "1 Kamar", value: "1" },
      { label: isEn ? "2 Rooms" : "2 Kamar", value: "2" },
      { label: isEn ? "3 Rooms" : "3 Kamar", value: "3" },
      { label: isEn ? "4+ Rooms" : "4+ Kamar", value: "4" }
    ],

    radiusChips: [
      { label: isEn ? "≤ 5 km (Very Close)" : "≤ 5 km (Sangat Dekat)", value: 5 },
      { label: isEn ? "≤ 10 km (Close)" : "≤ 10 km (Dekat)", value: 10 },
      { label: isEn ? "≤ 15 km (Nearby Area)" : "≤ 15 km (Area Sekitar)", value: 15 },
      { label: isEn ? "≤ 25 km (All Areas)" : "≤ 25 km (Semua Area)", value: 25 }
    ]
  };

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
            <span>{txt.selectDateBtn}</span>
          </button>

          {showDatePicker && (
            <div className="filter-popover">
              <div className="popover-header">
                <span>{txt.datePickerTitle}</span>
                <button
                  type="button"
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
                  type="button"
                  className="popover-clear-btn"
                  onClick={() => setCheckInDate("")}
                >
                  {txt.resetDateBtn}
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
            <span>{txt.durationBtn}</span>
          </button>

          {showDurationPicker && (
            <div className="filter-popover">
              <div className="popover-header">
                <span>{txt.durationTitle}</span>
                <button
                  type="button"
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
                    {n} {txt.nightLabel}
                  </button>
                ))}
              </div>
              {duration && (
                <button
                  type="button"
                  className="popover-clear-btn"
                  onClick={() => setDuration("")}
                >
                  {txt.resetDurationBtn}
                </button>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Center Subtitle Divider */}
      <div className="filter-divider-title">
        <span className="divider-line" />
        <span className="divider-text">{txt.dividerText}</span>
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
              <FaSortAmountUp className="pill-icon" /> ↑ {txt.tabPrice}
            </>
          ) : sort === "high" ? (
            <>
              <FaSortAmountDown className="pill-icon" /> ↓ {txt.tabPrice}
            </>
          ) : (
            <>
              <FaSortAmountUp className="pill-icon" /> ↑ {txt.tabPrice}
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
          {txt.tabCapacity} {guestFilter ? `(${guestFilter} ${txt.guestUnit})` : ""}
        </button>

        <button
          type="button"
          className={`filter-tab-pill ${
            activeTab === "kamar" || bedsFilter ? "active" : ""
          }`}
          onClick={() => setActiveTab(activeTab === "kamar" ? "spot" : "kamar")}
        >
          <FaBed className="pill-icon" />
          {txt.tabRooms} {bedsFilter ? `(${bedsFilter}+)` : ""}
        </button>

        <button
          type="button"
          className={`filter-tab-pill bold-tab ${
            activeTab === "spot" || selectedSpot ? "active" : ""
          }`}
          onClick={() => setActiveTab("spot")}
        >
          <FaMapMarkerAlt className="pill-icon" />
          {txt.tabSpot} {selectedSpot ? `: ${selectedSpot}` : ""}
        </button>
      </div>

      {/* Active Sub-Filter Content */}
      <div className="filter-chips-container">
        {/* Spot Wisata Chips */}
        {activeTab === "spot" && (
          <div className="spot-tab-wrapper">
            {selectedSpot && (
              <div className="radius-selector-bar">
                <span className="radius-label">📍 {txt.radiusLabel} {selectedSpot}:</span>
                <div className="radius-chips">
                  {txt.radiusChips.map((r) => (
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
            {txt.guestOptions.map((opt, i) => (
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
            {txt.roomOptions.map((opt, i) => (
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
              {txt.priceSortLabel}{" "}
              <strong>
                {sort === "low"
                  ? txt.priceLowToHigh
                  : sort === "high"
                  ? txt.priceHighToLow
                  : txt.priceDefault}
              </strong>
            </span>
            <button
              type="button"
              className="change-sort-btn"
              onClick={handleToggleSort}
            >
              {txt.changeSortBtn}
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
                {guestFilter} {txt.guestUnit} <FaTimes onClick={() => setGuestFilter("")} />
              </span>
            )}
            {bedsFilter && (
              <span className="active-tag">
                {bedsFilter}+ {txt.roomUnit} <FaTimes onClick={() => setBedsFilter("")} />
              </span>
            )}
            {checkInDate && (
              <span className="active-tag">
                {txt.selectDateBtn} <FaTimes onClick={() => setCheckInDate("")} />
              </span>
            )}
            {duration && (
              <span className="active-tag">
                {duration} {txt.nightLabel} <FaTimes onClick={() => setDuration("")} />
              </span>
            )}
            {sort !== "recommended" && (
              <span className="active-tag">
                {sort === "low" ? txt.priceLowToHigh.split("→")[0] : txt.priceHighToLow.split("→")[0]}{" "}
                <FaTimes onClick={() => setSort("recommended")} />
              </span>
            )}
          </div>
          <button type="button" className="reset-all-btn" onClick={onReset}>
            {txt.resetAllBtn}
          </button>
        </div>
      )}

      {/* Scroll to Top floating arrow icon */}
      <button
        type="button"
        className="scroll-top-float-btn"
        onClick={scrollToTop}
        title={txt.scrollTopTooltip}
      >
        <FaArrowUp />
      </button>
    </div>
  );
}