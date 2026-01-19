
import React from 'react';
import { Employee, WorkSite, Message, LeaveRequest, SicknessRecord, ApiKey, AppSetting, MessageGroup } from '../types';
import * as api from '../services/api';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import GeminiCommandPrompt from './GeminiCommandPrompt';
import BulletinBoard from './BulletinBoard'; 
import { useAuth } from '../contexts/AuthContext';
import { Link } from 'react-router-dom';

interface DashboardProps {
  employees: Employee[];
  setEmployees: React.Dispatch<React.SetStateAction<Employee[]>>;
  sites: WorkSite[];
  setSites: React.Dispatch<React.SetStateAction<WorkSite[]>>;
  leaveRequests: LeaveRequest[];
  sicknessRecords: SicknessRecord[];
  messages: Message[];
  setMessages: React.Dispatch<React.SetStateAction<Message[]>>;
  messageGroups: MessageGroup[];
  setMessageGroups: React.Dispatch<React.SetStateAction<MessageGroup[]>>;
  apiKeys: ApiKey[];
  appSettings: AppSetting[];
}

const Dashboard: React.FC<DashboardProps> = (props) => {
  const { user } = useAuth();
  const { employees, sites, messages, setMessages, messageGroups, setMessageGroups } = props;

  // Worker's Dashboard View
  if (user?.role === 'Lavoratore') {
    return (
        <BulletinBoard 
            messages={messages}
            setMessages={setMessages}
            employees={employees}
            messageGroups={messageGroups}
            setMessageGroups={setMessageGroups}
        />
    );
  }

  // --- EMPTY STATE (Welcome Screen) ---
  if (employees.length === 0 && sites.length === 0) {
      return (
          <div className="flex flex-col items-center justify-center min-h-[60vh] text-center space-y-8">
              <div className="bg-white p-8 rounded-2xl shadow-xl max-w-2xl border border-blue-100">
                  <div className="w-20 h-20 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center mx-auto mb-6">
                      <i className="fa-solid fa-rocket text-4xl"></i>
                  </div>
                  <h2 className="text-3xl font-bold text-gray-800 mb-4">Benvenuto in Coppolecchia Manager</h2>
                  <p className="text-gray-600 mb-8 text-lg">
                      Il sistema è pronto. Inizia a configurare la tua impresa aggiungendo le prime risorse.
                  </p>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <Link to="/dipendenti" className="p-6 bg-blue-50 hover:bg-blue-100 rounded-xl transition-colors border border-blue-200 group">
                          <i className="fa-solid fa-users text-3xl text-blue-600 mb-3 group-hover:scale-110 transition-transform"></i>
                          <h3 className="font-bold text-gray-800">1. Aggiungi Dipendenti</h3>
                          <p className="text-sm text-gray-500 mt-1">Crea le anagrafiche del tuo staff o importale da CSV.</p>
                      </Link>
                      
                      <Link to="/cantieri" className="p-6 bg-green-50 hover:bg-green-100 rounded-xl transition-colors border border-green-200 group">
                          <i className="fa-solid fa-building text-3xl text-green-600 mb-3 group-hover:scale-110 transition-transform"></i>
                          <h3 className="font-bold text-gray-800">2. Crea Cantieri</h3>
                          <p className="text-sm text-gray-500 mt-1">Definisci i luoghi di lavoro e assegna il personale.</p>
                      </Link>
                  </div>

                  <div className="mt-8 pt-6 border-t border-gray-100">
                      <p className="text-sm text-gray-500">
                          <i className="fa-solid fa-info-circle mr-2"></i>
                          Suggerimento: Vai su <Link to="/impostazioni/api" className="text-blue-600 hover:underline">Impostazioni API</Link> per configurare l'intelligenza artificiale e le mappe.
                      </p>
                  </div>
              </div>
          </div>
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
                {employeesBySiteData.length > 0 ? (
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
                ) : (
                    <div className="h-[350px] flex items-center justify-center text-gray-400 italic">
                        Nessun dato da visualizzare. Assegna dipendenti ai cantieri.
                    </div>
                )}
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
                employees={employees}
                messageGroups={messageGroups}
                setMessageGroups={setMessageGroups}
            />
        )}
    </div>
  );
};

export default Dashboard;
