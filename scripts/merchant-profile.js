/**
 * ============================================================
 * SHEKSS — MERCHANT BUSINESS PROFILE
 * scripts/merchant-profile.js
 * ============================================================
 * Handles the "بيانات النشاط" section inside merchant dashboard.
 * Called from merchant-dashboard.js → switchDashSection('business-profile')
 *
 * Depends on: auth.js (AuthState, sb), utils.js (toast), data.js
 *
 * Public API:
 *   renderBusinessProfile()   → HTML string for the section
 *   initBusinessProfileForm() → prefills form from AuthState.profile
 *   saveBusinessProfile()     → validates + uploads logo + saves to DB
 *   isProfileComplete()       → boolean — used in overview card
 *   generateSlug(name)        → "Diva Wear" → "diva-wear"
 * ============================================================
 */

// ===== LOGO UPLOAD STATE =====
let _logoFile = null;   // File object selected, not yet uploaded

// ===== PROFILE COMPLETENESS =====
function isProfileComplete() {
  const p = AuthState.profile || {};
  return !!(
    (p.business_name || p.company_name) &&
    (p.whatsapp || p.phone) &&
    p.governorate &&
    p.city &&
    p.business_category
  );
}

// ===== SLUG GENERATOR =====
function generateSlug(name) {
  if (!name) return '';
  return name
    .trim()
    .toLowerCase()
    .replace(/[\s_]+/g, '-')          // spaces/underscores → hyphens
    .replace(/[^\u0600-\u06FFa-z0-9-]/g, '') // keep arabic, latin, digits, hyphens
    .replace(/-{2,}/g, '-')           // collapse multiple hyphens
    .replace(/^-|-$/g, '');           // trim leading/trailing hyphens
}

