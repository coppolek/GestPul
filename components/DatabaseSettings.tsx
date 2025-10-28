
import React, { useState, useRef } from 'react';
import * as api from '../services/api';

const DatabaseSettings: React.FC = () => {
    const [isLoading, setIsLoading] = useState(false);
    const [feedback, setFeedback] = useState<{ type: 'success' | 'error', message: string } | null>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);

    const handleExport = () => {
        setIsLoading(true);
        setFeedback(null);
        try {
            const dbString = api.exportDbAsString();
            const blob = new Blob([dbString], { type: 'application/json' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            const date = new Date().toISOString().split('T')[0];
            a.download = `coppolecchia_backup_${date}.json`;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);
            setFeedback({ type: 'success', message: 'Database esportato con successo.' });
        } catch (error) {
            console.error("Export failed:", error);
            setFeedback({ type: 'error', message: 'Esportazione fallita.' });
        } finally {
            setIsLoading(false);
        }
    };

    const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (file) {
            if (!window.confirm("Sei sicuro di voler importare questo file? L'operazione sovrascriverà TUTTI i dati attuali e non è reversibile.")) {
                if (fileInputRef.current) {
                    fileInputRef.current.value = "";
                }
                return;
            }
            setIsLoading(true);
            setFeedback(null);
            const reader = new FileReader();
            reader.onload = (e) => {
                try {
                    const content = e.target?.result as string;
                    api.importDbFromString(content);
                    setFeedback({ type: 'success', message: "Importazione completata. L'applicazione verrà ricaricata." });
                    setTimeout(() => window.location.reload(), 2000);
                } catch (error) {
                    console.error("Import failed:", error);
                    setFeedback({ type: 'error', message: 'Importazione fallita. Il file potrebbe essere corrotto o non valido.' });
                    setIsLoading(false);
                }
            };
            reader.onerror = () => {
                 setFeedback({ type: 'error', message: 'Errore nella lettura del file.' });
                 setIsLoading(false);
            }
            reader.readAsText(file);
        }
    };
    
    const handleClear = () => {
        if (window.confirm("ATTENZIONE! Stai per cancellare l'intero database. Questa azione è IRREVERSIBILE. Sei assolutamente sicuro di voler procedere?")) {
            setIsLoading(true);
            setFeedback(null);
            try {
                api.clearDb();
                setFeedback({ type: 'success', message: "Database svuotato. L'applicazione verrà ricaricata." });
                setTimeout(() => window.location.reload(), 2000);
            } catch(error) {
                console.error("Clear DB failed:", error);
                setFeedback({ type: 'error', message: 'Operazione fallita.' });
                setIsLoading(false);
            }
        }
    };

    return (
        <div className="bg-white p-6 rounded-xl shadow-lg max-w-2xl mx-auto space-y-8">
            <div>
                <h2 className="text-2xl font-bold text-gray-800">Gestione Database</h2>
                <p className="text-sm text-gray-500 mt-1">Esporta, importa o resetta i dati dell'applicazione.</p>
            </div>
            
            {feedback && (
                <div className={`p-3 rounded-lg text-sm ${feedback.type === 'success' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                    {feedback.message}
                </div>
            )}

            {/* Export Section */}
            <div className="p-4 border rounded-lg">
                <h3 className="text-lg font-semibold text-gray-700">Esporta Dati</h3>
                <p className="text-sm text-gray-600 mt-1 mb-3">Salva una copia di backup di tutti i dati attuali in un file JSON.</p>
                <button 
                    onClick={handleExport}
                    disabled={isLoading}
                    className="px-4 py-2 bg-blue-600 text-white font-semibold rounded-lg hover:bg-blue-700 disabled:bg-gray-400"
                >
                    <i className="fa-solid fa-download mr-2"></i>Esporta Database
                </button>
            </div>

            {/* Import Section */}
            <div className="p-4 border rounded-lg">
                <h3 className="text-lg font-semibold text-gray-700">Importa Dati</h3>
                <p className="text-sm text-gray-600 mt-1 mb-3">
                    <span className="font-bold text-yellow-700">Attenzione:</span> L'importazione sostituirà tutti i dati esistenti con quelli del file selezionato.
                </p>
                <input
                    type="file"
                    accept=".json"
                    onChange={handleFileChange}
                    ref={fileInputRef}
                    disabled={isLoading}
                    className="block w-full text-sm text-gray-500
                                file:mr-4 file:py-2 file:px-4
                                file:rounded-full file:border-0
                                file:text-sm file:font-semibold
                                file:bg-blue-50 file:text-blue-700
                                hover:file:bg-blue-100"
                />
            </div>
            
            {/* Clear Section */}
            <div className="p-4 border border-red-300 bg-red-50 rounded-lg">
                <h3 className="text-lg font-semibold text-red-800">Svuota Database</h3>
                <p className="text-sm text-red-700 mt-1 mb-3">
                    <span className="font-bold">Azione irreversibile:</span> Rimuove tutti i dati dall'applicazione e la riporta allo stato iniziale.
                </p>
                <button
                    onClick={handleClear}
                    disabled={isLoading}
                    className="px-4 py-2 bg-red-600 text-white font-semibold rounded-lg hover:bg-red-700 disabled:bg-gray-400"
                >
                    <i className="fa-solid fa-trash-alt mr-2"></i>Svuota e Resetta
                </button>
            </div>

        </div>
    );
};

export default DatabaseSettings;
