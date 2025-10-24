

import React, { useState, useMemo } from 'react';
import { Employee, WorkSite, ApiKey } from '../types';
import { GoogleGenAI } from '@google/genai';

interface FindOperatorsProps {
    employees: Employee[];
    sites: WorkSite[];
    apiKeys: ApiKey[];
}

interface SearchResult {
    employeeId: string;
    distance: string;
}

const FindOperators: React.FC<FindOperatorsProps> = ({ employees, sites, apiKeys }) => {
    const [address, setAddress] = useState('');
    const [workingHours, setWorkingHours] = useState('08:00 - 12:00');
    const [workingDays, setWorkingDays] = useState<string[]>([]);
    
    const [results, setResults] = useState<(Employee & { distance: string })[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [searchPerformed, setSearchPerformed] = useState(false);

    const geminiApiKey = useMemo(() => apiKeys.find(k => k.id === 'google_gemini')?.key, [apiKeys]);

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

        if (!geminiApiKey) {
            setError("Chiave API Gemini non configurata. Vai su Impostazioni API per aggiungerla.");
            setIsLoading(false);
            return;
        }
        if (!address.trim()) {
            setError("L'indirizzo del cantiere è obbligatorio per calcolare la distanza.");
            setIsLoading(false);
            return;
        }

        const ai = new GoogleGenAI({ apiKey: geminiApiKey });
        const allAssignments = sites.flatMap(site => site.assignments);
        const employeeData = employees.map(emp => ({
            id: emp.id,
            name: `${emp.firstName} ${emp.lastName}`,
            address: emp.address,
            assignments: allAssignments
                .filter(a => a.employeeId === emp.id)
                .map(a => ({ workingHours: a.workingHours, workingDays: a.workingDays }))
        }));

        const prompt = `
            TASK: Identify available cleaning operators and calculate their distance to a new worksite.

            RULES:
            1. An operator is UNAVAILABLE if they have an existing assignment that overlaps with the requested work schedule (days and time).
            2. For each AVAILABLE operator, calculate the driving distance in kilometers from their home address to the new worksite address.
            3. The final output must be a JSON array of objects, sorted by distance (closest first).
            4. Each object must contain 'employeeId' and 'distance' (as a string, e.g., "15.3 km").
            5. If no operators are available, return an empty array [].
            6. The entire response must be ONLY the JSON array. Do not include any explanatory text or markdown formatting.

            INPUT DATA:
            - New Worksite Address: "${address}"
            - Requested Schedule:
              - Days: ${JSON.stringify(workingDays)}
              - Hours: "${workingHours}"
            - Operator Data: ${JSON.stringify(employeeData)}

            OUTPUT FORMAT (JSON ARRAY ONLY):
            [
              { "employeeId": "emp-1", "distance": "5.2 km" },
              { "employeeId": "emp-4", "distance": "12.8 km" }
            ]
        `;

        try {
            const response = await ai.models.generateContent({
                model: 'gemini-2.5-pro',
                contents: prompt,
                config: {
                    tools: [{ googleMaps: {} }],
                },
            });
            
            const text = response.text;
            if (!text) {
                throw new Error("La risposta del modello è vuota o non valida.");
            }

            const jsonMatch = text.match(/\[.*\]/s);
            if (!jsonMatch) {
                console.error("Invalid JSON response:", text);
                throw new Error("La risposta del modello non è un JSON valido.");
            }
            const parsedResults: SearchResult[] = JSON.parse(jsonMatch[0]);

            const employeeMap = new Map(employees.map(e => [e.id, e]));
            const finalResults = parsedResults.map(res => {
                const employee = employeeMap.get(res.employeeId);
                if (employee) {
                    // FIX: Replaced object spread with Object.assign to fix "Spread types may only be created from object types" error.
                    return Object.assign({}, employee, { distance: res.distance });
                }
                return null;
            }).filter((res): res is Employee & { distance: string } => res !== null);
            
            setResults(finalResults);

        } catch (e: any) {
            console.error("Error calling Gemini API:", e);
            setError(`Errore durante la ricerca con AI: ${e.message || 'Dettagli non disponibili.'}`);
        } finally {
            setIsLoading(false);
        }
    };
    
    const ALL_DAYS = ['Lunedì', 'Martedì', 'Mercoledì', 'Giovedì', 'Venerdì', 'Sabato', 'Domenica'];
    
    return (
        <div className="bg-white p-6 rounded-xl shadow-lg">
            <h2 className="text-2xl font-bold text-gray-800 mb-4">Cerca Operatori Vicini</h2>
            <p className="text-gray-600 mb-6">
                Inserisci i dettagli del nuovo cantiere per trovare gli operatori disponibili più vicini.
            </p>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6 p-4 border rounded-lg bg-gray-50">
                 <div className="md:col-span-2">
                    <label className="block text-sm font-medium text-gray-700 mb-1">Indirizzo del nuovo cantiere</label>
                    <input
                        type="text"
                        value={address}
                        onChange={(e) => setAddress(e.target.value)}
                        placeholder="Es. Via Roma 1, Milano"
                        className="w-full p-2 border border-gray-300 rounded-lg"
                        disabled={isLoading}
                        required
                    />
                </div>
                <div>
                     <label className="block text-sm font-medium text-gray-700 mb-1">Fascia oraria richiesta (es. 08:00-17:00)</label>
                    <input
                        type="text"
                        value={workingHours}
                        onChange={(e) => setWorkingHours(e.target.value)}
                        className="w-full p-2 border border-gray-300 rounded-lg"
                        disabled={isLoading}
                    />
                </div>
                 <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Giorni di lavoro richiesti</label>
                    <div className="flex flex-wrap gap-2">
                        {ALL_DAYS.map(day => (
                            <button
                                key={day}
                                onClick={() => handleDayToggle(day)}
                                disabled={isLoading}
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
                    disabled={isLoading || workingDays.length === 0 || !address.trim()}
                    className="px-6 py-3 bg-blue-600 text-white font-semibold rounded-lg hover:bg-blue-700 transition-colors disabled:bg-gray-400 disabled:cursor-not-allowed min-w-[150px]"
                >
                    {isLoading ? <i className="fa-solid fa-spinner fa-spin"></i> : <><i className="fa-solid fa-map-location-dot mr-2"></i>Cerca</>}
                </button>
            </div>
            
            {error && <div className="mt-6 bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded" role="alert">{error}</div>}
            
            {isLoading && (
                <div className="mt-8 text-center p-6">
                    <i className="fa-solid fa-spinner fa-spin text-3xl text-blue-600"></i>
                    <p className="mt-2 text-gray-600">Analisi disponibilità e calcolo distanze in corso...</p>
                </div>
            )}

            {!isLoading && searchPerformed && results.length > 0 && (
                 <div className="mt-8">
                    <h3 className="text-xl font-bold text-gray-800 mb-4">Risultati: Operatori Disponibili Ordinati per Vicinanza</h3>
                    <div className="space-y-4">
                        {results.map((result) => (
                             <div key={result.id} className="p-4 border rounded-lg bg-gray-50 flex items-center gap-4">
                               <div className="flex-shrink-0 w-12 h-12 bg-green-100 text-green-600 rounded-lg flex items-center justify-center">
                                    <i className="fa-solid fa-user-check text-xl"></i>
                               </div>
                               <div className="flex-grow">
                                    <p className="font-bold text-lg text-gray-800">{result.firstName} {result.lastName}</p>
                                    <p className="text-sm text-gray-600">{result.address}</p>
                               </div>
                               <div className="ml-auto text-right flex-shrink-0">
                                   <p className="font-bold text-xl text-blue-600">{result.distance}</p>
                                   <p className="text-xs text-gray-500">Distanza</p>
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
