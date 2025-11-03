

import React, { useMemo } from 'react';
import { Routes, Route, Navigate, useLocation, Link } from 'react-router-dom';
import { useAuth } from './contexts/AuthContext';
import { useAppData } from './hooks/useMockData';
import { AppSetting, ModuleVisibility } from './types';


// Components
import Login from './components/Login';
import Dashboard from './components/Dashboard';
import EmployeeList from './components/EmployeeList';
// FIX: Correctly importing SiteList which will be created.
import SiteList from './components/SiteList';
import Attendances from './components/attendances/Attendances';
import LeaveRequests from './components/absences/LeaveRequests';
import Sickness from './components/absences/Sickness';
import WeeklyAbsences from './components/absences/WeeklyAbsences';
import LeaveRequestStats from './components/absences/LeaveRequestStats';
import JollyPlans from './components/JollyPlans';
import FindOperators from './components/FindOperators';
import UserList from './components/UserList';
import ApiSettings from './components/ApiSettings';
import ChatBot from './components/ChatBot';
import DatabaseSettings from './components/DatabaseSettings';
import ModuleSettings from './components/ModuleSettings';
// FIX: The file 'file:///components/worker/WorkerArea.tsx' is not a module. This is often due to an empty file or incorrect path. I've created the component and will correct the import path.
import WorkerArea from './components/worker/WorkerArea';


const App: React.FC = () => {
    const { user, authLoading } = useAuth();

    if (authLoading) {
        return <div className="flex items-center justify-center min-h-screen">Caricamento...</div>;
    }

    return (
        <Routes>
            <Route path="/login" element={user ? <Navigate to="/" /> : <Login />} />
            <Route 
                path="/*" 
                element={
                    user ? <MainLayout /> : <Navigate to="/login" />
                } 
            />
        </Routes>
    );
};

const MainLayout: React.FC = () => {
    const { user, logout } = useAuth();
    const {
        employees, setEmployees,
        sites, setSites,
        leaveRequests, setLeaveRequests,
        sicknessRecords, setSicknessRecords,
        attendances, setAttendances,
        schedules, setSchedules,
        users, setUsers,
        apiKeys, setApiKeys,
        messages, setMessages,
        messageGroups, setMessageGroups,
        appSettings, setAppSettings,
        loading
    } = useAppData();

    if (loading) {
        return <div className="flex items-center justify-center min-h-screen">Caricamento dati...</div>;
    }

    return (
        <div className="flex h-screen bg-gray-100 font-sans">
            <Sidebar appSettings={appSettings} />
            <div className="flex-1 flex flex-col overflow-hidden">
                <header className="flex justify-between items-center p-4 bg-white border-b">
                    <h1 className="text-xl font-semibold">Gestionale Coppolecchia</h1>
                    <div>
                        <span className="text-gray-600 mr-4">Benvenuto, {user?.username} ({user?.role})</span>
                        <button onClick={logout} className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700">
                            Logout
                        </button>
                    </div>
                </header>
                <main className="flex-1 overflow-x-hidden overflow-y-auto bg-gray-100 p-8">
                    <Routes>
                        <Route path="/" element={<Dashboard 
                            employees={employees} setEmployees={setEmployees}
                            sites={sites} setSites={setSites}
                            leaveRequests={leaveRequests} sicknessRecords={sicknessRecords}
                            messages={messages} setMessages={setMessages} 
                            messageGroups={messageGroups} setMessageGroups={setMessageGroups}
                            apiKeys={apiKeys}
                            appSettings={appSettings}
                            />} 
                        />
                        <Route path="/dipendenti" element={<EmployeeList employees={employees} setEmployees={setEmployees} sites={sites} />} />
                        <Route path="/cantieri" element={<SiteList sites={sites} setSites={setSites} employees={employees} />} />
                        <Route path="/presenze" element={<Attendances employees={employees} attendances={attendances} setAttendances={setAttendances} sites={sites} apiKeys={apiKeys} />} />
                        <Route path="/lavoratori" element={<WorkerArea 
                            employees={employees} 
                            sites={sites} 
                            attendances={attendances} 
                            setAttendances={setAttendances} 
                            apiKeys={apiKeys}
                            leaveRequests={leaveRequests}
                            setLeaveRequests={setLeaveRequests} 
                            />} 
                        />
                        
                        <Route path="/assenze" element={<Navigate to="/assenze/richieste" />} />
                        <Route path="/assenze/richieste" element={<LeaveRequests employees={employees} leaveRequests={leaveRequests} setLeaveRequests={setLeaveRequests} />} />
                        <Route path="/assenze/malattie" element={<Sickness employees={employees} sicknessRecords={sicknessRecords} setSicknessRecords={setSicknessRecords} />} />
                        <Route path="/assenze/riepilogo" element={<WeeklyAbsences employees={employees} leaveRequests={leaveRequests} sicknessRecords={sicknessRecords} />} />
                        <Route path="/assenze/statistiche" element={<LeaveRequestStats employees={employees} leaveRequests={leaveRequests} />} />
                       
                        <Route path="/pianificazione-jolly" element={<JollyPlans employees={employees} sites={sites} leaveRequests={leaveRequests} sicknessRecords={sicknessRecords} schedules={schedules} setSchedules={setSchedules} apiKeys={apiKeys} />} />
                        <Route path="/trova-operatori" element={<FindOperators employees={employees} sites={sites} apiKeys={apiKeys} />} />
                        
                        <Route path="/impostazioni" element={<Navigate to="/impostazioni/utenti" />} />
                        <Route path="/impostazioni/utenti" element={<UserList users={users} setUsers={setUsers} employees={employees} />} />
                        <Route path="/impostazioni/moduli" element={<ModuleSettings appSettings={appSettings} setAppSettings={setAppSettings} />} />
                        <Route path="/impostazioni/api" element={<ApiSettings apiKeys={apiKeys} setApiKeys={setApiKeys} appSettings={appSettings} setAppSettings={setAppSettings} />} />
                        <Route path="/impostazioni/database" element={<DatabaseSettings appSettings={appSettings} setAppSettings={setAppSettings} />} />

                        <Route path="*" element={<Navigate to="/" />} />
                    </Routes>
                </main>
                {/* {user?.role !== 'Lavoratore' && <ChatBot apiKeys={apiKeys} />} */}
            </div>
        </div>
    );
};

