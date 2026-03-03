// ============================================================================
// COFFEE MOMENT SCREEN - Sanctuary
// A peaceful break for caregivers — breathing, resources, templates, helpline
// ============================================================================

import React, { useState, useEffect, useRef } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Animated, Linking, Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import * as Clipboard from 'expo-clipboard';

import { Colors } from '../theme/theme-tokens';

const AFFIRMATIONS = [
  { emoji: '\uD83C\uDF1F', text: 'You are doing an incredible job, even on the hard days.' },
  { emoji: '\uD83D\uDCAA', text: 'Your strength and resilience make a profound difference.' },
  { emoji: '\uD83C\uDF38', text: 'Taking care of yourself is taking care of those you love.' },
  { emoji: '\uD83D\uDD4A\uFE0F', text: 'It\'s okay to rest. You deserve moments of peace.' },
  { emoji: '\u2728', text: 'Small steps forward are still progress worth celebrating.' },
  { emoji: '\uD83C\uDF08', text: 'Your compassion is a gift to everyone around you.' },
  { emoji: '\uD83E\uDD8B', text: 'You are more capable than you know.' },
  { emoji: '\uD83C\uDF3A', text: 'Every breath you take is an act of courage.' },
];

const RESOURCES = [
  {
    title: "Managing Caregiver Stress",
    url: "https://www.nia.nih.gov/health/caregiving/taking-care-yourself-tips-caregivers",
    icon: "heart-outline",
    emoji: "\uD83E\uDDE0",
    source: "National Institute on Aging",
    tint: Colors.accent,
    tintBg: 'rgba(20, 184, 166, 0.10)',
    tintBorder: 'rgba(20, 184, 166, 0.25)',
  },
  {
    title: "Recognizing Burnout Signs",
    url: "https://www.helpguide.org/articles/stress/burnout-prevention-and-recovery.htm",
    icon: "alert-circle-outline",
    emoji: "\uD83D\uDD25",
    source: "HelpGuide.org",
    tint: '#FBBF24',
    tintBg: 'rgba(251, 191, 36, 0.10)',
    tintBorder: 'rgba(251, 191, 36, 0.25)',
  },
  {
    title: "Find a Support Group",
    url: "https://www.caregiver.org/connecting-caregivers/support-groups/",
    icon: "people-outline",
    emoji: "\uD83D\uDC65",
    source: "Family Caregiver Alliance",
    tint: '#A78BFA',
    tintBg: 'rgba(167, 139, 250, 0.10)',
    tintBorder: 'rgba(167, 139, 250, 0.25)',
  },
  {
    title: "Self-Care Strategies",
    url: "https://www.caregiver.org/resource/caregiver-self-care/",
    icon: "fitness-outline",
    emoji: "\uD83D\uDC86",
    source: "Family Caregiver Alliance",
    tint: '#5EEAD4',
    tintBg: 'rgba(94, 234, 212, 0.10)',
    tintBorder: 'rgba(94, 234, 212, 0.25)',
  },
  {
    title: "Financial & Legal Planning",
    url: "https://www.aarp.org/caregiving/financial-legal/",
    icon: "document-text-outline",
    emoji: "\uD83D\uDCCB",
    source: "AARP Caregiving",
    tint: '#38BDF8',
    tintBg: 'rgba(56, 189, 248, 0.10)',
    tintBorder: 'rgba(56, 189, 248, 0.25)',
  },
];

const TEMPLATES = [
  {
    id: "boundaries",
    title: "Setting Boundaries",
    icon: "shield-outline",
    phrases: [
      "I need some time to rest right now. Can we talk later?",
      "I appreciate you checking in. I'm managing okay today.",
      "I'm not ready to talk about that yet. I'll let you know when I am.",
    ],
  },
  {
    id: "updates",
    title: "Sharing Updates",
    icon: "chatbubble-outline",
    phrases: [
      "Here's what's been going on with my health lately...",
      "I wanted to let you know about my recent appointment.",
      "Things have been challenging, but here's where I'm at...",
    ],
  },
  {
    id: "help",
    title: "Asking for Help",
    icon: "hand-left-outline",
    phrases: [
      "I could really use help with [specific task].",
      "Would you be able to [specific request]?",
      "I'm struggling with [issue]. Could we talk about it?",
    ],
  },
  {
    id: "gratitude",
    title: "Expressing Gratitude",
    icon: "heart-outline",
    phrases: [
      "I really appreciate you being there for me.",
      "Thank you for understanding when I need space.",
      "Your support means more than I can express.",
    ],
  },
];

