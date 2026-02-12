import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  Alert,
  ActivityIndicator,
  Image,
  TextInput,
  Modal,
} from 'react-native';
import { useRouter } from 'expo-router';
import * as ImagePicker from 'expo-image-picker';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../../context/AuthContext';
import { 
  uploadDocument as uploadDocumentToSupabase, 
  getDocuments, 
  submitKYCForVerification 
} from '../../services/supabase';
import { uploadDocument as uploadDocumentWithVerification } from '../../services/api';

interface VerificationInfo {
  is_verified: boolean;
  verification_source?: string;
  verification_source_display?: string;
  issuer_name?: string;
  verified_at?: string;
  trust_score: number;
  trust_level?: string;
  badge_color: string;
}

interface DocumentType {
  type: string;
  name: string;
  description: string;
  required: boolean;
  uploaded?: boolean;
  status?: string;
  imageUri?: string;
  verification?: VerificationInfo;
  requiresNumber?: boolean;  // Does this doc need a number for verification?
  numberPlaceholder?: string;
  numberFormat?: string;
}

export default function KYCSubmitScreen() {
  const router = useRouter();
  const { user } = useAuth();
  const [isLoading, setIsLoading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showNumberModal, setShowNumberModal] = useState(false);
  const [currentDocType, setCurrentDocType] = useState<string>('');
  const [documentNumber, setDocumentNumber] = useState('');
  const [pendingImage, setPendingImage] = useState<ImagePicker.ImagePickerAsset | null>(null);
  const [documents, setDocuments] = useState<DocumentType[]>([
    {
      type: 'aadhaar_front',
      name: 'Aadhaar Card (Front)',
      description: 'Clear photo of the front side of your Aadhaar card',
      required: true,
      requiresNumber: true,
      numberPlaceholder: '12-digit Aadhaar Number',
      numberFormat: 'XXXX XXXX XXXX',
    },
    {
      type: 'aadhaar_back',
      name: 'Aadhaar Card (Back)',
      description: 'Clear photo of the back side of your Aadhaar card',
      required: true,
      requiresNumber: false,  // Same Aadhaar number as front
    },
    {
      type: 'pan_card',
      name: 'PAN Card',
      description: 'Clear photo of your PAN card',
      required: true,
      requiresNumber: true,
      numberPlaceholder: '10-character PAN Number',
      numberFormat: 'ABCDE1234F',
    },
    {
      type: 'selfie',
      name: 'Live Selfie',
      description: 'Take a clear selfie for identity verification',
      required: true,
      requiresNumber: false,
    },
  ]);

  useEffect(() => {
    if (user) {
      loadUploadedDocuments();
    }
  }, [user]);

  const loadUploadedDocuments = async () => {
    if (!user) return;
    
    try {
      const uploadedDocs = await getDocuments(user.id);
      
      setDocuments(prevDocs =>
        prevDocs.map(doc => {
          const uploaded = uploadedDocs.find(
            (d: any) => d.document_type === doc.type
          );
          if (uploaded) {
            return {
              ...doc,
              uploaded: true,
              status: uploaded.status,
              imageUri: uploaded.file_url,
              verification: {
                is_verified: uploaded.status === 'verified',
                verification_source: uploaded.verification_source,
                verification_source_display: uploaded.verification_source?.replace(/_/g, ' ').toUpperCase(),
                issuer_name: uploaded.issuer_name,
                verified_at: uploaded.verified_at,
                trust_score: uploaded.verification_source ? 100 : 0,
                trust_level: uploaded.verification_source ? 'Government Verified' : 'Unverified',
                badge_color: uploaded.status === 'verified' ? 'green' : 
                             uploaded.status === 'pending' ? 'yellow' : 'red',
              },
            };
          }
          return doc;
        })
      );
    } catch (error) {
      console.error('Error loading documents:', error);
    }
  };

  const pickImage = async (documentType: string, useCamera: boolean = false) => {
    try {
      const permissionResult = useCamera
        ? await ImagePicker.requestCameraPermissionsAsync()
        : await ImagePicker.requestMediaLibraryPermissionsAsync();

      if (!permissionResult.granted) {
        Alert.alert('Permission Required', 'Please grant camera/gallery access to upload documents.');
        return;
      }

      const result = useCamera
        ? await ImagePicker.launchCameraAsync({
            mediaTypes: ['images'],
            allowsEditing: true,
            aspect: [4, 3],
            quality: 0.8,
          })
        : await ImagePicker.launchImageLibraryAsync({
            mediaTypes: ['images'],
            allowsEditing: true,
            aspect: [4, 3],
            quality: 0.8,
          });

      if (!result.canceled && result.assets[0]) {
        const doc = documents.find(d => d.type === documentType);
        
        // If document requires a number for verification, show modal
        if (doc?.requiresNumber) {
          setPendingImage(result.assets[0]);
          setCurrentDocType(documentType);
          setDocumentNumber('');
          setShowNumberModal(true);
        } else {
          // Upload directly without number
          await uploadDocument(documentType, result.assets[0]);
        }
      }
    } catch (error) {
      console.error('Error picking image:', error);
      Alert.alert('Error', 'Failed to pick image');
    }
  };

  const handleConfirmDocumentNumber = async () => {
    if (!pendingImage || !currentDocType) return;
    
    setShowNumberModal(false);
    await uploadDocument(currentDocType, pendingImage, documentNumber || undefined);
    setPendingImage(null);
    setCurrentDocType('');
    setDocumentNumber('');
  };

  const handleSkipDocumentNumber = async () => {
    if (!pendingImage || !currentDocType) return;
    
    setShowNumberModal(false);
    await uploadDocument(currentDocType, pendingImage);
    setPendingImage(null);
    setCurrentDocType('');
    setDocumentNumber('');
  };

  const uploadDocument = async (documentType: string, imageAsset: ImagePicker.ImagePickerAsset, docNumber?: string) => {
    if (!user) {
      Alert.alert('Error', 'Please login to upload documents');
      return;
    }
    
    setIsLoading(true);
    try {
      const filename = imageAsset.uri.split('/').pop() || 'document.jpg';
      
      // Try backend API first (includes verification)
      let result;
      try {
        result = await uploadDocumentWithVerification(documentType, imageAsset.uri, filename, docNumber);
      } catch (apiError) {
        console.log('Backend API failed, falling back to Supabase:', apiError);
        // Fallback to direct Supabase upload
        await uploadDocumentToSupabase(user.id, documentType, imageAsset.uri, filename);
        result = { status: 'pending', verification: null };
      }
      
      const verificationInfo: VerificationInfo = result.verification || {
        is_verified: result.status === 'verified',
        verification_source: null,
        trust_score: 0,
        trust_level: 'Pending Verification',
        badge_color: 'yellow',
      };
      
      setDocuments(prevDocs =>
        prevDocs.map(doc =>
          doc.type === documentType
            ? { 
                ...doc, 
                uploaded: true, 
                status: result.status || 'pending', 
                imageUri: imageAsset.uri,
                verification: verificationInfo,
              }
            : doc
        )
      );
      
      // Show verification result
      if (verificationInfo.is_verified) {
        Alert.alert(
          '✅ Document Verified!',
          `Your ${documentType.replace(/_/g, ' ')} has been verified via ${verificationInfo.verification_source_display || 'Government API'}.\n\nTrust Level: ${verificationInfo.trust_level}`,
          [{ text: 'OK' }]
        );
      } else {
        Alert.alert('Success', 'Document uploaded. Verification pending.');
      }
    } catch (error: any) {
      console.error('Upload error:', error);
      Alert.alert('Error', error.message || 'Failed to upload document');
    } finally {
      setIsLoading(false);
    }
  };

  const showImageOptions = (documentType: string, docName: string) => {
    Alert.alert(
      `Upload ${docName}`,
      'Choose how to add your document',
      [
        {
          text: 'Take Photo',
          onPress: () => pickImage(documentType, true),
        },
        {
          text: 'Choose from Gallery',
          onPress: () => pickImage(documentType, false),
        },
        {
          text: 'Cancel',
          style: 'cancel',
        },
      ]
    );
  };

  const submitKYC = async () => {
    if (!user) {
      Alert.alert('Error', 'Please login to submit KYC');
      return;
    }
    
    const requiredDocs = documents.filter(d => d.required);
    const uploadedRequired = requiredDocs.filter(d => d.uploaded);
    
    if (uploadedRequired.length < requiredDocs.length) {
      Alert.alert(
        'Missing Documents',
        'Please upload all required documents before submitting.'
      );
      return;
    }

    setIsSubmitting(true);
    try {
      // Submit KYC for verification using Supabase
      await submitKYCForVerification(user.id);
      
      Alert.alert(
        'KYC Submitted',
        'Your documents have been submitted for verification. You will be notified once verified.',
        [{ text: 'OK', onPress: () => router.back() }]
      );
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to submit KYC for verification');
    } finally {
      setIsSubmitting(false);
    }
  };

  const getStatusColor = (status?: string) => {
    switch (status) {
      case 'verified':
        return 'bg-green-500';
      case 'rejected':
        return 'bg-red-500';
      case 'pending':
        return 'bg-yellow-500';
      default:
        return 'bg-gray-400';
    }
  };

  const getStatusIcon = (status?: string) => {
    switch (status) {
      case 'verified':
        return 'checkmark-circle';
      case 'rejected':
        return 'close-circle';
      case 'pending':
        return 'time';
      default:
        return 'cloud-upload';
    }
  };

  return (
    <ScrollView className="flex-1 bg-gray-100">
      <View className="p-4 pt-8">
        {/* Header */}
        <View className="bg-blue-800 rounded-2xl p-6 mb-6">
          <Text className="text-white text-2xl font-bold mb-2">KYC Verification</Text>
          <Text className="text-blue-200 mb-4">
            Upload your documents to complete KYC verification and receive your digital KYC token.
          </Text>
          
          {/* Verification Summary */}
          <View className="bg-blue-900/50 rounded-xl p-3 flex-row justify-around">
            <View className="items-center">
              <Text className="text-blue-200 text-xs">Uploaded</Text>
              <Text className="text-white font-bold text-lg">
                {documents.filter(d => d.uploaded).length}/{documents.length}
              </Text>
            </View>
            <View className="w-px bg-blue-700" />
            <View className="items-center">
              <Text className="text-blue-200 text-xs">Verified</Text>
              <View className="flex-row items-center">
                <Ionicons name="shield-checkmark" size={16} color="#22c55e" />
                <Text className="text-green-400 font-bold text-lg ml-1">
                  {documents.filter(d => d.verification?.is_verified).length}
                </Text>
              </View>
            </View>
            <View className="w-px bg-blue-700" />
            <View className="items-center">
              <Text className="text-blue-200 text-xs">Pending</Text>
              <Text className="text-yellow-400 font-bold text-lg">
                {documents.filter(d => d.uploaded && !d.verification?.is_verified).length}
              </Text>
            </View>
          </View>
          
          {/* Instructions inside header */}
          <View className="bg-blue-900/30 rounded-lg p-3 mt-4">
            <Text className="text-blue-100 text-xs">
              📋 Tips: Clear photos • All corners visible • No glare • Good lighting for selfie
            </Text>
          </View>
        </View>

        {/* Required Documents */}
        <Text className="text-gray-800 font-semibold text-lg mb-3">Required Documents</Text>
        
        {documents.map((doc, index) => (
          <TouchableOpacity
            key={doc.type}
            className={`bg-white rounded-xl p-4 mb-3 border-2 ${
              doc.uploaded ? 'border-green-400' : 'border-gray-200'
            }`}
            onPress={() => showImageOptions(doc.type, doc.name)}
            disabled={isLoading}
          >
            <View className="flex-row items-center">
              {doc.imageUri ? (
                <Image
                  source={{ uri: doc.imageUri }}
                  className="w-16 h-16 rounded-lg mr-4"
                  resizeMode="cover"
                />
              ) : (
                <View className="w-16 h-16 bg-gray-100 rounded-lg mr-4 items-center justify-center">
                  <Ionicons name="document-outline" size={32} color="#9ca3af" />
                </View>
              )}
              
              <View className="flex-1">
                <View className="flex-row items-center mb-1">
                  <Text className="text-gray-800 font-semibold">{doc.name}</Text>
                  {doc.required && (
                    <Text className="text-red-500 ml-1">*</Text>
                  )}
                </View>
                <Text className="text-gray-500 text-sm mb-2">{doc.description}</Text>
                
                {doc.uploaded && (
                  <View>
                    <View className="flex-row items-center mb-1">
                      <View className={`w-2 h-2 rounded-full ${getStatusColor(doc.status)} mr-2`} />
                      <Text className="text-gray-600 text-xs capitalize">{doc.status || 'Uploaded'}</Text>
                    </View>
                    
                    {/* Verification Badge */}
                    {doc.verification && (
                      <View className={`mt-1 px-2 py-1 rounded-md flex-row items-center ${
                        doc.verification.is_verified ? 'bg-green-100' : 
                        doc.status === 'pending' ? 'bg-yellow-100' : 'bg-red-100'
                      }`}>
                        <Ionicons 
                          name={doc.verification.is_verified ? 'shield-checkmark' : 
                                doc.status === 'pending' ? 'time-outline' : 'warning'} 
                          size={12} 
                          color={doc.verification.is_verified ? '#16a34a' : 
                                 doc.status === 'pending' ? '#ca8a04' : '#dc2626'} 
                        />
                        <Text className={`text-xs ml-1 font-medium ${
                          doc.verification.is_verified ? 'text-green-700' : 
                          doc.status === 'pending' ? 'text-yellow-700' : 'text-red-700'
                        }`}>
                          {doc.verification.is_verified 
                            ? doc.verification.verification_source_display || 'Verified'
                            : doc.status === 'pending' ? 'Verification Pending' : 'Unverified'
                          }
                        </Text>
                      </View>
                    )}
                    
                    {doc.verification?.issuer_name && doc.verification.is_verified && (
                      <Text className="text-xs text-gray-500 mt-1">
                        Issuer: {doc.verification.issuer_name}
                      </Text>
                    )}
                  </View>
                )}
              </View>
              
              <View className={`w-10 h-10 rounded-full items-center justify-center ${
                doc.uploaded ? getStatusColor(doc.status) : 'bg-gray-200'
              }`}>
                <Ionicons
                  name={doc.uploaded ? getStatusIcon(doc.status) : 'add'}
                  size={24}
                  color={doc.uploaded ? '#ffffff' : '#6b7280'}
                />
              </View>
            </View>
          </TouchableOpacity>
        ))}

        {/* Progress */}
        <View className="bg-white rounded-xl p-4 mb-4">
          <View className="flex-row justify-between mb-2">
            <Text className="text-gray-600">Upload Progress</Text>
            <Text className="text-blue-800 font-semibold">
              {documents.filter(d => d.uploaded).length}/{documents.length}
            </Text>
          </View>
          <View className="h-2 bg-gray-200 rounded-full overflow-hidden">
            <View
              className="h-full bg-blue-800 rounded-full"
              style={{
                width: `${(documents.filter(d => d.uploaded).length / documents.length) * 100}%`,
              }}
            />
          </View>
        </View>

        {/* Submit Button */}
        <TouchableOpacity
          className={`bg-blue-800 rounded-xl py-4 items-center mb-6 ${
            isSubmitting ? 'opacity-70' : ''
          }`}
          onPress={submitKYC}
          disabled={isSubmitting || isLoading}
        >
          {isSubmitting ? (
            <ActivityIndicator color="#ffffff" />
          ) : (
            <View className="flex-row items-center">
              <Ionicons name="shield-checkmark" size={24} color="#ffffff" />
              <Text className="text-white font-semibold text-lg ml-2">
                Submit for Verification
              </Text>
            </View>
          )}
        </TouchableOpacity>

        {/* Info */}
        <View className="bg-yellow-50 rounded-xl p-4 mb-6">
          <View className="flex-row items-start">
            <Ionicons name="information-circle" size={24} color="#d97706" />
            <View className="flex-1 ml-3">
              <Text className="text-yellow-800 font-semibold mb-1">Government Verification</Text>
              <Text className="text-yellow-700 text-sm">
                Documents are verified with official sources (UIDAI, NSDL, DigiLocker). 
                Enter your document number for instant verification.
              </Text>
            </View>
          </View>
        </View>
      </View>

      {/* Document Number Input Modal */}
      <Modal
        visible={showNumberModal}
        transparent
        animationType="slide"
        onRequestClose={() => setShowNumberModal(false)}
      >
        <View className="flex-1 bg-black/50 justify-end">
          <View className="bg-white rounded-t-3xl p-6">
            <View className="flex-row items-center mb-4">
              <View className="w-12 h-12 bg-blue-100 rounded-full items-center justify-center mr-3">
                <Ionicons name="shield-checkmark" size={24} color="#1e40af" />
              </View>
              <View className="flex-1">
                <Text className="text-gray-800 font-bold text-lg">
                  Enter Document Number
                </Text>
                <Text className="text-gray-500 text-sm">
                  For instant verification via Government APIs
                </Text>
              </View>
            </View>
            
            <View className="bg-green-50 p-3 rounded-lg mb-4">
              <Text className="text-green-800 text-sm">
                🔒 Your document number is only used for verification and is not stored or shared.
              </Text>
            </View>
            
            <Text className="text-gray-600 text-sm mb-2">
              {documents.find(d => d.type === currentDocType)?.name || 'Document'} Number
            </Text>
            <TextInput
              className="border border-gray-300 rounded-xl px-4 py-3 text-lg mb-4"
              placeholder={documents.find(d => d.type === currentDocType)?.numberPlaceholder || 'Enter number'}
              value={documentNumber}
              onChangeText={setDocumentNumber}
              keyboardType={currentDocType.includes('aadhaar') ? 'numeric' : 'default'}
              maxLength={currentDocType.includes('aadhaar') ? 12 : 10}
              autoCapitalize="characters"
            />
            
            <Text className="text-gray-400 text-xs mb-4 text-center">
              Format: {documents.find(d => d.type === currentDocType)?.numberFormat || 'Enter as shown on document'}
            </Text>
            
            <View className="flex-row space-x-3">
              <TouchableOpacity
                className="flex-1 bg-gray-200 rounded-xl py-4 items-center mr-2"
                onPress={handleSkipDocumentNumber}
              >
                <Text className="text-gray-700 font-semibold">Skip</Text>
              </TouchableOpacity>
              <TouchableOpacity
                className="flex-1 bg-blue-800 rounded-xl py-4 items-center ml-2"
                onPress={handleConfirmDocumentNumber}
              >
                <Text className="text-white font-semibold">Verify & Upload</Text>
              </TouchableOpacity>
            </View>
            
            <TouchableOpacity
              className="mt-4 py-2"
              onPress={() => {
                setShowNumberModal(false);
                setPendingImage(null);
              }}
            >
              <Text className="text-gray-500 text-center">Cancel</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Loading Overlay */}
      {isLoading && (
        <View className="absolute inset-0 bg-black/50 items-center justify-center">
          <View className="bg-white rounded-xl p-6 items-center">
            <ActivityIndicator size="large" color="#1e40af" />
            <Text className="text-gray-800 mt-4">Verifying document...</Text>
          </View>
        </View>
      )}
    </ScrollView>
  );
}
