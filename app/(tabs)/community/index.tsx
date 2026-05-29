import React, { useMemo, useRef, useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  ActivityIndicator,
  FlatList,
  TextInput,
  Modal,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Users, MessageCircle, Plus, Pencil, ThumbsUp, X } from 'lucide-react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import Colors from '@/constants/colors';
import { useStreamChat } from '@/lib/hooks/useStreamChat';
import { useCommunityStore } from '@/stores/communityStore';
import { COMMUNITY_CHANNEL } from '@/lib/stream/channels';
import {
  CommunityTag,
  COMMUNITY_TAGS,
  normalizeCommunityTag,
} from '@/lib/community/tags';
import { classifyCommunityPostTags } from '@/lib/services/communityTaggingService';
import { hasSupabaseConfig, supabase } from '@/lib/supabase';
import { useAuthStore } from '@/stores/authStore';
import TagPillSlider from '@/components/TagPillSlider';

interface StreamFeedMessage {
  id: string;
  text: string;
  user?: {
    id: string;
    name?: string;
  };
  created_at: string;
  reaction_counts?: Record<string, number>;
  own_reactions?: Array<{ type: string }>;
  reply_count?: number;
  tag: string;
  tags: string[];
}

type CommunityTagStat = {
  tag: string;
  usage_count: number;
};

