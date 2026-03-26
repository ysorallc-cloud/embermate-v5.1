// ============================================================================
// RESOURCES LIST — Expandable caregiver resource categories
// 5 categories with 3-4 resource links each
// ============================================================================

import React, { useState, useMemo } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Linking,
} from 'react-native';
import { useTheme } from '../../contexts/ThemeContext';

// ============================================================================
// RESOURCE DATA
// ============================================================================

export interface ResourceLink {
  title: string;
  description: string;
  url?: string;
}

export interface ResourceCategory {
  id: string;
  title: string;
  emoji: string;
  description: string;
  links: ResourceLink[];
}

export const RESOURCE_CATEGORIES: ResourceCategory[] = [
  {
    id: 'financial',
    title: 'Financial help',
    emoji: '💰',
    description: 'Benefits, tax credits, and financial assistance',
    links: [
      { title: 'Family & Medical Leave Act (FMLA)', description: 'Job-protected unpaid leave for caregivers' },
      { title: 'Medicaid Home & Community Services', description: 'State-funded in-home care support' },
      { title: 'Veterans Aid & Attendance', description: 'Benefits for veterans and their caregivers' },
      { title: 'Tax deductions for caregivers', description: 'Medical expenses, dependent care credits' },
    ],
  },
  {
    id: 'respite',
    title: 'Respite care',
    emoji: '🏡',
    description: 'Temporary relief from caregiving duties',
    links: [
      { title: 'ARCH National Respite Network', description: 'Find respite care in your area' },
      { title: 'Adult day care centers', description: 'Daytime supervision and activities' },
      { title: 'In-home respite services', description: 'Trained caregivers come to your home' },
    ],
  },
  {
    id: 'legal',
    title: 'Legal & planning',
    emoji: '📋',
    description: 'Advance directives, power of attorney, estate planning',
    links: [
      { title: 'Advance healthcare directives', description: 'Document care preferences' },
      { title: 'Power of attorney', description: 'Legal authority for medical/financial decisions' },
      { title: 'Elder law attorneys', description: 'Specialists in aging and disability law' },
      { title: 'Long-term care planning', description: 'Insurance, Medicaid planning, living arrangements' },
    ],
  },
  {
    id: 'condition',
    title: 'Condition guides',
    emoji: '📖',
    description: 'Educational resources by condition',
    links: [
      { title: 'Alzheimer\'s Association', description: 'Dementia care guidance and support groups' },
      { title: 'American Heart Association', description: 'Heart disease and stroke resources' },
      { title: 'American Diabetes Association', description: 'Diabetes management education' },
      { title: 'National Cancer Institute', description: 'Cancer care and treatment information' },
    ],
  },
  {
    id: 'community',
    title: 'Community',
    emoji: '🤝',
    description: 'Connect with other caregivers',
    links: [
      { title: 'Caregiver Action Network', description: 'Education, peer support, and advocacy' },
      { title: 'Family Caregiver Alliance', description: 'Services by state, online support groups' },
      { title: 'Local caregiver support groups', description: 'In-person and virtual meetups' },
    ],
  },
];

// ============================================================================
// COMPONENT
// ============================================================================

export function ResourcesList() {
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const toggleCategory = (id: string) => {
    setExpandedId(prev => prev === id ? null : id);
  };

  return (
    <View style={styles.container}>
      {RESOURCE_CATEGORIES.map((cat) => {
        const isExpanded = expandedId === cat.id;
        return (
          <View key={cat.id} style={styles.categoryCard}>
            <TouchableOpacity
              style={styles.categoryHeader}
              onPress={() => toggleCategory(cat.id)}
              activeOpacity={0.7}
              accessibilityRole="button"
              accessibilityLabel={`${cat.title}, ${isExpanded ? 'expanded' : 'collapsed'}`}
              accessibilityState={{ expanded: isExpanded }}
            >
              <Text style={styles.categoryEmoji}>{cat.emoji}</Text>
              <View style={styles.categoryInfo}>
                <Text style={styles.categoryTitle}>{cat.title}</Text>
                <Text style={styles.categoryDesc} numberOfLines={1}>{cat.description}</Text>
              </View>
              <Text style={styles.chevron}>{isExpanded ? '▾' : '›'}</Text>
            </TouchableOpacity>

            {isExpanded && (
              <View style={styles.linksList}>
                {cat.links.map((link, i) => (
                  <TouchableOpacity
                    key={i}
                    style={[styles.linkRow, i < cat.links.length - 1 && styles.linkRowBorder]}
                    onPress={() => link.url ? Linking.openURL(link.url) : undefined}
                    activeOpacity={link.url ? 0.7 : 1}
                    accessibilityLabel={`${link.title}: ${link.description}`}
                  >
                    <Text style={styles.linkTitle}>{link.title}</Text>
                    <Text style={styles.linkDesc}>{link.description}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            )}
          </View>
        );
      })}
    </View>
  );
}

// ============================================================================
// STYLES
// ============================================================================

function createStyles(c: any) {
  return StyleSheet.create({
    container: {
      gap: 8,
    },
    categoryCard: {
      backgroundColor: c.glass,
      borderWidth: 1,
      borderColor: c.glassBorder,
      borderRadius: 14,
      overflow: 'hidden',
    },
    categoryHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      padding: 14,
      gap: 12,
    },
    categoryEmoji: {
      fontSize: 22,
    },
    categoryInfo: {
      flex: 1,
    },
    categoryTitle: {
      fontSize: 15,
      fontWeight: '600',
      color: c.textPrimary,
      marginBottom: 2,
    },
    categoryDesc: {
      fontSize: 12,
      color: c.textMuted,
    },
    chevron: {
      fontSize: 16,
      color: c.textMuted,
    },
    linksList: {
      paddingHorizontal: 14,
      paddingBottom: 12,
    },
    linkRow: {
      paddingVertical: 10,
      paddingLeft: 34,
    },
    linkRowBorder: {
      borderBottomWidth: 1,
      borderBottomColor: c.glassFaint,
    },
    linkTitle: {
      fontSize: 14,
      fontWeight: '500',
      color: c.textPrimary,
      marginBottom: 2,
    },
    linkDesc: {
      fontSize: 12,
      color: c.textMuted,
    },
  });
}
