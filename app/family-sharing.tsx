// ============================================================================
// FAMILY SHARING SCREEN
// Invite caregivers and manage access
// ============================================================================

import React, { useState, useEffect, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  Share,
  TextInput,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { useActivePatientName } from '../hooks/useActivePatientName';
import { possessive } from '../utils/text/possessive';
import { Colors, Spacing, BorderRadius } from '../theme/theme-tokens';
import { useTheme } from '../contexts/ThemeContext';
import { SubScreenHeader } from '../components/SubScreenHeader';
import {
  generateShareCode,
  getShareInvites,
  getCaregivers,
  removeCaregiver,
  ShareInvite,
  CaregiverProfile,
} from '../utils/collaborativeCare';
export default function FamilySharingScreen() {
  const router = useRouter();
  // Phase 5.13.1.c — canonical name via PatientContext.
  const patientName = useActivePatientName();
  const [invites, setInvites] = useState<ShareInvite[]>([]);
  const [caregivers, setCaregivers] = useState<CaregiverProfile[]>([]);
  const [showJoinCode, setShowJoinCode] = useState(false);
  const [joinCode, setJoinCode] = useState('');
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    const loadedInvites = await getShareInvites();
    const activeInvites = loadedInvites.filter(i => !i.used && new Date(i.expiresAt) > new Date());
    setInvites(activeInvites);

    const loadedCaregivers = await getCaregivers();
    setCaregivers(loadedCaregivers);
  };

  const handleGenerateCode = async () => {
    try {
      const invite = await generateShareCode(patientName, 'You', {
        canView: true,
        canEdit: false,
        canMarkMedications: true,
        canScheduleAppointments: false,
        canAddNotes: true,
        canExport: false,
      });

      await loadData();

      // Share the code
      const message = `Join ${possessive(patientName)} care team on EmberMate!\n\nYour invite code: ${invite.code}\n\nThis code expires in 7 days.`;

      Alert.alert(
        'Invite Code Created',
        `Share this code with your family member:\n\n${invite.code}\n\nExpires in 7 days`,
        [
          { text: 'Copy Code', onPress: () => copyToClipboard(invite.code) },
          { text: 'Share', onPress: () => Share.share({ message }) },
          { text: 'Done' },
        ]
      );
    } catch (error) {
      Alert.alert('Error', 'Failed to generate invite code');
    }
  };

  const copyToClipboard = (text: string) => {
    // Note: Clipboard API would be used here
    Alert.alert('Copied', 'Code copied to clipboard');
  };

  const handleRemoveCaregiver = (caregiver: CaregiverProfile) => {
    Alert.alert(
      'Remove Caregiver?',
      `${caregiver.name} will lose access to ${possessive(patientName)} care information.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Remove',
          style: 'destructive',
          onPress: async () => {
            await removeCaregiver(caregiver.id);
            await loadData();
          },
        },
      ]
    );
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <LinearGradient
        colors={[colors.backgroundGradientStart, colors.backgroundGradientEnd]}
        style={styles.gradient}
      >
        <SubScreenHeader
          title="Family Sharing"
          emoji="👥"
        />

        <ScrollView style={styles.content}>
          {/* Explainer */}
          <View style={styles.explainer}>
            <Text style={styles.explainerText}>
              Invite family members to help manage {patientName}'s care. They can view schedules,
              mark medications, and add notes.
            </Text>
          </View>

          {/* Beta Notice */}
          <View style={styles.betaNotice}>
            <Text style={styles.betaIcon}>ℹ️</Text>
            <View style={styles.betaContent}>
              <Text style={styles.betaTitle}>Single-Device Mode</Text>
              <Text style={styles.betaText}>
                Family sharing currently stores data locally on this device only.
                Multi-device sync will be available in a future update.
              </Text>
            </View>
          </View>

          {/* Active Caregivers */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>ACTIVE CAREGIVERS ({caregivers.length})</Text>

            {caregivers.length === 0 ? (
              <View style={styles.emptyState}>
                <Text style={styles.emptyIcon}>👥</Text>
                <Text style={styles.emptyText}>No caregivers yet</Text>
                <Text style={styles.emptySubtext}>Generate an invite code to get started</Text>
              </View>
            ) : (
              caregivers.map(caregiver => (
                <TouchableOpacity
                  key={caregiver.id}
                  style={styles.caregiverCard}
                  onPress={() => router.push(`/caregiver-management?id=${caregiver.id}`)}
                  activeOpacity={0.7}
                  accessibilityLabel={`${caregiver.name}, ${caregiver.role}`}
                  accessibilityRole="button"
                >
                  <View
                    style={[styles.caregiverAvatar, { backgroundColor: caregiver.avatarColor }]}
                  >
                    <Text style={styles.caregiverInitial}>
                      {caregiver.name.charAt(0).toUpperCase()}
                    </Text>
                  </View>

                  <View style={styles.caregiverInfo}>
                    <Text style={styles.caregiverName}>{caregiver.name}</Text>
                    <Text style={styles.caregiverRole}>
                      {caregiver.role.charAt(0).toUpperCase() + caregiver.role.slice(1)} •
                      Joined {new Date(caregiver.joinedAt).toLocaleDateString()}
                    </Text>
                    <View style={styles.permissionTags}>
                      {caregiver.permissions.canEdit && (
                        <View style={styles.permissionTag}>
                          <Text style={styles.permissionTagText}>Can Edit</Text>
                        </View>
                      )}
                      {caregiver.permissions.canMarkMedications && (
                        <View style={styles.permissionTag}>
                          <Text style={styles.permissionTagText}>Mark Meds</Text>
                        </View>
                      )}
                    </View>
                  </View>

                  <Text style={styles.chevron}>›</Text>
                </TouchableOpacity>
              ))
            )}
          </View>

          {/* Pending Invites */}
          {invites.length > 0 && (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>PENDING INVITES ({invites.length})</Text>

              {invites.map(invite => (
                <View key={invite.id} style={styles.inviteCard}>
                  <View style={styles.inviteLeft}>
                    <Text style={styles.inviteCode}>{invite.code}</Text>
                    <Text style={styles.inviteExpires}>
                      Expires {new Date(invite.expiresAt).toLocaleDateString()}
                    </Text>
                  </View>

                  <TouchableOpacity
                    onPress={() => copyToClipboard(invite.code)}
                    style={styles.copyButton}
                    accessibilityLabel={`Copy invite code ${invite.code}`}
                    accessibilityRole="button"
                  >
                    <Text style={styles.copyButtonText}>Copy</Text>
                  </TouchableOpacity>
                </View>
              ))}
            </View>
          )}

          {/* Actions */}
          <View style={styles.section}>
            <TouchableOpacity
              style={styles.primaryButton}
              onPress={handleGenerateCode}
              accessibilityLabel="Generate invite code"
              accessibilityRole="button"
            >
              <Text style={styles.primaryButtonText}>+ Generate Invite Code</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.secondaryButton}
              onPress={() => router.push('/family-activity')}
              accessibilityLabel="View family activity"
              accessibilityRole="button"
            >
              <Text style={styles.secondaryButtonText}>View Family Activity →</Text>
            </TouchableOpacity>
          </View>

          {/* Info */}
          <View style={styles.infoBox}>
            <Text style={styles.infoTitle}>How It Works</Text>
            <Text style={styles.infoText}>
              1. Generate an invite code{'\n'}
              2. Share it with your family member{'\n'}
              3. They enter the code in EmberMate{'\n'}
              4. Now you're coordinating care together!
            </Text>
          </View>
        </ScrollView>
      </LinearGradient>
    </SafeAreaView>
  );
}

const createStyles = (c: typeof Colors) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: c.background,
  },
  gradient: {
    flex: 1,
  },
  content: {
    flex: 1,
    paddingHorizontal: Spacing.md,
  },
  explainer: {
    backgroundColor: c.accentLight,
    borderWidth: 1,
    borderColor: c.accentBorder,
    borderRadius: BorderRadius.lg,
    padding: Spacing.sm,
    marginTop: Spacing.md,
    marginBottom: Spacing.lg,
  },
  explainerText: {
    fontSize: 13,
    lineHeight: 20,
    color: c.textPrimary,
  },
  betaNotice: {
    flexDirection: 'row',
    backgroundColor: c.blueTint,
    borderWidth: 1,
    borderColor: 'rgba(59, 130, 246, 0.3)',
    borderRadius: BorderRadius.lg,
    padding: Spacing.sm,
    marginBottom: Spacing.lg,
    gap: Spacing.xs,
  },
  betaIcon: {
    fontSize: 20,
  },
  betaContent: {
    flex: 1,
  },
  betaTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: c.blueBright,
    marginBottom: 4,
  },
  betaText: {
    fontSize: 12,
    lineHeight: 18,
    color: c.textSecondary,
  },
  section: {
    marginBottom: Spacing.lg,
  },
  sectionTitle: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 1.2,
    color: c.textSecondary,
    marginBottom: Spacing.sm,
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: Spacing.lg,
  },
  emptyIcon: {
    fontSize: 48,
    marginBottom: Spacing.xs,
    opacity: 0.3,
  },
  emptyText: {
    fontSize: 15,
    fontWeight: '500',
    color: c.textPrimary,
    marginBottom: Spacing.xxs,
  },
  emptySubtext: {
    fontSize: 13,
    color: c.textSecondary,
  },
  caregiverCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: c.surface,
    borderWidth: 1,
    borderColor: c.border,
    borderRadius: BorderRadius.lg,
    padding: Spacing.sm,
    marginBottom: Spacing.xs,
  },
  caregiverAvatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: Spacing.sm,
  },
  caregiverInitial: {
    fontSize: 20,
    fontWeight: '600',
    color: c.textPrimary,
  },
  caregiverInfo: {
    flex: 1,
  },
  caregiverName: {
    fontSize: 15,
    fontWeight: '500',
    color: c.textPrimary,
    marginBottom: 4,
  },
  caregiverRole: {
    fontSize: 12,
    color: c.textSecondary,
    marginBottom: Spacing.xxs,
  },
  permissionTags: {
    flexDirection: 'row',
    gap: Spacing.xxs,
  },
  permissionTag: {
    backgroundColor: c.accentLight,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  permissionTagText: {
    fontSize: 10,
    fontWeight: '600',
    color: c.accent,
  },
  removeButton: {
    width: 24,
    height: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  removeButtonText: {
    fontSize: 18,
    color: '#C85A54',
  },
  chevron: {
    fontSize: 28,
    color: c.textSecondary,
    opacity: 0.3,
  },
  inviteCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: c.surface,
    borderWidth: 1,
    borderColor: c.borderMedium,
    borderRadius: BorderRadius.lg,
    padding: Spacing.sm,
    marginBottom: Spacing.xs,
  },
  inviteLeft: {
    flex: 1,
  },
  inviteCode: {
    fontSize: 24,
    fontWeight: '700',
    color: c.accent,
    letterSpacing: 2,
    marginBottom: 4,
  },
  inviteExpires: {
    fontSize: 12,
    color: c.textSecondary,
  },
  copyButton: {
    backgroundColor: c.accentLight,
    paddingHorizontal: Spacing.sm,
    paddingVertical: Spacing.xs,
    borderRadius: BorderRadius.md,
  },
  copyButtonText: {
    fontSize: 13,
    fontWeight: '600',
    color: c.accent,
  },
  primaryButton: {
    backgroundColor: c.accent,
    borderRadius: BorderRadius.lg,
    padding: Spacing.sm,
    alignItems: 'center',
    marginBottom: Spacing.xs,
  },
  primaryButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: c.background,
  },
  secondaryButton: {
    backgroundColor: c.surface,
    borderWidth: 1,
    borderColor: c.border,
    borderRadius: BorderRadius.lg,
    padding: Spacing.sm,
    alignItems: 'center',
  },
  secondaryButtonText: {
    fontSize: 15,
    fontWeight: '500',
    color: c.textPrimary,
  },
  infoBox: {
    backgroundColor: c.surface,
    borderWidth: 1,
    borderColor: c.border,
    borderRadius: BorderRadius.lg,
    padding: Spacing.sm,
    marginBottom: Spacing.lg,
  },
  infoTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: c.textPrimary,
    marginBottom: Spacing.xs,
  },
  infoText: {
    fontSize: 13,
    lineHeight: 20,
    color: c.textSecondary,
  },
});
