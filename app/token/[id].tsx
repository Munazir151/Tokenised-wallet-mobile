import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  Animated,
  Share,
  Modal,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { getTokenDetails, revokeToken } from '../../services/api';
import QRCode from 'react-native-qrcode-svg';

export default function TokenDetailScreen() {
  const { id } = useLocalSearchParams();
  const router = useRouter();
  const [token, setToken] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [revoking, setRevoking] = useState(false);
  const [showQRModal, setShowQRModal] = useState(false);
  
  // Animations
  const pulseAnim = useRef(new Animated.Value(1)).current;
  
  useEffect(() => {
    // Pulse animation for QR button
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 1.05,
          duration: 1000,
          useNativeDriver: true,
        }),
        Animated.timing(pulseAnim, {
          toValue: 1,
          duration: 1000,
          useNativeDriver: true,
        }),
      ])
    ).start();
  }, []);

  useEffect(() => {
    fetchToken();
  }, [id]);

  const fetchToken = async () => {
    try {
      const result = await getTokenDetails(id as string);
      setToken(result);
    } catch (error) {
      console.error('Error fetching token:', error);
      Alert.alert('Error', 'Failed to load token details');
    } finally {
      setIsLoading(false);
    }
  };

  const handleRevoke = () => {
    Alert.alert(
      'Revoke Token',
      'Are you sure you want to revoke this KYC token? This action cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Revoke',
          style: 'destructive',
          onPress: async () => {
            setRevoking(true);
            try {
              const result = await revokeToken(id as string);
              if (result.status === 'revoked') {
                Alert.alert('Success', 'Token revoked successfully', [
                  { text: 'OK', onPress: () => router.back() },
                ]);
              } else {
                Alert.alert('Error', result.detail || 'Failed to revoke token');
              }
            } catch (error: any) {
              Alert.alert('Error', error.message || 'Failed to revoke token');
            } finally {
              setRevoking(false);
            }
          },
        },
      ]
    );
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const handleShare = async () => {
    try {
      await Share.share({
        message: `KYC Token ID: ${token.id}\n\nVerify at: https://kyc.verify.example/token/${token.id}`,
        title: 'Share KYC Token',
      });
    } catch (error) {
      console.log('Error sharing:', error);
    }
  };

  // Generate QR data with token verification info
  const generateQRData = () => {
    return JSON.stringify({
      type: 'KYC_TOKEN',
      token_id: token.id,
      name: credential?.credentialSubject?.name,
      status: token.status,
      issued_at: token.issued_at,
      hash: token.token_hash?.substring(0, 16),
      verify_url: `https://kyc.verify.example/token/${token.id}`,
    });
  };

  if (isLoading) {
    return (
      <View className="flex-1 items-center justify-center bg-gray-100">
        <ActivityIndicator size="large" color="#1e40af" />
      </View>
    );
  }

  if (!token) {
    return (
      <View className="flex-1 items-center justify-center bg-gray-100">
        <Ionicons name="warning" size={48} color="#ef4444" />
        <Text className="text-gray-600 mt-4">Token not found</Text>
      </View>
    );
  }

  const credential = token.token_json;
  const subject = credential?.credentialSubject || {};

  return (
    <ScrollView className="flex-1 bg-gray-100">
      {/* Status Banner */}
      <View
        className={`px-6 py-4 ${token.status === 'active' ? 'bg-green-500' : 'bg-red-500'}`}
      >
        <View className="flex-row items-center justify-center">
          <Ionicons
            name={token.status === 'active' ? 'checkmark-circle' : 'close-circle'}
            size={24}
            color="#ffffff"
          />
          <Text className="text-white font-bold text-lg ml-2">
            {token.status === 'active' ? 'Active Token' : 'Revoked Token'}
          </Text>
        </View>
      </View>

      <View className="px-4 py-6">
        

        {/* Token Info */}
        <View className="bg-white rounded-xl p-4 shadow-sm mb-4">
          <Text className="text-gray-500 text-sm font-medium mb-3">TOKEN INFORMATION</Text>
          
          <View className="mb-3">
            <Text className="text-gray-400 text-xs">Token ID</Text>
            <Text className="text-gray-800 text-sm" selectable>
              {token.id}
            </Text>
          </View>

          <View className="mb-3">
            <Text className="text-gray-400 text-xs">Issuer</Text>
            <Text className="text-gray-800">{credential?.issuer || 'N/A'}</Text>
          </View>

          <View className="mb-3">
            <Text className="text-gray-400 text-xs">Issued At</Text>
            <Text className="text-gray-800">{formatDate(token.issued_at)}</Text>
          </View>

          <View>
            <Text className="text-gray-400 text-xs">Hash</Text>
            <Text className="text-gray-600 text-xs font-mono" numberOfLines={2} selectable>
              {token.token_hash}
            </Text>
          </View>
        </View>

        {/* KYC Data */}
        <View className="bg-white rounded-xl p-4 shadow-sm mb-4">
          <Text className="text-gray-500 text-sm font-medium mb-3">KYC DATA</Text>

          <View className="mb-3">
            <Text className="text-gray-400 text-xs">Full Name</Text>
            <Text className="text-gray-800 text-lg font-semibold">{subject.name || 'N/A'}</Text>
          </View>

          <View className="flex-row mb-3">
            <View className="flex-1">
              <Text className="text-gray-400 text-xs">PAN Number</Text>
              <Text className="text-gray-800">{subject.pan || 'N/A'}</Text>
            </View>
            <View className="flex-1">
              <Text className="text-gray-400 text-xs">Date of Birth</Text>
              <Text className="text-gray-800">{subject.dob || 'N/A'}</Text>
            </View>
          </View>

          {subject.address && (
            <View className="mb-3">
              <Text className="text-gray-400 text-xs">Address</Text>
              <Text className="text-gray-800">{subject.address}</Text>
            </View>
          )}

          {subject.phone && (
            <View>
              <Text className="text-gray-400 text-xs">Phone</Text>
              <Text className="text-gray-800">{subject.phone}</Text>
            </View>
          )}
        </View>

        {/* Proof */}
        <View className="bg-white rounded-xl p-4 shadow-sm mb-4">
          <Text className="text-gray-500 text-sm font-medium mb-3">DIGITAL PROOF</Text>
          
          <View className="mb-3">
            <Text className="text-gray-400 text-xs">Proof Type</Text>
            <Text className="text-gray-800">{credential?.proof?.type || 'JWT'}</Text>
          </View>

          <View>
            <Text className="text-gray-400 text-xs">Signature</Text>
            <Text
              className="text-gray-600 text-xs font-mono bg-gray-50 p-2 rounded mt-1"
              numberOfLines={3}
            >
              {credential?.proof?.signature?.substring(0, 100)}...
            </Text>
          </View>
        </View>

        {/* Actions */}
        {token.status === 'active' && (
          <TouchableOpacity
            className={`bg-red-500 rounded-xl py-4 items-center ${revoking ? 'opacity-70' : ''}`}
            onPress={handleRevoke}
            disabled={revoking}
          >
            {revoking ? (
              <ActivityIndicator color="#ffffff" />
            ) : (
              <View className="flex-row items-center">
                <Ionicons name="close-circle" size={20} color="#ffffff" />
                <Text className="text-white font-semibold text-lg ml-2">Revoke Token</Text>
              </View>
            )}
          </TouchableOpacity>
        )}
      </View>

      {/* QR Code Modal */}
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
                value={generateQRData()}
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
                  {credential?.credentialSubject?.name || 'N/A'}
                </Text>
              </View>
              <View className="flex-row items-center justify-between">
                <Text className="text-gray-600 text-xs">Token</Text>
                <Text className="text-gray-700 text-xs font-mono">
                  {token.id.substring(0, 8)}...
                </Text>
              </View>
            </View>

            {/* Actions */}
            <View className="flex-row">
              <TouchableOpacity 
                className="flex-1 bg-gray-100 rounded-xl py-2.5 items-center mr-2"
                onPress={() => setShowQRModal(false)}
              >
                <Text className="text-gray-700 font-medium text-sm">Close</Text>
              </TouchableOpacity>
              
              <TouchableOpacity 
                className="flex-1 bg-blue-800 rounded-xl py-2.5 flex-row items-center justify-center ml-2"
                onPress={() => {
                  setShowQRModal(false);
                  handleShare();
                }}
              >
                <Ionicons name="share-outline" size={16} color="#ffffff" />
                <Text className="text-white font-medium text-sm ml-1">Share</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </ScrollView>
  );
}