export default function CommunityScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { session } = useAuthStore();
  const { client, isConnected, error, retry } = useStreamChat();
  const { setClient, setConnected } = useCommunityStore();
  const channelRef = useRef<any>(null);
  const [messages, setMessages] = useState<StreamFeedMessage[]>([]);
  const [isLoadingFeed, setIsLoadingFeed] = useState(true);
  const [feedError, setFeedError] = useState<string | null>(null);
  const [selectedFilter, setSelectedFilter] = useState<string>('All');
  const [filterTagSearchInput, setFilterTagSearchInput] = useState('');
  const [isComposerOpen, setIsComposerOpen] = useState(false);
  const [composerText, setComposerText] = useState('');
  const [isComposerAutoSelected, setIsComposerAutoSelected] = useState(true);
  const [composerSelectedPresetTags, setComposerSelectedPresetTags] = useState<string[]>([]);
  const [customTagInput, setCustomTagInput] = useState('');
  const [autoSuggestedTags, setAutoSuggestedTags] = useState<string[] | null>(null);
  const [popularTagStats, setPopularTagStats] = useState<CommunityTagStat[]>([]);
  const [isClassifying, setIsClassifying] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [editingPostId, setEditingPostId] = useState<string | null>(null);
  const [editingCustomTagInput, setEditingCustomTagInput] = useState('');
  const [isUpdatingTag, setIsUpdatingTag] = useState(false);
  const messagesRef = useRef<StreamFeedMessage[]>([]);

  useEffect(() => {
    setClient(client);
    setConnected(isConnected);
  }, [client, isConnected]);

  useEffect(() => {
    messagesRef.current = messages;
  }, [messages]);

  useEffect(() => {
    if (!isConnected || !hasSupabaseConfig || !supabase) {
      setPopularTagStats([]);
      return;
    }
    const supabaseClient = supabase;

    let isSubscribed = true;
    const loadPopularTags = async () => {
      try {
        const { data, error: rpcError } = await supabaseClient.rpc('get_top_community_tags', {
          limit_count: 100,
        });
        if (rpcError) {
          throw rpcError;
        }
        if (!isSubscribed || !Array.isArray(data)) return;

        const mapped = data
          .map((row: any) => ({
            tag: String(row?.tag ?? '').trim(),
            usage_count: Number(row?.usage_count ?? 0),
          }))
          .filter((row) => row.tag.length > 0);
        setPopularTagStats(mapped);
      } catch (fetchError) {
        console.warn('[CommunityScreen] Failed to load popular tags', fetchError);
      }
    };

    loadPopularTags();
    return () => {
      isSubscribed = false;
    };
  }, [isConnected]);

  useEffect(() => {
    if (!client || !isConnected) {
      setMessages([]);
      setIsLoadingFeed(true);
      return;
    }

    let isSubscribed = true;
    const setupChannel = async () => {
      setFeedError(null);
      setIsLoadingFeed(true);
      try {
        const channel = client.channel('messaging', COMMUNITY_CHANNEL.id, {
          name: COMMUNITY_CHANNEL.name,
          description: COMMUNITY_CHANNEL.description,
        } as Record<string, unknown>);
        await channel.watch();
        channelRef.current = channel;

        const initial = (channel.state.messages ?? [])
          .filter((message: any) => !message.parent_id)
          .map((message: any) => mapStreamMessage(message))
          .sort(sortByNewest);
        if (isSubscribed) {
          setMessages(initial);
        }

        channel.on('message.new', (event: any) => {
          if (!isSubscribed || !event.message || event.message.parent_id) return;
          const mapped = mapStreamMessage(event.message);
          console.log('[DebugCommunity] message.new mapped', {
            id: mapped.id,
            hasText: mapped.text.length > 0,
            textLength: mapped.text.length,
            tags: mapped.tags,
          });
          setMessages((prev) => upsertAndSortMessages(prev, mapped));
        });

        channel.on('message.updated', (event: any) => {
          if (!isSubscribed || !event.message || event.message.parent_id) return;
          const previous = messagesRef.current.find((message) => message.id === event.message.id);
          const mapped = mapStreamMessage(event.message, previous);
          console.log('[DebugCommunity] message.updated mapped', {
            id: mapped.id,
            incomingHasTextField: typeof event.message.text === 'string',
            incomingTextLength: typeof event.message.text === 'string' ? event.message.text.length : null,
            previousTextLength: previous?.text.length ?? null,
            mappedTextLength: mapped.text.length,
            tags: mapped.tags,
          });
          setMessages((prev) => upsertAndSortMessages(prev, mapped));
        });
      } catch (setupErr) {
        console.error('[CommunityScreen] Failed to load feed', setupErr);
        if (isSubscribed) {
          setFeedError('Failed to load community feed. Please try again.');
        }
      } finally {
        if (isSubscribed) {
          setIsLoadingFeed(false);
        }
      }
    };

    setupChannel();
    return () => {
      isSubscribed = false;
    };
  }, [client, isConnected]);

  const composerResolvedManualTags = useMemo(
    () => mergeAndDedupeTags([
      ...composerSelectedPresetTags,
      ...parseTagListInput(customTagInput),
    ]),
    [composerSelectedPresetTags, customTagInput],
  );

  const autoClassifierTagPool = useMemo(
    () => mergeAndDedupeTags([...COMMUNITY_TAGS, ...popularTagStats.map((row) => row.tag)]),
    [popularTagStats],
  );

  const autoClassifierPopularCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    for (const row of popularTagStats) {
      counts[row.tag] = row.usage_count;
      counts[row.tag.toLowerCase()] = row.usage_count;
    }
    return counts;
  }, [popularTagStats]);

  const topUsedTags = useMemo(
    () => mergeAndDedupeTags(popularTagStats.map((row) => row.tag)).slice(0, 5),
    [popularTagStats],
  );

  const communityFilterOptions = useMemo(
    () => ['All', ...(topUsedTags.length > 0 ? topUsedTags : [...COMMUNITY_TAGS])],
    [topUsedTags],
  );

  const allKnownFilterTags = useMemo(() => (
    mergeAndDedupeTags([
      ...popularTagStats.map((row) => row.tag),
      ...messages.flatMap((message) => message.tags),
      ...COMMUNITY_TAGS,
    ])
  ), [messages, popularTagStats]);

  const visibleFilterOptions = useMemo(() => {
    const query = filterTagSearchInput.trim().toLowerCase();
    if (!query) return communityFilterOptions;
    const matchingTags = allKnownFilterTags.filter((tag) => tag.toLowerCase().includes(query));
    return ['All', ...matchingTags];
  }, [allKnownFilterTags, communityFilterOptions, filterTagSearchInput]);

  const composerTopTagOptions = useMemo(
    () => (topUsedTags.length > 0 ? topUsedTags : [...COMMUNITY_TAGS]),
    [topUsedTags],
  );

  useEffect(() => {
    if (!communityFilterOptions.includes(selectedFilter)) {
      setSelectedFilter('All');
    }
  }, [communityFilterOptions, selectedFilter]);

  const visibleMessages = useMemo(() => {
    const query = filterTagSearchInput.trim().toLowerCase();
    return messages.filter((message) => {
      const matchesSelectedFilter = selectedFilter === 'All' || message.tags.includes(selectedFilter);
      const matchesTypedQuery = !query || message.tags.some((tag) => tag.toLowerCase().includes(query));
      return matchesSelectedFilter && matchesTypedQuery;
    });
  }, [filterTagSearchInput, messages, selectedFilter]);

  const handleOpenThread = useCallback((messageId: string) => {
    router.push({
      pathname: '/community/thread',
      params: {
        messageId,
        channelId: COMMUNITY_CHANNEL.id,
      },
    });
  }, [router]);

  const handleLikeToggle = useCallback(async (messageId: string, hasLiked: boolean) => {
    const uid = session?.user?.id;
    const channel = channelRef.current;
    if (!uid || !channel) return;

    setMessages((prev) => prev.map((message) => {
      if (message.id !== messageId) return message;

      const currentCount = message.reaction_counts?.like ?? 0;
      const own = message.own_reactions ?? [];
      if (hasLiked) {
        return {
          ...message,
          reaction_counts: { ...(message.reaction_counts ?? {}), like: Math.max(currentCount - 1, 0) },
          own_reactions: own.filter((reaction) => reaction.type !== 'like'),
        };
      }
      return {
        ...message,
        reaction_counts: { ...(message.reaction_counts ?? {}), like: currentCount + 1 },
        own_reactions: [...own, { type: 'like' }],
      };
    }));

    try {
      if (hasLiked) {
        await channel.deleteReaction(messageId, 'like', uid);
      } else {
        await channel.sendReaction(messageId, { type: 'like' });
        if (hasSupabaseConfig && supabase) {
          const target = messages.find((message) => message.id === messageId);
          const postOwnerId = target?.user?.id;
          if (postOwnerId && postOwnerId !== uid) {
            fetch(`${getSupabaseUrl()}/functions/v1/notify-like`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                postOwnerId,
                actorUserId: uid,
                messageSnippet: (target?.text ?? '').slice(0, 80),
              }),
            }).catch((notifyErr) => {
              console.error('[CommunityScreen] notify-like error', notifyErr);
            });
          }
        }
      }
    } catch (reactionErr) {
      console.error('[CommunityScreen] Failed to toggle like', reactionErr);
    }
  }, [messages, session?.user?.id]);

  const handleRunAutoTag = useCallback(async (): Promise<string[]> => {
    const text = composerText.trim();
    if (!text) {
      throw new Error('Post text is required');
    }

    setIsClassifying(true);
    try {
      const suggestedTags = await classifyCommunityPostTags(text, {
        availableTags: autoClassifierTagPool,
        popularTagCounts: autoClassifierPopularCounts,
        maxTags: 3,
      });
      setAutoSuggestedTags(suggestedTags);
      return suggestedTags;
    } catch (classifyErr) {
      console.warn('[CommunityScreen] Claude tag classification failed, falling back to General', classifyErr);
      setAutoSuggestedTags(['General']);
      return ['General'];
    } finally {
      setIsClassifying(false);
    }
  }, [autoClassifierPopularCounts, autoClassifierTagPool, composerText]);

  const resetComposer = useCallback(() => {
    setComposerText('');
    setIsComposerAutoSelected(true);
    setComposerSelectedPresetTags([]);
    setCustomTagInput('');
    setAutoSuggestedTags(null);
    setIsClassifying(false);
    setIsSending(false);
  }, []);

  const closeComposer = useCallback(() => {
    setIsComposerOpen(false);
    resetComposer();
  }, [resetComposer]);

  const handleSendPost = useCallback(async () => {
    const text = composerText.trim();
    const channel = channelRef.current;
    if (!text || !channel || isSending) return;

    let resolvedTags: string[];
    if (isComposerAutoSelected) {
      resolvedTags = autoSuggestedTags ?? await handleRunAutoTag();
    } else {
      resolvedTags = composerResolvedManualTags;
      if (resolvedTags.length === 0) return;
    }

    setIsSending(true);
    try {
      await channel.sendMessage({
        text,
        tag: resolvedTags[0],
        tags: resolvedTags,
      });
      if (hasSupabaseConfig && supabase) {
        updateTagStats(resolvedTags, []).catch((tagStatsErr) => {
          console.warn('[CommunityScreen] Failed to update tag stats after post', tagStatsErr);
        });
      }
      closeComposer();
    } catch (sendErr) {
      console.error('[CommunityScreen] Failed to send post', sendErr);
    } finally {
      setIsSending(false);
    }
  }, [
    autoSuggestedTags,
    closeComposer,
    composerResolvedManualTags,
    composerText,
    handleRunAutoTag,
    isComposerAutoSelected,
    isSending,
  ]);

  const handleSelectComposerAuto = useCallback(() => {
    setIsComposerAutoSelected(true);
    setComposerSelectedPresetTags([]);
    setCustomTagInput('');
    setAutoSuggestedTags(null);
  }, []);

  const handleToggleComposerPresetTag = useCallback((selection: string) => {
    setIsComposerAutoSelected(false);
    setAutoSuggestedTags(null);
    setComposerSelectedPresetTags((prev) => {
      if (prev.includes(selection)) {
        return prev.filter((tag) => tag !== selection);
      }
      return [...prev, selection];
    });
  }, []);

  const handleCustomTagChange = useCallback((value: string) => {
    setCustomTagInput(value);
    setIsComposerAutoSelected(false);
    setAutoSuggestedTags(null);
  }, []);

  const handleComposerPillPress = useCallback((option: string) => {
    if (option === 'Auto') {
      handleSelectComposerAuto();
      return;
    }
    handleToggleComposerPresetTag(option);
  }, [handleSelectComposerAuto, handleToggleComposerPresetTag]);

  const handleUpdateTags = useCallback(async (postId: string, nextTagsInput: string[] | string) => {
    if (!client || isUpdatingTag) return;
    const candidateTags = Array.isArray(nextTagsInput)
      ? nextTagsInput
      : parseTagListInput(nextTagsInput);
    const normalizedNextTags = mergeAndDedupeTags(candidateTags);
    if (normalizedNextTags.length === 0) return;
    const previousMessage = messages.find((message) => message.id === postId);
    if (!previousMessage || areTagArraysEqual(previousMessage.tags, normalizedNextTags)) {
      setEditingPostId(null);
      setEditingCustomTagInput('');
      return;
    }

    setIsUpdatingTag(true);
    setMessages((prev) => prev.map((message) => (
      message.id === postId
        ? { ...message, tag: normalizedNextTags[0], tags: normalizedNextTags }
        : message
    )));

    try {
      if (typeof client.updateMessage === 'function') {
        console.log('[DebugCommunity] updateMessage payload', {
          id: postId,
          textLength: previousMessage.text.length,
          nextTags: normalizedNextTags,
        });
        await client.updateMessage({
          id: postId,
          // Preserve original body text when updating tags.
          // Stream updateMessage behaves like a full update for message fields.
          text: previousMessage.text,
          tag: normalizedNextTags[0],
          tags: normalizedNextTags,
        } as any);
        console.log('[DebugCommunity] updateMessage success', {
          id: postId,
          textLength: previousMessage.text.length,
        });
      }
      const { added, removed } = computeTagDiff(previousMessage.tags, normalizedNextTags);
      if ((added.length > 0 || removed.length > 0) && hasSupabaseConfig && supabase) {
        updateTagStats(added, removed).catch((tagStatsErr) => {
          console.warn('[CommunityScreen] Failed to update tag stats after edit', tagStatsErr);
        });
      }
      setEditingPostId(null);
      setEditingCustomTagInput('');
    } catch (updateErr) {
      console.error('[CommunityScreen] Failed to update post tag', updateErr);
      setMessages((prev) => prev.map((message) => (
        message.id === postId
          ? { ...message, tag: previousMessage.tag, tags: previousMessage.tags }
          : message
      )));
    } finally {
      setIsUpdatingTag(false);
    }
  }, [client, isUpdatingTag, messages]);

  const renderPostCard = useCallback(({ item }: { item: StreamFeedMessage }) => {
    const likeCount = item.reaction_counts?.like ?? 0;
    const hasLiked = item.own_reactions?.some((reaction) => reaction.type === 'like') ?? false;
    return (
      <View style={styles.postCard}>
        <View style={styles.postHeader}>
          <View style={styles.postHeaderText}>
            <Text style={styles.postAuthor}>{item.user?.name ?? 'Anonymous'}</Text>
            <Text style={styles.postTime}>{formatPostTime(item.created_at)}</Text>
          </View>
          <View style={styles.postTagRow}>
            <View style={styles.postTagsWrap}>
              {item.tags.map((tag) => (
                <View key={`${item.id}-${tag}`} style={styles.postTag}>
                  <Text style={styles.postTagText}>{tag}</Text>
                </View>
              ))}
            </View>
            <Pressable
              onPress={() => {
                setEditingPostId(item.id);
                setEditingCustomTagInput(item.tags.join(', '));
              }}
              style={styles.iconAction}
              hitSlop={8}
            >
              <Pencil size={14} color={Colors.textMuted} />
            </Pressable>
          </View>
        </View>

        <Text style={styles.postBody}>{item.text}</Text>

        <View style={styles.postActions}>
          <Pressable onPress={() => handleLikeToggle(item.id, hasLiked)} style={styles.actionButton} hitSlop={8}>
            <ThumbsUp
              size={14}
              color={hasLiked ? Colors.accent : Colors.textMuted}
              fill={hasLiked ? Colors.accent : 'transparent'}
            />
            <Text style={[styles.actionText, hasLiked && styles.actionTextActive]}>
              {likeCount > 0 ? likeCount : 'Like'}
            </Text>
          </Pressable>
          <Pressable onPress={() => handleOpenThread(item.id)} style={styles.actionButton} hitSlop={8}>
            <MessageCircle size={14} color={Colors.textMuted} />
            <Text style={styles.actionText}>
              {(item.reply_count ?? 0) > 0 ? item.reply_count : 'Comment'}
            </Text>
          </Pressable>
        </View>
      </View>
    );
  }, [handleLikeToggle, handleOpenThread]);

  if (error) {
    return (
      <LinearGradient
        colors={[Colors.gradientStart, Colors.gradientMid, Colors.gradientEnd]}
        style={styles.container}
      >
        <View style={[styles.loadingContainer, { paddingTop: insets.top }]}>
          <Text style={styles.errorTitle}>Couldn&apos;t connect to Community</Text>
          <Text style={styles.errorBody}>
            Please check your connection and try again.
          </Text>
          <Pressable
            onPress={retry}
            style={({ pressed }) => [
              styles.retryButton,
              pressed && styles.retryButtonPressed,
            ]}
          >
            <Text style={styles.retryText}>Try again</Text>
          </Pressable>
        </View>
      </LinearGradient>
    );
  }

  if (!isConnected || isLoadingFeed) {
    return (
      <LinearGradient
        colors={[Colors.gradientStart, Colors.gradientMid, Colors.gradientEnd]}
        style={styles.container}
      >
        <View style={[styles.loadingContainer, { paddingTop: insets.top }]}>
          <ActivityIndicator size="large" color={Colors.accent} />
          <Text style={styles.loadingText}>Loading community...</Text>
        </View>
      </LinearGradient>
    );
  }

  if (feedError) {
    return (
      <LinearGradient
        colors={[Colors.gradientStart, Colors.gradientMid, Colors.gradientEnd]}
        style={styles.container}
      >
        <View style={[styles.loadingContainer, { paddingTop: insets.top }]}>
          <Text style={styles.errorTitle}>Couldn&apos;t load posts</Text>
          <Text style={styles.errorBody}>{feedError}</Text>
          <Pressable onPress={retry} style={styles.retryButton}>
            <Text style={styles.retryText}>Try again</Text>
          </Pressable>
        </View>
      </LinearGradient>
    );
  }

  return (
    <LinearGradient
      colors={[Colors.gradientStart, Colors.gradientMid, Colors.gradientEnd]}
      style={styles.container}
    >
      <View style={[styles.content, { paddingTop: insets.top + 20 }]}>
        <View style={styles.header}>
          <View style={styles.iconContainer}>
            <Users size={24} color={Colors.accent} />
          </View>
          <Text style={styles.title}>Community</Text>
          <Text style={styles.subtitle}>One space for support, questions, and shared wisdom.</Text>
          <TextInput
            style={styles.filterSearchInput}
            placeholder="Type to filter tags..."
            placeholderTextColor={Colors.textMuted}
            value={filterTagSearchInput}
            onChangeText={setFilterTagSearchInput}
          />
          <TagPillSlider
            options={visibleFilterOptions}
            selectedValues={[selectedFilter]}
            onPressOption={setSelectedFilter}
            containerStyle={styles.filterScroll}
          />
        </View>

        {visibleMessages.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyTitle}>No posts yet</Text>
            <Text style={styles.emptySubtitle}>
              Start the conversation and share what&apos;s helping you right now.
            </Text>
          </View>
        ) : (
          <FlatList
            data={visibleMessages}
            keyExtractor={(item) => item.id}
            renderItem={renderPostCard}
            contentContainerStyle={[styles.feedList, { paddingBottom: insets.bottom + 120 }]}
            showsVerticalScrollIndicator={false}
          />
        )}
      </View>

      <Pressable
        onPress={() => setIsComposerOpen(true)}
        style={[styles.composeFab, { bottom: insets.bottom + 24 }]}
        testID="compose-post-button"
      >
        <Plus size={24} color={Colors.background} />
      </Pressable>

      <Modal
        visible={isComposerOpen}
        transparent
        animationType="slide"
        onRequestClose={closeComposer}
      >
        <View style={styles.modalOverlay}>
          <KeyboardAvoidingView
            style={styles.modalSheetWrap}
            behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          >
            <View style={styles.modalSheet}>
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>New Post</Text>
                <Pressable onPress={closeComposer} hitSlop={8}>
                  <X size={20} color={Colors.textSecondary} />
                </Pressable>
              </View>

              <TextInput
                style={styles.modalTextInput}
                placeholder="Share what you're going through..."
                placeholderTextColor={Colors.textMuted}
                multiline
                maxLength={2000}
                value={composerText}
                onChangeText={(nextText) => {
                  setComposerText(nextText);
                  if (isComposerAutoSelected) {
                    setAutoSuggestedTags(null);
                  }
                }}
              />

              <Text style={styles.selectorLabel}>Tag</Text>
              <TagPillSlider
                options={['Auto', ...composerTopTagOptions]}
                selectedValues={isComposerAutoSelected ? ['Auto'] : composerSelectedPresetTags}
                onPressOption={handleComposerPillPress}
              />
              <TextInput
                style={[
                  styles.customTagInput,
                  customTagInput.length > 0 && styles.customTagInputActive,
                ]}
                placeholder="Create a new tag..."
                placeholderTextColor={Colors.textMuted}
                value={customTagInput}
                onChangeText={handleCustomTagChange}
              />
              {!isComposerAutoSelected && (
                <Text style={styles.multiTagHint}>Add one or more tags. For custom tags, separate with commas.</Text>
              )}

              <View style={styles.modalActions}>
                <Pressable onPress={closeComposer} style={styles.modalCancelButton}>
                  <Text style={styles.modalCancelText}>Cancel</Text>
                </Pressable>
                <Pressable
                  onPress={handleSendPost}
                  disabled={
                    !composerText.trim()
                    || (!isComposerAutoSelected && composerResolvedManualTags.length === 0)
                    || isClassifying
                    || isSending
                  }
                  style={styles.modalSubmitButton}
                >
                  {isSending
                    ? <ActivityIndicator size="small" color={Colors.background} />
                    : <Text style={styles.modalSubmitText}>Post</Text>}
                </Pressable>
              </View>
            </View>
          </KeyboardAvoidingView>
        </View>
      </Modal>

      <Modal
        visible={editingPostId !== null}
        transparent
        animationType="fade"
        onRequestClose={() => {
          setEditingPostId(null);
          setEditingCustomTagInput('');
        }}
      >
        <Pressable
          style={styles.editModalOverlay}
          onPress={() => {
            setEditingPostId(null);
            setEditingCustomTagInput('');
          }}
        >
          <View style={styles.editModalCard}>
            <Text style={styles.editModalTitle}>Update Tag</Text>
            <TextInput
              style={styles.editCustomTagInput}
              placeholder="Create or edit tag..."
              placeholderTextColor={Colors.textMuted}
              value={editingCustomTagInput}
              onChangeText={setEditingCustomTagInput}
            />
            <Pressable
              onPress={() => editingPostId && handleUpdateTags(editingPostId, editingCustomTagInput)}
              style={styles.editSaveCustomTagButton}
              disabled={isUpdatingTag || parseTagListInput(editingCustomTagInput).length === 0}
            >
              <Text style={styles.editSaveCustomTagButtonText}>Save tags</Text>
            </Pressable>
            <View style={styles.editTagList}>
              {composerTopTagOptions.map((tag) => (
                <Pressable
                  key={tag}
                  onPress={() => {
                    if (!editingPostId) return;
                    const existing = parseTagListInput(editingCustomTagInput);
                    const toggled = existing.includes(tag)
                      ? existing.filter((value) => value !== tag)
                      : [...existing, tag];
                    setEditingCustomTagInput(toggled.join(', '));
                  }}
                  style={styles.editTagOption}
                  disabled={isUpdatingTag}
                >
                  <Text style={styles.editTagOptionText}>{tag}</Text>
                </Pressable>
              ))}
            </View>
          </View>
        </Pressable>
      </Modal>
    </LinearGradient>
  );
}

