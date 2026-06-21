/**
 * ============================================================
 * SHEKSS — ADMIN: ADD DEAL DIRECTLY
 * scripts/admin-add-deal.js
 * ============================================================
 * Admin adds deals directly — approval_status = 'approved'
 * No merchant_id required (admin-owned deals)
 * Reuses image compression pattern from merchant-add-deal.js
 * ============================================================
 */

// ===== RENDER =====
function renderAdminAddDeal() {
  const content = document.getElementById('adm-content');
  if (!content) return;

  const allCats = [...ONLINE_CATS, ...OFFLINE_CATS].filter(c => c.id !== 'all');
  const seenIds = new Set();
  const cats = allCats.filter(c => {
    if (seenIds.has(c.id)) return false;
    seenIds.add(c.id); return true;
  });

  content.innerHTML = `
    <div style="max-width:640px;">

      <div class="form-msg error"  id="aad-err"></div>
      <div class="form-msg success" id="aad-ok"></div>

      <!-- Images -->
      <div class="form-card" style="margin-bottom:16px;">
        <div class="form-card-title">📸 صور العرض</div>
        <div class="add-deal-images">
          <div class="img-upload-box" id="aad-main-box"
               onclick="document.getElementById('aad-main-input').click()">
            <div class="img-upload-inner" id="aad-main-preview">
              <span style="font-size:28px;">🖼️</span>
              <span style="font-size:12px;font-weight:700;color:var(--gray-400);">الصورة الرئيسية</span>
            </div>
          </div>
          <div class="img-upload-box" id="aad-second-box"
               onclick="document.getElementById('aad-second-input').click()">
            <div class="img-upload-inner" id="aad-second-preview">
              <span style="font-size:28px;">🖼️</span>
              <span style="font-size:12px;font-weight:700;color:var(--gray-400);">صورة ثانوية</span>
            </div>
          </div>
        </div>
        <input type="file" id="aad-main-input"   accept="image/*" style="display:none;"
               onchange="aadPreviewImg(this,'main')">
        <input type="file" id="aad-second-input" accept="image/*" style="display:none;"
               onchange="aadPreviewImg(this,'second')">
      </div>

      <!-- Deal Info -->
      <div class="form-card" style="margin-bottom:16px;">
        <div class="form-card-title">📋 بيانات العرض</div>

        <div class="form-group">
          <label class="form-label">عنوان العرض <span class="req">*</span></label>
          <input class="form-input" type="text" id="aad-title"
                 placeholder="مثال: خصم 50% على جميع الملابس" maxlength="100">
        </div>

        <div class="form-group">
          <label class="form-label">وصف العرض</label>
          <textarea class="form-input form-textarea" id="aad-desc"
                    rows="3" maxlength="500"
                    placeholder="تفاصيل العرض والشروط..."></textarea>
        </div>

        <div class="price-row">
          <div class="form-group">
            <label class="form-label">اسم المتجر / النشاط <span class="req">*</span></label>
            <input class="form-input" type="text" id="aad-company"
                   placeholder="اسم المتجر أو النشاط التجاري">
          </div>
          <div class="form-group">
            <label class="form-label">كود الكوبون</label>
            <input class="form-input" type="text" id="aad-coupon"
                   value="شيكس" placeholder="شيكس" dir="ltr">
          </div>
        </div>

        <div class="price-row">
          <div class="form-group">
            <label class="form-label">السعر قبل</label>
            <input class="form-input" type="number" id="aad-old-price"
                   placeholder="0" min="0" step="0.01">
          </div>
          <div class="form-group">
            <label class="form-label">السعر بعد</label>
            <input class="form-input" type="number" id="aad-new-price"
                   placeholder="0" min="0" step="0.01">
          </div>
          <div class="form-group">
            <label class="form-label">نسبة الخصم %</label>
            <input class="form-input" type="number" id="aad-discount"
                   placeholder="0" min="0" max="100">
          </div>
        </div>
      </div>

      <!-- Category + Type -->
      <div class="form-card" style="margin-bottom:16px;">
        <div class="form-card-title">📂 التصنيف</div>

        <div class="price-row">
          <div class="form-group">
            <label class="form-label">نوع العرض</label>
            <select class="form-input" id="aad-type">
              <option value="online">🌐 أونلاين</option>
              <option value="offline">📍 عروض المنطقة</option>
            </select>
          </div>
          <div class="form-group">
            <label class="form-label">حالة العرض</label>
            <select class="form-input" id="aad-status">
              <option value="active">✅ نشط</option>
              <option value="hot">🔥 هوت ديل</option>
            </select>
          </div>
        </div>

        <div class="price-row">
          <div class="form-group">
            <label class="form-label">التصنيف الرئيسي <span class="req">*</span></label>
            <select class="form-input" id="aad-category" onchange="aadFillSubcats()">
              <option value="">اختر التصنيف</option>
              ${cats.map(c => `<option value="${c.id}">${c.ico} ${c.label}</option>`).join('')}
            </select>
          </div>
          <div class="form-group">
            <label class="form-label">التصنيف الفرعي</label>
            <select class="form-input" id="aad-subcategory">
              <option value="">اختر أولاً</option>
            </select>
          </div>
        </div>
      </div>

      <!-- Link + Expiry -->
      <div class="form-card" style="margin-bottom:16px;">
        <div class="form-card-title">🔗 الرابط والمدة</div>

        <div class="form-group">
          <label class="form-label">رابط العرض / Google Maps</label>
          <input class="form-input" type="url" id="aad-link"
                 placeholder="https://..." dir="ltr">
        </div>

        <div class="form-group">
          <label class="form-label">مدة العرض</label>
          <select class="form-input" id="aad-duration" onchange="aadUpdateExpiry()">
            <option value="7">أسبوع واحد</option>
            <option value="14">أسبوعين</option>
            <option value="30" selected>شهر</option>
            <option value="60">شهرين</option>
            <option value="90">3 أشهر</option>
            <option value="0">بدون انتهاء</option>
          </select>
          <span class="form-hint" id="aad-expiry-preview"></span>
        </div>
      </div>

      <button class="btn-submit" id="aad-submit-btn" onclick="submitAdminDeal()">
        ➕ إضافة العرض مباشرة
      </button>
    </div>`;

  aadUpdateExpiry();
}

