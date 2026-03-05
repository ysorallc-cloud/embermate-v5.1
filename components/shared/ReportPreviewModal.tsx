// ============================================================================
// REPORT PREVIEW MODAL
// Shared modal for previewing and exporting PDF reports
// Used by Journal (daily/clinical) and Provider Prep screens
// ============================================================================

import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Modal,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Colors } from '../../theme/theme-tokens';

export interface ReportPreviewModalProps {
  visible: boolean;
  title: string;
  infoText: string;
  previewLines: string[];
  onExport: () => void;
  onClose: () => void;
  exporting?: boolean;
}

export function ReportPreviewModal({
  visible,
  title,
  infoText,
  previewLines,
  onExport,
  onClose,
  exporting = false,
}: ReportPreviewModalProps) {
  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onClose}
    >
      <SafeAreaView style={styles.previewContainer} edges={['top', 'bottom']}>
        <View style={styles.previewHeader}>
          <TouchableOpacity
            onPress={onClose}
            style={styles.previewCloseButton}
            accessibilityLabel="Close preview"
            accessibilityRole="button"
          >
            <Text style={styles.previewCloseText}>Cancel</Text>
          </TouchableOpacity>
          <Text style={styles.previewTitle}>{title}</Text>
          <TouchableOpacity
            onPress={onExport}
            style={[styles.previewExportButton, exporting && { opacity: 0.5 }]}
            disabled={exporting}
            accessibilityLabel="Export as PDF"
            accessibilityRole="button"
          >
            <Text style={styles.previewExportText}>
              {exporting ? 'Exporting...' : 'Share PDF'}
            </Text>
          </TouchableOpacity>
        </View>
        <ScrollView style={styles.previewScroll} contentContainerStyle={styles.previewScrollContent}>
          <View style={styles.previewCard}>
            <Text style={styles.previewHTMLNote}>{infoText}</Text>
          </View>
          {previewLines.length > 0 && (
            <View style={styles.previewContent}>
              {previewLines.map((line, i) => (
                <Text
                  key={i}
                  style={[
                    styles.previewLine,
                    getLineStyle(line),
                  ]}
                >
                  {formatLine(line)}
                </Text>
              ))}
            </View>
          )}
        </ScrollView>
      </SafeAreaView>
    </Modal>
  );
}

function getLineStyle(line: string) {
  if (line.startsWith('[SECTION]')) return styles.previewLineSectionTitle;
  if (line.startsWith('[HEADER]')) return styles.previewLineHeader;
  if (/^\s{2}[•]/.test(line) || /^\d+\./.test(line)) return styles.previewLineQuestion;
  return null;
}

function formatLine(line: string): string {
  if (line.startsWith('[SECTION]')) return line.replace('[SECTION] ', '');
  if (line.startsWith('[HEADER]')) return line.replace('[HEADER] ', '');
  return line;
}

const styles = StyleSheet.create({
  previewContainer: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  previewHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: Colors.glassBorder,
  },
  previewCloseButton: {
    padding: 4,
  },
  previewCloseText: {
    fontSize: 15,
    color: Colors.textMuted,
  },
  previewTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.textPrimary,
  },
  previewExportButton: {
    backgroundColor: Colors.accent,
    borderRadius: 8,
    paddingHorizontal: 14,
    paddingVertical: 8,
  },
  previewExportText: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.textPrimary,
  },
  previewScroll: {
    flex: 1,
  },
  previewScrollContent: {
    padding: 20,
  },
  previewCard: {
    backgroundColor: Colors.glass,
    borderWidth: 1,
    borderColor: Colors.glassBorder,
    borderRadius: 10,
    padding: 12,
    marginBottom: 16,
  },
  previewHTMLNote: {
    fontSize: 13,
    color: Colors.textMuted,
    textAlign: 'center',
  },
  previewContent: {
    backgroundColor: Colors.glass,
    borderWidth: 1,
    borderColor: Colors.glassBorder,
    borderRadius: 12,
    padding: 20,
  },
  previewLine: {
    fontSize: 14,
    color: Colors.textSecondary,
    lineHeight: 22,
    marginBottom: 2,
  },
  previewLineHeader: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.textPrimary,
  },
  previewLineSectionTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: Colors.accent,
    marginTop: 12,
    marginBottom: 6,
  },
  previewLineQuestion: {
    fontSize: 14,
    color: Colors.textBright,
    paddingLeft: 8,
    marginBottom: 4,
  },
});
