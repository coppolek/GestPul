import React, { useState, useMemo, useRef, useEffect } from 'react';
import { Employee, WorkSite, LeaveRequest, SicknessRecord, ApiKey, Message } from '../types';
import * as api from '../services/api';
import { GoogleGenAI, FunctionDeclaration, Type, FunctionDeclarationTool, GenerateContentResponse, FunctionResponsePart } from '@google/genai';

interface CommandPromptProps {
    employees: Employee[];
    sites: WorkSite[];
    apiKeys: ApiKey[];
}

type ChatMessage = {
    id: number;
    sender: 'user' | 'bot';
    type: 'text' | 'employee_list' | 'count';
    content: any;
};

// --- Funzioni eseguibili dall'AI ---

const getEmployeesBySiteName = (siteName: string, sites: WorkSite[], employees: Employee[]): Employee[] => {
    const normalizedSiteName = siteName.trim().toLowerCase();
    const site = sites.find(s => s.name.toLowerCase().includes(normalizedSiteName));
    if (!site) return [];
    
    const employeeIds = new Set(site.assignments.map(a => a.employeeId));
    return employees.filter(e => employeeIds.has(e.id));
};

const getActiveSiteCount = (sites: WorkSite[]): number => {
    return sites.filter(s => s.status === 'In Corso').length;
};

// --- Dichiarazioni delle Funzioni per Gemini ---
const tools: FunctionDeclarationTool[] = [{
    functionDeclarations: [
        {
            name: 'getEmployeesBySiteName',
            description: "Ottiene un elenco di dipendenti che lavorano in un cantiere specifico, dato il nome del cantiere.",
            parameters: {
                type: Type.OBJECT,
                properties: {
                    siteName: {
                        type: Type.STRING,
                        description: 'Il nome, anche parziale, del cantiere da cercare.',
                    },
                },
                required: ['siteName'],
            },
        },
        {
            name: 'getActiveSiteCount',
            description: "Restituisce il numero totale di cantieri attualmente attivi.",
            parameters: { type: Type.OBJECT, properties: {} },
        }
    ],
}];

