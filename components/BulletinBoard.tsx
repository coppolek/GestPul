import React, { useState, useMemo, useRef, useEffect } from 'react';
import { Message, MessageTarget, Employee, MessageGroup } from '../types';
import { useAuth } from '../contexts/AuthContext';
import * as api from '../services/api';
import MessageGroupModal from './modals/MessageGroupModal';

interface BulletinBoardProps {
    messages: Message[];
    setMessages: React.Dispatch<React.SetStateAction<Message[]>>;
    employees: Employee[];
    messageGroups: MessageGroup[];
    setMessageGroups: React.Dispatch<React.SetStateAction<MessageGroup[]>>;
}

const BulletinBoard: React.FC<BulletinBoardProps> = ({ messages, setMessages, employees, messageGroups, setMessageGroups }) => {
    const { user } = useAuth();
    const [newMessage, setNewMessage] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);
    
    // State for message targeting
    const [targetType, setTargetType] = useState<'all' | 'role' | 'users' | 'group'>('all');
    const [selectedRole, setSelectedRole] = useState<Employee['role']>('Operatore');
    const [selectedGroupId, setSelectedGroupId] = useState<string>('');
    const [selectedEmployeeIds, setSelectedEmployeeIds] = useState<string[]>([]);
    const [employeeSearch, setEmployeeSearch] = useState('');
    const [isSearchOpen, setIsSearchOpen] = useState(false);
    const searchRef = useRef<HTMLDivElement>(null);
    const [isGroupModalOpen, setIsGroupModalOpen] = useState(false);

    const employeeMap = useMemo(() => new Map(employees.map(e => [e.id, `${e.firstName} ${e.lastName}`])), [employees]);
    const groupMap = useMemo(() => new Map(messageGroups.map(g => [g.id, g.name])), [messageGroups]);
    const currentEmployee = useMemo(() => user?.employeeId ? employees.find(e => e.id === user.employeeId) : null, [user, employees]);

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (searchRef.current && !searchRef.current.contains(event.target as Node)) {
                setIsSearchOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const handlePostMessage = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!newMessage.trim() || !user) return;

        let target: MessageTarget = { type: 'all' };
        if (targetType === 'role') {
            target = { type: 'role', role: selectedRole };
        } else if (targetType === 'group') {
             if (!selectedGroupId) {
                alert('Seleziona un gruppo.');
                return;
            }
            target = { type: 'group', groupId: selectedGroupId };
        } else if (targetType === 'users') {
            if (selectedEmployeeIds.length === 0) {
                alert('Seleziona almeno un dipendente.');
                return;
            }
            target = { type: 'users', employeeIds: selectedEmployeeIds };
        }

        setIsSubmitting(true);
        try {
            const messageData: Omit<Message, 'id'> = {
                text: newMessage,
                authorId: user.id,
                authorName: user.username,
                timestamp: new Date().toISOString(),
                target,
            };
            const postedMessage = await api.addData<Omit<Message, 'id'>, Message>('messages', messageData);
            setMessages(prev => [postedMessage, ...prev].sort((a,b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()));
            
            // Reset form
            setNewMessage('');
            setTargetType('all');
            setSelectedEmployeeIds([]);
            setSelectedGroupId('');

        } catch (error) {
            console.error("Failed to post message", error);
            alert("Errore durante la pubblicazione del messaggio.");
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleDeleteMessage = async (messageId: string) => {
        if (window.confirm('Sei sicuro di voler eliminare questa comunicazione?')) {
            try {
                await api.deleteData('messages', messageId);
                setMessages(prev => prev.filter(msg => msg.id !== messageId));
            } catch (error) {
                console.error("Failed to delete message", error);
                alert("Errore durante l'eliminazione del messaggio.");
            }
        }
    };

    const handleEmployeeSelect = (employeeId: string) => {
        setSelectedEmployeeIds(prev => 
            prev.includes(employeeId) 
            ? prev.filter(id => id !== employeeId) 
            : [...prev, employeeId]
        );
        setEmployeeSearch('');
        setIsSearchOpen(false);
    };

    const filteredMessages = useMemo(() => {
        if (!user || user.role === 'Amministratore') {
            return messages;
        }
        if (user.role === 'Lavoratore' && currentEmployee) {
            return messages.filter(msg => {
                const target = msg.target;
                if (target.type === 'all') return true;
                if (target.type === 'role' && target.role === currentEmployee.role) return true;
                if (target.type === 'users' && target.employeeIds?.includes(currentEmployee.id)) return true;
                if (target.type === 'group' && target.groupId) {
                    const group = messageGroups.find(g => g.id === target.groupId);
                    return group?.employeeIds.includes(currentEmployee.id) || false;
                }
                return false;
            });
        }
        return [];
    }, [messages, user, currentEmployee, messageGroups]);
    
    const filteredEmployeesForSearch = useMemo(() => {
        return employees.filter(e => 
            `${e.firstName} ${e.lastName}`.toLowerCase().includes(employeeSearch.toLowerCase()) &&
            !selectedEmployeeIds.includes(e.id)
        );
    }, [employees, employeeSearch, selectedEmployeeIds]);

    const getTargetAudience = (target: MessageTarget): string => {
        if (target.type === 'all') return 'Tutti';
        if (target.type === 'role') return target.role || 'N/D';
        if (target.type === 'group') return groupMap.get(target.groupId || '') || 'Gruppo Sconosciuto';
        if (target.type === 'users') {
            if (!target.employeeIds || target.employeeIds.length === 0) return 'Nessuno';
            const names = target.employeeIds.map(id => employeeMap.get(id) || 'Sconosciuto');
            if (names.length > 2) {
                return `${names.slice(0, 2).join(', ')} e altri ${names.length - 2}`;
            }
            return names.join(', ');
        }
        return 'N/D';
    };


    return (
        <>
        <div className="bg-white p-6 rounded-xl shadow-lg">
            <h2 className="text-2xl font-bold text-gray-800 mb-4">
                <i className="fa-solid fa-bullhorn mr-3 text-blue-500"></i>
                Bacheca Comunicazioni
            </h2>

            {user?.role === 'Amministratore' && (
                <form onSubmit={handlePostMessage} className="mb-8 p-4 border rounded-lg bg-gray-50">
                    <textarea value={newMessage} onChange={(e) => setNewMessage(e.target.value)} placeholder="Scrivi qui la tua comunicazione..."
                        rows={3} className="w-full p-2 border border-gray-300 rounded-lg" disabled={isSubmitting} required />
                    
                    {/* Targeting Options */}
                    <div className="mt-4 space-y-3">
                        <div className="flex justify-between items-center">
                            <label className="block text-sm font-medium text-gray-700">Invia a:</label>
                            <button type="button" onClick={() => setIsGroupModalOpen(true)} className="text-sm text-blue-600 hover:underline">
                                <i className="fa-solid fa-users-cog mr-1"></i>Gestisci Gruppi
                            </button>
                        </div>
                        <div className="flex items-center gap-4 flex-wrap">
                            <label><input type="radio" name="target" value="all" checked={targetType === 'all'} onChange={() => setTargetType('all')} className="mr-1"/> Tutti</label>
                            <label><input type="radio" name="target" value="group" checked={targetType === 'group'} onChange={() => setTargetType('group')} className="mr-1"/> Gruppi</label>
                            <label><input type="radio" name="target" value="role" checked={targetType === 'role'} onChange={() => setTargetType('role')} className="mr-1"/> Ruoli</label>
                            <label><input type="radio" name="target" value="users" checked={targetType === 'users'} onChange={() => setTargetType('users')} className="mr-1"/> Seleziona Operatori</label>
                        </div>
                        
                         {targetType === 'group' && (
                            <select value={selectedGroupId} onChange={e => setSelectedGroupId(e.target.value)} className="w-full md:w-1/2 p-2 border border-gray-300 rounded-lg">
                                <option value="">Seleziona un gruppo...</option>
                                {messageGroups.map(group => <option key={group.id} value={group.id}>{group.name}</option>)}
                            </select>
                        )}

                        {targetType === 'role' && (
                            <select value={selectedRole} onChange={e => setSelectedRole(e.target.value as Employee['role'])} className="w-full md:w-1/2 p-2 border border-gray-300 rounded-lg">
                                <option value="Operatore">Operatori</option>
                                <option value="Jolly">Jolly</option>
                                <option value="Impiegato">Impiegati</option>
                            </select>
                        )}

                        {targetType === 'users' && (
                            <div ref={searchRef} className="relative">
                                <div className="p-2 border border-gray-300 rounded-lg bg-white flex flex-wrap gap-2">
                                    {selectedEmployeeIds.map(id => (
                                        <span key={id} className="bg-blue-100 text-blue-800 text-xs font-semibold px-2.5 py-1 rounded-full flex items-center">
                                            {employeeMap.get(id)}
                                            <button onClick={() => handleEmployeeSelect(id)} className="ml-2 text-blue-600 hover:text-blue-800">&times;</button>
                                        </span>
                                    ))}
                                    <input type="text" value={employeeSearch} onChange={e => setEmployeeSearch(e.target.value)} onFocus={() => setIsSearchOpen(true)}
                                        placeholder="Cerca dipendente..." className="flex-grow p-1 focus:outline-none"/>
                                </div>
                                {isSearchOpen && (
                                    <div className="absolute z-10 w-full mt-1 bg-white border rounded-lg shadow-lg max-h-40 overflow-y-auto">
                                        {filteredEmployeesForSearch.map(emp => (
                                            <div key={emp.id} onClick={() => handleEmployeeSelect(emp.id)}
                                                className="p-2 hover:bg-gray-100 cursor-pointer">{emp.firstName} {emp.lastName}</div>
                                        ))}
                                    </div>
                                )}
                            </div>
                        )}
                    </div>

                    <div className="text-right mt-4">
                        <button type="submit" disabled={isSubmitting || !newMessage.trim()}
                            className="px-4 py-2 bg-blue-600 text-white font-semibold rounded-lg hover:bg-blue-700 disabled:bg-gray-400">
                            {isSubmitting ? 'Pubblicazione...' : 'Pubblica'}
                        </button>
                    </div>
                </form>
            )}

            <div className="space-y-4 max-h-[60vh] overflow-y-auto pr-2">
                {filteredMessages.length > 0 ? (
                    filteredMessages.map(msg => (
                        <div key={msg.id} className="p-4 border-l-4 border-blue-500 bg-blue-50 rounded-r-lg relative group">
                            <p className="text-gray-800 whitespace-pre-wrap">{msg.text}</p>
                            <div className="flex justify-between items-center text-xs text-gray-500 mt-2">
                                <span>Pubblicato da <span className="font-semibold">{msg.authorName}</span> il {new Date(msg.timestamp).toLocaleString('it-IT')}</span>
                                {user?.role === 'Amministratore' && (
                                    <span className="font-semibold bg-white px-2 py-0.5 rounded border">Destinatari: {getTargetAudience(msg.target)}</span>
                                )}
                            </div>
                            {user?.role === 'Amministratore' && (
                                <button onClick={() => handleDeleteMessage(msg.id)}
                                    className="absolute top-2 right-2 text-red-500 hover:text-red-700 opacity-0 group-hover:opacity-100 transition-opacity" title="Elimina">
                                    <i className="fa-solid fa-trash"></i>
                                </button>
                            )}
                        </div>
                    ))
                ) : (
                    <div className="text-center py-8 text-gray-500">
                        <i className="fa-solid fa-envelope-open text-4xl mb-3"></i>
                        <p>Al momento non ci sono nuove comunicazioni.</p>
                    </div>
                )}
            </div>
        </div>

        {isGroupModalOpen && (
            <MessageGroupModal
                isOpen={isGroupModalOpen}
                onClose={() => setIsGroupModalOpen(false)}
                groups={messageGroups}
                setGroups={setMessageGroups}
                employees={employees}
            />
        )}
        </>
    );
};

export default BulletinBoard;