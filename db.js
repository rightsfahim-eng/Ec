/* ==========================================================================
   DB — thin data layer used by main.js and admin.js
   Uses Firebase Firestore when firebase-config.js has real keys.
   Otherwise falls back to localStorage ("LOCAL MODE") so the site
   still fully works for a single browser/device during testing.
   ========================================================================== */

(function () {
  const isConfigured =
    window.FIREBASE_CONFIG &&
    window.FIREBASE_CONFIG.apiKey &&
    window.FIREBASE_CONFIG.apiKey !== "YOUR_API_KEY";

  const LOCAL_MODE = !isConfigured;
  let fdb = null;
  let fauth = null;

  if (!LOCAL_MODE) {
    firebase.initializeApp(window.FIREBASE_CONFIG);
    fdb = firebase.firestore();
    try {
      fauth = firebase.auth();
    } catch (e) {
      console.warn("[EXOTIC CLUB] firebase-auth-compat.js not loaded on this page — admin login will be unavailable here.");
    }
  }

  const LS_KEYS = {
    config: "exotic_config",
    reviews: "exotic_reviews",
    reports: "exotic_reports",
    stock: "exotic_stock",
    courseConfig: "exotic_course_config"
  };

  function lsGet(key, fallback) {
    try {
      const raw = localStorage.getItem(key);
      return raw ? JSON.parse(raw) : fallback;
    } catch (e) {
      return fallback;
    }
  }
  function lsSet(key, val) {
    localStorage.setItem(key, JSON.stringify(val));
    window.dispatchEvent(new CustomEvent("local-db-change", { detail: key }));
  }

  const DEFAULT_CONFIG = {
    notice: "🔥 নতুন এডমিন এখন এভেইলেবেল — নিরাপদ ও ভেরিফাইড ট্রেডের জন্য গাইডলাইন পড়ুন।",
    buyLink: "https://t.me/your_buy_link",
    sellLink: "https://t.me/your_sell_link"
  };

  const DEFAULT_REVIEWS = [
    { id: "r1", name: "Rafsan Ahmed", text: "স্মুথ ট্রান্সফার, এডমিন সাপোর্ট অসাধারণ। একদম বিশ্বাসযোগ্য সার্ভিস।" },
    { id: "r2", name: "Nusrat Jahan", text: "একাউন্ট সেল করেছিলাম, পেমেন্ট সাথে সাথে পেয়ে গেছি। রিকমেন্ডেড।" },
    { id: "r3", name: "Tanvir Hasan", text: "প্রথমে একটু সন্দিহান ছিলাম, কিন্তু পুরো প্রসেসটা ট্রান্সপারেন্ট ছিল।" },
    { id: "r4", name: "Afroza Annu", text: "কমিউনিটির গাইডলাইন খুব ক্লিয়ার, স্ক্যাম এড়াতে সাহায্য করে।" }
  ];

  const DEFAULT_STOCK = [
    { id: "stk1", username: "@sample.creator", followers: "42.5K", likes: "1.2M", status: "Verified", price: "৳ ৮,০০০", code: "10234" }
  ];

  const DEFAULT_COURSE_CONFIG = { whatsapp: "", messenger: "", telegram: "" };

  window.DB = {
    LOCAL_MODE,

    /* ---------------- ADMIN AUTH (real backend only) ---------------- */
    async loginAdmin(password) {
      if (LOCAL_MODE || !fauth) throw new Error("no-auth-available");
      return fauth.signInWithEmailAndPassword(window.ADMIN_EMAIL, password);
    },
    isAdminLoggedIn() {
      return !LOCAL_MODE && !!fauth && !!fauth.currentUser;
    },
    onAuthReady(cb) {
      if (LOCAL_MODE || !fauth) { cb(false); return () => {}; }
      return fauth.onAuthStateChanged((user) => cb(!!user));
    },

    /* ---------------- CONFIG (notice / buy / sell links) ---------------- */
    subscribeConfig(cb) {
      if (LOCAL_MODE) {
        const emit = () => cb(lsGet(LS_KEYS.config, DEFAULT_CONFIG));
        emit();
        const handler = (e) => { if (e.detail === LS_KEYS.config) emit(); };
        window.addEventListener("local-db-change", handler);
        window.addEventListener("storage", emit);
        return () => window.removeEventListener("local-db-change", handler);
      }
      return fdb.collection("config").doc("site").onSnapshot(
        (doc) => cb(doc.exists ? doc.data() : DEFAULT_CONFIG),
        (err) => { console.error("[EXOTIC CLUB] config read failed:", err.message); cb(DEFAULT_CONFIG); }
      );
    },
    async saveConfig(data) {
      if (LOCAL_MODE) return lsSet(LS_KEYS.config, data);
      return fdb.collection("config").doc("site").set(data, { merge: true });
    },

    /* ---------------- REVIEWS ---------------- */
    subscribeReviews(cb) {
      if (LOCAL_MODE) {
        const emit = () => {
          const stored = localStorage.getItem(LS_KEYS.reviews);
          cb(stored ? JSON.parse(stored) : DEFAULT_REVIEWS);
        };
        emit();
        const handler = (e) => { if (e.detail === LS_KEYS.reviews) emit(); };
        window.addEventListener("local-db-change", handler);
        window.addEventListener("storage", emit);
        return () => window.removeEventListener("local-db-change", handler);
      }
      return fdb.collection("reviews").orderBy("createdAt", "desc").onSnapshot(
        (snap) => {
          const list = [];
          snap.forEach((d) => list.push({ id: d.id, ...d.data() }));
          cb(list.length ? list : DEFAULT_REVIEWS);
        },
        (err) => { console.error("[EXOTIC CLUB] reviews read failed:", err.message); cb(DEFAULT_REVIEWS); }
      );
    },
    async addReview({ name, text }) {
      if (LOCAL_MODE) {
        const list = lsGet(LS_KEYS.reviews, DEFAULT_REVIEWS);
        list.unshift({ id: "r" + Date.now(), name, text });
        return lsSet(LS_KEYS.reviews, list);
      }
      return fdb.collection("reviews").add({
        name, text, createdAt: firebase.firestore.FieldValue.serverTimestamp()
      });
    },
    async deleteReview(id) {
      if (LOCAL_MODE) {
        const list = lsGet(LS_KEYS.reviews, DEFAULT_REVIEWS).filter((r) => r.id !== id);
        return lsSet(LS_KEYS.reviews, list);
      }
      return fdb.collection("reviews").doc(id).delete();
    },

    /* ---------------- STOCK (BUY listings) ---------------- */
    subscribeStock(cb) {
      if (LOCAL_MODE) {
        const emit = () => cb(lsGet(LS_KEYS.stock, DEFAULT_STOCK));
        emit();
        const handler = (e) => { if (e.detail === LS_KEYS.stock) emit(); };
        window.addEventListener("local-db-change", handler);
        window.addEventListener("storage", emit);
        return () => window.removeEventListener("local-db-change", handler);
      }
      return fdb.collection("stock").orderBy("createdAt", "desc").onSnapshot(
        (snap) => {
          const list = [];
          snap.forEach((d) => list.push({ id: d.id, ...d.data() }));
          cb(list);
        },
        (err) => { console.error("[EXOTIC CLUB] stock read failed:", err.message); cb([]); }
      );
    },
    async addStock({ username, followers, likes, status, price }) {
      const code = String(Math.floor(10000 + Math.random() * 90000));
      if (LOCAL_MODE) {
        const list = lsGet(LS_KEYS.stock, DEFAULT_STOCK);
        list.unshift({ id: "stk" + Date.now(), username, followers, likes, status, price, code });
        return lsSet(LS_KEYS.stock, list);
      }
      return fdb.collection("stock").add({
        username, followers, likes, status, price, code,
        createdAt: firebase.firestore.FieldValue.serverTimestamp()
      });
    },
    async deleteStock(id) {
      if (LOCAL_MODE) {
        const list = lsGet(LS_KEYS.stock, DEFAULT_STOCK).filter((s) => s.id !== id);
        return lsSet(LS_KEYS.stock, list);
      }
      return fdb.collection("stock").doc(id).delete();
    },

    /* ---------------- COURSE CONFIG (whatsapp/messenger/telegram links) ---------------- */
    subscribeCourseConfig(cb) {
      if (LOCAL_MODE) {
        const emit = () => cb(lsGet(LS_KEYS.courseConfig, DEFAULT_COURSE_CONFIG));
        emit();
        const handler = (e) => { if (e.detail === LS_KEYS.courseConfig) emit(); };
        window.addEventListener("local-db-change", handler);
        window.addEventListener("storage", emit);
        return () => window.removeEventListener("local-db-change", handler);
      }
      return fdb.collection("config").doc("course").onSnapshot(
        (doc) => cb(doc.exists ? doc.data() : DEFAULT_COURSE_CONFIG),
        (err) => { console.error("[EXOTIC CLUB] course config read failed:", err.message); cb(DEFAULT_COURSE_CONFIG); }
      );
    },
    async saveCourseConfig(data) {
      if (LOCAL_MODE) return lsSet(LS_KEYS.courseConfig, data);
      return fdb.collection("config").doc("course").set(data, { merge: true });
    },

    /* ---------------- REPORTS (complaints) ---------------- */
    subscribeReports(cb) {
      if (LOCAL_MODE) {
        const emit = () => cb(lsGet(LS_KEYS.reports, []));
        emit();
        const handler = (e) => { if (e.detail === LS_KEYS.reports) emit(); };
        window.addEventListener("local-db-change", handler);
        window.addEventListener("storage", emit);
        return () => window.removeEventListener("local-db-change", handler);
      }
      return fdb.collection("reports").orderBy("createdAt", "desc").onSnapshot(
        (snap) => {
          const list = [];
          snap.forEach((d) => list.push({ id: d.id, ...d.data() }));
          cb(list);
        },
        (err) => { console.error("[EXOTIC CLUB] reports read failed:", err.message); cb([]); }
      );
    },
    async addReport(data) {
      if (LOCAL_MODE) {
        const list = lsGet(LS_KEYS.reports, []);
        list.unshift({ id: "rep" + Date.now(), ...data, createdAt: new Date().toISOString() });
        return lsSet(LS_KEYS.reports, list);
      }
      return fdb.collection("reports").add({
        ...data, createdAt: firebase.firestore.FieldValue.serverTimestamp()
      });
    },
    async deleteReport(id) {
      if (LOCAL_MODE) {
        const list = lsGet(LS_KEYS.reports, []).filter((r) => r.id !== id);
        return lsSet(LS_KEYS.reports, list);
      }
      return fdb.collection("reports").doc(id).delete();
    }
  };
})();