const Sidebar: React.FC<{ appSettings: AppSetting[] }> = ({ appSettings }) => {
    const { user } = useAuth();
    const moduleVisibility = useMemo(() => appSettings.find(s => s.id === 'module_visibility') as ModuleVisibility | undefined, [appSettings]);
    const visibilitySettings = moduleVisibility?.settings;

    const navItems = [
        { path: '/', icon: 'fa-tachometer-alt', label: 'Dashboard', roles: ['Amministratore', 'Responsabile', 'Lavoratore'] },
        { path: '/lavoratori', icon: 'fa-user-clock', label: 'Area Personale', roles: ['Amministratore', 'Lavoratore'] },
        { path: '/dipendenti', icon: 'fa-users', label: 'Dipendenti', roles: ['Amministratore', 'Responsabile'] },
        { path: '/cantieri', icon: 'fa-building-user', label: 'Cantieri', roles: ['Amministratore', 'Responsabile'] },
        { path: '/presenze', icon: 'fa-clock', label: 'Presenze', roles: ['Amministratore', 'Responsabile'] },
        {
            label: 'Assenze',
            icon: 'fa-calendar-times',
            roles: ['Amministratore', 'Responsabile'],
            basePath: '/assenze',
            subItems: [
                { path: '/assenze/richieste', label: 'Richieste' },
                { path: '/assenze/malattie', label: 'Malattie' },
                { path: '/assenze/riepilogo', label: 'Riepilogo Sett.' },
                { path: '/assenze/statistiche', label: 'Statistiche' },
            ]
        },
        { path: '/pianificazione-jolly', icon: 'fa-calendar-alt', label: 'Pianificazione Jolly', roles: ['Amministratore', 'Responsabile'] },
        { path: '/trova-operatori', icon: 'fa-search-location', label: 'Trova Operatori', roles: ['Amministratore', 'Responsabile'] },
        {
            label: 'Impostazioni',
            icon: 'fa-cogs',
            roles: ['Amministratore'],
            basePath: '/impostazioni',
            subItems: [
                { path: '/impostazioni/utenti', label: 'Utenti' },
                { path: '/impostazioni/moduli', label: 'Moduli' },
                { path: '/impostazioni/api', label: 'API' },
                { path: '/impostazioni/database', label: 'Database' },
            ]
        },
    ];

    return (
        <nav className="w-64 bg-white shadow-lg flex-shrink-0">
            <div className="p-4 border-b">
                <h2 className="text-2xl font-bold text-blue-600 text-center">Coppolecchia</h2>
            </div>
            <ul className="py-4">
                {navItems.map((item, index) => {
                    const itemPath = item.basePath || item.path!;
                    const isVisible = visibilitySettings
                        ? visibilitySettings[itemPath]?.includes(user!.role)
                        : item.roles.includes(user!.role); // Fallback to original roles array

                    return isVisible && (
                        <li key={index} className="px-4">
                            {item.subItems ? (
                                <SidebarDropdown item={item} />
                            ) : (
                                <NavLink to={item.path!}>
                                    <i className={`fa-solid ${item.icon} w-6 text-center mr-3`}></i>
                                    {item.label}
                                </NavLink>
                            )}
                        </li>
                    )
                })}
            </ul>
        </nav>
    );
};

const NavLink: React.FC<{ to: string; children: React.ReactNode }> = ({ to, children }) => {
    const location = useLocation();
    const isActive = location.pathname === to;
    return (
        <Link
            to={to}
            className={`flex items-center px-4 py-3 my-1 text-gray-700 rounded-lg hover:bg-blue-100 hover:text-blue-600 transition-colors ${isActive ? 'bg-blue-100 text-blue-600 font-semibold' : ''}`}
        >
            {children}
        </Link>
    );
};


const SidebarDropdown: React.FC<{ item: any }> = ({ item }) => {
    const location = useLocation();
    const [isOpen, setIsOpen] = React.useState(location.pathname.startsWith(item.basePath));

    return (
        <>
            <button
                onClick={() => setIsOpen(!isOpen)}
                className="w-full flex items-center justify-between px-4 py-3 my-1 text-gray-700 rounded-lg hover:bg-blue-100 hover:text-blue-600 transition-colors"
            >
                <span className="flex items-center">
                    <i className={`fa-solid ${item.icon} w-6 text-center mr-3`}></i>
                    {item.label}
                </span>
                <i className={`fa-solid fa-chevron-down text-xs transition-transform ${isOpen ? 'rotate-180' : ''}`}></i>
            </button>
            {isOpen && (
                <ul className="pl-6 border-l-2 border-gray-200 ml-5">
                    {item.subItems.map((subItem: any, subIndex: number) => (
                        <li key={subIndex}>
                            <Link
                                to={subItem.path}
                                className={`flex items-center px-4 py-2 my-1 text-sm text-gray-600 rounded-lg hover:bg-blue-50 ${location.pathname === subItem.path ? 'bg-blue-100 text-blue-600 font-semibold' : ''}`}
                            >
                                {subItem.label}
                            </Link>
                        </li>
                    ))}
                </ul>
            )}
        </>
    );
};

export default App;