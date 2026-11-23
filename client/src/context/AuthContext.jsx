import { createContext, useContext, useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { getMe } from '../lib/api';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [session, setSession] = useState(null);
  const [me, setMe] = useState(null);
  const [sessionLoading, setSessionLoading] = useState(true);
  const [profileLoading, setProfileLoading] = useState(false);
  const [profileError, setProfileError] = useState(null);

  useEffect(() => {
    const { data } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      setSession(nextSession);
      setSessionLoading(false);
    });

    supabase.auth.getSession().then(({ data: sessionData, error }) => {
      if (error) setProfileError(error.message);
      setSession(sessionData.session);
      setSessionLoading(false);
    }).catch((error) => {
      setProfileError(error.message);
      setSessionLoading(false);
    });

    return () => data.subscription.unsubscribe();
  }, []);

  useEffect(() => {
    if (!session) {
      setMe(null);
      setProfileError(null);
      setProfileLoading(false);
      return;
    }

    let active = true;
    setProfileLoading(true);
    setProfileError(null);
    getMe(session.access_token)
      .then((result) => {
        if (active) setMe(result);
      })
      .catch((error) => {
        if (active) {
          setMe(null);
          setProfileError(error.message);
        }
      })
      .finally(() => {
        if (active) setProfileLoading(false);
      });

    return () => {
      active = false;
    };
  }, [session]);

  const profile = me
    ? { ...me.user, patient: me.patient, doctor: me.doctor }
    : {};

  return (
    <AuthContext.Provider
      value={{
        session,
        profile,
        loading: sessionLoading || profileLoading,
        profileError,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
