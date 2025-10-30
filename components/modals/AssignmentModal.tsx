import React, { useState, useEffect, useMemo } from 'react';
import { Assignment, WorkSite, Employee } from '../../types';

interface AssignmentModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSave: (data: { startTime: string, endTime: string, siteId?: string, notes?: string, extraOperatorIds?: string[] }) => void;
    assignment?: Assignment;
    sites?: WorkSite[];
    employees?: Employee[];
}

const AssignmentModal: React.FC<AssignmentModalProps> = ({ isOpen, onClose, onSave, assignment, sites = [], employees = [] }) => {
    const [startTime, setStartTime] = useState('08:00');
    const [endTime, setEndTime] = useState('12:00');
    const [siteId, setSiteId] = useState('');
    const [notes, setNotes] = useState('');
    const [extraOperatorIds, setExtraOperatorIds] = useState<string[]>([]);

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
    }, [assignment]);

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
        onSave({ startTime, endTime, siteId, notes, extraOperatorIds });
    };

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
                        <div className="max-h-32 overflow-y-auto border rounded-lg p-2 space-y-1 bg-gray-50">
                            {operatorEmployees.length > 0 ? operatorEmployees.map(op => (
                                <label key={op.id} className="flex items-center space-x-2 cursor-pointer p-1 rounded hover:bg-blue-100">
                                    <input 
                                        type="checkbox"
                                        className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                                        checked={extraOperatorIds.includes(op.id)}
                                        onChange={() => handleExtraOpToggle(op.id)}
                                    />
                                    <span>{op.firstName} {op.lastName}</span>
                                </label>
                            )) : <p className="text-xs text-gray-500 italic p-1">Nessun operatore disponibile.</p>}
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