import React, { useState, useMemo, useCallback, useEffect } from 'react';
import { Employee, WorkSite, LeaveRequest, SicknessRecord, Schedule, Assignment, AbsenceStatus, ApiKey } from '../types';
import AssignmentModal from './modals/AssignmentModal';
import * as api from '../services/api';
import { GoogleGenAI } from '@google/genai';

// --- Helper Functions ---

// NEW UTC-centric date week getter
const getWeekDates = (currentDate: Date): Date[] => {
    // Use local date parts to construct a UTC date to avoid timezone shifts from the initial `new Date()`
    const start = new Date(Date.UTC(currentDate.getFullYear(), currentDate.getMonth(), currentDate.getDate()));
    const day = start.getUTCDay(); // 0 for Sunday, 1 for Monday...
    const diff = start.getUTCDate() - day + (day === 0 ? -6 : 1);
    const startOfWeek = new Date(Date.UTC(start.getUTCFullYear(), start.getUTCMonth(), diff));

    const weekDates: Date[] = [];
    for (let i = 0; i < 7; i++) {
        const date = new Date(startOfWeek);
        date.setUTCDate(startOfWeek.getUTCDate() + i);
        weekDates.push(date);
    }
    return weekDates;
};

// NEW UTC-centric date formatter for logic
const toUTCISOString = (date: Date): string => {
    return date.toISOString().split('T')[0];
};


// Updated formatters for display, using UTC to match the logic dates
const dayFormatter = new Intl.DateTimeFormat('it-IT', { weekday: 'short', timeZone: 'UTC' });
const dateFormatter = new Intl.DateTimeFormat('it-IT', { day: '2-digit', month: '2-digit', timeZone: 'UTC' });

const calculateHours = (start: string, end: string): number => {
    if (!start || !end) return 0;
    const [startH, startM] = start.split(':').map(Number);
    const [endH, endM] = end.split(':').map(Number);
    const startTime = new Date(0, 0, 0, startH, startM);
    const endTime = new Date(0, 0, 0, endH, endM);
    if (endTime <= startTime) return 0;
    return (endTime.getTime() - startTime.getTime()) / (1000 * 60 * 60);
};


interface JollyPlansProps {
    employees: Employee[];
    sites: WorkSite[];
    leaveRequests: LeaveRequest[];
    sicknessRecords: SicknessRecord[];
    schedules: Schedule[];
    setSchedules: React.Dispatch<React.SetStateAction<Schedule[]>>;
    apiKeys: ApiKey[];
}

