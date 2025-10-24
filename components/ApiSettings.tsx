
import React, { useState } from 'react';
import { GoogleGenAI } from '@google/genai';

const ApiSettings: React.FC = () => {
    const [isTesting, setIsTesting] = useState(false);
    const [testResult, setTestResult] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

    const geminiApiKey = process.env.API_KEY;

    const handleTestConnection = async () => {
        setIsTesting(true);
        setTestResult(null);

        if (!geminiApiKey) {
            setTestResult({ type: 'error', message: 'Chiave API non trovata. Assicurati che process.env.API_KEY sia configurato.' });
            setIsTesting(false);
            return;
        }

        try {
            const ai = new GoogleGenAI({ apiKey: geminiApiKey });
            const response = await ai.models.generateContent({
                model: 'gemini-2.5-flash',
                contents: 'Ciao',
            });
            // A successful call will have a response, even if empty.
            if (response.text !== undefined) {
                 setTestResult({ type: 'success', message: 'Connessione riuscita! La chiave API è valida.' });
            } else {
                throw new Error("La risposta dell'API non era nel formato previsto.");
            }
        } catch (error) {
            console.error("API connection test failed:", error);
            const errorMessage = error instanceof Error ? error.message : "Errore sconosciuto";
            setTestResult({ type: 'error', message: `Verifica fallita: ${errorMessage}` });
        } finally {
            setIsTesting(false);
        }
    };

    return (
        <div className="bg-white p-6 rounded-xl shadow-lg max-w-2xl mx-auto">
            <h2 className="text-2xl font-bold text-gray-800 mb-2">Impostazioni API</h2>
            <p className="text-sm text-gray-500 mb-6">Verifica lo stato della connessione all'API di Google Gemini.</p>
            
            <div className="space-y-4">
                <div>
                    <h3 className="text-lg font-semibold text-gray-700">Google Gemini API</h3>
                     {geminiApiKey ? (
                        <div className="text-sm text-green-700 bg-green-100 p-3 rounded-lg mt-2 flex items-center">
                            <i className="fa-solid fa-check-circle mr-3 text-lg"></i>
                            <span>Una chiave API è configurata correttamente nell'ambiente.</span>
                        </div>
                    ) : (
                         <div className="text-sm text-red-700 bg-red-100 p-3 rounded-lg mt-2 flex items-center">
                            <i className="fa-solid fa-triangle-exclamation mr-3 text-lg"></i>
                            <span>Nessuna chiave API configurata. Imposta la variabile d'ambiente `API_KEY` per abilitare le funzionalità AI.</span>
                        </div>
                    )}
                </div>

                {testResult && (
                    <div className={`p-3 rounded-lg text-sm ${testResult.type === 'success' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                        <i className={`fa-solid ${testResult.type === 'success' ? 'fa-check-circle' : 'fa-exclamation-triangle'} mr-2`}></i>
                        {testResult.message}
                    </div>
                )}


                <div className="flex justify-end items-center gap-4 pt-4 border-t">
                     <button
                        type="button"
                        onClick={handleTestConnection}
                        disabled={isTesting || !geminiApiKey}
                        className="px-4 py-2 bg-blue-600 text-white font-semibold rounded-lg hover:bg-blue-700 transition-colors disabled:bg-gray-400 disabled:cursor-not-allowed w-44"
                    >
                        {isTesting ? <i className="fa-solid fa-spinner fa-spin"></i> : 'Verifica Connessione'}
                    </button>
                </div>
            </div>
        </div>
    );
};

export default ApiSettings;
