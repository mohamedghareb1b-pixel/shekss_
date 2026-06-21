/**
 * ============================================================
 * SHEKSS — ADMIN: DEAL APPROVALS
 * scripts/admin-deals.js
 * ============================================================
 * Handles: pending deals, edit requests, delete requests.
 * Depends on: admin-dashboard.js (_aesc, _setBadge), supabase.js, utils.js
 * ============================================================
 */

// ===== PENDING DEALS =====
async function renderAdminPendingDeals() {
  const content = document.getElementById('adm-content');
  content.innerHTML = '<div class="mdm-loading">⏳ جاري تحميل الطلبات...</div>';

  const { data, error } = await sb
    .from('deals')
    .select('id, title, name, description, category, subcategory, discount, discount_percent, old_price, new_price, main_image, image, company_name, merchant_id, created_at, is_offline, coupon_code, expires_at')
    .eq('approval_status', 'pending_approval')
    .order('created_at', { ascending: true });

  if (error) { content.innerHTML = _adm_err(error.message); return; }

  if (!data || !data.length) {
    content.innerHTML = _adm_empty('⏳', 'لا توجد عروض معلقة', 'كل العروض تمت مراجعتها ✅');
    _setBadge('adm-badge-pending-deals', 0);
    return;
  }

  _setBadge('adm-badge-pending-deals', data.length);

  content.innerHTML = `
    <div class="adm-list">
      ${data.map(d => _pendingDealCard(d)).join('')}
    </div>`;
}

function _pendingDealCard(d) {
  const title = d.title || d.name || '—';
  const img   = d.main_image || d.image;
  const disc  = d.discount_percent || d.discount;
  const oldP  = d.old_price;
  const newP  = d.new_price;

  return `
    <div class="adm-card" id="adm-deal-${d.id}">
      <div class="adm-card-body">
        <div class="adm-card-img">
          ${img ? `<img src="${_aesc(img)}" alt="${_aesc(title)}" loading="lazy">` : '<div class="adm-no-img">🏷️</div>'}
        </div>
        <div class="adm-card-info">
          <div class="adm-card-title">${_aesc(title)}</div>
          <div class="adm-card-meta">
            ${d.company_name ? `<span>🏪 ${_aesc(d.company_name)}</span>` : ''}
            ${d.category     ? `<span>📂 ${_aesc(d.category)}</span>`     : ''}
            ${d.is_offline   ? '<span>📍 عروض المنطقة</span>' : '<span>🌐 أونلاين</span>'}
            ${disc  ? `<span>🏷️ خصم ${disc}%</span>` : ''}
            ${oldP  ? `<span>💰 ${Number(oldP).toLocaleString('ar-EG')} ج</span>` : ''}
            ${newP  ? `<span>✅ ${Number(newP).toLocaleString('ar-EG')} ج</span>` : ''}
            <span>📅 ${_fmtD(d.created_at)}</span>
          </div>
          ${d.description ? `<p class="adm-card-desc">${_aesc(d.description)}</p>` : ''}
        </div>
      </div>
      <div class="adm-card-actions" id="adm-deal-actions-${d.id}">
        <div class="adm-reject-row" id="adm-reject-row-${d.id}" style="display:none;">
          <textarea class="form-input form-textarea adm-reason-input"
                    id="adm-reject-reason-${d.id}"
                    placeholder="سبب الرفض (اختياري)" rows="2" maxlength="300"></textarea>
        </div>
        <div class="adm-action-btns">
          <button class="adm-btn adm-btn-approve"
                  onclick="approveDeal('${d.id}')">✅ قبول</button>
          <button class="adm-btn adm-btn-reject"
                  onclick="toggleRejectRow('${d.id}')">❌ رفض</button>
          <button class="adm-btn adm-btn-confirm-reject" style="display:none;"
                  id="adm-confirm-reject-${d.id}"
                  onclick="rejectDeal('${d.id}')">تأكيد الرفض</button>
        </div>
      </div>
    </div>`;
}

function toggleRejectRow(dealId) {
  const row     = document.getElementById(`adm-reject-row-${dealId}`);
  const confirm = document.getElementById(`adm-confirm-reject-${dealId}`);
  if (!row) return;
  const showing = row.style.display !== 'none';
  row.style.display     = showing ? 'none' : 'block';
  confirm.style.display = showing ? 'none' : 'inline-flex';
}

async function approveDeal(dealId) {
  const btn = document.querySelector(`#adm-deal-actions-${dealId} .adm-btn-approve`);
  if (btn) { btn.disabled = true; btn.textContent = '⏳'; }

  const { error } = await sb.from('deals')
    .update({ approval_status: 'approved' })
    .eq('id', dealId);

  if (error) { toast('❌ ' + error.message); if (btn) { btn.disabled = false; btn.textContent = '✅ قبول'; } return; }

  toast('✅ تم قبول العرض ونشره');
  document.getElementById(`adm-deal-${dealId}`)?.remove();
  _decrementBadge('adm-badge-pending-deals');
}

