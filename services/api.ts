import { Employee, WorkSite, LeaveRequest, SicknessRecord, Schedule, User, ApiKey, AbsenceStatus, AbsenceType, SiteAssignment, Message, AppSetting, AttendanceRecord, ModuleVisibility, Role, MessageGroup } from '../types';

type CollectionName = 'employees' | 'sites' | 'leaveRequests' | 'sicknessRecords' | 'schedules' | 'users' | 'apiKeys' | 'messages' | 'appSettings' | 'attendances' | 'messageGroups';

type DataShape = {
    employees: Employee[];
    sites: WorkSite[];
    leaveRequests: LeaveRequest[];
    sicknessRecords: SicknessRecord[];
    attendances: AttendanceRecord[];
    schedules: Schedule[];
    users: User[];
    apiKeys: ApiKey[];
    messages: Message[];
    messageGroups: MessageGroup[];
    appSettings: AppSetting[];
};

const DB_KEY = 'coppolecchia_db';

const initialData: DataShape = {
  employees: [
    { id: 'emp-1', firstName: 'Mario', lastName: 'Rossi', role: 'Operatore', contractType: 'Tempo Indeterminato', startDate: '2022-01-15', medicalVisitExpiry: '2025-01-15', phone: '3331234567', email: 'mario.rossi@example.com', address: 'Via Garibaldi 1, 20121 Milano', notes: '' },
    { id: 'emp-2', firstName: 'Luigi', lastName: 'Verdi', role: 'Operatore', contractType: 'Tempo Determinato', startDate: '2023-06-01', endDate: '2024-12-31', medicalVisitExpiry: '2024-11-30', phone: '3337654321', email: 'luigi.verdi@example.com', address: 'Corso Vittorio Emanuele 10, 20122 Milano', notes: '' },
    { id: 'emp-3', firstName: 'Anna', lastName: 'Bianchi', role: 'Jolly', contractType: 'Tempo Indeterminato', startDate: '2021-03-20', medicalVisitExpiry: '2025-03-20', phone: '3335556677', email: 'anna.bianchi@example.com', address: 'Via Montenapoleone 8, 20121 Milano', notes: '' },
    { id: 'emp-4', firstName: 'Paolo', lastName: 'Gialli', role: 'Operatore', contractType: 'Tempo Indeterminato', startDate: '2020-02-10', medicalVisitExpiry: '2025-02-10', phone: '3471122334', email: 'paolo.gialli@example.com', address: 'Viale Monza 100, 20125 Milano', notes: '' },
    { id: 'emp-5', firstName: 'Sara', lastName: 'Neri', role: 'Operatore', contractType: 'Tempo Indeterminato', startDate: '2022-09-01', medicalVisitExpiry: '2025-09-01', phone: '3489988776', email: 'sara.neri@example.com', address: 'Via Torino 50, 20123 Milano', notes: '' },
    { id: 'emp-6', firstName: 'Luca', lastName: 'Azzurri', role: 'Jolly', contractType: 'Tempo Indeterminato', startDate: '2023-11-15', medicalVisitExpiry: '2025-11-15', phone: '3491237890', email: 'luca.azzurri@example.com', address: 'Via Lorenteggio 200, 20146 Milano', notes: '' },
  ],
  sites: [
    { id: 'site-1', name: 'Condominio Sole', client: 'Amministrazioni srl', address: 'Via Dante 15, 20121 Milano', startDate: '2023-01-01', status: 'In Corso', assignments: [
        { id: 'asg-1', employeeId: 'emp-1', workingHours: '08:00 - 12:00', workingDays: ['Lunedì', 'Mercoledì', 'Venerdì'] },
        { id: 'asg-2', employeeId: 'emp-2', workingHours: '14:00 - 18:00', workingDays: ['Martedì', 'Giovedì'] },
        { id: 'asg-3', employeeId: 'emp-4', workingHours: '09:00 - 13:00', workingDays: ['Lunedì', 'Martedì', 'Mercoledì', 'Giovedì', 'Venerdì'] },
    ]},
    { id: 'site-2', name: 'Uffici Futura', client: 'Futura SpA', address: 'Piazza Duomo 1, 20122 Milano', startDate: '2023-05-01', status: 'In Corso', assignments: [
        { id: 'asg-4', employeeId: 'emp-5', workingHours: '07:00 - 11:00', workingDays: ['Lunedì', 'Mercoledì', 'Venerdì'] },
    ]}
  ],
  leaveRequests: [
    { id: 'lr-1', employeeId: 'emp-2', type: AbsenceType.FERIE, startDate: '2024-08-05', endDate: '2024-08-09', status: AbsenceStatus.APPROVATO, reason: 'Vacanze estive' },
    { id: 'lr-2', employeeId: 'emp-4', type: AbsenceType.PERMESSO, startDate: '2024-07-25', endDate: '2024-07-25', status: AbsenceStatus.IN_ATTESA, reason: 'Visita medica' },
  ],
  sicknessRecords: [
    { id: 'sick-1', employeeId: 'emp-5', startDate: '2024-07-10', endDate: '2024-07-12', notes: 'Influenza' },
  ],
  attendances: [
    { id: 'att-1', employeeId: 'emp-1', siteId: 'site-1', timestamp: '2024-07-22T08:01:15Z', type: 'Entrata' },
    { id: 'att-2', employeeId: 'emp-1', siteId: 'site-1', timestamp: '2024-07-22T12:05:30Z', type: 'Uscita' },
    { id: 'att-3', employeeId: 'emp-4', siteId: 'site-1', timestamp: '2024-07-22T09:00:05Z', type: 'Entrata' },
    { id: 'att-4', employeeId: 'emp-4', siteId: 'site-1', timestamp: '2024-07-22T13:02:45Z', type: 'Uscita' },
    { id: 'att-5', employeeId: 'emp-2', siteId: 'site-1', timestamp: '2024-07-23T14:00:00Z', type: 'Entrata' },
  ],
  schedules: [],
  users: [
      { id: 'user-1', username: 'admin', password: 'admin', role: 'Amministratore' },
      { id: 'user-2', username: 'responsabile', password: 'resp', role: 'Responsabile' },
      { id: 'user-3', username: 'mario.rossi', password: 'test', role: 'Lavoratore', employeeId: 'emp-1' },
  ],
  apiKeys: [
      { id: 'google_gemini', name: 'Google Gemini API Key', key: 'INSERISCI_QUI_LA_TUA_CHIAVE_API_GEMINI' },
      { id: 'groq', name: 'Groq API Key', key: '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' },
      { id: 'google_maps', name: 'Google Maps API Key', key: '' },
      { id: 'open_route_service', name: 'OpenRouteService API Key', key: 'eyJvcmciOiI1YjNjZTM1OTc4NTExMTAwMDFjZjYyNDgiLCJpZCI6ImUzYmVjNGExMmI0NjRlMWU5OTQyNGE4YWRhZGIxOGUyIiwiaCI6Im11cm11cjY0In0=' },
  ],
  messages: [],
  messageGroups: [],
  appSettings: [
      { id: 'ai_provider', value: 'gemini' },
      { id: 'database_config', provider: 'local', supabaseUrl: '', supabaseKey: '', firebaseConfig: '' },
      { 
        id: 'module_visibility', 
        settings: {
          '/': ['Amministratore', 'Responsabile', 'Lavoratore'],
          '/dipendenti': ['Amministratore', 'Responsabile'],
          '/cantieri': ['Amministratore', 'Responsabile'],
          '/presenze': ['Amministratore', 'Responsabile'],
          '/lavoratori': ['Amministratore', 'Lavoratore'],
          '/assenze': ['Amministratore', 'Responsabile'],
          '/pianificazione-jolly': ['Amministratore', 'Responsabile'],
          '/trova-operatori': ['Amministratore', 'Responsabile'],
          '/impostazioni': ['Amministratore'],
        }
      } as ModuleVisibility,
  ]
};

