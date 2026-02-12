import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  ActivityIndicator,
  Modal,
  TextInput,
  Alert,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import DateTimePicker from '@react-native-community/datetimepicker';
import { getMyTokens, issueKYCToken } from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import QRCode from 'react-native-qrcode-svg';

interface Token {
  id: string;
  status: string;
  issued_at: string;
  token_json: any;
}

export default function TokensScreen() {
  const router = useRouter();
  const { userData } = useAuth();
  const [tokens, setTokens] = useState<Token[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [showIssueModal, setShowIssueModal] = useState(false);
  const [showQRModal, setShowQRModal] = useState(false);
  const [selectedToken, setSelectedToken] = useState<Token | null>(null);
  const [issuing, setIssuing] = useState(false);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [kycForm, setKycForm] = useState({
    name: '',
    pan: '',
    dob: '',
    address: '',
    phone: '',
  });
  const [dobDate, setDobDate] = useState(new Date(2000, 0, 1));

  const fetchTokens = async () => {
    try {
      const result = await getMyTokens();
      setTokens(result.tokens || []);
    } catch (error) {
      console.error('Error fetching tokens:', error);
    } finally {
      setIsLoading(false);
      setRefreshing(false);
    }
  };

  // Load user's name and phone when modal opens
  useEffect(() => {
    if (showIssueModal) {
      setKycForm(prev => ({ 
        ...prev, 
        name: userData?.name || '', 
        phone: userData?.phone || '' 
      }));
    }
  }, [showIssueModal, userData]);

  useEffect(() => {
    fetchTokens();
  }, []);

  const onRefresh = () => {
    setRefreshing(true);
    fetchTokens();
  };

  // PAN validation: 5 letters + 4 digits + 1 letter
  const validatePAN = (pan: string) => {
    const panRegex = /^[A-Z]{5}[0-9]{4}[A-Z]{1}$/;
    return panRegex.test(pan);
  };

  // Phone validation: 10 digits
  const validatePhone = (phone: string) => {
    const phoneRegex = /^[6-9][0-9]{9}$/;
    return phoneRegex.test(phone);
  };

  const formatPAN = (text: string) => {
    return text.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 10);
  };

  const formatPhone = (text: string) => {
    return text.replace(/[^0-9]/g, '').slice(0, 10);
  };

  const handleDateChange = (event: any, selectedDate?: Date) => {
    setShowDatePicker(Platform.OS === 'ios');
    if (selectedDate) {
      setDobDate(selectedDate);
      const formatted = selectedDate.toISOString().split('T')[0];
      setKycForm({ ...kycForm, dob: formatted });
    }
  };

  const handleIssueToken = async () => {
    if (!kycForm.name || !kycForm.pan || !kycForm.dob) {
      Alert.alert('Error', 'Please fill in all required fields (Name, PAN, DOB)');
      return;
    }

    if (!validatePAN(kycForm.pan)) {
      Alert.alert('Invalid PAN', 'PAN must be a valid 10-character alphanumeric code (e.g., ABCDE1234F)');
      return;
    }

    if (kycForm.phone && !validatePhone(kycForm.phone)) {
      Alert.alert('Invalid Phone', 'Phone number must be a valid 10-digit Indian mobile number');
      return;
    }

    setIssuing(true);
    try {
      const result = await issueKYCToken(kycForm);
      if (result.token_id) {
        Alert.alert('Success', 'KYC Token issued successfully!');
        setShowIssueModal(false);
        setKycForm({ name: '', pan: '', dob: '', address: '', phone: '' });
        fetchTokens();
      } else {
        Alert.alert('Error', result.detail || 'Failed to issue token');
      }
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to issue token');
    } finally {
      setIssuing(false);
    }
  };

  const openQRModal = (token: Token) => {
    setSelectedToken(token);
    setShowQRModal(true);
  };

  const generateQRData = (token: Token) => {
    return JSON.stringify({
      type: 'KYC_TOKEN',
      token_id: token.id,
      name: token.token_json?.credentialSubject?.name,
      status: token.status,
      issued_at: token.issued_at,
    });
  };

  const getStatusColor = (status: string) => {
    return status === 'active' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800';
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
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
        className="flex-1"
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      >
        <View className="px-4 py-6">

          {/* Issue New Token Button - Always visible */}
          <TouchableOpacity
            className="bg-blue-800 rounded-xl p-4 flex-row items-center justify-center mb-4"
            onPress={() => setShowIssueModal(true)}
          >
            <Ionicons name="add-circle" size={24} color="#ffffff" />
            <Text className="text-white font-semibold text-lg ml-2">Issue New KYC Token</Text>
          </TouchableOpacity>

          {/* Tokens List */}
          {tokens.length === 0 ? (
            <View className="flex-1 items-center justify-center py-16">
              <Ionicons name="wallet-outline" size={64} color="#9ca3af" />
              <Text className="text-gray-500 text-lg mt-4">No KYC tokens yet</Text>
              <Text className="text-gray-400 text-sm mt-1 text-center">Tap above to issue your first token</Text>
            </View>
          ) : (
            tokens.map((token) => (
              <TouchableOpacity
                key={token.id}
                className="bg-white rounded-xl p-4 mb-3 shadow-sm"
                onPress={() => router.push(`/token/${token.id}`)}
              >
                <View className="flex-row items-start justify-between">
                  <View className="flex-1">
                    <View className="flex-row items-center">
                      <Ionicons name="shield-checkmark" size={20} color="#1e40af" />
                      <Text className="font-semibold text-gray-800 ml-2">KYC Credential</Text>
                    </View>
                    <Text className="text-gray-500 text-sm mt-1">
                      {token.token_json?.credentialSubject?.name || 'N/A'}
                    </Text>
                    <Text className="text-gray-400 text-xs mt-1">
                      Issued: {formatDate(token.issued_at)}
                    </Text>
                  </View>
                  <View className="items-end">
                    <View
                      className={`px-3 py-1 rounded-full ${
                        token.status === 'active' ? 'bg-green-100' : 'bg-red-100'
                      }`}
                    >
                      <Text
                        className={`text-xs font-medium ${
                          token.status === 'active' ? 'text-green-800' : 'text-red-800'
                        }`}
                      >
                        {token.status.toUpperCase()}
                      </Text>
                    </View>
                    {token.status === 'active' && (
                      <TouchableOpacity
                        className="mt-2 bg-blue-100 rounded-lg px-2 py-1"
                        onPress={() => openQRModal(token)}
                      >
                        <Ionicons name="qr-code" size={20} color="#1e40af" />
                      </TouchableOpacity>
                    )}
                  </View>
                </View>
                <View className="flex-row items-center mt-3 pt-3 border-t border-gray-100">
                  <Ionicons name="key-outline" size={14} color="#9ca3af" />
                  <Text className="text-gray-400 text-xs ml-1 flex-1" numberOfLines={1}>
                    {token.id}
                  </Text>
                  <Ionicons name="chevron-forward" size={16} color="#9ca3af" />
                </View>
              </TouchableOpacity>
            ))
          )}
        </View>
      </ScrollView>

      {/* Issue Token Modal */}
      <Modal
        visible={showIssueModal}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setShowIssueModal(false)}
      >
        <View className="flex-1 bg-gray-100">
          <View className="bg-blue-800 px-4 py-4 flex-row items-center justify-between">
            <TouchableOpacity onPress={() => setShowIssueModal(false)}>
              <Text className="text-white text-lg">Cancel</Text>
            </TouchableOpacity>
            <Text className="text-white font-bold text-lg">Issue KYC Token</Text>
            <View className="w-16" />
          </View>

          <ScrollView className="flex-1 px-4 py-6">
            <View className="bg-white rounded-xl p-4">
              <View className="mb-4">
                <Text className="text-gray-700 font-medium mb-2">
                  Full Name (Verified) 
                  {userData?.name && <Text className="text-green-600"> ✓</Text>}
                </Text>
                <View className="bg-gray-100 border border-gray-200 rounded-xl px-4 py-3 flex-row items-center">
                  <Ionicons name="person" size={18} color="#64748b" />
                  <Text className="text-gray-700 ml-2 flex-1">
                    {kycForm.name || 'No name registered'}
                  </Text>
                  <Ionicons name="lock-closed" size={14} color="#22c55e" />
                </View>
                <Text className="text-gray-500 text-xs mt-1">
                  Name from your verified registration
                </Text>
              </View>

              <View className="mb-4">
                <Text className="text-gray-700 font-medium mb-2">PAN Number * (10 characters)</Text>
                <TextInput
                  className="bg-gray-50 border border-gray-200 rounded-xl px-4 py-3"
                  placeholder="e.g., ABCDE1234F"
                  value={kycForm.pan}
                  onChangeText={(text) => setKycForm({ ...kycForm, pan: formatPAN(text) })}
                  autoCapitalize="characters"
                  maxLength={10}
                />
                {kycForm.pan.length > 0 && !validatePAN(kycForm.pan) && (
                  <Text className="text-red-500 text-xs mt-1">
                    Format: 5 letters + 4 digits + 1 letter (e.g., ABCDE1234F)
                  </Text>
                )}
                {kycForm.pan.length === 10 && validatePAN(kycForm.pan) && (
                  <Text className="text-green-600 text-xs mt-1">✓ Valid PAN format</Text>
                )}
              </View>

              <View className="mb-4">
                <Text className="text-gray-700 font-medium mb-2">Date of Birth *</Text>
                <TouchableOpacity
                  className="bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 flex-row items-center justify-between"
                  onPress={() => setShowDatePicker(true)}
                >
                  <Text className={kycForm.dob ? 'text-gray-800' : 'text-gray-400'}>
                    {kycForm.dob || 'Select date of birth'}
                  </Text>
                  <Ionicons name="calendar" size={20} color="#6b7280" />
                </TouchableOpacity>
                {showDatePicker && (
                  <DateTimePicker
                    value={dobDate}
                    mode="date"
                    display={Platform.OS === 'ios' ? 'spinner' : 'default'}
                    onChange={handleDateChange}
                    maximumDate={new Date()}
                    minimumDate={new Date(1900, 0, 1)}
                  />
                )}
              </View>

              <View className="mb-4">
                <Text className="text-gray-700 font-medium mb-2">Address</Text>
                <TextInput
                  className="bg-gray-50 border border-gray-200 rounded-xl px-4 py-3"
                  placeholder="Enter address"
                  value={kycForm.address}
                  onChangeText={(text) => setKycForm({ ...kycForm, address: text })}
                  multiline
                />
              </View>

              <View className="mb-6">
                <Text className="text-gray-700 font-medium mb-2">
                  Phone (Verified) 
                  {userData?.phone && <Text className="text-green-600"> ✓</Text>}
                </Text>
                <View className="bg-gray-100 border border-gray-200 rounded-xl px-4 py-3 flex-row items-center">
                  <Ionicons name="phone-portrait" size={18} color="#64748b" />
                  <Text className="text-gray-700 ml-2 flex-1">
                    {kycForm.phone ? `+91 ${kycForm.phone}` : 'No phone number registered'}
                  </Text>
                  <Ionicons name="lock-closed" size={14} color="#22c55e" />
                </View>
                <Text className="text-gray-500 text-xs mt-1">
                  Phone number from your verified registration
                </Text>
              </View>

              <TouchableOpacity
                className={`bg-blue-800 rounded-xl py-4 items-center ${issuing ? 'opacity-70' : ''}`}
                onPress={handleIssueToken}
                disabled={issuing}
              >
                {issuing ? (
                  <ActivityIndicator color="#ffffff" />
                ) : (
                  <Text className="text-white font-semibold text-lg">Issue Token</Text>
                )}
              </TouchableOpacity>
            </View>
          </ScrollView>
        </View>
      </Modal>

      {/* Compact QR Code Modal */}
      {selectedToken && (
        <Modal
          visible={showQRModal}
          animationType="fade"
          transparent={true}
          onRequestClose={() => setShowQRModal(false)}
        >
          <View className="flex-1 bg-black/80 items-center justify-center px-8">
            <View className="bg-white rounded-2xl p-5 w-full shadow-2xl" style={{ maxWidth: 320 }}>
              {/* Header */}
              <View className="items-center mb-3">
                <View className="bg-blue-100 p-2 rounded-full mb-2">
                  <Ionicons name="shield-checkmark" size={24} color="#1e40af" />
                </View>
                <Text className="text-gray-800 font-bold text-lg">KYC Verification</Text>
                <Text className="text-gray-500 text-xs text-center mt-1">
                  Scan to verify identity
                </Text>
              </View>

              {/* QR Code */}
              <View className="items-center bg-white rounded-xl p-4 mb-3 border border-gray-100">
                <QRCode
                  value={generateQRData(selectedToken)}
                  size={180}
                  color="#1e3a8a"
                  backgroundColor="#ffffff"
                />
              </View>

              {/* Token Info */}
              <View className="bg-blue-50 rounded-xl p-3 mb-3">
                <View className="flex-row items-center justify-between mb-1">
                  <Text className="text-gray-600 text-xs">Name</Text>
                  <Text className="text-gray-800 font-medium text-sm">
                    {selectedToken.token_json?.credentialSubject?.name || 'N/A'}
                  </Text>
                </View>
                <View className="flex-row items-center justify-between">
                  <Text className="text-gray-600 text-xs">Token</Text>
                  <Text className="text-gray-700 text-xs font-mono">
                    {selectedToken.id.substring(0, 8)}...
                  </Text>
                </View>
              </View>

              {/* Actions */}
              <TouchableOpacity 
                className="bg-gray-100 rounded-xl py-2.5 items-center"
                onPress={() => setShowQRModal(false)}
              >
                <Text className="text-gray-700 font-medium text-sm">Close</Text>
              </TouchableOpacity>
            </View>
          </View>
        </Modal>
      )}
    </SafeAreaView>
  );
}
