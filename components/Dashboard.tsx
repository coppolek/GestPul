import React from 'react';
import { Employee, WorkSite, Message, LeaveRequest, SicknessRecord, ApiKey, AppSetting } from '../types';
import * as api from '../services/api';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import GeminiCommandPrompt from './GeminiCommandPrompt';
import BulletinBoard from './BulletinBoard'; // Import new component
import { useAuth } from '../contexts/AuthContext'; // Import useAuth

interface DashboardProps {
  employees: Employee[];
  setEmployees: React.Dispatch<React.SetStateAction<Employee[]>>;
  sites: WorkSite[];
  setSites: React.Dispatch<React.SetStateAction<WorkSite[]>>;
  leaveRequests: LeaveRequest[];
  sicknessRecords: SicknessRecord[];
  messages: Message[];
  setMessages: React.Dispatch<React.SetStateAction<Message[]>>;
  apiKeys: ApiKey[];
  appSettings: AppSetting[];
}

const Dashboard: React.FC<DashboardProps> = (props) => {
  const { user } = useAuth();
  const { employees, sites, messages, setMessages } = props;

  // Worker's Dashboard View
  if (user?.role === 'Lavoratore') {
    return (
        <BulletinBoard 
            messages={messages}
            setMessages={setMessages}
        />
    );
  }

  // Admin & Responsabile Dashboard View
  const activeSites = sites.filter(site => site.status === 'In Corso').length;
  
  const getUpcomingExpiries = (days: number) => {
    const today = new Date();
    const limitDate = new Date();
    limitDate.setDate(today.getDate() + days);
    
    return employees.filter(e => {
      const contractEndDate = e.endDate ? new Date(e.endDate) : null;
      const medicalVisitDate = new Date(e.medicalVisitExpiry);
      
      const isContractExpiring = contractEndDate && contractEndDate >= today && contractEndDate <= limitDate;
      const isMedicalVisitExpiring = medicalVisitDate >= today && medicalVisitDate <= limitDate;
      
      return isContractExpiring || isMedicalVisitExpiring;
    }).length;
  };
  
  const upcomingExpiries = getUpcomingExpiries(30);

  const employeesBySiteData = sites
    .filter(site => site.status === 'In Corso')
    .map(site => ({
      name: site.name.split(' - ')[0], // Shorten name for chart
      Dipendenti: site.assignments.length,
    }));


  return (
    <div className="space-y-12">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Dipendenti Totali */}
            <div className="bg-white p-4 rounded-lg shadow">
                <i className="fa-solid fa-users text-xl mb-2 text-gray-600"></i>
                <p className="text-md text-gray-800">Dipendenti Totali</p>
                <p className="text-2xl font-semibold">{employees.length}</p>
            </div>
            {/* Cantieri Attivi */}
            <div className="bg-white p-4 rounded-lg shadow">
                <i className="fa-solid fa-building-user text-xl mb-2 text-gray-600"></i>
                <p className="text-md text-gray-800">Cantieri Attivi</p>
                <p className="text-2xl font-semibold">{activeSites}</p>
            </div>
            {/* Scadenze */}
            <div className="bg-white p-4 rounded-lg shadow">
                <i className="fa-solid fa-calendar-check text-xl mb-2 text-gray-600"></i>
                <p className="text-md text-gray-800">Scadenze (30gg)</p>
                <p className="text-2xl font-semibold">{upcomingExpiries}</p>
            </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            <div className="bg-white p-6 rounded-xl shadow-lg lg:col-span-2">
                <h2 className="text-2xl font-bold text-black mb-4">Dipendenti per Cantiere Attivo</h2>
                <div style={{ width: '100%', height: 350 }}>
                    <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={employeesBySiteData}>
                            <CartesianGrid strokeDasharray="3 3" />
                            <XAxis dataKey="name" />
                            <YAxis allowDecimals={false} />
                            <Tooltip />
                            <Legend />
                            <Bar dataKey="Dipendenti" fill="#3b82f6" />
                        </BarChart>
                    </ResponsiveContainer>
                </div>
            </div>

            <div className="bg-white p-6 rounded-xl shadow-lg">
                <GeminiCommandPrompt 
                    employees={props.employees}
                    sites={props.sites}
                    apiKeys={props.apiKeys}
                    appSettings={props.appSettings}
                />
            </div>
        </div>

        {/* Show Bulletin Board management only for Admin */}
        {user?.role === 'Amministratore' && (
             <BulletinBoard 
                messages={messages}
                setMessages={setMessages}
            />
        )}
    </div>
  );
};

export default Dashboard;