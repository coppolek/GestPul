import React, { useState, useMemo, useEffect } from 'react';
import { GoogleGenAI } from '@google/genai';
import { ApiKey, AppSetting, AiProviderSetting } from '../types';
import * as api from '../services/api';

interface ApiSettingsProps {
    apiKeys: ApiKey[];
    setApiKeys: React.Dispatch<React.SetStateAction<ApiKey[]>>;
    appSettings: AppSetting[];
    setAppSettings: React.Dispatch<React.SetStateAction<AppSetting[]>>;
}

const ApiSettings: React.FC<ApiSettingsProps> = ({ apiKeys, setApiKeys, appSettings, setAppSettings }) => {
    // Provider State
    const aiProviderSetting = useMemo(() => appSettings.find(s => s.id === 'ai_provider') as AiProviderSetting | undefined, [appSettings]);
    
    // Gemini State
    const geminiApiKeyObject = useMemo(() => apiKeys.find(k => k.id === 'google_gemini'), [apiKeys]);
    const [geminiKey, setGeminiKey] = useState('');
    const [isGeminiKeyVisible, setIsGeminiKeyVisible] = useState(false);
    const [isTestingGemini, setIsTestingGemini] = useState(false);
    const [isSavingGemini, setIsSavingGemini] = useState(false);
    const [geminiResult, setGeminiResult] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

    // Groq State
    const groqApiKeyObject = useMemo(() => apiKeys.find(k => k.id === 'groq'), [apiKeys]);
    const [groqKey, setGroqKey] = useState('');
    const [isGroqKeyVisible, setIsGroqKeyVisible] = useState(false);
    const [isTestingGroq, setIsTestingGroq] = useState(false);
    const [isSavingGroq, setIsSavingGroq] = useState(false);
    const [groqResult, setGroqResult] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

    // OpenRouteService State
    const orsApiKeyObject = useMemo(() => apiKeys.find(k => k.id === 'open_route_service'), [apiKeys]);
    const [orsKey, setOrsKey] = useState('');
    const [isOrsKeyVisible, setIsOrsKeyVisible] = useState(false);
    const [isTestingOrs, setIsTestingOrs] = useState(false);
    const [isSavingOrs, setIsSavingOrs] = useState(false);
    const [orsResult, setOrsResult] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

    // Global Save State
    const [isSavingAll, setIsSavingAll] = useState(false);
    const [allResult, setAllResult] = useState<{ type: 'success' | 'error'; message: string } | null>(null);


    useEffect(() => {
        if (geminiApiKeyObject) setGeminiKey(geminiApiKeyObject.key);
        if (groqApiKeyObject) setGroqKey(groqApiKeyObject.key);
        if (orsApiKeyObject) setOrsKey(orsApiKeyObject.key);
    }, [geminiApiKeyObject, groqApiKeyObject, orsApiKeyObject]);


    const clearResults = () => {
        setGeminiResult(null);
        setGroqResult(null);
        setOrsResult(null);
        setAllResult(null);
    };

    const handleProviderChange = async (provider: 'gemini' | 'groq') => {
        if (!aiProviderSetting || aiProviderSetting.value === provider) return;
        
        clearResults();
        const updatedSetting = { ...aiProviderSetting, value: provider };
        try {
            const savedSetting = await api.updateData<AiProviderSetting>('appSettings', updatedSetting.id, updatedSetting);
            setAppSettings(prev => prev.map(s => s.id === savedSetting.id ? savedSetting : s));
        } catch (error) {
            console.error("Failed to update AI provider", error);
            setAllResult({ type: 'error', message: 'Impossibile salvare il provider AI.' });
        }
    };

    const handleTestGeminiConnection = async () => {
        setIsTestingGemini(true);
        setGeminiResult(null);
        setAllResult(null);

        if (!geminiKey.trim()) {
            setGeminiResult({ type: 'error', message: 'Inserisci una chiave API Gemini per eseguire il test.' });
            setIsTestingGemini(false);
            return;
        }

        try {
            const ai = new GoogleGenAI({ apiKey: geminiKey });
            const response = await ai.models.generateContent({ model: 'gemini-2.5-flash', contents: 'Ciao'});
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

    const handleTestGroqConnection = async () => {
        setIsTestingGroq(true);
        setGroqResult(null);
        setAllResult(null);

        if (!groqKey.trim()) {
            setGroqResult({ type: 'error', message: 'Inserisci una chiave API Groq per eseguire il test.' });
            setIsTestingGroq(false);
            return;
        }

        try {
            const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${groqKey}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    messages: [{ role: 'user', content: 'Ciao' }],
                    model: 'llama3-8b-8192'
                })
            });

            const data = await response.json();
            if (!response.ok) {
                throw new Error(data.error?.message || `HTTP error! status: ${response.status}`);
            }
            if (data.choices && data.choices.length > 0) {
                setGroqResult({ type: 'success', message: 'Connessione riuscita! La chiave API Groq è valida.' });
            } else {
                throw new Error("Risposta API non valida.");
            }
        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : "Errore sconosciuto";
            setGroqResult({ type: 'error', message: `Verifica fallita: ${errorMessage}` });
        } finally {
            setIsTestingGroq(false);
        }
    };
    
    const handleTestOrsConnection = async () => {
        setIsTestingOrs(true);
        setOrsResult(null);
        setAllResult(null);

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

    const handleSaveAllKeys = async () => {
        setIsSavingAll(true);
        clearResults();

        const promises = [];
        let keysHaveChanged = false;

        if (geminiApiKeyObject && geminiKey !== geminiApiKeyObject.key) {
            promises.push(api.updateData<ApiKey>('apiKeys', geminiApiKeyObject.id, { ...geminiApiKeyObject, key: geminiKey }));
            keysHaveChanged = true;
        }
         if (groqApiKeyObject && groqKey !== groqApiKeyObject.key) {
            promises.push(api.updateData<ApiKey>('apiKeys', groqApiKeyObject.id, { ...groqApiKeyObject, key: groqKey }));
            keysHaveChanged = true;
        }
        if (orsApiKeyObject && orsKey !== orsApiKeyObject.key) {
            promises.push(api.updateData<ApiKey>('apiKeys', orsApiKeyObject.id, { ...orsApiKeyObject, key: orsKey }));
            keysHaveChanged = true;
        }

        if (!keysHaveChanged) {
            setAllResult({ type: 'success', message: 'Nessuna modifica da salvare.' });
            setIsSavingAll(false);
            return;
        }

        try {
            await Promise.all(promises);
            const freshApiKeys = await api.getData<ApiKey[]>('apiKeys');
            setApiKeys(freshApiKeys);
            setAllResult({ type: 'success', message: 'Tutte le modifiche sono state salvate con successo!' });
        } catch (error) {
            console.error("Failed to save all API keys:", error);
            setAllResult({ type: 'error', message: 'Salvataggio di una o più chiavi fallito. Riprova.' });
        } finally {
            setIsSavingAll(false);
        }
    };

    const isAnyActionInProgress = isTestingGemini || isSavingGemini || isTestingGroq || isSavingGroq || isTestingOrs || isSavingOrs || isSavingAll;

    return (
        <div className="bg-white p-6 rounded-xl shadow-lg max-w-2xl mx-auto space-y-8">
            <div>
                <h2 className="text-2xl font-bold text-gray-800">Impostazioni API</h2>
                <p className="text-sm text-gray-500 mt-1">Gestisci e verifica le tue chiavi API per i servizi esterni.</p>
            </div>

            {allResult && (
                <div className={`p-3 rounded-lg text-sm mb-4 ${allResult.type === 'success' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                    {allResult.message}
                </div>
            )}
            
            {/* AI Provider Section */}
            <div className="p-4 border rounded-lg space-y-4">
                <h3 className="text-lg font-semibold text-gray-700">Servizio Assistente AI</h3>
                <p className="text-sm text-gray-500 -mt-3">Scegli e configura il servizio di intelligenza artificiale per l'assistente nella Dashboard.</p>
                
                <fieldset className="border-t pt-4">
                    <legend className="text-sm font-medium text-gray-900 mb-2">Provider Attivo</legend>
                    <div className="flex items-center gap-x-6">
                        <div className="flex items-center gap-x-2">
                            <input id="provider-gemini" name="ai-provider" type="radio" className="h-4 w-4 border-gray-300 text-blue-600 focus:ring-blue-600"
                                checked={aiProviderSetting?.value === 'gemini'} onChange={() => handleProviderChange('gemini')} />
                            <label htmlFor="provider-gemini" className="block text-sm font-medium leading-6 text-gray-900">Google Gemini</label>
                        </div>
                        <div className="flex items-center gap-x-2">
                            <input id="provider-groq" name="ai-provider" type="radio" className="h-4 w-4 border-gray-300 text-blue-600 focus:ring-blue-600"
                                checked={aiProviderSetting?.value === 'groq'} onChange={() => handleProviderChange('groq')} />
                            <label htmlFor="provider-groq" className="block text-sm font-medium leading-6 text-gray-900">Groq (Llama 3)</label>
                        </div>
                    </div>
                </fieldset>

                {aiProviderSetting?.value === 'gemini' && geminiApiKeyObject && (
                     <div className="pt-2 space-y-4">
                        <h4 className="font-semibold">{geminiApiKeyObject.name}</h4>
                        <div className="relative">
                             <input id="gemini-key" type={isGeminiKeyVisible ? 'text' : 'password'} value={geminiKey} onChange={(e) => setGeminiKey(e.target.value)} placeholder="Incolla qui la tua chiave API"
                                className="w-full p-3 pr-10 border border-gray-300 rounded-lg"/>
                            <button type="button" onClick={() => setIsGeminiKeyVisible(!isGeminiKeyVisible)} className="absolute inset-y-0 right-0 px-3 flex items-center text-gray-500 hover:text-gray-700" aria-label="Mostra/Nascondi chiave">
                                <i className={`fa-solid ${isGeminiKeyVisible ? 'fa-eye-slash' : 'fa-eye'}`}></i>
                            </button>
                        </div>
                        {geminiResult && ( <div className={`p-3 rounded-lg text-sm ${geminiResult.type === 'success' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>{geminiResult.message}</div>)}
                        <div className="flex justify-end items-center gap-4 pt-4 border-t">
                            <button type="button" onClick={handleTestGeminiConnection} disabled={isAnyActionInProgress} className="px-4 py-2 bg-gray-500 text-white font-semibold rounded-lg hover:bg-gray-600 transition-colors disabled:bg-gray-300 w-44">
                                {isTestingGemini ? <i className="fa-solid fa-spinner fa-spin"></i> : 'Verifica Chiave'}
                            </button>
                        </div>
                    </div>
                )}

                 {aiProviderSetting?.value === 'groq' && groqApiKeyObject && (
                     <div className="pt-2 space-y-4">
                        <h4 className="font-semibold">{groqApiKeyObject.name}</h4>
                        <div className="relative">
                             <input id="groq-key" type={isGroqKeyVisible ? 'text' : 'password'} value={groqKey} onChange={(e) => setGroqKey(e.target.value)} placeholder="Incolla qui la tua chiave API"
                                className="w-full p-3 pr-10 border border-gray-300 rounded-lg"/>
                            <button type="button" onClick={() => setIsGroqKeyVisible(!isGroqKeyVisible)} className="absolute inset-y-0 right-0 px-3 flex items-center text-gray-500 hover:text-gray-700" aria-label="Mostra/Nascondi chiave">
                                <i className={`fa-solid ${isGroqKeyVisible ? 'fa-eye-slash' : 'fa-eye'}`}></i>
                            </button>
                        </div>
                        {groqResult && ( <div className={`p-3 rounded-lg text-sm ${groqResult.type === 'success' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>{groqResult.message}</div>)}
                        <div className="flex justify-end items-center gap-4 pt-4 border-t">
                            <button type="button" onClick={handleTestGroqConnection} disabled={isAnyActionInProgress} className="px-4 py-2 bg-gray-500 text-white font-semibold rounded-lg hover:bg-gray-600 transition-colors disabled:bg-gray-300 w-44">
                                {isTestingGroq ? <i className="fa-solid fa-spinner fa-spin"></i> : 'Verifica Chiave'}
                            </button>
                        </div>
                    </div>
                )}
            </div>

            {/* Distance Calculation Section */}
            <div className="p-4 border rounded-lg space-y-4">
                <h3 className="text-lg font-semibold text-gray-700">Servizio di Calcolo Distanze</h3>
                <p className="text-sm text-gray-500 -mt-3">Configura il servizio per la funzionalità "Trova Operatori". OpenRouteService è gratuito e consigliato.</p>
                <div className="pt-2 space-y-4">
                    <h4 className="font-semibold">{orsApiKeyObject?.name}</h4>
                    <div className="relative">
                        <input id="ors-key" type={isOrsKeyVisible ? 'text' : 'password'} value={orsKey} onChange={(e) => setOrsKey(e.target.value)} placeholder="Incolla qui la tua chiave API"
                            className="w-full p-3 pr-10 border border-gray-300 rounded-lg"/>
                        <button type="button" onClick={() => setIsOrsKeyVisible(!isOrsKeyVisible)} className="absolute inset-y-0 right-0 px-3 flex items-center text-gray-500 hover:text-gray-700" aria-label="Mostra/Nascondi chiave">
                            <i className={`fa-solid ${isOrsKeyVisible ? 'fa-eye-slash' : 'fa-eye'}`}></i>
                        </button>
                    </div>
                    {orsResult && ( <div className={`p-3 rounded-lg text-sm ${orsResult.type === 'success' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>{orsResult.message}</div> )}
                    <div className="flex justify-end items-center gap-4 pt-4 border-t">
                        <button type="button" onClick={handleTestOrsConnection} disabled={isAnyActionInProgress} className="px-4 py-2 bg-gray-500 text-white font-semibold rounded-lg hover:bg-gray-600 transition-colors disabled:bg-gray-300 w-44">
                            {isTestingOrs ? <i className="fa-solid fa-spinner fa-spin"></i> : 'Verifica Chiave'}
                        </button>
                    </div>
                </div>
            </div>
            
            {/* Global Save Section */}
            <div className="p-4 border-t mt-8">
                <div className="flex justify-end">
                    <button type="button" onClick={handleSaveAllKeys} disabled={isAnyActionInProgress} className="px-6 py-3 bg-green-600 text-white font-bold rounded-lg hover:bg-green-700 transition-colors disabled:bg-gray-400 w-full md:w-auto">
                        {isSavingAll ? <i className="fa-solid fa-spinner fa-spin"></i> : <><i className="fa-solid fa-save mr-2"></i>Salva Tutte le Modifiche</>}
                    </button>
                </div>
            </div>
        </div>
    );
};

export default ApiSettings;