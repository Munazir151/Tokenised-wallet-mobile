// Re-export Supabase auth functions for backward compatibility
export {
  signUp,
  signIn,
  signOut,
  getCurrentUser,
  getSession,
  onAuthStateChange,
} from './supabase';
