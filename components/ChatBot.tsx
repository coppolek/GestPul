import React, { useState, useRef, useEffect, useMemo } from 'react';
import { GoogleGenAI, Chat } from '@google/genai';
import { ApiKey } from '../types';

interface ChatBotProps {
    apiKeys: ApiKey[];
}

interface ChatMessage {
    sender: 'user' | 'bot';
    text: string;
}

const ChatBot: React.FC<ChatBotProps> = ({ apiKeys }) => {
    const [isOpen, setIsOpen] = useState(false);
    const [messages, setMessages] = useState<ChatMessage[]>([]);
    const [input, setInput] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const chatRef = useRef<Chat | null>(null);
    const messagesEndRef = useRef<HTMLDivElement | null>(null);

    const geminiApiKey = useMemo(() => apiKeys.find(k => k.id === 'google_gemini')?.key, [apiKeys]);

    useEffect(() => {
        if (isOpen && geminiApiKey && !chatRef.current) {
            try {
                const ai = new GoogleGenAI({ apiKey: geminiApiKey });
                chatRef.current = ai.chats.create({
                    model: 'gemini-2.5-flash',
                    config: {
                         systemInstruction: "Sei un assistente AI per il gestionale 'Coppolecchia', un software per un'impresa di pulizie. Rispondi in modo conciso e amichevole alle domande degli utenti sul software. Al momento, puoi solo rispondere a domande generali. Le funzionalità avanzate come l'importazione di dati tramite chat non sono ancora implementate.",
                    },
                });
                // Initial greeting from the bot
                if (messages.length === 0) {
                    setMessages([{ sender: 'bot', text: 'Ciao! Sono l\'assistente del gestionale Coppolecchia. Come posso aiutarti oggi?' }]);
                }
            } catch (e) {
                console.error("Failed to initialize chat:", e);
                setError("Impossibile inizializzare la chat. Controlla la chiave API nelle Impostazioni.");
            }
        }
    }, [isOpen, geminiApiKey, messages.length]);

    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages, isLoading]);

    const handleSendMessage = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!input.trim() || isLoading || !chatRef.current) return;

        const userMessage: ChatMessage = { sender: 'user', text: input };
        setMessages(prev => [...prev, userMessage]);
        setInput('');
        setIsLoading(true);
        setError(null);

        try {
            const result = await chatRef.current.sendMessage({ message: input });
            const botResponse: ChatMessage = { sender: 'bot', text: result.text };
            setMessages(prev => [...prev, botResponse]);
        } catch (err: any) {
            console.error("Gemini API error:", err);
            const errorMessage = "Oops! Qualcosa è andato storto. Riprova.";
            setError(errorMessage);
            setMessages(prev => [...prev, { sender: 'bot', text: errorMessage }]);
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <>
            {/* Chat Window */}
            {isOpen && (
                <div className="fixed bottom-24 right-8 w-96 h-[32rem] bg-white rounded-2xl shadow-2xl flex flex-col z-50 border border-gray-200">
                    {/* Header */}
                    <div className="p-4 bg-blue-600 text-white rounded-t-2xl flex justify-between items-center">
                        <h3 className="font-bold text-lg">Assistente Coppolecchia</h3>
                        <button onClick={() => setIsOpen(false)} className="text-white hover:text-gray-200 text-2xl">&times;</button>
                    </div>

                    {/* Messages */}
                    <div className="flex-1 p-4 overflow-y-auto bg-gray-50 space-y-4">
                        {messages.map((msg, index) => (
                            <div key={index} className={`flex ${msg.sender === 'user' ? 'justify-end' : 'justify-start'}`}>
                                <div className={`max-w-[80%] p-3 rounded-xl ${msg.sender === 'user' ? 'bg-blue-500 text-white' : 'bg-gray-200 text-gray-800'}`}>
                                    {msg.text}
                                </div>
                            </div>
                        ))}
                        {isLoading && (
                             <div className="flex justify-start">
                                <div className="max-w-[80%] p-3 rounded-xl bg-gray-200 text-gray-800">
                                    <div className="flex items-center space-x-2">
                                        <div className="w-2 h-2 bg-gray-500 rounded-full animate-pulse"></div>
                                        <div className="w-2 h-2 bg-gray-500 rounded-full animate-pulse [animation-delay:0.2s]"></div>
                                        <div className="w-2 h-2 bg-gray-500 rounded-full animate-pulse [animation-delay:0.4s]"></div>
                                    </div>
                                </div>
                            </div>
                        )}
                        {error && (
                             <div className="p-2 text-center text-red-600 bg-red-100 rounded-lg">{error}</div>
                        )}
                        <div ref={messagesEndRef} />
                    </div>

                    {/* Input */}
                    <div className="p-4 border-t bg-white rounded-b-2xl">
                        <form onSubmit={handleSendMessage} className="flex items-center gap-2">
                            <input
                                type="text"
                                value={input}
                                onChange={(e) => setInput(e.target.value)}
                                placeholder={!geminiApiKey ? "Configura la chiave API..." : "Scrivi un messaggio..."}
                                className="w-full p-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                                disabled={isLoading || !geminiApiKey}
                            />
                            <button type="submit" disabled={isLoading || !input.trim() || !geminiApiKey} className="bg-blue-600 text-white p-2 rounded-lg w-10 h-10 flex-shrink-0 flex items-center justify-center hover:bg-blue-700 disabled:bg-gray-400">
                                <i className="fa-solid fa-paper-plane"></i>
                            </button>
                        </form>
                    </div>
                </div>
            )}

            {/* FAB */}
            <button
                onClick={() => setIsOpen(!isOpen)}
                className="fixed bottom-8 right-8 w-16 h-16 bg-blue-600 text-white rounded-full shadow-lg flex items-center justify-center text-2xl z-50 hover:bg-blue-700 transition-transform transform hover:scale-110"
            >
                <i className={`fa-solid ${isOpen ? 'fa-times' : 'fa-comments'}`}></i>
            </button>
        </>
    );
};

export default ChatBot;
