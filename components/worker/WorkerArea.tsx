import React, { useState, useMemo } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { Employee, WorkSite, AttendanceRecord, SiteAssignment } from '../../types';
import * as api from '../../services/api';

interface WorkerAreaProps {
    employees: Employee[];
    sites: WorkSite[];
    attendances: AttendanceRecord[];
    setAttendances: React.Dispatch<React.SetStateAction<AttendanceRecord[]>>;
}

const WorkerArea: React.FC<WorkerAreaProps> = ({ employees, sites, attendances, setAttendances }) => {
    const { user } = useAuth();
    const [isSubmitting, setIsSubmitting] = useState(false);

    const currentEmployee = useMemo(() => {
        if (!user || !user.employeeId) return null;
        return employees.find(e => e.id === user.employeeId);
    }, [user, employees]);

    const today = new Date();
    const todayStr = today.toISOString().split('T')[0];
    const dayOfWeek = new Intl.DateTimeFormat('it-IT', { weekday: 'long' }).format(today);
    const capitalizedDay = dayOfWeek.charAt(0).toUpperCase() + dayOfWeek.slice(1);

    const todaysAssignments = useMemo(() => {
        if (!currentEmployee) return [];
        const assignments: { site: WorkSite; assignment: SiteAssignment }[] = [];
        for (const site of sites) {
            for (const assignment of site.assignments) {
                if (assignment.employeeId === currentEmployee.id && assignment.workingDays.includes(capitalizedDay)) {
                    assignments.push({ site, assignment });
                }
            }
        }
        return assignments;
    }, [currentEmployee, sites, capitalizedDay]);

    const todaysAttendances = useMemo(() => {
        if (!currentEmployee) return [];
        return attendances
            .filter(att => att.employeeId === currentEmployee.id && att.timestamp.startsWith(todayStr))
            .sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());
    }, [currentEmployee, attendances, todayStr]);

    const lastActionType = useMemo(() => {
        return todaysAttendances.length > 0 ? todaysAttendances[todaysAttendances.length - 1].type : null;
    }, [todaysAttendances]);

    const handleClocking = async (type: 'Entrata' | 'Uscita') => {
        if (!currentEmployee) return;
        setIsSubmitting(true);
        try {
            const newRecord: Omit<AttendanceRecord, 'id'> = {
                employeeId: currentEmployee.id,
                timestamp: new Date().toISOString(),
                type: type,
                notes: 'Timbratura da Area Lavoratore'
            };
            const savedRecord = await api.addData<Omit<AttendanceRecord, 'id'>, AttendanceRecord>('attendances', newRecord);
            setAttendances(prev => [...prev, savedRecord]);
        } catch (error) {
            console.error("Failed to save attendance record", error);
            alert("Errore durante la timbratura. Riprova.");
        } finally {
            setIsSubmitting(false);
        }
    };
    
    if (user?.role === 'Amministratore' && !user.employeeId) {
         return (
            <div className="bg-white p-6 rounded-xl shadow-lg">
                <h2 className="text-2xl font-bold text-gray-800">Area Timbratura Lavoratori</h2>
                <p className="mt-4 text-gray-600">Questa sezione è l'interfaccia di timbratura per i lavoratori. Come amministratore, puoi visualizzare e gestire tutte le timbrature nel modulo "Presenze".</p>
            </div>
        );
    }

    if (!currentEmployee) {
        return (
            <div className="bg-white p-6 rounded-xl shadow-lg">
                <h2 className="text-2xl font-bold text-gray-800">Nessun Profilo Dipendente</h2>
                <p className="mt-4 text-gray-600">Il tuo account utente non è collegato a un profilo dipendente. Contatta un amministratore per assistenza.</p>
            </div>
        );
    }
    
    const canClockIn = !lastActionType || lastActionType === 'Uscita';
    const canClockOut = lastActionType === 'Entrata';

    return (
        <div className="space-y-8">
            <div className="bg-white p-6 rounded-xl shadow-lg">
                <div className="text-center border-b pb-4 mb-6">
                    <h2 className="text-3xl font-bold text-gray-800">Ciao, {currentEmployee.firstName}!</h2>
                    <p className="text-lg text-gray-500 mt-2">
                        Oggi è {new Intl.DateTimeFormat('it-IT', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' }).format(today)}
                    </p>
                </div>

                <h3 className="text-xl font-semibold text-gray-700 mb-4">I tuoi servizi di oggi</h3>

                {todaysAssignments.length > 0 ? (
                    <div className="space-y-4">
                        {todaysAssignments.map(({ site, assignment }) => (
                            <div key={site.id} className="p-4 border rounded-lg bg-gray-50 flex flex-col sm:flex-row items-center gap-4">
                                <div className="flex-grow">
                                    <p className="font-bold text-lg text-gray-900">{site.name}</p>
                                    <p className="text-sm text-gray-600">{site.address}</p>
                                    <p className="text-sm text-gray-600 mt-1">Orario previsto: <span className="font-medium">{assignment.workingHours}</span></p>
                                </div>
                                <div className="flex-shrink-0 flex gap-3 w-full sm:w-auto">
                                    <button
                                        onClick={() => handleClocking('Entrata')}
                                        disabled={isSubmitting || !canClockIn}
                                        className="w-full px-6 py-3 bg-green-500 text-white font-bold rounded-lg hover:bg-green-600 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors"
                                    >
                                        <i className="fa-solid fa-right-to-bracket mr-2"></i>Entrata
                                    </button>
                                     <button
                                        onClick={() => handleClocking('Uscita')}
                                        disabled={isSubmitting || !canClockOut}
                                        className="w-full px-6 py-3 bg-red-500 text-white font-bold rounded-lg hover:bg-red-600 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors"
                                    >
                                        <i className="fa-solid fa-right-from-bracket mr-2"></i>Uscita
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>
                ) : (
                    <div className="text-center py-8 px-4 border-2 border-dashed rounded-lg">
                        <i className="fa-solid fa-bed text-4xl text-gray-400 mb-3"></i>
                        <p className="text-gray-600 font-semibold">Nessun servizio previsto per oggi.</p>
                        <p className="text-gray-500">Goditi il tuo giorno libero!</p>
                    </div>
                )}
            </div>

            {todaysAttendances.length > 0 && (
                <div className="bg-white p-6 rounded-xl shadow-lg">
                    <h3 className="text-xl font-semibold text-gray-700 mb-4">Le tue timbrature di oggi</h3>
                    <ul className="space-y-2">
                        {todaysAttendances.map(att => (
                            <li key={att.id} className="flex justify-between items-center p-2 bg-gray-100 rounded">
                                <span className="font-medium">
                                    {new Date(att.timestamp).toLocaleTimeString('it-IT', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                                </span>
                                <span className={`px-2 py-1 text-xs font-semibold rounded-full ${att.type === 'Entrata' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                                    {att.type}
                                </span>
                            </li>
                        ))}
                    </ul>
                </div>
            )}
        </div>
    );
};

export default WorkerArea;