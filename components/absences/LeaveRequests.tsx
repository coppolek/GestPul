import React, { useState, useMemo } from 'react';
import { Employee, LeaveRequest, AbsenceStatus } from '../../types';
import LeaveRequestModal from '../modals/LeaveRequestModal';
import * as api from '../../services/api';

interface LeaveRequestsProps {
  employees: Employee[];
  leaveRequests: LeaveRequest[];
  setLeaveRequests: React.Dispatch<React.SetStateAction<LeaveRequest[]>>;
}

const LeaveRequests: React.FC<LeaveRequestsProps> = ({ employees, leaveRequests, setLeaveRequests }) => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const employeeMap = useMemo(() => new Map(employees.map(emp => [emp.id, `${emp.firstName} ${emp.lastName}`])), [employees]);

  const handleSaveRequest = async (requestData: Omit<LeaveRequest, 'id' | 'status'>) => {
    setIsSaving(true);
    try {
        const newRequest = await api.addData<Omit<LeaveRequest, 'id'>, LeaveRequest>('leaveRequests', {
            ...requestData,
            status: AbsenceStatus.IN_ATTESA,
        });
        setLeaveRequests(prev => [...prev, newRequest].sort((a,b) => new Date(b.startDate).getTime() - new Date(a.startDate).getTime()));
        setIsModalOpen(false);
    } catch (error) {
        console.error("Failed to save leave request", error);
        alert("Salvataggio richiesta fallito. Riprova.");
    } finally {
        setIsSaving(false);
    }
  };

  const handleStatusChange = async (requestId: string, newStatus: AbsenceStatus) => {
    const originalRequest = leaveRequests.find(r => r.id === requestId);
    if (!originalRequest) return;
    
    // Optimistic UI update
    setLeaveRequests(prev => prev.map(req => req.id === requestId ? { ...req, status: newStatus } : req));
    
    try {
        await api.updateData<LeaveRequest>('leaveRequests', requestId, { ...originalRequest, status: newStatus });
    } catch (error) {
        console.error("Failed to update status", error);
        alert("Aggiornamento stato fallito. Riprova.");
        // Revert on error
        setLeaveRequests(prev => prev.map(req => req.id === requestId ? originalRequest : req));
    }
  };
  
  const getStatusChip = (status: AbsenceStatus) => {
    const colors = {
      [AbsenceStatus.IN_ATTESA]: 'bg-yellow-100 text-yellow-800',
      [AbsenceStatus.APPROVATO]: 'bg-green-100 text-green-800',
      [AbsenceStatus.RIFIUTATO]: 'bg-red-100 text-red-800',
    };
    return <span className={`px-3 py-1 text-sm font-semibold rounded-full ${colors[status]}`}>{status}</span>;
  };

  return (
    <>
      <div className="bg-white p-6 rounded-xl shadow-lg">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-2xl font-bold text-gray-800">Richieste Ferie e Permessi</h2>
          <button onClick={() => setIsModalOpen(true)} className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors">
            <i className="fa-solid fa-plus mr-2"></i>Nuova Richiesta
          </button>
        </div>
        
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead className="bg-gray-50">
              <tr>
                <th className="p-3 font-semibold text-gray-600">Dipendente</th>
                <th className="p-3 font-semibold text-gray-600">Tipo</th>
                <th className="p-3 font-semibold text-gray-600">Periodo</th>
                <th className="p-3 font-semibold text-gray-600">Stato</th>
                <th className="p-3 font-semibold text-gray-600 text-center">Azioni</th>
              </tr>
            </thead>
            <tbody>
              {leaveRequests.map(request => (
                <tr key={request.id} className="border-b hover:bg-gray-50">
                  <td className="p-3 font-medium text-gray-800">{employeeMap.get(request.employeeId) || 'N/A'}</td>
                  <td className="p-3 text-gray-600">{request.type}</td>
                  <td className="p-3 text-gray-600">
                    {new Date(request.startDate).toLocaleDateString('it-IT')} - {new Date(request.endDate).toLocaleDateString('it-IT')}
                  </td>
                  <td className="p-3">{getStatusChip(request.status)}</td>
                  <td className="p-3 text-center space-x-2">
                    {request.status === AbsenceStatus.IN_ATTESA && (
                      <>
                        <button onClick={() => handleStatusChange(request.id, AbsenceStatus.APPROVATO)} className="text-green-600 hover:text-green-800" title="Approva"><i className="fa-solid fa-check-circle"></i></button>
                        <button onClick={() => handleStatusChange(request.id, AbsenceStatus.RIFIUTATO)} className="text-red-600 hover:text-red-800" title="Rifiuta"><i className="fa-solid fa-times-circle"></i></button>
                      </>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {isModalOpen && (
        <LeaveRequestModal
          isOpen={isModalOpen}
          onClose={() => setIsModalOpen(false)}
          onSave={handleSaveRequest}
          employees={employees}
          isSaving={isSaving}
        />
      )}
    </>
  );
};

export default LeaveRequests;