// ===== RENDER SECTION =====
function renderBusinessProfile() {
  const p = AuthState.profile || {};
  const complete = isProfileComplete();

  return `
    <div style="max-width:640px;">

      <!-- Completeness banner -->
      ${!complete ? `
        <div style="background:#fff7ed;border:1.5px solid #fed7aa;border-radius:12px;
                    padding:14px 18px;margin-bottom:20px;display:flex;align-items:center;gap:12px;">
          <span style="font-size:20px;">⚠️</span>
          <div>
            <strong style="font-size:13px;color:#c2410c;">الملف التجاري غير مكتمل</strong>
            <p style="font-size:12px;color:#9a3412;margin-top:2px;">
              أكمل البيانات المطلوبة حتى تتمكن من إضافة العروض
            </p>
          </div>
        </div>` : `
        <div style="background:var(--green-light);border:1.5px solid #86efac;border-radius:12px;
                    padding:12px 18px;margin-bottom:20px;display:flex;align-items:center;gap:10px;">
          <span>✅</span>
          <strong style="font-size:13px;color:#15803d;">الملف التجاري مكتمل</strong>
        </div>`}

      <!-- Form messages -->
      <div class="form-msg error"  id="bp-err"></div>
      <div class="form-msg success" id="bp-ok"></div>

      <!-- ── LOGO + BASIC ── -->
      <div class="form-card" style="margin-bottom:16px;">
        <div class="form-card-title">🏪 المعلومات الأساسية</div>

        <!-- Logo upload -->
        <div class="bp-logo-row">
          <div class="bp-logo-box" id="bp-logo-box"
               onclick="document.getElementById('bp-logo-input').click()">
            <img id="bp-logo-preview" style="display:none;width:100%;height:100%;
                 object-fit:cover;border-radius:12px;">
            <div id="bp-logo-placeholder" class="bp-logo-placeholder">
              <span style="font-size:28px;">🏪</span>
              <span style="font-size:11px;color:var(--gray-400);font-weight:700;">
                شعار النشاط
              </span>
              <span style="font-size:10px;color:var(--gray-400);">اضغط للتغيير</span>
            </div>
          </div>
          <div style="flex:1;">
            <input type="file" id="bp-logo-input" accept="image/*" style="display:none;"
                   onchange="previewLogo(this)">
            <p style="font-size:12px;color:var(--gray-400);line-height:1.6;">
              📐 يُفضَّل صورة مربعة<br>
              📦 سيتم ضغطها تلقائياً إلى WebP<br>
              📏 الحد الأقصى: 5 ميجا
            </p>
            ${(AuthState.profile?.business_logo) ? `
              <button class="dash-btn dash-btn-ghost"
                      style="font-size:11px;padding:5px 10px;margin-top:6px;"
                      onclick="removeLogo()">🗑️ حذف الشعار</button>` : ''}
          </div>
        </div>

        <div class="form-group">
          <label class="form-label">اسم النشاط التجاري <span class="req">*</span></label>
          <input class="form-input" type="text" id="bp-name"
                 placeholder="مثال: مطعم الأصيل، محل الأناقة..."
                 maxlength="80" oninput="updateSlugPreview(this.value)">
          <span class="form-hint" id="bp-slug-preview" style="direction:ltr;"></span>
        </div>

        <div class="form-group">
          <label class="form-label">وصف النشاط</label>
          <textarea class="form-input form-textarea" id="bp-desc"
                    rows="3" maxlength="400"
                    placeholder="وصف مختصر لنشاطك، منتجاتك، وما يميزك..."></textarea>
        </div>
      </div>

      <!-- ── CONTACT ── -->
      <div class="form-card" style="margin-bottom:16px;">
        <div class="form-card-title">📞 بيانات التواصل</div>

        <div class="price-row">
          <div class="form-group">
            <label class="form-label">رقم الواتساب <span class="req">*</span></label>
            <input class="form-input" type="tel" id="bp-whatsapp"
                   placeholder="01xxxxxxxxx" dir="ltr" maxlength="15">
          </div>
          <div class="form-group">
            <label class="form-label">رقم الهاتف</label>
            <input class="form-input" type="tel" id="bp-phone"
                   placeholder="01xxxxxxxxx" dir="ltr" maxlength="15">
          </div>
        </div>
      </div>

      <!-- ── LOCATION ── -->
      <div class="form-card" style="margin-bottom:16px;">
        <div class="form-card-title">📍 الموقع الجغرافي</div>

        <div class="price-row">
          <div class="form-group">
            <label class="form-label">المحافظة <span class="req">*</span></label>
            <select class="form-input" id="bp-gov" onchange="bpFillCities()">
              <option value="">اختر المحافظة</option>
              ${Object.keys(EGYPT_GOVS).map(g =>
                `<option value="${g}">${g}</option>`
              ).join('')}
            </select>
          </div>
          <div class="form-group">
            <label class="form-label">المركز / المدينة <span class="req">*</span></label>
            <select class="form-input" id="bp-city">
              <option value="">اختر المحافظة أولاً</option>
            </select>
          </div>
        </div>

        <div class="form-group">
          <label class="form-label">العنوان التفصيلي</label>
          <input class="form-input" type="text" id="bp-address"
                 placeholder="مثال: شارع التحرير، أمام مسجد النور" maxlength="200">
        </div>

        <div class="form-group">
          <label class="form-label">رابط Google Maps</label>
          <input class="form-input" type="url" id="bp-link"
                 placeholder="https://maps.google.com/..." dir="ltr">
          <span class="form-hint">
            افتح Google Maps → ابحث عن موقعك → اضغط مشاركة → انسخ الرابط
          </span>
        </div>
      </div>

      <!-- ── CATEGORY ── -->
      <div class="form-card" style="margin-bottom:16px;">
        <div class="form-card-title">📂 التصنيف</div>

        <div class="price-row">
          <div class="form-group">
            <label class="form-label">التصنيف الرئيسي <span class="req">*</span></label>
            <select class="form-input" id="bp-cat" onchange="bpFillSubcats()">
              <option value="">اختر التصنيف</option>
              ${_buildCatOptions()}
            </select>
          </div>
          <div class="form-group">
            <label class="form-label">التصنيف الفرعي</label>
            <select class="form-input" id="bp-subcat">
              <option value="">اختر التصنيف أولاً</option>
            </select>
          </div>
        </div>
      </div>

      <!-- ── WORKING HOURS ── -->
      <div class="form-card" style="margin-bottom:24px;">
        <div class="form-card-title">⏰ ساعات العمل</div>
        <div class="form-group">
          <label class="form-label">ساعات العمل</label>
          <input class="form-input" type="text" id="bp-hours"
                 placeholder="مثال: السبت - الخميس، 10 صباحاً - 11 مساءً"
                 maxlength="100">
          <span class="form-hint">
            يمكنك كتابة أي صيغة تريدها
          </span>
        </div>
      </div>

      <!-- ── SAVE ── -->
      <div style="display:flex;gap:10px;flex-wrap:wrap;">
        <button class="btn-submit" id="bp-save-btn"
                onclick="saveBusinessProfile()"
                style="flex:1;max-width:280px;">
          💾 حفظ بيانات النشاط
        </button>
        <button class="dash-btn dash-btn-ghost"
                onclick="switchDashSection('overview')">
          إلغاء
        </button>
      </div>

    </div>`;
}