function mapStreamMessage(message: any, previous?: StreamFeedMessage): StreamFeedMessage {
  const rawTagsArray = Array.isArray(message.tags)
    ? message.tags
    : Array.isArray(message?.custom?.tags)
      ? message.custom.tags
      : Array.isArray(message?.extraData?.tags)
        ? message.extraData.tags
        : [];
  const rawTag = String(
    message.tag
    ?? message?.custom?.tag
    ?? message?.extraData?.tag
    ?? '',
  ).trim();
  const possibleTag = normalizeCommunityTag(
    rawTag,
  );
  const parsedArrayTags = rawTagsArray
    .map((tag: unknown) => String(tag ?? '').trim())
    .filter((tag: string) => tag.length > 0);
  const parsedTextTags = parseTagListInput(rawTag);
  const mergedTags = mergeAndDedupeTags([
    ...parsedArrayTags,
    ...parsedTextTags,
    possibleTag ?? '',
  ]);

  const mapped: StreamFeedMessage = {
    id: message.id,
    text: typeof message.text === 'string' ? message.text : (previous?.text ?? ''),
    user: message.user ? { id: message.user.id, name: message.user.name } : undefined,
    created_at: message.created_at ?? previous?.created_at ?? '',
    reaction_counts: message.reaction_counts,
    own_reactions: message.own_reactions,
    reply_count: message.reply_count ?? 0,
    tag: mergedTags[0] ?? 'General',
    tags: mergedTags.length > 0 ? mergedTags : ['General'],
  };

  if (!mapped.text) {
    console.warn('[DebugCommunity] mapStreamMessage produced empty text', {
      id: mapped.id,
      incomingHasTextField: typeof message.text === 'string',
      incomingTextValue: typeof message.text === 'string' ? message.text : null,
      previousTextLength: previous?.text.length ?? null,
      mergedTags: mapped.tags,
    });
  }

  return mapped;
}

