import React, { useState, useMemo, useCallback, useEffect } from 'react';
import { NavLink } from 'react-router-dom';
import { Employee, WorkSite, LeaveRequest, SicknessRecord, Assignment, Schedule, AbsenceStatus, ApiKey } from '../types';
import AssignmentModal from './modals/AssignmentModal';
import * as api from '../services/api';
import { GoogleGenAI } from '@google/genai';

const ALL_WEEK_DAYS = ['Domenica', 'Lunedì', 'Martedì', 'Mercoledì', 'Giovedì', 'Venerdì', 'Sabato'];

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

const dayFormatter = new Intl.DateTimeFormat('it-IT', { weekday: 'long' });
const dateHeaderFormatter = new Intl.DateTimeFormat('it-IT', { day: '2-digit', month: '2-digit' });

interface ModalContext {
    scheduleIndex: number;
    scheduleId: string;
    date: string;
    assignment?: Assignment;
}

interface DragData {
    siteId: string;
    startTime: string;
    endTime: string;
}

interface JollyPlansProps {
    employees: Employee[];
    sites: WorkSite[];
    leaveRequests: LeaveRequest[];
    sicknessRecords: SicknessRecord[];
    schedules: Schedule[];
    setSchedules: React.Dispatch<React.SetStateAction<Schedule[]>>;
    apiKeys: ApiKey[];
}

