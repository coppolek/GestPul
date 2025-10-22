import React, { useState } from 'react';
import { User, Employee } from '../types';
import UserModal from './modals/UserModal';
import * as api from '../services/api';
import { useAuth } from '../contexts/AuthContext';

interface UserListProps {
  users: User[];
  setUsers: React.Dispatch<React.SetStateAction<User[]>>;
  employees: Employee[];
}

const UserList: React.FC<UserListProps> = ({ users, setUsers, employees }) => {
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [selectedUser, setSelectedUser] = useState<User | null>(null);
    const [isSaving, setIsSaving] = useState(false);
    const { user: currentUser } = useAuth();

    const handleOpenModal = (user: User | null = null) => {
        setSelectedUser(user);
        setIsModalOpen(true);
    };
    
    const handleCloseModal = () => {
        setIsModalOpen(false);
        setSelectedUser(null);
    };

    const handleSaveUser = async (userData: Omit<User, 'id'> & { id?: string }) => {
        setIsSaving(true);
        try {
            if (userData.id) {
                // Edit user
                const originalUser = users.find(u => u.id === userData.id);
                if(!originalUser) throw new Error("User not found");

                const userToUpdate = {
                    ...originalUser,
                    ...userData,
                };
                
                // If password is not provided, keep the old one
                if (!userData.password) {
                   delete userToUpdate.password;
                   // We need to fetch the original user again to get the password to save
                   const allUsers = await api.getData<User[]>('users');
                   const originalUserWithPassword = allUsers.find(u => u.id === userData.id);
                   userToUpdate.password = originalUserWithPassword?.password;
                }
                
                const updatedUser = await api.updateData<User>('users', userData.id, userToUpdate as User);
                setUsers(prev => prev.map(u => u.id === updatedUser.id ? updatedUser : u));

            } else {
                // Add new user
                const newUser = await api.addData<Omit<User, 'id'>, User>('users', userData);
                setUsers(prev => [...prev, newUser]);
            }
            handleCloseModal();
        } catch (error) {
            console.error("Failed to save user", error);
            alert("Salvataggio fallito. Riprova.");
        } finally {
            setIsSaving(false);
        }
    };
    
    const handleDeleteUser = async (userId: string) => {
        if(currentUser?.id === userId) {
            alert("Non puoi eliminare il tuo stesso account.");
            return;
        }
        if (window.confirm('Sei sicuro di voler eliminare questo utente?')) {
            try {
                await api.deleteData('users', userId);
                setUsers(prev => prev.filter(u => u.id !== userId));
            } catch (error) {
                console.error("Failed to delete user", error);
                alert("Eliminazione fallita. Riprova.");
            }
        }
    };

    return (
        <>
            <div className="bg-white p-6 rounded-xl shadow-lg">
                <div className="flex justify-between items-center mb-6">
                    <h2 className="text-2xl font-bold text-gray-800">Elenco Utenti</h2>
                    <button onClick={() => handleOpenModal()} className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors">
                        <i className="fa-solid fa-plus mr-2"></i>Aggiungi Utente
                    </button>
                </div>

                <div className="overflow-x-auto">
                    <table className="w-full text-left">
                        <thead className="bg-gray-50">
                            <tr>
                                <th className="p-3 font-semibold text-gray-600">Username</th>
                                <th className="p-3 font-semibold text-gray-600">Ruolo</th>
                                <th className="p-3 font-semibold text-gray-600 text-center">Azioni</th>
                            </tr>
                        </thead>
                        <tbody>
                            {users.map(user => (
                                <tr key={user.id} className="border-b hover:bg-gray-50">
                                    <td className="p-3 font-medium text-gray-800">{user.username}</td>
                                    <td className="p-3 text-gray-600">{user.role}</td>
                                    <td className="p-3 text-center space-x-2">
                                        <button onClick={() => handleOpenModal(user)} className="text-yellow-600 hover:text-yellow-800" title="Modifica"><i className="fa-solid fa-pencil"></i></button>
                                        <button onClick={() => handleDeleteUser(user.id)} className="text-red-600 hover:text-red-800" title="Elimina" disabled={currentUser?.id === user.id}><i className="fa-solid fa-trash"></i></button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>
            {isModalOpen && (
                <UserModal
                    isOpen={isModalOpen}
                    onClose={handleCloseModal}
                    onSave={handleSaveUser}
                    user={selectedUser}
                    isSaving={isSaving}
                    employees={employees}
                    users={users}
                />
            )}
        </>
    );
};

export default UserList;
