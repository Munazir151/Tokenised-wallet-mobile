import React, { useState } from 'react';
import { View, Text, ScrollView, TouchableOpacity, Alert, Modal } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useAuth } from '../../context/AuthContext';
import { useLanguage } from '../../context/LanguageContext';

export default function ProfileScreen() {
  const { userData, logout } = useAuth();
  const { language, setLanguage, t, languages } = useLanguage();
  const router = useRouter();
  const [showLanguageModal, setShowLanguageModal] = useState(false);

  const handleLogout = () => {
    Alert.alert(t('logout'), 'Are you sure you want to logout?', [
      { text: t('cancel'), style: 'cancel' },
      {
        text: t('logout'),
        style: 'destructive',
        onPress: async () => {
          await logout();
          router.replace('/(auth)/login');
        },
      },
    ]);
  };

  const handleLanguageChange = async (langCode: typeof language) => {
    await setLanguage(langCode);
    setShowLanguageModal(false);
  };

  const getCurrentLanguageName = () => {
    const lang = languages.find(l => l.code === language);
    return lang ? `${lang.name} (${lang.nativeName})` : 'English';
  };

  const MenuItem = ({ icon, label, onPress, danger = false, value }: any) => (
    <TouchableOpacity
      className={`bg-white rounded-2xl p-5 flex-row items-center mb-3 ${
        danger ? 'border border-red-100' : ''
      }`}
      style={{
        shadowColor: danger ? '#ef4444' : '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: danger ? 0.15 : 0.08,
        shadowRadius: 12,
        elevation: 3,
      }}
      onPress={onPress}
      activeOpacity={0.7}
    >
      <View
        className={`w-12 h-12 rounded-xl items-center justify-center ${
          danger ? 'bg-red-100' : 'bg-blue-100'
        }`}
      >
        <Ionicons name={icon} size={24} color={danger ? '#ef4444' : '#1e40af'} />
      </View>
      <Text
        className={`flex-1 ml-4 font-semibold text-base ${
          danger ? 'text-red-600' : 'text-gray-900'
        }`}
      >
        {label}
      </Text>
      {value && <Text className="text-gray-500 text-sm mr-2 font-medium">{value}</Text>}
      <Ionicons name="chevron-forward" size={22} color={danger ? '#ef4444' : '#d1d5db'} />
    </TouchableOpacity>
  );

  return (
    <SafeAreaView className="flex-1 bg-blue-800" edges={['top']}>
      <ScrollView className="flex-1 bg-gray-50" showsVerticalScrollIndicator={false}>
        {/* Enhanced Profile Header */}
        <View className="bg-blue-800 px-6 pt-6 pb-24">
          {/* Avatar with Status Ring */}
          <View className="items-center mb-6">
            <View
              className="w-32 h-32 bg-white rounded-full items-center justify-center"
              style={{
                shadowColor: '#000',
                shadowOffset: { width: 0, height: 8 },
                shadowOpacity: 0.3,
                shadowRadius: 16,
                elevation: 12,
              }}
            >
              <Text className="text-blue-900 text-5xl font-bold">
                {userData?.name?.charAt(0)?.toUpperCase() || 'U'}
              </Text>
            </View>
            {/* Verified Badge */}
            <View
              className="absolute bottom-1 right-32 bg-green-500 rounded-full p-2"
              style={{
                shadowColor: '#10b981',
                shadowOffset: { width: 0, height: 2 },
                shadowOpacity: 0.5,
                shadowRadius: 4,
                elevation: 4,
              }}
            >
              <Ionicons name="checkmark" size={16} color="#ffffff" />
            </View>
          </View>

          {/* User Info */}
          <View className="items-center">
            <Text className="text-white text-2xl font-bold mb-2">
              {userData?.name || 'User'}
            </Text>
            <Text className="text-blue-100 text-base mb-4">{userData?.email}</Text>
            
            {/* Status Badge */}
            <View className="bg-green-500/20 px-4 py-2 rounded-full border border-green-400/30">
              <Text className="text-green-100 text-sm font-semibold">✓ Verified Account</Text>
            </View>
          </View>
        </View>

        {/* Content Cards - Overlapping Header */}
        <View className="px-4 -mt-16">
          {/* Account Details Card */}
          <View
            className="bg-white rounded-3xl p-6 mb-6"
            style={{
              shadowColor: '#000',
              shadowOffset: { width: 0, height: 4 },
              shadowOpacity: 0.1,
              shadowRadius: 20,
              elevation: 8,
            }}
          >
            <View className="flex-row items-center mb-5">
              <View className="w-10 h-10 bg-blue-100 rounded-xl items-center justify-center">
                <Ionicons name="person" size={20} color="#1e40af" />
              </View>
              <Text className="text-gray-900 text-lg font-bold ml-3">Account Details</Text>
            </View>

            {/* User ID */}
            <View className="mb-4 pb-4 border-b border-gray-100">
              <View className="flex-row items-center mb-2">
                <Ionicons name="key-outline" size={16} color="#9ca3af" />
                <Text className="text-gray-500 text-xs font-semibold ml-2">USER ID</Text>
              </View>
              <Text className="text-gray-900 font-mono text-sm" numberOfLines={1}>
                {userData?.id || 'N/A'}
              </Text>
            </View>

            {/* Email */}
            <View className="mb-4 pb-4 border-b border-gray-100">
              <View className="flex-row items-center mb-2">
                <Ionicons name="mail-outline" size={16} color="#9ca3af" />
                <Text className="text-gray-500 text-xs font-semibold ml-2">EMAIL</Text>
              </View>
              <Text className="text-gray-900 text-sm">{userData?.email || 'N/A'}</Text>
            </View>

            {/* Member Since */}
            <View>
              <View className="flex-row items-center mb-2">
                <Ionicons name="calendar-outline" size={16} color="#9ca3af" />
                <Text className="text-gray-500 text-xs font-semibold ml-2">MEMBER SINCE</Text>
              </View>
              <Text className="text-gray-900 text-sm">
                {userData?.created_at
                  ? new Date(userData.created_at).toLocaleDateString('en-US', {
                      year: 'numeric',
                      month: 'long',
                      day: 'numeric',
                    })
                  : 'N/A'}
              </Text>
            </View>
          </View>

          {/* Security Section */}
          <Text className="text-gray-600 text-xs font-bold mb-4 px-2 tracking-wider">
            SECURITY & PRIVACY
          </Text>
          <MenuItem icon="key" label="Public Key" onPress={() => {}} />
          <MenuItem icon="finger-print" label="Biometric Lock" onPress={() => {}} />

          {/* Preferences Section */}
          <Text className="text-gray-600 text-xs font-bold mb-4 px-2 tracking-wider mt-6">
            PREFERENCES
          </Text>
          <MenuItem
            icon="language"
            label="Language"
            value={getCurrentLanguageName()}
            onPress={() => setShowLanguageModal(true)}
          />
          <MenuItem icon="notifications" label="Notifications" onPress={() => {}} />

          {/* Support Section */}
          <Text className="text-gray-600 text-xs font-bold mb-4 px-2 tracking-wider mt-6">
            HELP & SUPPORT
          </Text>
          <MenuItem icon="help-circle" label="Help & FAQ" onPress={() => {}} />
          <MenuItem icon="document-text" label="Terms of Service" onPress={() => {}} />
          <MenuItem icon="shield" label="Privacy Policy" onPress={() => {}} />

          {/* Logout Button */}
          <View className="mt-8">
            <MenuItem icon="log-out" label="Logout" onPress={handleLogout} danger />
          </View>

          {/* App Info */}
          <View className="items-center mt-8 mb-6">
            <Text className="text-gray-400 text-xs">Tokenised KYC Wallet</Text>
            <Text className="text-gray-400 text-xs mt-1">Version 1.0.0</Text>
            <Text className="text-gray-300 text-xs mt-2">© 2026 All rights reserved</Text>
          </View>
        </View>

      {/* Enhanced Language Selection Modal */}
      <Modal
        visible={showLanguageModal}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setShowLanguageModal(false)}
      >
        <View className="flex-1 bg-black/60 justify-end">
          <View className="bg-white rounded-t-3xl pt-2 pb-8 px-6">
            {/* Handle Bar */}
            <View className="items-center mb-6">
              <View className="w-12 h-1.5 bg-gray-300 rounded-full" />
            </View>

            {/* Header */}
            <View className="items-center mb-6">
              <View className="w-16 h-16 bg-blue-100 rounded-full items-center justify-center mb-4">
                <Ionicons name="language" size={32} color="#1e40af" />
              </View>
              <Text className="text-gray-900 font-bold text-2xl">Select Language</Text>
              <Text className="text-gray-500 text-sm mt-2">
                Choose your preferred language
              </Text>
            </View>

            {/* Language Options */}
            <View className="mb-6">
              {languages.map((lang) => (
                <TouchableOpacity
                  key={lang.code}
                  className={`flex-row items-center justify-between p-5 rounded-2xl mb-3 ${
                    language === lang.code
                      ? 'bg-blue-50 border-2 border-blue-500'
                      : 'bg-gray-50 border-2 border-transparent'
                  }`}
                  onPress={() => handleLanguageChange(lang.code)}
                  activeOpacity={0.7}
                  style={{
                    shadowColor: language === lang.code ? '#1e40af' : 'transparent',
                    shadowOffset: { width: 0, height: 2 },
                    shadowOpacity: 0.1,
                    shadowRadius: 4,
                    elevation: language === lang.code ? 2 : 0,
                  }}
                >
                  <View className="flex-row items-center flex-1">
                    <View
                      className={`w-7 h-7 rounded-full border-2 items-center justify-center ${
                        language === lang.code
                          ? 'border-blue-500 bg-blue-500'
                          : 'border-gray-300 bg-white'
                      }`}
                    >
                      {language === lang.code && (
                        <Ionicons name="checkmark" size={16} color="#ffffff" />
                      )}
                    </View>
                    <View className="ml-4">
                      <Text
                        className={`font-bold text-base ${
                          language === lang.code ? 'text-blue-900' : 'text-gray-900'
                        }`}
                      >
                        {lang.name}
                      </Text>
                      <Text className="text-gray-500 text-sm mt-0.5">{lang.nativeName}</Text>
                    </View>
                  </View>
                  {language === lang.code && (
                    <Ionicons name="checkmark-circle" size={24} color="#1e40af" />
                  )}
                </TouchableOpacity>
              ))}
            </View>

            {/* Close Button */}
            <TouchableOpacity
              className="bg-gray-100 rounded-2xl py-4 items-center"
              style={{
                shadowColor: '#000',
                shadowOffset: { width: 0, height: 1 },
                shadowOpacity: 0.05,
                shadowRadius: 2,
                elevation: 1,
              }}
              onPress={() => setShowLanguageModal(false)}
              activeOpacity={0.7}
            >
              <Text className="text-gray-700 font-bold text-base">{t('close')}</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </ScrollView>
    </SafeAreaView>
  );
}
