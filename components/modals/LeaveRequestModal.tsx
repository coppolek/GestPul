import React, { useState, useMemo, useEffect, useRef } from 'react';
import { Employee, LeaveRequest, AbsenceType } from '../../types';

interface LeaveRequestModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (request: Omit<LeaveRequest, 'id' | 'status'>) => void;
  employees: Employee[];
  isSaving: boolean;
}

const LeaveRequestModal: React.FC<LeaveRequestModalProps> = ({ isOpen, onClose, onSave, employees, isSaving }) => {
  const [formData, setFormData] = useState({
    employeeId: '',
    type: AbsenceType.FERIE,
    startDate: new Date().toISOString().split('T')[0],
    endDate: new Date().toISOString().split('T')[0],
    reason: '',
  });

  // State for searchable dropdown
  const [employeeSearch, setEmployeeSearch] = useState('');
  const [isEmployeeDropdownOpen, setIsEmployeeDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Filter employees based on search
  const filteredEmployees = useMemo(() => {
    if (!employeeSearch.trim()) {
      return employees;
    }
    return employees.filter(emp =>
      `${emp.firstName} ${emp.lastName}`.toLowerCase().includes(employeeSearch.toLowerCase())
    );
  }, [employees, employeeSearch]);
  
  // Reset state when modal is opened
  useEffect(() => {
    if (isOpen) {
        setFormData({
            employeeId: '',
            type: AbsenceType.FERIE,
            startDate: new Date().toISOString().split('T')[0],
            endDate: new Date().toISOString().split('T')[0],
            reason: '',
        });
        setEmployeeSearch('');
        setIsEmployeeDropdownOpen(false);
    }
  }, [isOpen]);

  // Handle click outside to close dropdown
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsEmployeeDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  const handleEmployeeSelect = (employee: Employee) => {
    setFormData(prev => ({ ...prev, employeeId: employee.id }));
    setEmployeeSearch(`${employee.firstName} ${employee.lastName}`);
    setIsEmployeeDropdownOpen(false);
  };
  
  const handleEmployeeSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      setEmployeeSearch(e.target.value);
      setFormData(prev => ({...prev, employeeId: ''})); // Clear ID on new search
      if (!isEmployeeDropdownOpen) {
          setIsEmployeeDropdownOpen(true);
      }
  }

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.employeeId) {
      alert('Selezionare un dipendente valido dalla lista.');
      return;
    }
    onSave(formData);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex justify-center items-center" onClick={onClose}>
      <div className="bg-white p-8 rounded-xl shadow-2xl w-full max-w-lg" onClick={e => e.stopPropagation()}>
        <div className="flex justify-between items-center mb-6">
            <h2 className="text-2xl font-bold text-gray-800">Nuova Richiesta</h2>
            <button onClick={onClose} className="text-gray-500 hover:text-gray-800 text-2xl" disabled={isSaving}>&times;</button>
        </div>
        
        <form onSubmit={handleSubmit} className="space-y-4">
          <fieldset disabled={isSaving}>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Dipendente</label>
              <div className="relative" ref={dropdownRef}>
                <input
                    type="text"
                    value={employeeSearch}
                    onChange={handleEmployeeSearchChange}
                    onFocus={() => setIsEmployeeDropdownOpen(true)}
                    placeholder="Cerca dipendente..."
                    className="w-full p-2 border border-gray-300 rounded-lg"
                    autoComplete="off"
                />
                {isEmployeeDropdownOpen && (
                    <div className="absolute z-10 w-full mt-1 bg-white border border-gray-300 rounded-lg shadow-lg max-h-60 overflow-y-auto">
                        {filteredEmployees.length > 0 ? (
                            filteredEmployees.map(emp => (
                                <div 
                                    key={emp.id}
                                    onClick={() => handleEmployeeSelect(emp)}
                                    className="p-2 hover:bg-blue-100 cursor-pointer"
                                >
                                    {emp.firstName} {emp.lastName}
                                </div>
                            ))
                        ) : (
                            <div className="p-2 text-gray-500">Nessun dipendente trovato.</div>
                        )}
                    </div>
                )}
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Tipo Richiesta</label>
              <select name="type" value={formData.type} onChange={handleChange} className="w-full p-2 border border-gray-300 rounded-lg">
                {Object.values(AbsenceType).map(type => <option key={type} value={type}>{type}</option>)}
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
              <label className="block text-sm font-medium text-gray-700 mb-1">Motivazione (Opzionale)</label>
              <textarea name="reason" value={formData.reason} onChange={handleChange} rows={3} className="w-full p-2 border border-gray-300 rounded-lg"></textarea>
            </div>
          </fieldset>
          <div className="mt-8 flex justify-end space-x-4">
            <button type="button" onClick={onClose} className="px-4 py-2 bg-gray-200 text-gray-800 rounded-lg hover:bg-gray-300" disabled={isSaving}>Annulla</button>
            <button type="submit" className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed w-40" disabled={isSaving}>
                 {isSaving ? <i className="fa-solid fa-spinner fa-spin"></i> : 'Invia Richiesta'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
export default LeaveRequestModal;