async function rejectDeal(dealId) {
  const reason = document.getElementById(`adm-reject-reason-${dealId}`)?.value.trim() || null;
  const btn    = document.getElementById(`adm-confirm-reject-${dealId}`);
  if (btn) { btn.disabled = true; btn.textContent = '⏳'; }

  const { error } = await sb.from('deals')
    .update({ approval_status: 'rejected', reject_reason: reason })
    .eq('id', dealId);

  if (error) { toast('❌ ' + error.message); if (btn) { btn.disabled = false; btn.textContent = 'تأكيد الرفض'; } return; }

  toast('🚫 تم رفض العرض');
  document.getElementById(`adm-deal-${dealId}`)?.remove();
  _decrementBadge('adm-badge-pending-deals');
}

// ===== EDIT REQUESTS =====
async function renderAdminEditRequests() {
  const content = document.getElementById('adm-content');
  content.innerHTML = '<div class="mdm-loading">⏳ جاري تحميل طلبات التعديل...</div>';

  const { data, error } = await sb
    .from('deals')
    .select('id, title, name, edit_request_data, edit_request_status, company_name, created_at, updated_at')
    .eq('edit_request_status', 'pending')
    .order('updated_at', { ascending: true });

  if (error) { content.innerHTML = _adm_err(error.message); return; }

  if (!data || !data.length) {
    content.innerHTML = _adm_empty('✏️', 'لا توجد طلبات تعديل', 'لا توجد طلبات تعديل معلقة حالياً ✅');
    _setBadge('adm-badge-edit-req', 0);
    return;
  }

  _setBadge('adm-badge-edit-req', data.length);

  content.innerHTML = `
    <div class="adm-list">
      ${data.map(d => _editRequestCard(d)).join('')}
    </div>`;
}

function _editRequestCard(d) {
  const title = d.title || d.name || '—';
  const req   = d.edit_request_data || {};

  const changes = Object.entries(req)
    .filter(([k]) => k !== 'reason')
    .map(([k, v]) => `<div class="adm-change-row"><span class="adm-change-key">${_fieldLabel(k)}</span><span class="adm-change-val">${_aesc(String(v || '—'))}</span></div>`)
    .join('');

  return `
    <div class="adm-card" id="adm-edit-${d.id}">
      <div class="adm-card-body">
        <div class="adm-card-info" style="width:100%;">
          <div class="adm-card-title">✏️ ${_aesc(title)}</div>
          ${d.company_name ? `<div class="adm-card-meta"><span>🏪 ${_aesc(d.company_name)}</span><span>📅 ${_fmtD(d.updated_at)}</span></div>` : ''}
          ${req.reason ? `<div class="adm-reason-box">💬 سبب التعديل: ${_aesc(req.reason)}</div>` : ''}
          <div class="adm-changes-wrap">
            <div class="adm-changes-title">التعديلات المطلوبة:</div>
            ${changes || '<p style="color:var(--gray-400);font-size:12px;">لا توجد تغييرات محددة</p>'}
          </div>
        </div>
      </div>
      <div class="adm-action-btns">
        <button class="adm-btn adm-btn-approve"
                onclick="approveEditRequest('${d.id}')">✅ تطبيق التعديل</button>
        <button class="adm-btn adm-btn-reject"
                onclick="rejectEditRequest('${d.id}')">❌ رفض التعديل</button>
      </div>
    </div>`;
}

async function approveEditRequest(dealId) {
  const { data: deal } = await sb.from('deals').select('edit_request_data').eq('id', dealId).single();
  if (!deal?.edit_request_data) { toast('⚠️ لا توجد بيانات تعديل'); return; }

  const { reason: _r, ...fieldsToApply } = deal.edit_request_data;

  // Map field names to DB columns
  const update = {};
  if (fieldsToApply.title)        { update.title       = fieldsToApply.title;        update.name = fieldsToApply.title; }
  if (fieldsToApply.description)  update.description   = fieldsToApply.description;
  if (fieldsToApply.details)      update.details       = fieldsToApply.details;
  if (fieldsToApply.company_name) update.company_name  = fieldsToApply.company_name;
  if (fieldsToApply.old_price)    { update.old_price   = fieldsToApply.old_price;    update.price = fieldsToApply.old_price; }
  if (fieldsToApply.new_price)    update.new_price     = fieldsToApply.new_price;
  if (fieldsToApply.coupon_code)  update.coupon_code   = fieldsToApply.coupon_code;
  if (fieldsToApply.link)         { update.link        = fieldsToApply.link;          update.location_link = fieldsToApply.link; }

  if (fieldsToApply.old_price && fieldsToApply.new_price) {
    const disc = Math.round((1 - fieldsToApply.new_price / fieldsToApply.old_price) * 100);
    update.discount = disc; update.discount_percent = disc;
  }

  update.edit_request_status = 'approved';
  update.edit_request_data   = null;

  const { error } = await sb.from('deals').update(update).eq('id', dealId);
  if (error) { toast('❌ ' + error.message); return; }

  toast('✅ تم تطبيق التعديل بنجاح');
  document.getElementById(`adm-edit-${dealId}`)?.remove();
  _decrementBadge('adm-badge-edit-req');
}

