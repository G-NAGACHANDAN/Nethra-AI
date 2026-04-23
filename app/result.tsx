import React, { useState, useCallback } from 'react';
import {
  StyleSheet, Text, View, Pressable, ScrollView, Platform, Image, Linking, Modal, TextInput, KeyboardAvoidingView, Alert
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';
import { useLocalSearchParams, router } from 'expo-router';
import { Ionicons, Feather, MaterialCommunityIcons } from '@expo/vector-icons';
import * as Speech from 'expo-speech';
import * as Haptics from 'expo-haptics';
import Svg, { Rect } from 'react-native-svg';
import Animated, { FadeInDown, FadeInUp } from 'react-native-reanimated';
import Colors from '@/constants/colors';
import { getSeverityColor } from '@/lib/categories/config';
import type { SeverityGrade } from '@/lib/categories/types';
import { useApp } from '@/lib/app-context';

export default function ResultScreen() {
  const insets = useSafeAreaInsets();
  const { t, i18n } = useTranslation();
  const { addCustomCategory, customCategories } = useApp();

  const params = useLocalSearchParams<{
    defectKey: string;
    confidence: string;
    severity: string;
    recommendationKey: string;
    industry: string;
    savedAmount: string;
    bboxX: string;
    bboxY: string;
    bboxW: string;
    bboxH: string;
    imageUri: string;
    qualityScore: string;
    message: string;
    defectType?: string;
  }>();

  const [isSpeaking, setIsSpeaking] = useState(false);
  const webTopInset = Platform.OS === 'web' ? 67 : 0;

  const severity = (params.severity || 'pass') as SeverityGrade;
  const confidence = parseFloat(params.confidence || '0');
  const qualityScore = parseFloat(params.qualityScore || '0');
  const savedAmount = parseInt(params.savedAmount || '0', 10);
  const severityColor = getSeverityColor(severity);
  const hasBbox = parseFloat(params.bboxW || '0') > 0;
  const confidencePercent = Math.round(confidence * 100);
  const qualityPercent = Math.round(qualityScore * 100);
  const isCritical = severity === 'critical';
  const [modalVisible, setModalVisible] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState('');

  const handleSpeak = useCallback(() => {
    Haptics.selectionAsync();
    setIsSpeaking(true);

    const lang = i18n.language;
    const defectName = (params.defectType || t(params.defectKey || 'food_fresh')).replace(/_/g, ' ');
    const severityLabel = t(`severity_${severity}`);
    const message = params.message || t(params.recommendationKey || 'rec_pass');

    const text = lang === 'ta'
      ? `குறைபாடு: ${defectName}. தீவிரம்: ${severityLabel}. நம்பகத்தன்மை: ${confidencePercent} சதவீதம். ${message}`
      : `Defect: ${defectName}. Severity: ${severityLabel}. Confidence: ${confidencePercent} percent. ${message}`;

    Speech.speak(text, {
      language: lang === 'ta' ? 'ta-IN' : 'en-US',
      onDone: () => setIsSpeaking(false),
      onError: () => setIsSpeaking(false),
    });
  }, [i18n.language, params, severity, confidencePercent, t]);



  const handleCreateCategory = useCallback(async () => {
    if (!newCategoryName.trim()) {
      Alert.alert(t('error'), t('please_enter_category_name'));
      return;
    }

    try {
      await addCustomCategory(newCategoryName, params.imageUri || '');
      setModalVisible(false);
      setNewCategoryName('');
      Alert.alert(t('success'), t('category_created_success'));
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch (e) {
      Alert.alert(t('error'), t('category_creation_failed'));
    }
  }, [newCategoryName, params.imageUri, addCustomCategory, t]);

  const handleWhatsApp = useCallback(async () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);

    const lang = i18n.language;
    const defectName = (params.defectType || t(params.defectKey || 'food_fresh')).replace(/_/g, ' ');
    const industryName = t(
      params.industry === 'food' ? 'food_processing' :
        params.industry === 'textile' ? 'textiles' : 'metal_works'
    );

    const messageContent = params.message || '';

    const message = lang === 'ta'
      ? `\u26A0\uFE0F *Nethra AI - ${t('severity_critical')}*\n\n` +
      `\u0B8E\u0B9A\u0BCD\u0B9A\u0BB0\u0BBF\u0B95\u0BCD\u0B95\u0BC8! \u0B92\u0BB0\u0BC1 \u0B95\u0B9F\u0BC1\u0BAE\u0BC8\u0BAF\u0BBE\u0BA9 \u0B95\u0BC1\u0BB1\u0BC8\u0BAA\u0BBE\u0B9F\u0BC1 \u0B95\u0BA3\u0BCD\u0B9F\u0BB1\u0BBF\u0BAF\u0BAA\u0BCD\u0BAA\u0B9F\u0BCD\u0B9F\u0BA4\u0BC1.\n\n` +
      `\u0BA4\u0BCA\u0BB4\u0BBF\u0BB2\u0BCD: ${industryName}\n` +
      `\u0B95\u0BC1\u0BB1\u0BC8\u0BAA\u0BBE\u0B9F\u0BC1: ${defectName}\n` +
      `\u0BA8\u0BAE\u0BCD\u0BAA\u0B95\u0BA4\u0BCD\u0BA4\u0BA9\u0BCD\u0BAE\u0BC8: ${confidencePercent}%\n` +
      `\u0B85\u0BB1\u0BBF\u0B95\u0BCD\u0B95\u0BC8: ${messageContent}\n\n` +
      `\u0B89\u0B9F\u0BA9\u0B9F\u0BBF \u0BA8\u0B9F\u0BB5\u0B9F\u0BBF\u0B95\u0BCD\u0B95\u0BC8 \u0BA4\u0BC7\u0BB5\u0BC8.`
      : `\u26A0\uFE0F *Nethra AI - CRITICAL ALERT*\n\n` +
      `Warning! A critical defect has been detected.\n\n` +
      `Industry: ${industryName}\n` +
      `Defect: ${defectName}\n` +
      `Confidence: ${confidencePercent}%\n` +
      `Report: ${messageContent}\n\n` +
      `Immediate action required.`;

    const url = `https://wa.me/?text=${encodeURIComponent(message)}`;

    try {
      const supported = await Linking.canOpenURL(url);
      if (supported) {
        await Linking.openURL(url);
      } else {
        await Linking.openURL(`https://api.whatsapp.com/send?text=${encodeURIComponent(message)}`);
      }
    } catch (err) {
      console.error('WhatsApp error:', err);
    }
  }, [i18n.language, params, severity, confidencePercent, t]);

  const handleNewInspection = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    router.replace('/camera');
  }, []);

  const handleGoHome = useCallback(() => {
    router.dismissAll();
  }, []);

  return (
    <View style={styles.container}>
      <ScrollView
        contentContainerStyle={[
          styles.scrollContent,
          { paddingTop: insets.top + webTopInset + 16, paddingBottom: insets.bottom + (Platform.OS === 'web' ? 34 : 20) + 20 },
        ]}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.header}>
          <Pressable
            onPress={handleGoHome}
            style={({ pressed }) => [styles.backBtn, pressed && { opacity: 0.7 }]}
          >
            <Ionicons name="close" size={24} color={Colors.dark.text} />
          </Pressable>
          <Text style={styles.headerTitle}>{t('ai_analysis')}</Text>
          <View style={{ width: 44 }} />
        </View>

        {params.imageUri ? (
          <Animated.View entering={FadeInDown.duration(500)} style={styles.imageContainer}>
            <Image source={{ uri: params.imageUri }} style={styles.resultImage} />
            {hasBbox && (
              <Svg style={StyleSheet.absoluteFill} width="100%" height="100%">
                <Rect
                  x={`${parseFloat(params.bboxX || '0') * 100}%`}
                  y={`${parseFloat(params.bboxY || '0') * 100}%`}
                  width={`${parseFloat(params.bboxW || '0') * 100}%`}
                  height={`${parseFloat(params.bboxH || '0') * 100}%`}
                  stroke={severityColor}
                  strokeWidth={3}
                  fill={severityColor + '15'}
                  rx={6}
                />
              </Svg>
            )}
          </Animated.View>
        ) : (
          <Animated.View entering={FadeInDown.duration(500)} style={styles.noImageContainer}>
            <Ionicons name="image-outline" size={48} color={Colors.dark.textMuted} />
          </Animated.View>
        )}

        <Animated.View entering={FadeInUp.delay(200).duration(500)} style={[styles.severityBanner, { backgroundColor: severityColor + '15', borderColor: severityColor + '40' }]}>
          <View style={[styles.severityIconCircle, { backgroundColor: severityColor + '25' }]}>
            {severity === 'pass' ? (
              <Ionicons name="checkmark-circle" size={32} color={severityColor} />
            ) : severity === 'critical' ? (
              <Ionicons name="alert-circle" size={32} color={severityColor} />
            ) : severity === 'major' ? (
              <Ionicons name="warning" size={32} color={severityColor} />
            ) : (
              <Feather name="info" size={28} color={severityColor} />
            )}
          </View>
          <View style={styles.severityInfo}>
            <Text style={[styles.severityGrade, { color: severityColor }]}>
              {t(`severity_${severity}`)}
            </Text>
            <Text style={styles.defectName}>{(params.defectType || t(params.defectKey || 'food_fresh')).replace(/_/g, ' ')}</Text>
          </View>
        </Animated.View>

        <Animated.View entering={FadeInUp.delay(350).duration(500)} style={styles.detailsCard}>
          <View style={styles.detailRow}>
            <View style={styles.detailIcon}>
              <Feather name="target" size={18} color={Colors.dark.primary} />
            </View>
            <View style={styles.detailContent}>
              <Text style={styles.detailLabel}>{t('confidence')}</Text>
              <View style={styles.confidenceBar}>
                <View style={styles.confidenceBarBg}>
                  <View style={[styles.confidenceBarFill, { width: `${confidencePercent}%`, backgroundColor: severityColor }]} />
                </View>
                <Text style={[styles.confidenceValue, { color: severityColor }]}>{confidencePercent}%</Text>
              </View>
            </View>
          </View>

          <View style={styles.divider} />

          <View style={styles.detailRow}>
            <View style={styles.detailIcon}>
              <Feather name="activity" size={18} color={Colors.dark.primary} />
            </View>
            <View style={styles.detailContent}>
              <Text style={styles.detailLabel}>Anomaly Score</Text>
              <View style={styles.confidenceBar}>
                <View style={styles.confidenceBarBg}>
                  <View style={[styles.confidenceBarFill, { width: `${qualityPercent}%`, backgroundColor: severityColor }]} />
                </View>
                <Text style={[styles.confidenceValue, { color: severityColor }]}>{qualityScore.toFixed(2)}</Text>
              </View>
            </View>
          </View>

          <View style={styles.divider} />

          <View style={styles.detailRow}>
            <View style={styles.detailIcon}>
              <MaterialCommunityIcons name="factory" size={18} color={Colors.dark.primary} />
            </View>
            <View style={styles.detailContent}>
              <Text style={styles.detailLabel}>{t('defect_type')}</Text>
              <Text style={styles.detailValue}>{(params.defectType || t(params.defectKey || 'food_fresh')).replace(/_/g, ' ')}</Text>
            </View>
          </View>

          {savedAmount > 0 && (
            <>
              <View style={styles.divider} />
              <View style={styles.detailRow}>
                <View style={styles.detailIcon}>
                  <Ionicons name="cash-outline" size={18} color={Colors.dark.primary} />
                </View>
                <View style={styles.detailContent}>
                  <Text style={styles.detailLabel}>{t('items_saved')}</Text>
                  <Text style={[styles.detailValue, { color: Colors.dark.primary }]}>
                    {'\u20B9'}{savedAmount.toLocaleString()}
                  </Text>
                </View>
              </View>
            </>
          )}
        </Animated.View>



        <Animated.View entering={FadeInUp.delay(500).duration(500)} style={styles.recommendationCard}>
          <View style={styles.recHeader}>
            <Feather name="cpu" size={18} color={Colors.dark.accent} />
            <Text style={styles.recTitle}>AI Analysis</Text>
          </View>
          <Text style={styles.recText}>{params.message || t(params.recommendationKey || 'rec_pass')}</Text>
        </Animated.View>

        <Animated.View entering={FadeInUp.delay(650).duration(500)} style={styles.actions}>
          <Pressable
            onPress={handleSpeak}
            style={({ pressed }) => [
              styles.actionButton, styles.speakButton,
              pressed && { opacity: 0.85, transform: [{ scale: 0.97 }] },
            ]}
          >
            <Ionicons
              name={isSpeaking ? 'volume-high' : 'volume-medium'}
              size={24}
              color={Colors.dark.primary}
            />
            <Text style={styles.actionTextSecondary}>{t('speak_result')}</Text>
          </Pressable>

          {isCritical && (
            <Pressable
              onPress={handleWhatsApp}
              style={({ pressed }) => [
                styles.actionButton, styles.whatsappButton,
                pressed && { opacity: 0.85, transform: [{ scale: 0.97 }] },
              ]}
            >
              <Ionicons name="logo-whatsapp" size={24} color="#25D366" />
              <Text style={styles.whatsappText}>
                {i18n.language === 'ta' ? 'மேற்பார்வையாளருக்கு அனுப்பு' : 'Alert Supervisor'}
              </Text>
            </Pressable>
          )}

          <Pressable
            onPress={() => setModalVisible(true)}
            style={({ pressed }) => [
              styles.actionButton, styles.categoryButton,
              pressed && { opacity: 0.85, transform: [{ scale: 0.97 }] },
            ]}
          >
            <Ionicons name="add-circle-outline" size={24} color={Colors.dark.primary} />
            <Text style={styles.actionTextSecondary}>{t('add_as_category').replace(/_/g, ' ') || 'Add as New Category'}</Text>
          </Pressable>

          <Pressable
            onPress={handleNewInspection}
            style={({ pressed }) => [
              styles.actionButton, styles.newButton,
              pressed && { opacity: 0.85, transform: [{ scale: 0.97 }] },
            ]}
          >
            <Ionicons name="scan" size={24} color="#000" />
            <Text style={styles.actionTextPrimary}>{t('new_inspection')}</Text>
          </Pressable>
        </Animated.View>
      </ScrollView>

      <Modal
        animationType="fade"
        transparent={true}
        visible={modalVisible}
        onRequestClose={() => setModalVisible(false)}
      >
        <KeyboardAvoidingView
          behavior={Platform.OS === "ios" ? "padding" : "height"}
          style={styles.modalOverlay}
        >
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>{t('create_category') || 'Create New Category'}</Text>
            <Text style={styles.modalSubtitle}>
              {t('enter_category_name_desc') || 'Enter a name for this new inspection category. Nethra AI will learn from this image.'}
            </Text>

            <TextInput
              style={styles.input}
              placeholder={t('category_name_placeholder') || "e.g., Bottle Caps, PCBs"}
              placeholderTextColor="#666"
              value={newCategoryName}
              onChangeText={setNewCategoryName}
              autoFocus
            />

            <View style={styles.modalButtons}>
              <Pressable
                style={[styles.modalButton, styles.cancelButton]}
                onPress={() => setModalVisible(false)}
              >
                <Text style={styles.cancelButtonText}>{t('cancel')}</Text>
              </Pressable>

              <Pressable
                style={[styles.modalButton, styles.createButton]}
                onPress={handleCreateCategory}
              >
                <Text style={styles.createButtonText}>{t('create') || 'Create'}</Text>
              </Pressable>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>
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
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 20,
  },
  backBtn: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: Colors.dark.surface,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: Colors.dark.border,
  },
  headerTitle: {
    fontFamily: 'Rubik_600SemiBold',
    fontSize: 18,
    color: Colors.dark.text,
  },
  imageContainer: {
    height: 240,
    borderRadius: 16,
    overflow: 'hidden',
    marginBottom: 20,
    backgroundColor: Colors.dark.surface,
  },
  resultImage: {
    width: '100%',
    height: '100%',
    resizeMode: 'cover',
  },
  noImageContainer: {
    height: 160,
    borderRadius: 16,
    backgroundColor: Colors.dark.surface,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
    borderWidth: 1,
    borderColor: Colors.dark.border,
  },
  severityBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
    padding: 20,
    borderRadius: 16,
    marginBottom: 16,
    borderWidth: 1,
  },
  severityIconCircle: {
    width: 60,
    height: 60,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  severityInfo: {
    flex: 1,
  },
  severityGrade: {
    fontFamily: 'Rubik_700Bold',
    fontSize: 26,
  },
  defectName: {
    fontFamily: 'Rubik_400Regular',
    fontSize: 15,
    color: Colors.dark.textSecondary,
    marginTop: 2,
  },
  detailsCard: {
    backgroundColor: Colors.dark.surface,
    borderRadius: 16,
    padding: 18,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: Colors.dark.border,
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
  },
  detailIcon: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: Colors.dark.surfaceElevated,
    alignItems: 'center',
    justifyContent: 'center',
  },
  detailContent: {
    flex: 1,
  },
  detailLabel: {
    fontFamily: 'Rubik_400Regular',
    fontSize: 12,
    color: Colors.dark.textSecondary,
    marginBottom: 4,
  },
  detailValue: {
    fontFamily: 'Rubik_600SemiBold',
    fontSize: 16,
    color: Colors.dark.text,
  },
  confidenceBar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  confidenceBarBg: {
    flex: 1,
    height: 10,
    borderRadius: 5,
    backgroundColor: Colors.dark.surfaceElevated,
    overflow: 'hidden',
  },
  confidenceBarFill: {
    height: '100%',
    borderRadius: 5,
  },
  confidenceValue: {
    fontFamily: 'Rubik_700Bold',
    fontSize: 16,
  },
  divider: {
    height: 1,
    backgroundColor: Colors.dark.border,
    marginVertical: 14,
  },
  recommendationCard: {
    backgroundColor: Colors.dark.surface,
    borderRadius: 16,
    padding: 18,
    marginBottom: 24,
    borderWidth: 1,
    borderColor: Colors.dark.border,
  },
  recHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 10,
  },
  recTitle: {
    fontFamily: 'Rubik_600SemiBold',
    fontSize: 15,
    color: Colors.dark.accent,
  },
  recText: {
    fontFamily: 'Rubik_400Regular',
    fontSize: 15,
    color: Colors.dark.text,
    lineHeight: 24,
  },
  actions: {
    gap: 12,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    paddingVertical: 18,
    borderRadius: 14,
    minHeight: 60,
  },
  speakButton: {
    backgroundColor: Colors.dark.surface,
    borderWidth: 1,
    borderColor: Colors.dark.primary + '40',
  },
  whatsappButton: {
    backgroundColor: '#25D366' + '15',
    borderWidth: 1,
    borderColor: '#25D366' + '40',
  },
  whatsappText: {
    fontFamily: 'Rubik_600SemiBold',
    fontSize: 16,
    color: '#25D366',
  },
  newButton: {
    backgroundColor: Colors.dark.primary,
  },
  actionTextSecondary: {
    fontFamily: 'Rubik_600SemiBold',
    fontSize: 16,
    color: Colors.dark.primary,
  },
  actionTextPrimary: {
    fontFamily: 'Rubik_600SemiBold',
    fontSize: 16,
    color: '#000',
  },

  categoryButton: {
    backgroundColor: Colors.dark.surface,
    borderWidth: 1,
    borderColor: Colors.dark.accent + '40',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalContent: {
    width: '100%',
    maxWidth: 400,
    backgroundColor: Colors.dark.surfaceElevated,
    borderRadius: 20,
    padding: 24,
    borderWidth: 1,
    borderColor: Colors.dark.border,
  },
  modalTitle: {
    fontFamily: 'Rubik_700Bold',
    fontSize: 20,
    color: Colors.dark.text,
    marginBottom: 8,
    textAlign: 'center',
  },
  modalSubtitle: {
    fontFamily: 'Rubik_400Regular',
    fontSize: 14,
    color: Colors.dark.textSecondary,
    marginBottom: 20,
    textAlign: 'center',
    lineHeight: 20,
  },
  input: {
    backgroundColor: Colors.dark.background,
    borderWidth: 1,
    borderColor: Colors.dark.border,
    borderRadius: 12,
    padding: 16,
    fontFamily: 'Rubik_400Regular',
    fontSize: 16,
    color: Colors.dark.text,
    marginBottom: 24,
  },
  modalButtons: {
    flexDirection: 'row',
    gap: 12,
  },
  modalButton: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cancelButton: {
    backgroundColor: Colors.dark.surface,
    borderWidth: 1,
    borderColor: Colors.dark.border,
  },
  createButton: {
    backgroundColor: Colors.dark.primary,
  },
  cancelButtonText: {
    fontFamily: 'Rubik_600SemiBold',
    fontSize: 15,
    color: Colors.dark.text,
  },
  createButtonText: {
    fontFamily: 'Rubik_600SemiBold',
    fontSize: 15,
    color: '#000',
  },
});
