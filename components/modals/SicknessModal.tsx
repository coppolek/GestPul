import React, { useState } from 'react';
import { Employee, SicknessRecord } from '../../types';

interface SicknessModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (record: Omit<SicknessRecord, 'id'>) => void;
  employees: Employee[];
  isSaving: boolean;
}

const SicknessModal: React.FC<SicknessModalProps> = ({ isOpen, onClose, onSave, employees, isSaving }) => {
  const [formData, setFormData] = useState({
    employeeId: '',
    startDate: new Date().toISOString().split('T')[0],
    endDate: new Date().toISOString().split('T')[0],
    notes: '',
  });

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
     if (!formData.employeeId) {
      alert('Selezionare un dipendente');
      return;
    }
    onSave(formData);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex justify-center items-center" onClick={onClose}>
      <div className="bg-white p-8 rounded-xl shadow-2xl w-full max-w-lg" onClick={e => e.stopPropagation()}>
        <div className="flex justify-between items-center mb-6">
            <h2 className="text-2xl font-bold text-gray-800">Segnala Malattia</h2>
            <button onClick={onClose} className="text-gray-500 hover:text-gray-800 text-2xl" disabled={isSaving}>&times;</button>
        </div>
        
        <form onSubmit={handleSubmit} className="space-y-4">
          <fieldset disabled={isSaving}>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Dipendente</label>
              <select name="employeeId" value={formData.employeeId} onChange={handleChange} className="w-full p-2 border border-gray-300 rounded-lg" required>
                <option value="">Seleziona dipendente...</option>
                {employees.map(emp => <option key={emp.id} value={emp.id}>{emp.firstName} {emp.lastName}</option>)}
              </select>
            </div>
             <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Data Inizio</label>
                <input type="date" name="startDate" value={formData.startDate} onChange={handleChange} className="w-full p-2 border border-gray-300 rounded-lg" required />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Data Fine</label>
                <input type="date" name="endDate" value={formData.endDate} min={formData.startDate} onChange={handleChange} className="w-full p-2 border border-gray-300 rounded-lg" required />
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Note (Opzionale)</label>
              <textarea name="notes" value={formData.notes} onChange={handleChange} rows={3} className="w-full p-2 border border-gray-300 rounded-lg"></textarea>
            </div>
          </fieldset>
          <div className="mt-8 flex justify-end space-x-4">
            <button type="button" onClick={onClose} className="px-4 py-2 bg-gray-200 text-gray-800 rounded-lg hover:bg-gray-300" disabled={isSaving}>Annulla</button>
            <button type="submit" className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed w-44" disabled={isSaving}>
                {isSaving ? <i className="fa-solid fa-spinner fa-spin"></i> : 'Salva Registrazione'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default SicknessModal;