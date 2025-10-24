import React, { useState } from 'react';
import { Employee, WorkSite } from '../types';

interface FindOperatorsProps {
    employees: Employee[];
    sites: WorkSite[];
}

const FindOperators: React.FC<FindOperatorsProps> = ({ employees, sites }) => {
    const [address, setAddress] = useState('');
    const [workingHours, setWorkingHours] = useState('08:00 - 12:00');
    const [workingDays, setWorkingDays] = useState<string[]>([]);
    
    const [results, setResults] = useState<Employee[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [searchPerformed, setSearchPerformed] = useState(false);

    const handleDayToggle = (day: string) => {
        setWorkingDays(prev => 
            prev.includes(day) ? prev.filter(d => d !== day) : [...prev, day]
        );
    };

    const handleSearch = () => {
        setIsLoading(true);
        setError(null);
        setResults([]);
        setSearchPerformed(true);

        try {
            // Helper to parse HH:MM into minutes from midnight for easy comparison
            const parseTime = (timeStr: string): number => {
                if (!timeStr || !timeStr.includes(':')) return NaN;
                const [hours, minutes] = timeStr.split(':').map(Number);
                return hours * 60 + minutes;
            };

            const [reqStart, reqEnd] = workingHours.split(' - ').map(parseTime);

            if (isNaN(reqStart) || isNaN(reqEnd)) {
                throw new Error("Formato orario non valido. Usare HH:MM - HH:MM.");
            }

            const allAssignments = sites.flatMap(site => 
                site.assignments.map(a => ({...a, siteName: site.name}))
            );

            const availableEmployees = employees.filter(employee => {
                const employeeAssignments = allAssignments.filter(a => a.employeeId === employee.id);

                // Check for any overlap
                const hasOverlap = employeeAssignments.some(assignment => {
                    // 1. Check if there's a day conflict
                    const dayConflict = assignment.workingDays.some(day => workingDays.includes(day));
                    if (!dayConflict) {
                        return false; // No overlap on this assignment, check next
                    }

                    // 2. If day conflict, check for time conflict
                    const [assStart, assEnd] = assignment.workingHours.split(' - ').map(parseTime);
                    if (isNaN(assStart) || isNaN(assEnd)) {
                        return false; // Skip malformed assignment time
                    }

                    // Overlap condition: (StartA < EndB) and (EndA > StartB)
                    return reqStart < assEnd && reqEnd > assStart;
                });
                
                return !hasOverlap; // Employee is available if they have NO overlaps
            });
            
            setResults(availableEmployees);

        } catch(e: any) {
            setError(e.message || "Si è verificato un errore durante la ricerca.");
        } finally {
            setIsLoading(false);
        }
    };
    
    const ALL_DAYS = ['Lunedì', 'Martedì', 'Mercoledì', 'Giovedì', 'Venerdì', 'Sabato', 'Domenica'];
    
    return (
        <div className="bg-white p-6 rounded-xl shadow-lg">
            <h2 className="text-2xl font-bold text-gray-800 mb-4">Cerca Operatori Disponibili</h2>
            <p className="text-gray-600 mb-6">
                Inserisci i dettagli del nuovo cantiere per trovare gli operatori liberi da impegni.
            </p>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6 p-4 border rounded-lg bg-gray-50">
                 <div className="md:col-span-2">
                    <label className="block text-sm font-medium text-gray-700 mb-1">Indirizzo del nuovo cantiere (opzionale)</label>
                    <input
                        type="text"
                        value={address}
                        onChange={(e) => setAddress(e.target.value)}
                        placeholder="Es. Via Roma 1, Milano"
                        className="w-full p-2 border border-gray-300 rounded-lg"
                        disabled={isLoading}
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
                    disabled={isLoading || workingDays.length === 0}
                    className="px-6 py-3 bg-blue-600 text-white font-semibold rounded-lg hover:bg-blue-700 transition-colors disabled:bg-gray-400 disabled:cursor-not-allowed min-w-[150px]"
                >
                    {isLoading ? <i className="fa-solid fa-spinner fa-spin"></i> : <><i className="fa-solid fa-search mr-2"></i>Cerca Disponibilità</>}
                </button>
            </div>
            
            {error && <div className="mt-6 bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded" role="alert">{error}</div>}
            
            {isLoading && (
                <div className="mt-8 text-center p-6">
                    <i className="fa-solid fa-spinner fa-spin text-3xl text-blue-600"></i>
                    <p className="mt-2 text-gray-600">Analisi disponibilità in corso...</p>
                </div>
            )}

            {!isLoading && searchPerformed && results.length > 0 && (
                 <div className="mt-8">
                    <h3 className="text-xl font-bold text-gray-800 mb-4">Risultati: Operatori Disponibili</h3>
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
                                   <p className="font-semibold text-green-600">Disponibile</p>
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