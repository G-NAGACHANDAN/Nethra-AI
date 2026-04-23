import React, { useState, useMemo, useCallback } from 'react';
import {
  StyleSheet, Text, View, Pressable, ScrollView, Platform, Alert, ActivityIndicator,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';
import { Ionicons, Feather, MaterialCommunityIcons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { generatePredictiveInsights, PredictiveInsights } from '@/lib/ai/analytics-service';
import Animated, { FadeInDown, FadeInUp, SlideInRight } from 'react-native-reanimated';
import Svg, { Rect as SvgRect, Text as SvgText } from 'react-native-svg';
import Colors from '@/constants/colors';
import { useApp } from '@/lib/app-context';
import { getSeverityColor } from '@/lib/categories/config';
import type { SeverityGrade, IndustryType } from '@/lib/categories/types';

type TimeFilter = 'today' | 'week' | 'all';

export default function DashboardScreen() {
  const insets = useSafeAreaInsets();
  const { t, i18n } = useTranslation();
  const { inspections, clearAllData } = useApp();
  const [timeFilter, setTimeFilter] = useState<TimeFilter>('today');
  const [insights, setInsights] = useState<PredictiveInsights | null>(null);
  const [isLoadingInsights, setIsLoadingInsights] = useState(false);
  const webTopInset = Platform.OS === 'web' ? 67 : 0;

  const filteredInspections = useMemo(() => {
    const now = Date.now();
    switch (timeFilter) {
      case 'today': {
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        return inspections.filter(i => i.timestamp >= today.getTime());
      }
      case 'week':
        return inspections.filter(i => i.timestamp >= now - 7 * 24 * 60 * 60 * 1000);
      case 'all':
        return inspections;
    }
  }, [inspections, timeFilter]);

  const savings = filteredInspections.reduce((sum, i) => sum + i.savedAmount, 0);
  const passCount = filteredInspections.filter(i => i.result.severity === 'pass').length;
  const defectRate = filteredInspections.length > 0
    ? Math.round(((filteredInspections.length - passCount) / filteredInspections.length) * 100) : 0;
  const passRate = filteredInspections.length > 0 ? 100 - defectRate : 0;

  const criticalAlerts = useMemo(() => {
    const hourAgo = Date.now() - 60 * 60 * 1000;
    return inspections.filter(i => i.timestamp >= hourAgo && i.result.severity === 'critical');
  }, [inspections]);

  const industryBarData = useMemo(() => {
    const data: Record<string, Record<string, number>> = {
      food: { critical: 0, major: 0, minor: 0, pass: 0 },
      textile: { critical: 0, major: 0, minor: 0, pass: 0 },
      metal: { critical: 0, major: 0, minor: 0, pass: 0 },
      general: { critical: 0, major: 0, minor: 0, pass: 0 },
    };
    filteredInspections.forEach(i => {
      if (data[i.industry]) {
        data[i.industry][i.result.severity]++;
      }
    });
    return data;
  }, [filteredInspections]);

  const maxBarValue = useMemo(() => {
    let max = 1;
    Object.values(industryBarData).forEach(severities => {
      const total = Object.values(severities).reduce((s, v) => s + v, 0);
      if (total > max) max = total;
    });
    return max;
  }, [industryBarData]);

  const severityCounts = useMemo(() => {
    const counts = { critical: 0, major: 0, minor: 0, pass: 0 };
    filteredInspections.forEach(i => {
      counts[i.result.severity as keyof typeof counts]++;
    });
    return counts;
  }, [filteredInspections]);

  const defectBreakdown = useMemo(() => {
    const breakdown: Record<string, number> = {};
    filteredInspections.forEach(i => {
      breakdown[i.result.defectKey] = (breakdown[i.result.defectKey] || 0) + 1;
    });
    return Object.entries(breakdown).sort(([, a], [, b]) => b - a).slice(0, 6);
  }, [filteredInspections]);

  const maxBreakdownCount = defectBreakdown.length > 0
    ? Math.max(...defectBreakdown.map(([, v]) => v)) : 1;

  const handleClear = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
    if (Platform.OS === 'web') {
      clearAllData();
    } else {
      Alert.alert(
        t('clear_data'),
        t('clear_confirm'),
        [
          { text: t('cancel'), style: 'cancel' },
          { text: t('confirm'), style: 'destructive', onPress: clearAllData },
        ]
      );
    }
  }, [clearAllData, t]);

  const handleGenerateInsights = useCallback(async () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    if (inspections.length < 5) {
      Alert.alert(t('insufficient_data'), t('need_more_inspections'));
      return;
    }

    setIsLoadingInsights(true);
    try {
      const result = await generatePredictiveInsights(inspections);
      setInsights(result);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch (e) {
      Alert.alert(t('error'), t('insights_failed'));
    } finally {
      setIsLoadingInsights(false);
    }
  }, [inspections, t]);

  const getIndustryLabel = (key: string) => {
    if (key === 'food') return i18n.language === 'ta' ? '\u0B89\u0BA3\u0BB5\u0BC1' : 'Food';
    if (key === 'textile') return i18n.language === 'ta' ? '\u0B9C\u0BB5\u0BC1\u0BB3\u0BBF' : 'Textile';
    if (key === 'metal') return i18n.language === 'ta' ? '\u0B89\u0BB2\u0BCB\u0B95\u0BAE\u0BCD' : 'Metal';
    return i18n.language === 'ta' ? '\u0BAA\u0BCA\u0BA4\u0BC1' : 'General';
  };

  return (
    <View style={styles.container}>
      <ScrollView
        contentContainerStyle={[
          styles.scrollContent,
          { paddingTop: insets.top + webTopInset + 16, paddingBottom: 120 },
        ]}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.header}>
          <Text style={styles.title}>{t('supervisor_view')}</Text>
          {inspections.length > 0 && (
            <Pressable
              onPress={handleClear}
              style={({ pressed }) => [styles.clearBtn, pressed && { opacity: 0.7 }]}
            >
              <Feather name="trash-2" size={18} color={Colors.dark.critical} />
            </Pressable>
          )}
        </View>

        <View style={styles.filterRow}>
          {(['today', 'week', 'all'] as TimeFilter[]).map(f => (
            <Pressable
              key={f}
              onPress={() => { Haptics.selectionAsync(); setTimeFilter(f); }}
              style={[styles.filterChip, timeFilter === f && styles.filterChipActive]}
            >
              <Text style={[styles.filterText, timeFilter === f && styles.filterTextActive]}>
                {t(f === 'today' ? 'today' : f === 'week' ? 'this_week' : 'all_time')}
              </Text>
            </Pressable>
          ))}
        </View>

        {filteredInspections.length === 0 ? (
          <View style={styles.emptyState}>
            <Ionicons name="analytics-outline" size={64} color={Colors.dark.textMuted} />
            <Text style={styles.emptyTitle}>{t('no_data')}</Text>
            <Text style={styles.emptyDesc}>{t('start_first')}</Text>
          </View>
        ) : (
          <>
            <View style={styles.savingsCard}>
              <View style={styles.savingsIconCircle}>
                <Ionicons name="trending-up" size={28} color={Colors.dark.primary} />
              </View>
              <View style={styles.savingsContent}>
                <Text style={styles.savingsLabel}>{t('savings_today')}</Text>
                <Text style={styles.savingsValue}>{'\u20B9'}{savings.toLocaleString()}</Text>
              </View>
              <View style={styles.savingsMetric}>
                <Text style={styles.savingsMetricValue}>{filteredInspections.length}</Text>
                <Text style={styles.savingsMetricLabel}>{t('total_inspections')}</Text>
              </View>
            </View>

            <View style={styles.metricsRow}>
              <View style={[styles.metricCard, { borderLeftColor: Colors.severity.pass }]}>
                <Text style={[styles.metricValue, { color: Colors.severity.pass }]}>{passRate}%</Text>
                <Text style={styles.metricLabel}>{t('pass_rate')}</Text>
              </View>
              <View style={[styles.metricCard, { borderLeftColor: Colors.severity.critical }]}>
                <Text style={[styles.metricValue, { color: Colors.severity.critical }]}>{defectRate}%</Text>
                <Text style={styles.metricLabel}>{t('defect_rate')}</Text>
              </View>
            </View>

            {criticalAlerts.length > 0 && (
              <Animated.View entering={FadeInDown.duration(400)}>
                <View style={styles.alertCard}>
                  <View style={styles.alertHeader}>
                    <Ionicons name="alert-circle" size={20} color={Colors.severity.critical} />
                    <Text style={styles.alertTitle}>
                      {i18n.language === 'ta' ? '\u0BA8\u0BC7\u0BB0\u0B9F\u0BBF \u0B8E\u0B9A\u0BCD\u0B9A\u0BB0\u0BBF\u0B95\u0BCD\u0B95\u0BC8\u0B95\u0BB3\u0BCD' : 'Live Critical Alerts'}
                    </Text>
                    <View style={styles.alertBadge}>
                      <Text style={styles.alertBadgeText}>{criticalAlerts.length}</Text>
                    </View>
                  </View>
                  {criticalAlerts.slice(0, 3).map(alert => (
                    <View key={alert.id} style={styles.alertItem}>
                      <View style={[styles.alertDot, { backgroundColor: Colors.severity.critical }]} />
                      <Text style={styles.alertDefect}>{t(alert.result.defectKey).replace(/_/g, ' ')}</Text>
                      <Text style={styles.alertTime}>
                        {new Date(alert.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </Text>
                    </View>
                  ))}
                </View>
              </Animated.View>
            )}

            {/* AI Predictive Maintenance Section */}
            <View style={styles.aiSection}>
              <View style={styles.aiHeader}>
                <View style={styles.aiTitleRow}>
                  <MaterialCommunityIcons name="robot-industrial" size={24} color={Colors.dark.primary} />
                  <Text style={[styles.sectionTitle, { marginBottom: 0, marginTop: 0 }]}>
                    {t('predictive_maintenance').replace(/_/g, ' ') || 'AI Insights'}
                  </Text>
                </View>
                {!insights && (
                  <Pressable
                    onPress={handleGenerateInsights}
                    disabled={isLoadingInsights}
                    style={({ pressed }) => [
                      styles.generateBtn,
                      pressed && { opacity: 0.8 },
                      isLoadingInsights && { opacity: 0.5 }
                    ]}
                  >
                    <Text style={styles.generateBtnText}>
                      {isLoadingInsights ? 'Generating...' : 'Generate New Report'}
                    </Text>
                    {isLoadingInsights && <ActivityIndicator size="small" color="#000" style={{ marginLeft: 8 }} />}
                  </Pressable>
                )}
              </View>

              {insights ? (
                <Animated.View entering={FadeInUp.duration(500)} style={styles.insightsCard}>
                  <View style={[styles.riskBadge, {
                    backgroundColor: insights.risk_level === 'High' ? Colors.severity.critical :
                      insights.risk_level === 'Medium' ? Colors.severity.major : Colors.severity.pass
                  }]}>
                    <Text style={styles.riskText}>{insights.risk_level} Risk</Text>
                  </View>

                  <Text style={styles.insightSummary}>{insights.summary}</Text>

                  <View style={styles.insightDivider} />

                  <Text style={styles.insightHeader}>Root Causes:</Text>
                  {insights.root_causes.map((cause, idx) => (
                    <View key={idx} style={styles.bulletRow}>
                      <View style={styles.bulletDot} />
                      <Text style={styles.bulletText}>{cause}</Text>
                    </View>
                  ))}

                  <View style={styles.insightDivider} />

                  <Text style={styles.insightHeader}>Maintenance Actions:</Text>
                  {insights.maintenance_actions.map((action, idx) => (
                    <View key={idx} style={styles.actionRow}>
                      <Ionicons name="construct-outline" size={16} color={Colors.dark.primary} />
                      <Text style={styles.bulletText}>{action}</Text>
                    </View>
                  ))}

                  <Pressable onPress={() => setInsights(null)} style={styles.closeInsights}>
                    <Text style={styles.closeInsightsText}>Close Report</Text>
                  </Pressable>
                </Animated.View>
              ) : (
                <View style={styles.insightsPlaceholder}>
                  <Text style={styles.placeholderText}>
                    Generate AI-powered predictive maintenance insights based on your inspection history.
                  </Text>
                </View>
              )}
            </View>

            <Text style={styles.sectionTitle}>{t('severity')}</Text>
            <View style={styles.severityGrid}>
              {(['critical', 'major', 'minor', 'pass'] as const).map(s => (
                <View key={s} style={styles.severityItem}>
                  <View style={[styles.severityBadge, { backgroundColor: getSeverityColor(s) + '20' }]}>
                    <Text style={[styles.severityCount, { color: getSeverityColor(s) }]}>
                      {severityCounts[s]}
                    </Text>
                  </View>
                  <Text style={styles.severityLabel}>{t(`severity_${s}`)}</Text>
                </View>
              ))}
            </View>

            <Text style={styles.sectionTitle}>
              {i18n.language === 'ta' ? '\u0BA4\u0BCA\u0BB4\u0BBF\u0BB2\u0BCD \u0BB5\u0BBE\u0BB0\u0BBF \u0BB5\u0BBF\u0BB3\u0B95\u0BCD\u0B95\u0BAA\u0BCD\u0BAA\u0B9F\u0BAE\u0BCD' : 'Defects by Industry'}
            </Text>
            <View style={styles.barChartContainer}>
              {(['food', 'textile', 'metal', 'general'] as IndustryType[]).map((ind, idx) => {
                const data = industryBarData[ind];
                const total = Object.values(data).reduce((s, v) => s + v, 0);
                const barWidth = total > 0 ? (total / maxBarValue) * 100 : 0;
                return (
                  <View key={ind} style={styles.barRow}>
                    <Text style={styles.barLabel}>{getIndustryLabel(ind)}</Text>
                    <View style={styles.barTrack}>
                      {total > 0 ? (
                        <View style={styles.stackedBar}>
                          {(['critical', 'major', 'minor', 'pass'] as const).map(s => {
                            const w = data[s] > 0 ? (data[s] / total) * barWidth : 0;
                            if (w === 0) return null;
                            return (
                              <View
                                key={s}
                                style={[styles.barSegment, {
                                  width: `${w}%`,
                                  backgroundColor: getSeverityColor(s),
                                }]}
                              />
                            );
                          })}
                        </View>
                      ) : (
                        <View style={[styles.barSegment, { width: '2%', backgroundColor: Colors.dark.textMuted + '30' }]} />
                      )}
                    </View>
                    <Text style={styles.barCount}>{total}</Text>
                  </View>
                );
              })}
              <View style={styles.barLegend}>
                {(['critical', 'major', 'minor', 'pass'] as const).map(s => (
                  <View key={s} style={styles.legendItem}>
                    <View style={[styles.legendDot, { backgroundColor: getSeverityColor(s) }]} />
                    <Text style={styles.legendText}>{t(`severity_${s}`)}</Text>
                  </View>
                ))}
              </View>
            </View>

            {defectBreakdown.length > 0 && (
              <>
                <Text style={styles.sectionTitle}>{t('defect_breakdown')}</Text>
                {defectBreakdown.map(([key, count]) => (
                  <View key={key} style={styles.breakdownItem}>
                    <View style={styles.breakdownHeader}>
                      <Text style={styles.breakdownLabel}>{t(key).replace(/_/g, ' ')}</Text>
                      <Text style={styles.breakdownCount}>{count}</Text>
                    </View>
                    <View style={styles.breakdownBarBg}>
                      <View
                        style={[styles.breakdownBar, { width: `${(count / maxBreakdownCount) * 100}%` }]}
                      />
                    </View>
                  </View>
                ))}
              </>
            )}

            <Text style={styles.sectionTitle}>{t('recent_inspections')}</Text>
            {filteredInspections.slice(0, 10).map(ins => (
              <View key={ins.id} style={styles.historyRow}>
                <View style={[styles.dot, { backgroundColor: getSeverityColor(ins.result.severity) }]} />
                <View style={styles.historyContent}>
                  <Text style={styles.historyDefect}>{t(ins.result.defectKey).replace(/_/g, ' ')}</Text>
                  <Text style={styles.historyMeta}>
                    {t(`severity_${ins.result.severity}`)} {' \u2022 '}
                    {Math.round(ins.result.confidence * 100)}% {' \u2022 '}
                    {new Date(ins.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </Text>
                </View>
                {ins.savedAmount > 0 && (
                  <Text style={styles.historySaved}>{'\u20B9'}{ins.savedAmount}</Text>
                )}
              </View>
            ))}
          </>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.dark.background,
  },
  scrollContent: {
    paddingHorizontal: 20,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  title: {
    fontFamily: 'Rubik_700Bold',
    fontSize: 26,
    color: Colors.dark.text,
  },
  clearBtn: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.dark.surface,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Colors.dark.border,
  },
  filterRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 20,
  },
  filterChip: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
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
    fontSize: 13,
    color: Colors.dark.textSecondary,
  },
  filterTextActive: {
    color: Colors.dark.primary,
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
  savingsCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    backgroundColor: Colors.dark.surface,
    borderRadius: 16,
    padding: 20,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: Colors.dark.primary + '30',
  },
  savingsIconCircle: {
    width: 52,
    height: 52,
    borderRadius: 14,
    backgroundColor: Colors.dark.primary + '15',
    alignItems: 'center',
    justifyContent: 'center',
  },
  savingsContent: {
    flex: 1,
  },
  savingsLabel: {
    fontFamily: 'Rubik_400Regular',
    fontSize: 12,
    color: Colors.dark.textSecondary,
  },
  savingsValue: {
    fontFamily: 'Rubik_700Bold',
    fontSize: 28,
    color: Colors.dark.primary,
    marginTop: 2,
  },
  savingsMetric: {
    alignItems: 'center',
  },
  savingsMetricValue: {
    fontFamily: 'Rubik_700Bold',
    fontSize: 22,
    color: Colors.dark.text,
  },
  savingsMetricLabel: {
    fontFamily: 'Rubik_400Regular',
    fontSize: 10,
    color: Colors.dark.textSecondary,
    textAlign: 'center',
    maxWidth: 60,
  },
  metricsRow: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 20,
  },
  metricCard: {
    flex: 1,
    backgroundColor: Colors.dark.surface,
    borderRadius: 14,
    padding: 16,
    borderWidth: 1,
    borderColor: Colors.dark.border,
    borderLeftWidth: 4,
  },
  metricValue: {
    fontFamily: 'Rubik_700Bold',
    fontSize: 28,
    color: Colors.dark.text,
  },
  metricLabel: {
    fontFamily: 'Rubik_400Regular',
    fontSize: 12,
    color: Colors.dark.textSecondary,
    marginTop: 4,
  },
  alertCard: {
    backgroundColor: Colors.severity.critical + '08',
    borderRadius: 14,
    padding: 16,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: Colors.severity.critical + '30',
  },
  alertHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 12,
  },
  alertTitle: {
    fontFamily: 'Rubik_600SemiBold',
    fontSize: 15,
    color: Colors.severity.critical,
    flex: 1,
  },
  alertBadge: {
    backgroundColor: Colors.severity.critical,
    borderRadius: 10,
    minWidth: 22,
    height: 22,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 6,
  },
  alertBadgeText: {
    fontFamily: 'Rubik_700Bold',
    fontSize: 11,
    color: '#fff',
  },
  alertItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 6,
  },
  alertDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  alertDefect: {
    fontFamily: 'Rubik_500Medium',
    fontSize: 13,
    color: Colors.dark.text,
    flex: 1,
  },
  alertTime: {
    fontFamily: 'Rubik_400Regular',
    fontSize: 12,
    color: Colors.dark.textMuted,
  },
  sectionTitle: {
    fontFamily: 'Rubik_600SemiBold',
    fontSize: 17,
    color: Colors.dark.text,
    marginBottom: 12,
    marginTop: 4,
  },
  severityGrid: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 24,
  },
  severityItem: {
    flex: 1,
    alignItems: 'center',
    gap: 6,
  },
  severityBadge: {
    width: 60,
    height: 60,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  severityCount: {
    fontFamily: 'Rubik_700Bold',
    fontSize: 22,
  },
  severityLabel: {
    fontFamily: 'Rubik_400Regular',
    fontSize: 11,
    color: Colors.dark.textSecondary,
    textAlign: 'center',
  },
  barChartContainer: {
    backgroundColor: Colors.dark.surface,
    borderRadius: 14,
    padding: 16,
    marginBottom: 24,
    borderWidth: 1,
    borderColor: Colors.dark.border,
  },
  barRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 14,
    gap: 10,
  },
  barLabel: {
    fontFamily: 'Rubik_500Medium',
    fontSize: 13,
    color: Colors.dark.textSecondary,
    width: 60,
  },
  barTrack: {
    flex: 1,
    height: 24,
    borderRadius: 6,
    backgroundColor: Colors.dark.surfaceElevated,
    overflow: 'hidden',
  },
  stackedBar: {
    flexDirection: 'row',
    height: '100%',
  },
  barSegment: {
    height: '100%',
  },
  barCount: {
    fontFamily: 'Rubik_600SemiBold',
    fontSize: 14,
    color: Colors.dark.text,
    width: 30,
    textAlign: 'right',
  },
  barLegend: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 14,
    marginTop: 8,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: Colors.dark.border,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  legendDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  legendText: {
    fontFamily: 'Rubik_400Regular',
    fontSize: 10,
    color: Colors.dark.textMuted,
  },
  breakdownItem: {
    marginBottom: 14,
  },
  breakdownHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 6,
  },
  breakdownLabel: {
    fontFamily: 'Rubik_500Medium',
    fontSize: 14,
    color: Colors.dark.text,
  },
  breakdownCount: {
    fontFamily: 'Rubik_600SemiBold',
    fontSize: 14,
    color: Colors.dark.primary,
  },
  breakdownBarBg: {
    height: 8,
    borderRadius: 4,
    backgroundColor: Colors.dark.surfaceElevated,
    overflow: 'hidden',
  },
  breakdownBar: {
    height: '100%',
    borderRadius: 4,
    backgroundColor: Colors.dark.primary,
  },
  historyRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.dark.surface,
    borderRadius: 12,
    padding: 14,
    marginBottom: 8,
    gap: 12,
    borderWidth: 1,
    borderColor: Colors.dark.border,
  },
  dot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  historyContent: {
    flex: 1,
  },
  historyDefect: {
    fontFamily: 'Rubik_500Medium',
    fontSize: 14,
    color: Colors.dark.text,
  },
  historyMeta: {
    fontFamily: 'Rubik_400Regular',
    fontSize: 12,
    color: Colors.dark.textSecondary,
    marginTop: 2,
  },
  historySaved: {
    fontFamily: 'Rubik_600SemiBold',
    fontSize: 14,
    color: Colors.dark.primary,
  },
  aiSection: {
    marginBottom: 24,
  },
  aiHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
    gap: 12,
  },
  aiTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  generateBtn: {
    backgroundColor: Colors.dark.primary,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    flexDirection: 'row',
    alignItems: 'center',
  },
  generateBtnText: {
    fontFamily: 'Rubik_600SemiBold',
    fontSize: 12,
    color: '#000',
  },
  insightsCard: {
    backgroundColor: Colors.dark.surface,
    borderRadius: 16,
    padding: 20,
    borderWidth: 1,
    borderColor: Colors.dark.primary + '40',
  },
  riskBadge: {
    alignSelf: 'flex-start',
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 8,
    marginBottom: 12,
  },
  riskText: {
    fontFamily: 'Rubik_700Bold',
    fontSize: 12,
    color: '#fff',
    textTransform: 'uppercase',
  },
  insightSummary: {
    fontFamily: 'Rubik_500Medium',
    fontSize: 15,
    color: Colors.dark.text,
    lineHeight: 22,
    marginBottom: 16,
  },
  insightDivider: {
    height: 1,
    backgroundColor: Colors.dark.border,
    marginVertical: 12,
  },
  insightHeader: {
    fontFamily: 'Rubik_600SemiBold',
    fontSize: 14,
    color: Colors.dark.textSecondary,
    marginBottom: 8,
  },
  bulletRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
    marginBottom: 6,
  },
  bulletDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: Colors.dark.textMuted,
    marginTop: 6,
  },
  actionRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
    marginBottom: 8,
  },
  bulletText: {
    fontFamily: 'Rubik_400Regular',
    fontSize: 14,
    color: Colors.dark.text,
    flex: 1,
    lineHeight: 20,
  },
  closeInsights: {
    alignItems: 'center',
    marginTop: 16,
    padding: 8,
  },
  closeInsightsText: {
    fontFamily: 'Rubik_500Medium',
    fontSize: 13,
    color: Colors.dark.textMuted,
  },
  insightsPlaceholder: {
    backgroundColor: Colors.dark.surface,
    borderRadius: 16,
    padding: 20,
    borderWidth: 1,
    borderColor: Colors.dark.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  placeholderText: {
    fontFamily: 'Rubik_400Regular',
    fontSize: 14,
    color: Colors.dark.textMuted,
    textAlign: 'center',
    lineHeight: 20,
  },
});
