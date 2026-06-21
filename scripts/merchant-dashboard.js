/**
 * ============================================================
 * SHEKSS — MERCHANT DASHBOARD
 * scripts/merchant-dashboard.js
 * ============================================================
 * Phase 5.3: added 'business-profile' section
 * 'my-profile' kept for backwards compat but now delegates
 * to business-profile section.
 * ============================================================
 */

let _activeDashSection = 'overview';

// ===== ENTRY POINT =====
function initMerchantDashboard() {
  if (!guardPage('merchant')) return;

  const status = AuthState.profile?.approval_status;
  if (status !== 'approved') {
    showPage('merchant-onboarding');
    return;
  }

  const container = document.getElementById('merchant-dashboard-inner');
  if (!container) return;

  if (container.querySelector('.dash-page')) {
    switchDashSection(_activeDashSection || 'overview');
    return;
  }

  const profile = AuthState.profile;
  const user    = AuthState.user;
  const name    = profile?.full_name || user?.email?.split('@')[0] || 'التاجر';
  _renderDashboard(name, profile);
}

// ===== SHELL =====
function _renderDashboard(name, profile) {
  const container = document.getElementById('merchant-dashboard-inner');
  if (!container) return;

  const profileComplete = isProfileComplete();

  container.innerHTML = `
    <div class="dash-page">

      <aside class="dash-sidebar">
        <div class="dash-sidebar-header">
          <div class="dash-sidebar-brand">🏪 لوحة التاجر</div>
          <div class="dash-sidebar-merchant">${_dEsc(name)}</div>
        </div>
        <nav class="dash-nav">
          <span class="dash-nav-section-label">الرئيسية</span>
          <button class="dash-nav-item ${_activeDashSection === 'overview' ? 'active' : ''}"
                  onclick="switchDashSection('overview')">
            <span class="nav-ico">📊</span> نظرة عامة
          </button>

          <span class="dash-nav-section-label">إدارة المحتوى</span>
          <button class="dash-nav-item ${_activeDashSection === 'deals' ? 'active' : ''}"
                  onclick="switchDashSection('deals')">
            <span class="nav-ico">🏷️</span> إدارة العروض
            <span class="nav-badge" id="dash-deals-count" style="display:none;">0</span>
          </button>
          <button class="dash-nav-item ${_activeDashSection === 'visibility' ? 'active' : ''}"
                  onclick="switchDashSection('visibility')">
            <span class="nav-ico">👁️</span> الرؤية والظهور
          </button>

          <span class="dash-nav-section-label">حسابي</span>
          <button class="dash-nav-item ${_activeDashSection === 'business-profile' ? 'active' : ''}"
                  onclick="switchDashSection('business-profile')">
            <span class="nav-ico">🏪</span> بيانات النشاط
            ${!profileComplete
              ? '<span class="nav-badge" style="background:var(--orange);">!</span>'
              : ''}
          </button>
          <button class="dash-nav-item ${_activeDashSection === 'messages' ? 'active' : ''}"
                  onclick="switchDashSection('messages')">
            <span class="nav-ico">💬</span> الرسائل
          </button>
        </nav>
        <div class="dash-sidebar-footer">
          <button class="dash-back-btn" onclick="showPage('home')">← العودة للموقع</button>
        </div>
      </aside>

      <main class="dash-main">
        <div class="dash-topbar">
          <div>
            <div class="dash-topbar-title" id="dash-section-title">نظرة عامة</div>
            <div class="dash-topbar-sub"   id="dash-section-sub">مرحباً بك في لوحة التحكم</div>
          </div>
          <div class="dash-topbar-actions">
            <button class="dash-btn dash-btn-ghost" onclick="initMerchantDashboard()">🔄 تحديث</button>
          </div>
        </div>
        <div class="dash-content" id="dash-section-content">
          ${!profileComplete ? _profileWarningBanner() : ''}
          ${_renderOverview(name)}
        </div>
      </main>
    </div>`;

  _loadDashCounts();
}

