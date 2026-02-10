import { useState, useEffect, useCallback } from 'react';
import { api } from '../services/api';
import {
  getUserId,
  saveUserId,
  saveUserProfile,
  getCachedProfile,
  clearAll,
} from '../services/storage';
import { API_ROUTES, DEMO_MODE, DEMO_USER } from '../utils/constants';
import type { UserProfile } from '../types';

interface UseUserReturn {
  user: UserProfile | null;
  isLoading: boolean;
  isNewUser: boolean;
  createUser: (
    displayName: string,
    visionImpairmentHint?: string,
    speechImpairmentHint?: string
  ) => Promise<UserProfile>;
  updateUser: (updates: Partial<UserProfile>) => Promise<UserProfile>;
  logout: () => Promise<void>;
  error: string | null;
}

export function useUser(): UseUserReturn {
  const [user, setUser] = useState<UserProfile | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isNewUser, setIsNewUser] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function loadUser() {
      try {
        setIsLoading(true);
        setError(null);

        // DEMO_MODE: use pre-configured demo user
        if (DEMO_MODE) {
          setUser(DEMO_USER);
          setIsNewUser(false);
          setIsLoading(false);
          return;
        }

        // Check if user_id exists in storage
        const savedUserId = await getUserId();

        if (!savedUserId) {
          // No saved user → new user
          setIsNewUser(true);
          setIsLoading(false);
          return;
        }

        // Fetch user profile from backend
        try {
          const profile = await api.get<UserProfile>(
            API_ROUTES.GET_USER(savedUserId)
          );
          setUser(profile);
          setIsNewUser(false);

          // Update cached profile in storage
          await saveUserProfile(profile);
        } catch (fetchError) {
          // Backend fetch failed → try cached profile as fallback
          console.warn('Failed to fetch user profile, using cache:', fetchError);
          const cachedProfile = await getCachedProfile();

          if (cachedProfile) {
            setUser(cachedProfile);
            setIsNewUser(false);
          } else {
            // No cache available either → treat as new user
            setIsNewUser(true);
            setError('Could not load user profile. Please check your connection.');
          }
        }
      } catch (err) {
        console.error('Error loading user:', err);
        setError(err instanceof Error ? err.message : 'Failed to load user');
        setIsNewUser(true);
      } finally {
        setIsLoading(false);
      }
    }

    loadUser();
  }, []);

  const createUser = useCallback(
    async (
      displayName: string,
      visionImpairmentHint?: string,
      speechImpairmentHint?: string
    ): Promise<UserProfile> => {
      try {
        setError(null);

        const newUser = await api.post<UserProfile>(API_ROUTES.CREATE_USER, {
          display_name: displayName,
          vision_impairment_hint: visionImpairmentHint || null,
          speech_impairment_hint: speechImpairmentHint || null,
        });

        // Save user_id and profile to storage
        await saveUserId(newUser.user_id);
        await saveUserProfile(newUser);

        // Update state
        setUser(newUser);
        setIsNewUser(false);

        return newUser;
      } catch (err) {
        console.error('Error creating user:', err);
        const errorMessage =
          err instanceof Error ? err.message : 'Failed to create user';
        setError(errorMessage);
        throw new Error(errorMessage);
      }
    },
    []
  );

  const updateUser = useCallback(
    async (updates: Partial<UserProfile>): Promise<UserProfile> => {
      if (!user) {
        throw new Error('No user to update');
      }

      try {
        setError(null);

        const updatedUser = await api.patch<UserProfile>(
          API_ROUTES.UPDATE_USER(user.user_id),
          updates
        );

        // Update local state and storage cache
        setUser(updatedUser);
        await saveUserProfile(updatedUser);

        return updatedUser;
      } catch (err) {
        console.error('Error updating user:', err);
        const errorMessage =
          err instanceof Error ? err.message : 'Failed to update user';
        setError(errorMessage);
        throw new Error(errorMessage);
      }
    },
    [user]
  );

  const logout = useCallback(async (): Promise<void> => {
    try {
      setError(null);

      // Clear all data from storage
      await clearAll();

      // Reset state
      setUser(null);
      setIsNewUser(true);
    } catch (err) {
      console.error('Error during logout:', err);
      const errorMessage =
        err instanceof Error ? err.message : 'Failed to logout';
      setError(errorMessage);
      throw new Error(errorMessage);
    }
  }, []);

  return {
    user,
    isLoading,
    isNewUser,
    createUser,
    updateUser,
    logout,
    error,
  };
}
