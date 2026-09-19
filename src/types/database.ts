export type AdminRole = 'SUPER_ADMIN' | 'COORDINATOR' | 'GATE_STAFF' | 'FOOD_STAFF' | 'VOLUNTEER';

export type AssignmentType = 
  | 'OVERALL_TECH' 
  | 'TECH_EVENT' 
  | 'OVERALL_NON_TECH' 
  | 'NON_TECH_EVENT' 
  | 'FOOD' 
  | 'GATE_ENTRY';

export type CheckinType = 'ENTRY' | 'EVENT' | 'FOOD';

export type EventType = 'TECH' | 'NON_TECH';

export interface AdminProfile {
  id: string; // auth.users.id
  roll_no?: string;
  full_name: string;
  role: AdminRole | string;
  is_active: boolean;
  created_at?: string;
}

export interface CoordinatorAssignment {
  id: string;
  admin_id: string;
  assignment_type: AssignmentType | string;
  event_id: string | null;
}

export interface Team {
  team_id: string;
  team_name: string;
  college: string;
  department: string;
  year: string;
  registered_events: string[];
  payment_status: string;
  created_at?: string;
  updated_at?: string;
}

export interface TeamMember {
  id: string;
  user_id?: string;
  team_id: string;
  name: string;
  email: string;
  phone: string;
  is_leader: boolean;
  passport_token: string;
  passport_issued_at?: string | null;
  passport_status?: string | null;
  passport_sent_at?: string | null;
  passport_error?: string | null;
  created_at?: string;
}

export interface EventItem {
  id: string;
  code?: string;
  mission_name?: string;
  title: string;
  event_type: EventType | string;
  category?: string;
  clearance_level?: string;
  team_size_min?: number;
  team_size_max?: number;
  is_single_event_only?: boolean;
  schedule_time?: string;
  duration?: string;
  venue?: string;
  description?: string;
  rules?: string[];
  status?: string;
  results_finalized?: boolean;
  results_finalized_at?: string | null;
  coordinators?: any;
  registration_fee?: number;
  created_at?: string;
}

export interface EventRegistration {
  id: string;
  reg_id?: number;
  team_id: string;
  event_id: string;
  event_code?: string;
  user_id?: string;
  team_name?: string;
  position?: number;
  registered_at?: string;
}

// ----------------------------------------------------
// Exact zin26 PostgreSQL Schema Types
// ----------------------------------------------------

// 1. Participant Check-in (Gate Entry) - Table: zin26.participant_checkins
export interface ParticipantCheckinRecord {
  id?: number;
  user_id: string;
  checked_in_at?: string;
  checked_in_by?: string | null;
}

// 2. Event Attendance - Table: zin26.event_attendance
export interface EventAttendanceRecord {
  id?: number;
  user_id: string;
  event_code: string;
  reg_id: number;
  status: 'PRESENT' | 'ABSENT';
  checked_in_at?: string;
  marked_by?: string | null;
}

// 3. Food Attendance (Lunch Only, Once) - Table: zin26.food_attendance
export interface FoodAttendanceRecord {
  id?: number;
  user_id: string;
  collected_at?: string;
  collected_by?: string | null;
}

// Unified client-side AttendanceRecord for seamless UI handling
export interface AttendanceRecord {
  id?: string;
  team_id: string;
  member_id: string;
  user_id?: string;
  participant_name: string;
  college: string;
  checkin_type: CheckinType;
  event_id: string | null;
  event_code?: string | null;
  event_name: string | null;
  reg_id?: number | null;
  scanned_by: string;
  scanned_by_id: string;
  location: string | null;
  passport_token_used: string;
  scanned_at?: string;
}

// Scanned participant data package
export interface ScannedParticipant {
  member: TeamMember;
  team: Team;
  events: EventItem[];
  registered_events?: EventItem[];
  recentAttendances: AttendanceRecord[];
}
