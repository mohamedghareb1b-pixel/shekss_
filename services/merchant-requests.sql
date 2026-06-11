-- ============================================================
-- SHEKSS — MERCHANT REQUESTS: Migration
-- services/merchant-requests.sql
-- ============================================================
-- Run AFTER deals-db.sql. Safe to run multiple times.
-- Adds: reject_reason, edit/delete requests, views, clicks,
--       updated_at — plus indexes and RLS policies.
-- ============================================================

-- ── 1. Add new columns to deals ──────────────────────────────
ALTER TABLE public.deals
  ADD COLUMN IF NOT EXISTS reject_reason         text,
  ADD COLUMN IF NOT EXISTS edit_request_status   text
    CHECK (edit_request_status IN ('pending','approved','rejected')),
  ADD COLUMN IF NOT EXISTS edit_request_data     jsonb,
  ADD COLUMN IF NOT EXISTS delete_request_status text
    CHECK (delete_request_status IN ('pending','approved')),
  ADD COLUMN IF NOT EXISTS views                 integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS clicks                integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS updated_at            timestamptz NOT NULL DEFAULT now();

-- ── 2. Indexes ────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_deals_edit_request
  ON public.deals(edit_request_status)
  WHERE edit_request_status IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_deals_delete_request
  ON public.deals(delete_request_status)
  WHERE delete_request_status IS NOT NULL;

-- ── 3. updated_at trigger ─────────────────────────────────────
CREATE OR REPLACE FUNCTION public.set_deals_updated_at()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_deals_updated_at ON public.deals;
CREATE TRIGGER trg_deals_updated_at
  BEFORE UPDATE ON public.deals
  FOR EACH ROW EXECUTE PROCEDURE public.set_deals_updated_at();

-- ── 4. RLS: merchants can submit edit/delete requests ─────────
-- (They UPDATE only their own approved deals with request fields)
DROP POLICY IF EXISTS "Merchants can request edit" ON public.deals;
CREATE POLICY "Merchants can request edit"
  ON public.deals FOR UPDATE
  USING (auth.uid() = merchant_id)
  WITH CHECK (
    auth.uid() = merchant_id
    AND (
      -- allow setting edit request on approved deals
      (edit_request_status = 'pending' AND approval_status = 'approved')
      -- allow setting delete request on approved deals
      OR (delete_request_status = 'pending' AND approval_status = 'approved')
      -- allow updating pending_approval deals (from deals-db.sql policy)
      OR approval_status = 'pending_approval'
    )
  );

-- ── 5. Verify ─────────────────────────────────────────────────
-- SELECT column_name, data_type, column_default
-- FROM information_schema.columns
-- WHERE table_name = 'deals'
-- ORDER BY ordinal_position;