const JollyPlans: React.FC<JollyPlansProps> = ({ employees, sites, leaveRequests, sicknessRecords, schedules, setSchedules, apiKeys }) => {
    const [currentDate, setCurrentDate] = useState(new Date());
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [modalContext, setModalContext] = useState<ModalContext | null>(null);
    const [draggingOver, setDraggingOver] = useState<string | null>(null);
    const [isPlanning, setIsPlanning] = useState(false);
    const [planningError, setPlanningError] = useState<string | null>(null);
    
    // Debounce saving schedules
    useEffect(() => {
        const handler = setTimeout(() => {
            if(schedules.length > 0) { // Avoid saving initial empty state
                api.setData('schedules', schedules);
            }
        }, 1000); // Save 1 second after last change
        return () => clearTimeout(handler);
    }, [schedules]);

    const siteMap = useMemo(() => new Map(sites.map(site => [site.id, site])), [sites]);
    const weekDates = useMemo(() => getWeekDates(currentDate), [currentDate]);
    const jollyEmployees = useMemo(() => employees.filter(e => e.role === 'Jolly'), [employees]);

    const handleAddSchedule = () => {
        const newSchedule: Schedule = {
            id: `sch-${Date.now()}`,
            employeeId: null,
            label: 'Nuovo Planner',
            assignments: {}
        };
        setSchedules(prev => [...prev, newSchedule]);
    };

    const handleRemoveSchedule = (scheduleId: string) => {
        if (window.confirm('Sei sicuro di voler rimuovere questo planner?')) {
            setSchedules(prev => prev.filter(s => s.id !== scheduleId));
        }
    };

    const handleScheduleEmployeeChange = (scheduleId: string, employeeId: string) => {
        const employee = employees.find(e => e.id === employeeId);
        setSchedules(prev => prev.map(s => {
            if (s.id === scheduleId) {
                return {
                    ...s,
                    employeeId: employeeId || null,
                    label: employee ? `${employee.firstName} ${employee.lastName}` : 'Seleziona operatore'
                };
            }
            return s;
        }));
    };
    
    const getAbsenceForEmployeeOnDate = useCallback((employeeId: string, date: Date) => {
        const dateStr = date.toISOString().split('T')[0];
        
        const leave = leaveRequests.find(r => 
            r.employeeId === employeeId &&
            r.status === AbsenceStatus.APPROVATO &&
            dateStr >= r.startDate &&
            dateStr <= r.endDate
        );
        if (leave) return leave.type;

        const sickness = sicknessRecords.find(s => 
            s.employeeId === employeeId &&
            dateStr >= s.startDate &&
            dateStr <= s.endDate
        );
        if (sickness) return 'Malattia';
        
        return null;
    }, [leaveRequests, sicknessRecords]);

    const absentEmployeesThisWeek = useMemo(() => {
        const nonJollyEmployees = employees.filter(e => e.role !== 'Jolly');
        const absentData = nonJollyEmployees.map(employee => {
            const absences: { date: Date, type: string }[] = [];
            weekDates.forEach(date => {
                const absenceType = getAbsenceForEmployeeOnDate(employee.id, date);
                if (absenceType) {
                    absences.push({ date, type: absenceType });
                }
            });
            return { employee, absences };
        }).filter(data => data.absences.length > 0);

        return absentData.map(data => {
            const { employee } = data;
            const allEmployeeAssignments = sites.flatMap(site => 
                site.assignments
                    .filter(a => a.employeeId === employee.id)
                    .map(a => ({ ...a, siteName: site.name, siteId: site.id }))
            );

            const weeklyAssignments = new Map<string, { siteName: string; workingHours: string; siteId: string; }[]>();
            weekDates.forEach(date => {
                const dayName = ALL_WEEK_DAYS[date.getDay()];
                const assignmentsForDay = allEmployeeAssignments.filter(a => a.workingDays.includes(dayName));
                if(assignmentsForDay.length > 0) {
                   weeklyAssignments.set(dayFormatter.format(date), assignmentsForDay.map(a => ({ siteName: a.siteName, workingHours: a.workingHours, siteId: a.siteId })));
                }
            });
            return { ...data, weeklyAssignments };
        });

    }, [employees, weekDates, getAbsenceForEmployeeOnDate, sites]);

    const openNewAssignmentModal = (scheduleIndex: number, scheduleId: string, date: string) => {
        setModalContext({ scheduleIndex, scheduleId, date });
        setIsModalOpen(true);
    };
    
    const openEditAssignmentModal = (scheduleIndex: number, scheduleId: string, date: string, assignment: Assignment) => {
        setModalContext({ scheduleIndex, scheduleId, date, assignment });
        setIsModalOpen(true);
    };

    const handleSaveAssignment = (data: { startTime: string; endTime: string; siteId?: string }) => {
        if (!modalContext) return;
        const { scheduleId, date, assignment } = modalContext;

        setSchedules(prev => prev.map(s => {
            if (s.id === scheduleId) {
                const newAssignmentsForDate = s.assignments[date] ? [...s.assignments[date]] : [];
                if (assignment) { // Edit
                    const assignmentIndex = newAssignmentsForDate.findIndex(a => a.id === assignment.id);
                    if (assignmentIndex > -1) {
                        newAssignmentsForDate[assignmentIndex] = { ...assignment, startTime: data.startTime, endTime: data.endTime };
                    }
                } else if (data.siteId) { // Add new
                    newAssignmentsForDate.push({
                        id: `asg-${Date.now()}`,
                        siteId: data.siteId,
                        startTime: data.startTime,
                        endTime: data.endTime
                    });
                }
                return { ...s, assignments: { ...s.assignments, [date]: newAssignmentsForDate } };
            }
            return s;
        }));

        setIsModalOpen(false);
        setModalContext(null);
    };
    
    const handleDeleteAssignment = (scheduleId: string, date: string, assignmentId: string) => {
        if (window.confirm('Sei sicuro di voler eliminare questo incarico?')) {
            setSchedules(prev => prev.map(s => {
                if (s.id === scheduleId) {
                    const dayAssignments = s.assignments[date].filter(a => a.id !== assignmentId);
                    return { ...s, assignments: { ...s.assignments, [date]: dayAssignments } };
                }
                return s;
            }));
        }
    };
    
    const handleDragStart = (e: React.DragEvent, assignment: { siteId: string; workingHours: string }) => {
        const [startTime, endTime] = assignment.workingHours.split(' - ').map(t => t.trim());
        if (!startTime || !endTime) {
            console.error("Invalid working hours format:", assignment.workingHours);
            e.preventDefault();
            return;
        }
        const dragData: DragData = { siteId: assignment.siteId, startTime, endTime };
        e.dataTransfer.setData('application/json', JSON.stringify(dragData));
        e.dataTransfer.effectAllowed = 'move';
    };

    const handleDrop = (e: React.DragEvent, scheduleId: string, date: string) => {
        e.preventDefault();
        setDraggingOver(null);
        const dataString = e.dataTransfer.getData('application/json');
        if (!dataString) return;
        
        const { siteId, startTime, endTime }: DragData = JSON.parse(dataString);

        setSchedules(prev => prev.map(s => {
            if (s.id === scheduleId) {
                const dayAssignments = s.assignments[date] ? [...s.assignments[date]] : [];
                dayAssignments.push({ id: `asg-${Date.now()}`, siteId, startTime, endTime });
                return { ...s, assignments: { ...s.assignments, [date]: dayAssignments } };
            }
            return s;
        }));
    };
    
    const handleDragOver = (e: React.DragEvent) => e.preventDefault();
    const handleDragEnter = (e: React.DragEvent, key: string) => {
        e.preventDefault();
        setDraggingOver(key);
    };
    
    const changeWeek = (offset: number) => {
        setCurrentDate(prev => {
            const newDate = new Date(prev);
            newDate.setDate(newDate.getDate() + offset * 7);
            return newDate;
        });
    };

    const handleAutoPlan = async () => {
        setPlanningError(null);
        
        const geminiApiKey = apiKeys.find(k => k.id === 'google_gemini')?.key;
        if (!geminiApiKey) {
            setPlanningError("La chiave API di Google Gemini non è impostata.");
            return;
        }

        setIsPlanning(true);

        const uncoveredShifts = absentEmployeesThisWeek.flatMap(({ weeklyAssignments }) => 
            Array.from(weeklyAssignments.entries()).flatMap(([day, assignments]) => {
                const dateOfWeek = weekDates.find(d => dayFormatter.format(d) === day);
                if (!dateOfWeek) return [];
                const dateString = dateOfWeek.toISOString().split('T')[0];
                return assignments.map(ass => {
                    const [startTime, endTime] = ass.workingHours.split(' - ');
                    return {
                        neededOnDate: dateString,
                        siteId: ass.siteId,
                        siteName: ass.siteName,
                        siteAddress: siteMap.get(ass.siteId)?.address || 'Indirizzo non trovato',
                        startTime: startTime?.trim() || 'N/D',
                        endTime: endTime?.trim() || 'N/D',
                    };
                });
            })
        );

        if (uncoveredShifts.length === 0) {
            setPlanningError("Non ci sono turni da coprire in questa settimana.");
            setIsPlanning(false);
            return;
        }

        if (jollyEmployees.length === 0) {
            setPlanningError("Nessun operatore 'Jolly' disponibile per coprire le assenze.");
            setIsPlanning(false);
            return;
        }

        const jollyOperatorsForPrompt = jollyEmployees.map(e => ({
            id: e.id,
            name: `${e.firstName} ${e.lastName}`,
            address: e.address,
        }));
        
        try {
            const ai = new GoogleGenAI({ apiKey: geminiApiKey });
            
            const prompt = `
                Sei un esperto di logistica e pianificazione della forza lavoro per un'impresa di pulizie.
                Il tuo compito è creare un programma settimanale ottimale per gli operatori "Jolly" per coprire i turni dei dipendenti assenti.

                Devi seguire queste regole in ordine di priorità:
                1.  Minimizza gli spostamenti: Assegna i turni all'operatore Jolly che vive più vicino al cantiere. Questa è la regola più importante. Crea percorsi giornalieri efficienti, raggruppando gli incarichi per un singolo operatore in cantieri geograficamente vicini tra loro.
                2.  Distribuisci equamente il carico di lavoro: Distribuisci il numero totale di turni nel modo più uniforme possibile tra tutti gli operatori Jolly disponibili durante la settimana. Evita di sovraccaricare una persona se altre sono disponibili.
                3.  Garantisci la copertura completa: Assicurati che ogni singolo turno scoperto sia assegnato a esattamente un operatore Jolly. Non lasciare nessun turno non assegnato.

                DATI DI INPUT:
                -   Operatori Jolly Disponibili: ${JSON.stringify(jollyOperatorsForPrompt)}
                -   Turni da Coprire: ${JSON.stringify(uncoveredShifts)}

                REQUISITI PER L'OUTPUT:
                -   La tua risposta DEVE essere solo e soltanto un array JSON valido. Non includere testo, spiegazioni o formattazione markdown come \`\`\`json.
                -   L'array JSON deve rappresentare i nuovi programmi per gli operatori Jolly.
                -   Ogni elemento nell'array è un oggetto "Schedule" per un operatore Jolly.
                -   La struttura di ogni oggetto Schedule deve essere:
                    {
                      "id": "string", // Un ID univoco per il programma, es. "sch-ai-{employeeId}"
                      "employeeId": "string", // L'ID dell'operatore Jolly
                      "label": "string", // Il nome completo dell'operatore Jolly
                      "assignments": {
                        // La chiave è la data in formato "YYYY-MM-DD"
                        "YYYY-MM-DD": [
                          {
                            "id": "string", // Un ID univoco per l'incarico, es. "asg-ai-{timestamp}"
                            "siteId": "string", // L'ID del cantiere
                            "startTime": "string", // es. "08:00"
                            "endTime": "string" // es. "17:00"
                          }
                        ]
                      }
                    }
                -   Se non ci sono turni da coprire, restituisci un array vuoto [].

                Analizza i dati di input e genera il programma ottimale nel formato JSON specificato.
            `;

            const response = await ai.models.generateContent({
                model: 'gemini-2.5-pro',
                contents: prompt,
                config: {
                    responseMimeType: "application/json",
                },
            });

            const responseText = response.text;
            if (!responseText) {
                throw new Error("La risposta del modello è vuota.");
            }
            
            const aiSchedules: Schedule[] = JSON.parse(responseText);
            
            const existingNonJollySchedules = schedules.filter(s => {
                if (!s.employeeId) return true;
                const emp = employees.find(e => e.id === s.employeeId);
                return emp?.role !== 'Jolly';
            });

            setSchedules([...existingNonJollySchedules, ...aiSchedules]);

        } catch (e) {
            console.error("Errore durante la pianificazione automatica:", e);
            const errorMessage = e instanceof Error ? e.message : "Errore sconosciuto.";
            setPlanningError(`Pianificazione fallita: ${errorMessage}`);
        } finally {
            setIsPlanning(false);
        }
    };
    
    return (
        <div className="flex gap-8 h-full">
            {/* Sidebar with absent employees */}
            <aside className="w-80 flex-shrink-0">
                <div className="bg-white p-4 rounded-xl shadow-lg h-full">
                    <h3 className="text-lg font-bold text-gray-800 mb-4 border-b pb-2">Operatori Assenti</h3>
                    <div className="space-y-3 h-[70vh] overflow-y-auto pr-2">
                        {absentEmployeesThisWeek.length > 0 ? (
                            absentEmployeesThisWeek.map(({ employee, absences, weeklyAssignments }, empIndex) => (
                                 <div key={employee.id} className="p-3 border-l-4 border-yellow-500 rounded-r-lg bg-yellow-50">
                                     <p className="font-semibold text-sm text-yellow-800">{employee.firstName} {employee.lastName}</p>
                                     {absences.map((absence, index) => (
                                        <p key={index} className="text-xs text-yellow-700">
                                            {dayFormatter.format(absence.date)}: {absence.type}
                                        </p>
                                     ))}
                                     {weeklyAssignments.size > 0 && (
                                        <div className="mt-2 pt-2 border-t border-yellow-200">
                                            <h4 className="text-xs font-bold text-gray-600 mb-1">Coperture necessarie:</h4>
                                            <div className="space-y-1">
                                                {Array.from(weeklyAssignments.entries()).map(([day, assignments], dayIndex) => (
                                                    <div key={`${empIndex}-${dayIndex}`}>
                                                         <p className="text-xs font-semibold text-gray-800">{day}</p>
                                                         <ul className="list-disc list-inside pl-2">
                                                             {assignments.map((ass, i) => (
                                                                <li 
                                                                    key={`${empIndex}-${dayIndex}-${i}`} 
                                                                    draggable="true"
                                                                    onDragStart={(e) => handleDragStart(e, ass)}
                                                                    className="text-xs text-gray-700 p-1 my-1 bg-white border rounded cursor-grab active:cursor-grabbing">
                                                                     {ass.siteName} ({ass.workingHours})
                                                                 </li>
                                                             ))}
                                                         </ul>
                                                     </div>
                                                ))}
                                            </div>
                                        </div>
                                     )}
                                 </div>
                            ))
                        ) : (
                            <p className="text-gray-500 text-center py-4 italic">Nessun operatore assente questa settimana.</p>
                        )}
                    </div>
                </div>
            </aside>
            
            {/* Main scheduler */}
            <main className="flex-1">
                 <div className="bg-white p-6 rounded-xl shadow-lg">
                    <div className="flex justify-between items-center mb-4 flex-wrap gap-4">
                        <div className="flex-1 min-w-[200px]">
                             <h2 className="text-2xl font-bold text-gray-800">Pianificazione Jolly</h2>
                        </div>
                        <div className="flex items-center space-x-4 flex-shrink-0">
                            <button onClick={() => changeWeek(-1)} className="px-4 py-2 bg-gray-200 rounded-lg hover:bg-gray-300 transition-colors"><i className="fa-solid fa-chevron-left mr-2"></i> Prec</button>
                            <span className="text-lg font-semibold text-gray-700 w-48 text-center">
                                {dateHeaderFormatter.format(weekDates[0])} - {dateHeaderFormatter.format(weekDates[6])}
                            </span>
                            <button onClick={() => changeWeek(1)} className="px-4 py-2 bg-gray-200 rounded-lg hover:bg-gray-300 transition-colors">Succ <i className="fa-solid fa-chevron-right ml-2"></i></button>
                        </div>
                        <div className="flex-1 flex justify-end gap-2 min-w-[300px]">
                            <button 
                                onClick={handleAutoPlan} 
                                disabled={isPlanning}
                                className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors disabled:bg-gray-400 flex items-center justify-center gap-2"
                            >
                                {isPlanning ? (
                                    <><i className="fa-solid fa-spinner fa-spin"></i> Pianifico...</>
                                ) : (
                                    <><i className="fa-solid fa-wand-magic-sparkles"></i> Pianifica Automaticamente</>
                                )}
                            </button>
                            <button onClick={handleAddSchedule} className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors">
                                <i className="fa-solid fa-plus mr-2"></i>Aggiungi Planner
                            </button>
                        </div>
                    </div>
                     {planningError && (
                        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded relative mb-4" role="alert">
                            {planningError}
                            {planningError.includes("chiave API") && (
                                <NavLink to="/api-settings" className="font-bold underline hover:text-red-900 ml-1">
                                    Vai alle impostazioni.
                                </NavLink>
                            )}
                        </div>
                    )}
                    
                    <div className="overflow-x-auto">
                        <table className="w-full border-collapse">
                             <thead>
                                <tr className="bg-gray-50">
                                    <th className="p-2 border text-sm font-semibold text-gray-600 sticky left-0 bg-gray-50 z-10 w-52">Operatore Jolly</th>
                                    {weekDates.map(date => {
                                         const dayName = dayFormatter.format(date);
                                         const isWeekend = date.getDay() === 0 || date.getDay() === 6;
                                         return (
                                            <th key={date.toISOString()} className={`p-2 border text-sm font-semibold capitalize w-48 ${isWeekend ? 'text-gray-400' : 'text-gray-600'}`}>
                                                {dayName}
                                                <span className="block text-xs font-normal">{dateHeaderFormatter.format(date)}</span>
                                            </th>
                                         )
                                     })}
                                </tr>
                            </thead>
                             <tbody>
                                {schedules.map((schedule, index) => {
                                    const availableJolly = jollyEmployees.filter(e => 
                                        !schedules.some(s => s.employeeId === e.id && s.id !== schedule.id)
                                    );
                                    return (
                                    <tr key={schedule.id} className="h-full">
                                        <td className="p-2 border font-medium text-gray-800 sticky left-0 bg-white hover:bg-gray-50 z-10 w-52 align-top">
                                            <div className="flex items-start gap-2">
                                                <select
                                                    value={schedule.employeeId || ''}
                                                    onChange={(e) => handleScheduleEmployeeChange(schedule.id, e.target.value)}
                                                    className="w-full p-1 border border-gray-300 rounded-lg text-sm"
                                                >
                                                    <option value="">Seleziona...</option>
                                                    {availableJolly.map(emp => (
                                                        <option key={emp.id} value={emp.id}>{emp.firstName} {emp.lastName}</option>
                                                    ))}
                                                </select>
                                                <button 
                                                    onClick={() => handleRemoveSchedule(schedule.id)}
                                                    className="text-red-500 hover:text-red-700 p-1 flex-shrink-0"
                                                    title="Rimuovi planner"
                                                >
                                                    <i className="fa-solid fa-trash-alt"></i>
                                                </button>
                                            </div>
                                        </td>
                                        {weekDates.map(date => {
                                            const dateString = date.toISOString().split('T')[0];
                                            const assignments = schedule.assignments[dateString] || [];
                                            const cellKey = `${schedule.id}-${dateString}`;
                                            const isWeekend = date.getDay() === 0 || date.getDay() === 6;
                                            return (
                                                <td
                                                    key={dateString}
                                                    onDrop={(e) => handleDrop(e, schedule.id, dateString)}
                                                    onDragOver={handleDragOver}
                                                    onDragEnter={(e) => handleDragEnter(e, cellKey)}
                                                    className={`p-1 border align-top min-h-[120px] h-full transition-colors space-y-2 ${isWeekend ? 'bg-gray-50 border-gray-200' : 'border-gray-300'} ${draggingOver === cellKey ? 'bg-blue-100' : ''}`}
                                                >
                                                    <div className="space-y-2">
                                                        {assignments.map(assignment => {
                                                             const site = siteMap.get(assignment.siteId);
                                                             return (
                                                                <div key={assignment.id} className="p-2 bg-blue-100 rounded-lg text-xs text-blue-900 shadow-sm group relative">
                                                                    <p className="font-bold">{site?.name || 'Cantiere non trovato'}</p>
                                                                    <p>{assignment.startTime} - {assignment.endTime}</p>
                                                                    <div className="absolute top-1 right-1 opacity-0 group-hover:opacity-100 transition-opacity space-x-1">
                                                                        <button onClick={() => openEditAssignmentModal(index, schedule.id, dateString, assignment)} className="text-blue-700 hover:text-blue-900"><i className="fa-solid fa-pencil"></i></button>
                                                                        <button onClick={() => handleDeleteAssignment(schedule.id, dateString, assignment.id)} className="text-red-600 hover:text-red-800"><i className="fa-solid fa-trash"></i></button>
                                                                    </div>
                                                                </div>
                                                             )
                                                         })}
                                                    </div>
                                                    <button onClick={() => openNewAssignmentModal(index, schedule.id, dateString)} className="mt-2 w-full text-center py-1 bg-gray-200 text-gray-500 rounded hover:bg-gray-300 hover:text-gray-700 transition-colors text-xs">
                                                        <i className="fa-solid fa-plus"></i>
                                                    </button>
                                                </td>
                                            )
                                        })}
                                    </tr>
                                    )
                                })}
                            </tbody>
                        </table>
                    </div>
                </div>
            </main>
            
            {isModalOpen && (
                <AssignmentModal
                    isOpen={isModalOpen}
                    onClose={() => { setIsModalOpen(false); setModalContext(null); }}
                    onSave={handleSaveAssignment}
                    assignment={modalContext?.assignment}
                    sites={sites}
                />
            )}
        </div>
    );
};

export default JollyPlans;