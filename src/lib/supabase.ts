import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { 
  AdminProfile, 
  CoordinatorAssignment, 
  EventItem, 
  Team, 
  TeamMember, 
  AttendanceRecord, 
  ScannedParticipant, 
  CheckinType 
} from '../types/database';

// 1. Supabase Environment Setup
const envUrl = import.meta.env.VITE_SUPABASE_URL || '';
const envKey = import.meta.env.VITE_SUPABASE_ANON_KEY || '';

const storedUrl = typeof window !== 'undefined' ? localStorage.getItem('ZINNIA_SUPABASE_URL') || '' : '';
const storedKey = typeof window !== 'undefined' ? localStorage.getItem('ZINNIA_SUPABASE_ANON_KEY') || '' : '';

export const SUPABASE_URL = storedUrl || envUrl;
export const SUPABASE_ANON_KEY = storedKey || envKey;

export const isSupabaseConfigured = Boolean(
  SUPABASE_URL && 
  SUPABASE_ANON_KEY && 
  SUPABASE_URL.startsWith('https://')
);

export const supabase: SupabaseClient | null = isSupabaseConfigured
  ? createClient(SUPABASE_URL, SUPABASE_ANON_KEY)
  : null;

// Helper to format PostgreSQL error messages
function formatDbError(err: any): string {
  if (!err) return 'Unknown database error';
  if (err.code === '42501') {
    return 'Database permission denied (42501). Please run the grant_permissions.sql script in your Supabase SQL editor.';
  }
  return err.message || err.details || JSON.stringify(err);
}

const isValidUuid = (val?: string | null) => 
  Boolean(val && /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(val));

// ==============================================================================
// 1. COORDINATOR & ADMIN PROFILE (FROM public.admin_users)
// ==============================================================================

export async function getAdminProfile(userId: string): Promise<AdminProfile | null> {
  if (!supabase) return null;

  try {
    const { data: au, error } = await supabase
      .from('admin_users')
      .select('*')
      .eq('id', userId)
      .maybeSingle();

    if (error) {
      console.error('Error fetching admin_users row:', formatDbError(error));
      return null;
    }

    if (au) {
      return {
        id: String(au.id),
        roll_no: au.roll_no || au.rollno || au.username || 'ADMIN',
        full_name: au.full_name || au.name || au.username || 'Coordinator',
        role: au.role || (au.is_super_admin ? 'SUPER_ADMIN' : 'COORDINATOR'),
        is_active: au.is_active !== false,
        created_at: au.created_at || '',
      };
    }
  } catch (err) {
    console.error('getAdminProfile unexpected error:', err);
  }

  return null;
}

