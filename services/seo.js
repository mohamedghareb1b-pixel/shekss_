/**
 * ============================================================
 * SHEKSS — SEO / GEO / AEO / SXO SERVICE
 * services/seo.js
 * ============================================================
 * Standards:
 *   SEO  — Google Search
 *   GEO  — Generative Engine Optimization (ChatGPT, Perplexity, Gemini)
 *   AEO  — Answer Engine Optimization (Featured Snippets, Voice)
 *   SXO  — Search Experience Optimization
 *   E-E-A-T — Experience, Expertise, Authoritativeness, Trustworthiness
 *   Programmatic SEO — Auto-generated pages from data
 * Domain: https://www.shekss.com
 * ============================================================
 */

const SITE = 'https://www.shekss.com';
const SITE_NAME = 'شيكس';
const SITE_NAME_EN = 'Shekss';
const SITE_LOGO = `${SITE}/logo.png`;

// ============================================================
// PAGE TITLES — Primary keyword in title, 50-60 chars
// ============================================================
const PAGE_TITLES = {
  home:    'شيكس | عروض وخصومات يومية في مصر — أونلاين وقريب منك',
  deals:   'أحدث العروض والخصومات في مصر 2025 | شيكس',
  expired: 'أرشيف العروض المنتهية في مصر | شيكس',
  coupons: 'كوبونات خصم حصرية لأشهر المتاجر المصرية | شيكس',
  blog:    'مدونة التوفير والتسوق الذكي في مصر | شيكس',
  contact: 'تواصل معنا | شيكس للعروض والخصومات',
  about:   'من نحن — قصة شيكس | منصة العروض الأولى في مصر',
  faq:     'أسئلة شائعة عن العروض والكوبونات | شيكس',
  login:   'تسجيل الدخول | شيكس',
  'merchant-dashboard': 'لوحة التاجر | شيكس',
  'admin-dashboard':    'لوحة الإدارة | شيكس',
  'profile':            'ملفي الشخصي | شيكس',
  'store':              'صفحة المتجر | شيكس',
  'deal':               'تفاصيل العرض | شيكس',
};

// ============================================================
// PAGE DESCRIPTIONS — 150-160 chars, answer-first for AEO
// ============================================================
const PAGE_DESC = {
  home:    'وفّر فلوسك يومياً مع شيكس — أكبر منصة عروض وخصومات في مصر. عروض أونلاين، كوبونات حصرية، ومحلات قريبة منك. محدّثة كل يوم.',
  deals:   'تصفح أحدث عروض وخصومات مصر لـ 2025: إلكترونيات، ملابس، مطاعم، موبايلات وأكتر. وفّر حتى 70% مع شيكس — مجاناً وبدون تسجيل.',
  expired: 'أرشيف كامل للعروض والخصومات المنتهية في مصر. مرجع مفيد لمتابعة أسعار المنتجات وتاريخ التخفيضات — شيكس.',
  coupons: 'اكسب خصومات إضافية مع كوبونات شيكس الحصرية. أكواد خصم فعّالة لـ Noon، Amazon مصر، Jumia، SHEIN، وأشهر المتاجر المصرية.',
  blog:    'نصايح توفير، مقارنات أسعار، وإرشادات تسوق ذكي في مصر. مقالات من خبراء شيكس لمساعدتك تكسب أكتر وتصرف أقل.',
  contact: 'تواصل مع فريق شيكس — نرد خلال 24 ساعة. للشراكة التجارية، الدعم الفني، أو أي استفسار عن العروض والكوبونات.',
  about:   'شيكس منصة مصرية متخصصة في عروض وخصومات يومية. نجمع أفضل الصفقات من مئات المتاجر لتوفير وقتك ومصاريفك.',
  faq:     'كل إجاباتك عن شيكس: كيف تستخدم الكوبونات، كيف تضيف عرضك، كيف تتواصل معنا، وأكتر من 20 سؤال شائع.',
  login:   'سجّل دخولك على شيكس للوصول لعروضك المفضلة وإدارة حسابك بسهولة.',
  'merchant-dashboard': 'إدارة عروضك وكوبوناتك على شيكس.',
  'admin-dashboard':    'لوحة إدارة شيكس.',
  'profile':            'ملفك الشخصي على شيكس.',
};

