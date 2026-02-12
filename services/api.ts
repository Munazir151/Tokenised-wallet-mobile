import * as SecureStore from 'expo-secure-store';
import { API_BASE_URL, supabase } from '../config/supabase';

const TOKEN_KEY = 'auth_token';
const USER_KEY = 'user_data';

// Token storage
export const saveToken = async (token: string): Promise<void> => {
  await SecureStore.setItemAsync(TOKEN_KEY, token);
};

export const getToken = async (): Promise<string | null> => {
  // First try to get Supabase session token
  try {
    const { data: { session } } = await supabase.auth.getSession();
    if (session?.access_token) {
      return session.access_token;
    }
  } catch (error) {
    console.log('Error getting Supabase session:', error);
  }
  // Fallback to stored token
  return await SecureStore.getItemAsync(TOKEN_KEY);
};

export const removeToken = async (): Promise<void> => {
  await SecureStore.deleteItemAsync(TOKEN_KEY);
};

// User data storage
export const saveUserData = async (user: any): Promise<void> => {
  await SecureStore.setItemAsync(USER_KEY, JSON.stringify(user));
};

export const getUserData = async (): Promise<any | null> => {
  const data = await SecureStore.getItemAsync(USER_KEY);
  return data ? JSON.parse(data) : null;
};

export const removeUserData = async (): Promise<void> => {
  await SecureStore.deleteItemAsync(USER_KEY);
};

// API helpers
const getAuthHeaders = async () => {
  const token = await getToken();
  return {
    'Content-Type': 'application/json',
    ...(token && { Authorization: `Bearer ${token}` }),
  };
};

// Auth API
export const apiLogin = async (email: string, password: string) => {
  const response = await fetch(`${API_BASE_URL}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password }),
  });
  
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.detail || 'Login failed');
  }
  return response.json();
};

export const apiRegister = async (email: string, name: string, password: string) => {
  const response = await fetch(`${API_BASE_URL}/auth/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, name, password }),
  });
  
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.detail || 'Registration failed');
  }
  return response.json();
};

// KYC Status API
export const getKYCStatus = async () => {
  const headers = await getAuthHeaders();
  const response = await fetch(`${API_BASE_URL}/kyc/status`, {
    method: 'GET',
    headers,
  });
  
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.detail || 'Failed to get KYC status');
  }
  return response.json();
};

export const submitKYCForVerification = async () => {
  const headers = await getAuthHeaders();
  const response = await fetch(`${API_BASE_URL}/kyc/submit`, {
    method: 'POST',
    headers,
  });
  
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.detail || 'Failed to submit KYC');
  }
  return response.json();
};

// Document Upload API with Verification
export const uploadDocument = async (
  documentType: string, 
  fileUri: string, 
  fileName: string,
  documentNumber?: string  // Optional: Aadhaar number, PAN number for verification
) => {
  const token = await getToken();
  const formData = new FormData();
  
  // Create file object for upload
  const fileExtension = fileName.split('.').pop()?.toLowerCase() || 'jpg';
  const mimeType = fileExtension === 'pdf' ? 'application/pdf' : `image/${fileExtension}`;
  
  formData.append('file', {
    uri: fileUri,
    name: fileName,
    type: mimeType,
  } as any);

  formData.append('document_type', documentType);
  
  // Add document number for enhanced verification (UIDAI, NSDL, etc.)
  if (documentNumber) {
    formData.append('document_number', documentNumber);
  }
  
  const response = await fetch(`${API_BASE_URL}/documents/upload`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
    },
    body: formData,
  });
  
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.detail || 'Failed to upload document');
  }
  
  // Response includes verification info
  return response.json();
};

export const getUploadedDocuments = async () => {
  const headers = await getAuthHeaders();
  const response = await fetch(`${API_BASE_URL}/documents/list`, {
    method: 'GET',
    headers,
  });
  
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.detail || 'Failed to get documents');
  }
  return response.json();
};

export const getRequiredDocuments = async () => {
  const headers = await getAuthHeaders();
  const response = await fetch(`${API_BASE_URL}/documents/required`, {
    method: 'GET',
    headers,
  });
  
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.detail || 'Failed to get required documents');
  }
  return response.json();
};

export const deleteDocument = async (documentId: string) => {
  const headers = await getAuthHeaders();
  const response = await fetch(`${API_BASE_URL}/documents/${documentId}`, {
    method: 'DELETE',
    headers,
  });
  
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.detail || 'Failed to delete document');
  }
  return response.json();
};

// KYC API
export const issueKYCToken = async (kycData: {
  name: string;
  pan: string;
  dob: string;
  address?: string;
  phone?: string;
}) => {
  const headers = await getAuthHeaders();
  const response = await fetch(`${API_BASE_URL}/kyc/issue`, {
    method: 'POST',
    headers,
    body: JSON.stringify({ kyc_data: kycData }),
  });
  return response.json();
};