const JollyPlans: React.FC<JollyPlansProps> = ({
    employees,
    sites,
    leaveRequests,
    sicknessRecords,
    schedules,
    setSchedules,
    apiKeys,
}) => {
    const [currentDate, setCurrentDate] = useState(new Date());
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [modalContext, setModalContext] = useState<{ scheduleId: string; date: string; assignment?: Assignment; } | null>(null);
    const [isPlanning, setIsPlanning] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [manualPlanners, setManualPlanners] = useState<Schedule[]>([]);
    const [draggedItem, setDraggedItem] = useState<{ type: 'assignment' | 'absence'; data: any; sourceInfo?: any } | null>(null);
    const [isPlanDropdownOpen, setIsPlanDropdownOpen] = useState(false);

    const geminiApiKey = useMemo(() => apiKeys.find(k => k.id === 'google_gemini')?.key, [apiKeys]);

    const handleOpenModal = (scheduleId: string, date: string, assignment?: Assignment) => {
        setModalContext({ scheduleId, date, assignment });
        setIsModalOpen(true);
    };

    const handleCloseModal = () => {
        setIsModalOpen(false);
        setModalContext(null);
    };

    const changeWeek = (offset: number) => {
        setCurrentDate(prev => {
            const newDate = new Date(prev);
            newDate.setDate(newDate.getDate() + offset * 7);
            return newDate;
        });
    };

    const weekDates = useMemo(() => getWeekDates(currentDate), [currentDate]);
    const jollyEmployees = useMemo(() => employees.filter(e => e.role === 'Jolly'), [employees]);
    const siteMap = useMemo(() => new Map(sites.map(s => [s.id, s.name])), [sites]);

    const allPlanners = useMemo(() => {
        const jollyPlanners = jollyEmployees.map(jolly => {
            const existingSchedule = schedules.find(s => s.employeeId === jolly.id);
            return existingSchedule || {
                id: `jolly-${jolly.id}`,
                employeeId: jolly.id,
                label: `${jolly.firstName} ${jolly.lastName}`,
                assignments: {}
            };
        });
        return [...jollyPlanners, ...manualPlanners];
    }, [jollyEmployees, schedules, manualPlanners]);
    
    useEffect(() => {
        // This effect ensures that if an employee is no longer a "Jolly", their schedule doesn't linger in the view.
        // It doesn't delete it from the backend, just filters the view state.
        const jollyEmployeeIds = new Set(jollyEmployees.map(e => e.id));
        const schedulesForJollys = schedules.filter(s => s.employeeId && jollyEmployeeIds.has(s.employeeId));
        
        // Similarly, update manual planners to avoid stale data if needed
        // For this implementation, manual planners are self-contained.
    }, [jollyEmployees, schedules]);


    const uncoveredShifts = useMemo(() => {
        const shifts: { date: string; siteId: string; siteName: string; employeeName: string; workingHours: string; weeklyHours: number; }[] = [];
        const capitalize = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);

        [...leaveRequests, ...sicknessRecords].forEach(absence => {
             const employee = employees.find(e => e.id === absence.employeeId);
             if (employee?.role !== 'Operatore') return;

             for (const date of weekDates) {
                const dateStr = toUTCISOString(date);
                if (dateStr >= absence.startDate && dateStr <= absence.endDate) {
                    if('status' in absence && absence.status !== AbsenceStatus.APPROVATO) continue;
                    
                    const dayOfWeek = capitalize(new Intl.DateTimeFormat('it-IT', { weekday: 'long', timeZone: 'UTC' }).format(date));

                    const operatorAssignments = sites.flatMap(s => 
                        s.assignments
                         .filter(a => a.employeeId === absence.employeeId && a.workingDays.includes(dayOfWeek))
                         .map(a => {
                            const hours = a.workingHours.split(/\s*-\s*/);
                            const start = hours[0];
                            const end = hours[1];
                            const dailyHours = calculateHours(start, end);
                            const weeklyHours = dailyHours * a.workingDays.length;
                             return { 
                                siteId: s.id, 
                                siteName: s.name, 
                                workingHours: a.workingHours,
                                weeklyHours: weeklyHours
                            }
                         })
                    );
                    
                    operatorAssignments.forEach(opAss => {
                        shifts.push({
                            date: dateStr,
                            ...opAss,
                            employeeName: `${employee.firstName} ${employee.lastName}`
                        });
                    });
                }
             }
        });

        return shifts;
    }, [weekDates, leaveRequests, sicknessRecords, employees, sites]);

    const conflicts = useMemo(() => {
        const conflictSet = new Set<string>();
        allPlanners.forEach(planner => {
            Object.values(planner.assignments).forEach(dayAssignments => {
                if (Array.isArray(dayAssignments) && dayAssignments.length > 1) {
                    const sorted = [...dayAssignments].sort((a, b) => a.startTime.localeCompare(b.startTime));
                    for (let i = 0; i < sorted.length - 1; i++) {
                        if (sorted[i].endTime > sorted[i + 1].startTime) {
                            conflictSet.add(sorted[i].id);
                            conflictSet.add(sorted[i+1].id);
                        }
                    }
                }
            });
        });
        return conflictSet;
    }, [allPlanners]);

    const handleSaveAssignment = async (data: { startTime: string; endTime: string; siteId?: string; notes?: string; }) => {
        if (!modalContext) return;
        const { scheduleId, date, assignment } = modalContext;
        const { startTime, endTime, siteId, notes } = data;

        let planner = allPlanners.find(p => p.id === scheduleId);
        if (!planner) return;

        const newAssignmentsForDate = [...(planner.assignments[date] || [])];
        if (assignment) {
            const index = newAssignmentsForDate.findIndex(a => a.id === assignment.id);
            if (index > -1) newAssignmentsForDate[index] = { ...assignment, startTime, endTime, siteId: siteId || assignment.siteId, notes };
        } else {
            if (!siteId) return;
            newAssignmentsForDate.push({ id: `asg-${Date.now()}`, siteId, startTime, endTime, notes });
        }

        const updatedPlanner = { ...planner, assignments: { ...planner.assignments, [date]: newAssignmentsForDate } };
        
        const isJollyPlanner = jollyEmployees.some(j => j.id === updatedPlanner.employeeId);

        if (isJollyPlanner) {
            const existingSchedule = schedules.find(s => s.id === updatedPlanner.id);
            let updatedSchedule;
            if (existingSchedule) {
                updatedSchedule = await api.updateData<Schedule>('schedules', updatedPlanner.id, updatedPlanner);
            } else {
                updatedSchedule = await api.addData<Omit<Schedule, 'id'>, Schedule>('schedules', {
                    employeeId: updatedPlanner.employeeId,
                    label: updatedPlanner.label,
                    assignments: updatedPlanner.assignments,
                });
            }
            setSchedules(prev => {
                const otherSchedules = prev.filter(s => s.id !== updatedSchedule.id);
                return [...otherSchedules, updatedSchedule];
            });
        } else {
            setManualPlanners(prev => prev.map(p => p.id === updatedPlanner.id ? updatedPlanner : p));
        }
        handleCloseModal();
    };


    const handleDeleteAssignment = async (plannerId: string, date: string, assignmentId: string) => {
        const planner = allPlanners.find(p => p.id === plannerId);
        if (!planner) return;
        const updatedAssignments = (planner.assignments[date] || []).filter(a => a.id !== assignmentId);
        const updatedPlanner = { ...planner, assignments: { ...planner.assignments, [date]: updatedAssignments } };

        const isJollyPlanner = jollyEmployees.some(j => j.id === updatedPlanner.employeeId);
        if (isJollyPlanner) {
             const updated = await api.updateData<Schedule>('schedules', planner.id, updatedPlanner);
             setSchedules(prev => prev.map(s => s.id === updated.id ? updated : s));
        } else {
            setManualPlanners(prev => prev.map(p => p.id === updatedPlanner.id ? updatedPlanner : p));
        }
    };
    
    const handleDragStart = (type: 'assignment' | 'absence', data: any, sourceInfo: any) => {
        setDraggedItem({ type, data, sourceInfo });
    };

    const handleDrop = useCallback(async (targetPlannerId: string, targetDate: string) => {
        if (!draggedItem) return;
    
        const { type, data, sourceInfo } = draggedItem;
        setDraggedItem(null); // Clear drag state immediately
    
        // Prevent dropping in the same place
        if (type === 'assignment' && sourceInfo.plannerId === targetPlannerId && sourceInfo.date === targetDate) {
            return;
        }
        
        const hours = (type === 'absence' ? data.workingHours : `${data.startTime}-${data.endTime}`).split(/\s*-\s*/);

        const assignmentToMoveOrAdd: Assignment = {
            id: type === 'assignment' ? data.id : `asg-${Date.now()}-${Math.random()}`,
            siteId: data.siteId,
            startTime: hours[0],
            endTime: hours[1],
            originalEmployeeName: type === 'absence' ? data.employeeName : data.originalEmployeeName,
            notes: type === 'assignment' ? data.notes : undefined,
        };
    
        // --- Create the next state optimistically ---
        const getNextPlanners = (planners: Schedule[]) => {
            // Use a deep copy to avoid mutation issues
            let updatedPlanners = JSON.parse(JSON.stringify(planners));
    
            // 1. Remove from source if it's a move
            if (type === 'assignment') {
                const sourcePlanner = updatedPlanners.find((p: Schedule) => p.id === sourceInfo.plannerId);
                if (sourcePlanner && sourcePlanner.assignments[sourceInfo.date]) {
                    sourcePlanner.assignments[sourceInfo.date] = sourcePlanner.assignments[sourceInfo.date].filter((a: Assignment) => a.id !== data.id);
                }
            }
    
            // 2. Add to target
            const targetPlanner = updatedPlanners.find((p: Schedule) => p.id === targetPlannerId);
            if (targetPlanner) {
                if (!targetPlanner.assignments[targetDate]) {
                    targetPlanner.assignments[targetDate] = [];
                }
                targetPlanner.assignments[targetDate].push(assignmentToMoveOrAdd);
            }
            return updatedPlanners;
        };
    
        const allCurrentPlanners = [...schedules, ...manualPlanners];
        const nextAllPlanners = getNextPlanners(allCurrentPlanners);
    
        const jollyIds = new Set(jollyEmployees.map(e => e.id));
        const nextSchedules = nextAllPlanners.filter(p => p.employeeId && jollyIds.has(p.employeeId));
        const nextManualPlanners = nextAllPlanners.filter(p => !p.employeeId);
    
        // Optimistically update the UI
        setSchedules(nextSchedules);
        setManualPlanners(nextManualPlanners);
        
        // --- Sync with backend API ---
        try {
            const changedSchedules = nextSchedules.filter(ns => {
                const os = schedules.find(s => s.id === ns.id);
                return !os || JSON.stringify(ns.assignments) !== JSON.stringify(os.assignments);
            });
    
            const promises = changedSchedules.map(cs => {
                const original = schedules.find(s => s.id === cs.id);
                if (original) { // It's an update
                    return api.updateData('schedules', cs.id, cs);
                } else { // It's a new schedule for a Jolly
                    return api.addData('schedules', { employeeId: cs.employeeId, label: cs.label, assignments: cs.assignments });
                }
            });
            
            await Promise.all(promises);
    
            // Refetch if new schedules were created to get DB-generated IDs
            if (changedSchedules.some(cs => !schedules.some(s => s.id === cs.id))) {
                 const freshSchedules = await api.getData<Schedule[]>('schedules');
                 setSchedules(freshSchedules);
            }
    
        } catch (error) {
            console.error("Failed to sync drop operation:", error);
            setError("Errore di salvataggio. Le modifiche sono state annullate.");
            // Revert on error by restoring the original state
            setSchedules(schedules);
            setManualPlanners(manualPlanners);
        }
    }, [draggedItem, schedules, manualPlanners, jollyEmployees, setSchedules]);
    
    const runAutoPlan = async (mode: 'ai' | 'algorithm') => {
        setIsPlanning(true);
        setError(null);
        setIsPlanDropdownOpen(false);

        try {
            if (mode === 'ai') {
                await handleAutoPlanAI();
            } else {
                await handleAutoPlanAlgorithm();
            }
        } catch (e: any) {
             setError(e.message || "Si è verificato un errore sconosciuto durante la pianificazione.");
        } finally {
            setIsPlanning(false);
        }
    };
    
    const handleAutoPlanAI = async () => {
        if (!geminiApiKey) {
            throw new Error("Chiave API Gemini non configurata. Vai su Impostazioni API.");
        }

        const ai = new GoogleGenAI({ apiKey: geminiApiKey });
        const prompt = `
            Sei un esperto di logistica per un'impresa di pulizie. Il tuo compito è creare un piano settimanale ottimale per gli operatori "Jolly".

            Regole da seguire in ordine di priorità:
            1.  Minimizza gli spostamenti: Assegna i turni scoperti agli operatori Jolly geograficamente più vicini.
            2.  Distribuisci il lavoro equamente: Assicurati che il numero totale di ore settimanali sia simile per tutti gli operatori Jolly.
            3.  Crea percorsi lineari: Se un operatore ha più incarichi nello stesso giorno, cerca di assegnarli in cantieri vicini tra loro.

            Dati di Input:
            - Turni da coprire: ${JSON.stringify(uncoveredShifts)}
            - Operatori Jolly disponibili: ${JSON.stringify(jollyEmployees.map(e => ({ id: e.id, name: `${e.firstName} ${e.lastName}`, address: e.address })))}
            - Cantieri: ${JSON.stringify(sites.map(s => ({ id: s.id, name: s.name, address: s.address })))}

            Output Richiesto:
            Restituisci ESCLUSIVAMENTE un oggetto JSON. L'oggetto deve avere come chiavi gli ID dei dipendenti Jolly (es. "emp-3") e come valore un altro oggetto che mappa le date ('YYYY-MM-DD') a un array di incarichi. Ogni incarico deve avere 'siteId', 'startTime', e 'endTime'.

            Esempio di output:
            {
              "emp-3": {
                "2024-06-10": [
                  { "siteId": "site-1", "startTime": "08:00", "endTime": "12:00" }
                ]
              },
              "emp-6": {
                 "2024-06-11": [
                  { "siteId": "site-2", "startTime": "09:00", "endTime": "13:00" }
                ]
              }
            }
        `;
        const response = await ai.models.generateContent({
             model: 'gemini-2.5-pro',
             contents: prompt,
             config: { responseMimeType: "application/json" },
        });

        const resultText = response.text;
        if (!resultText) throw new Error("La risposta dell'AI era vuota.");
        const result = JSON.parse(resultText);
        
        const currentSchedules = await api.getData<Schedule[]>('schedules');
        let schedulesToUpdate = [...currentSchedules];

        for (const [employeeId, dailyAssignments] of Object.entries(result)) {
            let schedule = schedulesToUpdate.find(s => s.employeeId === employeeId);
            let isNewSchedule = false;

            if (!schedule) {
                 const employee = jollyEmployees.find(e => e.id === employeeId);
                 if (!employee) continue;
                 schedule = { id: `new-${employeeId}`, employeeId, label: `${employee.firstName} ${employee.lastName}`, assignments: {} };
                 isNewSchedule = true;
            }

            for (const [date, newAssignments] of Object.entries(dailyAssignments as Record<string, any[]>)) {
                 const assignmentsWithOriginalEmployee = newAssignments.map(a => {
                    const workingHours = `${a.startTime} - ${a.endTime}`;
                    const originalShift = uncoveredShifts.find(s => 
                        s.date === date && 
                        s.siteId === a.siteId && 
                        s.workingHours.replace(/\s/g, '') === workingHours.replace(/\s/g, '')
                    );
                    return {
                        ...a, 
                        id: `asg-${Date.now()}-${Math.random()}`,
                        originalEmployeeName: originalShift ? originalShift.employeeName : undefined
                    };
                });

                schedule.assignments[date] = [
                    ...(schedule.assignments[date] || []), 
                    ...assignmentsWithOriginalEmployee
                ];
            }

            if(isNewSchedule) {
                const newDbSchedule = await api.addData<Omit<Schedule, 'id'>, Schedule>('schedules', { employeeId: schedule.employeeId, label: schedule.label, assignments: schedule.assignments });
                schedulesToUpdate.push(newDbSchedule);
            } else {
                await api.updateData('schedules', schedule.id, schedule);
                schedulesToUpdate = schedulesToUpdate.map(s => s.id === schedule!.id ? schedule! : s);
            }
        }
        setSchedules(await api.getData('schedules'));
    };

    const handleAutoPlanAlgorithm = async () => {
        let newAssignmentsByEmployee: Record<string, { date: string, assignment: Omit<Assignment, 'id'> }[]> = {};
    
        const jollyWorkload: Record<string, number> = jollyEmployees.reduce((acc, j) => {
            const weeklyTotal = weekDates.reduce((total, date) => {
                const dayStr = toUTCISOString(date);
                const schedule = schedules.find(s => s.employeeId === j.id);
                const dayAssignments = schedule?.assignments[dayStr] || [];
                return total + dayAssignments.reduce((dayTotal, ass) => dayTotal + calculateHours(ass.startTime, ass.endTime), 0);
            }, 0);
            return { ...acc, [j.id]: weeklyTotal };
        }, {});
    
        for (const shift of uncoveredShifts) {
            let bestJollyId: string | null = null;
            let bestScore = -1;
    
            for (const jolly of jollyEmployees) {
                // Simplified scoring: lower workload is better. A real implementation would use Distance Matrix API.
                const score = 1 / (jollyWorkload[jolly.id] + 1);
    
                if (score > bestScore) {
                    bestScore = score;
                    bestJollyId = jolly.id;
                }
            }
    
            if (bestJollyId) {
                const hours = shift.workingHours.split(/\s*-\s*/);
                const startTime = hours[0];
                const endTime = hours[1];
                const newAssignment = { 
                    siteId: shift.siteId, 
                    startTime, 
                    endTime,
                    originalEmployeeName: shift.employeeName,
                };
                
                if (!newAssignmentsByEmployee[bestJollyId]) newAssignmentsByEmployee[bestJollyId] = [];
                newAssignmentsByEmployee[bestJollyId].push({ date: shift.date, assignment: newAssignment });
                
                jollyWorkload[bestJollyId] += calculateHours(startTime, endTime);
            }
        }
    
        const currentSchedules = await api.getData<Schedule[]>('schedules');
        let schedulesToUpdate = [...currentSchedules];
    
        for (const employeeId in newAssignmentsByEmployee) {
            let schedule = schedulesToUpdate.find(s => s.employeeId === employeeId);
            let isNewSchedule = false;

            if (!schedule) {
                const employee = jollyEmployees.find(e => e.id === employeeId)!;
                schedule = { id: `new-${employeeId}`, employeeId, label: `${employee.firstName} ${employee.lastName}`, assignments: {} };
                isNewSchedule = true;
            }
    
            for (const { date, assignment } of newAssignmentsByEmployee[employeeId]) {
                const newAssignmentWithId = { ...assignment, id: `asg-${Date.now()}-${Math.random()}` };
                schedule.assignments[date] = [...(schedule.assignments[date] || []), newAssignmentWithId];
            }
             if(isNewSchedule) {
                const newDbSchedule = await api.addData<Omit<Schedule, 'id'>, Schedule>('schedules', { employeeId: schedule.employeeId, label: schedule.label, assignments: schedule.assignments });
                schedulesToUpdate.push(newDbSchedule);
            } else {
                await api.updateData('schedules', schedule.id, schedule);
                schedulesToUpdate = schedulesToUpdate.map(s => s.id === schedule!.id ? schedule! : s);
            }
        }
        setSchedules(await api.getData('schedules'));
    };
    
    // --- Render ---
    return (
        <>
        <div className="bg-white p-6 rounded-xl shadow-lg">
            {conflicts.size > 0 && (
                <div className="bg-red-100 border-l-4 border-red-500 text-red-700 p-4 rounded-lg mb-6" role="alert">
                    <p className="font-bold">Attenzione: Conflitti di Orario Rilevati!</p>
                    <p>Uno o più operatori hanno incarichi sovrapposti. Controlla le celle evidenziate in rosso.</p>
                </div>
            )}
            {error && <div className="bg-red-100 text-red-700 p-3 rounded-lg mb-4">{error}</div>}

            <div className="flex justify-between items-center mb-6 flex-wrap gap-4">
                <h2 className="text-2xl font-bold text-gray-800">Pianificazione Jolly</h2>
                <div className="flex items-center space-x-2">
                    <div className="relative">
                        <button onClick={() => setIsPlanDropdownOpen(prev => !prev)} disabled={isPlanning} className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors flex items-center gap-2 disabled:bg-gray-400">
                            {isPlanning ? <><i className="fa-solid fa-spinner fa-spin"></i> Pianifico...</> : <><i className="fa-solid fa-wand-magic-sparkles"></i> Pianifica Automaticamente</>}
                            <i className={`fa-solid fa-chevron-down ml-2 text-xs transition-transform ${isPlanDropdownOpen ? 'rotate-180' : ''}`}></i>
                        </button>
                        {isPlanDropdownOpen && (
                            <div className="absolute right-0 mt-2 w-56 bg-white rounded-md shadow-lg z-20 border">
                                <button 
                                    className="block w-full text-left px-4 py-2 text-sm text-gray-400 cursor-not-allowed"
                                    disabled
                                    title="Funzionalità AI disabilitata"
                                >
                                    Usa AI (Gemini)
                                </button>
                                <button onClick={() => runAutoPlan('algorithm')} className="block w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100">Usa Algoritmo (Veloce)</button>
                            </div>
                        )}
                    </div>
                    <button onClick={() => setManualPlanners(p => [...p, { id: `man-${Date.now()}`, employeeId: null, label: `Planner Manuale ${p.length + 1}`, assignments: {} }])} className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors">
                        <i className="fa-solid fa-plus mr-2"></i>Aggiungi Planner
                    </button>
                    <div className="flex items-center border rounded-lg">
                        <button onClick={() => changeWeek(-1)} className="px-3 py-2 rounded-l-lg hover:bg-gray-100"><i className="fa-solid fa-chevron-left"></i></button>
                        <span className="px-4 py-1.5 text-lg font-semibold text-gray-700 border-x">{dateFormatter.format(weekDates[0])} - {dateFormatter.format(weekDates[6])}</span>
                        <button onClick={() => changeWeek(1)} className="px-3 py-2 rounded-r-lg hover:bg-gray-100"><i className="fa-solid fa-chevron-right"></i></button>
                    </div>
                </div>
            </div>

            <div className="overflow-x-auto">
                <table className="w-full border-collapse min-w-[1400px]">
                    <thead>
                        <tr className="bg-gray-50">
                            <th className="p-2 border text-left font-semibold text-gray-600 sticky left-0 bg-gray-50 z-10 w-48">Planner</th>
                            {weekDates.map(date => <th key={date.toISOString()} className="p-2 border font-semibold capitalize w-48 text-gray-600">{dayFormatter.format(date)}<span className="block text-xs font-normal">{dateFormatter.format(date)}</span></th>)}
                             <th className="p-2 border font-semibold text-gray-600 w-32">Totale Settimanale</th>
                        </tr>
                    </thead>
                    <tbody>
                        {/* Absent Operators */}
                        <tr className="bg-yellow-50">
                            <td className="p-2 border font-bold text-yellow-800 sticky left-0 bg-yellow-50 z-10 w-48 align-top"><i className="fa-solid fa-person-walking-arrow-right mr-2"></i>Turni Scoperti</td>
                            {weekDates.map(date => (
                                <td key={date.toISOString()} className="p-2 border align-top">
                                    {uncoveredShifts.filter(s => s.date === toUTCISOString(date)).map((shift, i) => {
                                        const hours = shift.workingHours.split(/\s*-\s*/);
                                        const start = hours[0];
                                        const end = hours[1];
                                        const duration = calculateHours(start, end);
                                        return (
                                            <div key={i} draggable onDragStart={() => handleDragStart('absence', shift, null)} className="p-1.5 bg-yellow-100 rounded text-xs cursor-grab mb-1">
                                                <div className="flex justify-between items-start">
                                                    <p className="font-semibold text-yellow-900">{shift.siteName}</p>
                                                    <div className="text-right flex-shrink-0 ml-2">
                                                        <p className="font-bold text-yellow-900">{shift.weeklyHours.toFixed(2)}h</p>
                                                        <p className="text-yellow-700 text-[10px]">settimanali</p>
                                                    </div>
                                                </div>
                                                <p className="text-yellow-700 italic">Assente: {shift.employeeName}</p>
                                                <div className="flex justify-between items-center mt-1">
                                                    <p className="text-yellow-800">{shift.workingHours}</p>
                                                    {duration > 0 && <p className="font-bold text-yellow-900">{duration.toFixed(2)}h</p>}
                                                </div>
                                            </div>
                                        )
                                    })}
                                </td>
                            ))}
                            <td className="p-2 border bg-gray-50"></td>
                        </tr>
                        {/* Planners */}
                        {allPlanners.map(planner => {
                             const weeklyTotal = weekDates.reduce((total, date) => {
                                const dayStr = toUTCISOString(date);
                                const dayAssignments = planner.assignments[dayStr] || [];
                                const dayHours = Array.isArray(dayAssignments) ? dayAssignments.reduce((dayTotal, ass) => dayTotal + calculateHours(ass.startTime, ass.endTime), 0) : 0;
                                return total + dayHours;
                            }, 0);

                            return (
                                <tr key={planner.id}>
                                    <td className="p-2 border font-medium text-gray-800 sticky left-0 bg-white z-10 w-48">
                                        {planner.label}
                                        {!planner.employeeId && <button onClick={() => setManualPlanners(p => p.filter(mp => mp.id !== planner.id))} className="ml-2 text-red-500 text-xs"><i className="fa fa-trash"></i></button>}
                                    </td>
                                    {weekDates.map(date => {
                                        const dateStr = toUTCISOString(date);
                                        const dayAssignments = planner.assignments[dateStr] || [];
                                        const dailyTotal = Array.isArray(dayAssignments) ? dayAssignments.reduce((total, ass) => total + calculateHours(ass.startTime, ass.endTime), 0) : 0;
                                        return (
                                            <td key={date.toISOString()} onDragOver={e => e.preventDefault()} onDrop={() => handleDrop(planner.id, dateStr)} className="p-1 border align-top h-24 relative group">
                                                <div className="space-y-1.5 h-full">
                                                    {Array.isArray(dayAssignments) && dayAssignments.map(ass => {
                                                        const isConflict = conflicts.has(ass.id);
                                                        const duration = calculateHours(ass.startTime, ass.endTime);
                                                        return(
                                                        <div key={ass.id} draggable onDragStart={() => handleDragStart('assignment', ass, { plannerId: planner.id, date: dateStr })} className={`p-1.5 rounded-lg text-xs cursor-grab group/item relative ${isConflict ? 'bg-red-200 text-red-900' : 'bg-blue-100 text-blue-900'}`}>
                                                            {isConflict && <i className="fa-solid fa-triangle-exclamation text-red-600 absolute -top-1 -left-1"></i>}
                                                            <p className="font-semibold">{siteMap.get(ass.siteId)}</p>
                                                            {ass.notes && (
                                                                <p className="italic text-xs truncate" title={ass.notes}>
                                                                    <i className="fa-solid fa-note-sticky mr-1 opacity-70"></i>{ass.notes}
                                                                </p>
                                                            )}
                                                            {ass.originalEmployeeName && (
                                                                <p className={`italic ${isConflict ? 'text-red-800' : 'text-blue-800'}`}>
                                                                    Assente: {ass.originalEmployeeName}
                                                                </p>
                                                            )}
                                                            <div className="flex justify-between items-center">
                                                                <p>{ass.startTime} - {ass.endTime}</p>
                                                                {duration > 0 && <p className="font-bold">{duration.toFixed(2)}h</p>}
                                                            </div>
                                                            <div className="absolute top-1 right-1 opacity-0 group-hover/item:opacity-100 transition-opacity">
                                                                <button onClick={(e) => { e.stopPropagation(); handleOpenModal(planner.id, dateStr, ass); }} className="text-yellow-600 px-1"><i className="fa fa-pencil"></i></button>
                                                                <button onClick={(e) => { e.stopPropagation(); handleDeleteAssignment(planner.id, dateStr, ass.id); }} className="text-red-500 px-1"><i className="fa fa-trash"></i></button>
                                                            </div>
                                                        </div>
                                                    )})}
                                                </div>
                                                <button onClick={() => handleOpenModal(planner.id, dateStr)} className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-gray-300 hover:text-blue-600 opacity-0 group-hover:opacity-100 transition-opacity text-2xl">
                                                    <i className="fa-solid fa-plus-circle"></i>
                                                </button>
                                                {dailyTotal > 0 && <p className="text-right text-xs font-bold mt-1 pr-1">{dailyTotal.toFixed(2)}h</p>}
                                            </td>
                                        )
                                    })}
                                    <td className="p-2 border align-middle text-center font-bold bg-gray-50">{weeklyTotal.toFixed(2)}h</td>
                                </tr>
                            )
                        })}
                    </tbody>
                    <tfoot>
                        <tr className="bg-gray-200 font-bold text-gray-800">
                            <td colSpan={9} className="p-2 border text-left sticky left-0 bg-gray-200 z-10">
                                Riepilogo Totali per Operatore
                            </td>
                        </tr>
                        {allPlanners.map(planner => {
                            const weeklyTotal = weekDates.reduce((total, date) => {
                                const dateStr = toUTCISOString(date);
                                const dayAssignments = planner.assignments[dateStr] || [];
                                const dayHours = Array.isArray(dayAssignments) ? dayAssignments.reduce((dayTotal, ass) => dayTotal + calculateHours(ass.startTime, ass.endTime), 0) : 0;
                                return total + dayHours;
                            }, 0);

                            if (weeklyTotal === 0) return null;

                            return (
                                <tr key={`footer-${planner.id}`} className="bg-gray-50 font-medium">
                                    <td className="p-2 border sticky left-0 bg-gray-50 z-10 w-48">{planner.label}</td>
                                    {weekDates.map(date => {
                                        const dateStr = toUTCISOString(date);
                                        const dayAssignments = planner.assignments[dateStr] || [];
                                        const dailyTotal = Array.isArray(dayAssignments) ? dayAssignments.reduce((dayTotal, ass) => dayTotal + calculateHours(ass.startTime, ass.endTime), 0) : 0;
                                        return (
                                            <td key={date.toISOString()} className="p-2 border text-center">
                                                {dailyTotal > 0 ? dailyTotal.toFixed(2) + 'h' : '-'}
                                            </td>
                                        );
                                    })}
                                    <td className="p-2 border text-center font-bold bg-gray-100">{weeklyTotal.toFixed(2)}h</td>
                                </tr>
                            );
                        })}
                    </tfoot>
                </table>
            </div>
        </div>
        {isModalOpen && <AssignmentModal isOpen={isModalOpen} onClose={handleCloseModal} onSave={handleSaveAssignment} assignment={modalContext?.assignment} sites={sites}/>}
        </>
    );
};

export default JollyPlans;