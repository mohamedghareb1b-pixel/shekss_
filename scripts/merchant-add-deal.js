/**
 * ============================================================
 * SHEKSS — MERCHANT: ADD DEAL
 * scripts/merchant-add-deal.js
 * ============================================================
 * Handles the full deal creation flow inside the merchant
 * dashboard. Called from switchDashSection('add-deal').
 *
 * Depends on:
 *   auth.js      → AuthState (merchant_id, profile.location_link)
 *   utils.js     → toast, emptyHtml
 *   data.js      → ONLINE_CATS, OFFLINE_CATS, CAT_LABELS
 *   supabase.js  → sb (storage + DB)
 *
 * Flow:
 *   renderAddDealForm()
 *     → user fills form
 *     → submitDeal()
 *       → validateDealForm()
 *       → _uploadImage() × 2 (compress → WebP → Supabase Storage)
 *       → sb.from('deals').insert({ ...data, approval_status: 'pending_approval' })
 *       → showDealSuccess()
 * ============================================================
 */

// ===== IMAGE UPLOAD STATE =====
// Stores the File objects selected by user (not uploaded yet — upload happens on submit)
const _dealImages = { main: null, second: null };

// ===== RENDER FORM =====
function renderAddDealForm() {
  const profile = AuthState.profile || {};

  // Phase 5.3: Check profile completeness before showing form
  if (!isProfileComplete()) {
    return `
      <div class="add-deal-wrap">
        <div style="background:#fff7ed;border:2px solid #fed7aa;border-radius:var(--radius);
                    padding:32px;text-align:center;max-width:480px;margin:0 auto;">
          <div style="font-size:44px;margin-bottom:16px;">⚠️</div>
          <h3 style="font-size:18px;font-weight:900;color:#c2410c;margin-bottom:10px;">
            أكمل بيانات نشاطك أولاً
          </h3>
          <p style="font-size:14px;color:#9a3412;line-height:1.7;margin-bottom:20px;">
            قبل إضافة عرض، يجب إكمال بيانات النشاط الأساسية:<br>
            <strong>اسم النشاط، الواتساب، المحافظة، المركز، التصنيف</strong>
          </p>
          <div style="display:flex;gap:10px;justify-content:center;flex-wrap:wrap;">
            <button class="dash-btn dash-btn-primary"
                    onclick="switchDashSection('business-profile')">
              🏪 إكمال بيانات النشاط
            </button>
            <button class="dash-btn dash-btn-ghost"
                    onclick="switchDashSection('deals')">← رجوع
            </button>
          </div>
        </div>
      </div>`;
  }

  // Auto-fill from profile
  const prefillCompany  = profile.business_name    || profile.company_name         || '';
  const prefillLink     = profile.location_link    || '';
  const prefillCat      = profile.business_category || '';
  const prefillSubcat   = profile.business_subcategory || '';

  const allCats = [...ONLINE_CATS, ...OFFLINE_CATS].filter(c => c.id !== 'all');
  const seenIds = new Set();
  const cats = allCats.filter(c => { if (seenIds.has(c.id)) return false; seenIds.add(c.id); return true; });

  return `
  <div class="add-deal-wrap">

    <!-- Header -->
    <div class="add-deal-header">
      <div>
        <h2 class="add-deal-title">🏷️ إضافة عرض جديد</h2>
        <p class="add-deal-sub">العرض لن يُنشر فور الإضافة — سيتم مراجعته من قِبل فريق شيكس أولاً</p>
      </div>
      <button class="dash-btn dash-btn-ghost" onclick="switchDashSection('deals')">← العودة للعروض</button>
    </div>

    <!-- Global error/success -->
    <div class="form-msg error"  id="deal-form-error"></div>
    <div class="form-msg success" id="deal-form-success"></div>

    <div class="add-deal-grid">

      <!-- ── RIGHT COLUMN: Images + Basic Info ── -->
      <div class="add-deal-col">

        <!-- Images -->
        <div class="form-card">
          <div class="form-card-title">📸 صور العرض</div>

          <div class="img-upload-row">
            <!-- Main image -->
            <div class="img-upload-box" id="main-img-box" onclick="document.getElementById('main-img-input').click()">
              <div class="img-upload-placeholder" id="main-img-placeholder">
                <span style="font-size:28px;">🖼️</span>
                <span>الصورة الرئيسية</span>
                <span style="font-size:11px;opacity:0.6;">اضغط للاختيار</span>
              </div>
              <img id="main-img-preview" class="img-preview" style="display:none;">
              <button class="img-remove-btn" id="main-img-remove"
                      onclick="removeImage(event,'main')" style="display:none;">✕</button>
            </div>

            <!-- Second image -->
            <div class="img-upload-box" id="second-img-box" onclick="document.getElementById('second-img-input').click()">
              <div class="img-upload-placeholder" id="second-img-placeholder">
                <span style="font-size:28px;">🖼️</span>
                <span>صورة إضافية</span>
                <span style="font-size:11px;opacity:0.6;">اختياري</span>
              </div>
              <img id="second-img-preview" class="img-preview" style="display:none;">
              <button class="img-remove-btn" id="second-img-remove"
                      onclick="removeImage(event,'second')" style="display:none;">✕</button>
            </div>
          </div>

          <!-- Hidden file inputs -->
          <input type="file" id="main-img-input"   accept="image/*" style="display:none;"
                 onchange="previewImage(this,'main')">
          <input type="file" id="second-img-input" accept="image/*" style="display:none;"
                 onchange="previewImage(this,'second')">

          <p class="img-hint">الصور ستُضغط تلقائياً إلى WebP قبل الرفع</p>
        </div>

        <!-- Deal Type -->
        <div class="form-card">
          <div class="form-card-title">📋 نوع العرض</div>
          <div class="deal-type-row">
            <button class="deal-type-btn active" id="dtype-online"
                    onclick="selectDealType('online')">🌐 أونلاين</button>
            <button class="deal-type-btn" id="dtype-offline"
                    onclick="selectDealType('offline')">📍 عروض المنطقة</button>
          </div>
        </div>

        <!-- Category -->
        <div class="form-card">
          <div class="form-card-title">📂 القسم</div>
          <div class="form-group">
            <label class="form-label">القسم الرئيسي <span class="req">*</span></label>
            <select class="form-input" id="deal-category" onchange="updateSubcats()">
              <option value="">اختر القسم</option>
              ${cats.map(c => `<option value="${c.id}" ${prefillCat === c.id ? 'selected' : ''}>${c.ico} ${c.label}</option>`).join('')}
            </select>
          </div>
          <div class="form-group">
            <label class="form-label">القسم الفرعي</label>
            <select class="form-input" id="deal-subcategory">
              <option value="">اختر أولاً القسم الرئيسي</option>
            </select>
          </div>
        </div>

      </div>

      <!-- ── LEFT COLUMN: Details + Pricing ── -->
      <div class="add-deal-col">

        <!-- Basic Info -->
        <div class="form-card">
          <div class="form-card-title">✏️ تفاصيل العرض</div>

          <div class="form-group">
            <label class="form-label">اسم العرض <span class="req">*</span></label>
            <input class="form-input" type="text" id="deal-title"
                   placeholder="مثال: خصم 50% على الأجهزة الإلكترونية" maxlength="120">
            <span class="form-hint">الاسم يظهر كعنوان للعرض على شيكس</span>
          </div>

          <div class="form-group">
            <label class="form-label">وصف مختصر <span class="req">*</span></label>
            <textarea class="form-input form-textarea" id="deal-description"
                      placeholder="وصف مختصر للعرض (يظهر في البطاقة)" maxlength="200" rows="2"
                      oninput="updateCharCount(this,'desc-count',200)"></textarea>
            <span class="form-hint char-count">
              <span id="desc-count">0</span>/200 حرف
            </span>
          </div>

          <div class="form-group">
            <label class="form-label">تفاصيل إضافية</label>
            <textarea class="form-input form-textarea" id="deal-details"
                      placeholder="شروط العرض، ملاحظات، تفاصيل إضافية..." rows="3"
                      maxlength="600" oninput="updateCharCount(this,'details-count',600)"></textarea>
            <span class="form-hint char-count">
              <span id="details-count">0</span>/600 حرف
            </span>
          </div>

          <div class="form-group">
            <label class="form-label">اسم الشركة / المتجر <span class="req">*</span></label>
            <input class="form-input" type="text" id="deal-company"
                   value="${_madEsc(prefillCompany)}"
                   placeholder="اسم شركتك أو متجرك"
                   ${prefillCompany ? 'style="background:var(--gray-50);"' : ''}>
          </div>
        </div>

        <!-- Pricing -->
        <div class="form-card">
          <div class="form-card-title">💰 السعر والخصم</div>

          <div class="price-row">
            <div class="form-group">
              <label class="form-label">السعر قبل (ج.م) <span class="req">*</span></label>
              <input class="form-input" type="number" id="deal-old-price"
                     placeholder="0.00" min="0" step="0.01"
                     oninput="calcDiscount()">
            </div>
            <div class="form-group">
              <label class="form-label">السعر بعد (ج.م) <span class="req">*</span></label>
              <input class="form-input" type="number" id="deal-new-price"
                     placeholder="0.00" min="0" step="0.01"
                     oninput="calcDiscount()">
            </div>
          </div>

          <div class="discount-display" id="discount-display" style="display:none;">
            <span class="discount-badge-large" id="discount-value">0%</span>
            <span class="discount-label">نسبة الخصم — محسوبة تلقائياً</span>
          </div>
        </div>

        <!-- Deal Settings -->
        <div class="form-card">
          <div class="form-card-title">⚙️ إعدادات العرض</div>

          <div class="form-group">
            <label class="form-label">مدة العرض <span class="req">*</span></label>
            <div class="duration-row">
              <button class="duration-btn active" id="dur-1"
                      onclick="selectDuration(1)">يوم</button>
              <button class="duration-btn" id="dur-2"
                      onclick="selectDuration(2)">يومين</button>
              <button class="duration-btn" id="dur-3"
                      onclick="selectDuration(3)">3 أيام</button>
              <button class="duration-btn" id="dur-7"
                      onclick="selectDuration(7)">أسبوع</button>
              <button class="duration-btn" id="dur-14"
                      onclick="selectDuration(14)">أسبوعين</button>
              <button class="duration-btn" id="dur-30"
                      onclick="selectDuration(30)">شهر</button>
            </div>
            <div class="expires-preview" id="expires-preview">
              ⏰ ينتهي العرض: <strong id="expires-date">—</strong>
            </div>
          </div>

          <div class="form-group">
            <label class="form-label">حالة العرض</label>
            <div class="status-row">
              <button class="status-btn active" id="dstatus-active"
                      onclick="selectDealStatus('active')">✅ نشط</button>
              <button class="status-btn" id="dstatus-hot"
                      onclick="selectDealStatus('hot')">🔥 ساخن</button>
            </div>
            <span class="form-hint">ستظل الحالة "في انتظار المراجعة" حتى يوافق الفريق</span>
          </div>

          <div class="form-group">
            <label class="form-label">كود الكوبون</label>
            <input class="form-input" type="text" id="deal-coupon"
                   value="شيكس" maxlength="30"
                   placeholder="شيكس">
            <span class="form-hint">الكود الافتراضي هو "شيكس"</span>
          </div>

          <div class="form-group">
            <label class="form-label">رابط العرض / الموقع</label>
            <input class="form-input" type="url" id="deal-link" dir="ltr"
                   value="${_madEsc(prefillLink)}"
                   placeholder="https://...">
            <span class="form-hint">رابط الشراء أونلاين أو Google Maps للمحل</span>
          </div>
        </div>

      </div>
    </div>

    <!-- Submit -->
    <div class="add-deal-actions">
      <button class="dash-btn dash-btn-ghost" onclick="switchDashSection('deals')">إلغاء</button>
      <button class="dash-btn dash-btn-primary" id="submit-deal-btn"
              onclick="submitDeal()">
        💾 حفظ وإرسال للمراجعة
      </button>
    </div>

  </div>`;
}

