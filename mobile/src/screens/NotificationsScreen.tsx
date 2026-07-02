import React, { useState } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity } from 'react-native';

interface Notification {
  id: string;
  title: string;
  body: string;
  time: string;
  type: 'UNKNOWN' | 'RENT_EXPIRED' | 'KNOWN';
  read: boolean;
}

const NotificationsScreen = () => {
  // Mock notifications data
  const [notifications, setNotifications] = useState<Notification[]>([
    {
      id: '1',
      title: 'Unknown Person Detected',
      body: 'Front Gate Camera detected an unknown face at 11:45 AM.',
      time: '10m ago',
      type: 'UNKNOWN',
      read: false
    },
    {
      id: '2',
      title: 'Rent Expired Tenant',
      body: 'John Doe entered the building. Rent expired on 2026-06-25.',
      time: '2h ago',
      type: 'RENT_EXPIRED',
      read: true
    }
  ]);

  const markAsRead = (id: string) => {
    setNotifications((prev: Notification[]) => prev.map((n: Notification) => n.id === id ? { ...n, read: true } : n));
  };

  const getIconColor = (type: string) => {
    if (type === 'UNKNOWN') return '#EF4444'; // Red
    if (type === 'RENT_EXPIRED') return '#F59E0B'; // Yellow
    return '#3B82F6'; // Blue
  };

  const renderItem = ({ item }: { item: Notification }) => (
    <TouchableOpacity 
      style={[styles.notificationCard, !item.read && styles.unreadCard]}
      onPress={() => markAsRead(item.id)}
    >
      <View style={[styles.iconIndicator, { backgroundColor: getIconColor(item.type) }]} />
      <View style={styles.contentContainer}>
        <View style={styles.headerRow}>
          <Text style={[styles.title, !item.read && styles.unreadText]}>{item.title}</Text>
          <Text style={styles.time}>{item.time}</Text>
        </View>
        <Text style={styles.body}>{item.body}</Text>
      </View>
    </TouchableOpacity>
  );

  return (
    <View style={styles.container}>
      <FlatList
        data={notifications}
        keyExtractor={(item: Notification) => item.id}
        renderItem={renderItem}
        contentContainerStyle={styles.listContent}
        ListEmptyComponent={<Text style={styles.emptyText}>No notifications yet.</Text>}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F3F4F6',
  },
  listContent: {
    padding: 16,
  },
  notificationCard: {
    flexDirection: 'row',
    backgroundColor: '#FFFFFF',
    borderRadius: 8,
    marginBottom: 12,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 2,
  },
  unreadCard: {
    backgroundColor: '#F0F9FF', // Light blue tint
  },
  iconIndicator: {
    width: 12,
    height: 12,
    borderRadius: 6,
    marginTop: 4,
    marginRight: 12,
  },
  contentContainer: {
    flex: 1,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  title: {
    fontSize: 16,
    fontWeight: '600',
    color: '#374151',
  },
  unreadText: {
    fontWeight: '700',
    color: '#111827',
  },
  time: {
    fontSize: 12,
    color: '#9CA3AF',
  },
  body: {
    fontSize: 14,
    color: '#6B7280',
    lineHeight: 20,
  },
  emptyText: {
    textAlign: 'center',
    color: '#6B7280',
    marginTop: 40,
  }
});

export default NotificationsScreen;
