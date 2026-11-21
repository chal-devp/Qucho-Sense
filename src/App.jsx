
import { useEffect, useState } from "react";

const FIREBASE_URL =
  "https://quchosense-default-rtdb.firebaseio.com";

const ESP32_URL = "http://192.168.4.1";

const DB_NAME = "QuchoSenseDB";

function openDatabase() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, 1);

    request.onupgradeneeded = (event) => {
      const db = event.target.result;

      if (!db.objectStoreNames.contains("batches")) {
        db.createObjectStore("batches", { keyPath: "id" });
      }

      if (!db.objectStoreNames.contains("logs")) {
        const store = db.createObjectStore("logs", {
          keyPath: "logId",
          autoIncrement: true,
        });

        store.createIndex("batchId", "batchId");
      }
    };

    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

function getAll(db, storeName) {
  return new Promise((resolve, reject) => {
    const request = db
      .transaction(storeName, "readonly")
      .objectStore(storeName)
      .getAll();

    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

function saveRecord(db, storeName, record) {
  return new Promise((resolve, reject) => {
    const request = db
      .transaction(storeName, "readwrite")
      .objectStore(storeName)
      .put(record);

    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

function addRecord(db, storeName, record) {
  return new Promise((resolve, reject) => {
    const request = db
      .transaction(storeName, "readwrite")
      .objectStore(storeName)
      .add(record);

    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

function StatCard({ title, value, subtitle }) {
  return (
    <div className="rounded-xl border border-slate-700 bg-slate-800 p-5">
      <p className="text-sm text-slate-400">{title}</p>
      <h2 className="my-2 text-3xl font-bold text-white">{value}</h2>
      <p className="text-sm text-emerald-400">{subtitle}</p>
    </div>
  );
}
const DEMO_USERS = [
  {
    name: "Cooperative Administrator",
    email: "admin@quchosense.com",
    password: "admin123",
    role: "Administrator",
  },
  {
    name: "Sample Farmer",
    email: "farmer@quchosense.com",
    password: "farmer123",
    role: "Farmer",
  },
  {
    name: "Quality Inspector",
    email: "inspector@quchosense.com",
    password: "inspector123",
    role: "Inspector",
  },
];
 function App() {



// Quality and hardware connection states
const [quality, setQuality] = useState(null);
const [criticalProximity, setCriticalProximity] = useState(null);
const [qualityStatus, setQualityStatus] = useState("Waiting for hardware");
const [sensorConnected, setSensorConnected] = useState(false);
const [demoMode, setDemoMode] = useState(false);
const [lastUpdated, setLastUpdated] = useState("--");

// Database and batch states
const [db, setDb] = useState(null);
const [batches, setBatches] = useState([]);
const [activeBatch, setActiveBatch] = useState("");
const [selectedBatch, setSelectedBatch] = useState(null);
const [logs, setLogs] = useState([]);

// Sensor states
const [temp, setTemp] = useState(0);
const [moist, setMoist] = useState(0);
const [pump, setPump] = useState("OFF");

// Dashboard states
const [syncStatus, setSyncStatus] = useState("Initializing...");
const [tab, setTab] = useState("live");

// Farmer and crop states
const [farmer, setFarmer] = useState("");
const [kebele, setKebele] = useState("");
const [crop, setCrop] = useState("እንሰት (ቆጮ)");

// Login states
const [currentUser, setCurrentUser] = useState(null);
const [loginEmail, setLoginEmail] = useState("");
const [loginPassword, setLoginPassword] = useState("");
const [loginError, setLoginError] = useState("");

// Landing page and registration states
const [page, setPage] = useState("landing");
const [registeredUsers, setRegisteredUsers] = useState([]);
const [registerName, setRegisterName] = useState("");
const [registerEmail, setRegisterEmail] = useState("");
const [registerPassword, setRegisterPassword] = useState("");
const [confirmPassword, setConfirmPassword] = useState("");

  useEffect(() => {
    let mounted = true;

    async function initialize() {
      try {
        const database = await openDatabase();
        if (!mounted) {
          database.close();
          return;
        }

        setDb(database);

        let existingBatches = await getAll(database, "batches");

        if (existingBatches.length === 0) {
          await addRecord(database, "batches", {
            id: "WKT-001",
            farmer: "የወልቂጤ ገበሬዎች ማህበር",
            kebele: "እምድብር",
            crop: "እንሰት (ቆጮ)",
           quality: null,
            date: new Date().toLocaleDateString(),
          });

          existingBatches = await getAll(database, "batches");
        }

        setBatches(existingBatches);
        setActiveBatch(existingBatches[0]?.id || "");
        setSelectedBatch(existingBatches[0] || null);
        setSyncStatus("🟡 Local database ready");
      } catch (error) {
        console.error(error);
        setSyncStatus("Database error");
      }
    }

    initialize();

    return () => {
      mounted = false;
    };
  }, []);

function handleLogin(event) {
  event.preventDefault();

  const allUsers = [...DEMO_USERS, ...registeredUsers];

  const user = allUsers.find(
    (item) =>
      item.email === loginEmail.trim().toLowerCase() &&
      item.password === loginPassword
  );

  if (!user) {
    setLoginError("Invalid email or password.");
    return;
  }

  setCurrentUser(user);
  setLoginError("");
  setLoginPassword("");
}
function handleRegister(event) {
  event.preventDefault();

  if (registerPassword.length < 6) {
    setLoginError("Password must contain at least 6 characters.");
    return;
  }

  if (registerPassword !== confirmPassword) {
    setLoginError("Passwords do not match.");
    return;
  }

  const allUsers = [...DEMO_USERS, ...registeredUsers];

  const email = registerEmail.trim().toLowerCase();

  const emailExists = allUsers.some(
    (user) => user.email === email
  );

  if (emailExists) {
    setLoginError("This email is already registered.");
    return;
  }

  const newUser = {
    name: registerName.trim(),
    email,
    password: registerPassword,
    role: "Cooperative Administrator",
  };

  setRegisteredUsers((previous) => [...previous, newUser]);

  setLoginEmail(email);
  setLoginPassword("");
  setRegisterName("");
  setRegisterEmail("");
  setRegisterPassword("");
  setConfirmPassword("");
  setLoginError("");

  setPage("login");
}
function handleLogout() {
  setCurrentUser(null);
  setLoginEmail("");
  setLoginPassword("");
  setTab("live");
}
  // Load sensor logs when batch changes
  async function loadLogs(database = db, batchId = activeBatch) {
    if (!database || !batchId) return;

    const allLogs = await getAll(database, "logs");

    setLogs(
      allLogs
        .filter((log) => log.batchId === batchId)
        .sort((a, b) => b.logId - a.logId)
        .slice(0, 10)
    );
  }

  useEffect(() => {
    if (db && activeBatch) {
      loadLogs(db, activeBatch);
    }
  }, [db, activeBatch]);

  // Sync a sensor log to Firebase
  async function syncLogToCloud(log) {
    if (!navigator.onLine) {
      setSyncStatus("🟡 Offline - saved locally");
      return;
    }

    try {
      const response = await fetch(
        `${FIREBASE_URL}/logs/${log.batchId}.json`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(log),
        }
      );

      if (!response.ok) throw new Error("Firebase sync failed");

      const updatedLog = { ...log, synced: true };
      await saveRecord(db, "logs", updatedLog);

      setSyncStatus("🟢 Cloud synced");
      await loadLogs();
    } catch (error) {
      console.error(error);
      setSyncStatus("🟡 Local saved - cloud unavailable");
    }
  }

  // Read ESP32 or use demo sensor readings
  
async function pollSensor() {
  if (!db || !activeBatch) return;

  try {
    const response = await fetch(`${ESP32_URL}/data`);

    if (!response.ok) {
      throw new Error("ESP32 unavailable");
    }

    const data = await response.json();

    const temperature = Number(data.temp);
    const moisture = Number(data.moist);
   const pumpStatus =
  data.pump === true ||
  data.pump === 1 ||
  String(data.pump).toUpperCase() === "ON"
    ? "ON"
    : "OFF";

    // Accept common property names from the ESP32.
    const qualityValue =
      data.quality ??
      data.qualityPercent ??
      data.quality_percentage;

    const proximityValue =
      data.criticalProximity ??
      data.proximityPercent ??
      data.critical_proximity ??
      data.riskPercent;

    const qualityNumber =
      qualityValue !== undefined && qualityValue !== null &&
      qualityValue !== ""
        ? Number(qualityValue)
        : null;

    const proximityNumber =
      proximityValue !== undefined && proximityValue !== null &&
      proximityValue !== ""
        ? Number(proximityValue)
        : null;

    setTemp(temperature);
    setMoist(moisture);
    setPump(pumpStatus);

    setQuality(
      Number.isFinite(qualityNumber) ? qualityNumber : null
    );

    setCriticalProximity(
      Number.isFinite(proximityNumber) ? proximityNumber : null
    );

    setQualityStatus(
      data.qualityStatus ??
      data.quality_status ??
      "Not provided by hardware"
    );

    setSensorConnected(true);
    setDemoMode(false);
    setLastUpdated(new Date().toLocaleTimeString());

    const log = {
      batchId: activeBatch,
      time: new Date().toLocaleTimeString(),
      temp: temperature,
      moist: moisture,
      pump: pumpStatus,
      quality: Number.isFinite(qualityNumber)
        ? qualityNumber
        : null,
      criticalProximity: Number.isFinite(proximityNumber)
        ? proximityNumber
        : null,
      qualityStatus:
        data.qualityStatus ?? data.quality_status ?? "Unknown",
      source: "ESP32",
      synced: false,
    };

    const logId = await addRecord(db, "logs", log);
    const savedLog = { ...log, logId };

    await loadLogs(db, activeBatch);
    await syncLogToCloud(savedLog);
  } catch (error) {
    console.warn("ESP32 unavailable:", error);

    // Demo readings are only for testing the dashboard.
    const temperature = Number(
      (25 + Math.random() * 2).toFixed(1)
    );
    const moisture = Math.floor(58 + Math.random() * 6);

    setTemp(temperature);
    setMoist(moisture);
    setPump("OFF");

    // Never pretend simulated values are actual quality measurements.
    setQuality(null);
    setCriticalProximity(null);
    setQualityStatus("Hardware data unavailable");

    setSensorConnected(false);
    setDemoMode(true);
    setLastUpdated(new Date().toLocaleTimeString());

    const log = {
      batchId: activeBatch,
      time: new Date().toLocaleTimeString(),
      temp: temperature,
      moist: moisture,
      pump: "OFF",
      quality: null,
      criticalProximity: null,
      qualityStatus: "Unavailable",
      source: "DEMO",
      synced: false,
    };

    try {
      const logId = await addRecord(db, "logs", log);
      await loadLogs(db, activeBatch);
    } catch (saveError) {
      console.error("Could not save demo reading:", saveError);
    }
  }
}


  // Poll every four seconds
// Poll sensor sequentially every four seconds
useEffect(() => {
  if (!db || !activeBatch) return;

  let cancelled = false;
  let timeoutId;

  async function pollRepeatedly() {
    if (cancelled) return;

    await pollSensor();

    if (!cancelled) {
      timeoutId = setTimeout(pollRepeatedly, 4000);
    }
  }

  pollRepeatedly();

  return () => {
    cancelled = true;
    clearTimeout(timeoutId);
  };
}, [db, activeBatch]);

  // Register a new batch
  async function createBatch(event) {
    event.preventDefault();

    const newBatch = {
      id: "WKT-" + Math.floor(100 + Math.random() * 900),
      farmer: farmer.trim() || "ያልተጠቀሰ",
      kebele: kebele.trim() || "ወልቂጤ",
      crop,
      quality: null,
      date: new Date().toLocaleDateString(),
    };

    try {
      await addRecord(db, "batches", newBatch);

      const updated = await getAll(db, "batches");

      setBatches(updated);
      setActiveBatch(newBatch.id);
      setSelectedBatch(newBatch);

      setFarmer("");
      setKebele("");

      syncBatchToCloud(newBatch);

      alert(`ባች ${newBatch.id} በተሳካ ሁኔታ ተመዝግቧል!`);
    } catch (error) {
      console.error(error);
      alert("Batch registration failed.");
    }
  }

  // Sync a batch to Firebase
  async function syncBatchToCloud(batch) {
    if (!navigator.onLine) return;

    try {
      await fetch(`${FIREBASE_URL}/batches/${batch.id}.json`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(batch),
      });
    } catch (error) {
      console.error("Batch cloud sync failed:", error);
    }
  }

  // Generate QR code
function getQrUrl(batch) {
  if (!batch) return "";

  const qrData = encodeURIComponent(
    `QuchoSense|ID:${batch.id}|Farmer:${batch.farmer}|Crop:${batch.crop}|Quality:${
      batch.quality == null ? "Not measured" : `${batch.quality}%`
    }`
  );

  return `https://api.qrserver.com/v1/create-qr-code/?size=180x180&data=${qrData}`;
}

  // Export logs as CSV
  async function exportCSV() {
    if (!db) return;

    const allLogs = await getAll(db, "logs");

const rows = [
  [
    "BatchID",
    "Time",
    "Temperature(C)",
    "Moisture(%)",
    "Quality(%)",
    "CriticalProximity(%)",
    "QualityStatus",
    "Pump",
    "Source",
  ],
  ...allLogs.map((log) => [
    log.batchId,
    log.time,
    log.temp,
    log.moist,
    log.quality ?? "",
    log.criticalProximity ?? "",
    log.qualityStatus ?? "",
    log.pump,
    log.source ?? "",
  ]),
];
    const csv = rows
      .map((row) =>
        row.map((value) => `"${String(value).replace(/"/g, '""')}"`).join(",")
      )
      .join("\n");

    const blob = new Blob(["\uFEFF" + csv], {
      type: "text/csv;charset=utf-8;",
    });

    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");

    link.href = url;
    link.download = "QuchoSense_Database.csv";
    link.click();

    URL.revokeObjectURL(url);
  }

  const tabs = [
    { id: "live", label: "📡 ቀጥታ ንባብ" },
    { id: "batches", label: "📦 ምዝገባ" },
    { id: "passport", label: "🪪 QR ሰርተፍኬት" },
  ];

  const currentBatch = batches.find((b) => b.id === activeBatch);

if (!currentUser) {
  return (
    <div className="min-h-screen bg-slate-950 text-white">

      {/* HEADER / NAVIGATION */}
      <header className="sticky top-0 z-50 border-b border-slate-800 bg-slate-950/95 px-6 py-5 backdrop-blur">
        <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-5">

          {/* Logo */}
          <button
            onClick={() => setPage("landing")}
            className="text-2xl font-bold text-emerald-400"
          >
            🌱 Qucho-Sense
          </button>

          {/* Navigation Links */}
          <nav className="flex flex-wrap items-center gap-6 text-sm font-semibold">

            <button
              onClick={() => setPage("landing")}
              className="text-white hover:text-emerald-400"
            >
              Home
            </button>

            <a
              href="#about"
              onClick={() => setPage("landing")}
              className="text-slate-300 hover:text-emerald-400"
            >
              About
            </a>

            <a
              href="#services"
              onClick={() => setPage("landing")}
              className="text-slate-300 hover:text-emerald-400"
            >
              Services
            </a>

          </nav>

          {/* Account Buttons */}
          <div className="flex items-center gap-3">

            <button
              onClick={() => {
                setPage("login");
                setLoginError("");
              }}
              className="rounded-lg border border-slate-600 px-5 py-2 text-sm hover:bg-slate-800"
            >
              Login
            </button>

            <button
              onClick={() => {
                setPage("register");
                setLoginError("");
              }}
              className="rounded-lg bg-emerald-500 px-5 py-2 text-sm font-bold text-emerald-950 hover:bg-emerald-400"
            >
              Register
            </button>

          </div>
        </div>
      </header>

      {/* HOME PAGE */}
      {page === "landing" && (
        <main>

          {/* HERO SECTION */}
          <section
            id="home"
            className="mx-auto grid min-h-[650px] max-w-7xl items-center gap-12 px-6 py-20 md:grid-cols-2"
          >

            <div>
              <p className="mb-4 font-semibold tracking-widest text-emerald-400">
                SMART AGRICULTURAL TECHNOLOGY
              </p>

              <h1 className="text-4xl font-bold leading-tight md:text-6xl">
                Monitor Product Quality.
                <span className="text-emerald-400">
                  {" "}Build Trust.
                </span>
              </h1>

              <p className="mt-6 max-w-xl leading-8 text-slate-400">
                Qucho-Sense is a smart agricultural product quality
                monitoring and traceability system. It uses hardware
                sensors to monitor agricultural product conditions
                and provides digital records for cooperatives,
                farmers, inspectors, and buyers.
              </p>

              <div className="mt-8 flex flex-wrap gap-4">

                <button
                  onClick={() => setPage("register")}
                  className="rounded-lg bg-emerald-500 px-6 py-3 font-bold text-emerald-950 hover:bg-emerald-400"
                >
                  Get Started
                </button>

                <a
                  href="#about"
                  className="rounded-lg border border-slate-600 px-6 py-3 hover:bg-slate-800"
                >
                  Learn More
                </a>

              </div>
            </div>

            {/* Hero Information Card */}
            <div className="rounded-2xl border border-slate-700 bg-slate-900 p-8">

              <div className="mb-6 text-center text-7xl">
                🌱
              </div>

              <h2 className="text-center text-3xl font-bold text-emerald-400">
                Qucho-Sense
              </h2>

              <p className="mt-3 text-center text-sm text-slate-400">
                Smart Agricultural Product Quality Monitoring
                & Traceability System
              </p>

              <div className="mt-8 grid grid-cols-2 gap-4">

                <div className="rounded-xl bg-slate-800 p-5 text-center">
                  <div className="text-3xl">📡</div>
                  <p className="mt-2 text-sm font-semibold">
                    Hardware Monitoring
                  </p>
                </div>

                <div className="rounded-xl bg-slate-800 p-5 text-center">
                  <div className="text-3xl">📊</div>
                  <p className="mt-2 text-sm font-semibold">
                    Quality Tracking
                  </p>
                </div>

                <div className="rounded-xl bg-slate-800 p-5 text-center">
                  <div className="text-3xl">📦</div>
                  <p className="mt-2 text-sm font-semibold">
                    Batch Registration
                  </p>
                </div>

                <div className="rounded-xl bg-slate-800 p-5 text-center">
                  <div className="text-3xl">🔎</div>
                  <p className="mt-2 text-sm font-semibold">
                    QR Traceability
                  </p>
                </div>

              </div>
            </div>
          </section>

          {/* ABOUT SECTION */}
          <section
            id="about"
            className="scroll-mt-24 border-t border-slate-800 bg-slate-900 px-6 py-24"
          >
            <div className="mx-auto max-w-6xl">

              <p className="font-semibold tracking-widest text-emerald-400">
                ABOUT US
              </p>

              <h2 className="mt-3 text-3xl font-bold md:text-4xl">
                About Qucho-Sense
              </h2>

              <p className="mt-6 max-w-3xl leading-8 text-slate-400">
                Qucho-Sense aims to improve agricultural product
                quality monitoring and traceability. Its main
                component is smart hardware that monitors product
                conditions using sensors. The additional digital
                platform helps users register agricultural batches,
                view monitoring records, and access product
                information.
              </p>

              <div className="mt-10 grid gap-6 md:grid-cols-2">

                <div className="rounded-xl border border-slate-700 bg-slate-800 p-6">
                  <h3 className="text-xl font-bold text-emerald-400">
                    Our Mission
                  </h3>
                  <p className="mt-3 leading-7 text-slate-400">
                    To support agricultural producers with better
                    product condition monitoring and reliable
                    quality information.
                  </p>
                </div>

                <div className="rounded-xl border border-slate-700 bg-slate-800 p-6">
                  <h3 className="text-xl font-bold text-emerald-400">
                    Our Vision
                  </h3>
                  <p className="mt-3 leading-7 text-slate-400">
                    To contribute to a more transparent, trusted,
                    and technology-supported agricultural supply chain.
                  </p>
                </div>

              </div>
            </div>
          </section>

          {/* SERVICES SECTION */}
          <section
            id="services"
            className="scroll-mt-24 px-6 py-24"
          >
            <div className="mx-auto max-w-6xl">

              <p className="font-semibold tracking-widest text-emerald-400">
                WHAT WE OFFER
              </p>

              <h2 className="mt-3 text-3xl font-bold md:text-4xl">
                Our Services
              </h2>

              <p className="mt-4 max-w-2xl text-slate-400">
                Qucho-Sense combines smart hardware monitoring
                with digital tools for agricultural product management.
              </p>

              <div className="mt-10 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">

                {[
                  {
                    icon: "📡",
                    title: "Real-Time Monitoring",
                    description: "Monitor agricultural product conditions through connected hardware."
                  },
                  {
                    icon: "🌡️",
                    title: "Temperature Monitoring",
                    description: "Track temperature readings to understand product storage conditions."
                  },
                  {
                    icon: "💧",
                    title: "Moisture Monitoring",
                    description: "Monitor moisture levels using hardware sensor measurements."
                  },
                  {
                    icon: "📦",
                    title: "Batch Registration",
                    description: "Register farmers, agricultural products, and production batches."
                  },
                  {
                    icon: "🔎",
                    title: "QR Traceability",
                    description: "Generate QR codes containing registered product information."
                  },
                  {
                    icon: "📊",
                    title: "Quality Reports",
                    description: "Review sensor history and export monitoring records."
                  }
                ].map((service) => (
                  <div
                    key={service.title}
                    className="rounded-xl border border-slate-700 bg-slate-900 p-6 transition hover:border-emerald-500"
                  >
                    <div className="text-4xl">{service.icon}</div>

                    <h3 className="mt-4 text-lg font-bold text-white">
                      {service.title}
                    </h3>

                    <p className="mt-3 text-sm leading-7 text-slate-400">
                      {service.description}
                    </p>
                  </div>
                ))}

              </div>
            </div>
          </section>

          {/* CALL TO ACTION */}
          <section className="border-t border-slate-800 bg-emerald-950 px-6 py-20 text-center">

            <h2 className="text-3xl font-bold">
              Start Using Qucho-Sense
            </h2>

            <p className="mx-auto mt-4 max-w-xl text-emerald-100/70">
              Register your cooperative account and begin
              managing agricultural product monitoring records.
            </p>

            <button
              onClick={() => setPage("register")}
              className="mt-7 rounded-lg bg-emerald-400 px-8 py-3 font-bold text-emerald-950 hover:bg-emerald-300"
            >
              Create Account
            </button>

          </section>

        </main>
      )}

      {/* LOGIN PAGE */}
      {page === "login" && (
        <div className="mx-auto max-w-md px-6 py-16">

          <div className="rounded-2xl border border-slate-700 bg-slate-900 p-8">

            <h2 className="text-2xl font-bold">
              Welcome Back
            </h2>

            <p className="mt-2 text-sm text-slate-400">
              Login to access your Qucho-Sense dashboard.
            </p>

            <form onSubmit={handleLogin} className="mt-8 space-y-5">

              <input
                type="email"
                required
                value={loginEmail}
                onChange={(e) => setLoginEmail(e.target.value)}
                placeholder="Email address"
                className="w-full rounded-lg border border-slate-700 bg-slate-800 p-3"
              />

              <input
                type="password"
                required
                value={loginPassword}
                onChange={(e) => setLoginPassword(e.target.value)}
                placeholder="Password"
                className="w-full rounded-lg border border-slate-700 bg-slate-800 p-3"
              />

              {loginError && (
                <p className="text-sm text-red-400">
                  {loginError}
                </p>
              )}

              <button
                type="submit"
                className="w-full rounded-lg bg-emerald-500 p-3 font-bold text-emerald-950"
              >
                Login
              </button>

            </form>

            <div className="mt-6 border-t border-slate-700 pt-5">

              <p className="mb-3 text-sm font-semibold text-emerald-400">
                Demo Accounts
              </p>

              {DEMO_USERS.map((user) => (
                <button
                  key={user.email}
                  type="button"
                  onClick={() => {
                    setLoginEmail(user.email);
                    setLoginPassword(user.password);
                    setLoginError("");
                  }}
                  className="mb-2 block w-full rounded-lg bg-slate-800 p-3 text-left text-sm hover:bg-slate-700"
                >
                  <span className="block font-semibold">
                    {user.role}
                  </span>
                  <span className="text-xs text-slate-400">
                    {user.email}
                  </span>
                </button>
              ))}

            </div>

            <p className="mt-6 text-center text-sm text-slate-400">
              Don't have an account?{" "}
              <button
                onClick={() => {
                  setPage("register");
                  setLoginError("");
                }}
                className="font-semibold text-emerald-400"
              >
                Register
              </button>
            </p>

            <button
              onClick={() => setPage("landing")}
              className="mt-5 w-full text-sm text-slate-500 hover:text-white"
            >
              ← Back to Home
            </button>

          </div>
        </div>
      )}

      {/* REGISTRATION PAGE */}
      {page === "register" && (
        <div className="mx-auto max-w-md px-6 py-16">

          <div className="rounded-2xl border border-slate-700 bg-slate-900 p-8">

            <h2 className="text-2xl font-bold">
              Create an Account
            </h2>

            <p className="mt-2 text-sm text-slate-400">
              Register your cooperative administrator account.
            </p>

            <form onSubmit={handleRegister} className="mt-8 space-y-5">

              <input
                type="text"
                required
                value={registerName}
                onChange={(e) => setRegisterName(e.target.value)}
                placeholder="Administrator full name"
                className="w-full rounded-lg border border-slate-700 bg-slate-800 p-3"
              />

              <input
                type="email"
                required
                value={registerEmail}
                onChange={(e) => setRegisterEmail(e.target.value)}
                placeholder="Email address"
                className="w-full rounded-lg border border-slate-700 bg-slate-800 p-3"
              />

              <input
                type="password"
                required
                minLength={6}
                value={registerPassword}
                onChange={(e) => setRegisterPassword(e.target.value)}
                placeholder="Create password (minimum 6 characters)"
                className="w-full rounded-lg border border-slate-700 bg-slate-800 p-3"
              />

              <input
                type="password"
                required
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Confirm password"
                className="w-full rounded-lg border border-slate-700 bg-slate-800 p-3"
              />

              <div className="rounded-lg bg-slate-800 p-3">
                <p className="text-xs text-slate-400">
                  Account type
                </p>
                <p className="mt-1 font-semibold text-emerald-400">
                  Cooperative Administrator
                </p>
              </div>

              {loginError && (
                <p className="text-sm text-red-400">
                  {loginError}
                </p>
              )}

              <button
                type="submit"
                className="w-full rounded-lg bg-emerald-500 p-3 font-bold text-emerald-950 hover:bg-emerald-400"
              >
                Create Account
              </button>

            </form>

            <p className="mt-6 text-center text-sm text-slate-400">
              Already registered?{" "}
              <button
                onClick={() => {
                  setPage("login");
                  setLoginError("");
                }}
                className="font-semibold text-emerald-400"
              >
                Login
              </button>
            </p>

            <button
              onClick={() => {
                setPage("landing");
                setLoginError("");
              }}
              className="mt-5 w-full text-sm text-slate-500 hover:text-white"
            >
              ← Back to Home
            </button>

          </div>
        </div>
      )}

      {/* FOOTER */}
      <footer className="border-t border-slate-800 px-6 py-8 text-center text-sm text-slate-500">
        Qucho-Sense · Smart Agricultural Quality Monitoring & Traceability System
        <p className="mt-2">
          የጉራጌ ዞን አግሮ-ኢንዱስትሪ የምርት ጥራት ክትትልና የተከታታይነት ስርዓት
        </p>
      </footer>

    </div>
  );
}


  return (
    <div className="min-h-screen bg-slate-950 p-4 text-slate-100 md:p-8">
      <div className="mx-auto max-w-6xl">

{/* Header */}
<header className="sticky top-0 z-50 border-b border-slate-800 bg-slate-950/95 px-6 py-4 backdrop-blur">
  <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-4">

    {/* Logo */}
    <a href="#home" className="text-2xl font-bold text-emerald-400">
      🌱 Qucho-Sense
    </a>

    {/* Navigation */}
    <nav className="flex flex-wrap items-center gap-6 text-sm font-medium">
      <a href="#home" className="text-white hover:text-emerald-400">
        Home
      </a>

      <a href="#about" className="text-slate-300 hover:text-emerald-400">
        About
      </a>

      <a href="#services" className="text-slate-300 hover:text-emerald-400">
        Services
      </a>
    </nav>

    {/* Account buttons */}
    <div className="flex items-center gap-3">
      <button
        onClick={() => setShowLogin(true)}
        className="rounded-lg border border-emerald-500 px-4 py-2 text-sm text-emerald-400 hover:bg-emerald-500/10"
      >
        Login
      </button>

      <button
        onClick={() => setShowRegister(true)}
        className="rounded-lg bg-emerald-500 px-4 py-2 text-sm font-bold text-slate-950 hover:bg-emerald-400"
      >
        Register
      </button>
    </div>

  </div>
</header>
        {/* Navigation */}
        <nav className="my-6 grid grid-cols-3 gap-2">
          {tabs.map((item) => (
            <button
              key={item.id}
              onClick={() => setTab(item.id)}
              className={`rounded-lg px-2 py-3 text-sm font-bold transition md:text-base ${
                tab === item.id
                  ? "bg-emerald-500 text-emerald-950"
                  : "bg-slate-800 text-slate-400 hover:bg-slate-700"
              }`}
            >
              {item.label}
            </button>
          ))}
        </nav>

        {/* LIVE SENSOR TAB */}

{tab === "live" && (
  <section className="space-y-6">

    {/* Hardware connection status */}
    <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-slate-700 bg-slate-800 p-4">
      <div>
        <h2 className="font-bold text-white">
          Qucho-Sense Hardware Monitoring
        </h2>
        <p className="mt-1 text-xs text-slate-400">
          Last updated: {lastUpdated}
        </p>
      </div>

      <div className={`rounded-full px-4 py-2 text-xs font-bold ${
        sensorConnected
          ? "bg-emerald-500/20 text-emerald-400"
          : "bg-red-500/20 text-red-400"
      }`}>
        {sensorConnected
          ? "● Hardware Connected"
          : "● Hardware Disconnected"}
      </div>
    </div>

    {/* Active batch */}
    <div className="rounded-xl border border-slate-700 bg-slate-800 p-5">
      <label className="mb-2 block text-sm text-slate-400">
        አሁን እየተለካ ያለው ምርት (Active Batch)
      </label>

      <select
        value={activeBatch}
        onChange={(e) => {
          const id = e.target.value;
          setActiveBatch(id);
          setSelectedBatch(
            batches.find((b) => b.id === id) || null
          );
        }}
        className="w-full rounded-lg border border-slate-600 bg-slate-900 p-3 text-white"
      >
        {batches.map((batch) => (
          <option key={batch.id} value={batch.id}>
            {batch.id} — {batch.farmer}
          </option>
        ))}
      </select>
    </div>

    {/* Quality overview */}
    <div>
      <div className="mb-3">
        <h2 className="text-xl font-bold text-white">
          Product Quality Overview
        </h2>
        <p className="text-sm text-slate-400">
          Current quality and proximity to critical condition
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-2">

        <ProgressCard
          title="🌱 Product Quality"
          value={quality}
          subtitle="Quality percentage reported by Qucho-Sense hardware"
          color="emerald"
        />

        <ProgressCard
          title="⚠️ Critical Threshold Proximity"
          value={criticalProximity}
          subtitle="Percentage of the defined critical threshold reached"
          color={
            criticalProximity === null
              ? "yellow"
              : criticalProximity >= 80
                ? "red"
                : criticalProximity >= 60
                  ? "orange"
                  : "yellow"
          }
        />
      </div>
    </div>

    {/* Quality status */}
    <div className="rounded-xl border border-slate-700 bg-slate-800 p-5">
      <p className="text-sm text-slate-400">
        Current Product Condition
      </p>

      <h2 className="mt-2 text-xl font-bold text-white">
        {qualityStatus}
      </h2>

      <p className="mt-2 text-xs text-slate-400">
        {quality !== null && criticalProximity !== null
          ? "Status received from the hardware monitoring system."
          : "Waiting for valid quality information from the hardware."}
      </p>
    </div>

    {/* Sensor readings */}
    <div>
      <h2 className="mb-3 text-xl font-bold text-white">
        Hardware Sensor Readings
      </h2>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">

        <SensorCard
          title="🌡️ Temperature"
          value={temp}
          unit="°C"
          subtitle="Current measured temperature"
        />

        <SensorCard
          title="💧 Moisture"
          value={moist}
          unit="%"
          subtitle="Current measured moisture"
        />

        <SensorCard
          title="🚰 Water Pump"
          value={pump}
          unit=""
          subtitle="Current pump operating status"
        />

      </div>
    </div>

    {/* Data source notice */}
    {demoMode && (
      <div className="rounded-lg border border-yellow-600/40 bg-yellow-500/10 p-4 text-sm text-yellow-300">
        Demo mode: ESP32 is not responding. Temperature and
        moisture are simulated. Quality and critical proximity
        are unavailable until actual hardware data is received.
      </div>
    )}

    {/* Sensor logs */}
    <div className="overflow-x-auto rounded-xl border border-slate-700 bg-slate-800 p-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="font-bold text-white">
          🗄️ Sensor and Quality History
        </h2>

        <button
          onClick={exportCSV}
          className="rounded-lg bg-slate-700 px-4 py-2 text-sm hover:bg-slate-600"
        >
          Excel / CSV Download
        </button>
      </div>

      <table className="mt-4 w-full min-w-[850px] text-left text-sm">
        <thead className="text-slate-400">
          <tr>
            <th className="p-3">Time</th>
            <th className="p-3">Temp.</th>
            <th className="p-3">Moisture</th>
            <th className="p-3">Quality</th>
            <th className="p-3">Critical Proximity</th>
            <th className="p-3">Pump</th>
            <th className="p-3">Source</th>
            <th className="p-3">Sync</th>
          </tr>
        </thead>

        <tbody>
          {logs.map((log) => (
            <tr
              key={log.logId}
              className="border-t border-slate-700"
            >
              <td className="p-3">{log.time}</td>
              <td className="p-3">{log.temp}°C</td>
              <td className="p-3">{log.moist}%</td>
              <td className="p-3">
                {log.quality == null ? "--" : `${log.quality}%`}
              </td>
              <td className="p-3">
                {log.criticalProximity == null
                  ? "--"
                  : `${log.criticalProximity}%`}
              </td>
              <td className="p-3">{log.pump}</td>
              <td className="p-3">{log.source || "Unknown"}</td>
              <td className="p-3">
                {log.synced ? "☁️" : "📱"}
              </td>
            </tr>
          ))}

          {logs.length === 0 && (
            <tr>
              <td
                colSpan="8"
                className="p-5 text-center text-slate-400"
              >
                No sensor records yet.
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  </section>
)}


        {/* BATCH REGISTRATION TAB */}
        {tab === "batches" && (
          <section className="space-y-5">

            <form
              onSubmit={createBatch}
              className="rounded-xl border border-slate-700 bg-slate-800 p-5"
            >
              <h2 className="mb-5 text-lg font-bold">
                ➕ አዲስ የምርት ባች (Batch) መዝግብ
              </h2>

              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label className="mb-2 block text-sm text-slate-400">
                    የገበሬው / የማህበሩ ስም
                  </label>

                  <input
                    value={farmer}
                    onChange={(e) => setFarmer(e.target.value)}
                    placeholder="ለምሳሌ፡ አቶ ካሳሁን ታደሰ"
                    className="w-full rounded-lg border border-slate-600 bg-slate-900 p-3"
                  />
                </div>

                <div>
                  <label className="mb-2 block text-sm text-slate-400">
                    አካባቢ / ቀበሌ
                  </label>

                  <input
                    value={kebele}
                    onChange={(e) => setKebele(e.target.value)}
                    placeholder="ለምሳሌ፡ እምድብር / ቸሃ"
                    className="w-full rounded-lg border border-slate-600 bg-slate-900 p-3"
                  />
                </div>

                <div className="sm:col-span-2">
                  <label className="mb-2 block text-sm text-slate-400">
                    የምርት አይነት
                  </label>

                  <select
                    value={crop}
                    onChange={(e) => setCrop(e.target.value)}
                    className="w-full rounded-lg border border-slate-600 bg-slate-900 p-3"
                  >
                    <option>እንሰት (ቆጮ)</option>
                    <option>እንሰት (ቡላ)</option>
                    <option>የታጠበ ቡና (Washed Coffee)</option>
                  </select>
                </div>
              </div>

              <button
                type="submit"
                disabled={!db}
                className="mt-5 w-full rounded-lg bg-emerald-500 p-3 font-bold text-emerald-950 hover:bg-emerald-400 disabled:opacity-50"
              >
                ዳታቤዝ ውስጥ መዝግብ (Save Batch)
              </button>
            </form>

            <div className="overflow-x-auto rounded-xl border border-slate-700 bg-slate-800 p-5">
              <h2 className="mb-4 font-bold">
                📋 የተመዘገቡ ምርቶች (Registered Batches)
              </h2>

              <table className="w-full text-left text-sm">
                <thead className="text-slate-400">
                  <tr>
                    <th className="p-3">ኮድ (ID)</th>
                    <th className="p-3">ባለቤት</th>
                    <th className="p-3">ምርት</th>
                    <th className="p-3">ጥራት</th>
                    <th className="p-3">Action</th>
                  </tr>
                </thead>

                <tbody>
                  {batches.map((batch) => (
                    <tr key={batch.id} className="border-t border-slate-700">
                      <td className="p-3 font-bold">{batch.id}</td>
                      <td className="p-3">
                        {batch.farmer}
                        <br />
                        <span className="text-xs text-slate-400">
                          {batch.kebele}
                        </span>
                      </td>
                      <td className="p-3">{batch.crop}</td>
                      <td className="p-3 font-bold text-emerald-400">
                       {batch.quality == null
    ? "Not measured"
    : `${batch.quality}%`}
                      </td>
                      <td className="p-3">
                        <button
                          onClick={() => {
                            setSelectedBatch(batch);
                            setTab("passport");
                          }}
                          className="text-emerald-400 hover:underline"
                        >
                          View QR
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        )}

        {/* DIGITAL QR PASSPORT TAB */}
        {tab === "passport" && (
          <section className="rounded-xl border border-slate-700 bg-slate-800 p-5">
            <h2 className="text-lg font-bold">
              🪪 የኤክስፖርት ጥራት መታወቂያ (Digital Passport)
            </h2>

            <p className="my-3 text-sm text-slate-400">
              ገዢዎች እና ፋብሪካዎች QR Code ስካን በማድረግ
              የምርቱን የተመዘገበ መረጃ ማየት ይችላሉ።
            </p>

            <div className="mx-auto mt-5 max-w-md rounded-xl bg-white p-6 text-center text-slate-900">
              <h3 className="font-bold text-emerald-800">
                ✅ የተመዘገበ የጉራጌ ምርት
              </h3>

              {selectedBatch ? (
                <>
                  <div className="my-4 text-sm">
                    <p><strong>ኮድ:</strong> {selectedBatch.id}</p>
                    <p><strong>ባለቤት:</strong> {selectedBatch.farmer}</p>
                    <p><strong>ምርት:</strong> {selectedBatch.crop}</p>
                    <p><strong>አካባቢ:</strong> {selectedBatch.kebele}</p>
                    <p>
                     <strong>የጥራት ነጥብ:</strong>{" "}
{selectedBatch.quality == null
  ? "Not measured"
  : `${selectedBatch.quality}/100`}
                    </p>
                  </div>

                  <img
                    src={getQrUrl(selectedBatch)}
                    alt="Qucho-Sense QR Code"
                    className="mx-auto h-44 w-44"
                  />

                  <p className="mt-3 text-xs text-slate-500">
                    Qucho-Sense Digital Product Record
                  </p>
                </>
              ) : (
                <p className="mt-5 text-slate-500">
                  Select a registered batch to view its QR passport.
                </p>
              )}
            </div>

            <div className="mt-5">
              <label className="mb-2 block text-sm text-slate-400">
                Select registered batch
              </label>

              <select
                value={selectedBatch?.id || ""}
                onChange={(e) =>
                  setSelectedBatch(
                    batches.find((b) => b.id === e.target.value) || null
                  )
                }
                className="w-full rounded-lg border border-slate-600 bg-slate-900 p-3"
              >
                <option value="">Choose a batch</option>
                {batches.map((batch) => (
                  <option key={batch.id} value={batch.id}>
                    {batch.id} — {batch.farmer}
                  </option>
                ))}
              </select>
            </div>
          </section>
        )}

        <footer className="mt-8 border-t border-slate-800 py-5 text-center text-xs text-slate-500">
     Qucho-Sense · Smart Agricultural Quality Monitoring · React + Tailwind CSS
        </footer>
      </div>
    </div>
  );
}
function ProgressCard({
  title,
  value,
  subtitle,
  color = "emerald",
}) {
  const colors = {
    emerald: "bg-emerald-500",
    yellow: "bg-yellow-500",
    orange: "bg-orange-500",
    red: "bg-red-500",
  };

  const valid = Number.isFinite(value);
  const percentage = valid
    ? Math.min(100, Math.max(0, value))
    : 0;

  return (
    <div className="rounded-xl border border-slate-700 bg-slate-800 p-5">
      <p className="text-sm text-slate-400">{title}</p>

      <div className="my-3 flex items-end gap-1">
        <h2 className="text-4xl font-bold text-white">
          {valid ? `${percentage.toFixed(1)}%` : "--"}
        </h2>
      </div>

      <div className="h-3 overflow-hidden rounded-full bg-slate-700">
        <div
          className={`h-full rounded-full transition-all duration-500 ${colors[color]}`}
          style={{ width: `${percentage}%` }}
        />
      </div>

      <p className="mt-3 text-xs text-slate-400">
        {subtitle}
      </p>
    </div>
  );
}

function SensorCard({ title, value, unit, subtitle }) {
  return (
    <div className="rounded-xl border border-slate-700 bg-slate-800 p-5">
      <p className="text-sm text-slate-400">{title}</p>
      <h2 className="my-2 text-3xl font-bold text-white">
        {value}
        <span className="ml-1 text-lg text-slate-400">{unit}</span>
      </h2>
      <p className="text-xs text-slate-400">{subtitle}</p>
    </div>
  );
}
export default App;
