'use client';

import { createContext, useContext, type ReactNode } from 'react';
import type { RealtimeConnection } from '@/lib/realtime/use-realtime';

interface SignalRContextType {
    isConnected: boolean;
    connectionState: string;
    connection: RealtimeConnection | null;
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
    connection: RealtimeConnection | null;
    isFullscreen: boolean;
    toggleFullscreen: () => void;
}) => {
    return (
        <SignalRContext.Provider value={{ isConnected, connectionState, connection, isFullscreen, toggleFullscreen }}>
            {children}
        </SignalRContext.Provider>
    );
};
export default SignalRProvider;

