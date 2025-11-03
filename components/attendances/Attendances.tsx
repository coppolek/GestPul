import React, { useState, useMemo, useEffect, useRef } from 'react';
import { Employee, AttendanceRecord, WorkSite, ApiKey } from '../../types';
import AttendanceModal from '../modals/AttendanceModal';
import * as api from '../../services/api';

interface AttendancesProps {
  employees: Employee[];
  attendances: AttendanceRecord[];
  setAttendances: React.Dispatch<React.SetStateAction<AttendanceRecord[]>>;
  sites: WorkSite[];
  apiKeys: ApiKey[];
}

type DistanceInfo = {
    status: 'loading' | 'success' | 'no_site' | 'no_location_data' | 'geocode_error';
    distance?: number; // in meters
    siteName?: string;
}

// Haversine formula to calculate distance between two lat/lon points
const calculateDistance = (lat1: number, lon1: number, lat2: number, lon2: number): number => {
    const R = 6371e3; // metres
    const φ1 = lat1 * Math.PI/180;
    const φ2 = lat2 * Math.PI/180;
    const Δφ = (lat2-lat1) * Math.PI/180;
    const Δλ = (lon2-lon1) * Math.PI/180;
  
    const a = Math.sin(Δφ/2) * Math.sin(Δφ/2) +
              Math.cos(φ1) * Math.cos(φ2) *
              Math.sin(Δλ/2) * Math.sin(Δλ/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
  
    return R * c; // in metres
};
  
const formatDistance = (meters: number): string => {
    if (meters < 1000) {
        return `${Math.round(meters)} m`;
    }
    return `${(meters / 1000).toFixed(1)} km`;
};

const Attendances: React.FC<AttendancesProps> = ({ employees, attendances, setAttendances, sites, apiKeys }) => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [filters, setFilters] = useState({ employeeId: '', date: '' });
  
  const employeeMap = useMemo(() => new Map(employees.map(emp => [emp.id, `${emp.firstName} ${emp.lastName}`])), [employees]);
  const siteMap = useMemo(() => new Map(sites.map(s => [s.id, s.name])), [sites]);

  const [distanceInfoCache, setDistanceInfoCache] = useState<Record<string, DistanceInfo>>({});
  const siteCoordsCache = useRef<Record<string, { lat: number; lon: number } | 'error'>>({});
  const openRouteServiceApiKey = useMemo(() => apiKeys.find(k => k.id === 'open_route_service')?.key, [apiKeys]);


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

  useEffect(() => {
    const getScheduledSiteForRecord = (record: AttendanceRecord): WorkSite | undefined => {
        const recordDate = new Date(record.timestamp);
        const dayOfWeek = new Intl.DateTimeFormat('it-IT', { weekday: 'long' }).format(recordDate);
        const capitalizedDay = dayOfWeek.charAt(0).toUpperCase() + dayOfWeek.slice(1);
        
        return sites.find(site => 
            site.assignments.some(a => 
                a.employeeId === record.employeeId && a.workingDays.includes(capitalizedDay)
            )
        );
    };

    const geocodeAddress = async (address: string): Promise<{ lat: number; lon: number } | 'error'> => {
        if (!openRouteServiceApiKey) return 'error';
        try {
            const response = await fetch(`https://api.openrouteservice.org/geocode/search?api_key=${openRouteServiceApiKey}&text=${encodeURIComponent(address)}`);
            if (!response.ok) return 'error';
            const data = await response.json();
            if (data.features && data.features.length > 0) {
                const [lon, lat] = data.features[0].geometry.coordinates;
                return { lat, lon };
            }
            return 'error';
        } catch (e) {
            console.error("Geocoding failed", e);
            return 'error';
        }
    };

    const processBatch = async () => {
        const recordsToProcess = filteredAttendances.filter(rec => !distanceInfoCache[rec.id]);
        if (recordsToProcess.length === 0) return;

        const initialUpdates = recordsToProcess.reduce((acc, rec) => {
            acc[rec.id] = { status: 'loading' };
            return acc;
        }, {} as Record<string, DistanceInfo>);
        setDistanceInfoCache(prev => ({ ...prev, ...initialUpdates }));

        for (const record of recordsToProcess) {
            if (!record.location) {
                setDistanceInfoCache(prev => ({ ...prev, [record.id]: { status: 'no_location_data' } }));
                continue;
            }

            const site = record.siteId ? sites.find(s => s.id === record.siteId) : getScheduledSiteForRecord(record);

            if (!site) {
                setDistanceInfoCache(prev => ({ ...prev, [record.id]: { status: 'no_site' } }));
                continue;
            }

            let siteCoords = siteCoordsCache.current[site.id];
            if (!siteCoords) {
                siteCoords = await geocodeAddress(site.address);
                siteCoordsCache.current[site.id] = siteCoords;
            }

            if (siteCoords === 'error') {
                setDistanceInfoCache(prev => ({ ...prev, [record.id]: { status: 'geocode_error', siteName: site.name } }));
                continue;
            }
            
            const distance = calculateDistance(
                record.location.latitude,
                record.location.longitude,
                siteCoords.lat,
                siteCoords.lon
            );

            setDistanceInfoCache(prev => ({
                ...prev,
                [record.id]: { status: 'success', distance: distance, siteName: site.name }
            }));
        }
    };

    if (openRouteServiceApiKey) {
        processBatch();
    }
  }, [filteredAttendances, openRouteServiceApiKey, sites, distanceInfoCache]);

  const renderLocationCell = (record: AttendanceRecord) => {
    const distanceInfo = distanceInfoCache[record.id];

    return (
      <div className="flex items-center justify-center gap-2">
        {!distanceInfo || distanceInfo.status === 'loading'
          ? <i className="fa-solid fa-spinner fa-spin text-gray-400" title="Calcolo distanza..."></i>
          : distanceInfo.status === 'success' && distanceInfo.distance !== undefined
            ? (
                distanceInfo.distance < 200
                ? <span className="px-2 py-1 text-xs font-semibold rounded-full bg-green-100 text-green-800" title={`Cantiere: ${distanceInfo.siteName}`}>In Sede</span>
                : <span className="px-2 py-1 text-xs font-semibold rounded-full bg-yellow-100 text-yellow-800" title={`Cantiere: ${distanceInfo.siteName}`}>Fuori Sede (~{formatDistance(distanceInfo.distance)})</span>
              )
            : distanceInfo.status === 'no_site'
              ? <span className="text-gray-400" title="Nessun cantiere programmato per oggi">-</span>
              : distanceInfo.status === 'geocode_error'
                ? <span className="text-red-500" title={`Impossibile localizzare il cantiere: ${distanceInfo.siteName}`}><i className="fa-solid fa-triangle-exclamation"></i></span>
                : <span className="text-gray-400" title="Dati GPS non disponibili per questa timbratura">-</span>
        }
        
        {record.location && (
            <a
                href={`https://www.google.com/maps/search/?api=1&query=${record.location.latitude},${record.location.longitude}`}
                target="_blank"
                rel="noopener noreferrer"
                className="text-blue-600 hover:text-blue-800"
                title="Mostra timbratura su mappa"
            >
                <i className="fa-solid fa-map-location-dot"></i>
            </a>
        )}
      </div>
    );
  };

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
                <th className="p-3 font-semibold text-gray-600">Cantiere</th>
                <th className="p-3 font-semibold text-gray-600">Data</th>
                <th className="p-3 font-semibold text-gray-600">Ora</th>
                <th className="p-3 font-semibold text-gray-600">Tipo</th>
                <th className="p-3 font-semibold text-gray-600">Note</th>
                <th className="p-3 font-semibold text-gray-600 text-center">Posizione vs Cantiere</th>
                <th className="p-3 font-semibold text-gray-600 text-center">Azioni</th>
              </tr>
            </thead>
            <tbody>
              {filteredAttendances.map(record => {
                const recordDate = new Date(record.timestamp);
                return (
                    <tr key={record.id} className="border-b hover:bg-gray-50">
                    <td className="p-3 font-medium text-gray-800">{employeeMap.get(record.employeeId) || 'N/A'}</td>
                    <td className="p-3 text-gray-600">{record.siteId ? siteMap.get(record.siteId) : 'N/D'}</td>
                    <td className="p-3 text-gray-600">{recordDate.toLocaleDateString('it-IT')}</td>
                    <td className="p-3 text-gray-600">{recordDate.toLocaleTimeString('it-IT', { hour: '2-digit', minute: '2-digit' })}</td>
                    <td className="p-3 text-gray-600">
                        <span className={`px-2 py-1 text-xs font-semibold rounded-full ${record.type === 'Entrata' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                            {record.type}
                        </span>
                    </td>
                    <td className="p-3 text-gray-600">{record.notes}</td>
                    <td className="p-3 text-center">
                        {renderLocationCell(record)}
                    </td>
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