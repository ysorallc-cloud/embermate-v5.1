// ============================================================================
// RESOURCES LIST — Flat expandable caregiver resource categories.
//
// Two variants (Phase 29 Batch B F1):
//   • default — the original expanded category cards with descriptions
//     and inline expand-on-tap revealing link lists. Shipped on the new
//     /resources subscreen as the full reference surface.
//   • compact — title + chevron-forward Ionicons only, no descriptions,
//     no inline expand. Per-row tap calls navigate('/resources'). Shipped
//     on the You tab so the resources surface stays quiet relative to the
//     reflection / breath / action affordances above it.
//
// Per Phase 29 Batch B D1, every compact row routes to the same /resources
// subscreen — future scope may anchor-scroll to the tapped category, but
// v1.0 lands on the subscreen with all categories visible.
// ============================================================================

import React, { useState, useMemo } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Linking,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../contexts/ThemeContext';
import { navigate } from '../../lib/navigate';

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

export interface ResourcesListProps {
  /** Rendering variant. Defaults to 'default' (full expanded cards with
   *  descriptions + inline link expansion). 'compact' renders title +
   *  chevron-forward only and routes every row tap to /resources. */
  variant?: 'default' | 'compact';
}

export function ResourcesList({ variant = 'default' }: ResourcesListProps = {}) {
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const toggleCategory = (id: string) => {
    setExpandedId(prev => prev === id ? null : id);
  };

  if (variant === 'compact') {
    return (
      <View style={styles.container}>
        {RESOURCE_CATEGORIES.map((cat, index) => (
          <TouchableOpacity
            key={cat.id}
            style={[styles.compactRow, index === 0 && styles.compactRowFirst]}
            onPress={() => navigate('/resources')}
            activeOpacity={0.7}
            accessibilityRole="button"
            accessibilityLabel={cat.title}
            accessibilityHint="Opens the full resources page"
          >
            <Text style={styles.compactTitle}>{cat.title}</Text>
            <Ionicons name="chevron-forward" size={18} color={colors.textMuted} />
          </TouchableOpacity>
        ))}
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {RESOURCE_CATEGORIES.map((cat, index) => {
        const isExpanded = expandedId === cat.id;
        return (
          <View
            key={cat.id}
            style={[styles.categoryCard, index === 0 && { borderTopWidth: 0 }]}
          >
            <TouchableOpacity
              style={styles.categoryHeader}
              onPress={() => toggleCategory(cat.id)}
              activeOpacity={0.7}
              accessibilityRole="button"
              accessibilityLabel={`${cat.title}, ${isExpanded ? 'expanded' : 'collapsed'}`}
              accessibilityState={{ expanded: isExpanded }}
            >
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
                    accessibilityRole="link"
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
      // No background — Plan ahead list sits directly on the page surface.
    },
    categoryCard: {
      borderTopWidth: 0.5,
      borderTopColor: c.glassBorder,
    },
    categoryHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingVertical: 11,
      gap: 12,
    },
    categoryInfo: {
      flex: 1,
    },
    categoryTitle: {
      fontSize: 13,
      fontWeight: '500',
      color: c.textPrimary,
      marginBottom: 2,
    },
    categoryDesc: {
      fontSize: 11,
      color: c.textTertiary,
    },
    chevron: {
      fontSize: 14,
      color: c.textTertiary,
    },
    linksList: {
      paddingHorizontal: 0,
      paddingBottom: 12,
      paddingLeft: 16, // allow: tap-target padding (Apple HIG ≥44pt)
    },
    linkRow: {
      paddingVertical: 10,
      paddingLeft: 0,
    },
    linkRowBorder: {
      borderBottomWidth: 0.5,
      borderBottomColor: c.glassBorder,
    },
    linkTitle: {
      fontSize: 13,
      fontWeight: '500',
      color: c.textPrimary,
      marginBottom: 2,
    },
    linkDesc: {
      fontSize: 11,
      color: c.textTertiary,
    },
    // Phase 29 Batch B F1 — compact variant. Title + chevron only. Hairline
    // top borders separate rows (matches the default variant's row
    // separators); first row drops its top border so the list reads as a
    // single contiguous block instead of starting with a stray line.
    compactRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingVertical: 13,
      paddingHorizontal: 14, // allow: tap-target padding (Apple HIG ≥44pt)
      borderTopWidth: 0.5,
      borderTopColor: c.glassBorder,
    },
    compactRowFirst: {
      borderTopWidth: 0,
    },
    compactTitle: {
      fontSize: 13,
      fontWeight: '500',
      color: c.textPrimary,
    },
  });
}
