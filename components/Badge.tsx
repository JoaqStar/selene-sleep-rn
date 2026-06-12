import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { palette, radius } from '@/constants/theme';

type BadgeProps = {
  label: string;
  icon?: React.ComponentType<{ size?: number; color?: string }>;
  variant?: 'category' | 'tag';
};

export function Badge({ label, icon: Icon, variant = 'category' }: BadgeProps) {
  return (
    <View style={[styles.badge, variant === 'tag' && styles.tagBadge]}>
      {Icon ? <Icon size={11} color={palette.accent} /> : null}
      <Text style={styles.label}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: palette.accentDim,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: radius.pill,
    gap: 5,
    alignSelf: 'flex-start',
  },
  tagBadge: {
    backgroundColor: palette.accentDim12,
    borderWidth: 1,
    borderColor: palette.accentBorder,
  },
  label: {
    fontSize: 11,
    color: palette.accent,
    fontWeight: '600',
  },
});
