/**
 * ============================================================
 * SHEKSS — SEO SERVICE
 * services/seo.js
 * ============================================================
 * Manages dynamic SEO: title, meta description, canonical,
 * Open Graph, and JSON-LD schema updates per page.
 * ============================================================
 */

const PAGE_TITLES = {
  home:                 'شيكس — أفضل العروض والخصومات في مصر',
  deals:                'عروض وخصومات يومية | شيكس',
  expired:              'عروض منتهية — أرشيف الخصومات في مصر | شيكس',
  coupons:              'كوبونات خصم حصرية | شيكس',
  blog:                 'مدونة التوفير | شيكس',
  contact:              'تواصل معنا | شيكس',
  about:                'من نحن | شيكس',
  faq:                  'الأسئلة الشائعة | شيكس',
  login:                'تسجيل الدخول | شيكس',
  'merchant-dashboard': 'لوحة التحكم | شيكس للتجار',
  'admin-dashboard':    'لوحة الإدارة | شيكس Admin',
  'profile':            'ملفي الشخصي | شيكس',
};

const PAGE_DESC = {
  home:                 'شيكس منصة عروض وخصومات حصرية في مصر. وفّر فلوسك مع أحدث الخصومات أونلاين وقريب منك — محدّثة يومياً.',
  deals:                'تصفح أحدث العروض والخصومات في مصر — إلكترونيات، ملابس، مطاعم، وأكتر. محدّثة يومياً على شيكس.',
  expired:              'أرشيف العروض والخصومات المنتهية في مصر — إلكترونيات، ملابس، مطاعم. مرجع للأسعار والتخفيضات السابقة على شيكس.',
  coupons:              'كوبونات خصم حصرية لأشهر المتاجر في مصر. انسخ الكود واستخدمه فوراً.',
  blog:                 'مقالات ونصايح توفير وتسوق ذكي في مصر من شيكس.',
  contact:              'تواصل مع فريق شيكس لأي استفسار أو شراكة.',
  about:                'تعرف على شيكس — منصة العروض والخصومات الحصرية في مصر. قصتنا، رؤيتنا، وفريقنا.',
  faq:                  'إجابات على أكتر الأسئلة الشائعة عن شيكس، العروض، والكوبونات.',
  login:                'سجّل دخولك على شيكس للاستفادة من العروض الحصرية والمميزات الإضافية.',
  'merchant-dashboard': 'لوحة تحكم التاجر على شيكس — أدر عروضك وتابع أداءك.',
  'admin-dashboard':    'لوحة إدارة شيكس — مراجعة العروض وإدارة التجار والرسائل.',
  'profile':            'ملفك الشخصي على شيكس — بياناتك وحسابك.',
};

const PAGE_URLS = {
  home:                 'https://shekss.com/',
  deals:                'https://shekss.com/?p=deals',
  expired:              'https://shekss.com/?p=expired-deals',
  coupons:              'https://shekss.com/?p=coupons',
  blog:                 'https://shekss.com/?p=blog',
  contact:              'https://shekss.com/?p=contact',
  about:                'https://shekss.com/?p=about',
  faq:                  'https://shekss.com/?p=faq',
  login:                'https://shekss.com/?p=login',
  'merchant-dashboard': 'https://shekss.com/?p=merchant-dashboard',
  'admin-dashboard':    'https://shekss.com/?p=admin-dashboard',
  'profile':            'https://shekss.com/?p=profile',
};

