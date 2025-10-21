
import React from 'react';
import { Employee, WorkSite } from '../../types';

interface EmployeeDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  employee: Employee;
  sites: WorkSite[];
}

const DetailItem: React.FC<{ label: string; value: React.ReactNode }> = ({ label, value }) => (
    <div>
        <p className="text-sm font-medium text-gray-500">{label}</p>
        <p className="text-md text-gray-800">{value || '-'}</p>
    </div>
);

const EmployeeDetailModal: React.FC<EmployeeDetailModalProps> = ({ isOpen, onClose, employee, sites }) => {
  if (!isOpen) return null;

  const employeeAssignments = sites
    .map(site => ({
      ...site,
      assignments: site.assignments.filter(a => a.employeeId === employee.id)
    }))
    .filter(site => site.assignments.length > 0);

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex justify-center items-center" onClick={onClose}>
      <div className="bg-white p-8 rounded-xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
        <div className="flex justify-between items-center mb-6 border-b pb-4">
            <div>
                <h2 className="text-3xl font-bold text-gray-800">{employee.firstName} {employee.lastName}</h2>
                <p className="text-lg text-gray-500">{employee.role}</p>
            </div>
            <button onClick={onClose} className="text-gray-500 hover:text-gray-800 text-2xl">&times;</button>
        </div>
        
        <div className="space-y-6">
            {/* Contact Info */}
            <div>
                <h3 className="text-xl font-semibold text-gray-700 mb-3">Informazioni di Contatto</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <DetailItem label="Email" value={employee.email} />
                    <DetailItem label="Telefono" value={employee.phone} />
                    <DetailItem label="Indirizzo" value={employee.address} />
                </div>
            </div>

            {/* Contract Info */}
            <div>
                <h3 className="text-xl font-semibold text-gray-700 mb-3">Informazioni Contrattuali</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <DetailItem label="Tipo Contratto" value={employee.contractType} />
                    <DetailItem label="Data Assunzione" value={new Date(employee.startDate).toLocaleDateString('it-IT')} />
                    {employee.contractType === 'Tempo Determinato' && (
                         <DetailItem label="Scadenza Contratto" value={employee.endDate ? new Date(employee.endDate).toLocaleDateString('it-IT') : '-'} />
                    )}
                    <DetailItem label="Scadenza Visita Medica" value={new Date(employee.medicalVisitExpiry).toLocaleDateString('it-IT')} />
                </div>
            </div>
            
            {/* Assignments */}
            <div>
                <h3 className="text-xl font-semibold text-gray-700 mb-3">Cantieri Assegnati</h3>
                {employeeAssignments.length > 0 ? (
                    <div className="space-y-3">
                        {employeeAssignments.map(site => (
                            <div key={site.id} className="p-3 bg-gray-50 rounded-lg border">
                                <p className="font-bold text-gray-800">{site.name}</p>
                                {site.assignments.map(ass => (
                                    <div key={ass.employeeId} className="text-sm text-gray-600 mt-1">
                                        <p>Orario: {ass.workingHours}</p>
                                        <p>Giorni: {ass.workingDays.join(', ')}</p>
                                    </div>
                                ))}
                            </div>
                        ))}
                    </div>
                ) : (
                    <p className="text-gray-500 italic">Nessun cantiere assegnato.</p>
                )}
            </div>

            {employee.notes && (
                <div>
                     <h3 className="text-xl font-semibold text-gray-700 mb-3">Note</h3>
                     <p className="text-md text-gray-800 bg-gray-50 p-3 rounded-lg border">{employee.notes}</p>
                </div>
            )}
        </div>
      </div>
    </div>
  );
};

export default EmployeeDetailModal;