// ============================================================
// CANONICAL URLS — www الرسمي
// ============================================================
const PAGE_URLS = {
  home:    `${SITE}/`,
  deals:   `${SITE}/?p=deals`,
  expired: `${SITE}/?p=expired-deals`,
  coupons: `${SITE}/?p=coupons`,
  blog:    `${SITE}/?p=blog`,
  contact: `${SITE}/?p=contact`,
  about:   `${SITE}/?p=about`,
  faq:     `${SITE}/?p=faq`,
  login:   `${SITE}/?p=login`,
  'merchant-dashboard': `${SITE}/?p=merchant-dashboard`,
  'admin-dashboard':    `${SITE}/?p=admin-dashboard`,
  'profile':            `${SITE}/?p=profile`,
};

// ============================================================
// JSON-LD SCHEMAS — Full E-E-A-T Schemas per page
// ============================================================

// ── Shared breadcrumb helper ──
function _bc(items) {
  return {
    '@type': 'BreadcrumbList',
    itemListElement: items.map((item, i) => ({
      '@type': 'ListItem',
      position: i + 1,
      name: item.name,
      item: item.url,
    })),
  };
}

// ── Organization (shared across pages) ──
const ORG_SCHEMA = {
  '@context': 'https://schema.org',
  '@type': 'Organization',
  '@id': `${SITE}/#organization`,
  name: SITE_NAME,
  alternateName: SITE_NAME_EN,
  url: SITE,
  logo: {
    '@type': 'ImageObject',
    url: SITE_LOGO,
    width: 400,
    height: 400,
  },
  description: 'منصة مصرية متخصصة في عروض وخصومات يومية أونلاين وقريب منك',
  areaServed: { '@type': 'Country', name: 'Egypt' },
  knowsLanguage: 'ar',
  contactPoint: {
    '@type': 'ContactPoint',
    contactType: 'customer service',
    availableLanguage: 'Arabic',
    areaServed: 'EG',
  },
};

// ── WebSite with SearchAction ──
const WEBSITE_SCHEMA = {
  '@context': 'https://schema.org',
  '@type': 'WebSite',
  '@id': `${SITE}/#website`,
  name: SITE_NAME,
  alternateName: SITE_NAME_EN,
  url: SITE,
  inLanguage: 'ar',
  publisher: { '@id': `${SITE}/#organization` },
  potentialAction: {
    '@type': 'SearchAction',
    target: {
      '@type': 'EntryPoint',
      urlTemplate: `${SITE}/?p=deals&q={search_term_string}`,
    },
    'query-input': 'required name=search_term_string',
  },
};

