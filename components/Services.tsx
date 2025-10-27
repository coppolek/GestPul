

import React, { useState, useMemo } from 'react';
import { WorkSite, Employee, SiteAssignment } from '../types';
import ServiceAssignmentModal from './modals/ServiceAssignmentModal';
import ServiceImportModal from './modals/ServiceImportModal';
import * as api from '../services/api';

interface ServicesProps {
  sites: WorkSite[];
  setSites: React.Dispatch<React.SetStateAction<WorkSite[]>>;
  employees: Employee[];
}

const Services: React.FC<ServicesProps> = ({ sites, setSites, employees }) => {
    const [isAssignmentModalOpen, setIsAssignmentModalOpen] = useState(false);
    const [isImportModalOpen, setIsImportModalOpen] = useState(false);
    const [selectedSite, setSelectedSite] = useState<WorkSite | null>(null);
    const [selectedAssignment, setSelectedAssignment] = useState<SiteAssignment | null>(null);
    const [isSaving, setIsSaving] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');

    const employeeMap = useMemo(() => new Map(employees.map(emp => [emp.id, `${emp.firstName} ${emp.lastName}`])), [employees]);

    const handleOpenAssignmentModal = (site: WorkSite, assignment: SiteAssignment | null = null) => {
        setSelectedSite(site);
        setSelectedAssignment(assignment);
        setIsAssignmentModalOpen(true);
    };

    const handleCloseModals = () => {
        setIsAssignmentModalOpen(false);
        setIsImportModalOpen(false);
        setSelectedSite(null);
        setSelectedAssignment(null);
    };

    const handleSaveAssignment = async (data: { employeeId: string; workingHours: string; workingDays:string[] }) => {
        if (!selectedSite) return;
        setIsSaving(true);
        try {
            let updatedAssignments: SiteAssignment[];
            if (selectedAssignment) { // Editing
                updatedAssignments = selectedSite.assignments.map(a =>
                    a.employeeId === selectedAssignment.employeeId ? { ...a, ...data } : a
                );
            } else { // Adding
                updatedAssignments = [...selectedSite.assignments, data];
            }
            const updatedSite = { ...selectedSite, assignments: updatedAssignments };
            // FIX: Add generic type for consistency and better type inference.
            await api.updateData<WorkSite>('sites', selectedSite.id, updatedSite);
            setSites(prev => prev.map(s => s.id === updatedSite.id ? updatedSite : s));
            handleCloseModals();
        } catch (error) {
            console.error("Failed to save assignment", error);
            alert("Salvataggio fallito.");
        } finally {
            setIsSaving(false);
        }
    };

    const handleDeleteAssignment = async (siteId: string, employeeId: string) => {
        if (window.confirm('Sei sicuro di voler rimuovere questo servizio?')) {
            const site = sites.find(s => s.id === siteId);
            if (!site) return;
            try {
                const updatedAssignments = site.assignments.filter(a => a.employeeId !== employeeId);
                const updatedSite = { ...site, assignments: updatedAssignments };
                // FIX: Add generic type for consistency and better type inference.
                await api.updateData<WorkSite>('sites', site.id, updatedSite);
                setSites(prev => prev.map(s => s.id === updatedSite.id ? updatedSite : s));
            } catch (error) {
                console.error("Failed to delete assignment", error);
                alert("Eliminazione fallita.");
            }
        }
    };

    const handleImportServices = async (services: { siteName: string; employeeName: string; workingHours: string; workingDays: string[] }[]) => {
        setIsSaving(true);
        try {
            const siteNameMap = new Map(sites.map(s => [s.name.trim().toLowerCase(), s]));
            const employeeNameMap = new Map<string, Employee>();
            employees.forEach(e => {
                const fullName = `${e.firstName} ${e.lastName}`.trim().toLowerCase().replace(/\s+/g, ' ');
                const reverseFullName = `${e.lastName} ${e.firstName}`.trim().toLowerCase().replace(/\s+/g, ' ');
                employeeNameMap.set(fullName, e);
                if (fullName !== reverseFullName) {
                    employeeNameMap.set(reverseFullName, e);
                }
            });

            const assignmentsBySite = new Map<string, SiteAssignment[]>();
            const employeesToUpdateBySite = new Map<string, Set<string>>();

            for (const service of services) {
                const site = siteNameMap.get(service.siteName.trim().toLowerCase());
                const employee = employeeNameMap.get(service.employeeName.trim().toLowerCase().replace(/\s+/g, ' '));

                if (site && employee) {
                    if (!assignmentsBySite.has(site.id)) {
                        assignmentsBySite.set(site.id, []);
                    }
                    if (!employeesToUpdateBySite.has(site.id)) {
                        employeesToUpdateBySite.set(site.id, new Set());
                    }
                    assignmentsBySite.get(site.id)!.push({
                        employeeId: employee.id,
                        workingHours: service.workingHours,
                        workingDays: service.workingDays,
                    });
                    employeesToUpdateBySite.get(site.id)!.add(employee.id);
                }
            }

            if (assignmentsBySite.size === 0) {
                 alert("Nessun servizio valido da importare. Controlla che i nomi dei cantieri e dei dipendenti nel file corrispondano a quelli nel sistema.");
                 setIsSaving(false);
                 handleCloseModals();
                 return;
            }

            const sitesToUpdatePayload: WorkSite[] = [];

            for (const [siteId, newAssignments] of assignmentsBySite.entries()) {
                const originalSite = sites.find(s => s.id === siteId)!;
                const employeesForThisSite = employeesToUpdateBySite.get(siteId)!;

                const existingAssignmentsToKeep = originalSite.assignments.filter(a => !employeesForThisSite.has(a.employeeId));
                
                const updatedSite = {
                    ...originalSite,
                    assignments: [...existingAssignmentsToKeep, ...newAssignments],
                };
                sitesToUpdatePayload.push(updatedSite);
            }
            // FIX: Explicitly providing the generic type to `api.updateData` to help TypeScript infer the correct return type for Promise.all.
            const updatePromises = sitesToUpdatePayload.map(site => api.updateData<WorkSite>('sites', site.id, site));
            // FIX: Explicitly type the result of Promise.all to prevent type inference issues where the result could be treated as `unknown[]`.
            const updatedSitesFromApi: WorkSite[] = await Promise.all(updatePromises);
            
            setSites(prev => {
                const updatedSiteMap = new Map(updatedSitesFromApi.map(s => [s.id, s]));
                return prev.map(s => updatedSiteMap.get(s.id) || s);
            });

            alert(`Importazione completata. ${updatedSitesFromApi.length} cantieri sono stati aggiornati.`);
            handleCloseModals();
        } catch (error) {
            console.error("Failed to import services", error);
            alert("Importazione fallita. Si è verificato un errore imprevisto.");
        } finally {
            setIsSaving(false);
        }
    };

    const filteredSites = useMemo(() => {
        if (!searchTerm) return sites;
        const lowercasedFilter = searchTerm.toLowerCase();
        return sites.filter(site =>
            site.name.toLowerCase().includes(lowercasedFilter) ||
            site.assignments.some(a => (employeeMap.get(a.employeeId) || '').toLowerCase().includes(lowercasedFilter))
        );
    }, [sites, searchTerm, employeeMap]);

    return (
        <>
            <div className="bg-white p-6 rounded-xl shadow-lg">
                <div className="flex justify-between items-center mb-6 gap-4 flex-wrap">
                    <h2 className="text-2xl font-bold text-gray-800">Gestione Servizi per Cantiere</h2>
                    <div className="flex-grow max-w-md">
                        <input 
                            type="text"
                            placeholder="Cerca per cantiere o dipendente..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="w-full p-2 border border-gray-300 rounded-lg"
                        />
                    </div>
                    <button onClick={() => setIsImportModalOpen(true)} className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors">
                        <i className="fa-solid fa-file-import mr-2"></i>Importa Servizi
                    </button>
                </div>

                <div className="space-y-6">
                    {filteredSites.map(site => (
                        <div key={site.id} className="p-4 border rounded-lg bg-gray-50">
                            <div className="flex justify-between items-center mb-3">
                                <h3 className="text-xl font-bold text-gray-800">{site.name}</h3>
                                <button onClick={() => handleOpenAssignmentModal(site)} className="px-3 py-1 bg-blue-100 text-blue-700 text-sm font-semibold rounded-md hover:bg-blue-200">
                                    <i className="fa-solid fa-plus mr-2"></i>Aggiungi Servizio
                                </button>
                            </div>
                            
                            {site.assignments.length > 0 ? (
                                <div className="overflow-x-auto">
                                <table className="w-full text-left text-sm">
                                    <thead className="bg-gray-100">
                                        <tr>
                                            <th className="p-2 font-semibold text-gray-600">Dipendente</th>
                                            <th className="p-2 font-semibold text-gray-600">Orario</th>
                                            <th className="p-2 font-semibold text-gray-600">Giorni</th>
                                            <th className="p-2 font-semibold text-gray-600 text-center">Azioni</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                    {site.assignments.map(assignment => (
                                        <tr key={assignment.employeeId} className="border-t">
                                            <td className="p-2 font-medium">{employeeMap.get(assignment.employeeId) || 'N/A'}</td>
                                            <td className="p-2">{assignment.workingHours}</td>
                                            <td className="p-2">{assignment.workingDays.join(', ')}</td>
                                            <td className="p-2 text-center space-x-3">
                                                <button onClick={() => handleOpenAssignmentModal(site, assignment)} className="text-yellow-600 hover:text-yellow-800" title="Modifica"><i className="fa-solid fa-pencil"></i></button>
                                                <button onClick={() => handleDeleteAssignment(site.id, assignment.employeeId)} className="text-red-600 hover:text-red-800" title="Elimina"><i className="fa-solid fa-trash"></i></button>
                                            </td>
                                        </tr>
                                    ))}
                                    </tbody>
                                </table>
                                </div>
                            ) : (
                                <p className="text-center text-gray-500 italic py-4">Nessun servizio assegnato a questo cantiere.</p>
                            )}
                        </div>
                    ))}
                </div>
            </div>

            {isAssignmentModalOpen && selectedSite && (
                <ServiceAssignmentModal
                    isOpen={isAssignmentModalOpen}
                    onClose={handleCloseModals}
                    onSave={handleSaveAssignment}
                    isSaving={isSaving}
                    site={selectedSite}
                    assignment={selectedAssignment || undefined}
                    employees={employees}
                />
            )}
            
            {isImportModalOpen && (
                <ServiceImportModal
                    isOpen={isImportModalOpen}
                    onClose={handleCloseModals}
                    onImport={handleImportServices}
                    isImporting={isSaving}
                />
            )}
        </>
    );
};

export default Services;
