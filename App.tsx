import React, { useState } from 'react';
import { Routes, Route, NavLink, useLocation } from 'react-router-dom';
import Dashboard from './components/Dashboard';
import EmployeeList from './components/EmployeeList';
import SiteList from './components/SiteList';
import JollyPlans from './components/JollyPlans';
import { useAppData } from './hooks/useMockData';
import LeaveRequests from './components/absences/LeaveRequests';
import Sickness from './components/absences/Sickness';
import WeeklyAbsences from './components/absences/WeeklyAbsences';

const NavItem: React.FC<{ to: string; icon: string; children: React.ReactNode }> = ({ to, icon, children }) => (
    <NavLink
        to={to}
        end
        className={({ isActive }) =>
            `flex items-center px-4 py-3 text-lg font-medium rounded-lg transition-colors ${
                isActive ? 'bg-blue-600 text-white' : 'text-gray-200 hover:bg-blue-800 hover:text-white'
            }`
        }
    >
        <i className={`fa-solid ${icon} w-8 text-center`}></i>
        <span>{children}</span>
    </NavLink>
);

const AccordionNavItem: React.FC<{ icon: string; title: string; children: React.ReactNode }> = ({ icon, title, children }) => {
    const location = useLocation();
    const isParentActive = location.pathname.startsWith('/absences');
    const [isOpen, setIsOpen] = useState(isParentActive);

    return (
        <div>
            <button
                onClick={() => setIsOpen(!isOpen)}
                className={`flex items-center justify-between w-full px-4 py-3 text-lg font-medium rounded-lg transition-colors ${
                    isParentActive ? 'bg-blue-700 text-white' : 'text-gray-200 hover:bg-blue-800 hover:text-white'
                }`}
            >
                <div className="flex items-center">
                    <i className={`fa-solid ${icon} w-8 text-center`}></i>
                    <span>{title}</span>
                </div>
                <i className={`fa-solid fa-chevron-down transition-transform ${isOpen ? 'rotate-180' : ''}`}></i>
            </button>
            {isOpen && (
                <div className="pl-8 pt-2 space-y-2">
                    {children}
                </div>
            )}
        </div>
    );
};

const SubNavItem: React.FC<{ to: string; children: React.ReactNode }> = ({ to, children }) => (
    <NavLink
        to={to}
        className={({ isActive }) =>
            `flex items-center px-4 py-2 text-md font-medium rounded-lg transition-colors ${
                isActive ? 'bg-blue-600 text-white' : 'text-gray-300 hover:bg-blue-800 hover:text-white'
            }`
        }
    >
        {children}
    </NavLink>
);


const App: React.FC = () => {
    const { 
      employees, setEmployees, 
      sites, setSites, 
      leaveRequests, setLeaveRequests, 
      sicknessRecords, setSicknessRecords,
      schedules, setSchedules, 
      loading 
    } = useAppData();
    const location = useLocation();

    const getPageTitle = () => {
        switch (location.pathname) {
            case '/': return 'Dashboard';
            case '/employees': return 'Anagrafica Dipendenti';
            case '/sites': return 'Gestione Cantieri';
            case '/absences/requests': return 'Richieste Ferie e Permessi';
            case '/absences/sickness': return 'Gestione Malattie';
            case '/absences/weekly': return 'Riepilogo Assenze Settimanali';
            case '/jolly': return 'Pianificazione Jolly';
            default: return 'Gestionale Cantieri';
        }
    };

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

    return (
        <div className="flex h-screen bg-gray-100 font-sans">
            {/* Sidebar */}
            <aside className="w-64 bg-blue-900 text-white flex flex-col p-4">
                <div className="text-2xl font-bold mb-10 text-center flex items-center justify-center">
                    <i className="fa-solid fa-helmet-safety mr-3 text-3xl"></i>
                    <span>Gestionale</span>
                </div>
                <nav className="flex flex-col space-y-3">
                    <NavItem to="/" icon="fa-chart-pie">Dashboard</NavItem>
                    <NavItem to="/employees" icon="fa-users">Dipendenti</NavItem>
                    <NavItem to="/sites" icon="fa-building-user">Cantieri</NavItem>
                    <AccordionNavItem icon="fa-person-walking-luggage" title="Assenze">
                        <SubNavItem to="/absences/requests">Richieste</SubNavItem>
                        <SubNavItem to="/absences/sickness">Malattie</SubNavItem>
                        <SubNavItem to="/absences/weekly">Riepilogo</SubNavItem>
                    </AccordionNavItem>
                    <NavItem to="/jolly" icon="fa-shuffle">Pianifica Jolly</NavItem>
                </nav>
                <div className="mt-auto text-center text-blue-300 text-sm">
                    <p>&copy; {new Date().getFullYear()} Gestionale PRO</p>
                </div>
            </aside>

            {/* Main Content */}
            <main className="flex-1 flex flex-col">
                <header className="bg-white shadow-md p-6">
                    <h1 className="text-3xl font-bold text-gray-800">{getPageTitle()}</h1>
                </header>
                <div className="flex-1 p-8 overflow-y-auto">
                    <Routes>
                        <Route path="/" element={<Dashboard employees={employees} sites={sites} />} />
                        <Route path="/employees" element={<EmployeeList employees={employees} setEmployees={setEmployees} sites={sites} />} />
                        <Route path="/sites" element={<SiteList sites={sites} setSites={setSites} employees={employees} />} />
                        <Route path="/absences/requests" element={<LeaveRequests employees={employees} leaveRequests={leaveRequests} setLeaveRequests={setLeaveRequests} />} />
                        <Route path="/absences/sickness" element={<Sickness employees={employees} sicknessRecords={sicknessRecords} setSicknessRecords={setSicknessRecords} />} />
                        <Route path="/absences/weekly" element={<WeeklyAbsences employees={employees} leaveRequests={leaveRequests} sicknessRecords={sicknessRecords} />} />
                        <Route 
                            path="/jolly" 
                            element={<JollyPlans 
                                employees={employees} 
                                sites={sites} 
                                leaveRequests={leaveRequests} 
                                sicknessRecords={sicknessRecords} 
                                schedules={schedules}
                                setSchedules={setSchedules}
                            />} 
                        />
                    </Routes>
                </div>
            </main>
        </div>
    );
};

export default App;