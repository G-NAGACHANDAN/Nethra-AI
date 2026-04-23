import React, { useState, useCallback, useRef } from 'react';
import {
  StyleSheet, Text, View, Pressable, Platform, ActivityIndicator, Image,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';
import { Ionicons, Feather } from '@expo/vector-icons';
import { CameraView, useCameraPermissions } from 'expo-camera';
import * as ImagePicker from 'expo-image-picker';
import * as Haptics from 'expo-haptics';
import * as Speech from 'expo-speech';
import { router, useLocalSearchParams } from 'expo-router';
import Svg, { Rect, Line } from 'react-native-svg';
import Animated, { FadeIn, FadeInUp } from 'react-native-reanimated';
import Colors from '@/constants/colors';
import { useApp } from '@/lib/app-context';
import { getSavingsForDefect, getSeverityColor } from '@/lib/categories/config';
import { analyzeImage } from '@/lib/ai/gemini-service';
import type { SeverityGrade } from '@/lib/categories/types';

function speakSeverity(severity: SeverityGrade, language: string) {
  const messages: Record<string, Record<SeverityGrade, string>> = {
    ta: {
      critical: '\u0B95\u0B9F\u0BC1\u0BAE\u0BC8\u0BAF\u0BBE\u0BA9 \u0B95\u0BC1\u0BB1\u0BC8\u0BAA\u0BBE\u0B9F\u0BC1',
      major: '\u0BAE\u0BC1\u0B95\u0BCD\u0B95\u0BBF\u0BAF\u0BAE\u0BBE\u0BA9 \u0B95\u0BC1\u0BB1\u0BC8\u0BAA\u0BBE\u0B9F\u0BC1',
      minor: '\u0B9A\u0BBF\u0BB1\u0BBF\u0BAF \u0B95\u0BC1\u0BB1\u0BC8\u0BAA\u0BBE\u0B9F\u0BC1',
      pass: '\u0BA4\u0BC7\u0BB0\u0BCD\u0B9A\u0BCD\u0B9A\u0BBF. \u0BA4\u0BB0\u0BAE\u0BBE\u0BA9\u0BA4\u0BC1.',
    },
    en: {
      critical: 'Critical defect detected!',
      major: 'Major defect found.',
      minor: 'Minor defect noted.',
      pass: 'Passed. Quality approved.',
    },
  };

  const lang = language === 'ta' ? 'ta' : 'en';
  const text = messages[lang][severity];

  Speech.speak(text, {
    language: lang === 'ta' ? 'ta-IN' : 'en-US',
    rate: 0.9,
  });
}

export default function CameraScreen() {
  const insets = useSafeAreaInsets();
  const { t, i18n } = useTranslation();
  const { settings, refreshData, customCategories } = useApp();
  const cameraRef = useRef<CameraView>(null);
  const [permission, requestPermission] = useCameraPermissions();
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [capturedImage, setCapturedImage] = useState<string | null>(null);
  const webTopInset = Platform.OS === 'web' ? 67 : 0;

  const params = useLocalSearchParams();
  const isQuickMode = params.mode === 'quick';

  const industryLabel = isQuickMode
    ? "AI General Inspection"
    : settings.selectedIndustry === 'food'
      ? t('food_processing')
      : settings.selectedIndustry === 'textile'
        ? t('textiles')
        : settings.selectedIndustry === 'metal'
          ? t('metal_works')
          : (customCategories.find(c => c.key === settings.selectedIndustry)?.name || settings.selectedIndustry.replace(/_/g, ' '));


  const handleCapture = useCallback(async () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);

    if (Platform.OS === 'web' || !cameraRef.current) {
      if (Platform.OS === 'web') {
        alert("Please use Gallery on Web");
        return;
      }
      return;
    }

    try {
      const photo = await cameraRef.current.takePictureAsync({ quality: 0.7, base64: true });
      if (photo) {
        setCapturedImage(photo.uri);
        await runAnalysis(photo.uri, photo.base64 || '');
      }
    } catch (e) {
      console.error("Capture failed", e);
    }
  }, [settings]);

  const handleGallery = useCallback(async () => {
    Haptics.selectionAsync();
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      quality: 0.7,
      base64: true,
    });

    if (!result.canceled && result.assets[0]) {
      setCapturedImage(result.assets[0].uri);
      await runAnalysis(result.assets[0].uri, result.assets[0].base64 || '');
    }
  }, [settings]);

  const runAnalysis = async (imageUri: string, base64: string) => {
    setIsAnalyzing(true);
    try {
      console.log('[Gemini] Running analysis...');
      const category = isQuickMode ? 'general' : settings.selectedIndustry;
      // Auto-save via service (Step 2)
      const timestamp = Date.now();
      const prediction = await analyzeImage(base64, category, { imageUri, timestamp });
      console.log('[Gemini] Analysis complete', prediction);

      const defectKey = prediction.status === 'PASS'
        ? `${settings.selectedIndustry}_good`
        : `${settings.selectedIndustry}_defect`;

      const savedAmount = getSavingsForDefect(settings.selectedIndustry, defectKey);

      let severity: SeverityGrade = 'pass';
      if (prediction.status === 'FAIL') {
        severity = 'major';
      } else {
        severity = 'pass';
      }

      const result = {
        defectType: prediction.defect_type,
        defectKey,
        confidence: prediction.confidence,
        severity,
        recommendationKey: prediction.status === 'PASS' ? 'rec_pass' : 'rec_reject',
        boundingBox: { x: 0.25, y: 0.25, width: 0.5, height: 0.5 },
        qualityScore: prediction.confidence,
        message: prediction.description,
        status: prediction.status,
        decision: prediction.status === 'PASS' ? 'ACCEPT' : 'REJECT',
        debug: prediction.raw_response
      };

      speakSeverity(result.severity, i18n.language);

      // Refresh data to fetch the new inspection saved by gemini-service
      refreshData();

      router.replace({
        pathname: '/result',
        params: {
          defectKey: result.defectKey,
          confidence: result.confidence.toString(),
          severity: result.severity,
          recommendationKey: result.recommendationKey,
          industry: settings.selectedIndustry,
          savedAmount: savedAmount.toString(),
          bboxX: result.boundingBox.x.toString(),
          bboxY: result.boundingBox.y.toString(),
          bboxW: result.boundingBox.width.toString(),
          bboxH: result.boundingBox.height.toString(),
          imageUri: imageUri || '',
          qualityScore: result.qualityScore?.toString() || '0',
          message: result.message || '',
          defectType: result.defectType || '',
          debug: JSON.stringify(result.debug || {}),
        },
      });
    } catch (err) {
      console.error('Analysis failed:', err);
      alert("Analysis Failed. Please try again.");
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleClose = useCallback(() => {
    router.back();
  }, []);

  const overlayColor = getSeverityColor('pass');

  if (isAnalyzing) {
    return (
      <View style={[styles.container, styles.center]}>
        <Animated.View entering={FadeIn.duration(300)} style={styles.analyzingContainer}>
          <View style={styles.pulseCircle}>
            <ActivityIndicator size="large" color={Colors.dark.primary} />
          </View>
          <Text style={styles.analyzingText}>{t('analyzing')}</Text>
          <Text style={styles.analyzingSubtext}>{t('powered_by')}</Text>
          <View style={styles.modelInfo}>
            <Feather name="cpu" size={14} color={Colors.dark.textMuted} />
            <Text style={styles.modelText}>Multimodal GenAI</Text>
          </View>
        </Animated.View>
        {capturedImage && (
          <Image source={{ uri: capturedImage }} style={styles.previewImage} />
        )}
      </View>
    );
  }

  if (!permission) {
    return (
      <View style={[styles.container, styles.center]}>
        <ActivityIndicator size="large" color={Colors.dark.primary} />
      </View>
    );
  }

  if (!permission.granted) {
    return (
      <View style={[styles.container, styles.center]}>
        <Ionicons name="camera-outline" size={64} color={Colors.dark.textMuted} />
        <Text style={styles.permTitle}>
          {i18n.language === 'ta' ? '\u0B95\u0BC7\u0BAE\u0BB0\u0BBE \u0B85\u0BA3\u0BC1\u0B95\u0BB2\u0BCD \u0BA4\u0BC7\u0BB5\u0BC8' : 'Camera Access Needed'}
        </Text>
        <Text style={styles.permDesc}>
          {i18n.language === 'ta' ? '\u0BA4\u0BB0 \u0B86\u0BAF\u0BCD\u0BB5\u0BC1\u0B95\u0BCD\u0B95\u0BC1 \u0B95\u0BC7\u0BAE\u0BB0\u0BBE \u0B85\u0BA3\u0BC1\u0B95\u0BB2\u0BCD \u0BB5\u0BB4\u0B99\u0BCD\u0B95\u0BB5\u0BC1\u0BAE\u0BCD' : 'Grant camera access to inspect items'}
        </Text>
        <Pressable
          onPress={requestPermission}
          style={({ pressed }) => [styles.permButton, pressed && { opacity: 0.8 }]}
        >
          <Text style={styles.permButtonText}>
            {i18n.language === 'ta' ? '\u0B85\u0BA3\u0BC1\u0B95\u0BB2\u0BCD \u0BB5\u0BB4\u0B99\u0BCD\u0B95\u0BC1' : 'Grant Access'}
          </Text>
        </Pressable>
        <Pressable onPress={handleGallery} style={styles.galleryAlt}>
          <Text style={styles.galleryAltText}>{t('gallery')}</Text>
        </Pressable>
        <Pressable
          onPress={handleClose}
          style={[styles.closeButton, { top: insets.top + webTopInset + 16 }]}
        >
          <Ionicons name="close" size={28} color={Colors.dark.text} />
        </Pressable>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {Platform.OS !== 'web' ? (
        <CameraView ref={cameraRef} style={styles.camera} facing="back">
          <CameraOverlay color={overlayColor} />
        </CameraView>
      ) : (
        <View style={[styles.camera, styles.webCamera]}>
          <CameraOverlay color={overlayColor} />
          <Ionicons name="camera" size={48} color={Colors.dark.textMuted} />
          <Text style={styles.webCameraText}>
            {i18n.language === 'ta' ? '\u0BB5\u0BC6\u0BAA\u0BCD \u0B95\u0BC7\u0BAE\u0BB0\u0BBE \u0B95\u0BBF\u0B9F\u0BC8\u0B95\u0BCD\u0B95\u0BB5\u0BBF\u0BB2\u0BCD\u0BB2\u0BC8' : 'Camera not available on web'}
          </Text>
          <Text style={styles.webCameraSubtext}>
            {i18n.language === 'ta' ? '\u0BAA\u0B9F\u0BAE\u0BCD \u0B8E\u0B9F\u0BC1 \u0B85\u0BB2\u0BCD\u0BB2\u0BA4\u0BC1 \u0B95\u0BC7\u0BB2\u0BB0\u0BBF \u0BAA\u0BAF\u0BA9\u0BCD\u0BAA\u0B9F\u0BC1\u0BA4\u0BCD\u0BA4\u0BB5\u0BC1\u0BAE\u0BCD' : 'Use capture or gallery to analyze'}
          </Text>
        </View>
      )}

      <Pressable
        onPress={handleClose}
        style={[styles.closeButton, { top: insets.top + webTopInset + 16 }]}
      >
        <Ionicons name="close" size={28} color="#fff" />
      </Pressable>

      <View style={[styles.topInfo, { top: insets.top + webTopInset + 16 }]}>
        <View style={styles.industryBadge}>
          <Text style={[styles.industryBadgeText, { color: overlayColor }]}>
            {industryLabel}
          </Text>
        </View>
      </View>

      <Animated.View entering={FadeInUp.delay(200).duration(400)} style={[styles.controls, { paddingBottom: insets.bottom + (Platform.OS === 'web' ? 34 : 20) }]}>
        <Pressable
          onPress={handleGallery}
          style={({ pressed }) => [styles.sideButton, pressed && { opacity: 0.7 }]}
        >
          <View style={styles.sideButtonInner}>
            <Ionicons name="images" size={26} color="#fff" />
          </View>
          <Text style={styles.sideButtonLabel}>{t('gallery')}</Text>
        </Pressable>

        <Pressable
          onPress={handleCapture}
          style={({ pressed }) => [
            styles.captureButton,
            pressed && { transform: [{ scale: 0.92 }] },
          ]}
        >
          <View style={[styles.captureInner, { borderColor: overlayColor }]} />
        </Pressable>

        <View style={styles.sideButton}>
          <View style={styles.sideButtonInner}>
            <Feather name="cpu" size={22} color={Colors.dark.textMuted} />
          </View>
          <Text style={[styles.sideButtonLabel, { color: Colors.dark.textMuted, fontSize: 10 }]}>
            Multimodal GenAI
          </Text>
        </View>
      </Animated.View>
    </View>
  );
}

function CameraOverlay({ color }: { color: string }) {
  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="none">
      <Svg width="100%" height="100%" style={StyleSheet.absoluteFill}>
        <Rect x="15%" y="20%" width="70%" height="55%" rx={12}
          stroke={color} strokeWidth={2} fill="none" strokeDasharray="12,8" opacity={0.7} />
        <Line x1="50%" y1="20%" x2="50%" y2="75%" stroke={color} strokeWidth={0.5} opacity={0.3} />
        <Line x1="15%" y1="47.5%" x2="85%" y2="47.5%" stroke={color} strokeWidth={0.5} opacity={0.3} />
        <Rect x="14%" y="19%" width="8%" height="4%" rx={2}
          stroke={color} strokeWidth={2.5} fill="none" opacity={0.9} />
        <Rect x="78%" y="19%" width="8%" height="4%" rx={2}
          stroke={color} strokeWidth={2.5} fill="none" opacity={0.9} />
        <Rect x="14%" y="72%" width="8%" height="4%" rx={2}
          stroke={color} strokeWidth={2.5} fill="none" opacity={0.9} />
        <Rect x="78%" y="72%" width="8%" height="4%" rx={2}
          stroke={color} strokeWidth={2.5} fill="none" opacity={0.9} />
      </Svg>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
  },
  center: {
    alignItems: 'center',
    justifyContent: 'center',
    gap: 16,
    paddingHorizontal: 24,
  },
  camera: {
    flex: 1,
  },
  webCamera: {
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#111',
    gap: 12,
  },
  webCameraText: {
    fontFamily: 'Rubik_500Medium',
    fontSize: 16,
    color: Colors.dark.textSecondary,
    marginTop: 8,
  },
  webCameraSubtext: {
    fontFamily: 'Rubik_400Regular',
    fontSize: 13,
    color: Colors.dark.textMuted,
  },
  closeButton: {
    position: 'absolute',
    left: 20,
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: 'rgba(0,0,0,0.6)',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 10,
  },
  topInfo: {
    position: 'absolute',
    right: 20,
    flexDirection: 'row',
    gap: 8,
    zIndex: 10,
  },
  industryBadge: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 16,
    backgroundColor: 'rgba(0,0,0,0.6)',
  },
  industryBadgeText: {
    fontFamily: 'Rubik_600SemiBold',
    fontSize: 13,
  },
  controls: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
    paddingTop: 20,
    backgroundColor: 'rgba(0,0,0,0.75)',
  },
  captureButton: {
    width: 84,
    height: 84,
    borderRadius: 42,
    borderWidth: 4,
    borderColor: '#fff',
    alignItems: 'center',
    justifyContent: 'center',
  },
  captureInner: {
    width: 68,
    height: 68,
    borderRadius: 34,
    backgroundColor: '#fff',
    borderWidth: 3,
    borderColor: '#fff',
  },
  sideButton: {
    alignItems: 'center',
    gap: 6,
    width: 64,
  },
  sideButtonInner: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: 'rgba(255,255,255,0.12)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  sideButtonLabel: {
    fontFamily: 'Rubik_400Regular',
    fontSize: 11,
    color: '#fff',
    textAlign: 'center',
  },
  analyzingContainer: {
    alignItems: 'center',
    gap: 16,
  },
  pulseCircle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: Colors.dark.primary + '15',
    alignItems: 'center',
    justifyContent: 'center',
  },
  analyzingText: {
    fontFamily: 'Rubik_600SemiBold',
    fontSize: 22,
    color: Colors.dark.text,
  },
  analyzingSubtext: {
    fontFamily: 'Rubik_400Regular',
    fontSize: 14,
    color: Colors.dark.textSecondary,
  },
  modelInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 8,
  },
  modelText: {
    fontFamily: 'Rubik_400Regular',
    fontSize: 12,
    color: Colors.dark.textMuted,
  },
  previewImage: {
    width: 200,
    height: 200,
    borderRadius: 16,
    marginTop: 20,
    opacity: 0.5,
  },
  permTitle: {
    fontFamily: 'Rubik_600SemiBold',
    fontSize: 20,
    color: Colors.dark.text,
  },
  permDesc: {
    fontFamily: 'Rubik_400Regular',
    fontSize: 14,
    color: Colors.dark.textSecondary,
    textAlign: 'center',
  },
  permButton: {
    backgroundColor: Colors.dark.primary,
    paddingHorizontal: 32,
    paddingVertical: 16,
    borderRadius: 14,
    marginTop: 8,
    minHeight: 56,
    justifyContent: 'center',
  },
  permButtonText: {
    fontFamily: 'Rubik_600SemiBold',
    fontSize: 16,
    color: '#000',
  },
  galleryAlt: {
    marginTop: 12,
    paddingVertical: 12,
    paddingHorizontal: 24,
  },
  galleryAltText: {
    fontFamily: 'Rubik_500Medium',
    fontSize: 15,
    color: Colors.dark.primary,
  },
});
