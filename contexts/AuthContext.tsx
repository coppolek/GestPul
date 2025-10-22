
import React, { createContext, useState, useContext, useEffect, ReactNode } from 'react';
import { User, Role } from '../types';

// Mock users database
const mockUsers: User[] = [
    { id: 'user-1', username: 'admin', role: 'Amministratore' },
    { id: 'user-2', username: 'responsabile', role: 'Responsabile' },
    { id: 'user-3', username: 'mario.rossi', role: 'Lavoratore', employeeId: 'emp-1' },
];

// Mock password check
const checkPassword = (username: string, pass: string): User | null => {
    if (username === 'admin' && pass === 'admin') return mockUsers.find(u => u.username === 'admin') || null;
    if (username === 'responsabile' && pass === 'responsabile') return mockUsers.find(u => u.username === 'responsabile') || null;
    if (username === 'mario.rossi' && pass === 'password') return mockUsers.find(u => u.username === 'mario.rossi') || null;
    return null;
}

interface AuthContextType {
    user: User | null;
    login: (username: string, pass: string) => Promise<User | null>;
    logout: () => void;
    authLoading: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
    const [user, setUser] = useState<User | null>(null);
    const [authLoading, setAuthLoading] = useState(true);

    useEffect(() => {
        // Check for saved user session on initial load
        try {
            const savedUser = sessionStorage.getItem('user');
            if (savedUser) {
                setUser(JSON.parse(savedUser));
            }
        } catch (error) {
            console.error("Failed to parse user from session storage", error);
            sessionStorage.removeItem('user');
        } finally {
            setAuthLoading(false);
        }
    }, []);

    const login = async (username: string, pass: string): Promise<User | null> => {
        return new Promise(resolve => {
            setTimeout(() => {
                const foundUser = checkPassword(username, pass);
                if (foundUser) {
                    setUser(foundUser);
                    sessionStorage.setItem('user', JSON.stringify(foundUser));
                    resolve(foundUser);
                } else {
                    resolve(null);
                }
            }, 500); // Simulate network delay
        });
    };

    const logout = () => {
        setUser(null);
        sessionStorage.removeItem('user');
    };

    const value = { user, login, logout, authLoading };

    return (
        <AuthContext.Provider value={value}>
            {children}
        </AuthContext.Provider>
    );
};

export const useAuth = (): AuthContextType => {
    const context = useContext(AuthContext);
    if (context === undefined) {
        throw new Error('useAuth must be used within an AuthProvider');
    }
    return context;
};
