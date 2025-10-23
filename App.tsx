import React, { useState } from 'react';
import { Routes, Route, NavLink, useLocation, Navigate } from 'react-router-dom';
import Dashboard from './components/Dashboard';
import EmployeeList from './components/EmployeeList';
import SiteList from './components/SiteList';
import UserList from './components/UserList';
import JollyPlans from './components/JollyPlans';
import { useAppData } from './hooks/useMockData';
import LeaveRequests from './components/absences/LeaveRequests';
import Sickness from './components/absences/Sickness';
import WeeklyAbsences from './components/absences/WeeklyAbsences';
import { useAuth } from './contexts/AuthContext';
import Login from './components/Login';
import { Role } from './types';
import FindOperators from './components/FindOperators';
import ApiSettings from './components/ApiSettings';

// --- Navigation Components ---

const NavItem: React.FC<{ to: string; icon: string; children: React.ReactNode }> = ({ to, icon, children }) => (
    <NavLink to={to} end className={({ isActive }) => `flex items-center py-1 text-blue-700 hover:underline ${isActive ? 'font-bold' : ''}`}>
        <i className={`fa-solid ${icon} w-8 text-center text-base`}></i>
        <span className="text-base">{children}</span>
    </NavLink>
);

const AccordionNavItem: React.FC<{ icon: string; title: string; children: React.ReactNode }> = ({ icon, title, children }) => {
    const location = useLocation();
    const isParentActive = location.pathname.startsWith('/absences');
    const [isOpen, setIsOpen] = useState(isParentActive);

    return (
        <div>
            <button onClick={() => setIsOpen(!isOpen)} className="flex items-center w-full py-1 text-blue-700 hover:underline border rounded px-2 text-left">
                <i className={`fa-solid ${icon} w-8 text-center text-base`}></i>
                <span className="text-base flex-1">{title}</span>
                <i className={`fa-solid fa-chevron-down ml-auto transition-transform text-xs ${isOpen ? 'rotate-180' : ''}`}></i>
            </button>
            {isOpen && <div className="pl-8 pt-2 mt-1 space-y-1">{children}</div>}
        </div>
    );
};

const SubNavItem: React.FC<{ to: string; children: React.ReactNode }> = ({ to, children }) => (
    <NavLink to={to} className={({ isActive }) => `flex items-center py-1 text-blue-700 hover:underline ${isActive ? 'font-bold' : ''}`}>
         <span className="text-sm">{children}</span>
    </NavLink>
);

// --- Main Authenticated App Layout ---