const PAGE_SCHEMAS = {

  // ── HOME ──
  home: [{
    '@context': 'https://schema.org',
    '@type': 'WebPage',
    '@id': `${SITE}/#webpage`,
    name: PAGE_TITLES.home,
    url: PAGE_URLS.home,
    description: PAGE_DESC.home,
    inLanguage: 'ar',
    isPartOf: { '@id': `${SITE}/#website` },
    about: { '@id': `${SITE}/#organization` },
    // E-E-A-T: speakable for voice / AEO
    speakable: {
      '@type': 'SpeakableSpecification',
      cssSelector: ['.hero-title', '.hero-sub', '.stat-item'],
    },
  }, {
    '@context': 'https://schema.org',
    '@type': 'ItemList',
    name: 'أحدث العروض في مصر',
    description: 'قائمة بأحدث العروض والخصومات المتاحة في مصر',
    url: PAGE_URLS.home,
    numberOfItems: 0,  // updated dynamically
    itemListOrder: 'https://schema.org/ItemListOrderDescending',
  }],

  // ── DEALS ──
  deals: [{
    '@context': 'https://schema.org',
    '@type': 'CollectionPage',
    '@id': `${SITE}/?p=deals#webpage`,
    name: PAGE_TITLES.deals,
    url: PAGE_URLS.deals,
    description: PAGE_DESC.deals,
    inLanguage: 'ar',
    isPartOf: { '@id': `${SITE}/#website` },
    breadcrumb: _bc([
      { name: 'الرئيسية', url: SITE },
      { name: 'العروض', url: PAGE_URLS.deals },
    ]),
    // SXO: main entity is a list of offers
    mainEntity: {
      '@type': 'ItemList',
      name: 'عروض وخصومات مصر',
      description: 'أحدث العروض والخصومات المتاحة في مصر لعام 2025',
    },
  }],

  // ── COUPONS ──
  coupons: [{
    '@context': 'https://schema.org',
    '@type': 'CollectionPage',
    '@id': `${SITE}/?p=coupons#webpage`,
    name: PAGE_TITLES.coupons,
    url: PAGE_URLS.coupons,
    description: PAGE_DESC.coupons,
    inLanguage: 'ar',
    isPartOf: { '@id': `${SITE}/#website` },
    breadcrumb: _bc([
      { name: 'الرئيسية', url: SITE },
      { name: 'كوبونات', url: PAGE_URLS.coupons },
    ]),
  }],

  // ── BLOG ──
  blog: [{
    '@context': 'https://schema.org',
    '@type': 'Blog',
    '@id': `${SITE}/?p=blog#blog`,
    name: PAGE_TITLES.blog,
    url: PAGE_URLS.blog,
    description: PAGE_DESC.blog,
    inLanguage: 'ar',
    publisher: { '@id': `${SITE}/#organization` },
    breadcrumb: _bc([
      { name: 'الرئيسية', url: SITE },
      { name: 'المدونة', url: PAGE_URLS.blog },
    ]),
  }],

  // ── ABOUT — E-E-A-T critical ──
  about: [{
    '@context': 'https://schema.org',
    '@type': 'AboutPage',
    '@id': `${SITE}/?p=about#webpage`,
    name: PAGE_TITLES.about,
    url: PAGE_URLS.about,
    description: PAGE_DESC.about,
    inLanguage: 'ar',
    isPartOf: { '@id': `${SITE}/#website` },
    about: { '@id': `${SITE}/#organization` },
    // E-E-A-T: explicit trust signals
    mainEntity: {
      '@type': 'Organization',
      '@id': `${SITE}/#organization`,
      name: SITE_NAME,
      foundingDate: '2024',
      foundingLocation: { '@type': 'Place', addressCountry: 'EG', addressLocality: 'Cairo' },
      description: 'شيكس منصة مصرية متخصصة في تجميع ومراجعة أفضل العروض والخصومات اليومية في مصر',
      hasCredential: {
        '@type': 'EducationalOccupationalCredential',
        credentialCategory: 'منصة موثقة لعروض التجزئة في مصر',
      },
    },
  }],

  // ── FAQ — AEO Critical ──
  faq: [{
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    '@id': `${SITE}/?p=faq#webpage`,
    name: PAGE_TITLES.faq,
    url: PAGE_URLS.faq,
    description: PAGE_DESC.faq,
    inLanguage: 'ar',
    mainEntity: [
      {
        '@type': 'Question',
        name: 'إيه هو شيكس؟',
        acceptedAnswer: {
          '@type': 'Answer',
          text: 'شيكس منصة مصرية متخصصة في جمع أحسن العروض والخصومات من أشهر المتاجر الأونلاين والمحلات في كل أنحاء مصر. بتحدث العروض يومياً عشان تلاقي دايماً أحدث الخصومات في مكان واحد.',
        },
      },
      {
        '@type': 'Question',
        name: 'شيكس مجاني؟',
        acceptedAnswer: {
          '@type': 'Answer',
          text: 'أيوه، شيكس مجاني 100% للمستخدمين. مش محتاج تدفع أي حاجة عشان تستفيد من العروض والكوبونات المتاحة على المنصة.',
        },
      },
      {
        '@type': 'Question',
        name: 'إيه الفرق بين أونلاين وعروض المنطقة؟',
        acceptedAnswer: {
          '@type': 'Answer',
          text: 'العروض أونلاين هي خصومات من مواقع التسوق الإلكتروني زي Noon وAmazon وغيرها — تقدر تشتري منها من أي مكان في مصر. أما عروض المنطقة فهي عروض من مطاعم وكافيهات ومحلات قريبة منك في محافظتك.',
        },
      },
      {
        '@type': 'Question',
        name: 'ازاي أستخدم كوبون الخصم؟',
        acceptedAnswer: {
          '@type': 'Answer',
          text: 'اضغط على زر نسخ جنب الكود، ثم روح على موقع المتجر وهات المنتجات اللي عايزها. في خطوة الدفع هتلاقي خانة كود الخصم — الصق الكود هناك وهيتحسب الخصم أوتوماتيك.',
        },
      },
      {
        '@type': 'Question',
        name: 'العروض بتتحدث إمتى؟',
        acceptedAnswer: {
          '@type': 'Answer',
          text: 'بنضيف عروض جديدة يومياً ومنظمين نظام تلقائي لتحديث العروض المنتهية، مع متابعة المواسم المهمة زي رمضان والجمعة البيضاء.',
        },
      },
      {
        '@type': 'Question',
        name: 'لو عندي متجر وعايز أعرض عرضي على شيكس؟',
        acceptedAnswer: {
          '@type': 'Answer',
          text: 'تقدر تتواصل معنا من خلال صفحة تواصل معنا أو مباشرة على واتساب، وفريق شيكس هيراجع طلبك ويرد عليك في أسرع وقت.',
        },
      },
      {
        '@type': 'Question',
        name: 'إيه معنى عروض منتهية؟',
        acceptedAnswer: {
          '@type': 'Answer',
          text: 'العروض المنتهية هي خصومات وصلت تاريخ انتهاءها ومش متاحة دلوقتي. بنحتفظ بيها كأرشيف عشان تقدر تتابع الأسعار والخصومات السابقة وتعمل مقارنات.',
        },
      },
    ],
  }],

  // ── CONTACT ──
  contact: [{
    '@context': 'https://schema.org',
    '@type': 'ContactPage',
    name: PAGE_TITLES.contact,
    url: PAGE_URLS.contact,
    description: PAGE_DESC.contact,
    inLanguage: 'ar',
    mainEntity: { '@id': `${SITE}/#organization` },
  }],

  expired: [{
    '@context': 'https://schema.org',
    '@type': 'CollectionPage',
    name: PAGE_TITLES.expired,
    url: PAGE_URLS.expired,
    description: PAGE_DESC.expired,
    inLanguage: 'ar',
    breadcrumb: _bc([
      { name: 'الرئيسية', url: SITE },
      { name: 'عروض منتهية', url: PAGE_URLS.expired },
    ]),
  }],
};