// ===== DEAL TYPE TOGGLE =====
let _dealType = 'online'; // 'online' | 'offline'

function selectDealType(type) {
  _dealType = type;
  document.getElementById('dtype-online').classList.toggle('active', type === 'online');
  document.getElementById('dtype-offline').classList.toggle('active', type === 'offline');
  // Refresh subcategory options based on new type
  updateSubcats();
}

// ===== CATEGORY SUBCATEGORY SYNC =====
function updateSubcats() {
  const catId  = document.getElementById('deal-category')?.value;
  const subSel = document.getElementById('deal-subcategory');
  if (!subSel) return;

  const cats = _dealType === 'online' ? ONLINE_CATS : OFFLINE_CATS;
  const cat  = cats.find(c => c.id === catId);

  subSel.innerHTML = '<option value="">— بدون قسم فرعي —</option>';
  if (cat && cat.subs.length) {
    cat.subs.forEach(s => {
      const opt = document.createElement('option');
      opt.value = opt.textContent = s;
      subSel.appendChild(opt);
    });
  }
}

// ===== PRICE → AUTO DISCOUNT =====
function calcDiscount() {
  const oldP = parseFloat(document.getElementById('deal-old-price')?.value || 0);
  const newP = parseFloat(document.getElementById('deal-new-price')?.value || 0);
  const disp = document.getElementById('discount-display');
  const val  = document.getElementById('discount-value');

  if (oldP > 0 && newP >= 0 && newP < oldP) {
    const pct = Math.round((1 - newP / oldP) * 100);
    if (val)  val.textContent  = pct + '%';
    if (disp) disp.style.display = 'flex';
  } else {
    if (disp) disp.style.display = 'none';
  }
}

