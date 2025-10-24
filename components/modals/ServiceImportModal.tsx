import React, { useState, useMemo } from 'react';

type ImportStep = 1 | 2 | 3;
type RequiredFields = 'siteName' | 'employeeName' | 'monday' | 'tuesday' | 'wednesday' | 'thursday' | 'friday' | 'saturday' | 'sunday';

interface ServiceImportModalProps {
  isOpen: boolean;
  onClose: () => void;
  onImport: (services: { siteName: string; employeeName: string; workingHours: string; workingDays: string[] }[]) => void;
  isImporting: boolean;
}

const REQUIRED_FIELDS: { key: keyof Mapping; label: string; required: boolean }[] = [
    { key: 'siteName', label: 'Cantiere (Servizio)', required: true },
    { key: 'employeeName', label: 'Lavoratore', required: true },
    { key: 'monday', label: 'Lunedì', required: false },
    { key: 'tuesday', label: 'Martedì', required: false },
    { key: 'wednesday', label: 'Mercoledì', required: false },
    { key: 'thursday', label: 'Giovedì', required: false },
    { key: 'friday', label: 'Venerdì', required: false },
    { key: 'saturday', label: 'Sabato', required: false },
    { key: 'sunday', label: 'Domenica', required: false },
];

type Mapping = Record<RequiredFields, string>;

