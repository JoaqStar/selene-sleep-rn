import React from 'react';
import { View, Text, StyleSheet, Pressable } from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ChevronLeft } from 'lucide-react-native';
import Colors from '@/constants/colors';

type ScreenHeaderProps = {
  title: string;
  backLabel?: string;
  onBackPress?: () => void;
};

export function ScreenHeader({ title, backLabel = 'Back', onBackPress }: ScreenHeaderProps) {
  const router = useRouter();
  const insets = useSafeAreaInsets();

  const handleBack = () => {
    if (onBackPress) {
      onBackPress();
    } else {
      router.back();
    }
  };

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <Pressable
        onPress={handleBack}
        style={styles.backButton}
        hitSlop={10}
      >
        <ChevronLeft size={18} color={Colors.text} />
        <Text style={styles.backLabel}>{backLabel}</Text>
      </Pressable>
      <Text style={styles.title}>{title}</Text>
      <View style={styles.rightSpacer} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    marginBottom: 20,
  },
  backButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 6,
    paddingRight: 12,
  },
  backLabel: {
    fontSize: 14,
    color: Colors.textSecondary,
    marginLeft: 4,
  },
  title: {
    fontSize: 17,
    fontWeight: '600' as const,
    color: Colors.text,
  },
  rightSpacer: {
    width: 60,
  },
});

