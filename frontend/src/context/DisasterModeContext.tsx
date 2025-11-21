import React, { createContext, useContext, useState } from 'react';

interface DisasterModeContextType {
    isDisasterMode: boolean;
    toggleDisasterMode: () => void;
}

const DisasterModeContext = createContext<DisasterModeContextType | undefined>(undefined);

export const DisasterModeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const [isDisasterMode, setIsDisasterMode] = useState(false);

    const toggleDisasterMode = () => {
        setIsDisasterMode(prev => !prev);
    };

    return (
        <DisasterModeContext.Provider value={{ isDisasterMode, toggleDisasterMode }}>
            {children}
        </DisasterModeContext.Provider>
    );
};

export const useDisasterMode = () => {
    const context = useContext(DisasterModeContext);
    if (context === undefined) {
        throw new Error('useDisasterMode must be used within a DisasterModeProvider');
    }
    return context;
};
