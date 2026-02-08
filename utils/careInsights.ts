// ============================================================================
// CARE INSIGHT & AI INSIGHT GENERATORS
// Pure functions - no React hooks needed
// ============================================================================

import type { TodayStats, CareInsight, AIInsight } from './nowHelpers';
import type { Appointment } from './appointmentStorage';
import type { Medication } from './medicationStorage';

// ============================================================================
// CARE INSIGHT GENERATOR
// Rules:
// ✅ Pattern awareness, preventative suggestions, positive reinforcement, dependency awareness
// ❌ Countdown reminders, "not logged" warnings, urgency alerts, fear-based language
// ============================================================================

export function generateCareInsight(
  stats: TodayStats,
  instances: any[],
  completedCount: number,
  consecutiveLoggingDays: number = 0
): CareInsight | null {
  const insights: CareInsight[] = [];
  const now = new Date();
  const currentHour = now.getHours();

  // Calculate some useful metrics
  const totalItems = stats.meds.total + stats.vitals.total + stats.mood.total + stats.meals.total;
  const totalCompleted = stats.meds.completed + stats.vitals.completed + stats.mood.completed + stats.meals.completed;
  const completionRate = totalItems > 0 ? totalCompleted / totalItems : 0;

  // Check for vitals + medication dependency pattern
  const hasPendingMeds = instances.some(i => i.itemType === 'medication' && i.status === 'pending');
  const hasVitalsNotLogged = stats.vitals.total > 0 && stats.vitals.completed === 0;
  const hasBPMedication = instances.some(i =>
    i.itemType === 'medication' &&
    i.itemName.toLowerCase().includes('blood pressure') ||
    i.itemName.toLowerCase().includes('lisinopril') ||
    i.itemName.toLowerCase().includes('amlodipine') ||
    i.itemName.toLowerCase().includes('metoprolol')
  );

  // DEPENDENCY AWARENESS: Vitals before BP medication
  if (hasBPMedication && hasVitalsNotLogged && hasPendingMeds && currentHour >= 6 && currentHour < 12) {
    insights.push({
      icon: '📊',
      title: 'A quick check first',
      message: 'Logging vitals before blood pressure medication helps track how well it\'s working.',
      type: 'dependency',
      confidence: 0.8,
    });
  }

  // PATTERN AWARENESS: Morning medication timing
  if (stats.meds.total > 0 && stats.meds.completed === 0 && currentHour >= 9 && currentHour < 11) {
    const morningMeds = instances.filter(i =>
      i.itemType === 'medication' && i.status === 'pending' &&
      new Date(i.scheduledTime).getHours() < 12
    );
    if (morningMeds.length > 0) {
      insights.push({
        icon: '💊',
        title: 'Consistent timing helps',
        message: 'Taking medications at the same time each day can improve their effectiveness.',
        type: 'pattern',
        confidence: 0.75,
      });
    }
  }

  // PREVENTATIVE: Logging vitals helps detect changes
  if (stats.vitals.total > 0 && stats.vitals.completed > 0 && stats.meds.total > 0) {
    insights.push({
      icon: '📈',
      title: 'Building your baseline',
      message: 'Regular vitals logging helps detect dosage changes early.',
      type: 'preventative',
      confidence: 0.7,
    });
  }

  // REINFORCEMENT: Consistent logging streak
  if (consecutiveLoggingDays >= 3) {
    insights.push({
      icon: '✨',
      title: 'Great consistency',
      message: `You've logged consistently for ${consecutiveLoggingDays} days. That builds strong health baselines.`,
      type: 'reinforcement',
      confidence: 0.9,
    });
  }

  // REINFORCEMENT: Good progress today
  if (completionRate >= 0.5 && completionRate < 1.0 && totalCompleted >= 3) {
    insights.push({
      icon: '👍',
      title: 'Solid progress today',
      message: 'You\'re over halfway through today\'s care tasks.',
      type: 'reinforcement',
      confidence: 0.8,
    });
  }

  // REINFORCEMENT: All complete celebration (soft version)
  if (completionRate === 1.0 && totalItems > 0) {
    insights.push({
      icon: '✓',
      title: 'Today\'s care complete',
      message: 'All scheduled tasks are logged. Great work.',
      type: 'reinforcement',
      confidence: 1.0,
    });
  }

  // PREVENTATIVE: Meal logging for medication absorption
  if (stats.meals.total > 0 && stats.meals.completed === 0 && stats.meds.total > 0 && currentHour >= 12) {
    insights.push({
      icon: '🍽️',
      title: 'Food and medication',
      message: 'Some medications work better with food. Logging meals helps track this.',
      type: 'preventative',
      confidence: 0.65,
    });
  }

  // PATTERN AWARENESS: Mood affects medication adherence
  if (stats.mood.total > 0 && stats.mood.completed > 0) {
    insights.push({
      icon: '😊',
      title: 'Mood tracking helps',
      message: 'Mood patterns can reveal how medications are affecting daily life.',
      type: 'pattern',
      confidence: 0.7,
    });
  }

  // Filter to only high-confidence insights (>= 0.6 threshold)
  const highConfidenceInsights = insights.filter(i => i.confidence >= 0.6);

  // Return the highest confidence insight
  if (highConfidenceInsights.length > 0) {
    highConfidenceInsights.sort((a, b) => b.confidence - a.confidence);
    return highConfidenceInsights[0];
  }

  return null;
}

