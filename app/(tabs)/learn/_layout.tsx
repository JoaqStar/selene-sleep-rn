import React from 'react';
import { Stack } from 'expo-router';
import Colors from '@/constants/colors';

export default function LearnLayout() {
  return (
    <Stack
      screenOptions={{
        headerStyle: { backgroundColor: Colors.background },
        headerTintColor: Colors.text,
        headerTitleStyle: { fontWeight: '600' as const },
        headerShadowVisible: false,
      }}
    >
      <Stack.Screen name="index" options={{ headerShown: false }} />
      <Stack.Screen
        name="[articleId]"
        options={{
          title: 'Article',
          headerBackTitle: 'Learn',
        }}
      />
    </Stack>
  );
}
