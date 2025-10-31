

import React, { useState, useMemo, useRef, useEffect } from 'react';
import { Employee, WorkSite, ApiKey, AppSetting, AiProviderSetting } from '../types';
import { GoogleGenAI, FunctionDeclarationTool, Type, GenerateContentResponse, FunctionResponsePart } from '@google/genai';

interface CommandPromptProps {
    employees: Employee[];
    sites: WorkSite[];
    apiKeys: ApiKey[];
    appSettings: AppSetting[];
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

const getActiveSiteCount = (sites: WorkSite[]): number => sites.filter(s => s.status === 'In Corso').length;

// --- Dichiarazioni delle Funzioni (Formato Gemini) ---
const geminiTools: FunctionDeclarationTool[] = [{
    functionDeclarations: [
        {
            name: 'getEmployeesBySiteName',
            description: "Ottiene un elenco di dipendenti che lavorano in un cantiere specifico, dato il nome del cantiere.",
            parameters: { type: Type.OBJECT, properties: { siteName: { type: Type.STRING, description: 'Il nome, anche parziale, del cantiere da cercare.' } }, required: ['siteName'] },
        },
        {
            name: 'getActiveSiteCount',
            description: "Restituisce il numero totale di cantieri attualmente attivi.",
            parameters: { type: Type.OBJECT, properties: {} },
        }
    ],
}];

// --- Convertitore di tool da formato Gemini a formato OpenAI (per Groq) ---
const convertToOpenAITools = (tools: FunctionDeclarationTool[]) => {
    if (!tools || !tools[0]?.functionDeclarations) return [];
    return tools[0].functionDeclarations.map(func => ({
        type: 'function',
        function: {
            name: func.name,
            description: func.description,
            parameters: {
                type: (func.parameters.type as string).toLowerCase(),
                description: func.parameters.description,
                required: func.parameters.required,
                properties: Object.fromEntries(
                    Object.entries(func.parameters.properties || {}).map(([key, value]) => [
                        // FIX: Cast `value` to `any` to resolve errors with spread operator and property access on type `unknown`.
                        key, { ...(value as any), type: ((value as any).type as string).toLowerCase() }
                    ])
                ),
            }
        }
    }));
};

const GeminiCommandPrompt: React.FC<CommandPromptProps> = ({ employees, sites, apiKeys, appSettings }) => {
    const [messages, setMessages] = useState<ChatMessage[]>([]);
    const [input, setInput] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const messagesEndRef = useRef<HTMLDivElement>(null);

    const aiProvider = useMemo(() => (appSettings.find(s => s.id === 'ai_provider') as AiProviderSetting | undefined)?.value ?? 'gemini', [appSettings]);
    const geminiApiKey = useMemo(() => apiKeys.find(k => k.id === 'google_gemini')?.key, [apiKeys]);
    const groqApiKey = useMemo(() => apiKeys.find(k => k.id === 'groq')?.key, [apiKeys]);

    const activeApiKey = aiProvider === 'gemini' ? geminiApiKey : groqApiKey;

    useEffect(() => {
        if (messages.length === 0) {
            setMessages([{ id: 1, sender: 'bot', type: 'text', content: 'Ciao! Sono il tuo assistente. Prova a chiedermi: "quanti cantieri sono attivi?" oppure "chi lavora al cantiere Sole?"' }]);
        }
    }, [messages.length]);

    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages, isLoading]);

    const handleSendMessage = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!input.trim() || isLoading || !activeApiKey) return;

        const userMessage: ChatMessage = { id: Date.now(), sender: 'user', type: 'text', content: input };
        setMessages(prev => [...prev, userMessage]);
        const currentInput = input;
        setInput('');
        setIsLoading(true);
        setError(null);

        try {
            if (aiProvider === 'gemini') {
                await handleSendGeminiMessage(currentInput);
            } else {
                await handleSendGroqMessage(currentInput);
            }
        } catch (err: any) {
            console.error(`${aiProvider} API error:`, err);
            const errorMessage = "Oops! Qualcosa è andato storto. Controlla la chiave API e riprova.";
            setError(errorMessage);
        } finally {
            setIsLoading(false);
        }
    };
    
    const handleSendGeminiMessage = async (prompt: string) => {
        const ai = new GoogleGenAI({ apiKey: geminiApiKey! });
        const response = await ai.models.generateContent({
            model: 'gemini-2.5-pro',
            contents: prompt,
            config: { tools: geminiTools }
        });

        if (response.functionCalls && response.functionCalls.length > 0) {
            const functionResponses: FunctionResponsePart[] = [];
            for (const call of response.functionCalls) {
                const { functionResult, resultType } = executeFunctionCall(call.name, call.args);
                if (functionResult !== undefined) {
                    functionResponses.push({ functionResponse: { name: call.name, response: { result: functionResult } } });
                    setMessages(prev => [...prev, { id: Date.now(), sender: 'bot', type: resultType, content: functionResult }]);
                }
            }
            
            const secondResponse = await ai.models.generateContent({
                model: 'gemini-2.5-pro',
                contents: { parts: [{ text: prompt }, ...response.candidates[0].content.parts, ...functionResponses] },
                config: { tools: geminiTools }
            });

            if (secondResponse.text) {
                setMessages(prev => [...prev, { id: Date.now() + 1, sender: 'bot', type: 'text', content: secondResponse.text }]);
            }
        } else if (response.text) {
            setMessages(prev => [...prev, { id: Date.now(), sender: 'bot', type: 'text', content: response.text }]);
        }
    };

    const handleSendGroqMessage = async (prompt: string) => {
        const groqMessages: any[] = [{ role: 'user', content: prompt }];
        
        const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
            method: 'POST',
            headers: { 'Authorization': `Bearer ${groqApiKey}`, 'Content-Type': 'application/json' },
            body: JSON.stringify({
                model: 'llama3-70b-8192',
                messages: groqMessages,
                tools: convertToOpenAITools(geminiTools),
                tool_choice: 'auto'
            })
        });

        const data = await response.json();
        if (!response.ok) throw new Error(data.error?.message || `HTTP error! status: ${response.status}`);
        
        const responseMessage = data.choices[0].message;
        groqMessages.push(responseMessage);

        if (responseMessage.tool_calls) {
            for (const call of responseMessage.tool_calls) {
                const args = JSON.parse(call.function.arguments);
                const { functionResult, resultType } = executeFunctionCall(call.function.name, args);
                
                if (functionResult !== undefined) {
                    setMessages(prev => [...prev, { id: Date.now() + Math.random(), sender: 'bot', type: resultType, content: functionResult }]);
                    groqMessages.push({ role: 'tool', tool_call_id: call.id, content: JSON.stringify(functionResult) });
                }
            }

            const secondResponse = await fetch('https://api.groq.com/openai/v1/chat/completions', {
                method: 'POST',
                headers: { 'Authorization': `Bearer ${groqApiKey}`, 'Content-Type': 'application/json' },
                body: JSON.stringify({ model: 'llama3-70b-8192', messages: groqMessages })
            });
            const secondData = await secondResponse.json();
            if (!secondResponse.ok) throw new Error(secondData.error?.message || `HTTP error! status: ${secondResponse.status}`);
            
            const finalContent = secondData.choices[0].message.content;
            if (finalContent) {
                setMessages(prev => [...prev, { id: Date.now() + 1, sender: 'bot', type: 'text', content: finalContent }]);
            }
        } else if (responseMessage.content) {
            setMessages(prev => [...prev, { id: Date.now(), sender: 'bot', type: 'text', content: responseMessage.content }]);
        }
    };

    const executeFunctionCall = (name: string, args: any): { functionResult: any, resultType: 'employee_list' | 'count' } => {
        if (name === 'getEmployeesBySiteName') {
            return { functionResult: getEmployeesBySiteName(args.siteName, sites, employees), resultType: 'employee_list' };
        }
        if (name === 'getActiveSiteCount') {
            return { functionResult: getActiveSiteCount(sites), resultType: 'count' };
        }
        return { functionResult: undefined, resultType: 'employee_list' };
    };

    const renderMessageContent = (msg: ChatMessage) => {
        switch(msg.type) {
            case 'text': return <p>{msg.content}</p>;
            case 'employee_list':
                const empList = msg.content as Employee[];
                if (empList.length === 0) return <p>Nessun dipendente trovato per questo cantiere.</p>;
                return <ul className="list-disc list-inside space-y-1">{empList.map(e => <li key={e.id}>{e.firstName} {e.lastName} ({e.role})</li>)}</ul>;
            case 'count': return <p className="font-bold text-xl">{msg.content}</p>;
            default: return null;
        }
    };

    return (
        <div className="h-full flex flex-col">
            <h2 className="text-2xl font-bold text-black mb-4 flex items-center gap-2">
                <i className="fa-solid fa-wand-magic-sparkles text-blue-600"></i>Assistente AI
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
                    type="text" value={input} onChange={e => setInput(e.target.value)}
                    placeholder={!activeApiKey ? "Configura la chiave API..." : "Scrivi un comando..."}
                    className="w-full p-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-100"
                    disabled={isLoading || !activeApiKey}
                />
                <button type="submit" disabled={isLoading || !input.trim() || !activeApiKey} className="bg-blue-600 text-white p-2 rounded-lg w-10 h-10 flex-shrink-0 flex items-center justify-center hover:bg-blue-700 disabled:bg-gray-400">
                    <i className="fa-solid fa-paper-plane"></i>
                </button>
            </form>
        </div>
    );
};

export default GeminiCommandPrompt;