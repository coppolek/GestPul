import { useState, useEffect } from 'react';
import { Employee, WorkSite, LeaveRequest, SicknessRecord, Schedule, User, ApiKey, Message, AppSetting, AttendanceRecord } from '../types';
import * as api from '../services/api';


export const useAppData = () => {
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [sites, setSites] = useState<WorkSite[]>([]);
  const [leaveRequests, setLeaveRequests] = useState<LeaveRequest[]>([]);
  const [sicknessRecords, setSicknessRecords] = useState<SicknessRecord[]>([]);
  const [attendances, setAttendances] = useState<AttendanceRecord[]>([]);
  const [schedules, setSchedules] = useState<Schedule[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [apiKeys, setApiKeys] = useState<ApiKey[]>([]);
  const [messages, setMessages] = useState<Message[]>([]);
  const [appSettings, setAppSettings] = useState<AppSetting[]>([]);
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
                attendancesData,
                schedulesData,
                usersData,
                apiKeysData,
                messagesData,
                appSettingsData,
            ] = await Promise.all([
                api.getData<Employee[]>('employees'),
                api.getData<WorkSite[]>('sites'),
                api.getData<LeaveRequest[]>('leaveRequests'),
                api.getData<SicknessRecord[]>('sicknessRecords'),
                api.getData<AttendanceRecord[]>('attendances'),
                api.getData<Schedule[]>('schedules'),
                api.getData<User[]>('users'),
                api.getData<ApiKey[]>('apiKeys'),
                api.getData<Message[]>('messages'),
                api.getData<AppSetting[]>('appSettings'),
            ]);

            setEmployees(employeesData);
            setSites(sitesData);
            setLeaveRequests(leaveRequestsData.sort((a,b) => new Date(b.startDate).getTime() - new Date(a.startDate).getTime()));
            setSicknessRecords(sicknessRecordsData.sort((a,b) => new Date(b.startDate).getTime() - new Date(a.startDate).getTime()));
            setAttendances(attendancesData.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()));
            setSchedules(schedulesData);
            setUsers(usersData);
            setApiKeys(apiKeysData);
            setMessages(messagesData.sort((a,b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()));
            setAppSettings(appSettingsData);

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
    attendances, setAttendances,
    schedules, setSchedules, 
    users, setUsers,
    apiKeys, setApiKeys,
    messages, setMessages,
    appSettings, setAppSettings,
    loading 
  };
};