-- ============================================================
-- SHEKSS — ADMIN SYSTEM: Migration
-- services/admin.sql
-- ============================================================
-- Run AFTER merchant-requests.sql. Safe to run multiple times.
-- ============================================================

-- ── 1. profiles: add status column ───────────────────────────
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS status text NOT NULL DEFAULT 'active'
    CHECK (status IN ('active','suspended','deleted'));

-- ── 2. complaints table ───────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.complaints (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  user_type   text NOT NULL DEFAULT 'customer'
                CHECK (user_type IN ('customer','merchant')),
  subject     text NOT NULL,
  body        text NOT NULL,
  status      text NOT NULL DEFAULT 'open'
                CHECK (status IN ('open','resolved','closed')),
  admin_note  text,
  created_at  timestamptz NOT NULL DEFAULT now(),
  updated_at  timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_complaints_status
  ON public.complaints(status);

CREATE INDEX IF NOT EXISTS idx_complaints_user_id
  ON public.complaints(user_id);

-- updated_at trigger for complaints
CREATE OR REPLACE FUNCTION public.set_complaints_updated_at()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END;
$$;

DROP TRIGGER IF EXISTS trg_complaints_updated_at ON public.complaints;
CREATE TRIGGER trg_complaints_updated_at
  BEFORE UPDATE ON public.complaints
  FOR EACH ROW EXECUTE PROCEDURE public.set_complaints_updated_at();

-- ── 3. RLS: complaints ────────────────────────────────────────
ALTER TABLE public.complaints ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can submit complaints" ON public.complaints;
CREATE POLICY "Users can submit complaints"
  ON public.complaints FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can read own complaints" ON public.complaints;
CREATE POLICY "Users can read own complaints"
  ON public.complaints FOR SELECT
  USING (auth.uid() = user_id);

-- ── 4. Admin RLS helper function ─────────────────────────────
-- Returns true if current user has role='admin' in profiles
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS boolean LANGUAGE sql SECURITY DEFINER AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid() AND role = 'admin'
  );
$$;

-- ── 5. Admin can read/write ALL deals ────────────────────────
DROP POLICY IF EXISTS "Admin full access to deals" ON public.deals;
CREATE POLICY "Admin full access to deals"
  ON public.deals
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

-- ── 6. Admin can read/write ALL profiles ─────────────────────
DROP POLICY IF EXISTS "Admin full access to profiles" ON public.profiles;
CREATE POLICY "Admin full access to profiles"
  ON public.profiles
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

-- ── 7. Admin can read/write ALL messages ─────────────────────
DROP POLICY IF EXISTS "Admin full access to messages" ON public.messages;
CREATE POLICY "Admin full access to messages"
  ON public.messages
  USING (public.is_admin());

-- ── 8. Admin can read/write ALL complaints ───────────────────
DROP POLICY IF EXISTS "Admin full access to complaints" ON public.complaints;
CREATE POLICY "Admin full access to complaints"
  ON public.complaints
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

-- ── 9. Useful indexes for admin queries ──────────────────────
CREATE INDEX IF NOT EXISTS idx_deals_pending_approval
  ON public.deals(approval_status)
  WHERE approval_status = 'pending_approval';

CREATE INDEX IF NOT EXISTS idx_profiles_role
  ON public.profiles(role);

CREATE INDEX IF NOT EXISTS idx_profiles_status
  ON public.profiles(status);

-- ── 10. Promote first admin (run manually, replace email) ─────
-- UPDATE public.profiles
--   SET role = 'admin'
--   WHERE id = (SELECT id FROM auth.users WHERE email = 'your@email.com');

-- ============================================================
-- DONE. Verify:
--   SELECT id, role, status FROM public.profiles;
-- ============================================================
