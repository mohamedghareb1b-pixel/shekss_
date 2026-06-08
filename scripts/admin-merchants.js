/**
 * ============================================================
 * SHEKSS — ADMIN: MERCHANT MANAGEMENT
 * scripts/admin-merchants.js
 * ============================================================
 * FIX: Cache merchants data — fetch once, reuse on re-render.
 * NEW: Merchant profile detail view with phone + link + name.
 * ============================================================
 */

// ===== CACHE =====
let _merchantsCache    = null;   // { merchants: [], countsMap: {}, ts: Date }
let _merchantsDealCache = null;
const CACHE_TTL = 60000;         // 60 seconds — refresh after 1 minute

function _isCacheValid() {
  return _merchantsCache && (Date.now() - _merchantsCache.ts < CACHE_TTL);
}

function _invalidateMerchantsCache() {
  _merchantsCache = null;
}

// ===== MERCHANT REQUESTS (Phase 5.2) =====
// Shows pending merchants waiting for admin approval

let _merchantReqsCache = null;
const MERCH_REQ_TTL    = 30000; // 30s

async function renderMerchantRequests() {
  const content = document.getElementById('adm-content');
  if (!content) return;

  // Use cache if valid
  if (_merchantReqsCache && (Date.now() - _merchantReqsCache.ts < MERCH_REQ_TTL)) {
    _renderMerchantReqList(_merchantReqsCache.data);
    return;
  }

  content.innerHTML = '<div class="mdm-loading">⏳ جاري تحميل طلبات التجار...</div>';

  const { data, error } = await sb
    .from('profiles')
    .select('id, full_name, company_name, phone, governorate, city, location_link, business_category, business_subcategory, description, created_at, approval_status, rejection_reason')
    .eq('role', 'merchant')
    .eq('approval_status', 'pending')
    .order('created_at', { ascending: true });

  if (error) { content.innerHTML = _adm_err(error.message); return; }

  _merchantReqsCache = { data: data || [], ts: Date.now() };
  _renderMerchantReqList(data || []);
}

function _renderMerchantReqList(list) {
  const content = document.getElementById('adm-content');
  if (!content) return;

  _setBadge('adm-badge-merch-req', list.length);

  if (!list.length) {
    content.innerHTML = _adm_empty('🆕', 'لا توجد طلبات معلقة', 'كل طلبات التجار تمت مراجعتها ✅');
    return;
  }

  content.innerHTML = `
    <div class="adm-list">
      ${list.map(m => _merchantReqCard(m)).join('')}
    </div>`;
}

