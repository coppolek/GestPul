
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
        let allUsers: User[] = [];
        try {
            allUsers = await api.getData<User[]>('users');
        } catch (e) {
            console.error("Login: failed to fetch users", e);
        }

        // Special Case: Fresh Database (e.g. just connected to Supabase) or Empty Local DB
        // If no users exist, allow 'admin'/'admin' and seed the DB.
        if (!allUsers || allUsers.length === 0) {
            if (username.trim() === 'admin' && pass === 'admin') {
                const defaultAdmin: User = { 
                    id: 'user-admin', 
                    username: 'admin', 
                    password: 'admin', 
                    role: 'Amministratore' 
                };
                
                try {
                    // Seed the database with the default admin
                    await api.addData('users', defaultAdmin);
                    console.log("Database seeded with default admin user.");
                } catch (e) {
                    console.error("Failed to seed default admin", e);
                    // Continue to allow login even if seeding fails (e.g. permission issues), 
                    // though data won't persist remotely.
                }

                const { password, ...userToStore } = defaultAdmin;
                setUser(userToStore as User);
                sessionStorage.setItem('user', JSON.stringify(userToStore));
                return userToStore as User;
            }
        }

        const foundUser = allUsers.find(
            u => u.username.toLowerCase() === username.trim().toLowerCase() && u.password === pass
        );

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
