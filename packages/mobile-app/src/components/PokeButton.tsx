import React from 'react';
import { ActivityIndicator, Pressable, PressableProps, StyleSheet, Text } from 'react-native';
import { colors } from '../theme/colors';

type ButtonVariant = 'primary' | 'secondary' | 'outline' | 'ghost';

interface PokeButtonProps extends PressableProps {
  label: string;
  variant?: ButtonVariant;
  loading?: boolean;
  fullWidth?: boolean;
}

const variantStyles: Record<ButtonVariant, { backgroundColor: string; textColor: string; borderColor: string }> = {
  primary: {
    backgroundColor: colors.primary,
    textColor: colors.pokeballWhite,
    borderColor: colors.primaryDark,
  },
  secondary: {
    backgroundColor: colors.secondary,
    textColor: colors.accentDark,
    borderColor: colors.secondaryDark,
  },
  outline: {
    backgroundColor: 'transparent',
    textColor: colors.text,
    borderColor: colors.pokeballStripe,
  },
  ghost: {
    backgroundColor: 'transparent',
    textColor: colors.textMuted,
    borderColor: 'transparent',
  },
};

const PokeButton: React.FC<PokeButtonProps> = ({
  label,
  variant = 'primary',
  loading = false,
  fullWidth = false,
  style,
  disabled,
  ...rest
}) => {
  const palette = variantStyles[variant];
  return (
    <Pressable
      style={[
        styles.base,
        {
          backgroundColor: palette.backgroundColor,
          borderColor: palette.borderColor,
        },
        fullWidth && styles.fullWidth,
        (disabled || loading) && styles.disabled,
        style,
      ]}
      disabled={disabled || loading}
      {...rest}
    >
      {loading ? (
        <ActivityIndicator color={palette.textColor} />
      ) : (
        <Text style={[styles.label, { color: palette.textColor }]}>{label}</Text>
      )}
    </Pressable>
  );
};

const styles = StyleSheet.create({
  base: {
    minHeight: 48,
    paddingHorizontal: 20,
    borderRadius: 14,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: colors.accentDark,
    shadowOpacity: 0.08,
    shadowOffset: { width: 0, height: 4 },
    shadowRadius: 8,
    elevation: 2,
  },
  label: {
    fontWeight: '700',
    fontSize: 16,
    letterSpacing: 0.4,
  },
  fullWidth: {
    alignSelf: 'stretch',
  },
  disabled: {
    opacity: 0.6,
  },
});

export default PokeButton;