function _merchantReqCard(m) {
  const name    = m.full_name    || '—';
  const company = m.company_name || '—';
  const cat     = m.business_category
    ? (CAT_LABELS[m.business_category] || m.business_category) : '—';
  const subcat  = m.business_subcategory ? ` / ${m.business_subcategory}` : '';
  const gov     = m.governorate ? `${m.governorate}${m.city ? ' — ' + m.city : ''}` : '—';

  return `
    <div class="adm-card" id="adm-mreq-${m.id}">
      <div class="adm-card-body">
        <div class="adm-merchant-avatar" style="width:48px;height:48px;font-size:20px;flex-shrink:0;">
          ${name.charAt(0).toUpperCase()}
        </div>
        <div class="adm-card-info">

          <!-- Business name + applicant -->
          <div class="adm-card-title" style="font-size:17px;">🏪 ${_aesc(company)}</div>
          <div style="font-size:12px;color:var(--gray-400);font-weight:700;margin-bottom:8px;">
            👤 صاحب النشاط: ${_aesc(name)}
          </div>

          <!-- Key details grid -->
          <div class="adm-mreq-grid">
            <div class="adm-mreq-row">
              <span class="adm-mreq-label">📞 واتساب</span>
              <span class="adm-mreq-val">${m.phone ? _aesc(m.phone) : '—'}</span>
            </div>
            <div class="adm-mreq-row">
              <span class="adm-mreq-label">📍 الموقع</span>
              <span class="adm-mreq-val">${_aesc(gov)}</span>
            </div>
            <div class="adm-mreq-row">
              <span class="adm-mreq-label">📂 التصنيف</span>
              <span class="adm-mreq-val">${_aesc(cat)}${_aesc(subcat)}</span>
            </div>
            <div class="adm-mreq-row">
              <span class="adm-mreq-label">📅 تاريخ التسجيل</span>
              <span class="adm-mreq-val">${_fmtD(m.created_at)}</span>
            </div>
          </div>

          <!-- Description -->
          ${m.description ? `
            <div style="background:var(--gray-50);border-radius:8px;padding:10px 12px;
                        margin-top:10px;font-size:12px;color:var(--gray-700);line-height:1.6;">
              <strong>📝 وصف النشاط:</strong><br>${_aesc(m.description)}
            </div>` : ''}

          <!-- Google Maps link -->
          ${m.location_link ? `
            <a href="${_aesc(m.location_link)}" target="_blank" rel="noopener"
               style="display:inline-flex;align-items:center;gap:6px;margin-top:10px;
                      font-size:12px;color:var(--blue);font-weight:700;text-decoration:none;
                      background:var(--blue-light);padding:5px 12px;border-radius:8px;">
              🗺️ فتح Google Maps
            </a>` : `
            <div style="font-size:12px;color:var(--gray-400);margin-top:8px;">
              ⚠️ لم يتم إضافة رابط Google Maps
            </div>`}

        </div>
      </div>

      <!-- Reject reason input -->
      <div id="mreq-reject-row-${m.id}" style="display:none;margin-bottom:10px;">
        <input class="form-input" type="text"
               id="mreq-reject-reason-${m.id}"
               placeholder="سبب الرفض — سيظهر للتاجر (اختياري)" maxlength="200">
      </div>

      <div class="adm-action-btns">
        <button class="adm-btn adm-btn-approve"
                onclick="approveMerchantReq('${m.id}')">
          ✅ قبول التاجر
        </button>
        <button class="adm-btn adm-btn-reject"
                id="mreq-reject-btn-${m.id}"
                onclick="toggleMerchRejectRow('${m.id}')">
          ❌ رفض
        </button>
        <button class="adm-btn adm-btn-reject" style="display:none;"
                id="mreq-confirm-btn-${m.id}"
                onclick="rejectMerchantReq('${m.id}')">
          تأكيد الرفض
        </button>
      </div>
    </div>`;
}

function toggleMerchRejectRow(id) {
  const row     = document.getElementById(`mreq-reject-row-${id}`);
  const confirm = document.getElementById(`mreq-confirm-btn-${id}`);
  const reject  = document.getElementById(`mreq-reject-btn-${id}`);
  if (!row) return;
  const showing = row.style.display !== 'none';
  row.style.display     = showing ? 'none'         : 'block';
  confirm.style.display = showing ? 'none'         : 'inline-flex';
  reject.style.display  = showing ? 'inline-flex'  : 'none';
}

async function approveMerchantReq(merchantId) {
  const btn = document.querySelector(`#adm-mreq-${merchantId} .adm-btn-approve`);
  if (btn) { btn.disabled = true; btn.textContent = '⏳'; }

  const { error } = await sb.from('profiles')
    .update({ approval_status: 'approved' })
    .eq('id', merchantId);

  if (error) {
    toast('❌ ' + error.message);
    if (btn) { btn.disabled = false; btn.textContent = '✅ قبول التاجر'; }
    return;
  }

  toast('✅ تم قبول التاجر — يستطيع الآن استخدام المنصة');
  document.getElementById(`adm-mreq-${merchantId}`)?.remove();
  _merchantReqsCache = null;
  _decrementBadge('adm-badge-merch-req');
}

async function rejectMerchantReq(merchantId) {
  const reason = document.getElementById(`mreq-reject-reason-${merchantId}`)?.value.trim() || null;
  const btn    = document.getElementById(`mreq-confirm-btn-${merchantId}`);
  if (btn) { btn.disabled = true; btn.textContent = '⏳'; }

  const { error } = await sb.from('profiles')
    .update({ approval_status: 'rejected', rejection_reason: reason })
    .eq('id', merchantId);

  if (error) {
    toast('❌ ' + error.message);
    if (btn) { btn.disabled = false; btn.textContent = 'تأكيد الرفض'; }
    return;
  }

  toast('🚫 تم رفض طلب التاجر');
  document.getElementById(`adm-mreq-${merchantId}`)?.remove();
  _merchantReqsCache = null;
  _decrementBadge('adm-badge-merch-req');
}

