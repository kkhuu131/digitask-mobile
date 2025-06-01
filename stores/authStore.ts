import { create } from "zustand";
import { supabase } from "../lib/supabase";
import { User } from "@supabase/supabase-js";

interface AuthState {
  user: User | null;
  userProfile: UserProfile | null;
  session: any | null;
  isLoading: boolean;
  error: string | null;
  signUp: (email: string, password: string, username: string) => Promise<void>;
  signIn: (email: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
  refreshSession: () => Promise<void>;
  updateProfile: (updates: Partial<UserProfile>) => Promise<void>;
  fetchUserProfile: () => Promise<void>;
}

export interface UserProfile {
  id: string;
  username: string;
  display_name: string;
  avatar_url: string;
  created_at: string;
  updated_at: string;
  saved_stats?: Record<string, number>;
  daily_stat_gains?: number;
  last_stat_reset?: string;
  battles_won?: number;
  battles_completed?: number;
}

export const useAuthStore = create<AuthState>((set, get) => ({
  user: null,
  userProfile: null,
  session: null,
  isLoading: true,
  error: null,

  signUp: async (email: string, password: string, username: string) => {
    try {
      set({ isLoading: true, error: null });
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
      });

      if (error) throw error;

      // Create user profile if signup was successful
      if (data.user) {
        const profileCreated = await createProfile(data.user.id, username);
        if (!profileCreated) {
          throw new Error("Failed to create user profile");
        }
      }

      set({ user: data.user, session: data.session, isLoading: false });
    } catch (error: any) {
      set({ error: error.message, isLoading: false });
    }
  },

  signIn: async (email: string, password: string) => {
    try {
      set({ isLoading: true, error: null });
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) throw error;

      // First set the user state
      set({ user: data.user, session: data.session });

      // Then fetch the profile
      if (data.user) {
        try {
          const { data: profile, error: profileError } = await supabase
            .from("profiles")
            .select("*")
            .eq("id", data.user.id)
            .single();

          if (!profileError) {
            set({ userProfile: profile });
          }
        } catch (profileError) {
          console.error("Error fetching profile:", profileError);
        }
      }

      set({ isLoading: false });
    } catch (error: any) {
      set({ error: error.message, isLoading: false });
    }
  },

  signOut: async () => {
    try {
      const { error } = await supabase.auth.signOut({
        scope: "local",
      });

      if (error) throw error;

      set({ user: null, session: null, userProfile: null });
    } catch (error) {
      console.error("Error signing out:", error);
      set({ error: (error as Error).message });
    }
  },

  refreshSession: async () => {
    try {
      set({ isLoading: true });
      const { data } = await supabase.auth.getSession();
      set({
        user: data.session?.user || null,
        session: data.session,
        isLoading: false,
      });

      // Fetch user profile if user is logged in
      if (data.session?.user) {
        get().fetchUserProfile();
      }
    } catch (error: any) {
      set({ error: error.message, isLoading: false });
    }
  },

  updateProfile: async (updates: Partial<UserProfile>) => {
    try {
      set({ isLoading: true, error: null });

      const { user, userProfile } = get();

      if (!user || !userProfile) {
        throw new Error("You must be logged in to update your profile");
      }

      const { error } = await supabase
        .from("profiles")
        .update(updates)
        .eq("id", user.id);

      if (error) throw error;

      const { data: updatedProfile } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", user.id)
        .single();

      set({
        userProfile: updatedProfile || null,
        isLoading: false,
      });
    } catch (error) {
      set({
        error: (error as Error).message,
        isLoading: false,
      });
    }
  },

  fetchUserProfile: async () => {
    try {
      const { user } = get();
      if (!user) {
        throw new Error("User not logged in");
      }

      const { data: profile, error } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", user.id)
        .single();

      if (error) throw error;

      set({
        userProfile: profile || null,
        isLoading: false,
      });
    } catch (error) {
      console.error("Error fetching user profile:", error);
      set({
        error: (error as Error).message,
        isLoading: false,
      });
    }
  },
}));

const createProfile = async (userId: string, username: string) => {
  try {
    const { error } = await supabase.from("profiles").insert([
      {
        id: userId,
        username,
        display_name: username,
        avatar_url: "",
        saved_stats: { HP: 0, SP: 0, ATK: 0, DEF: 0, INT: 0, SPD: 0 },
        daily_stat_gains: 0,
        last_stat_reset: new Date().toISOString(),
        battles_won: 0,
        battles_completed: 0,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      },
    ]);

    if (error) throw error;
    return true;
  } catch (error) {
    console.error("Error creating profile:", error);
    return false;
  }
};