// ===== SWITCH SECTION =====
function switchDashSection(section) {
  _activeDashSection = section;

  document.querySelectorAll('.dash-nav-item').forEach(btn => {
    const oc = btn.getAttribute('onclick') || '';
    btn.classList.toggle('active', oc.includes(`'${section}'`));
  });

  const titles = {
    'overview':         { title: 'نظرة عامة',        sub: 'ملخص أداء حسابك' },
    'deals':            { title: 'إدارة العروض',      sub: 'عروضك على شيكس' },
    'add-deal':         { title: 'إضافة عرض جديد',   sub: 'أرسل عرضك لمراجعة فريق شيكس' },
    'business-profile': { title: 'بيانات النشاط',     sub: 'معلومات نشاطك التجاري' },
    'visibility':       { title: 'الرؤية والظهور',    sub: 'كيفية ظهورك للعملاء' },
    'messages':         { title: 'الرسائل',           sub: 'تواصل مع عملائك' },
  };

  const t = titles[section] || titles.overview;
  const titleEl = document.getElementById('dash-section-title');
  const subEl   = document.getElementById('dash-section-sub');
  if (titleEl) titleEl.textContent = t.title;
  if (subEl)   subEl.textContent   = t.sub;

  const content = document.getElementById('dash-section-content');
  if (!content) return;

  const name = AuthState.profile?.full_name
    || AuthState.user?.email?.split('@')[0] || 'التاجر';

  if (section === 'overview')         { content.innerHTML = _renderOverview(name); _loadDashCounts(); }
  if (section === 'deals')            { content.innerHTML = _renderDeals(); _loadMerchantDeals(); }
  if (section === 'add-deal')         { content.innerHTML = renderAddDealForm(); _initAddDealDefaults(); }
  if (section === 'business-profile') {
    content.innerHTML = renderBusinessProfile();
    initBusinessProfileForm();
  }
  if (section === 'visibility')       content.innerHTML = _renderVisibility();
  if (section === 'messages')         content.innerHTML = _renderMessages();
}

// ===== PROFILE WARNING BANNER =====
function _profileWarningBanner() {
  return `
    <div style="background:#fff7ed;border:1.5px solid #fed7aa;border-radius:12px;
                padding:14px 18px;margin-bottom:20px;display:flex;align-items:center;gap:12px;">
      <span style="font-size:20px;">⚠️</span>
      <div style="flex:1;">
        <strong style="font-size:13px;color:#c2410c;">بيانات النشاط غير مكتملة</strong>
        <p style="font-size:12px;color:#9a3412;margin-top:2px;">
          أكمل بيانات نشاطك عشان تقدر تضيف عروض
        </p>
      </div>
      <button class="dash-btn"
              style="background:var(--orange);color:white;border-color:var(--orange);flex-shrink:0;"
              onclick="switchDashSection('business-profile')">
        إكمال البيانات
      </button>
    </div>`;
}

// ===== OVERVIEW =====
function _renderOverview(name) {
  const p        = AuthState.profile || {};
  const complete = isProfileComplete();

  return `
    <div class="dash-welcome">
      <div class="dash-welcome-text">
        <div class="dash-welcome-greeting">مرحباً بك 👋</div>
        <div class="dash-welcome-name">${_dEsc(name)}</div>
        <div class="dash-welcome-hint">
          ${p.business_name || p.company_name
            ? `🏪 ${_dEsc(p.business_name || p.company_name)}`
            : 'أكمل بيانات نشاطك للبدء'}
        </div>
      </div>
      <div class="dash-welcome-icon">
        ${p.business_logo
          ? `<img src="${_dEsc(p.business_logo)}" alt="logo"
                  style="width:64px;height:64px;border-radius:14px;object-fit:cover;
                         border:2px solid rgba(255,255,255,0.3);">`
          : '🏪'}
      </div>
    </div>

    <div class="dash-stats">
      ${_statCard('🏷️', 'عروض نشطة',  '—', '#eff6ff', 'stat-active-deals')}
      ${_statCard('👁️', 'مشاهدات',     '—', '#f5f3ff', 'stat-views')}
      ${_statCard('💬', 'رسائل',        '0', '#fff7ed', 'stat-messages')}
      ${_statCard('⭐', 'التقييم',       '—', '#f0fdf4', 'stat-rating')}
    </div>

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
            <p>اضغط "+ إضافة عرض جديد" للبدء</p>
          </div>
        </div>
      </div>

      <!-- Business Profile card — partial update via id -->
      <div class="dash-section-card" id="bp-overview-card">
        ${_profileOverviewCardContent(complete)}
      </div>

      <!-- Store page link -->
      ${(AuthState.profile?.business_slug && complete) ? `
      <div class="dash-section-card">
        <div class="dash-section-head">
          <div class="dash-section-title">🔗 صفحة متجرك</div>
        </div>
        <div class="dash-section-body">
          <div style="display:flex;align-items:center;gap:12px;flex-wrap:wrap;">
            <code style="font-size:12px;background:var(--gray-50);padding:8px 14px;
                         border-radius:8px;border:1px solid var(--gray-200);
                         color:var(--blue);font-weight:700;direction:ltr;">
              /?p=store&slug=${_dEsc(AuthState.profile.business_slug)}
            </code>
            <button class="dash-btn dash-btn-primary"
                    onclick="showPage('store');history.pushState({page:'store'},'','/?p=store&slug=${_dEsc(AuthState.profile.business_slug)}')">
              👁️ معاينة المتجر
            </button>
          </div>
        </div>
      </div>` : ''}

    </div>`;
}

// ===== DEALS =====
function _renderDeals() { return renderDealsSection(); }
async function _loadMerchantDeals() { await loadMerchantDeals(); }

// ===== VISIBILITY =====
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
            <p>صفحة خاصة بمتجرك على شيكس تجمع كل عروضك</p>
          </div>
        </div>
      </div>
      <div class="dash-section-card">
        <div class="dash-section-head">
          <div class="dash-section-title">📊 إحصائيات</div>
        </div>
        <div class="dash-section-body">
          <div class="dash-coming-soon">
            <div class="dash-coming-soon-ico">📊</div>
            <h4>الإحصائيات — قريباً</h4>
            <p>تابع أداء عروضك ومشاهداتها</p>
          </div>
        </div>
      </div>
    </div>`;
}