const GeminiCommandPrompt: React.FC<CommandPromptProps> = ({ employees, sites, apiKeys }) => {
    const [messages, setMessages] = useState<ChatMessage[]>([]);
    const [input, setInput] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const messagesEndRef = useRef<HTMLDivElement>(null);
    const geminiApiKey = useMemo(() => apiKeys.find(k => k.id === 'google_gemini')?.key, [apiKeys]);
    const aiRef = useRef<GoogleGenAI | null>(null);

    useEffect(() => {
        if (geminiApiKey) {
            aiRef.current = new GoogleGenAI({ apiKey: geminiApiKey });
        }
    }, [geminiApiKey]);

    useEffect(() => {
        if (messages.length === 0) {
            setMessages([
                { id: 1, sender: 'bot', type: 'text', content: 'Ciao! Sono il tuo assistente. Prova a chiedermi: "quanti cantieri sono attivi?" oppure "chi lavora al cantiere Sole?"' }
            ]);
        }
    }, [messages.length]);

     useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages, isLoading]);

    const handleSendMessage = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!input.trim() || isLoading || !aiRef.current) return;

        const userMessage: ChatMessage = { id: Date.now(), sender: 'user', type: 'text', content: input };
        setMessages(prev => [...prev, userMessage]);
        const currentInput = input;
        setInput('');
        setIsLoading(true);
        setError(null);

        try {
            const response: GenerateContentResponse = await aiRef.current.models.generateContent({
                model: 'gemini-2.5-pro',
                contents: currentInput,
                config: { tools: tools }
            });

            // FIX: Corrected the condition to check if functionCalls exist and the array is not empty.
            if (response.functionCalls && response.functionCalls.length > 0) {
                const functionResponses: FunctionResponsePart[] = [];

                for (const call of response.functionCalls) {
                    let functionResult: any;
                    let resultType: 'employee_list' | 'count' | 'text' = 'text';

                    if (call.name === 'getEmployeesBySiteName') {
                        const { siteName } = call.args;
                        functionResult = getEmployeesBySiteName(siteName, sites, employees);
                        resultType = 'employee_list';
                        
                    } else if (call.name === 'getActiveSiteCount') {
                        functionResult = getActiveSiteCount(sites);
                        resultType = 'count';
                    }
                    
                    if (functionResult !== undefined) {
                        functionResponses.push({
                            functionResponse: {
                                name: call.name,
                                response: { result: functionResult }
                            }
                        });

                        // Add the structured result to chat immediately
                         setMessages(prev => [...prev, {
                            id: Date.now(),
                            sender: 'bot',
                            type: resultType,
                            content: functionResult
                        }]);
                    }
                }
                
                // Second call to get a natural language summary
                 const secondResponse = await aiRef.current.models.generateContent({
                    model: 'gemini-2.5-pro',
                    contents: { parts: [...response.candidates[0].content.parts, ...functionResponses] },
                    config: { tools: tools }
                });

                if (secondResponse.text) {
                     setMessages(prev => [...prev, {
                        id: Date.now() + 1,
                        sender: 'bot',
                        type: 'text',
                        content: secondResponse.text
                    }]);
                }

            } else if (response.text) {
                setMessages(prev => [...prev, { id: Date.now(), sender: 'bot', type: 'text', content: response.text }]);
            }

        } catch (err: any) {
            console.error("Gemini API error:", err);
            const errorMessage = "Oops! Qualcosa è andato storto. Controlla la chiave API e riprova.";
            setError(errorMessage);
        } finally {
            setIsLoading(false);
        }
    };

    const renderMessageContent = (msg: ChatMessage) => {
        switch(msg.type) {
            case 'text':
                return <p>{msg.content}</p>;
            case 'employee_list':
                const empList = msg.content as Employee[];
                if (empList.length === 0) return <p>Nessun dipendente trovato per questo cantiere.</p>;
                return (
                    <ul className="list-disc list-inside space-y-1">
                        {empList.map(e => <li key={e.id}>{e.firstName} {e.lastName} ({e.role})</li>)}
                    </ul>
                );
            case 'count':
                 return <p className="font-bold text-xl">{msg.content}</p>;
            default:
                return null;
        }
    };

    return (
        <div className="h-full flex flex-col">
            <h2 className="text-2xl font-bold text-black mb-4 flex items-center gap-2">
                <i className="fa-solid fa-wand-magic-sparkles text-blue-600"></i>
                Assistente AI
            </h2>
            <div className="flex-1 bg-gray-50 rounded-lg p-3 overflow-y-auto space-y-4">
                 {messages.map(msg => (
                    <div key={msg.id} className={`flex ${msg.sender === 'user' ? 'justify-end' : 'justify-start'}`}>
                        <div className={`max-w-[85%] p-3 rounded-xl shadow-sm ${msg.sender === 'user' ? 'bg-blue-500 text-white' : 'bg-white text-gray-800'}`}>
                           {renderMessageContent(msg)}
                        </div>
                    </div>
                ))}
                 {isLoading && (
                     <div className="flex justify-start">
                        <div className="max-w-[85%] p-3 rounded-xl shadow-sm bg-white text-gray-800">
                            <div className="flex items-center space-x-2">
                                <div className="w-2 h-2 bg-gray-400 rounded-full animate-pulse"></div>
                                <div className="w-2 h-2 bg-gray-400 rounded-full animate-pulse [animation-delay:0.2s]"></div>
                                <div className="w-2 h-2 bg-gray-400 rounded-full animate-pulse [animation-delay:0.4s]"></div>
                            </div>
                        </div>
                    </div>
                )}
                <div ref={messagesEndRef} />
            </div>
            {error && <p className="text-red-600 text-sm mt-2 text-center">{error}</p>}
            <form onSubmit={handleSendMessage} className="mt-4 flex items-center gap-2">
                <input
                    type="text"
                    value={input}
                    onChange={e => setInput(e.target.value)}
                    placeholder={!geminiApiKey ? "Configura la chiave API Gemini..." : "Scrivi un comando..."}
                    className="w-full p-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-100"
                    disabled={isLoading || !geminiApiKey}
                />
                <button type="submit" disabled={isLoading || !input.trim() || !geminiApiKey} className="bg-blue-600 text-white p-2 rounded-lg w-10 h-10 flex-shrink-0 flex items-center justify-center hover:bg-blue-700 disabled:bg-gray-400">
                    <i className="fa-solid fa-paper-plane"></i>
                </button>
            </form>
        </div>
    );
};

export default GeminiCommandPrompt;