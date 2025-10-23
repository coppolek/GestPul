import { Employee, WorkSite, LeaveRequest, SicknessRecord, AbsenceStatus, AbsenceType, SiteAssignment, Schedule, User, ApiKey } from '../types';

const SIMULATED_LATENCY = 500;

// --- Initial Data Setup ---
const formatDate = (date: Date) => date.toISOString().split('T')[0];
const today = new Date();

const initialEmployees: Employee[] = [
  { id: 'emp-1', firstName: 'Mario', lastName: 'Rossi', role: 'Operatore', contractType: 'Tempo Indeterminato', startDate: '2022-01-15', medicalVisitExpiry: formatDate(new Date(today.getFullYear(), today.getMonth() + 2, 10)), phone: '3331234567', email: 'mario.rossi@example.com', address: 'Via Roma 1, Milano' },
  { id: 'emp-2', firstName: 'Luigi', lastName: 'Verdi', role: 'Operatore', contractType: 'Tempo Determinato', startDate: '2023-05-20', endDate: formatDate(new Date(today.getFullYear(), today.getMonth() + 1, 15)), medicalVisitExpiry: formatDate(new Date(today.getFullYear(), today.getMonth() + 6, 5)), phone: '3332345678', email: 'luigi.verdi@example.com', address: 'Via Milano 2, Roma' },
  { id: 'emp-3', firstName: 'Giovanni', lastName: 'Bianchi', role: 'Jolly', contractType: 'Tempo Indeterminato', startDate: '2021-11-01', medicalVisitExpiry: formatDate(new Date(today.getFullYear() + 1, today.getMonth(), 20)), phone: '3333456789', email: 'giovanni.bianchi@example.com', address: 'Via Torino 3, Napoli' },
  { id: 'emp-4', firstName: 'Paolo', lastName: 'Neri', role: 'Operatore', contractType: 'Tempo Indeterminato', startDate: '2023-02-10', medicalVisitExpiry: formatDate(new Date(today.getFullYear(), today.getMonth(), today.getDate() + 5)), phone: '3334567890', email: 'paolo.neri@example.com', address: 'Via Venezia 4, Firenze' },
  { id: 'emp-5', firstName: 'Francesca', lastName: 'Gialli', role: 'Impiegato', contractType: 'Tempo Indeterminato', startDate: '2020-03-12', medicalVisitExpiry: formatDate(new Date(today.getFullYear() + 1, today.getMonth() + 3, 1)), phone: '3335678901', email: 'francesca.gialli@example.com', address: 'Via Bologna 5, Bari' },
  { id: 'emp-6', firstName: 'Anna', lastName: 'Bruni', role: 'Jolly', contractType: 'Tempo Determinato', startDate: '2024-01-02', endDate: '2024-12-31', medicalVisitExpiry: '2024-11-30', phone: '3336789012', email: 'anna.bruni@example.com', address: 'Via Genova 6, Palermo' },
];

const initialAssignments: SiteAssignment[] = [
    { employeeId: 'emp-1', workingHours: '08:00 - 17:00', workingDays: ['Lunedì', 'Martedì', 'Mercoledì', 'Giovedì', 'Venerdì'] },
    { employeeId: 'emp-2', workingHours: '08:00 - 17:00', workingDays: ['Lunedì', 'Martedì', 'Mercoledì', 'Giovedì', 'Venerdì'] },
];

const initialSites: WorkSite[] = [
  { id: 'site-1', name: 'Cantiere A - Condominio', client: 'Amministrazioni XYZ', address: 'Via Garibaldi 10, Milano', startDate: '2023-09-01', status: 'In Corso', assignments: initialAssignments },
  { id: 'site-2', name: 'Cantiere B - Villetta', client: 'Privato', address: 'Via Mazzini 20, Roma', startDate: '2024-02-15', status: 'In Corso', assignments: [] },
  { id: 'site-3', name: 'Cantiere C - Uffici', client: 'Azienda ABC', address: 'Corso Vittorio Emanuele 30, Torino', startDate: '2023-06-01', endDate: '2023-12-31', status: 'Completato', assignments: [] },
];

