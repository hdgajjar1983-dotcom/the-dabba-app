import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  FlatList,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  Dimensions,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Animated, {
  FadeIn,
  FadeInUp,
  SlideInRight,
  SlideInUp,
  useSharedValue,
  useAnimatedStyle,
  withSpring,
} from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';
import { chatAPI } from '../services/api';

const { height: SCREEN_HEIGHT } = Dimensions.get('window');

const COLORS = {
  primary: '#8B1538',
  gold: '#C9A050',
  goldLight: '#F5E6C8',
  background: '#FDF8F3',
  card: '#FFFFFF',
  text: '#3D2914',
  textLight: '#8B7355',
  border: '#E8DED1',
  success: '#2E7D32',
  userBubble: '#8B1538',
  aiBubble: '#FFFFFF',
};

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp?: string;
  action_taken?: any;
}

interface TiffinConciergeProps {
  isVisible: boolean;
  onClose: () => void;
}

const TiffinConcierge: React.FC<TiffinConciergeProps> = ({ isVisible, onClose }) => {
  const [messages, setMessages] = useState<Message[]>([
    {
      id: 'welcome',
      role: 'assistant',
      content: "Namaste! I'm your Tiffin Concierge. I can help you skip meals, track your delivery, check your wallet, or update your spice preference. What can I do for you today?",
    }
  ]);
  const [inputText, setInputText] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const flatListRef = useRef<FlatList>(null);

  // Quick action suggestions
  const quickActions = [
    { label: 'Track my food', icon: 'bicycle' },
    { label: 'Skip tomorrow', icon: 'close-circle' },
    { label: 'Check wallet', icon: 'wallet' },
    { label: 'Too spicy!', icon: 'flame' },
  ];

  useEffect(() => {
    if (isVisible) {
      loadHistory();
    }
  }, [isVisible]);

  const loadHistory = async () => {
    try {
      const res = await chatAPI.getHistory();
      if (res.data.messages && res.data.messages.length > 0) {
        setMessages([
          {
            id: 'welcome',
            role: 'assistant',
            content: "Welcome back! How can I help you today?",
          },
          ...res.data.messages.map((m: any, i: number) => ({
            id: `hist-${i}`,
            role: m.role,
            content: m.content,
            timestamp: m.timestamp,
          }))
        ]);
      }
    } catch (err) {
      // Keep welcome message
    }
  };

  const sendMessage = async (text: string) => {
    if (!text.trim() || isLoading) return;

    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    
    const userMessage: Message = {
      id: `user-${Date.now()}`,
      role: 'user',
      content: text.trim(),
    };

    setMessages(prev => [...prev, userMessage]);
    setInputText('');
    setIsLoading(true);

    // Scroll to bottom
    setTimeout(() => {
      flatListRef.current?.scrollToEnd({ animated: true });
    }, 100);

    try {
      const res = await chatAPI.sendMessage(text.trim());
      
      const aiMessage: Message = {
        id: `ai-${Date.now()}`,
        role: 'assistant',
        content: res.data.response,
        action_taken: res.data.action_taken,
      };

      setMessages(prev => [...prev, aiMessage]);

      // If action was taken, show haptic feedback
      if (res.data.action_taken) {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      }

      // Scroll to bottom
      setTimeout(() => {
        flatListRef.current?.scrollToEnd({ animated: true });
      }, 100);

    } catch (err) {
      setMessages(prev => [...prev, {
        id: `error-${Date.now()}`,
        role: 'assistant',
        content: "I'm sorry, I'm having trouble connecting. Please try again in a moment.",
      }]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleQuickAction = (action: string) => {
    sendMessage(action);
  };

  const renderMessage = ({ item, index }: { item: Message; index: number }) => {
    const isUser = item.role === 'user';
    
    return (
      <Animated.View
        entering={FadeInUp.delay(index * 50).springify()}
        style={[
          styles.messageBubble,
          isUser ? styles.userBubble : styles.aiBubble,
        ]}
      >
        {!isUser && (
          <View style={styles.aiAvatar}>
            <Text style={styles.aiAvatarText}>🍱</Text>
          </View>
        )}
        <View style={[
          styles.messageContent,
          isUser ? styles.userContent : styles.aiContent,
        ]}>
          <Text style={[
            styles.messageText,
            isUser ? styles.userText : styles.aiText,
          ]}>
            {item.content}
          </Text>
          
          {/* Show action taken badge */}
          {item.action_taken && (
            <View style={styles.actionBadge}>
              <Ionicons name="checkmark-circle" size={14} color={COLORS.success} />
              <Text style={styles.actionText}>
                {item.action_taken.action === 'SKIP_MEAL' 
                  ? `Meal skipped! $${item.action_taken.credited} CAD credited`
                  : item.action_taken.action === 'UPDATE_SPICE'
                  ? `Spice preference updated to ${item.action_taken.level}`
                  : 'Action completed'}
              </Text>
            </View>
          )}
        </View>
      </Animated.View>
    );
  };

  if (!isVisible) return null;

  return (
    <Animated.View 
      entering={SlideInUp.springify()}
      style={styles.container}
    >
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <Text style={styles.headerEmoji}>🍱</Text>
          <View>
            <Text style={styles.headerTitle}>Tiffin Concierge</Text>
            <Text style={styles.headerSubtitle}>Halifax&apos;s AI Assistant</Text>
          </View>
        </View>
        <TouchableOpacity style={styles.closeBtn} onPress={onClose}>
          <Ionicons name="close" size={24} color={COLORS.text} />
        </TouchableOpacity>
      </View>

      {/* Messages */}
      <FlatList
        ref={flatListRef}
        data={messages}
        renderItem={renderMessage}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.messagesList}
        showsVerticalScrollIndicator={false}
        onContentSizeChange={() => flatListRef.current?.scrollToEnd({ animated: true })}
      />

      {/* Quick Actions */}
      {messages.length <= 2 && (
        <Animated.View entering={FadeIn.delay(300)} style={styles.quickActions}>
          {quickActions.map((action, index) => (
            <TouchableOpacity
              key={action.label}
              style={styles.quickActionBtn}
              onPress={() => handleQuickAction(action.label)}
            >
              <Ionicons name={action.icon as any} size={16} color={COLORS.primary} />
              <Text style={styles.quickActionText}>{action.label}</Text>
            </TouchableOpacity>
          ))}
        </Animated.View>
      )}

      {/* Loading indicator */}
      {isLoading && (
        <View style={styles.loadingContainer}>
          <View style={styles.typingIndicator}>
            <Text style={styles.typingDot}>●</Text>
            <Text style={[styles.typingDot, { animationDelay: '0.2s' }]}>●</Text>
            <Text style={[styles.typingDot, { animationDelay: '0.4s' }]}>●</Text>
          </View>
        </View>
      )}

      {/* Input */}
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={100}
      >
        <View style={styles.inputContainer}>
          <TextInput
            style={styles.input}
            placeholder="Ask me anything..."
            placeholderTextColor={COLORS.textLight}
            value={inputText}
            onChangeText={setInputText}
            onSubmitEditing={() => sendMessage(inputText)}
            returnKeyType="send"
            editable={!isLoading}
          />
          <TouchableOpacity
            style={[styles.sendBtn, (!inputText.trim() || isLoading) && styles.sendBtnDisabled]}
            onPress={() => sendMessage(inputText)}
            disabled={!inputText.trim() || isLoading}
          >
            {isLoading ? (
              <ActivityIndicator size="small" color={COLORS.goldLight} />
            ) : (
              <Ionicons name="send" size={20} color={COLORS.goldLight} />
            )}
          </TouchableOpacity>
        </View>

        {/* Human Handover */}
        <TouchableOpacity 
          style={styles.humanHandover}
          onPress={() => sendMessage("I need to speak to a human")}
        >
          <Ionicons name="person" size={14} color={COLORS.textLight} />
          <Text style={styles.humanHandoverText}>Speak to Human</Text>
        </TouchableOpacity>
      </KeyboardAvoidingView>
    </Animated.View>
  );
};

// Floating Chat Button
export const ChatButton: React.FC<{ onPress: () => void }> = ({ onPress }) => {
  const scale = useSharedValue(1);
  
  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  const handlePressIn = () => {
    scale.value = withSpring(0.9);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
  };

  const handlePressOut = () => {
    scale.value = withSpring(1);
  };

  return (
    <TouchableOpacity
      activeOpacity={1}
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      onPress={onPress}
    >
      <Animated.View style={[styles.chatButton, animatedStyle]}>
        <Text style={styles.chatButtonEmoji}>🍱</Text>
        <View style={styles.chatButtonBadge}>
          <Ionicons name="chatbubble-ellipses" size={10} color="#FFF" />
        </View>
      </Animated.View>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: SCREEN_HEIGHT * 0.75,
    backgroundColor: COLORS.background,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 10,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  headerEmoji: {
    fontSize: 32,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: COLORS.primary,
  },
  headerSubtitle: {
    fontSize: 12,
    color: COLORS.textLight,
  },
  closeBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: COLORS.card,
    alignItems: 'center',
    justifyContent: 'center',
  },
  messagesList: {
    padding: 16,
    paddingBottom: 8,
  },
  messageBubble: {
    flexDirection: 'row',
    marginBottom: 12,
    maxWidth: '85%',
  },
  userBubble: {
    alignSelf: 'flex-end',
  },
  aiBubble: {
    alignSelf: 'flex-start',
  },
  aiAvatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: COLORS.goldLight,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 8,
  },
  aiAvatarText: {
    fontSize: 16,
  },
  messageContent: {
    padding: 12,
    borderRadius: 16,
  },
  userContent: {
    backgroundColor: COLORS.userBubble,
    borderBottomRightRadius: 4,
  },
  aiContent: {
    backgroundColor: COLORS.card,
    borderBottomLeftRadius: 4,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  messageText: {
    fontSize: 15,
    lineHeight: 22,
  },
  userText: {
    color: COLORS.goldLight,
  },
  aiText: {
    color: COLORS.text,
  },
  actionBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 8,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
  },
  actionText: {
    fontSize: 12,
    color: COLORS.success,
    fontWeight: '600',
  },
  quickActions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    padding: 12,
    gap: 8,
  },
  quickActionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: COLORS.card,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: COLORS.primary,
  },
  quickActionText: {
    fontSize: 13,
    fontWeight: '600',
    color: COLORS.primary,
  },
  loadingContainer: {
    paddingHorizontal: 16,
    paddingBottom: 8,
  },
  typingIndicator: {
    flexDirection: 'row',
    gap: 4,
    backgroundColor: COLORS.card,
    padding: 12,
    borderRadius: 16,
    alignSelf: 'flex-start',
  },
  typingDot: {
    fontSize: 12,
    color: COLORS.textLight,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    gap: 10,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
    backgroundColor: COLORS.card,
  },
  input: {
    flex: 1,
    backgroundColor: COLORS.background,
    borderRadius: 24,
    paddingHorizontal: 18,
    paddingVertical: 12,
    fontSize: 15,
    color: COLORS.text,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  sendBtn: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: COLORS.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sendBtnDisabled: {
    opacity: 0.5,
  },
  humanHandover: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 12,
    backgroundColor: COLORS.card,
  },
  humanHandoverText: {
    fontSize: 13,
    color: COLORS.textLight,
  },
  // Floating button styles
  chatButton: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: COLORS.primary,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: COLORS.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 8,
    elevation: 8,
  },
  chatButtonEmoji: {
    fontSize: 28,
  },
  chatButtonBadge: {
    position: 'absolute',
    top: 0,
    right: 0,
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: COLORS.success,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: COLORS.card,
  },
});

export default TiffinConcierge;
