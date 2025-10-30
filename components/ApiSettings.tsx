import React, { useState, useMemo, useEffect } from 'react';
import { GoogleGenAI } from '@google/genai';
import { ApiKey } from '../types';
import * as api from '../services/api';

interface ApiSettingsProps {
    apiKeys: ApiKey[];
    setApiKeys: React.Dispatch<React.SetStateAction<ApiKey[]>>;
}

const ApiSettings: React.FC<ApiSettingsProps> = ({ apiKeys, setApiKeys }) => {
    // Gemini State
    const geminiApiKeyObject = useMemo(() => apiKeys.find(k => k.id === 'google_gemini'), [apiKeys]);
    const [geminiKey, setGeminiKey] = useState('');
    const [isGeminiKeyVisible, setIsGeminiKeyVisible] = useState(false);
    const [isTestingGemini, setIsTestingGemini] = useState(false);
    const [isSavingGemini, setIsSavingGemini] = useState(false);
    const [geminiResult, setGeminiResult] = useState<{ type: 'success' | 'error'; message: string } | null>(null);
    
    // Maps State
    const mapsApiKeyObject = useMemo(() => apiKeys.find(k => k.id === 'google_maps'), [apiKeys]);
    const [mapsKey, setMapsKey] = useState('');
    const [isMapsKeyVisible, setIsMapsKeyVisible] = useState(false);
    const [isSavingMaps, setIsSavingMaps] = useState(false);
    const [saveMapsResult, setSaveMapsResult] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

    // OpenRouteService State
    const orsApiKeyObject = useMemo(() => apiKeys.find(k => k.id === 'open_route_service'), [apiKeys]);
    const [orsKey, setOrsKey] = useState('');
    const [isOrsKeyVisible, setIsOrsKeyVisible] = useState(false);
    const [isTestingOrs, setIsTestingOrs] = useState(false);
    const [isSavingOrs, setIsSavingOrs] = useState(false);
    const [orsResult, setOrsResult] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

    const [activeDistanceService, setActiveDistanceService] = useState<'ors' | 'maps'>('ors');


    useEffect(() => {
        if (geminiApiKeyObject) setGeminiKey(geminiApiKeyObject.key);
        if (mapsApiKeyObject) setMapsKey(mapsApiKeyObject.key);
        if (orsApiKeyObject) setOrsKey(orsApiKeyObject.key);
    }, [geminiApiKeyObject, mapsApiKeyObject, orsApiKeyObject]);


    const clearResults = () => {
        setGeminiResult(null);
        setSaveMapsResult(null);
        setOrsResult(null);
    }

    const handleTestGeminiConnection = async () => {
        setIsTestingGemini(true);
        clearResults();

        if (!geminiKey.trim()) {
            setGeminiResult({ type: 'error', message: 'Inserisci una chiave API Gemini per eseguire il test.' });
            setIsTestingGemini(false);
            return;
        }

        try {
            const ai = new GoogleGenAI({ apiKey: geminiKey });
            const response = await ai.models.generateContent({
                model: 'gemini-2.5-flash',
                contents: 'Ciao',
            });
            if (response.text !== undefined) {
                 setGeminiResult({ type: 'success', message: 'Connessione riuscita! La chiave API Gemini è valida.' });
            } else {
                throw new Error("La risposta dell'API non era nel formato previsto.");
            }
        } catch (error) {
            console.error("API connection test failed:", error);
            const errorMessage = error instanceof Error ? error.message : "Errore sconosciuto";
            setGeminiResult({ type: 'error', message: `Verifica fallita: ${errorMessage}` });
        } finally {
            setIsTestingGemini(false);
        }
    };
    
    const handleTestOrsConnection = async () => {
        setIsTestingOrs(true);
        clearResults();

        if (!orsKey.trim()) {
            setOrsResult({ type: 'error', message: 'Inserisci una chiave API OpenRouteService per eseguire il test.' });
            setIsTestingOrs(false);
            return;
        }
        
        try {
             const response = await fetch(`https://api.openrouteservice.org/geocode/search?api_key=${orsKey}&text=Milano`);
            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.error?.message || `HTTP error! status: ${response.status}`);
            }
            setOrsResult({ type: 'success', message: 'Connessione riuscita! La chiave OpenRouteService è valida.' });
        } catch (error) {
            console.error("ORS connection test failed:", error);
            const errorMessage = error instanceof Error ? error.message : "Errore sconosciuto";
            setOrsResult({ type: 'error', message: `Verifica fallita: ${errorMessage}` });
        } finally {
            setIsTestingOrs(false);
        }
    };

    const handleSaveGeminiKey = async () => {
        if (!geminiApiKeyObject) return;
        setIsSavingGemini(true);
        clearResults();

        try {
            const updatedKey = { ...geminiApiKeyObject, key: geminiKey };
            const savedKey = await api.updateData<ApiKey>('apiKeys', updatedKey.id, updatedKey);
            setApiKeys(prev => prev.map(k => k.id === savedKey.id ? savedKey : k));
            setGeminiResult({ type: 'success', message: 'Chiave API Gemini salvata con successo!' });
        } catch (error) {
            console.error("Failed to save API key:", error);
            setGeminiResult({ type: 'error', message: 'Salvataggio fallito. Riprova.' });
        } finally {
            setIsSavingGemini(false);
        }
    };
    
    const handleSaveMapsKey = async () => {
        if (!mapsApiKeyObject) return;
        setIsSavingMaps(true);
        clearResults();

        try {
            const updatedKey = { ...mapsApiKeyObject, key: mapsKey };
            const savedKey = await api.updateData<ApiKey>('apiKeys', updatedKey.id, updatedKey);
            setApiKeys(prev => prev.map(k => k.id === savedKey.id ? savedKey : k));
            setSaveMapsResult({ type: 'success', message: 'Chiave API Maps salvata con successo!' });
        } catch (error) {
            console.error("Failed to save API key:", error);
            setSaveMapsResult({ type: 'error', message: 'Salvataggio fallito. Riprova.' });
        } finally {
            setIsSavingMaps(false);
        }
    };

    const handleSaveOrsKey = async () => {
        if (!orsApiKeyObject) return;
        setIsSavingOrs(true);
        clearResults();

        try {
            const updatedKey = { ...orsApiKeyObject, key: orsKey };
            const savedKey = await api.updateData<ApiKey>('apiKeys', updatedKey.id, updatedKey);
            setApiKeys(prev => prev.map(k => k.id === savedKey.id ? savedKey : k));
            setOrsResult({ type: 'success', message: 'Chiave API OpenRouteService salvata con successo!' });
        } catch (error) {
            console.error("Failed to save API key:", error);
            setOrsResult({ type: 'error', message: 'Salvataggio fallito. Riprova.' });
        } finally {
            setIsSavingOrs(false);
        }
    };

    const isAnyActionInProgress = isTestingGemini || isSavingGemini || isSavingMaps || isTestingOrs || isSavingOrs;

    return (
        <div className="bg-white p-6 rounded-xl shadow-lg max-w-2xl mx-auto space-y-8">
            <div>
                <h2 className="text-2xl font-bold text-gray-800">Impostazioni API</h2>
                <p className="text-sm text-gray-500 mt-1">Gestisci e verifica le tue chiavi API per i servizi esterni.</p>
            </div>
            
            {/* Gemini Section */}
            <div className="p-4 border rounded-lg space-y-4">
                <h3 className="text-lg font-semibold text-gray-700">{geminiApiKeyObject?.name}</h3>
                <div>
                    <div className="relative">
                        <input
                            id="gemini-key"
                            type={isGeminiKeyVisible ? 'text' : 'password'}
                            value={geminiKey}
                            onChange={(e) => setGeminiKey(e.target.value)}
                            placeholder="Incolla qui la tua chiave API"
                            className="w-full p-3 pr-10 border border-gray-300 rounded-lg"
                        />
                        <button
                            type="button"
                            onClick={() => setIsGeminiKeyVisible(!isGeminiKeyVisible)}
                            className="absolute inset-y-0 right-0 px-3 flex items-center text-gray-500 hover:text-gray-700"
                            aria-label="Mostra/Nascondi chiave"
                        >
                            <i className={`fa-solid ${isGeminiKeyVisible ? 'fa-eye-slash' : 'fa-eye'}`}></i>
                        </button>
                    </div>
                </div>

                {geminiResult && (
                    <div className={`p-3 rounded-lg text-sm ${geminiResult.type === 'success' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                        {geminiResult.message}
                    </div>
                )}

                <div className="flex justify-end items-center gap-4 pt-4 border-t">
                     <button
                        type="button"
                        onClick={handleTestGeminiConnection}
                        disabled={isAnyActionInProgress}
                        className="px-4 py-2 bg-gray-500 text-white font-semibold rounded-lg hover:bg-gray-600 transition-colors disabled:bg-gray-300 w-44"
                    >
                        {isTestingGemini ? <i className="fa-solid fa-spinner fa-spin"></i> : 'Verifica Connessione'}
                    </button>
                    <button
                        type="button"
                        onClick={handleSaveGeminiKey}
                        disabled={isAnyActionInProgress}
                        className="px-4 py-2 bg-blue-600 text-white font-semibold rounded-lg hover:bg-blue-700 transition-colors disabled:bg-gray-300 w-44"
                    >
                        {isSavingGemini ? <i className="fa-solid fa-spinner fa-spin"></i> : 'Salva Chiave'}
                    </button>
                </div>
            </div>

            {/* Distance Calculation Section */}
            <div className="p-4 border rounded-lg space-y-4">
                <h3 className="text-lg font-semibold text-gray-700">Servizio di Calcolo Distanze</h3>
                <p className="text-sm text-gray-500 -mt-3">Scegli e configura il servizio per la funzionalità "Trova Operatori".</p>
                
                <div className="flex border-b">
                    <button 
                        onClick={() => { setActiveDistanceService('ors'); clearResults(); }}
                        className={`px-4 py-2 text-sm font-medium transition-colors ${activeDistanceService === 'ors' ? 'border-b-2 border-blue-600 text-blue-600' : 'text-gray-500 hover:text-gray-700 border-b-2 border-transparent'}`}
                    >
                        OpenRouteService (Consigliato)
                    </button>
                    <button 
                        onClick={() => { setActiveDistanceService('maps'); clearResults(); }}
                        className={`px-4 py-2 text-sm font-medium transition-colors ${activeDistanceService === 'maps' ? 'border-b-2 border-blue-600 text-blue-600' : 'text-gray-500 hover:text-gray-700 border-b-2 border-transparent'}`}
                    >
                        Google Maps
                    </button>
                </div>

                {activeDistanceService === 'ors' && (
                    <div className="pt-2 space-y-4">
                         <div>
                            <div className="relative">
                                <input
                                    id="ors-key"
                                    type={isOrsKeyVisible ? 'text' : 'password'}
                                    value={orsKey}
                                    onChange={(e) => setOrsKey(e.target.value)}
                                    placeholder="Incolla qui la tua chiave API"
                                    className="w-full p-3 pr-10 border border-gray-300 rounded-lg"
                                />
                                <button
                                    type="button"
                                    onClick={() => setIsOrsKeyVisible(!isOrsKeyVisible)}
                                    className="absolute inset-y-0 right-0 px-3 flex items-center text-gray-500 hover:text-gray-700"
                                    aria-label="Mostra/Nascondi chiave"
                                >
                                    <i className={`fa-solid ${isOrsKeyVisible ? 'fa-eye-slash' : 'fa-eye'}`}></i>
                                </button>
                            </div>
                        </div>
                        
                        {orsResult && (
                            <div className={`p-3 rounded-lg text-sm ${orsResult.type === 'success' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                                {orsResult.message}
                            </div>
                        )}

                        <div className="flex justify-end items-center gap-4 pt-4 border-t">
                            <button
                                type="button"
                                onClick={handleTestOrsConnection}
                                disabled={isAnyActionInProgress}
                                className="px-4 py-2 bg-gray-500 text-white font-semibold rounded-lg hover:bg-gray-600 transition-colors disabled:bg-gray-300 w-44"
                            >
                                {isTestingOrs ? <i className="fa-solid fa-spinner fa-spin"></i> : 'Verifica Connessione'}
                            </button>
                            <button
                                type="button"
                                onClick={handleSaveOrsKey}
                                disabled={isAnyActionInProgress}
                                className="px-4 py-2 bg-blue-600 text-white font-semibold rounded-lg hover:bg-blue-700 transition-colors disabled:bg-gray-300 w-44"
                            >
                                {isSavingOrs ? <i className="fa-solid fa-spinner fa-spin"></i> : 'Salva Chiave'}
                            </button>
                        </div>
                    </div>
                )}
                
                {activeDistanceService === 'maps' && (
                    <div className="pt-2 space-y-4">
                       <div>
                            <div className="relative">
                                <input
                                    id="maps-key"
                                    type={isMapsKeyVisible ? 'text' : 'password'}
                                    value={mapsKey}
                                    onChange={(e) => setMapsKey(e.target.value)}
                                    placeholder="Incolla qui la tua chiave API"
                                    className="w-full p-3 pr-10 border border-gray-300 rounded-lg"
                                />
                                <button
                                    type="button"
                                    onClick={() => setIsMapsKeyVisible(!isMapsKeyVisible)}
                                    className="absolute inset-y-0 right-0 px-3 flex items-center text-gray-500 hover:text-gray-700"
                                    aria-label="Mostra/Nascondi chiave"
                                >
                                    <i className={`fa-solid ${isMapsKeyVisible ? 'fa-eye-slash' : 'fa-eye'}`}></i>
                                </button>
                            </div>
                        </div>

                        {saveMapsResult && (
                            <div className={`p-3 rounded-lg text-sm ${saveMapsResult.type === 'success' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                                {saveMapsResult.message}
                            </div>
                        )}
                        
                        <p className="text-xs text-gray-500 text-center">La verifica per la chiave Google Maps non è al momento disponibile.</p>

                        <div className="flex justify-end items-center gap-4 pt-4 border-t">
                            <button
                                type="button"
                                onClick={handleSaveMapsKey}
                                disabled={isAnyActionInProgress}
                                className="px-4 py-2 bg-blue-600 text-white font-semibold rounded-lg hover:bg-blue-700 transition-colors disabled:bg-gray-300 w-44"
                            >
                                {isSavingMaps ? <i className="fa-solid fa-spinner fa-spin"></i> : 'Salva Chiave'}
                            </button>
                        </div>
                    </div>
                )}
            </div>

        </div>
    );
};

export default ApiSettings;