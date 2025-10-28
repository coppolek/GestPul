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
  const [selectedRequest, setSelectedRequest] = useState<LeaveRequest | null>(null);
  const employeeMap = useMemo(() => new Map(employees.map(emp => [emp.id, `${emp.firstName} ${emp.lastName}`])), [employees]);

  const handleOpenModal = (request: LeaveRequest | null = null) => {
    setSelectedRequest(request);
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setSelectedRequest(null);
    setIsModalOpen(false);
  };

  const handleSaveRequest = async (requestData: Omit<LeaveRequest, 'id' | 'status'> & { id?: string }) => {
    setIsSaving(true);
    try {
        if (requestData.id) {
            // Edit
            const originalRequest = leaveRequests.find(r => r.id === requestData.id);
            if (!originalRequest) throw new Error("Request not found");

            const updatedRequestData = {
                ...originalRequest,
                ...requestData,
            };
            
            const updatedRequest = await api.updateData<LeaveRequest>('leaveRequests', requestData.id, updatedRequestData);
            setLeaveRequests(prev => prev.map(r => r.id === updatedRequest.id ? updatedRequest : r));
        } else {
            // Add
            const newRequest = await api.addData<Omit<LeaveRequest, 'id'>, LeaveRequest>('leaveRequests', {
                ...requestData,
                status: AbsenceStatus.IN_ATTESA,
            });
            setLeaveRequests(prev => [...prev, newRequest].sort((a,b) => new Date(b.startDate).getTime() - new Date(a.startDate).getTime()));
        }
        handleCloseModal();
    } catch (error) {
        console.error("Failed to save leave request", error);
        alert("Salvataggio richiesta fallito. Riprova.");
    } finally {
        setIsSaving(false);
    }
  };

  const handleDeleteRequest = async (requestId: string) => {
    if (window.confirm('Sei sicuro di voler eliminare questa richiesta?')) {
        try {
            await api.deleteData('leaveRequests', requestId);
            setLeaveRequests(prev => prev.filter(r => r.id !== requestId));
        } catch (error) {
            console.error("Failed to delete leave request", error);
            alert("Eliminazione fallita. Riprova.");
        }
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
          <button onClick={() => handleOpenModal()} className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors">
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
                    <button onClick={() => handleOpenModal(request)} className="text-yellow-600 hover:text-yellow-800" title="Modifica"><i className="fa-solid fa-pencil"></i></button>
                    <button onClick={() => handleDeleteRequest(request.id)} className="text-red-600 hover:text-red-800" title="Elimina"><i className="fa-solid fa-trash"></i></button>
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
          onClose={handleCloseModal}
          onSave={handleSaveRequest}
          employees={employees}
          isSaving={isSaving}
          request={selectedRequest}
        />
      )}
    </>
  );
};

export default LeaveRequests;