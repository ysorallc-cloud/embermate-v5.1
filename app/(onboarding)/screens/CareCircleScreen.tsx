import React from 'react';
import { View, Text, StyleSheet, Dimensions } from 'react-native';
import Svg, { Circle } from 'react-native-svg';
import { AuroraBackground } from '../components/AuroraBackground';
import { GlassCard } from '../../../components/aurora/GlassCard';
import { Colors, Typography, Spacing } from '../../../theme/theme-tokens';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

const careMembers = [
  { emoji: '👤', label: 'You', position: 0 },
  { emoji: '👤', label: 'Sarah', position: 1 },
  { emoji: '🩺', label: 'Dr. Chen', position: 2 },
  { emoji: '❤️', label: 'Loved One', position: 3, isCenter: true },
];

export const CareCircleScreen: React.FC = () => {
  return (
    <View style={styles.container}>
      <AuroraBackground variant="connect" />

      <View style={styles.content}>
        {/* Title and subtitle */}
        <View style={styles.textContainer}>
          <Text style={styles.title}>Connect Your Care Circle</Text>
          <Text style={styles.subtitle}>
            Share insights with partners, family, and healthcare providers
          </Text>
        </View>

        {/* Care circle visualization */}
        <GlassCard style={styles.visualizationCard} glow="rgba(200, 100, 200, 0.5)">
          <View style={styles.circleContainer}>
            {/* SVG connecting lines */}
            <Svg height="240" width="240" style={styles.svg}>
              {/* Outer circle */}
              <Circle
                cx="120"
                cy="120"
                r="90"
                stroke="rgba(255, 255, 255, 0.2)"
                strokeWidth="1"
                fill="none"
                strokeDasharray="5,5"
              />

              {/* Connection lines from center to each member */}
              {[0, 1, 2].map((index) => {
                const angle = (index * 120 - 90) * (Math.PI / 180);
                const x = 120 + 90 * Math.cos(angle);
                const y = 120 + 90 * Math.sin(angle);
                return (
                  <React.Fragment key={index}>
                    <Circle
                      cx={x}
                      cy={y}
                      r="2"
                      fill="rgba(255, 150, 200, 0.6)"
                    />
                  </React.Fragment>
                );
              })}

              {/* Center circle */}
              <Circle
                cx="120"
                cy="120"
                r="4"
                fill="rgba(255, 150, 200, 0.8)"
              />
            </Svg>

            {/* Care member avatars */}
            {careMembers.map((member, index) => {
              if (member.isCenter) {
                return (
                  <View key={index} style={[styles.avatar, styles.centerAvatar]}>
                    <Text style={styles.avatarEmoji}>{member.emoji}</Text>
                    <Text style={styles.avatarLabel}>{member.label}</Text>
                  </View>
                );
              }

              const angle = (index * 120 - 90) * (Math.PI / 180);
              const radius = 90;
              const x = radius * Math.cos(angle);
              const y = radius * Math.sin(angle);

              return (
                <View
                  key={index}
                  style={[
                    styles.avatar,
                    styles.outerAvatar,
                    {
                      transform: [
                        { translateX: x },
                        { translateY: y },
                      ],
                    },
                  ]}
                >
                  <Text style={styles.avatarEmoji}>{member.emoji}</Text>
                  <Text style={styles.avatarLabel}>{member.label}</Text>
                </View>
              );
            })}
          </View>
        </GlassCard>

        {/* Description */}
        <Text style={styles.description}>
          Everyone stays informed, from medication schedules to doctor visits
        </Text>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    width: SCREEN_WIDTH,
    backgroundColor: Colors.background,
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    paddingHorizontal: Spacing.xxl,
  },
  textContainer: {
    alignItems: 'center',
    marginBottom: Spacing.xxxl,
  },
  title: {
    ...Typography.h1,
    color: Colors.textPrimary,
    textAlign: 'center',
    marginBottom: Spacing.lg,
  },
  subtitle: {
    ...Typography.body,
    color: Colors.textSecondary,
    textAlign: 'center',
  },
  visualizationCard: {
    marginBottom: Spacing.xxxl,
    paddingVertical: Spacing.xxl,
  },
  circleContainer: {
    height: 240,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  svg: {
    position: 'absolute',
  },
  avatar: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  centerAvatar: {
    position: 'absolute',
  },
  outerAvatar: {
    position: 'absolute',
  },
  avatarEmoji: {
    fontSize: 48,
    marginBottom: Spacing.xs,
  },
  avatarLabel: {
    ...Typography.caption,
    color: Colors.textSecondary,
    fontSize: 12,
  },
  description: {
    ...Typography.body,
    color: Colors.textSecondary,
    textAlign: 'center',
    fontStyle: 'italic',
  },
});

export default CareCircleScreen;