// ============================================================
// URL MAPS
// ============================================================
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
  'store':              'store',
  'deal':               'deal',
};

const URL_PAGE_MAP = {
  'deals':              'deals',
  'expired-deals':      'expired',
  'coupons':            'coupons',
  'blog':               'blog',
  'contact':            'contact',
  'about':              'about',
  'faq':                'faq',
  'login':              'login',
  'merchant-dashboard': 'merchant-dashboard',
  'admin-dashboard':    'admin-dashboard',
  'profile':            'profile',
  'store':              'store',
  'deal':               'deal',
};

// ============================================================
// PROGRAMMATIC SEO HELPERS
// ============================================================

/**
 * Generate full SEO for a store page dynamically.
 * Called from store.js after merchant data is loaded.
 */
function updateStoreSEO(merchant, dealsCount) {
  const name  = merchant.business_name || merchant.company_name || '';
  const gov   = merchant.governorate || '';
  const cat   = merchant.business_category
    ? (CAT_LABELS[merchant.business_category] || merchant.business_category) : '';
  const slug  = merchant.business_slug || '';

  const title = `${name}${gov ? ' في ' + gov : ''} — عروض وخصومات | شيكس`;
  const desc  = `اكتشف ${dealsCount > 0 ? dealsCount + ' عرض من ' : 'عروض '}${name}${gov ? ' في ' + gov : ''}${cat ? ' — ' + cat : ''} على شيكس. خصومات حصرية ومحدّثة.`;
  const url   = `${SITE}/?p=store&slug=${slug}`;

  document.title = title;
  _setMeta('description', desc);
  _setCanonical(url);
  _setOG({ title, desc, url, image: merchant.business_logo || SITE_LOGO });

  // LocalBusiness Schema — E-E-A-T for store pages
  const schema = {
    '@context': 'https://schema.org',
    '@type': 'LocalBusiness',
    '@id': url + '#business',
    name,
    description: merchant.business_description || merchant.description || desc,
    url,
    image: merchant.business_logo || undefined,
    telephone: merchant.whatsapp || merchant.phone || undefined,
    address: merchant.governorate ? {
      '@type': 'PostalAddress',
      addressLocality: merchant.city || merchant.governorate,
      addressRegion: merchant.governorate,
      addressCountry: 'EG',
    } : undefined,
    geo: undefined,
    openingHours: merchant.working_hours || undefined,
    hasMap: merchant.location_link || undefined,
    // E-E-A-T: verified by Shekss
    memberOf: {
      '@type': 'Organization',
      name: SITE_NAME,
      url: SITE,
    },
    // AggregateOffer for deals
    makesOffer: dealsCount > 0 ? {
      '@type': 'AggregateOffer',
      offerCount: dealsCount,
      seller: { '@type': 'Organization', name },
    } : undefined,
  };

  // Remove undefined keys
  const cleanSchema = JSON.parse(JSON.stringify(schema));
  _setDynamicSchema([schema]);
}

