// ============================================================================
// NOTE STORAGE UTILITIES
// AsyncStorage operations for note logging
// ============================================================================

import AsyncStorage from '@react-native-async-storage/async-storage';

export interface NoteLog {
  id: string;
  content: string;
  timestamp: string; // ISO datetime
  date: string; // ISO date (YYYY-MM-DD)
}

const STORAGE_KEY = '@embermate_notes';

export async function saveNote(note: Omit<NoteLog, 'id'>): Promise<void> {
  try {
    const notes = await getNotes();
    const newNote: NoteLog = {
      ...note,
      id: Date.now().toString(),
    };
    notes.push(newNote);
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(notes));
  } catch (error) {
    console.error('Error saving note:', error);
    throw error;
  }
}

export async function getNotes(): Promise<NoteLog[]> {
  try {
    const data = await AsyncStorage.getItem(STORAGE_KEY);
    return data ? JSON.parse(data) : [];
  } catch (error) {
    console.error('Error loading notes:', error);
    return [];
  }
}

export async function getNotesByDate(date: string): Promise<NoteLog[]> {
  try {
    const notes = await getNotes();
    return notes.filter(n => n.date === date);
  } catch (error) {
    console.error('Error getting notes by date:', error);
    return [];
  }
}

export async function deleteNote(id: string): Promise<boolean> {
  try {
    const notes = await getNotes();
    const filtered = notes.filter(n => n.id !== id);
    if (filtered.length === notes.length) {
      return false; // Note not found
    }
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(filtered));
    return true;
  } catch (error) {
    console.error('Error deleting note:', error);
    return false;
  }
}
