import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  RefreshControl,
  ActivityIndicator,
  TouchableOpacity,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';

const BACKEND_URL = process.env.EXPO_PUBLIC_BACKEND_URL;

interface RouteStop {
  subscriber_id: string;
  name: string;
  address: string;
  lat: number;
  lng: number;
  order: number;
  estimated_time: string;
}

interface OptimizedRoute {
  total_stops: number;
  total_distance_km: number;
  estimated_duration_minutes: number;
  stops: RouteStop[];
}

export default function RouteScreen() {
  const [route, setRoute] = useState<OptimizedRoute | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchRoute = useCallback(async () => {
    try {
      const res = await fetch(`${BACKEND_URL}/api/delivery-route`);
      if (res.ok) {
        setRoute(await res.json());
      }
    } catch (error) {
      console.error('Error fetching route:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchRoute();
  }, [fetchRoute]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    fetchRoute();
  }, [fetchRoute]);

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#ff9f1c" />
      </View>
    );
  }

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      showsVerticalScrollIndicator={false}
    >
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Tomorrow's Route</Text>
        <Text style={styles.headerSubtitle}>Optimized delivery sequence</Text>
      </View>

      {/* Stats Cards */}
      <View style={styles.statsRow}>
        <View style={styles.statCard}>
          <Ionicons name="navigate-outline" size={24} color="#1b4332" />
          <Text style={styles.statNumber}>{route?.total_stops || 0}</Text>
          <Text style={styles.statLabel}>Stops</Text>
        </View>
        <View style={styles.statCard}>
          <Ionicons name="speedometer-outline" size={24} color="#3b82f6" />
          <Text style={styles.statNumber}>{route?.total_distance_km.toFixed(1) || 0}</Text>
          <Text style={styles.statLabel}>km</Text>
        </View>
        <View style={styles.statCard}>
          <Ionicons name="time-outline" size={24} color="#f59e0b" />
          <Text style={styles.statNumber}>{route?.estimated_duration_minutes || 0}</Text>
          <Text style={styles.statLabel}>mins</Text>
        </View>
      </View>

      {/* Map Placeholder */}
      <View style={styles.mapPlaceholder}>
        <View style={styles.mapContent}>
          <Ionicons name="map" size={48} color="#1b4332" />
          <Text style={styles.mapTitle}>Halifax Delivery Zone</Text>
          <Text style={styles.mapSubtitle}>{route?.total_stops || 0} stops optimized for shortest route</Text>
        </View>
        {/* Simulated route line */}
        <View style={styles.routeLine}>
          {route?.stops.map((_, index) => (
            <View key={index} style={styles.routePoint}>
              <View style={[styles.routeDot, index === 0 && styles.routeDotStart]} />
              {index < (route?.stops.length || 0) - 1 && <View style={styles.routeConnector} />}
            </View>
          ))}
        </View>
      </View>

      {/* Route List */}
      <Text style={styles.sectionTitle}>Delivery Sequence</Text>
      <View style={styles.routeList}>
        {route?.stops.map((stop, index) => (
          <View key={stop.subscriber_id} style={styles.stopCard}>
            <View style={styles.stopOrder}>
              <Text style={styles.stopOrderText}>{index + 1}</Text>
            </View>
            <View style={styles.stopInfo}>
              <Text style={styles.stopName}>{stop.name}</Text>
              <Text style={styles.stopAddress}>{stop.address}</Text>
              <View style={styles.stopMeta}>
                <Ionicons name="time-outline" size={12} color="#6b7280" />
                <Text style={styles.stopTime}>ETA: {stop.estimated_time}</Text>
              </View>
            </View>
            <TouchableOpacity style={styles.navigationButton}>
              <Ionicons name="navigate" size={18} color="#3b82f6" />
            </TouchableOpacity>
          </View>
        ))}

        {(!route?.stops || route.stops.length === 0) && (
          <View style={styles.emptyState}>
            <Ionicons name="bicycle-outline" size={48} color="#d1d5db" />
            <Text style={styles.emptyTitle}>No Deliveries Tomorrow</Text>
            <Text style={styles.emptySubtitle}>All subscribers are either skipping or expired</Text>
          </View>
        )}
      </View>

      {/* Legend */}
      <View style={styles.legend}>
        <View style={styles.legendItem}>
          <View style={[styles.legendDot, { backgroundColor: '#16a34a' }]} />
          <Text style={styles.legendText}>Starting Point</Text>
        </View>
        <View style={styles.legendItem}>
          <View style={[styles.legendDot, { backgroundColor: '#3b82f6' }]} />
          <Text style={styles.legendText}>Delivery Stop</Text>
        </View>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8f9fa' },
  content: { padding: 16, paddingBottom: 32 },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#f8f9fa' },

  header: { marginBottom: 16 },
  headerTitle: { fontSize: 24, fontWeight: '900', color: '#1b4332' },
  headerSubtitle: { fontSize: 14, color: '#6b7280', marginTop: 4 },

  statsRow: { flexDirection: 'row', gap: 12, marginBottom: 16 },
  statCard: {
    flex: 1,
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  statNumber: { fontSize: 24, fontWeight: '800', color: '#1b4332', marginTop: 8 },
  statLabel: { fontSize: 10, fontWeight: '600', color: '#6b7280', textTransform: 'uppercase', marginTop: 2 },

  mapPlaceholder: {
    backgroundColor: '#e8f5e9',
    borderRadius: 20,
    padding: 24,
    marginBottom: 24,
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#c8e6c9',
    borderStyle: 'dashed',
  },
  mapContent: { alignItems: 'center', marginBottom: 16 },
  mapTitle: { fontSize: 16, fontWeight: '700', color: '#1b4332', marginTop: 12 },
  mapSubtitle: { fontSize: 12, color: '#6b7280', marginTop: 4 },
  routeLine: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center' },
  routePoint: { flexDirection: 'row', alignItems: 'center' },
  routeDot: { width: 12, height: 12, borderRadius: 6, backgroundColor: '#3b82f6' },
  routeDotStart: { backgroundColor: '#16a34a', width: 16, height: 16, borderRadius: 8 },
  routeConnector: { width: 24, height: 2, backgroundColor: '#3b82f6' },

  sectionTitle: { fontSize: 18, fontWeight: '700', color: '#1b4332', marginBottom: 12 },

  routeList: { gap: 12 },
  stopCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  stopOrder: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#1b4332',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  stopOrderText: { color: '#fff', fontWeight: '800', fontSize: 14 },
  stopInfo: { flex: 1 },
  stopName: { fontSize: 14, fontWeight: '700', color: '#1f2937' },
  stopAddress: { fontSize: 12, color: '#6b7280', marginTop: 2 },
  stopMeta: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 6 },
  stopTime: { fontSize: 11, color: '#6b7280' },
  navigationButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#eff6ff',
    justifyContent: 'center',
    alignItems: 'center',
  },

  emptyState: { alignItems: 'center', padding: 32 },
  emptyTitle: { fontSize: 16, fontWeight: '700', color: '#9ca3af', marginTop: 12 },
  emptySubtitle: { fontSize: 12, color: '#d1d5db', marginTop: 4, textAlign: 'center' },

  legend: { flexDirection: 'row', justifyContent: 'center', gap: 24, marginTop: 24 },
  legendItem: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  legendDot: { width: 10, height: 10, borderRadius: 5 },
  legendText: { fontSize: 11, color: '#6b7280' },
});
