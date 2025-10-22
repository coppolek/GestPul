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
                api.getData<Employee[]>('employees'),
                api.getData<WorkSite[]>('sites'),
                api.getData<LeaveRequest[]>('leaveRequests'),
                api.getData<SicknessRecord[]>('sicknessRecords'),
                api.getData<Schedule[]>('schedules'),
            ]);

            setEmployees(employeesData);
            setSites(sitesData);
            setLeaveRequests(leaveRequestsData.sort((a,b) => new Date(b.startDate).getTime() - new Date(a.startDate).getTime()));
            setSicknessRecords(sicknessRecordsData.sort((a,b) => new Date(b.startDate).getTime() - new Date(a.startDate).getTime()));
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