import React from 'react';
import {
    StyleSheet, Text, View, ScrollView, Pressable, Platform, Alert
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';
import { Ionicons, Feather, MaterialCommunityIcons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import Colors from '@/constants/colors';
import { useApp } from '@/lib/app-context';

export default function SettingsScreen() {
    const insets = useSafeAreaInsets();
    const { t } = useTranslation();
    const router = useRouter();
    const { settings, setLanguage, logout, user } = useApp();
    const webTopInset = Platform.OS === 'web' ? 67 : 0;

    const handleLogout = () => {
        Alert.alert(
            t('logout'),
            t('logout_confirm'),
            [
                { text: t('cancel'), style: 'cancel' },
                {
                    text: t('logout'),
                    style: 'destructive',
                    onPress: async () => {
                        await logout();
                        router.replace('/login');
                    }
                }
            ]
        );
    };

    return (
        <View style={styles.container}>
            <View style={[styles.header, { paddingTop: insets.top + webTopInset + 16 }]}>
                <Text style={styles.title}>{t('settings')}</Text>
            </View>

            <ScrollView contentContainerStyle={styles.content}>

                {/* User Profile Section */}
                <View style={styles.section}>
                    <View style={styles.profileRow}>
                        <View style={styles.avatar}>
                            <Text style={styles.avatarText}>
                                {user.username ? user.username[0].toUpperCase() : 'U'}
                            </Text>
                        </View>
                        <View style={styles.profileInfo}>
                            <Text style={styles.username}>{(user.username || 'Guest').replace(/_/g, ' ')}</Text>
                            <Text style={styles.role}>Supervisor</Text>
                        </View>
                    </View>
                </View>

                {/* General Settings */}
                <Text style={styles.sectionTitle}>{t('general')}</Text>
                <View style={styles.section}>

                    {/* Language Toggle */}
                    <View style={styles.row}>
                        <View style={styles.rowIcon}>
                            <Ionicons name="language" size={22} color={Colors.dark.primary} />
                        </View>
                        <View style={styles.rowContent}>
                            <Text style={styles.rowLabel}>{t('language')}</Text>
                            <Text style={styles.rowSublabel}>
                                {settings.language === 'en' ? 'English' : 'தமிழ்'}
                            </Text>
                        </View>
                        <Pressable
                            onPress={() => setLanguage(settings.language === 'en' ? 'ta' : 'en')}
                            style={styles.langToggle}
                        >
                            <Text style={styles.langToggleText}>
                                {settings.language === 'en' ? 'TA' : 'EN'}
                            </Text>
                        </Pressable>
                    </View>

                </View>

                {/* AI Model Info */}
                <Text style={styles.sectionTitle}>AI System</Text>
                <View style={styles.section}>
                    <View style={styles.row}>
                        <View style={styles.rowIcon}>
                            <MaterialCommunityIcons name="brain" size={22} color="#9C27B0" />
                        </View>
                        <View style={styles.rowContent}>
                            <Text style={styles.rowLabel}>Multimodal GenAI</Text>
                            <Text style={[styles.rowSublabel, { color: Colors.dark.primary }]}>
                                Ready for Integration
                            </Text>
                        </View>
                        <Ionicons
                            name="checkmark-circle"
                            size={24}
                            color={Colors.dark.primary}
                        />
                    </View>

                    <View style={styles.divider} />

                    <View style={styles.row}>
                        <View style={styles.rowIcon}>
                            <Feather name="cpu" size={22} color={Colors.dark.textSecondary} />
                        </View>
                        <View style={styles.rowContent}>
                            <Text style={styles.rowLabel}>Inference Engine</Text>
                            <Text style={styles.rowSublabel}>Multimodal GenAI</Text>
                        </View>
                    </View>
                </View>

                {/* Logout Button */}
                <Pressable
                    onPress={handleLogout}
                    style={({ pressed }) => [styles.logoutButton, pressed && { opacity: 0.8 }]}
                >
                    <Ionicons name="log-out-outline" size={20} color={Colors.dark.critical} />
                    <Text style={styles.logoutText}>{t('logout')}</Text>
                </Pressable>

                <Text style={styles.versionText}>v1.1.0 (GenAI Ready)</Text>

            </ScrollView>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: Colors.dark.background,
    },
    header: {
        paddingHorizontal: 20,
        paddingBottom: 20,
    },
    title: {
        fontFamily: 'Rubik_700Bold',
        fontSize: 28,
        color: Colors.dark.text,
    },
    content: {
        paddingHorizontal: 20,
        paddingBottom: 40,
        gap: 24,
    },
    section: {
        backgroundColor: Colors.dark.surface,
        borderRadius: 16,
        overflow: 'hidden',
        borderWidth: 1,
        borderColor: Colors.dark.border,
    },
    sectionTitle: {
        fontFamily: 'Rubik_600SemiBold',
        fontSize: 16,
        color: Colors.dark.textSecondary,
        marginBottom: -12,
        marginLeft: 4,
    },
    profileRow: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 16,
        gap: 16,
    },
    avatar: {
        width: 56,
        height: 56,
        borderRadius: 28,
        backgroundColor: Colors.dark.primary,
        alignItems: 'center',
        justifyContent: 'center',
    },
    avatarText: {
        fontFamily: 'Rubik_700Bold',
        fontSize: 24,
        color: '#000',
    },
    profileInfo: {
        flex: 1,
    },
    username: {
        fontFamily: 'Rubik_600SemiBold',
        fontSize: 18,
        color: Colors.dark.text,
    },
    role: {
        fontFamily: 'Rubik_400Regular',
        fontSize: 14,
        color: Colors.dark.textSecondary,
    },
    row: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 16,
        gap: 16,
    },
    rowIcon: {
        width: 36,
        height: 36,
        borderRadius: 10,
        backgroundColor: Colors.dark.surfaceElevated,
        alignItems: 'center',
        justifyContent: 'center',
    },
    rowContent: {
        flex: 1,
    },
    rowLabel: {
        fontFamily: 'Rubik_500Medium',
        fontSize: 16,
        color: Colors.dark.text,
    },
    rowSublabel: {
        fontFamily: 'Rubik_400Regular',
        fontSize: 13,
        color: Colors.dark.textMuted,
        marginTop: 2,
    },
    divider: {
        height: 1,
        backgroundColor: Colors.dark.border,
        marginLeft: 68,
    },
    langToggle: {
        backgroundColor: Colors.dark.surfaceElevated,
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 8,
        borderWidth: 1,
        borderColor: Colors.dark.border,
    },
    langToggleText: {
        fontFamily: 'Rubik_600SemiBold',
        fontSize: 14,
        color: Colors.dark.primary,
    },
    logoutButton: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 8,
        paddingVertical: 16,
        backgroundColor: Colors.dark.critical + '15',
        borderRadius: 14,
        borderWidth: 1,
        borderColor: Colors.dark.critical + '40',
        marginTop: 8,
    },
    logoutText: {
        fontFamily: 'Rubik_600SemiBold',
        fontSize: 16,
        color: Colors.dark.critical,
    },
    versionText: {
        fontFamily: 'Rubik_400Regular',
        fontSize: 12,
        color: Colors.dark.textMuted,
        textAlign: 'center',
        marginTop: 20,
    }
});
