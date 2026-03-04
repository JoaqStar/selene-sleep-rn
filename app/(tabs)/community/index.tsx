import React, { useRef, useEffect } from 'react';
import {
  View, Text, StyleSheet, ScrollView, Pressable, Animated, ActivityIndicator,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Users, ChevronRight, MessageCircle } from 'lucide-react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import Colors from '@/constants/colors';
import { useStreamChat } from '@/lib/hooks/useStreamChat';
import { useCommunityStore } from '@/stores/communityStore';
import { COMMUNITY_CHANNELS } from '@/lib/stream/channels';

export default function CommunityScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const { client, isConnected } = useStreamChat();
  const { setClient, setConnected } = useCommunityStore();

  useEffect(() => {
    setClient(client);
    setConnected(isConnected);
  }, [client, isConnected]);

  useEffect(() => {
    Animated.timing(fadeAnim, { toValue: 1, duration: 800, useNativeDriver: true }).start();
  }, []);

  const handleChannelPress = (channelId: string) => {
    router.push(`/community/${channelId}`);
  };

  if (!isConnected) {
    return (
      <LinearGradient
        colors={[Colors.gradientStart, Colors.gradientMid, Colors.gradientEnd]}
        style={styles.container}
      >
        <View style={[styles.loadingContainer, { paddingTop: insets.top }]}>
          <ActivityIndicator size="large" color={Colors.accent} />
          <Text style={styles.loadingText}>Connecting to community...</Text>
        </View>
      </LinearGradient>
    );
  }

  return (
    <LinearGradient
      colors={[Colors.gradientStart, Colors.gradientMid, Colors.gradientEnd]}
      style={styles.container}
    >
      <ScrollView
        contentContainerStyle={[styles.content, { paddingTop: insets.top + 20, paddingBottom: insets.bottom + 100 }]}
        showsVerticalScrollIndicator={false}
      >
        <Animated.View style={[styles.header, { opacity: fadeAnim }]}>
          <View style={styles.iconContainer}>
            <Users size={24} color={Colors.accent} />
          </View>
          <Text style={styles.title}>Community</Text>
          <Text style={styles.subtitle}>You&apos;re not alone in this. Share, ask, connect.</Text>
        </Animated.View>

        <Animated.View style={{ opacity: fadeAnim }}>
          {COMMUNITY_CHANNELS.map((channel, index) => (
            <Pressable
              key={channel.id}
              onPress={() => handleChannelPress(channel.id)}
              style={({ pressed }) => [
                styles.channelCard,
                pressed && styles.channelCardPressed,
              ]}
              testID={`channel-${channel.id}`}
            >
              <View style={styles.channelIconWrap}>
                <MessageCircle size={20} color={Colors.accent} />
              </View>
              <View style={styles.channelInfo}>
                <Text style={styles.channelName}>{channel.name}</Text>
                <Text style={styles.channelDescription} numberOfLines={1}>
                  {channel.description}
                </Text>
              </View>
              <ChevronRight size={18} color={Colors.textMuted} />
            </Pressable>
          ))}
        </Animated.View>
      </ScrollView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 16,
  },
  loadingText: {
    fontSize: 15,
    color: Colors.textSecondary,
  },
  content: {
    paddingHorizontal: 20,
  },
  header: {
    alignItems: 'center',
    marginBottom: 28,
  },
  iconContainer: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: Colors.accentDim,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 14,
  },
  title: {
    fontSize: 26,
    fontWeight: '300' as const,
    color: Colors.text,
    letterSpacing: 0.5,
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 14,
    color: Colors.textSecondary,
    textAlign: 'center',
    lineHeight: 20,
  },
  channelCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.cardBackground,
    borderRadius: 14,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  channelCardPressed: {
    backgroundColor: Colors.cardBackgroundLight,
  },
  channelIconWrap: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: Colors.accentDim,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 14,
  },
  channelInfo: {
    flex: 1,
    marginRight: 8,
  },
  channelName: {
    fontSize: 16,
    fontWeight: '600' as const,
    color: Colors.text,
    marginBottom: 3,
  },
  channelDescription: {
    fontSize: 13,
    color: Colors.textSecondary,
    lineHeight: 18,
  },
});
