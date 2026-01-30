import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Colors, Typography } from '../../app/_theme/theme-tokens';

interface Props {
  label: string;
  value: string;
  color: string;
  size?: number;
}

export const StatusOrb: React.FC<Props> = ({
  label,
  value,
  color,
  size = 90,
}) => {
  const fontSize = Math.max(14, size * 0.2);
  const labelSize = Math.max(9, size * 0.12);

  return (
    <View style={[
      styles.container,
      {
        width: size,
        height: size,
        borderRadius: size / 2,
        backgroundColor: `${color}12`,
        borderColor: `${color}30`,
      },
    ]}>
      <Text style={[styles.value, { fontSize, color }]}>
        {value}
      </Text>
      <Text style={[styles.label, { fontSize: labelSize }]}>
        {label}
      </Text>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  value: {
    fontWeight: '600',
  },
  label: {
    color: Colors.textMuted,
    marginTop: 2,
  },
});

export default StatusOrb;
