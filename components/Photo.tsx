import React from 'react';
import { View, StyleSheet, StyleProp, ViewStyle } from 'react-native';
import { Image, ImageSource } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { imageTreatment as T } from '@/constants/theme';

type PhotoVariant = 'hero' | 'card';

type PhotoProps = {
  source: ImageSource;
  variant?: PhotoVariant;
  style?: StyleProp<ViewStyle>;
  children?: React.ReactNode;
};

export function Photo({ source, variant = 'card', style, children }: PhotoProps) {
  const scrim = variant === 'hero' ? T.scrim.hero : T.scrim.card;

  return (
    <View style={[StyleSheet.absoluteFill, style]}>
      <Image
        source={source}
        style={[StyleSheet.absoluteFill, { opacity: T.imageOpacity }]}
        contentFit="cover"
        transition={200}
      />
      <View style={[StyleSheet.absoluteFill, { backgroundColor: T.navyWash }]} />
      <LinearGradient
        colors={[...scrim.colors]}
        locations={[...scrim.locations]}
        style={StyleSheet.absoluteFill}
      />
      {children}
    </View>
  );
}
