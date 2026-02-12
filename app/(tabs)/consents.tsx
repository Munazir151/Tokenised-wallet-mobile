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
    <SafeAreaView className="flex-1 bg-blue-800" edges={['top']}>
      <ScrollView
        className="flex-1 bg-gray-50"
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        showsVerticalScrollIndicator={false}
      >
        {/* Header Section */}
        <View className="bg-blue-800 px-6 pt-4 pb-16">
          <View className="flex-row items-center mb-2">
            <View className="w-10 h-10 bg-orange-500 rounded-xl items-center justify-center">
              <Ionicons name="shield-checkmark" size={22} color="#ffffff" />
            </View>
            <Text className="text-white text-2xl font-bold ml-3">Consents</Text>
          </View>
          <Text className="text-blue-200 text-sm">
            {consents.length} pending {consents.length === 1 ? 'request' : 'requests'}
          </Text>
        </View>

        {/* Content - Overlapping Header */}
        <View className="px-4 -mt-8">

        {consents.length === 0 ? (
          <View className="bg-white rounded-2xl p-12 items-center shadow-sm">
            <View className="w-20 h-20 bg-orange-100 rounded-full items-center justify-center mb-4">
              <Ionicons name="shield-checkmark-outline" size={40} color="#f97316" />
            </View>
            <Text className="text-gray-700 text-lg font-semibold">No Pending Requests</Text>
            <Text className="text-gray-400 text-sm mt-2 text-center">
              You'll see consent requests here when organizations request access
            </Text>
          </View>
        ) : (
          consents.map((consent) => (
            <View 
              key={consent.id} 
              className="bg-white rounded-2xl p-5 mb-4 border border-gray-100"
              style={{
                shadowColor: '#000',
                shadowOffset: { width: 0, height: 2 },
                shadowOpacity: 0.08,
                shadowRadius: 12,
                elevation: 3,
              }}
            >
              <View className="flex-row items-start justify-between mb-4">
                <View className="flex-1">
                  <View className="flex-row items-center">
                    <View className="w-12 h-12 bg-orange-100 rounded-xl items-center justify-center">
                      <Ionicons name="business" size={24} color="#f97316" />
                    </View>
                    <View className="ml-3 flex-1">
                      <Text className="font-bold text-gray-900 text-base">{consent.requester}</Text>
                      <View className="flex-row items-center mt-1">
                        <Ionicons name="time-outline" size={12} color="#9ca3af" />
                        <Text className="text-gray-400 text-xs ml-1">{formatDate(consent.created_at)}</Text>
                      </View>
                    </View>
                  </View>
                </View>
                <View className="bg-orange-100 px-3 py-1.5 rounded-full">
                  <Text className="text-orange-700 text-xs font-bold">● PENDING</Text>
                </View>
              </View>

              <View className="bg-gray-50 rounded-xl p-4 mb-4">
                <Text className="text-gray-700 text-sm font-bold mb-3">Requested Fields:</Text>
                <View className="flex-row flex-wrap">
                  {consent.requested_fields.map((field, index) => (
                    <View
                      key={index}
                      className="bg-blue-100 px-3 py-1.5 rounded-full mr-2 mb-2"
                    >
                      <Text className="text-blue-700 text-xs font-semibold capitalize">{field}</Text>
                    </View>
                  ))}
                </View>
              </View>

              <View className="flex-row space-x-3">
                <TouchableOpacity
                  className={`flex-1 bg-red-50 border border-red-200 rounded-xl py-3.5 items-center ${
                    processingId === consent.id ? 'opacity-50' : ''
                  }`}
                  onPress={() => handleReject(consent.id)}
                  disabled={processingId === consent.id}
                  activeOpacity={0.7}
                >
                  {processingId === consent.id ? (
                    <ActivityIndicator color="#dc2626" />
                  ) : (
                    <View className="flex-row items-center">
                      <Ionicons name="close-circle" size={20} color="#dc2626" />
                      <Text className="text-red-600 font-bold ml-2">Reject</Text>
                    </View>
                  )}
                </TouchableOpacity>
                <TouchableOpacity
                  className={`flex-1 bg-green-500 rounded-xl py-3.5 items-center ${
                    processingId === consent.id ? 'opacity-50' : ''
                  }`}
                  onPress={() => handleApprove(consent.id)}
                  disabled={processingId === consent.id}
                  activeOpacity={0.7}
                  style={{
                    shadowColor: '#16a34a',
                    shadowOffset: { width: 0, height: 2 },
                    shadowOpacity: 0.2,
                    shadowRadius: 4,
                    elevation: 3,
                  }}
                >
                  {processingId === consent.id ? (
                    <ActivityIndicator color=\"#ffffff\" />
                  ) : (
                    <View className="flex-row items-center">
                      <Ionicons name="checkmark-circle" size={20} color="#ffffff" />
                      <Text className=\"text-white font-bold ml-2\">Approve</Text>
                    </View>
                  )}
                </TouchableOpacity>
              </View>
            </View>
          ))
        )}
        <View className="h-6" />

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
