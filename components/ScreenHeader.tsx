import React from 'react';
import { View, Text, StyleSheet, Pressable, ViewStyle } from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ChevronLeft } from 'lucide-react-native';
import Colors from '@/constants/colors';

type ScreenHeaderProps = {
  title: string;
  backLabel?: string;
  onBackPress?: () => void;
  containerStyle?: ViewStyle;
};

export function ScreenHeader({ title, backLabel = 'Back', onBackPress, containerStyle }: ScreenHeaderProps) {
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
    <View style={[styles.container, containerStyle, { paddingTop: insets.top }]}>
      <Pressable
        onPress={handleBack}
        style={styles.backButton}
        hitSlop={10}
      >
        <ChevronLeft size={22} color={Colors.text} />
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
    // Match primary content padding (e.g. 3am categories, article body)
    paddingHorizontal: 0,
    marginBottom: 20,
  },
  backButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 6,
    paddingRight: 12,
  },
  backLabel: {
    fontSize: 16,
    color: Colors.text,
    marginLeft: 6,
  },
  title: {
    fontSize: 19,
    fontWeight: '600' as const,
    color: Colors.text,
  },
  rightSpacer: {
    width: 60,
  },
});

