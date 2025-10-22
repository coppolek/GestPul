import React from 'react';
import { Employee, WorkSite } from '../types';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';

interface DashboardProps {
  employees: Employee[];
  sites: WorkSite[];
}

const Dashboard: React.FC<DashboardProps> = ({ employees, sites }) => {
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
        <div className="space-y-8">
            {/* Dipendenti Totali */}
            <div>
                <i className="fa-solid fa-users text-xl mb-2 text-gray-600"></i>
                <p className="text-md text-gray-800">Dipendenti Totali</p>
                <p className="text-2xl font-semibold">{employees.length}</p>
            </div>
            {/* Cantieri Attivi */}
            <div>
                <i className="fa-solid fa-building-user text-xl mb-2 text-gray-600"></i>
                <p className="text-md text-gray-800">Cantieri Attivi</p>
                <p className="text-2xl font-semibold">{activeSites}</p>
            </div>
            {/* Scadenze */}
            <div>
                <i className="fa-solid fa-calendar-check text-xl mb-2 text-gray-600"></i>
                <p className="text-md text-gray-800">Scadenze (30gg)</p>
                <p className="text-2xl font-semibold">{upcomingExpiries}</p>
            </div>
        </div>

        <div>
            <h2 className="text-2xl font-bold text-black mb-4">Dipendenti per Cantiere Attivo</h2>
            <div style={{ width: '100%', height: 300 }}>
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
    </div>
  );
};

export default Dashboard;
