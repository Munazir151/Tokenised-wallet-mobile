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
    <SafeAreaView className="flex-1 bg-gray-100" edges={['top']}>
      <ScrollView
        className="flex-1 bg-gray-100"
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      >
        <View className="px-4 py-6">
          <Text className="text-gray-600 mb-4">Complete history of all KYC activities</Text>

          {logs.length === 0 ? (
            <View className="flex-1 items-center justify-center py-24">
              <Ionicons name="document-text-outline" size={64} color="#9ca3af" />
              <Text className="text-gray-500 text-lg mt-4">No audit logs yet</Text>
              <Text className="text-gray-400 text-sm mt-1 text-center">
              Activity will appear here as you use the system
            </Text>
          </View>
        ) : (
          <View className="relative">
            {/* Timeline line */}
            <View className="absolute left-5 top-6 bottom-6 w-0.5 bg-gray-200" />

            {logs.map((log, index) => {
              const { icon, color, bg } = getActionIcon(log.action);
              return (
                <View key={log.id} className="flex-row mb-4">
                  <View className={`w-10 h-10 rounded-full ${bg} items-center justify-center z-10`}>
                    <Ionicons name={icon as any} size={20} color={color} />
                  </View>
                  <View className="flex-1 ml-4 bg-white rounded-xl p-4 shadow-sm">
                    <View className="flex-row items-start justify-between">
                      <Text className="font-semibold text-gray-800">
                        {formatAction(log.action)}
                      </Text>
                      <Text className="text-gray-400 text-xs">
                        {formatDate(log.timestamp)}
                      </Text>
                    </View>
                    <Text className="text-gray-500 text-sm mt-1">
                      By: {log.performed_by}
                    </Text>
                    {log.details && (
                      <View className="mt-2 pt-2 border-t border-gray-100">
                        {log.details.fields_shared && (
                          <Text className="text-gray-400 text-xs">
                            Fields: {log.details.fields_shared.join(', ')}
                          </Text>
                        )}
                        {log.details.reason && (
                          <Text className="text-gray-400 text-xs">
                            Reason: {log.details.reason}
                          </Text>
                        )}
                        {log.details.requester && (
                          <Text className="text-gray-400 text-xs">
                            Requester: {log.details.requester}
                          </Text>
                        )}
                      </View>
                    )}
                  </View>
                </View>
              );
            })}
          </View>
        )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
