import React, { createContext, useContext, useState, useEffect } from "react";
import { dbService } from "../services/db";
import type { UserProfile } from "../services/db";

interface AuthContextType {
  user: UserProfile | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (email: string, password: string, displayName: string, role: "student" | "teacher" | "parent") => Promise<void>;
  signOut: () => Promise<void>;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState<boolean>(true);

  const refreshUser = async () => {
    try {
      const currentUser = await dbService.getCurrentUser();
      setUser(currentUser);
    } catch (error) {
      console.error("無法載入使用者資訊:", error);
      setUser(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    refreshUser();
  }, []);

  const signIn = async (email: string, password: string) => {
    setLoading(true);
    try {
      const profile = await dbService.signIn(email, password);
      setUser(profile);
    } catch (error) {
      setLoading(false);
      throw error;
    } finally {
      setLoading(false);
    }
  };

  const signUp = async (email: string, password: string, displayName: string, role: "student" | "teacher" | "parent") => {
    setLoading(true);
    try {
      const profile = await dbService.signUp(email, password, displayName, role);
      setUser(profile);
    } catch (error) {
      setLoading(false);
      throw error;
    } finally {
      setLoading(false);
    }
  };

  const signOut = async () => {
    setLoading(true);
    try {
      await dbService.signOut();
      setUser(null);
    } catch (error) {
      console.error("登出發生錯誤:", error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthContext.Provider value={{ user, loading, signIn, signUp, signOut, refreshUser }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth 必須在 AuthProvider 內使用");
  }
  return context;
};
