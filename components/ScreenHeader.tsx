import React, { useMemo } from 'react';
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

const createStyles = (c: typeof Colors) => StyleSheet.create({
  container: {
    paddingHorizontal: 20,
    paddingTop: 6,
    paddingBottom: 6,
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
    fontSize: 22,
    fontWeight: '600',
    color: c.textPrimary,
    marginBottom: 2,
    letterSpacing: -0.4,
  },
  subtitle: {
    fontSize: 12,
    fontWeight: '400',
    color: c.textTertiary,
    letterSpacing: 0.3,
  },
  leftAction: {
    marginBottom: 8,
  },
  rightAction: {
    paddingTop: 2,
    paddingLeft: 12,
  },
});

export const ScreenHeader: React.FC<ScreenHeaderProps> = ({
  title,
  subtitle,
  style,
  leftAction,
  rightAction,
}) => {
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);

  return (
    <View style={[styles.container, style]}>
      {leftAction && (
        <View style={styles.leftAction}>
          {leftAction}
        </View>
      )}
      <View style={styles.headerRow}>
        <View style={styles.titleContainer}>
          <Text
            style={styles.title}
            numberOfLines={1}
            adjustsFontSizeToFit={true}
            minimumFontScale={0.8}
          >{title}</Text>
          {subtitle && <Text style={styles.subtitle}>{subtitle}</Text>}
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

export default ScreenHeader;