// ===== DURATION SELECTOR =====
let _selectedDuration = 1; // days

function selectDuration(days) {
  _selectedDuration = days;
  document.querySelectorAll('.duration-btn').forEach(b => b.classList.remove('active'));
  const btn = document.getElementById('dur-' + days);
  if (btn) btn.classList.add('active');
  _updateExpiresPreview(days);
}

function _updateExpiresPreview(days) {
  const expires = new Date(Date.now() + days * 86400000);
  const el = document.getElementById('expires-date');
  if (el) el.textContent = expires.toLocaleDateString('ar-EG', {
    weekday: 'long', year: 'numeric', month: 'long', day: 'numeric',
  });
}

// ===== DEAL STATUS SELECTOR =====
let _selectedDealStatus = 'active';

function selectDealStatus(status) {
  _selectedDealStatus = status;
  document.querySelectorAll('.status-btn').forEach(b => b.classList.remove('active'));
  const btn = document.getElementById('dstatus-' + status);
  if (btn) btn.classList.add('active');
}

// ===== IMAGE PREVIEW =====
function previewImage(input, slot) {
  const file = input.files[0];
  if (!file) return;

  // Validate type
  if (!file.type.startsWith('image/')) {
    toast('⚠️ يُرجى اختيار ملف صورة صحيح');
    return;
  }
  // Validate size (max 15 MB before compression)
  if (file.size > 15 * 1024 * 1024) {
    toast('⚠️ حجم الصورة أكبر من 15 ميجا — اختر صورة أصغر');
    return;
  }

  _dealImages[slot] = file;

  const preview = document.getElementById(slot + '-img-preview');
  const placeholder = document.getElementById(slot + '-img-placeholder');
  const removeBtn   = document.getElementById(slot + '-img-remove');

  const reader = new FileReader();
  reader.onload = e => {
    if (preview) { preview.src = e.target.result; preview.style.display = 'block'; }
    if (placeholder) placeholder.style.display = 'none';
    if (removeBtn)   removeBtn.style.display   = 'flex';
  };
  reader.readAsDataURL(file);
}