const ServiceImportModal: React.FC<ServiceImportModalProps> = ({ isOpen, onClose, onImport, isImporting }) => {
    const [step, setStep] = useState<ImportStep>(1);
    const [file, setFile] = useState<File | null>(null);
    const [separator, setSeparator] = useState<string>(';');
    const [headers, setHeaders] = useState<string[]>([]);
    const [data, setData] = useState<string[][]>([]);
    const [mapping, setMapping] = useState<Mapping>({
        siteName: '', employeeName: '', monday: '', tuesday: '', wednesday: '', thursday: '', friday: '', saturday: '', sunday: ''
    });
    const [error, setError] = useState<string>('');

    const resetState = () => {
        setStep(1);
        setFile(null);
        setSeparator(';');
        setHeaders([]);
        setData([]);
        setMapping({ siteName: '', employeeName: '', monday: '', tuesday: '', wednesday: '', thursday: '', friday: '', saturday: '', sunday: '' });
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
            const lines = text.trim().split(/[\r\n]+/).filter(line => line);
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
        reader.readAsText(selectedFile, 'ISO-8859-1');
    };
    
    const handleMappingChange = (field: keyof Mapping, header: string) => {
        setMapping(prev => ({...prev, [field]: header}));
    };

    const processImport = () => {
        const mappedIndices = Object.fromEntries(
            Object.entries(mapping).map(([field, header]) => [field, headers.indexOf(header)])
        ) as Record<keyof Mapping, number>;

        const allServices: { siteName: string; employeeName: string; workingHours: string; workingDays: string[] }[] = [];
    
        data.forEach(row => {
            const employeeName = row[mappedIndices.employeeName];
            const siteName = row[mappedIndices.siteName];
    
            if (!employeeName || !siteName) return;
    
            const hoursToDaysMap = new Map<string, string[]>();
    
            const dayMappings: { key: keyof Mapping, dayName: string }[] = [
                { key: 'monday', dayName: 'Lunedì' },
                { key: 'tuesday', dayName: 'Martedì' },
                { key: 'wednesday', dayName: 'Mercoledì' },
                { key: 'thursday', dayName: 'Giovedì' },
                { key: 'friday', dayName: 'Venerdì' },
                { key: 'saturday', dayName: 'Sabato' },
                { key: 'sunday', dayName: 'Domenica' },
            ];

            dayMappings.forEach(({ key, dayName }) => {
                const index = mappedIndices[key];
                if (index > -1 && row[index]) {
                    const workingHours = row[index].trim();
                    if (workingHours) {
                        if (!hoursToDaysMap.has(workingHours)) {
                            hoursToDaysMap.set(workingHours, []);
                        }
                        hoursToDaysMap.get(workingHours)!.push(dayName);
                    }
                }
            });
    
            for (const [workingHours, workingDays] of hoursToDaysMap.entries()) {
                allServices.push({
                    siteName,
                    employeeName,
                    workingHours,
                    workingDays,
                });
            }
        });
    
        if (allServices.length === 0) {
            setError("Nessun servizio valido trovato. Controlla la mappatura e che le ore siano inserite correttamente.");
            return;
        }

        onImport(allServices);
    };
    
    const previewData = useMemo(() => {
        if (step !== 3) return [];
        
        const mappedIndices = Object.fromEntries(
            Object.entries(mapping).map(([field, header]) => [field, headers.indexOf(header)])
        ) as Record<keyof Mapping, number>;

        return data.slice(0, 5).map(row => {
           const schedule = REQUIRED_FIELDS
                .filter(f => f.key !== 'siteName' && f.key !== 'employeeName')
                .map(f => ({
                    day: f.label.substring(0,3),
                    hours: row[mappedIndices[f.key as keyof Mapping]] || '-'
                }))
                .filter(d => d.hours !== '-')
                .map(d => `${d.day}: ${d.hours}`)
                .join(', ');

           return {
               siteName: row[mappedIndices.siteName] || 'N/A',
               employeeName: row[mappedIndices.employeeName] || 'N/A',
               schedule: schedule
           }
        });
   }, [data, mapping, headers, step]);

   const isMappingComplete = mapping.siteName && mapping.employeeName;

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex justify-center items-center" onClick={handleClose}>
      <div className="bg-white p-8 rounded-xl shadow-2xl w-full max-w-4xl" onClick={e => e.stopPropagation()}>
        <div className="flex justify-between items-center mb-6">
            <h2 className="text-2xl font-bold text-gray-800">Importa Servizi (Passo {step} di 3)</h2>
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
                    <input type="file" id="file-upload" className="hidden" accept=".csv" onChange={e => handleFileChange(e.target.files ? e.target.files[0] : null)} />
                    <label htmlFor="file-upload" className="cursor-pointer">
                        <i className="fa-solid fa-cloud-arrow-up text-5xl text-gray-400 mb-4"></i>
                        <p className="text-gray-600 font-semibold">Trascina qui il tuo file CSV o clicca per selezionare</p>
                        <p className="text-sm text-gray-500 mt-1">Il file deve contenere le colonne per Lavoratore, Cantiere e i giorni della settimana con gli orari.</p>
                    </label>
                </div>
                <div className="mt-6 text-center">
                    <label htmlFor="separator-select" className="block text-sm font-medium text-gray-700 mb-2">Separatore di campo del file:</label>
                    <select id="separator-select" value={separator} onChange={(e) => setSeparator(e.target.value)} className="w-full md:w-1/2 mx-auto p-2 border border-gray-300 rounded-lg">
                        <option value=";">Punto e virgola (;)</option>
                        <option value=",">Virgola (,)</option>
                        <option value="\t">Tabulazione (Tab)</option>
                    </select>
                </div>
            </div>
        )}

        {step === 2 && (
            <div>
                <h3 className="text-lg font-semibold text-gray-700 mb-4">Mappa le colonne del tuo file</h3>
                <fieldset disabled={isImporting}>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-x-8 gap-y-4 mb-6 p-4 border rounded-lg bg-gray-50">
                        {REQUIRED_FIELDS.map(({key, label, required}) => (
                             <div key={key}>
                                <label className="block text-sm font-medium text-gray-700 mb-1">{label} {required && <span className="text-red-500">*</span>}</label>
                                <select value={mapping[key]} onChange={(e) => handleMappingChange(key, e.target.value)} className="w-full p-2 border border-gray-300 rounded-lg">
                                    <option value="">{required ? 'Seleziona colonna...' : 'Nessuna (Opzionale)'}</option>
                                    {headers.map(header => <option key={header} value={header}>{header}</option>)}
                                </select>
                            </div>
                        ))}
                    </div>
                </fieldset>
                 <div className="mt-8 flex justify-between items-center">
                    <button type="button" onClick={() => setStep(1)} className="px-4 py-2 bg-gray-200 text-gray-800 rounded-lg hover:bg-gray-300" disabled={isImporting}>Indietro</button>
                    <button type="button" onClick={() => setStep(3)} disabled={!isMappingComplete || isImporting} className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-400">
                        Vai all'Anteprima <i className="fa-solid fa-arrow-right ml-2"></i>
                    </button>
                </div>
            </div>
        )}
        
        {step === 3 && (
            <div>
                <h3 className="text-lg font-semibold text-gray-700 mb-4">Anteprima Dati (prime 5 righe)</h3>
                <p className="text-sm text-gray-600 mb-4">Controlla che i dati siano stati interpretati correttamente. L'importazione sovrascriverà gli incarichi esistenti per i dipendenti e i cantieri trovati nel file.</p>
                <fieldset disabled={isImporting}>
                    <div className="overflow-x-auto border rounded-lg">
                        <table className="w-full text-left text-sm">
                            <thead className="bg-gray-100">
                                <tr>
                                    <th className="p-2 font-semibold">Cantiere</th>
                                    <th className="p-2 font-semibold">Dipendente</th>
                                    <th className="p-2 font-semibold">Orari Rilevati</th>
                                </tr>
                            </thead>
                            <tbody>
                                {previewData.map((row, index) => (
                                    <tr key={index} className="border-b">
                                        <td className="p-2">{row.siteName}</td>
                                        <td className="p-2">{row.employeeName}</td>
                                        <td className="p-2">{row.schedule || <span className="text-gray-400 italic">Nessun orario</span>}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </fieldset>
                 <div className="mt-8 flex justify-between items-center">
                    <button type="button" onClick={() => setStep(2)} className="px-4 py-2 bg-gray-200 text-gray-800 rounded-lg hover:bg-gray-300" disabled={isImporting}>Indietro</button>
                    <button type="button" onClick={processImport} disabled={isImporting} className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed min-w-[200px]">
                        {isImporting ? <i className="fa-solid fa-spinner fa-spin"></i> : <><i className="fa-solid fa-check mr-2"></i>Conferma e Importa</>}
                    </button>
                </div>
            </div>
        )}

      </div>
    </div>
  );
};

export default ServiceImportModal;