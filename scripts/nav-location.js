/**
 * ============================================================
 * SHEKSS — NAVIGATION & LOCATION
 * scripts/nav-location.js
 * ============================================================
 * Phase 5.1 fixes:
 *   - showApp: waitForAuth before routing to prevent 404 flicker
 *   - Dashboard shell: only re-render if not already mounted
 *   - filterCatsByDeals: cached per-mode (BUG-E)
 *   - popstate: uses shared _loadPageData (BUG-C)
 *   - article: skips pushState (BUG-B)
 * ============================================================
 */

// ===== CATEGORY FILTER CACHE =====
const _catCache = {};

async function filterCatsByDeals(ctx) {
  const mode     = ctx === 'home' ? homeMode : dealsMode;
  const cats     = mode === 'online' ? ONLINE_CATS : OFFLINE_CATS;
  const cacheKey = ctx + '-' + mode;

  if (_catCache[cacheKey]) {
    _applyCatFilter(ctx, cats, _catCache[cacheKey]);
    return;
  }

  const { data } = await sb.from('deals')
    .select('category')
    .eq('is_offline', mode === 'offline')
    .eq('approval_status', 'approved')
    .neq('status', 'expired');

  const existingCats        = new Set((data || []).map(d => d.category));
  _catCache[cacheKey]       = existingCats;
  _applyCatFilter(ctx, cats, existingCats);
}

function _applyCatFilter(ctx, cats, existingCats) {
  cats.forEach(c => {
    if (c.id === 'all') return;
    const chip = document.getElementById(ctx + '-cat-chip-' + c.id);
    if (chip) chip.style.display = existingCats.has(c.id) ? '' : 'none';
  });
}

function invalidateCatCache() {
  Object.keys(_catCache).forEach(k => delete _catCache[k]);
}

// ===== PAGE NAVIGATION =====
function showPage(p) {
  // Hide all pages
  document.querySelectorAll('.page').forEach(x => x.style.display = 'none');

  // Show target page
  const target = document.getElementById('page-' + p);
  if (target) target.style.display = 'block';

  // Update navbar active link
  document.querySelectorAll('.nav-links a').forEach(a => a.classList.remove('active'));
  const navLink = document.getElementById('nav-' + p);
  if (navLink) navLink.classList.add('active');

  currentPage = p;
  window.scrollTo(0, 0);
  updateSEO(p);
  _loadPageData(p);
}

// ===== DATA LOADING =====
function _loadPageData(p) {
  if (p === 'home')    { buildHomeCats(); loadHomeDeals(); loadRecommend(); }
  if (p === 'deals')   { buildDealsCats(); loadDeals(); }
  if (p === 'expired') { buildExpiredCats(); loadExpiredPage(); }
  if (p === 'coupons') loadCoupons();
  if (p === 'blog')    loadBlog();

  // Dashboards — guard is inside each init function
  if (p === 'merchant-dashboard') _loadMerchantDash();
  if (p === 'merchant-onboarding') initMerchantOnboarding();
  if (p === 'admin-dashboard')    _loadAdminDash();
  if (p === 'profile')            renderProfilePage();
  if (p === 'store')              _loadStore();
  if (p === 'deal')               _loadDeal();
}

// ===== DASHBOARD SHELL CACHING =====
// Phase 5.1 fix: only rebuild shell if not already mounted.
// This prevents the full shell re-render on every section switch
// that was causing flicker and lag.

let _merchantDashMounted = false;
let _adminDashMounted    = false;

function _loadMerchantDash() {
  if (!_merchantDashMounted) {
    _merchantDashMounted = true;
    initMerchantDashboard();
  } else {
    // Shell already rendered — just guard and refresh content
    if (!guardPage('merchant')) { _merchantDashMounted = false; return; }
    // Re-render current section content only
    const sect = typeof _activeDashSection !== 'undefined'
      ? _activeDashSection : 'overview';
    switchDashSection(sect);
  }
}

function _loadAdminDash() {
  if (!_adminDashMounted) {
    _adminDashMounted = true;
    initAdminDashboard();
  } else {
    if (!guardPage('admin')) { _adminDashMounted = false; return; }
    const sect = typeof _adminSection !== 'undefined'
      ? _adminSection : 'overview';
    switchAdminSection(sect);
  }
}

// Reset mount flags on logout so shell re-renders for new user
function _resetDashMounts() {
  _merchantDashMounted = false;
  _adminDashMounted    = false;
}

// ===== STORE PAGE LOADER =====
function _loadStore() {
  const slug = new URLSearchParams(window.location.search).get('slug') || '';
  loadStorePage(slug);
}

// ===== DEAL PAGE LOADER =====
function _loadDeal() {
  const id = new URLSearchParams(window.location.search).get('id') || '';
  loadDealPage(id);
}

// ===== MOBILE NAV =====
function toggleMob() {
  document.getElementById('mob-nav').classList.toggle('open');
}

