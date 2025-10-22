import React, { useState, useEffect, useMemo } from 'react';
import { User, Employee, Role } from '../../types';

interface UserModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (user: Omit<User, 'id'> & { id?: string }) => void;
  user: User | null;
  isSaving: boolean;
  employees: Employee[];
  users: User[];
}

const UserModal: React.FC<UserModalProps> = ({ isOpen, onClose, onSave, user, isSaving, employees, users }) => {
  const [formData, setFormData] = useState({
    username: '',
    password: '',
    confirmPassword: '',
    role: 'Lavoratore' as Role,
    employeeId: '',
  });
  const [error, setError] = useState('');

  useEffect(() => {
    if (user) {
      setFormData({
        username: user.username,
        password: '',
        confirmPassword: '',
        role: user.role,
        employeeId: user.employeeId || '',
      });
    } else {
      setFormData({
        username: '',
        password: '',
        confirmPassword: '',
        role: 'Lavoratore' as Role,
        employeeId: '',
      });
    }
    setError('');
  }, [user]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
     if(name === 'role' && value !== 'Lavoratore') {
        setFormData(prev => ({ ...prev, employeeId: '' }));
    }
  };
  
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    // --- Validation ---
    if (formData.password !== formData.confirmPassword) {
        setError("Le password non coincidono.");
        return;
    }
    if (!user && !formData.password) { // Password required for new user
        setError("La password è obbligatoria per i nuovi utenti.");
        return;
    }
    const usernameExists = users.some(u => u.username === formData.username && u.id !== user?.id);
    if(usernameExists) {
        setError("Questo username è già in uso.");
        return;
    }
    if (formData.role === 'Lavoratore' && !formData.employeeId) {
        setError("Selezionare un dipendente da associare a questo lavoratore.");
        return;
    }

    const { confirmPassword, ...dataToSave } = formData;
    onSave({ ...dataToSave, id: user?.id });
  };
  
  const availableEmployees = useMemo(() => {
      const linkedEmployeeIds = users
        .filter(u => u.employeeId && u.employeeId !== user?.employeeId)
        .map(u => u.employeeId);
      return employees.filter(e => !linkedEmployeeIds.includes(e.id));
  }, [users, employees, user]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex justify-center items-center" onClick={onClose}>
      <div className="bg-white p-8 rounded-xl shadow-2xl w-full max-w-lg" onClick={e => e.stopPropagation()}>
        <div className="flex justify-between items-center mb-6">
            <h2 className="text-2xl font-bold text-gray-800">{user ? 'Modifica Utente' : 'Aggiungi Utente'}</h2>
            <button onClick={onClose} className="text-gray-500 hover:text-gray-800 text-2xl" disabled={isSaving}>&times;</button>
        </div>
        
        {error && <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded relative mb-4" role="alert">{error}</div>}

        <form onSubmit={handleSubmit} className="space-y-4">
            <fieldset disabled={isSaving}>
                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Username</label>
                    <input type="text" name="username" value={formData.username} onChange={handleChange} className="w-full p-2 border border-gray-300 rounded-lg" required />
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Password</label>
                        <input type="password" name="password" value={formData.password} onChange={handleChange} className="w-full p-2 border border-gray-300 rounded-lg" placeholder={user ? 'Lascia vuoto per non cambiare' : ''} />
                    </div>
                     <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Conferma Password</label>
                        <input type="password" name="confirmPassword" value={formData.confirmPassword} onChange={handleChange} className="w-full p-2 border border-gray-300 rounded-lg" />
                    </div>
                </div>

                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Ruolo</label>
                    <select name="role" value={formData.role} onChange={handleChange} className="w-full p-2 border border-gray-300 rounded-lg">
                        <option value="Amministratore">Amministratore</option>
                        <option value="Responsabile">Responsabile</option>
                        <option value="Lavoratore">Lavoratore</option>
                    </select>
                </div>

                {formData.role === 'Lavoratore' && (
                     <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Collega a Dipendente</label>
                        <select name="employeeId" value={formData.employeeId} onChange={handleChange} className="w-full p-2 border border-gray-300 rounded-lg" required>
                            <option value="">Seleziona dipendente...</option>
                            {availableEmployees.map(emp => 
                                <option key={emp.id} value={emp.id}>{emp.firstName} {emp.lastName}</option>
                            )}
                        </select>
                    </div>
                )}
            </fieldset>
          
            <div className="mt-8 flex justify-end space-x-4">
                <button type="button" onClick={onClose} className="px-4 py-2 bg-gray-200 text-gray-800 rounded-lg hover:bg-gray-300" disabled={isSaving}>Annulla</button>
                <button type="submit" className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed w-28" disabled={isSaving}>
                    {isSaving ? <i className="fa-solid fa-spinner fa-spin"></i> : 'Salva'}
                </button>
            </div>
        </form>
      </div>
    </div>
  );
};

export default UserModal;
