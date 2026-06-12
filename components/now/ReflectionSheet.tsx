// ============================================================================
// REFLECTION SHEET — Modal wrapper around the existing ReflectionCard.
//
// The F7 ReflectionZoneNow needs a sheet entry-point on Now (the prior
// only-on-You-tab placement was insufficient — caregivers asked to be
// able to reflect from Now without tab-switching). The card itself
// (mood + free-text + save logic + repo) is unchanged; this file is
// purely the sheet shell that mounts it.
// ============================================================================

import React, { useMemo } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  Modal,
  StyleSheet,
} from 'react-native';
import { useTheme } from '../../contexts/ThemeContext';
import { ReflectionCard } from '../support/ReflectionCard';
import { Colors } from '../../theme/theme-tokens';
import { CARD_PADDING_V, TypeScale } from '../../theme/spacing';

export interface ReflectionSheetProps {
  visible: boolean;
  onClose: () => void;
}

export function ReflectionSheet({ visible, onClose }: ReflectionSheetProps) {
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <TouchableOpacity
        style={styles.overlay}
        activeOpacity={1}
        onPress={onClose}
        accessibilityRole="button"
        accessibilityLabel="Close reflection sheet"
      >
        <TouchableOpacity
          style={styles.sheet}
          activeOpacity={1}
          accessibilityRole="none"
          accessibilityLabel="Reflection"
          testID="reflection-sheet"
        >
          <View style={styles.handle} />
          <View style={styles.titleRow}>
            <Text style={styles.title}>Take a coffee moment</Text>
            <TouchableOpacity
              onPress={onClose}
              hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
              accessibilityRole="button"
              accessibilityLabel="Close"
              testID="reflection-sheet-close"
            >
              <Text style={styles.close}>Done</Text>
            </TouchableOpacity>
          </View>
          <ReflectionCard />
        </TouchableOpacity>
      </TouchableOpacity>
    </Modal>
  );
}

const createStyles = (c: typeof Colors) =>
  StyleSheet.create({
    overlay: {
      flex: 1,
      backgroundColor: 'rgba(0,0,0,0.6)',
      justifyContent: 'flex-end',
    },
    sheet: {
      backgroundColor: c.background,
      borderTopLeftRadius: 20,
      borderTopRightRadius: 20,
      paddingHorizontal: 20,
      paddingTop: 8,
      paddingBottom: 32, // allow: bottom safe-area inset
      maxHeight: '90%',
    },
    handle: {
      width: 40,
      height: 4,
      borderRadius: 2,
      backgroundColor: c.glassBorder,
      alignSelf: 'center',
      marginBottom: CARD_PADDING_V,
    },
    titleRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      marginBottom: 12,
    },
    title: {
      ...TypeScale.title,
      color: c.textPrimary,
      fontWeight: '500',
    },
    close: {
      ...TypeScale.body,
      color: c.accent,
      fontWeight: '600',
    },
  });

export default ReflectionSheet;
