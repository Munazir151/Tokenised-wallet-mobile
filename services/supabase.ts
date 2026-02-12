import { supabase, DOCUMENTS_BUCKET, isSupabaseConfigured } from '../config/supabase';
import * as FileSystem from 'expo-file-system/legacy';
import { decode } from 'base64-arraybuffer';

// Helper to check Supabase configuration
const checkSupabaseConfig = () => {
  if (!isSupabaseConfigured) {
    console.warn('Supabase is not configured. Please update app.json with your Supabase credentials.');
  }
};

// Auth functions
export const signUp = async (email: string, password: string, name: string) => {
  checkSupabaseConfig();
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: {
        name,
      },
    },
  });

  if (error) throw error;
  return data;
};

export const signIn = async (email: string, password: string) => {
  checkSupabaseConfig();
  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });

  if (error) throw error;
  return data;
};

export const signOut = async () => {
  const { error } = await supabase.auth.signOut();
  if (error) throw error;
};

export const getCurrentUser = async () => {
  const { data: { user }, error } = await supabase.auth.getUser();
  if (error) throw error;
  return user;
};

export const getSession = async () => {
  const { data: { session }, error } = await supabase.auth.getSession();
  if (error) throw error;
  return session;
};

export const onAuthStateChange = (callback: (event: string, session: any) => void) => {
  return supabase.auth.onAuthStateChange(callback);
};

// User profile functions
export const getUserProfile = async (userId: string) => {
  const { data, error } = await supabase
    .from('users')
    .select('*')
    .eq('id', userId)
    .maybeSingle();

  if (error) throw error;
  return data;
};

export const createUserProfile = async (userId: string, email: string, name: string) => {
  // First check if a user with this email already exists (but different id)
  const { data: existingByEmail } = await supabase
    .from('users')
    .select('*')
    .eq('email', email)
    .maybeSingle();
  
  // If email exists with different user id, update that record with new user id
  if (existingByEmail && existingByEmail.id !== userId) {
    // Delete old record and create new one with correct id
    await supabase.from('users').delete().eq('id', existingByEmail.id);
  }
  
  // Use upsert to handle case where user might already exist
  const { data, error } = await supabase
    .from('users')
    .upsert({
      id: userId,
      email,
      name,
    }, {
      onConflict: 'id',
      ignoreDuplicates: false,
    })
    .select()
    .single();

  if (error) throw error;
  return data;
};

// Get or create user profile
export const getOrCreateUserProfile = async (userId: string, email: string, name: string) => {
  // First try to get existing profile
  let profile = await getUserProfile(userId);
  
  // If no profile exists, create one
  if (!profile) {
    profile = await createUserProfile(userId, email, name);
  }
  
  return profile;
};

export const updateUserProfile = async (userId: string, updates: Record<string, any>) => {
  const { data, error } = await supabase
    .from('users')
    .update(updates)
    .eq('id', userId)
    .select()
    .single();

  if (error) throw error;
  return data;
};

// Document storage functions
export const uploadDocument = async (
  userId: string,
  documentType: string,
  fileUri: string,
  fileName: string
) => {
  // Read file as base64
  const base64 = await FileSystem.readAsStringAsync(fileUri, {
    encoding: 'base64',
  });

  // Determine content type
  const extension = fileName.split('.').pop()?.toLowerCase() || 'jpg';
  const contentType = extension === 'pdf' ? 'application/pdf' : `image/${extension === 'jpg' ? 'jpeg' : extension}`;

  // Create unique file path
  const filePath = `${userId}/${documentType}/${Date.now()}_${fileName}`;

  // Upload to Supabase Storage using base64-arraybuffer decode
  const { data, error } = await supabase.storage
    .from(DOCUMENTS_BUCKET)
    .upload(filePath, decode(base64), {
      contentType,
      upsert: true,
    });

  if (error) throw error;

  // Get public URL
  const { data: urlData } = supabase.storage
    .from(DOCUMENTS_BUCKET)
    .getPublicUrl(filePath);

  // Save document record to database
  const { data: docRecord, error: dbError } = await supabase
    .from('kyc_documents')
    .upsert({
      user_id: userId,
      document_type: documentType,
      file_name: fileName,
      file_url: urlData.publicUrl,
      status: 'pending',
    }, {
      onConflict: 'user_id,document_type',
    })
    .select()
    .single();

  if (dbError) throw dbError;

  return docRecord;
};

export const getDocuments = async (userId: string) => {
  const { data, error } = await supabase
    .from('kyc_documents')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false });

  if (error) throw error;
  return data;
};

export const deleteDocument = async (documentId: string, filePath: string) => {
  // Delete from storage
  const { error: storageError } = await supabase.storage
    .from(DOCUMENTS_BUCKET)
    .remove([filePath]);

  if (storageError) console.warn('Storage delete error:', storageError);

  // Delete from database
  const { error } = await supabase
    .from('kyc_documents')
    .delete()
    .eq('id', documentId);

  if (error) throw error;
};

// KYC functions
export const getKYCStatus = async (userId: string) => {
  const { data: user, error: userError } = await supabase
    .from('users')
    .select('kyc_status')
    .eq('id', userId)
    .single();

  if (userError) throw userError;

  const { data: documents, error: docError } = await supabase
    .from('kyc_documents')
    .select('document_type, status')
    .eq('user_id', userId);

  if (docError) throw docError;

  const { data: token, error: tokenError } = await supabase
    .from('kyc_tokens')
    .select('id')
    .eq('user_id', userId)
    .eq('status', 'active')
    .maybeSingle();

  const requiredDocs = ['aadhaar_front', 'aadhaar_back', 'pan_card', 'selfie'];
  const uploadedDocs = documents?.map(d => d.document_type) || [];
  const verifiedDocs = documents?.filter(d => d.status === 'verified').map(d => d.document_type) || [];

  return {
    status: user?.kyc_status || 'pending',
    documents_uploaded: uploadedDocs,
    documents_required: requiredDocs,
    documents_verified: verifiedDocs,
    can_issue_token: verifiedDocs.length === requiredDocs.length,
    has_active_token: !!token,
  };
};

export const submitKYCForVerification = async (userId: string) => {
  const { error } = await supabase
    .from('users')
    .update({ kyc_status: 'documents_uploaded' })
    .eq('id', userId);

  if (error) throw error;
};