// ===== IMAGE STATE =====
const _aadImages = { main: null, second: null };

function aadPreviewImg(input, slot) {
  const file = input.files[0];
  if (!file) return;
  if (file.size > 10 * 1024 * 1024) { toast('⚠️ الصورة أكبر من 10 ميجا'); return; }

  _aadImages[slot] = file;

  const reader = new FileReader();
  reader.onload = e => {
    const previewEl = document.getElementById(`aad-${slot}-preview`);
    if (previewEl) previewEl.innerHTML =
      `<img src="${e.target.result}"
            style="width:100%;height:100%;object-fit:cover;border-radius:10px;">`;
  };
  reader.readAsDataURL(file);
}

// ===== SUBCATEGORIES =====
function aadFillSubcats() {
  const catId  = document.getElementById('aad-category')?.value;
  const subSel = document.getElementById('aad-subcategory');
  if (!subSel) return;

  const allCats = [...ONLINE_CATS, ...OFFLINE_CATS];
  const cat = allCats.find(c => c.id === catId);

  subSel.innerHTML = '<option value="">— بدون —</option>';
  if (cat?.subs?.length) {
    cat.subs.forEach(s => {
      const opt = document.createElement('option');
      opt.value = opt.textContent = s;
      subSel.appendChild(opt);
    });
  }
}

// ===== EXPIRY PREVIEW =====
function aadUpdateExpiry() {
  const days = parseInt(document.getElementById('aad-duration')?.value || '30');
  const el   = document.getElementById('aad-expiry-preview');
  if (!el) return;

  if (days === 0) { el.textContent = '🔁 العرض لن ينتهي'; return; }

  const exp = new Date();
  exp.setDate(exp.getDate() + days);
  el.textContent = 'ينتهي: ' + exp.toLocaleDateString('ar-EG',
    { weekday:'short', year:'numeric', month:'long', day:'numeric' });
}

// ===== IMAGE COMPRESS + UPLOAD =====
async function _aadCompressImage(file, maxW = 800, maxH = 600, quality = 0.82) {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      URL.revokeObjectURL(url);
      let { width, height } = img;
      if (width > maxW) { height = height * maxW / width; width = maxW; }
      if (height > maxH) { width = width * maxH / height; height = maxH; }
      const canvas = document.createElement('canvas');
      canvas.width = width; canvas.height = height;
      canvas.getContext('2d').drawImage(img, 0, 0, width, height);
      canvas.toBlob(
        b => b ? resolve(b) : reject(new Error('فشل الضغط')),
        'image/webp', quality
      );
    };
    img.onerror = () => { URL.revokeObjectURL(url); reject(new Error('فشل قراءة الصورة')); };
    img.src = url;
  });
}