// ===== INIT FORM (prefill from AuthState) =====
function initBusinessProfileForm() {
  const p = AuthState.profile || {};

  const setVal = (id, val) => {
    const el = document.getElementById(id);
    if (el && val) el.value = val;
  };

  setVal('bp-name',     p.business_name    || p.company_name || '');
  setVal('bp-desc',     p.business_description || p.description || '');
  setVal('bp-whatsapp', p.whatsapp         || p.phone         || '');
  setVal('bp-phone',    p.phone            || '');
  setVal('bp-address',  p.address          || '');
  setVal('bp-link',     p.location_link    || '');
  setVal('bp-hours',    p.working_hours    || '');

  // Slug preview
  const name = p.business_name || p.company_name || '';
  if (name) updateSlugPreview(name);

  // Logo preview
  if (p.business_logo) {
    const preview = document.getElementById('bp-logo-preview');
    const placeholder = document.getElementById('bp-logo-placeholder');
    if (preview) { preview.src = p.business_logo; preview.style.display = 'block'; }
    if (placeholder) placeholder.style.display = 'none';
  }

  // Governorate + city
  if (p.governorate) {
    const govSel = document.getElementById('bp-gov');
    if (govSel) {
      govSel.value = p.governorate;
      bpFillCities(p.city);
    }
  }

  // Category + subcategory
  if (p.business_category) {
    const catSel = document.getElementById('bp-cat');
    if (catSel) {
      catSel.value = p.business_category;
      bpFillSubcats(p.business_subcategory);
    }
  }
}

// ===== LOGO PREVIEW =====
function previewLogo(input) {
  const file = input.files[0];
  if (!file) return;

  if (!file.type.startsWith('image/')) {
    toast('⚠️ يُرجى اختيار ملف صورة صحيح');
    return;
  }
  if (file.size > 5 * 1024 * 1024) {
    toast('⚠️ حجم الصورة أكبر من 5 ميجا');
    return;
  }

  _logoFile = file;

  const reader = new FileReader();
  reader.onload = e => {
    const preview     = document.getElementById('bp-logo-preview');
    const placeholder = document.getElementById('bp-logo-placeholder');
    if (preview) { preview.src = e.target.result; preview.style.display = 'block'; }
    if (placeholder) placeholder.style.display = 'none';
  };
  reader.readAsDataURL(file);
}

function removeLogo() {
  _logoFile = null;
  const preview     = document.getElementById('bp-logo-preview');
  const placeholder = document.getElementById('bp-logo-placeholder');
  const input       = document.getElementById('bp-logo-input');
  if (preview)     { preview.src = ''; preview.style.display = 'none'; }
  if (placeholder) placeholder.style.display = 'flex';
  if (input)       input.value = '';
  // Mark for deletion on save
  if (AuthState.profile) AuthState.profile._removeLogo = true;
}

// ===== SLUG PREVIEW =====
function updateSlugPreview(name) {
  const el = document.getElementById('bp-slug-preview');
  if (!el) return;
  const slug = generateSlug(name);
  el.textContent = slug ? `🔗 shekss.com/store/${slug}` : '';
}

// ===== CITY / SUBCATEGORY FILLS =====
function bpFillCities(selectedCity = '') {
  const gov     = document.getElementById('bp-gov')?.value;
  const citySel = document.getElementById('bp-city');
  if (!citySel) return;

  citySel.innerHTML = '<option value="">اختر المركز</option>';
  if (gov && EGYPT_GOVS[gov]) {
    EGYPT_GOVS[gov].forEach(city => {
      const opt = document.createElement('option');
      opt.value = opt.textContent = city;
      if (city === selectedCity) opt.selected = true;
      citySel.appendChild(opt);
    });
  }
}

