/**
 * ============================================================
 * SHEKSS — ADMIN: MERCHANT MANAGEMENT
 * scripts/admin-merchants.js
 * ============================================================
 */

async function renderAdminMerchants() {
  const content = document.getElementById('adm-content');
  content.innerHTML = '<div class="mdm-loading">⏳ جاري تحميل التجار...</div>';

  // Fetch merchants + their deal counts
  const { data: merchants, error } = await sb
    .from('profiles')
    .select('id, full_name, role, status, company_name, phone, created_at')
    .eq('role', 'merchant')
    .order('created_at', { ascending: false });

  if (error) { content.innerHTML = _adm_err(error.message); return; }

  if (!merchants || !merchants.length) {
    content.innerHTML = _adm_empty('🏪', 'لا يوجد تجار مسجلين', 'لم يسجل أي تاجر بعد');
    return;
  }

  // Fetch deal counts per merchant in one query
  const merchantIds = merchants.map(m => m.id);
  const { data: dealCounts } = await sb
    .from('deals')
    .select('merchant_id, approval_status')
    .in('merchant_id', merchantIds);

  // Build counts map
  const countsMap = {};
  (dealCounts || []).forEach(d => {
    if (!countsMap[d.merchant_id]) countsMap[d.merchant_id] = { total: 0, approved: 0, pending: 0 };
    countsMap[d.merchant_id].total++;
    if (d.approval_status === 'approved')        countsMap[d.merchant_id].approved++;
    if (d.approval_status === 'pending_approval') countsMap[d.merchant_id].pending++;
  });

  content.innerHTML = `
    <div class="adm-merchants-toolbar">
      <input class="form-input adm-search" type="text" placeholder="🔍 بحث بالاسم أو الشركة..."
             oninput="filterMerchantsList(this.value)" id="merchant-search-input">
    </div>
    <div class="adm-list" id="adm-merchants-list">
      ${merchants.map(m => _merchantCard(m, countsMap[m.id] || {})).join('')}
    </div>`;
}

function _merchantCard(m, counts) {
  const name     = m.full_name || '—';
  const company  = m.company_name || '—';
  const statusCls = m.status === 'active' ? 'badge-approved' : 'badge-rejected';
  const statusLbl = m.status === 'active' ? '✅ نشط' : m.status === 'suspended' ? '⏸️ موقوف' : '🗑️ محذوف';

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
            ${company !== '—' ? `<span>🏪 ${_aesc(company)}</span>` : ''}
            ${m.phone ? `<span>📞 ${_aesc(m.phone)}</span>` : ''}
            <span>📅 ${_fmtD(m.created_at)}</span>
          </div>
          <div class="adm-merchant-deals">
            <span class="adm-deal-pill">📦 ${counts.total || 0} عرض</span>
            <span class="adm-deal-pill approved">✅ ${counts.approved || 0} مُعتمد</span>
            ${counts.pending ? `<span class="adm-deal-pill pending">⏳ ${counts.pending} معلق</span>` : ''}
          </div>
        </div>
      </div>
      <div class="adm-action-btns">
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
  renderAdminMerchants();
}

async function reactivateMerchant(merchantId) {
  const { error } = await sb.from('profiles')
    .update({ status: 'active' }).eq('id', merchantId);
  if (error) { toast('❌ ' + error.message); return; }
  toast('✅ تم تفعيل حساب التاجر');
  renderAdminMerchants();
}

async function deleteMerchant(merchantId) {
  if (!confirm('هل أنت متأكد من حذف هذا التاجر نهائياً؟ سيتم إيقاف جميع عروضه.')) return;
  const { error } = await sb.from('profiles')
    .update({ status: 'deleted', role: 'customer' }).eq('id', merchantId);
  if (error) { toast('❌ ' + error.message); return; }
  toast('🗑️ تم حذف حساب التاجر');
  document.getElementById(`adm-merchant-${merchantId}`)?.remove();
}
