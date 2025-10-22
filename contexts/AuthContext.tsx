import React, { createContext, useState, useContext, useEffect, ReactNode } from 'react';
import { User } from '../types';
import * as api from '../services/api';

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
        // In a real app, never store plaintext passwords. This is for mock purposes.
        const allUsers = await api.getData<User[]>('users');
        const foundUser = allUsers.find(u => u.username === username && u.password === pass);

        if (foundUser) {
            // IMPORTANT: Never store the password in the session or state.
            const { password, ...userToStore } = foundUser;
            setUser(userToStore as User);
            sessionStorage.setItem('user', JSON.stringify(userToStore));
            return userToStore as User;
        }
        return null;
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