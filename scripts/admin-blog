/**
 * ============================================================
 * SHEKSS — ADMIN: BLOG CMS
 * scripts/admin-blog.js
 * ============================================================
 * Admin creates/manages blog posts.
 * Layout: title, image at the start of content, image in the
 * middle of content, body text, optional excerpt.
 * Writes to: public.blogs table
 * Images: compressed to WebP and uploaded to Supabase Storage
 * (bucket 'deals' — reused, no DB base64 ever stored)
 * ============================================================
 */

const _ablogImages = { start: null, middle: null };

// ===== RENDER =====
async function renderAdminBlog() {
  const content = document.getElementById('adm-content');
  if (!content) return;

  content.innerHTML = '<div class="mdm-loading">⏳ جاري تحميل المدونة...</div>';

  const { data, error } = await sb.from('blogs')
    .select('*')
    .order('created_at', { ascending: false });

  if (error) { content.innerHTML = _adm_err(error.message); return; }

  content.innerHTML = `
    <div style="max-width:700px;">

      <!-- Add Post Form -->
      <div class="form-card" style="margin-bottom:24px;">
        <div class="form-card-title">📝 إضافة مقال جديد</div>

        <div class="form-msg error"  id="ablog-err"></div>
        <div class="form-msg success" id="ablog-ok"></div>

        <div class="form-group">
          <label class="form-label">عنوان المقال <span class="req">*</span></label>
          <input class="form-input" type="text" id="ablog-title"
                 placeholder="مثال: 7 طرق للتوفير في رمضان" maxlength="120">
        </div>

        <div class="form-group">
          <label class="form-label">التصنيف</label>
          <select class="form-input" id="ablog-category">
            <option value="">بدون تصنيف</option>
            <option value="tips">نصائح توفير</option>
            <option value="guides">أدلة تسوق</option>
            <option value="news">أخبار العروض</option>
            <option value="reviews">مراجعات</option>
          </select>
        </div>

        <div class="form-group">
          <label class="form-label">ملخص قصير (يظهر في قائمة المقالات)</label>
          <textarea class="form-input form-textarea" id="ablog-excerpt"
                    rows="2" maxlength="200"
                    placeholder="جملة أو اتنين تلخص المقال..."></textarea>
        </div>

        <!-- Image at the start -->
        <div class="form-group">
          <label class="form-label">📸 صورة بداية المقال <span class="req">*</span></label>
          <div class="img-upload-box" id="ablog-start-box"
               onclick="document.getElementById('ablog-start-input').click()"
               style="width:100%;height:160px;">
            <div class="img-upload-inner" id="ablog-start-preview">
              <span style="font-size:28px;">🖼️</span>
              <span style="font-size:12px;font-weight:700;color:var(--gray-400);">اضغط لاختيار صورة</span>
            </div>
          </div>
          <input type="file" id="ablog-start-input" accept="image/*" style="display:none;"
                 onchange="ablogPreviewImg(this,'start')">
        </div>

        <!-- Content part 1 -->
        <div class="form-group">
          <label class="form-label">بداية المقال <span class="req">*</span></label>
          <textarea class="form-input form-textarea" id="ablog-content-1"
                    rows="5" placeholder="اكتب الجزء الأول من المقال هنا..."></textarea>
        </div>

        <!-- Image in the middle -->
        <div class="form-group">
          <label class="form-label">📸 صورة منتصف المقال</label>
          <div class="img-upload-box" id="ablog-middle-box"
               onclick="document.getElementById('ablog-middle-input').click()"
               style="width:100%;height:160px;">
            <div class="img-upload-inner" id="ablog-middle-preview">
              <span style="font-size:28px;">🖼️</span>
              <span style="font-size:12px;font-weight:700;color:var(--gray-400);">اختياري</span>
            </div>
          </div>
          <input type="file" id="ablog-middle-input" accept="image/*" style="display:none;"
                 onchange="ablogPreviewImg(this,'middle')">
        </div>

        <!-- Content part 2 -->
        <div class="form-group">
          <label class="form-label">باقي المقال</label>
          <textarea class="form-input form-textarea" id="ablog-content-2"
                    rows="6" placeholder="اكمل باقي المقال هنا..."></textarea>
        </div>

        <div class="price-row">
          <div class="form-group">
            <label class="form-label">حالة النشر</label>
            <select class="form-input" id="ablog-status">
              <option value="published">✅ نشر مباشر</option>
              <option value="draft">📝 حفظ كمسودة</option>
            </select>
          </div>
        </div>

        <button class="dash-btn dash-btn-primary" style="width:100%;justify-content:center;"
                id="ablog-submit-btn" onclick="submitAdminBlog()">
          📝 نشر المقال
        </button>
      </div>

      <!-- Posts List -->
      <div class="form-card-title" style="margin-bottom:12px;">
        📚 المقالات الحالية (${(data || []).length})
      </div>

      ${!(data || []).length
        ? _adm_empty('📝', 'لا توجد مقالات بعد', 'أضف أول مقال للمدونة')
        : `<div class="adm-list" id="ablog-list">
             ${(data || []).map(b => _blogCard(b)).join('')}
           </div>`}
    </div>`;
}