// ===== MAIN RENDER =====
async function renderAdminMerchants() {
  const content = document.getElementById('adm-content');
  if (!content) return;

  // Show cached instantly — no loading spinner
  if (_isCacheValid()) {
    _renderMerchantsList(_merchantsCache.merchants, _merchantsCache.countsMap);
    return;
  }

  content.innerHTML = '<div class="mdm-loading">⏳ جاري تحميل التجار...</div>';

  // Fetch merchants + deal counts in parallel
  const [
    { data: merchants, error },
    { data: allDeals }
  ] = await Promise.all([
    sb.from('profiles')
      .select('id, full_name, role, status, company_name, phone, location_link, created_at')
      .eq('role', 'merchant')
      .order('created_at', { ascending: false }),
    sb.from('deals')
      .select('merchant_id, approval_status')
  ]);

  if (error) { content.innerHTML = _adm_err(error.message); return; }

  // Build counts map
  const countsMap = {};
  (allDeals || []).forEach(d => {
    if (!countsMap[d.merchant_id]) countsMap[d.merchant_id] = { total: 0, approved: 0, pending: 0 };
    countsMap[d.merchant_id].total++;
    if (d.approval_status === 'approved')         countsMap[d.merchant_id].approved++;
    if (d.approval_status === 'pending_approval') countsMap[d.merchant_id].pending++;
  });

  // Save to cache
  _merchantsCache = { merchants: merchants || [], countsMap, ts: Date.now() };

  _renderMerchantsList(merchants || [], countsMap);
}

function _renderMerchantsList(merchants, countsMap) {
  const content = document.getElementById('adm-content');
  if (!content) return;

  if (!merchants.length) {
    content.innerHTML = _adm_empty('🏪', 'لا يوجد تجار مسجلين', 'لم يسجل أي تاجر بعد');
    return;
  }

  content.innerHTML = `
    <div class="adm-merchants-toolbar">
      <input class="form-input adm-search" type="text"
             placeholder="🔍 بحث بالاسم أو الشركة..."
             oninput="filterMerchantsList(this.value)"
             id="merchant-search-input">
      <span style="font-size:12px;color:var(--gray-400);margin-right:8px;">
        ${merchants.length} تاجر مسجل
      </span>
    </div>
    <div class="adm-list" id="adm-merchants-list">
      ${merchants.map(m => _merchantCard(m, countsMap[m.id] || {})).join('')}
    </div>`;
}

// ===== MERCHANT CARD =====
function _merchantCard(m, counts) {
  const name      = m.full_name    || '—';
  const company   = m.company_name || '—';
  const phone     = m.phone        || null;
  const link      = m.location_link || null;
  const statusCls = m.status === 'active' ? 'badge-approved' : 'badge-rejected';
  const statusLbl = m.status === 'active'    ? '✅ نشط'
                  : m.status === 'suspended' ? '⏸️ موقوف'
                  : '🗑️ محذوف';

  return `
    <div class="adm-card adm-merchant-card" id="adm-merchant-${m.id}"
         data-name="${_aesc(name)}" data-company="${_aesc(company)}">
      <div class="adm-card-body">
        <div class="adm-merchant-avatar">${name.charAt(0).toUpperCase()}</div>
        <div class="adm-card-info">
          <div class="adm-card-title">
            ${_aesc(name)}
            <span class="mdm-badge ${statusCls}" style="margin-right:8px;">${statusLbl}</span>
          </div>
          <div class="adm-card-meta">
            ${company !== '—'  ? `<span>🏪 ${_aesc(company)}</span>` : ''}
            ${phone            ? `<span>📞 ${_aesc(phone)}</span>`   : ''}
            ${link             ? `<a href="${_aesc(link)}" target="_blank"
                                    style="color:var(--blue);font-size:11px;font-weight:700;">
                                    🔗 رابط الموقع</a>` : ''}
            <span>📅 ${_fmtD(m.created_at)}</span>
          </div>
          <div class="adm-merchant-deals">
            <span class="adm-deal-pill">📦 ${counts.total    || 0} عرض</span>
            <span class="adm-deal-pill approved">✅ ${counts.approved || 0} مُعتمد</span>
            ${counts.pending ? `<span class="adm-deal-pill pending">⏳ ${counts.pending} معلق</span>` : ''}
          </div>
        </div>
      </div>
      <div class="adm-action-btns">
        <button class="adm-btn" style="border-color:var(--blue);color:var(--blue);"
                onclick="showMerchantDetail('${m.id}')">👁️ تفاصيل</button>
        ${m.status === 'active'
          ? `<button class="adm-btn adm-btn-reject"
                     onclick="suspendMerchant('${m.id}')">⏸️ إيقاف</button>`
          : `<button class="adm-btn adm-btn-approve"
                     onclick="reactivateMerchant('${m.id}')">▶️ تفعيل</button>`}
        <button class="adm-btn adm-btn-delete"
                onclick="deleteMerchant('${m.id}')">🗑️ حذف</button>
      </div>
    </div>`;
}