// 1B. Direct Database Authentication from public.admin_users
export async function loginWithCoordinatorTable(rollNo: string, passwordPlain: string): Promise<{
  success: boolean;
  profile?: AdminProfile;
  assignments?: CoordinatorAssignment[];
  error?: string;
}> {
  if (!supabase) {
    return { 
      success: false, 
      error: 'Database is not connected. Please verify VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY in .env.' 
    };
  }

  const cleanRoll = rollNo.trim().toLowerCase();

  try {
    // 1. Primary: Secure RPC Login (no admin_users table exposure needed)
    try {
      const { data: rpcRes, error: rpcErr } = await supabase.rpc('portal_coordinator_login', {
        p_username: cleanRoll,
        p_password: passwordPlain,
      });

      if (!rpcErr && rpcRes) {
        if (!rpcRes.success) {
          return { success: false, error: rpcRes.error || 'Invalid credentials.' };
        }

        const p = rpcRes.profile;
        const profile: AdminProfile = {
          id: String(p.id),
          roll_no: (p.username || cleanRoll).toUpperCase(),
          full_name: p.name || 'Coordinator',
          role: p.role || 'COORDINATOR',
          is_active: p.is_active !== false,
          created_at: new Date().toISOString(),
        };

        const rawScopes = Array.isArray(p.scopes) ? p.scopes : [];
        let assignments: CoordinatorAssignment[] = rawScopes.map((s: any, idx: number) => ({
          id: `asg-${profile.id}-${idx}`,
          admin_id: profile.id,
          assignment_type: profile.role,
          event_id: s.event_code || null,
        }));

        if (assignments.length === 0) {
          assignments = [
            {
              id: `asg-${profile.id}`,
              admin_id: profile.id,
              assignment_type: profile.role === 'SUPER_ADMIN' ? 'OVERALL_TECH' : profile.role,
              event_id: null,
            }
          ];
        }

        return { success: true, profile, assignments };
      }
    } catch (rpcCallErr) {
      console.warn('RPC portal_coordinator_login attempt skipped:', rpcCallErr);
    }

    // 2. Fallback: Direct table query (only works if admin_users read policy is active)
    const { data: adminUsers, error: auErr } = await supabase
      .from('admin_users')
      .select('*');

    if (auErr) {
      console.error('Database query error on public.admin_users:', auErr);
      if (auErr.code === '42501') {
        return { 
          success: false, 
          error: 'Database permission denied (42501). Please run the portal_coordinator_login SQL script in your Supabase SQL editor.' 
        };
      }
      return { success: false, error: formatDbError(auErr) };
    }

    if (!adminUsers || adminUsers.length === 0) {
      return { success: false, error: 'No coordinator users found in public.admin_users table.' };
    }

    // Match coordinator by roll_no, username, email, or id
    const found = adminUsers.find((u: any) => {
      const uRoll = (u.roll_no || u.rollno || u.username || u.email || u.id || '').toString().toLowerCase();
      return uRoll === cleanRoll;
    });

    if (!found) {
      return { 
        success: false, 
        error: `Coordinator "${rollNo.toUpperCase()}" not found in database.` 
      };
    }

    // Active status verification
    if (found.is_active === false) {
      return { 
        success: false, 
        error: 'ACCESS DENIED: Your coordinator account is marked INACTIVE in the database.' 
      };
    }

    // Password verification against database record
    const expectedPassword = found.password || found.password_hash || found.pwd;
    if (expectedPassword && passwordPlain && expectedPassword !== passwordPlain) {
      return { 
        success: false, 
        error: 'Incorrect password for coordinator.' 
      };
    }

    const profile: AdminProfile = {
      id: String(found.id || `admin-${cleanRoll}`),
      roll_no: found.roll_no || found.rollno || found.username || cleanRoll.toUpperCase(),
      full_name: found.full_name || found.name || found.username || 'Coordinator',
      role: found.role || (found.is_super_admin ? 'SUPER_ADMIN' : 'COORDINATOR'),
      is_active: found.is_active !== false,
      created_at: found.created_at || '',
    };

    // Load coordinator assignments from database (admin_event_scope or user row)
    let assignments: CoordinatorAssignment[] = [];
    try {
      const { data: scopes } = await supabase
        .from('admin_event_scope')
        .select('*')
        .eq('admin_id', found.id);

      if (scopes && scopes.length > 0) {
        assignments = scopes.map((s: any) => ({
          id: String(s.id),
          admin_id: profile.id,
          assignment_type: s.scope_type || s.assignment_type || profile.role,
          event_id: s.event_code || s.event_id || null,
        }));
      }
    } catch (scErr) {
      // admin_event_scope might not exist
    }

    if (assignments.length === 0) {
      assignments = [
        {
          id: `asg-${profile.id}`,
          admin_id: profile.id,
          assignment_type: found.assignment_type || (profile.role === 'SUPER_ADMIN' ? 'OVERALL_TECH' : (found.role || 'COORDINATOR')),
          event_id: found.event_id || found.event_code || null,
        }
      ];
    }

    return { success: true, profile, assignments };
  } catch (err: any) {
    return { success: false, error: err.message || 'Database error during authentication.' };
  }
}

// 2. Fetch Coordinator Assignments from Database
export async function getCoordinatorAssignments(adminId: string): Promise<CoordinatorAssignment[]> {
  if (!supabase) return [];

  try {
    const { data: scopes } = await supabase
      .from('admin_event_scope')
      .select('*')
      .eq('admin_id', adminId);

    if (scopes && scopes.length > 0) {
      return scopes.map((s: any) => ({
        id: String(s.id),
        admin_id: adminId,
        assignment_type: s.scope_type || s.assignment_type || 'COORDINATOR',
        event_id: s.event_code || s.event_id || null,
      }));
    }

    const { data: au } = await supabase
      .from('admin_users')
      .select('id, assignment_type, role, event_id')
      .eq('id', adminId)
      .maybeSingle();

    if (au) {
      return [{
        id: `asg-${au.id}`,
        admin_id: String(au.id),
        assignment_type: au.assignment_type || au.role || 'COORDINATOR',
        event_id: au.event_id || null,
      }];
    }
  } catch (err) {
    console.error('Error fetching coordinator assignments:', err);
  }

  return [];
}

