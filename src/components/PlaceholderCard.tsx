import { StyleSheet, Text } from 'react-native';

import { AppCard } from '@/components/AppCard';
import { colors, spacing } from '@/constants/theme';

type PlaceholderCardProps = {
  title: string;
  body: string;
};

export function PlaceholderCard({ title, body }: PlaceholderCardProps) {
  return (
    <AppCard style={styles.card}>
      <Text style={styles.title}>{title}</Text>
      <Text style={styles.body}>{body}</Text>
    </AppCard>
  );
}

const styles = StyleSheet.create({
  card: {
    gap: spacing.sm,
  },
  title: {
    color: colors.text,
    fontSize: 18,
    fontWeight: '700',
  },
  body: {
    color: colors.textMuted,
    fontSize: 15,
    lineHeight: 22,
  },
});
