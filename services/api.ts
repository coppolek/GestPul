import { supabase } from '../lib/supabase';
import { Employee, WorkSite, LeaveRequest, SicknessRecord, Schedule, Assignment } from '../types';

type DBEmployee = {
  id: string;
  first_name: string;
  last_name: string;
  role: string;
  contract_type: string;
  start_date: string;
  end_date: string | null;
  medical_visit_expiry: string;
  phone: string;
  email: string;
  address: string;
  notes: string | null;
};

type DBWorkSite = {
  id: string;
  name: string;
  client: string;
  address: string;
  start_date: string;
  end_date: string | null;
  status: string;
};

type DBSiteAssignment = {
  id: string;
  site_id: string;
  employee_id: string;
  working_hours: string;
  working_days: string[];
};

type DBLeaveRequest = {
  id: string;
  employee_id: string;
  type: string;
  start_date: string;
  end_date: string;
  reason: string | null;
  status: string;
};

type DBSicknessRecord = {
  id: string;
  employee_id: string;
  start_date: string;
  end_date: string;
  notes: string | null;
};

type DBSchedule = {
  id: string;
  employee_id: string | null;
  label: string;
};

type DBScheduleAssignment = {
  id: string;
  schedule_id: string;
  assignment_date: string;
  site_id: string;
  start_time: string;
  end_time: string;
};

const mapDBEmployeeToEmployee = (dbEmp: DBEmployee): Employee => ({
  id: dbEmp.id,
  firstName: dbEmp.first_name,
  lastName: dbEmp.last_name,
  role: dbEmp.role as 'Operatore' | 'Jolly' | 'Impiegato',
  contractType: dbEmp.contract_type as 'Tempo Indeterminato' | 'Tempo Determinato',
  startDate: dbEmp.start_date,
  endDate: dbEmp.end_date || undefined,
  medicalVisitExpiry: dbEmp.medical_visit_expiry,
  phone: dbEmp.phone,
  email: dbEmp.email,
  address: dbEmp.address,
  notes: dbEmp.notes || undefined,
});

const mapEmployeeToDBEmployee = (emp: Omit<Employee, 'id'>): Omit<DBEmployee, 'id'> => ({
  first_name: emp.firstName,
  last_name: emp.lastName,
  role: emp.role,
  contract_type: emp.contractType,
  start_date: emp.startDate,
  end_date: emp.endDate || null,
  medical_visit_expiry: emp.medicalVisitExpiry,
  phone: emp.phone,
  email: emp.email,
  address: emp.address,
  notes: emp.notes || null,
});

export const getEmployees = async (): Promise<Employee[]> => {
  const { data, error } = await supabase
    .from('employees')
    .select('*')
    .order('last_name', { ascending: true });

  if (error) throw error;
  return (data || []).map(mapDBEmployeeToEmployee);
};

export const addEmployee = async (employee: Omit<Employee, 'id'>): Promise<Employee> => {
  const { data, error } = await supabase
    .from('employees')
    .insert(mapEmployeeToDBEmployee(employee))
    .select()
    .single();

  if (error) throw error;
  return mapDBEmployeeToEmployee(data);
};

export const addEmployees = async (employees: Omit<Employee, 'id'>[]): Promise<Employee[]> => {
  const { data, error } = await supabase
    .from('employees')
    .insert(employees.map(mapEmployeeToDBEmployee))
    .select();

  if (error) throw error;
  return (data || []).map(mapDBEmployeeToEmployee);
};

export const updateEmployee = async (id: string, employee: Employee): Promise<Employee> => {
  const { data, error } = await supabase
    .from('employees')
    .update(mapEmployeeToDBEmployee(employee))
    .eq('id', id)
    .select()
    .single();

  if (error) throw error;
  return mapDBEmployeeToEmployee(data);
};

export const deleteEmployee = async (id: string): Promise<void> => {
  const { error } = await supabase
    .from('employees')
    .delete()
    .eq('id', id);

  if (error) throw error;
};

export const getSites = async (): Promise<WorkSite[]> => {
  const { data: sitesData, error: sitesError } = await supabase
    .from('work_sites')
    .select('*')
    .order('name', { ascending: true });

  if (sitesError) throw sitesError;

  const { data: assignmentsData, error: assignmentsError } = await supabase
    .from('site_assignments')
    .select('*');

  if (assignmentsError) throw assignmentsError;

  return (sitesData || []).map((site: DBWorkSite) => ({
    id: site.id,
    name: site.name,
    client: site.client,
    address: site.address,
    startDate: site.start_date,
    endDate: site.end_date || undefined,
    status: site.status as 'In Corso' | 'Completato' | 'Sospeso',
    assignments: (assignmentsData || [])
      .filter((a: DBSiteAssignment) => a.site_id === site.id)
      .map((a: DBSiteAssignment) => ({
        employeeId: a.employee_id,
        workingHours: a.working_hours,
        workingDays: a.working_days,
      })),
  }));
};