const PAGE_SCHEMAS = {
  home: {
    "@context": "https://schema.org", "@type": "WebPage",
    "name": "شيكس — أفضل العروض والخصومات في مصر",
    "url": "https://shekss.com",
    "description": "منصة عروض وخصومات حصرية في مصر — أونلاين وقريب منك",
    "inLanguage": "ar", "isPartOf": { "@type": "WebSite", "url": "https://shekss.com", "name": "شيكس" }
  },
  deals: {
    "@context": "https://schema.org", "@type": "CollectionPage",
    "name": "عروض وخصومات يومية | شيكس",
    "url": "https://shekss.com/?p=deals",
    "description": "تصفح أحدث العروض والخصومات في مصر — إلكترونيات، ملابس، مطاعم، وأكتر. محدّثة يومياً.",
    "inLanguage": "ar",
    "breadcrumb": { "@type": "BreadcrumbList", "itemListElement": [
      { "@type": "ListItem", "position": 1, "name": "الرئيسية", "item": "https://shekss.com" },
      { "@type": "ListItem", "position": 2, "name": "العروض", "item": "https://shekss.com/?p=deals" }
    ]}
  },
  expired: {
    "@context": "https://schema.org", "@type": "CollectionPage",
    "name": "عروض منتهية — أرشيف الخصومات في مصر | شيكس",
    "url": "https://shekss.com/?p=expired-deals",
    "description": "أرشيف العروض والخصومات المنتهية في مصر — مرجع للأسعار والتخفيضات السابقة.",
    "inLanguage": "ar",
    "breadcrumb": { "@type": "BreadcrumbList", "itemListElement": [
      { "@type": "ListItem", "position": 1, "name": "الرئيسية", "item": "https://shekss.com" },
      { "@type": "ListItem", "position": 2, "name": "عروض منتهية", "item": "https://shekss.com/?p=expired-deals" }
    ]}
  },
  coupons: {
    "@context": "https://schema.org", "@type": "CollectionPage",
    "name": "كوبونات خصم حصرية | شيكس",
    "url": "https://shekss.com/?p=coupons",
    "description": "كوبونات خصم حصرية لأشهر المتاجر في مصر. انسخ الكود واستخدمه فوراً.",
    "inLanguage": "ar",
    "breadcrumb": { "@type": "BreadcrumbList", "itemListElement": [
      { "@type": "ListItem", "position": 1, "name": "الرئيسية", "item": "https://shekss.com" },
      { "@type": "ListItem", "position": 2, "name": "كوبونات", "item": "https://shekss.com/?p=coupons" }
    ]}
  },
  blog: {
    "@context": "https://schema.org", "@type": "Blog",
    "name": "مدونة التوفير | شيكس",
    "url": "https://shekss.com/?p=blog",
    "description": "مقالات ونصايح توفير وتسوق ذكي في مصر.",
    "inLanguage": "ar",
    "breadcrumb": { "@type": "BreadcrumbList", "itemListElement": [
      { "@type": "ListItem", "position": 1, "name": "الرئيسية", "item": "https://shekss.com" },
      { "@type": "ListItem", "position": 2, "name": "المدونة", "item": "https://shekss.com/?p=blog" }
    ]}
  },
  contact: {
    "@context": "https://schema.org", "@type": "ContactPage",
    "name": "تواصل معنا | شيكس",
    "url": "https://shekss.com/?p=contact",
    "description": "تواصل مع فريق شيكس لأي استفسار أو شراكة.",
    "inLanguage": "ar"
  },
  about: {
    "@context": "https://schema.org", "@type": "AboutPage",
    "name": "من نحن | شيكس",
    "url": "https://shekss.com/?p=about",
    "description": "تعرف على شيكس — منصة العروض والخصومات الحصرية في مصر.",
    "inLanguage": "ar"
  },
  faq: {
    "@context": "https://schema.org", "@type": "FAQPage",
    "name": "الأسئلة الشائعة | شيكس",
    "url": "https://shekss.com/?p=faq",
    "description": "إجابات على أكتر الأسئلة الشائعة عن شيكس، العروض، والكوبونات.",
    "inLanguage": "ar"
  },
};

// ===== URL SLUG MAP =====
// Maps internal page IDs → URL query strings.
// 'article' is intentionally excluded — it's a blog sub-view, not a standalone URL.
const PAGE_SLUG_MAP = {
  home:                 '',
  deals:                'deals',
  expired:              'expired-deals',
  coupons:              'coupons',
  blog:                 'blog',
  contact:              'contact',
  about:                'about',
  faq:                  'faq',
  login:                'login',
  'merchant-dashboard': 'merchant-dashboard',
  'admin-dashboard':    'admin-dashboard',
  'profile':            'profile',
};

// ===== REVERSE SLUG MAP (for URL routing) =====
const URL_PAGE_MAP = {
  'deals':               'deals',
  'expired-deals':       'expired',
  'coupons':             'coupons',
  'blog':                'blog',
  'contact':             'contact',
  'about':               'about',
  'faq':                 'faq',
  'login':               'login',
  'merchant-dashboard':  'merchant-dashboard',
  'admin-dashboard':    'admin-dashboard',
  'profile':            'profile',
};

/**
 * Update all SEO meta tags and schema for a given page.
 * Called every time showPage() switches the active page.
 */
function updateSEO(page) {
  const title = PAGE_TITLES[page] || PAGE_TITLES.home;
  const desc  = PAGE_DESC[page]   || PAGE_DESC.home;
  const url   = PAGE_URLS[page]   || PAGE_URLS.home;

  // 1. Document title
  document.title = title;

  // 2. Meta description
  const metaDesc = document.querySelector('meta[name="description"]');
  if (metaDesc) metaDesc.setAttribute('content', desc);

  // 3. Canonical
  const canonical = document.getElementById('canonical-tag');
  if (canonical) canonical.setAttribute('href', url);

  // 4. Open Graph
  const ogUrl   = document.getElementById('og-url');
  const ogTitle = document.getElementById('og-title');
  const ogDesc  = document.getElementById('og-desc');
  if (ogUrl)   ogUrl.setAttribute('content', url);
  if (ogTitle) ogTitle.setAttribute('content', title);
  if (ogDesc)  ogDesc.setAttribute('content', desc);

  // 5. Dynamic JSON-LD schema
  const schemaSlot = document.getElementById('dynamic-schema');
  if (schemaSlot && PAGE_SCHEMAS[page]) {
    schemaSlot.textContent = JSON.stringify(PAGE_SCHEMAS[page]);
  }

  // BUG-B fix: skip pushState for 'article' — it's a sub-view of blog,
  // not a standalone URL. Pushing '/' would overwrite the home entry.
  if (page === 'article') return;

  const slug    = PAGE_SLUG_MAP[page] !== undefined ? PAGE_SLUG_MAP[page] : page;
  const newUrl  = slug ? '/?p=' + slug : '/';
  if (window.history && window.history.pushState) {
    window.history.pushState({ page }, title, newUrl);
  }
}
