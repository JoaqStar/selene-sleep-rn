import React from 'react';
import { View, Text, StyleSheet, Pressable, StyleProp, ViewStyle } from 'react-native';
import { ImageSource } from 'expo-image';
import { Moon } from 'lucide-react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Photo } from '@/components/Photo';
import { palette, spacing, type } from '@/constants/theme';

type PhotoHeroProps = {
  source: ImageSource;
  height?: number;
  eyebrow?: string;
  title: string;
  subtitle?: string;
  rightAction?: React.ReactNode;
  showMoon?: boolean;
  style?: StyleProp<ViewStyle>;
};

export function PhotoHero({
  source,
  height = 250,
  eyebrow,
  title,
  subtitle,
  rightAction,
  showMoon = true,
  style,
}: PhotoHeroProps) {
  const insets = useSafeAreaInsets();

  return (
    <View style={[styles.container, { height }, style]}>
      <Photo source={source} variant="hero" />
      <View style={[styles.topRow, { paddingTop: insets.top + spacing.sm }]}>
        {showMoon ? <Moon size={22} color={palette.accent} /> : <View />}
        {rightAction ?? <View style={styles.spacer} />}
      </View>
      <View style={styles.bottomOverlay}>
        {eyebrow ? <Text style={type.eyebrow}>{eyebrow}</Text> : null}
        <Text style={title.includes('\n') ? type.hero : type.display}>{title}</Text>
        {subtitle ? <Text style={styles.subtitle}>{subtitle}</Text> : null}
      </View>
    </View>
  );
}

type PhotoHeroIconButtonProps = {
  onPress: () => void;
  children: React.ReactNode;
  testID?: string;
};

export function PhotoHeroIconButton({ onPress, children, testID }: PhotoHeroIconButtonProps) {
  return (
    <Pressable onPress={onPress} hitSlop={12} testID={testID} style={styles.iconButton}>
      {children}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  container: {
    width: '100%',
    overflow: 'hidden',
  },
  topRow: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: spacing.screenGutter,
  },
  spacer: {
    width: 24,
  },
  iconButton: {
    padding: 4,
  },
  bottomOverlay: {
    position: 'absolute',
    left: spacing.screenGutter,
    right: spacing.screenGutter,
    bottom: spacing['2xl'],
  },
  subtitle: {
    fontSize: 14,
    color: palette.textSecondary,
    marginTop: spacing.sm,
    lineHeight: 20,
  },
});
