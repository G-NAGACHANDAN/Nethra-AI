import React, { useCallback, useEffect } from 'react';
import {
  StyleSheet, Text, View, Pressable, ScrollView, Platform,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';
import { Ionicons, MaterialCommunityIcons, Feather } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import * as Haptics from 'expo-haptics';
import Animated, { FadeInDown } from 'react-native-reanimated';
import Colors from '@/constants/colors';
import { useApp } from '@/lib/app-context';
import { startAutoSync, stopAutoSync } from '@/lib/sync-service';
import type { IndustryType } from '@/lib/categories/types';
import { INDUSTRIES, getSeverityColor } from '@/lib/categories/config';

export default function HomeScreen() {
  const insets = useSafeAreaInsets();
  const { t } = useTranslation();
  const { settings, inspections, unsyncedCount, setIndustry, setLanguage, customCategories } = useApp();
  const webTopInset = Platform.OS === 'web' ? 67 : 0;

  useEffect(() => {
    startAutoSync(30000);
    return () => stopAutoSync();
  }, []);

  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);
  const todayInspections = inspections.filter(i => i.timestamp >= todayStart.getTime());
  const todaySavings = todayInspections.reduce((sum, i) => sum + i.savedAmount, 0);
  const defects = todayInspections.filter(i => i.result.severity !== 'pass');
  const defectRate = todayInspections.length > 0
    ? Math.round((defects.length / todayInspections.length) * 100) : 0;

  const handleIndustrySelect = useCallback((industry: IndustryType) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setIndustry(industry);
  }, [setIndustry]);

  const handleStartInspection = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
    router.push('/camera');
  }, []);

  const toggleLanguage = useCallback(() => {
    Haptics.selectionAsync();
    setLanguage(settings.language === 'en' ? 'ta' : 'en');
  }, [settings.language, setLanguage]);

  const getIndustryTitle = (key: IndustryType) => {
    if (key === 'food') return t('food_processing');
    if (key === 'textile') return t('textiles');
    if (key === 'metal') return t('metal_works'); // Added explicitly to be safe
    const custom = customCategories.find(c => c.key === key);
    return custom ? custom.name : key;
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
          <View>
            <Text style={styles.appTitle}>{t('app_name')}</Text>
            <Text style={styles.subtitle}>{t('quality_control')}</Text>
          </View>
          <Pressable
            onPress={toggleLanguage}
            style={({ pressed }) => [styles.langButton, pressed && { opacity: 0.7 }]}
            testID="language-toggle"
          >
            <Ionicons name="language" size={20} color={Colors.dark.primary} />
            <Text style={styles.langText}>
              {settings.language === 'en' ? 'தமிழ்' : 'EN'}
            </Text>
          </Pressable>
        </View>

        {unsyncedCount > 0 && (
          <View style={styles.statusBar}>
            <View style={styles.statusRow}>
              <View style={styles.statusItem}>
                <Ionicons name="cloud-upload-outline" size={14} color={Colors.dark.accent} />
                <Text style={[styles.statusText, { color: Colors.dark.accent }]}>
                  {unsyncedCount} pending
                </Text>
              </View>
            </View>
          </View>
        )}

        {todayInspections.length > 0 && (
          <Animated.View entering={FadeInDown.duration(400)} style={styles.statsRow}>
            <View style={styles.statCard}>
              <Text style={styles.statValue}>{todayInspections.length}</Text>
              <Text style={styles.statLabel}>{t('inspections_today')}</Text>
            </View>
            <View style={styles.statCard}>
              <Text style={[styles.statValue, { color: Colors.dark.primary }]}>
                {'\u20B9'}{todaySavings.toLocaleString()}
              </Text>
              <Text style={styles.statLabel}>{t('daily_savings')}</Text>
            </View>
            <View style={styles.statCard}>
              <Text style={[styles.statValue, { color: defectRate > 30 ? Colors.dark.critical : Colors.dark.accent }]}>
                {defectRate}%
              </Text>
              <Text style={styles.statLabel}>{t('defect_rate')}</Text>
            </View>
          </Animated.View>
        )}

        <Pressable
          onPress={() => {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
            router.push('/camera?mode=quick');
          }}
          style={({ pressed }) => [
            styles.quickButton,
            pressed && { opacity: 0.9, transform: [{ scale: 0.98 }] },
          ]}
        >
          <LinearGradient
            colors={['#6200EA', '#B388FF']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.quickButtonGradient}
          >
            <View style={styles.quickContent}>
              <View style={styles.quickIcon}>
                <Ionicons name="flash" size={24} color="#FFF" />
              </View>
              <View>
                <Text style={styles.quickTitle}>Quick Detect ⚡</Text>
                <Text style={styles.quickSubtitle}>Instant Object Analysis</Text>
              </View>
            </View>
            <Ionicons name="chevron-forward" size={24} color="#FFF" style={{ opacity: 0.8 }} />
          </LinearGradient>
        </Pressable>

        <Text style={styles.sectionTitle}>{t('select_industry')}</Text>

        {INDUSTRIES.map((ind, index) => {
          const isSelected = settings.selectedIndustry === ind.key;
          return (
            <Animated.View key={ind.key} entering={FadeInDown.delay(index * 80).duration(400)}>
              <Pressable
                onPress={() => handleIndustrySelect(ind.key as IndustryType)}
                style={({ pressed }) => [
                  styles.industryCard,
                  isSelected && styles.industryCardSelected,
                  pressed && { opacity: 0.85, transform: [{ scale: 0.98 }] },
                ]}
                testID={`industry-${ind.key}`}
              >
                <LinearGradient
                  colors={ind.gradient as [string, string]}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                  style={styles.industryGradient}
                >
                  <View style={[styles.industryIcon, isSelected && { backgroundColor: Colors.dark.primary + '20' }]}>
                    {ind.iconSet === 'ion' ? (
                      <Ionicons name={ind.icon as any} size={36} color={isSelected ? Colors.dark.primary : Colors.dark.textSecondary} />
                    ) : (
                      <MaterialCommunityIcons name={ind.icon as any} size={36} color={isSelected ? Colors.dark.primary : Colors.dark.textSecondary} />
                    )}
                  </View>
                  <View style={styles.industryInfo}>
                    <Text style={styles.industryName}>{getIndustryTitle(ind.key as IndustryType)}</Text>
                    <Text style={styles.industryDesc}>{t(ind.descKey)}</Text>
                  </View>
                  {isSelected && (
                    <Ionicons name="checkmark-circle" size={28} color={Colors.dark.primary} />
                  )}
                </LinearGradient>
              </Pressable>
            </Animated.View>
          );
        })}

        {customCategories.length > 0 && (
          <Text style={[styles.sectionTitle, { marginTop: 20 }]}>{t('custom_categories').replace(/_/g, ' ') || 'Custom Categories'}</Text>
        )}

        {customCategories.map((cat, index) => {
          const isSelected = settings.selectedIndustry === cat.key;
          return (
            <Animated.View key={cat.key} entering={FadeInDown.delay((INDUSTRIES.length + index) * 80).duration(400)}>
              <Pressable
                onPress={() => handleIndustrySelect(cat.key)}
                style={({ pressed }) => [
                  styles.industryCard,
                  isSelected && styles.industryCardSelected,
                  pressed && { opacity: 0.85, transform: [{ scale: 0.98 }] },
                ]}
                testID={`industry-${cat.key}`}
              >
                <LinearGradient
                  colors={cat.gradient as [string, string]}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                  style={styles.industryGradient}
                >
                  <View style={[styles.industryIcon, isSelected && { backgroundColor: Colors.dark.primary + '20' }]}>
                    <Ionicons name={cat.icon as any || 'cube-outline'} size={36} color={isSelected ? Colors.dark.primary : Colors.dark.textSecondary} />
                  </View>
                  <View style={styles.industryInfo}>
                    <Text style={styles.industryName}>{cat.name}</Text>
                    <Text style={styles.industryDesc}>Custom Inspection</Text>
                  </View>
                  {isSelected && (
                    <Ionicons name="checkmark-circle" size={28} color={Colors.dark.primary} />
                  )}
                </LinearGradient>
              </Pressable>
            </Animated.View>
          );
        })}

        <Pressable
          onPress={handleStartInspection}
          style={({ pressed }) => [
            styles.startButton,
            pressed && { opacity: 0.9, transform: [{ scale: 0.98 }] },
          ]}
          testID="start-inspection"
        >
          <LinearGradient
            colors={[Colors.dark.primary, Colors.dark.primaryDim]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={styles.startButtonGradient}
          >
            <Ionicons name="scan" size={28} color="#000" />
            <Text style={styles.startButtonText}>{t('start_inspection')}</Text>
          </LinearGradient>
        </Pressable>

        {inspections.length > 0 && (
          <>
            <Text style={styles.sectionTitle}>{t('recent_inspections')}</Text>
            {inspections.slice(0, 5).map((ins) => (
              <View key={ins.id} style={styles.historyItem}>
                <View style={[styles.severityDot, { backgroundColor: getSeverityColor(ins.result.severity) }]} />
                <View style={styles.historyInfo}>
                  <Text style={styles.historyDefect}>{t(ins.result.defectKey).replace(/_/g, ' ')}</Text>
                  <Text style={styles.historyTime}>
                    {new Date(ins.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    {' - '}
                    {getIndustryTitle(ins.industry)}
                  </Text>
                </View>
                <Text style={[styles.historySeverity, { color: getSeverityColor(ins.result.severity) }]}>
                  {t(`severity_${ins.result.severity}`)}
                </Text>
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
  appTitle: {
    fontFamily: 'Rubik_700Bold',
    fontSize: 28,
    color: Colors.dark.text,
  },
  subtitle: {
    fontFamily: 'Rubik_400Regular',
    fontSize: 14,
    color: Colors.dark.textSecondary,
    marginTop: 2,
  },
  langButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: Colors.dark.surfaceElevated,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: Colors.dark.border,
    minWidth: 80,
    justifyContent: 'center',
  },
  langText: {
    fontFamily: 'Rubik_600SemiBold',
    fontSize: 14,
    color: Colors.dark.primary,
  },
  statusBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: Colors.dark.surface,
    borderRadius: 14,
    padding: 14,
    marginBottom: 24,
    borderWidth: 1,
    borderColor: Colors.dark.border,
  },
  statusRow: {
    gap: 8,
  },
  statusItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  statusText: {
    fontFamily: 'Rubik_400Regular',
    fontSize: 12,
    color: Colors.dark.primary,
  },
  statsRow: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 24,
  },
  statCard: {
    flex: 1,
    backgroundColor: Colors.dark.surface,
    borderRadius: 14,
    padding: 14,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: Colors.dark.border,
  },
  statValue: {
    fontFamily: 'Rubik_700Bold',
    fontSize: 22,
    color: Colors.dark.text,
  },
  statLabel: {
    fontFamily: 'Rubik_400Regular',
    fontSize: 11,
    color: Colors.dark.textSecondary,
    marginTop: 4,
    textAlign: 'center',
  },
  sectionTitle: {
    fontFamily: 'Rubik_600SemiBold',
    fontSize: 18,
    color: Colors.dark.text,
    marginBottom: 14,
  },
  industryCard: {
    borderRadius: 16,
    marginBottom: 12,
    overflow: 'hidden',
    borderWidth: 2,
    borderColor: 'transparent',
  },
  industryCardSelected: {
    borderColor: Colors.dark.primary,
  },
  industryGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 20,
    gap: 16,
  },
  industryIcon: {
    width: 64,
    height: 64,
    borderRadius: 16,
    backgroundColor: 'rgba(255,255,255,0.08)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  industryInfo: {
    flex: 1,
  },
  industryName: {
    fontFamily: 'Rubik_600SemiBold',
    fontSize: 17,
    color: Colors.dark.text,
  },
  industryDesc: {
    fontFamily: 'Rubik_400Regular',
    fontSize: 13,
    color: Colors.dark.textSecondary,
    marginTop: 4,
  },
  startButton: {
    marginTop: 12,
    marginBottom: 16,
    borderRadius: 16,
    overflow: 'hidden',
  },
  startButtonGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
    paddingVertical: 20,
  },
  startButtonText: {
    fontFamily: 'Rubik_700Bold',
    fontSize: 18,
    color: '#000',
  },
  historyItem: {
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
  severityDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  historyInfo: {
    flex: 1,
  },
  historyDefect: {
    fontFamily: 'Rubik_500Medium',
    fontSize: 14,
    color: Colors.dark.text,
  },
  historyTime: {
    fontFamily: 'Rubik_400Regular',
    fontSize: 12,
    color: Colors.dark.textSecondary,
    marginTop: 2,
  },
  historySeverity: {
    fontFamily: 'Rubik_600SemiBold',
    fontSize: 13,
  },
  quickButton: {
    marginBottom: 24,
    borderRadius: 16,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
  },
  quickButtonGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 20,
  },
  quickContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  quickIcon: {
    width: 48,
    height: 48,
    borderRadius: 12,
    backgroundColor: 'rgba(255,255,255,0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  quickTitle: {
    fontFamily: 'Rubik_700Bold',
    fontSize: 18,
    color: '#FFF',
  },
  quickSubtitle: {
    fontFamily: 'Rubik_400Regular',
    fontSize: 13,
    color: 'rgba(255,255,255,0.9)',
    marginTop: 2,
  },
});
