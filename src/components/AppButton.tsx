import { Link } from 'expo-router';
import type { ComponentProps, PropsWithChildren } from 'react';
import { Pressable, StyleSheet, Text, ViewStyle } from 'react-native';

import { colors, radius, spacing } from '@/constants/theme';

type AppButtonProps = PropsWithChildren<{
  href?: ComponentProps<typeof Link>['href'];
  onPress?: () => void;
  variant?: 'primary' | 'secondary' | 'outline';
  size?: 'normal' | 'large';
  style?: ViewStyle;
}>;

export function AppButton({ children, href, onPress, variant = 'primary', size = 'normal', style }: AppButtonProps) {
  const button = (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.button,
        variant === 'secondary' && styles.secondary,
        variant === 'outline' && styles.outline,
        size === 'large' && styles.large,
        pressed && (variant === 'primary' ? styles.primaryPressed : styles.secondaryPressed),
        style,
      ]}>
      <Text
        style={[
          styles.text,
          variant === 'secondary' && styles.secondaryText,
          variant === 'outline' && styles.outlineText,
          size === 'large' && styles.largeText,
        ]}>
        {children}
      </Text>
    </Pressable>
  );

  if (href) {
    return (
      <Link href={href} asChild>
        {button}
      </Link>
    );
  }

  return button;
}

const styles = StyleSheet.create({
  button: {
    alignItems: 'center',
    backgroundColor: colors.accent,
    borderRadius: radius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
  },
  secondary: {
    backgroundColor: colors.surfaceMuted,
    borderColor: colors.border,
    borderWidth: 1,
  },
  outline: {
    backgroundColor: 'transparent',
    borderColor: colors.accent,
    borderWidth: 2,
  },
  large: {
    paddingVertical: spacing.lg,
  },
  primaryPressed: {
    backgroundColor: colors.accentPressed,
  },
  secondaryPressed: {
    opacity: 0.75,
  },
  text: {
    color: colors.accentText,
    fontSize: 16,
    fontWeight: '700',
  },
  secondaryText: {
    color: colors.text,
  },
  outlineText: {
    color: colors.accent,
  },
  largeText: {
    fontSize: 22,
    fontWeight: '900',
  },
});
