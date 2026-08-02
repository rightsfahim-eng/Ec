/* ==========================================================================
   ADMIN LOGIC — admin.html
   ========================================================================== */

async function sha256Hex(str) {
  const buf = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(str));
  return [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, "0")).join("");
}

function toast(msg, kind = "ok") {
  const el = document.getElementById("toast");
  el.textContent = msg;
  el.style.background = kind === "ok" ? "linear-gradient(90deg,#1a3a2b,#123324)" : "linear-gradient(90deg,#3a1a20,#331212)";
  el.style.border = "1px solid " + (kind === "ok" ? "rgba(61,255,138,.35)" : "rgba(255,43,72,.4)");
  el.style.color = kind === "ok" ? "#bdffd9" : "#ffc2c9";
  el.classList.add("show");
  clearTimeout(toast._t);
  toast._t = setTimeout(() => el.classList.remove("show"), 2400);
}

function escapeHTML(str) {
  const d = document.createElement("div");
  d.textContent = str || "";
  return d.innerHTML;
}

document.addEventListener("DOMContentLoaded", () => {
  const gate = document.getElementById("gate");
  const dashboard = document.getElementById("dashboard");
  const pwInput = document.getElementById("pwInput");
  const gateBtn = document.getElementById("gateBtn");
  const gateError = document.getElementById("gateError");

  async function tryLogin() {
    gateBtn.disabled = true;
    gateBtn.textContent = "Checking…";
    try {
      if (window.DB.LOCAL_MODE) {
        const hash = await sha256Hex(pwInput.value);
        if (hash !== window.ADMIN_PASSWORD_HASH) throw new Error("bad-pass");
        sessionStorage.setItem("exotic_admin_auth", "1");
      } else {
        await window.DB.loginAdmin(pwInput.value);
      }
      unlock();
    } catch (err) {
      gateError.textContent = "পাসওয়ার্ড সঠিক নয়।";
      pwInput.value = "";
    } finally {
      gateBtn.disabled = false;
      gateBtn.textContent = "Unlock";
    }
  }
  gateBtn.addEventListener("click", tryLogin);
  pwInput.addEventListener("keydown", (e) => { if (e.key === "Enter") tryLogin(); });

  function unlock() {
    gate.style.display = "none";
    dashboard.style.display = "flex";
    initDashboard();
  }

  if (window.DB.LOCAL_MODE) {
    if (sessionStorage.getItem("exotic_admin_auth") === "1") unlock();
  } else {
    window.DB.onAuthReady((loggedIn) => { if (loggedIn) unlock(); });
  }

  /* connection status */
  const led = document.getElementById("led");
  const statusText = document.getElementById("statusText");
  if (window.DB.LOCAL_MODE) {
    led.classList.remove("on");
    statusText.textContent = "LOCAL MODE — this device only";
  } else {
    led.classList.add("on");
    statusText.textContent = "LIVE — synced with Firebase";
  }

  let dashboardInit = false;
  function initDashboard() {
    if (dashboardInit) return;
    dashboardInit = true;

    /* ---------------- tabs ---------------- */
    const tabBtns = document.querySelectorAll(".tab-btn");
    const panels = document.querySelectorAll(".panel");
    tabBtns.forEach((btn) => {
      btn.addEventListener("click", () => {
        tabBtns.forEach((b) => b.classList.remove("active"));
        panels.forEach((p) => p.classList.remove("active"));
        btn.classList.add("active");
        document.getElementById(btn.dataset.panel).classList.add("active");
      });
    });

    /* ---------------- reports ---------------- */
    let allReports = [];
    window.DB.subscribeReports((reports) => {
      allReports = reports;
      renderReports();
    });

    function renderReports() {
      renderReportList("personList", allReports.filter((r) => r.kind === "person"));
      renderReportList("anonList", allReports.filter((r) => r.kind === "anonymous"));
    }

    function renderReportList(elId, list) {
      const el = document.getElementById(elId);
      if (!list.length) {
        el.innerHTML = `<div class="empty-state glass">কোনো রিপোর্ট নেই।</div>`;
        return;
      }
      el.innerHTML = list.map((r) => `
        <div class="report-card glass" data-id="${r.id}">
          <div class="report-top">
            <span class="report-name">${escapeHTML(r.name)}</span>
            <div class="report-meta">
              <span class="tag">${escapeHTML(r.date || "")}</span>
              <span class="tag type-${escapeHTML(r.type)}">${escapeHTML(r.type)}</span>
            </div>
          </div>
          <div class="report-msg">${escapeHTML(r.message)}</div>
          <button type="button" class="report-del" data-del="${r.id}">Delete</button>
        </div>
      `).join("");

      el.querySelectorAll("[data-del]").forEach((btn) => {
        btn.addEventListener("click", async () => {
          if (!confirm("এই রিপোর্টটি ডিলিট করতে চান?")) return;
          await window.DB.deleteReport(btn.dataset.del);
          toast("রিপোর্ট ডিলিট হয়েছে");
        });
      });
    }

    /* ---------------- settings: notice + sell link ---------------- */
    const noticeInput = document.getElementById("noticeInput");
    const sellLinkInput = document.getElementById("sellLinkInput");
    const saveSettingsBtn = document.getElementById("saveSettingsBtn");

    let latestConfig = {};
    window.DB.subscribeConfig((cfg) => {
      latestConfig = cfg;
      if (document.activeElement !== noticeInput) noticeInput.value = cfg.notice || "";
      if (document.activeElement !== sellLinkInput) sellLinkInput.value = cfg.sellLink || "";
    });

    saveSettingsBtn.addEventListener("click", async () => {
      await window.DB.saveConfig({
        notice: noticeInput.value.trim(),
        buyLink: latestConfig.buyLink || "",
        sellLink: sellLinkInput.value.trim()
      });
      toast("সেভ হয়েছে ✅");
    });

    /* ---------------- stock (Buy page listings) ---------------- */
    const stockAdminList = document.getElementById("stockAdminList");
    window.DB.subscribeStock((stock) => {
      if (!stock.length) {
        stockAdminList.innerHTML = `<div class="empty-state glass">স্টকে কোনো আইডি নেই।</div>`;
        return;
      }
      stockAdminList.innerHTML = stock.map((s) => `
        <div class="report-card glass" data-id="${s.id}">
          <div class="report-top">
            <span class="report-name">${escapeHTML(s.username)}</span>
            <div class="report-meta">
              <span class="tag">${escapeHTML(s.status)}</span>
              <span class="tag">#${escapeHTML(s.code)}</span>
            </div>
          </div>
          <div class="report-msg">${escapeHTML(s.followers)} followers · ${escapeHTML(s.likes)} likes · ${escapeHTML(s.price)}</div>
          <button type="button" class="report-del" data-del-stock="${s.id}">Remove</button>
        </div>
      `).join("");

      stockAdminList.querySelectorAll("[data-del-stock]").forEach((btn) => {
        btn.addEventListener("click", async () => {
          if (!confirm("এই আইডিটা স্টক থেকে সরাতে চান?")) return;
          await window.DB.deleteStock(btn.dataset.delStock);
          toast("সরানো হয়েছে");
        });
      });
    });

    document.getElementById("addStockBtn").addEventListener("click", async () => {
      const username = document.getElementById("stkUsername").value.trim();
      const followers = document.getElementById("stkFollowers").value.trim();
      const likes = document.getElementById("stkLikes").value.trim();
      const status = document.getElementById("stkStatus").value;
      const price = document.getElementById("stkPrice").value.trim();
      if (!username || !followers || !likes || !price) {
        toast("সব ফিল্ড পূরণ করুন", "err");
        return;
      }
      await window.DB.addStock({ username, followers, likes, status, price });
      ["stkUsername", "stkFollowers", "stkLikes", "stkPrice"].forEach((id) => (document.getElementById(id).value = ""));
      toast("আইডি স্টকে যোগ হয়েছে ✅");
    });

    /* ---------------- course links ---------------- */
    const courseWhatsapp = document.getElementById("courseWhatsapp");
    const courseMessenger = document.getElementById("courseMessenger");
    const courseTelegram = document.getElementById("courseTelegram");
    window.DB.subscribeCourseConfig((cfg) => {
      if (document.activeElement !== courseWhatsapp) courseWhatsapp.value = cfg.whatsapp || "";
      if (document.activeElement !== courseMessenger) courseMessenger.value = cfg.messenger || "";
      if (document.activeElement !== courseTelegram) courseTelegram.value = cfg.telegram || "";
    });
    document.getElementById("saveCourseBtn").addEventListener("click", async () => {
      await window.DB.saveCourseConfig({
        whatsapp: courseWhatsapp.value.trim(),
        messenger: courseMessenger.value.trim(),
        telegram: courseTelegram.value.trim()
      });
      toast("কোর্স লিংক সেভ হয়েছে ✅");
    });

    /* ---------------- reviews ---------------- */
    const reviewsList = document.getElementById("reviewsList");
    const newReviewName = document.getElementById("newReviewName");
    const newReviewText = document.getElementById("newReviewText");
    const addReviewBtn = document.getElementById("addReviewBtn");

    window.DB.subscribeReviews((reviews) => {
      if (!reviews.length) {
        reviewsList.innerHTML = `<div class="empty-state glass">কোনো রিভিউ নেই।</div>`;
        return;
      }
      reviewsList.innerHTML = reviews.map((r) => `
        <div class="review-row" data-id="${r.id}">
          <div class="field">
            <label>Name</label>
            <input type="text" value="${escapeHTML(r.name)}" disabled />
          </div>
          <div class="field" style="flex:2;">
            <label>Review</label>
            <input type="text" value="${escapeHTML(r.text)}" disabled />
          </div>
          <button type="button" class="del-icon pill" data-del-review="${r.id}">✕</button>
        </div>
      `).join("");

      reviewsList.querySelectorAll("[data-del-review]").forEach((btn) => {
        btn.addEventListener("click", async () => {
          if (!confirm("এই রিভিউটি ডিলিট করতে চান?")) return;
          await window.DB.deleteReview(btn.dataset.delReview);
          toast("রিভিউ ডিলিট হয়েছে");
        });
      });
    });

    addReviewBtn.addEventListener("click", async () => {
      const name = newReviewName.value.trim();
      const text = newReviewText.value.trim();
      if (!name || !text) {
        toast("নাম ও রিভিউ টেক্সট দিন", "err");
        return;
      }
      await window.DB.addReview({ name, text });
      newReviewName.value = "";
      newReviewText.value = "";
      toast("রিভিউ যোগ হয়েছে ✅");
    });
  }
});