// ==============================================================================
// 3. EVENTS CATALOG (FROM zin26.events)
// ==============================================================================

export async function getEvents(): Promise<EventItem[]> {
  if (!supabase) return [];

  try {
    const { data, error } = await supabase
      .schema('zin26')
      .from('events')
      .select('*')
      .order('sort_order', { ascending: true });

    if (error) {
      console.error('Error querying zin26.events:', formatDbError(error));
      return [];
    }

    if (data && data.length > 0) {
      return data.map((e: any) => ({
        id: e.code,
        code: e.code,
        mission_name: e.name || e.title || e.code,
        title: e.name || e.title || e.code,
        event_type: ((e.category || '').toUpperCase() === 'NON_TECH' ? 'NON_TECH' : 'TECH') as 'TECH' | 'NON_TECH',
        category: e.category || 'TECH',
        clearance_level: 'STANDARD',
        team_size_min: e.min_team || 1,
        team_size_max: e.max_team || 1,
        is_single_event_only: false,
        schedule_time: e.reg_closes_at || '',
        duration: e.duration_min ? `${e.duration_min} mins` : '30 mins',
        venue: e.window_code || 'Main Venue',
        description: `${e.name || e.code} (${e.type || 'Standard'})`,
        rules: [],
        status: e.is_active ? 'ONGOING' : 'SCHEDULED',
        results_finalized: false,
        registration_fee: 0,
        created_at: e.reg_opens_at || '',
      }));
    }
  } catch (err) {
    console.error('getEvents error:', err);
  }

  return [];
}

// ==============================================================================
// 4. PARTICIPANT LOOKUP & REGISTRATIONS (FROM zin26.participants)
// ==============================================================================