function removeImage(event, slot) {
  event.stopPropagation(); // prevent box click
  _dealImages[slot] = null;

  const input       = document.getElementById(slot + '-img-input');
  const preview     = document.getElementById(slot + '-img-preview');
  const placeholder = document.getElementById(slot + '-img-placeholder');
  const removeBtn   = document.getElementById(slot + '-img-remove');

  if (input)       input.value       = '';
  if (preview)     { preview.src = ''; preview.style.display = 'none'; }
  if (placeholder) placeholder.style.display = 'flex';
  if (removeBtn)   removeBtn.style.display   = 'none';
}

// ===== CHAR COUNT =====
function updateCharCount(textarea, countId, max) {
  const el = document.getElementById(countId);
  if (el) el.textContent = textarea.value.length;
}

// ===== IMAGE COMPRESSION + UPLOAD =====
async function _compressToWebP(file, maxWidth = 900, quality = 0.78) {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new Image();

    img.onload = () => {
      URL.revokeObjectURL(url);
      let w = img.width, h = img.height;
      if (w > maxWidth) { h = Math.round(h * maxWidth / w); w = maxWidth; }

      const canvas = document.createElement('canvas');
      canvas.width  = w;
      canvas.height = h;
      canvas.getContext('2d').drawImage(img, 0, 0, w, h);

      canvas.toBlob(
        blob => blob ? resolve(blob) : reject(new Error('فشل ضغط الصورة')),
        'image/webp',
        quality
      );
    };
    img.onerror = () => { URL.revokeObjectURL(url); reject(new Error('فشل قراءة الصورة')); };
    img.src = url;
  });
}

