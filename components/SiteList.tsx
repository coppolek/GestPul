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
  const [isSaving, setIsSaving] = useState(false);

  const employeeMap = useMemo(() => new Map(employees.map(emp => [emp.id, `${emp.firstName} ${emp.lastName}`])), [employees]);
  
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
        alert("Salvataggio fallito. Riprova.");
    } finally {
        setIsSaving(false);
    }
  };

  const handleDeleteSite = async (siteId: string) => {
    const site = sites.find(s => s.id === siteId);
    if(site && site.assignments.length > 0) {
        alert('Impossibile eliminare un cantiere con dipendenti assegnati.');
        return;
    }
    if(window.confirm('Sei sicuro di voler eliminare questo cantiere?')) {
        try {
            await api.deleteData('sites', siteId);
            setSites(prev => prev.filter(s => s.id !== siteId));
        } catch (error) {
            console.error("Failed to delete site", error);
            alert("Eliminazione fallita. Riprova.");
        }
    }
  };
  
  const handleImportSites = async (newSites: Omit<WorkSite, 'id' | 'assignments' | 'status' | 'startDate' | 'endDate'>[]) => {
      setIsSaving(true);
      try {
          const sitesToSave = newSites.map(site => ({
              ...site,
              startDate: new Date().toISOString().split('T')[0],
              status: 'In Corso' as const,
              assignments: [],
          }));
          const addedSites = await api.addBatchData<Omit<WorkSite, 'id'>, WorkSite>('sites', sitesToSave);
          setSites(prev => [...prev, ...addedSites]);
          handleCloseModals();
      } catch (error) {
          console.error("Failed to import sites", error);
          alert("Importazione fallita. Riprova.");
      } finally {
          setIsSaving(false);
      }
  };

  return (
     <>
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-bold text-gray-800">Elenco Cantieri</h2>
        <div className="flex gap-2">
            <button onClick={() => setIsImportModalOpen(true)} className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors">
                <i className="fa-solid fa-file-import mr-2"></i>Importa
            </button>
            <button onClick={() => handleOpenModal()} className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors">
              <i className="fa-solid fa-plus mr-2"></i>Aggiungi Cantiere
            </button>
        </div>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {sites.map(site => (
          <div key={site.id} className="bg-white p-6 rounded-xl shadow-lg flex flex-col">
            <div className="flex justify-between items-start">
              <div>
                <h3 className="text-lg font-bold text-gray-800">{site.name}</h3>
                <p className="text-sm text-gray-500 flex items-center mt-1">
                  <i className="fa-solid fa-location-dot mr-2"></i>
                  {site.address}
                </p>
              </div>
              <div className="flex-shrink-0 space-x-2">
                <button onClick={() => handleOpenModal(site)} className="text-yellow-600 hover:text-yellow-800" title="Modifica"><i className="fa-solid fa-pencil"></i></button>
                <button onClick={() => handleDeleteSite(site.id)} className="text-red-600 hover:text-red-800" title="Elimina"><i className="fa-solid fa-trash"></i></button>
              </div>
            </div>
            
            <div className="mt-4 pt-4 border-t flex-1">
              <h4 className="font-semibold text-gray-700 mb-2">Operatori Assegnati</h4>
              {site.assignments.length > 0 ? (
                <ul className="space-y-3">
                  {site.assignments.map(assignment => (
                    <li key={assignment.employeeId} className="text-sm">
                      <p className="font-bold text-gray-900">{employeeMap.get(assignment.employeeId) || 'N/A'}</p>
                      <div className="flex items-center text-gray-600 mt-1">
                          <i className="fa-regular fa-clock w-4 text-center mr-1"></i>
                          <span>{assignment.workingHours}</span>
                      </div>
                      <div className="flex items-center text-gray-600">
                          <i className="fa-regular fa-calendar-days w-4 text-center mr-1"></i>
                          <span>{assignment.workingDays.join(', ')}</span>
                      </div>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-sm text-gray-500 italic">Nessun operatore assegnato.</p>
              )}
            </div>
          </div>
        ))}
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