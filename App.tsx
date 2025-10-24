import React from 'react';
import { Routes, Route, Navigate, useLocation, Link } from 'react-router-dom';
import { useAuth } from './contexts/AuthContext';
import { useAppData } from './hooks/useMockData';

// Components
import Login from './components/Login';
import Dashboard from './components/Dashboard';
import EmployeeList from './components/EmployeeList';
import SiteList from './components/SiteList';
import Services from './components/Services';
import LeaveRequests from './components/absences/LeaveRequests';
import Sickness from './components/absences/Sickness';
import WeeklyAbsences from './components/absences/WeeklyAbsences';
import JollyPlans from './components/JollyPlans';
import FindOperators from './components/FindOperators';
import UserList from './components/UserList';
import ApiSettings from './components/ApiSettings';
import ChatBot from './components/ChatBot';

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
        schedules, setSchedules,
        users, setUsers,
        apiKeys, setApiKeys,
        loading
    } = useAppData();

    if (loading) {
        return <div className="flex items-center justify-center min-h-screen">Caricamento dati...</div>;
    }

    return (
        <div className="flex h-screen bg-gray-100 font-sans">
            <Sidebar />
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
                        <Route path="/" element={<Dashboard employees={employees} sites={sites} />} />
                        <Route path="/dipendenti" element={<EmployeeList employees={employees} setEmployees={setEmployees} sites={sites} />} />
                        <Route path="/cantieri" element={<SiteList sites={sites} setSites={setSites} employees={employees} />} />
                        <Route path="/servizi" element={<Services sites={sites} employees={employees} />} />
                        
                        <Route path="/assenze" element={<Navigate to="/assenze/richieste" />} />
                        <Route path="/assenze/richieste" element={<LeaveRequests employees={employees} leaveRequests={leaveRequests} setLeaveRequests={setLeaveRequests} />} />
                        <Route path="/assenze/malattie" element={<Sickness employees={employees} sicknessRecords={sicknessRecords} setSicknessRecords={setSicknessRecords} />} />
                        <Route path="/assenze/riepilogo" element={<WeeklyAbsences employees={employees} leaveRequests={leaveRequests} sicknessRecords={sicknessRecords} />} />
                       
                        <Route path="/pianificazione-jolly" element={<JollyPlans employees={employees} sites={sites} leaveRequests={leaveRequests} sicknessRecords={sicknessRecords} schedules={schedules} setSchedules={setSchedules} apiKeys={apiKeys} />} />
                        <Route path="/trova-operatori" element={<FindOperators employees={employees} sites={sites} apiKeys={apiKeys} />} />
                        
                        <Route path="/impostazioni" element={<Navigate to="/impostazioni/utenti" />} />
                        <Route path="/impostazioni/utenti" element={<UserList users={users} setUsers={setUsers} employees={employees} />} />
                        <Route path="/impostazioni/api" element={<ApiSettings apiKeys={apiKeys} setApiKeys={setApiKeys} />} />

                        <Route path="*" element={<Navigate to="/" />} />
                    </Routes>
                </main>
                {user?.role !== 'Lavoratore' && <ChatBot apiKeys={apiKeys} />}
            </div>
        </div>
    );
};

const Sidebar: React.FC = () => {
    const { user } = useAuth();

    const navItems = [
        { path: '/', icon: 'fa-tachometer-alt', label: 'Dashboard', roles: ['Amministratore', 'Responsabile'] },
        { path: '/dipendenti', icon: 'fa-users', label: 'Dipendenti', roles: ['Amministratore', 'Responsabile'] },
        { path: '/cantieri', icon: 'fa-building-user', label: 'Cantieri', roles: ['Amministratore', 'Responsabile'] },
        { path: '/servizi', icon: 'fa-briefcase', label: 'Servizi', roles: ['Amministratore', 'Responsabile'] },
        {
            label: 'Assenze',
            icon: 'fa-calendar-times',
            roles: ['Amministratore', 'Responsabile'],
            basePath: '/assenze',
            subItems: [
                { path: '/assenze/richieste', label: 'Richieste' },
                { path: '/assenze/malattie', label: 'Malattie' },
                { path: '/assenze/riepilogo', label: 'Riepilogo Sett.' },
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
                { path: '/impostazioni/api', label: 'API' },
            ]
        },
    ];

    return (
        <nav className="w-64 bg-white shadow-lg flex-shrink-0">
            <div className="p-4 border-b">
                <h2 className="text-2xl font-bold text-blue-600 text-center">Coppolecchia</h2>
            </div>
            <ul className="py-4">
                {navItems.map((item, index) => (
                    item.roles.includes(user!.role) && (
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
                ))}
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