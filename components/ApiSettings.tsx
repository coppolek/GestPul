import React, { useState, useEffect } from 'react';
import { ApiKey } from '../types';
import * as api from '../services/api';
import { GoogleGenAI } from '@google/genai';

interface ApiSettingsProps {
    apiKeys: ApiKey[];
    setApiKeys: React.Dispatch<React.SetStateAction<ApiKey[]>>;
}

const ApiSettings: React.FC<ApiSettingsProps> = ({ apiKeys, setApiKeys }) => {
    const [geminiKey, setGeminiKey] = useState('');
    const [isKeyVisible, setIsKeyVisible] = useState(false);
    const [isSaving, setIsSaving] = useState(false);
    const [saveSuccess, setSaveSuccess] = useState(false);
    const [isTesting, setIsTesting] = useState(false);
    const [testResult, setTestResult] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

    useEffect(() => {
        const keyData = apiKeys.find(k => k.id === 'google_gemini');
        if (keyData) {
            setGeminiKey(keyData.key);
        }
    }, [apiKeys]);

    const handleSave = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsSaving(true);
        setSaveSuccess(false);
        setTestResult(null);

        const originalKeyData = apiKeys.find(k => k.id === 'google_gemini');
        if (!originalKeyData) {
            console.error("Original Gemini API key data not found.");
            setIsSaving(false);
            return;
        }

        const updatedKeyData = { ...originalKeyData, key: geminiKey };

        try {
            await api.updateData('apiKeys', updatedKeyData.id, updatedKeyData);
            setApiKeys(prev => prev.map(k => k.id === 'google_gemini' ? updatedKeyData : k));
            setSaveSuccess(true);
            setTimeout(() => setSaveSuccess(false), 3000);
        } catch (error) {
            console.error("Failed to save API key", error);
            alert("Salvataggio fallito. Riprova.");
        } finally {
            setIsSaving(false);
        }
    };

    const handleTestConnection = async () => {
        if (!geminiKey) {
            setTestResult({ type: 'error', message: 'Inserisci una chiave API prima di verificare.' });
            return;
        }
        setIsTesting(true);
        setTestResult(null);
        setSaveSuccess(false);

        try {
            const ai = new GoogleGenAI({ apiKey: geminiKey });
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
            <h2 className="text-2xl font-bold text-gray-800 mb-2">Gestione API Keys</h2>
            <p className="text-sm text-gray-500 mb-6">In questa sezione puoi configurare le chiavi API necessarie per le funzionalità intelligenti dell'applicazione.</p>

            <form onSubmit={handleSave} className="space-y-6">
                <div>
                    <label htmlFor="gemini-key" className="block text-sm font-medium text-gray-700 mb-1">
                        Google Gemini API Key
                    </label>
                    <div className="relative">
                        <input
                            id="gemini-key"
                            type={isKeyVisible ? 'text' : 'password'}
                            value={geminiKey}
                            onChange={(e) => setGeminiKey(e.target.value)}
                            className="w-full p-2 pr-10 border border-gray-300 rounded-lg"
                            placeholder="Inserisci la tua chiave API"
                        />
                        <button
                            type="button"
                            onClick={() => setIsKeyVisible(!isKeyVisible)}
                            className="absolute inset-y-0 right-0 px-3 flex items-center text-gray-500 hover:text-gray-700"
                            aria-label={isKeyVisible ? "Nascondi chiave" : "Mostra chiave"}
                        >
                            <i className={`fa-solid ${isKeyVisible ? 'fa-eye-slash' : 'fa-eye'}`}></i>
                        </button>
                    </div>
                </div>

                {testResult && (
                    <div className={`p-3 rounded-lg text-sm ${testResult.type === 'success' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                        <i className={`fa-solid ${testResult.type === 'success' ? 'fa-check-circle' : 'fa-exclamation-triangle'} mr-2`}></i>
                        {testResult.message}
                    </div>
                )}


                <div className="flex justify-end items-center gap-4 pt-4 border-t">
                    {saveSuccess && (
                        <p className="text-green-600 text-sm font-semibold transition-opacity duration-300 mr-auto">
                            <i className="fa-solid fa-check-circle mr-2"></i>
                            Chiave salvata con successo!
                        </p>
                    )}
                     <button
                        type="button"
                        onClick={handleTestConnection}
                        disabled={isTesting || isSaving}
                        className="px-4 py-2 bg-gray-600 text-white font-semibold rounded-lg hover:bg-gray-700 transition-colors disabled:bg-gray-400 disabled:cursor-not-allowed w-44"
                    >
                        {isTesting ? <i className="fa-solid fa-spinner fa-spin"></i> : 'Verifica Connessione'}
                    </button>
                    <button
                        type="submit"
                        disabled={isSaving || isTesting}
                        className="px-6 py-2 bg-blue-600 text-white font-semibold rounded-lg hover:bg-blue-700 transition-colors disabled:bg-gray-400 disabled:cursor-not-allowed w-32"
                    >
                        {isSaving ? <i className="fa-solid fa-spinner fa-spin"></i> : 'Salva'}
                    </button>
                </div>
            </form>
        </div>
    );
};

export default ApiSettings;