async function _aadUploadImage(file, slot) {
  const blob = await _aadCompressImage(file);
  const path = `admin-deals/${Date.now()}-${slot}.webp`;
  const { error } = await sb.storage.from('deals')
    .upload(path, blob, { contentType: 'image/webp', upsert: true });
  if (error) throw new Error('فشل رفع الصورة: ' + error.message);
  const { data } = sb.storage.from('deals').getPublicUrl(path);
  return data.publicUrl;
}

// ===== SUBMIT =====
async function submitAdminDeal() {
  const title    = document.getElementById('aad-title')?.value.trim();
  const desc     = document.getElementById('aad-desc')?.value.trim()     || null;
  const company  = document.getElementById('aad-company')?.value.trim();
  const coupon   = document.getElementById('aad-coupon')?.value.trim()   || 'شيكس';
  const oldPrice = parseFloat(document.getElementById('aad-old-price')?.value) || null;
  const newPrice = parseFloat(document.getElementById('aad-new-price')?.value) || null;
  const discount = parseFloat(document.getElementById('aad-discount')?.value)  || null;
  const type     = document.getElementById('aad-type')?.value     || 'online';
  const status   = document.getElementById('aad-status')?.value   || 'active';
  const cat      = document.getElementById('aad-category')?.value;
  const subcat   = document.getElementById('aad-subcategory')?.value || null;
  const link     = document.getElementById('aad-link')?.value.trim() || null;
  const days     = parseInt(document.getElementById('aad-duration')?.value || '30');

  const errEl = document.getElementById('aad-err');
  const okEl  = document.getElementById('aad-ok');
  const btn   = document.getElementById('aad-submit-btn');

  _aadMsg(errEl, '', false);
  _aadMsg(okEl,  '', false);

  if (!title)   { _aadMsg(errEl, '⚠️ عنوان العرض مطلوب', true); return; }
  if (!company) { _aadMsg(errEl, '⚠️ اسم المتجر مطلوب', true);  return; }
  if (!cat)     { _aadMsg(errEl, '⚠️ اختر التصنيف', true);       return; }

  btn.disabled = true; btn.textContent = '⏳ جاري الإضافة...';

  try {
    // Upload images
    let mainUrl = null, secondUrl = null;
    if (_aadImages.main) {
      btn.textContent = '📤 رفع الصور...';
      mainUrl = await _aadUploadImage(_aadImages.main, 'main');
    }
    if (_aadImages.second) {
      secondUrl = await _aadUploadImage(_aadImages.second, 'second');
    }

    // Calculate expires_at
    const expiresAt = days > 0
      ? new Date(Date.now() + days * 86400000).toISOString()
      : null;

    // Auto-calculate discount if prices provided
    let finalDiscount = discount;
    if (!finalDiscount && oldPrice && newPrice && oldPrice > newPrice) {
      finalDiscount = Math.round((oldPrice - newPrice) / oldPrice * 100);
    }

    const { error } = await sb.from('deals').insert({
      title:            title,
      name:             title,
      description:      desc,
      company_name:     company,
      coupon_code:      coupon,
      old_price:        oldPrice,
      new_price:        newPrice,
      discount_percent: finalDiscount,
      is_offline:       type === 'offline',
      status,
      category:         cat,
      subcategory:      subcat,
      link,
      location_link:    link,
      main_image:       mainUrl,
      second_image:     secondUrl,
      image:            mainUrl,
      expires_at:       expiresAt,
      approval_status:  'approved',   // admin deals are auto-approved
      merchant_id:      null,
    });

    if (error) throw new Error(error.message);

    _aadMsg(okEl, '✅ تم إضافة العرض بنجاح وهو نشط الآن!', true);
    _aadImages.main   = null;
    _aadImages.second = null;
    btn.disabled = false; btn.textContent = '➕ إضافة العرض مباشرة';

    // Reset form after 2s
    setTimeout(() => renderAdminAddDeal(), 2000);

  } catch (err) {
    _aadMsg(errEl, '❌ ' + (err.message || 'حدث خطأ'), true);
    btn.disabled = false; btn.textContent = '➕ إضافة العرض مباشرة';
  }
}

function _aadMsg(el, msg, show) {
  if (!el) return;
  el.textContent = msg;
  el.classList.toggle('show', show);
}
