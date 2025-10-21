
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

// For JollyPlans component
export interface Assignment {
    id: string;
    siteId: string;
    startTime: string;
    endTime: string;
}
  
export interface Schedule {
    id: string;
    employeeId: string | null;
    label: string;
    assignments: {
      [date: string]: Assignment[];
    };
}