async function _uploadImage(file, slot) {
  if (!file) return null;

  const uid      = AuthState.user.id;
  const ts       = Date.now();
  const rand     = Math.random().toString(36).slice(2, 7);
  const path     = `merchant-uploads/${uid}/${ts}-${slot}-${rand}.webp`;

  const webpBlob = await _compressToWebP(file);

  const { data, error } = await sb.storage
    .from('deals')
    .upload(path, webpBlob, { contentType: 'image/webp', upsert: false });

  if (error) throw new Error('فشل رفع الصورة: ' + error.message);

  const { data: urlData } = sb.storage.from('deals').getPublicUrl(path);
  return urlData.publicUrl;
}

// ===== VALIDATION =====
function _validateDealForm() {
  const errors = [];

  if (!_dealImages.main)
    errors.push('الصورة الرئيسية مطلوبة');

  const title = document.getElementById('deal-title')?.value.trim();
  if (!title)
    errors.push('اسم العرض مطلوب');

  const desc = document.getElementById('deal-description')?.value.trim();
  if (!desc)
    errors.push('الوصف المختصر مطلوب');

  const cat = document.getElementById('deal-category')?.value;
  if (!cat)
    errors.push('يجب اختيار القسم الرئيسي');

  const company = document.getElementById('deal-company')?.value.trim();
  if (!company)
    errors.push('اسم الشركة / المتجر مطلوب');

  const oldP = parseFloat(document.getElementById('deal-old-price')?.value || 0);
  const newP = parseFloat(document.getElementById('deal-new-price')?.value || 0);
  if (!oldP || oldP <= 0)
    errors.push('السعر قبل الخصم مطلوب');
  if (newP < 0)
    errors.push('السعر بعد الخصم غير صحيح');
  if (oldP > 0 && newP >= oldP)
    errors.push('السعر بعد الخصم يجب أن يكون أقل من السعر الأصلي');

  return errors;
}

