-- ============================================================
-- SHEKSS — Phase 5.2.1: Merchant Approval Hardening
-- services/phase-5.2.1.sql
-- Run in Supabase SQL Editor (safe to run multiple times)
-- ============================================================

-- ── 1. Update handle_new_user trigger ────────────────────────
-- customer → approval_status = 'approved'  (no review needed)
-- merchant → approval_status = 'pending'   (needs admin review)
-- admin    → approval_status = 'approved'  (managed manually)

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  v_role           text;
  v_approval_status text;
BEGIN
  v_role := COALESCE(new.raw_user_meta_data->>'role', 'customer');

  -- Set approval_status based on role
  IF v_role = 'merchant' THEN
    v_approval_status := 'pending';
  ELSE
    v_approval_status := 'approved';
  END IF;

  INSERT INTO public.profiles (id, full_name, role, status, approval_status)
  VALUES (
    new.id,
    COALESCE(new.raw_user_meta_data->>'full_name', new.raw_user_meta_data->>'name', ''),
    v_role,
    'active',
    v_approval_status
  )
  ON CONFLICT (id) DO NOTHING;

  RETURN new;
END;
$$;

-- Recreate trigger (function already replaced above)
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user();

-- ── 2. Fix existing customers who got stuck in 'pending' ─────
UPDATE public.profiles
  SET approval_status = 'approved'
  WHERE role IN ('customer', 'admin')
    AND approval_status = 'pending';

-- ── 3. Ensure rejection_reason is nullable ────────────────────
ALTER TABLE public.profiles
  ALTER COLUMN rejection_reason DROP NOT NULL;

-- ── DONE ✅ ───────────────────────────────────────────────────
