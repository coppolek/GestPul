import React, { useState, useMemo, useEffect } from 'react';
import { AppSetting, ModuleVisibility, Role } from '../types';
import * as api from '../services/api';

// This list defines the modules that can be configured.
// It should be kept in sync with the main navigation items in App.tsx.
const CONFIGURABLE_MODULES = [
    { path: '/', label: 'Dashboard' },
    { path: '/dipendenti', label: 'Dipendenti' },
    { path: '/cantieri', label: 'Cantieri' },
    { path: '/presenze', label: 'Presenze' },
    { path: '/assenze', label: 'Assenze' },
    { path: '/pianificazione-jolly', label: 'Pianificazione Jolly' },
    { path: '/trova-operatori', label: 'Trova Operatori' },
    { path: '/impostazioni', label: 'Impostazioni' },
];

const ALL_ROLES: Role[] = ['Amministratore', 'Responsabile', 'Lavoratore'];

interface ModuleSettingsProps {
    appSettings: AppSetting[];
    setAppSettings: React.Dispatch<React.SetStateAction<AppSetting[]>>;
}

const ModuleSettings: React.FC<ModuleSettingsProps> = ({ appSettings, setAppSettings }) => {
    const moduleVisibilitySetting = useMemo(() => appSettings.find(s => s.id === 'module_visibility') as ModuleVisibility | undefined, [appSettings]);
    
    const [settings, setSettings] = useState<ModuleVisibility['settings']>({});
    const [isSaving, setIsSaving] = useState(false);
    const [feedback, setFeedback] = useState<{ type: 'success' | 'error', message: string } | null>(null);

    useEffect(() => {
        if (moduleVisibilitySetting) {
            setSettings(moduleVisibilitySetting.settings);
        }
    }, [moduleVisibilitySetting]);

    const handleCheckboxChange = (path: string, role: Role, isChecked: boolean) => {
        setFeedback(null);
        setSettings(prev => {
            const currentRoles = prev[path] || [];
            if (isChecked) {
                // Add role if not present
                return { ...prev, [path]: [...new Set([...currentRoles, role])] };
            } else {
                // Remove role
                return { ...prev, [path]: currentRoles.filter(r => r !== role) };
            }
        });
    };

    const handleSave = async () => {
        if (!moduleVisibilitySetting) return;

        setIsSaving(true);
        setFeedback(null);
        try {
            const updatedSetting: ModuleVisibility = { ...moduleVisibilitySetting, settings };
            const savedSetting = await api.updateData<ModuleVisibility>('appSettings', updatedSetting.id, updatedSetting);
            setAppSettings(prev => prev.map(s => s.id === savedSetting.id ? savedSetting : s));
            setFeedback({ type: 'success', message: 'Impostazioni di visibilità salvate con successo.' });
        } catch (error) {
            console.error("Failed to save module visibility settings", error);
            setFeedback({ type: 'error', message: 'Salvataggio fallito. Riprova.' });
        } finally {
            setIsSaving(false);
        }
    };

    return (
        <div className="bg-white p-6 rounded-xl shadow-lg max-w-4xl mx-auto">
            <div className="flex justify-between items-start mb-6 gap-4 flex-wrap">
                <div>
                    <h2 className="text-2xl font-bold text-gray-800">Visibilità Moduli per Ruolo</h2>
                    <p className="text-sm text-gray-500 mt-1">
                        Configura quali sezioni del menù laterale sono visibili per ciascun tipo di utente.
                    </p>
                </div>
                <button
                    onClick={handleSave}
                    disabled={isSaving}
                    className="px-6 py-2 bg-blue-600 text-white font-semibold rounded-lg hover:bg-blue-700 disabled:bg-gray-400 min-w-[120px]"
                >
                    {isSaving ? <i className="fa-solid fa-spinner fa-spin"></i> : 'Salva'}
                </button>
            </div>
            
            {feedback && (
                <div className={`p-3 rounded-lg text-sm mb-4 ${feedback.type === 'success' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                    {feedback.message}
                </div>
            )}

            <div className="overflow-x-auto">
                <table className="w-full text-left">
                    <thead className="bg-gray-50">
                        <tr>
                            <th className="p-3 font-semibold text-gray-600">Modulo</th>
                            {ALL_ROLES.map(role => (
                                <th key={role} className="p-3 font-semibold text-gray-600 text-center">{role}</th>
                            ))}
                        </tr>
                    </thead>
                    <tbody>
                        {CONFIGURABLE_MODULES.map(({ path, label }) => (
                            <tr key={path} className="border-b hover:bg-gray-50">
                                <td className="p-3 font-medium text-gray-800">{label}</td>
                                {ALL_ROLES.map(role => (
                                    <td key={role} className="p-3 text-center">
                                        <input
                                            type="checkbox"
                                            className="h-5 w-5 rounded border-gray-300 text-blue-600 focus:ring-blue-500 disabled:cursor-not-allowed"
                                            checked={settings[path]?.includes(role) || false}
                                            onChange={(e) => handleCheckboxChange(path, role, e.target.checked)}
                                            // Admin cannot remove its own access to settings
                                            disabled={isSaving || (role === 'Amministratore' && path === '/impostazioni')}
                                        />
                                    </td>
                                ))}
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
};

export default ModuleSettings;
