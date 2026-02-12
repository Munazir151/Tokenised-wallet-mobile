import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  Alert,
  Animated,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useLanguage } from '../../context/LanguageContext';

type Step = 'aadhaar' | 'otp' | 'verified';

// Mock UIDAI response data
const MOCK_AADHAAR_DATA = {
  name: 'Rahul Kumar',
  dob: '1990-05-15',
  gender: 'Male',
  address: '123, Main Street, Bangalore, Karnataka - 560001',
  photo: null, // Would contain base64 in real implementation
};

export default function EKYCVerifyScreen() {
  const router = useRouter();
  const { t } = useLanguage();
  
  const [step, setStep] = useState<Step>('aadhaar');
  const [aadhaarNumber, setAadhaarNumber] = useState('');
  const [otp, setOtp] = useState(['', '', '', '', '', '']);
  const [isLoading, setIsLoading] = useState(false);
  const [countdown, setCountdown] = useState(0);
  const [verifiedData, setVerifiedData] = useState<typeof MOCK_AADHAAR_DATA | null>(null);
  
  // Animations
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(50)).current;
  const checkmarkScale = useRef(new Animated.Value(0)).current;
  
  // OTP input refs
  const otpRefs = useRef<(TextInput | null)[]>([]);

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 500,
        useNativeDriver: true,
      }),
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: 500,
        useNativeDriver: true,
      }),
    ]).start();
  }, [step]);

  useEffect(() => {
    if (countdown > 0) {
      const timer = setTimeout(() => setCountdown(countdown - 1), 1000);
      return () => clearTimeout(timer);
    }
  }, [countdown]);

  const formatAadhaar = (text: string) => {
    const cleaned = text.replace(/\D/g, '').slice(0, 12);
    const formatted = cleaned.match(/.{1,4}/g)?.join(' ') || cleaned;
    return formatted;
  };

  const handleAadhaarChange = (text: string) => {
    const cleaned = text.replace(/\D/g, '');
    setAadhaarNumber(cleaned);
  };

  const handleSendOTP = async () => {
    if (aadhaarNumber.length !== 12) {
      Alert.alert('Invalid Aadhaar', 'Please enter a valid 12-digit Aadhaar number');
      return;
    }

    setIsLoading(true);
    
    // Simulate API call to UIDAI
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    setIsLoading(false);
    setStep('otp');
    setCountdown(60);
    
    // Reset animations for new step
    fadeAnim.setValue(0);
    slideAnim.setValue(50);
  };

  const handleOTPChange = (text: string, index: number) => {
    const newOtp = [...otp];
    newOtp[index] = text;
    setOtp(newOtp);
    
    // Auto-focus next input
    if (text && index < 5) {
      otpRefs.current[index + 1]?.focus();
    }
  };

  const handleOTPKeyPress = (e: any, index: number) => {
    if (e.nativeEvent.key === 'Backspace' && !otp[index] && index > 0) {
      otpRefs.current[index - 1]?.focus();
    }
  };

  const handleVerifyOTP = async () => {
    const enteredOTP = otp.join('');
    if (enteredOTP.length !== 6) {
      Alert.alert('Invalid OTP', 'Please enter the 6-digit OTP');
      return;
    }

    setIsLoading(true);
    
    // Simulate OTP verification
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    // Mock successful verification
    setVerifiedData(MOCK_AADHAAR_DATA);
    setIsLoading(false);
    setStep('verified');
    
    // Reset and play checkmark animation
    fadeAnim.setValue(0);
    slideAnim.setValue(50);
    checkmarkScale.setValue(0);
    
    Animated.sequence([
      Animated.parallel([
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 500,
          useNativeDriver: true,
        }),
        Animated.timing(slideAnim, {
          toValue: 0,
          duration: 500,
          useNativeDriver: true,
        }),
      ]),
      Animated.spring(checkmarkScale, {
        toValue: 1,
        friction: 3,
        tension: 100,
        useNativeDriver: true,
      }),
    ]).start();
  };

  const handleResendOTP = () => {
    if (countdown > 0) return;
    setCountdown(60);
    Alert.alert('OTP Sent', 'A new OTP has been sent to your registered mobile number');
  };

  const handleContinue = () => {
    // After successful eKYC, go to dashboard
    router.replace('/(tabs)/dashboard');
  };

  return (
    <SafeAreaView className="flex-1 bg-gray-100">
      <KeyboardAvoidingView 
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        className="flex-1"
      >
        {/* Header */}
        <View className="bg-blue-800 px-4 py-4 flex-row items-center">
          <TouchableOpacity onPress={() => router.back()} className="mr-4">
            <Ionicons name="arrow-back" size={24} color="#ffffff" />
          </TouchableOpacity>
          <View className="flex-1">
            <Text className="text-white font-bold text-lg">{t('verify_aadhaar')}</Text>
            <Text className="text-blue-200 text-sm">UIDAI eKYC Verification</Text>
          </View>
          <View className="bg-green-500 px-2 py-1 rounded">
            <Text className="text-white text-xs font-medium">MOCK</Text>
          </View>
        </View>

        <ScrollView className="flex-1 px-4 py-6">
          {/* Progress Steps */}
          <View className="flex-row items-center justify-center mb-8">
            {['aadhaar', 'otp', 'verified'].map((s, index) => (
              <React.Fragment key={s}>
                <View 
                  className={`w-10 h-10 rounded-full items-center justify-center ${
                    step === s ? 'bg-blue-800' : 
                    ['aadhaar', 'otp', 'verified'].indexOf(step) > index ? 'bg-green-500' : 'bg-gray-300'
                  }`}
                >
                  {['aadhaar', 'otp', 'verified'].indexOf(step) > index ? (
                    <Ionicons name="checkmark" size={20} color="#ffffff" />
                  ) : (
                    <Text className="text-white font-bold">{index + 1}</Text>
                  )}
                </View>
                {index < 2 && (
                  <View 
                    className={`w-16 h-1 ${
                      ['aadhaar', 'otp', 'verified'].indexOf(step) > index ? 'bg-green-500' : 'bg-gray-300'
                    }`} 
                  />
                )}
              </React.Fragment>
            ))}
          </View>

          <Animated.View
            style={{
              opacity: fadeAnim,
              transform: [{ translateY: slideAnim }],
            }}
          >
            {/* Step 1: Aadhaar Input */}
            {step === 'aadhaar' && (
              <View className="bg-white rounded-2xl p-6 shadow-sm">
                <View className="items-center mb-6">
                  <View className="w-20 h-20 bg-orange-100 rounded-full items-center justify-center mb-4">
                    <Ionicons name="finger-print" size={40} color="#f97316" />
                  </View>
                  <Text className="text-gray-800 font-bold text-xl text-center">
                    Enter Aadhaar Number
                  </Text>
                  <Text className="text-gray-500 text-center mt-2">
                    We'll send an OTP to your Aadhaar-linked mobile number
                  </Text>
                </View>

                <View className="mb-6">
                  <Text className="text-gray-700 font-medium mb-2">{t('enter_aadhaar')}</Text>
                  <TextInput
                    className="bg-gray-50 border border-gray-200 rounded-xl px-4 py-4 text-center text-2xl font-mono tracking-widest"
                    placeholder="0000 0000 0000"
                    value={formatAadhaar(aadhaarNumber)}
                    onChangeText={handleAadhaarChange}
                    keyboardType="number-pad"
                    maxLength={14}
                  />
                </View>

                <View className="bg-blue-50 rounded-xl p-4 mb-6">
                  <View className="flex-row items-center">
                    <Ionicons name="shield-checkmark" size={20} color="#1e40af" />
                    <Text className="text-blue-800 font-medium ml-2">Secure Verification</Text>
                  </View>
                  <Text className="text-blue-600 text-sm mt-1">
                    Your data is encrypted and verified directly with UIDAI
                  </Text>
                </View>

                <TouchableOpacity
                  className={`bg-blue-800 rounded-xl py-4 items-center ${isLoading ? 'opacity-70' : ''}`}
                  onPress={handleSendOTP}
                  disabled={isLoading}
                >
                  {isLoading ? (
                    <ActivityIndicator color="#ffffff" />
                  ) : (
                    <View className="flex-row items-center">
                      <Ionicons name="send" size={20} color="#ffffff" />
                      <Text className="text-white font-semibold text-lg ml-2">{t('send_otp')}</Text>
                    </View>
                  )}
                </TouchableOpacity>
              </View>
            )}

            {/* Step 2: OTP Verification */}
            {step === 'otp' && (
              <View className="bg-white rounded-2xl p-6 shadow-sm">
                <View className="items-center mb-6">
                  <View className="w-20 h-20 bg-blue-100 rounded-full items-center justify-center mb-4">
                    <Ionicons name="chatbox-ellipses" size={40} color="#1e40af" />
                  </View>
                  <Text className="text-gray-800 font-bold text-xl text-center">
                    Verify OTP
                  </Text>
                  <Text className="text-gray-500 text-center mt-2">
                    Enter the 6-digit OTP sent to your registered mobile
                  </Text>
                  <Text className="text-blue-800 font-medium mt-1">
                    ******{aadhaarNumber.slice(-4)}
                  </Text>
                </View>

                {/* OTP Input */}
                <View className="flex-row justify-center space-x-2 mb-6">
                  {otp.map((digit, index) => (
                    <TextInput
                      key={index}
                      ref={(ref) => { otpRefs.current[index] = ref; }}
                      className="w-12 h-14 bg-gray-50 border border-gray-200 rounded-xl text-center text-2xl font-bold"
                      value={digit}
                      onChangeText={(text) => handleOTPChange(text, index)}
                      onKeyPress={(e) => handleOTPKeyPress(e, index)}
                      keyboardType="number-pad"
                      maxLength={1}
                    />
                  ))}
                </View>

                {/* Resend OTP */}
                <View className="items-center mb-6">
                  {countdown > 0 ? (
                    <Text className="text-gray-500">
                      Resend OTP in <Text className="text-blue-800 font-bold">{countdown}s</Text>
                    </Text>
                  ) : (
                    <TouchableOpacity onPress={handleResendOTP}>
                      <Text className="text-blue-800 font-medium">Resend OTP</Text>
                    </TouchableOpacity>
                  )}
                </View>

                <View className="flex-row space-x-3">
                  <TouchableOpacity
                    className="flex-1 bg-gray-100 rounded-xl py-4 items-center mr-2"
                    onPress={() => setStep('aadhaar')}
                  >
                    <Text className="text-gray-700 font-semibold">Back</Text>
                  </TouchableOpacity>
                  
                  <TouchableOpacity
                    className={`flex-1 bg-blue-800 rounded-xl py-4 items-center ml-2 ${isLoading ? 'opacity-70' : ''}`}
                    onPress={handleVerifyOTP}
                    disabled={isLoading}
                  >
                    {isLoading ? (
                      <ActivityIndicator color="#ffffff" />
                    ) : (
                      <Text className="text-white font-semibold">{t('verify_otp')}</Text>
                    )}
                  </TouchableOpacity>
                </View>
              </View>
            )}

            {/* Step 3: Verified */}
            {step === 'verified' && verifiedData && (
              <View>
                {/* Success Card */}
                <View className="bg-green-500 rounded-2xl p-6 shadow-sm items-center mb-4">
                  <Animated.View
                    style={{ transform: [{ scale: checkmarkScale }] }}
                    className="w-20 h-20 bg-white rounded-full items-center justify-center mb-4"
                  >
                    <Ionicons name="checkmark-circle" size={60} color="#22c55e" />
                  </Animated.View>
                  <Text className="text-white font-bold text-xl text-center">
                    {t('aadhaar_verified')}
                  </Text>
                  <Text className="text-green-100 text-center mt-2">
                    Your identity has been verified via UIDAI
                  </Text>
                </View>

                {/* Verified Data */}
                <View className="bg-white rounded-2xl p-6 shadow-sm mb-4">
                  <View className="flex-row items-center mb-4">
                    <Ionicons name="shield-checkmark" size={24} color="#22c55e" />
                    <Text className="text-gray-800 font-bold text-lg ml-2">Verified Details</Text>
                  </View>

                  <View className="bg-gray-50 rounded-xl p-4">
                    <View className="mb-3">
                      <Text className="text-gray-400 text-xs">Full Name</Text>
                      <Text className="text-gray-800 font-semibold text-lg">{verifiedData.name}</Text>
                    </View>

                    <View className="flex-row mb-3">
                      <View className="flex-1">
                        <Text className="text-gray-400 text-xs">Date of Birth</Text>
                        <Text className="text-gray-800">{verifiedData.dob}</Text>
                      </View>
                      <View className="flex-1">
                        <Text className="text-gray-400 text-xs">Gender</Text>
                        <Text className="text-gray-800">{verifiedData.gender}</Text>
                      </View>
                    </View>

                    <View>
                      <Text className="text-gray-400 text-xs">Address</Text>
                      <Text className="text-gray-800">{verifiedData.address}</Text>
                    </View>
                  </View>

                  <View className="mt-4 pt-4 border-t border-gray-100">
                    <View className="flex-row items-center">
                      <Ionicons name="finger-print" size={16} color="#9ca3af" />
                      <Text className="text-gray-400 text-xs ml-2">
                        Aadhaar: XXXX XXXX {aadhaarNumber.slice(-4)}
                      </Text>
                    </View>
                    <View className="flex-row items-center mt-1">
                      <Ionicons name="time" size={16} color="#9ca3af" />
                      <Text className="text-gray-400 text-xs ml-2">
                        Verified on: {new Date().toLocaleString()}
                      </Text>
                    </View>
                  </View>
                </View>

                <TouchableOpacity
                  className="bg-blue-800 rounded-xl py-4 items-center"
                  onPress={handleContinue}
                >
                  <Text className="text-white font-semibold text-lg">Continue</Text>
                </TouchableOpacity>
              </View>
            )}
          </Animated.View>

          {/* UIDAI Disclaimer */}
          <View className="mt-6 items-center">
            <View className="flex-row items-center">
              <Text className="text-gray-400 text-xs">Powered by </Text>
              <Text className="text-gray-500 text-xs font-bold">UIDAI</Text>
            </View>
            <Text className="text-gray-400 text-xs text-center mt-1">
              This is a demo simulation. In production, this connects to real UIDAI servers.
            </Text>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
