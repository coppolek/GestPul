import { useState, useEffect } from 'react';
import { Employee, WorkSite, LeaveRequest, SicknessRecord, Schedule } from '../types';
import * as api from '../services/api';


export const useAppData = () => {
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [sites, setSites] = useState<WorkSite[]>([]);
  const [leaveRequests, setLeaveRequests] = useState<LeaveRequest[]>([]);
  const [sicknessRecords, setSicknessRecords] = useState<SicknessRecord[]>([]);
  const [schedules, setSchedules] = useState<Schedule[]>([]);
  const [loading, setLoading] = useState<boolean>(true);


  useEffect(() => {
    const fetchAllData = async () => {
        try {
            setLoading(true);
            const [
                employeesData,
                sitesData,
                leaveRequestsData,
                sicknessRecordsData,
                schedulesData
            ] = await Promise.all([
                api.getEmployees(),
                api.getSites(),
                api.getLeaveRequests(),
                api.getSicknessRecords(),
                api.getSchedules(),
            ]);

            setEmployees(employeesData);
            setSites(sitesData);
            setLeaveRequests(leaveRequestsData);
            setSicknessRecords(sicknessRecordsData);
            setSchedules(schedulesData);

        } catch (error) {
            console.error("Failed to fetch initial data", error);
        } finally {
            setLoading(false);
        }
    };

    fetchAllData();
  }, []);

  return { 
    employees, setEmployees, 
    sites, setSites, 
    leaveRequests, setLeaveRequests, 
    sicknessRecords, setSicknessRecords,
    schedules, setSchedules, 
    loading 
  };
};