export const addSite = async (site: Omit<WorkSite, 'id'>): Promise<WorkSite> => {
  const { data, error } = await supabase
    .from('work_sites')
    .insert({
      name: site.name,
      client: site.client,
      address: site.address,
      start_date: site.startDate,
      end_date: site.endDate || null,
      status: site.status,
    })
    .select()
    .single();

  if (error) throw error;

  if (site.assignments && site.assignments.length > 0) {
    const { error: assignmentsError } = await supabase
      .from('site_assignments')
      .insert(
        site.assignments.map((a) => ({
          site_id: data.id,
          employee_id: a.employeeId,
          working_hours: a.workingHours,
          working_days: a.workingDays,
        }))
      );

    if (assignmentsError) throw assignmentsError;
  }

  return {
    id: data.id,
    name: data.name,
    client: data.client,
    address: data.address,
    startDate: data.start_date,
    endDate: data.end_date || undefined,
    status: data.status as 'In Corso' | 'Completato' | 'Sospeso',
    assignments: site.assignments,
  };
};

export const updateSite = async (id: string, site: WorkSite): Promise<WorkSite> => {
  const { data, error } = await supabase
    .from('work_sites')
    .update({
      name: site.name,
      client: site.client,
      address: site.address,
      start_date: site.startDate,
      end_date: site.endDate || null,
      status: site.status,
    })
    .eq('id', id)
    .select()
    .single();

  if (error) throw error;

  await supabase.from('site_assignments').delete().eq('site_id', id);

  if (site.assignments && site.assignments.length > 0) {
    await supabase
      .from('site_assignments')
      .insert(
        site.assignments.map((a) => ({
          site_id: id,
          employee_id: a.employeeId,
          working_hours: a.workingHours,
          working_days: a.workingDays,
        }))
      );
  }

  return site;
};

export const deleteSite = async (id: string): Promise<void> => {
  const { error } = await supabase
    .from('work_sites')
    .delete()
    .eq('id', id);

  if (error) throw error;
};

export const getLeaveRequests = async (): Promise<LeaveRequest[]> => {
  const { data, error } = await supabase
    .from('leave_requests')
    .select('*')
    .order('start_date', { ascending: false });

  if (error) throw error;

  return (data || []).map((lr: DBLeaveRequest) => ({
    id: lr.id,
    employeeId: lr.employee_id,
    type: lr.type as any,
    startDate: lr.start_date,
    endDate: lr.end_date,
    reason: lr.reason || undefined,
    status: lr.status as any,
  }));
};

export const addLeaveRequest = async (leaveRequest: Omit<LeaveRequest, 'id'>): Promise<LeaveRequest> => {
  const { data, error } = await supabase
    .from('leave_requests')
    .insert({
      employee_id: leaveRequest.employeeId,
      type: leaveRequest.type,
      start_date: leaveRequest.startDate,
      end_date: leaveRequest.endDate,
      reason: leaveRequest.reason || null,
      status: leaveRequest.status,
    })
    .select()
    .single();

  if (error) throw error;

  return {
    id: data.id,
    employeeId: data.employee_id,
    type: data.type as any,
    startDate: data.start_date,
    endDate: data.end_date,
    reason: data.reason || undefined,
    status: data.status as any,
  };
};

export const updateLeaveRequest = async (id: string, leaveRequest: LeaveRequest): Promise<LeaveRequest> => {
  const { data, error } = await supabase
    .from('leave_requests')
    .update({
      employee_id: leaveRequest.employeeId,
      type: leaveRequest.type,
      start_date: leaveRequest.startDate,
      end_date: leaveRequest.endDate,
      reason: leaveRequest.reason || null,
      status: leaveRequest.status,
    })
    .eq('id', id)
    .select()
    .single();

  if (error) throw error;
  return leaveRequest;
};

export const deleteLeaveRequest = async (id: string): Promise<void> => {
  const { error } = await supabase
    .from('leave_requests')
    .delete()
    .eq('id', id);

  if (error) throw error;
};

export const getSicknessRecords = async (): Promise<SicknessRecord[]> => {
  const { data, error } = await supabase
    .from('sickness_records')
    .select('*')
    .order('start_date', { ascending: false });

  if (error) throw error;

  return (data || []).map((sr: DBSicknessRecord) => ({
    id: sr.id,
    employeeId: sr.employee_id,
    startDate: sr.start_date,
    endDate: sr.end_date,
    notes: sr.notes || undefined,
  }));
};

