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

const SUPABASE_URL = 'https://sxsgbfzvgkekkjnuwxht.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InN4c2diZnp2Z2tla2tqbnV3eGh0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODAyNDczODgsImV4cCI6MjA5NTgyMzM4OH0.w9r1SfhvssKI-wMwkcDwYuPfxrHFs27ghxzMPbUnDhQ';

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
