-- ============================================================
-- SHEKSS — Phase 5.3: Merchant Business Profile
-- services/merchant-profile.sql
-- Run in Supabase SQL Editor (safe to run multiple times)
-- ============================================================

-- ── 1. Add new columns to profiles ───────────────────────────
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS business_name        text,
  ADD COLUMN IF NOT EXISTS business_logo        text,
  ADD COLUMN IF NOT EXISTS whatsapp             text,
  ADD COLUMN IF NOT EXISTS address              text,
  ADD COLUMN IF NOT EXISTS working_hours        text,
  ADD COLUMN IF NOT EXISTS business_slug        text;

-- ── 2. Unique index on business_slug (for future store pages) ─
CREATE UNIQUE INDEX IF NOT EXISTS idx_profiles_business_slug
  ON public.profiles(business_slug)
  WHERE business_slug IS NOT NULL;

-- ── 3. Storage bucket: merchant-assets ───────────────────────
-- Run this if bucket doesn't exist yet:
-- INSERT INTO storage.buckets (id, name, public)
-- VALUES ('merchant-assets', 'merchant-assets', true)
-- ON CONFLICT (id) DO NOTHING;

-- ── 4. Storage policies ───────────────────────────────────────
DROP POLICY IF EXISTS "Merchants can upload assets" ON storage.objects;
CREATE POLICY "Merchants can upload assets"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (
    bucket_id = 'merchant-assets'
    AND name LIKE 'logos/%'
  );

DROP POLICY IF EXISTS "Public can read merchant assets" ON storage.objects;
CREATE POLICY "Public can read merchant assets"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'merchant-assets');

DROP POLICY IF EXISTS "Merchants can update own assets" ON storage.objects;
CREATE POLICY "Merchants can update own assets"
  ON storage.objects FOR UPDATE
  TO authenticated
  USING (
    bucket_id = 'merchant-assets'
    AND name LIKE 'logos/%'
  );

-- ── 5. Backfill business_name from company_name ───────────────
UPDATE public.profiles
  SET business_name = company_name
  WHERE business_name IS NULL
    AND company_name IS NOT NULL;

-- ── 6. Generate slugs for existing merchants ──────────────────
-- Slug = lowercase, spaces→hyphens, remove non-alphanum
UPDATE public.profiles
  SET business_slug = LOWER(
    REGEXP_REPLACE(
      REGEXP_REPLACE(business_name, '[^a-zA-Z0-9\u0600-\u06FF\s-]', '', 'g'),
      '\s+', '-', 'g'
    )
  )
  WHERE business_slug IS NULL
    AND business_name IS NOT NULL;

-- ── DONE ✅ ───────────────────────────────────────────────────
-- Also create 'merchant-assets' bucket manually in:
-- Supabase Dashboard → Storage → New Bucket
--   Name: merchant-assets
--   Public: ✅ ON
-- ============================================================
