-- ============================================================
-- SHEKSS — DEALS TABLE: Full Schema + Storage Policies
-- services/deals-db.sql
-- ============================================================
-- Run this in Supabase SQL Editor.
-- Safe to run multiple times (uses IF NOT EXISTS / ALTER … ADD COLUMN IF NOT EXISTS).
-- ============================================================

-- ── 1. Add merchant columns to existing deals table ──────────
ALTER TABLE public.deals
  ADD COLUMN IF NOT EXISTS merchant_id     uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS details         text,
  ADD COLUMN IF NOT EXISTS main_image      text,
  ADD COLUMN IF NOT EXISTS second_image    text,
  ADD COLUMN IF NOT EXISTS old_price       numeric(10,2),
  ADD COLUMN IF NOT EXISTS new_price       numeric(10,2),
  ADD COLUMN IF NOT EXISTS discount_percent numeric(5,2),
  ADD COLUMN IF NOT EXISTS company_name    text,
  ADD COLUMN IF NOT EXISTS coupon_code     text DEFAULT 'شيكس',
  ADD COLUMN IF NOT EXISTS location_link   text,
  ADD COLUMN IF NOT EXISTS approval_status text NOT NULL DEFAULT 'pending_approval'
                             CHECK (approval_status IN
                               ('pending_approval','approved','rejected')),
  ADD COLUMN IF NOT EXISTS rejection_reason text,
  ADD COLUMN IF NOT EXISTS subcategory     text,
  ADD COLUMN IF NOT EXISTS expires_at      timestamptz;

-- ── 2. Indexes for common queries ────────────────────────────
CREATE INDEX IF NOT EXISTS idx_deals_merchant_id
  ON public.deals(merchant_id);

CREATE INDEX IF NOT EXISTS idx_deals_approval_status
  ON public.deals(approval_status);

CREATE INDEX IF NOT EXISTS idx_deals_expires_at
  ON public.deals(expires_at)
  WHERE expires_at IS NOT NULL;

-- ── 3. Row Level Security ─────────────────────────────────────
ALTER TABLE public.deals ENABLE ROW LEVEL SECURITY;

-- Public: anyone (anon + authenticated) can read approved, non-expired deals
DROP POLICY IF EXISTS "Public can read approved deals" ON public.deals;
CREATE POLICY "Public can read approved deals"
  ON public.deals FOR SELECT
  TO anon, authenticated
  USING (approval_status = 'approved' AND status != 'expired');

-- Merchants: can read all their own deals (any status)
DROP POLICY IF EXISTS "Merchants can read own deals" ON public.deals;
CREATE POLICY "Merchants can read own deals"
  ON public.deals FOR SELECT
  USING (auth.uid() = merchant_id);

-- Merchants: can insert their own deals (always pending_approval)
DROP POLICY IF EXISTS "Merchants can insert own deals" ON public.deals;
CREATE POLICY "Merchants can insert own deals"
  ON public.deals FOR INSERT
  WITH CHECK (
    auth.uid() = merchant_id
    AND approval_status = 'pending_approval'
  );

-- Merchants: can update their own deals ONLY if still pending
DROP POLICY IF EXISTS "Merchants can update pending deals" ON public.deals;
CREATE POLICY "Merchants can update pending deals"
  ON public.deals FOR UPDATE
  USING (auth.uid() = merchant_id AND approval_status = 'pending_approval')
  WITH CHECK (auth.uid() = merchant_id);

-- Merchants: can delete their own pending deals
DROP POLICY IF EXISTS "Merchants can delete pending deals" ON public.deals;
CREATE POLICY "Merchants can delete pending deals"
  ON public.deals FOR DELETE
  USING (auth.uid() = merchant_id AND approval_status = 'pending_approval');

-- ── 4. Auto-expire trigger ────────────────────────────────────
-- Runs whenever a deal is updated; if expires_at has passed → status = 'expired'
CREATE OR REPLACE FUNCTION public.auto_expire_deal()
RETURNS trigger LANGUAGE plpgsql
AS $$
BEGIN
  IF NEW.expires_at IS NOT NULL AND NEW.expires_at < now() AND NEW.status != 'expired' THEN
    NEW.status := 'expired';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_auto_expire_deal ON public.deals;
CREATE TRIGGER trg_auto_expire_deal
  BEFORE INSERT OR UPDATE ON public.deals
  FOR EACH ROW EXECUTE PROCEDURE public.auto_expire_deal();

-- ── 5. Storage bucket for deal images ────────────────────────
-- Run these in Supabase Dashboard → Storage → New Bucket
-- OR via SQL (requires pg_storage extension):
--
--   INSERT INTO storage.buckets (id, name, public)
--   VALUES ('deals', 'deals', true)
--   ON CONFLICT (id) DO NOTHING;
--
-- Then add storage policies:

-- Allow authenticated merchants to upload to deals/merchant-uploads/*
DROP POLICY IF EXISTS "Merchants can upload deal images" ON storage.objects;
CREATE POLICY "Merchants can upload deal images"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (
    bucket_id = 'deals'
    AND name LIKE 'merchant-uploads/%'
  );

-- Allow public read of all deal images
DROP POLICY IF EXISTS "Public can read deal images" ON storage.objects;
CREATE POLICY "Public can read deal images"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'deals');

-- Allow merchants to delete their own uploaded images
DROP POLICY IF EXISTS "Merchants can delete own images" ON storage.objects;
CREATE POLICY "Merchants can delete own images"
  ON storage.objects FOR DELETE
  TO authenticated
  USING (
    bucket_id = 'deals'
    AND name LIKE 'merchant-uploads/%'
    AND (storage.foldername(name))[2] = auth.uid()::text
  );

-- ── 6. Add location_link to profiles table ───────────────────
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS location_link  text,
  ADD COLUMN IF NOT EXISTS company_name   text,
  ADD COLUMN IF NOT EXISTS phone          text;

-- ============================================================
-- DONE. Verify with:
--   SELECT column_name, data_type FROM information_schema.columns
--   WHERE table_name = 'deals' ORDER BY ordinal_position;
-- ============================================================
