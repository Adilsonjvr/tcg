import React from 'react';
import { StyleSheet, Text, TextInput, TextInputProps, View } from 'react-native';
import { colors } from '../theme/colors';

interface PokeTextInputProps extends TextInputProps {
  label?: string;
  helperText?: string;
  error?: string;
}

const PokeTextInput: React.FC<PokeTextInputProps> = ({ label, helperText, error, style, ...rest }) => {
  const stateColor = error ? colors.danger : colors.border;

  return (
    <View style={styles.wrapper}>
      {label ? <Text style={styles.label}>{label}</Text> : null}
      <TextInput
        style={[
          styles.input,
          {
            borderColor: stateColor,
          },
          style,
        ]}
        placeholderTextColor={colors.textSubtle}
        {...rest}
      />
      {error ? <Text style={styles.error}>{error}</Text> : helperText ? <Text style={styles.helper}>{helperText}</Text> : null}
    </View>
  );
};

const styles = StyleSheet.create({
  wrapper: {
    width: '100%',
    marginBottom: 12,
  },
  label: {
    color: colors.text,
    fontWeight: '600',
    marginBottom: 6,
  },
  input: {
    borderWidth: 2,
    borderRadius: 14,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 16,
    backgroundColor: colors.surface,
    color: colors.text,
  },
  helper: {
    marginTop: 6,
    color: colors.textSubtle,
    fontSize: 13,
  },
  error: {
    marginTop: 6,
    color: colors.danger,
    fontWeight: '600',
  },
});

export default PokeTextInput;
