import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { palette, radius } from '@/constants/theme';

type AvatarProps = {
  name: string;
  size?: number;
};

export function getInitials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return '?';
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase();
}

export function Avatar({ name, size = 40 }: AvatarProps) {
  return (
    <View style={[styles.avatar, { width: size, height: size, borderRadius: size / 2 }]}>
      <Text style={[styles.initials, { fontSize: size * 0.35 }]}>{getInitials(name)}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  avatar: {
    backgroundColor: palette.accentDim,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: palette.accentBorder,
  },
  initials: {
    color: palette.accent,
    fontWeight: '600',
  },
});
