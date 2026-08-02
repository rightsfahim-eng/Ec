/* ==========================================================================
   MAIN SITE LOGIC — index.html
   ========================================================================== */

function showToast(msg, kind = "ok") {
  const el = document.getElementById("toast");
  el.textContent = msg;
  el.style.background =
    kind === "ok"
      ? "linear-gradient(90deg,#1a3a2b,#123324)"
      : "linear-gradient(90deg,#3a1a20,#331212)";
  el.style.border = "1px solid " + (kind === "ok" ? "rgba(61,255,138,.35)" : "rgba(255,43,72,.4)");
  el.style.color = kind === "ok" ? "#bdffd9" : "#ffc2c9";
  el.classList.add("show");
  clearTimeout(showToast._t);
  showToast._t = setTimeout(() => el.classList.remove("show"), 2600);
}

document.addEventListener("DOMContentLoaded", () => {
  /* ---------- local mode banner ---------- */
  if (window.DB.LOCAL_MODE) {
    console.warn(
      "[EXOTIC CLUB] Running in LOCAL MODE — Firebase isn't configured yet, " +
      "so Notice / Buy-Sell links / Reviews / Reports only persist in this browser. " +
      "See js/firebase-config.js for setup steps."
    );
  }

  /* ---------- notice + links live binding ---------- */
  let currentConfig = {};
  window.DB.subscribeConfig((cfg) => {
    currentConfig = cfg;
    document.getElementById("noticeText").textContent = cfg.notice || "";
  });

  /* ---------- reviews: auto-scroll + drag carousel ---------- */
  const reviewsTrack = document.getElementById("reviewsTrack");
  let carousel = null;

  window.DB.subscribeReviews((reviews) => {
    if (!reviews || !reviews.length) {
      reviewsTrack.innerHTML = "";
      if (carousel) carousel.stop();
      return;
    }
    const cardHTML = (r) => `
      <div class="review-card glass">
        <div class="review-head">
          <span class="review-name">${escapeHTML(r.name)}</span>
          <span class="verify" title="Verified client"><svg viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="3" stroke-linecap="round" stroke-linejoin="round" width="9" height="9"><path d="M5 13l4 4L19 7"/></svg></span>
        </div>
        <div class="review-text">${escapeHTML(r.text)}</div>
      </div>`;
    // duplicate list for seamless infinite loop
    reviewsTrack.innerHTML = reviews.map(cardHTML).join("") + reviews.map(cardHTML).join("");

    if (carousel) carousel.stop();
    carousel = createCarousel(reviewsTrack);
  });

  function escapeHTML(str) {
    const d = document.createElement("div");
    d.textContent = str || "";
    return d.innerHTML;
  }

  function createCarousel(track) {
    let offsetX = 0;
    let setWidth = 0;
    let dragging = false;
    let dragStartX = 0;
    let dragStartOffset = 0;
    let lastMoveX = 0;
    let lastMoveT = 0;
    let inertia = 0;
    let lastFrameT = 0;
    let rafId = null;
    const AUTO_SPEED = 0.026; // px per ms — gentle self-scroll

    function measure() {
      setWidth = track.scrollWidth / 2;
    }
    // measure after layout is ready
    requestAnimationFrame(() => requestAnimationFrame(measure));
    window.addEventListener("resize", measure);

    function wrap() {
      if (setWidth <= 0) return;
      if (offsetX <= -setWidth) offsetX += setWidth;
      if (offsetX > 0) offsetX -= setWidth;
    }

    function frame(ts) {
      if (!lastFrameT) lastFrameT = ts;
      const dt = Math.min(ts - lastFrameT, 48);
      lastFrameT = ts;

      if (dragging) {
        // position already set directly during pointermove
      } else if (Math.abs(inertia) > 0.02) {
        offsetX += inertia * dt;
        inertia *= 0.94;
      } else {
        offsetX -= AUTO_SPEED * dt;
      }
      wrap();
      track.style.transform = `translateX(${offsetX}px)`;
      rafId = requestAnimationFrame(frame);
    }
    rafId = requestAnimationFrame(frame);

    function onDown(e) {
      dragging = true;
      inertia = 0;
      track.classList.add("dragging");
      const x = e.clientX;
      dragStartX = x;
      dragStartOffset = offsetX;
      lastMoveX = x;
      lastMoveT = performance.now();
      track.setPointerCapture && e.pointerId != null && track.setPointerCapture(e.pointerId);
    }
    function onMove(e) {
      if (!dragging) return;
      const x = e.clientX;
      offsetX = dragStartOffset + (x - dragStartX);
      const now = performance.now();
      const dt = now - lastMoveT;
      if (dt > 0) inertia = (x - lastMoveX) / dt;
      lastMoveX = x;
      lastMoveT = now;
    }
    function onUp() {
      if (!dragging) return;
      dragging = false;
      track.classList.remove("dragging");
      // clamp inertia so it doesn't fly off wildly
      inertia = Math.max(-1.2, Math.min(1.2, inertia));
    }

    track.addEventListener("pointerdown", onDown);
    track.addEventListener("pointermove", onMove);
    track.addEventListener("pointerup", onUp);
    track.addEventListener("pointercancel", onUp);
    track.addEventListener("pointerleave", () => { if (dragging) onUp(); });

    return {
      stop() {
        cancelAnimationFrame(rafId);
        window.removeEventListener("resize", measure);
        track.removeEventListener("pointerdown", onDown);
        track.removeEventListener("pointermove", onMove);
        track.removeEventListener("pointerup", onUp);
        track.removeEventListener("pointercancel", onUp);
      }
    };
  }

  /* ---------- BUY / SELL submenu ---------- */
  const stack = document.getElementById("actionStack");
  const buySellBtn = document.getElementById("btnBuySell");
  const submenu = document.getElementById("buySellSubmenu");
  let submenuOpen = false;

  function openSubmenu() {
    submenuOpen = true;
    stack.classList.add("blurred");
    buySellBtn.classList.add("active-parent");
    submenu.classList.add("open");
  }
  function closeSubmenu() {
    submenuOpen = false;
    stack.classList.remove("blurred");
    buySellBtn.classList.remove("active-parent");
    submenu.classList.remove("open");
  }

  buySellBtn.addEventListener("click", (e) => {
    e.stopPropagation();
    submenuOpen ? closeSubmenu() : openSubmenu();
  });
  document.addEventListener("click", (e) => {
    if (submenuOpen && !submenu.contains(e.target) && e.target !== buySellBtn) closeSubmenu();
  });
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape" && submenuOpen) closeSubmenu();
  });

  function redirectWithNotice(url, label) {
    if (!url) {
      showToast("লিংক এখনো সেট করা হয়নি।", "err");
      return;
    }
    showToast(`📣 রি-ডাইরেক্ট হচ্ছে — ${label}...`, "ok");
    setTimeout(() => window.open(url, "_blank", "noopener"), 900);
    closeSubmenu();
  }

  document.getElementById("btnBuy").addEventListener("click", () => {
    window.location.href = "stock.html";
  });
  document.getElementById("btnSell").addEventListener("click", () =>
    redirectWithNotice(currentConfig.sellLink, "SELL")
  );

  /* ---------- Complaint / report box ---------- */
  const scrim = document.getElementById("scrim");
  const box = document.getElementById("complaintBox");
  const openBtn = document.getElementById("btnReport");
  const cancelBtn = document.getElementById("btnCancelReport");
  const sendBtn = document.getElementById("btnSendReport");
  const anonToggle = document.getElementById("anonToggle");
  const nameField = document.getElementById("fieldName");
  const dateField = document.getElementById("fieldDate");
  const typeField = document.getElementById("fieldType");
  const typeChips = document.querySelectorAll(".type-chip");
  const msgField = document.getElementById("fieldMsg");

  let isAnon = false;
  let selectedType = "";

  function openBox() {
    dateField.querySelector("input").value = new Date().toISOString().slice(0, 10);
    scrim.classList.add("open");
    box.classList.add("open");
  }
  function closeBox() {
    scrim.classList.remove("open");
    box.classList.remove("open");
    nameField.querySelector("input").value = "";
    msgField.querySelector("textarea").value = "";
    typeChips.forEach((c) => c.classList.remove("selected"));
    selectedType = "";
    isAnon = false;
    anonToggle.classList.remove("active");
    nameField.classList.remove("hidden");
    typeField.classList.remove("hidden");
  }

  openBtn.addEventListener("click", openBox);
  cancelBtn.addEventListener("click", closeBox);
  scrim.addEventListener("click", closeBox);
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape" && box.classList.contains("open")) closeBox();
  });

  anonToggle.addEventListener("click", () => {
    isAnon = !isAnon;
    anonToggle.classList.toggle("active", isAnon);
    nameField.classList.toggle("hidden", isAnon);
    typeField.classList.toggle("hidden", isAnon);
    if (isAnon) selectedType = "Others";
  });

  typeChips.forEach((chip) => {
    chip.addEventListener("click", () => {
      typeChips.forEach((c) => c.classList.remove("selected"));
      chip.classList.add("selected");
      selectedType = chip.dataset.type;
    });
  });

  sendBtn.addEventListener("click", async () => {
    const message = msgField.querySelector("textarea").value.trim();
    const date = dateField.querySelector("input").value;
    const name = nameField.querySelector("input").value.trim();

    if (!message) {
      showToast("মূল বিষয় লিখুন।", "err");
      return;
    }
    if (!isAnon && !name) {
      showToast("নাম লিখুন অথবা Anonymous মোড ব্যবহার করুন।", "err");
      return;
    }
    if (!isAnon && !selectedType) {
      showToast("একটি Type সিলেক্ট করুন।", "err");
      return;
    }

    sendBtn.textContent = "পাঠানো হচ্ছে...";
    sendBtn.style.pointerEvents = "none";

    try {
      await window.DB.addReport({
        kind: isAnon ? "anonymous" : "person",
        name: isAnon ? "Anonymous" : name,
        date,
        type: isAnon ? "Others" : selectedType,
        message
      });
      showToast("অভিযোগ পাঠানো হয়েছে ✅", "ok");
      closeBox();
    } catch (err) {
      console.error(err);
      showToast("সমস্যা হয়েছে, আবার চেষ্টা করুন।", "err");
    } finally {
      sendBtn.textContent = "পাঠান";
      sendBtn.style.pointerEvents = "auto";
    }
  });
});
