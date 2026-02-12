import React, { useState } from 'react';
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
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter, Link } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { signIn, getOrCreateUserProfile } from '../../services/supabase';
import { useAuth } from '../../context/AuthContext';

export default function LoginScreen() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const router = useRouter();
  const { setUserData } = useAuth();

  const handleLogin = async () => {
    if (!email || !password) {
      Alert.alert('Error', 'Please fill in all fields');
      return;
    }

    setIsLoading(true);
    try {
      // Supabase auth
      const { user, session } = await signIn(email, password);
      
      if (user && session) {
        // Get or create user profile
        const name = user.user_metadata?.name || email.split('@')[0];
        const profile = await getOrCreateUserProfile(user.id, email, name);
        
        setUserData(profile);
        router.replace('/(tabs)/dashboard');
      } else {
        Alert.alert('Error', 'Failed to authenticate');
      }
    } catch (error: any) {
      Alert.alert('Login Failed', error.message || 'Invalid email or password');
    } finally {
      setIsLoading(false);
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
          {/* Header Section */}
          <View className="bg-blue-900 px-6 pt-8 pb-16 items-center">
            {/* Official Emblem */}
            <View 
              className="w-24 h-24 bg-white rounded-full items-center justify-center mb-5"
              style={{
                shadowColor: '#1e3a8a',
                shadowOffset: { width: 0, height: 4 },
                shadowOpacity: 0.3,
                shadowRadius: 8,
                elevation: 8,
              }}
            >
              <Ionicons name="shield-checkmark" size={48} color="#1e3a8a" />
            </View>
            <Text className="text-white text-2xl font-bold tracking-wide">Tokenised KYC</Text>
            <Text className="text-blue-200 text-sm mt-2">Digital Identity Wallet</Text>
            <View className="flex-row items-center mt-3 bg-blue-800/50 px-4 py-2 rounded-full">
              <Ionicons name="lock-closed" size={14} color="#93c5fd" />
              <Text className="text-blue-200 text-xs ml-2">Secure Tokenized Identity System</Text>
            </View>
          </View>

          {/* Login Form Card */}
          <View className="flex-1 px-5 -mt-8">
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
              <Text className="text-slate-800 text-xl font-bold mb-1">Welcome Back</Text>
              <Text className="text-slate-500 text-sm mb-6">Sign in to access your wallet</Text>

              {/* Email Input */}
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

              {/* Password Input */}
              <View className="mb-6">
                <Text className="text-slate-700 font-semibold text-sm mb-2">Password</Text>
                <View className="flex-row items-center bg-slate-50 border border-slate-200 rounded-xl px-4">
                  <Ionicons name="lock-closed-outline" size={20} color="#64748b" />
                  <TextInput
                    className="flex-1 py-4 px-3 text-slate-800"
                    placeholder="Enter your password"
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

              {/* Login Button */}
              <TouchableOpacity
                className={`bg-blue-900 rounded-xl py-4 items-center flex-row justify-center ${isLoading ? 'opacity-70' : ''}`}
                onPress={handleLogin}
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
                    <Text className="text-white font-bold text-lg">Sign In</Text>
                    <Ionicons name="arrow-forward" size={20} color="#ffffff" style={{ marginLeft: 8 }} />
                  </>
                )}
              </TouchableOpacity>
            </View>

            {/* Register Link */}
            <View className="flex-row justify-center mt-6 mb-4">
              <Text className="text-slate-500">Don't have an account? </Text>
              <Link href="/(auth)/register" asChild>
                <TouchableOpacity>
                  <Text className="text-blue-800 font-bold">Create Account</Text>
                </TouchableOpacity>
              </Link>
            </View>

            {/* Security Footer */}
            <View className="items-center py-6">
              <View className="flex-row items-center mb-2">
                <Ionicons name="shield-checkmark" size={16} color="#1e3a8a" />
                <Text className="text-slate-600 text-xs ml-2 font-medium">Secure & Privacy-First</Text>
              </View>
              <Text className="text-slate-400 text-xs">Built with modern security standards</Text>
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
