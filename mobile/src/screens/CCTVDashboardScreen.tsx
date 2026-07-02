import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, RefreshControl } from 'react-native';
// Note: In a real Expo or React Native app, you'd use expo-av or react-native-video for HLS
// import { Video } from 'expo-av';

const CCTVDashboardScreen = () => {
  const [refreshing, setRefreshing] = useState(false);
  const [stats, setStats] = useState({ known: 0, unknown: 0, rent_expired: 0 });

  const fetchStats = async () => {
    // Mock fetch stats
    // const res = await fetch('YOUR_API_URL/api/events/stats');
    // const data = await res.json();
    setStats({ known: 12, unknown: 2, rent_expired: 1 });
  };

  useEffect(() => {
    fetchStats();
  }, []);

  const onRefresh = React.useCallback(() => {
    setRefreshing(true);
    fetchStats().then(() => setRefreshing(false));
  }, []);

  return (
    <ScrollView 
      style={styles.container}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
    >
      <Text style={styles.title}>CCTV Dashboard</Text>
      
      {/* Live View Placeholder */}
      <View style={styles.videoContainer}>
        <Text style={styles.videoText}>[Live Camera Feed Placeholder]</Text>
        <Text style={styles.videoSubtext}>Requires react-native-video to play HLS</Text>
      </View>

      <Text style={styles.subtitle}>Today's Overview</Text>
      <View style={styles.statsContainer}>
        <View style={[styles.statCard, { borderLeftColor: '#3B82F6' }]}>
          <Text style={styles.statLabel}>Known</Text>
          <Text style={styles.statValue}>{stats.known}</Text>
        </View>
        <View style={[styles.statCard, { borderLeftColor: '#EF4444' }]}>
          <Text style={styles.statLabel}>Unknown</Text>
          <Text style={styles.statValue}>{stats.unknown}</Text>
        </View>
        <View style={[styles.statCard, { borderLeftColor: '#F59E0B' }]}>
          <Text style={styles.statLabel}>Rent Expired</Text>
          <Text style={styles.statValue}>{stats.rent_expired}</Text>
        </View>
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F3F4F6',
    padding: 16,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#1F2937',
    marginBottom: 16,
  },
  subtitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#374151',
    marginTop: 24,
    marginBottom: 12,
  },
  videoContainer: {
    height: 220,
    backgroundColor: '#111827',
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'hidden',
  },
  videoText: {
    color: '#F9FAFB',
    fontSize: 16,
    fontWeight: '500',
  },
  videoSubtext: {
    color: '#9CA3AF',
    fontSize: 12,
    marginTop: 8,
  },
  statsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  statCard: {
    backgroundColor: '#FFFFFF',
    padding: 16,
    borderRadius: 8,
    flex: 1,
    marginHorizontal: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 2,
    borderLeftWidth: 4,
  },
  statLabel: {
    fontSize: 12,
    color: '#6B7280',
    marginBottom: 4,
  },
  statValue: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#111827',
  }
});

export default CCTVDashboardScreen;
