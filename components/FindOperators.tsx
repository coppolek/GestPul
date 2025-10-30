
import React, { useState, useMemo } from 'react';
import { Employee, WorkSite, ApiKey } from '../types';

interface FindOperatorsProps {
    employees: Employee[];
    sites: WorkSite[];
    apiKeys: ApiKey[];
}

type SearchResult = Employee & { distance: number, distanceFormatted: string };
type Coordinates = { longitude: number; latitude: number; };

// Helper function to check for time overlaps, e.g., "08:00-17:00" and "16:00-20:00"
const doTimesOverlap = (timeRange1: string, timeRange2: string): boolean => {
    try {
        const [start1, end1] = timeRange1.split(/\s*-\s*/).map(t => parseInt(t.replace(':', ''), 10));
        const [start2, end2] = timeRange2.split(/\s*-\s*/).map(t => parseInt(t.replace(':', ''), 10));
        return start1 < end2 && end1 > start2;
    } catch (e) {
        console.error("Error parsing time ranges:", timeRange1, timeRange2, e);
        return true; // Assume overlap on error to be safe
    }
};


const FindOperators: React.FC<FindOperatorsProps> = ({ employees, sites, apiKeys }) => {
    const [address, setAddress] = useState('');
    const [workingHours, setWorkingHours] = useState('08:00 - 12:00');
    const [workingDays, setWorkingDays] = useState<string[]>([]);
    
    const [results, setResults] = useState<SearchResult[]>([]);
    const [isSearching, setIsSearching] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [searchPerformed, setSearchPerformed] = useState(false);
    const [isTesting, setIsTesting] = useState(false);
    const [testResult, setTestResult] = useState<{ type: 'success' | 'error'; message: string } | null>(null);
    
    const openRouteServiceApiKey = useMemo(() => apiKeys.find(k => k.id === 'open_route_service')?.key, [apiKeys]);

    const handleDayToggle = (day: string) => {
        setWorkingDays(prev => 
            prev.includes(day) ? prev.filter(d => d !== day) : [...prev, day]
        );
    };
    
    const getCoordinates = async (addr: string): Promise<Coordinates> => {
        const response = await fetch(`https://api.openrouteservice.org/geocode/search?api_key=${openRouteServiceApiKey}&text=${encodeURIComponent(addr)}`);
        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(`Geocodifica fallita: ${errorData.error?.message || response.statusText}`);
        }
        const data = await response.json();
        if (data.features && data.features.length > 0) {
            const [longitude, latitude] = data.features[0].geometry.coordinates;
            return { longitude, latitude };
        }
        throw new Error(`Indirizzo non trovato: "${addr}"`);
    };

    const handleTestConnection = async () => {
        setIsTesting(true);
        setTestResult(null);

        if (!openRouteServiceApiKey) {
            setTestResult({ type: 'error', message: 'Chiave API OpenRouteService non trovata nelle impostazioni.' });
            setIsTesting(false);
            return;
        }

        try {
            await getCoordinates('Milano');
            setTestResult({ type: 'success', message: 'Connessione con OpenRouteService riuscita!' });
        } catch (e: any) {
            setTestResult({ type: 'error', message: `Test fallito: ${e.message}` });
        } finally {
            setIsTesting(false);
        }
    };

    const handleSearch = async () => {
        if (!address.trim()) {
            setError("L'indirizzo del cantiere è obbligatorio.");
            return;
        }
        if (!openRouteServiceApiKey) {
            setError("Chiave API OpenRouteService non configurata. Vai su Impostazioni > API.");
            return;
        }

        setIsSearching(true);
        setError(null);
        setResults([]);
        setSearchPerformed(true);
        setTestResult(null);

        try {
            // 1. Geocode target address
            const targetCoords = await getCoordinates(address);
            
            // 2. Filter available employees
            const availableEmployees = employees.filter(emp => {
                if(emp.role !== 'Operatore' && emp.role !== 'Jolly') return false;
                
                const isBusy = sites.some(site => 
                    site.assignments.some(assignment => {
                        if (assignment.employeeId !== emp.id) return false;
                        const hasDayConflict = assignment.workingDays.some(day => workingDays.includes(day));
                        if (!hasDayConflict) return false;
                        return doTimesOverlap(assignment.workingHours, workingHours);
                    })
                );
                return !isBusy;
            });

            if (availableEmployees.length === 0) {
                setIsSearching(false);
                return; // No one is available, show the default message
            }

            // 3. Geocode operators' addresses
            const geocodePromises = availableEmployees.map(emp => 
                getCoordinates(emp.address).then(coords => ({ employee: emp, coords })).catch(() => null)
            );
            const geocodedOperators = (await Promise.all(geocodePromises)).filter(Boolean) as { employee: Employee, coords: Coordinates }[];

            if (geocodedOperators.length === 0) {
                throw new Error("Nessun indirizzo degli operatori disponibili è stato trovato.");
            }
            
            // 4. Call ORS Matrix API
            const locations = [
                [targetCoords.longitude, targetCoords.latitude],
                ...geocodedOperators.map(op => [op.coords.longitude, op.coords.latitude])
            ];

            const matrixResponse = await fetch('https://api.openrouteservice.org/v2/matrix/driving-car', {
                method: 'POST',
                headers: {
                    'Authorization': openRouteServiceApiKey,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    locations,
                    sources: Array.from({ length: geocodedOperators.length }, (_, i) => i + 1), // indices 1 to N
                    destinations: [0], // index 0 is target
                    metrics: ["distance"]
                })
            });

            if (!matrixResponse.ok) {
                 const errorData = await matrixResponse.json();
                 throw new Error(`Errore API Matrix: ${errorData.error?.message || matrixResponse.statusText}`);
            }

            const matrixData = await matrixResponse.json();
            const distances = matrixData.distances; // distances[i][0] is from op i to target

            // 5. Process results
            const searchResults = geocodedOperators.map((op, index) => {
                const distanceInMeters = distances[index][0];
                return {
                    ...op.employee,
                    distance: distanceInMeters,
                    distanceFormatted: `${(distanceInMeters / 1000).toFixed(1)} km`,
                };
            }).sort((a, b) => a.distance - b.distance);

            setResults(searchResults);

        } catch (e: any) {
            setError(e.message);
        } finally {
            setIsSearching(false);
        }
    };
    
    const ALL_DAYS = ['Lunedì', 'Martedì', 'Mercoledì', 'Giovedì', 'Venerdì', 'Sabato', 'Domenica'];
    
    return (
        <div className="bg-white p-6 rounded-xl shadow-lg">
            <h2 className="text-2xl font-bold text-gray-800 mb-4">Cerca Operatori Vicini</h2>
            <p className="text-gray-600 mb-6">
                Trova gli operatori disponibili più vicini a un nuovo cantiere utilizzando OpenRouteService per il calcolo delle distanze.
            </p>

            {testResult && (
                <div className={`p-3 rounded-lg text-sm mb-4 ${testResult.type === 'success' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                    {testResult.message}
                </div>
            )}

            <fieldset disabled={isSearching || isTesting}>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6 p-4 border rounded-lg bg-gray-50">
                    <div className="md:col-span-2">
                        <label className="block text-sm font-medium text-gray-700 mb-1">Indirizzo del nuovo cantiere (obbligatorio)</label>
                        <input
                            type="text"
                            value={address}
                            onChange={(e) => setAddress(e.target.value)}
                            placeholder="Es. Via Roma 1, Milano"
                            className="w-full p-2 border border-gray-300 rounded-lg"
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Fascia oraria richiesta (es. 08:00-17:00)</label>
                        <input
                            type="text"
                            value={workingHours}
                            onChange={(e) => setWorkingHours(e.target.value)}
                            className="w-full p-2 border border-gray-300 rounded-lg"
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">Giorni di lavoro richiesti</label>
                        <div className="flex flex-wrap gap-2">
                            {ALL_DAYS.map(day => (
                                <button
                                    key={day}
                                    type="button"
                                    onClick={() => handleDayToggle(day)}
                                    className={`px-3 py-1 text-sm rounded-full border transition-colors ${
                                        workingDays.includes(day)
                                        ? 'bg-blue-600 text-white border-blue-600'
                                        : 'bg-white hover:bg-gray-100 border-gray-300'
                                    }`}
                                >
                                    {day}
                                </button>
                            ))}
                        </div>
                    </div>
                </div>

                <div className="text-right flex justify-end items-center gap-4">
                     <button
                        type="button"
                        onClick={handleTestConnection}
                        disabled={isSearching || isTesting}
                        className="px-4 py-2 bg-gray-500 text-white font-semibold rounded-lg hover:bg-gray-600 transition-colors disabled:bg-gray-300 min-w-[150px]"
                    >
                        {isTesting ? <i className="fa-solid fa-spinner fa-spin"></i> : 'Verifica API'}
                    </button>
                    <button
                        onClick={handleSearch}
                        disabled={isSearching || isTesting || !address.trim()}
                        className="px-6 py-3 bg-blue-600 text-white font-semibold rounded-lg hover:bg-blue-700 transition-colors disabled:bg-gray-400 disabled:cursor-not-allowed min-w-[180px]"
                    >
                       {isSearching ? <><i className="fa-solid fa-spinner fa-spin mr-2"></i>Ricerca...</> : <><i className="fa-solid fa-search mr-2"></i>Cerca Operatori</>}
                    </button>
                </div>
            </fieldset>
            
            {error && <div className="mt-6 bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded" role="alert">{error}</div>}
            
            {isSearching && (
                <div className="mt-8 text-center p-6">
                    <i className="fa-solid fa-spinner fa-spin text-3xl text-blue-600"></i>
                    <p className="mt-2 text-gray-600">Analisi disponibilità e calcolo distanze in corso...</p>
                </div>
            )}

            {!isSearching && searchPerformed && results.length > 0 && (
                 <div className="mt-8">
                    <h3 className="text-xl font-bold text-gray-800 mb-4">Risultati: Operatori Disponibili Ordinati per Vicinanza</h3>
                    <div className="space-y-4">
                        {results.map((result) => (
                             <div key={result.id} className="p-4 border rounded-lg bg-gray-50 flex items-center gap-4">
                               <div className="flex-shrink-0 w-12 h-12 bg-blue-100 text-blue-600 rounded-lg flex items-center justify-center">
                                    <i className="fa-solid fa-map-marker-alt text-xl"></i>
                               </div>
                               <div className="flex-grow">
                                    <p className="font-bold text-lg text-gray-800">{result.firstName} {result.lastName}</p>
                                    <p className="text-sm text-gray-600">{result.address}</p>
                               </div>
                               <div className="ml-auto text-right flex-shrink-0">
                                   <p className="font-bold text-blue-600 text-lg">{result.distanceFormatted}</p>
                                   <p className="text-xs text-gray-500">Distanza stradale</p>
                               </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}
            
            {!isSearching && searchPerformed && results.length === 0 && !error && (
                <div className="mt-8 text-center p-6 border-2 border-dashed rounded-lg">
                    <i className="fa-solid fa-user-slash text-4xl text-gray-400 mb-3"></i>
                    <p className="text-gray-600 font-semibold">Nessun operatore disponibile</p>
                    <p className="text-gray-500">Nessun operatore è stato trovato per i criteri di data e orario specificati, oppure non è stato possibile calcolare i percorsi.</p>
                </div>
            )}
        </div>
    );
};

export default FindOperators;
