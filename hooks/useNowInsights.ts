// ============================================================================
// useNowInsights - Manages AI insight and Care insight state + regeneration
// ============================================================================

import { useState, useEffect } from 'react';
import type { TodayStats, AIInsight, CareInsight } from '../utils/nowHelpers';
import { isOverdue } from '../utils/nowHelpers';
import { generateCareInsight, generateAIInsight } from '../utils/careInsights';
import type { Medication } from '../utils/medicationStorage';
import type { Appointment } from '../utils/appointmentStorage';

export function useNowInsights(
  todayStats: TodayStats,
  instancesState: any,
  today: string,
  medications: Medication[],
  appointments: Appointment[],
  dailyTracking: any
) {
  const [aiInsight, setAiInsight] = useState<AIInsight | null>(null);
  const [careInsight, setCareInsight] = useState<CareInsight | null>(null);

  // Regenerate AI Insight when stats or timeline change
  useEffect(() => {
    if (!medications) return;

    let overdueCount = 0;
    let upcomingCount = 0;
    let completedCount = 0;
    let eveningMedsRemaining = 0;

    if (instancesState?.instances && instancesState.date === today) {
      overdueCount = instancesState.instances.filter((i: any) => i.status === 'pending' && isOverdue(i.scheduledTime)).length;
      upcomingCount = instancesState.instances.filter((i: any) => i.status === 'pending' && !isOverdue(i.scheduledTime)).length;
      completedCount = instancesState.instances.filter((i: any) => i.status === 'completed' || i.status === 'skipped').length;

      eveningMedsRemaining = instancesState.instances.filter((i: any) => {
        if (i.itemType !== 'medication' || i.status !== 'pending') return false;
        const scheduledDate = new Date(i.scheduledTime);
        const hour = scheduledDate.getHours();
        return hour >= 16 && hour < 22;
      }).length;
    }

    const todayAppts = appointments.filter(appt => {
      const apptDate = new Date(appt.date);
      return apptDate.toDateString() === new Date().toDateString();
    });

    const moodLevel = dailyTracking?.mood ?? null;

    const insight = generateAIInsight(
      todayStats,
      moodLevel,
      todayAppts,
      medications,
      overdueCount,
      upcomingCount,
      completedCount,
      eveningMedsRemaining
    );
    setAiInsight(insight);
  }, [todayStats, instancesState, today, medications, appointments, dailyTracking]);

  // Generate Care Insight when stats or instances change
  useEffect(() => {
    const instances = instancesState?.instances || [];
    const completedCount = instances.filter(
      (i: any) => i.status === 'completed' || i.status === 'skipped'
    ).length;

    const consecutiveLoggingDays = 0; // Placeholder - could be enhanced with actual tracking

    const insight = generateCareInsight(
      todayStats,
      instances,
      completedCount,
      consecutiveLoggingDays
    );
    setCareInsight(insight);
  }, [todayStats, instancesState]);

  return { aiInsight, careInsight };
}