export async function lookupParticipantByToken(passportToken: string): Promise<ScannedParticipant | null> {
  const cleanToken = passportToken.trim();
  if (!cleanToken || !supabase) return null;

  try {
    // 1. Find participant in zin26.participants by user_id, phone, email, or token
    const { data: pList, error: pErr } = await supabase
      .schema('zin26')
      .from('participants')
      .select('*')
      .or(`user_id.eq.${cleanToken},phone.eq.${cleanToken},email.ilike.${cleanToken}`)
      .limit(1);

    if (pErr) {
      console.error('zin26.participants error:', formatDbError(pErr));
      return null;
    }

    let participant = pList && pList.length > 0 ? pList[0] : null;

    // Fallback: If not matched by exact fields, search by partial user_id
    if (!participant) {
      const { data: fallbackList } = await supabase
        .schema('zin26')
        .from('participants')
        .select('*')
        .ilike('user_id', `%${cleanToken}%`)
        .limit(1);

      if (fallbackList && fallbackList.length > 0) {
        participant = fallbackList[0];
      }
    }

    if (!participant) {
      return null;
    }

    const userId = participant.user_id;

    // 2. Fetch events list from zin26.events
    const allEvents = await getEvents();

    // 3. Find registered events from zin26.registrations for this user
    let userEvents: EventItem[] = [];
    try {
      const { data: regs } = await supabase
        .schema('zin26')
        .from('registrations')
        .select('*')
        .eq('user_id', userId);

      if (regs && regs.length > 0) {
        const eventCodes = regs.map((r: any) => String(r.event_code || r.event_id || '').toUpperCase().trim());
        userEvents = allEvents.filter(ev => 
          eventCodes.includes(String(ev.code).toUpperCase().trim()) || 
          eventCodes.includes(String(ev.id).toUpperCase().trim())
        );
      }
    } catch (regErr) {
      console.warn('zin26.registrations lookup error:', regErr);
    }

    // 4. Fetch prior attendance from zin26 attendance tables
    const recentAttendances: AttendanceRecord[] = [];

    try {
      const [checkinRes, foodRes, eventRes] = await Promise.all([
        supabase.schema('zin26').from('participant_checkins').select('*').eq('user_id', userId),
        supabase.schema('zin26').from('food_attendance').select('*').eq('user_id', userId),
        supabase.schema('zin26').from('event_attendance').select('*').eq('user_id', userId),
      ]);

      if (checkinRes.data && checkinRes.data.length > 0) {
        checkinRes.data.forEach((c: any) => {
          recentAttendances.push({
            id: `chk-${c.id}`,
            team_id: participant.team_id || '',
            member_id: userId,
            user_id: c.user_id,
            participant_name: participant.name || participant.full_name || userId,
            college: participant.college || '',
            checkin_type: 'ENTRY',
            event_id: null,
            event_code: null,
            event_name: 'Campus Gate Entry',
            scanned_by: 'Gate Staff',
            scanned_by_id: c.checked_in_by || '',
            location: 'Main Gate',
            passport_token_used: cleanToken,
            scanned_at: c.checked_in_at,
          });
        });
      }

      if (foodRes.data && foodRes.data.length > 0) {
        foodRes.data.forEach((f: any) => {
          recentAttendances.push({
            id: `food-${f.id}`,
            team_id: participant.team_id || '',
            member_id: userId,
            user_id: f.user_id,
            participant_name: participant.name || participant.full_name || userId,
            college: participant.college || '',
            checkin_type: 'FOOD',
            event_id: null,
            event_code: null,
            event_name: 'Lunch Food Service',
            scanned_by: 'Food Staff',
            scanned_by_id: f.collected_by || '',
            location: 'Dining Hall',
            passport_token_used: cleanToken,
            scanned_at: f.collected_at,
          });
        });
      }

      if (eventRes.data && eventRes.data.length > 0) {
        eventRes.data.forEach((e: any) => {
          const matchedEv = allEvents.find(ev => ev.code === e.event_code || ev.id === e.event_code);
          recentAttendances.push({
            id: `ev-${e.id}`,
            team_id: participant.team_id || '',
            member_id: userId,
            user_id: e.user_id,
            participant_name: participant.name || participant.full_name || userId,
            college: participant.college || '',
            checkin_type: 'EVENT',
            event_id: e.event_code,
            event_code: e.event_code,
            event_name: matchedEv?.title || `Event ${e.event_code}`,
            reg_id: e.reg_id,
            scanned_by: 'Event Coordinator',
            scanned_by_id: e.marked_by || '',
            location: matchedEv?.venue || 'Event Venue',
            passport_token_used: cleanToken,
            scanned_at: e.checked_in_at,
          });
        });
      }
    } catch (attErr) {
      console.warn('Attendance history lookup skipped:', attErr);
    }

    const member: TeamMember = {
      id: userId,
      user_id: userId,
      team_id: participant.team_id || `team-${userId}`,
      name: participant.name || participant.full_name || userId,
      email: participant.email || `${userId}@zinnia.org`,
      phone: participant.phone || '',
      is_leader: participant.is_leader ?? true,
      passport_token: cleanToken,
      passport_issued_at: participant.created_at || '',
      passport_status: 'ISSUED',
      passport_sent_at: participant.created_at || '',
      passport_error: null,
      created_at: participant.created_at || '',
    };

    const team: Team = {
      team_id: member.team_id,
      team_name: participant.team_name || `${member.name}'s Team`,
      college: participant.college || 'Engineering College',
      department: participant.department || 'Computer Science',
      year: String(participant.year || '3'),
      registered_events: userEvents.map(e => e.id),
      payment_status: 'PAID',
      created_at: participant.created_at || '',
      updated_at: '',
    };

    return {
      member,
      team,
      events: userEvents,
      registered_events: userEvents,
      recentAttendances,
    };
  } catch (err) {
    console.error('lookupParticipantByToken error:', err);
    return null;
  }
}

// ==============================================================================
// 5. DUPLICATE CHECK & ATTENDANCE RECORDING (zin26 tables)
// ==============================================================================

