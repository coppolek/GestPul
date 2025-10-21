import React from 'react';
import { Employee, WorkSite } from '../types';
import Card from './ui/Card';
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
    <div className="space-y-8">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
        <Card 
          title="Dipendenti Totali" 
          value={employees.length} 
          icon="fa-users"
          color="bg-blue-500"
        />
        <Card 
          title="Cantieri Attivi" 
          value={activeSites} 
          icon="fa-building-user"
          color="bg-green-500"
        />
        <Card 
          title="Scadenze (30gg)" 
          value={upcomingExpiries} 
          icon="fa-calendar-check"
          color="bg-yellow-500"
        />
      </div>

      <div className="bg-white p-6 rounded-xl shadow-lg">
          <h3 className="text-xl font-bold text-gray-800 mb-4">Dipendenti per Cantiere Attivo</h3>
          <ResponsiveContainer width="100%" height={300}>
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
  );
};

export default Dashboard;
