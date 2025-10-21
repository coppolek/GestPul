import React, { useState, useMemo, useCallback } from 'react';
import { Employee, LeaveRequest, SicknessRecord, AbsenceStatus } from '../../types';

// Helper to get dates for the week (copied from JollyPlans)
const getWeekDates = (currentDate: Date): Date[] => {
    const startOfWeek = new Date(currentDate);
    const day = startOfWeek.getDay();
    const diff = startOfWeek.getDate() - day + (day === 0 ? -6 : 1);
    startOfWeek.setDate(diff);
    startOfWeek.setHours(0, 0, 0, 0);
    const weekDates: Date[] = [];
    for (let i = 0; i < 7; i++) {
        const date = new Date(startOfWeek);
        date.setDate(startOfWeek.getDate() + i);
        weekDates.push(date);
    }
    return weekDates;
};

const dayFormatter = new Intl.DateTimeFormat('it-IT', { weekday: 'short' });
const dateFormatter = new Intl.DateTimeFormat('it-IT', { day: '2-digit', month: '2-digit' });

interface WeeklyAbsencesProps {
  employees: Employee[];
  leaveRequests: LeaveRequest[];
  sicknessRecords: SicknessRecord[];
}

const WeeklyAbsences: React.FC<WeeklyAbsencesProps> = ({ employees, leaveRequests, sicknessRecords }) => {
    const [currentDate, setCurrentDate] = useState(new Date());
    const weekDates = useMemo(() => getWeekDates(currentDate), [currentDate]);

    const getAbsenceForEmployeeOnDate = useCallback((employeeId: string, date: Date) => {
        const dateStr = date.toISOString().split('T')[0];
        
        const leave = leaveRequests.find(r => 
            r.employeeId === employeeId &&
            r.status === AbsenceStatus.APPROVATO &&
            dateStr >= r.startDate &&
            dateStr <= r.endDate
        );
        if (leave) return { type: leave.type, color: 'bg-green-500' };

        const sickness = sicknessRecords.find(s => 
            s.employeeId === employeeId &&
            dateStr >= s.startDate &&
            dateStr <= s.endDate
        );
        if (sickness) return { type: 'Malattia', color: 'bg-orange-500' };
        
        return null;
    }, [leaveRequests, sicknessRecords]);

    const absentEmployees = useMemo(() => {
        return employees.filter(employee => 
            weekDates.some(date => getAbsenceForEmployeeOnDate(employee.id, date) !== null)
        );
    }, [employees, weekDates, getAbsenceForEmployeeOnDate]);
    
    const changeWeek = (offset: number) => {
        setCurrentDate(prev => {
            const newDate = new Date(prev);
            newDate.setDate(newDate.getDate() + offset * 7);
            return newDate;
        });
    };

    return (
        <div className="bg-white p-6 rounded-xl shadow-lg">
            <div className="flex justify-between items-center mb-6">
                 <h2 className="text-2xl font-bold text-gray-800">Riepilogo Assenze Settimanali</h2>
                <div className="flex items-center space-x-4">
                    <button onClick={() => changeWeek(-1)} className="px-4 py-2 bg-gray-200 rounded-lg hover:bg-gray-300 transition-colors"><i className="fa-solid fa-chevron-left mr-2"></i> Prec</button>
                    <span className="text-lg font-semibold text-gray-700 w-32 text-center">
                        {dateFormatter.format(weekDates[0])} - {dateFormatter.format(weekDates[6])}
                    </span>
                    <button onClick={() => changeWeek(1)} className="px-4 py-2 bg-gray-200 rounded-lg hover:bg-gray-300 transition-colors">Succ <i className="fa-solid fa-chevron-right ml-2"></i></button>
                </div>
            </div>

             <div className="overflow-x-auto">
                <table className="w-full border-collapse">
                    <thead>
                        <tr className="bg-gray-50">
                            <th className="p-2 border text-sm font-semibold text-gray-600 sticky left-0 bg-gray-50 z-10 w-48">Dipendente</th>
                            {weekDates.map(date => {
                                const isWeekend = date.getDay() === 0 || date.getDay() === 6;
                                return (
                                    <th key={date.toISOString()} className={`p-2 border text-sm font-semibold capitalize w-32 ${isWeekend ? 'text-gray-400' : 'text-gray-600'}`}>
                                        {dayFormatter.format(date)}
                                        <span className="block text-xs font-normal">{dateFormatter.format(date)}</span>
                                    </th>
                                )
                            })}
                        </tr>
                    </thead>
                    <tbody>
                        {absentEmployees.length > 0 ? (
                            absentEmployees.map(employee => (
                                <tr key={employee.id} className="border-b hover:bg-gray-50">
                                    <td className="p-2 border font-medium text-gray-800 sticky left-0 bg-white hover:bg-gray-50 z-10 w-48">{employee.firstName} {employee.lastName}</td>
                                    {weekDates.map(date => {
                                        const absence = getAbsenceForEmployeeOnDate(employee.id, date);
                                        const isWeekend = date.getDay() === 0 || date.getDay() === 6;
                                        return (
                                            <td key={date.toISOString()} className={`p-2 border h-16 ${isWeekend && !absence ? 'bg-gray-100' : ''}`}>
                                                {absence && (
                                                    <div className={`h-full flex items-center justify-center text-white text-xs font-bold p-1 rounded ${absence.color}`}>
                                                        {absence.type}
                                                    </div>
                                                )}
                                            </td>
                                        )
                                    })}
                                </tr>
                            ))
                        ) : (
                            <tr>
                                <td colSpan={8} className="text-center p-8 text-gray-500 italic">
                                    Nessun dipendente assente in questa settimana.
                                </td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </div>
        </div>
    );
};
export default WeeklyAbsences;