export async function checkDuplicateAttendance(
  memberId: string, 
  checkinType: CheckinType, 
  eventIdOrCode?: string | null,
  participantUserId?: string | null
): Promise<AttendanceRecord | null> {
  const userId = participantUserId || memberId;
  if (!supabase) return null;

  try {
    // Fetch real student name & college for duplicate warning message
    let pName = userId;
    let pCollege = '';
    try {
      const { data: pData } = await supabase
        .schema('zin26')
        .from('participants')
        .select('name, college')
        .eq('user_id', userId)
        .maybeSingle();
      if (pData) {
        pName = pData.name || userId;
        pCollege = pData.college || '';
      }
    } catch (e) {}

    if (checkinType === 'ENTRY') {
      const { data, error } = await supabase
        .schema('zin26')
        .from('participant_checkins')
        .select('*')
        .eq('user_id', userId)
        .maybeSingle();

      if (error) {
        console.error('zin26.participant_checkins duplicate check error:', formatDbError(error));
        return null;
      }

      if (data) {
        return {
          id: `chk-${data.id}`,
          team_id: '',
          member_id: memberId,
          user_id: data.user_id,
          participant_name: pName,
          college: pCollege,
          checkin_type: 'ENTRY',
          event_id: null,
          event_code: null,
          event_name: 'Campus Gate Entry',
          scanned_by: 'Gate Staff',
          scanned_by_id: data.checked_in_by || '',
          location: 'Campus Gate',
          passport_token_used: '',
          scanned_at: data.checked_in_at,
        };
      }
    } else if (checkinType === 'FOOD') {
      const { data, error } = await supabase
        .schema('zin26')
        .from('food_attendance')
        .select('*')
        .eq('user_id', userId)
        .maybeSingle();

      if (error) {
        console.error('zin26.food_attendance duplicate check error:', formatDbError(error));
        return null;
      }

      if (data) {
        return {
          id: `food-${data.id}`,
          team_id: '',
          member_id: memberId,
          user_id: data.user_id,
          participant_name: pName,
          college: pCollege,
          checkin_type: 'FOOD',
          event_id: null,
          event_code: null,
          event_name: 'Lunch Food Service',
          scanned_by: 'Food Staff',
          scanned_by_id: data.collected_by || '',
          location: 'Dining Hall',
          passport_token_used: '',
          scanned_at: data.collected_at,
        };
      }
    } else if (checkinType === 'EVENT') {
      const cleanCode = (eventIdOrCode || '').trim();
      let query = supabase
        .schema('zin26')
        .from('event_attendance')
        .select('*')
        .eq('user_id', userId);

      if (cleanCode) {
        query = query.eq('event_code', cleanCode);
      }

      const { data, error } = await query.maybeSingle();
      if (error) {
        console.error('zin26.event_attendance duplicate check error:', formatDbError(error));
        return null;
      }

      if (data) {
        return {
          id: `ev-${data.id}`,
          team_id: '',
          member_id: memberId,
          user_id: data.user_id,
          participant_name: pName,
          college: pCollege,
          checkin_type: 'EVENT',
          event_id: data.event_code,
          event_code: data.event_code,
          event_name: `Event ${data.event_code}`,
          reg_id: data.reg_id,
          scanned_by: 'Event Coordinator',
          scanned_by_id: data.marked_by || '',
          location: 'Event Venue',
          passport_token_used: '',
          scanned_at: data.checked_in_at,
        };
      }
    }
  } catch (err) {
    console.error('checkDuplicateAttendance error:', err);
  }

  return null;
}

