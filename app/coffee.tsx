// ============================================================================
// COFFEE MOMENT SCREEN
// A peaceful break for caregivers with interactive breathing exercise
// ============================================================================

import React, { useState, useEffect, useRef } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Animated, Linking, Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';

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
          toValue: 1.5,
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

  const getPhaseText = () => {
    switch (breathPhase) {
      case 'inhale': return 'Breathe In';
      case 'hold': return 'Hold';
      case 'exhale': return 'Breathe Out';
      default: return 'Ready to Begin';
    }
  };

  const getPhaseInstruction = () => {
    switch (breathPhase) {
      case 'inhale': return 'Inhale deeply through your nose';
      case 'hold': return 'Hold your breath gently';
      case 'exhale': return 'Exhale slowly through your mouth';
      default: return 'Tap "Start" to begin your breathing exercise';
    }
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
          
          {/* Breathing Exercise */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>🫁 Breathing Exercise</Text>
            
            <View style={styles.breathingContainer}>
              <Animated.View 
                style={[
                  styles.breathingCircle,
                  {
                    transform: [{ scale: scaleAnim }],
                    opacity: opacityAnim,
                  }
                ]}
              />
              
              <View style={styles.breathingTextContainer}>
                <Text style={styles.phaseText}>{getPhaseText()}</Text>
                {isBreathing && (
                  <Text style={styles.timerText}>{secondsRemaining}</Text>
                )}
                <Text style={styles.instructionText}>{getPhaseInstruction()}</Text>
              </View>
            </View>

            <View style={styles.breathingControls}>
              {!isBreathing ? (
                <TouchableOpacity 
                  style={styles.breathingButton}
                  onPress={startBreathing}
                >
                  <Ionicons name="play" size={24} color="#fff" />
                  <Text style={styles.breathingButtonText}>Start</Text>
                </TouchableOpacity>
              ) : (
                <TouchableOpacity 
                  style={[styles.breathingButton, styles.stopButton]}
                  onPress={stopBreathing}
                >
                  <Ionicons name="stop" size={24} color="#fff" />
                  <Text style={styles.breathingButtonText}>Stop</Text>
                </TouchableOpacity>
              )}
            </View>

            {cyclesCompleted > 0 && (
              <Text style={styles.cyclesText}>
                {cyclesCompleted} breath cycle{cyclesCompleted !== 1 ? 's' : ''} completed
              </Text>
            )}
          </View>

          {/* Caregiver Resources */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>📚 Helpful Resources</Text>
            <Text style={styles.resourcesSubtitle}>
              Articles and guides to support your caregiving journey
            </Text>
            
            <View style={styles.resourceList}>
              {RESOURCES.map((resource, index) => (
                <TouchableOpacity
                  key={index}
                  style={styles.resourceItem}
                  onPress={() => openLink(resource.url)}
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
          </View>

          {/* Communication Templates */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>💬 Communication Templates</Text>
            <Text style={styles.templatesSubtitle}>
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
          </View>
        </ScrollView>
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
    paddingBottom: Platform.OS === 'web' ? 60 : 40,
  },
  subtitle: {
    fontSize: Platform.OS === 'web' ? 17 : 15,
    color: 'rgba(255,255,255,0.75)',
    marginBottom: Platform.OS === 'web' ? 32 : 24
  },
  section: {
    padding: Platform.OS === 'web' ? 28 : 20,
    backgroundColor: 'rgba(79, 209, 197, 0.08)',
    borderRadius: Platform.OS === 'web' ? 16 : 12,
    marginBottom: Platform.OS === 'web' ? 20 : 16,
    borderWidth: 1,
    borderColor: 'rgba(79, 209, 197, 0.15)',
  },
  sectionTitle: {
    fontSize: Platform.OS === 'web' ? 22 : 18,
    fontWeight: '600',
    color: 'rgba(255,255,255,0.95)',
    marginBottom: Platform.OS === 'web' ? 20 : 16
  },
  
  // Breathing Exercise
  breathingContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    height: Platform.OS === 'web' ? 350 : 280,
    position: 'relative',
  },
  breathingCircle: {
    position: 'absolute',
    width: Platform.OS === 'web' ? 160 : 120,
    height: Platform.OS === 'web' ? 160 : 120,
    borderRadius: Platform.OS === 'web' ? 80 : 60,
    backgroundColor: 'rgba(79, 209, 197, 0.25)',
    borderWidth: 2,
    borderColor: 'rgba(79, 209, 197, 0.5)',
  },
  breathingTextContainer: {
    alignItems: 'center',
    zIndex: 1,
  },
  phaseText: {
    fontSize: Platform.OS === 'web' ? 32 : 24,
    fontWeight: '600',
    color: 'rgba(255,255,255,0.95)',
    marginBottom: Platform.OS === 'web' ? 12 : 8,
  },
  timerText: {
    fontSize: Platform.OS === 'web' ? 64 : 48,
    fontWeight: '300',
    color: 'rgba(79, 209, 197, 1)',
    marginBottom: Platform.OS === 'web' ? 20 : 16,
  },
  instructionText: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.7)',
    textAlign: 'center',
    paddingHorizontal: 20,
  },
  breathingControls: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginTop: 20,
    gap: 12,
  },
  breathingButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: 'rgba(79, 209, 197, 0.3)',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 24,
    borderWidth: 1,
    borderColor: 'rgba(79, 209, 197, 0.5)',
  },
  stopButton: {
    backgroundColor: 'rgba(239, 68, 68, 0.3)',
    borderColor: 'rgba(239, 68, 68, 0.5)',
  },
  breathingButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: 'rgba(255,255,255,0.95)',
  },
  cyclesText: {
    fontSize: 13,
    color: 'rgba(79, 209, 197, 0.9)',
    textAlign: 'center',
    marginTop: 12,
  },

  // Resources
  resourcesSubtitle: {
    fontSize: 13,
    color: 'rgba(255,255,255,0.7)',
    marginBottom: 12,
    lineHeight: 18,
  },
  resourceList: {
    gap: 8,
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

  // Communication Templates
  templatesSubtitle: {
    fontSize: 13,
    color: 'rgba(255,255,255,0.7)',
    marginBottom: 12,
    lineHeight: 18,
  },
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
