
import React, { useState } from 'react';
import { Employee, WorkSite } from '../types';
import { GoogleGenAI } from '@google/genai';

// Interface for the structured JSON response from Gemini
interface OperatorSearchResult {
    employeeId: string;
    employeeName: string;
    employeeAddress: string;
    distance: string;
    duration: string;
}

interface FindOperatorsProps {
  employees: Employee[];
  sites: WorkSite[];
}

const ALL_DAYS = ['Lunedì', 'Martedì', 'Mercoledì', 'Giovedì', 'Venerdì', 'Sabato', 'Domenica'];

const FindOperators: React.FC<FindOperatorsProps> = ({ employees, sites }) => {
    const [address, setAddress] = useState('');
    const [startTime, setStartTime] = useState('08:00');
    const [endTime, setEndTime] = useState('17:00');
    const [workingDays, setWorkingDays] = useState<string[]>([]);
    
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [results, setResults] = useState<OperatorSearchResult[] | null>(null);

    const handleDayToggle = (day: string) => {
        setWorkingDays(prev => 
            prev.includes(day) ? prev.filter(d => d !== day) : [...prev, day]
        );
    };

    const handleSearch = async () => {
        if (!address || workingDays.length === 0) {
            setError("Per favore, inserisci l'indirizzo del cantiere e seleziona almeno un giorno di lavoro.");
            return;
        }

        setIsLoading(true);
        setError(null);
        setResults(null);

        try {
            const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

            const employeeDataForPrompt = employees.map(emp => ({
                id: emp.id,
                name: `${emp.firstName} ${emp.lastName}`,
                address: emp.address
            }));
            
            const assignmentsDataForPrompt = sites.flatMap(site => 
                site.assignments.map(ass => ({
                    employeeId: ass.employeeId,
                    workingDays: ass.workingDays,
                    workingHours: ass.workingHours
                }))
            );

            const prompt = `
                Sei un assistente per la pianificazione di un'impresa di pulizie. Il tuo compito è trovare gli operatori più adatti per un nuovo cantiere.

                **Informazioni sul nuovo cantiere:**
                - Indirizzo: "${address}"
                - Orario di lavoro richiesto: dalle ${startTime} alle ${endTime}
                - Giorni di lavoro richiesti: ${workingDays.join(', ')}

                **Lista di tutti i dipendenti:**
                ${JSON.stringify(employeeDataForPrompt, null, 2)}

                **Lista di tutte le assegnazioni attuali dei dipendenti:**
                ${JSON.stringify(assignmentsDataForPrompt, null, 2)}

                **Istruzioni:**
                1. **Verifica Disponibilità:** Per ogni dipendente, controlla se ha già un'assegnazione che si sovrappone con i giorni e gli orari richiesti per il nuovo cantiere. Un dipendente non è disponibile se è già impegnato. Considera le fasce orarie che si sovrappongono.
                2. **Calcola Distanza:** Per tutti i dipendenti che risultano disponibili, calcola la distanza e il tempo di percorrenza in auto dal loro indirizzo di casa all'indirizzo del nuovo cantiere.
                3. **Crea una Lista Ordinata:** Restituisci una lista dei soli dipendenti disponibili, ordinata dal più vicino al più lontano (in base al tempo di percorrenza).

                **Formato di Risposta:**
                La tua risposta DEVE essere **esclusivamente** un array JSON valido, senza alcuna formattazione aggiuntiva come backtick (\`\`\`json), spiegazioni o testo introduttivo. L'array deve contenere oggetti, dove ogni oggetto rappresenta un dipendente disponibile e contiene le seguenti chiavi:
                - "employeeId": (string) L'ID del dipendente.
                - "employeeName": (string) Il nome completo del dipendente.
                - "employeeAddress": (string) L'indirizzo di casa del dipendente.
                - "distance": (string) La distanza stradale (es. "10.5 km").
                - "duration": (string) Il tempo di percorrenza stimato in auto (es. "15 min").

                Se nessun dipendente è disponibile o corrisponde ai criteri, restituisci un array JSON vuoto: [].
            `;

            const response = await ai.models.generateContent({
                model: 'gemini-2.5-pro',
                contents: prompt,
                config: {
                    tools: [{ googleMaps: {} }],
                },
            });
            
            let responseText = response.text.trim();
            
            // Clean up potential markdown code blocks
            if (responseText.startsWith('```json')) {
                responseText = responseText.substring(7, responseText.length - 3).trim();
            } else if (responseText.startsWith('```')) {
                 responseText = responseText.substring(3, responseText.length - 3).trim();
            }

            const searchResults: OperatorSearchResult[] = JSON.parse(responseText);
            setResults(searchResults);

        } catch (e) {
            console.error("Error calling Gemini API:", e);
            setError("Si è verificato un errore durante la ricerca. Riprova più tardi.");
        } finally {
            setIsLoading(false);
        }
    };


    return (
        <div className="space-y-8">
            <div className="bg-white p-6 rounded-xl shadow-lg">
                <h2 className="text-2xl font-bold text-gray-800 mb-6">Cerca Operatore Disponibile</h2>
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-end">
                    {/* Column 1: Address */}
                    <div className="lg:col-span-3">
                        <label htmlFor="address" className="block text-sm font-medium text-gray-700 mb-1">Indirizzo nuovo cantiere</label>
                        <div className="relative">
                            <i className="fa-solid fa-map-marker-alt absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"></i>
                            <input
                                type="text"
                                id="address"
                                value={address}
                                onChange={(e) => setAddress(e.target.value)}
                                placeholder="Es. Via Roma 1, 20121 Milano MI"
                                className="w-full p-2 pl-10 border border-gray-300 rounded-lg"
                            />
                        </div>
                    </div>

                    {/* Column 2: Time */}
                    <div className="grid grid-cols-2 gap-4">
                         <div>
                            <label htmlFor="start-time" className="block text-sm font-medium text-gray-700 mb-1">Dalle ore</label>
                            <input
                                type="time"
                                id="start-time"
                                value={startTime}
                                onChange={(e) => setStartTime(e.target.value)}
                                className="w-full p-2 border border-gray-300 rounded-lg"
                            />
                        </div>
                        <div>
                            <label htmlFor="end-time" className="block text-sm font-medium text-gray-700 mb-1">Alle ore</label>
                            <input
                                type="time"
                                id="end-time"
                                value={endTime}
                                onChange={(e) => setEndTime(e.target.value)}
                                className="w-full p-2 border border-gray-300 rounded-lg"
                            />
                        </div>
                    </div>
                   
                    {/* Column 3: Days */}
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">Giorni di lavoro</label>
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
                                    {day.substring(0, 3)}
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Column 4: Button */}
                    <div className="flex justify-end">
                        <button
                            onClick={handleSearch}
                            disabled={isLoading}
                            className="w-full px-6 py-3 bg-blue-600 text-white font-semibold rounded-lg hover:bg-blue-700 transition-colors disabled:bg-gray-400 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                        >
                            {isLoading ? (
                                <>
                                    <i className="fa-solid fa-spinner fa-spin"></i>
                                    <span>Ricerca...</span>
                                </>
                            ) : (
                                <>
                                    <i className="fa-solid fa-magnifying-glass"></i>
                                    <span>Cerca Operatori</span>
                                </>
                            )}
                        </button>
                    </div>
                </div>
            </div>

            {/* Results section */}
            <div id="results">
                {error && <div className="bg-red-100 border-l-4 border-red-500 text-red-700 p-4 rounded-lg" role="alert"><p className="font-bold">Errore</p><p>{error}</p></div>}
                
                {isLoading && (
                     <div className="text-center py-10">
                        <i className="fa-solid fa-spinner fa-spin text-4xl text-blue-500"></i>
                        <p className="mt-4 text-gray-600">Analisi disponibilità e calcolo distanze in corso...</p>
                    </div>
                )}
                
                {!isLoading && results && (
                    <div>
                        <h3 className="text-xl font-bold text-gray-800 mb-4">
                            Risultati della Ricerca ({results.length} {results.length === 1 ? 'operatore trovato' : 'operatori trovati'})
                        </h3>
                        {results.length > 0 ? (
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                                {results.map(res => (
                                    <div key={res.employeeId} className="bg-white p-5 rounded-xl shadow-lg border-l-4 border-green-500">
                                        <h4 className="text-lg font-bold text-gray-900">{res.employeeName}</h4>
                                        <p className="text-sm text-gray-500 mt-1 mb-3 flex items-center gap-2">
                                            <i className="fa-solid fa-location-dot text-gray-400"></i>
                                            {res.employeeAddress}
                                        </p>
                                        <div className="flex justify-between items-center bg-gray-50 p-3 rounded-lg">
                                            <div className="text-center">
                                                <p className="text-xs text-gray-500">Distanza</p>
                                                <p className="font-bold text-gray-800">{res.distance}</p>
                                            </div>
                                            <div className="text-center">
                                                <p className="text-xs text-gray-500">Tempo</p>
                                                <p className="font-bold text-gray-800">{res.duration}</p>
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        ) : (
                             <div className="text-center py-10 bg-gray-50 rounded-lg">
                                <i className="fa-solid fa-user-slash text-4xl text-gray-400"></i>
                                <p className="mt-4 text-gray-600 font-semibold">Nessun operatore disponibile</p>
                                <p className="text-sm text-gray-500">Prova a modificare i giorni, l'orario o cerca per un altro cantiere.</p>
                            </div>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
};

export default FindOperators;