async function rejectEditRequest(dealId) {
  const { error } = await sb.from('deals')
    .update({ edit_request_status: 'rejected', edit_request_data: null })
    .eq('id', dealId);

  if (error) { toast('❌ ' + error.message); return; }
  toast('🚫 تم رفض طلب التعديل');
  document.getElementById(`adm-edit-${dealId}`)?.remove();
  _decrementBadge('adm-badge-edit-req');
}

// ===== DELETE REQUESTS =====
async function renderAdminDeleteRequests() {
  const content = document.getElementById('adm-content');
  content.innerHTML = '<div class="mdm-loading">⏳ جاري تحميل طلبات الحذف...</div>';

  const { data, error } = await sb
    .from('deals')
    .select('id, title, name, company_name, category, discount, discount_percent, updated_at')
    .eq('delete_request_status', 'pending')
    .order('updated_at', { ascending: true });

  if (error) { content.innerHTML = _adm_err(error.message); return; }

  if (!data || !data.length) {
    content.innerHTML = _adm_empty('🗑️', 'لا توجد طلبات حذف', 'لا توجد طلبات حذف معلقة حالياً ✅');
    _setBadge('adm-badge-del-req', 0);
    return;
  }

  _setBadge('adm-badge-del-req', data.length);

  content.innerHTML = `
    <div class="adm-list">
      ${data.map(d => _deleteRequestCard(d)).join('')}
    </div>`;
}

function _deleteRequestCard(d) {
  const title = d.title || d.name || '—';
  const disc  = d.discount_percent || d.discount;
  return `
    <div class="adm-card" id="adm-del-${d.id}">
      <div class="adm-card-body">
        <div class="adm-card-info" style="width:100%;">
          <div class="adm-card-title">🗑️ ${_aesc(title)}</div>
          <div class="adm-card-meta">
            ${d.company_name ? `<span>🏪 ${_aesc(d.company_name)}</span>` : ''}
            ${d.category     ? `<span>📂 ${_aesc(d.category)}</span>`     : ''}
            ${disc           ? `<span>🏷️ خصم ${disc}%</span>`           : ''}
            <span>📅 ${_fmtD(d.updated_at)}</span>
          </div>
        </div>
      </div>
      <div class="adm-action-btns">
        <button class="adm-btn adm-btn-approve" style="background:var(--red);border-color:var(--red);"
                onclick="approveDeleteRequest('${d.id}')">🗑️ تأكيد الحذف</button>
        <button class="adm-btn adm-btn-reject"
                onclick="rejectDeleteRequest('${d.id}')">↩️ رفض الحذف</button>
      </div>
    </div>`;
}

async function approveDeleteRequest(dealId) {
  if (!confirm('هل أنت متأكد من حذف هذا العرض نهائياً؟')) return;

  const { error } = await sb.from('deals').delete().eq('id', dealId);
  if (error) { toast('❌ ' + error.message); return; }

  toast('🗑️ تم حذف العرض نهائياً');
  document.getElementById(`adm-del-${dealId}`)?.remove();
  _decrementBadge('adm-badge-del-req');
}

async function rejectDeleteRequest(dealId) {
  const { error } = await sb.from('deals')
    .update({ delete_request_status: null })
    .eq('id', dealId);

  if (error) { toast('❌ ' + error.message); return; }
  toast('↩️ تم رفض طلب الحذف');
  document.getElementById(`adm-del-${dealId}`)?.remove();
  _decrementBadge('adm-badge-del-req');
}

// ===== SHARED HELPERS =====
function _fieldLabel(key) {
  const labels = {
    title: 'الاسم', description: 'الوصف', details: 'تفاصيل',
    company_name: 'الشركة', old_price: 'السعر قبل', new_price: 'السعر بعد',
    coupon_code: 'الكوبون', link: 'الرابط',
  };
  return labels[key] || key;
}

function _decrementBadge(id) {
  const el = document.getElementById(id);
  if (!el) return;
  const val = Math.max(0, parseInt(el.textContent || '0') - 1);
  el.textContent   = val;
  el.style.display = val > 0 ? '' : 'none';
}

function _adm_err(msg) {
  return `<div class="mdm-empty"><div class="mdm-empty-ico">❌</div><h4>خطأ في تحميل البيانات</h4><p>${_aesc(msg)}</p></div>`;
}

function _adm_empty(ico, title, msg) {
  return `<div class="mdm-empty"><div class="mdm-empty-ico">${ico}</div><h4>${title}</h4><p>${msg}</p></div>`;
}

function _fmtD(iso) {
  if (!iso) return '—';
  return new Date(iso).toLocaleDateString('ar-EG', { year:'numeric', month:'short', day:'numeric' });
}
