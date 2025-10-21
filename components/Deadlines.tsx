import React from 'react';
import { Employee } from '../types';

interface DeadlinesProps {
  employees: Employee[];
}

const DeadlineCard: React.FC<{ title: string; employees: Employee[]; dateField: 'endDate' | 'medicalVisitExpiry' }> = ({ title, employees, dateField }) => {
    
    const getDaysRemaining = (dateStr: string) => {
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const diff = new Date(dateStr).getTime() - today.getTime();
        return Math.ceil(diff / (1000 * 3600 * 24));
    };
    
    const sortedEmployees = employees
        .filter(e => e[dateField])
        .map(e => ({...e, daysRemaining: getDaysRemaining(e[dateField]!)}))
        .filter(e => e.daysRemaining >= 0)
        .sort((a, b) => a.daysRemaining - b.daysRemaining);

    const getUrgencyColor = (days: number) => {
        if (days <= 7) return 'border-red-500 bg-red-50';
        if (days <= 30) return 'border-yellow-500 bg-yellow-50';
        return 'border-gray-200 bg-white';
    };

    return (
        <div className="bg-white p-6 rounded-xl shadow-lg">
            <h3 className="text-xl font-bold text-gray-800 mb-4">{title}</h3>
            <div className="space-y-4 max-h-96 overflow-y-auto pr-2">
                {sortedEmployees.length > 0 ? sortedEmployees.map(employee => {
                    const daysRemaining = employee.daysRemaining;
                    const dateValue = employee[dateField];
                    if (!dateValue) return null;
                    
                    return (
                        <div key={`${employee.id}-${dateField}`} className={`p-4 rounded-lg border-l-4 ${getUrgencyColor(daysRemaining)}`}>
                            <div className="flex justify-between items-center">
                                <div>
                                    <p className="font-semibold text-gray-900">{employee.firstName} {employee.lastName}</p>
                                    <p className="text-sm text-gray-500">{new Date(dateValue).toLocaleDateString('it-IT')}</p>
                                </div>
                                <div className="text-right">
                                    <p className="font-bold text-lg">{daysRemaining}</p>
                                    <p className="text-xs text-gray-500">giorni rimasti</p>
                                </div>
                            </div>
                        </div>
                    );
                }) : <p className="text-gray-500 text-center py-4">Nessuna scadenza imminente.</p>}
            </div>
        </div>
    );
};


const Deadlines: React.FC<DeadlinesProps> = ({ employees }) => {
  const contractExpiries = employees.filter(e => e.contractType === 'Tempo Determinato' && e.endDate);
  const medicalVisitExpiries = employees;

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
      <DeadlineCard title="Contratti in Scadenza" employees={contractExpiries} dateField="endDate" />
      <DeadlineCard title="Visite Mediche in Scadenza" employees={medicalVisitExpiries} dateField="medicalVisitExpiry" />
    </div>
  );
};

export default Deadlines;