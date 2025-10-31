import React, { useState } from 'react';
import { Message } from '../types';
import { useAuth } from '../contexts/AuthContext';
import * as api from '../services/api';

interface BulletinBoardProps {
    messages: Message[];
    setMessages: React.Dispatch<React.SetStateAction<Message[]>>;
}

const BulletinBoard: React.FC<BulletinBoardProps> = ({ messages, setMessages }) => {
    const { user } = useAuth();
    const [newMessage, setNewMessage] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);

    const handlePostMessage = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!newMessage.trim() || !user) return;

        setIsSubmitting(true);
        try {
            const messageData: Omit<Message, 'id'> = {
                text: newMessage,
                authorId: user.id,
                authorName: user.username,
                timestamp: new Date().toISOString(),
            };
            const postedMessage = await api.addData<Omit<Message, 'id'>, Message>('messages', messageData);
            setMessages(prev => [postedMessage, ...prev]);
            setNewMessage('');
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

    return (
        <div className="bg-white p-6 rounded-xl shadow-lg">
            <h2 className="text-2xl font-bold text-gray-800 mb-4">
                <i className="fa-solid fa-bullhorn mr-3 text-blue-500"></i>
                Bacheca Comunicazioni
            </h2>

            {user?.role === 'Amministratore' && (
                <form onSubmit={handlePostMessage} className="mb-8 p-4 border rounded-lg bg-gray-50">
                    <textarea
                        value={newMessage}
                        onChange={(e) => setNewMessage(e.target.value)}
                        placeholder="Scrivi qui la tua comunicazione per tutti i lavoratori..."
                        rows={3}
                        className="w-full p-2 border border-gray-300 rounded-lg"
                        disabled={isSubmitting}
                        required
                    />
                    <div className="text-right mt-2">
                        <button
                            type="submit"
                            disabled={isSubmitting || !newMessage.trim()}
                            className="px-4 py-2 bg-blue-600 text-white font-semibold rounded-lg hover:bg-blue-700 disabled:bg-gray-400"
                        >
                            {isSubmitting ? 'Pubblicazione...' : 'Pubblica'}
                        </button>
                    </div>
                </form>
            )}

            <div className="space-y-4 max-h-[60vh] overflow-y-auto pr-2">
                {messages.length > 0 ? (
                    messages.map(msg => (
                        <div key={msg.id} className="p-4 border-l-4 border-blue-500 bg-blue-50 rounded-r-lg relative group">
                            <p className="text-gray-800 whitespace-pre-wrap">{msg.text}</p>
                            <div className="text-right text-xs text-gray-500 mt-2">
                                Pubblicato da <span className="font-semibold">{msg.authorName}</span> il {new Date(msg.timestamp).toLocaleString('it-IT')}
                            </div>
                            {user?.role === 'Amministratore' && (
                                <button 
                                    onClick={() => handleDeleteMessage(msg.id)}
                                    className="absolute top-2 right-2 text-red-500 hover:text-red-700 opacity-0 group-hover:opacity-100 transition-opacity"
                                    title="Elimina"
                                >
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
    );
};

export default BulletinBoard;
