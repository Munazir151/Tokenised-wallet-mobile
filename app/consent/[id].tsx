import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { supabase } from '../../config/supabase';
import { useAuth } from '../../context/AuthContext';

interface ConsentRequest {
  id: string;
  requester: string;
  requester_name: string;
  requested_fields: string[];
  purpose: string;
  status: string;
  created_at: string;
  expires_at: string;
}

interface UserDocument {
  id: string;
  document_type: string;
  status: string;
}

interface UserToken {
  id: string;
  token_json: any;
  status: string;
}

// Mapping of requested fields to document types
const FIELD_TO_DOCUMENT: Record<string, string[]> = {
  aadhaar: ['aadhaar_front', 'aadhaar_back', 'aadhaar'],
  aadhaar_front: ['aadhaar_front'],
  aadhaar_back: ['aadhaar_back'],
  aadhaar_card: ['aadhaar_front', 'aadhaar_back', 'aadhaar'],
  pan: ['pan_card', 'pan'],
  pan_card: ['pan_card', 'pan'],
  selfie: ['selfie'],
  photo: ['selfie', 'photo'],
  passport: ['passport'],
  driving_license: ['driving_license'],
  voter_id: ['voter_id'],
  documents: [], // Skip this field as it's not a specific document
};

// Fields that are data fields (require token data, not documents)
const DATA_FIELDS = ['name', 'dob', 'address', 'phone', 'email', 'date_of_birth', 'pan'];

