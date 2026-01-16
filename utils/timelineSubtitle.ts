// ============================================================================
// TIMELINE SUBTITLE UTILITIES
// Generate dynamic subtitles based on status
// ============================================================================

import { TimelineItem } from '../types/timeline';

export const getSubtitle = (item: TimelineItem, now: Date): string => {
  switch (item.status) {
    case 'done':
      return getCompletedSubtitle(item);
    case 'overdue':
      return getOverdueSubtitle(item, now);
    case 'next':
    case 'upcoming':
      return getPendingSubtitle(item);
  }
};

const getCompletedSubtitle = (item: TimelineItem): string => {
  switch (item.type) {
    case 'medication':
      const count = item.medicationIds?.length || 0;
      return `${count} taken`;
    case 'wellness-morning':
    case 'wellness-evening':
      return 'Completed';
    case 'vitals':
      return 'Logged';
    case 'appointment':
      return 'Completed';
    default:
      return 'Done';
  }
};

const getOverdueSubtitle = (item: TimelineItem, now: Date): string => {
  const diffMs = now.getTime() - item.scheduledTime.getTime();
  const diffMins = Math.floor(diffMs / 60000);

  if (diffMins < 60) {
    return `${diffMins} min overdue`;
  }

  const diffHours = Math.floor(diffMins / 60);
  if (diffHours === 1) {
    return '1 hr overdue';
  }

  return `${diffHours} hrs overdue`;
};

const getPendingSubtitle = (item: TimelineItem): string => {
  switch (item.type) {
    case 'medication':
      const count = item.medicationIds?.length || 0;
      return `${count} to take`;
    case 'wellness-morning':
    case 'wellness-evening':
      return item.wellnessChecks?.join(', ') || 'Check in';
    case 'vitals':
      return item.vitalTypes?.map((v) => v.toUpperCase()).join(', ') || 'Log vitals';
    case 'appointment':
      return item.subtitle; // Location or doctor specialty
    default:
      return '';
  }
};
