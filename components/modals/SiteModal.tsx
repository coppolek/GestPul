
import React, { useState, useEffect } from 'react';
import { WorkSite, Employee, SiteAssignment } from '../../types';

interface SiteModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (site: Omit<WorkSite, 'id'> & { id?: string }) => void;
  site: WorkSite | null;
  employees: Employee[];
  isSaving: boolean;
}

const ALL_DAYS = ['Lunedì', 'Martedì', 'Mercoledì', 'Giovedì', 'Venerdì', 'Sabato', 'Domenica'];

const SiteModal: React.FC<SiteModalProps> = ({ isOpen, onClose, onSave, site, employees, isSaving }) => {
  const [formData, setFormData] = useState<Omit<WorkSite, 'id'>>({
    name: '',
    client: '',
    address: '',
    startDate: new Date().toISOString().split('T')[0],
    endDate: '',
    status: 'In Corso',
    assignments: [],
  });
  
  // State for managing the "add assignment" form
  const [newAssignment, setNewAssignment] = useState<{employeeId: string, workingHours: string, workingDays: string[]}>({ employeeId: '', workingHours: '08:00-12:00', workingDays: [] });

  useEffect(() => {
    if (site) {
      setFormData({
        ...site,
        endDate: site.endDate || '',
      });
    } else {
      // Reset form for new site
      setFormData({
        name: '',
        client: '',
        address: '',
        startDate: new Date().toISOString().split('T')[0],
        endDate: '',
        status: 'In Corso',
        assignments: [],
      });
    }
  }, [site]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleAssignmentChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setNewAssignment(prev => ({...prev, [name]: value}));
  };
  
  const handleDayToggle = (day: string) => {
    setNewAssignment(prev => {
        const newDays = prev.workingDays.includes(day)
            ? prev.workingDays.filter(d => d !== day)
            : [...prev.workingDays, day];
        return {...prev, workingDays: newDays};
    });
  };

  const addAssignment = () => {
    if (!newAssignment.employeeId || newAssignment.workingDays.length === 0) {
        alert("Seleziona un dipendente e almeno un giorno lavorativo.");
        return;
    }
    setFormData(prev => ({
        ...prev,
        assignments: [...prev.assignments, newAssignment]
    }));
    setNewAssignment({ employeeId: '', workingHours: '08:00-12:00', workingDays: [] });
  };
  
  const removeAssignment = (employeeId: string) => {
    setFormData(prev => ({
        ...prev,
        assignments: prev.assignments.filter(a => a.employeeId !== employeeId)
    }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave({ ...formData, id: site?.id });
  };

  if (!isOpen) return null;

  const assignedEmployeeIds = new Set(formData.assignments.map(a => a.employeeId));
  const availableEmployees = employees.filter(e => !assignedEmployeeIds.has(e.id));

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex justify-center items-center" onClick={onClose}>
      <div className="bg-white p-8 rounded-xl shadow-2xl w-full max-w-3xl max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
        <div className="flex justify-between items-center mb-6">
            <h2 className="text-2xl font-bold text-gray-800">{site ? 'Modifica Cantiere' : 'Aggiungi Cantiere'}</h2>
            <button onClick={onClose} className="text-gray-500 hover:text-gray-800 text-2xl" disabled={isSaving}>&times;</button>
        </div>
        
        <form onSubmit={handleSubmit} className="space-y-6">
          <fieldset disabled={isSaving}>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Nome Cantiere</label>
                <input type="text" name="name" value={formData.name} onChange={handleChange} className="w-full p-2 border border-gray-300 rounded-lg" required />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Cliente</label>
                <input type="text" name="client" value={formData.client} onChange={handleChange} className="w-full p-2 border border-gray-300 rounded-lg" required />
              </div>
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-1">Indirizzo</label>
                <input type="text" name="address" value={formData.address} onChange={handleChange} className="w-full p-2 border border-gray-300 rounded-lg" required />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Data Inizio</label>
                <input type="date" name="startDate" value={formData.startDate} onChange={handleChange} className="w-full p-2 border border-gray-300 rounded-lg" required />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Data Fine (Opzionale)</label>
                <input type="date" name="endDate" value={formData.endDate} onChange={handleChange} min={formData.startDate} className="w-full p-2 border border-gray-300 rounded-lg" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Stato</label>
                <select name="status" value={formData.status} onChange={handleChange} className="w-full p-2 border border-gray-300 rounded-lg">
                  <option value="In Corso">In Corso</option>
                  <option value="Completato">Completato</option>
                  <option value="Sospeso">Sospeso</option>
                </select>
              </div>
            </div>
            
            {/* Assignments Section */}
            <div>
                <h3 className="text-lg font-semibold text-gray-700 mb-2 border-t pt-4">Assegnazioni Dipendenti</h3>
                {/* List of current assignments */}
                <div className="space-y-2 mb-4">
                    {formData.assignments.map(ass => (
                        <div key={ass.employeeId} className="flex justify-between items-center p-2 bg-gray-100 rounded-lg">
                            <div>
                                <p className="font-semibold">{employees.find(e=>e.id === ass.employeeId)?.firstName} {employees.find(e=>e.id === ass.employeeId)?.lastName}</p>
                                <p className="text-xs text-gray-600">{ass.workingHours} | {ass.workingDays.join(', ')}</p>
                            </div>
                            <button type="button" onClick={() => removeAssignment(ass.employeeId)} className="text-red-500 hover:text-red-700"><i className="fa-solid fa-trash"></i></button>
                        </div>
                    ))}
                    {formData.assignments.length === 0 && <p className="text-sm text-gray-500 italic">Nessun dipendente assegnato.</p>}
                </div>

                {/* Form to add new assignment */}
                <div className="p-4 border border-dashed rounded-lg space-y-3">
                    <h4 className="font-semibold text-gray-600">Aggiungi nuovo</h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                         <div>
                            <label className="block text-xs font-medium text-gray-700 mb-1">Dipendente</label>
                            <select name="employeeId" value={newAssignment.employeeId} onChange={handleAssignmentChange} className="w-full p-2 border border-gray-300 rounded-lg text-sm">
                                <option value="">Seleziona...</option>
                                {availableEmployees.map(emp => <option key={emp.id} value={emp.id}>{emp.firstName} {emp.lastName}</option>)}
                            </select>
                        </div>
                        <div>
                            <label className="block text-xs font-medium text-gray-700 mb-1">Orario (es. 08:00-12:00)</label>
                            <input type="text" name="workingHours" value={newAssignment.workingHours} onChange={handleAssignmentChange} className="w-full p-2 border border-gray-300 rounded-lg text-sm" />
                        </div>
                    </div>
                    <div>
                         <label className="block text-xs font-medium text-gray-700 mb-2">Giorni</label>
                         <div className="flex flex-wrap gap-1">
                             {ALL_DAYS.map(day => (
                                 <button type="button" key={day} onClick={() => handleDayToggle(day)} className={`px-2 py-1 text-xs rounded-full border ${newAssignment.workingDays.includes(day) ? 'bg-blue-600 text-white border-blue-600' : 'bg-white'}`}>
                                     {day}
                                 </button>
                             ))}
                         </div>
                    </div>
                     <div className="text-right">
                        <button type="button" onClick={addAssignment} className="px-3 py-1 bg-blue-500 text-white text-sm rounded-lg hover:bg-blue-600">Aggiungi Assegnazione</button>
                    </div>
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

export default SiteModal;
