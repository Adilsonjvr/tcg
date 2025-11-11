import React from 'react';
import { View, StyleSheet, ViewProps } from 'react-native';
import { colors } from '../theme/colors';

type SurfaceTone = 'default' | 'muted' | 'info' | 'warning' | 'danger' | 'success';

interface SurfaceProps extends ViewProps {
  tone?: SurfaceTone;
  padding?: number;
  alignCenter?: boolean;
}

const toneStyles: Record<SurfaceTone, { backgroundColor: string; borderColor: string }> = {
  default: { backgroundColor: colors.surface, borderColor: colors.border },
  muted: { backgroundColor: colors.surfaceMuted, borderColor: colors.border },
  info: { backgroundColor: colors.infoBackground, borderColor: colors.info },
  warning: { backgroundColor: colors.warningBackground, borderColor: colors.warning },
  danger: { backgroundColor: colors.dangerBackground, borderColor: colors.danger },
  success: { backgroundColor: colors.successBackground, borderColor: colors.success },
};

const Surface: React.FC<SurfaceProps> = ({
  tone = 'default',
  padding = 16,
  alignCenter = false,
  style,
  children,
  ...rest
}) => (
  <View
    style={[
      styles.base,
      toneStyles[tone],
      alignCenter && styles.alignCenter,
      { padding },
      style,
    ]}
    {...rest}
  >
    {children}
  </View>
);

const styles = StyleSheet.create({
  base: {
    backgroundColor: colors.surface,
    borderWidth: 1.5,
    borderColor: colors.border,
    borderRadius: 20,
    shadowColor: colors.accentDark,
    shadowOpacity: 0.08,
    shadowRadius: 14,
    shadowOffset: { width: 0, height: 6 },
    elevation: 4,
  },
  alignCenter: {
    alignItems: 'center',
  },
});

export default Surface;