/**
 * Generate full SEO for a deal page dynamically.
 * Called from deal-page.js after deal data is loaded.
 */
function updateDealSEO(deal, merchant) {
  const name    = deal.name || deal.title || '';
  const company = deal.company_name
    || merchant?.business_name || merchant?.company_name || SITE_NAME;
  const desc    = deal.description || `عرض ${name} من ${company} على شيكس — خصم حصري في مصر`;
  const url     = `${SITE}/?p=deal&id=${deal.id}`;
  const image   = deal.main_image || deal.image || SITE_LOGO;
  const price   = deal.new_price || deal.price;
  const oldPrice = deal.old_price;
  const discount = deal.discount_percent || deal.discount;

  const title = `${name}${discount ? ' — خصم ' + discount + '%' : ''} | ${company} | شيكس`;

  document.title = title;
  _setMeta('description', desc.substring(0, 155));
  _setCanonical(url);
  _setOG({ title, desc, url, image });

  // Product + Offer Schema — full E-E-A-T
  const schema = {
    '@context': 'https://schema.org',
    '@type': 'Product',
    '@id': url + '#product',
    name,
    description: desc,
    image: image ? [image] : undefined,
    brand: company ? {
      '@type': 'Brand',
      name: company,
    } : undefined,
    offers: {
      '@type': 'Offer',
      url,
      priceCurrency: 'EGP',
      price: price ? String(price) : undefined,
      priceValidUntil: deal.expires_at
        ? new Date(deal.expires_at).toISOString().split('T')[0] : undefined,
      availability: deal.status === 'expired'
        ? 'https://schema.org/Discontinued'
        : 'https://schema.org/InStock',
      seller: {
        '@type': 'Organization',
        name: company,
      },
      // Coupon code
      hasMerchantReturnPolicy: undefined,
    },
    // If discount
    additionalProperty: discount ? [{
      '@type': 'PropertyValue',
      name: 'نسبة الخصم',
      value: discount + '%',
    }] : undefined,
    // E-E-A-T: reviewed by Shekss
    review: {
      '@type': 'Review',
      reviewRating: { '@type': 'Rating', ratingValue: '5', bestRating: '5' },
      author: { '@type': 'Organization', name: SITE_NAME },
      reviewBody: `عرض موثق ومراجع من فريق ${SITE_NAME}`,
    },
  };

  // Coupon schema if has coupon code
  const schemas = [schema];
  if (deal.coupon_code) {
    schemas.push({
      '@context': 'https://schema.org',
      '@type': 'MoneyTransfer',
    });
  }

  _setDynamicSchema(schemas);
}

