/**
 * ============================================================
 * SHEKSS — MERCHANT DASHBOARD
 * scripts/merchant-dashboard.js
 * ============================================================
 * Depends on: auth.js (AuthState, guardPage), utils.js (toast),
 *             nav-location.js (showPage)
 *
 * Entry point: initMerchantDashboard()
 *   → called from _loadPageData() in nav-location.js
 *   → guards with guardPage('merchant')
 *   → renders dashboard sections
 *
 * Active dashboard section tracked in: _activeDashSection
 *
 * Future phases will add real data to each section.
 * ============================================================
 */

// ===== DASHBOARD STATE =====
let _activeDashSection = 'overview'; // overview | deals | visibility | messages

// ===== ENTRY POINT =====
// Called by _loadPageData('merchant-dashboard') every time the page opens.
function initMerchantDashboard() {
  // 1. Guard: must be logged in AND have role='merchant'
  if (!guardPage('merchant')) return;

  // 2. Render with current AuthState (already loaded — zero DB call)
  const profile = AuthState.profile;
  const user    = AuthState.user;
  const name    = profile?.full_name || user?.email?.split('@')[0] || 'التاجر';

  _renderDashboard(name, profile);
}

// ===== RENDER DASHBOARD =====
function _renderDashboard(name, profile) {
  const container = document.getElementById('merchant-dashboard-inner');
  if (!container) return;

  container.innerHTML = `
    <div class="dash-page">

      <!-- ── SIDEBAR ── -->
      <aside class="dash-sidebar">
        <div class="dash-sidebar-header">
          <div class="dash-sidebar-brand">🏪 لوحة التاجر</div>
          <div class="dash-sidebar-merchant">${_dEsc(name)}</div>
        </div>

        <nav class="dash-nav">
          <span class="dash-nav-section-label">الرئيسية</span>

          <button class="dash-nav-item ${_activeDashSection === 'overview'    ? 'active' : ''}"
                  onclick="switchDashSection('overview')">
            <span class="nav-ico">📊</span> نظرة عامة
          </button>

          <span class="dash-nav-section-label">إدارة المحتوى</span>

          <button class="dash-nav-item ${_activeDashSection === 'deals'       ? 'active' : ''}"
                  onclick="switchDashSection('deals')">
            <span class="nav-ico">🏷️</span> إدارة العروض
            <span class="nav-badge" id="dash-deals-count">—</span>
          </button>

          <button class="dash-nav-item ${_activeDashSection === 'visibility'  ? 'active' : ''}"
                  onclick="switchDashSection('visibility')">
            <span class="nav-ico">👁️</span> الرؤية والظهور
          </button>

          <span class="dash-nav-section-label">التواصل</span>

          <button class="dash-nav-item ${_activeDashSection === 'messages'    ? 'active' : ''}"
                  onclick="switchDashSection('messages')">
            <span class="nav-ico">💬</span> الرسائل
            <span class="nav-badge" id="dash-msg-count">—</span>
          </button>
        </nav>

        <div class="dash-sidebar-footer">
          <button class="dash-back-btn" onclick="showPage('home')">
            <span>←</span> العودة للموقع
          </button>
        </div>
      </aside>

      <!-- ── MAIN ── -->
      <main class="dash-main">

        <!-- Topbar -->
        <div class="dash-topbar">
          <div>
            <div class="dash-topbar-title" id="dash-section-title">نظرة عامة</div>
            <div class="dash-topbar-sub" id="dash-section-sub">مرحباً بك في لوحة التحكم</div>
          </div>
          <div class="dash-topbar-actions">
            <button class="dash-btn dash-btn-ghost" onclick="initMerchantDashboard()">🔄 تحديث</button>
          </div>
        </div>

        <!-- Content area — sections swap here -->
        <div class="dash-content" id="dash-section-content">
          ${_renderOverview(name)}
        </div>

      </main>
    </div>`;

  // Load counts asynchronously after render
  _loadDashCounts();
}

