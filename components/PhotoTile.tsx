import React, { useCallback, useRef } from 'react';
import { View, Text, StyleSheet, Pressable, Animated } from 'react-native';
import { ImageSource } from 'expo-image';
import { Photo } from '@/components/Photo';
import { motion, palette, radius, spacing } from '@/constants/theme';

type PhotoTileProps = {
  source: ImageSource;
  title: string;
  subtitle?: string;
  width?: number;
  height?: number;
  onPress?: () => void;
  testID?: string;
};

export function PhotoTile({
  source,
  title,
  subtitle,
  width = 150,
  height = 192,
  onPress,
  testID,
}: PhotoTileProps) {
  const scaleAnim = useRef(new Animated.Value(1)).current;

  const handlePressIn = useCallback(() => {
    Animated.spring(scaleAnim, { toValue: motion.pressScale, useNativeDriver: true }).start();
  }, [scaleAnim]);

  const handlePressOut = useCallback(() => {
    Animated.spring(scaleAnim, { toValue: 1, friction: 3, useNativeDriver: true }).start();
  }, [scaleAnim]);

  return (
    <Animated.View style={[{ transform: [{ scale: scaleAnim }] }, { width, marginRight: spacing.md }]}>
      <Pressable
        onPress={onPress}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        testID={testID}
        disabled={!onPress}
      >
        <View style={[styles.tile, { width, height }]}>
          <Photo source={source} variant="card" />
          <View style={styles.labelBlock}>
            <Text style={styles.title} numberOfLines={2}>{title}</Text>
            {subtitle ? <Text style={styles.subtitle} numberOfLines={1}>{subtitle}</Text> : null}
          </View>
        </View>
      </Pressable>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  tile: {
    borderRadius: radius.card,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: palette.border,
  },
  labelBlock: {
    position: 'absolute',
    left: spacing.md,
    right: spacing.md,
    bottom: spacing.md,
  },
  title: {
    fontSize: 14,
    fontWeight: '600',
    color: palette.white,
    lineHeight: 18,
  },
  subtitle: {
    fontSize: 12,
    color: palette.textSecondary,
    marginTop: 2,
  },
});
