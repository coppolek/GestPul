import React, { useState, useMemo } from 'react';
import { Employee, WorkSite } from '../types';
import EmployeeModal from './modals/EmployeeModal';
import EmployeeDetailModal from './modals/EmployeeDetailModal';
import ImportModal from './modals/ImportModal';
import * as api from '../services/api';

interface EmployeeListProps {
  employees: Employee[];
  setEmployees: React.Dispatch<React.SetStateAction<Employee[]>>;
  sites: WorkSite[];
}

const EmployeeList: React.FC<EmployeeListProps> = ({ employees, setEmployees, sites }) => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [selectedEmployee, setSelectedEmployee] = useState<Employee | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  const handleOpenModal = (employee: Employee | null = null) => {
    setSelectedEmployee(employee);
    setIsModalOpen(true);
  };

  const handleOpenDetailModal = (employee: Employee) => {
    setSelectedEmployee(employee);
    setIsDetailModalOpen(true);
  };
  
  const handleCloseModals = () => {
    setIsModalOpen(false);
    setIsDetailModalOpen(false);
    setIsImportModalOpen(false);
    setSelectedEmployee(null);
  };

  const handleSaveEmployee = async (employeeData: Omit<Employee, 'id'> & { id?: string }) => {
    setIsSaving(true);
    try {
        if (employeeData.id) {
            // Edit
            const updatedEmployee = await api.updateData<Employee>('employees', employeeData.id, employeeData as Employee);
            setEmployees(prev => prev.map(e => e.id === updatedEmployee.id ? updatedEmployee : e));
        } else {
            // Add
            const newEmployee = await api.addData<Omit<Employee, 'id'>, Employee>('employees', employeeData);
            setEmployees(prev => [...prev, newEmployee]);
        }
        handleCloseModals();
    } catch (error) {
        console.error("Failed to save employee", error);
        alert("Salvataggio fallito. Riprova.");
    } finally {
        setIsSaving(false);
    }
  };

  const handleDeleteEmployee = async (employeeId: string) => {
    const isAssigned = sites.some(site => site.assignments.some(a => a.employeeId === employeeId));
    if (isAssigned) {
        alert('Impossibile eliminare un dipendente assegnato a un cantiere.');
        return;
    }
    if (window.confirm('Sei sicuro di voler eliminare questo dipendente?')) {
        try {
            await api.deleteData('employees', employeeId);
            setEmployees(prev => prev.filter(e => e.id !== employeeId));
        } catch (error) {
            console.error("Failed to delete employee", error);
            alert("Eliminazione fallita. Riprova.");
        }
    }
  };

  const handleImportEmployees = async (newEmployees: Omit<Employee, 'id'>[]) => {
    setIsSaving(true);
    try {
        const existingPhones = new Set(employees.map(e => e.phone));
        const employeesToImport: Omit<Employee, 'id'>[] = [];
        const processedPhones = new Set<string>();

        for (const emp of newEmployees) {
            // If phone is empty, we cannot reliably check for duplicates, so we'll import it.
            if (!emp.phone) {
                employeesToImport.push(emp);
                continue;
            }

            // Check against existing employees and employees already processed from the current file.
            if (!existingPhones.has(emp.phone) && !processedPhones.has(emp.phone)) {
                employeesToImport.push(emp);
                processedPhones.add(emp.phone);
            }
        }
        
        const skippedCount = newEmployees.length - employeesToImport.length;
        if (employeesToImport.length === 0 && newEmployees.length > 0) {
            alert('Nessun nuovo dipendente da importare. Tutti i dipendenti nel file sono già presenti nel sistema o sono duplicati all\'interno del file stesso.');
            handleCloseModals();
            setIsSaving(false); // Important to reset saving state here
            return;
        }

        if (skippedCount > 0) {
            alert(`${skippedCount} dipendent${skippedCount > 1 ? 'i' : 'e'} ${skippedCount > 1 ? 'sono stati saltati' : 'è stato saltato'} perché già presente o duplicato nel file (controllo basato sul numero di telefono).`);
        }

        if (employeesToImport.length > 0) {
            const addedEmployees = await api.addBatchData<Omit<Employee, 'id'>, Employee>('employees', employeesToImport);
            setEmployees(prev => [...prev, ...addedEmployees]);
        }
        
        handleCloseModals();
    } catch (error) {
        console.error("Failed to import employees", error);
        alert("Importazione fallita. Riprova.");
    } finally {
        setIsSaving(false);
    }
  };

  const filteredEmployees = useMemo(() => {
    return employees.filter(emp => 
      `${emp.firstName} ${emp.lastName}`.toLowerCase().includes(searchTerm.toLowerCase()) ||
      emp.role.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [employees, searchTerm]);


  return (
    <>
      <div className="bg-white p-6 rounded-xl shadow-lg">
        <div className="flex justify-between items-center mb-6 gap-4 flex-wrap">
          <h2 className="text-2xl font-bold text-gray-800">Elenco Dipendenti</h2>
          <div className="flex-grow max-w-md">
            <input 
              type="text"
              placeholder="Cerca per nome o ruolo..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full p-2 border border-gray-300 rounded-lg"
            />
          </div>
          <div className="flex gap-2">
            <button onClick={() => setIsImportModalOpen(true)} className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors">
                <i className="fa-solid fa-file-import mr-2"></i>Importa
            </button>
            <button onClick={() => handleOpenModal()} className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors">
              <i className="fa-solid fa-plus mr-2"></i>Aggiungi Dipendente
            </button>
          </div>
        </div>
        
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead className="bg-gray-50">
              <tr>
                <th className="p-3 font-semibold text-gray-600">Nome</th>
                <th className="p-3 font-semibold text-gray-600">Ruolo</th>
                <th className="p-3 font-semibold text-gray-600">Contratto</th>
                <th className="p-3 font-semibold text-gray-600">Scad. Visita Medica</th>
                <th className="p-3 font-semibold text-gray-600 text-center">Azioni</th>
              </tr>
            </thead>
            <tbody>
              {filteredEmployees.map(employee => (
                <tr key={employee.id} className="border-b hover:bg-gray-50">
                  <td className="p-3 font-medium text-gray-800">{employee.firstName} {employee.lastName}</td>
                  <td className="p-3 text-gray-600">{employee.role}</td>
                  <td className="p-3 text-gray-600">
                      {employee.contractType}
                      {employee.contractType === 'Tempo Determinato' && employee.endDate && (
                          <span className="block text-xs text-red-600">Scad. {new Date(employee.endDate).toLocaleDateString('it-IT')}</span>
                      )}
                  </td>
                  <td className="p-3 text-gray-600">{new Date(employee.medicalVisitExpiry).toLocaleDateString('it-IT')}</td>
                  <td className="p-3 text-center space-x-2">
                    <button onClick={() => handleOpenDetailModal(employee)} className="text-blue-600 hover:text-blue-800" title="Dettagli"><i className="fa-solid fa-eye"></i></button>
                    <button onClick={() => handleOpenModal(employee)} className="text-yellow-600 hover:text-yellow-800" title="Modifica"><i className="fa-solid fa-pencil"></i></button>
                    <button onClick={() => handleDeleteEmployee(employee.id)} className="text-red-600 hover:text-red-800" title="Elimina"><i className="fa-solid fa-trash"></i></button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {isModalOpen && (
        <EmployeeModal
          isOpen={isModalOpen}
          onClose={handleCloseModals}
          onSave={handleSaveEmployee}
          employee={selectedEmployee}
          isSaving={isSaving}
        />
      )}
      {isDetailModalOpen && selectedEmployee && (
        <EmployeeDetailModal
          isOpen={isDetailModalOpen}
          onClose={handleCloseModals}
          employee={selectedEmployee}
          sites={sites}
        />
      )}
      {isImportModalOpen && (
        <ImportModal
          isOpen={isImportModalOpen}
          onClose={handleCloseModals}
          onImport={handleImportEmployees}
          isImporting={isSaving}
        />
      )}
    </>
  );
};

export default EmployeeList;