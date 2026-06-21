/**
 * ============================================================
 * SHEKSS — DYNAMIC SITEMAP GENERATOR
 * scripts/sitemap-generator.js (Node.js script — run separately)
 * ============================================================
 * Programmatic SEO: generates sitemap entries for every
 * approved store page and active deal page from Supabase.
 *
 * Usage:
 *   node scripts/sitemap-generator.js > sitemap-dynamic.xml
 *
 * Recommended: run daily via cron job or Supabase Edge Function,
 * then upload sitemap-dynamic.xml to the site root and reference
 * it from a sitemap index file (sitemap.xml).
 *
 * Requires: npm install @supabase/supabase-js
 * ============================================================
 */

const { createClient } = require('@supabase/supabase-js');

// Use environment variables in production — never hardcode keys
const SUPABASE_URL = process.env.SUPABASE_URL || 'https://your-project.supabase.co';
const SUPABASE_KEY = process.env.SUPABASE_ANON_KEY || 'your-anon-key';
const SITE = 'https://www.shekss.com';

const sb = createClient(SUPABASE_URL, SUPABASE_KEY);

async function generateSitemap() {
  const urls = [];

  // ── Store pages ──
  const { data: stores } = await sb
    .from('profiles')
    .select('business_slug, created_at')
    .eq('role', 'merchant')
    .eq('approval_status', 'approved')
    .not('business_slug', 'is', null);

  (stores || []).forEach(s => {
    urls.push({
      loc: `${SITE}/?p=store&slug=${s.business_slug}`,
      lastmod: s.created_at?.split('T')[0],
      changefreq: 'weekly',
      priority: '0.7',
    });
  });

  // ── Deal pages ──
  const { data: deals } = await sb
    .from('deals')
    .select('id, created_at, status')
    .eq('approval_status', 'approved')
    .neq('status', 'expired');

  (deals || []).forEach(d => {
    urls.push({
      loc: `${SITE}/?p=deal&id=${d.id}`,
      lastmod: d.created_at?.split('T')[0],
      changefreq: 'daily',
      priority: '0.6',
    });
  });

  // ── Build XML ──
  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls.map(u => `  <url>
    <loc>${u.loc}</loc>
    ${u.lastmod ? `<lastmod>${u.lastmod}</lastmod>` : ''}
    <changefreq>${u.changefreq}</changefreq>
    <priority>${u.priority}</priority>
  </url>`).join('\n')}
</urlset>`;

  console.log(xml);
}

generateSitemap().catch(err => {
  console.error('Sitemap generation failed:', err.message);
  process.exit(1);
});
