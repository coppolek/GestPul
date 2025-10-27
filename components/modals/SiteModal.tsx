
import React, { useState, useEffect, useMemo, useRef } from 'react';
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
  const [formData, setFormData] = useState({
    name: '',
    client: '',
    address: '',
    startDate: new Date().toISOString().split('T')[0],
    status: 'In Corso' as const,
  });
  const [assignments, setAssignments] = useState<SiteAssignment[]>([]);
  
  // State for employee selection dropdown
  const [employeeSearch, setEmployeeSearch] = useState('');
  const [newAssignmentEmployeeId, setNewAssignmentEmployeeId] = useState<string | null>(null);
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const employeeIdMap = useMemo(() => new Map(employees.map(emp => [emp.id, `${emp.firstName} ${emp.lastName}`])), [employees]);

  useEffect(() => {
    if (site) {
      setFormData({
        name: site.name,
        client: site.client,
        address: site.address,
        startDate: site.startDate,
        status: site.status,
      });
      setAssignments(site.assignments);
    } else {
      // Reset form for new site
      setFormData({
        name: '',
        client: '',
        address: '',
        startDate: new Date().toISOString().split('T')[0],
        status: 'In Corso' as const,
      });
      setAssignments([]);
    }
  }, [site]);

  // Click outside handler for dropdown
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  const handleBaseChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleAssignmentChange = (index: number, field: keyof SiteAssignment, value: any) => {
    const newAssignments = [...assignments];
    (newAssignments[index] as any)[field] = value;
    setAssignments(newAssignments);
  };

  const handleDayChange = (index: number, day: string) => {
    const newAssignments = [...assignments];
    const currentDays = newAssignments[index].workingDays;
    if (currentDays.includes(day)) {
      newAssignments[index].workingDays = currentDays.filter(d => d !== day);
    } else {
      newAssignments[index].workingDays = [...currentDays, day];
    }
    setAssignments(newAssignments);
  };

  const handleRemoveAssignment = (index: number) => {
    setAssignments(prev => prev.filter((_, i) => i !== index));
  };
  
  const handleEmployeeSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      setEmployeeSearch(e.target.value);
      setNewAssignmentEmployeeId(null);
      if (!isDropdownOpen) {
          setIsDropdownOpen(true);
      }
  };

  const handleEmployeeSelect = (employee: Employee) => {
      setEmployeeSearch(`${employee.firstName} ${employee.lastName}`);
      setNewAssignmentEmployeeId(employee.id);
      setIsDropdownOpen(false);
  };
  
  const handleAddAssignment = () => {
      if (newAssignmentEmployeeId) {
          setAssignments(prev => [...prev, {
              employeeId: newAssignmentEmployeeId,
              workingHours: '08:00-17:00',
              workingDays: [],
          }]);
          setEmployeeSearch('');
          setNewAssignmentEmployeeId(null);
      }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave({ ...formData, assignments, id: site?.id });
  };

  const availableEmployees = useMemo(() => {
    const assignedIds = new Set(assignments.map(a => a.employeeId));
    return employees.filter(emp => !assignedIds.has(emp.id));
  }, [employees, assignments]);

  const filteredAvailableEmployees = useMemo(() => {
      if (!employeeSearch) return availableEmployees;
      return availableEmployees.filter(emp =>
          `${emp.firstName} ${emp.lastName}`.toLowerCase().includes(employeeSearch.toLowerCase())
      );
  }, [availableEmployees, employeeSearch]);


  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex justify-center items-center" onClick={onClose}>
      <div className="bg-white p-8 rounded-xl shadow-2xl w-full max-w-4xl max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
        <div className="flex justify-between items-center mb-6">
            <h2 className="text-2xl font-bold text-gray-800">{site ? 'Modifica Cantiere' : 'Aggiungi Cantiere'}</h2>
            <button onClick={onClose} className="text-gray-500 hover:text-gray-800 text-2xl" disabled={isSaving}>&times;</button>
        </div>
        
        <form onSubmit={handleSubmit}>
          <fieldset disabled={isSaving}>
            {/* Basic Info */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Nome Cantiere</label>
                <input type="text" name="name" value={formData.name} onChange={handleBaseChange} className="w-full p-2 border border-gray-300 rounded-lg" required />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Cliente</label>
                <input type="text" name="client" value={formData.client} onChange={handleBaseChange} className="w-full p-2 border border-gray-300 rounded-lg" required />
              </div>
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-1">Indirizzo</label>
                <input type="text" name="address" value={formData.address} onChange={handleBaseChange} className="w-full p-2 border border-gray-300 rounded-lg" required />
              </div>
            </div>
            
            {/* Assignments */}
            <div className="mt-8 pt-6 border-t">
                <h3 className="text-xl font-bold text-gray-800 mb-4">Assegnazione Operatori</h3>
                <div className="space-y-4">
                    {assignments.map((ass, index) => (
                        <div key={index} className="p-4 bg-gray-50 rounded-lg border">
                            <div className="flex justify-between items-center mb-4">
                                <p className="font-bold text-lg text-gray-800">{employeeIdMap.get(ass.employeeId)}</p>
                                <button type="button" onClick={() => handleRemoveAssignment(index)} className="text-red-500 hover:text-red-700">
                                    <i className="fa-solid fa-trash mr-1"></i> Rimuovi
                                </button>
                            </div>
                            <div>
                              <label className="block text-sm font-medium text-gray-700 mb-1">Fascia Oraria (es. 08:00-17:00)</label>
                              <input 
                                  type="text"
                                  value={ass.workingHours}
                                  onChange={(e) => handleAssignmentChange(index, 'workingHours', e.target.value)}
                                  className="w-full md:w-1/2 p-2 border border-gray-300 rounded-lg"
                              />
                            </div>
                            <div className="mt-3">
                                <label className="block text-sm font-medium text-gray-700 mb-2">Giorni di Lavoro</label>
                                <div className="flex flex-wrap gap-2">
                                    {ALL_DAYS.map(day => (
                                        <button
                                            type="button"
                                            key={day}
                                            onClick={() => handleDayChange(index, day)}
                                            className={`px-3 py-1 text-sm rounded-full border transition-colors ${
                                                ass.workingDays.includes(day)
                                                ? 'bg-blue-600 text-white border-blue-600'
                                                : 'bg-white hover:bg-gray-100 border-gray-300'
                                            }`}
                                        >
                                            {day.substring(0,3)}
                                        </button>
                                    ))}
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
                
                <div className="mt-6 flex items-center gap-4 p-4 border-t">
                    <div className="relative flex-grow" ref={dropdownRef}>
                        <input
                            type="text"
                            value={employeeSearch}
                            onChange={handleEmployeeSearchChange}
                            onFocus={() => setIsDropdownOpen(true)}
                            placeholder="Cerca operatore da aggiungere..."
                            className="w-full p-2 border border-gray-300 rounded-lg"
                            autoComplete="off"
                        />
                        {isDropdownOpen && (
                            <div className="absolute z-10 w-full mt-1 bg-white border border-gray-300 rounded-lg shadow-lg max-h-48 overflow-y-auto">
                                {filteredAvailableEmployees.length > 0 ? (
                                    filteredAvailableEmployees.map(emp => (
                                        <div 
                                            key={emp.id}
                                            onClick={() => handleEmployeeSelect(emp)}
                                            className="p-2 hover:bg-blue-100 cursor-pointer"
                                        >
                                            {emp.firstName} {emp.lastName}
                                        </div>
                                    ))
                                ) : (
                                    <div className="p-2 text-gray-500">Nessun operatore disponibile trovato.</div>
                                )}
                            </div>
                        )}
                    </div>
                    <button type="button" onClick={handleAddAssignment} disabled={!newAssignmentEmployeeId} className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:bg-gray-400">
                        <i className="fa-solid fa-plus mr-2"></i>Aggiungi
                    </button>
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