const saveDb = (db: DataShape) => {
    try {
        localStorage.setItem(DB_KEY, JSON.stringify(db));
    } catch (e) {
        console.error("Failed to save DB to localStorage", e);
    }
};

const getDb = (): DataShape => {
    let db: DataShape | null = null;
    try {
        const dbString = localStorage.getItem(DB_KEY);
        if (dbString) {
            db = JSON.parse(dbString);
        }
    } catch (e) {
        console.error("Failed to parse DB from localStorage", e);
    }
    
    // If DB exists, run migrations for robustness
    if (db) {
        let dbWasModified = false;

        // --- Comprehensive Array Collection Migration ---
        // Ensures all top-level collections exist and are arrays.
        const arrayCollections: CollectionName[] = [
            'employees', 'sites', 'leaveRequests', 'sicknessRecords', 
            'attendances', 'schedules', 'users', 'apiKeys', 'messages', 
            'appSettings', 'messageGroups'
        ];
        
        for (const collection of arrayCollections) {
            if (!db.hasOwnProperty(collection) || !Array.isArray((db as any)[collection])) {
                console.warn(`DB Migration: Collection "${collection}" was missing or invalid. Initializing.`);
                (db as any)[collection] = initialData[collection];
                dbWasModified = true;
            }
        }
        
        // --- Deeper migration for specific items within collections ---
        
        // API Keys Migration: Ensures new API key slots are added if missing.
        const initialApiKeyMap = new Map(initialData.apiKeys.map(k => [k.id, k]));
        const existingApiKeyIds = new Set(db.apiKeys.map(k => k.id));
        for (const [id, keyObject] of initialApiKeyMap.entries()) {
            if (!existingApiKeyIds.has(id)) {
                db.apiKeys.push(keyObject);
                dbWasModified = true;
            }
        }
        
        // App Settings Migration: Ensures new settings are added if missing.
        const initialAppSettingsMap = new Map(initialData.appSettings.map(s => [s.id, s]));
        const existingAppSettingsIds = new Set(db.appSettings.map(s => s.id));
        for (const [id, settingObject] of initialAppSettingsMap.entries()) {
            if (!existingAppSettingsIds.has(id)) {
                db.appSettings.push(settingObject);
                dbWasModified = true;
            }
        }
        
        // Messages Migration: Add 'target' field to old messages
        if (db.messages.some(m => !m.target)) {
            db.messages = db.messages.map(m => {
                if (!m.target) {
                    return { ...m, target: { type: 'all' } };
                }
                return m;
            });
            dbWasModified = true;
        }

        // Specific check for '/lavoratori' module visibility (nested property)
        const visSetting = db.appSettings.find(s => s.id === 'module_visibility') as ModuleVisibility | undefined;
        if (visSetting && visSetting.settings && !visSetting.settings['/lavoratori']) {
            visSetting.settings['/lavoratori'] = ['Amministratore', 'Lavoratore'];
            dbWasModified = true;
        }

        if (dbWasModified) {
            saveDb(db);
        }
        return db;
    }

    // If nothing in localStorage or parsing fails, initialize with default data
    saveDb(initialData);
    return initialData;
};