export async function recordAttendance(record: Omit<AttendanceRecord, 'id' | 'scanned_at'>): Promise<{
  success: boolean;
  duplicate?: boolean;
  priorRecord?: AttendanceRecord;
  error?: string;
  data?: AttendanceRecord;
}> {
  if (!supabase) {
    return { success: false, error: 'Database is not connected.' };
  }

  const userId = record.user_id || record.member_id;
  const eventCode = record.event_code || record.event_id || '01';

  // 1. Verify duplicate before insertion
  const prior = await checkDuplicateAttendance(record.member_id, record.checkin_type, eventCode, userId);
  if (prior) {
    return {
      success: false,
      duplicate: true,
      priorRecord: prior,
      error: `Already recorded in database for ${record.checkin_type}`
    };
  }

  const newRecord: AttendanceRecord = {
    ...record,
    user_id: userId,
    event_code: record.checkin_type === 'EVENT' ? eventCode : null,
    scanned_at: new Date().toISOString(),
  };

  const coordinatorUuid = isValidUuid(record.scanned_by_id) ? record.scanned_by_id : null;

  try {
    if (record.checkin_type === 'ENTRY') {
      // Table 1: zin26.participant_checkins
      const { data, error } = await supabase
        .schema('zin26')
        .from('participant_checkins')
        .insert({
          user_id: userId,
          checked_in_at: newRecord.scanned_at,
          checked_in_by: coordinatorUuid,
        })
        .select()
        .single();

      if (error) {
        if (error.code === '23505') {
          return { success: false, duplicate: true, error: 'Participant already checked in at campus gate.' };
        }
        return { success: false, error: formatDbError(error) };
      }

      newRecord.id = String(data.id);
    } else if (record.checkin_type === 'FOOD') {
      // Table 3: zin26.food_attendance
      const { data, error } = await supabase
        .schema('zin26')
        .from('food_attendance')
        .insert({
          user_id: userId,
          collected_at: newRecord.scanned_at,
          collected_by: coordinatorUuid,
        })
        .select()
        .single();

      if (error) {
        if (error.code === '23505') {
          return { success: false, duplicate: true, error: 'Lunch meal already marked as collected.' };
        }
        return { success: false, error: formatDbError(error) };
      }

      newRecord.id = String(data.id);
    } else if (record.checkin_type === 'EVENT') {
      // 1. Fetch real registration ID strictly for THIS participant and THIS specific event
      let regId = record.reg_id;
      if (!regId) {
        try {
          const { data: regRow } = await supabase
            .schema('zin26')
            .from('registrations')
            .select('reg_id')
            .eq('user_id', userId)
            .eq('event_code', eventCode)
            .maybeSingle();

          if (regRow?.reg_id) {
            regId = regRow.reg_id;
          } else {
            // Strictly disallow spot attendance: only pre-registered candidates are permitted
            return {
              success: false,
              error: `Candidate is not pre-registered for ${record.event_name || eventCode || 'this event'}. On-spot attendance is not permitted.`,
            };
          }
        } catch (regFetchErr) {
          console.warn('Could not query registrations for event:', regFetchErr);
        }
      }

      const insertPayload: any = {
        user_id: userId,
        event_code: eventCode,
        status: 'PRESENT',
        checked_in_at: newRecord.scanned_at,
        marked_by: coordinatorUuid,
      };

      if (regId) {
        insertPayload.reg_id = regId;
      }

      // Table 2: zin26.event_attendance
      const { data, error } = await supabase
        .schema('zin26')
        .from('event_attendance')
        .insert(insertPayload)
        .select()
        .single();

      if (error) {
        if (error.code === '23505') {
          return { success: false, duplicate: true, error: 'Attendance already marked for this event.' };
        }
        return { success: false, error: formatDbError(error) };
      }

      newRecord.id = String(data.id);
    }

    return { success: true, data: newRecord };
  } catch (err: any) {
    return { success: false, error: err.message || 'Database insert failed.' };
  }
}

// ==============================================================================
// 6. LIVE STATISTICS (FROM zin26 DB TABLES)
// ==============================================================================

