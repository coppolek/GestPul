import React, { useState, useEffect } from 'react';
import { Employee, AttendanceRecord } from '../../types';

interface AttendanceModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (record: Omit<AttendanceRecord, 'id'>) => void;
  employees: Employee[];
  isSaving: boolean;
}

const AttendanceModal: React.FC<AttendanceModalProps> = ({ isOpen, onClose, onSave, employees, isSaving }) => {
  
  const getInitialDateTime = () => {
    const now = new Date();
    const date = now.toISOString().split('T')[0];
    const time = now.toTimeString().substring(0, 5);
    return { date, time };
  };
  
  const [employeeId, setEmployeeId] = useState('');
  const [date, setDate] = useState(getInitialDateTime().date);
  const [time, setTime] = useState(getInitialDateTime().time);
  const [type, setType] = useState<'Entrata' | 'Uscita'>('Entrata');
  const [notes, setNotes] = useState('');

  const resetForm = () => {
    setEmployeeId('');
    const { date, time } = getInitialDateTime();
    setDate(date);
    setTime(time);
    setType('Entrata');
    setNotes('');
  };

  useEffect(() => {
    if (isOpen) {
        resetForm();
    }
  }, [isOpen]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!employeeId) {
        alert("Selezionare un dipendente.");
        return;
    }
    const timestamp = new Date(`${date}T${time}`).toISOString();
    onSave({ employeeId, timestamp, type, notes });
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex justify-center items-center" onClick={onClose}>
      <div className="bg-white p-8 rounded-xl shadow-2xl w-full max-w-lg" onClick={e => e.stopPropagation()}>
        <div className="flex justify-between items-center mb-6">
            <h2 className="text-2xl font-bold text-gray-800">Aggiungi Timbratura Manuale</h2>
            <button onClick={onClose} className="text-gray-500 hover:text-gray-800 text-2xl" disabled={isSaving}>&times;</button>
        </div>
        
        <form onSubmit={handleSubmit} className="space-y-4">
          <fieldset disabled={isSaving}>
            <div>
                <label htmlFor="employeeId" className="block text-sm font-medium text-gray-700 mb-1">Dipendente</label>
                <select id="employeeId" value={employeeId} onChange={(e) => setEmployeeId(e.target.value)} className="w-full p-2 border border-gray-300 rounded-lg" required>
                    <option value="">Seleziona dipendente...</option>
                    {employees.map(emp => (
                        <option key={emp.id} value={emp.id}>{emp.firstName} {emp.lastName}</option>
                    ))}
                </select>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label htmlFor="date" className="block text-sm font-medium text-gray-700 mb-1">Data</label>
                <input type="date" id="date" value={date} onChange={e => setDate(e.target.value)} className="w-full p-2 border border-gray-300 rounded-lg" required />
              </div>
              <div>
                <label htmlFor="time" className="block text-sm font-medium text-gray-700 mb-1">Ora</label>
                <input type="time" id="time" value={time} onChange={e => setTime(e.target.value)} className="w-full p-2 border border-gray-300 rounded-lg" required />
              </div>
            </div>

            <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Tipo di Timbratura</label>
                <div className="flex gap-4">
                    <label className="flex items-center">
                        <input type="radio" name="type" value="Entrata" checked={type === 'Entrata'} onChange={() => setType('Entrata')} className="h-4 w-4 border-gray-300 text-blue-600 focus:ring-blue-500" />
                        <span className="ml-2 text-gray-700">Entrata</span>
                    </label>
                    <label className="flex items-center">
                        <input type="radio" name="type" value="Uscita" checked={type === 'Uscita'} onChange={() => setType('Uscita')} className="h-4 w-4 border-gray-300 text-blue-600 focus:ring-blue-500" />
                        <span className="ml-2 text-gray-700">Uscita</span>
                    </label>
                </div>
            </div>

            <div>
              <label htmlFor="notes" className="block text-sm font-medium text-gray-700 mb-1">Note (Opzionale)</label>
              <textarea id="notes" value={notes} onChange={e => setNotes(e.target.value)} rows={3} className="w-full p-2 border border-gray-300 rounded-lg"></textarea>
            </div>
          </fieldset>
          
          <div className="mt-8 flex justify-end space-x-4">
            <button type="button" onClick={onClose} className="px-4 py-2 bg-gray-200 text-gray-800 rounded-lg hover:bg-gray-300" disabled={isSaving}>Annulla</button>
            <button type="submit" className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed w-32" disabled={isSaving}>
                {isSaving ? <i className="fa-solid fa-spinner fa-spin"></i> : 'Salva'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default AttendanceModal;