// ===== SUBMIT =====
async function submitDeal() {
  const btn    = document.getElementById('submit-deal-btn');
  const errEl  = document.getElementById('deal-form-error');
  const okEl   = document.getElementById('deal-form-success');

  // Reset messages
  _setDealMsg(errEl, '', false);
  _setDealMsg(okEl,  '', false);

  // Validate
  const errors = _validateDealForm();
  if (errors.length) {
    _setDealMsg(errEl, '⚠️ ' + errors.join(' • '), true);
    errEl.scrollIntoView({ behavior: 'smooth', block: 'center' });
    return;
  }

  // Loading state
  btn.disabled    = true;
  btn.textContent = '⏳ جاري الرفع والحفظ...';

  try {
    // 1. Upload images (compress → WebP → Storage)
    btn.textContent = '📤 جاري رفع الصور...';
    const [mainUrl, secondUrl] = await Promise.all([
      _uploadImage(_dealImages.main,   'main'),
      _uploadImage(_dealImages.second, 'second'),
    ]);

    // 2. Calculate fields
    const oldP     = parseFloat(document.getElementById('deal-old-price').value);
    const newP     = parseFloat(document.getElementById('deal-new-price').value);
    const discPct  = oldP > 0 ? Math.round((1 - newP / oldP) * 100) : null;
    const expiresAt = new Date(Date.now() + _selectedDuration * 86400000).toISOString();

    // 3. Build deal record
    const deal = {
      merchant_id:      AuthState.user.id,
      title:            document.getElementById('deal-title').value.trim(),
      name:             document.getElementById('deal-title').value.trim(), // existing `name` column alias
      description:      document.getElementById('deal-description').value.trim(),
      details:          document.getElementById('deal-details')?.value.trim() || null,
      category:         document.getElementById('deal-category').value,
      subcategory:      document.getElementById('deal-subcategory').value || null,
      company_name:     document.getElementById('deal-company').value.trim(),
      coupon_code:      document.getElementById('deal-coupon').value.trim() || 'شيكس',
      link:             document.getElementById('deal-link').value.trim() || null,
      location_link:    document.getElementById('deal-link').value.trim() || null,
      main_image:       mainUrl,
      image:            mainUrl,       // existing `image` column alias
      second_image:     secondUrl,
      old_price:        oldP,
      price:            oldP,          // existing `price` column alias
      new_price:        newP,
      discount:         discPct,
      discount_percent: discPct,
      status:           _selectedDealStatus,
      is_offline:       _dealType === 'offline',
      expires_at:       expiresAt,
      approval_status:  'pending_approval',
    };

    // 4. Insert to DB
    btn.textContent = '💾 جاري الحفظ...';
    const { error } = await sb.from('deals').insert([deal]);
    if (error) throw new Error('فشل حفظ العرض: ' + error.message);

    // 5. Success
    _setDealMsg(okEl,
      '✅ تم إرسال العرض بنجاح! سيتم مراجعته من فريق شيكس خلال ٢٤ ساعة.',
      true
    );
    okEl.scrollIntoView({ behavior: 'smooth', block: 'center' });

    // Reset form after short delay
    setTimeout(() => {
      _resetDealForm();
      switchDashSection('deals');
    }, 2500);

  } catch (err) {
    _setDealMsg(errEl, '❌ ' + (err.message || 'حدث خطأ غير متوقع'), true);
    errEl.scrollIntoView({ behavior: 'smooth', block: 'center' });
  } finally {
    btn.disabled    = false;
    btn.textContent = '💾 حفظ وإرسال للمراجعة';
  }
}

// ===== RESET FORM =====
function _resetDealForm() {
  _dealImages.main   = null;
  _dealImages.second = null;
  _selectedDuration    = 1;
  _selectedDealStatus  = 'active';
  _dealType            = 'online';
}

// ===== INIT PREFILL (called from _initAddDealDefaults in dashboard) =====
// Auto-selects subcategory from profile after the category select renders
function initAddDealPrefill() {
  const p = AuthState.profile || {};

  // Trigger subcategory fill if category was prefilled
  if (p.business_category) {
    // Small delay to ensure DOM is ready
    setTimeout(() => {
      updateSubcats();
      // Select subcategory if available
      if (p.business_subcategory) {
        const subSel = document.getElementById('deal-subcategory');
        if (subSel) subSel.value = p.business_subcategory;
      }
    }, 50);
  }

  // Set expires preview for default duration
  if (typeof _updateExpiresPreview === 'function') _updateExpiresPreview(1);
}

// ===== HELPERS =====
function _setDealMsg(el, msg, show) {
  if (!el) return;
  el.textContent = msg;
  el.classList.toggle('show', show);
}

// _madEsc: module-scoped HTML escaper for merchant-add-deal.js
function _madEsc(str) {
  if (!str) return '';
  return String(str)
    .replace(/&/g,'&amp;').replace(/</g,'&lt;')
    .replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}
