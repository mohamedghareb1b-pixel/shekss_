-- ============================================================
-- SHEKSS — MERCHANT APPROVAL WORKFLOW
-- services/merchant-approval.sql
-- Run in Supabase SQL Editor (safe to run multiple times)
-- ============================================================

-- ── profiles: add approval columns ───────────────────────────
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS approval_status      text NOT NULL DEFAULT 'pending'
    CHECK (approval_status IN ('pending','approved','rejected')),
  ADD COLUMN IF NOT EXISTS rejection_reason     text,
  ADD COLUMN IF NOT EXISTS business_category    text,
  ADD COLUMN IF NOT EXISTS business_subcategory text;

-- ── Index for admin queries ───────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_profiles_approval
  ON public.profiles(approval_status)
  WHERE role = 'merchant';

-- ── Existing merchants: auto-approve (they were already active) ──
-- Only run this if you have existing merchants you want to keep active:
-- UPDATE public.profiles SET approval_status = 'approved'
-- WHERE role = 'merchant' AND approval_status = 'pending';

-- ── Admin: already has full access via is_admin() policy ─────
-- No extra policy needed — admin.sql covers this.

-- ============================================================
-- DONE ✅
-- ============================================================
