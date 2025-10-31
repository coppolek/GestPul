export interface Employee {
  id: string;
  firstName: string;
  lastName: string;
  role: 'Operatore' | 'Jolly' | 'Impiegato';
  contractType: 'Tempo Indeterminato' | 'Tempo Determinato';
  startDate: string;
  endDate?: string;
  medicalVisitExpiry: string;
  phone: string;
  email: string;
  address: string;
  notes?: string;
}

export interface SiteAssignment {
  id: string;
  employeeId: string;
  workingHours: string;
  workingDays: string[];
}

export interface WorkSite {
  id:string;
  name: string;
  client: string;
  address: string;
  startDate: string;
  endDate?: string;
  status: 'In Corso' | 'Completato' | 'Sospeso';
  assignments: SiteAssignment[];
}

export enum AbsenceStatus {
  IN_ATTESA = 'In Attesa',
  APPROVATO = 'Approvato',
  RIFIUTATO = 'Rifiutato',
}

export enum AbsenceType {
  FERIE = 'Ferie',
  PERMESSO = 'Permesso',
  MALATTIA_BAMBINO = 'Malattia Bambino',
  ALTRO = 'Altro',
}

export interface LeaveRequest {
  id: string;
  employeeId: string;
  type: AbsenceType;
  startDate: string;
  endDate: string;
  reason?: string;
  status: AbsenceStatus;
}

export interface SicknessRecord {
  id: string;
  employeeId: string;
  startDate: string;
  endDate: string;
  notes?: string;
}

export interface AttendanceRecord {
  id: string;
  employeeId: string;
  timestamp: string; // ISO string for date and time
  type: 'Entrata' | 'Uscita';
  notes?: string;
}

// For JollyPlans component
export interface Assignment {
    id: string;
    siteId: string;
    startTime: string;
    endTime: string;
    originalEmployeeName?: string;
    notes?: string;
    extraOperatorIds?: string[];
}
  
export interface Schedule {
    id: string;
    employeeId: string | null;
    label: string;
    assignments: {
      [date: string]: Assignment[];
    };
}

// --- Auth Types ---
export type Role = 'Amministratore' | 'Responsabile' | 'Lavoratore';

export interface User {
  id: string;
  username: string;
  role: Role;
  employeeId?: string; // Links user login to an employee record
  password?: string; // Only used for creating/updating
}

// --- Settings Types ---
export interface ApiKey {
    id: 'google_gemini' | 'google_maps' | 'open_route_service' | 'groq';
    name: string;
    key: string;
}

export interface AiProviderSetting {
  id: 'ai_provider';
  value: 'gemini' | 'groq';
}

export interface DatabaseConfig {
  id: 'database_config';
  provider: 'local' | 'supabase' | 'firebase';
  supabaseUrl: string;
  supabaseKey: string;
  firebaseConfig: string;
}

export interface ModuleVisibility {
  id: 'module_visibility';
  settings: {
    [path: string]: Role[];
  };
}

export type AppSetting = AiProviderSetting | DatabaseConfig | ModuleVisibility;


// --- Dashboard Types ---
export interface Message {
  id: string;
  text: string;
  authorId: string;
  authorName: string;
  timestamp: string; // ISO string
}