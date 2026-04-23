import React, { useMemo, useState, useCallback } from 'react';
import {
  StyleSheet, Text, View, Pressable, FlatList, Platform,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';
import { Ionicons, Feather, MaterialCommunityIcons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import Colors from '@/constants/colors';
import { useApp } from '@/lib/app-context';
import { getSeverityColor } from '@/lib/categories/config';
import type { IndustryType, SeverityGrade } from '@/lib/categories/types';
import { syncInspections, type SyncResult } from '@/lib/sync-service';

type FilterType = 'all' | IndustryType;

function InspectionItem({ item, t }: { item: any; t: any }) {
  const severityColor = getSeverityColor(item.result.severity);
  const industryIcon = item.industry === 'food' ? 'nutrition'
    : item.industry === 'textile' ? 'shirt'
      : item.industry === 'metal' ? 'hardware-chip'
        : 'flash';

  return (
    <View style={styles.inspectionCard}>
      <View style={[styles.severityStrip, { backgroundColor: severityColor }]} />
      <View style={styles.cardContent}>
        <View style={styles.cardHeader}>
          <View style={styles.cardIconRow}>
            <Ionicons name={industryIcon as any} size={18} color={Colors.dark.textSecondary} />
            <Text style={styles.cardIndustry}>
              {t(item.industry === 'food' ? 'food_processing' :
                item.industry === 'textile' ? 'textiles' :
                  item.industry === 'metal' ? 'metal_works' : 'quick_detect')}
            </Text>
          </View>
          <Text style={[styles.cardSeverity, { color: severityColor }]}>
            {t(`severity_${item.result.severity}`)}
          </Text>
        </View>

        <Text style={styles.cardDefect}>{t(item.result.defectKey).replace(/_/g, ' ')}</Text>

        <View style={styles.cardFooter}>
          <View style={styles.cardMeta}>
            <Feather name="target" size={12} color={Colors.dark.textMuted} />
            <Text style={styles.cardMetaText}>
              {Math.round(item.result.confidence * 100)}%
            </Text>
          </View>
          <View style={styles.cardMeta}>
            <Feather name="clock" size={12} color={Colors.dark.textMuted} />
            <Text style={styles.cardMetaText}>
              {new Date(item.timestamp).toLocaleString([], {
                month: 'short', day: 'numeric',
                hour: '2-digit', minute: '2-digit',
              })}
            </Text>
          </View>
          {item.savedAmount > 0 && (
            <View style={styles.cardMeta}>
              <Ionicons name="cash-outline" size={12} color={Colors.dark.primary} />
              <Text style={[styles.cardMetaText, { color: Colors.dark.primary }]}>
                {'\u20B9'}{item.savedAmount}
              </Text>
            </View>
          )}
        </View>
      </View>
    </View>
  );
}

export default function HistoryScreen() {
  const insets = useSafeAreaInsets();
  const { t } = useTranslation();
  const { inspections, unsyncedCount, refreshData } = useApp();
  const [filter, setFilter] = useState<FilterType>('all');
  const [syncing, setSyncing] = useState(false);
  const [syncResult, setSyncResult] = useState<SyncResult | null>(null);
  const webTopInset = Platform.OS === 'web' ? 67 : 0;

  const filtered = useMemo(() => {
    if (filter === 'all') return inspections;
    return inspections.filter(i => i.industry === filter);
  }, [inspections, filter]);

  const handleSync = useCallback(async () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setSyncing(true);
    setSyncResult(null);
    try {
      const result = await syncInspections();
      setSyncResult(result);
      if (result.success) {
        refreshData();
      }
    } catch {
      setSyncResult({ success: false, syncedCount: 0, totalPending: 0, error: 'Sync failed' });
    }
    setSyncing(false);
  }, [refreshData]);

  const renderItem = useCallback(({ item }: { item: any }) => (
    <InspectionItem item={item} t={t} />
  ), [t]);

  const keyExtractor = useCallback((item: any) => item.id, []);

  return (
    <View style={styles.container}>
      <View style={[styles.header, { paddingTop: insets.top + webTopInset + 16 }]}>
        <Text style={styles.title}>{t('history')}</Text>
        <Pressable
          onPress={handleSync}
          disabled={syncing}
          style={({ pressed }) => [
            styles.syncButton,
            pressed && { opacity: 0.7 },
            syncing && { opacity: 0.5 },
          ]}
        >
          <Ionicons
            name="cloud-upload"
            size={20}
            color={unsyncedCount > 0 ? Colors.dark.accent : Colors.dark.primary}
          />
          {unsyncedCount > 0 && (
            <View style={styles.syncBadge}>
              <Text style={styles.syncBadgeText}>{unsyncedCount}</Text>
            </View>
          )}
        </Pressable>
      </View>

      {syncResult && (
        <View style={[
          styles.syncResultBar,
          { backgroundColor: syncResult.success ? Colors.dark.primary + '15' : Colors.dark.critical + '15' },
          { marginHorizontal: 20 },
        ]}>
          <Ionicons
            name={syncResult.success ? 'checkmark-circle' : 'alert-circle'}
            size={16}
            color={syncResult.success ? Colors.dark.primary : Colors.dark.critical}
          />
          <Text style={[styles.syncResultText, {
            color: syncResult.success ? Colors.dark.primary : Colors.dark.critical
          }]}>
            {syncResult.success
              ? `Synced ${syncResult.syncedCount} records`
              : syncResult.error || 'Sync failed'}
          </Text>
        </View>
      )}

      <View style={styles.filterRow}>
        {(['all', 'food', 'textile', 'metal', 'general'] as FilterType[]).map(f => (
          <Pressable
            key={f}
            onPress={() => { Haptics.selectionAsync(); setFilter(f); }}
            style={[styles.filterChip, filter === f && styles.filterChipActive]}
          >
            <Text style={[styles.filterText, filter === f && styles.filterTextActive]}>
              {f === 'all' ? t('all_time') :
                f === 'food' ? t('food_processing') :
                  f === 'textile' ? t('textiles') :
                    f === 'metal' ? t('metal_works') : t('general') || 'General'}
            </Text>
          </Pressable>
        ))}
      </View>

      <FlatList
        data={filtered}
        renderItem={renderItem}
        keyExtractor={keyExtractor}
        contentContainerStyle={[styles.listContent, { paddingBottom: 120 }]}
        showsVerticalScrollIndicator={false}
        ListEmptyComponent={
          <View style={styles.emptyState}>
            <Ionicons name="file-tray-outline" size={64} color={Colors.dark.textMuted} />
            <Text style={styles.emptyTitle}>{t('no_inspections')}</Text>
            <Text style={styles.emptyDesc}>{t('start_first')}</Text>
          </View>
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.dark.background,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingBottom: 12,
  },
  title: {
    fontFamily: 'Rubik_700Bold',
    fontSize: 26,
    color: Colors.dark.text,
  },
  syncButton: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: Colors.dark.surface,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: Colors.dark.border,
  },
  syncBadge: {
    position: 'absolute',
    top: -4,
    right: -4,
    backgroundColor: Colors.dark.accent,
    borderRadius: 10,
    minWidth: 20,
    height: 20,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 4,
  },
  syncBadgeText: {
    fontFamily: 'Rubik_700Bold',
    fontSize: 10,
    color: '#000',
  },
  syncResultBar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    padding: 10,
    borderRadius: 10,
    marginBottom: 8,
  },
  syncResultText: {
    fontFamily: 'Rubik_400Regular',
    fontSize: 13,
  },
  filterRow: {
    flexDirection: 'row',
    gap: 8,
    paddingHorizontal: 20,
    paddingVertical: 8,
  },
  filterChip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    backgroundColor: Colors.dark.surface,
    borderWidth: 1,
    borderColor: Colors.dark.border,
  },
  filterChipActive: {
    backgroundColor: Colors.dark.primary + '20',
    borderColor: Colors.dark.primary,
  },
  filterText: {
    fontFamily: 'Rubik_500Medium',
    fontSize: 12,
    color: Colors.dark.textSecondary,
  },
  filterTextActive: {
    color: Colors.dark.primary,
  },
  listContent: {
    paddingHorizontal: 20,
    paddingTop: 8,
  },
  inspectionCard: {
    flexDirection: 'row',
    backgroundColor: Colors.dark.surface,
    borderRadius: 14,
    marginBottom: 10,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: Colors.dark.border,
  },
  severityStrip: {
    width: 5,
  },
  cardContent: {
    flex: 1,
    padding: 14,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  cardIconRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  cardIndustry: {
    fontFamily: 'Rubik_400Regular',
    fontSize: 12,
    color: Colors.dark.textSecondary,
  },
  cardSeverity: {
    fontFamily: 'Rubik_600SemiBold',
    fontSize: 13,
  },
  cardDefect: {
    fontFamily: 'Rubik_600SemiBold',
    fontSize: 16,
    color: Colors.dark.text,
    marginBottom: 8,
  },
  cardFooter: {
    flexDirection: 'row',
    gap: 14,
  },
  cardMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  cardMetaText: {
    fontFamily: 'Rubik_400Regular',
    fontSize: 11,
    color: Colors.dark.textMuted,
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 60,
    gap: 12,
  },
  emptyTitle: {
    fontFamily: 'Rubik_600SemiBold',
    fontSize: 20,
    color: Colors.dark.textSecondary,
  },
  emptyDesc: {
    fontFamily: 'Rubik_400Regular',
    fontSize: 14,
    color: Colors.dark.textMuted,
    textAlign: 'center',
  },
});
