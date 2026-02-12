// Supabase configuration
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import * as SecureStore from 'expo-secure-store';
import Constants from 'expo-constants';

// Get Supabase credentials from environment or use placeholders
// Set these in your app.json under extra or use .env with expo-constants
const SUPABASE_URL = Constants.expoConfig?.extra?.supabaseUrl || 
  process.env.EXPO_PUBLIC_SUPABASE_URL || 
  'https://placeholder.supabase.co'; // Will show warning if not configured

const SUPABASE_ANON_KEY = Constants.expoConfig?.extra?.supabaseAnonKey || 
  process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY || 
  'placeholder-anon-key';

// Check if Supabase is properly configured
export const isSupabaseConfigured = 
  SUPABASE_URL !== 'https://placeholder.supabase.co' && 
  SUPABASE_ANON_KEY !== 'placeholder-anon-key';

// Custom storage adapter for React Native using SecureStore
const ExpoSecureStoreAdapter = {
  getItem: async (key: string) => {
    try {
      return await SecureStore.getItemAsync(key);
    } catch {
      return null;
    }
  },
  setItem: async (key: string, value: string) => {
    try {
      await SecureStore.setItemAsync(key, value);
    } catch {
      console.warn('SecureStore setItem failed');
    }
  },
  removeItem: async (key: string) => {
    try {
      await SecureStore.deleteItemAsync(key);
    } catch {
      console.warn('SecureStore removeItem failed');
    }
  },
};

// Create Supabase client with custom storage
let supabase: SupabaseClient;

try {
  supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    auth: {
      storage: ExpoSecureStoreAdapter,
      autoRefreshToken: true,
      persistSession: true,
      detectSessionInUrl: false,
    },
  });
} catch (error) {
  console.error('Failed to initialize Supabase client:', error);
  // Create a dummy client that will fail gracefully
  supabase = createClient('https://placeholder.supabase.co', 'placeholder', {
    auth: {
      storage: ExpoSecureStoreAdapter,
      persistSession: false,
    },
  });
}

export { supabase };

// API configuration - use your machine's IP for physical devices
export const API_BASE_URL = Constants.expoConfig?.extra?.apiUrl ||
  process.env.EXPO_PUBLIC_API_URL ||
  'https://backend-launch-1.preview.emergentagent.com/api'; // Production backend

// Storage bucket name
export const DOCUMENTS_BUCKET = 'kyc-documents';
