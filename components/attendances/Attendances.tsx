import React, { useState, useMemo } from 'react';
import { Employee, AttendanceRecord } from '../../types';
import AttendanceModal from '../modals/AttendanceModal';
import * as api from '../../services/api';

interface AttendancesProps {
  employees: Employee[];
  attendances: AttendanceRecord[];
  setAttendances: React.Dispatch<React.SetStateAction<AttendanceRecord[]>>;
}

const Attendances: React.FC<AttendancesProps> = ({ employees, attendances, setAttendances }) => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [filters, setFilters] = useState({ employeeId: '', date: '' });
  
  const employeeMap = useMemo(() => new Map(employees.map(emp => [emp.id, `${emp.firstName} ${emp.lastName}`])), [employees]);

  const handleSaveAttendance = async (data: Omit<AttendanceRecord, 'id'>) => {
    setIsSaving(true);
    try {
      const newRecord = await api.addData<Omit<AttendanceRecord, 'id'>, AttendanceRecord>('attendances', data);
      setAttendances(prev => [newRecord, ...prev].sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()));
      setIsModalOpen(false);
    } catch (error) {
      console.error("Failed to save attendance record", error);
      alert("Salvataggio fallito. Riprova.");
    } finally {
      setIsSaving(false);
    }
  };

  const handleDeleteAttendance = async (recordId: string) => {
    if (window.confirm('Sei sicuro di voler eliminare questa timbratura?')) {
      try {
        await api.deleteData('attendances', recordId);
        setAttendances(prev => prev.filter(att => att.id !== recordId));
      } catch (error) {
        console.error("Failed to delete attendance", error);
        alert("Eliminazione fallita. Riprova.");
      }
    }
  };

  const handleFilterChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFilters(prev => ({...prev, [name]: value}));
  };
  
  const filteredAttendances = useMemo(() => {
    return attendances.filter(att => {
        const byEmployee = !filters.employeeId || att.employeeId === filters.employeeId;
        const byDate = !filters.date || att.timestamp.startsWith(filters.date);
        return byEmployee && byDate;
    });
  }, [attendances, filters]);

  return (
    <>
      <div className="bg-white p-6 rounded-xl shadow-lg">
        <div className="flex justify-between items-center mb-6 gap-4 flex-wrap">
          <h2 className="text-2xl font-bold text-gray-800">Elenco Timbrature</h2>
          <div className="flex gap-2">
            <button onClick={() => setIsModalOpen(true)} className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors">
              <i className="fa-solid fa-plus mr-2"></i>Aggiungi Timbratura
            </button>
          </div>
        </div>

        {/* Filters */}
        <div className="flex flex-wrap gap-4 mb-6 p-4 bg-gray-50 rounded-lg">
            <div className="flex-grow">
                <label htmlFor="employeeId" className="block text-sm font-medium text-gray-700 mb-1">Filtra per Dipendente</label>
                <select id="employeeId" name="employeeId" value={filters.employeeId} onChange={handleFilterChange} className="w-full p-2 border border-gray-300 rounded-lg bg-white">
                    <option value="">Tutti i dipendenti</option>
                    {employees.map(emp => (
                        <option key={emp.id} value={emp.id}>{emp.firstName} {emp.lastName}</option>
                    ))}
                </select>
            </div>
             <div className="flex-grow">
                <label htmlFor="date" className="block text-sm font-medium text-gray-700 mb-1">Filtra per Data</label>
                <input type="date" id="date" name="date" value={filters.date} onChange={handleFilterChange} className="w-full p-2 border border-gray-300 rounded-lg" />
            </div>
        </div>
        
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead className="bg-gray-50">
              <tr>
                <th className="p-3 font-semibold text-gray-600">Dipendente</th>
                <th className="p-3 font-semibold text-gray-600">Data</th>
                <th className="p-3 font-semibold text-gray-600">Ora</th>
                <th className="p-3 font-semibold text-gray-600">Tipo</th>
                <th className="p-3 font-semibold text-gray-600">Note</th>
                <th className="p-3 font-semibold text-gray-600 text-center">Azioni</th>
              </tr>
            </thead>
            <tbody>
              {filteredAttendances.map(record => {
                const recordDate = new Date(record.timestamp);
                return (
                    <tr key={record.id} className="border-b hover:bg-gray-50">
                    <td className="p-3 font-medium text-gray-800">{employeeMap.get(record.employeeId) || 'N/A'}</td>
                    <td className="p-3 text-gray-600">{recordDate.toLocaleDateString('it-IT')}</td>
                    <td className="p-3 text-gray-600">{recordDate.toLocaleTimeString('it-IT', { hour: '2-digit', minute: '2-digit' })}</td>
                    <td className="p-3 text-gray-600">
                        <span className={`px-2 py-1 text-xs font-semibold rounded-full ${record.type === 'Entrata' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                            {record.type}
                        </span>
                    </td>
                    <td className="p-3 text-gray-600">{record.notes}</td>
                    <td className="p-3 text-center">
                        <button onClick={() => handleDeleteAttendance(record.id)} className="text-red-600 hover:text-red-800" title="Elimina"><i className="fa-solid fa-trash"></i></button>
                    </td>
                    </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </div>

      {isModalOpen && (
        <AttendanceModal
          isOpen={isModalOpen}
          onClose={() => setIsModalOpen(false)}
          onSave={handleSaveAttendance}
          employees={employees}
          isSaving={isSaving}
        />
      )}
    </>
  );
};

export default Attendances;