export async function fetchLiveStats() {
  if (!supabase) {
    return {
      totalParticipants: 0,
      entryCount: 0,
      foodCount: 0,
      events: [] as EventItem[],
      records: [] as AttendanceRecord[],
      eventRegistrationCounts: {} as Record<string, number>,
      eventPresentCounts: {} as Record<string, number>,
    };
  }

  try {
    const [participantsRes, checkinsRes, foodRes, eventAttRes, regsRes, events] = await Promise.all([
      supabase.schema('zin26').from('participants').select('user_id, name, college, department'),
      supabase.schema('zin26').from('participant_checkins').select('id, user_id, checked_in_at, checked_in_by'),
      supabase.schema('zin26').from('food_attendance').select('id, user_id, collected_at, collected_by'),
      supabase.schema('zin26').from('event_attendance').select('*'),
      supabase.schema('zin26').from('registrations').select('reg_id, event_code, user_id, status'),
      getEvents(),
    ]);

    const participantList = participantsRes?.data || [];
    const totalParticipants = participantList.length || (checkinsRes?.data?.length || 0);
    const entryCount = checkinsRes?.data?.length || 0;
    const foodCount = foodRes?.data?.length || 0;

    // Fast lookup map for real student names & college
    const pMap = new Map<string, { name: string; college: string; department: string }>();
    participantList.forEach((p: any) => {
      pMap.set(p.user_id, {
        name: p.name || p.user_id,
        college: p.college || 'Engineering College',
        department: p.department || '',
      });
    });

    // Count real registrations per event
    const eventRegistrationCounts: Record<string, number> = {};
    if (regsRes?.data) {
      regsRes.data.forEach((r: any) => {
        if (r.status !== 'CANCELLED' && r.event_code) {
          const code = String(r.event_code).trim();
          eventRegistrationCounts[code] = (eventRegistrationCounts[code] || 0) + 1;
        }
      });
    }

    // Count real attendance per event & build records
    const eventPresentCounts: Record<string, number> = {};
    const records: AttendanceRecord[] = [];

    // 1. Gate Check-ins (ENTRY)
    if (checkinsRes?.data) {
      checkinsRes.data.forEach((chk: any) => {
        const info = pMap.get(chk.user_id);
        records.push({
          id: `chk-${chk.id}`,
          team_id: '',
          member_id: chk.user_id,
          user_id: chk.user_id,
          participant_name: info?.name || chk.user_id,
          college: info?.college || '',
          checkin_type: 'ENTRY',
          event_id: null,
          event_code: null,
          event_name: 'Campus Gate Entry',
          scanned_by: 'Gate Staff',
          scanned_by_id: chk.checked_in_by || '',
          location: 'Main Gate',
          passport_token_used: chk.user_id,
          scanned_at: chk.checked_in_at,
        });
      });
    }

    // 2. Food Attendance (FOOD)
    if (foodRes?.data) {
      foodRes.data.forEach((f: any) => {
        const info = pMap.get(f.user_id);
        records.push({
          id: `food-${f.id}`,
          team_id: '',
          member_id: f.user_id,
          user_id: f.user_id,
          participant_name: info?.name || f.user_id,
          college: info?.college || '',
          checkin_type: 'FOOD',
          event_id: null,
          event_code: null,
          event_name: 'Lunch Food Service',
          scanned_by: 'Food Staff',
          scanned_by_id: f.collected_by || '',
          location: 'Dining Hall',
          passport_token_used: f.user_id,
          scanned_at: f.collected_at,
        });
      });
    }

    // 3. Event Attendance (EVENT)
    if (eventAttRes?.data) {
      eventAttRes.data.forEach((ea: any) => {
        const code = String(ea.event_code || '').trim();
        if (ea.status === 'PRESENT' || !ea.status) {
          eventPresentCounts[code] = (eventPresentCounts[code] || 0) + 1;
        }
        const matchedEv = events.find(ev => ev.code === code || ev.id === code);
        const info = pMap.get(ea.user_id);
        records.push({
          id: `ev-${ea.id}`,
          team_id: '',
          member_id: ea.user_id,
          user_id: ea.user_id,
          participant_name: info?.name || ea.user_id,
          college: info?.college || '',
          checkin_type: 'EVENT',
          event_id: ea.event_code,
          event_code: ea.event_code,
          event_name: matchedEv?.title || `Event ${ea.event_code}`,
          reg_id: ea.reg_id,
          scanned_by: 'Event Coordinator',
          scanned_by_id: ea.marked_by || '',
          location: matchedEv?.venue || '',
          passport_token_used: ea.user_id,
          scanned_at: ea.checked_in_at,
        });
      });
    }

    // Sort all records chronologically with newest first
    records.sort((a, b) => {
      const timeA = a.scanned_at ? new Date(a.scanned_at).getTime() : 0;
      const timeB = b.scanned_at ? new Date(b.scanned_at).getTime() : 0;
      return timeB - timeA;
    });

    return {
      totalParticipants,
      entryCount,
      foodCount,
      events,
      records,
      eventRegistrationCounts,
      eventPresentCounts,
    };
  } catch (err) {
    console.error('fetchLiveStats error:', err);
    return {
      totalParticipants: 0,
      entryCount: 0,
      foodCount: 0,
      events: [] as EventItem[],
      records: [] as AttendanceRecord[],
      eventRegistrationCounts: {} as Record<string, number>,
      eventPresentCounts: {} as Record<string, number>,
    };
  }
}

// ==============================================================================
// 7. PARTICIPANT SEARCH (FROM zin26.participants)
// ==============================================================================

export async function searchParticipants(query: string) {
  const q = query.trim();
  if (!q || !supabase) return [];

  try {
    const { data: members, error } = await supabase
      .schema('zin26')
      .from('participants')
      .select('*')
      .or(`user_id.ilike.%${q}%,name.ilike.%${q}%,college.ilike.%${q}%,department.ilike.%${q}%,phone.ilike.%${q}%`)
      .limit(20);

    if (error) {
      console.error('Search error on zin26.participants:', formatDbError(error));
      return [];
    }

    return (members || []).map((m: any) => ({
      id: m.user_id,
      team_id: m.team_id || m.user_id,
      name: m.name || m.full_name || m.user_id,
      email: m.email || '',
      phone: m.phone || '',
      is_leader: m.is_leader ?? true,
      passport_token: m.user_id,
    }));
  } catch (err) {
    console.error('searchParticipants error:', err);
    return [];
  }
}
