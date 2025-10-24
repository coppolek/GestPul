import React, { useState, useMemo } from 'react';
import { WorkSite, Employee } from '../types';

// Helper per ottenere le date della settimana
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
const weekDayLongFormatter = new Intl.DateTimeFormat('it-IT', { weekday: 'long' });

interface ServicesProps {
  sites: WorkSite[];
  employees: Employee[];
}

const Services: React.FC<ServicesProps> = ({ sites, employees }) => {
    const [currentDate, setCurrentDate] = useState(new Date());
    const [searchTerm, setSearchTerm] = useState('');

    const weekDates = useMemo(() => getWeekDates(currentDate), [currentDate]);
    const employeeMap = useMemo(() => new Map(employees.map(emp => [emp.id, `${emp.firstName} ${emp.lastName}`])), [employees]);

    const filteredSites = useMemo(() => {
        return sites.filter(site => 
            site.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
            site.client.toLowerCase().includes(searchTerm.toLowerCase())
        );
    }, [sites, searchTerm]);

    const changeWeek = (offset: number) => {
        setCurrentDate(prev => {
            const newDate = new Date(prev);
            newDate.setDate(newDate.getDate() + offset * 7);
            return newDate;
        });
    };
    
    const capitalize = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);

    return (
        <div className="bg-white p-6 rounded-xl shadow-lg">
            <div className="flex justify-between items-center mb-6 flex-wrap gap-4">
                <h2 className="text-2xl font-bold text-gray-800">Pianificazione Servizi</h2>
                <div className="flex items-center gap-4">
                     <input 
                        type="text"
                        placeholder="Cerca cantiere..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="p-2 border border-gray-300 rounded-lg w-64"
                    />
                    <div className="flex items-center border rounded-lg">
                        <button onClick={() => changeWeek(-1)} className="px-3 py-2 rounded-l-lg hover:bg-gray-100"><i className="fa-solid fa-chevron-left"></i></button>
                        <span className="px-4 py-1.5 text-lg font-semibold text-gray-700 border-x">{dateFormatter.format(weekDates[0])} - {dateFormatter.format(weekDates[6])}</span>
                        <button onClick={() => changeWeek(1)} className="px-3 py-2 rounded-r-lg hover:bg-gray-100"><i className="fa-solid fa-chevron-right"></i></button>
                    </div>
                </div>
            </div>

            <div className="overflow-x-auto">
                <table className="w-full border-collapse min-w-[1200px]">
                    <thead>
                        <tr className="bg-gray-50">
                            <th className="p-2 border text-left text-sm font-semibold text-gray-600 sticky left-0 bg-gray-50 z-10 w-64">Cantiere</th>
                            {weekDates.map(date => (
                                <th key={date.toISOString()} className="p-2 border text-sm font-semibold capitalize w-48 text-gray-600">
                                    {dayFormatter.format(date)}
                                    <span className="block text-xs font-normal">{dateFormatter.format(date)}</span>
                                </th>
                            ))}
                        </tr>
                    </thead>
                    <tbody>
                        {filteredSites.map(site => (
                            <tr key={site.id} className="border-b hover:bg-gray-50">
                                <td className="p-2 border font-medium text-gray-800 sticky left-0 bg-white hover:bg-gray-50 z-10 w-64 align-top">
                                    <p className="font-bold">{site.name}</p>
                                    <p className="text-xs text-gray-500">{site.client}</p>
                                </td>
                                {weekDates.map(date => {
                                    const dayOfWeek = capitalize(weekDayLongFormatter.format(date));
                                    const assignmentsForDay = site.assignments.filter(a => a.workingDays.includes(dayOfWeek));
                                    
                                    return (
                                        <td key={date.toISOString()} className="p-1 border align-top h-20">
                                            {assignmentsForDay.length > 0 ? (
                                                <div className="space-y-1.5">
                                                    {assignmentsForDay.map(ass => (
                                                        <div key={ass.employeeId} className="p-1.5 bg-blue-50 rounded text-xs">
                                                            <p className="font-semibold text-blue-800">{employeeMap.get(ass.employeeId) || 'Sconosciuto'}</p>
                                                            <p className="text-blue-700">{ass.workingHours}</p>
                                                        </div>
                                                    ))}
                                                </div>
                                            ) : null}
                                        </td>
                                    );
                                })}
                            </tr>
                        ))}
                    </tbody>
                </table>
                 {filteredSites.length === 0 && (
                    <div className="text-center p-8 text-gray-500">
                        Nessun cantiere trovato per i criteri di ricerca.
                    </div>
                )}
            </div>
        </div>
    );
};

export default Services;