document.addEventListener('click', function(e) {
  const mobNav = document.getElementById('mob-nav');
  if (
    mobNav &&
    mobNav.classList.contains('open') &&
    !mobNav.contains(e.target) &&
    !e.target.closest('.mob-menu-btn')
  ) {
    mobNav.classList.remove('open');
  }
});

// ===== BROWSER BACK / FORWARD =====
window.addEventListener('popstate', function(e) {
  if (e.state && e.state.page) {
    const p = e.state.page;
    document.querySelectorAll('.page').forEach(x => x.style.display = 'none');
    const target = document.getElementById('page-' + p);
    if (target) target.style.display = 'block';
    document.querySelectorAll('.nav-links a').forEach(a => a.classList.remove('active'));
    const n = document.getElementById('nav-' + p);
    if (n) n.classList.add('active');
    currentPage = p;
    _loadPageData(p);
  }
});

// ===== LOCATION FALLBACK =====
function showLocFallback(ctx) {
  const el = document.getElementById(ctx + '-loc-fallback');
  if (el) el.style.display = 'block';
}

function hideLocFallback(ctx) {
  const el = document.getElementById(ctx + '-loc-fallback');
  if (el) el.style.display = 'none';
  selectedGov  = '';
  selectedCity = '';
}

// ===== GOV/CITY DROPDOWNS =====
function initGovSelects() {
  ['home-gov-select', 'deals-gov-select'].forEach(id => {
    const sel = document.getElementById(id);
    if (!sel || sel.options.length > 1) return; // already populated
    Object.keys(EGYPT_GOVS).forEach(gov => {
      const opt       = document.createElement('option');
      opt.value       = gov;
      opt.textContent = gov;
      sel.appendChild(opt);
    });
  });
}

function onGovChange(ctx) {
  const govSel  = document.getElementById(ctx + '-gov-select');
  const citySel = document.getElementById(ctx + '-city-select');
  selectedGov   = govSel.value;
  selectedCity  = '';

  citySel.innerHTML = '<option value="">كل المراكز</option>';
  if (selectedGov && EGYPT_GOVS[selectedGov]) {
    EGYPT_GOVS[selectedGov].forEach(city => {
      const opt       = document.createElement('option');
      opt.value       = city;
      opt.textContent = city;
      citySel.appendChild(opt);
    });
  }
  if (ctx === 'home') loadHomeDeals();
  else                loadDeals();
}

function onCityChange(ctx) {
  selectedCity = document.getElementById(ctx + '-city-select').value;
  if (ctx === 'home') loadHomeDeals();
  else                loadDeals();
}

// ===== FAQ ACCORDION =====
function toggleFaq(el) {
  const item   = el.closest('.faq-item');
  const isOpen = item.classList.contains('open');
  document.querySelectorAll('.faq-item.open').forEach(i => i.classList.remove('open'));
  if (!isOpen) item.classList.add('open');
}

// ===== LOGIN TABS =====
function switchLoginTab(tab) {
  document.querySelectorAll('.login-tab').forEach(t => t.classList.remove('active'));
  document.querySelectorAll('.login-form-section').forEach(s => s.style.display = 'none');
  const activeTab     = document.querySelector(`.login-tab[data-tab="${tab}"]`);
  const activeSection = document.getElementById('login-' + tab);
  if (activeTab)     activeTab.classList.add('active');
  if (activeSection) activeSection.style.display = 'flex';
}

// ===== INIT APP =====
// Phase 5.1: initAuth() must complete before routing.
// This prevents guardPage() failing during refresh because
// AuthState.user is null when the page loads.
function showApp() {
  document.getElementById('main-nav').style.display    = 'flex';
  document.getElementById('main-footer').style.display = 'block';

  initAuth().then(() => {
    const params   = new URLSearchParams(window.location.search);
    const urlParam = params.get('p');

    if (urlParam === 'store') {
      showPage('store');
    } else if (urlParam === 'deal') {
      showPage('deal');
    } else if (urlParam && URL_PAGE_MAP[urlParam]) {
      showPage(URL_PAGE_MAP[urlParam]);
    } else {
      initHomePage();
    }
  });
}

async function initHomePage() {
  const [r1, r2, r3] = await Promise.all([
    sb.from('deals').select('*', { count: 'exact', head: true })
      .eq('approval_status', 'approved').neq('status', 'expired'),
    sb.from('coupons').select('*', { count: 'exact', head: true }),
    sb.from('deals').select('*', { count: 'exact', head: true }).eq('status', 'expired'),
  ]);

  const fmt = n => n ? (+n).toLocaleString('ar-EG') + '+' : '0';
  const s1 = document.getElementById('stat-deals');
  const s2 = document.getElementById('stat-coupons');
  const s3 = document.getElementById('stat-expired');
  if (s1) s1.textContent = fmt(r1.count);
  if (s2) s2.textContent = fmt(r2.count);
  if (s3) s3.textContent = fmt(r3.count);

  buildHomeCats();
  loadHomeDeals();
  loadRecommend();
  initGovSelects();
  autoExpireDeals();
}
