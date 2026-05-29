import React from 'react';
import { ScrollView, Pressable, Text, StyleSheet, ViewStyle, StyleProp } from 'react-native';
import Colors from '@/constants/colors';

type TagPillSliderProps = {
  options: string[];
  selectedValues: string[];
  onPressOption: (option: string) => void;
  multiSelect?: boolean;
  testIDPrefix?: string;
  containerStyle?: StyleProp<ViewStyle>;
};

export default function TagPillSlider({
  options,
  selectedValues,
  onPressOption,
  testIDPrefix,
  containerStyle,
}: TagPillSliderProps) {
  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      style={[styles.scroll, containerStyle]}
      contentContainerStyle={styles.row}
    >
      {options.map((option) => {
        const isActive = selectedValues.includes(option);
        return (
          <Pressable
            key={option}
            onPress={() => onPressOption(option)}
            style={[styles.pill, isActive && styles.pillActive]}
            testID={testIDPrefix ? `${testIDPrefix}-${option}` : undefined}
          >
            <Text style={[styles.pillText, isActive && styles.pillTextActive]}>
              {option}
            </Text>
          </Pressable>
        );
      })}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  scroll: {
    marginBottom: 14,
  },
  row: {
    gap: 8,
    paddingVertical: 4,
    alignItems: 'center',
  },
  pill: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: Colors.border,
    backgroundColor: Colors.surface,
  },
  pillActive: {
    backgroundColor: Colors.accentDim,
    borderColor: 'rgba(201, 169, 110, 0.3)',
  },
  pillText: {
    fontSize: 13,
    color: Colors.textSecondary,
    fontWeight: '500' as const,
  },
  pillTextActive: {
    color: Colors.accent,
  },
});