export default function ConsentDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { user } = useAuth();
  const [consent, setConsent] = useState<ConsentRequest | null>(null);
  const [userDocuments, setUserDocuments] = useState<UserDocument[]>([]);
  const [userToken, setUserToken] = useState<UserToken | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isProcessing, setIsProcessing] = useState(false);
  const [missingDocuments, setMissingDocuments] = useState<string[]>([]);
  const [missingDataFields, setMissingDataFields] = useState<string[]>([]);

  useEffect(() => {
    if (id) {
      loadConsentRequest();
    }
  }, [id]);

  const loadConsentRequest = async () => {
    try {
      // Load consent request
      const { data, error } = await supabase
        .from('consent_requests')
        .select('*')
        .eq('id', id)
        .single();

      if (error) throw error;
      setConsent(data);

      // Load user's uploaded documents
      if (user?.id) {
        const { data: docs } = await supabase
          .from('user_documents')
          .select('id, document_type, status')
          .eq('user_id', user.id);

        setUserDocuments(docs || []);

        // Load user's KYC token to check for data fields
        const { data: tokens } = await supabase
          .from('kyc_tokens')
          .select('id, token_json, status')
          .eq('user_id', user.id)
          .eq('status', 'active')
          .order('issued_at', { ascending: false })
          .limit(1);

        const activeToken = tokens && tokens.length > 0 ? tokens[0] : null;
        setUserToken(activeToken);

        // Check for missing items
        if (data?.requested_fields) {
          const missingDocs = checkMissingDocuments(data.requested_fields, docs || []);
          setMissingDocuments(missingDocs);

          const missingData = checkMissingDataFields(data.requested_fields, activeToken);
          setMissingDataFields(missingData);
        }
      }
    } catch (error: any) {
      console.error('Error loading consent:', error);
      Alert.alert('Error', 'Failed to load consent request');
    } finally {
      setIsLoading(false);
    }
  };

  const checkMissingDataFields = (requestedFields: string[], token: UserToken | null): string[] => {
    const missing: string[] = [];
    
    // If no active token, all data fields are missing
    if (!token) {
      for (const field of requestedFields) {
        const fieldLower = field.toLowerCase();
        if (DATA_FIELDS.includes(fieldLower)) {
          missing.push(field);
        }
      }
      return missing;
    }

    const tokenData = token.token_json?.credentialSubject || {};
    
    for (const field of requestedFields) {
      const fieldLower = field.toLowerCase();
      
      // Only check data fields
      if (DATA_FIELDS.includes(fieldLower)) {
        // Map field names to token data keys
        let tokenKey = fieldLower;
        if (fieldLower === 'date_of_birth') tokenKey = 'dob';
        
        const value = tokenData[tokenKey];
        
        // Check if the value exists and is not empty
        if (!value || (typeof value === 'string' && value.trim() === '')) {
          missing.push(field);
        }
      }
    }

    return missing;
  };

  const checkMissingDocuments = (requestedFields: string[], uploadedDocs: UserDocument[]): string[] => {
    const missing: string[] = [];
    const uploadedTypes = uploadedDocs.map(d => d.document_type.toLowerCase());

    for (const field of requestedFields) {
      const fieldLower = field.toLowerCase();
      
      // Skip data fields - they don't require document uploads
      if (DATA_FIELDS.includes(fieldLower)) {
        continue;
      }
      
      const requiredDocTypes = FIELD_TO_DOCUMENT[fieldLower];

      // If it's a known document type, check if uploaded
      if (requiredDocTypes && requiredDocTypes.length > 0) {
        // Check if any of the acceptable document types are uploaded
        const hasDocument = requiredDocTypes.some(docType => 
          uploadedTypes.includes(docType.toLowerCase())
        );

        if (!hasDocument) {
          missing.push(field);
        }
      } else if (!requiredDocTypes) {
        // Unknown field that might be a document - check directly
        if (!uploadedTypes.includes(fieldLower)) {
          missing.push(field);
        }
      }
    }

    return missing;
  };

  const handleApprove = async () => {
    setIsProcessing(true);
    
    try {
      // Re-fetch documents from database to ensure we have latest data
      const { data: freshDocs } = await supabase
        .from('user_documents')
        .select('id, document_type, status')
        .eq('user_id', user?.id);
      
      const currentDocs = freshDocs || [];
      
      // Re-fetch token from database
      const { data: freshTokens } = await supabase
        .from('kyc_tokens')
        .select('id, token_json, status')
        .eq('user_id', user?.id)
        .eq('status', 'active')
        .order('issued_at', { ascending: false })
        .limit(1);
      
      const currentToken = freshTokens && freshTokens.length > 0 ? freshTokens[0] : null;
      
      // Check for missing data fields from fresh token data
      const freshMissingDataFields = checkMissingDataFields(consent?.requested_fields || [], currentToken);
      if (freshMissingDataFields.length > 0) {
        setMissingDataFields(freshMissingDataFields);
        const fieldNames = freshMissingDataFields.map(f => getFieldLabel(f)).join(', ');
        Alert.alert(
          'Missing KYC Data',
          `Your KYC token is missing the following data:\n\n${fieldNames}\n\nPlease issue a new token with complete details to approve this request.`,
          [
            { text: 'Cancel', style: 'cancel' },
            { 
              text: 'Issue Token', 
              onPress: () => router.push('/(tabs)/tokens')
            }
          ]
        );
        setIsProcessing(false);
        return;
      }

      // Check for missing documents from fresh database data
      const freshMissingDocs = checkMissingDocuments(consent?.requested_fields || [], currentDocs);
      if (freshMissingDocs.length > 0) {
        setMissingDocuments(freshMissingDocs);
        const docNames = freshMissingDocs.map(d => getFieldLabel(d)).join(', ');
        Alert.alert(
          'Missing Documents',
          `You need to upload the following documents before approving this request:\n\n${docNames}`,
          [
            { text: 'Cancel', style: 'cancel' },
            { 
              text: 'Upload Now', 
              onPress: () => router.push('/(tabs)/documents')
            }
          ]
        );
        setIsProcessing(false);
        return;
      }

      // All checks passed, approve the consent
      const { error } = await supabase
        .from('consent_requests')
        .update({ status: 'approved' })
        .eq('id', id);

      if (error) throw error;

      // Log the action
      await supabase.from('audit_logs').insert({
        token_id: consent?.id,
        action: 'consent_approved',
        performed_by: user?.id || 'unknown',
        details: { requester: consent?.requester, fields: consent?.requested_fields },
      });

      Alert.alert('Success', 'Consent approved successfully', [
        { text: 'OK', onPress: () => router.back() },
      ]);
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to approve consent');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleReject = async () => {
    Alert.alert(
      'Reject Consent',
      'Are you sure you want to reject this consent request?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Reject',
          style: 'destructive',
          onPress: async () => {
            setIsProcessing(true);
            try {
              const { error } = await supabase
                .from('consent_requests')
                .update({ status: 'rejected' })
                .eq('id', id);

              if (error) throw error;

              Alert.alert('Success', 'Consent rejected', [
                { text: 'OK', onPress: () => router.back() },
              ]);
            } catch (error: any) {
              Alert.alert('Error', error.message || 'Failed to reject consent');
            } finally {
              setIsProcessing(false);
            }
          },
        },
      ]
    );
  };

  const getFieldLabel = (field: string) => {
    const labels: Record<string, string> = {
      name: 'Full Name',
      pan: 'PAN Number',
      pan_card: 'PAN Card',
      dob: 'Date of Birth',
      address: 'Address',
      phone: 'Phone Number',
      email: 'Email',
      aadhaar: 'Aadhaar Card',
      aadhaar_front: 'Aadhaar Front',
      aadhaar_back: 'Aadhaar Back',
      selfie: 'Selfie',
      photo: 'Photo',
      passport: 'Passport',
      driving_license: 'Driving License',
      voter_id: 'Voter ID',
    };
    return labels[field.toLowerCase()] || field;
  };

  const isDocumentUploaded = (field: string): boolean => {
    return !missingDocuments.includes(field);
  };

  const isDataFieldAvailable = (field: string): boolean => {
    return !missingDataFields.includes(field);
  };

  const getFieldStatus = (field: string): 'available' | 'missing-doc' | 'missing-data' => {
    const fieldLower = field.toLowerCase();
    
    // Check if it's a data field
    if (DATA_FIELDS.includes(fieldLower)) {
      return missingDataFields.includes(field) ? 'missing-data' : 'available';
    }
    
    // It's a document field
    return missingDocuments.includes(field) ? 'missing-doc' : 'available';
  };

  if (isLoading) {
    return (
      <View className="flex-1 justify-center items-center bg-gray-100">
        <ActivityIndicator size="large" color="#1e40af" />
        <Text className="mt-4 text-gray-600">Loading consent request...</Text>
      </View>
    );
  }

  if (!consent) {
    return (
      <View className="flex-1 justify-center items-center bg-gray-100 px-6">
        <Ionicons name="alert-circle-outline" size={64} color="#9ca3af" />
        <Text className="mt-4 text-lg text-gray-600">Consent request not found</Text>
        <TouchableOpacity
          className="mt-6 bg-blue-800 px-6 py-3 rounded-xl"
          onPress={() => router.back()}
        >
          <Text className="text-white font-semibold">Go Back</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const isPending = consent.status === 'pending';

  return (
    <ScrollView className="flex-1 bg-gray-100">
      <View className="p-6">
        {/* Requester Info */}
        <View className="bg-white rounded-2xl p-6 shadow-sm mb-4">
          <View className="flex-row items-center mb-4">
            <View className="w-12 h-12 bg-blue-100 rounded-full items-center justify-center">
              <Ionicons name="business" size={24} color="#1e40af" />
            </View>
            <View className="ml-4 flex-1">
              <Text className="text-lg font-bold text-gray-800">
                {consent.requester_name || consent.requester}
              </Text>
              <Text className="text-gray-500 text-sm">{consent.requester}</Text>
            </View>
          </View>

          <View className="bg-gray-50 rounded-xl p-4">
            <Text className="text-gray-500 text-sm mb-1">Purpose</Text>
            <Text className="text-gray-800">{consent.purpose || 'KYC Verification'}</Text>
          </View>
        </View>

        {/* Requested Fields */}
        <View className="bg-white rounded-2xl p-6 shadow-sm mb-4">
          <Text className="text-lg font-bold text-gray-800 mb-4">Requested Information</Text>
          
          {consent.requested_fields.map((field, index) => {
            const status = getFieldStatus(field);
            return (
              <View
                key={index}
                className="flex-row items-center py-3 border-b border-gray-100 last:border-0"
              >
                <Ionicons 
                  name={status === 'available' ? "checkmark-circle" : "alert-circle"} 
                  size={20} 
                  color={status === 'available' ? "#22c55e" : status === 'missing-data' ? "#ef4444" : "#f59e0b"} 
                />
                <Text className="ml-3 text-gray-700 flex-1">{getFieldLabel(field)}</Text>
                {status === 'missing-doc' && (
                  <View className="bg-orange-100 px-2 py-1 rounded">
                    <Text className="text-orange-700 text-xs font-medium">Not Uploaded</Text>
                  </View>
                )}
                {status === 'missing-data' && (
                  <View className="bg-red-100 px-2 py-1 rounded">
                    <Text className="text-red-700 text-xs font-medium">Not in Token</Text>
                  </View>
                )}
              </View>
            );
          })}

          {/* Warning for missing data fields */}
          {isPending && missingDataFields.length > 0 && (
            <TouchableOpacity 
              className="mt-4 bg-red-50 border border-red-200 rounded-xl p-4"
              onPress={() => router.push('/(tabs)/tokens')}
            >
              <View className="flex-row items-center">
                <Ionicons name="alert-circle" size={20} color="#ef4444" />
                <Text className="ml-2 text-red-700 font-medium flex-1">
                  Issue token with missing data to approve
                </Text>
                <Ionicons name="chevron-forward" size={16} color="#ef4444" />
              </View>
            </TouchableOpacity>
          )}

          {/* Warning for missing documents */}
          {isPending && missingDocuments.length > 0 && (
            <TouchableOpacity 
              className="mt-4 bg-orange-50 border border-orange-200 rounded-xl p-4"
              onPress={() => router.push('/(tabs)/documents')}
            >
              <View className="flex-row items-center">
                <Ionicons name="warning" size={20} color="#f59e0b" />
                <Text className="ml-2 text-orange-700 font-medium flex-1">
                  Upload missing documents to approve
                </Text>
                <Ionicons name="chevron-forward" size={16} color="#f59e0b" />
              </View>
            </TouchableOpacity>
          )}
        </View>

        {/* Status */}
        <View className="bg-white rounded-2xl p-6 shadow-sm mb-4">
          <Text className="text-lg font-bold text-gray-800 mb-4">Status</Text>
          
          <View className="flex-row items-center">
            <View
              className={`px-3 py-1 rounded-full ${
                consent.status === 'approved'
                  ? 'bg-green-100'
                  : consent.status === 'rejected'
                  ? 'bg-red-100'
                  : 'bg-yellow-100'
              }`}
            >
              <Text
                className={`font-semibold ${
                  consent.status === 'approved'
                    ? 'text-green-700'
                    : consent.status === 'rejected'
                    ? 'text-red-700'
                    : 'text-yellow-700'
                }`}
              >
                {consent.status.charAt(0).toUpperCase() + consent.status.slice(1)}
              </Text>
            </View>
          </View>

          <View className="mt-4">
            <Text className="text-gray-500 text-sm">
              Requested on {new Date(consent.created_at).toLocaleDateString()}
            </Text>
            {consent.expires_at && (
              <Text className="text-gray-500 text-sm mt-1">
                Expires on {new Date(consent.expires_at).toLocaleDateString()}
              </Text>
            )}
          </View>
        </View>

        {/* Action Buttons */}
        {isPending && (
          <View className="flex-row gap-4">
            <TouchableOpacity
              className="flex-1 bg-red-500 py-4 rounded-xl items-center"
              onPress={handleReject}
              disabled={isProcessing}
            >
              {isProcessing ? (
                <ActivityIndicator color="#ffffff" />
              ) : (
                <Text className="text-white font-semibold text-lg">Reject</Text>
              )}
            </TouchableOpacity>
            
            <TouchableOpacity
              className="flex-1 bg-green-500 py-4 rounded-xl items-center"
              onPress={handleApprove}
              disabled={isProcessing}
            >
              {isProcessing ? (
                <ActivityIndicator color="#ffffff" />
              ) : (
                <Text className="text-white font-semibold text-lg">Approve</Text>
              )}
            </TouchableOpacity>
          </View>
        )}
      </View>
    </ScrollView>
  );
}
