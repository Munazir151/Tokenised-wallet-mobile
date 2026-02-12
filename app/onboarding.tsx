import React, { useState, useRef } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  Dimensions,
  Animated,
  FlatList,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';

const { width, height } = Dimensions.get('window');

interface OnboardingSlide {
  id: string;
  title: string;
  subtitle: string;
  description: string;
  icon: keyof typeof Ionicons.glyphMap;
  color: string;
  bgColor: string;
}

const slides: OnboardingSlide[] = [
  {
    id: '1',
    title: 'Welcome to',
    subtitle: 'Tokenised KYC',
    description: 'Your digital identity, secured and controlled by you. Verify once, use everywhere.',
    icon: 'shield-checkmark',
    color: '#3b82f6',
    bgColor: '#1e3a8a',
  },
  {
    id: '2',
    title: 'One-Time KYC',
    subtitle: 'Verify Once',
    description: 'Upload your documents once. Get a cryptographically signed token that proves your identity.',
    icon: 'document-text',
    color: '#10b981',
    bgColor: '#065f46',
  },
  {
    id: '3',
    title: 'Consent-Based',
    subtitle: 'You Control Access',
    description: 'Banks request access, you decide. Approve or reject any data sharing request.',
    icon: 'lock-closed',
    color: '#8b5cf6',
    bgColor: '#5b21b6',
  },
  {
    id: '4',
    title: 'Complete Audit',
    subtitle: 'Full Transparency',
    description: 'Track who accessed your data, when, and what was shared. Your privacy, your control.',
    icon: 'eye',
    color: '#f59e0b',
    bgColor: '#92400e',
  },
];

export default function OnboardingScreen() {
  const router = useRouter();
  const [currentIndex, setCurrentIndex] = useState(0);
  const scrollX = useRef(new Animated.Value(0)).current;
  const flatListRef = useRef<FlatList>(null);
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const scaleAnim = useRef(new Animated.Value(0.8)).current;

  React.useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 800,
        useNativeDriver: true,
      }),
      Animated.spring(scaleAnim, {
        toValue: 1,
        tension: 50,
        friction: 7,
        useNativeDriver: true,
      }),
    ]).start();
  }, [currentIndex]);

  const handleNext = () => {
    if (currentIndex < slides.length - 1) {
      flatListRef.current?.scrollToIndex({ index: currentIndex + 1 });
      setCurrentIndex(currentIndex + 1);
    } else {
      completeOnboarding();
    }
  };

  const handleSkip = () => {
    completeOnboarding();
  };

  const completeOnboarding = async () => {
    await AsyncStorage.setItem('onboarding_complete', 'true');
    router.replace('/(auth)/login');
  };

  const renderSlide = ({ item, index }: { item: OnboardingSlide; index: number }) => {
    const inputRange = [(index - 1) * width, index * width, (index + 1) * width];
    
    const scale = scrollX.interpolate({
      inputRange,
      outputRange: [0.8, 1, 0.8],
      extrapolate: 'clamp',
    });

    const opacity = scrollX.interpolate({
      inputRange,
      outputRange: [0.4, 1, 0.4],
      extrapolate: 'clamp',
    });

    const translateY = scrollX.interpolate({
      inputRange,
      outputRange: [50, 0, 50],
      extrapolate: 'clamp',
    });

    return (
      <View style={{ width, height }} className="items-center justify-center px-8">
        <Animated.View
          style={{
            transform: [{ scale }, { translateY }],
            opacity,
          }}
          className="items-center"
        >
          {/* Animated Icon Circle */}
          <View
            className="w-40 h-40 rounded-full items-center justify-center mb-10"
            style={{ backgroundColor: `${item.color}30` }}
          >
            <View
              className="w-28 h-28 rounded-full items-center justify-center"
              style={{ backgroundColor: `${item.color}50` }}
            >
              <View
                className="w-20 h-20 rounded-full items-center justify-center"
                style={{ backgroundColor: item.color }}
              >
                <Ionicons name={item.icon} size={40} color="white" />
              </View>
            </View>
          </View>

          {/* Text Content */}
          <Text className="text-blue-200 text-lg font-medium mb-1">{item.title}</Text>
          <Text className="text-white text-3xl font-bold text-center mb-4">{item.subtitle}</Text>
          <Text className="text-blue-100 text-center text-base leading-6 px-4">
            {item.description}
          </Text>
        </Animated.View>
      </View>
    );
  };

  const renderPagination = () => {
    return (
      <View className="flex-row justify-center items-center mb-8">
        {slides.map((_, index) => {
          const inputRange = [(index - 1) * width, index * width, (index + 1) * width];
          
          const dotWidth = scrollX.interpolate({
            inputRange,
            outputRange: [8, 24, 8],
            extrapolate: 'clamp',
          });

          const opacity = scrollX.interpolate({
            inputRange,
            outputRange: [0.4, 1, 0.4],
            extrapolate: 'clamp',
          });

          return (
            <Animated.View
              key={index}
              style={{
                width: dotWidth,
                opacity,
              }}
              className="h-2 rounded-full bg-white mx-1"
            />
          );
        })}
      </View>
    );
  };

  return (
    <View className="flex-1 bg-blue-900">
      {/* Background Decorations */}
      <View className="absolute top-0 right-0 w-64 h-64 bg-white/5 rounded-full -mr-32 -mt-32" />
      <View className="absolute bottom-0 left-0 w-80 h-80 bg-white/5 rounded-full -ml-40 -mb-40" />

      {/* Skip Button */}
      <TouchableOpacity
        onPress={handleSkip}
        className="absolute top-14 right-6 z-10 px-4 py-2"
      >
        <Text className="text-blue-200 font-medium">Skip</Text>
      </TouchableOpacity>

      {/* Slides */}
      <Animated.FlatList
        ref={flatListRef}
        data={slides}
        renderItem={renderSlide}
        keyExtractor={(item) => item.id}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        onScroll={Animated.event(
          [{ nativeEvent: { contentOffset: { x: scrollX } } }],
          { useNativeDriver: true }
        )}
        onMomentumScrollEnd={(event) => {
          const index = Math.round(event.nativeEvent.contentOffset.x / width);
          setCurrentIndex(index);
        }}
        scrollEventThrottle={16}
      />

      {/* Bottom Section */}
      <View className="absolute bottom-0 left-0 right-0 pb-12 px-6">
        {renderPagination()}

        {/* Next/Get Started Button */}
        <TouchableOpacity
          onPress={handleNext}
          className="bg-white rounded-2xl py-4 flex-row items-center justify-center"
          style={{
            shadowColor: '#000',
            shadowOffset: { width: 0, height: 4 },
            shadowOpacity: 0.2,
            shadowRadius: 8,
            elevation: 8,
          }}
        >
          <Text className="text-blue-900 font-bold text-lg mr-2">
            {currentIndex === slides.length - 1 ? 'Get Started' : 'Next'}
          </Text>
          <Ionicons
            name={currentIndex === slides.length - 1 ? 'arrow-forward' : 'chevron-forward'}
            size={22}
            color="#1e3a8a"
          />
        </TouchableOpacity>

        {/* Language Selector */}
        <TouchableOpacity className="flex-row items-center justify-center mt-6">
          <Ionicons name="globe-outline" size={18} color="#93c5fd" />
          <Text className="text-blue-300 ml-2 text-sm">English • हिंदी • தமிழ் • తెలుగు</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}