const initialLeaveRequests: LeaveRequest[] = [
    { id: 'lr-1', employeeId: 'emp-4', type: AbsenceType.FERIE, startDate: formatDate(new Date(new Date().setDate(today.getDate() - 5))), endDate: formatDate(new Date(new Date().setDate(today.getDate() + 2))), status: AbsenceStatus.APPROVATO },
    { id: 'lr-2', employeeId: 'emp-1', type: AbsenceType.PERMESSO, startDate: formatDate(new Date()), endDate: formatDate(new Date()), status: AbsenceStatus.IN_ATTESA },
];

const initialSicknessRecords: SicknessRecord[] = [
    { id: 'sick-1', employeeId: 'emp-2', startDate: formatDate(new Date(new Date().setDate(today.getDate() - 10))), endDate: formatDate(new Date(new Date().setDate(today.getDate() - 3))) },
];

const initialSchedules: Schedule[] = [];

const initialUsers: User[] = [
    { id: 'user-1', username: 'admin', password: 'admin', role: 'Amministratore' },
    { id: 'user-2', username: 'responsabile', password: 'responsabile', role: 'Responsabile' },
    { id: 'user-3', username: 'mario.rossi', password: 'password', role: 'Lavoratore', employeeId: 'emp-1' },
];

const initialApiKeys: ApiKey[] = [
    { id: 'google_gemini', name: 'Google Gemini API Key', key: '' }
];

const ALL_INITIAL_DATA = {
    employees: initialEmployees,
    sites: initialSites,
    leaveRequests: initialLeaveRequests,
    sicknessRecords: initialSicknessRecords,
    schedules: initialSchedules,
    users: initialUsers,
    apiKeys: initialApiKeys,
}

type DataKey = keyof typeof ALL_INITIAL_DATA;

// --- API Functions ---

// Generic function to get data, initializing if it doesn't exist
export const getData = async <T>(key: DataKey): Promise<T> => {
    await new Promise(resolve => setTimeout(resolve, SIMULATED_LATENCY));
    try {
        const storedValue = localStorage.getItem(key);
        if (storedValue) {
            return JSON.parse(storedValue);
        }
        // If no data, initialize with mock data and return it
        localStorage.setItem(key, JSON.stringify(ALL_INITIAL_DATA[key]));
        return ALL_INITIAL_DATA[key] as T;
    } catch (error) {
        console.error(`Error reading ${key} from localStorage`, error);
        return ALL_INITIAL_DATA[key] as T; // Fallback
    }
};

// Generic function to set an entire dataset
export const setData = async <T>(key: DataKey, data: T): Promise<void> => {
    await new Promise(resolve => setTimeout(resolve, SIMULATED_LATENCY / 2)); // Faster save
    localStorage.setItem(key, JSON.stringify(data));
};

// Generic function to add a new item
export const addData = async <T, R extends {id: string}>(key: DataKey, newItem: T): Promise<R> => {
    const data = await getData<R[]>(key);
    // FIX: Changed type assertion to 'as unknown as R' to resolve a strict generic type error.
    // The constructed object is compatible with R based on how this function is used throughout the app.
    const newRecord = { ...newItem, id: `${key.slice(0, -1)}-${Date.now()}` } as unknown as R;
    const updatedData = [...data, newRecord];
    await setData(key, updatedData);
    return newRecord;
};

// Generic function to add multiple new items
export const addBatchData = async <T, R extends {id: string}>(key: DataKey, newItems: T[]): Promise<R[]> => {
    const data = await getData<R[]>(key);
    // FIX: Corrected syntax for type assertion and changed to 'as unknown as R' to resolve a strict generic type error.
    // The constructed objects are compatible with R based on how this function is used.
    const newRecords = newItems.map((item, index) => ({
        ...item,
        id: `${key.slice(0,-1)}-${Date.now()}-${index}`
    }) as unknown as R);
    const updatedData = [...data, ...newRecords];
    await setData(key, updatedData);
    return newRecords;
};


// Generic function to update an item
export const updateData = async <T extends {id: string}>(key: DataKey, id: string, updatedItem: T): Promise<T> => {
    const data = await getData<T[]>(key);
    const updatedData = data.map(item => item.id === id ? updatedItem : item);
    await setData(key, updatedData);
    return updatedItem;
};

// Generic function to delete an item
export const deleteData = async (key: DataKey, id: string): Promise<void> => {
    const data = await getData<{id: string}[]>(key);
    const updatedData = data.filter(item => item.id !== id);
    await setData(key, updatedData);
};