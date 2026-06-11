/**
 * ============================================================
 * SHEKSS — ADMIN DASHBOARD
 * scripts/admin-dashboard.js
 * ============================================================
 * Entry point for the entire admin system.
 * Sub-modules: admin-deals.js, admin-merchants.js, admin-messages.js
 *
 * Depends on: auth.js (AuthState, guardPage), supabase.js (sb),
 *             utils.js (toast), nav-location.js (showPage)
 * ============================================================
 */

// ===== ACTIVE SECTION =====
let _adminSection = 'overview';

// ===== ENTRY POINT =====
function initAdminDashboard() {
  if (!guardPage('admin')) return;

  const inner = document.getElementById('admin-dashboard-inner');
  if (!inner) return;

  // Shell already mounted — only refresh current section
  if (inner.querySelector('.dash-page')) {
    switchAdminSection(_adminSection || 'overview');
    return;
  }

  _adminSection = 'overview';
  _renderAdminShell();
  _loadAdminOverview();
}

// ===== SHELL =====
function _renderAdminShell() {
  const inner = document.getElementById('admin-dashboard-inner');
  if (!inner) return;

  inner.innerHTML = `
    <div class="dash-page">

      <!-- SIDEBAR -->
      <aside class="dash-sidebar adm-sidebar">
        <div class="dash-sidebar-header">
          <div class="dash-sidebar-brand">⚙️ لوحة الإدارة</div>
          <div class="dash-sidebar-merchant">شيكس — Admin</div>
        </div>
        <nav class="dash-nav">
          <span class="dash-nav-section-label">الرئيسية</span>
          ${_adminNavItem('overview',   '📊', 'نظرة عامة')}

          <span class="dash-nav-section-label">العروض</span>
          ${_adminNavItem('pending-deals',    '⏳', 'طلبات العروض',    'adm-badge-pending-deals')}
          ${_adminNavItem('edit-requests',    '✏️', 'طلبات التعديل',   'adm-badge-edit-req')}
          ${_adminNavItem('delete-requests',  '🗑️', 'طلبات الحذف',     'adm-badge-del-req')}

          <span class="dash-nav-section-label">الإدارة</span>
          ${_adminNavItem('merchant-requests','🆕', 'طلبات التجار',    'adm-badge-merch-req')}
          ${_adminNavItem('merchants',        '🏪', 'إدارة التجار')}
          ${_adminNavItem('messages',         '💬', 'الرسائل',         'adm-badge-msgs')}
          ${_adminNavItem('complaints',       '⚠️', 'الشكاوى',         'adm-badge-complaints')}
        </nav>
        <div class="dash-sidebar-footer">
          <button class="dash-back-btn" onclick="showPage('home')">← العودة للموقع</button>
        </div>
      </aside>

      <!-- MAIN -->
      <main class="dash-main">
        <div class="dash-topbar">
          <div>
            <div class="dash-topbar-title" id="adm-section-title">نظرة عامة</div>
            <div class="dash-topbar-sub"   id="adm-section-sub">ملخص النظام</div>
          </div>
          <div class="dash-topbar-actions">
            <button class="dash-btn dash-btn-ghost" onclick="initAdminDashboard()">🔄 تحديث</button>
          </div>
        </div>
        <div class="dash-content" id="adm-content">
          <div class="mdm-loading">⏳ جاري التحميل...</div>
        </div>
      </main>
    </div>`;
}

// ===== NAV ITEM HELPER =====
function _adminNavItem(section, ico, label, badgeId) {
  const badge = badgeId
    ? `<span class="nav-badge" id="${badgeId}" style="display:none;">0</span>` : '';
  return `
    <button class="dash-nav-item ${_adminSection === section ? 'active' : ''}"
            onclick="switchAdminSection('${section}')">
      <span class="nav-ico">${ico}</span> ${label}${badge}
    </button>`;
}

// ===== SWITCH SECTION =====
function switchAdminSection(section) {
  _adminSection = section;

  // Update sidebar
  document.querySelectorAll('.adm-sidebar .dash-nav-item').forEach(btn => {
    const oc = btn.getAttribute('onclick') || '';
    btn.classList.toggle('active', oc.includes(`'${section}'`));
  });

  // Update topbar
  const titles = {
    'overview':          { title: 'نظرة عامة',        sub: 'ملخص النظام الكامل' },
    'pending-deals':     { title: 'طلبات العروض',      sub: 'عروض تنتظر الموافقة' },
    'edit-requests':     { title: 'طلبات التعديل',     sub: 'تعديلات تنتظر المراجعة' },
    'delete-requests':   { title: 'طلبات الحذف',       sub: 'طلبات الحذف المعلقة' },
    'merchant-requests': { title: 'طلبات التجار',      sub: 'تجار جدد ينتظرون الموافقة' },
    'merchants':         { title: 'إدارة التجار',      sub: 'كل التجار المسجلين' },
    'messages':          { title: 'الرسائل',           sub: 'رسائل العملاء والتجار' },
    'complaints':        { title: 'الشكاوى',           sub: 'شكاوى العملاء والتجار' },
  };
  const t = titles[section] || titles.overview;
  const titleEl = document.getElementById('adm-section-title');
  const subEl   = document.getElementById('adm-section-sub');
  if (titleEl) titleEl.textContent = t.title;
  if (subEl)   subEl.textContent   = t.sub;

  // Render content
  const content = document.getElementById('adm-content');
  if (!content) return;

  if (section === 'overview')          _loadAdminOverview();
  if (section === 'pending-deals')     renderAdminPendingDeals();
  if (section === 'edit-requests')     renderAdminEditRequests();
  if (section === 'delete-requests')   renderAdminDeleteRequests();
  if (section === 'merchant-requests') renderMerchantRequests();
  if (section === 'merchants')         renderAdminMerchants();
  if (section === 'messages')          renderAdminMessages();
  if (section === 'complaints')        renderAdminComplaints();
}

