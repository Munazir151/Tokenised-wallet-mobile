import React, { useState, useEffect, memo } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useAuth } from '../../context/AuthContext';
import { getMyTokens, getPendingConsents, getAuditSummary } from '../../services/api';

// StatCard component defined outside to prevent re-renders
const StatCard = memo(({ icon, label, value, color, onPress }: any) => (
  <TouchableOpacity
    className="bg-white rounded-xl p-4 shadow-sm flex-1 mx-1"
    onPress={onPress}
  >
    <View className={`w-10 h-10 rounded-full items-center justify-center mb-2 ${color}`}>
      <Ionicons name={icon} size={20} color="#ffffff" />
    </View>
    <Text className="text-2xl font-bold text-gray-800">{value}</Text>
    <Text className="text-gray-500 text-sm">{label}</Text>
  </TouchableOpacity>
));

export default function DashboardScreen() {
  const { userData } = useAuth();
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [stats, setStats] = useState({
    totalTokens: 0,
    activeTokens: 0,
    pendingConsents: 0,
    totalEvents: 0,
  });

  const fetchData = async () => {
    try {
      const [tokensRes, consentsRes, auditRes] = await Promise.all([
        getMyTokens(),
        getPendingConsents(),
        getAuditSummary(),
      ]);

      const tokens = tokensRes.tokens || [];
      const activeTokens = tokens.filter((t: any) => t.status === 'active');

      setStats({
        totalTokens: tokens.length,
        activeTokens: activeTokens.length,
        pendingConsents: consentsRes.count || 0,
        totalEvents: auditRes.total_events || 0,
      });
    } catch (error) {
      console.error('Error fetching dashboard data:', error);
    } finally {
      setIsLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const onRefresh = () => {
    setRefreshing(true);
    fetchData();
  };

  if (isLoading) {
    return (
      <SafeAreaView className="flex-1 items-center justify-center bg-gray-100">
        <ActivityIndicator size="large" color="#1e40af" />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView className="flex-1 bg-blue-800" edges={['top']}>
      <ScrollView
        className="flex-1 bg-gray-50"
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        showsVerticalScrollIndicator={false}
      >
        {/* Welcome Section */}
        <View className="bg-blue-800 px-6 pt-4 pb-16">
          <View className="flex-row items-center justify-between mb-4">
            <View>
              <Text className="text-blue-200 text-sm">Welcome back,</Text>
              <Text className="text-white text-2xl font-bold mt-1">
                {userData?.name || 'User'} 👋
              </Text>
            </View>
            <TouchableOpacity 
              className="w-12 h-12 bg-blue-700 rounded-full items-center justify-center"
              onPress={() => router.push('/(tabs)/profile')}
            >
              <Text className="text-white text-lg font-bold">
                {userData?.name?.charAt(0)?.toUpperCase() || 'U'}
              </Text>
            </TouchableOpacity>
          </View>
          
          {/* KYC Status Card */}
          <View className="bg-blue-700/50 rounded-2xl p-4 flex-row items-center">
            <View className="w-12 h-12 bg-green-500 rounded-full items-center justify-center">
              <Ionicons name="shield-checkmark" size={24} color="#ffffff" />
            </View>
            <View className="ml-4 flex-1">
              <Text className="text-white font-semibold">KYC Status</Text>
              <Text className="text-blue-200 text-sm">
                {stats.activeTokens > 0 ? 'Verified' : 'Not Verified'}
              </Text>
            </View>
            <View className={`px-3 py-1 rounded-full ${stats.activeTokens > 0 ? 'bg-green-500' : 'bg-yellow-500'}`}>
              <Text className="text-white text-xs font-medium">
                {stats.activeTokens > 0 ? 'Active' : 'Pending'}
              </Text>
            </View>
          </View>
        </View>

        {/* Stats Grid - Overlapping Cards */}
        <View className="px-4 -mt-8">
          <View className="flex-row mb-3">
            <StatCard
              icon="wallet"
              label="Active Tokens"
              value={stats.activeTokens}
              color="bg-green-500"
              onPress={() => router.push('/(tabs)/tokens')}
            />
            <StatCard
              icon="shield"
              label="Pending"
              value={stats.pendingConsents}
              color="bg-orange-500"
              onPress={() => router.push('/(tabs)/consents')}
            />
          </View>
          <View className="flex-row">
            <StatCard
              icon="layers"
              label="Total Tokens"
              value={stats.totalTokens}
              color="bg-blue-500"
              onPress={() => router.push('/(tabs)/tokens')}
            />
            <StatCard
              icon="document-text"
              label="Audit Events"
              value={stats.totalEvents}
              color="bg-purple-500"
              onPress={() => router.push('/(tabs)/audit')}
            />
          </View>
        </View>

        {/* Quick Actions */}
        <View className="px-4 mt-6">
          <Text className="text-lg font-bold text-gray-800 mb-4">Quick Actions</Text>

          <TouchableOpacity
            className="bg-white rounded-2xl p-4 flex-row items-center mb-3 shadow-sm border border-gray-100"
            onPress={() => router.push('/(tabs)/tokens')}
          >
            <View className="w-12 h-12 bg-blue-100 rounded-2xl items-center justify-center">
              <Ionicons name="add-circle" size={24} color="#1e40af" />
            </View>
            <View className="ml-4 flex-1">
              <Text className="text-gray-800 font-semibold">Issue New KYC Token</Text>
              <Text className="text-gray-500 text-sm">Create a new verifiable credential</Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color="#9ca3af" />
          </TouchableOpacity>

          <TouchableOpacity
            className="bg-white rounded-2xl p-4 flex-row items-center mb-3 shadow-sm border border-gray-100"
            onPress={() => router.push('/(tabs)/documents')}
          >
            <View className="w-12 h-12 bg-green-100 rounded-2xl items-center justify-center">
              <Ionicons name="documents" size={24} color="#16a34a" />
            </View>
            <View className="ml-4 flex-1">
              <Text className="text-gray-800 font-semibold">My Documents</Text>
              <Text className="text-gray-500 text-sm">Upload & manage KYC documents</Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color="#9ca3af" />
          </TouchableOpacity>

          <TouchableOpacity
            className="bg-white rounded-2xl p-4 flex-row items-center mb-3 shadow-sm border border-gray-100"
            onPress={() => router.push('/(tabs)/consents')}
          >
            <View className="w-12 h-12 bg-orange-100 rounded-2xl items-center justify-center">
              <Ionicons name="shield-checkmark" size={24} color="#f97316" />
            </View>
            <View className="ml-4 flex-1">
              <Text className="text-gray-800 font-semibold">Review Consent Requests</Text>
              <Text className="text-gray-500 text-sm">
                {stats.pendingConsents > 0
                  ? `${stats.pendingConsents} pending request(s)`
                  : 'No pending requests'}
              </Text>
            </View>
            {stats.pendingConsents > 0 && (
              <View className="bg-orange-500 w-6 h-6 rounded-full items-center justify-center mr-2">
                <Text className="text-white text-xs font-bold">{stats.pendingConsents}</Text>
              </View>
            )}
            <Ionicons name="chevron-forward" size={20} color="#9ca3af" />
          </TouchableOpacity>

          <TouchableOpacity
            className="bg-white rounded-2xl p-4 flex-row items-center shadow-sm border border-gray-100"
            onPress={() => router.push('/(tabs)/audit')}
          >
            <View className="w-12 h-12 bg-purple-100 rounded-2xl items-center justify-center">
              <Ionicons name="time" size={24} color="#9333ea" />
            </View>
            <View className="ml-4 flex-1">
              <Text className="text-gray-800 font-semibold">View Audit Trail</Text>
              <Text className="text-gray-500 text-sm">Track all activities</Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color="#9ca3af" />
          </TouchableOpacity>
        </View>

        <View className="h-8" />
      </ScrollView>
    </SafeAreaView>
  );
}