// ===== BLOG CARD =====
function _blogCard(b) {
  const statusLabel = b.status === 'draft'
    ? '<span style="background:var(--gray-200);color:var(--gray-600);padding:2px 10px;border-radius:6px;font-size:11px;font-weight:700;">📝 مسودة</span>'
    : '<span style="background:var(--green-light);color:#15803d;padding:2px 10px;border-radius:6px;font-size:11px;font-weight:700;">✅ منشور</span>';

  return `
    <div class="adm-card" id="ablog-card-${b.id}">
      <div class="adm-card-body">
        ${b.image ? `
          <div style="width:64px;height:64px;flex-shrink:0;border-radius:8px;overflow:hidden;
                      background:var(--gray-50);">
            <img src="${_ablogEsc(b.image)}" alt=""
                 style="width:100%;height:100%;object-fit:cover;">
          </div>` : `
          <div style="width:64px;height:64px;flex-shrink:0;border-radius:8px;
                      background:var(--blue-light);display:flex;align-items:center;
                      justify-content:center;font-size:24px;">📝</div>`}
        <div class="adm-card-info">
          <div class="adm-card-title">${_ablogEsc(b.title)}</div>
          <div class="adm-card-meta">
            ${statusLabel}
            ${b.category ? `<span>📂 ${_ablogEsc(b.category)}</span>` : ''}
            <span>📅 ${_fmtD(b.created_at)}</span>
          </div>
          ${b.excerpt ? `<p class="adm-card-desc">${_ablogEsc(b.excerpt)}</p>` : ''}
        </div>
      </div>
      <div class="adm-action-btns">
        <button class="adm-btn adm-btn-delete"
                onclick="deleteAdminBlog('${b.id}')">
          🗑️ حذف
        </button>
      </div>
    </div>`;
}

// ===== IMAGE PREVIEW =====
function ablogPreviewImg(input, slot) {
  const file = input.files[0];
  if (!file) return;
  if (file.size > 8 * 1024 * 1024) { toast('⚠️ الصورة أكبر من 8 ميجا'); return; }

  _ablogImages[slot] = file;

  const reader = new FileReader();
  reader.onload = e => {
    const previewEl = document.getElementById(`ablog-${slot}-preview`);
    if (previewEl) previewEl.innerHTML =
      `<img src="${e.target.result}"
            style="width:100%;height:100%;object-fit:cover;border-radius:10px;">`;
  };
  reader.readAsDataURL(file);
}

// ===== COMPRESS + UPLOAD (same pattern as admin-add-deal.js) =====
async function _ablogCompressImage(file, maxW = 1000, maxH = 700, quality = 0.8) {
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

async function _ablogUploadImage(file, slot) {
  const blob = await _ablogCompressImage(file);
  const path = `blog/${Date.now()}-${slot}.webp`;
  const { error } = await sb.storage.from('deals')
    .upload(path, blob, { contentType: 'image/webp', upsert: true });
  if (error) throw new Error('فشل رفع الصورة: ' + error.message);
  const { data } = sb.storage.from('deals').getPublicUrl(path);
  return data.publicUrl;
}

// ===== SUBMIT =====
async function submitAdminBlog() {
  const title     = document.getElementById('ablog-title')?.value.trim();
  const category  = document.getElementById('ablog-category')?.value || null;
  const excerpt   = document.getElementById('ablog-excerpt')?.value.trim() || null;
  const content1  = document.getElementById('ablog-content-1')?.value.trim();
  const content2  = document.getElementById('ablog-content-2')?.value.trim() || '';
  const status    = document.getElementById('ablog-status')?.value || 'published';

  const errEl = document.getElementById('ablog-err');
  const okEl  = document.getElementById('ablog-ok');
  const btn   = document.getElementById('ablog-submit-btn');

  _ablogMsg(errEl, '', false);
  _ablogMsg(okEl,  '', false);

  if (!title)        { _ablogMsg(errEl, '⚠️ عنوان المقال مطلوب', true); return; }
  if (!content1)      { _ablogMsg(errEl, '⚠️ بداية المقال مطلوبة', true); return; }
  if (!_ablogImages.start) { _ablogMsg(errEl, '⚠️ صورة بداية المقال مطلوبة', true); return; }

  btn.disabled = true; btn.textContent = '⏳ جاري النشر...';

  try {
    btn.textContent = '📤 جاري رفع الصور...';
    const startUrl  = await _ablogUploadImage(_ablogImages.start, 'start');
    const middleUrl = _ablogImages.middle ? await _ablogUploadImage(_ablogImages.middle, 'middle') : null;

    // Combine content with middle image marker preserved structurally
    const fullContent = content2
      ? `${content1}\n\n${content2}`
      : content1;

    btn.textContent = '💾 جاري الحفظ...';
    const { data, error } = await sb.from('blogs').insert({
      title,
      category,
      excerpt,
      content: fullContent,
      image: startUrl,
      image_middle: middleUrl,
      status,
    }).select().single();

    if (error) throw new Error(error.message);

    _ablogMsg(okEl, '✅ تم نشر المقال بنجاح!', true);
    _ablogImages.start  = null;
    _ablogImages.middle = null;
    btn.disabled = false; btn.textContent = '📝 نشر المقال';

    // Reset form after brief delay
    setTimeout(() => renderAdminBlog(), 1500);

  } catch (err) {
    _ablogMsg(errEl, '❌ ' + (err.message || 'حدث خطأ'), true);
    btn.disabled = false; btn.textContent = '📝 نشر المقال';
  }
}

// ===== DELETE =====
async function deleteAdminBlog(blogId) {
  if (!confirm('هل تريد حذف هذا المقال نهائياً؟')) return;

  const { error } = await sb.from('blogs')
    .delete().eq('id', blogId);

  if (error) { toast('❌ ' + error.message); return; }

  document.getElementById(`ablog-card-${blogId}`)?.remove();
  toast('🗑️ تم حذف المقال');
}

// ===== HELPERS =====
function _ablogMsg(el, msg, show) {
  if (!el) return;
  el.textContent = msg;
  el.classList.toggle('show', show);
}

function _ablogEsc(str) {
  if (!str) return '';
  return String(str)
    .replace(/&/g,'&amp;').replace(/</g,'&lt;')
    .replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}
