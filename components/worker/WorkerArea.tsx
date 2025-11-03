import React, { useState, useMemo, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { Employee, WorkSite, AttendanceRecord, ApiKey } from '../../types';
import * as api from '../../services/api';

interface WorkerAreaProps {
    employees: Employee[];
    sites: WorkSite[];
    attendances: AttendanceRecord[];
    setAttendances: React.Dispatch<React.SetStateAction<AttendanceRecord[]>>;
    apiKeys: ApiKey[];
}

// Helper functions for geolocation
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


const WorkerArea: React.FC<WorkerAreaProps> = ({ employees, sites, attendances, setAttendances, apiKeys }) => {
    const { user } = useAuth();
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [location, setLocation] = useState<{ latitude: number; longitude: number; } | null>(null);
    const [locationError, setLocationError] = useState<string | null>(null);

    const openRouteServiceApiKey = useMemo(() => apiKeys.find(k => k.id === 'open_route_service')?.key, [apiKeys]);

    const currentEmployee = useMemo(() => {
        if (!user || !user.employeeId) return null;
        return employees.find(e => e.id === user.employeeId);
    }, [user, employees]);

    const lastAttendance = useMemo(() => {
        if (!currentEmployee) return null;
        return attendances
            .filter(a => a.employeeId === currentEmployee.id)
            .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())[0] || null;
    }, [attendances, currentEmployee]);

    const assignmentsToday = useMemo(() => {
        if (!currentEmployee) return [];
        const today = new Date();
        const dayOfWeek = new Intl.DateTimeFormat('it-IT', { weekday: 'long' }).format(today);
        const capitalizedDay = dayOfWeek.charAt(0).toUpperCase() + dayOfWeek.slice(1);
        
        return sites.flatMap(site => 
            site.assignments
                .filter(a => a.employeeId === currentEmployee.id && a.workingDays.includes(capitalizedDay))
                .map(a => ({ ...a, siteName: site.name, siteAddress: site.address }))
        );
    }, [sites, currentEmployee]);

    useEffect(() => {
        navigator.geolocation.getCurrentPosition(
            (position) => {
                setLocation({
                    latitude: position.coords.latitude,
                    longitude: position.coords.longitude,
                });
                setLocationError(null);
            },
            (error) => {
                console.error("Geolocation error:", error);
                setLocationError("Impossibile ottenere la posizione. Assicurati di aver concesso i permessi per timbrare.");
            },
            { enableHighAccuracy: true }
        );
    }, []);

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

    const handleClockInOut = async (type: 'Entrata' | 'Uscita') => {
        if (!currentEmployee) {
            setError("Utente lavoratore non trovato.");
            return;
        }
        if (!location) {
            setError("Posizione non disponibile. Impossibile timbrare. Controlla i permessi del browser.");
            return;
        }

        setIsLoading(true);
        setError(null);

        let note = `Timbratura da area lavoratore.`;
        let proceed = true;

        if (assignmentsToday.length === 0) {
            const reason = prompt("ANOMALIA: Non risultano servizi pianificati per oggi.\n\nInserisci una motivazione per timbrare:");
            if (reason) {
                note = `Timbratura fuori pianificazione. Motivazione: ${reason}`;
            } else {
                proceed = false; // User cancelled prompt
            }
        } else {
            // Find the most relevant assignment for the current time
            const now = new Date();
            const nowTimeStr = now.toTimeString().substring(0, 5); // "HH:mm"
            let targetAssignment = assignmentsToday.find(ass => {
                 const [start, end] = ass.workingHours.replace(/\s/g, '').split('-');
                 return nowTimeStr >= start && nowTimeStr <= end;
            });
            if (!targetAssignment) {
                 // If not in an active assignment, default to the first one of the day
                 targetAssignment = [...assignmentsToday].sort((a, b) => a.workingHours.localeCompare(b.workingHours))[0];
            }
            
            const siteCoords = await geocodeAddress(targetAssignment.siteAddress);

            if (siteCoords === 'error') {
                setError(`Impossibile verificare la posizione del cantiere "${targetAssignment.siteName}". Timbratura non permessa.`);
                proceed = false;
            } else {
                const distance = calculateDistance(location.latitude, location.longitude, siteCoords.lat, siteCoords.lon);
                if (distance > 200) { // Anomaly threshold: 200 meters
                    const reason = prompt(`ANOMALIA: Non ti trovi presso il cantiere "${targetAssignment.siteName}" (distanza: ~${formatDistance(distance)}).\n\nInserisci una motivazione per timbrare comunque:`);
                    if (reason) {
                        note = `Timbratura fuori sede (~${formatDistance(distance)}). Motivazione: ${reason}`;
                    } else {
                        proceed = false; // User cancelled prompt
                    }
                }
            }
        }

        if (!proceed) {
            setIsLoading(false);
            return;
        }
        
        try {
            const newAttendance: Omit<AttendanceRecord, 'id'> = {
                employeeId: currentEmployee.id,
                timestamp: new Date().toISOString(),
                type,
                location: location,
                notes: note,
            };
            const savedRecord = await api.addData<Omit<AttendanceRecord, 'id'>, AttendanceRecord>('attendances', newAttendance);
            setAttendances(prev => [savedRecord, ...prev].sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()));
        } catch (apiError) {
            console.error("API error on clock-in/out:", apiError);
            setError("Errore durante la registrazione della timbratura. Riprova.");
        } finally {
            setIsLoading(false);
        }
    };

    if (!currentEmployee) {
        return (
             <div className="bg-white p-6 rounded-xl shadow-lg text-center">
                <h2 className="text-2xl font-bold text-red-600">Errore</h2>
                <p className="text-gray-600 mt-2">Il tuo account utente non è collegato a un profilo dipendente.</p>
            </div>
        )
    }

    const nextAction: 'Entrata' | 'Uscita' | null = !lastAttendance || lastAttendance.type === 'Uscita' ? 'Entrata' : 'Uscita';

    return (
        <div className="max-w-2xl mx-auto space-y-8">
            <div className="bg-white p-8 rounded-xl shadow-lg text-center">
                <h2 className="text-3xl font-bold text-gray-800">Ciao, {currentEmployee.firstName}!</h2>
                {lastAttendance ? (
                     <p className="text-lg text-gray-600 mt-2">
                         La tua ultima timbratura è stata un'
                         <span className={`font-bold ${lastAttendance.type === 'Entrata' ? 'text-green-600' : 'text-red-600'}`}>{lastAttendance.type.toLowerCase()}</span>
                         {' '}alle ore {new Date(lastAttendance.timestamp).toLocaleTimeString('it-IT', { hour: '2-digit', minute: '2-digit' })}.
                     </p>
                ) : (
                    <p className="text-lg text-gray-600 mt-2">Non hai ancora effettuato timbrature oggi.</p>
                )}
            </div>

            <div className="bg-white p-8 rounded-xl shadow-lg">
                 <h3 className="text-xl font-bold text-gray-800 mb-4 text-center">Pulsantiera Timbratura</h3>
                 {error && <div className="p-3 bg-red-100 text-red-700 rounded-lg mb-4 text-center">{error}</div>}
                 {locationError && !location && <div className="p-3 bg-yellow-100 text-yellow-800 rounded-lg mb-4 text-center">{locationError}</div>}
                 
                 <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-6">
                    <button
                        onClick={() => handleClockInOut('Entrata')}
                        disabled={isLoading || nextAction !== 'Entrata' || !location}
                        className="p-8 bg-green-500 text-white rounded-lg shadow-md hover:bg-green-600 transition-transform transform hover:scale-105 disabled:bg-gray-400 disabled:cursor-not-allowed disabled:scale-100 flex flex-col items-center justify-center"
                    >
                        <i className="fa-solid fa-right-to-bracket text-4xl mb-2"></i>
                        <span className="text-2xl font-bold">ENTRATA</span>
                    </button>
                     <button
                        onClick={() => handleClockInOut('Uscita')}
                        disabled={isLoading || nextAction !== 'Uscita' || !location}
                        className="p-8 bg-red-600 text-white rounded-lg shadow-md hover:bg-red-700 transition-transform transform hover:scale-105 disabled:bg-gray-400 disabled:cursor-not-allowed disabled:scale-100 flex flex-col items-center justify-center"
                    >
                         <i className="fa-solid fa-right-from-bracket text-4xl mb-2"></i>
                        <span className="text-2xl font-bold">USCITA</span>
                    </button>
                 </div>
                 {isLoading && (
                    <div className="text-center mt-4 text-blue-600">
                        <i className="fa-solid fa-spinner fa-spin mr-2"></i>
                        Registrazione in corso...
                    </div>
                 )}
            </div>
            
            <div className="bg-white p-6 rounded-xl shadow-lg">
                <h3 className="text-xl font-bold text-gray-800 mb-4">I Tuoi Cantieri di Oggi</h3>
                {assignmentsToday.length > 0 ? (
                    <div className="space-y-4">
                        {assignmentsToday.map((ass, index) => (
                             <div key={index} className="p-4 bg-gray-50 rounded-lg border">
                                <p className="font-bold text-gray-800">{ass.siteName}</p>
                                <p className="text-sm text-gray-600">{ass.siteAddress}</p>
                                <div className="text-sm text-gray-600 mt-1">
                                    <p>Orario: {ass.workingHours}</p>
                                </div>
                            </div>
                        ))}
                    </div>
                ) : (
                    <p className="text-gray-500 italic text-center py-4">Nessun cantiere assegnato per oggi.</p>
                )}
            </div>
        </div>
    );
};

export default WorkerArea;