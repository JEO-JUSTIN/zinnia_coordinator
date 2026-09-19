import React, { createContext, useContext, useState, useEffect } from 'react';
import { AdminProfile, CoordinatorAssignment } from '../types/database';
import { 
  supabase, 
  getAdminProfile, 
  getCoordinatorAssignments,
  loginWithCoordinatorTable
} from './supabase';

export interface CoordinatorPermissions {
  isSuperAdmin: boolean;
  isOverallTech: boolean;
  isOverallNonTech: boolean;
  assignedEventIds: string[];
  assignedTechEventIds: string[];
  assignedNonTechEventIds: string[];
  canViewTechTab: boolean;
  canViewNonTechTab: boolean;
  canScanFood: boolean;
  canScanEntry: boolean;
  allowedEventTypes: ('TECH' | 'NON_TECH')[];
}

interface AuthContextType {
  profile: AdminProfile | null;
  assignments: CoordinatorAssignment[];
  permissions: CoordinatorPermissions;
  isLoading: boolean;
  error: string | null;
  signIn: (email: string, password?: string) => Promise<{ success: boolean; error?: string }>;
  signOut: () => Promise<void>;
  // For easy verification and testing in demo mode:
  switchDemoUser: (adminId: string) => Promise<void>;
}

const defaultPermissions: CoordinatorPermissions = {
  isSuperAdmin: false,
  isOverallTech: false,
  isOverallNonTech: false,
  assignedEventIds: [],
  assignedTechEventIds: [],
  assignedNonTechEventIds: [],
  canViewTechTab: false,
  canViewNonTechTab: false,
  canScanFood: false,
  canScanEntry: false,
  allowedEventTypes: [],
};

