import { getUpcomingAppointments } from './appointmentStorage';

export interface ProviderPrepQuestion {
  id: string;
  question: string;
  category: string;
}

export interface ProviderPrepData {
  appointment: {
    date: string;
    provider: string;
    specialty: string;
    daysUntil: number;
  };
  questions: ProviderPrepQuestion[];
}

export async function buildProviderPrep(
  standOutInsights: Array<{ category: string; summary: string }> = []
): Promise<ProviderPrepData | null> {
  const appointments = await getUpcomingAppointments();
  if (!appointments || appointments.length === 0) return null;

  const next = appointments[0];
  const apptDate = new Date(next.date);
  const now = new Date();
  const daysUntil = Math.max(0, Math.ceil((apptDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)));

  // Only prep for appointments within the next 7 days
  if (daysUntil > 7) return null;

  const questions: ProviderPrepQuestion[] = [];

  // Generate questions from stand-out insights
  for (const insight of standOutInsights.slice(0, 3)) {
    if (insight.category === 'medication') {
      questions.push({
        id: `med-${questions.length}`,
        question: `I've noticed changes in medication patterns — ${insight.summary}. Should we adjust?`,
        category: 'medication',
      });
    } else if (insight.category === 'sleep') {
      questions.push({
        id: `sleep-${questions.length}`,
        question: `Sleep has been inconsistent recently — ${insight.summary}. Any recommendations?`,
        category: 'sleep',
      });
    } else if (insight.category === 'mood') {
      questions.push({
        id: `mood-${questions.length}`,
        question: `There have been mood changes — ${insight.summary}. Is this something to monitor?`,
        category: 'mood',
      });
    } else {
      questions.push({
        id: `general-${questions.length}`,
        question: `We've observed: ${insight.summary}. Should this affect the care plan?`,
        category: insight.category,
      });
    }
  }

  // Add a default question if none generated
  if (questions.length === 0) {
    questions.push({
      id: 'default-0',
      question: 'Are there any changes to the current care plan we should discuss?',
      category: 'general',
    });
  }

  return {
    appointment: {
      date: next.date,
      provider: next.provider || 'Provider',
      specialty: next.specialty || 'Appointment',
      daysUntil,
    },
    questions,
  };
}
