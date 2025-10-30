
import React, { useState, useMemo } from 'react';
import { WorkSite, Employee, SiteAssignment } from '../types';
import ServiceAssignmentModal from './modals/ServiceAssignmentModal';
import ServiceImportModal from './modals/ServiceImportModal';
import SiteModal from './modals/SiteModal'; // For adding a new site
import * as api from '../services/api';

interface ServicesProps {
  sites: WorkSite[];
  setSites: React.Dispatch<React.SetStateAction<WorkSite[]>>;
  employees: Employee[];
}

const Services: React.FC<ServicesProps> = ({ sites, setSites, employees }) => {
    const [isAssignmentModalOpen, setIsAssignmentModalOpen] = useState(false);
    const [isSiteModalOpen, setIsSiteModalOpen] = useState(false);
    const [isImportModalOpen, setIsImportModalOpen] = useState(false);
    const [selectedSite, setSelectedSite] = useState<WorkSite | null>(null);
    const [selectedAssignment, setSelectedAssignment] = useState<SiteAssignment | null>(null);
    const [isSaving, setIsSaving] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');
    const [importResult, setImportResult] = useState<{ success: number, skipped: string[] } | null>(null);

    const employeeMap = useMemo(() => new Map(employees.map(emp => [emp.id, `${emp.firstName} ${emp.lastName}`])), [employees]);

    const handleOpenAssignmentModal = (site: WorkSite, assignment: SiteAssignment | null = null) => {
        setSelectedSite(site);
        setSelectedAssignment(assignment);
        setIsAssignmentModalOpen(true);
    };

    const handleCloseModals = () => {
        setIsAssignmentModalOpen(false);
        setIsImportModalOpen(false);
        setIsSiteModalOpen(false);
        setSelectedSite(null);
        setSelectedAssignment(null);
        setImportResult(null);
    };

    const handleSaveSite = async (siteData: Omit<WorkSite, 'id'> & { id?: string }) => {
      setIsSaving(true);
      try {
        if (siteData.id) {
          // This should not happen from here, but as a safeguard
          const updatedSite = await api.updateData<WorkSite>('sites', siteData.id, siteData as WorkSite);
          setSites(prev => prev.map(s => s.id === updatedSite.id ? updatedSite : s));
        } else {
          // Add
          const newSite = await api.addData<Omit<WorkSite, 'id'>, WorkSite>('sites', siteData);
          setSites(prev => [...prev, newSite]);
        }
        handleCloseModals();
      } catch (error) {
        console.error("Failed to save site", error);
        alert("Salvataggio fallito.");
      } finally {
        setIsSaving(false);
      }
    };
    
    const handleSaveAssignment = async (data: { employeeId: string; workingHours: string; workingDays:string[] }) => {
        if (!selectedSite) return;
        setIsSaving(true);
        try {
            let updatedAssignments: SiteAssignment[];
            if (selectedAssignment) { // Editing
                updatedAssignments = selectedSite.assignments.map(a =>
                    a.id === selectedAssignment.id ? { ...selectedAssignment, ...data } : a
                );
            } else { // Adding
                const newAssignment: SiteAssignment = {
                    id: `asg-${Date.now()}`,
                    ...data
                };
                updatedAssignments = [...selectedSite.assignments, newAssignment];
            }
            const updatedSite = { ...selectedSite, assignments: updatedAssignments };
            // FIX: Explicitly cast the result of the awaited API call to ensure type safety.
            const savedSite = await api.updateData<WorkSite>('sites', selectedSite.id, updatedSite);
            setSites(prev => prev.map(s => s.id === savedSite.id ? savedSite : s));
            handleCloseModals();
        } catch (error) {
            console.error("Failed to save assignment", error);
            alert("Salvataggio fallito.");
        } finally {
            setIsSaving(false);
        }
    };

    const handleDeleteAssignment = async (siteId: string, assignmentId: string) => {
        if (window.confirm('Sei sicuro di voler rimuovere questo servizio?')) {
            const site = sites.find(s => s.id === siteId);
            if (!site) return;
            try {
                const updatedAssignments = site.assignments.filter(a => a.id !== assignmentId);
                const updatedSite = { ...site, assignments: updatedAssignments };
                // FIX: Explicitly cast the result of the awaited API call to ensure type safety.
                const savedSite = await api.updateData<WorkSite>('sites', site.id, updatedSite);
                setSites(prev => prev.map(s => s.id === savedSite.id ? savedSite : s));
            } catch (error) {
                console.error("Failed to delete assignment", error);
                alert("Eliminazione fallita.");
            }
        }
    };

    const handleImportServices = async (services: { siteName: string; employeeName: string; workingHours: string; workingDays: string[] }[]) => {
        setIsSaving(true);
        setImportResult(null);

        const normalize = (str: string) => str.trim().toLowerCase().replace(/[.,\/#!$%\^&\*;:{}=\-_`~()]/g,"").replace(/\s+/g, ' ');

        try {
            const siteNameMap = new Map(sites.map(s => [normalize(s.name), s]));
            
            const employeeNameMap = new Map<string, Employee>();
            employees.forEach(e => {
                employeeNameMap.set(normalize(`${e.firstName} ${e.lastName}`), e);
                employeeNameMap.set(normalize(`${e.lastName} ${e.firstName}`), e);
            });

            const assignmentsBySite = new Map<string, SiteAssignment[]>();
            const employeesToUpdateBySite = new Map<string, Set<string>>();
            const skipped: string[] = [];

            for (const service of services) {
                const site = siteNameMap.get(normalize(service.siteName));
                const employee = employeeNameMap.get(normalize(service.employeeName));

                if (site && employee) {
                    if (!assignmentsBySite.has(site.id)) {
                        assignmentsBySite.set(site.id, []);
                    }
                    if (!employeesToUpdateBySite.has(site.id)) {
                        employeesToUpdateBySite.set(site.id, new Set());
                    }
                    assignmentsBySite.get(site.id)!.push({
                        id: `asg-import-${Date.now()}-${Math.random()}`,
                        employeeId: employee.id,
                        workingHours: service.workingHours,
                        workingDays: service.workingDays,
                    });
                    employeesToUpdateBySite.get(site.id)!.add(employee.id);
                } else {
                     if (!site) skipped.push(`Cantiere non trovato: "${service.siteName}" (riga lavoratore: ${service.employeeName})`);
                     if (!employee) skipped.push(`Lavoratore non trovato: "${service.employeeName}" (riga cantiere: ${service.siteName})`);
                }
            }

            let successCount = 0;
            if (assignmentsBySite.size > 0) {
                 const sitesToUpdatePayload: WorkSite[] = [];
                for (const [siteId, newAssignments] of assignmentsBySite.entries()) {
                    const originalSite = sites.find(s => s.id === siteId)!;
                    const employeesForThisSite = employeesToUpdateBySite.get(siteId)!;

                    const existingAssignmentsToKeep = originalSite.assignments.filter(a => !employeesForThisSite.has(a.employeeId));
                    
                    const updatedSite = { ...originalSite, assignments: [...existingAssignmentsToKeep, ...newAssignments] };
                    sitesToUpdatePayload.push(updatedSite);
                }
                const updatePromises = sitesToUpdatePayload.map(site => api.updateData<WorkSite>('sites', site.id, site));
                // FIX: Explicitly cast the result of `Promise.all` to handle type inference issues where it returns `unknown[]`.
                const updatedSitesFromApi = await Promise.all(updatePromises);
                
                setSites(prev => {
                    const updatedSiteMap = new Map((updatedSitesFromApi as WorkSite[]).map(s => [s.id, s]));
                    return prev.map(s => updatedSiteMap.get(s.id) || s);
                });
                successCount = Array.from(assignmentsBySite.values()).reduce((total, assignments) => total + assignments.length, 0);
            }
            setImportResult({ success: successCount, skipped: [...new Set(skipped)] }); // Remove duplicates
            
        } catch (error) {
            console.error("Failed to import services", error);
            alert("Importazione fallita. Si è verificato un errore imprevisto.");
        } finally {
            setIsSaving(false);
            setIsImportModalOpen(false); // Close modal on finish
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
                            placeholder="Cerca cantiere..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="w-full p-2 border border-gray-300 rounded-lg"
                        />
                    </div>
                     <div className="flex gap-2">
                        <button onClick={() => setIsImportModalOpen(true)} className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors">
                            <i className="fa-solid fa-file-import mr-2"></i>Importa Servizi
                        </button>
                         <button onClick={() => setIsSiteModalOpen(true)} className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors">
                            <i className="fa-solid fa-plus mr-2"></i>Aggiungi Cantiere
                        </button>
                    </div>
                </div>

                 {importResult && (
                    <div className={`p-4 rounded-lg mb-4 ${importResult.skipped.length > 0 ? 'bg-yellow-100' : 'bg-green-100'}`}>
                        <h4 className="font-bold">{importResult.skipped.length > 0 ? 'Importazione Parziale' : 'Importazione Completata'}</h4>
                        <p>{importResult.success} servizi sono stati importati/aggiornati con successo.</p>
                        {importResult.skipped.length > 0 && (
                            <div className="mt-2 text-sm">
                                <p className="font-semibold">Righe saltate:</p>
                                <ul className="list-disc list-inside max-h-24 overflow-y-auto">
                                    {importResult.skipped.map((err, i) => <li key={i}>{err}</li>)}
                                </ul>
                            </div>
                        )}
                        <button onClick={() => setImportResult(null)} className="text-sm font-bold mt-2">Chiudi</button>
                    </div>
                )}


                <div className="space-y-6">
                    {filteredSites.map(site => (
                        <div key={site.id} className="p-4 border rounded-lg bg-gray-50">
                            <div className="flex justify-between items-center mb-3">
                                <h3 className="text-xl font-bold text-gray-800">{site.name}</h3>
                                <button onClick={() => handleOpenAssignmentModal(site)} className="px-3 py-1 bg-blue-100 text-blue-700 text-sm font-semibold rounded-md hover:bg-blue-200">
                                    <i className="fa-solid fa-plus mr-2"></i>Aggiungi Assegnazione
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
                                        <tr key={assignment.id} className="border-t">
                                            <td className="p-2 font-medium">{employeeMap.get(assignment.employeeId) || 'N/A'}</td>
                                            <td className="p-2">{assignment.workingHours}</td>
                                            <td className="p-2">{assignment.workingDays.join(', ')}</td>
                                            <td className="p-2 text-center space-x-3">
                                                <button onClick={() => handleOpenAssignmentModal(site, assignment)} className="text-yellow-600 hover:text-yellow-800" title="Modifica"><i className="fa-solid fa-pencil"></i></button>
                                                <button onClick={() => handleDeleteAssignment(site.id, assignment.id)} className="text-red-600 hover:text-red-800" title="Elimina"><i className="fa-solid fa-trash"></i></button>
                                            </td>
                                        </tr>
                                    ))}
                                    </tbody>
                                </table>
                                </div>
                            ) : (
                                <p className="text-center text-gray-500 italic py-4">Nessuna assegnazione per questo cantiere.</p>
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
            
            {isSiteModalOpen && (
                <SiteModal 
                    isOpen={isSiteModalOpen}
                    onClose={handleCloseModals}
                    onSave={handleSaveSite}
                    isSaving={isSaving}
                    site={null}
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