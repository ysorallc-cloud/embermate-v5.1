// ============================================================================
// PHOTOS SCREEN
// View and manage all photos (medications, wounds, documents)
// ============================================================================

import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Platform,
  RefreshControl,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { useFocusEffect } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { Colors, Spacing, BorderRadius } from './_theme/theme-tokens';
import PhotoCapture from '../components/PhotoCapture';
import PhotoGallery from '../components/PhotoGallery';
import {
  getPhotos,
  getPhotosByType,
  getPhotoStats,
  Photo,
} from '../utils/photoStorage';

type PhotoFilter = 'all' | 'medication' | 'wound' | 'document' | 'other';

export default function PhotosScreen() {
  const router = useRouter();
  const [photos, setPhotos] = useState<Photo[]>([]);
  const [filter, setFilter] = useState<PhotoFilter>('all');
  const [refreshing, setRefreshing] = useState(false);
  const [stats, setStats] = useState({ count: 0, sizeFormatted: '0 MB' });

  useFocusEffect(
    useCallback(() => {
      loadPhotos();
    }, [filter])
  );

  const loadPhotos = async () => {
    try {
      let loadedPhotos: Photo[] = [];
      if (filter === 'all') {
        loadedPhotos = await getPhotos();
      } else {
        loadedPhotos = await getPhotosByType(filter);
      }

      // Sort by timestamp descending (newest first)
      loadedPhotos.sort(
        (a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
      );

      setPhotos(loadedPhotos);

      // Load stats
      const photoStats = await getPhotoStats();
      setStats(photoStats);
    } catch (error) {
      console.error('Error loading photos:', error);
    }
  };

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await loadPhotos();
    setRefreshing(false);
  }, [filter]);

  const handlePhotoSaved = () => {
    loadPhotos();
  };

  const handlePhotoDeleted = () => {
    loadPhotos();
  };

  const filters: { key: PhotoFilter; label: string; icon: string }[] = [
    { key: 'all', label: 'All', icon: 'images-outline' },
    { key: 'medication', label: 'Meds', icon: 'medkit-outline' },
    { key: 'wound', label: 'Wounds', icon: 'bandage-outline' },
    { key: 'document', label: 'Docs', icon: 'document-text-outline' },
  ];

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <LinearGradient
        colors={[Colors.backgroundGradientStart, Colors.backgroundGradientEnd]}
        style={styles.gradient}
      >
        <ScrollView
          style={styles.scrollView}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={Colors.accent} />
          }
        >
          {/* Header */}
          <View style={styles.header}>
            <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
              <Text style={styles.backIcon}>←</Text>
            </TouchableOpacity>
            <Text style={styles.headerLabel}>PHOTOS</Text>
            <View style={styles.placeholder} />
          </View>

          <Text style={styles.title}>Photo Library</Text>

          {/* Stats */}
          <View style={styles.statsCard}>
            <View style={styles.statItem}>
              <Text style={styles.statValue}>{stats.count}</Text>
              <Text style={styles.statLabel}>Photos</Text>
            </View>
            <View style={styles.statDivider} />
            <View style={styles.statItem}>
              <Text style={styles.statValue}>{stats.sizeFormatted}</Text>
              <Text style={styles.statLabel}>Storage</Text>
            </View>
          </View>

          {/* Add Photo Button */}
          <PhotoCapture
            type="other"
            onPhotoSaved={handlePhotoSaved}
          />

          {/* Filters */}
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            style={styles.filtersScroll}
            contentContainerStyle={styles.filters}
          >
            {filters.map((f) => (
              <TouchableOpacity
                key={f.key}
                style={[styles.filterChip, filter === f.key && styles.filterChipActive]}
                onPress={() => setFilter(f.key)}
              >
                <Ionicons
                  name={f.icon as any}
                  size={18}
                  color={filter === f.key ? Colors.surface : Colors.textSecondary}
                />
                <Text
                  style={[
                    styles.filterChipText,
                    filter === f.key && styles.filterChipTextActive,
                  ]}
                >
                  {f.label}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>

          {/* Photo Gallery */}
          <View style={styles.galleryContainer}>
            <PhotoGallery
              photos={photos}
              onPhotoDeleted={handlePhotoDeleted}
              emptyMessage={
                filter === 'all'
                  ? 'No photos yet. Tap "Add Photo" to get started.'
                  : `No ${filter} photos yet`
              }
            />
          </View>

          <View style={{ height: 40 }} />
        </ScrollView>
      </LinearGradient>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  gradient: { flex: 1 },
  scrollView: { flex: 1, paddingHorizontal: Spacing.xl },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: Platform.OS === 'android' ? 20 : 0,
    paddingBottom: Spacing.md,
  },
    backButton: {
    width: 44,
    height: 44,
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  backIcon: {
    fontSize: 24,
    color: Colors.textPrimary,
  },
  headerLabel: { fontSize: 11, color: Colors.textMuted, letterSpacing: 1, fontWeight: '600' },
  placeholder: { width: 40 },
  title: { fontSize: 28, fontWeight: '300', color: Colors.textPrimary, marginBottom: Spacing.lg },
  statsCard: {
    flexDirection: 'row',
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.lg,
    padding: Spacing.lg,
    marginBottom: Spacing.lg,
  },
  statItem: {
    flex: 1,
    alignItems: 'center',
  },
  statValue: {
    fontSize: 24,
    fontWeight: '600',
    color: Colors.accent,
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 13,
    color: Colors.textSecondary,
  },
  statDivider: {
    width: 1,
    backgroundColor: Colors.surfaceAlt,
  },
  filtersScroll: {
    marginVertical: Spacing.lg,
  },
  filters: {
    flexDirection: 'row',
    gap: 8,
  },
  filterChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 8,
    paddingHorizontal: 16,
    backgroundColor: Colors.surface,
    borderRadius: 20,
  },
  filterChipActive: {
    backgroundColor: Colors.accent,
  },
  filterChipText: {
    fontSize: 14,
    fontWeight: '500',
    color: Colors.textSecondary,
  },
  filterChipTextActive: {
    color: Colors.surface,
  },
  galleryContainer: {
    marginTop: Spacing.md,
  },
});