function bpFillSubcats(selectedSub = '') {
  const catId  = document.getElementById('bp-cat')?.value;
  const subSel = document.getElementById('bp-subcat');
  if (!subSel) return;

  const allCats = [...ONLINE_CATS, ...OFFLINE_CATS];
  const cat = allCats.find(c => c.id === catId);

  subSel.innerHTML = '<option value="">— بدون تصنيف فرعي —</option>';
  if (cat?.subs?.length) {
    cat.subs.forEach(s => {
      const opt = document.createElement('option');
      opt.value = opt.textContent = s;
      if (s === selectedSub) opt.selected = true;
      subSel.appendChild(opt);
    });
  }
}

// ===== LOGO COMPRESS + UPLOAD =====
async function _uploadLogo(file) {
  const uid  = AuthState.user.id;
  const ext  = 'webp';
  const path = `logos/${uid}/logo-${Date.now()}.${ext}`;

  // Compress to WebP 400×400
  const blob = await _compressLogo(file);

  const { data, error } = await sb.storage
    .from('merchant-assets')
    .upload(path, blob, { contentType: 'image/webp', upsert: true });

  if (error) throw new Error('فشل رفع الشعار: ' + error.message);

  const { data: urlData } = sb.storage
    .from('merchant-assets')
    .getPublicUrl(path);

  return urlData.publicUrl;
}

async function _compressLogo(file, size = 400, quality = 0.85) {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      URL.revokeObjectURL(url);
      const canvas = document.createElement('canvas');
      canvas.width  = size;
      canvas.height = size;
      const ctx = canvas.getContext('2d');

      // Center-crop to square
      const minDim = Math.min(img.width, img.height);
      const sx = (img.width  - minDim) / 2;
      const sy = (img.height - minDim) / 2;
      ctx.drawImage(img, sx, sy, minDim, minDim, 0, 0, size, size);

      canvas.toBlob(
        blob => blob ? resolve(blob) : reject(new Error('فشل ضغط الصورة')),
        'image/webp', quality
      );
    };
    img.onerror = () => { URL.revokeObjectURL(url); reject(new Error('فشل قراءة الصورة')); };
    img.src = url;
  });
}

// ===== SAVE =====
async function saveBusinessProfile() {
  const name    = document.getElementById('bp-name')?.value.trim();
  const desc    = document.getElementById('bp-desc')?.value.trim()     || null;
  const whatsapp= document.getElementById('bp-whatsapp')?.value.trim();
  const phone   = document.getElementById('bp-phone')?.value.trim()    || null;
  const gov     = document.getElementById('bp-gov')?.value             || null;
  const city    = document.getElementById('bp-city')?.value            || null;
  const address = document.getElementById('bp-address')?.value.trim()  || null;
  const link    = document.getElementById('bp-link')?.value.trim()     || null;
  const cat     = document.getElementById('bp-cat')?.value             || null;
  const subcat  = document.getElementById('bp-subcat')?.value          || null;
  const hours   = document.getElementById('bp-hours')?.value.trim()    || null;

  const errEl = document.getElementById('bp-err');
  const okEl  = document.getElementById('bp-ok');
  const btn   = document.getElementById('bp-save-btn');

  _bpMsg(errEl, '', false);
  _bpMsg(okEl,  '', false);

  // Validate required fields
  if (!name)     { _bpMsg(errEl, '⚠️ اسم النشاط مطلوب', true); return; }
  if (!whatsapp || whatsapp.replace(/\D/g,'').length < 10) {
    _bpMsg(errEl, '⚠️ رقم الواتساب غير صحيح', true); return;
  }
  if (!gov)      { _bpMsg(errEl, '⚠️ اختر المحافظة', true); return; }
  if (!city)     { _bpMsg(errEl, '⚠️ اختر المركز', true); return; }
  if (!cat)      { _bpMsg(errEl, '⚠️ اختر التصنيف الرئيسي', true); return; }

  if (btn) { btn.disabled = true; btn.textContent = '⏳ جاري الحفظ...'; }

  try {
    // Upload logo if new file selected
    let logoUrl = AuthState.profile?.business_logo || null;
    if (_logoFile) {
      btn.textContent = '📤 جاري رفع الشعار...';
      logoUrl = await _uploadLogo(_logoFile);
      _logoFile = null;
    }
    if (AuthState.profile?._removeLogo) {
      logoUrl = null;
      delete AuthState.profile._removeLogo;
    }

    // Generate slug
    const slug = generateSlug(name);

    const updateData = {
      business_name:        name,
      company_name:         name,          // keep in sync
      business_description: desc,
      description:          desc,          // keep in sync
      whatsapp,
      phone:                phone || whatsapp,
      governorate:          gov,
      city,
      address,
      location_link:        link,
      business_category:    cat,
      business_subcategory: subcat,
      working_hours:        hours,
      business_logo:        logoUrl,
      business_slug:        slug || null,
    };

    const { error } = await sb.from('profiles')
      .update(updateData)
      .eq('id', AuthState.user.id);

    if (error) throw new Error(error.message);

    // Update AuthState immediately — partial update only
    Object.assign(AuthState.profile, updateData);

    _bpMsg(okEl, '✅ تم حفظ بيانات النشاط بنجاح!', true);

    // Update overview card without full re-render
    _updateOverviewProfileCard();

  } catch (err) {
    _bpMsg(errEl, '❌ ' + (err.message || 'حدث خطأ'), true);
  } finally {
    if (btn) { btn.disabled = false; btn.textContent = '💾 حفظ بيانات النشاط'; }
  }
}