// ===== MERCHANT DETAIL VIEW =====
function showMerchantDetail(merchantId) {
  const m = (_merchantsCache?.merchants || []).find(x => x.id === merchantId);
  if (!m) return;

  const counts  = _merchantsCache?.countsMap?.[merchantId] || {};
  const name    = m.full_name    || '—';
  const company = m.company_name || '—';

  const content = document.getElementById('adm-content');
  if (!content) return;

  content.innerHTML = `
    <div style="max-width:600px;">

      <!-- Back -->
      <button class="dash-btn dash-btn-ghost" style="margin-bottom:20px;"
              onclick="renderAdminMerchants()">← رجوع للتجار</button>

      <!-- Header card -->
      <div class="adm-card" style="margin-bottom:16px;">
        <div class="adm-card-body" style="align-items:center;">
          <div class="adm-merchant-avatar" style="width:56px;height:56px;font-size:22px;">
            ${name.charAt(0).toUpperCase()}
          </div>
          <div class="adm-card-info">
            <div class="adm-card-title" style="font-size:18px;">${_aesc(name)}</div>
            <div class="adm-card-meta">
              <span class="mdm-badge ${m.status === 'active' ? 'badge-approved' : 'badge-rejected'}">
                ${m.status === 'active' ? '✅ نشط' : '⏸️ موقوف'}
              </span>
            </div>
          </div>
        </div>
      </div>

      <!-- Info grid -->
      <div class="adm-card" style="margin-bottom:16px;">
        <div class="form-card-title">📋 بيانات التاجر</div>

        ${_infoRow('👤 الاسم',       name)}
        ${_infoRow('🏪 اسم المتجر',  company)}
        ${_infoRow('📞 التليفون',    m.phone       || '—')}
        ${_infoRow('🔗 رابط الموقع', m.location_link
            ? `<a href="${_aesc(m.location_link)}" target="_blank"
                  style="color:var(--blue);font-weight:700;">${_aesc(m.location_link)}</a>`
            : '—', true)}
        ${_infoRow('📅 تاريخ التسجيل', _fmtD(m.created_at))}
      </div>

      <!-- Deal stats -->
      <div class="adm-card" style="margin-bottom:16px;">
        <div class="form-card-title">📊 إحصائيات العروض</div>
        <div style="display:grid;grid-template-columns:repeat(3,1fr);gap:12px;margin-top:4px;">
          ${_miniStat('📦', 'إجمالي', counts.total    || 0)}
          ${_miniStat('✅', 'مُعتمدة', counts.approved || 0)}
          ${_miniStat('⏳', 'معلقة',  counts.pending  || 0)}
        </div>
      </div>

      <!-- Edit profile form -->
      <div class="adm-card">
        <div class="form-card-title">✏️ تعديل بيانات التاجر</div>
        <div class="form-msg error"  id="merchant-edit-err"></div>
        <div class="form-msg success" id="merchant-edit-ok"></div>

        <div class="form-group">
          <label class="form-label">اسم المتجر / الشركة</label>
          <input class="form-input" type="text" id="edit-company"
                 value="${_aesc(m.company_name || '')}"
                 placeholder="اسم المتجر أو الشركة">
        </div>
        <div class="form-group">
          <label class="form-label">رقم التليفون</label>
          <input class="form-input" type="tel" id="edit-phone"
                 value="${_aesc(m.phone || '')}"
                 placeholder="01xxxxxxxxx" dir="ltr">
        </div>
        <div class="form-group">
          <label class="form-label">رابط الموقع / Google Maps</label>
          <input class="form-input" type="url" id="edit-link"
                 value="${_aesc(m.location_link || '')}"
                 placeholder="https://..." dir="ltr">
        </div>

        <div style="display:flex;gap:10px;margin-top:4px;">
          <button class="dash-btn dash-btn-primary"
                  onclick="saveMerchantProfile('${m.id}')">
            💾 حفظ التعديلات
          </button>
          <button class="dash-btn dash-btn-ghost"
                  onclick="renderAdminMerchants()">إلغاء</button>
        </div>
      </div>

    </div>`;
}

