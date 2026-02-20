import React from 'react';
import { View, Text, StyleSheet, ViewStyle } from 'react-native';
import { Colors } from '../theme/theme-tokens';
import { useTheme } from '../contexts/ThemeContext';

interface ScreenHeaderProps {
  title: string;
  subtitle?: string;
  style?: ViewStyle;
  leftAction?: React.ReactNode;
  rightAction?: React.ReactNode;
}

export const ScreenHeader: React.FC<ScreenHeaderProps> = ({
  title,
  subtitle,
  style,
  leftAction,
  rightAction,
}) => {
  const { colors } = useTheme();

  return (
    <View style={[styles.container, style]}>
      {leftAction && (
        <View style={styles.leftAction}>
          {leftAction}
        </View>
      )}
      <View style={styles.headerRow}>
        <View style={styles.titleContainer}>
          <Text style={[styles.title, { color: colors.textPrimary }]}>{title}</Text>
          {subtitle && <Text style={[styles.subtitle, { color: colors.textTertiary }]}>{subtitle}</Text>}
        </View>
        {rightAction && (
          <View style={styles.rightAction}>
            {rightAction}
          </View>
        )}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: 20,
    paddingTop: 80,
    paddingBottom: 20,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
  },
  titleContainer: {
    flex: 1,
  },
  title: {
    fontSize: 34,
    fontWeight: '300',
    color: Colors.textPrimary,
    marginBottom: 8,
    letterSpacing: 0.5,
  },
  subtitle: {
    fontSize: 15,
    fontWeight: '400',
    color: Colors.textTertiary,
    letterSpacing: 0.3,
  },
  leftAction: {
    marginBottom: 8,
  },
  rightAction: {
    paddingTop: 8,
    paddingLeft: 12,
  },
});

export default ScreenHeader;
