import React, { useState, useRef, useMemo, useEffect } from 'react';
import * as api from '../services/api';
import { AppSetting, DatabaseConfig } from '../types';

interface DatabaseSettingsProps {
    appSettings: AppSetting[];
    setAppSettings: React.Dispatch<React.SetStateAction<AppSetting[]>>;
}

const DatabaseSettings: React.FC<DatabaseSettingsProps> = ({ appSettings, setAppSettings }) => {
    const dbConfig = useMemo(() => appSettings.find(s => s.id === 'database_config') as DatabaseConfig | undefined, [appSettings]);
    
    // Local state for the forms
    const [provider, setProvider] = useState<'local' | 'supabase' | 'firebase' | 'mysql'>('local');
    const [supabaseUrl, setSupabaseUrl] = useState('');
    const [supabaseKey, setSupabaseKey] = useState('');
    const [firebaseConfig, setFirebaseConfig] = useState('');
    const [mysqlHost, setMysqlHost] = useState('');
    const [mysqlPort, setMysqlPort] = useState('3306');
    const [mysqlUser, setMysqlUser] = useState('');
    const [mysqlPassword, setMysqlPassword] = useState('');
    const [mysqlDatabase, setMysqlDatabase] = useState('');


    // State for local DB management
    const [isLocalLoading, setIsLocalLoading] = useState(false);
    const [localFeedback, setLocalFeedback] = useState<{ type: 'success' | 'error', message: string } | null>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);

    // State for remote DB management
    const [isRemoteLoading, setIsRemoteLoading] = useState(false);
    const [remoteFeedback, setRemoteFeedback] = useState<{ type: 'success' | 'error', message: string } | null>(null);

    useEffect(() => {
        if (dbConfig) {
            setProvider(dbConfig.provider);
            setSupabaseUrl(dbConfig.supabaseUrl || '');
            setSupabaseKey(dbConfig.supabaseKey || '');
            setFirebaseConfig(dbConfig.firebaseConfig || '');
            setMysqlHost(dbConfig.mysqlHost || '');
            setMysqlPort(dbConfig.mysqlPort || '3306');
            setMysqlUser(dbConfig.mysqlUser || '');
            setMysqlPassword(dbConfig.mysqlPassword || '');
            setMysqlDatabase(dbConfig.mysqlDatabase || '');
        }
    }, [dbConfig]);

    const handleSaveRemoteConfig = async () => {
        if (!dbConfig) return;
        setIsRemoteLoading(true);
        setRemoteFeedback(null);
        
        const newConfig: DatabaseConfig = {
            ...dbConfig,
            provider,
            supabaseUrl,
            supabaseKey,
            firebaseConfig,
            mysqlHost,
            mysqlPort,
            mysqlUser,
            mysqlPassword,
            mysqlDatabase
        };

        try {
            const savedSetting = await api.updateData<DatabaseConfig>('appSettings', newConfig.id, newConfig);
            setAppSettings(prev => prev.map(s => s.id === savedSetting.id ? savedSetting : s));
            setRemoteFeedback({ type: 'success', message: 'Configurazione salvata con successo. Potrebbe essere necessario ricaricare la pagina per applicare le modifiche.' });
        } catch (error) {
            console.error("Failed to save DB config", error);
            setRemoteFeedback({ type: 'error', message: 'Salvataggio fallito.' });
        } finally {
            setIsRemoteLoading(false);
        }
    };

    const handleTestConnection = async () => {
        setIsRemoteLoading(true);
        setRemoteFeedback(null);
        try {
            if (provider === 'supabase') {
                if (!supabaseUrl || !supabaseKey) throw new Error("URL e Chiave Anon sono obbligatori.");
                const response = await fetch(supabaseUrl, { headers: { 'apikey': supabaseKey } });
                if (!response.ok) throw new Error(`Connessione fallita con stato: ${response.status}`);
                setRemoteFeedback({ type: 'success', message: 'Test di connessione a Supabase riuscito!' });
            } else if (provider === 'firebase') {
                 if (!firebaseConfig) throw new Error("L'oggetto di configurazione è obbligatorio.");
                 JSON.parse(firebaseConfig); // Test if it's valid JSON
                 setRemoteFeedback({ type: 'success', message: 'Il formato della configurazione Firebase è valido. (Test di connessione reale non supportato in questa demo).' });
            } else if (provider === 'mysql') {
                if (!mysqlHost || !mysqlUser || !mysqlDatabase) throw new Error("Host, Utente e Nome Database sono obbligatori.");

                const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
                const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

                const response = await fetch(`${supabaseUrl}/functions/v1/test-mysql-connection`, {
                    method: 'POST',
                    headers: {
                        'Authorization': `Bearer ${anonKey}`,
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({
                        host: mysqlHost,
                        port: mysqlPort,
                        user: mysqlUser,
                        password: mysqlPassword,
                        database: mysqlDatabase,
                    }),
                });

                const result = await response.json();
                if (result.success) {
                    setRemoteFeedback({ type: 'success', message: result.message });
                } else {
                    setRemoteFeedback({ type: 'error', message: result.message });
                }
            }
        } catch (error: any) {
            setRemoteFeedback({ type: 'error', message: `Test fallito: ${error.message}` });
        } finally {
            setIsRemoteLoading(false);
        }
    };

    const handleExportLocal = () => {
        setIsLocalLoading(true);
        setLocalFeedback(null);
        try {
            const dbString = api.exportDbAsString();
            const blob = new Blob([dbString], { type: 'application/json' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            const date = new Date().toISOString().split('T')[0];
            a.download = `coppolecchia_backup_locale_${date}.json`;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);
            setLocalFeedback({ type: 'success', message: 'Database locale esportato con successo.' });
        } catch (error) {
            console.error("Export failed:", error);
            setLocalFeedback({ type: 'error', message: 'Esportazione fallita.' });
        } finally {
            setIsLocalLoading(false);
        }
    };

    const handleFileChangeLocal = (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (file) {
            if (!window.confirm("Sei sicuro di voler importare questo file? L'operazione sovrascriverà TUTTI i dati locali attuali e non è reversibile.")) {
                if (fileInputRef.current) {
                    fileInputRef.current.value = "";
                }
                return;
            }
            setIsLocalLoading(true);
            setLocalFeedback(null);
            const reader = new FileReader();
            reader.onload = (e) => {
                try {
                    const content = e.target?.result as string;
                    api.importDbFromString(content);
                    setLocalFeedback({ type: 'success', message: "Importazione completata. L'applicazione verrà ricaricata." });
                    setTimeout(() => window.location.reload(), 2000);
                } catch (error) {
                    console.error("Import failed:", error);
                    setLocalFeedback({ type: 'error', message: 'Importazione fallita. Il file potrebbe essere corrotto o non valido.' });
                    setIsLocalLoading(false);
                }
            };
            reader.onerror = () => {
                 setLocalFeedback({ type: 'error', message: 'Errore nella lettura del file.' });
                 setIsLocalLoading(false);
            }
            reader.readAsText(file);
        }
    };
    
    const handleClearLocal = () => {
        if (window.confirm("ATTENZIONE! Stai per cancellare l'intero database locale. Questa azione è IRREVERSIBILE. Sei assolutamente sicuro di voler procedere?")) {
            setIsLocalLoading(true);
            setLocalFeedback(null);
            try {
                api.clearDb();
                setLocalFeedback({ type: 'success', message: "Database locale svuotato. L'applicazione verrà ricaricata." });
                setTimeout(() => window.location.reload(), 2000);
            } catch(error) {
                console.error("Clear DB failed:", error);
                setLocalFeedback({ type: 'error', message: 'Operazione fallita.' });
                setIsLocalLoading(false);
            }
        }
    };

    return (
        <div className="space-y-8">
            <div className="bg-white p-6 rounded-xl shadow-lg max-w-3xl mx-auto space-y-6">
                 <div>
                    <h2 className="text-2xl font-bold text-gray-800">Connessione Database Esterno</h2>
                    <p className="text-sm text-gray-500 mt-1">Collega a un database Supabase o Firebase per condividere i dati. Attualmente in uso: <span className="font-semibold text-blue-600">{dbConfig?.provider}</span></p>
                </div>

                {remoteFeedback && (
                    <div className={`p-3 rounded-lg text-sm ${remoteFeedback.type === 'success' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>{remoteFeedback.message}</div>
                )}
                
                <fieldset disabled={isRemoteLoading}>
                    <div>
                        <label htmlFor="db-provider" className="block text-sm font-medium text-gray-700 mb-1">Provider Database</label>
                        <select id="db-provider" value={provider} onChange={(e) => setProvider(e.target.value as any)} className="w-full p-2 border border-gray-300 rounded-lg bg-white">
                            <option value="local">Locale (Memoria del Browser)</option>
                            <option value="mysql">MySQL</option>
                            <option value="supabase">Supabase</option>
                            <option value="firebase">Firebase</option>
                        </select>
                    </div>
                    
                    {provider === 'mysql' && (
                        <div className="space-y-4 p-4 border-t mt-4">
                            <h3 className="font-semibold">Configurazione MySQL</h3>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div>
                                    <label htmlFor="mysql-host" className="block text-sm font-medium text-gray-700 mb-1">Host</label>
                                    <input id="mysql-host" type="text" value={mysqlHost} onChange={e => setMysqlHost(e.target.value)} placeholder="localhost" className="w-full p-2 border border-gray-300 rounded-lg"/>
                                </div>
                                <div>
                                    <label htmlFor="mysql-port" className="block text-sm font-medium text-gray-700 mb-1">Porta</label>
                                    <input id="mysql-port" type="text" value={mysqlPort} onChange={e => setMysqlPort(e.target.value)} placeholder="3306" className="w-full p-2 border border-gray-300 rounded-lg"/>
                                </div>
                                <div>
                                    <label htmlFor="mysql-user" className="block text-sm font-medium text-gray-700 mb-1">Utente</label>
                                    <input id="mysql-user" type="text" value={mysqlUser} onChange={e => setMysqlUser(e.target.value)} placeholder="root" className="w-full p-2 border border-gray-300 rounded-lg"/>
                                </div>
                                <div>
                                    <label htmlFor="mysql-password" className="block text-sm font-medium text-gray-700 mb-1">Password</label>
                                    <input id="mysql-password" type="password" value={mysqlPassword} onChange={e => setMysqlPassword(e.target.value)} className="w-full p-2 border border-gray-300 rounded-lg"/>
                                </div>
                            </div>
                             <div>
                                <label htmlFor="mysql-database" className="block text-sm font-medium text-gray-700 mb-1">Nome Database</label>
                                <input id="mysql-database" type="text" value={mysqlDatabase} onChange={e => setMysqlDatabase(e.target.value)} placeholder="coppolecchia_db" className="w-full p-2 border border-gray-300 rounded-lg"/>
                            </div>
                            <p className="text-xs text-gray-500">Queste credenziali verranno utilizzate dal backend per connettersi al database MySQL.</p>
                        </div>
                    )}

                    {provider === 'supabase' && (
                        <div className="space-y-4 p-4 border-t mt-4">
                            <h3 className="font-semibold">Configurazione Supabase</h3>
                            <div>
                                <label htmlFor="supabase-url" className="block text-sm font-medium text-gray-700 mb-1">Supabase URL</label>
                                <input id="supabase-url" type="text" value={supabaseUrl} onChange={e => setSupabaseUrl(e.target.value)} placeholder="https://xyz.supabase.co" className="w-full p-2 border border-gray-300 rounded-lg"/>
                            </div>
                             <div>
                                <label htmlFor="supabase-key" className="block text-sm font-medium text-gray-700 mb-1">Supabase Anon Key</label>
                                <input id="supabase-key" type="password" value={supabaseKey} onChange={e => setSupabaseKey(e.target.value)} placeholder="eyJ..." className="w-full p-2 border border-gray-300 rounded-lg"/>
                            </div>
                             <p className="text-xs text-gray-500">Trovi queste informazioni in "Project Settings" &gt; "API" nel tuo progetto Supabase.</p>
                        </div>
                    )}

                    {provider === 'firebase' && (
                        <div className="space-y-4 p-4 border-t mt-4">
                            <h3 className="font-semibold">Configurazione Firebase</h3>
                             <div>
                                <label htmlFor="firebase-config" className="block text-sm font-medium text-gray-700 mb-1">Oggetto di configurazione Firebase</label>
                                <textarea id="firebase-config" value={firebaseConfig} onChange={e => setFirebaseConfig(e.target.value)} rows={6} placeholder={`{\n  "apiKey": "...",\n  "authDomain": "...",\n  ...\n}`} className="w-full p-2 border border-gray-300 rounded-lg font-mono text-sm"/>
                            </div>
                            <p className="text-xs text-gray-500">Incolla l'intero oggetto `firebaseConfig` da "Project Settings" &gt; "General" &gt; "Your apps" nel tuo progetto Firebase.</p>
                        </div>
                    )}
                </fieldset>
                
                <div className="flex justify-end items-center gap-4 pt-4 border-t">
                    <button onClick={handleTestConnection} disabled={isRemoteLoading || provider === 'local'} className="px-4 py-2 bg-gray-500 text-white font-semibold rounded-lg hover:bg-gray-600 disabled:bg-gray-300">
                        {isRemoteLoading ? <i className="fa-solid fa-spinner fa-spin"></i> : 'Test Connessione'}
                    </button>
                    <button onClick={handleSaveRemoteConfig} disabled={isRemoteLoading} className="px-4 py-2 bg-blue-600 text-white font-semibold rounded-lg hover:bg-blue-700 disabled:bg-gray-300">
                        {isRemoteLoading ? <i className="fa-solid fa-spinner fa-spin"></i> : 'Salva Configurazione'}
                    </button>
                </div>
            </div>
            
            <div className="bg-white p-6 rounded-xl shadow-lg max-w-3xl mx-auto space-y-6">
                 <div>
                    <h2 className="text-2xl font-bold text-gray-800">Gestione Dati Locali</h2>
                    <p className="text-sm text-gray-500 mt-1">Esporta, importa o resetta i dati salvati nella memoria di questo browser.</p>
                </div>
                
                {localFeedback && (
                    <div className={`p-3 rounded-lg text-sm ${localFeedback.type === 'success' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                        {localFeedback.message}
                    </div>
                )}

                <div className="p-4 border rounded-lg space-y-3">
                    <h3 className="text-lg font-semibold text-gray-700">Backup e Ripristino</h3>
                    <div className="flex flex-wrap gap-4 items-center">
                         <button onClick={handleExportLocal} disabled={isLocalLoading} className="px-4 py-2 bg-blue-600 text-white font-semibold rounded-lg hover:bg-blue-700 disabled:bg-gray-400">
                            <i className="fa-solid fa-download mr-2"></i>Esporta Dati Locali
                        </button>
                         <input type="file" accept=".json" onChange={handleFileChangeLocal} ref={fileInputRef} disabled={isLocalLoading} className="block w-full max-w-xs text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100" />
                    </div>
                </div>

                <div className="p-4 border border-red-300 bg-red-50 rounded-lg">
                    <h3 className="text-lg font-semibold text-red-800">Azione Pericolosa</h3>
                    <p className="text-sm text-red-700 mt-1 mb-3"><span className="font-bold">Azione irreversibile:</span> Rimuove tutti i dati locali e riporta l'applicazione allo stato iniziale.</p>
                    <button onClick={handleClearLocal} disabled={isLocalLoading} className="px-4 py-2 bg-red-600 text-white font-semibold rounded-lg hover:bg-red-700 disabled:bg-gray-400">
                        <i className="fa-solid fa-trash-alt mr-2"></i>Svuota Dati Locali
                    </button>
                </div>
            </div>
        </div>
    );
};

export default DatabaseSettings;