function _infoRow(label, value, isHtml = false) {
  return `
    <div style="display:flex;justify-content:space-between;align-items:center;
                padding:10px 0;border-bottom:1px solid var(--gray-100);">
      <span style="font-size:13px;color:var(--gray-400);font-weight:700;">${label}</span>
      <span style="font-size:13px;font-weight:800;color:var(--gray-800);text-align:left;direction:ltr;">
        ${isHtml ? value : _aesc(String(value))}
      </span>
    </div>`;
}

function _miniStat(ico, label, value) {
  return `
    <div style="background:var(--gray-50);border-radius:10px;padding:14px;text-align:center;">
      <div style="font-size:22px;margin-bottom:4px;">${ico}</div>
      <div style="font-size:20px;font-weight:900;color:var(--gray-800);">
        ${Number(value).toLocaleString('ar-EG')}
      </div>
      <div style="font-size:11px;color:var(--gray-400);font-weight:700;">${label}</div>
    </div>`;
}

// ===== SAVE MERCHANT PROFILE =====
async function saveMerchantProfile(merchantId) {
  const company = document.getElementById('edit-company')?.value.trim() || null;
  const phone   = document.getElementById('edit-phone')?.value.trim()   || null;
  const link    = document.getElementById('edit-link')?.value.trim()    || null;
  const errEl   = document.getElementById('merchant-edit-err');
  const okEl    = document.getElementById('merchant-edit-ok');

  if (errEl) { errEl.textContent = ''; errEl.classList.remove('show'); }
  if (okEl)  { okEl.textContent  = ''; okEl.classList.remove('show'); }

  const { error } = await sb.from('profiles')
    .update({ company_name: company, phone, location_link: link })
    .eq('id', merchantId);

  if (error) {
    if (errEl) { errEl.textContent = '❌ ' + error.message; errEl.classList.add('show'); }
    return;
  }

  // Update cache instantly — no re-fetch needed
  if (_merchantsCache) {
    const idx = _merchantsCache.merchants.findIndex(x => x.id === merchantId);
    if (idx > -1) {
      _merchantsCache.merchants[idx].company_name  = company;
      _merchantsCache.merchants[idx].phone         = phone;
      _merchantsCache.merchants[idx].location_link = link;
    }
  }

  if (okEl) { okEl.textContent = '✅ تم حفظ البيانات بنجاح'; okEl.classList.add('show'); }
}

// ===== FILTER =====
function filterMerchantsList(query) {
  const q = query.toLowerCase();
  document.querySelectorAll('.adm-merchant-card').forEach(card => {
    const name    = (card.dataset.name    || '').toLowerCase();
    const company = (card.dataset.company || '').toLowerCase();
    card.style.display = (!q || name.includes(q) || company.includes(q)) ? '' : 'none';
  });
}

// ===== ACTIONS =====
async function suspendMerchant(merchantId) {
  const { error } = await sb.from('profiles')
    .update({ status: 'suspended' }).eq('id', merchantId);
  if (error) { toast('❌ ' + error.message); return; }
  toast('⏸️ تم إيقاف حساب التاجر');
  _invalidateMerchantsCache();
  renderAdminMerchants();
}

async function reactivateMerchant(merchantId) {
  const { error } = await sb.from('profiles')
    .update({ status: 'active' }).eq('id', merchantId);
  if (error) { toast('❌ ' + error.message); return; }
  toast('✅ تم تفعيل حساب التاجر');
  _invalidateMerchantsCache();
  renderAdminMerchants();
}

async function deleteMerchant(merchantId) {
  if (!confirm('هل أنت متأكد من حذف هذا التاجر نهائياً؟')) return;
  const { error } = await sb.from('profiles')
    .update({ status: 'deleted', role: 'customer' }).eq('id', merchantId);
  if (error) { toast('❌ ' + error.message); return; }
  toast('🗑️ تم حذف حساب التاجر');
  _invalidateMerchantsCache();
  document.getElementById(`adm-merchant-${merchantId}`)?.remove();
}