const AuthContext = createContext<AuthContextType>({
  profile: null,
  assignments: [],
  permissions: defaultPermissions,
  isLoading: true,
  error: null,
  signIn: async () => ({ success: false }),
  signOut: async () => {},
  switchDemoUser: async () => {},
});

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [profile, setProfile] = useState<AdminProfile | null>(null);
  const [assignments, setAssignments] = useState<CoordinatorAssignment[]>([]);
  const [permissions, setPermissions] = useState<CoordinatorPermissions>(defaultPermissions);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  // Compute permissions from admin_profiles + coordinator_assignments
  const calculatePermissions = (prof: AdminProfile, asg: CoordinatorAssignment[]): CoordinatorPermissions => {
    const roleUpper = (prof.role || '').toUpperCase();
    const isSuper = roleUpper === 'SUPER_ADMIN';

    // 1. GATE ENTRY (Can scan gate check-in)
    const canScanEntry = isSuper 
      || roleUpper === 'GATE_ADMIN' 
      || roleUpper === 'GATE_STAFF' 
      || roleUpper === 'GATE'
      || asg.some(a => {
        const t = (a.assignment_type || '').toUpperCase();
        return t === 'GATE_ENTRY' || t === 'GATE' || t === 'GATE_ADMIN' || t === 'GATE_STAFF';
      });

    // 2. FOOD ATTENDANCE (Can scan food / lunch tokens)
    const canScanFood = isSuper 
      || roleUpper === 'FOOD_ADMIN' 
      || roleUpper === 'FOOD_STAFF' 
      || roleUpper === 'FOOD'
      || asg.some(a => {
        const t = (a.assignment_type || '').toUpperCase();
        return t === 'FOOD' || t === 'FOOD_STAFF' || t === 'FOOD_ADMIN';
      });

    // 3. OVERALL TECH & NON-TECH LEADS
    const isOverallTech = isSuper 
      || roleUpper === 'OVERALL_TECH'
      || asg.some(a => (a.assignment_type || '').toUpperCase() === 'OVERALL_TECH');

    const isOverallNonTech = isSuper 
      || roleUpper === 'OVERALL_NON_TECH'
      || asg.some(a => (a.assignment_type || '').toUpperCase() === 'OVERALL_NON_TECH');

    // 4. CANONICAL EVENT ALIASES MAPPING
    const TECH_EVENT_SET = new Set([
      '01', 'DEBUGGING',
      '02', 'THE_LAST_SIGNAL', 'LAST_SIGNAL',
      '03', 'LOST_AT_SQL', 'LOST_IN_SQL',
      '04', 'GADGET_CODES',
      '05', 'PAPER_PRESENTATION'
    ]);

    const NON_TECH_EVENT_SET = new Set([
      '06', 'BORDERLAND_AT_GCEE', 'BORDERLAND',
      '07', 'THINK_STRIKE_AND_WIN', 'THINK_STRIKE_WIN',
      '08', 'PLOT_TWIST',
      '09', 'SHORT_FLIM', 'SHORT_FILM'
    ]);

    const assignedTechEventIds: string[] = [];
    const assignedNonTechEventIds: string[] = [];

    // Process all assignments
    asg.forEach(a => {
      const asgType = (a.assignment_type || '').toUpperCase();
      const rawId = (a.event_id || '').trim();

      if (rawId) {
        const normalized = rawId.toUpperCase().replace(/[^A-Z0-9]/g, '_');
        
        if (TECH_EVENT_SET.has(normalized) || TECH_EVENT_SET.has(rawId.toUpperCase()) || asgType.includes('TECH')) {
          assignedTechEventIds.push(rawId);
          if (normalized.includes('DEBUG')) assignedTechEventIds.push('01', 'debugging', 'DEBUGGING');
          if (normalized.includes('SIGNAL')) assignedTechEventIds.push('02', 'the-last-signal', 'LAST_SIGNAL');
          if (normalized.includes('SQL')) assignedTechEventIds.push('03', 'lost-at-sql', 'LOST_IN_SQL');
          if (normalized.includes('GADGET')) assignedTechEventIds.push('04', 'gadget-codes', 'GADGET_CODES');
          if (normalized.includes('PAPER')) assignedTechEventIds.push('05', 'paper-presentation', 'PAPER_PRESENTATION');
        } else if (NON_TECH_EVENT_SET.has(normalized) || NON_TECH_EVENT_SET.has(rawId.toUpperCase()) || asgType.includes('NON_TECH') || asgType.includes('NONTECH')) {
          assignedNonTechEventIds.push(rawId);
          if (normalized.includes('BORDER')) assignedNonTechEventIds.push('06', 'borderland-at-gcee', 'BORDERLAND');
          if (normalized.includes('STRIKE')) assignedNonTechEventIds.push('07', 'think-strike-and-win', 'THINK_STRIKE_WIN');
          if (normalized.includes('PLOT')) assignedNonTechEventIds.push('08', 'plot-twist', 'PLOT_TWIST');
          if (normalized.includes('FILM') || normalized.includes('FLIM')) assignedNonTechEventIds.push('09', 'short-flim', 'short-film', 'SHORT_FILM');
        } else {
          // If unknown, add to both so coordinator is not blocked
          assignedTechEventIds.push(rawId);
          assignedNonTechEventIds.push(rawId);
        }
      }
    });

    const canViewTechTab = isSuper || isOverallTech || assignedTechEventIds.length > 0;
    const canViewNonTechTab = isSuper || isOverallNonTech || assignedNonTechEventIds.length > 0;

    const allowedEventTypes: ('TECH' | 'NON_TECH')[] = [];
    if (canViewTechTab) allowedEventTypes.push('TECH');
    if (canViewNonTechTab) allowedEventTypes.push('NON_TECH');

    return {
      isSuperAdmin: isSuper,
      isOverallTech,
      isOverallNonTech,
      assignedEventIds: Array.from(new Set([...assignedTechEventIds, ...assignedNonTechEventIds])),
      assignedTechEventIds: Array.from(new Set(assignedTechEventIds)),
      assignedNonTechEventIds: Array.from(new Set(assignedNonTechEventIds)),
      canViewTechTab,
      canViewNonTechTab,
      canScanFood,
      canScanEntry,
      allowedEventTypes,
    };
  };

  const loadUserProfile = async (userId: string) => {
    try {
      setIsLoading(true);
      setError(null);

      // Fetch admin profile from database
      const prof = await getAdminProfile(userId);
      if (!prof) {
        throw new Error('Admin profile not found in database. Contact Administrator.');
      }

      // Inactive Admin Check (MANDATORY REQUIREMENT)
      if (!prof.is_active) {
        throw new Error('ACCESS DENIED: Your coordinator account is INACTIVE or suspended.');
      }

      // Fetch coordinator assignments
      const asg = await getCoordinatorAssignments(userId);

      const perms = calculatePermissions(prof, asg);
      setProfile(prof);
      setAssignments(asg);
      setPermissions(perms);
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Authentication failed';
      setError(msg);
      setProfile(null);
      setAssignments([]);
      setPermissions(defaultPermissions);
      if (supabase) {
        try {
          await supabase.auth.signOut();
        } catch (e) {}
      }
    } finally {
      setIsLoading(false);
    }
  };

  // Initialize session
  useEffect(() => {
    const initAuth = async () => {
      // 1. Check if an active coordinator profile is saved in localStorage
      const savedProfileStr = localStorage.getItem('ZINNIA_ACTIVE_COORDINATOR_PROFILE');
      if (savedProfileStr) {
        try {
          const parsed = JSON.parse(savedProfileStr);
          if (parsed && parsed.profile && parsed.profile.is_active !== false) {
            setProfile(parsed.profile);
            setAssignments(parsed.assignments || []);
            setPermissions(calculatePermissions(parsed.profile, parsed.assignments || []));
            setIsLoading(false);
            return;
          }
        } catch (jsonErr) {
          localStorage.removeItem('ZINNIA_ACTIVE_COORDINATOR_PROFILE');
        }
      }

      // 1b. Fallback: Check active coordinator ID if valid UUID
      const activeCoordId = localStorage.getItem('ZINNIA_ACTIVE_COORDINATOR_ID');
      const isUuid = Boolean(activeCoordId && /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(activeCoordId));
      if (isUuid && supabase) {
        try {
          const { data: userRow } = await supabase
            .from('admin_users')
            .select('*')
            .eq('id', activeCoordId)
            .maybeSingle();

          if (userRow && userRow.is_active !== false) {
            const prof: AdminProfile = {
              id: String(userRow.id),
              roll_no: userRow.roll_no || userRow.username,
              full_name: userRow.full_name || userRow.name || 'Coordinator',
              role: userRow.role || (userRow.is_super_admin ? 'SUPER_ADMIN' : 'COORDINATOR'),
              is_active: true,
              created_at: userRow.created_at,
            };
            const asg = await getCoordinatorAssignments(prof.id);
            setProfile(prof);
            setAssignments(asg);
            setPermissions(calculatePermissions(prof, asg));
            setIsLoading(false);
            return;
          }
        } catch (netErr) {
          console.warn('Network session restore skipped:', netErr);
        }
      } else if (activeCoordId && !isUuid) {
        // Clear legacy non-UUID mock id to avoid 400 Bad Request
        localStorage.removeItem('ZINNIA_ACTIVE_COORDINATOR_ID');
      }

      // 2. Check Supabase Auth session if active
      if (supabase) {
        try {
          const { data: { session } } = await supabase.auth.getSession();
          if (session?.user) {
            await loadUserProfile(session.user.id);
            return;
          }
        } catch (sessErr) {
          console.warn('Supabase auth session check skipped:', sessErr);
        }

        const { data: authListener } = supabase.auth.onAuthStateChange(async (event, currentSession) => {
          if (event === 'SIGNED_IN' && currentSession?.user) {
            await loadUserProfile(currentSession.user.id);
          } else if (event === 'SIGNED_OUT') {
            setProfile(null);
            setAssignments([]);
            setPermissions(defaultPermissions);
            setIsLoading(false);
          }
        });

        setIsLoading(false);
        return () => {
          authListener?.subscription?.unsubscribe();
        };
      }

      // No active session: Show Login screen cleanly
      setProfile(null);
      setIsLoading(false);
    };

    initAuth();
  }, []);

  const signIn = async (rollNoOrEmail: string, password?: string) => {
    try {
      setIsLoading(true);
      setError(null);

      const cleanIdentifier = rollNoOrEmail.trim();
      if (!cleanIdentifier) {
        throw new Error('Please enter your coordinator code or roll number.');
      }
      if (!password) {
        throw new Error('Password is required.');
      }

      // 1. Primary login: Direct database lookup in public.admin_users
      const tableAttempt = await loginWithCoordinatorTable(cleanIdentifier, password);
      if (tableAttempt.success && tableAttempt.profile) {
        const perms = calculatePermissions(tableAttempt.profile, tableAttempt.assignments || []);
        setProfile(tableAttempt.profile);
        setAssignments(tableAttempt.assignments || []);
        setPermissions(perms);
        localStorage.setItem('ZINNIA_ACTIVE_COORDINATOR_ID', tableAttempt.profile.id);
        localStorage.setItem('ZINNIA_ACTIVE_COORDINATOR_PROFILE', JSON.stringify({
          profile: tableAttempt.profile,
          assignments: tableAttempt.assignments || []
        }));
        return { success: true };
      }

      // If specific error returned from DB (like inactive account or wrong password), throw it
      if (tableAttempt.error) {
        throw new Error(tableAttempt.error);
      }

      // 2. Secondary login: Supabase Auth
      if (supabase) {
        const loginEmail = cleanIdentifier.includes('@')
          ? cleanIdentifier
          : `${cleanIdentifier.toLowerCase()}@zinnia.org`;

        try {
          let { data, error: signInErr } = await supabase.auth.signInWithPassword({
            email: loginEmail,
            password: password,
          });

          if (!signInErr && data?.user) {
            await loadUserProfile(data.user.id);
            return { success: true };
          }
        } catch (authErr) {
          console.warn('Supabase auth attempt error:', authErr);
        }
      }

      throw new Error('Coordinator credentials not found in database.');
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Sign in failed';
      setError(msg);
      return { success: false, error: msg };
    } finally {
      setIsLoading(false);
    }
  };

  const signOut = async () => {
    if (supabase) {
      await supabase.auth.signOut();
    }
    setProfile(null);
    setAssignments([]);
    setPermissions(defaultPermissions);
    localStorage.removeItem('ZINNIA_DEMO_USER_ID');
    localStorage.removeItem('ZINNIA_ACTIVE_COORDINATOR_ID');
    localStorage.removeItem('ZINNIA_ACTIVE_COORDINATOR_PROFILE');
  };

  const switchDemoUser = async (adminId: string) => {
    localStorage.setItem('ZINNIA_DEMO_USER_ID', adminId);
    await loadUserProfile(adminId);
  };

  return (
    <AuthContext.Provider value={{
      profile,
      assignments,
      permissions,
      isLoading,
      error,
      signIn,
      signOut,
      switchDemoUser,
    }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