const CRISIS_LINE = {
  name: "Caregiver Action Network",
  phone: "1-855-227-3640",
  url: "tel:18552273640",
};

type BreathPhase = 'inhale' | 'hold' | 'exhale' | 'rest';

export default function CoffeeMoment() {
  const router = useRouter();
  const [isBreathing, setIsBreathing] = useState(false);
  const [breathPhase, setBreathPhase] = useState<BreathPhase>('rest');
  const [secondsRemaining, setSecondsRemaining] = useState(4);
  const [cyclesCompleted, setCyclesCompleted] = useState(0);
  const [expandedTemplate, setExpandedTemplate] = useState<string | null>(null);
  const [todaysAffirmation] = useState(AFFIRMATIONS[Math.floor(Math.random() * AFFIRMATIONS.length)]);
  const [copiedIndex, setCopiedIndex] = useState<string | null>(null);

  const scaleAnim = useRef(new Animated.Value(1)).current;
  const opacityAnim = useRef(new Animated.Value(0.3)).current;

  useEffect(() => {
    let interval: NodeJS.Timeout;

    if (isBreathing) {
      interval = setInterval(() => {
        setSecondsRemaining(prev => {
          if (prev > 1) {
            return prev - 1;
          } else {
            // Move to next phase
            setBreathPhase(currentPhase => {
              if (currentPhase === 'inhale') return 'hold';
              if (currentPhase === 'hold') return 'exhale';
              if (currentPhase === 'exhale') {
                setCyclesCompleted(c => c + 1);
                return 'inhale';
              }
              return 'inhale';
            });
            return 4;
          }
        });
      }, 1000);
    }

    return () => clearInterval(interval);
  }, [isBreathing]);

  useEffect(() => {
    if (breathPhase === 'inhale') {
      Animated.parallel([
        Animated.timing(scaleAnim, {
          toValue: 1.8,
          duration: 4000,
          useNativeDriver: true,
        }),
        Animated.timing(opacityAnim, {
          toValue: 1,
          duration: 4000,
          useNativeDriver: true,
        }),
      ]).start();
    } else if (breathPhase === 'hold') {
      // Hold at current size
    } else if (breathPhase === 'exhale') {
      Animated.parallel([
        Animated.timing(scaleAnim, {
          toValue: 1,
          duration: 4000,
          useNativeDriver: true,
        }),
        Animated.timing(opacityAnim, {
          toValue: 0.3,
          duration: 4000,
          useNativeDriver: true,
        }),
      ]).start();
    }
  }, [breathPhase]);

  const startBreathing = () => {
    setIsBreathing(true);
    setBreathPhase('inhale');
    setSecondsRemaining(4);
    setCyclesCompleted(0);
  };

  const stopBreathing = () => {
    setIsBreathing(false);
    setBreathPhase('rest');
    setSecondsRemaining(4);
    scaleAnim.setValue(1);
    opacityAnim.setValue(0.3);
  };

  const openLink = async (url: string) => {
    const supported = await Linking.canOpenURL(url);
    if (supported) {
      await Linking.openURL(url);
    }
  };

  const copyPhrase = async (phrase: string, key: string) => {
    await Clipboard.setStringAsync(phrase);
    setCopiedIndex(key);
    setTimeout(() => setCopiedIndex(null), 1500);
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <LinearGradient colors={[Colors.backgroundDeep, '#0A1412']} style={styles.gradient}>
        <View style={styles.header}>
          <Text style={styles.title}>Coffee Moment</Text>
          <TouchableOpacity onPress={() => router.back()} style={styles.closeButton} accessibilityLabel="Close Coffee Moment" accessibilityRole="button">
            <Ionicons name="close" size={28} color={Colors.textNearFull} />
          </TouchableOpacity>
        </View>

        <ScrollView style={styles.scroll} contentContainerStyle={styles.scrollContent}>
          <Text style={styles.subtitle}>Take a moment for yourself</Text>

          {/* Breathing Exercise - Hero */}
          <View style={styles.breathingSection}>
            <TouchableOpacity
              style={styles.breathingContainer}
              onPress={!isBreathing ? startBreathing : stopBreathing}
              activeOpacity={0.8}
              accessibilityLabel={isBreathing ? "Stop breathing exercise" : "Start breathing exercise"}
              accessibilityRole="button"
            >
              <Animated.View
                style={[
                  styles.breathingOrb,
                  {
                    transform: [{ scale: scaleAnim }],
                    opacity: opacityAnim,
                  }
                ]}
              >
                <View style={styles.orbInnerRing} />
              </Animated.View>

              <View style={styles.orbTextContainer}>
                {!isBreathing ? (
                  <>
                    <Text style={styles.orbReadyText}>Ready</Text>
                    <Text style={styles.orbSubtext}>Tap to begin</Text>
                  </>
                ) : (
                  <>
                    <Text style={styles.orbTimerText}>{secondsRemaining}</Text>
                    <Text style={styles.orbPhaseText}>
                      {breathPhase === 'inhale' ? 'Breathe In' : breathPhase === 'hold' ? 'Hold' : 'Breathe Out'}
                    </Text>
                  </>
                )}
              </View>
            </TouchableOpacity>

            {cyclesCompleted > 0 && (
              <Text style={styles.cyclesText}>
                {'\u2728'} {cyclesCompleted} breath cycle{cyclesCompleted !== 1 ? 's' : ''} completed
              </Text>
            )}
          </View>

          {/* Pause/End controls */}
          {isBreathing && (
            <View style={styles.breathControls}>
              <TouchableOpacity style={styles.breathControlBtn} onPress={stopBreathing}>
                <Text style={styles.breathControlText}>End</Text>
              </TouchableOpacity>
            </View>
          )}

          {/* Affirmation — compact inline card */}
          <View style={styles.affirmationCard}>
            <Text style={styles.affirmationLabel}>Today's affirmation</Text>
            <Text style={styles.affirmationText}>
              {todaysAffirmation.emoji} "{todaysAffirmation.text}"
            </Text>
          </View>

          {/* ── Resources ── */}
          <Text style={styles.sectionTitle}>Resources</Text>
          {RESOURCES.map((resource, index) => (
            <TouchableOpacity
              key={index}
              style={[styles.resourceItem, { backgroundColor: resource.tintBg, borderColor: resource.tintBorder }]}
              onPress={() => openLink(resource.url)}
              activeOpacity={0.7}
              accessibilityLabel={`Open ${resource.title}`}
              accessibilityRole="link"
            >
              <Text style={styles.resourceEmoji}>{resource.emoji}</Text>
              <View style={styles.resourceInfo}>
                <Text style={styles.resourceTitle}>{resource.title}</Text>
                <Text style={styles.resourceSource}>{resource.source}</Text>
              </View>
              <Ionicons name="chevron-forward" size={16} color="rgba(255,255,255,0.25)" />
            </TouchableOpacity>
          ))}

          {/* ── Communication Templates ── */}
          <Text style={[styles.sectionTitle, { marginTop: 24 }]}>Quick Phrases</Text>
          <View style={styles.templateChips}>
            {TEMPLATES.map((template) => (
              <TouchableOpacity
                key={template.id}
                style={[
                  styles.templateChip,
                  expandedTemplate === template.id && styles.templateChipActive,
                ]}
                onPress={() => setExpandedTemplate(expandedTemplate === template.id ? null : template.id)}
                activeOpacity={0.7}
              >
                <Ionicons
                  name={template.icon as any}
                  size={14}
                  color={expandedTemplate === template.id ? Colors.accent : 'rgba(255,255,255,0.5)'}
                />
                <Text style={[
                  styles.templateChipText,
                  expandedTemplate === template.id && styles.templateChipTextActive,
                ]}>
                  {template.title}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          {/* Expanded template phrases */}
          {expandedTemplate && (
            <View style={styles.templateExpanded}>
              <Text style={styles.templateExpandedTitle}>
                {TEMPLATES.find(t => t.id === expandedTemplate)?.icon && (
                  <Ionicons name={TEMPLATES.find(t => t.id === expandedTemplate)!.icon as any} size={14} color={Colors.accent} />
                )}{' '}
                {TEMPLATES.find(t => t.id === expandedTemplate)?.title}
              </Text>
              {TEMPLATES.find(t => t.id === expandedTemplate)?.phrases.map((phrase, index) => {
                const key = `${expandedTemplate}-${index}`;
                return (
                  <TouchableOpacity
                    key={index}
                    style={styles.phraseCard}
                    onPress={() => copyPhrase(phrase, key)}
                    activeOpacity={0.7}
                  >
                    <Text style={styles.phraseText}>"{phrase}"</Text>
                    <Text style={styles.phraseCopy}>
                      {copiedIndex === key ? 'Copied \u2713' : 'Copy'}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          )}

          {/* ── Crisis helpline ── */}
          <TouchableOpacity
            style={styles.crisisCard}
            onPress={() => openLink(CRISIS_LINE.url)}
            activeOpacity={0.7}
            accessibilityLabel={`Call ${CRISIS_LINE.name}`}
            accessibilityRole="link"
          >
            <Text style={styles.crisisIcon}>{'\uD83D\uDCDE'}</Text>
            <View style={styles.crisisInfo}>
              <Text style={styles.crisisTitle}>Need to talk to someone?</Text>
              <Text style={styles.crisisPhone}>{CRISIS_LINE.name}: {CRISIS_LINE.phone}</Text>
            </View>
            <Text style={styles.crisisAction}>Call</Text>
          </TouchableOpacity>

        </ScrollView>
      </LinearGradient>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.backgroundDeep,
  },
  gradient: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: Platform.OS === 'web' ? 32 : 20,
    paddingVertical: Platform.OS === 'web' ? 24 : 16,
  },
  title: {
    fontSize: Platform.OS === 'web' ? 36 : 28,
    fontWeight: '300',
    color: Colors.textNearFull,
  },
  closeButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: Colors.surfaceElevated,
    alignItems: 'center',
    justifyContent: 'center',
  },
  scroll: {
    flex: 1,
    paddingHorizontal: Platform.OS === 'web' ? 32 : 20,
  },
  scrollContent: {
    paddingBottom: 40,
  },
  subtitle: {
    fontSize: Platform.OS === 'web' ? 17 : 15,
    color: 'rgba(255,255,255,0.75)',
    marginBottom: Platform.OS === 'web' ? 32 : 24,
  },

  // Enhanced Breathing Orb - Hero
  breathingSection: {
    alignItems: 'center',
    marginBottom: 24,
  },
  breathingContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    height: 320,
    width: '100%',
    position: 'relative',
  },
  breathingOrb: {
    position: 'absolute',
    width: 160,
    height: 160,
    borderRadius: 80,
    backgroundColor: 'rgba(139, 168, 136, 0.4)',
    borderWidth: 1,
    borderColor: 'rgba(139, 168, 136, 0.6)',
    shadowColor: 'rgba(139, 168, 136, 1)',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 1,
    shadowRadius: 30,
    elevation: 10,
  },
  orbInnerRing: {
    position: 'absolute',
    top: 8,
    left: 8,
    right: 8,
    bottom: 8,
    borderRadius: 72,
    borderWidth: 1,
    borderColor: 'rgba(139, 168, 136, 0.3)',
  },
  orbTextContainer: {
    alignItems: 'center',
    zIndex: 1,
  },
  orbReadyText: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.textNearFull,
    marginBottom: 4,
  },
  orbSubtext: {
    fontSize: 10,
    color: Colors.textSecondary,
  },
  orbTimerText: {
    fontSize: 52,
    fontWeight: '300',
    color: 'rgba(139, 168, 136, 1)',
    marginBottom: 4,
  },
  orbPhaseText: {
    fontSize: 14,
    fontWeight: '500',
    color: 'rgba(255,255,255,0.9)',
  },
  cyclesText: {
    fontSize: 13,
    color: 'rgba(139, 168, 136, 0.9)',
    textAlign: 'center',
    marginTop: 16,
  },

  // Breathing controls
  breathControls: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 12,
    marginBottom: 20,
  },
  breathControlBtn: {
    paddingVertical: 6,
    paddingHorizontal: 20,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.04)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
  },
  breathControlText: {
    fontSize: 13,
    fontWeight: '600',
    color: 'rgba(255,255,255,0.5)',
  },

  // Affirmation — compact inline
  affirmationCard: {
    backgroundColor: 'rgba(20, 184, 166, 0.05)',
    borderRadius: 14,
    padding: 16,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.04)',
    marginBottom: 24,
  },
  affirmationLabel: {
    fontSize: 10,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    color: Colors.accent,
    marginBottom: 8,
  },
  affirmationText: {
    fontSize: 13,
    color: 'rgba(255,255,255,0.7)',
    lineHeight: 20,
    fontStyle: 'italic',
  },

  // Section titles
  sectionTitle: {
    fontSize: 12,
    fontWeight: '600',
    color: 'rgba(255,255,255,0.45)',
    letterSpacing: 0.6,
    textTransform: 'uppercase',
    marginBottom: 10,
  },

  // Resources — inline list with color-coded cards
  resourceItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 12,
    paddingHorizontal: 14,
    marginBottom: 6,
    borderRadius: 12,
    borderWidth: 1,
  },
  resourceEmoji: {
    fontSize: 18,
  },
  resourceInfo: {
    flex: 1,
  },
  resourceTitle: {
    fontSize: 13,
    fontWeight: '500',
    color: 'rgba(255,255,255,0.95)',
    lineHeight: 18,
  },
  resourceSource: {
    fontSize: 10,
    color: 'rgba(255,255,255,0.3)',
    marginTop: 1,
  },

  // Template chips
  templateChips: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 12,
  },
  templateChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.04)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
  },
  templateChipActive: {
    backgroundColor: 'rgba(20, 184, 166, 0.10)',
    borderColor: 'rgba(20, 184, 166, 0.25)',
  },
  templateChipText: {
    fontSize: 12,
    fontWeight: '500',
    color: 'rgba(255,255,255,0.5)',
  },
  templateChipTextActive: {
    color: Colors.accent,
  },

  // Expanded template
  templateExpanded: {
    backgroundColor: 'rgba(20, 184, 166, 0.05)',
    borderRadius: 12,
    padding: 14,
    borderWidth: 1,
    borderColor: 'rgba(20, 184, 166, 0.25)',
    marginBottom: 8,
  },
  templateExpandedTitle: {
    fontSize: 12,
    fontWeight: '600',
    color: Colors.accent,
    marginBottom: 10,
  },
  phraseCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 10,
    marginBottom: 4,
    borderRadius: 8,
    backgroundColor: 'rgba(255,255,255,0.03)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.04)',
  },
  phraseText: {
    flex: 1,
    fontSize: 12,
    color: 'rgba(255,255,255,0.7)',
    lineHeight: 18,
    fontStyle: 'italic',
  },
  phraseCopy: {
    fontSize: 10,
    color: 'rgba(255,255,255,0.3)',
    marginLeft: 8,
  },

  // Crisis helpline card
  crisisCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    padding: 14,
    marginTop: 20,
    marginBottom: 32,
    borderRadius: 12,
    backgroundColor: 'rgba(251, 113, 133, 0.10)',
    borderWidth: 1,
    borderColor: 'rgba(251, 113, 133, 0.25)',
  },
  crisisIcon: {
    fontSize: 16,
  },
  crisisInfo: {
    flex: 1,
  },
  crisisTitle: {
    fontSize: 12,
    fontWeight: '600',
    color: '#FB7185',
  },
  crisisPhone: {
    fontSize: 11,
    color: 'rgba(255,255,255,0.5)',
    marginTop: 1,
  },
  crisisAction: {
    fontSize: 11,
    fontWeight: '600',
    color: '#FB7185',
  },
});
