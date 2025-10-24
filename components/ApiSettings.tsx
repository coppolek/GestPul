
import React, { useState, useMemo, useEffect } from 'react';
import { GoogleGenAI } from '@google/genai';
import { ApiKey } from '../types';
import * as api from '../services/api';

interface ApiSettingsProps {
    apiKeys: ApiKey[];
    setApiKeys: React.Dispatch<React.SetStateAction<ApiKey[]>>;
}

const ApiSettings: React.FC<ApiSettingsProps> = ({ apiKeys, setApiKeys }) => {
    const geminiApiKeyObject = useMemo(() => apiKeys.find(k => k.id === 'google_gemini'), [apiKeys]);
    
    const [currentKey, setCurrentKey] = useState('');
    const [isKeyVisible, setIsKeyVisible] = useState(false);
    const [isTesting, setIsTesting] = useState(false);
    const [isSaving, setIsSaving] = useState(false);
    const [testResult, setTestResult] = useState<{ type: 'success' | 'error'; message: string } | null>(null);
    const [saveResult, setSaveResult] = useState<{ type: 'success' | 'error'; message: string } | null>(null);
    
    useEffect(() => {
        if (geminiApiKeyObject) {
            setCurrentKey(geminiApiKeyObject.key);
        }
    }, [geminiApiKeyObject]);

    const handleTestConnection = async () => {
        setIsTesting(true);
        setTestResult(null);
        setSaveResult(null);

        if (!currentKey.trim()) {
            setTestResult({ type: 'error', message: 'Inserisci una chiave API per eseguire il test.' });
            setIsTesting(false);
            return;
        }

        try {
            const ai = new GoogleGenAI({ apiKey: currentKey });
            const response = await ai.models.generateContent({
                model: 'gemini-2.5-flash',
                contents: 'Ciao',
            });
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

    const handleSaveKey = async () => {
        if (!geminiApiKeyObject) return;
        setIsSaving(true);
        setSaveResult(null);
        setTestResult(null);

        try {
            const updatedKey = { ...geminiApiKeyObject, key: currentKey };
            const savedKey = await api.updateData<ApiKey>('apiKeys', updatedKey.id, updatedKey);
            setApiKeys(prev => prev.map(k => k.id === savedKey.id ? savedKey : k));
            setSaveResult({ type: 'success', message: 'Chiave API salvata con successo!' });
        } catch (error) {
            console.error("Failed to save API key:", error);
            setSaveResult({ type: 'error', message: 'Salvataggio fallito. Riprova.' });
        } finally {
            setIsSaving(false);
        }
    };

    return (
        <div className="bg-white p-6 rounded-xl shadow-lg max-w-2xl mx-auto">
            <h2 className="text-2xl font-bold text-gray-800 mb-2">Impostazioni API</h2>
            <p className="text-sm text-gray-500 mb-6">Gestisci e verifica le tue chiavi API per i servizi esterni.</p>
            
            <div className="space-y-4">
                <div>
                    <label htmlFor="gemini-key" className="block text-lg font-semibold text-gray-700 mb-2">Google Gemini API Key</label>
                    <div className="relative">
                        <input
                            id="gemini-key"
                            type={isKeyVisible ? 'text' : 'password'}
                            value={currentKey}
                            onChange={(e) => setCurrentKey(e.target.value)}
                            placeholder="Incolla qui la tua chiave API"
                            className="w-full p-3 pr-10 border border-gray-300 rounded-lg"
                        />
                        <button
                            type="button"
                            onClick={() => setIsKeyVisible(!isKeyVisible)}
                            className="absolute inset-y-0 right-0 px-3 flex items-center text-gray-500 hover:text-gray-700"
                        >
                            <i className={`fa-solid ${isKeyVisible ? 'fa-eye-slash' : 'fa-eye'}`}></i>
                        </button>
                    </div>
                </div>

                {saveResult && (
                    <div className={`p-3 rounded-lg text-sm ${saveResult.type === 'success' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                        {saveResult.message}
                    </div>
                )}
                {testResult && (
                    <div className={`p-3 rounded-lg text-sm ${testResult.type === 'success' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                        {testResult.message}
                    </div>
                )}

                <div className="flex justify-end items-center gap-4 pt-4 border-t">
                     <button
                        type="button"
                        onClick={handleTestConnection}
                        disabled={isTesting || isSaving}
                        className="px-4 py-2 bg-gray-500 text-white font-semibold rounded-lg hover:bg-gray-600 transition-colors disabled:bg-gray-300 w-44"
                    >
                        {isTesting ? <i className="fa-solid fa-spinner fa-spin"></i> : 'Verifica Connessione'}
                    </button>
                    <button
                        type="button"
                        onClick={handleSaveKey}
                        disabled={isSaving || isTesting}
                        className="px-4 py-2 bg-blue-600 text-white font-semibold rounded-lg hover:bg-blue-700 transition-colors disabled:bg-gray-300 w-44"
                    >
                        {isSaving ? <i className="fa-solid fa-spinner fa-spin"></i> : 'Salva Chiave'}
                    </button>
                </div>
            </div>
        </div>
    );
};

export default ApiSettings;
