// ============================================================================
// RESOURCES SUBSCREEN — Phase 29 Batch B F1.
//
// Reached from the You tab's compact ResourcesList variant (per-row chevron
// tap → navigate('/resources')). Renders the default ResourcesList — full
// expanded category cards with descriptions + inline expand-on-tap revealing
// link rows — as the dedicated reference surface for caregivers actively
// looking for help.
//
// Shell mirrors app/caregiver-wellness.tsx (the sibling subscreen pattern):
// AuroraBackground + SafeAreaView + SubScreenHeader + ScrollView.
//
// Phase 29 Batch C — title "For when you need it" + titleVariant='serif'.
// Witness-voice copy + Georgia italic 20pt landing together as the
// scope-tracker pair promised. The phrase acknowledges resources are
// situational (not a checklist to work through) and the typography
// carries the same caregiver-lane voice as the You tab that launches
// this screen.
// ============================================================================

import React, { useMemo } from 'react';
import { View, StyleSheet, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { AuroraBackground } from '../components/aurora/AuroraBackground';
import { SubScreenHeader } from '../components/SubScreenHeader';
import { ResourcesList } from '../components/support/ResourcesList';
import { useTheme } from '../contexts/ThemeContext';

export default function ResourcesScreen() {
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);

  return (
    <View style={styles.root}>
      <AuroraBackground variant="support" />

      <SafeAreaView style={{ flex: 1 }} edges={['top']}>
        <SubScreenHeader title="For when you need it" titleVariant="serif" />

        <ScrollView
          style={styles.scroll}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          <ResourcesList />

          {/* Bottom padding */}
          <View style={{ height: 40 }} />
        </ScrollView>
      </SafeAreaView>
    </View>
  );
}

function createStyles(c: any) {
  return StyleSheet.create({
    root: {
      flex: 1,
      backgroundColor: c.background,
    },
    scroll: {
      flex: 1,
    },
    scrollContent: {
      paddingHorizontal: 16,
    },
  });
}