// ===== UPDATE OVERVIEW CARD (partial update) =====
function _updateOverviewProfileCard() {
  const card = document.getElementById('bp-overview-card');
  if (!card) return;

  const complete = isProfileComplete();
  card.innerHTML = _profileOverviewCardContent(complete);
}

function _profileOverviewCardContent(complete) {
  const p = AuthState.profile || {};
  return `
    <div class="dash-section-head">
      <div class="dash-section-title">🏪 بيانات النشاط</div>
      <button class="dash-btn dash-btn-ghost"
              onclick="switchDashSection('business-profile')">تعديل</button>
    </div>
    <div class="dash-section-body">
      ${!complete ? `
        <div style="display:flex;align-items:center;gap:10px;padding:8px 0;">
          <span style="font-size:20px;">⚠️</span>
          <div>
            <div style="font-size:13px;font-weight:800;color:#c2410c;">غير مكتمل</div>
            <div style="font-size:11px;color:#9a3412;">أكمل البيانات لتتمكن من إضافة عروض</div>
          </div>
        </div>` : `
        <div style="display:flex;flex-direction:column;gap:8px;">
          ${p.business_logo ? `
            <div style="display:flex;align-items:center;gap:10px;margin-bottom:4px;">
              <img src="${_bpEsc(p.business_logo)}" alt="logo"
                   style="width:44px;height:44px;border-radius:8px;object-fit:cover;">
              <strong style="font-size:14px;">${_bpEsc(p.business_name || p.company_name || '')}</strong>
            </div>` : `
            <strong style="font-size:14px;">
              ✅ ${_bpEsc(p.business_name || p.company_name || '')}
            </strong>`}
          ${p.governorate ? `<span style="font-size:12px;color:var(--gray-400);">📍 ${_bpEsc(p.governorate)}${p.city ? ' — ' + p.city : ''}</span>` : ''}
          ${p.business_category ? `<span style="font-size:12px;color:var(--gray-400);">📂 ${_bpEsc(CAT_LABELS[p.business_category] || p.business_category)}</span>` : ''}
        </div>`}
    </div>`;
}

// ===== HELPERS =====
function _buildCatOptions() {
  const cats = [...ONLINE_CATS, ...OFFLINE_CATS].filter(c => c.id !== 'all');
  const seenIds = new Set();
  return cats
    .filter(c => { if (seenIds.has(c.id)) return false; seenIds.add(c.id); return true; })
    .map(c => `<option value="${c.id}">${c.ico} ${c.label}</option>`)
    .join('');
}

function _bpMsg(el, msg, show) {
  if (!el) return;
  el.textContent = msg;
  el.classList.toggle('show', show);
}

function _bpEsc(str) {
  if (!str) return '';
  return String(str)
    .replace(/&/g,'&amp;').replace(/</g,'&lt;')
    .replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}
