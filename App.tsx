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
            `flex items-center py-1 text-blue-700 hover:underline ${isActive ? 'font-bold' : ''}`
        }
    >
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
            <button
                onClick={() => setIsOpen(!isOpen)}
                className="flex items-center w-full py-1 text-blue-700 hover:underline border rounded px-2 text-left"
            >
                <i className={`fa-solid ${icon} w-8 text-center text-base`}></i>
                <span className="text-base flex-1">{title}</span>
                <i className={`fa-solid fa-chevron-down ml-auto transition-transform text-xs ${isOpen ? 'rotate-180' : ''}`}></i>
            </button>
            {isOpen && (
                <div className="pl-8 pt-2 mt-1 space-y-1">
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
            `flex items-center py-1 text-blue-700 hover:underline ${isActive ? 'font-bold' : ''}`
        }
    >
         <span className="text-sm">{children}</span>
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
        <div className="flex h-screen bg-white font-sans">
            {/* Sidebar */}
            <aside className="w-64 border-r flex flex-col bg-gray-50">
                <div className="p-4 border-b">
                    <h1 className="text-xl font-bold">Gestionale</h1>
                </div>
                <nav className="p-4 space-y-4 flex-1">
                    <NavItem to="/" icon="fa-chart-pie">Dashboard</NavItem>
                    <NavItem to="/employees" icon="fa-users">Dipendenti</NavItem>
                    <NavItem to="/sites" icon="fa-building-user">Cantieri</NavItem>
                    <AccordionNavItem icon="fa-person-walking" title="Assenze">
                        <SubNavItem to="/absences/requests">Richieste</SubNavItem>
                        <SubNavItem to="/absences/sickness">Malattie</SubNavItem>
                        <SubNavItem to="/absences/weekly">Riepilogo</SubNavItem>
                    </AccordionNavItem>
                    <NavItem to="/jolly" icon="fa-shuffle">Pianifica Jolly</NavItem>
                </nav>
                <div className="p-4 mt-auto border-t text-sm text-gray-500">
                    <p>&copy; 2025 Gestionale PRO</p>
                </div>
            </aside>

            {/* Main Content */}
            <main className="flex-1 flex flex-col">
                <div className="flex-1 p-8 overflow-y-auto">
                     <h1 className="text-4xl font-bold text-black mb-8">{getPageTitle()}</h1>
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
