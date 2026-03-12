import React, { useEffect, useRef, useCallback } from 'react';
import {
  View, Text, StyleSheet, Pressable, Animated, ActivityIndicator, Platform,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { X, Play, Pause, RotateCcw, RotateCw, Moon } from 'lucide-react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Audio } from 'expo-av';
import * as Haptics from 'expo-haptics';
import Colors from '@/constants/colors';
import { usePlayerStore } from '@/stores/playerStore';

function formatTime(millis: number): string {
  const totalSeconds = Math.floor(millis / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes}:${seconds.toString().padStart(2, '0')}`;
}

export default function PlayerScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const {
    currentSession, isPlaying, positionMillis, durationMillis, isBuffering,
    setIsPlaying, setPosition, setDuration, setIsBuffering, clearSession,
  } = usePlayerStore();

  const soundRef = useRef<Audio.Sound | null>(null);
  const loadIdRef = useRef(0);
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const progressAnim = useRef(new Animated.Value(0)).current;
  const playButtonScale = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    if (isPlaying) {
      Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, { toValue: 1.05, duration: 2000, useNativeDriver: true }),
          Animated.timing(pulseAnim, { toValue: 1, duration: 2000, useNativeDriver: true }),
        ])
      ).start();
    } else {
      pulseAnim.setValue(1);
    }
  }, [isPlaying, pulseAnim]);

  useEffect(() => {
    if (durationMillis > 0) {
      Animated.timing(progressAnim, {
        toValue: positionMillis / durationMillis,
        duration: 500,
        useNativeDriver: false,
      }).start();
    }
  }, [positionMillis, durationMillis, progressAnim]);

  useEffect(() => {
    let mounted = true;
    const loadId = ++loadIdRef.current;

    async function loadAudio() {
      if (!currentSession) return;
      try {
        console.log('[DebugPlayerAudio] Loading audio for:', currentSession.title, 'loadId =', loadId);
        await Audio.setAudioModeAsync({
          playsInSilentModeIOS: true,
          staysActiveInBackground: false,
        });

        // Stop and unload any existing sound before loading a new one.
        if (soundRef.current) {
          try {
            console.log('[DebugPlayerAudio] Stopping existing sound before loading new one');
            await soundRef.current.stopAsync();
          } catch (e) {
            console.warn('[DebugPlayerAudio] Error stopping existing sound before load', e);
          }
          try {
            await soundRef.current.unloadAsync();
          } catch (e) {
            console.warn('[DebugPlayerAudio] Error unloading existing sound before load', e);
          }
          soundRef.current = null;
        }

        const { sound: newSound } = await Audio.Sound.createAsync(
          { uri: currentSession.audio_url },
          { shouldPlay: true, progressUpdateIntervalMillis: 500 },
          (status) => {
            // Ignore callbacks for stale loads or unmounted component
            if (!mounted || loadId !== loadIdRef.current) {
              return;
            }
            if (status.isLoaded) {
              setPosition(status.positionMillis);
              if (status.durationMillis) {
                setDuration(status.durationMillis);
              }
              setIsPlaying(status.isPlaying);
              setIsBuffering(status.isBuffering);
              if (status.didJustFinish) {
                console.log('[DebugPlayerAudio] Playback finished for', currentSession.title);
                setIsPlaying(false);
                setPosition(0);
              }
            } else {
              console.log('[DebugPlayerAudio] Status not loaded yet', status);
            }
          }
        );

        if (!mounted || loadId !== loadIdRef.current) {
          console.log('[DebugPlayerAudio] Load completed but is stale, unloading sound', { loadId, currentLoadId: loadIdRef.current });
          try {
            await newSound.stopAsync();
          } catch (e) {
            console.warn('[DebugPlayerAudio] Error stopping stale sound after load', e);
          }
          try {
            await newSound.unloadAsync();
          } catch (e) {
            console.warn('[DebugPlayerAudio] Error unloading stale sound after load', e);
          }
          return;
        }

        if (mounted) {
          soundRef.current = newSound;
          setIsPlaying(true);
          console.log('[DebugPlayerAudio] Audio loaded and playing, loadId =', loadId);
        }
      } catch (error) {
        console.error('[DebugPlayerAudio] Error loading audio:', error);
        if (mounted) {
          setIsBuffering(false);
        }
      }
    }

    if (currentSession) {
      setIsBuffering(true);
      loadAudio();
    }

    return () => {
      mounted = false;
    };
  }, [currentSession?.id, setIsPlaying, setIsBuffering, setPosition, setDuration]);

  useEffect(() => {
    return () => {
      if (soundRef.current) {
        const sound = soundRef.current;
        soundRef.current = null;
        // Invalidate any pending loads so callbacks ignore stale events.
        loadIdRef.current += 1;
        console.log('[DebugPlayerAudio] Unmounting player, stopping and unloading sound');
        sound.stopAsync().catch((e) => {
          console.warn('[DebugPlayerAudio] Error stopping sound on unmount', e);
        });
        sound.unloadAsync().catch((e) => {
          console.warn('[DebugPlayerAudio] Error unloading sound on unmount', e);
        });
      }
    };
  }, []);

  const handlePlayPause = useCallback(async () => {
    const sound = soundRef.current;
    if (!sound) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    Animated.sequence([
      Animated.spring(playButtonScale, { toValue: 0.9, useNativeDriver: true }),
      Animated.spring(playButtonScale, { toValue: 1, useNativeDriver: true }),
    ]).start();

    if (isPlaying) {
      console.log('[DebugPlayerAudio] Pausing playback');
      await sound.pauseAsync();
    } else {
      console.log('[DebugPlayerAudio] Resuming/starting playback');
      await sound.playAsync();
    }
  }, [isPlaying, playButtonScale]);

  const handleSeek = useCallback(async (offsetMs: number) => {
    const sound = soundRef.current;
    if (!sound) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    const newPosition = Math.max(0, Math.min(positionMillis + offsetMs, durationMillis));
    await sound.setPositionAsync(newPosition);
  }, [positionMillis, durationMillis]);

  const handleClose = useCallback(async () => {
    console.log('[DebugPlayerAudio] handleClose called');
    // Invalidate any in-flight load so that when it completes, it immediately unloads.
    loadIdRef.current += 1;
    if (soundRef.current) {
      try {
        console.log('[DebugPlayerAudio] Stopping sound on close');
        await soundRef.current.stopAsync();
      } catch (e) {
        console.warn('[DebugPlayerAudio] Error stopping sound on close', e);
      }
      try {
        console.log('[DebugPlayerAudio] Unloading sound on close');
        await soundRef.current.unloadAsync();
      } catch (e) {
        console.warn('[DebugPlayerAudio] Error unloading sound on close', e);
      }
      soundRef.current = null;
    }
    console.log('[DebugPlayerAudio] Clearing session and navigating back');
    clearSession();
    router.back();
  }, [clearSession, router]);

  if (!currentSession) {
    return (
      <View style={[styles.container, { backgroundColor: Colors.background }]}>
        <Text style={styles.errorText}>No session selected</Text>
      </View>
    );
  }

  const progressWidth = progressAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['0%', '100%'],
  });

  return (
    <LinearGradient
      colors={[Colors.playerGradientStart, '#12102A', Colors.playerGradientEnd]}
      style={styles.container}
    >
      <View style={[styles.inner, { paddingTop: insets.top, paddingBottom: insets.bottom + 20 }]}>
        <View style={styles.topBar}>
          <Pressable onPress={handleClose} style={styles.closeButton} testID="player-close">
            <X size={22} color={Colors.textSecondary} />
          </Pressable>
          <Text style={styles.topBarTitle}>Now Playing</Text>
          <View style={styles.closeButton} />
        </View>

        <View style={styles.centerSection}>
          <Animated.View style={[styles.visualizer, { transform: [{ scale: pulseAnim }] }]}>
            <View style={styles.outerRing}>
              <View style={styles.middleRing}>
                <View style={styles.innerCircle}>
                  <Moon size={36} color={Colors.accent} />
                </View>
              </View>
            </View>
          </Animated.View>

          <Text style={styles.sessionTitle}>{currentSession.title}</Text>
          {((currentSession as any).teacher_name || currentSession.instructor) ? (
            <Text style={styles.sessionInstructor}>
              By {(currentSession as any).teacher_name || currentSession.instructor}
            </Text>
          ) : null}
        </View>

        <View style={styles.controlsSection}>
          <View style={styles.progressContainer}>
            <View style={styles.progressTrack}>
              <Animated.View style={[styles.progressFill, { width: progressWidth }]} />
            </View>
            <View style={styles.timeRow}>
              <Text style={styles.timeText}>{formatTime(positionMillis)}</Text>
              <Text style={styles.timeText}>{formatTime(durationMillis)}</Text>
            </View>
          </View>

          <View style={styles.controls}>
            <Pressable onPress={() => handleSeek(-15000)} style={styles.seekButton} testID="seek-back">
              <RotateCcw size={24} color={Colors.textSecondary} />
              <Text style={styles.seekLabel}>15</Text>
            </Pressable>

            <Pressable onPress={handlePlayPause} testID="play-pause">
              <Animated.View style={[styles.playButton, { transform: [{ scale: playButtonScale }] }]}>
                {isBuffering ? (
                  <ActivityIndicator size="large" color={Colors.background} />
                ) : isPlaying ? (
                  <Pause size={30} color={Colors.background} fill={Colors.background} />
                ) : (
                  <Play size={30} color={Colors.background} fill={Colors.background} style={{ marginLeft: 3 }} />
                )}
              </Animated.View>
            </Pressable>

            <Pressable onPress={() => handleSeek(15000)} style={styles.seekButton} testID="seek-forward">
              <RotateCw size={24} color={Colors.textSecondary} />
              <Text style={styles.seekLabel}>15</Text>
            </Pressable>
          </View>
        </View>
      </View>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  inner: {
    flex: 1,
    paddingHorizontal: 24,
  },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 20,
  },
  closeButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.06)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  topBarTitle: {
    fontSize: 13,
    color: Colors.textMuted,
    fontWeight: '500' as const,
    textTransform: 'uppercase' as const,
    letterSpacing: 1.5,
  },
  centerSection: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  visualizer: {
    marginBottom: 40,
  },
  outerRing: {
    width: 200,
    height: 200,
    borderRadius: 100,
    backgroundColor: 'rgba(201, 169, 110, 0.04)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  middleRing: {
    width: 150,
    height: 150,
    borderRadius: 75,
    backgroundColor: 'rgba(201, 169, 110, 0.07)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  innerCircle: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: 'rgba(201, 169, 110, 0.12)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  sessionTitle: {
    fontSize: 24,
    fontWeight: '400' as const,
    color: Colors.text,
    textAlign: 'center',
    letterSpacing: 0.3,
    marginBottom: 6,
    paddingHorizontal: 20,
  },
  sessionInstructor: {
    fontSize: 14,
    color: Colors.textSecondary,
    fontWeight: '400' as const,
    marginBottom: 18,
    letterSpacing: 0.4,
  },
  sessionDescription: {
    fontSize: 14,
    color: Colors.textSecondary,
    textAlign: 'center',
    lineHeight: 20,
    paddingHorizontal: 30,
  },
  controlsSection: {
    paddingBottom: 20,
  },
  progressContainer: {
    marginBottom: 28,
  },
  progressTrack: {
    height: 4,
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    borderRadius: 2,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: Colors.accent,
    borderRadius: 2,
  },
  timeRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 8,
  },
  timeText: {
    fontSize: 12,
    color: Colors.textMuted,
  },
  controls: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 36,
  },
  seekButton: {
    alignItems: 'center',
    justifyContent: 'center',
    width: 50,
    height: 50,
  },
  seekLabel: {
    fontSize: 10,
    color: Colors.textMuted,
    marginTop: 2,
  },
  playButton: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: Colors.accent,
    alignItems: 'center',
    justifyContent: 'center',
  },
  errorText: {
    color: Colors.textSecondary,
    fontSize: 16,
    textAlign: 'center',
    marginTop: 100,
  },
});
