// ============================================================================
// COFFEE MOMENT SCREEN - Refactored
// A peaceful break for caregivers with interactive breathing exercise
// ============================================================================

import React, { useState, useEffect, useRef } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Animated, Linking, Platform, Modal } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';

const AFFIRMATIONS = [
  { emoji: '🌟', text: 'You are doing an incredible job, even on the hard days.' },
  { emoji: '💪', text: 'Your strength and resilience make a profound difference.' },
  { emoji: '🌸', text: 'Taking care of yourself is taking care of those you love.' },
  { emoji: '🕊️', text: 'It\'s okay to rest. You deserve moments of peace.' },
  { emoji: '✨', text: 'Small steps forward are still progress worth celebrating.' },
  { emoji: '🌈', text: 'Your compassion is a gift to everyone around you.' },
  { emoji: '🦋', text: 'You are more capable than you know.' },
  { emoji: '🌺', text: 'Every breath you take is an act of courage.' },
];

const RESOURCES = [
  {
    title: "Managing Caregiver Stress",
    url: "https://www.nia.nih.gov/health/caregiving/taking-care-yourself-tips-caregivers",
    icon: "heart-outline"
  },
  {
    title: "Self-Care Strategies",
    url: "https://www.caregiver.org/resource/caregiver-self-care/",
    icon: "fitness-outline"
  },
  {
    title: "Finding Support Groups",
    url: "https://www.caregiver.org/connecting-caregivers/support-groups/",
    icon: "people-outline"
  },
  {
    title: "Recognizing Burnout",
    url: "https://www.helpguide.org/articles/stress/burnout-prevention-and-recovery.htm",
    icon: "alert-circle-outline"
  },
  {
    title: "Financial & Legal Planning",
    url: "https://www.aarp.org/caregiving/financial-legal/",
    icon: "document-text-outline"
  }
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

type BreathPhase = 'inhale' | 'hold' | 'exhale' | 'rest';

export default function CoffeeMoment() {
  const router = useRouter();
  const [isBreathing, setIsBreathing] = useState(false);
  const [breathPhase, setBreathPhase] = useState<BreathPhase>('rest');
  const [secondsRemaining, setSecondsRemaining] = useState(4);
  const [cyclesCompleted, setCyclesCompleted] = useState(0);
  const [expandedTemplate, setExpandedTemplate] = useState<string | null>(null);
  const [showResourcesModal, setShowResourcesModal] = useState(false);
  const [showTemplatesModal, setShowTemplatesModal] = useState(false);
  const [todaysAffirmation] = useState(AFFIRMATIONS[Math.floor(Math.random() * AFFIRMATIONS.length)]);

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

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <LinearGradient colors={['#0D1F1C', '#0A1412']} style={styles.gradient}>
        <View style={styles.header}>
          <Text style={styles.title}>Coffee Moment</Text>
          <TouchableOpacity onPress={() => router.back()} style={styles.closeButton}>
            <Ionicons name="close" size={28} color="rgba(255,255,255,0.95)" />
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
                ✨ {cyclesCompleted} breath cycle{cyclesCompleted !== 1 ? 's' : ''} completed
              </Text>
            )}
          </View>

          {/* Daily Affirmation */}
          <View style={styles.affirmationCard}>
            <Text style={styles.affirmationLabel}>Today's affirmation</Text>
            <Text style={styles.affirmationEmoji}>{todaysAffirmation.emoji}</Text>
            <Text style={styles.affirmationText}>{todaysAffirmation.text}</Text>
          </View>
        </ScrollView>

        {/* Fixed Bottom Action Bar */}
        <View style={styles.bottomActionBar}>
          <TouchableOpacity
            style={styles.actionButton}
            onPress={() => setShowResourcesModal(true)}
            activeOpacity={0.7}
          >
            <Text style={styles.actionButtonIcon}>📚</Text>
            <Text style={styles.actionButtonText}>Resources</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.actionButton}
            onPress={() => setShowTemplatesModal(true)}
            activeOpacity={0.7}
          >
            <Text style={styles.actionButtonIcon}>💬</Text>
            <Text style={styles.actionButtonText}>Templates</Text>
          </TouchableOpacity>
        </View>

        {/* Resources Modal */}
        <Modal
          visible={showResourcesModal}
          animationType="slide"
          transparent={true}
          onRequestClose={() => setShowResourcesModal(false)}
        >
          <View style={styles.modalOverlay}>
            <View style={styles.modalContent}>
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>📚 Helpful Resources</Text>
                <TouchableOpacity onPress={() => setShowResourcesModal(false)}>
                  <Ionicons name="close" size={28} color="rgba(255,255,255,0.95)" />
                </TouchableOpacity>
              </View>

              <ScrollView style={styles.modalScroll}>
                <Text style={styles.modalSubtitle}>
                  Articles and guides to support your caregiving journey
                </Text>

                <View style={styles.resourceList}>
                  {RESOURCES.map((resource, index) => (
                    <TouchableOpacity
                      key={index}
                      style={styles.resourceItem}
                      onPress={() => {
                        openLink(resource.url);
                        setShowResourcesModal(false);
                      }}
                      activeOpacity={0.7}
                    >
                      <View style={styles.resourceIcon}>
                        <Ionicons name={resource.icon as any} size={20} color="rgba(79, 209, 197, 0.9)" />
                      </View>
                      <Text style={styles.resourceTitle}>{resource.title}</Text>
                      <Ionicons name="chevron-forward" size={18} color="rgba(255,255,255,0.4)" />
                    </TouchableOpacity>
                  ))}
                </View>
              </ScrollView>
            </View>
          </View>
        </Modal>

        {/* Templates Modal */}
        <Modal
          visible={showTemplatesModal}
          animationType="slide"
          transparent={true}
          onRequestClose={() => setShowTemplatesModal(false)}
        >
          <View style={styles.modalOverlay}>
            <View style={styles.modalContent}>
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>💬 Communication Templates</Text>
                <TouchableOpacity onPress={() => setShowTemplatesModal(false)}>
                  <Ionicons name="close" size={28} color="rgba(255,255,255,0.95)" />
                </TouchableOpacity>
              </View>

              <ScrollView style={styles.modalScroll}>
                <Text style={styles.modalSubtitle}>
                  Ready-to-use phrases for common situations
                </Text>

                {TEMPLATES.map((template) => (
                  <View key={template.id} style={styles.templateContainer}>
                    <TouchableOpacity
                      style={[
                        styles.templateToggle,
                        expandedTemplate === template.id && styles.templateToggleActive,
                      ]}
                      onPress={() =>
                        setExpandedTemplate(
                          expandedTemplate === template.id ? null : template.id
                        )
                      }
                      activeOpacity={0.7}
                    >
                      <Ionicons
                        name={template.icon as any}
                        size={18}
                        color={expandedTemplate === template.id ? "rgba(79, 209, 197, 1)" : "rgba(79, 209, 197, 0.7)"}
                      />
                      <Text style={[
                        styles.templateToggleText,
                        expandedTemplate === template.id && styles.templateToggleTextActive,
                      ]}>
                        {template.title}
                      </Text>
                      <Ionicons
                        name={expandedTemplate === template.id ? "chevron-up" : "chevron-down"}
                        size={20}
                        color="rgba(255,255,255,0.6)"
                      />
                    </TouchableOpacity>

                    {expandedTemplate === template.id && (
                      <View style={styles.templatePhrases}>
                        {template.phrases.map((phrase, index) => (
                          <View key={index} style={styles.phraseCard}>
                            <Text style={styles.phraseText}>"{phrase}"</Text>
                          </View>
                        ))}
                      </View>
                    )}
                  </View>
                ))}
              </ScrollView>
            </View>
          </View>
        </Modal>
      </LinearGradient>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0D1F1C'
  },
  gradient: {
    flex: 1
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
    color: 'rgba(255,255,255,0.95)'
  },
  closeButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.05)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  scroll: {
    flex: 1,
    paddingHorizontal: Platform.OS === 'web' ? 32 : 20
  },
  scrollContent: {
    paddingBottom: 100, // Space for fixed bottom bar
  },
  subtitle: {
    fontSize: Platform.OS === 'web' ? 17 : 15,
    color: 'rgba(255,255,255,0.75)',
    marginBottom: Platform.OS === 'web' ? 32 : 24
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
    color: 'rgba(255,255,255,0.95)',
    marginBottom: 4,
  },
  orbSubtext: {
    fontSize: 10,
    color: 'rgba(255,255,255,0.7)',
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

  // Daily Affirmation Card
  affirmationCard: {
    backgroundColor: 'rgba(79, 209, 197, 0.08)',
    borderRadius: 16,
    padding: 24,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(79, 209, 197, 0.15)',
    marginBottom: 20,
  },
  affirmationLabel: {
    fontSize: 11,
    textTransform: 'uppercase',
    letterSpacing: 1,
    color: 'rgba(79, 209, 197, 0.8)',
    marginBottom: 12,
    fontWeight: '600',
  },
  affirmationEmoji: {
    fontSize: 48,
    marginBottom: 16,
  },
  affirmationText: {
    fontSize: 16,
    lineHeight: 24,
    color: 'rgba(255,255,255,0.9)',
    textAlign: 'center',
    fontStyle: 'italic',
    fontFamily: Platform.OS === 'ios' ? 'Georgia' : 'serif',
  },

  // Fixed Bottom Action Bar
  bottomActionBar: {
    flexDirection: 'row',
    gap: 12,
    paddingHorizontal: 20,
    paddingVertical: 16,
    paddingBottom: Platform.OS === 'ios' ? 24 : 16,
    backgroundColor: 'rgba(13, 31, 28, 0.95)',
    borderTopWidth: 1,
    borderTopColor: 'rgba(79, 209, 197, 0.15)',
  },
  actionButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: 'rgba(79, 209, 197, 0.08)',
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(79, 209, 197, 0.2)',
  },
  actionButtonIcon: {
    fontSize: 20,
  },
  actionButtonText: {
    fontSize: 15,
    fontWeight: '600',
    color: 'rgba(255,255,255,0.9)',
  },

  // Modal Styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#0D1F1C',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingTop: 20,
    maxHeight: '85%',
    borderTopWidth: 1,
    borderTopColor: 'rgba(79, 209, 197, 0.2)',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(79, 209, 197, 0.15)',
  },
  modalTitle: {
    fontSize: 22,
    fontWeight: '600',
    color: 'rgba(255,255,255,0.95)',
  },
  modalScroll: {
    paddingHorizontal: 20,
    paddingTop: 20,
  },
  modalSubtitle: {
    fontSize: 13,
    color: 'rgba(255,255,255,0.7)',
    marginBottom: 16,
    lineHeight: 18,
  },

  // Resources (in modal)
  resourceList: {
    gap: 8,
    paddingBottom: 20,
  },
  resourceItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: 'rgba(79, 209, 197, 0.08)',
    padding: 14,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: 'rgba(79, 209, 197, 0.2)',
  },
  resourceIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(79, 209, 197, 0.15)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  resourceTitle: {
    flex: 1,
    fontSize: 14,
    color: 'rgba(255,255,255,0.9)',
    fontWeight: '500',
  },

  // Communication Templates (in modal)
  templateContainer: {
    marginBottom: 8,
  },
  templateToggle: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: 'rgba(79, 209, 197, 0.08)',
    borderRadius: 10,
    padding: 14,
    borderWidth: 1,
    borderColor: 'rgba(79, 209, 197, 0.2)',
  },
  templateToggleActive: {
    backgroundColor: 'rgba(79, 209, 197, 0.15)',
    borderColor: 'rgba(79, 209, 197, 0.4)',
  },
  templateToggleText: {
    flex: 1,
    fontSize: 14,
    fontWeight: '500',
    color: 'rgba(255,255,255,0.75)',
  },
  templateToggleTextActive: {
    color: 'rgba(255,255,255,0.95)',
  },
  templatePhrases: {
    marginTop: 8,
    gap: 8,
    paddingLeft: 12,
  },
  phraseCard: {
    backgroundColor: 'rgba(0, 0, 0, 0.3)',
    borderRadius: 8,
    padding: 12,
    borderLeftWidth: 2,
    borderLeftColor: 'rgba(79, 209, 197, 0.6)',
  },
  phraseText: {
    fontSize: 13,
    color: 'rgba(255,255,255,0.85)',
    lineHeight: 20,
    fontStyle: 'italic',
  },
});
