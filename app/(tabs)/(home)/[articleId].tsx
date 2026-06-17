import React from 'react';
import { useLocalSearchParams } from 'expo-router';
import { ArticleDetailView } from '@/components/ArticleDetailView';

export default function HomeArticleScreen() {
  const { articleId } = useLocalSearchParams<{ articleId: string }>();

  return (
    <ArticleDetailView
      articleId={String(articleId ?? '')}
      backLabel="Home"
      discussionStack="home"
    />
  );
}
