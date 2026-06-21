/**
 * ============================================================
 * SHEKSS — UTILITIES
 * scripts/utils.js
 * ============================================================
 * Shared helpers: toast, clipboard, empty state, countdown.
 * 
 * REMOVED (dead code — partners page removed):
 *   - compressToWebP()
 *   - uploadImageToStorage()
 *   - showToast alias
 * 
 * Future: uploadImageToStorage will be re-added when
 * Merchant Dashboard is implemented.
 * ============================================================
 */

// ===== TOAST NOTIFICATION =====
function toast(msg) {
  const t = document.getElementById('toast');
  t.textContent = msg;
  t.classList.add('show');
  setTimeout(() => t.classList.remove('show'), 3000);
}

// ===== EMPTY STATE HTML =====
function emptyHtml(ico, msg) {
  return `<div class="empty" style="grid-column:1/-1;">
    <div class="empty-ico">${ico}</div>
    <p>${msg}</p>
  </div>`;
}

// ===== COPY TO CLIPBOARD =====
function copyCoupon(code, btn) {
  if (navigator.clipboard && navigator.clipboard.writeText) {
    navigator.clipboard.writeText(code).then(() => {
      btn.textContent = '✅ تم';
      btn.style.background = 'var(--green)';
      setTimeout(() => { btn.textContent = 'نسخ'; btn.style.background = ''; }, 2000);
    }).catch(() => { fallbackCopy(code, btn); });
  } else {
    fallbackCopy(code, btn);
  }
}

function fallbackCopy(code, btn) {
  const el = document.createElement('textarea');
  el.value = code;
  el.style.position = 'fixed';
  el.style.opacity = '0';
  document.body.appendChild(el);
  el.select();
  try {
    document.execCommand('copy');
    btn.textContent = '✅ تم';
    btn.style.background = 'var(--green)';
    setTimeout(() => { btn.textContent = 'نسخ'; btn.style.background = ''; }, 2000);
  } catch (e) {}
  document.body.removeChild(el);
}

// ===== COUNTDOWN ENGINE =====
let _countdownQueue    = [];
let _activeIntervals   = []; // BUG-F fix: track all intervals for cleanup

/**
 * clearAllCountdowns()
 * Called by loadHomeDeals() / loadDeals() / loadExpiredPage() BEFORE
 * setting innerHTML, so old intervals are cleared before their elements
 * disappear from the DOM. Prevents interval accumulation.
 */
function clearAllCountdowns() {
  _activeIntervals.forEach(id => clearInterval(id));
  _activeIntervals = [];
  _countdownQueue  = [];
}

function initCountdowns() {
  _countdownQueue.forEach(uid => startCountdown(uid));
  _countdownQueue = [];
}

function startCountdown(uid) {
  const el = document.getElementById(uid);
  if (!el) return;
  const expires = new Date(el.dataset.expires).getTime();

  function tick() {
    const now  = Date.now();
    const diff = expires - now;

    // Element removed from DOM — interval will be cleared by _activeIntervals cleanup
    if (!document.getElementById(uid)) return;

    if (diff <= 0) {
      el.textContent     = '⏰ انتهى العرض';
      el.style.background = '#fef2f2';
      el.style.color      = '#ef4444';
      return;
    }

    const h  = Math.floor(diff / 3600000);
    const m  = Math.floor((diff % 3600000) / 60000);
    const s  = Math.floor((diff % 60000) / 1000);
    const d  = Math.floor(h / 24);
    const hh = h % 24;

    let txt = '';
    if (d > 0)      txt = `⏰ ينتهي خلال: ${d.toLocaleString('ar-EG')} يوم ${hh.toLocaleString('ar-EG')} ساعة`;
    else if (h > 0) txt = `⏰ ينتهي خلال: ${hh.toLocaleString('ar-EG')} ساعة ${m.toLocaleString('ar-EG')} دقيقة`;
    else            txt = `⏰ ينتهي خلال: ${m.toLocaleString('ar-EG')} دقيقة ${s.toLocaleString('ar-EG')} ثانية`;

    el.textContent = txt;
    if (diff < 3600000)       { el.style.background = '#fef2f2'; el.style.color = '#ef4444'; }
    else if (diff < 86400000) { el.style.background = '#fff7ed'; el.style.color = '#f97316'; }
    else                      { el.style.background = '#f0fdf4'; el.style.color = '#16a34a'; }
  }

  tick();
  const intervalId = setInterval(tick, 1000);
  _activeIntervals.push(intervalId); // register for cleanup
}

// ===== IMAGE SLIDER =====
function slideImg(uid, idx) {
  const slider = document.getElementById(uid);
  if (!slider) return;
  slider.querySelectorAll('.dslide').forEach((s, i) => s.classList.toggle('active', i === idx));
  slider.querySelectorAll('.dslide-dot').forEach((d, i) => d.classList.toggle('active', i === idx));
}

// Step relative to current active slide — used by arrow buttons
function slideImgStep(uid, direction) {
  const slider = document.getElementById(uid);
  if (!slider) return;
  const slides = slider.querySelectorAll('.dslide');
  const current = Array.from(slides).findIndex(s => s.classList.contains('active'));
  const next = (current + direction + slides.length) % slides.length;
  slideImg(uid, next);
}

// ===== TOUCH SWIPE SUPPORT =====
let _dSlideTouchX = 0;

function dSlideTouchStart(e, uid) {
  _dSlideTouchX = e.changedTouches[0].screenX;
}

function dSlideTouchEnd(e, uid) {
  const endX = e.changedTouches[0].screenX;
  const diff = endX - _dSlideTouchX;
  const SWIPE_THRESHOLD = 40;
  if (Math.abs(diff) < SWIPE_THRESHOLD) return;
  // Swipe right (diff > 0) → previous image (RTL-aware: treat as "next" visually for RTL)
  if (diff > 0) slideImgStep(uid, -1);
  else          slideImgStep(uid, 1);
}