// ===== SWITCH SECTION =====
function switchDashSection(section) {
  _activeDashSection = section;

  // Update sidebar active state
  document.querySelectorAll('.dash-nav-item').forEach(btn => {
    btn.classList.toggle('active', btn.textContent.trim().includes(_sectionIcon(section)));
  });

  // Simpler: re-query by data or just re-render nav items
  document.querySelectorAll('.dash-nav-item').forEach(btn => {
    const onclick = btn.getAttribute('onclick') || '';
    btn.classList.toggle('active', onclick.includes(`'${section}'`));
  });

  // Update topbar
  const titles = {
    overview:   { title: 'نظرة عامة',        sub: 'ملخص أداء حسابك' },
    deals:      { title: 'إدارة العروض',      sub: 'أضف وعدّل عروضك على شيكس' },
    'add-deal': { title: 'إضافة عرض جديد',   sub: 'أرسل عرضك لمراجعة فريق شيكس' },
    visibility: { title: 'الرؤية والظهور',    sub: 'تحكم في كيفية ظهورك للعملاء' },
    messages:   { title: 'الرسائل',           sub: 'تواصل مع عملائك' },
  };
  const t = titles[section] || titles.overview;
  const titleEl = document.getElementById('dash-section-title');
  const subEl   = document.getElementById('dash-section-sub');
  if (titleEl) titleEl.textContent = t.title;
  if (subEl)   subEl.textContent   = t.sub;

  // Render section content
  const contentEl = document.getElementById('dash-section-content');
  if (!contentEl) return;

  const name = AuthState.profile?.full_name
    || AuthState.user?.email?.split('@')[0]
    || 'التاجر';

  if (section === 'overview')   contentEl.innerHTML = _renderOverview(name);
  if (section === 'deals')      { contentEl.innerHTML = _renderDeals(); _loadMerchantDeals(); }
  if (section === 'add-deal')   { contentEl.innerHTML = renderAddDealForm(); _initAddDealDefaults(); }
  if (section === 'visibility') contentEl.innerHTML = _renderVisibility();
  if (section === 'messages')   contentEl.innerHTML = _renderMessages();
}

// ===== INIT ADD-DEAL DEFAULTS =====
// Called immediately after renderAddDealForm() sets innerHTML,
// so DOM elements exist when we set initial state.
function _initAddDealDefaults() {
  // Set expires preview for default duration (1 day)
  if (typeof _updateExpiresPreview === 'function') {
    _updateExpiresPreview(1);
  }
  // Reset module state
  if (typeof _resetDealForm === 'function') {
    _resetDealForm();
  }
}
function _renderOverview(name) {
  return `
    <!-- Welcome Banner -->
    <div class="dash-welcome">
      <div class="dash-welcome-text">
        <div class="dash-welcome-greeting">مرحباً بك 👋</div>
        <div class="dash-welcome-name">${_dEsc(name)}</div>
        <div class="dash-welcome-hint">لوحة تحكمك جاهزة — ابدأ بإضافة عروضك على شيكس</div>
      </div>
      <div class="dash-welcome-icon">🏪</div>
    </div>

    <!-- Account Status -->
    <div class="dash-status-banner pending">
      <span class="status-ico">⏳</span>
      <div>
        <strong>حسابك قيد المراجعة</strong> —
        سيتم تفعيل حساب التاجر خلال ٢٤ ساعة بعد مراجعة فريق شيكس.
        <a onclick="showPage('contact')"
           style="color:var(--orange);cursor:pointer;font-weight:800;text-decoration:underline;margin-right:6px;">
          تواصل معنا
        </a>
      </div>
    </div>

    <!-- Stats -->
    <div class="dash-stats">
      ${_statCard('🏷️', 'عروض نشطة',   '0',  '',         '#eff6ff')}
      ${_statCard('👁️', 'مشاهدات',      '0',  '',         '#f5f3ff')}
      ${_statCard('💬', 'رسائل',         '0',  '',         '#fff7ed')}
      ${_statCard('⭐', 'التقييم',        '—',  '',         '#f0fdf4')}
    </div>

    <!-- Quick links -->
    <div class="dash-sections">

      <div class="dash-section-card">
        <div class="dash-section-head">
          <div class="dash-section-title">🏷️ العروض</div>
          <button class="dash-btn dash-btn-ghost"
                  onclick="switchDashSection('deals');_loadMerchantDeals()">
            عرض الكل
          </button>
        </div>
        <div class="dash-section-body">
          <div class="dash-coming-soon">
            <div class="dash-coming-soon-ico">🏷️</div>
            <h4>لم تضف أي عروض بعد</h4>
            <p>بعد تفعيل حسابك ستتمكن من إضافة عروضك وخصوماتك لعملاء شيكس</p>
          </div>
        </div>
      </div>

      <div class="dash-section-card">
        <div class="dash-section-head">
          <div class="dash-section-title">💬 آخر الرسائل</div>
          <button class="dash-btn dash-btn-ghost" onclick="switchDashSection('messages')">
            عرض الكل
          </button>
        </div>
        <div class="dash-section-body">
          <div class="dash-coming-soon">
            <div class="dash-coming-soon-ico">💬</div>
            <h4>لا توجد رسائل بعد</h4>
            <p>رسائل العملاء ستظهر هنا بعد تفعيل الحساب</p>
          </div>
        </div>
      </div>

    </div>`;
}


