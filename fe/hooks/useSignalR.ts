import { useEffect, useState, useRef } from 'react';
import { HubConnection, HubConnectionBuilder } from '@microsoft/signalr';

interface UseSignalROptions {
  hubUrl: string;
  accessToken?: string;
  autoConnect?: boolean;
  onTTSBroadcast?: (data: any) => void;
  onConnectionStateChange?: (state: string) => void;
}

export const useSignalR = (options: UseSignalROptions) => {
  const {
    hubUrl,
    accessToken,
    autoConnect = true,
    onTTSBroadcast,
    onConnectionStateChange,
  } = options;

  const [connection, setConnection] = useState<HubConnection | null>(null);
  const [connectionState, setConnectionState] = useState<string>('Disconnected');
  const [isConnected, setIsConnected] = useState(false);
  const connectionRef = useRef<HubConnection | null>(null);

  useEffect(() => {
    const createConnection = () => {
      const newConnection = new HubConnectionBuilder()
        .withUrl(hubUrl, {
          accessTokenFactory: () => accessToken || '',
        })
        .withAutomaticReconnect()
        .build();

      // Connection state change handler
      newConnection.onreconnecting(() => {
        console.log('[SignalR] Reconnecting...');
        setConnectionState('Reconnecting');
        setIsConnected(false);
        onConnectionStateChange?.('Reconnecting');
      });

      newConnection.onreconnected(() => {
        console.log('[SignalR] Reconnected successfully');
        setConnectionState('Connected');
        setIsConnected(true);
        onConnectionStateChange?.('Connected');
      });

      newConnection.onclose(() => {
        console.log('[SignalR] Connection closed');
        setConnectionState('Disconnected');
        setIsConnected(false);
        onConnectionStateChange?.('Disconnected');
      });

      // Register event handlers
      if (onTTSBroadcast) {
        newConnection.on('ReceiveTTSBroadcast', (data) => {
          console.log('[SignalR] Received TTS broadcast:', data);
          onTTSBroadcast(data);
        });
      }

      newConnection.on('ReceiveMessage', (message) => {
        console.log('[SignalR] Received message:', message);
      });

      setConnection(newConnection);
      connectionRef.current = newConnection;

      if (autoConnect) {
        startConnection(newConnection);
      }
    };

    if (!connection) {
      createConnection();
    }

    return () => {
      if (connectionRef.current) {
        connectionRef.current.stop().catch(console.error);
      }
    };
  }, [hubUrl, accessToken, autoConnect]);

  const startConnection = async (conn?: HubConnection) => {
    const targetConnection = conn || connection;
    if (!targetConnection) {
      console.log('[SignalR DEBUG] No connection available to start');
      return;
    }

    // Check if already connecting or connected
    if (targetConnection.state !== 'Disconnected') {
      console.log('[SignalR DEBUG] Connection already in progress or connected, state:', targetConnection.state);
      return;
    }

    try {
      console.log('[SignalR DEBUG] Starting connection to:', hubUrl);
      console.log('[SignalR DEBUG] Using access token:', accessToken ? `${accessToken.substring(0, 10)}...` : 'none');
      setConnectionState('Connecting');
      await targetConnection.start();
      console.log('[SignalR SUCCESS] Connected successfully to SignalR hub');
      setConnectionState('Connected');
      setIsConnected(true);
      onConnectionStateChange?.('Connected');
    } catch (error: any) {
      console.error('[SignalR ERROR] Connection failed:', error);
      console.error('[SignalR ERROR] Error details:', error?.message || error);
      setConnectionState('Disconnected');
      setIsConnected(false);
      onConnectionStateChange?.('Disconnected');
    }
  };

  const stopConnection = async () => {
    if (connection) {
      try {
        console.log('[SignalR] Stopping connection...');
        await connection.stop();
        console.log('[SignalR] Connection stopped');
      } catch (error) {
        console.error('[SignalR] Error stopping connection:', error);
      }
    }
  };

  const joinNoticerGroup = async () => {
    if (connection && isConnected) {
      try {
        await connection.invoke('JoinNoticerGroup');
        console.log('[SignalR] Joined Noticer group');
      } catch (error) {
        console.error('[SignalR] Error joining Noticer group:', error);
      }
    }
  };

  const leaveNoticerGroup = async () => {
    if (connection && isConnected) {
      try {
        await connection.invoke('LeaveNoticerGroup');
        console.log('[SignalR] Left Noticer group');
      } catch (error) {
        console.error('[SignalR] Error leaving Noticer group:', error);
      }
    }
  };

  const sendMessage = async (methodName: string, data: any) => {
    if (connection && isConnected) {
      try {
        await connection.invoke('SendMessage', methodName, data);
        console.log('[SignalR] Message sent:', { methodName, data });
      } catch (error) {
        console.error('[SignalR] Error sending message:', error);
      }
    }
  };

  return {
    connection,
    connectionState,
    isConnected,
    startConnection: () => startConnection(),
    stopConnection,
    joinNoticerGroup,
    leaveNoticerGroup,
    sendMessage,
  };
};