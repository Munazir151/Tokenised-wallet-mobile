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
      className="bg-white rounded-xl p-4 flex-row items-center mb-3 shadow-sm"
      onPress={onPress}
    >
      <View
        className={`w-10 h-10 rounded-full items-center justify-center ${
          danger ? 'bg-red-100' : 'bg-blue-100'
        }`}
      >
        <Ionicons name={icon} size={20} color={danger ? '#ef4444' : '#1e40af'} />
      </View>
      <Text className={`flex-1 ml-4 font-medium ${danger ? 'text-red-600' : 'text-gray-800'}`}>
        {label}
      </Text>
      {value && (
        <Text className="text-gray-500 text-sm mr-2">{value}</Text>
      )}
      <Ionicons name="chevron-forward" size={20} color="#9ca3af" />
    </TouchableOpacity>
  );

  return (
    <SafeAreaView className="flex-1 bg-blue-800" edges={['top']}>
      <ScrollView className="flex-1 bg-gray-100">
        {/* Profile Header */}
        <View className="bg-blue-800 px-6 py-8 items-center">
        <View className="w-24 h-24 bg-white rounded-full items-center justify-center mb-4">
          <Text className="text-blue-800 text-3xl font-bold">
            {userData?.name?.charAt(0)?.toUpperCase() || 'U'}
          </Text>
        </View>
        <Text className="text-white text-xl font-bold">{userData?.name || 'User'}</Text>
        <Text className="text-blue-200 mt-1">{userData?.email}</Text>
      </View>

      <View className="px-4 py-6">
        {/* Account Info */}
        <Text className="text-gray-500 text-sm font-medium mb-3 px-2">ACCOUNT</Text>
        <View className="bg-white rounded-xl p-4 mb-6 shadow-sm">
          <View className="flex-row items-center mb-4">
            <Text className="text-gray-500 w-24">User ID</Text>
            <Text className="text-gray-800 flex-1" numberOfLines={1}>
              {userData?.id || 'N/A'}
            </Text>
          </View>
          <View className="flex-row items-center mb-4">
            <Text className="text-gray-500 w-24">Email</Text>
            <Text className="text-gray-800 flex-1">{userData?.email || 'N/A'}</Text>
          </View>
          <View className="flex-row items-center">
            <Text className="text-gray-500 w-24">Joined</Text>
            <Text className="text-gray-800 flex-1">
              {userData?.created_at
                ? new Date(userData.created_at).toLocaleDateString()
                : 'N/A'}
            </Text>
          </View>
        </View>

        {/* Security */}
        <Text className="text-gray-500 text-sm font-medium mb-3 px-2">SECURITY</Text>
        <MenuItem icon="key" label="Public Key" onPress={() => {}} />
        <MenuItem icon="finger-print" label="Biometric Lock" onPress={() => {}} />

        {/* Preferences */}
        <Text className="text-gray-500 text-sm font-medium mb-3 px-2 mt-3">PREFERENCES</Text>
        <MenuItem 
          icon="language" 
          label="Language" 
          value={getCurrentLanguageName()}
          onPress={() => setShowLanguageModal(true)} 
        />

        {/* Support */}
        <Text className="text-gray-500 text-sm font-medium mb-3 px-2 mt-3">SUPPORT</Text>
        <MenuItem icon="help-circle" label="Help & FAQ" onPress={() => {}} />
        <MenuItem icon="document-text" label="Terms of Service" onPress={() => {}} />
        <MenuItem icon="shield" label="Privacy Policy" onPress={() => {}} />

        {/* Logout */}
        <View className="mt-6">
          <MenuItem icon="log-out" label="Logout" onPress={handleLogout} danger />
        </View>

        {/* Version */}
        <Text className="text-center text-gray-400 text-sm mt-6">Version 1.0.0</Text>
      </View>

      {/* Language Selection Modal */}
      <Modal
        visible={showLanguageModal}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setShowLanguageModal(false)}
      >
        <View className="flex-1 bg-black/50 justify-end">
          <View className="bg-white rounded-t-3xl p-6">
            <View className="items-center mb-4">
              <View className="w-12 h-1 bg-gray-300 rounded-full mb-4" />
              <Text className="text-gray-800 font-bold text-xl">Select Language</Text>
              <Text className="text-gray-500 text-sm">Choose your preferred language</Text>
            </View>

            <View className="mb-4">
              {languages.map((lang) => (
                <TouchableOpacity
                  key={lang.code}
                  className={`flex-row items-center justify-between p-4 rounded-xl mb-2 ${
                    language === lang.code ? 'bg-blue-100 border-2 border-blue-500' : 'bg-gray-50'
                  }`}
                  onPress={() => handleLanguageChange(lang.code)}
                >
                  <View className="flex-row items-center">
                    <View className={`w-6 h-6 rounded-full border-2 items-center justify-center ${
                      language === lang.code ? 'border-blue-500 bg-blue-500' : 'border-gray-300'
                    }`}>
                      {language === lang.code && (
                        <Ionicons name="checkmark" size={14} color="#ffffff" />
                      )}
                    </View>
                    <View className="ml-3">
                      <Text className={`font-medium ${language === lang.code ? 'text-blue-800' : 'text-gray-700'}`}>
                        {lang.name}
                      </Text>
                      <Text className="text-gray-500 text-sm">{lang.nativeName}</Text>
                    </View>
                  </View>
                </TouchableOpacity>
              ))}
            </View>

            <TouchableOpacity
              className="bg-gray-100 rounded-xl py-4 items-center"
              onPress={() => setShowLanguageModal(false)}
            >
              <Text className="text-gray-700 font-semibold">{t('close')}</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </ScrollView>
    </SafeAreaView>
  );
}
