'use client';

import { createContext, useContext, ReactNode } from 'react';
import { HubConnection } from '@microsoft/signalr';

interface SignalRContextType {
    isConnected: boolean;
    connectionState: string;
    connection: HubConnection | null;
    isFullscreen: boolean;
    toggleFullscreen: () => void;
}

const SignalRContext = createContext<SignalRContextType>({
    isConnected: false,
    connectionState: 'Disconnected',
    connection: null,
    isFullscreen: false,
    toggleFullscreen: () => { },
});

export const useSignalRContext = () => useContext(SignalRContext);

const SignalRProvider = ({
    children,
    isConnected,
    connectionState,
    connection,
    isFullscreen,
    toggleFullscreen
}: {
    children: ReactNode;
    isConnected: boolean;
    connectionState: string;
    connection: HubConnection | null;
    isFullscreen: boolean;
    toggleFullscreen: () => void;
}) => {
    return (
        <SignalRContext.Provider value={{ isConnected, connectionState, connection, isFullscreen, toggleFullscreen }}>
            {children}
        </SignalRContext.Provider>
    );
};
export default SignalRProvider

