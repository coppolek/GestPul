import React, { useState, useMemo } from 'react';
import { MessageGroup, Employee } from '../../types';
import * as api from '../../services/api';

interface MessageGroupModalProps {
  isOpen: boolean;
  onClose: () => void;
  groups: MessageGroup[];
  setGroups: React.Dispatch<React.SetStateAction<MessageGroup[]>>;
  employees: Employee[];
}

const MessageGroupModal: React.FC<MessageGroupModalProps> = ({ isOpen, onClose, groups, setGroups, employees }) => {
  const [editingGroup, setEditingGroup] = useState<MessageGroup | null>(null);
  const [groupName, setGroupName] = useState('');
  const [selectedEmployeeIds, setSelectedEmployeeIds] = useState<string[]>([]);
  const [employeeSearch, setEmployeeSearch] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  const employeeMap = useMemo(() => new Map(employees.map(e => [e.id, `${e.firstName} ${e.lastName}`])), [employees]);

  const startNewGroup = () => {
    setEditingGroup(null);
    setGroupName('');
    setSelectedEmployeeIds([]);
    setEmployeeSearch('');
  };

  const startEditing = (group: MessageGroup) => {
    setEditingGroup(group);
    setGroupName(group.name);
    setSelectedEmployeeIds(group.employeeIds);
    setEmployeeSearch('');
  };

  const handleSave = async () => {
    if (!groupName.trim()) {
      alert('Il nome del gruppo è obbligatorio.');
      return;
    }
    setIsSaving(true);
    try {
      if (editingGroup) { // Update
        const updatedGroup = { ...editingGroup, name: groupName, employeeIds: selectedEmployeeIds };
        const saved = await api.updateData<MessageGroup>('messageGroups', editingGroup.id, updatedGroup);
        setGroups(prev => prev.map(g => g.id === saved.id ? saved : g));
      } else { // Create
        const newGroupData: Omit<MessageGroup, 'id'> = { name: groupName, employeeIds: selectedEmployeeIds };
        const saved = await api.addData<Omit<MessageGroup, 'id'>, MessageGroup>('messageGroups', newGroupData);
        setGroups(prev => [...prev, saved]);
      }
      startNewGroup();
    } catch (error) {
      console.error("Failed to save group", error);
      alert("Salvataggio fallito.");
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async (groupId: string) => {
    if (window.confirm('Sei sicuro di voler eliminare questo gruppo?')) {
        try {
            await api.deleteData('messageGroups', groupId);
            setGroups(prev => prev.filter(g => g.id !== groupId));
            if (editingGroup?.id === groupId) {
                startNewGroup();
            }
        } catch (error) {
            console.error("Failed to delete group", error);
            alert("Eliminazione fallita.");
        }
    }
  };
  
  const handleEmployeeToggle = (employeeId: string) => {
    setSelectedEmployeeIds(prev =>
      prev.includes(employeeId)
        ? prev.filter(id => id !== employeeId)
        : [...prev, employeeId]
    );
  };
  
  const filteredEmployees = useMemo(() => {
    const search = employeeSearch.toLowerCase();
    return employees.filter(e =>
      `${e.firstName} ${e.lastName}`.toLowerCase().includes(search)
    );
  }, [employees, employeeSearch]);


  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex justify-center items-center" onClick={onClose}>
      <div className="bg-white p-6 rounded-xl shadow-2xl w-full max-w-4xl max-h-[90vh] flex flex-col" onClick={e => e.stopPropagation()}>
        <div className="flex justify-between items-center mb-4 border-b pb-3">
            <h2 className="text-2xl font-bold text-gray-800">Gestisci Gruppi di Messaggistica</h2>
            <button onClick={onClose} className="text-gray-500 hover:text-gray-800 text-2xl">&times;</button>
        </div>
        
        <div className="flex-1 flex gap-6 overflow-hidden">
            {/* Left Panel: Group List */}
            <div className="w-1/3 border-r pr-4 overflow-y-auto">
                <h3 className="text-lg font-semibold mb-2">Gruppi Esistenti</h3>
                <button onClick={startNewGroup} className="w-full text-left p-2 mb-2 rounded bg-blue-500 text-white hover:bg-blue-600">
                    <i className="fa-solid fa-plus mr-2"></i>Crea Nuovo Gruppo
                </button>
                <div className="space-y-2">
                    {groups.map(group => (
                        <div key={group.id} className={`p-2 rounded border cursor-pointer ${editingGroup?.id === group.id ? 'bg-blue-100 border-blue-400' : 'hover:bg-gray-100'}`}>
                           <div className="flex justify-between items-start">
                                <div onClick={() => startEditing(group)}>
                                    <p className="font-semibold">{group.name}</p>
                                    <p className="text-xs text-gray-500">{group.employeeIds.length} membri</p>
                                </div>
                                <div>
                                    <button onClick={() => startEditing(group)} className="text-yellow-600 text-sm mr-2"><i className="fa fa-pencil"></i></button>
                                    <button onClick={() => handleDelete(group.id)} className="text-red-500 text-sm"><i className="fa fa-trash"></i></button>
                                </div>
                           </div>
                        </div>
                    ))}
                </div>
            </div>

            {/* Right Panel: Editor */}
            <div className="w-2/3 flex flex-col">
                <h3 className="text-lg font-semibold mb-2">{editingGroup ? `Modifica: ${editingGroup.name}` : 'Nuovo Gruppo'}</h3>
                <div className="space-y-4">
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Nome Gruppo</label>
                        <input type="text" value={groupName} onChange={e => setGroupName(e.target.value)} className="w-full p-2 border border-gray-300 rounded-lg"/>
                    </div>
                    <div>
                         <label className="block text-sm font-medium text-gray-700 mb-1">Membri del Gruppo ({selectedEmployeeIds.length})</label>
                         <input type="text" placeholder="Cerca dipendente..." value={employeeSearch} onChange={e => setEmployeeSearch(e.target.value)} className="w-full p-2 border border-gray-300 rounded-lg mb-2"/>
                         <div className="max-h-60 overflow-y-auto border rounded-lg p-2 bg-gray-50 space-y-1">
                            {filteredEmployees.map(emp => (
                                <label key={emp.id} className="flex items-center space-x-2 cursor-pointer p-1 rounded hover:bg-blue-100">
                                    <input type="checkbox" className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                                        checked={selectedEmployeeIds.includes(emp.id)}
                                        onChange={() => handleEmployeeToggle(emp.id)}
                                    />
                                    <span>{emp.firstName} {emp.lastName}</span>
                                </label>
                            ))}
                         </div>
                    </div>
                </div>
                <div className="mt-auto pt-4 border-t text-right">
                    <button onClick={handleSave} disabled={isSaving} className="px-6 py-2 bg-green-600 text-white font-semibold rounded-lg hover:bg-green-700 disabled:bg-gray-400">
                        {isSaving ? 'Salvataggio...' : (editingGroup ? 'Salva Modifiche' : 'Crea Gruppo')}
                    </button>
                </div>
            </div>
        </div>
      </div>
    </div>
  );
};

export default MessageGroupModal;