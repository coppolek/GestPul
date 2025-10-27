
import React, { useState, useMemo } from 'react';
import { WorkSite, Employee } from '../types';
import SiteModal from './modals/SiteModal';
import SiteImportModal from './modals/SiteImportModal';
import * as api from '../services/api';

interface SiteListProps {
  sites: WorkSite[];
  setSites: React.Dispatch<React.SetStateAction<WorkSite[]>>;
  employees: Employee[];
}

const SiteList: React.FC<SiteListProps> = ({ sites, setSites, employees }) => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [selectedSite, setSelectedSite] = useState<WorkSite | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  const employeeMap = useMemo(() => new Map(employees.map(e => [e.id, `${e.firstName} ${e.lastName}`])), [employees]);

  const handleOpenModal = (site: WorkSite | null = null) => {
    setSelectedSite(site);
    setIsModalOpen(true);
  };

  const handleCloseModals = () => {
    setIsModalOpen(false);
    setIsImportModalOpen(false);
    setSelectedSite(null);
  };

  const handleSaveSite = async (siteData: Omit<WorkSite, 'id'> & { id?: string }) => {
    setIsSaving(true);
    try {
      if (siteData.id) {
        // Edit
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

  const handleDeleteSite = async (siteId: string) => {
    if (window.confirm('Sei sicuro di voler eliminare questo cantiere? Questo rimuoverà anche tutte le assegnazioni dei dipendenti.')) {
      try {
        await api.deleteData('sites', siteId);
        setSites(prev => prev.filter(s => s.id !== siteId));
      } catch (error) {
        console.error("Failed to delete site", error);
        alert("Eliminazione fallita.");
      }
    }
  };
  
  const handleImportSites = async (newSites: Omit<WorkSite, 'id' | 'assignments' | 'status' | 'startDate' | 'endDate'>[]) => {
    setIsSaving(true);
    try {
      const existingNames = new Set(sites.map(s => s.name.toLowerCase()));
      const sitesToImport = newSites
        .filter(s => !existingNames.has(s.name.toLowerCase()))
        .map(s => ({
          ...s,
          assignments: [],
          status: 'In Corso' as const,
          startDate: new Date().toISOString().split('T')[0],
        }));
      
      if (sitesToImport.length > 0) {
        const addedSites = await api.addBatchData<Omit<WorkSite, 'id'>, WorkSite>('sites', sitesToImport);
        setSites(prev => [...prev, ...addedSites]);
      }
      
      const skippedCount = newSites.length - sitesToImport.length;
      if (skippedCount > 0) {
        alert(`${skippedCount} cantier${skippedCount > 1 ? 'i' : 'e'} ${skippedCount > 1 ? 'sono stati saltati' : 'è stato saltato'} perché già presenti.`);
      }
      
      handleCloseModals();
    } catch (error) {
      console.error("Failed to import sites", error);
      alert("Importazione fallita.");
    } finally {
      setIsSaving(false);
    }
  };

  const filteredSites = useMemo(() => {
    return sites.filter(site =>
      site.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      site.client.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [sites, searchTerm]);

  return (
    <>
      <div className="bg-white p-6 rounded-xl shadow-lg">
        <div className="flex justify-between items-center mb-6 gap-4 flex-wrap">
          <h2 className="text-2xl font-bold text-gray-800">Elenco Cantieri</h2>
          <div className="flex-grow max-w-md">
            <input
              type="text"
              placeholder="Cerca per nome o cliente..."
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              className="w-full p-2 border border-gray-300 rounded-lg"
            />
          </div>
          <div className="flex gap-2">
            <button onClick={() => setIsImportModalOpen(true)} className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors">
                <i className="fa-solid fa-file-import mr-2"></i>Importa
            </button>
            <button onClick={() => handleOpenModal()} className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors">
              <i className="fa-solid fa-plus mr-2"></i>Aggiungi Cantiere
            </button>
          </div>
        </div>
        
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead className="bg-gray-50">
              <tr>
                <th className="p-3 font-semibold text-gray-600">Nome Cantiere</th>
                <th className="p-3 font-semibold text-gray-600">Cliente</th>
                <th className="p-3 font-semibold text-gray-600">Operatori Assegnati</th>
                <th className="p-3 font-semibold text-gray-600">Stato</th>
                <th className="p-3 font-semibold text-gray-600 text-center">Azioni</th>
              </tr>
            </thead>
            <tbody>
              {filteredSites.map(site => (
                <tr key={site.id} className="border-b hover:bg-gray-50">
                  <td className="p-3 font-medium text-gray-800">{site.name}</td>
                  <td className="p-3 text-gray-600">{site.client}</td>
                  <td className="p-3 text-gray-600">
                    {site.assignments.length > 0 ? (
                        <div className="flex -space-x-2 overflow-hidden">
                        {site.assignments.slice(0, 3).map(a => {
                            const empName = employeeMap.get(a.employeeId);
                            const initials = empName?.split(' ').map(n=>n[0]).join('');
                            return empName ? <span key={a.employeeId} title={empName} className="inline-block h-8 w-8 rounded-full bg-blue-200 text-blue-800 ring-2 ring-white flex items-center justify-center text-xs font-bold">{initials}</span> : null
                        })}
                        {site.assignments.length > 3 && <span className="flex items-center justify-center h-8 w-8 rounded-full bg-gray-200 text-gray-800 ring-2 ring-white text-xs font-bold">+{site.assignments.length - 3}</span>}
                        </div>
                    ) : 'Nessuno'}
                  </td>
                  <td className="p-3 text-gray-600">{site.status}</td>
                  <td className="p-3 text-center space-x-2">
                    <button onClick={() => handleOpenModal(site)} className="text-yellow-600 hover:text-yellow-800" title="Modifica"><i className="fa-solid fa-pencil"></i></button>
                    <button onClick={() => handleDeleteSite(site.id)} className="text-red-600 hover:text-red-800" title="Elimina"><i className="fa-solid fa-trash"></i></button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {isModalOpen && (
        <SiteModal
          isOpen={isModalOpen}
          onClose={handleCloseModals}
          onSave={handleSaveSite}
          site={selectedSite}
          employees={employees}
          isSaving={isSaving}
        />
      )}
      {isImportModalOpen && (
        <SiteImportModal
            isOpen={isImportModalOpen}
            onClose={handleCloseModals}
            onImport={handleImportSites}
            isImporting={isSaving}
        />
      )}
    </>
  );
};

export default SiteList;
