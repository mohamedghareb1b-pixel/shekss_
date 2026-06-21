/**
 * ============================================================
 * SHEKSS — SUPABASE SERVICE
 * services/supabase.js
 * ============================================================
 * Centralized Supabase client initialization.
 * All DB calls go through this singleton.
 * 
 * Future: Add auth session management here when implementing
 * Authentication system.
 * ============================================================
 */

const SUPABASE_URL = 'https://husczsxktqbqllbotbpg.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imh1c2N6c3hrdHFicWxsYm90YnBnIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODE5OTAyMTMsImV4cCI6MjA5NzU2NjIxM30.sJbIAD6h1FimWABwAcQHXOjsaMXZwq0raOraaO3Hg10';

const sb = supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

/**
 * Future auth helpers — scaffold only, not implemented yet:
 *
 * async function signIn(email, password) { ... }
 * async function signUp(email, password, metadata) { ... }
 * async function signOut() { ... }
 * async function getSession() { ... }
 * function onAuthChange(callback) { ... }
 */