export const getMyTokens = async () => {
  const headers = await getAuthHeaders();
  const response = await fetch(`${API_BASE_URL}/kyc/tokens`, {
    method: 'GET',
    headers,
  });
  
  if (!response.ok) {
    const error = await response.json().catch(() => ({ detail: 'Failed to get tokens' }));
    throw new Error(error.detail || 'Failed to get tokens');
  }
  return response.json();
};

export const getTokenDetails = async (tokenId: string) => {
  const headers = await getAuthHeaders();
  const response = await fetch(`${API_BASE_URL}/kyc/token/${tokenId}`, {
    method: 'GET',
    headers,
  });
  return response.json();
};

export const revokeToken = async (tokenId: string, reason?: string) => {
  const headers = await getAuthHeaders();
  const response = await fetch(`${API_BASE_URL}/kyc/revoke`, {
    method: 'POST',
    headers,
    body: JSON.stringify({ token_id: tokenId, reason }),
  });
  return response.json();
};

// Consent API
export const getPendingConsents = async () => {
  const headers = await getAuthHeaders();
  const response = await fetch(`${API_BASE_URL}/consent/pending`, {
    method: 'GET',
    headers,
  });
  
  if (!response.ok) {
    // Handle different error types
    const error = await response.json().catch(() => ({}));
    const message = error.detail || 'Failed to get pending consents';
    console.error('Pending consents error:', message, 'Status:', response.status);
    // Return empty array if endpoint not found
    if (response.status === 404) {
      return { consent_requests: [], count: 0 };
    }
    throw new Error(message);
  }
  const data = await response.json();
  // Ensure response has expected structure
  return {
    consent_requests: data.consent_requests || [],
    count: data.count || 0,
  };
};

export const approveConsent = async (consentId: string, expiresAt?: string) => {
  const headers = await getAuthHeaders();
  const response = await fetch(`${API_BASE_URL}/consent/approve`, {
    method: 'POST',
    headers,
    body: JSON.stringify({ consent_id: consentId, expires_at: expiresAt }),
  });
  
  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    const message = error.detail || 'Failed to approve consent';
    console.error('Approve consent error:', message);
    throw new Error(message);
  }
  return response.json();
};

export const rejectConsent = async (consentId: string, reason?: string) => {
  const headers = await getAuthHeaders();
  const response = await fetch(`${API_BASE_URL}/consent/reject`, {
    method: 'POST',
    headers,
    body: JSON.stringify({ consent_id: consentId, reason }),
  });
  
  if (!response.ok) {
    const error = await response.json().catch(() => ({ detail: 'Failed to reject consent' }));
    throw new Error(error.detail || 'Failed to reject consent');
  }
  return response.json();
};

export const getApprovedConsents = async () => {
  const headers = await getAuthHeaders();
  const response = await fetch(`${API_BASE_URL}/consent/approved`, {
    method: 'GET',
    headers,
  });
  
  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    const message = error.detail || 'Failed to get approved consents';
    console.error('Approved consents error:', message);
    // Return empty array if endpoint not found
    if (response.status === 404) {
      return { consent_requests: [], count: 0 };
    }
    throw new Error(message);
  }
  const data = await response.json();
  return {
    consent_requests: data.consent_requests || [],
    count: data.count || 0,
  };
};

export const revokeConsent = async (consentId: string) => {
  const headers = await getAuthHeaders();
  const response = await fetch(`${API_BASE_URL}/consent/revoke`, {
    method: 'POST',
    headers,
    body: JSON.stringify({ consent_id: consentId }),
  });
  
  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    const message = error.detail || 'Failed to revoke consent';
    console.error('Revoke consent error:', message);
    throw new Error(message);
  }
  return response.json();
};

// Audit API
export const getAuditLogs = async (tokenId?: string) => {
  const headers = await getAuthHeaders();
  const url = tokenId
    ? `${API_BASE_URL}/audit/logs?token_id=${tokenId}`
    : `${API_BASE_URL}/audit/logs`;
  const response = await fetch(url, {
    method: 'GET',
    headers,
  });
  return response.json();
};

export const getAuditSummary = async () => {
  const headers = await getAuthHeaders();
  const response = await fetch(`${API_BASE_URL}/audit/logs/summary`, {
    method: 'GET',
    headers,
  });
  
  if (!response.ok) {
    const error = await response.json().catch(() => ({ detail: 'Failed to get audit summary' }));
    throw new Error(error.detail || 'Failed to get audit summary');
  }
  return response.json();
};
