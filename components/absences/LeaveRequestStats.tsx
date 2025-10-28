
import React, { useMemo } from 'react';
import { Employee, LeaveRequest, AbsenceStatus, AbsenceType } from '../../types';
import { BarChart, Bar, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';

interface LeaveRequestStatsProps {
  employees: Employee[];
  leaveRequests: LeaveRequest[];
}

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042'];

const LeaveRequestStats: React.FC<LeaveRequestStatsProps> = ({ employees, leaveRequests }) => {
    const employeeMap = useMemo(() => new Map(employees.map(emp => [emp.id, `${emp.firstName} ${emp.lastName}`])), [employees]);

    // General stats cards
    const generalStats = useMemo(() => {
        const approvedRequests = leaveRequests.filter(r => r.status === AbsenceStatus.APPROVATO);
        const totalApprovedDays = approvedRequests.reduce((total, req) => {
            const start = new Date(req.startDate);
            const end = new Date(req.endDate);
            const diffTime = Math.abs(end.getTime() - start.getTime());
            const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;
            return total + diffDays;
        }, 0);

        return {
            totalRequests: leaveRequests.length,
            pendingRequests: leaveRequests.filter(r => r.status === AbsenceStatus.IN_ATTESA).length,
            totalApprovedDays,
        };
    }, [leaveRequests]);

    // Pie chart data for requests by type
    const requestsByType = useMemo(() => {
        const counts: { [key in AbsenceType]?: number } = {};
        for (const req of leaveRequests) {
            counts[req.type] = (counts[req.type] || 0) + 1;
        }
        return Object.entries(counts).map(([name, value]) => ({ name, value }));
    }, [leaveRequests]);

    // Bar chart data for approved days by month
    const daysByMonth = useMemo(() => {
        const months = Array(12).fill(0).map((_, i) => ({
            name: new Date(0, i).toLocaleString('it-IT', { month: 'short' }),
            giorni: 0,
        }));

        const currentYear = new Date().getFullYear();
        const approvedRequests = leaveRequests.filter(r => r.status === AbsenceStatus.APPROVATO);

        for (const req of approvedRequests) {
            let currentDate = new Date(req.startDate);
            const endDate = new Date(req.endDate);
            while (currentDate <= endDate) {
                if (currentDate.getFullYear() === currentYear) {
                    const monthIndex = currentDate.getMonth();
                    months[monthIndex].giorni += 1;
                }
                currentDate.setDate(currentDate.getDate() + 1);
            }
        }
        return months.map(m => ({ ...m, name: m.name.charAt(0).toUpperCase() + m.name.slice(1) }));
    }, [leaveRequests]);
    
    // Bar chart data for requests by employee
    const requestsByEmployee = useMemo(() => {
        const stats: { [employeeId: string]: { [status: string]: number } } = {};
        for (const req of leaveRequests) {
            if (!stats[req.employeeId]) {
                stats[req.employeeId] = {
                    [AbsenceStatus.APPROVATO]: 0,
                    [AbsenceStatus.RIFIUTATO]: 0,
                    [AbsenceStatus.IN_ATTESA]: 0,
                };
            }
            stats[req.employeeId][req.status]++;
        }
        return Object.entries(stats).map(([employeeId, statuses]) => ({
            name: employeeMap.get(employeeId) || 'Sconosciuto',
            ...statuses,
        })).sort((a,b) => (b[AbsenceStatus.APPROVATO] + b[AbsenceStatus.RIFIUTATO] + b[AbsenceStatus.IN_ATTESA]) - (a[AbsenceStatus.APPROVATO] + a[AbsenceStatus.RIFIUTATO] + a[AbsenceStatus.IN_ATTESA]));
    }, [leaveRequests, employeeMap]);


    return (
        <div className="space-y-8">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="bg-white p-6 rounded-xl shadow-lg text-center">
                    <h3 className="text-lg font-semibold text-gray-500">Totale Richieste</h3>
                    <p className="text-4xl font-bold text-blue-600 mt-2">{generalStats.totalRequests}</p>
                </div>
                 <div className="bg-white p-6 rounded-xl shadow-lg text-center">
                    <h3 className="text-lg font-semibold text-gray-500">Richieste in Attesa</h3>
                    <p className="text-4xl font-bold text-yellow-500 mt-2">{generalStats.pendingRequests}</p>
                </div>
                 <div className="bg-white p-6 rounded-xl shadow-lg text-center">
                    <h3 className="text-lg font-semibold text-gray-500">Totale Giorni Approvati</h3>
                    <p className="text-4xl font-bold text-green-600 mt-2">{generalStats.totalApprovedDays}</p>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                {/* Pie Chart */}
                <div className="bg-white p-6 rounded-xl shadow-lg">
                    <h3 className="text-xl font-bold text-gray-800 mb-4">Richieste per Tipo</h3>
                    <ResponsiveContainer width="100%" height={300}>
                        <PieChart>
                            <Pie
                                data={requestsByType}
                                cx="50%"
                                cy="50%"
                                labelLine={false}
                                outerRadius={110}
                                fill="#8884d8"
                                dataKey="value"
                                nameKey="name"
                                label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                            >
                                {requestsByType.map((entry, index) => (
                                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                ))}
                            </Pie>
                             <Tooltip formatter={(value) => [`${value} richieste`, 'Numero']} />
                             <Legend />
                        </PieChart>
                    </ResponsiveContainer>
                </div>
                
                {/* Bar Chart by Month */}
                <div className="bg-white p-6 rounded-xl shadow-lg">
                    <h3 className="text-xl font-bold text-gray-800 mb-4">Giorni di Assenza Approvati per Mese (Anno Corrente)</h3>
                     <ResponsiveContainer width="100%" height={300}>
                        <BarChart data={daysByMonth}>
                            <CartesianGrid strokeDasharray="3 3" />
                            <XAxis dataKey="name" />
                            <YAxis allowDecimals={false} />
                            <Tooltip />
                            <Legend />
                            <Bar dataKey="giorni" fill="#22c55e" name="Giorni Approvati" />
                        </BarChart>
                    </ResponsiveContainer>
                </div>
            </div>
            
            {/* Bar Chart by Employee */}
            <div className="bg-white p-6 rounded-xl shadow-lg">
                <h3 className="text-xl font-bold text-gray-800 mb-4">Richieste per Dipendente</h3>
                <ResponsiveContainer width="100%" height={400}>
                     <BarChart data={requestsByEmployee} layout="vertical" margin={{ top: 5, right: 30, left: 100, bottom: 5 }}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis type="number" allowDecimals={false} />
                        <YAxis type="category" dataKey="name" width={150} />
                        <Tooltip />
                        <Legend />
                        <Bar dataKey={AbsenceStatus.APPROVATO} stackId="a" fill="#22c55e" name="Approvate" />
                        <Bar dataKey={AbsenceStatus.IN_ATTESA} stackId="a" fill="#f59e0b" name="In Attesa" />
                        <Bar dataKey={AbsenceStatus.RIFIUTATO} stackId="a" fill="#ef4444" name="Rifiutate" />
                    </BarChart>
                </ResponsiveContainer>
            </div>
        </div>
    );
};

export default LeaveRequestStats;
