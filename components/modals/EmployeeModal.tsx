import React, { useState, useEffect } from 'react';
import { Employee } from '../../types';

interface EmployeeModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (employee: Omit<Employee, 'id'> & { id?: string }) => void;
  employee: Employee | null;
  isSaving: boolean;
}

const EmployeeModal: React.FC<EmployeeModalProps> = ({ isOpen, onClose, onSave, employee, isSaving }) => {
  const [formData, setFormData] = useState<Omit<Employee, 'id'>>({
    firstName: '',
    lastName: '',
    role: 'Operatore',
    contractType: 'Tempo Indeterminato',
    startDate: new Date().toISOString().split('T')[0],
    endDate: '',
    medicalVisitExpiry: '',
    phone: '',
    email: '',
    address: '',
    notes: '',
  });

  useEffect(() => {
    if (employee) {
      setFormData({
        ...employee,
        endDate: employee.endDate || '',
        notes: employee.notes || ''
      });
    } else {
      // Reset form for new employee
      setFormData({
        firstName: '',
        lastName: '',
        role: 'Operatore',
        contractType: 'Tempo Indeterminato',
        startDate: new Date().toISOString().split('T')[0],
        endDate: '',
        medicalVisitExpiry: '',
        phone: '',
        email: '',
        address: '',
        notes: '',
      });
    }
  }, [employee]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };
  
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave({ ...formData, id: employee?.id });
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex justify-center items-center" onClick={onClose}>
      <div className="bg-white p-8 rounded-xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
        <div className="flex justify-between items-center mb-6">
            <h2 className="text-2xl font-bold text-gray-800">{employee ? 'Modifica Dipendente' : 'Aggiungi Dipendente'}</h2>
            <button onClick={onClose} className="text-gray-500 hover:text-gray-800 text-2xl" disabled={isSaving}>&times;</button>
        </div>
        
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Nome</label>
              <input type="text" name="firstName" value={formData.firstName} onChange={handleChange} className="w-full p-2 border border-gray-300 rounded-lg" required />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Cognome</label>
              <input type="text" name="lastName" value={formData.lastName} onChange={handleChange} className="w-full p-2 border border-gray-300 rounded-lg" required />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Ruolo</label>
              <select name="role" value={formData.role} onChange={handleChange} className="w-full p-2 border border-gray-300 rounded-lg">
                <option value="Operatore">Operatore</option>
                <option value="Jolly">Jolly</option>
                <option value="Impiegato">Impiegato</option>
              </select>
            </div>
             <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Tipo Contratto</label>
              <select name="contractType" value={formData.contractType} onChange={handleChange} className="w-full p-2 border border-gray-300 rounded-lg">
                <option value="Tempo Indeterminato">Tempo Indeterminato</option>
                <option value="Tempo Determinato">Tempo Determinato</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Data Assunzione</label>
              <input type="date" name="startDate" value={formData.startDate} onChange={handleChange} className="w-full p-2 border border-gray-300 rounded-lg" required />
            </div>
             {formData.contractType === 'Tempo Determinato' && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Data Scadenza Contratto</label>
                <input type="date" name="endDate" value={formData.endDate} onChange={handleChange} min={formData.startDate} className="w-full p-2 border border-gray-300 rounded-lg" required />
              </div>
            )}
             <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Scadenza Visita Medica</label>
              <input type="date" name="medicalVisitExpiry" value={formData.medicalVisitExpiry} onChange={handleChange} className="w-full p-2 border border-gray-300 rounded-lg" required />
            </div>
             <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Telefono</label>
              <input type="tel" name="phone" value={formData.phone} onChange={handleChange} className="w-full p-2 border border-gray-300 rounded-lg" required />
            </div>
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
              <input type="email" name="email" value={formData.email} onChange={handleChange} className="w-full p-2 border border-gray-300 rounded-lg" required />
            </div>
             <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">Indirizzo</label>
              <input type="text" name="address" value={formData.address} onChange={handleChange} className="w-full p-2 border border-gray-300 rounded-lg" required />
            </div>
             <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">Note (Opzionale)</label>
              <textarea name="notes" value={formData.notes} onChange={handleChange} rows={3} className="w-full p-2 border border-gray-300 rounded-lg"></textarea>
            </div>
          </div>
          <div className="mt-8 flex justify-end space-x-4">
            <button type="button" onClick={onClose} className="px-4 py-2 bg-gray-200 text-gray-800 rounded-lg hover:bg-gray-300" disabled={isSaving}>Annulla</button>
            <button type="submit" className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed w-28" disabled={isSaving}>
                {isSaving ? <i className="fa-solid fa-spinner fa-spin"></i> : 'Salva'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default EmployeeModal;