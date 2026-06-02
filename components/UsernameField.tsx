import React from 'react';
import { View, Text, StyleSheet, TextInput, ActivityIndicator } from 'react-native';
import Colors from '@/constants/colors';
import type { UsernameAvailabilityStatus } from '@/lib/hooks/useUsernameAvailability';

type Props = {
  value: string;
  onChangeText: (text: string) => void;
  status: UsernameAvailabilityStatus;
  message: string | null;
  testID?: string;
  autoFocus?: boolean;
};

export function UsernameField({
  value,
  onChangeText,
  status,
  message,
  testID = 'username-input',
  autoFocus,
}: Props) {
  const borderColor =
    status === 'available'
      ? Colors.accent
      : status === 'taken' || status === 'invalid'
        ? '#E57373'
        : Colors.borderLight;

  return (
    <View style={styles.wrap}>
      <Text style={styles.label}>Choose your username</Text>
      <Text style={styles.helper}>3–20 characters: letters, numbers, underscore</Text>
      <View style={styles.inputRow}>
        <TextInput
          style={[styles.input, { borderColor }]}
          placeholder="your_username"
          placeholderTextColor={Colors.textMuted}
          value={value}
          onChangeText={onChangeText}
          autoCapitalize="none"
          autoCorrect={false}
          autoComplete="username"
          returnKeyType="done"
          testID={testID}
          autoFocus={autoFocus}
        />
        {status === 'checking' && (
          <ActivityIndicator size="small" color={Colors.accent} style={styles.spinner} />
        )}
      </View>
      {message ? (
        <Text
          style={[
            styles.feedback,
            status === 'available' && styles.feedbackOk,
            (status === 'taken' || status === 'invalid') && styles.feedbackError,
          ]}
        >
          {message}
        </Text>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    gap: 8,
  },
  label: {
    fontSize: 16,
    fontWeight: '500',
    color: Colors.text,
    textAlign: 'center',
  },
  helper: {
    fontSize: 14,
    color: Colors.textSecondary,
    textAlign: 'center',
  },
  inputRow: {
    position: 'relative',
  },
  input: {
    backgroundColor: Colors.surface,
    borderRadius: 14,
    padding: 18,
    paddingRight: 44,
    fontSize: 18,
    color: Colors.text,
    textAlign: 'center',
    borderWidth: 1,
  },
  spinner: {
    position: 'absolute',
    right: 14,
    top: 18,
  },
  feedback: {
    fontSize: 13,
    textAlign: 'center',
    color: Colors.textSecondary,
  },
  feedbackOk: {
    color: Colors.accent,
  },
  feedbackError: {
    color: '#E57373',
  },
});