function parseTagListInput(input: string): string[] {
  return mergeAndDedupeTags(
    input
      .split(',')
      .map((entry) => entry.trim())
      .filter((entry) => entry.length > 0)
      .map((entry) => normalizeCommunityTag(entry) ?? entry),
  );
}

function mergeAndDedupeTags(tags: string[]): string[] {
  const seen = new Set<string>();
  const output: string[] = [];
  for (const rawTag of tags) {
    const tag = rawTag.trim();
    if (!tag) continue;
    const key = tag.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    output.push(tag);
  }
  return output;
}

function areTagArraysEqual(a: string[], b: string[]): boolean {
  if (a.length !== b.length) return false;
  const normalizedA = a.map((tag) => tag.toLowerCase());
  const normalizedB = b.map((tag) => tag.toLowerCase());
  return normalizedA.every((tag, index) => tag === normalizedB[index]);
}

function computeTagDiff(previousTags: string[], nextTags: string[]): { added: string[]; removed: string[] } {
  const previousMap = new Map<string, string>();
  const nextMap = new Map<string, string>();

  for (const tag of previousTags) previousMap.set(tag.toLowerCase(), tag);
  for (const tag of nextTags) nextMap.set(tag.toLowerCase(), tag);

  const added: string[] = [];
  const removed: string[] = [];

  for (const [key, value] of nextMap.entries()) {
    if (!previousMap.has(key)) added.push(value);
  }
  for (const [key, value] of previousMap.entries()) {
    if (!nextMap.has(key)) removed.push(value);
  }

  return { added, removed };
}