const delay = (ms: number) => new Promise(res => setTimeout(res, ms));

// --- API Functions ---

export const getData = async <T>(collection: CollectionName): Promise<T> => {
    await delay(250); // Simulate network latency
    const db = getDb();
    return db[collection] as unknown as T;
};

export const addData = async <T, R>(collection: CollectionName, item: T): Promise<R> => {
    await delay(250);
    const db = getDb();
    // FIX: Respect pre-existing ID on the item, otherwise generate a new one.
    // This is required for creating singleton records like the 'EXTRA JOLLY' planner.
    const hasId = Object.prototype.hasOwnProperty.call(item, 'id') && (item as any).id;
    const newItem = hasId
        ? { ...(item as object) }
        : { ...item, id: `${collection.slice(0, -1)}-${Date.now()}` };

    (db[collection] as any[]).push(newItem);
    saveDb(db);
    return newItem as unknown as R;
};

export const addBatchData = async <T, R>(collection: CollectionName, items: T[]): Promise<R[]> => {
    await delay(500);
    const db = getDb();
    const newItems = items.map((item, index) => ({
        ...item,
        id: `${collection.slice(0, -1)}-${Date.now()}-${index}`,
    }));
    db[collection] = [...db[collection], ...newItems] as any;
    saveDb(db);
    return newItems as unknown as R[];
};

export const updateData = async <T extends { id: string }>(collection: CollectionName, id: string, updatedItem: T): Promise<T> => {
    await delay(250);
    const db = getDb();
    const index = (db[collection] as any[]).findIndex(i => i.id === id);
    if (index === -1) {
        throw new Error(`Item with id ${id} not found in ${collection}`);
    }
    (db[collection] as any[])[index] = updatedItem;
    saveDb(db);
    return updatedItem;
};

export const deleteData = async (collection: CollectionName, id: string): Promise<void> => {
    await delay(250);
    const db = getDb();
    const items = db[collection] as any[];
    const filteredItems = items.filter(i => i.id !== id);
    if (items.length === filteredItems.length) {
        console.warn(`Item with id ${id} not found for deletion in ${collection}`);
    }
    (db[collection] as any) = filteredItems;
    saveDb(db);
};

// --- Full DB Management ---
export const exportDbAsString = (): string => {
    return localStorage.getItem(DB_KEY) || JSON.stringify(initialData);
};

export const importDbFromString = (jsonString: string): void => {
    // Basic validation
    JSON.parse(jsonString); // Will throw an error if invalid JSON
    localStorage.setItem(DB_KEY, jsonString);
};

export const clearDb = (): void => {
    localStorage.removeItem(DB_KEY);
};