// ============================================================
// CORE updateSEO — called on every showPage()
// ============================================================
function updateSEO(page) {
  const title = PAGE_TITLES[page] || PAGE_TITLES.home;
  const desc  = PAGE_DESC[page]   || PAGE_DESC.home;
  const url   = PAGE_URLS[page]   || PAGE_URLS.home;

  document.title = title;
  _setMeta('description', desc);
  _setCanonical(url);
  _setOG({ title, desc, url });

  // Robots: noindex for private pages
  const noIndex = ['merchant-dashboard','admin-dashboard','profile','login'];
  _setMeta('robots', noIndex.includes(page) ? 'noindex, nofollow' : 'index, follow');

  // Schema
  const schemas = PAGE_SCHEMAS[page];
  if (schemas) {
    _setDynamicSchema(Array.isArray(schemas) ? schemas : [schemas]);
  }

  // URL pushState — skip pages with dynamic query params (deal, store)
  // since their URL is built by the caller (openDealPage, store links, etc.)
  // and must keep its id/slug. Re-pushing here would wipe that param.
  if (page === 'article' || page === 'deal' || page === 'store') return;
  const slug   = PAGE_SLUG_MAP[page] !== undefined ? PAGE_SLUG_MAP[page] : page;
  const newUrl = slug ? `/?p=${slug}` : '/';
  if (window.history?.pushState) {
    window.history.pushState({ page }, title, newUrl);
  }
}

// ============================================================
// DOM HELPERS
// ============================================================
function _setMeta(name, content) {
  const el = name === 'robots'
    ? document.querySelector(`meta[name="${name}"]`)
    : document.querySelector(`meta[name="${name}"]`);
  if (el) el.setAttribute('content', content);
}

function _setCanonical(url) {
  const el = document.getElementById('canonical-tag');
  if (el) el.setAttribute('href', url);
}

function _setOG({ title, desc, url, image }) {
  const set = (id, val) => {
    const el = document.getElementById(id);
    if (el && val) el.setAttribute('content', val);
  };
  set('og-url',   url);
  set('og-title', title);
  set('og-desc',  desc);
  if (image) set('og-image', image);

  // Twitter
  const tw = (prop, val) => {
    const el = document.querySelector(`meta[name="${prop}"]`);
    if (el && val) el.setAttribute('content', val);
  };
  tw('twitter:title',       title);
  tw('twitter:description', desc);
  if (image) tw('twitter:image', image);
}

function _setDynamicSchema(schemas) {
  const slot = document.getElementById('dynamic-schema');
  if (!slot) return;
  // Multiple schemas: use @graph
  if (schemas.length === 1) {
    slot.textContent = JSON.stringify(schemas[0]);
  } else {
    slot.textContent = JSON.stringify({
      '@context': 'https://schema.org',
      '@graph': schemas,
    });
  }
}
