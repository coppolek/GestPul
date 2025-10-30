import React, { useState } from 'react';
import { Employee, WorkSite, Message } from '../types';
import { useAuth } from '../contexts/AuthContext';
import * as api from '../services/api';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';

interface DashboardProps {
  employees: Employee[];
  sites: WorkSite[];
  messages: Message[];
  setMessages: React.Dispatch<React.SetStateAction<Message[]>>;
}

const Dashboard: React.FC<DashboardProps> = ({ employees, sites, messages, setMessages }) => {
  const { user } = useAuth();
  const [newMessage, setNewMessage] = useState('');
  const [isPublishing, setIsPublishing] = useState(false);

  const activeSites = sites.filter(site => site.status === 'In Corso').length;
  
  const getUpcomingExpiries = (days: number) => {
    const today = new Date();
    const limitDate = new Date();
    limitDate.setDate(today.getDate() + days);
    
    return employees.filter(e => {
      const contractEndDate = e.endDate ? new Date(e.endDate) : null;
      const medicalVisitDate = new Date(e.medicalVisitExpiry);
      
      const isContractExpiring = contractEndDate && contractEndDate >= today && contractEndDate <= limitDate;
      const isMedicalVisitExpiring = medicalVisitDate >= today && medicalVisitDate <= limitDate;
      
      return isContractExpiring || isMedicalVisitExpiring;
    }).length;
  };
  
  const upcomingExpiries = getUpcomingExpiries(30);

  const employeesBySiteData = sites
    .filter(site => site.status === 'In Corso')
    .map(site => ({
      name: site.name.split(' - ')[0], // Shorten name for chart
      Dipendenti: site.assignments.length,
    }));

  const handlePublishMessage = async () => {
    if (!newMessage.trim() || !user) return;
    setIsPublishing(true);
    try {
      const messageData: Omit<Message, 'id'> = {
        text: newMessage,
        authorId: user.id,
        authorName: user.username,
        timestamp: new Date().toISOString(),
      };
      const savedMessage = await api.addData<Omit<Message, 'id'>, Message>('messages', messageData);
      setMessages(prev => [savedMessage, ...prev]);
      setNewMessage('');
    } catch (error) {
      console.error("Failed to publish message", error);
      alert("Errore nella pubblicazione del messaggio.");
    } finally {
      setIsPublishing(false);
    }
  };

  const handleDeleteMessage = async (messageId: string) => {
    if (!window.confirm("Sei sicuro di voler eliminare questo messaggio?")) return;
    try {
      await api.deleteData('messages', messageId);
      setMessages(prev => prev.filter(m => m.id !== messageId));
    } catch (error) {
      console.error("Failed to delete message", error);
      alert("Errore nell'eliminazione del messaggio.");
    }
  };

  const canManageMessages = user?.role === 'Amministratore' || user?.role === 'Responsabile';

  return (
    <div className="space-y-12">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Dipendenti Totali */}
            <div className="bg-white p-4 rounded-lg shadow">
                <i className="fa-solid fa-users text-xl mb-2 text-gray-600"></i>
                <p className="text-md text-gray-800">Dipendenti Totali</p>
                <p className="text-2xl font-semibold">{employees.length}</p>
            </div>
            {/* Cantieri Attivi */}
            <div className="bg-white p-4 rounded-lg shadow">
                <i className="fa-solid fa-building-user text-xl mb-2 text-gray-600"></i>
                <p className="text-md text-gray-800">Cantieri Attivi</p>
                <p className="text-2xl font-semibold">{activeSites}</p>
            </div>
            {/* Scadenze */}
            <div className="bg-white p-4 rounded-lg shadow">
                <i className="fa-solid fa-calendar-check text-xl mb-2 text-gray-600"></i>
                <p className="text-md text-gray-800">Scadenze (30gg)</p>
                <p className="text-2xl font-semibold">{upcomingExpiries}</p>
            </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            <div className="bg-white p-6 rounded-xl shadow-lg">
                <h2 className="text-2xl font-bold text-black mb-4">Dipendenti per Cantiere Attivo</h2>
                <div style={{ width: '100%', height: 300 }}>
                    <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={employeesBySiteData}>
                            <CartesianGrid strokeDasharray="3 3" />
                            <XAxis dataKey="name" />
                            <YAxis allowDecimals={false} />
                            <Tooltip />
                            <Legend />
                            <Bar dataKey="Dipendenti" fill="#3b82f6" />
                        </BarChart>
                    </ResponsiveContainer>
                </div>
            </div>

            <div className="bg-white p-6 rounded-xl shadow-lg">
                <h2 className="text-2xl font-bold text-black mb-4">Bacheca Messaggi</h2>
                {canManageMessages && (
                    <div className="mb-4">
                        <textarea
                            value={newMessage}
                            onChange={(e) => setNewMessage(e.target.value)}
                            placeholder="Scrivi un messaggio per tutti i lavoratori..."
                            rows={3}
                            className="w-full p-2 border border-gray-300 rounded-lg"
                            disabled={isPublishing}
                        />
                        <button
                            onClick={handlePublishMessage}
                            disabled={isPublishing || !newMessage.trim()}
                            className="mt-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-400 w-full"
                        >
                            {isPublishing ? <i className="fa-solid fa-spinner fa-spin"></i> : 'Pubblica Messaggio'}
                        </button>
                    </div>
                )}
                <div className="space-y-4 max-h-60 overflow-y-auto pr-2">
                    {messages.length > 0 ? messages.map(msg => (
                        <div key={msg.id} className="p-3 bg-gray-50 rounded-lg border-l-4 border-blue-500">
                            <div className="flex justify-between items-start">
                                <div>
                                    <p className="font-semibold text-gray-900">{msg.authorName}</p>
                                    <p className="text-xs text-gray-500">
                                        {new Date(msg.timestamp).toLocaleString('it-IT', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
                                    </p>
                                </div>
                                {canManageMessages && (
                                    <button onClick={() => handleDeleteMessage(msg.id)} className="text-red-500 hover:text-red-700 text-sm">
                                        <i className="fa-solid fa-trash"></i>
                                    </button>
                                )}
                            </div>
                            <p className="text-gray-800 mt-2">{msg.text}</p>
                        </div>
                    )) : (
                        <p className="text-gray-500 text-center py-4">Nessun messaggio in bacheca.</p>
                    )}
                </div>
            </div>
        </div>
    </div>
  );
};

export default Dashboard;