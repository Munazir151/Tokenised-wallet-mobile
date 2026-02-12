import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Animated,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter, Link } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { signUp, getOrCreateUserProfile } from '../../services/supabase';
import { useAuth } from '../../context/AuthContext';
import { supabase } from '../../config/supabase';

type Step = 'details' | 'mobile_otp' | 'aadhaar' | 'otp' | 'complete';

export default function RegisterScreen() {
  const [step, setStep] = useState<Step>('details');
  const [showPassword, setShowPassword] = useState(false);
  
  // Step 1: Basic Details
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [mobileNumber, setMobileNumber] = useState('');
  const [mobileOtp, setMobileOtp] = useState(['', '', '', '', '', '']);
  const [mobileCountdown, setMobileCountdown] = useState(0);
  
  // Step 2: Aadhaar Verification
  const [aadhaarNumber, setAadhaarNumber] = useState('');
  const [otp, setOtp] = useState(['', '', '', '', '', '']);
  const [countdown, setCountdown] = useState(0);
  
  const [isLoading, setIsLoading] = useState(false);
  const [userId, setUserId] = useState<string | null>(null);
  
  const router = useRouter();
  const { setUserData } = useAuth();
  
  // OTP input refs
  const otpRefs = useRef<(TextInput | null)[]>([]);
  const mobileOtpRefs = useRef<(TextInput | null)[]>([]);
  
  // Animations
  const fadeAnim = useRef(new Animated.Value(1)).current;
  const slideAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (countdown > 0) {
      const timer = setTimeout(() => setCountdown(countdown - 1), 1000);
      return () => clearTimeout(timer);
    }
  }, [countdown]);

  useEffect(() => {
    if (mobileCountdown > 0) {
      const timer = setTimeout(() => setMobileCountdown(mobileCountdown - 1), 1000);
      return () => clearTimeout(timer);
    }
  }, [mobileCountdown]);

  const animateTransition = () => {
    Animated.sequence([
      Animated.timing(fadeAnim, {
        toValue: 0,
        duration: 150,
        useNativeDriver: true,
      }),
      Animated.timing(slideAnim, {
        toValue: 50,
        duration: 0,
        useNativeDriver: true,
      }),
      Animated.parallel([
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 300,
          useNativeDriver: true,
        }),
        Animated.timing(slideAnim, {
          toValue: 0,
          duration: 300,
          useNativeDriver: true,
        }),
      ]),
    ]).start();
  };

  const handleDetailsSubmit = async () => {
    if (!name || !email || !password || !mobileNumber) {
      Alert.alert('Error', 'Please fill in all fields');
      return;
    }

    // Validate mobile number
    const cleanedMobile = mobileNumber.replace(/\D/g, '');
    if (cleanedMobile.length !== 10 || !/^[6-9]/.test(cleanedMobile)) {
      Alert.alert('Error', 'Please enter a valid 10-digit mobile number');
      return;
    }

    if (password.length < 6) {
      Alert.alert('Error', 'Password must be at least 6 characters');
      return;
    }

    setIsLoading(true);
    
    // Simulate sending OTP to mobile
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    setIsLoading(false);
    setMobileCountdown(60);
    animateTransition();
    setStep('mobile_otp');
  };

  const formatMobile = (text: string) => {
    const cleaned = text.replace(/\D/g, '').slice(0, 10);
    return cleaned;
  };

  const handleMobileOTPChange = (text: string, index: number) => {
    const newOtp = [...mobileOtp];
    newOtp[index] = text;
    setMobileOtp(newOtp);
    
    if (text && index < 5) {
      mobileOtpRefs.current[index + 1]?.focus();
    }
  };

  const handleMobileOTPKeyPress = (e: any, index: number) => {
    if (e.nativeEvent.key === 'Backspace' && !mobileOtp[index] && index > 0) {
      mobileOtpRefs.current[index - 1]?.focus();
    }
  };

  const handleVerifyMobileOTP = async () => {
    const enteredOTP = mobileOtp.join('');
    if (enteredOTP.length !== 6) {
      Alert.alert('Invalid OTP', 'Please enter the 6-digit OTP');
      return;
    }

    setIsLoading(true);
    
    try {
      // Create account after mobile verification
      const { user, session } = await signUp(email, password, name);
      
      if (user) {
        setUserId(user.id);
        
        // Save profile with mobile number
        const profile = await getOrCreateUserProfile(user.id, email, name);
        
        // Update profile with mobile number in users table
        await supabase
          .from('users')
          .update({ phone: mobileNumber })
          .eq('id', user.id);
        
        setUserData({ ...profile, phone: mobileNumber });
        
        // Move to Aadhaar verification step
        animateTransition();
        setStep('aadhaar');
      } else {
        Alert.alert('Error', 'Failed to create account');
      }
    } catch (error: any) {
      const errorMessage = error.message || 'Failed to create account';
      if (errorMessage.toLowerCase().includes('already registered') || errorMessage.toLowerCase().includes('already exists') || errorMessage.toLowerCase().includes('user already')) {
        Alert.alert(
          'Account Exists',
          'This email is already registered. Would you like to login instead?',
          [
            { text: 'Cancel', style: 'cancel' },
            { text: 'Go to Login', onPress: () => router.replace('/(auth)/login') }
          ]
        );
      } else {
        Alert.alert('Registration Failed', errorMessage);
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleResendMobileOTP = () => {
    if (mobileCountdown > 0) return;
    setMobileCountdown(60);
    setMobileOtp(['', '', '', '', '', '']);
  };

  const formatAadhaar = (text: string) => {
    const cleaned = text.replace(/\D/g, '').slice(0, 12);
    return cleaned.match(/.{1,4}/g)?.join(' ') || cleaned;
  };

  const handleSendOTP = async () => {
    const cleaned = aadhaarNumber.replace(/\D/g, '');
    if (cleaned.length !== 12) {
      Alert.alert('Invalid Aadhaar', 'Please enter a valid 12-digit Aadhaar number');
      return;
    }

    setIsLoading(true);
    
    // Simulate API call to UIDAI
    await new Promise(resolve => setTimeout(resolve, 1500));
    
    setIsLoading(false);
    setCountdown(60);
    animateTransition();
    setStep('otp');
  };

  const handleOTPChange = (text: string, index: number) => {
    const newOtp = [...otp];
    newOtp[index] = text;
    setOtp(newOtp);
    
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
    await new Promise(resolve => setTimeout(resolve, 1500));
    
    setIsLoading(false);
    animateTransition();
    setStep('complete');
    
    // Auto navigate to dashboard after 2 seconds
    setTimeout(() => {
      router.replace('/(tabs)/dashboard');
    }, 2000);
  };

  const handleResendOTP = () => {
    if (countdown > 0) return;
    setCountdown(60);
    setOtp(['', '', '', '', '', '']);
  };

  const renderProgressBar = () => {
    const steps = ['details', 'mobile_otp', 'aadhaar', 'otp', 'complete'];
    const currentIndex = steps.indexOf(step);
    
    return (
      <View className="flex-row items-center justify-center px-2">
        {steps.map((s, index) => (
          <React.Fragment key={s}>
            <View 
              className={`w-7 h-7 rounded-full items-center justify-center ${
                index <= currentIndex ? 'bg-white' : 'bg-blue-700'
              }`}
            >
              {index < currentIndex ? (
                <Ionicons name="checkmark" size={14} color="#1e3a8a" />
              ) : (
                <Text className={`font-bold text-xs ${index <= currentIndex ? 'text-blue-900' : 'text-blue-300'}`}>
                  {index + 1}
                </Text>
              )}
            </View>
            {index < steps.length - 1 && (
              <View 
                className={`h-0.5 flex-1 mx-1 ${
                  index < currentIndex ? 'bg-white' : 'bg-blue-700'
                }`}
              />
            )}
          </React.Fragment>
        ))}
      </View>
    );
  };

  const getHeaderTitle = () => {
    switch (step) {
      case 'details': return 'Create Account';
      case 'mobile_otp': return 'Verify Mobile';
      case 'aadhaar': return 'Verify Identity';
      case 'otp': return 'Aadhaar OTP';
      case 'complete': return 'All Done!';
    }
  };

  const getHeaderSubtitle = () => {
    switch (step) {
      case 'details': return 'Fill in your details to get started';
      case 'mobile_otp': return 'Enter OTP sent to your mobile';
      case 'aadhaar': return 'Enter your Aadhaar for eKYC';
      case 'otp': return 'Enter OTP sent to Aadhaar mobile';
      case 'complete': return 'Your account is ready';
    }
  };

  return (
    <SafeAreaView className="flex-1 bg-blue-900" edges={['top']}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        className="flex-1"
      >
        <ScrollView 
          contentContainerStyle={{ flexGrow: 1 }}
          className="bg-slate-50"
          showsVerticalScrollIndicator={false}
        >
          {/* Header Section - Same as Login */}
          <View className="bg-blue-900 px-6 pt-6 pb-14 items-center">
            {/* Official Emblem */}
            <View 
              className="w-20 h-20 bg-white rounded-full items-center justify-center mb-4"
              style={{
                shadowColor: '#1e3a8a',
                shadowOffset: { width: 0, height: 4 },
                shadowOpacity: 0.3,
                shadowRadius: 8,
                elevation: 8,
              }}
            >
              <Ionicons name="shield-checkmark" size={40} color="#1e3a8a" />
            </View>
            <Text className="text-white text-xl font-bold tracking-wide">{getHeaderTitle()}</Text>
            <Text className="text-blue-200 text-sm mt-1">{getHeaderSubtitle()}</Text>
            
            {/* Progress Bar */}
            <View className="w-full mt-4">
              {renderProgressBar()}
            </View>
          </View>

          {/* Form Card - Same style as Login */}
          <View className="flex-1 px-5 -mt-8">
            <Animated.View 
              style={{ 
                opacity: fadeAnim, 
                transform: [{ translateY: slideAnim }] 
              }}
            >
              {/* Step 1: Basic Details */}
              {step === 'details' && (
                <View 
                  className="bg-white rounded-2xl p-6 border border-slate-100"
                  style={{
                    shadowColor: '#1e3a8a',
                    shadowOffset: { width: 0, height: 4 },
                    shadowOpacity: 0.08,
                    shadowRadius: 16,
                    elevation: 8,
                  }}
                >
                  {/* Full Name */}
                  <View className="mb-4">
                    <Text className="text-slate-700 font-semibold text-sm mb-2">Full Name</Text>
                    <View className="flex-row items-center bg-slate-50 border border-slate-200 rounded-xl px-4">
                      <Ionicons name="person-outline" size={20} color="#64748b" />
                      <TextInput
                        className="flex-1 py-4 px-3 text-slate-800"
                        placeholder="Enter your full name"
                        placeholderTextColor="#94a3b8"
                        value={name}
                        onChangeText={setName}
                      />
                    </View>
                  </View>

                  {/* Email */}
                  <View className="mb-4">
                    <Text className="text-slate-700 font-semibold text-sm mb-2">Email Address</Text>
                    <View className="flex-row items-center bg-slate-50 border border-slate-200 rounded-xl px-4">
                      <Ionicons name="mail-outline" size={20} color="#64748b" />
                      <TextInput
                        className="flex-1 py-4 px-3 text-slate-800"
                        placeholder="Enter your email"
                        placeholderTextColor="#94a3b8"
                        value={email}
                        onChangeText={setEmail}
                        keyboardType="email-address"
                        autoCapitalize="none"
                      />
                    </View>
                  </View>

                  {/* Password */}
                  <View className="mb-4">
                    <Text className="text-slate-700 font-semibold text-sm mb-2">Password</Text>
                    <View className="flex-row items-center bg-slate-50 border border-slate-200 rounded-xl px-4">
                      <Ionicons name="lock-closed-outline" size={20} color="#64748b" />
                      <TextInput
                        className="flex-1 py-4 px-3 text-slate-800"
                        placeholder="Create a password"
                        placeholderTextColor="#94a3b8"
                        value={password}
                        onChangeText={setPassword}
                        secureTextEntry={!showPassword}
                      />
                      <TouchableOpacity onPress={() => setShowPassword(!showPassword)}>
                        <Ionicons 
                          name={showPassword ? "eye-outline" : "eye-off-outline"} 
                          size={20} 
                          color="#64748b" 
                        />
                      </TouchableOpacity>
                    </View>
                  </View>

                  {/* Mobile Number */}
                  <View className="mb-6">
                    <Text className="text-slate-700 font-semibold text-sm mb-2">Mobile Number</Text>
                    <View className="flex-row items-center bg-slate-50 border border-slate-200 rounded-xl px-4">
                      <Text className="text-slate-600 font-medium">+91</Text>
                      <TextInput
                        className="flex-1 py-4 px-3 text-slate-800"
                        placeholder="Enter 10-digit mobile number"
                        placeholderTextColor="#94a3b8"
                        value={mobileNumber}
                        onChangeText={(text) => setMobileNumber(formatMobile(text))}
                        keyboardType="phone-pad"
                        maxLength={10}
                      />
                    </View>
                    {mobileNumber.length > 0 && mobileNumber.length < 10 && (
                      <Text className="text-orange-500 text-xs mt-1">Enter 10 digits</Text>
                    )}
                    {mobileNumber.length === 10 && !/^[6-9]/.test(mobileNumber) && (
                      <Text className="text-red-500 text-xs mt-1">Must start with 6, 7, 8, or 9</Text>
                    )}
                    {mobileNumber.length === 10 && /^[6-9]/.test(mobileNumber) && (
                      <Text className="text-green-600 text-xs mt-1">✓ Valid mobile number</Text>
                    )}
                  </View>

                  {/* Continue Button */}
                  <TouchableOpacity
                    className={`bg-blue-900 rounded-xl py-4 items-center flex-row justify-center ${isLoading ? 'opacity-70' : ''}`}
                    onPress={handleDetailsSubmit}
                    disabled={isLoading}
                    style={{
                      shadowColor: '#1e3a8a',
                      shadowOffset: { width: 0, height: 4 },
                      shadowOpacity: 0.3,
                      shadowRadius: 8,
                      elevation: 6,
                    }}
                  >
                    {isLoading ? (
                      <ActivityIndicator color="#ffffff" />
                    ) : (
                      <>
                        <Text className="text-white font-bold text-lg">Continue</Text>
                        <Ionicons name="arrow-forward" size={20} color="#ffffff" style={{ marginLeft: 8 }} />
                      </>
                    )}
                  </TouchableOpacity>
                </View>
              )}

              {/* Step 2: Mobile OTP Verification */}
              {step === 'mobile_otp' && (
                <View 
                  className="bg-white rounded-2xl p-6 border border-slate-100"
                  style={{
                    shadowColor: '#1e3a8a',
                    shadowOffset: { width: 0, height: 4 },
                    shadowOpacity: 0.08,
                    shadowRadius: 16,
                    elevation: 8,
                  }}
                >
                  <View className="items-center mb-5">
                    <View className="bg-blue-100 p-4 rounded-full mb-3">
                      <Ionicons name="phone-portrait" size={36} color="#1e40af" />
                    </View>
                    <Text className="text-slate-600 text-center text-sm">
                      Enter the 6-digit OTP sent to{'\n'}
                      <Text className="font-bold text-slate-800">+91 {mobileNumber}</Text>
                    </Text>
                  </View>

                  {/* OTP Input Boxes */}
                  <View className="flex-row justify-center mb-5">
                    {mobileOtp.map((digit, index) => (
                      <TextInput
                        key={index}
                        ref={(ref) => { mobileOtpRefs.current[index] = ref; }}
                        className="w-12 h-14 bg-slate-50 border-2 border-slate-200 rounded-xl text-center text-xl font-bold mx-1 text-slate-800"
                        value={digit}
                        onChangeText={(text) => handleMobileOTPChange(text, index)}
                        onKeyPress={(e) => handleMobileOTPKeyPress(e, index)}
                        keyboardType="numeric"
                        maxLength={1}
                        selectTextOnFocus
                      />
                    ))}
                  </View>

                  {/* Resend Timer */}
                  <View className="items-center mb-5">
                    {mobileCountdown > 0 ? (
                      <Text className="text-slate-500 text-sm">
                        Resend OTP in <Text className="text-blue-800 font-bold">{mobileCountdown}s</Text>
                      </Text>
                    ) : (
                      <TouchableOpacity onPress={handleResendMobileOTP}>
                        <Text className="text-blue-800 font-semibold">Resend OTP</Text>
                      </TouchableOpacity>
                    )}
                  </View>

                  <TouchableOpacity
                    className={`bg-blue-800 rounded-xl py-4 items-center flex-row justify-center ${isLoading ? 'opacity-70' : ''}`}
                    onPress={handleVerifyMobileOTP}
                    disabled={isLoading}
                    style={{
                      shadowColor: '#1e3a8a',
                      shadowOffset: { width: 0, height: 4 },
                      shadowOpacity: 0.3,
                      shadowRadius: 8,
                      elevation: 6,
                    }}
                  >
                    {isLoading ? (
                      <ActivityIndicator color="#ffffff" />
                    ) : (
                      <>
                        <Ionicons name="checkmark-circle" size={20} color="#ffffff" />
                        <Text className="text-white font-bold text-lg ml-2">Verify & Continue</Text>
                      </>
                    )}
                  </TouchableOpacity>
                </View>
              )}

              {/* Step 3: Aadhaar Input */}
              {step === 'aadhaar' && (
                <View 
                  className="bg-white rounded-2xl p-6 border border-slate-100"
                  style={{
                    shadowColor: '#1e3a8a',
                    shadowOffset: { width: 0, height: 4 },
                    shadowOpacity: 0.08,
                    shadowRadius: 16,
                    elevation: 8,
                  }}
                >
                  <View className="items-center mb-5">
                    <View className="bg-orange-100 p-4 rounded-full mb-3">
                      <Ionicons name="finger-print" size={36} color="#f97316" />
                    </View>
                    <Text className="text-slate-600 text-center text-sm">
                      Enter your Aadhaar number for UIDAI eKYC verification
                    </Text>
                  </View>

                  <View className="mb-4">
                    <Text className="text-slate-700 font-semibold text-sm mb-2">Aadhaar Number</Text>
                    <View className="flex-row items-center bg-slate-50 border border-slate-200 rounded-xl px-4">
                      <Ionicons name="card-outline" size={20} color="#64748b" />
                      <TextInput
                        className="flex-1 py-4 px-3 text-slate-800 text-center text-lg tracking-widest"
                        placeholder="XXXX XXXX XXXX"
                        placeholderTextColor="#94a3b8"
                        value={formatAadhaar(aadhaarNumber)}
                        onChangeText={(text) => setAadhaarNumber(text.replace(/\D/g, ''))}
                        keyboardType="numeric"
                        maxLength={14}
                      />
                    </View>
                  </View>

                  <View className="bg-blue-50 rounded-xl p-4 mb-5 flex-row items-center">
                    <Ionicons name="shield-checkmark" size={20} color="#1e40af" />
                    <Text className="text-blue-800 text-xs ml-3 flex-1">
                      Your data is encrypted & verified directly with UIDAI
                    </Text>
                  </View>

                  <TouchableOpacity
                    className={`bg-orange-500 rounded-xl py-4 items-center flex-row justify-center ${isLoading ? 'opacity-70' : ''}`}
                    onPress={handleSendOTP}
                    disabled={isLoading}
                    style={{
                      shadowColor: '#f97316',
                      shadowOffset: { width: 0, height: 4 },
                      shadowOpacity: 0.3,
                      shadowRadius: 8,
                      elevation: 6,
                    }}
                  >
                    {isLoading ? (
                      <ActivityIndicator color="#ffffff" />
                    ) : (
                      <>
                        <Ionicons name="send" size={20} color="#ffffff" />
                        <Text className="text-white font-bold text-lg ml-2">Send OTP</Text>
                      </>
                    )}
                  </TouchableOpacity>
                </View>
              )}

              {/* Step 3: OTP Verification */}
              {step === 'otp' && (
                <View 
                  className="bg-white rounded-2xl p-6 border border-slate-100"
                  style={{
                    shadowColor: '#1e3a8a',
                    shadowOffset: { width: 0, height: 4 },
                    shadowOpacity: 0.08,
                    shadowRadius: 16,
                    elevation: 8,
                  }}
                >
                  <View className="items-center mb-5">
                    <View className="bg-green-100 p-4 rounded-full mb-3">
                      <Ionicons name="keypad" size={36} color="#22c55e" />
                    </View>
                    <Text className="text-slate-600 text-center text-sm">
                      Enter the 6-digit OTP sent to your Aadhaar-linked mobile
                    </Text>
                  </View>

                  {/* OTP Input Boxes */}
                  <View className="flex-row justify-center mb-5">
                    {otp.map((digit, index) => (
                      <TextInput
                        key={index}
                        ref={(ref) => { otpRefs.current[index] = ref; }}
                        className="w-12 h-14 bg-slate-50 border-2 border-slate-200 rounded-xl text-center text-xl font-bold mx-1 text-slate-800"
                        value={digit}
                        onChangeText={(text) => handleOTPChange(text, index)}
                        onKeyPress={(e) => handleOTPKeyPress(e, index)}
                        keyboardType="numeric"
                        maxLength={1}
                        selectTextOnFocus
                      />
                    ))}
                  </View>

                  {/* Resend Timer */}
                  <View className="items-center mb-5">
                    {countdown > 0 ? (
                      <Text className="text-slate-500 text-sm">
                        Resend OTP in <Text className="text-blue-800 font-bold">{countdown}s</Text>
                      </Text>
                    ) : (
                      <TouchableOpacity onPress={handleResendOTP}>
                        <Text className="text-blue-800 font-semibold">Resend OTP</Text>
                      </TouchableOpacity>
                    )}
                  </View>

                  <TouchableOpacity
                    className={`bg-green-600 rounded-xl py-4 items-center flex-row justify-center ${isLoading ? 'opacity-70' : ''}`}
                    onPress={handleVerifyOTP}
                    disabled={isLoading}
                    style={{
                      shadowColor: '#22c55e',
                      shadowOffset: { width: 0, height: 4 },
                      shadowOpacity: 0.3,
                      shadowRadius: 8,
                      elevation: 6,
                    }}
                  >
                    {isLoading ? (
                      <ActivityIndicator color="#ffffff" />
                    ) : (
                      <>
                        <Ionicons name="checkmark-circle" size={20} color="#ffffff" />
                        <Text className="text-white font-bold text-lg ml-2">Verify OTP</Text>
                      </>
                    )}
                  </TouchableOpacity>
                </View>
              )}

              {/* Step 4: Complete */}
              {step === 'complete' && (
                <View 
                  className="bg-white rounded-2xl p-6 border border-slate-100 items-center"
                  style={{
                    shadowColor: '#1e3a8a',
                    shadowOffset: { width: 0, height: 4 },
                    shadowOpacity: 0.08,
                    shadowRadius: 16,
                    elevation: 8,
                  }}
                >
                  <View className="bg-green-100 p-5 rounded-full mb-4">
                    <Ionicons name="checkmark-circle" size={56} color="#22c55e" />
                  </View>
                  <Text className="text-green-600 font-bold text-xl mb-2">Verification Complete!</Text>
                  <Text className="text-slate-500 text-center text-sm mb-5">
                    Your Aadhaar has been verified via UIDAI eKYC.{'\n'}Redirecting to dashboard...
                  </Text>
                  <ActivityIndicator color="#1e3a8a" size="large" />
                </View>
              )}
            </Animated.View>

            {/* Login Link - only show on first step */}
            {step === 'details' && (
              <View className="flex-row justify-center mt-6 mb-4">
                <Text className="text-slate-500">Already have an account? </Text>
                <Link href="/(auth)/login" asChild>
                  <TouchableOpacity>
                    <Text className="text-blue-800 font-bold">Sign In</Text>
                  </TouchableOpacity>
                </Link>
              </View>
            )}

            {/* Security Footer */}
            <View className="items-center py-6">
              <View className="flex-row items-center mb-2">
                <Ionicons name="shield-checkmark" size={16} color="#1e3a8a" />
                <Text className="text-slate-600 text-xs ml-2 font-medium">Government Grade Security</Text>
              </View>
              <Text className="text-slate-400 text-xs">Protected under Digital India Initiative</Text>
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
