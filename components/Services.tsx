import React, { useState, useMemo } from 'react';
import { WorkSite, Employee, SiteAssignment } from '../types';
import * as api from '../services/api';
import ServiceAssignmentModal from './modals/ServiceAssignmentModal';
import ServiceImportModal from './modals/ServiceImportModal';
import SiteModal from './modals/SiteModal';

interface ServicesProps {
  sites: WorkSite[];
  setSites: React.Dispatch<React.SetStateAction<WorkSite[]>>;
  employees: Employee[];
}

const Services: React.FC<ServicesProps> = ({ sites, setSites, employees }) => {
    const [isAssignmentModalOpen, setIsAssignmentModalOpen] = useState(false);
    const [isImportModalOpen, setIsImportModalOpen] = useState(false);
    const [isSiteModalOpen, setIsSiteModalOpen] = useState(false);
    const [selectedContext, setSelectedContext] = useState<{ site: WorkSite; assignment?: SiteAssignment } | null>(null);
    const [isSaving, setIsSaving] = useState(false);
    const [isSiteSaving, setIsSiteSaving] = useState(false);

    const employeeMap = useMemo(() => new Map(employees.map(emp => [emp.id, `${emp.firstName} ${emp.lastName}`])), [employees]);

    const handleOpenAssignmentModal = (site: WorkSite, assignment?: SiteAssignment) => {
        setSelectedContext({ site, assignment });
        setIsAssignmentModalOpen(true);
    };

    const handleCloseModals = () => {
        setIsAssignmentModalOpen(false);
        setIsImportModalOpen(false);
        setIsSiteModalOpen(false);
        setSelectedContext(null);
    };

    const handleSaveAssignment = async (data: { employeeId: string; workingHours: string; workingDays: string[] }) => {
        if (!selectedContext) return;
        setIsSaving(true);
        const { site, assignment } = selectedContext;
        
        let updatedAssignments: SiteAssignment[];

        if (assignment) { // Editing existing assignment
            updatedAssignments = site.assignments.map(a =>
                a.employeeId === assignment.employeeId ? { ...a, ...data } : a
            );
        } else { // Adding new assignment
            if (site.assignments.some(a => a.employeeId === data.employeeId)) {
                alert("Questo dipendente è già assegnato a questo cantiere.");
                setIsSaving(false);
                return;
            }
            updatedAssignments = [...site.assignments, data];
        }

        const updatedSite = { ...site, assignments: updatedAssignments };

        try {
            await api.updateData('sites', site.id, updatedSite);
            setSites(prevSites => prevSites.map(s => s.id === site.id ? updatedSite : s));
            handleCloseModals();
        } catch (error) {
            console.error("Failed to save assignment", error);
            alert("Salvataggio fallito.");
        } finally {
            setIsSaving(false);
        }
    };

    const handleRemoveAssignment = async (siteId: string, employeeId: string) => {
        const site = sites.find(s => s.id === siteId);
        if (!site) return;

        if (window.confirm('Sei sicuro di voler rimuovere questo servizio?')) {
            const updatedAssignments = site.assignments.filter(a => a.employeeId !== employeeId);
            const updatedSite = { ...site, assignments: updatedAssignments };
            
            try {
                await api.updateData('sites', site.id, updatedSite);
                setSites(prevSites => prevSites.map(s => s.id === site.id ? updatedSite : s));
            } catch (error) {
                console.error("Failed to remove assignment", error);
                alert("Rimozione fallita.");
            }
        }
    };

    const handleImportServices = async (services: { siteName: string; employeeName: string; workingHours: string; workingDays: string[] }[]) => {
        setIsSaving(true);
        try {
            const employeeNameMap = new Map(employees.map(e => [`${e.lastName} ${e.firstName}`.toLowerCase(), e.id]));
            // FIX: Explicitly type the Map to prevent type inference issues.
            const siteNameMap = new Map<string, WorkSite>(sites.map(s => [s.name.toLowerCase(), s]));

            const updatedSitesMap = new Map<string, WorkSite>();

            for (const service of services) {
                const site = siteNameMap.get(service.siteName.toLowerCase());
                const employeeId = employeeNameMap.get(service.employeeName.toLowerCase());

                if (site && employeeId) {
                    const currentSiteState = updatedSitesMap.get(site.id) || site;
                    
                    if (!currentSiteState.assignments.some(a => a.employeeId === employeeId)) {
                        const newAssignment: SiteAssignment = {
                            employeeId: employeeId,
                            workingHours: service.workingHours,
                            workingDays: service.workingDays,
                        };
                        const updatedAssignments = [...currentSiteState.assignments, newAssignment];
                        updatedSitesMap.set(site.id, { ...currentSiteState, assignments: updatedAssignments });
                    }
                }
            }
            
            const sitesToUpdate = Array.from(updatedSitesMap.values());
            if (sitesToUpdate.length > 0) {
                // FIX: Explicitly provide the generic type to `api.updateData` to ensure `updatedSitesResults` is correctly typed as `WorkSite[]`.
                const updatedSitesResults = await Promise.all(sitesToUpdate.map(site => api.updateData<WorkSite>('sites', site.id, site)));
                
                setSites(prevSites => {
                    const newSites = [...prevSites];
                    updatedSitesResults.forEach(updatedSite => {
                        const index = newSites.findIndex(s => s.id === updatedSite.id);
                        if (index !== -1) {
                            newSites[index] = updatedSite;
                        }
                    });
                    return newSites;
                });
            }

            handleCloseModals();
        } catch (error) {
            console.error("Failed to import services", error);
            alert("Importazione fallita. Controlla i dati nel file.");
        } finally {
            setIsSaving(false);
        }
    };
    
    const handleSaveSite = async (siteData: Omit<WorkSite, 'id'> & { id?: string }) => {
        setIsSiteSaving(true);
        try {
            const newSite = await api.addData<Omit<WorkSite, 'id'>, WorkSite>('sites', siteData);
            setSites(prev => [...prev, newSite].sort((a,b) => a.name.localeCompare(b.name)));
            setIsSiteModalOpen(false);
        } catch (error) {
            console.error("Failed to save site", error);
            alert("Salvataggio fallito. Riprova.");
        } finally {
            setIsSiteSaving(false);
        }
    };


    return (
        <>
            <div className="flex justify-between items-center mb-6 flex-wrap gap-4">
                <h2 className="text-2xl font-bold text-gray-800">Gestione Servizi per Cantiere</h2>
                <div className="flex gap-2">
                    <button 
                        onClick={() => setIsImportModalOpen(true)} 
                        className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
                    >
                        <i className="fa-solid fa-file-import mr-2"></i>Importa Servizi
                    </button>
                    <button
                        onClick={() => setIsSiteModalOpen(true)}
                        className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                    >
                        <i className="fa-solid fa-plus mr-2"></i>Aggiungi Cantiere
                    </button>
                </div>
            </div>

            <div className="space-y-8">
                {sites.filter(s => s.status === 'In Corso').sort((a,b) => a.name.localeCompare(b.name)).map(site => (
                    <div key={site.id} className="bg-white p-6 rounded-xl shadow-lg">
                        <div className="flex justify-between items-center mb-4 border-b pb-3">
                            <div>
                                <h3 className="text-xl font-bold text-gray-800">{site.name}</h3>
                                <p className="text-sm text-gray-500">{site.address}</p>
                            </div>
                            <button
                                onClick={() => handleOpenAssignmentModal(site)}
                                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm"
                            >
                                <i className="fa-solid fa-plus mr-2"></i>Aggiungi Servizio
                            </button>
                        </div>
                        
                        {site.assignments.length > 0 ? (
                            <div className="overflow-x-auto">
                                <table className="w-full text-left">
                                    <thead className="bg-gray-50 text-xs text-gray-600 uppercase">
                                        <tr>
                                            <th className="p-2 font-semibold">Dipendente</th>
                                            <th className="p-2 font-semibold">Orario</th>
                                            <th className="p-2 font-semibold">Giorni</th>
                                            <th className="p-2 font-semibold text-center">Azioni</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {site.assignments.map(assignment => (
                                            <tr key={assignment.employeeId} className="border-b hover:bg-gray-50">
                                                <td className="p-2 font-medium text-gray-800">{employeeMap.get(assignment.employeeId) || 'N/A'}</td>
                                                <td className="p-2 text-gray-600">{assignment.workingHours}</td>
                                                <td className="p-2 text-gray-600">{assignment.workingDays.join(', ')}</td>
                                                <td className="p-2 text-center space-x-3">
                                                    <button onClick={() => handleOpenAssignmentModal(site, assignment)} className="text-yellow-600 hover:text-yellow-800" title="Modifica"><i className="fa-solid fa-pencil"></i></button>
                                                    <button onClick={() => handleRemoveAssignment(site.id, assignment.employeeId)} className="text-red-600 hover:text-red-800" title="Rimuovi"><i className="fa-solid fa-trash"></i></button>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        ) : (
                            <p className="text-center text-gray-500 py-4 italic">Nessun servizio assegnato a questo cantiere.</p>
                        )}
                    </div>
                ))}
            </div>

            {isAssignmentModalOpen && selectedContext && (
                <ServiceAssignmentModal
                    isOpen={isAssignmentModalOpen}
                    onClose={handleCloseModals}
                    onSave={handleSaveAssignment}
                    isSaving={isSaving}
                    site={selectedContext.site}
                    assignment={selectedContext.assignment}
                    employees={employees}
                />
            )}
            {isImportModalOpen && (
                <ServiceImportModal
                    isOpen={isImportModalOpen}
                    onClose={handleCloseModals}
                    onImport={handleImportServices}
                    isImporting={isSaving}
                    sites={sites}
                    employees={employees}
                />
            )}
            {isSiteModalOpen && (
                <SiteModal
                    isOpen={isSiteModalOpen}
                    onClose={handleCloseModals}
                    onSave={handleSaveSite}
                    site={null}
                    employees={employees}
                    isSaving={isSiteSaving}
                />
            )}
        </>
    );
};

export default Services;
