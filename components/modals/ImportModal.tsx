import React, { useState, useMemo } from 'react';
import { Employee } from '../../types';

type ImportStep = 1 | 2;
type RequiredFields = 'firstName' | 'lastName' | 'role' | 'address';

interface ImportModalProps {
  isOpen: boolean;
  onClose: () => void;
  onImport: (employees: Omit<Employee, 'id'>[]) => void;
  isImporting: boolean;
}

const REQUIRED_FIELDS: { key: RequiredFields; label: string }[] = [
    { key: 'firstName', label: 'Nome' },
    { key: 'lastName', label: 'Cognome' },
    { key: 'role', label: 'Ruolo (Jolly/Operatore)' },
    { key: 'address', label: 'Indirizzo di Residenza' },
];

const ImportModal: React.FC<ImportModalProps> = ({ isOpen, onClose, onImport, isImporting }) => {
    const [step, setStep] = useState<ImportStep>(1);
    const [file, setFile] = useState<File | null>(null);
    const [separator, setSeparator] = useState<string>(',');
    const [headers, setHeaders] = useState<string[]>([]);
    const [data, setData] = useState<string[][]>([]);
    const [mapping, setMapping] = useState<Record<RequiredFields, string>>({
        firstName: '',
        lastName: '',
        role: '',
        address: '',
    });
    const [error, setError] = useState<string>('');

    const resetState = () => {
        setStep(1);
        setFile(null);
        setSeparator(',');
        setHeaders([]);
        setData([]);
        setMapping({ firstName: '', lastName: '', role: '', address: '' });
        setError('');
    };

    const handleClose = () => {
        if (isImporting) return;
        resetState();
        onClose();
    };
    
    const handleFileChange = (selectedFile: File | null) => {
        if (!selectedFile) return;
        
        if (!selectedFile.name.endsWith('.csv')) {
            setError('Formato file non supportato. Si prega di caricare un file CSV.');
            return;
        }

        const reader = new FileReader();
        reader.onload = (e) => {
            const text = e.target?.result as string;
            const lines = text.trim().split('\n');
            if (lines.length < 2) {
                setError('Il file è vuoto o contiene solo l\'intestazione.');
                return;
            }
            
            const fileHeaders = lines[0].split(separator).map(h => h.trim().replace(/"/g, ''));
            const fileData = lines.slice(1).map(line => line.split(separator).map(d => d.trim().replace(/"/g, '')));

            setHeaders(fileHeaders);
            setData(fileData);
            setFile(selectedFile);
            setError('');
            setStep(2);
        };
        reader.onerror = () => setError('Errore durante la lettura del file.');
        reader.readAsText(selectedFile);
    };

    const handleMappingChange = (field: RequiredFields, header: string) => {
        setMapping(prev => ({...prev, [field]: header}));
    };

    const processImport = () => {
        const mappedIndices = Object.fromEntries(
            Object.entries(mapping).map(([field, header]) => [field, headers.indexOf(header)])
        );

        if (Object.values(mappedIndices).some(index => index === -1)) {
            setError('Mappare tutte le colonne richieste.');
            return;
        }

        const importedEmployees = data.map(row => {
            const roleValue = row[mappedIndices.role]?.toLowerCase();
            return {
                firstName: row[mappedIndices.firstName] || '',
                lastName: row[mappedIndices.lastName] || '',
                role: roleValue === 'jolly' ? 'Jolly' : 'Operatore',
                address: row[mappedIndices.address] || '',
            };
        }).filter(emp => emp.firstName && emp.lastName); // Filter out empty rows

        onImport(importedEmployees as any);
    };

    const previewData = useMemo(() => {
         const mappedIndices = Object.fromEntries(
            Object.entries(mapping).map(([field, header]) => [field, headers.indexOf(header)])
        );
        return data.slice(0, 5).map(row => ({
            firstName: row[mappedIndices.firstName] || 'N/A',
            lastName: row[mappedIndices.lastName] || 'N/A',
            role: row[mappedIndices.role] || 'N/A',
            address: row[mappedIndices.address] || 'N/A',
        }));
    }, [data, mapping, headers]);


  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex justify-center items-center" onClick={handleClose}>
      <div className="bg-white p-8 rounded-xl shadow-2xl w-full max-w-3xl" onClick={e => e.stopPropagation()}>
        <div className="flex justify-between items-center mb-6">
            <h2 className="text-2xl font-bold text-gray-800">Importa Dipendenti (Passo {step} di 2)</h2>
            <button onClick={handleClose} className="text-gray-500 hover:text-gray-800 text-2xl" disabled={isImporting}>&times;</button>
        </div>
        
        {error && <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded relative mb-4" role="alert">{error}</div>}

        {step === 1 && (
            <div>
                 <div 
                    className="border-2 border-dashed border-gray-300 rounded-lg p-12 text-center cursor-pointer hover:border-blue-500 hover:bg-gray-50"
                    onDragOver={e => e.preventDefault()}
                    onDrop={e => {
                        e.preventDefault();
                        handleFileChange(e.dataTransfer.files[0]);
                    }}
                >
                    <input 
                        type="file" 
                        id="file-upload" 
                        className="hidden" 
                        accept=".csv" 
                        onChange={e => handleFileChange(e.target.files ? e.target.files[0] : null)}
                    />
                    <label htmlFor="file-upload" className="cursor-pointer">
                        <i className="fa-solid fa-cloud-arrow-up text-5xl text-gray-400 mb-4"></i>
                        <p className="text-gray-600 font-semibold">Trascina qui il tuo file CSV o clicca per selezionare</p>
                        <p className="text-sm text-gray-500 mt-1">Il file deve contenere almeno le colonne: nome, cognome, ruolo, indirizzo.</p>
                    </label>
                </div>
                <div className="mt-6 text-center">
                    <label htmlFor="separator-select" className="block text-sm font-medium text-gray-700 mb-2">Seleziona il separatore di campo del file:</label>
                    <select
                        id="separator-select"
                        value={separator}
                        onChange={(e) => setSeparator(e.target.value)}
                        className="w-full md:w-1/2 mx-auto p-2 border border-gray-300 rounded-lg"
                    >
                        <option value=",">Virgola (,)</option>
                        <option value=";">Punto e virgola (;)</option>
                        <option value="\t">Tabulazione (Tab)</option>
                    </select>
                </div>
            </div>
        )}

        {step === 2 && (
            <div>
                <h3 className="text-lg font-semibold text-gray-700 mb-4">Mappa le colonne del tuo file</h3>
                <fieldset disabled={isImporting}>
                    <div className="grid grid-cols-2 gap-x-8 gap-y-4 mb-6 p-4 border rounded-lg bg-gray-50">
                        {REQUIRED_FIELDS.map(({key, label}) => (
                             <div key={key}>
                                <label className="block text-sm font-medium text-gray-700 mb-1">{label}</label>
                                <select 
                                    value={mapping[key]} 
                                    onChange={(e) => handleMappingChange(key, e.target.value)}
                                    className="w-full p-2 border border-gray-300 rounded-lg"
                                >
                                    <option value="">Seleziona colonna...</option>
                                    {headers.map(header => <option key={header} value={header}>{header}</option>)}
                                </select>
                            </div>
                        ))}
                    </div>

                    <h3 className="text-lg font-semibold text-gray-700 mb-4">Anteprima Dati (prime 5 righe)</h3>
                    <div className="overflow-x-auto border rounded-lg">
                        <table className="w-full text-left text-sm">
                            <thead className="bg-gray-100">
                                <tr>
                                    <th className="p-2">Nome</th>
                                    <th className="p-2">Cognome</th>
                                    <th className="p-2">Ruolo</th>
                                    <th className="p-2">Indirizzo</th>
                                </tr>
                            </thead>
                            <tbody>
                                {previewData.map((row, index) => (
                                    <tr key={index} className="border-b">
                                        <td className="p-2">{row.firstName}</td>
                                        <td className="p-2">{row.lastName}</td>
                                        <td className="p-2">{row.role}</td>
                                        <td className="p-2">{row.address}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </fieldset>
                 <div className="mt-8 flex justify-between items-center">
                    <button type="button" onClick={() => setStep(1)} className="px-4 py-2 bg-gray-200 text-gray-800 rounded-lg hover:bg-gray-300" disabled={isImporting}>Indietro</button>
                    <button type="button" onClick={processImport} disabled={Object.values(mapping).some(v => !v) || isImporting} className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed min-w-[200px]">
                        {isImporting ? <i className="fa-solid fa-spinner fa-spin"></i> : <><i className="fa-solid fa-check mr-2"></i>Conferma e Importa</>}
                    </button>
                </div>
            </div>
        )}
      </div>
    </div>
  );
};

export default ImportModal;