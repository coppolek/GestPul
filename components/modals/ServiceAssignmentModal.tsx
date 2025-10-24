
import React, { useState, useEffect, useMemo } from 'react';
import { WorkSite, Employee, SiteAssignment } from '../../types';

interface ServiceAssignmentModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (data: { employeeId: string; workingHours: string; workingDays: string[] }) => void;
  isSaving: boolean;
  site: WorkSite;
  assignment?: SiteAssignment;
  employees: Employee[];
}

const ALL_DAYS = ['Lunedì', 'Martedì', 'Mercoledì', 'Giovedì', 'Venerdì', 'Sabato', 'Domenica'];

const ServiceAssignmentModal: React.FC<ServiceAssignmentModalProps> = ({
  isOpen,
  onClose,
  onSave,
  isSaving,
  site,
  assignment,
  employees,
}) => {
  const [employeeId, setEmployeeId] = useState('');
  const [workingHours, setWorkingHours] = useState('08:00-17:00');
  const [workingDays, setWorkingDays] = useState<string[]>([]);
  
  const isEditing = useMemo(() => !!assignment, [assignment]);

  useEffect(() => {
    if (assignment) {
      setEmployeeId(assignment.employeeId);
      setWorkingHours(assignment.workingHours);
      setWorkingDays(assignment.workingDays);
    } else {
      // Reset for new assignment
      setEmployeeId('');
      setWorkingHours('08:00-17:00');
      setWorkingDays([]);
    }
  }, [assignment, isOpen]);

  const handleDayToggle = (day: string) => {
    setWorkingDays(prev =>
      prev.includes(day) ? prev.filter(d => d !== day) : [...prev, day]
    );
  };
  
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!employeeId) {
        alert("Selezionare un dipendente.");
        return;
    }
    if (workingDays.length === 0) {
        alert("Selezionare almeno un giorno lavorativo.");
        return;
    }
    onSave({ employeeId, workingHours, workingDays });
  };

  const availableEmployees = useMemo(() => {
      // In edit mode, the current employee should be in the list
      if (isEditing) return employees;
      // In add mode, show only unassigned employees
      const assignedIds = new Set(site.assignments.map(a => a.employeeId));
      return employees.filter(e => !assignedIds.has(e.id));
  }, [employees, site, isEditing]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex justify-center items-center" onClick={onClose}>
      <div className="bg-white p-8 rounded-xl shadow-2xl w-full max-w-lg" onClick={e => e.stopPropagation()}>
        <div className="flex justify-between items-center mb-6">
            <h2 className="text-2xl font-bold text-gray-800">{isEditing ? 'Modifica Servizio' : 'Aggiungi Servizio'} a {site.name}</h2>
            <button onClick={onClose} className="text-gray-500 hover:text-gray-800 text-2xl" disabled={isSaving}>&times;</button>
        </div>
        
        <form onSubmit={handleSubmit} className="space-y-6">
          <fieldset disabled={isSaving}>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Dipendente</label>
              <select
                value={employeeId}
                onChange={(e) => setEmployeeId(e.target.value)}
                className="w-full p-2 border border-gray-300 rounded-lg"
                disabled={isEditing}
                required
              >
                <option value="">Seleziona un dipendente...</option>
                {availableEmployees.map(emp => (
                  <option key={emp.id} value={emp.id}>{emp.firstName} {emp.lastName}</option>
                ))}
              </select>
               {isEditing && <p className="text-xs text-gray-500 mt-1">Il dipendente non può essere modificato. Per cambiare dipendente, rimuovi questo servizio e creane uno nuovo.</p>}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Fascia Oraria (es. 08:00-17:00)</label>
              <input 
                type="text"
                value={workingHours}
                onChange={(e) => setWorkingHours(e.target.value)}
                className="w-full p-2 border border-gray-300 rounded-lg"
                required
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Giorni di Lavoro</label>
              <div className="flex flex-wrap gap-2">
                  {ALL_DAYS.map(day => (
                      <button
                          type="button"
                          key={day}
                          onClick={() => handleDayToggle(day)}
                          className={`px-3 py-1 text-sm rounded-full border transition-colors ${
                              workingDays.includes(day)
                              ? 'bg-blue-600 text-white border-blue-600'
                              : 'bg-white hover:bg-gray-100 border-gray-300'
                          }`}
                      >
                          {day}
                      </button>
                  ))}
              </div>
            </div>
          </fieldset>
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

export default ServiceAssignmentModal;
