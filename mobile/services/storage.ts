/**
 * AsyncStorage helpers for local persistence.
 * All keys are prefixed with @speech_decoder/
 */

import AsyncStorage from "@react-native-async-storage/async-storage";
import { UserProfile, QuickPhrase } from "../types";

const KEYS = {
  USER_ID: "@speech_decoder/user_id",
  USER_PROFILE: "@speech_decoder/user_profile",
  TTS_ENABLED: "@speech_decoder/tts_enabled",
  SAVED_PHRASES: "@speech_decoder/saved_phrases",
  RECENT_PHRASES: "@speech_decoder/recent_phrases",
};

/**
 * Saves user ID to local storage
 */
export async function saveUserId(id: string): Promise<void> {
  try {
    await AsyncStorage.setItem(KEYS.USER_ID, id);
  } catch (error) {
    console.error("[Storage] Failed to save user ID:", error);
    throw error;
  }
}

/**
 * Retrieves user ID from local storage
 * Returns null if not found
 */
export async function getUserId(): Promise<string | null> {
  try {
    const id = await AsyncStorage.getItem(KEYS.USER_ID);
    return id;
  } catch (error) {
    console.error("[Storage] Failed to get user ID:", error);
    return null;
  }
}

/**
 * Saves user profile to local storage (cached for offline display)
 */
export async function saveUserProfile(profile: UserProfile): Promise<void> {
  try {
    const jsonString = JSON.stringify(profile);
    await AsyncStorage.setItem(KEYS.USER_PROFILE, jsonString);
  } catch (error) {
    console.error("[Storage] Failed to save user profile:", error);
    throw error;
  }
}

/**
 * Retrieves cached user profile from local storage
 * Returns null if not found or if JSON parsing fails
 */
export async function getCachedProfile(): Promise<UserProfile | null> {
  try {
    const jsonString = await AsyncStorage.getItem(KEYS.USER_PROFILE);

    if (!jsonString) {
      return null;
    }

    const profile = JSON.parse(jsonString) as UserProfile;
    return profile;
  } catch (error) {
    console.error("[Storage] Failed to get cached profile:", error);
    return null;
  }
}

/**
 * Clears all app data from local storage
 * Used for logout or reset operations
 */
export async function savePhrases(phrases: QuickPhrase[]): Promise<void> {
  try {
    await AsyncStorage.setItem(KEYS.SAVED_PHRASES, JSON.stringify(phrases));
  } catch (error) {
    console.error("[Storage] Failed to save phrases:", error);
    throw error;
  }
}

export async function getSavedPhrases(): Promise<QuickPhrase[]> {
  try {
    const jsonString = await AsyncStorage.getItem(KEYS.SAVED_PHRASES);
    if (!jsonString) return [];
    return JSON.parse(jsonString) as QuickPhrase[];
  } catch (error) {
    console.error("[Storage] Failed to get saved phrases:", error);
    return [];
  }
}

const MAX_RECENT_PHRASES = 20;

export async function addRecentPhrase(text: string): Promise<void> {
  try {
    const existing = await getRecentPhrases();
    const filtered = existing.filter((p) => p !== text);
    const updated = [text, ...filtered].slice(0, MAX_RECENT_PHRASES);
    await AsyncStorage.setItem(KEYS.RECENT_PHRASES, JSON.stringify(updated));
  } catch (error) {
    console.error("[Storage] Failed to add recent phrase:", error);
  }
}

export async function getRecentPhrases(): Promise<string[]> {
  try {
    const jsonString = await AsyncStorage.getItem(KEYS.RECENT_PHRASES);
    if (!jsonString) return [];
    return JSON.parse(jsonString) as string[];
  } catch (error) {
    console.error("[Storage] Failed to get recent phrases:", error);
    return [];
  }
}

export async function clearAll(): Promise<void> {
  try {
    await AsyncStorage.multiRemove([
      KEYS.USER_ID,
      KEYS.USER_PROFILE,
      KEYS.TTS_ENABLED,
      KEYS.SAVED_PHRASES,
      KEYS.RECENT_PHRASES,
    ]);
  } catch (error) {
    console.error("[Storage] Failed to clear all storage:", error);
    throw error;
  }
}

/**
 * Persists Text-to-Speech preference
 */
export async function saveTtsEnabled(enabled: boolean): Promise<void> {
  try {
    await AsyncStorage.setItem(KEYS.TTS_ENABLED, JSON.stringify(enabled));
  } catch (error) {
    console.error("[Storage] Failed to save TTS setting:", error);
    throw error;
  }
}

/**
 * Reads Text-to-Speech preference
 * Returns null when not previously set
 */
export async function getTtsEnabled(): Promise<boolean | null> {
  try {
    const raw = await AsyncStorage.getItem(KEYS.TTS_ENABLED);
    if (raw === null) {
      return null;
    }
    return JSON.parse(raw) as boolean;
  } catch (error) {
    console.error("[Storage] Failed to read TTS setting:", error);
    return null;
  }
}
