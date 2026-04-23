import React, { useState, useRef, useEffect } from 'react';
import {
    StyleSheet, Text, View, TextInput, FlatList, Pressable, Platform, KeyboardAvoidingView, ActivityIndicator
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import Colors from '@/constants/colors';
import { useApp } from '@/lib/app-context';

interface Message {
    id: string;
    text: string;
    sender: 'user' | 'ai';
    timestamp: number;
}

const INITIAL_MESSAGES: Message[] = [
    {
        id: '1',
        text: "Hello! I'm Nethra Assistant. How can I help you with defect detection today?",
        sender: 'ai',
        timestamp: Date.now(),
    }
];

import { chatWithAssistant } from '@/lib/ai/gemini-service';

export default function AssistantScreen() {
    const insets = useSafeAreaInsets();
    const { t } = useTranslation();
    const { user } = useApp();
    const [messages, setMessages] = useState<Message[]>(INITIAL_MESSAGES);
    const [inputText, setInputText] = useState('');
    const [isTyping, setIsTyping] = useState(false);
    const flatListRef = useRef<FlatList>(null);
    const webTopInset = Platform.OS === 'web' ? 67 : 0;

    const handleSend = async () => {
        if (!inputText.trim()) return;

        const userText = inputText.trim(); // Capture text before clearing
        const userMsg: Message = {
            id: Date.now().toString(),
            text: userText,
            sender: 'user',
            timestamp: Date.now(),
        };

        setMessages(prev => [...prev, userMsg]);
        setInputText('');
        setIsTyping(true);

        try {
            // Prepare history for context
            const history = messages.map(m => ({
                role: m.sender,
                parts: [m.text]
            }));

            const responseText = await chatWithAssistant(userText, history);

            const aiMsg: Message = {
                id: (Date.now() + 1).toString(),
                text: responseText,
                sender: 'ai',
                timestamp: Date.now(),
            };

            setMessages(prev => [...prev, aiMsg]);
        } catch (e) {
            const errorMsg: Message = {
                id: (Date.now() + 1).toString(),
                text: "I'm having trouble connecting right now. Please try again.",
                sender: 'ai',
                timestamp: Date.now(),
            };
            setMessages(prev => [...prev, errorMsg]);
        } finally {
            setIsTyping(false);
        }
    };

    useEffect(() => {
        setTimeout(() => {
            flatListRef.current?.scrollToEnd({ animated: true });
        }, 100);
    }, [messages, isTyping]);

    const renderItem = ({ item }: { item: Message }) => {
        const isUser = item.sender === 'user';
        return (
            <View style={[
                styles.messageBubble,
                isUser ? styles.userBubble : styles.aiBubble,
                { alignSelf: isUser ? 'flex-end' : 'flex-start' }
            ]}>
                {!isUser && (
                    <View style={styles.aiAvatar}>
                        <MaterialCommunityIcons name="robot" size={16} color="#fff" />
                    </View>
                )}
                <View style={[
                    styles.bubbleContent,
                    isUser ? styles.userContent : styles.aiContent
                ]}>
                    <Text style={[
                        styles.messageText,
                        isUser ? styles.userText : styles.aiText
                    ]}>{item.text}</Text>
                    <Text style={[
                        styles.timestamp,
                        isUser ? styles.userTimestamp : styles.aiTimestamp
                    ]}>
                        {new Date(item.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </Text>
                </View>
            </View>
        );
    };

    return (
        <View style={styles.container}>
            <View style={[styles.header, { paddingTop: insets.top + webTopInset + 16 }]}>
                <Text style={styles.title}>AI Assistant</Text>
            </View>

            <FlatList
                ref={flatListRef}
                data={messages}
                renderItem={renderItem}
                keyExtractor={item => item.id}
                contentContainerStyle={[styles.listContent, { paddingBottom: 20 }]}
                style={styles.list}
            />

            {isTyping && (
                <View style={styles.typingIndicator}>
                    <ActivityIndicator size="small" color={Colors.dark.textMuted} />
                    <Text style={styles.typingText}>Nethra is typing...</Text>
                </View>
            )}

            <KeyboardAvoidingView
                behavior={Platform.OS === 'ios' ? 'padding' : undefined}
                keyboardVerticalOffset={Platform.OS === 'ios' ? 100 : 0}
                style={styles.inputContainer}
            >
                <TextInput
                    style={styles.input}
                    placeholder="Ask Nethra..."
                    placeholderTextColor={Colors.dark.textMuted}
                    value={inputText}
                    onChangeText={setInputText}
                    onSubmitEditing={handleSend}
                />
                <Pressable
                    onPress={handleSend}
                    disabled={!inputText.trim() || isTyping}
                    style={({ pressed }) => [
                        styles.sendButton,
                        pressed && { opacity: 0.8 },
                        (!inputText.trim() || isTyping) && { opacity: 0.5 }
                    ]}
                >
                    <Ionicons name="send" size={20} color="#000" />
                </Pressable>
            </KeyboardAvoidingView>
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
        paddingBottom: 16,
        borderBottomWidth: 1,
        borderBottomColor: Colors.dark.border,
        backgroundColor: Colors.dark.surface,
    },
    title: {
        fontFamily: 'Rubik_700Bold',
        fontSize: 20,
        color: Colors.dark.text,
    },
    list: {
        flex: 1,
    },
    listContent: {
        padding: 20,
        gap: 16,
        paddingBottom: 100,
    },
    messageBubble: {
        maxWidth: '80%',
        flexDirection: 'row',
        alignItems: 'flex-end',
        gap: 8,
    },
    userBubble: {
        flexDirection: 'row-reverse',
    },
    aiBubble: {},
    aiAvatar: {
        width: 28,
        height: 28,
        borderRadius: 14,
        backgroundColor: Colors.dark.primary,
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: 4,
    },
    bubbleContent: {
        padding: 12,
        borderRadius: 16,
        minWidth: 100,
    },
    userContent: {
        backgroundColor: Colors.dark.primary,
        borderBottomRightRadius: 4,
    },
    aiContent: {
        backgroundColor: Colors.dark.surfaceElevated,
        borderBottomLeftRadius: 4,
    },
    messageText: {
        fontFamily: 'Rubik_400Regular',
        fontSize: 15,
        lineHeight: 22,
    },
    userText: {
        color: '#000',
    },
    aiText: {
        color: Colors.dark.text,
    },
    timestamp: {
        fontFamily: 'Rubik_400Regular',
        fontSize: 10,
        marginTop: 4,
        alignSelf: 'flex-end',
    },
    userTimestamp: {
        color: 'rgba(0,0,0,0.5)',
    },
    aiTimestamp: {
        color: Colors.dark.textMuted,
    },
    typingIndicator: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        paddingHorizontal: 24,
        paddingBottom: 8,
    },
    typingText: {
        fontFamily: 'Rubik_400Regular',
        fontSize: 12,
        color: Colors.dark.textMuted,
    },
    inputContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 16,
        gap: 12,
        backgroundColor: Colors.dark.surface,
        borderTopWidth: 1,
        borderTopColor: Colors.dark.border,
        // Lift above absolute tab bar
        marginBottom: Platform.OS === 'web' ? 85 : 80,
    },
    input: {
        flex: 1,
        backgroundColor: Colors.dark.background,
        borderRadius: 24,
        paddingHorizontal: 16,
        paddingVertical: 12,
        color: Colors.dark.text,
        fontFamily: 'Rubik_400Regular',
        fontSize: 15,
        maxHeight: 100,
    },
    sendButton: {
        width: 44,
        height: 44,
        borderRadius: 22,
        backgroundColor: Colors.dark.primary,
        alignItems: 'center',
        justifyContent: 'center',
    },
});