async function updateTagStats(addedTags: string[], removedTags: string[]): Promise<void> {
  const url = `${getSupabaseUrl()}/functions/v1/update-tag-stats`;
  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      addedTags,
      removedTags,
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`update-tag-stats failed (${response.status}): ${errorText}`);
  }
}

function upsertAndSortMessages(messages: StreamFeedMessage[], next: StreamFeedMessage): StreamFeedMessage[] {
  const existing = messages.find((message) => message.id === next.id);
  const merged = existing
    ? {
        ...existing,
        ...next,
        text: next.text || existing.text,
        created_at: next.created_at || existing.created_at,
        reaction_counts: next.reaction_counts ?? existing.reaction_counts,
        own_reactions: next.own_reactions ?? existing.own_reactions,
        reply_count: next.reply_count ?? existing.reply_count,
        tags: next.tags.length > 0 ? next.tags : existing.tags,
        tag: next.tag || existing.tag,
      }
    : next;
  if (!merged.text) {
    console.warn('[DebugCommunity] upsertAndSortMessages merged empty text', {
      id: merged.id,
      incomingTextLength: next.text.length,
      existingTextLength: existing?.text.length ?? null,
      mergedTextLength: merged.text.length,
      mergedTags: merged.tags,
    });
  }
  const filtered = messages.filter((message) => message.id !== next.id);
  return [...filtered, merged].sort(sortByNewest);
}

