import React, { useState, useMemo } from 'react';
import { Employee, SicknessRecord } from '../../types';
import SicknessModal from '../modals/SicknessModal';
import * as api from '../../services/api';

interface SicknessProps {
  employees: Employee[];
  sicknessRecords: SicknessRecord[];
  setSicknessRecords: React.Dispatch<React.SetStateAction<SicknessRecord[]>>;
}

const Sickness: React.FC<SicknessProps> = ({ employees, sicknessRecords, setSicknessRecords }) => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const employeeMap = useMemo(() => new Map(employees.map(emp => [emp.id, `${emp.firstName} ${emp.lastName}`])), [employees]);

  const handleSaveRecord = async (recordData: Omit<SicknessRecord, 'id'>) => {
    setIsSaving(true);
    try {
        const newRecord = await api.addData<Omit<SicknessRecord, 'id'>, SicknessRecord>('sicknessRecords', recordData);
        setSicknessRecords(prev => [...prev, newRecord].sort((a,b) => new Date(b.startDate).getTime() - new Date(a.startDate).getTime()));
        setIsModalOpen(false);
    } catch (error) {
        console.error("Failed to save sickness record", error);
        alert("Salvataggio registrazione fallito. Riprova.");
    } finally {
        setIsSaving(false);
    }
  };
  
  const handleDeleteRecord = async (recordId: string) => {
      if (window.confirm('Sei sicuro di voler eliminare questa registrazione di malattia?')) {
          try {
              await api.deleteData('sicknessRecords', recordId);
              setSicknessRecords(prev => prev.filter(r => r.id !== recordId));
          } catch(error) {
              console.error("Failed to delete sickness record", error);
              alert("Eliminazione fallita. Riprova.");
          }
      }
  };

  return (
    <>
      <div className="bg-white p-6 rounded-xl shadow-lg">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-2xl font-bold text-gray-800">Registrazione Malattie</h2>
          <button onClick={() => setIsModalOpen(true)} className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors">
            <i className="fa-solid fa-plus mr-2"></i>Nuova Segnalazione
          </button>
        </div>
        
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead className="bg-gray-50">
              <tr>
                <th className="p-3 font-semibold text-gray-600">Dipendente</th>
                <th className="p-3 font-semibold text-gray-600">Periodo</th>
                <th className="p-3 font-semibold text-gray-600">Note</th>
                <th className="p-3 font-semibold text-gray-600 text-center">Azioni</th>
              </tr>
            </thead>
            <tbody>
              {sicknessRecords.map(record => (
                <tr key={record.id} className="border-b hover:bg-gray-50">
                  <td className="p-3 font-medium text-gray-800">{employeeMap.get(record.employeeId) || 'N/A'}</td>
                  <td className="p-3 text-gray-600">
                    {new Date(record.startDate).toLocaleDateString('it-IT')} - {new Date(record.endDate).toLocaleDateString('it-IT')}
                  </td>
                  <td className="p-3 text-gray-600">{record.notes}</td>
                  <td className="p-3 text-center">
                    <button onClick={() => handleDeleteRecord(record.id)} className="text-red-600 hover:text-red-800" title="Elimina"><i className="fa-solid fa-trash"></i></button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {isModalOpen && (
        <SicknessModal
          isOpen={isModalOpen}
          onClose={() => setIsModalOpen(false)}
          onSave={handleSaveRecord}
          employees={employees}
          isSaving={isSaving}
        />
      )}
    </>
  );
};
export default Sickness;