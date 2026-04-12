import React, { createContext, useContext, useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';

const AuthContext = createContext();

export function useAuth() {
  return useContext(AuthContext);
}

export function AuthProvider({ children }) {
  const [currentUser, setCurrentUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Get initial session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setCurrentUser(session?.user ?? null);
      setLoading(false);
    });

    // Listen to auth changes (login/logout on any tab)
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setCurrentUser(session?.user ?? null);
    });

    return () => subscription.unsubscribe();
  }, []);

  const login = async (email, password) => {
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) return { success: false, message: error.message };
    return { success: true };
  };

  const loginWithGoogle = async () => {
    const { data, error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: window.location.origin + '/dashboard',
      }
    });
    if (error) return { success: false, message: error.message };
    return { success: true };
  };

  const register = async (name, email, password) => {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: { data: { name } }
    });
    if (error) return { success: false, message: error.message };
    return { success: true };
  };

  const logout = async () => {
    await supabase.auth.signOut();
  };

  const updateProfile = async (data) => {
    const updatePayload = {};
    if (data.password) {
      updatePayload.password = data.password;
    }
    
    // Any other data goes into metadata
    const metadata = { ...data };
    delete metadata.password;
    
    if (Object.keys(metadata).length > 0) {
      updatePayload.data = metadata;
    }

    const { data: updated, error } = await supabase.auth.updateUser(updatePayload);
    if (error) return { success: false, message: error.message };
    setCurrentUser(updated.user);
    return { success: true };
  };

  const deleteAccount = async () => {
    // Note: Deleting from auth.users requires admin privileges or using a specific RPC/Function.
    // For this client-side demo, we will at least logout and the user can be notified.
    // In a production app, you'd call a Supabase Edge Function to delete the user record completely.
    const { error } = await supabase.auth.signOut();
    return { success: !error };
  };

  const value = {
    currentUser,
    login,
    loginWithGoogle,
    register,
    logout,
    updateProfile,
    deleteAccount
  };

  return (
    <AuthContext.Provider value={value}>
      {!loading && children}
    </AuthContext.Provider>
  );
}
