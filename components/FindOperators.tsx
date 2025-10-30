
import React, { useState, useMemo } from 'react';
import { Employee, WorkSite, ApiKey } from '../types';
import { GoogleGenAI } from '@google/genai';

interface FindOperatorsProps {
    employees: Employee[];
    sites: WorkSite[];
    apiKeys: ApiKey[];
}

type SearchResult = Employee & { distance?: string };

// Helper function to check for time overlaps, e.g., "08:00-17:00" and "16:00-20:00"
const doTimesOverlap = (timeRange1: string, timeRange2: string): boolean => {
    try {
        const [start1, end1] = timeRange1.split(' - ').map(t => parseInt(t.replace(':', ''), 10));
        const [start2, end2] = timeRange2.split(' - ').map(t => parseInt(t.replace(':', ''), 10));
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
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [searchPerformed, setSearchPerformed] = useState(false);
    
    const openRouteServiceApiKey = useMemo(() => apiKeys.find(k => k.id === 'open_route_service')?.key, [apiKeys]);

    const handleDayToggle = (day: string) => {
        setWorkingDays(prev => 
            prev.includes(day) ? prev.filter(d => d !== day) : [...prev, day]
        );
    };

    const handleSearch = async () => {
        setIsLoading(true);
        setError(null);
        setResults([]);
        setSearchPerformed(true);
        
        // This is a placeholder for the future implementation with OpenRouteService.
        // For now, it will be disabled.
        
        setError("La funzionalità di ricerca con OpenRouteService non è ancora stata implementata.");
        setIsLoading(false);
    };
    
    const ALL_DAYS = ['Lunedì', 'Martedì', 'Mercoledì', 'Giovedì', 'Venerdì', 'Sabato', 'Domenica'];
    
    return (
        <div className="bg-white p-6 rounded-xl shadow-lg">
            <h2 className="text-2xl font-bold text-gray-800 mb-4">Cerca Operatori Vicini</h2>
            <p className="text-gray-600 mb-6">
                Trova gli operatori disponibili più vicini a un nuovo cantiere utilizzando OpenRouteService per il calcolo delle distanze.
            </p>

            <div className="p-4 mb-6 bg-yellow-100 border-l-4 border-yellow-500 text-yellow-700 rounded-lg">
                <p className="font-bold">Funzionalità in Sviluppo</p>
                <p>Questa funzionalità è stata predisposta per utilizzare OpenRouteService. Salva la chiave API nelle impostazioni per abilitare il calcolo delle distanze in un prossimo aggiornamento.</p>
            </div>

            <fieldset disabled>
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

                <div className="text-right">
                    <button
                        onClick={handleSearch}
                        disabled
                        className="px-6 py-3 bg-blue-600 text-white font-semibold rounded-lg hover:bg-blue-700 transition-colors disabled:bg-gray-400 disabled:cursor-not-allowed min-w-[150px]"
                    >
                        <i className="fa-solid fa-search mr-2"></i>Cerca Operatori
                    </button>
                </div>
            </fieldset>
            
            {error && <div className="mt-6 bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded" role="alert">{error}</div>}
            
            {isLoading && (
                <div className="mt-8 text-center p-6">
                    <i className="fa-solid fa-spinner fa-spin text-3xl text-blue-600"></i>
                    <p className="mt-2 text-gray-600">Analisi disponibilità e calcolo distanze in corso...</p>
                </div>
            )}

            {!isLoading && searchPerformed && results.length > 0 && (
                 <div className="mt-8">
                    <h3 className="text-xl font-bold text-gray-800 mb-4">Risultati: Top 20 Operatori più Vicini</h3>
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
                                   <p className="font-bold text-blue-600 text-lg">{result.distance}</p>
                                   <p className="text-xs text-gray-500">Distanza stimata</p>
                               </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}
            
            {!isLoading && searchPerformed && results.length === 0 && (
                <div className="mt-8 text-center p-6 border-2 border-dashed rounded-lg">
                    <i className="fa-solid fa-user-slash text-4xl text-gray-400 mb-3"></i>
                    <p className="text-gray-600 font-semibold">Nessun operatore disponibile</p>
                    <p className="text-gray-500">Nessun operatore è stato trovato per i criteri di data e orario specificati.</p>
                </div>
            )}
        </div>
    );
};

export default FindOperators;