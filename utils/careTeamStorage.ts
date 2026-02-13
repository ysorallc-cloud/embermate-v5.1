// ============================================================================
// CARE TEAM STORAGE UTILITIES
// AsyncStorage CRUD operations for care team members
// ============================================================================

import AsyncStorage from '@react-native-async-storage/async-storage';
import { logError } from './devLog';

export interface CareTeamMember {
  id: string;
  name: string;
  role: string;
  phone?: string;
  email?: string;
  isEmergencyContact: boolean;
  availableHours?: string;
  contactPreference?: 'call' | 'text' | 'email';
  notes?: string;
  createdAt: string;
  avatarColor?: string; // For UI display
}

const CARE_TEAM_KEY = '@embermate_care_team';

// ============================================================================
// CRUD OPERATIONS
// ============================================================================

/**
 * Get all care team members
 */
export async function getCareTeam(): Promise<CareTeamMember[]> {
  try {
    const data = await AsyncStorage.getItem(CARE_TEAM_KEY);
    if (!data) {
      return getDefaultCareTeam();
    }
    return JSON.parse(data);
  } catch (error) {
    logError('careTeamStorage.getCareTeam', error);
    return getDefaultCareTeam();
  }
}

/**
 * Get a single care team member by ID
 */
export async function getCareTeamMember(id: string): Promise<CareTeamMember | null> {
  try {
    const team = await getCareTeam();
    return team.find(m => m.id === id) || null;
  } catch (error) {
    logError('careTeamStorage.getCareTeamMember', error);
    return null;
  }
}

/**
 * Get emergency contacts only
 */
export async function getEmergencyContacts(): Promise<CareTeamMember[]> {
  try {
    const team = await getCareTeam();
    return team
      .filter(m => m.isEmergencyContact && m.phone)
      .sort((a, b) => a.name.localeCompare(b.name));
  } catch (error) {
    logError('careTeamStorage.getEmergencyContacts', error);
    return [];
  }
}

/**
 * Create a new care team member
 */
export async function createCareTeamMember(
  member: Omit<CareTeamMember, 'id' | 'createdAt'>
): Promise<CareTeamMember> {
  try {
    const team = await getCareTeam();
    const newMember: CareTeamMember = {
      ...member,
      id: Date.now().toString(),
      createdAt: new Date().toISOString(),
      avatarColor: getRandomAvatarColor(),
    };
    team.push(newMember);
    await AsyncStorage.setItem(CARE_TEAM_KEY, JSON.stringify(team));
    return newMember;
  } catch (error) {
    logError('careTeamStorage.createCareTeamMember', error);
    throw error;
  }
}

/**
 * Update a care team member
 */
export async function updateCareTeamMember(
  id: string,
  updates: Partial<CareTeamMember>
): Promise<CareTeamMember | null> {
  try {
    const team = await getCareTeam();
    const index = team.findIndex(m => m.id === id);
    
    if (index === -1) {
      return null;
    }
    
    team[index] = { ...team[index], ...updates };
    await AsyncStorage.setItem(CARE_TEAM_KEY, JSON.stringify(team));
    return team[index];
  } catch (error) {
    logError('careTeamStorage.updateCareTeamMember', error);
    return null;
  }
}

/**
 * Delete a care team member
 */
export async function deleteCareTeamMember(id: string): Promise<boolean> {
  try {
    const team = await getCareTeam();
    const filtered = team.filter(m => m.id !== id);
    
    if (filtered.length === team.length) {
      return false; // Nothing was deleted
    }
    
    await AsyncStorage.setItem(CARE_TEAM_KEY, JSON.stringify(filtered));
    return true;
  } catch (error) {
    logError('careTeamStorage.deleteCareTeamMember', error);
    return false;
  }
}

/**
 * Reorder care team members (for emergency contact priority)
 */
export async function reorderCareTeam(orderedIds: string[]): Promise<boolean> {
  try {
    const team = await getCareTeam();
    const reordered = orderedIds
      .map(id => team.find(m => m.id === id))
      .filter(Boolean) as CareTeamMember[];
    
    // Add any members not in the ordered list at the end
    const remaining = team.filter(m => !orderedIds.includes(m.id));
    const final = [...reordered, ...remaining];
    
    await AsyncStorage.setItem(CARE_TEAM_KEY, JSON.stringify(final));
    return true;
  } catch (error) {
    logError('careTeamStorage.reorderCareTeam', error);
    return false;
  }
}

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

/**
 * Format phone number for display
 */
export function formatPhoneNumber(phone: string): string {
  // Remove non-digits
  const digits = phone.replace(/\D/g, '');
  
  // US format: (123) 456-7890
  if (digits.length === 10) {
    return `(${digits.slice(0, 3)}) ${digits.slice(3, 6)}-${digits.slice(6)}`;
  }
  
  // International or other formats
  return phone;
}

/**
 * Validate phone number
 */
export function isValidPhoneNumber(phone: string): boolean {
  const digits = phone.replace(/\D/g, '');
  return digits.length >= 10;
}

/**
 * Get random avatar color for new members
 */
function getRandomAvatarColor(): string {
  const colors = [
    '#8BA888', // Sage
    '#C9A86C', // Copper
    '#3498DB', // Blue
    '#9B59B6', // Purple
    '#E67E22', // Orange
    '#1ABC9C', // Teal
  ];
  return colors[Math.floor(Math.random() * colors.length)];
}

// ============================================================================
// RESET & DEFAULTS
// ============================================================================

/**
 * Reset care team to default
 */
export async function resetCareTeam(): Promise<void> {
  try {
    const defaults = getDefaultCareTeam();
    await AsyncStorage.setItem(CARE_TEAM_KEY, JSON.stringify(defaults));
  } catch (error) {
    logError('careTeamStorage.resetCareTeam', error);
  }
}

/**
 * Default care team for initial setup
 */
function getDefaultCareTeam(): CareTeamMember[] {
  const now = new Date().toISOString();
  return [
    {
      id: '1',
      name: 'Sarah (Daughter)',
      role: 'Family',
      phone: '555-0123',
      email: 'sarah@example.com',
      isEmergencyContact: true,
      availableHours: 'Anytime',
      contactPreference: 'call',
      createdAt: now,
      avatarColor: '#8BA888',
      notes: 'Primary contact for emergencies',
    },
    {
      id: '2',
      name: 'Dr. Chen',
      role: 'Cardiologist',
      phone: '555-0456',
      email: 'chen@cardiology.com',
      isEmergencyContact: false,
      availableHours: 'Mon-Fri 9am-5pm',
      contactPreference: 'call',
      createdAt: now,
      avatarColor: '#3498DB',
    },
    {
      id: '3',
      name: 'Valley Home Health',
      role: 'Nursing',
      phone: '555-0789',
      email: 'info@valleyhealth.com',
      isEmergencyContact: true,
      availableHours: '24/7 On-call',
      contactPreference: 'call',
      createdAt: now,
      avatarColor: '#1ABC9C',
      notes: 'Emergency nursing support',
    },
  ];
}

/**
 * Count emergency contacts
 */
export async function countEmergencyContacts(): Promise<number> {
  try {
    const contacts = await getEmergencyContacts();
    return contacts.length;
  } catch (error) {
    logError('careTeamStorage.countEmergencyContacts', error);
    return 0;
  }
}
