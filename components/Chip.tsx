import React from 'react';
import { ScrollView, Text, StyleSheet, Pressable, ViewStyle } from 'react-native';
import { palette, radius, spacing } from '@/constants/theme';

type ChipProps = {
  label: string;
  active?: boolean;
  onPress: () => void;
  testID?: string;
};

export function Chip({ label, active = false, onPress, testID }: ChipProps) {
  return (
    <Pressable
      onPress={onPress}
      testID={testID}
      style={[styles.chip, active && styles.chipActive]}
    >
      <Text style={[styles.label, active && styles.labelActive]}>{label}</Text>
    </Pressable>
  );
}

type ChipRowProps = {
  options: string[];
  selected: string;
  onSelect: (value: string) => void;
  containerStyle?: ViewStyle;
  testIDPrefix?: string;
};

export function ChipRow({ options, selected, onSelect, containerStyle, testIDPrefix }: ChipRowProps) {
  return (
    <ScrollView
      horizontal
      nestedScrollEnabled
      showsHorizontalScrollIndicator={false}
      style={styles.scroll}
      contentContainerStyle={[styles.row, containerStyle]}
    >
      {options.map((option) => (
        <Chip
          key={option}
          label={option}
          active={selected === option}
          onPress={() => onSelect(option)}
          testID={testIDPrefix ? `${testIDPrefix}-${option}` : undefined}
        />
      ))}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  scroll: {
    marginHorizontal: -spacing.screenGutter,
  },
  row: {
    gap: spacing.sm,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.screenGutter,
  },
  chip: {
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    borderRadius: radius.pill,
    backgroundColor: palette.surface,
    borderWidth: 1,
    borderColor: palette.border,
  },
  chipActive: {
    backgroundColor: palette.accentDim,
    borderColor: palette.accentBorder,
  },
  label: {
    fontSize: 13,
    color: palette.textSecondary,
    fontWeight: '500',
  },
  labelActive: {
    color: palette.accent,
    fontWeight: '600',
  },
});
