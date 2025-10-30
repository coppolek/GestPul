import React, { useState, useEffect, useMemo } from 'react';
import { Assignment, WorkSite, Employee } from '../../types';

interface AssignmentModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSave: (data: { startTime: string, endTime: string, siteId?: string, notes?: string, extraOperatorIds?: string[] }) => void;
    date: string;
    assignment?: Assignment;
    sites: WorkSite[];
    employees: Employee[];
}

// Helper function to get the Italian day name from a 'YYYY-MM-DD' string
const getDayNameFromDate = (dateStr: string): string => {
    // Use noon to avoid timezone/DST issues when parsing the date string
    const date = new Date(`${dateStr}T12:00:00Z`);
    const dayName = new Intl.DateTimeFormat('it-IT', { weekday: 'long', timeZone: 'UTC' }).format(date);
    return dayName.charAt(0).toUpperCase() + dayName.slice(1);
};

// Helper function to check for time overlaps
const doTimesOverlap = (timeRange1: string, timeRange2: string): boolean => {
    try {
        const [start1Str, end1Str] = timeRange1.split('-').map(t => t.trim());
        const [start2Str, end2Str] = timeRange2.split('-').map(t => t.trim());

        // Convert times to a numeric format (e.g., "08:30" -> 830)
        const start1 = parseInt(start1Str.replace(':', ''), 10);
        const end1 = parseInt(end1Str.replace(':', ''), 10);
        const start2 = parseInt(start2Str.replace(':', ''), 10);
        const end2 = parseInt(end2Str.replace(':', ''), 10);

        // Overlap logic: (StartA < EndB) and (EndA > StartB)
        return start1 < end2 && end1 > start2;
    } catch (e) {
        console.error("Error parsing time ranges:", timeRange1, timeRange2, e);
        return true; // Assume overlap on error to be safe
    }
};