// ===== SECTION: DEALS =====
// Delegated to merchant-deals-manager.js (Phase 3.3)
// _renderDeals, _loadMerchantDeals, _merchantDealRow removed.

function _renderDeals() {
  return renderDealsSection(); // → merchant-deals-manager.js
}

async function _loadMerchantDeals() {
  await loadMerchantDeals(); // → merchant-deals-manager.js
}

// ===== SECTION: VISIBILITY =====
function _renderVisibility() {
  return `
    <div class="dash-sections">

      <div class="dash-section-card">
        <div class="dash-section-head">
          <div class="dash-section-title">🏪 صفحة المتجر</div>
        </div>
        <div class="dash-section-body">
          <div class="dash-coming-soon">
            <div class="dash-coming-soon-ico">🏪</div>
            <h4>صفحة المتجر — قريباً</h4>
            <p>صفحة خاصة بمتجرك على شيكس تجمع كل عروضك وتفاصيلك</p>
          </div>
        </div>
      </div>

      <div class="dash-section-card">
        <div class="dash-section-head">
          <div class="dash-section-title">📊 إحصائيات الظهور</div>
        </div>
        <div class="dash-section-body">
          <div class="dash-coming-soon">
            <div class="dash-coming-soon-ico">📊</div>
            <h4>إحصائيات الظهور — قريباً</h4>
            <p>تابع كم مستخدم شاف عروضك ومدى انتشارها على شيكس</p>
          </div>
        </div>
      </div>

      <div class="dash-section-card full">
        <div class="dash-section-head">
          <div class="dash-section-title">⭐ التقييمات</div>
        </div>
        <div class="dash-section-body">
          <div class="dash-coming-soon">
            <div class="dash-coming-soon-ico">⭐</div>
            <h4>نظام التقييمات — قريباً</h4>
            <p>سيتمكن عملاء شيكس من تقييم عروضك ومشاركة تجربتهم</p>
          </div>
        </div>
      </div>

    </div>`;
}

// ===== SECTION: MESSAGES =====
function _renderMessages() {
  return `
    <div class="dash-section-card" style="margin-bottom:0;">
      <div class="dash-section-head">
        <div class="dash-section-title">💬 الرسائل</div>
      </div>
      <div class="dash-section-body">
        <div class="dash-coming-soon" style="padding:48px 20px;">
          <div class="dash-coming-soon-ico">💬</div>
          <h4>صندوق الرسائل — قريباً</h4>
          <p>
            ستصلك هنا رسائل واستفسارات العملاء المهتمين بعروضك،
            وإشعارات من فريق شيكس.
          </p>
          <br>
          <button class="dash-btn dash-btn-ghost" onclick="showPage('contact')">
            📩 راسلنا مباشرة
          </button>
        </div>
      </div>
    </div>`;
}

// ===== LOAD COUNTS (async, non-blocking) =====
async function _loadDashCounts() {
  try {
    const userId = AuthState.user?.id;
    if (!userId) return;

    // Fetch merchant's own deals count
    const { count: dealsCount } = await sb
      .from('deals')
      .select('*', { count: 'exact', head: true })
      .eq('merchant_id', userId)
      .neq('status', 'expired');

    const dealsEl = document.getElementById('dash-deals-count');
    if (dealsEl && dealsCount !== null) {
      dealsEl.textContent = dealsCount;
      dealsEl.style.display = dealsCount > 0 ? '' : 'none';
    }
  } catch (_) {
    // Silently ignore — counts are non-critical
    // (table may not have merchant_id column yet)
  }
}

// ===== HELPERS =====
function _statCard(ico, label, value, delta, bg) {
  const deltaHtml = delta
    ? `<div class="dash-stat-delta up">↑ ${delta}</div>`
    : `<div class="dash-stat-delta flat">— لا توجد بيانات بعد</div>`;

  return `
    <div class="dash-stat-card">
      <div class="dash-stat-icon" style="background:${bg};">${ico}</div>
      <div class="dash-stat-label">${label}</div>
      <div class="dash-stat-value">${value}</div>
      ${deltaHtml}
    </div>`;
}

function _sectionIcon(section) {
  const map = { overview: '📊', deals: '🏷️', visibility: '👁️', messages: '💬' };
  return map[section] || '';
}

// Escape HTML to prevent XSS from user-supplied names
function _dEsc(str) {
  if (!str) return '';
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}