const MainApp = () => {
    const { user, logout } = useAuth();
    const { employees, setEmployees, sites, setSites, leaveRequests, setLeaveRequests, sicknessRecords, setSicknessRecords, schedules, setSchedules, users, setUsers, apiKeys, setApiKeys, loading } = useAppData();
    const location = useLocation();

    const getPageTitle = () => {
        // (Same as before)
        switch (location.pathname) {
            case '/': return 'Dashboard';
            case '/employees': return 'Anagrafica Dipendenti';
            case '/sites': return 'Gestione Cantieri';
            case '/find-operators': return 'Cerca Operatori';
            case '/users': return 'Gestione Utenti';
            case '/absences/requests': return 'Richieste Ferie e Permessi';
            case '/absences/sickness': return 'Gestione Malattie';
            case '/absences/weekly': return 'Riepilogo Assenze Settimanali';
            case '/jolly': return 'Pianificazione Jolly';
            case '/api-settings': return 'Impostazioni API';
            default: return 'Coppolecchia';
        }
    };

    const navLinks = [
        { to: '/', icon: 'fa-chart-pie', text: 'Dashboard', roles: ['Amministratore', 'Responsabile'] },
        { to: '/employees', icon: 'fa-users', text: 'Dipendenti', roles: ['Amministratore', 'Responsabile'] },
        { to: '/sites', icon: 'fa-building-user', text: 'Cantieri', roles: ['Amministratore', 'Responsabile'] },
        { to: '/find-operators', icon: 'fa-magnifying-glass-location', text: 'Cerca Operatori', roles: ['Amministratore', 'Responsabile'] },
        { to: '/users', icon: 'fa-user-shield', text: 'Utenti', roles: ['Amministratore'] },
        { type: 'accordion', icon: 'fa-person-walking', title: 'Assenze', roles: ['Amministratore', 'Responsabile'], children: [
            { to: '/absences/requests', text: 'Richieste' },
            { to: '/absences/sickness', text: 'Malattie' },
            { to: '/absences/weekly', text: 'Riepilogo' }
        ]},
        { to: '/jolly', icon: 'fa-shuffle', text: 'Pianifica Jolly', roles: ['Amministratore', 'Responsabile'] },
        { to: '/api-settings', icon: 'fa-key', text: 'Impostazioni API', roles: ['Amministratore'] },
        // Lavoratore links
        { to: '/', icon: 'fa-tachometer-alt', text: 'Mia Dashboard', roles: ['Lavoratore'] },
    ];
    
    const visibleNavLinks = navLinks.filter(link => user && link.roles.includes(user.role));

    if (loading) {
        return (
            <div className="flex items-center justify-center h-screen bg-gray-100">
                <div className="text-center">
                    <i className="fa-solid fa-spinner fa-spin text-5xl text-blue-600"></i>
                    <p className="mt-4 text-xl text-gray-700">Caricamento dati in corso...</p>
                </div>
            </div>
        );
    }
    
    // Helper for role-based route protection
    const renderRoute = (path: string, element: React.ReactNode, allowedRoles: Role[]) => {
        if (user && allowedRoles.includes(user.role)) {
            return <Route path={path} element={element} />;
        }
        return null;
    };


    return (
        <div className="flex h-screen bg-white font-sans">
            <aside className="w-64 border-r flex flex-col bg-gray-50">
                <div className="p-4 border-b">
                    <h1 className="text-xl font-bold">Coppolecchia</h1>
                </div>
                <nav className="p-4 space-y-4 flex-1">
                    {visibleNavLinks.map((link, index) => {
                         if (link.type === 'accordion') {
                            return (
                                <AccordionNavItem key={index} icon={link.icon} title={link.title}>
                                    {link.children?.map(child => <SubNavItem key={child.to} to={child.to}>{child.text}</SubNavItem>)}
                                </AccordionNavItem>
                            );
                        }
                        return <NavItem key={link.to} to={link.to} icon={link.icon}>{link.text}</NavItem>
                    })}
                </nav>
                <div className="p-4 mt-auto border-t text-sm text-gray-700">
                    <p className="font-semibold">{user?.username}</p>
                    <p className="text-xs text-gray-500">{user?.role}</p>
                    <button onClick={logout} className="w-full mt-2 text-left text-red-600 hover:underline">
                        <i className="fa-solid fa-right-from-bracket mr-2"></i>Logout
                    </button>
                </div>
            </aside>

            <main className="flex-1 flex flex-col">
                <div className="flex-1 p-8 overflow-y-auto">
                     <h1 className="text-4xl font-bold text-black mb-8">{getPageTitle()}</h1>
                     <Routes>
                        {renderRoute("/", <Dashboard employees={employees} sites={sites} />, ['Amministratore', 'Responsabile', 'Lavoratore'])}
                        {renderRoute("/employees", <EmployeeList employees={employees} setEmployees={setEmployees} sites={sites} />, ['Amministratore', 'Responsabile'])}
                        {renderRoute("/sites", <SiteList sites={sites} setSites={setSites} employees={employees} />, ['Amministratore', 'Responsabile'])}
                        {renderRoute("/find-operators", <FindOperators employees={employees} sites={sites} apiKeys={apiKeys} />, ['Amministratore', 'Responsabile'])}
                        {renderRoute("/users", <UserList users={users} setUsers={setUsers} employees={employees} />, ['Amministratore'])}
                        {renderRoute("/absences/requests", <LeaveRequests employees={employees} leaveRequests={leaveRequests} setLeaveRequests={setLeaveRequests} />, ['Amministratore', 'Responsabile'])}
                        {renderRoute("/absences/sickness", <Sickness employees={employees} sicknessRecords={sicknessRecords} setSicknessRecords={setSicknessRecords} />, ['Amministratore', 'Responsabile'])}
                        {renderRoute("/absences/weekly", <WeeklyAbsences employees={employees} leaveRequests={leaveRequests} sicknessRecords={sicknessRecords} />, ['Amministratore', 'Responsabile'])}
                        {renderRoute("/jolly", <JollyPlans employees={employees} sites={sites} leaveRequests={leaveRequests} sicknessRecords={sicknessRecords} schedules={schedules} setSchedules={setSchedules} apiKeys={apiKeys} />, ['Amministratore', 'Responsabile'])}
                        {renderRoute("/api-settings", <ApiSettings apiKeys={apiKeys} setApiKeys={setApiKeys} />, ['Amministratore'])}
                        <Route path="*" element={<Navigate to="/" />} />
                    </Routes>
                </div>
            </main>
        </div>
    );
};


// --- App Root Component ---

const App: React.FC = () => {
    const { user, authLoading } = useAuth();

    if (authLoading) {
         return (
            <div className="flex items-center justify-center h-screen bg-gray-100">
                <i className="fa-solid fa-spinner fa-spin text-5xl text-blue-600"></i>
            </div>
        );
    }
    
    return (
        <Routes>
            {!user ? (
                <>
                    <Route path="/login" element={<Login />} />
                    <Route path="*" element={<Navigate to="/login" replace />} />
                </>
            ) : (
                <Route path="/*" element={<MainApp />} />
            )}
        </Routes>
    );
};

export default App;