const AssignmentModal: React.FC<AssignmentModalProps> = ({ isOpen, onClose, onSave, date, assignment, sites = [], employees = [] }) => {
    const [startTime, setStartTime] = useState('08:00');
    const [endTime, setEndTime] = useState('12:00');
    const [siteId, setSiteId] = useState('');
    const [notes, setNotes] = useState('');
    const [extraOperatorIds, setExtraOperatorIds] = useState<string[]>([]);
    const [extraOperatorSearch, setExtraOperatorSearch] = useState('');
    const [conflictingOperatorIds, setConflictingOperatorIds] = useState<Set<string>>(new Set());

    const operatorEmployees = useMemo(() => employees.filter(e => e.role === 'Operatore'), [employees]);

    useEffect(() => {
        if (assignment) {
            setStartTime(assignment.startTime);
            setEndTime(assignment.endTime);
            setSiteId(assignment.siteId);
            setNotes(assignment.notes || '');
            setExtraOperatorIds(assignment.extraOperatorIds || []);
        } else {
            // Reset to default for new assignments
            setStartTime('08:00');
            setEndTime('12:00');
            setSiteId('');
            setNotes('');
            setExtraOperatorIds([]);
        }
        setExtraOperatorSearch(''); // Reset search on open
        setConflictingOperatorIds(new Set());
    }, [assignment, isOpen]);

    // Effect to check for conflicts when selections change
    useEffect(() => {
        if (!date || !sites || extraOperatorIds.length === 0) {
            setConflictingOperatorIds(new Set());
            return;
        }

        const assignmentDay = getDayNameFromDate(date);
        const newAssignmentTimeRange = `${startTime}-${endTime}`;
        const newConflicts = new Set<string>();

        extraOperatorIds.forEach(opId => {
            const hasConflict = sites.some(site =>
                site.assignments.some(ass => {
                    if (ass.employeeId !== opId) return false;
                    
                    const worksOnDay = ass.workingDays.includes(assignmentDay);
                    if (!worksOnDay) return false;

                    return doTimesOverlap(newAssignmentTimeRange, ass.workingHours);
                })
            );

            if (hasConflict) {
                newConflicts.add(opId);
            }
        });

        setConflictingOperatorIds(newConflicts);

    }, [extraOperatorIds, startTime, endTime, date, sites]);

    const handleExtraOpToggle = (id: string) => {
        setExtraOperatorIds(prev =>
            prev.includes(id) ? prev.filter(opId => opId !== id) : [...prev, id]
        );
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (!assignment && !siteId) {
            alert('Selezionare un cantiere.');
            return;
        }
        if (conflictingOperatorIds.size > 0) {
            alert('Impossibile salvare. Ci sono conflitti di orario per uno o più operatori extra selezionati. Deselezionali per procedere.');
            return;
        }
        onSave({ startTime, endTime, siteId, notes, extraOperatorIds });
    };

    const filteredExtraOperators = useMemo(() => {
        if (!extraOperatorSearch) {
            return operatorEmployees;
        }
        const searchTerm = extraOperatorSearch.toLowerCase();
        return operatorEmployees.filter(op => 
            `${op.firstName} ${op.lastName}`.toLowerCase().includes(searchTerm)
        );
    }, [operatorEmployees, extraOperatorSearch]);

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex justify-center items-center" onClick={onClose}>
            <div className="bg-white p-8 rounded-xl shadow-2xl w-full max-w-lg" onClick={e => e.stopPropagation()}>
                <div className="flex justify-between items-center mb-6">
                    <h2 className="text-2xl font-bold text-gray-800">{assignment ? 'Modifica Incarico' : 'Aggiungi Incarico'}</h2>
                    <button onClick={onClose} className="text-gray-500 hover:text-gray-800 text-2xl">&times;</button>
                </div>
                <form onSubmit={handleSubmit} className="space-y-4">
                    {!assignment && (
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Cantiere</label>
                            <select 
                                value={siteId} 
                                onChange={(e) => setSiteId(e.target.value)} 
                                className="w-full p-2 border border-gray-300 rounded-lg" 
                                required
                            >
                                <option value="">Seleziona cantiere...</option>
                                {sites.map(site => (
                                    <option key={site.id} value={site.id}>{site.name}</option>
                                ))}
                            </select>
                        </div>
                    )}
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Ora Inizio</label>
                            <input 
                                type="time" 
                                value={startTime} 
                                onChange={(e) => setStartTime(e.target.value)} 
                                className="w-full p-2 border border-gray-300 rounded-lg" 
                                required 
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Ora Fine</label>
                            <input 
                                type="time" 
                                value={endTime} 
                                onChange={(e) => setEndTime(e.target.value)} 
                                className="w-full p-2 border border-gray-300 rounded-lg" 
                                required 
                            />
                        </div>
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Note (Opzionale)</label>
                        <textarea 
                            value={notes} 
                            onChange={(e) => setNotes(e.target.value)} 
                            rows={3}
                            className="w-full p-2 border border-gray-300 rounded-lg" 
                            placeholder="Aggiungi istruzioni o dettagli..."
                        />
                    </div>

                     <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Operatori Extra (da altri cantieri)</label>
                        <input 
                            type="text"
                            placeholder="Cerca operatore..."
                            value={extraOperatorSearch}
                            onChange={(e) => setExtraOperatorSearch(e.target.value)}
                            className="w-full p-2 border border-gray-300 rounded-lg mb-2"
                        />
                        <div className="max-h-32 overflow-y-auto border rounded-lg p-2 space-y-1 bg-gray-50">
                            {filteredExtraOperators.length > 0 ? filteredExtraOperators.map(op => {
                                const isConflicting = conflictingOperatorIds.has(op.id);
                                return (
                                <label key={op.id} className={`flex items-center space-x-2 cursor-pointer p-1 rounded hover:bg-blue-100 ${isConflicting ? 'text-red-600 font-semibold' : ''}`}>
                                    <input 
                                        type="checkbox"
                                        className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                                        checked={extraOperatorIds.includes(op.id)}
                                        onChange={() => handleExtraOpToggle(op.id)}
                                    />
                                    <span>{op.firstName} {op.lastName}</span>
                                    {isConflicting && <i className="fa-solid fa-triangle-exclamation text-red-500 ml-auto" title="Conflitto di orario rilevato!"></i>}
                                </label>
                                )
                            }) : <p className="text-xs text-gray-500 italic p-1">Nessun operatore trovato.</p>}
                        </div>
                        <p className="text-xs text-gray-500 mt-1">Selezionando operatori qui, l'incarico verrà spostato nel planner "EXTRA JOLLY".</p>
                    </div>

                    <div className="mt-8 flex justify-end space-x-4">
                        <button type="button" onClick={onClose} className="px-4 py-2 bg-gray-200 text-gray-800 rounded-lg hover:bg-gray-300">Annulla</button>
                        <button type="submit" className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700">Salva</button>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default AssignmentModal;