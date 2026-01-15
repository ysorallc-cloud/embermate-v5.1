import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';

interface ReminderCardProps {
  enabled: boolean;
  onToggle: (enabled: boolean) => void;
  selectedTime: string;
  onTimeSelect: (time: string) => void;
}

const timeOptions = [
  { id: 'morning', label: '9 AM' },
  { id: 'afternoon', label: '2 PM' },
  { id: 'evening', label: '6 PM' },
  { id: 'night', label: '9 PM' },
];

export const SimplifiedReminderCard: React.FC<ReminderCardProps> = ({
  enabled,
  onToggle,
  selectedTime,
  onTimeSelect,
}) => {
  return (
    <View style={[styles.card, enabled && styles.cardActive]}>
      {/* Toggle Row - Single line, no subtitle */}
      <View style={styles.toggleRow}>
        <View style={styles.toggleLeft}>
          <Text style={styles.icon}>🔔</Text>
          <Text style={styles.title}>Daily Reminder</Text>
        </View>
        <TouchableOpacity
          style={[styles.toggle, enabled && styles.toggleOn]}
          onPress={() => onToggle(!enabled)}
          activeOpacity={0.8}
        >
          <View style={[styles.toggleThumb, enabled && styles.toggleThumbOn]} />
        </TouchableOpacity>
      </View>

      {/* Time Chips - Only visible when enabled */}
      {enabled && (
        <View style={styles.timeRow}>
          {timeOptions.map((time) => (
            <TouchableOpacity
              key={time.id}
              style={[
                styles.timeChip,
                selectedTime === time.id && styles.timeChipActive,
              ]}
              onPress={() => onTimeSelect(time.id)}
            >
              <Text
                style={[
                  styles.timeChipText,
                  selectedTime === time.id && styles.timeChipTextActive,
                ]}
              >
                {time.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  card: {
    backgroundColor: 'rgba(13, 148, 136, 0.06)',
    borderWidth: 1,
    borderColor: 'rgba(20, 184, 166, 0.15)',
    borderRadius: 14,
    padding: 14,
  },
  cardActive: {
    backgroundColor: 'rgba(245, 158, 11, 0.12)',
    borderColor: 'rgba(245, 158, 11, 0.3)',
  },
  toggleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  toggleLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  icon: {
    fontSize: 18,
  },
  title: {
    fontSize: 14,
    fontWeight: '500',
    color: '#FFFFFF',
  },
  toggle: {
    width: 44,
    height: 26,
    borderRadius: 13,
    backgroundColor: 'rgba(255, 255, 255, 0.12)',
    padding: 2,
    justifyContent: 'center',
  },
  toggleOn: {
    backgroundColor: '#F59E0B',
  },
  toggleThumb: {
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: 'rgba(255, 255, 255, 0.3)',
  },
  toggleThumbOn: {
    backgroundColor: '#FFFFFF',
    alignSelf: 'flex-end',
  },
  timeRow: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: 'rgba(245, 158, 11, 0.3)',
  },
  timeChip: {
    flex: 1,
    paddingVertical: 8,
    paddingHorizontal: 4,
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: 'rgba(245, 158, 11, 0.3)',
    borderRadius: 8,
    alignItems: 'center',
  },
  timeChipActive: {
    backgroundColor: 'rgba(245, 158, 11, 0.25)',
    borderColor: '#F59E0B',
  },
  timeChipText: {
    fontSize: 12,
    fontWeight: '600',
    color: 'rgba(255, 255, 255, 0.7)',
  },
  timeChipTextActive: {
    color: '#F59E0B',
  },
});