// ===== MESSAGES =====
function _renderMessages() {
  return `
    <div class="dash-section-card">
      <div class="dash-section-body">
        <div class="dash-coming-soon" style="padding:48px 20px;">
          <div class="dash-coming-soon-ico">💬</div>
          <h4>صندوق الرسائل — قريباً</h4>
          <p>رسائل العملاء ستصلك هنا</p>
          <br>
          <button class="dash-btn dash-btn-ghost" onclick="showPage('contact')">
            📩 راسلنا مباشرة
          </button>
        </div>
      </div>
    </div>`;
}

// ===== LOAD COUNTS =====
async function _loadDashCounts() {
  try {
    // Active (approved, non-expired) deals — used for both sidebar badge and overview stat
    const { data: activeDeals, count } = await sb.from('deals')
      .select('views', { count: 'exact' })
      .eq('merchant_id', AuthState.user?.id)
      .eq('approval_status', 'approved')
      .neq('status', 'expired');

    const activeCount = count || 0;
    const totalViews  = (activeDeals || []).reduce((sum, d) => sum + (d.views || 0), 0);

    // Sidebar badge — counts ALL non-expired deals (including pending review)
    const { count: allCount } = await sb.from('deals')
      .select('*', { count: 'exact', head: true })
      .eq('merchant_id', AuthState.user?.id)
      .neq('status', 'expired');

    const badgeEl = document.getElementById('dash-deals-count');
    if (badgeEl && allCount !== null) {
      badgeEl.textContent   = allCount;
      badgeEl.style.display = allCount > 0 ? '' : 'none';
    }

    // Overview stat cards — partial update, no full re-render
    const activeEl = document.getElementById('stat-active-deals');
    if (activeEl) activeEl.textContent = activeCount;

    const viewsEl = document.getElementById('stat-views');
    if (viewsEl) viewsEl.textContent = totalViews;

  } catch (_) {}
}

// ===== HELPERS =====
function _initAddDealDefaults() {
  if (typeof _resetDealForm        === 'function') _resetDealForm();
  if (typeof initAddDealPrefill    === 'function') initAddDealPrefill();
}

function _statCard(ico, label, value, bg, id) {
  return `
    <div class="dash-stat-card">
      <div class="dash-stat-icon" style="background:${bg};">${ico}</div>
      <div class="dash-stat-label">${label}</div>
      <div class="dash-stat-value"${id ? ` id="${id}"` : ''}>${value}</div>
      <div class="dash-stat-delta flat">— لا توجد بيانات بعد</div>
    </div>`;
}

function _dEsc(str) {
  if (!str) return '';
  return String(str)
    .replace(/&/g,'&amp;').replace(/</g,'&lt;')
    .replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}
