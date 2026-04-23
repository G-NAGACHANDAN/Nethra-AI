import React, { useState } from 'react';
import {
    StyleSheet,
    Text,
    View,
    TextInput,
    Pressable,
    Image,
    KeyboardAvoidingView,
    Platform,
    Alert
} from 'react-native';
import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { Ionicons } from '@expo/vector-icons';
import { useApp } from '@/lib/app-context';
import Colors from '@/constants/colors';

export default function LoginScreen() {
    const { t } = useTranslation();
    const router = useRouter();
    const { login } = useApp();
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [isLoading, setIsLoading] = useState(false);

    const handleLogin = async () => {
        if (!username || !password) {
            Alert.alert('Error', 'Please enter both username and password');
            return;
        }

        setIsLoading(true);

        // Simulate API call
        setTimeout(async () => {
            if (password === 'admin' || password === '1234') { // Simple mock auth
                await login(username);
                setIsLoading(false);
                router.replace('/(tabs)');
            } else {
                setIsLoading(false);
                Alert.alert('Error', 'Invalid credentials');
            }
        }, 1000);
    };

    return (
        <View style={styles.container}>
            <View style={styles.content}>
                <View style={styles.logoContainer}>
                    <View style={styles.logoCircle}>
                        <Ionicons name="scan-outline" size={40} color={Colors.dark.primary} />
                    </View>
                    <Text style={styles.appName}>Nethra AI</Text>
                    <Text style={styles.tagline}>Intelligent Defect Detection</Text>
                </View>

                <KeyboardAvoidingView
                    behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
                    style={styles.form}
                >
                    <View style={styles.inputGroup}>
                        <Text style={styles.label}>Username</Text>
                        <TextInput
                            style={styles.input}
                            placeholder="Enter username"
                            placeholderTextColor={Colors.dark.textMuted}
                            value={username}
                            onChangeText={setUsername}
                            autoCapitalize="none"
                        />
                    </View>

                    <View style={styles.inputGroup}>
                        <Text style={styles.label}>Password</Text>
                        <TextInput
                            style={styles.input}
                            placeholder="Enter password"
                            placeholderTextColor={Colors.dark.textMuted}
                            value={password}
                            onChangeText={setPassword}
                            secureTextEntry
                        />
                    </View>

                    <Pressable
                        onPress={handleLogin}
                        style={({ pressed }) => [
                            styles.loginButton,
                            pressed && { opacity: 0.9 },
                            isLoading && { opacity: 0.7 }
                        ]}
                        disabled={isLoading}
                    >
                        <Text style={styles.loginButtonText}>
                            {isLoading ? 'Logging in...' : 'Login'}
                        </Text>
                    </Pressable>

                    <View style={styles.footer}>
                        <Text style={styles.footerText}>Demo Access:</Text>
                        <Text style={styles.footerSubtext}>User: admin / Pass: 1234</Text>
                    </View>
                </KeyboardAvoidingView>
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: Colors.dark.background,
        justifyContent: 'center',
    },
    content: {
        padding: 24,
        gap: 40,
    },
    logoContainer: {
        alignItems: 'center',
        gap: 12,
    },
    logoCircle: {
        width: 80,
        height: 80,
        borderRadius: 40,
        backgroundColor: Colors.dark.surface,
        alignItems: 'center',
        justifyContent: 'center',
        borderWidth: 1,
        borderColor: Colors.dark.border,
    },
    appName: {
        fontFamily: 'Rubik_700Bold',
        fontSize: 32,
        color: Colors.dark.text,
    },
    tagline: {
        fontFamily: 'Rubik_400Regular',
        fontSize: 16,
        color: Colors.dark.textSecondary,
    },
    form: {
        gap: 20,
    },
    inputGroup: {
        gap: 8,
    },
    label: {
        fontFamily: 'Rubik_500Medium',
        fontSize: 14,
        color: Colors.dark.textSecondary,
    },
    input: {
        backgroundColor: Colors.dark.surface,
        borderWidth: 1,
        borderColor: Colors.dark.border,
        borderRadius: 12,
        padding: 16,
        color: Colors.dark.text,
        fontFamily: 'Rubik_400Regular',
        fontSize: 16,
    },
    loginButton: {
        backgroundColor: Colors.dark.primary,
        paddingVertical: 18,
        borderRadius: 14,
        alignItems: 'center',
        marginTop: 12,
    },
    loginButtonText: {
        fontFamily: 'Rubik_600SemiBold',
        fontSize: 16,
        color: '#000',
    },
    footer: {
        alignItems: 'center',
        marginTop: 20,
        gap: 4,
    },
    footerText: {
        fontFamily: 'Rubik_500Medium',
        fontSize: 14,
        color: Colors.dark.textSecondary,
    },
    footerSubtext: {
        fontFamily: 'Rubik_400Regular',
        fontSize: 14,
        color: Colors.dark.textMuted,
    },
});
