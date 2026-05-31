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

const SUPABASE_URL = 'https://xxsmdktshnysesxawyjq.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inh4c21ka3RzaG55c2VzeGF3eWpxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzgzNTU5MzksImV4cCI6MjA5MzkzMTkzOX0.KSf4cZhLtliwu_AhqYGIQADeTJ5g121DqRmncYfXV3g';

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
