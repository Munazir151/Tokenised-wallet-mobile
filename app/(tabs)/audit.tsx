import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  RefreshControl,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { getAuditLogs } from '../../services/api';

interface AuditLog {
  id: string;
  token_id: string;
  action: string;
  performed_by: string;
  details: any;
  timestamp: string;
}

export default function AuditScreen() {
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchLogs = async () => {
    try {
      const result = await getAuditLogs();
      setLogs(result.logs || []);
    } catch (error) {
      console.error('Error fetching audit logs:', error);
    } finally {
      setIsLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchLogs();
  }, []);

  const onRefresh = () => {
    setRefreshing(true);
    fetchLogs();
  };

  const getActionIcon = (action: string) => {
    switch (action) {
      case 'TOKEN_ISSUED':
        return { icon: 'add-circle', color: '#22c55e', bg: 'bg-green-100' };
      case 'TOKEN_VERIFIED':
        return { icon: 'checkmark-circle', color: '#3b82f6', bg: 'bg-blue-100' };
      case 'TOKEN_REVOKED':
        return { icon: 'close-circle', color: '#ef4444', bg: 'bg-red-100' };
      case 'CONSENT_REQUESTED':
        return { icon: 'help-circle', color: '#f97316', bg: 'bg-orange-100' };
      case 'CONSENT_APPROVED':
        return { icon: 'shield-checkmark', color: '#22c55e', bg: 'bg-green-100' };
      case 'CONSENT_REJECTED':
        return { icon: 'shield', color: '#ef4444', bg: 'bg-red-100' };
      default:
        return { icon: 'ellipse', color: '#6b7280', bg: 'bg-gray-100' };
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const formatAction = (action: string) => {
    return action.replace(/_/g, ' ').replace(/\b\w/g, (l) => l.toUpperCase());
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
        {/* Header Section */}
        <View className="bg-blue-800 px-6 pt-4 pb-16">
          <View className="flex-row items-center mb-2">
            <View className="w-10 h-10 bg-purple-500 rounded-xl items-center justify-center">
              <Ionicons name="time" size={22} color="#ffffff" />
            </View>
            <Text className="text-white text-2xl font-bold ml-3">Audit Trail</Text>
          </View>
          <Text className="text-blue-200 text-sm">
            {logs.length} {logs.length === 1 ? 'activity' : 'activities'} recorded
          </Text>
        </View>

        {/* Content - Overlapping Header */}
        <View className="px-4 -mt-8">

          {logs.length === 0 ? (
            <View className="bg-white rounded-2xl p-12 items-center shadow-sm">
              <View className="w-20 h-20 bg-purple-100 rounded-full items-center justify-center mb-4">
                <Ionicons name="document-text-outline" size={40} color="#9333ea" />
              </View>
              <Text className="text-gray-700 text-lg font-semibold">No Audit Logs Yet</Text>
              <Text className="text-gray-400 text-sm mt-2 text-center">
                Activity will appear here as you use the system
              </Text>
            </View>
          ) : (
            <View className="relative">
              {/* Timeline line */}
              <View className="absolute left-6 top-6 bottom-6 w-0.5 bg-gray-200" />

              {logs.map((log, index) => {
                const { icon, color, bg } = getActionIcon(log.action);
                return (
                  <View key={log.id} className="flex-row mb-4">
                    <View 
                      className={`w-12 h-12 rounded-xl ${bg} items-center justify-center z-10`}
                      style={{
                        shadowColor: color,
                        shadowOffset: { width: 0, height: 2 },
                        shadowOpacity: 0.2,
                        shadowRadius: 4,
                        elevation: 2,
                      }}
                    >
                      <Ionicons name={icon as any} size={22} color={color} />
                    </View>
                    <View 
                      className="flex-1 ml-4 bg-white rounded-2xl p-5 border border-gray-100"
                      style={{
                        shadowColor: '#000',
                        shadowOffset: { width: 0, height: 2 },
                        shadowOpacity: 0.08,
                        shadowRadius: 12,
                        elevation: 3,
                      }}
                    >
                      <View className="flex-row items-start justify-between mb-2">
                        <Text className="font-bold text-gray-900 text-base flex-1">
                          {formatAction(log.action)}
                        </Text>
                        <View className="flex-row items-center ml-2">
                          <Ionicons name="time-outline" size={12} color="#9ca3af" />
                          <Text className="text-gray-400 text-xs ml-1">
                            {formatDate(log.timestamp)}
                          </Text>
                        </View>
                      </View>
                      <View className="flex-row items-center mb-2">
                        <Ionicons name="person-outline" size={14} color="#9ca3af" />
                        <Text className="text-gray-500 text-sm ml-1.5">
                          {log.performed_by}
                        </Text>
                      </View>
                      {log.details && (
                        <View className="mt-3 pt-3 border-t border-gray-100 bg-gray-50 rounded-lg p-3 -mb-2 -mx-2">
                          {log.details.fields_shared && (
                            <View className="flex-row items-start mb-1">
                              <Ionicons name="list-outline" size={12} color="#9ca3af" />
                              <Text className="text-gray-500 text-xs ml-1.5 flex-1">
                                Fields: {log.details.fields_shared.join(', ')}
                              </Text>
                            </View>
                          )}
                          {log.details.reason && (
                            <View className="flex-row items-start mb-1">
                              <Ionicons name="information-circle-outline" size={12} color="#9ca3af" />
                              <Text className="text-gray-500 text-xs ml-1.5 flex-1">
                                Reason: {log.details.reason}
                              </Text>
                            </View>
                          )}
                          {log.details.requester && (
                            <View className="flex-row items-start">
                              <Ionicons name="business-outline" size={12} color="#9ca3af" />
                              <Text className="text-gray-500 text-xs ml-1.5 flex-1">
                                Requester: {log.details.requester}
                              </Text>
                            </View>
                          )}
                        </View>
                      )}
                  </View>
                </View>
              );
            })}
          </View>
        )}
        <View className="h-6" />
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