// ============================================================================
// AI INSIGHT GENERATOR
// Arbitrates between Progress and Timeline data
// All data must come from instancesState to ensure consistency
// ============================================================================

export function generateAIInsight(
  stats: TodayStats,
  moodLevel: number | null,
  todayAppointments: Appointment[],
  meds: Medication[],
  timelineOverdue: number = 0,
  timelineUpcoming: number = 0,
  timelineCompleted: number = 0,
  eveningMedsRemaining: number = 0
): AIInsight | null {
  const now = new Date();
  const currentHour = now.getHours();
  const insights: AIInsight[] = [];

  const totalLogged = stats.meds.completed + stats.vitals.completed + stats.mood.completed + stats.meals.completed;
  const medsRemaining = stats.meds.total - stats.meds.completed;

  // REMINDER: Overdue items - highest priority
  if (timelineOverdue > 0) {
    insights.push({
      icon: '⏰',
      title: timelineOverdue === 1 ? '1 item overdue' : `${timelineOverdue} items overdue`,
      message: 'Tap above to log or adjust.',
      type: 'reminder',
    });
  }

  // CELEBRATION: All timeline items complete
  if (timelineOverdue === 0 && timelineUpcoming === 0 && timelineCompleted > 0) {
    insights.push({
      icon: '✓',
      title: 'All done for today',
      message: `${timelineCompleted} item${timelineCompleted > 1 ? 's' : ''} logged.`,
      type: 'celebration',
    });
  }

  // CELEBRATION: Strong progress (legacy system)
  if (timelineCompleted === 0 && stats.meds.completed === stats.meds.total && stats.meds.total > 0 &&
      stats.mood.completed > 0 && stats.meals.completed >= 3) {
    insights.push({
      icon: '✓',
      title: 'All done for today',
      message: 'Meds, mood, and meals logged.',
      type: 'celebration',
    });
  }

  // REMINDER: Upcoming appointment
  if (todayAppointments.length > 0) {
    const nextAppt = todayAppointments[0];
    const apptTime = nextAppt.time ? ` at ${nextAppt.time}` : '';
    insights.push({
      icon: '📅',
      title: `${nextAppt.specialty || 'Appointment'}${apptTime}`,
      message: `With ${nextAppt.provider}. Recent logs help.`,
      type: 'reminder',
    });
  }

  // REMINDER: Evening medications
  if (currentHour >= 16 && currentHour < 20 && eveningMedsRemaining > 0) {
    insights.push({
      icon: '💊',
      title: `${eveningMedsRemaining} evening med${eveningMedsRemaining > 1 ? 's' : ''} remaining`,
      message: 'Consistent timing helps.',
      type: 'reminder',
    });
  }

  // POSITIVE: Medications complete
  if (stats.meds.completed > 0 && stats.meds.completed === stats.meds.total && stats.meds.total > 0) {
    insights.push({
      icon: '💊',
      title: 'Medications complete',
      message: `All ${stats.meds.total} logged today.`,
      type: 'positive',
    });
  }

  // SUGGESTION: Morning medications pending
  if (currentHour >= 6 && currentHour < 11 && medsRemaining > 0 && stats.meds.total > 0) {
    insights.push({
      icon: '💊',
      title: `${medsRemaining} medication${medsRemaining > 1 ? 's' : ''} not logged`,
      message: 'Tap Record to log.',
      type: 'suggestion',
    });
  }

  // SUGGESTION: Lunch not logged
  if (currentHour >= 12 && currentHour < 15 && stats.meals.completed < 2) {
    insights.push({
      icon: '🍽️',
      title: 'Lunch not logged yet',
      message: 'Quick note helps track appetite.',
      type: 'suggestion',
    });
  }

  // SUGGESTION: Mood not logged
  if (currentHour >= 14 && stats.mood.completed === 0) {
    insights.push({
      icon: '😊',
      title: 'Mood not logged yet',
      message: 'A quick check-in helps spot patterns.',
      type: 'suggestion',
    });
  }

  // SUGGESTION: Vitals not logged
  if (currentHour >= 10 && stats.vitals.completed === 0 && stats.vitals.total > 0) {
    insights.push({
      icon: '📊',
      title: 'Vitals not logged yet',
      message: 'Regular readings build a baseline.',
      type: 'suggestion',
    });
  }

  // SUGGESTION: No data yet today
  if (totalLogged === 0 && currentHour >= 8) {
    insights.push({
      icon: '📋',
      title: 'Nothing logged yet today',
      message: 'Start with whatever feels natural.',
      type: 'suggestion',
    });
  }

  // POSITIVE: Good progress with items remaining
  const progressPercent = (stats.meds.total > 0 ? stats.meds.completed / stats.meds.total : 0) +
                         (stats.vitals.total > 0 ? stats.vitals.completed / stats.vitals.total : 0) +
                         (stats.mood.total > 0 ? stats.mood.completed / stats.mood.total : 0) +
                         (stats.meals.total > 0 ? stats.meals.completed / stats.meals.total : 0);
  const avgProgress = progressPercent / 4;
  if (avgProgress >= 0.5 && timelineUpcoming > 0 && timelineOverdue === 0) {
    insights.push({
      icon: '📋',
      title: `${timelineUpcoming} item${timelineUpcoming > 1 ? 's' : ''} left today`,
      message: 'Over halfway done.',
      type: 'positive',
    });
  }

  // POSITIVE: Meals well tracked
  if (stats.meals.completed >= 3) {
    insights.push({
      icon: '🍽️',
      title: `${stats.meals.completed} meals logged`,
      message: 'Helps track appetite patterns.',
      type: 'positive',
    });
  }

  // POSITIVE: Vitals captured
  if (stats.vitals.completed >= 2) {
    insights.push({
      icon: '📊',
      title: `${stats.vitals.completed} vitals recorded`,
      message: 'Building a useful baseline.',
      type: 'positive',
    });
  }

  // Return the most relevant insight
  const priorityOrder = ['reminder', 'celebration', 'suggestion', 'positive'];
  for (const priority of priorityOrder) {
    const match = insights.find(i => i.type === priority);
    if (match) return match;
  }
  return null;
}
