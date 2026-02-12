import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  ActivityIndicator,
  Alert,
  Modal,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { getPendingConsents, approveConsent, rejectConsent, getApprovedConsents, revokeConsent } from '../../services/api';

interface ConsentRequest {
  id: string;
  token_id: string;
  requester: string;
  requested_fields: string[];
  status: string;
  created_at: string;
  expires_at?: string;
}

type ExpiryOption = '7_days' | '30_days' | '90_days' | '1_year' | 'never';

const EXPIRY_OPTIONS: { value: ExpiryOption; label: string; days: number | null }[] = [
  { value: '7_days', label: '7 Days', days: 7 },
  { value: '30_days', label: '30 Days', days: 30 },
  { value: '90_days', label: '3 Months', days: 90 },
  { value: '1_year', label: '1 Year', days: 365 },
  { value: 'never', label: 'No Expiry', days: null },
];

export default function ConsentsScreen() {
  const router = useRouter();
  const [consents, setConsents] = useState<ConsentRequest[]>([]);
  const [approvedConsents, setApprovedConsents] = useState<ConsentRequest[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [processingId, setProcessingId] = useState<string | null>(null);
  
  // Expiry modal state
  const [showExpiryModal, setShowExpiryModal] = useState(false);
  const [selectedConsent, setSelectedConsent] = useState<ConsentRequest | null>(null);
  const [selectedExpiry, setSelectedExpiry] = useState<ExpiryOption>('30_days');

  const fetchConsents = async () => {
    try {
      const [pendingResult, approvedResult] = await Promise.all([
        getPendingConsents(),
        getApprovedConsents().catch(() => ({ consent_requests: [] })),
      ]);
      console.log('Pending consents response:', JSON.stringify(pendingResult, null, 2));
      setConsents(pendingResult.consent_requests || []);
      setApprovedConsents(approvedResult.consent_requests || []);
    } catch (error: any) {
      console.error('Error fetching consents:', error);
      console.error('Error details:', error.message);
    } finally {
      setIsLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchConsents();
  }, []);

  const onRefresh = () => {
    setRefreshing(true);
    fetchConsents();
  };

  const handleApprove = async (consentId: string) => {
    // Find the consent and open expiry modal
    const consent = consents.find(c => c.id === consentId);
    if (consent) {
      setSelectedConsent(consent);
      setSelectedExpiry('30_days');
      setShowExpiryModal(true);
    }
  };

  const confirmApproveWithExpiry = async () => {
    if (!selectedConsent) return;
    
    setShowExpiryModal(false);
    setProcessingId(selectedConsent.id);
    
    try {
      // Calculate expiry date
      const expiryOption = EXPIRY_OPTIONS.find(o => o.value === selectedExpiry);
      let expiresAt: string | undefined;
      if (expiryOption?.days) {
        const date = new Date();
        date.setDate(date.getDate() + expiryOption.days);
        expiresAt = date.toISOString();
      }
      
      const result = await approveConsent(selectedConsent.id, expiresAt);
      if (result.status === 'approved') {
        Alert.alert('Success', `Consent approved${expiryOption?.days ? ` for ${expiryOption.label}` : ''}`);
        fetchConsents();
      } else {
        Alert.alert('Error', result.detail || 'Failed to approve consent');
      }
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to approve consent');
    } finally {
      setProcessingId(null);
      setSelectedConsent(null);
    }
  };

  const handleReject = async (consentId: string) => {
    Alert.alert(
      'Reject Consent',
      'Are you sure you want to reject this consent request?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Reject',
          style: 'destructive',
          onPress: async () => {
            setProcessingId(consentId);
            try {
              const result = await rejectConsent(consentId, 'User rejected the request');
              if (result.status === 'rejected') {
                Alert.alert('Success', 'Consent rejected');
                fetchConsents();
              } else {
                Alert.alert('Error', result.detail || 'Failed to reject consent');
              }
            } catch (error: any) {
              Alert.alert('Error', error.message || 'Failed to reject consent');
            } finally {
              setProcessingId(null);
            }
          },
        },
      ]
    );
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const handleRevokeConsent = async (consentId: string, requester: string) => {
    Alert.alert(
      'Revoke Access',
      `Revoke access for ${requester}? They will no longer be able to access your KYC data.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Revoke',
          style: 'destructive',
          onPress: async () => {
            setProcessingId(consentId);
            try {
              const result = await revokeConsent(consentId);
              if (result.status === 'revoked' || result.success) {
                Alert.alert('Success', 'Access revoked successfully');
                fetchConsents();
              } else {
                Alert.alert('Error', result.detail || 'Failed to revoke consent');
              }
            } catch (error: any) {
              Alert.alert('Error', error.message || 'Failed to revoke consent');
            } finally {
              setProcessingId(null);
            }
          },
        },
      ]
    );
  };

  const handleRevokeAll = () => {
    if (approvedConsents.length === 0) {
      Alert.alert('No Active Consents', 'There are no active consents to revoke.');
      return;
    }
    
    Alert.alert(
      '⚠️ Revoke All Access',
      `This will revoke access for ${approvedConsents.length} organization(s). They will no longer be able to access your KYC data. This action cannot be undone.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Revoke All',
          style: 'destructive',
          onPress: async () => {
            setProcessingId('all');
            try {
              await Promise.all(
                approvedConsents.map(c => revokeConsent(c.id).catch(() => null))
              );
              Alert.alert('Success', 'All access has been revoked');
              fetchConsents();
            } catch (error: any) {
              Alert.alert('Error', error.message || 'Failed to revoke all consents');
            } finally {
              setProcessingId(null);
            }
          },
        },
      ]
    );
  };

  const getDaysRemaining = (expiresAt: string) => {
    const now = new Date();
    const expiry = new Date(expiresAt);
    const diff = Math.ceil((expiry.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
    return diff;
  };

  if (isLoading) {
    return (
      <SafeAreaView className="flex-1 items-center justify-center bg-gray-100">
        <ActivityIndicator size="large" color="#1e40af" />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView className="flex-1 bg-gray-100" edges={['top']}>
      <ScrollView
        className="flex-1 bg-gray-100"
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      >
        <View className="px-4 py-6">
          {/* Header */}
          <View className="mb-4">
            <Text className="text-lg font-bold text-gray-800">Pending Requests ({consents.length})</Text>
            <Text className="text-gray-500 text-sm">Consent requests waiting for your approval</Text>
          </View>

          <Text className="text-gray-600 mb-4">
            Review and manage consent requests from third parties
          </Text>

        {consents.length === 0 ? (
          <View className="flex-1 items-center justify-center py-24">
            <Ionicons name="shield-checkmark-outline" size={64} color="#9ca3af" />
            <Text className="text-gray-500 text-lg mt-4">No pending requests</Text>
            <Text className="text-gray-400 text-sm mt-1 text-center">
              You'll see consent requests here when organizations request access
            </Text>
          </View>
        ) : (
          consents.map((consent) => (
            <View key={consent.id} className="bg-white rounded-xl p-4 mb-3 shadow-sm">
              <View className="flex-row items-start justify-between mb-3">
                <View className="flex-1">
                  <View className="flex-row items-center">
                    <View className="w-10 h-10 bg-orange-100 rounded-full items-center justify-center">
                      <Ionicons name="business" size={20} color="#f97316" />
                    </View>
                    <View className="ml-3">
                      <Text className="font-semibold text-gray-800">{consent.requester}</Text>
                      <Text className="text-gray-400 text-xs">{formatDate(consent.created_at)}</Text>
                    </View>
                  </View>
                </View>
                <View className="bg-orange-100 px-3 py-1 rounded-full">
                  <Text className="text-orange-800 text-xs font-medium">PENDING</Text>
                </View>
              </View>

              <View className="bg-gray-50 rounded-lg p-3 mb-4">
                <Text className="text-gray-600 text-sm font-medium mb-2">Requested Fields:</Text>
                <View className="flex-row flex-wrap">
                  {consent.requested_fields.map((field, index) => (
                    <View
                      key={index}
                      className="bg-blue-100 px-3 py-1 rounded-full mr-2 mb-2"
                    >
                      <Text className="text-blue-800 text-xs font-medium capitalize">{field}</Text>
                    </View>
                  ))}
                </View>
              </View>

              <View className="flex-row space-x-3">
                <TouchableOpacity
                  className={`flex-1 bg-red-100 rounded-xl py-3 items-center ${
                    processingId === consent.id ? 'opacity-50' : ''
                  }`}
                  onPress={() => handleReject(consent.id)}
                  disabled={processingId === consent.id}
                >
                  {processingId === consent.id ? (
                    <ActivityIndicator color="#dc2626" />
                  ) : (
                    <View className="flex-row items-center">
                      <Ionicons name="close-circle" size={20} color="#dc2626" />
                      <Text className="text-red-600 font-semibold ml-2">Reject</Text>
                    </View>
                  )}
                </TouchableOpacity>

                <TouchableOpacity
                  className={`flex-1 bg-green-500 rounded-xl py-3 items-center ${
                    processingId === consent.id ? 'opacity-50' : ''
                  }`}
                  onPress={() => handleApprove(consent.id)}
                  disabled={processingId === consent.id}
                >
                  {processingId === consent.id ? (
                    <ActivityIndicator color="#ffffff" />
                  ) : (
                    <View className="flex-row items-center">
                      <Ionicons name="checkmark-circle" size={20} color="#ffffff" />
                      <Text className="text-white font-semibold ml-2">Approve</Text>
                    </View>
                  )}
                </TouchableOpacity>
              </View>
            </View>
          ))
        )}
      </View>
    </ScrollView>

    {/* Expiry Selection Modal */}
    <Modal
      visible={showExpiryModal}
      animationType="slide"
      transparent={true}
      onRequestClose={() => setShowExpiryModal(false)}
    >
      <View className="flex-1 bg-black/50 justify-end">
        <View className="bg-white rounded-t-3xl p-6">
          <View className="items-center mb-4">
            <View className="w-12 h-1 bg-gray-300 rounded-full mb-4" />
            <Text className="text-gray-800 font-bold text-xl">Set Access Duration</Text>
            <Text className="text-gray-500 text-sm text-center mt-1">
              Choose how long {selectedConsent?.requester} can access your KYC
            </Text>
          </View>

          <View className="mb-6">
            {EXPIRY_OPTIONS.map((option) => (
              <TouchableOpacity
                key={option.value}
                className={`flex-row items-center justify-between p-4 rounded-xl mb-2 ${
                  selectedExpiry === option.value ? 'bg-blue-100 border-2 border-blue-500' : 'bg-gray-50'
                }`}
                onPress={() => setSelectedExpiry(option.value)}
              >
                <View className="flex-row items-center">
                  <View className={`w-6 h-6 rounded-full border-2 items-center justify-center ${
                    selectedExpiry === option.value ? 'border-blue-500 bg-blue-500' : 'border-gray-300'
                  }`}>
                    {selectedExpiry === option.value && (
                      <Ionicons name="checkmark" size={14} color="#ffffff" />
                    )}
                  </View>
                  <Text className={`ml-3 font-medium ${selectedExpiry === option.value ? 'text-blue-800' : 'text-gray-700'}`}>
                    {option.label}
                  </Text>
                </View>
                {option.value === '30_days' && (
                  <View className="bg-blue-500 px-2 py-1 rounded">
                    <Text className="text-white text-xs font-medium">Recommended</Text>
                  </View>
                )}
              </TouchableOpacity>
            ))}
          </View>

          <View className="flex-row space-x-3">
            <TouchableOpacity
              className="flex-1 bg-gray-100 rounded-xl py-4 items-center mr-2"
              onPress={() => setShowExpiryModal(false)}
            >
              <Text className="text-gray-700 font-semibold">Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity
              className="flex-1 bg-green-500 rounded-xl py-4 items-center ml-2"
              onPress={confirmApproveWithExpiry}
            >
              <Text className="text-white font-semibold">Approve</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
    </SafeAreaView>
  );
}
