import React, { useCallback } from 'react';
import { Text, StyleSheet, type StyleProp, type TextStyle } from 'react-native';
import { palette } from '@/constants/theme';
import { parseTextLinks } from '@/lib/utils/parseTextLinks';
import { openLink } from '@/lib/utils/openLink';

type LinkableTextProps = {
  children: string;
  style?: StyleProp<TextStyle>;
  linkStyle?: StyleProp<TextStyle>;
};

export function LinkableText({ children, style, linkStyle }: LinkableTextProps) {
  const segments = parseTextLinks(children);

  const handlePressLink = useCallback(async (url: string) => {
    try {
      await openLink(url);
    } catch (error) {
      console.warn('[LinkableText] Failed to open link:', error);
    }
  }, []);

  return (
    <Text style={style}>
      {segments.map((segment, index) => {
        if (segment.type === 'text') {
          return <Text key={`text-${index}`}>{segment.value}</Text>;
        }

        return (
          <Text
            key={`link-${index}`}
            style={[styles.link, linkStyle]}
            onPress={() => handlePressLink(segment.url)}
          >
            {segment.value}
          </Text>
        );
      })}
    </Text>
  );
}

const styles = StyleSheet.create({
  link: {
    color: palette.accent,
    textDecorationLine: 'underline',
  },
});
