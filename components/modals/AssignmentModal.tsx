import React, { useState, useEffect } from 'react';
import { Assignment, WorkSite } from '../../types';

interface AssignmentModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSave: (data: { startTime: string, endTime: string, siteId?: string }) => void;
    assignment?: Assignment;
    sites?: WorkSite[];
}

const AssignmentModal: React.FC<AssignmentModalProps> = ({ isOpen, onClose, onSave, assignment, sites = [] }) => {
    const [startTime, setStartTime] = useState('08:00');
    const [endTime, setEndTime] = useState('12:00');
    const [siteId, setSiteId] = useState('');

    useEffect(() => {
        if (assignment) {
            setStartTime(assignment.startTime);
            setEndTime(assignment.endTime);
            setSiteId(assignment.siteId);
        } else {
            // Reset to default for new assignments
            setStartTime('08:00');
            setEndTime('12:00');
            setSiteId('');
        }
    }, [assignment]);

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (!assignment && !siteId) {
            alert('Selezionare un cantiere.');
            return;
        }
        onSave({ startTime, endTime, siteId });
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex justify-center items-center" onClick={onClose}>
            <div className="bg-white p-8 rounded-xl shadow-2xl w-full max-w-sm" onClick={e => e.stopPropagation()}>
                <div className="flex justify-between items-center mb-6">
                    <h2 className="text-2xl font-bold text-gray-800">{assignment ? 'Modifica Orario' : 'Aggiungi Incarico'}</h2>
                    <button onClick={onClose} className="text-gray-500 hover:text-gray-800 text-2xl">&times;</button>
                </div>
                <form onSubmit={handleSubmit} className="space-y-6">
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