
import { Employee, WorkSite, LeaveRequest, SicknessRecord, Schedule, User, ApiKey, AbsenceStatus, AbsenceType, SiteAssignment, Message, AppSetting, AttendanceRecord, ModuleVisibility, Role, MessageGroup, DatabaseConfig } from '../types';
import { initializeApp } from 'firebase/app';
import { getFirestore, collection, getDocs, doc, setDoc, deleteDoc, updateDoc, addDoc, query, where } from 'firebase/firestore';
import { createClient } from '@supabase/supabase-js';

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

// Changed key to ensure a fresh start for "Production" mode
const DB_KEY = 'coppolecchia_prod_db_v1';

// Default configuration provided by user
const DEFAULT_SUPABASE_URL = 'https://zfznvvffbmzvwordkqtx.supabase.co';
const DEFAULT_SUPABASE_KEY = 'sb_publishable_PkOy0_rDc6rTbEgNlscAkw_51iEdG6w';

const initialData: DataShape = {
  employees: [],
  sites: [],
  leaveRequests: [],
  sicknessRecords: [],
  attendances: [],
  schedules: [],
  users: [
      // Default Admin User for first access
      { id: 'user-admin', username: 'admin', password: 'admin', role: 'Amministratore' },
  ],
  apiKeys: [
      { id: 'google_gemini', name: 'Google Gemini API Key', key: '' },
      { id: 'groq', name: 'Groq API Key', key: '' },
      { id: 'google_maps', name: 'Google Maps API Key', key: '' },
      { id: 'open_route_service', name: 'OpenRouteService API Key', key: '' },
  ],
  messages: [],
  messageGroups: [],
  appSettings: [
      { id: 'ai_provider', value: 'gemini' },
      { 
          id: 'database_config', 
          provider: 'supabase', // Set DEFAULT to Supabase
          supabaseUrl: DEFAULT_SUPABASE_URL, 
          supabaseKey: DEFAULT_SUPABASE_KEY, 
          firebaseConfig: '' 
      },
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

// --- Helper for Local Storage ---
const saveDbLocal = (db: DataShape) => {
    try {
        localStorage.setItem(DB_KEY, JSON.stringify(db));
    } catch (e) {
        console.error("Failed to save DB to localStorage", e);
    }
};

const getDbLocal = (): DataShape => {
    let db: DataShape | null = null;
    try {
        const dbString = localStorage.getItem(DB_KEY);
        if (dbString) {
            db = JSON.parse(dbString);
        }
    } catch (e) {
        console.error("Failed to parse DB from localStorage", e);
    }
    
    // Fallback and migration logic (same as before)
    if (db) {
        let dbWasModified = false;
        const arrayCollections: CollectionName[] = [
            'employees', 'sites', 'leaveRequests', 'sicknessRecords', 
            'attendances', 'schedules', 'users', 'apiKeys', 'messages', 
            'appSettings', 'messageGroups'
        ];
        
        for (const collection of arrayCollections) {
            if (!db.hasOwnProperty(collection) || !Array.isArray((db as any)[collection])) {
                (db as any)[collection] = initialData[collection];
                dbWasModified = true;
            }
        }
        
        // Ensure settings exist locally to allow switching providers
        const initialAppSettingsMap = new Map(initialData.appSettings.map(s => [s.id, s]));
        const existingAppSettingsIds = new Set(db.appSettings.map(s => s.id));
        for (const [id, settingObject] of initialAppSettingsMap.entries()) {
            if (!existingAppSettingsIds.has(id)) {
                db.appSettings.push(settingObject);
                dbWasModified = true;
            }
        }

        // Migration: Update admin password to 'admin' if it was 'password'
        const adminUser = db.users.find((u: any) => u.username === 'admin');
        if (adminUser && adminUser.password === 'password') {
            adminUser.password = 'admin';
            dbWasModified = true;
        }

        // MIGRATION: Force Supabase defaults if current config is local or using old default
        const dbConfig = db.appSettings.find(s => s.id === 'database_config') as any;
        if (dbConfig) {
            // Check if we need to migrate to the new default Supabase instance
            // We force migration if it's currently 'local' OR if the URL/Key doesn't match the new required one
            if (dbConfig.provider === 'local' || dbConfig.supabaseUrl !== DEFAULT_SUPABASE_URL || dbConfig.supabaseKey !== DEFAULT_SUPABASE_KEY) {
                console.log("Migrating database config to default Supabase instance...");
                dbConfig.provider = 'supabase';
                dbConfig.supabaseUrl = DEFAULT_SUPABASE_URL;
                dbConfig.supabaseKey = DEFAULT_SUPABASE_KEY;
                dbWasModified = true;
            }
        }

        if (dbWasModified) saveDbLocal(db);
        return db;
    }

    saveDbLocal(initialData);
    return initialData;
};

// --- Initialization Helpers ---
let firebaseApp: any = null;
let firestoreDb: any = null;
let supabaseClient: any = null;

const getFirebaseInstance = () => {
    const localDb = getDbLocal();
    const dbConfig = localDb.appSettings.find(s => s.id === 'database_config') as DatabaseConfig | undefined;

    if (dbConfig && dbConfig.provider === 'firebase' && dbConfig.firebaseConfig) {
        try {
            if (!firebaseApp) {
                const config = JSON.parse(dbConfig.firebaseConfig);
                firebaseApp = initializeApp(config);
                firestoreDb = getFirestore(firebaseApp);
            }
            return firestoreDb;
        } catch (e) {
            console.error("Firebase init error", e);
            return null;
        }
    }
    return null;
};

const getSupabaseInstance = () => {
    const localDb = getDbLocal();
    const dbConfig = localDb.appSettings.find(s => s.id === 'database_config') as DatabaseConfig | undefined;

    // Use default values if local DB has them, otherwise fallback to hardcoded default for immediate connection
    const url = dbConfig?.supabaseUrl || DEFAULT_SUPABASE_URL;
    const key = dbConfig?.supabaseKey || DEFAULT_SUPABASE_KEY;

    if (dbConfig && dbConfig.provider === 'supabase' && url && key) {
        try {
            if (!supabaseClient) {
                supabaseClient = createClient(url, key);
            }
            return supabaseClient;
        } catch(e) {
            console.error("Supabase init error", e);
            return null;
        }
    }
    return null;
}

const getCurrentProvider = (): 'local' | 'firebase' | 'supabase' => {
    const localDb = getDbLocal();
    const dbConfig = localDb.appSettings.find(s => s.id === 'database_config') as DatabaseConfig | undefined;
    
    if (dbConfig?.provider === 'firebase' && dbConfig.firebaseConfig) {
        return 'firebase';
    }
    if (dbConfig?.provider === 'supabase' && dbConfig.supabaseUrl && dbConfig.supabaseKey) {
        return 'supabase';
    }
    return 'local';
};


const delay = (ms: number) => new Promise(res => setTimeout(res, ms));

// --- API Functions ---

export const getData = async <T>(collectionName: CollectionName): Promise<T> => {
    const provider = getCurrentProvider();

    if (provider === 'firebase') {
        const db = getFirebaseInstance();
        if (!db) return [] as unknown as T;
        try {
            const querySnapshot = await getDocs(collection(db, collectionName));
            const data: any[] = [];
            querySnapshot.forEach((doc) => {
                data.push({ id: doc.id, ...doc.data() });
            });
            return data as unknown as T;
        } catch (e) {
            console.error(`Firebase getData error for ${collectionName}:`, e);
            return [] as unknown as T;
        }
    } else if (provider === 'supabase') {
        const supabase = getSupabaseInstance();
        if (!supabase) return [] as unknown as T;
        try {
            const { data, error } = await supabase.from(collectionName).select('*');
            if (error) {
                console.warn(`Supabase error fetching ${collectionName} (Table might not exist):`, error.message);
                return [] as unknown as T;
            }
            return data as unknown as T;
        } catch (e) {
            console.error(`Supabase getData error for ${collectionName}:`, e);
            return [] as unknown as T;
        }
    } else {
        await delay(100);
        const db = getDbLocal();
        return db[collectionName] as unknown as T;
    }
};

export const addData = async <T, R>(collectionName: CollectionName, item: T): Promise<R> => {
    const provider = getCurrentProvider();

    // Determine ID
    const hasId = Object.prototype.hasOwnProperty.call(item, 'id') && (item as any).id;
    const itemId = hasId ? (item as any).id : `${collectionName.slice(0, -1)}-${Date.now()}`;
    const newItem = { ...(item as object), id: itemId };

    if (provider === 'firebase') {
        const db = getFirebaseInstance();
        if (!db) throw new Error("Firebase not initialized");
        await setDoc(doc(db, collectionName, itemId), newItem);
        return newItem as unknown as R;
    } else if (provider === 'supabase') {
        const supabase = getSupabaseInstance();
        if (!supabase) throw new Error("Supabase not initialized");
        // Supabase insert returns the inserted data
        const { data, error } = await supabase.from(collectionName).insert(newItem).select().single();
        if (error) throw new Error(error.message);
        return data as unknown as R;
    } else {
        await delay(100);
        const db = getDbLocal();
        (db[collectionName] as any[]).push(newItem);
        saveDbLocal(db);
        return newItem as unknown as R;
    }
};

export const addBatchData = async <T, R>(collectionName: CollectionName, items: T[]): Promise<R[]> => {
    const provider = getCurrentProvider();
    
    if (provider === 'firebase') {
        const db = getFirebaseInstance();
        const results = await Promise.all(items.map(async (item, index) => {
            const id = `${collectionName.slice(0, -1)}-${Date.now()}-${index}`;
            const newItem = { ...item, id };
            await setDoc(doc(db, collectionName, id), newItem);
            return newItem;
        }));
        return results as unknown as R[];
    } else if (provider === 'supabase') {
        const supabase = getSupabaseInstance();
        if (!supabase) throw new Error("Supabase not initialized");
        // Generate IDs for consistency before sending
        const itemsWithIds = items.map((item, index) => ({
            ...item,
            id: `${collectionName.slice(0, -1)}-${Date.now()}-${index}`
        }));
        const { data, error } = await supabase.from(collectionName).insert(itemsWithIds).select();
        if (error) throw new Error(error.message);
        return data as unknown as R[];
    } else {
        await delay(300);
        const db = getDbLocal();
        const newItems = items.map((item, index) => ({
            ...item,
            id: `${collectionName.slice(0, -1)}-${Date.now()}-${index}`,
        }));
        db[collectionName] = [...db[collectionName], ...newItems] as any;
        saveDbLocal(db);
        return newItems as unknown as R[];
    }
};

export const updateData = async <T extends { id: string }>(collectionName: CollectionName, id: string, updatedItem: T): Promise<T> => {
    const provider = getCurrentProvider();

    if (provider === 'firebase') {
        const db = getFirebaseInstance();
        const { id: _, ...dataWithoutId } = updatedItem;
        await updateDoc(doc(db, collectionName, id), dataWithoutId);
        return updatedItem;
    } else if (provider === 'supabase') {
        const supabase = getSupabaseInstance();
        if (!supabase) throw new Error("Supabase not initialized");
        const { id: _, ...dataWithoutId } = updatedItem;
        const { data, error } = await supabase.from(collectionName).update(dataWithoutId).eq('id', id).select().single();
        if (error) throw new Error(error.message);
        return data as unknown as T;
    } else {
        await delay(100);
        const db = getDbLocal();
        const index = (db[collectionName] as any[]).findIndex(i => i.id === id);
        if (index === -1) {
            throw new Error(`Item with id ${id} not found in ${collectionName}`);
        }
        (db[collectionName] as any[])[index] = updatedItem;
        saveDbLocal(db);
        return updatedItem;
    }
};

export const deleteData = async (collectionName: CollectionName, id: string): Promise<void> => {
    const provider = getCurrentProvider();

    if (provider === 'firebase') {
        const db = getFirebaseInstance();
        await deleteDoc(doc(db, collectionName, id));
    } else if (provider === 'supabase') {
        const supabase = getSupabaseInstance();
        if (!supabase) throw new Error("Supabase not initialized");
        const { error } = await supabase.from(collectionName).delete().eq('id', id);
        if (error) throw new Error(error.message);
    } else {
        await delay(100);
        const db = getDbLocal();
        const items = db[collectionName] as any[];
        const filteredItems = items.filter(i => i.id !== id);
        (db[collectionName] as any) = filteredItems;
        saveDbLocal(db);
    }
};

// --- Test Connection ---
export const testFirebaseConnection = async (): Promise<boolean> => {
    const db = getFirebaseInstance();
    if (!db) throw new Error("Istanza Firebase non creata. Controlla la configurazione JSON.");
    try {
        await getDocs(collection(db, 'appSettings')); 
        return true;
    } catch (e) {
        console.error("Connection test failed:", e);
        throw e;
    }
};

export const testSupabaseConnection = async (): Promise<boolean> => {
    const supabase = getSupabaseInstance();
    if (!supabase) throw new Error("Istanza Supabase non creata.");
    try {
        // Just try to fetch the appSettings table, limit 1
        const { data, error } = await supabase.from('appSettings').select('*').limit(1);
        if (error) throw error;
        return true;
    } catch(e) {
        console.error("Supabase connection test failed:", e);
        throw e;
    }
}

// --- Full DB Management (Local Only) ---
export const exportDbAsString = (): string => {
    return localStorage.getItem(DB_KEY) || JSON.stringify(initialData);
};

export const importDbFromString = (jsonString: string): void => {
    JSON.parse(jsonString);
    localStorage.setItem(DB_KEY, jsonString);
};

export const clearDb = (): void => {
    localStorage.removeItem(DB_KEY);
};
