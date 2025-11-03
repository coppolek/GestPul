import React, { useState, useMemo } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { Employee, LeaveRequest, AbsenceStatus } from '../../types';
import LeaveRequestModal from '../modals/LeaveRequestModal';
import * as api from '../../services/api';

interface WorkerLeaveRequestsProps {
  employees: Employee[];
  leaveRequests: LeaveRequest[];
  setLeaveRequests: React.Dispatch<React.SetStateAction<LeaveRequest[]>>;
}

const WorkerLeaveRequests: React.FC<WorkerLeaveRequestsProps> = ({ employees, leaveRequests, setLeaveRequests }) => {
  const { user } = useAuth();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  const currentEmployeeId = useMemo(() => user?.employeeId, [user]);

  const myRequests = useMemo(() => {
    if (!currentEmployeeId) return [];
    return leaveRequests
      .filter(req => req.employeeId === currentEmployeeId)
      .sort((a, b) => new Date(b.startDate).getTime() - new Date(a.startDate).getTime());
  }, [leaveRequests, currentEmployeeId]);

  const handleOpenModal = () => {
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
  };

  const handleSaveRequest = async (requestData: Omit<LeaveRequest, 'id' | 'status'> & { id?: string }) => {
    if (!currentEmployeeId) return;
    setIsSaving(true);
    try {
      const newRequestData: Omit<LeaveRequest, 'id'> = {
        type: requestData.type,
        startDate: requestData.startDate,
        endDate: requestData.endDate,
        reason: requestData.reason,
        employeeId: currentEmployeeId,
        status: AbsenceStatus.IN_ATTESA,
      };
      const newRequest = await api.addData<Omit<LeaveRequest, 'id'>, LeaveRequest>('leaveRequests', newRequestData);
      setLeaveRequests(prev => [newRequest, ...prev].sort((a, b) => new Date(b.startDate).getTime() - new Date(a.startDate).getTime()));
      handleCloseModal();
    } catch (error) {
      console.error("Failed to save leave request", error);
      alert("Salvataggio richiesta fallito. Riprova.");
    } finally {
      setIsSaving(false);
    }
  };

  const handleDeleteRequest = async (requestId: string) => {
    if (window.confirm('Sei sicuro di voler annullare questa richiesta?')) {
      try {
        await api.deleteData('leaveRequests', requestId);
        setLeaveRequests(prev => prev.filter(r => r.id !== requestId));
      } catch (error) {
        console.error("Failed to delete leave request", error);
        alert("Annullamento fallito. Riprova.");
      }
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
      <div>
        <div className="flex justify-between items-center mb-6">
          <h3 className="text-xl font-bold text-gray-800">Le Tue Richieste di Ferie e Permessi</h3>
          <button onClick={handleOpenModal} className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors">
            <i className="fa-solid fa-plus mr-2"></i>Nuova Richiesta
          </button>
        </div>

        <div className="overflow-x-auto">
          {myRequests.length > 0 ? (
            <table className="w-full text-left">
              <thead className="bg-gray-50">
                <tr>
                  <th className="p-3 font-semibold text-gray-600">Tipo</th>
                  <th className="p-3 font-semibold text-gray-600">Periodo</th>
                  <th className="p-3 font-semibold text-gray-600">Stato</th>
                  <th className="p-3 font-semibold text-gray-600 text-center">Azioni</th>
                </tr>
              </thead>
              <tbody>
                {myRequests.map(request => (
                  <tr key={request.id} className="border-b hover:bg-gray-50">
                    <td className="p-3 text-gray-600">{request.type}</td>
                    <td className="p-3 text-gray-600">
                      {new Date(request.startDate).toLocaleDateString('it-IT')} - {new Date(request.endDate).toLocaleDateString('it-IT')}
                    </td>
                    <td className="p-3">{getStatusChip(request.status)}</td>
                    <td className="p-3 text-center">
                      {request.status === AbsenceStatus.IN_ATTESA ? (
                        <button onClick={() => handleDeleteRequest(request.id)} className="text-red-600 hover:text-red-800" title="Annulla Richiesta"><i className="fa-solid fa-trash"></i></button>
                      ) : (
                        <span>-</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <p className="text-center text-gray-500 italic py-4">Non hai ancora inviato richieste.</p>
          )}
        </div>
      </div>

      {isModalOpen && (
        <LeaveRequestModal
          isOpen={isModalOpen}
          onClose={handleCloseModal}
          onSave={handleSaveRequest}
          employees={employees}
          isSaving={isSaving}
          request={null}
          currentEmployeeId={currentEmployeeId}
        />
      )}
    </>
  );
};

export default WorkerLeaveRequests;
