import { useEffect, useState } from 'react';
import { View, Text, ActivityIndicator } from 'react-native';
import { useRouter } from 'expo-router';
import { useAuth } from '../context/AuthContext';
import AsyncStorage from '@react-native-async-storage/async-storage';

export default function Index() {
  const { isAuthenticated, isLoading } = useAuth();
  const router = useRouter();
  const [checkingOnboarding, setCheckingOnboarding] = useState(true);

  useEffect(() => {
    const checkFirstLaunch = async () => {
      try {
        const onboardingComplete = await AsyncStorage.getItem('onboarding_complete');
        
        if (!isLoading) {
          if (!onboardingComplete) {
            // First time user - show onboarding
            router.replace('/onboarding');
          } else if (isAuthenticated) {
            router.replace('/(tabs)/dashboard');
          } else {
            router.replace('/(auth)/login');
          }
        }
      } catch (error) {
        console.error('Error checking onboarding:', error);
        router.replace('/(auth)/login');
      } finally {
        setCheckingOnboarding(false);
      }
    };

    checkFirstLaunch();
  }, [isAuthenticated, isLoading]);

  return (
    <View className="flex-1 items-center justify-center bg-blue-900">
      <View className="w-20 h-20 bg-white/20 rounded-2xl items-center justify-center mb-6">
        <Text className="text-4xl">🛡️</Text>
      </View>
      <Text className="text-white text-2xl font-bold mb-2">Tokenised KYC</Text>
      <Text className="text-blue-200 text-sm mb-6">Secure Digital Identity</Text>
      <ActivityIndicator size="large" color="#ffffff" />
    </View>
  );
}
