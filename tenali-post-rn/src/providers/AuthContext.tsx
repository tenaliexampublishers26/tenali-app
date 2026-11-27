import React, { createContext, useContext, useState } from 'react';
import { isProfileComplete, isUserAdmin, UserProfile } from '../models';
import { AuthService } from '../services/authService';

interface AuthContextValue {
  user: UserProfile | null;
  isAuthenticated: boolean;
  isAdmin: boolean;
  isLoading: boolean;
  errorMessage: string | null;
  isProfileComplete: boolean;
  needsProfileCompletion: boolean;
  clearError: () => void;
  restoreSession: () => Promise<void>;
  signInWithPassword: (email: string, password: string) => Promise<boolean>;
  signUp: (fullName: string, email: string, password: string) => Promise<boolean>;
  updateProfile: (fullName: string, phoneNumber: string, location: string) => Promise<boolean>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<UserProfile | null>(AuthService.currentUser);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const isAuthenticated = user !== null;
  const isAdmin = AuthService.isAdmin || isUserAdmin(user);
  const profileComplete = isProfileComplete(user);
  const needsProfileCompletion = isAuthenticated && !profileComplete;

  const clearError = () => setErrorMessage(null);

  const restoreSession = async () => {
    setIsLoading(true);
    try {
      const restored = await AuthService.restoreSession();
      setUser(restored);
    } catch (e: any) {
      setErrorMessage(e?.message ?? String(e));
    } finally {
      setIsLoading(false);
    }
  };

  const signInWithPassword = async (email: string, password: string) => {
    setIsLoading(true);
    setErrorMessage(null);
    try {
      const loggedIn = await AuthService.signInWithPassword(email, password);
      setUser(loggedIn);
      return true;
    } catch (e: any) {
      setErrorMessage(e?.message ?? String(e));
      return false;
    } finally {
      setIsLoading(false);
    }
  };

  const signUp = async (fullName: string, email: string, password: string) => {
    setIsLoading(true);
    setErrorMessage(null);
    try {
      const created = await AuthService.signUp(fullName, email, password);
      setUser(created);
      return true;
    } catch (e: any) {
      const msg = e?.message ?? String(e);
      if (msg.includes('over_email_send_rate_limit') || msg.includes('email rate limit')) {
        setErrorMessage(
          'Supabase email rate limit exceeded. Turn OFF "Confirm email" in Supabase Dashboard to allow instant registration.'
        );
      } else {
        setErrorMessage(msg);
      }
      return false;
    } finally {
      setIsLoading(false);
    }
  };

  const updateProfile = async (
    fullName: string,
    phoneNumber: string,
    location: string
  ) => {
    if (!user) {
      setErrorMessage('No authenticated user to update profile for.');
      return false;
    }
    setIsLoading(true);
    setErrorMessage(null);
    try {
      const updated: UserProfile = {
        ...user,
        fullName: fullName.trim(),
        phoneNumber: phoneNumber.trim(),
        location: location.trim(),
        postalCircle: location.trim(),
      };
      const saved = await AuthService.saveProfile(updated);
      setUser(saved);
      return true;
    } catch (e: any) {
      setErrorMessage(e?.message ?? String(e));
      return false;
    } finally {
      setIsLoading(false);
    }
  };

  const signOut = async () => {
    setIsLoading(true);
    try {
      await AuthService.signOut();
      setUser(null);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        isAuthenticated,
        isAdmin,
        isLoading,
        errorMessage,
        isProfileComplete: profileComplete,
        needsProfileCompletion,
        clearError,
        restoreSession,
        signInWithPassword,
        signUp,
        updateProfile,
        signOut,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside AuthProvider');
  return ctx;
};