function sortByNewest(a: StreamFeedMessage, b: StreamFeedMessage): number {
  return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
}

function formatPostTime(createdAt: string): string {
  const date = new Date(createdAt);
  if (Number.isNaN(date.getTime())) return '';
  return date.toLocaleString([], {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function getSupabaseUrl(): string {
  return (process.env.EXPO_PUBLIC_SUPABASE_URL ?? '').replace(/\/+$/, '');
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
  errorTitle: {
    fontSize: 18,
    fontWeight: '600' as const,
    color: Colors.text,
    textAlign: 'center',
  },
  errorBody: {
    fontSize: 14,
    color: Colors.textSecondary,
    textAlign: 'center',
    paddingHorizontal: 32,
  },
  retryButton: {
    marginTop: 8,
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 20,
    backgroundColor: Colors.accent,
  },
  retryButtonPressed: {
    opacity: 0.85,
  },
  retryText: {
    fontSize: 14,
    fontWeight: '500' as const,
    color: Colors.background,
  },
  loadingText: {
    fontSize: 15,
    color: Colors.textSecondary,
  },
  content: {
    paddingHorizontal: 20,
    flex: 1,
  },
  header: {
    alignItems: 'center',
    marginBottom: 10,
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
  filterRow: {
    gap: 8,
    paddingVertical: 4,
    alignItems: 'center',
  },
  filterScroll: {
    marginTop: 8,
    alignSelf: 'stretch',
  },
  filterSearchInput: {
    marginTop: 12,
    width: '100%',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: Colors.border,
    backgroundColor: Colors.surface,
    color: Colors.text,
    paddingHorizontal: 12,
    paddingVertical: 8,
    fontSize: 14,
  },
  feedList: {
    paddingTop: 6,
  },
  postCard: {
    backgroundColor: Colors.cardBackground,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: Colors.border,
    padding: 14,
    marginBottom: 12,
  },
  postHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 10,
  },
  postHeaderText: {
    flex: 1,
  },
  postAuthor: {
    color: Colors.text,
    fontSize: 14,
    fontWeight: '600' as const,
  },
  postTime: {
    marginTop: 2,
    color: Colors.textMuted,
    fontSize: 12,
  },
  postTagRow: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 8,
    flexShrink: 1,
    justifyContent: 'flex-end',
  },
  postTagsWrap: {
    flexDirection: 'row',
    gap: 6,
    flexWrap: 'wrap',
    justifyContent: 'flex-end',
    flexShrink: 1,
  },
  postTag: {
    backgroundColor: Colors.accentDim,
    borderRadius: 14,
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  postTagText: {
    fontSize: 12,
    color: Colors.accentLight,
    fontWeight: '600' as const,
  },
  iconAction: {
    padding: 3,
  },
  postBody: {
    color: Colors.text,
    fontSize: 15,
    lineHeight: 22,
    marginTop: 10,
  },
  postActions: {
    flexDirection: 'row',
    gap: 18,
    marginTop: 10,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  actionText: {
    fontSize: 12,
    color: Colors.textMuted,
  },
  actionTextActive: {
    color: Colors.accent,
  },
  emptyContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 22,
  },
  emptyTitle: {
    fontSize: 18,
    color: Colors.text,
    fontWeight: '600' as const,
    marginBottom: 6,
  },
  emptySubtitle: {
    fontSize: 14,
    color: Colors.textSecondary,
    textAlign: 'center',
    lineHeight: 20,
  },
  composeFab: {
    position: 'absolute',
    right: 20,
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.accent,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 5,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: Colors.overlay,
    justifyContent: 'flex-end',
  },
  modalSheetWrap: {
    width: '100%',
  },
  modalSheet: {
    backgroundColor: Colors.cardBackground,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 16,
    borderTopWidth: 1,
    borderColor: Colors.border,
    gap: 10,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  modalTitle: {
    color: Colors.text,
    fontSize: 18,
    fontWeight: '600' as const,
  },
  modalTextInput: {
    minHeight: 120,
    maxHeight: 180,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Colors.border,
    padding: 12,
    color: Colors.text,
    backgroundColor: Colors.surface,
    textAlignVertical: 'top',
    fontSize: 15,
    lineHeight: 22,
  },
  selectorLabel: {
    color: Colors.textSecondary,
    fontSize: 13,
    fontWeight: '600' as const,
  },
  customTagInput: {
    borderRadius: 10,
    borderWidth: 1,
    borderColor: Colors.border,
    backgroundColor: Colors.surface,
    color: Colors.text,
    paddingHorizontal: 10,
    paddingVertical: 8,
    fontSize: 14,
  },
  customTagInputActive: {
    borderColor: 'rgba(201, 169, 110, 0.3)',
    backgroundColor: Colors.accentDim,
  },
  multiTagHint: {
    color: Colors.textMuted,
    fontSize: 12,
    marginTop: -2,
  },
  autoInfoWrap: {
    borderRadius: 10,
    borderWidth: 1,
    borderColor: Colors.border,
    backgroundColor: Colors.surface,
    padding: 10,
    gap: 3,
  },
  autoInfoLabel: {
    color: Colors.textMuted,
    fontSize: 12,
  },
  autoInfoValue: {
    color: Colors.text,
    fontSize: 14,
    fontWeight: '600' as const,
  },
  autoTagError: {
    color: Colors.error,
    fontSize: 12,
  },
  modalActions: {
    marginTop: 4,
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 8,
  },
  modalCancelButton: {
    borderRadius: 10,
    borderWidth: 1,
    borderColor: Colors.borderLight,
    paddingHorizontal: 14,
    paddingVertical: 9,
  },
  modalCancelText: {
    color: Colors.textSecondary,
    fontSize: 14,
    fontWeight: '500' as const,
  },
  autoClassifyButton: {
    borderRadius: 10,
    backgroundColor: Colors.surfaceLight,
    paddingHorizontal: 14,
    paddingVertical: 9,
    minWidth: 86,
    alignItems: 'center',
  },
  autoClassifyText: {
    color: Colors.text,
    fontSize: 14,
    fontWeight: '600' as const,
  },
  modalSubmitButton: {
    borderRadius: 10,
    backgroundColor: Colors.accent,
    paddingHorizontal: 16,
    paddingVertical: 9,
    minWidth: 70,
    alignItems: 'center',
  },
  modalSubmitText: {
    color: Colors.background,
    fontSize: 14,
    fontWeight: '700' as const,
  },
  editModalOverlay: {
    flex: 1,
    backgroundColor: Colors.overlay,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  editModalCard: {
    width: '100%',
    borderRadius: 14,
    backgroundColor: Colors.cardBackground,
    borderWidth: 1,
    borderColor: Colors.border,
    padding: 14,
  },
  editModalTitle: {
    color: Colors.text,
    fontSize: 16,
    fontWeight: '600' as const,
    marginBottom: 10,
  },
  editTagList: {
    gap: 8,
  },
  editTagOption: {
    borderRadius: 10,
    borderWidth: 1,
    borderColor: Colors.borderLight,
    backgroundColor: Colors.surface,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  editTagOptionText: {
    color: Colors.text,
    fontSize: 14,
  },
  editCustomTagInput: {
    borderRadius: 10,
    borderWidth: 1,
    borderColor: Colors.border,
    backgroundColor: Colors.surface,
    color: Colors.text,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
    marginBottom: 10,
  },
  editSaveCustomTagButton: {
    alignSelf: 'flex-start',
    borderRadius: 10,
    backgroundColor: Colors.accentDim,
    borderWidth: 1,
    borderColor: 'rgba(201, 169, 110, 0.3)',
    paddingHorizontal: 12,
    paddingVertical: 8,
    marginBottom: 10,
  },
  editSaveCustomTagButtonText: {
    color: Colors.accent,
    fontSize: 13,
    fontWeight: '600' as const,
  },
});
