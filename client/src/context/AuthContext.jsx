import { createContext, useContext, useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [session, setSession] = useState(null);
  const [profile, setProfile] = useState({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session);
      setLoading(false);
    });
    const { data } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      setSession(nextSession);
      setLoading(false);
    });
    return () => data.subscription.unsubscribe();
  }, []);

  useEffect(() => {
    if (!session) {
      setProfile({});
      return;
    }
    supabase
      .from('profiles')
      .select('role, patient_id, doctor_id')
      .eq('auth_user_id', session.user.id)
      .maybeSingle()
      .then(async ({ data: profileRow }) => {
        if (!profileRow) {
          setProfile({});
          return;
        }

        let patient = null;
        if (profileRow.patient_id) {
          const result = await supabase
            .from('patients')
            .select('*')
            .eq('id', profileRow.patient_id)
            .maybeSingle();
          patient = result.data;
        }

        let doctor = null;
        if (profileRow.doctor_id) {
          const result = await supabase
            .from('doctors')
            .select('*')
            .eq('id', profileRow.doctor_id)
            .maybeSingle();
          doctor = result.data;
        }

        setProfile({ ...profileRow, patient, doctor });
    });
  }, [session]);

  return (
    <AuthContext.Provider value={{ session, profile, loading }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