// ===== OVERVIEW =====
async function _loadAdminOverview() {
  const content = document.getElementById('adm-content');
  if (!content) return;
  content.innerHTML = '<div class="mdm-loading">⏳ جاري تحميل الإحصائيات...</div>';

  try {
    const [
      { count: pendingDeals },
      { count: editReqs },
      { count: delReqs },
      { count: merchants },
      { count: messages },
      { count: complaints },
      { count: totalDeals },
      { count: merchantReqs },
    ] = await Promise.all([
      sb.from('deals').select('*',{count:'exact',head:true}).eq('approval_status','pending_approval'),
      sb.from('deals').select('*',{count:'exact',head:true}).eq('edit_request_status','pending'),
      sb.from('deals').select('*',{count:'exact',head:true}).eq('delete_request_status','pending'),
      sb.from('profiles').select('*',{count:'exact',head:true}).eq('role','merchant').eq('approval_status','approved'),
      sb.from('messages').select('*',{count:'exact',head:true}),
      sb.from('complaints').select('*',{count:'exact',head:true}).eq('status','open'),
      sb.from('deals').select('*',{count:'exact',head:true}).eq('approval_status','approved'),
      sb.from('profiles').select('*',{count:'exact',head:true}).eq('role','merchant').eq('approval_status','pending'),
    ]);

    _setBadge('adm-badge-pending-deals', pendingDeals);
    _setBadge('adm-badge-edit-req',      editReqs);
    _setBadge('adm-badge-del-req',       delReqs);
    _setBadge('adm-badge-msgs',          messages);
    _setBadge('adm-badge-complaints',    complaints);
    _setBadge('adm-badge-merch-req',     merchantReqs);

    const urgent = (pendingDeals || 0) + (editReqs || 0) + (delReqs || 0) + (merchantReqs || 0);

    content.innerHTML = `
      ${urgent > 0 ? `
        <div class="adm-alert">
          ⚠️ يوجد <strong>${urgent}</strong> طلب يحتاج مراجعة فورية
        </div>` : ''}

      <div class="dash-stats">
        ${_admStat('🆕', 'طلبات تجار',    merchantReqs || 0, '#faf5ff', 'merchant-requests')}
        ${_admStat('⏳', 'عروض معلقة',    pendingDeals || 0, '#fff7ed', 'pending-deals')}
        ${_admStat('✅', 'عروض مُعتمدة',  totalDeals   || 0, '#f0fdf4', '')}
        ${_admStat('🏪', 'تجار نشطين',    merchants    || 0, '#eff6ff', 'merchants')}
        ${_admStat('✏️', 'طلبات تعديل',   editReqs     || 0, '#faf5ff', 'edit-requests')}
        ${_admStat('⚠️', 'شكاوى مفتوحة', complaints   || 0, '#fff7ed', 'complaints')}
      </div>

      <div class="adm-quick-grid">
        <div class="adm-quick-card" onclick="switchAdminSection('merchant-requests')">
          <div class="adm-quick-ico">🆕</div>
          <div class="adm-quick-label">طلبات التجار</div>
          <div class="adm-quick-count">${merchantReqs || 0} معلق</div>
        </div>
        <div class="adm-quick-card" onclick="switchAdminSection('pending-deals')">
          <div class="adm-quick-ico">⏳</div>
          <div class="adm-quick-label">مراجعة العروض</div>
          <div class="adm-quick-count">${pendingDeals || 0} معلق</div>
        </div>
        <div class="adm-quick-card" onclick="switchAdminSection('edit-requests')">
          <div class="adm-quick-ico">✏️</div>
          <div class="adm-quick-label">طلبات التعديل</div>
          <div class="adm-quick-count">${editReqs || 0} معلق</div>
        </div>
        <div class="adm-quick-card" onclick="switchAdminSection('merchants')">
          <div class="adm-quick-ico">🏪</div>
          <div class="adm-quick-label">إدارة التجار</div>
          <div class="adm-quick-count">${merchants || 0} تاجر</div>
        </div>
      </div>`;

  } catch (err) {
    content.innerHTML = `<div class="mdm-empty"><p>❌ خطأ في تحميل البيانات: ${_aesc(err.message)}</p></div>`;
  }
}

// ===== HELPERS =====
function _setBadge(id, count) {
  const el = document.getElementById(id);
  if (!el) return;
  el.textContent   = count || 0;
  el.style.display = (count && count > 0) ? '' : 'none';
}

function _admStat(ico, label, value, bg, section) {
  // section: string like 'pending-deals' — passed to switchAdminSection()
  const clickAttr = section
    ? `style="cursor:pointer;" onclick="switchAdminSection('${section}')"`
    : '';
  return `
    <div class="dash-stat-card" ${clickAttr}>
      <div class="dash-stat-icon" style="background:${bg};">${ico}</div>
      <div class="dash-stat-label">${label}</div>
      <div class="dash-stat-value">${Number(value).toLocaleString('ar-EG')}</div>
    </div>`;
}

// Minimal HTML escaper for admin (server data, lower XSS risk but still escape)
function _aesc(str) {
  if (!str) return '';
  return String(str)
    .replace(/&/g,'&amp;').replace(/</g,'&lt;')
    .replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}