export const addSicknessRecord = async (sicknessRecord: Omit<SicknessRecord, 'id'>): Promise<SicknessRecord> => {
  const { data, error } = await supabase
    .from('sickness_records')
    .insert({
      employee_id: sicknessRecord.employeeId,
      start_date: sicknessRecord.startDate,
      end_date: sicknessRecord.endDate,
      notes: sicknessRecord.notes || null,
    })
    .select()
    .single();

  if (error) throw error;

  return {
    id: data.id,
    employeeId: data.employee_id,
    startDate: data.start_date,
    endDate: data.end_date,
    notes: data.notes || undefined,
  };
};

export const updateSicknessRecord = async (id: string, sicknessRecord: SicknessRecord): Promise<SicknessRecord> => {
  const { data, error } = await supabase
    .from('sickness_records')
    .update({
      employee_id: sicknessRecord.employeeId,
      start_date: sicknessRecord.startDate,
      end_date: sicknessRecord.endDate,
      notes: sicknessRecord.notes || null,
    })
    .eq('id', id)
    .select()
    .single();

  if (error) throw error;
  return sicknessRecord;
};

export const deleteSicknessRecord = async (id: string): Promise<void> => {
  const { error } = await supabase
    .from('sickness_records')
    .delete()
    .eq('id', id);

  if (error) throw error;
};

export const getSchedules = async (): Promise<Schedule[]> => {
  const { data: schedulesData, error: schedulesError } = await supabase
    .from('schedules')
    .select('*');

  if (schedulesError) throw schedulesError;

  const { data: assignmentsData, error: assignmentsError } = await supabase
    .from('schedule_assignments')
    .select('*');

  if (assignmentsError) throw assignmentsError;

  return (schedulesData || []).map((schedule: DBSchedule) => {
    const scheduleAssignments = (assignmentsData || []).filter(
      (a: DBScheduleAssignment) => a.schedule_id === schedule.id
    );

    const assignments: { [date: string]: Assignment[] } = {};
    scheduleAssignments.forEach((a: DBScheduleAssignment) => {
      if (!assignments[a.assignment_date]) {
        assignments[a.assignment_date] = [];
      }
      assignments[a.assignment_date].push({
        id: a.id,
        siteId: a.site_id,
        startTime: a.start_time,
        endTime: a.end_time,
      });
    });

    return {
      id: schedule.id,
      employeeId: schedule.employee_id,
      label: schedule.label,
      assignments,
    };
  });
};

export const addSchedule = async (schedule: Omit<Schedule, 'id'>): Promise<Schedule> => {
  const { data, error } = await supabase
    .from('schedules')
    .insert({
      employee_id: schedule.employeeId,
      label: schedule.label,
    })
    .select()
    .single();

  if (error) throw error;

  if (schedule.assignments && Object.keys(schedule.assignments).length > 0) {
    const assignmentsToInsert: any[] = [];
    Object.entries(schedule.assignments).forEach(([date, assignments]) => {
      assignments.forEach((a) => {
        assignmentsToInsert.push({
          schedule_id: data.id,
          assignment_date: date,
          site_id: a.siteId,
          start_time: a.startTime,
          end_time: a.endTime,
        });
      });
    });

    if (assignmentsToInsert.length > 0) {
      const { error: assignmentsError } = await supabase
        .from('schedule_assignments')
        .insert(assignmentsToInsert);

      if (assignmentsError) throw assignmentsError;
    }
  }

  return {
    id: data.id,
    employeeId: data.employee_id,
    label: data.label,
    assignments: schedule.assignments,
  };
};

export const updateSchedule = async (id: string, schedule: Schedule): Promise<Schedule> => {
  const { data, error } = await supabase
    .from('schedules')
    .update({
      employee_id: schedule.employeeId,
      label: schedule.label,
    })
    .eq('id', id)
    .select()
    .single();

  if (error) throw error;

  await supabase.from('schedule_assignments').delete().eq('schedule_id', id);

  if (schedule.assignments && Object.keys(schedule.assignments).length > 0) {
    const assignmentsToInsert: any[] = [];
    Object.entries(schedule.assignments).forEach(([date, assignments]) => {
      assignments.forEach((a) => {
        assignmentsToInsert.push({
          schedule_id: id,
          assignment_date: date,
          site_id: a.siteId,
          start_time: a.startTime,
          end_time: a.endTime,
        });
      });
    });

    if (assignmentsToInsert.length > 0) {
      await supabase
        .from('schedule_assignments')
        .insert(assignmentsToInsert);
    }
  }

  return schedule;
};

export const deleteSchedule = async (id: string): Promise<void> => {
  const { error } = await supabase
    .from('schedules')
    .delete()
    .eq('id', id);

  if (error) throw error;
};