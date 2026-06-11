/**
 * ============================================================
 * SHEKSS — COUPONS & BLOG
 * scripts/coupons-blog.js
 * ============================================================
 */

// ===== COUPONS =====
async function loadCoupons() {
  const grid = document.getElementById('coupons-grid');
  grid.innerHTML = '<div class="skel" style="height:150px;"></div>'.repeat(3);
  const { data } = await sb.from('coupons').select('*').order('created_at', { ascending: false });
  if (!data || !data.length) { grid.innerHTML = emptyHtml('🎟️', 'لا توجد كوبونات متاحة الآن'); return; }
  const now    = new Date();
  const active = data.filter(d => !d.expires_at || new Date(d.expires_at) > now);
  grid.innerHTML = active.length ? active.map(cpCard).join('') : emptyHtml('🎟️', 'لا توجد كوبونات نشطة الآن');
}

function cpCard(d) {
  const typeColor = d.type === 'استرداد' ? 'var(--green)' : d.type === 'شحن مجاني' ? 'var(--purple)' : 'var(--blue)';
  const typeBg    = d.type === 'استرداد' ? 'var(--green-light)' : d.type === 'شحن مجاني' ? 'var(--purple-light)' : 'var(--blue-light)';
  const expires   = d.expires_at ? `⏰ ينتهي: ${new Date(d.expires_at).toLocaleDateString('ar-EG')}` : '';
  return `<div class="cp-card">
    <div class="cp-head">
      <div>
        <span class="cp-type" style="background:${typeBg};color:${typeColor};">${d.type || 'خصم'} ${d.discount ? d.discount + '%' : ''}</span>
        <div class="cp-site">${d.site_name}</div>
      </div>
      ${d.logo ? `<img src="${d.logo}" style="width:48px;height:48px;object-fit:contain;border-radius:8px;">` : '<div style="font-size:36px;">🏷️</div>'}
    </div>
    <div class="cp-body">
      <div class="cp-code-wrap">
        <span class="cp-code">${d.code}</span>
        <button class="cp-copy" onclick="copyCoupon('${d.code}',this)">نسخ 📋</button>
      </div>
      <span class="cp-meta">${expires}</span>
    </div>
  </div>`;
}

// ===== BLOG =====
let _blogs = {};

async function loadBlog() {
  const grid = document.getElementById('blog-grid');
  const { data } = await sb.from('blogs').select('*').eq('status', 'published').order('created_at', { ascending: false });
  grid.innerHTML = data?.length ? data.map(blogCard).join('') : emptyHtml('📝', 'لا توجد مقالات بعد');
}

function blogCard(b) {
  const id = b.id || Math.random().toString(36).slice(2);
  b.id = id;
  _blogs[id] = b;
  const img = b.image
    ? `<img src="${b.image}" alt="${b.title}" style="width:100%;height:100%;object-fit:cover;" loading="lazy">`
    : '<div style="height:100%;background:var(--blue-light);display:flex;align-items:center;justify-content:center;font-size:44px;">📝</div>';
  return `<div class="blog-card" onclick="showArticle('${id}')">
    <div class="blog-img">${img}</div>
    <div class="blog-body">
      <div class="blog-cat">${b.category || 'مقال'}</div>
      <div class="blog-title">${b.title}</div>
      <div class="blog-date">${new Date(b.created_at).toLocaleDateString('ar-EG')}</div>
    </div>
  </div>`;
}

function showArticle(id) {
  const b = _blogs[id];
  if (!b) return;
  document.getElementById('article-content').innerHTML = `
    <button onclick="showPage('blog')" style="background:var(--blue-light);color:var(--blue);border:none;padding:8px 16px;border-radius:8px;font-family:'Cairo',sans-serif;font-weight:700;cursor:pointer;margin-bottom:20px;">← رجوع للمدونة</button>
    <h1 style="font-size:22px;font-weight:900;margin-bottom:8px;line-height:1.4;">${b.title}</h1>
    <p style="color:var(--gray-400);font-size:13px;margin-bottom:16px;">${new Date(b.created_at).toLocaleDateString('ar-EG')}</p>
    ${b.image ? `<img src="${b.image}" alt="${b.title}" style="width:100%;border-radius:12px;margin-bottom:20px;">` : ''}
    <div style="font-size:15px;line-height:1.9;color:var(--gray-600);">${b.content || ''}</div>`;
  showPage('article');
}

// ===== CONTACT FORM =====
async function sendMsg() {
  const name    = document.getElementById('msg-name').value.trim();
  const contact = document.getElementById('msg-contact').value.trim();
  const subject = document.getElementById('msg-subject').value;
  const body    = document.getElementById('msg-body').value.trim();
  if (!name || !body) { toast('⚠️ من فضلك اكتب اسمك ورسالتك'); return; }
  const { error } = await sb.from('messages').insert([{ name, contact, subject, message: body }]);
  if (error) { toast('❌ خطأ في الإرسال'); return; }
  toast('✅ تم إرسال رسالتك بنجاح!');
  document.getElementById('msg-name').value    = '';
  document.getElementById('msg-contact').value = '';
  document.getElementById('msg-body').value    = '';
}
