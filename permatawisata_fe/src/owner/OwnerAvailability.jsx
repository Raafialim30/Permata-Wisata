import React, {
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";

import {
  ArrowLeft,
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  CheckCircle2,
  Home,
  RefreshCw,
  BedDouble,
  XCircle,
} from "lucide-react";

import API_BASE_URL from "../config";

import "./css/OwnerAvailability.css";


const OwnerAvailability = () => {
  // =========================================================
  // STATE
  // =========================================================

  const [villas, setVillas] = useState([]);

  const [selectedVilla, setSelectedVilla] = useState(null);

  const [villaDetails, setVillaDetails] = useState([]);

  const [selectedUnit, setSelectedUnit] = useState(null);

  const [currentDate, setCurrentDate] = useState(new Date());

  const [bookedDates, setBookedDates] = useState([]);

  const [selectedDay, setSelectedDay] = useState(null);

  const [loadingVillas, setLoadingVillas] = useState(true);

  const [loadingUnits, setLoadingUnits] = useState(false);

  const [loadingDates, setLoadingDates] = useState(false);

  const [error, setError] = useState("");


  // =========================================================
  // AUTH
  // =========================================================

  const token = localStorage.getItem("token");

  const userData = localStorage.getItem("user");

  const ownerId = useMemo(() => {
    try {
      const parsedUser = JSON.parse(userData || "{}");

      return parsedUser?.id || null;
    } catch (err) {
      console.error("Data user tidak valid:", err);

      return null;
    }
  }, [userData]);


  // =========================================================
  // BULAN
  // =========================================================

  const selectedMonth = currentDate.getMonth();

  const selectedYear = currentDate.getFullYear();


  const monthNames = [
    "Januari",
    "Februari",
    "Maret",
    "April",
    "Mei",
    "Juni",
    "Juli",
    "Agustus",
    "September",
    "Oktober",
    "November",
    "Desember",
  ];


  // =========================================================
  // HEADER API
  // =========================================================

  const getHeaders = useCallback(() => {
    const headers = {
      "Content-Type": "application/json",
    };

    if (token) {
      headers.Authorization = `Bearer ${token}`;
    }

    if (ownerId) {
      headers["X-Owner-User-Id"] = String(ownerId);
    }

    return headers;
  }, [token, ownerId]);


  // =========================================================
  // GET NAMA VILLA
  // =========================================================

  const getVillaName = useCallback((villa) => {
    return (
      villa?.name ||
      villa?.villa_name ||
      `Villa ${villa?.id || ""}`
    );
  }, []);


  // =========================================================
  // GET NAMA UNIT
  // =========================================================

  const getUnitName = useCallback((unit) => {
    return (
      unit?.name ||
      unit?.room_name ||
      unit?.unit_name ||
      unit?.nama_unit ||
      unit?.room ||
      unit?.title ||
      (unit?.bed_info
        ? String(unit.bed_info).replace(/^kamar\s*:\s*/i, "").trim()
        : `Unit ${unit?.id || ""}`)
    );
  }, []);


  // =========================================================
  // GET TIPE KAMAR / SUB-VILLA
  // =========================================================

  const getUnitType = useCallback((unit) => {
    if (unit?.room_type) {
      return String(unit.room_type).trim();
    }

    const raw = unit?.bed_info
      ? String(unit.bed_info).replace(/^kamar\s*:\s*/i, "").trim()
      : "";

    const match = raw.match(/^(.*?)\s*\((.*)\)\s*$/);

    if (match) {
      let type = match[2].trim();

      while (type.startsWith("(") && type.endsWith(")")) {
        type = type.slice(1, -1).trim();
      }

      return type;
    }

    return "";
  }, []);


  // =========================================================
  // GET GAMBAR UNIT
  // =========================================================

  const getUnitImage = useCallback((unit) => {
    if (!unit) {
      return null;
    }

    /*
     * STRUKTUR FOTO FRONTEND ANDA:
     *
     * public/
     *   images/
     *     villas/
     *       villa_1/
     *         rooms/
     *           room_1/
     *             1.png
     *             2.png
     *             ...
     *           room_2/
     *             1.png
     *
     * Karena folder public React otomatis disajikan dari root URL,
     * maka file:
     *
     * public/images/villas/villa_1/rooms/room_1/1.png
     *
     * dipanggil dengan:
     *
     * /images/villas/villa_1/rooms/room_1/1.png
     *
     * Database hanya menyimpan nama file seperti "1.png",
     * sehingga path folder dibentuk dari villa_id + id detail kamar.
     */

    const villaId = unit?.villa_id;
    const roomId = unit?.id;

    if (villaId && roomId) {
      const fileName =
        String(unit?.img || unit?.image || "1.png")
          .trim() || "1.png";

      // Jika database suatu saat sudah menyimpan URL lengkap,
      // gunakan URL tersebut langsung.
      if (/^(https?:)?\/\//i.test(fileName) || fileName.startsWith("/")) {
        return fileName;
      }

      return `/images/villas/villa_${villaId}/rooms/room_${roomId}/${encodeURIComponent(fileName)}`;
    }

    // Fallback untuk data lama yang sudah mempunyai URL gambar.
    return (
      unit?.image ||
      unit?.image_url ||
      unit?.room_image ||
      unit?.photo ||
      unit?.foto ||
      unit?.gambar ||
      null
    );
  }, []);


  // =========================================================
  // GET DESKRIPSI UNIT
  // =========================================================

  const getUnitDescription = useCallback((unit) => {
    return (
      unit?.description ||
      unit?.deskripsi ||
      unit?.detail ||
      ""
    );
  }, []);


  // =========================================================
  // GET HARGA UNIT
  // =========================================================

  const getUnitPrice = useCallback((unit) => {
    const value =
      unit?.price ??
      unit?.harga ??
      unit?.room_price ??
      unit?.unit_price;

    if (
      value === null ||
      value === undefined ||
      value === ""
    ) {
      return null;
    }

    const number = Number(value);

    if (Number.isNaN(number)) {
      return null;
    }

    return new Intl.NumberFormat("id-ID").format(number);
  }, []);


  // =========================================================
  // GET KAPASITAS UNIT
  // =========================================================

  const getUnitCapacity = useCallback((unit) => {
    return (
      unit?.capacity ||
      unit?.kapasitas ||
      unit?.max_guests ||
      unit?.guests ||
      null
    );
  }, []);


  // =========================================================
  // AMBIL VILLA MILIK OWNER
  // =========================================================

  const fetchVillas = useCallback(async () => {
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

      if (!response.ok) {
        throw new Error(
          data?.error ||
          data?.message ||
          "Gagal mengambil data villa."
        );
      }

      let villaList = [];

      if (Array.isArray(data)) {
        villaList = data;
      } else if (Array.isArray(data?.data)) {
        villaList = data.data;
      } else if (Array.isArray(data?.villas)) {
        villaList = data.villas;
      }

      setVillas(villaList);

    } catch (err) {
      console.error(
        "Gagal mengambil villa:",
        err
      );

      setError(
        err.message ||
        "Data villa tidak dapat dimuat."
      );

      setVillas([]);

    } finally {
      setLoadingVillas(false);
    }
  }, [getHeaders]);


  // =========================================================
  // AMBIL UNIT DALAM VILLA
  // =========================================================

  const fetchVillaDetails = useCallback(
    async (villa) => {
      if (!villa?.id) {
        setVillaDetails([]);

        return;
      }

      try {
        setLoadingUnits(true);

        setError("");

        const url =
          `${API_BASE_URL}/api/owner/villa-details` +
          `?villa_id=${encodeURIComponent(villa.id)}`;

        const response = await fetch(
          url,
          {
            method: "GET",
            headers: getHeaders(),
          }
        );

        const data = await response.json();

        if (!response.ok) {
          throw new Error(
            data?.error ||
            data?.message ||
            "Gagal mengambil unit villa."
          );
        }

        let units = [];

        if (Array.isArray(data)) {
          units = data;
        } else if (Array.isArray(data?.data)) {
          units = data.data;
        } else if (Array.isArray(data?.details)) {
          units = data.details;
        } else if (
          Array.isArray(data?.villa_details)
        ) {
          units = data.villa_details;
        }

        setVillaDetails(units);

      } catch (err) {
        console.error(
          "Gagal mengambil unit:",
          err
        );

        setVillaDetails([]);

        setError(
          err.message ||
          "Unit villa tidak dapat dimuat."
        );

      } finally {
        setLoadingUnits(false);
      }
    },
    [getHeaders]
  );


  // =========================================================
  // AMBIL TANGGAL BOOKING UNIT
  // =========================================================

  const fetchBookedDates = useCallback(
    async () => {
      if (
        !selectedVilla?.id ||
        !selectedUnit?.id
      ) {
        setBookedDates([]);

        return;
      }

      try {
        setLoadingDates(true);

        setError("");

        /*
          JavaScript month:

          Januari   = 0
          Februari  = 1
          Maret     = 2
          ...
          Desember  = 11

          Backend owner_availability.py
          sudah dibuat kompatibel dengan format ini.
        */

        const url =
          `${API_BASE_URL}/api/owner/booked-dates` +
          `?villa_id=${encodeURIComponent(
            selectedVilla.id
          )}` +
          `&villa_detail_id=${encodeURIComponent(
            selectedUnit.id
          )}` +
          `&month=${encodeURIComponent(
            selectedMonth
          )}` +
          `&year=${encodeURIComponent(
            selectedYear
          )}`;

        const response = await fetch(
          url,
          {
            method: "GET",
            headers: getHeaders(),
          }
        );

        const data = await response.json();

        if (!response.ok) {
          throw new Error(
            data?.error ||
            data?.message ||
            "Gagal mengambil jadwal booking."
          );
        }

        let dates = [];

        if (Array.isArray(data)) {
          dates = data;
        } else if (
          Array.isArray(data?.booked_dates)
        ) {
          dates = data.booked_dates;
        } else if (
          Array.isArray(data?.dates)
        ) {
          dates = data.dates;
        }

        setBookedDates(dates);

      } catch (err) {
        console.error(
          "Gagal mengambil tanggal booking:",
          err
        );

        setBookedDates([]);

        setError(
          err.message ||
          "Jadwal booking tidak dapat dimuat."
        );

      } finally {
        setLoadingDates(false);
      }
    },
    [
      getHeaders,
      selectedVilla?.id,
      selectedUnit?.id,
      selectedMonth,
      selectedYear,
    ]
  );


  // =========================================================
  // INITIAL LOAD
  // =========================================================

  useEffect(() => {
    fetchVillas();
  }, [fetchVillas]);


  // =========================================================
  // KETIKA VILLA DIPILIH
  // =========================================================

  useEffect(() => {
    if (!selectedVilla?.id) {
      setVillaDetails([]);

      return;
    }

    setSelectedUnit(null);

    setSelectedDay(null);

    setBookedDates([]);

    fetchVillaDetails(selectedVilla);

  }, [
    selectedVilla,
    fetchVillaDetails,
  ]);


  // =========================================================
  // KETIKA UNIT / BULAN BERUBAH
  // =========================================================

  useEffect(() => {
    setSelectedDay(null);

    if (
      selectedVilla?.id &&
      selectedUnit?.id
    ) {
      fetchBookedDates();
    } else {
      setBookedDates([]);
    }

  }, [
    selectedVilla?.id,
    selectedUnit?.id,
    selectedMonth,
    selectedYear,
    fetchBookedDates,
  ]);


  // =========================================================
  // NORMALISASI TANGGAL BOOKING
  // =========================================================

  const normalizedBookedDates = useMemo(() => {
    const result = new Set();

    bookedDates.forEach((item) => {

      // -----------------------------------------------------
      // NUMBER
      // -----------------------------------------------------

      if (typeof item === "number") {
        result.add(String(item));

        return;
      }


      // -----------------------------------------------------
      // STRING
      // -----------------------------------------------------

      if (typeof item === "string") {
        const value = item.trim();

        /*
          Jika backend mengirim:

          1
          2
          15
          29

          maka langsung dianggap sebagai tanggal.
        */

        if (/^\d{1,2}$/.test(value)) {
          result.add(
            String(Number(value))
          );

          return;
        }


        /*
          Jika backend mengirim:

          2026-09-29

          maka kita cek tahun dan bulan.
        */

        const match =
          value.match(
            /^(\d{4})-(\d{2})-(\d{2})$/
          );

        if (match) {
          const itemYear =
            Number(match[1]);

          const itemMonth =
            Number(match[2]) - 1;

          const itemDay =
            Number(match[3]);

          if (
            itemYear === selectedYear &&
            itemMonth === selectedMonth
          ) {
            result.add(
              String(itemDay)
            );
          }
        }

        return;
      }


      // -----------------------------------------------------
      // OBJECT
      // -----------------------------------------------------

      if (
        item &&
        typeof item === "object"
      ) {

        /*
          Contoh:

          {
            day: 29
          }
        */

        if (item.day !== undefined) {
          result.add(
            String(
              Number(item.day)
            )
          );

          return;
        }


        /*
          Contoh:

          {
            date: "2026-09-29"
          }
        */

        if (item.date) {
          const value =
            String(item.date);

          const match =
            value.match(
              /^(\d{4})-(\d{2})-(\d{2})$/
            );

          if (match) {
            const itemYear =
              Number(match[1]);

            const itemMonth =
              Number(match[2]) - 1;

            const itemDay =
              Number(match[3]);

            if (
              itemYear === selectedYear &&
              itemMonth === selectedMonth
            ) {
              result.add(
                String(itemDay)
              );
            }
          }
        }
      }
    });

    return result;

  }, [
    bookedDates,
    selectedMonth,
    selectedYear,
  ]);


  // =========================================================
  // JUMLAH HARI DALAM BULAN
  // =========================================================

  const daysInMonth =
    new Date(
      selectedYear,
      selectedMonth + 1,
      0
    ).getDate();


  // =========================================================
  // HARI PERTAMA BULAN
  // =========================================================

  const firstDayOfMonth =
    new Date(
      selectedYear,
      selectedMonth,
      1
    ).getDay();


  // =========================================================
  // MEMBUAT GRID KALENDER
  // =========================================================

  const calendarDays = useMemo(() => {
    const days = [];

    for (
      let i = 0;
      i < firstDayOfMonth;
      i += 1
    ) {
      days.push(null);
    }

    for (
      let day = 1;
      day <= daysInMonth;
      day += 1
    ) {
      days.push(day);
    }

    return days;

  }, [
    firstDayOfMonth,
    daysInMonth,
  ]);


  // =========================================================
  // CEK BOOKING
  // =========================================================

  const isBooked = useCallback(
    (day) => {
      return normalizedBookedDates.has(
        String(day)
      );
    },
    [normalizedBookedDates]
  );


  // =========================================================
  // CEK HARI INI
  // =========================================================

  const isToday = useCallback(
    (day) => {
      const today = new Date();

      return (
        day === today.getDate() &&
        selectedMonth === today.getMonth() &&
        selectedYear === today.getFullYear()
      );
    },
    [
      selectedMonth,
      selectedYear,
    ]
  );


  // =========================================================
  // PILIH VILLA
  // =========================================================

  const handleOpenVilla = useCallback(
    (villa) => {
      setSelectedVilla(villa);

      setSelectedUnit(null);

      setVillaDetails([]);

      setBookedDates([]);

      setSelectedDay(null);

      setError("");

      setCurrentDate(new Date());
    },
    []
  );


  // =========================================================
  // PILIH UNIT
  // =========================================================

  const handleOpenUnit = useCallback(
    (unit) => {
      setSelectedUnit(unit);

      setSelectedDay(null);

      setBookedDates([]);

      setError("");

      setCurrentDate(new Date());
    },
    []
  );


  // =========================================================
  // KEMBALI KE DAFTAR VILLA
  // =========================================================

  const handleBackToVillas =
    useCallback(() => {

      setSelectedVilla(null);

      setSelectedUnit(null);

      setVillaDetails([]);

      setBookedDates([]);

      setSelectedDay(null);

      setError("");

    }, []);


  // =========================================================
  // KEMBALI KE DAFTAR UNIT
  // =========================================================

  const handleBackToUnits =
    useCallback(() => {

      setSelectedUnit(null);

      setBookedDates([]);

      setSelectedDay(null);

      setError("");

    }, []);


  // =========================================================
  // BULAN SEBELUMNYA
  // =========================================================

  const handlePreviousMonth =
    useCallback(() => {

      setCurrentDate(
        new Date(
          selectedYear,
          selectedMonth - 1,
          1
        )
      );

    }, [
      selectedYear,
      selectedMonth,
    ]);


  // =========================================================
  // BULAN BERIKUTNYA
  // =========================================================

  const handleNextMonth =
    useCallback(() => {

      setCurrentDate(
        new Date(
          selectedYear,
          selectedMonth + 1,
          1
        )
      );

    }, [
      selectedYear,
      selectedMonth,
    ]);


  // =========================================================
  // KEMBALI KE HARI INI
  // =========================================================

  const handleToday =
    useCallback(() => {

      setCurrentDate(new Date());

    }, []);


  // =========================================================
  // PILIH TANGGAL
  // =========================================================

  const handleDayClick =
    useCallback((day) => {

      if (!day) {
        return;
      }

      setSelectedDay(day);

    }, []);


  // =========================================================
  // REFRESH
  // =========================================================

  const handleRefresh =
    useCallback(async () => {

      if (
        selectedVilla &&
        selectedUnit
      ) {
        await fetchBookedDates();

        return;
      }

      if (selectedVilla) {
        await fetchVillaDetails(
          selectedVilla
        );

        return;
      }

      await fetchVillas();

    }, [
      selectedVilla,
      selectedUnit,
      fetchBookedDates,
      fetchVillaDetails,
      fetchVillas,
    ]);


  // =========================================================
  // STATUS LOADING
  // =========================================================

  const isLoading =
    loadingVillas ||
    loadingUnits ||
    loadingDates;


  // =========================================================
  // RENDER
  // =========================================================

  return (
    <div className="owner-availability-page">

      {/* =====================================================
          HEADER
      ===================================================== */}

      <div className="availability-topbar">

        <div className="availability-title">

          <div className="availability-title-icon">
            <CalendarDays size={24} />
          </div>

          <div>
            <h1>Ketersediaan</h1>

            <p>
              Kelola ketersediaan unit villa Anda
            </p>
          </div>

        </div>


        <button
          type="button"
          className="availability-refresh-button"
          onClick={handleRefresh}
          disabled={isLoading}
          title="Refresh data"
        >
          <RefreshCw
            size={18}
            className={
              isLoading
                ? "availability-spin"
                : ""
            }
          />
        </button>

      </div>


      {/* =====================================================
          ERROR
      ===================================================== */}

      {error && (
        <div className="availability-error">

          <XCircle size={18} />

          <span>
            {error}
          </span>

        </div>
      )}


      {/* =====================================================
          STEP 1
          PILIH VILLA
      ===================================================== */}

      {!selectedVilla && (

        <div className="availability-villa-view">

          <div className="availability-section-heading">

            <div>

              <span className="availability-eyebrow">
                PROPERTY
              </span>

              <h2>
                Villa Anda
              </h2>

              <p>
                Pilih villa untuk melihat unit
                dan jadwal ketersediaannya.
              </p>

            </div>

            <span className="availability-count">
              {villas.length} Villa
            </span>

          </div>


          {loadingVillas ? (

            <div className="availability-loading-box">

              <RefreshCw
                size={21}
                className="availability-spin"
              />

              <span>
                Memuat villa...
              </span>

            </div>

          ) : villas.length === 0 ? (

            <div className="availability-empty-villa">

              <div className="availability-empty-icon">
                <Home size={36} />
              </div>

              <h3>
                Belum ada villa
              </h3>

              <p>
                Villa Anda belum tersedia
                pada sistem.
              </p>

            </div>

          ) : (

            <div className="availability-villa-grid">

              {villas.map((villa) => (

                <button
                  type="button"
                  key={villa.id}
                  className="availability-villa-item"
                  onClick={() =>
                    handleOpenVilla(villa)
                  }
                >

                  <div className="availability-villa-icon">
                    <Home size={30} />
                  </div>


                  <div className="availability-villa-info">

                    <span>
                      Villa #{villa.id}
                    </span>

                    <h3>
                      {getVillaName(villa)}
                    </h3>

                    {villa.location && (
                      <p>
                        {villa.location}
                      </p>
                    )}

                  </div>


                  <div className="availability-villa-arrow">

                    <ChevronRight size={21} />

                  </div>

                </button>

              ))}

            </div>

          )}

        </div>

      )}


      {/* =====================================================
          STEP 2
          PILIH UNIT
      ===================================================== */}

      {selectedVilla &&
        !selectedUnit && (

        <div className="availability-unit-view">

          <button
            type="button"
            className="availability-back-button"
            onClick={handleBackToVillas}
          >

            <ArrowLeft size={18} />

            <span>
              Kembali ke Villa
            </span>

          </button>


          {/* VILLA TERPILIH */}

          <div className="availability-selected-villa">

            <div className="availability-selected-villa-icon">

              <Home size={27} />

            </div>

            <div>

              <span>
                Villa
              </span>

              <h2>
                {getVillaName(selectedVilla)}
              </h2>

            </div>

          </div>


          {/* JUDUL UNIT */}

          <div className="availability-section-heading">

            <div>

              <span className="availability-eyebrow">
                UNIT / VARIASI
              </span>

              <h2>
                Pilih Unit
              </h2>

              <p>
                Pilih kamar atau bangunan
                yang ingin Anda lihat jadwalnya.
              </p>

            </div>

            <span className="availability-count">
              {villaDetails.length} Unit
            </span>

          </div>


          {loadingUnits ? (

            <div className="availability-loading-box">

              <RefreshCw
                size={21}
                className="availability-spin"
              />

              <span>
                Memuat unit...
              </span>

            </div>

          ) : villaDetails.length === 0 ? (

            <div className="availability-empty-villa">

              <div className="availability-empty-icon">

                <BedDouble size={36} />

              </div>

              <h3>
                Belum ada unit
              </h3>

              <p>
                Villa ini belum memiliki unit
                yang terdaftar pada sistem.
              </p>

            </div>

          ) : (

            <div className="availability-unit-grid">

              {villaDetails.map((unit) => {

                const image =
                  getUnitImage(unit);

                const price =
                  getUnitPrice(unit);

                const capacity =
                  getUnitCapacity(unit);

                return (

                  <button
                    type="button"
                    key={unit.id}
                    className="availability-unit-item"
                    onClick={() =>
                      handleOpenUnit(unit)
                    }
                  >

                    <div className="availability-unit-image">

                      {image ? (

                        <img
                          src={image}
                          alt={getUnitName(unit)}
                          loading="lazy"
                          onError={(event) => {
                            // Jika gambar pertama tidak ditemukan, coba
                            // kembali ke gambar utama room (1.png).
                            const fallback =
                              unit?.villa_id && unit?.id
                                ? `/images/villas/villa_${unit.villa_id}/rooms/room_${unit.id}/1.png`
                                : null;

                            if (fallback && event.currentTarget.src !== window.location.origin + fallback) {
                              event.currentTarget.src = fallback;
                              return;
                            }

                            event.currentTarget.style.display = "none";
                          }}
                        />

                      ) : (

                        <BedDouble size={34} />

                      )}

                    </div>


                    <div className="availability-unit-info">

                      <span>
                        Kamar / Sub-Villa
                      </span>

                      <h3>
                        {getUnitName(unit)}
                      </h3>

                      {getUnitType(unit) && (
                        <p>
                          {getUnitType(unit)}
                        </p>
                      )}

                      {getUnitDescription(unit) && (
                        <p>
                          {getUnitDescription(unit)}
                        </p>
                      )}

                      <div className="availability-unit-meta">

                        {price && (
                          <span>
                            Rp {price}
                          </span>
                        )}

                        {capacity && (
                          <span>
                            {capacity} tamu
                          </span>
                        )}

                      </div>

                    </div>


                    <div className="availability-unit-arrow">

                      <ChevronRight size={21} />

                    </div>

                  </button>

                );
              })}

            </div>

          )}

        </div>

      )}


      {/* =====================================================
          STEP 3
          KALENDER UNIT
      ===================================================== */}

      {selectedVilla &&
        selectedUnit && (

        <div className="availability-schedule-view">

          <button
            type="button"
            className="availability-back-button"
            onClick={handleBackToUnits}
          >

            <ArrowLeft size={18} />

            <span>
              Kembali ke Unit
            </span>

          </button>


          {/* UNIT TERPILIH */}

          <div className="availability-selected-villa">

            <div className="availability-selected-villa-icon">

              <BedDouble size={27} />

            </div>

            <div>

              <span>
                {getVillaName(selectedVilla)}
              </span>

              <h2>
                {getUnitName(selectedUnit)}
              </h2>

              {getUnitType(selectedUnit) && (
                <small>
                  {getUnitType(selectedUnit)}
                </small>
              )}

            </div>

          </div>


          {/* =================================================
              CALENDAR
          ================================================= */}

          <div className="availability-calendar-card">

            <div className="availability-calendar-top">

              <div>

                <span>
                  KETERSEDIAAN UNIT
                </span>

                <h2>
                  {monthNames[selectedMonth]}{" "}
                  {selectedYear}
                </h2>

              </div>


              <div className="availability-calendar-controls">

                <button
                  type="button"
                  onClick={handlePreviousMonth}
                  title="Bulan sebelumnya"
                >

                  <ChevronLeft size={19} />

                </button>


                <button
                  type="button"
                  className="availability-today-button"
                  onClick={handleToday}
                >
                  Hari Ini
                </button>


                <button
                  type="button"
                  onClick={handleNextMonth}
                  title="Bulan berikutnya"
                >

                  <ChevronRight size={19} />

                </button>

              </div>

            </div>


            {/* LOADING */}

            {loadingDates && (

              <div className="availability-calendar-loading">

                <RefreshCw
                  size={18}
                  className="availability-spin"
                />

                <span>
                  Memuat jadwal...
                </span>

              </div>

            )}


            {/* =================================================
                CALENDAR BODY
            ================================================= */}

            <div className="availability-calendar-body">

              {/* HARI */}

              <div className="availability-weekdays">

                <span>
                  Min
                </span>

                <span>
                  Sen
                </span>

                <span>
                  Sel
                </span>

                <span>
                  Rab
                </span>

                <span>
                  Kam
                </span>

                <span>
                  Jum
                </span>

                <span>
                  Sab
                </span>

              </div>


              {/* TANGGAL */}

              <div className="availability-calendar-grid">

                {calendarDays.map(
                  (day, index) => {

                    if (day === null) {

                      return (
                        <div
                          key={`empty-${index}`}
                          className="availability-day empty"
                        />
                      );

                    }


                    const booked =
                      isBooked(day);

                    const today =
                      isToday(day);

                    const selected =
                      selectedDay === day;


                    return (

                      <button
                        type="button"
                        key={day}
                        className={[
                          "availability-day",

                          booked
                            ? "booked"
                            : "available",

                          today
                            ? "today"
                            : "",

                          selected
                            ? "selected"
                            : "",
                        ]
                          .filter(Boolean)
                          .join(" ")
                        }
                        onClick={() =>
                          handleDayClick(day)
                        }
                      >

                        <strong>
                          {day}
                        </strong>

                        <span>
                          {booked
                            ? "Dibooking"
                            : "Tersedia"}
                        </span>

                        {today && (
                          <small>
                            Hari ini
                          </small>
                        )}

                      </button>

                    );
                  }
                )}

              </div>

            </div>


            {/* =================================================
                LEGEND
            ================================================= */}

            <div className="availability-legend">

              <div>

                <span className="legend-dot available" />

                Tersedia

              </div>


              <div>

                <span className="legend-dot booked" />

                Sudah dibooking

              </div>


              <div>

                <span className="legend-dot today" />

                Hari ini

              </div>

            </div>

          </div>


          {/* =================================================
              DETAIL TANGGAL
          ================================================= */}

          {selectedDay && (

            <div
              className={
                `availability-day-detail ${
                  isBooked(selectedDay)
                    ? "booked"
                    : "available"
                }`
              }
            >

              <div className="availability-day-detail-icon">

                {isBooked(selectedDay) ? (

                  <XCircle size={25} />

                ) : (

                  <CheckCircle2 size={25} />

                )}

              </div>


              <div>

                <span>

                  {selectedDay}{" "}

                  {monthNames[selectedMonth]}{" "}

                  {selectedYear}

                </span>


                <strong>

                  {isBooked(selectedDay)
                    ? "Kamar / Sub-Villa sudah dibooking"
                    : "Kamar / Sub-Villa tersedia untuk disewa"}

                </strong>

              </div>

            </div>

          )}

        </div>

      )}

    </div>
  );
};


export default OwnerAvailability;