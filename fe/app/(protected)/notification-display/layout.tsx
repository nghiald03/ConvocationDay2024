'use client';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Icon } from '@iconify/react';
import { useEffect, useState } from 'react';
import { useSignalR } from '@/hooks/useSignalR';
import { SignalRProvider } from './SignalRContext';
import { toast } from 'sonner';

export default function NotificationDisplayLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    const [userRole, setUserRole] = useState<string>('');
    const [accessToken, setAccessToken] = useState<string>('');
    const [hubUrl, setHubUrl] = useState<string>('');
    const [isFullscreen, setIsFullscreen] = useState(false);

    // Get token and role from localStorage on mount
    useEffect(() => {
        if (typeof window !== 'undefined') {
            const token = localStorage.getItem('accessToken');
            if (token) {
                setAccessToken(token);

                // Parse role from token
                try {
                    const payload = JSON.parse(atob(token.split('.')[1]));
                    console.log('Token payload:', payload);

                    // Thử các cách parse role khác nhau
                    let role = payload['http://schemas.microsoft.com/ws/2008/06/identity/claims/role'] ||
                        payload['role'] ||
                        payload['Role'] ||
                        payload['roles']?.[0] ||
                        payload['Roles']?.[0];

                    console.log('Parsed role:', role);
                    setUserRole(role || 'Unknown');
                } catch (error) {
                    console.error('Error parsing token:', error);
                    setUserRole('Unknown');
                }
            }

            // Set default hub URL
            const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || 'http://143.198.84.82:85';
            setHubUrl(`${baseUrl}/chat-hub`);
        }
    }, []);

    // Initialize SignalR hook with auto-connect
    const shouldInit = hubUrl && accessToken && hubUrl.trim() !== '';

    const {
        connection,
        connectionState,
        isConnected,
        startConnection,
    } = useSignalR({
        hubUrl: shouldInit ? hubUrl : '',
        accessToken: shouldInit ? accessToken : undefined,
        autoConnect: !!shouldInit,
        onConnectionStateChange: (state) => {
            console.log('[SignalR State Change]', state);
        },
        onTTSBroadcast: (data: any) => {
            console.log('[SignalR] Received notification broadcast via onTTSBroadcast:', data);
        },
    });

    // Reconnect handler
    const handleReconnect = async () => {
        toast.info('Đang kết nối lại SignalR...', {
            icon: '🔄',
            duration: 2000,
        });
        const success = await startConnection();
        if (success) {
            toast.success('Kết nối thành công!', {
                icon: '✅',
                duration: 2000,
            });
        } else {
            toast.error('Kết nối thất bại. Vui lòng thử lại!', {
                icon: '❌',
                duration: 3000,
            });
        }
    };

    // Toggle fullscreen
    const toggleFullscreen = () => {
        if (!document.fullscreenElement) {
            document.documentElement.requestFullscreen();
            setIsFullscreen(true);
        } else {
            document.exitFullscreen();
            setIsFullscreen(false);
        }
    };

    // Listen for fullscreen changes
    useEffect(() => {
        const handleFullscreenChange = () => {
            setIsFullscreen(!!document.fullscreenElement);
        };

        document.addEventListener('fullscreenchange', handleFullscreenChange);
        return () => {
            document.removeEventListener('fullscreenchange', handleFullscreenChange);
        };
    }, []);

    // Add/remove class to body when fullscreen
    useEffect(() => {
        if (isFullscreen) {
            document.body.classList.add('notification-fullscreen');
            // Hide header, sidebar, footer
            const header = document.querySelector('header');
            const sidebar = document.querySelector('aside');
            const footer = document.querySelector('footer');
            if (header) header.style.display = 'none';
            if (sidebar) sidebar.style.display = 'none';
            if (footer) footer.style.display = 'none';
        } else {
            document.body.classList.remove('notification-fullscreen');
            // Show header, sidebar, footer
            const header = document.querySelector('header');
            const sidebar = document.querySelector('aside');
            const footer = document.querySelector('footer');
            if (header) header.style.display = '';
            if (sidebar) sidebar.style.display = '';
            if (footer) footer.style.display = '';
        }

        return () => {
            document.body.classList.remove('notification-fullscreen');
            const header = document.querySelector('header');
            const sidebar = document.querySelector('aside');
            const footer = document.querySelector('footer');
            if (header) header.style.display = '';
            if (sidebar) sidebar.style.display = '';
            if (footer) footer.style.display = '';
        };
    }, [isFullscreen]);

    return (
        <SignalRProvider isConnected={isConnected} connectionState={connectionState} connection={connection} isFullscreen={isFullscreen} toggleFullscreen={toggleFullscreen}>
            {/* Fullscreen mode - render without any wrapper */}
            {isFullscreen ? (
                <div className="fixed inset-0 z-[9999] bg-gradient-to-br from-slate-950 via-slate-900 to-black overflow-hidden">
                    <div className="h-full w-full">
                        {children}
                    </div>
                </div>
            ) : (
                <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-black">
                    {/* Status Bar - Top Banner */}
                    <div className="bg-gradient-to-br from-slate-950 to-black border-b border-slate-800">
                        <div className="mx-auto px-4 sm:px-6 md:px-8 lg:px-10 py-3 sm:py-4 md:py-5">
                            <div className="flex items-center justify-between flex-wrap gap-2 sm:gap-3 md:gap-4">
                                {/* Left: Connection Status & Role */}
                                <div className="flex flex-wrap items-center gap-2 sm:gap-3 md:gap-4">
                                    {/* Connection Status */}
                                    {isConnected ? (
                                        <Badge className="bg-green-500/20 border border-green-500/40 text-green-300 shadow-lg shadow-green-500/20 backdrop-blur-sm px-2 py-1.5 sm:px-3 sm:py-2 md:px-4 md:py-2.5 rounded-full">
                                            <div className="flex items-center gap-1 sm:gap-1.5 md:gap-2">
                                                <div className="relative">
                                                    <div className="absolute inset-0 bg-green-500 animate-ping opacity-60 rounded-full"></div>
                                                    <Icon icon="heroicons-outline:signal" className="w-3.5 h-3.5 sm:w-4 sm:h-4 md:w-5 md:h-5 relative" />
                                                </div>
                                                <span className="font-semibold text-xs sm:text-sm">Đã Kết Nối</span>
                                            </div>
                                        </Badge>
                                    ) : connectionState === 'Connecting' ? (
                                        <Badge className="bg-blue-500/20 border border-blue-500/40 text-blue-300 shadow-lg shadow-blue-500/20 backdrop-blur-sm px-2 py-1.5 sm:px-3 sm:py-2 md:px-4 md:py-2.5 rounded-full">
                                            <div className="flex items-center gap-1 sm:gap-1.5 md:gap-2">
                                                <div className="relative">
                                                    <Icon icon="heroicons-outline:arrow-path" className="w-3.5 h-3.5 sm:w-4 sm:h-4 md:w-5 md:h-5 relative animate-spin-slow" />
                                                </div>
                                                <span className="font-semibold text-xs sm:text-sm">Đang Kết Nối...</span>
                                            </div>
                                        </Badge>
                                    ) : (
                                        <Badge className="bg-red-500/20 border border-red-500/40 text-red-300 shadow-lg shadow-red-500/20 backdrop-blur-sm px-2 py-1.5 sm:px-3 sm:py-2 md:px-4 md:py-2.5 rounded-full animate-pulse">
                                            <div className="flex items-center gap-1 sm:gap-1.5 md:gap-2">
                                                <div className="relative">
                                                    <div className="absolute inset-0 bg-red-500 animate-pulse opacity-60 rounded-full"></div>
                                                    <Icon icon="heroicons-outline:x-circle" className="w-3.5 h-3.5 sm:w-4 sm:h-4 md:w-5 md:h-5 relative" />
                                                </div>
                                                <span className="font-semibold text-xs sm:text-sm">Mất Kết Nối</span>
                                            </div>
                                        </Badge>
                                    )}

                                    {/* User Role */}
                                    <Badge className="bg-slate-900/60 border border-slate-800/50 text-white shadow-lg backdrop-blur-sm px-2 py-1.5 sm:px-3 sm:py-2 md:px-4 md:py-2.5 rounded-full">
                                        <div className="flex items-center gap-1 sm:gap-1.5 md:gap-2">
                                            <Icon icon="heroicons-outline:user" className="w-3.5 h-3.5 sm:w-4 sm:h-4 md:w-5 md:h-5" />
                                            <span className="font-semibold text-xs sm:text-sm"><span className="hidden sm:inline">Vai trò: </span>{userRole || 'NO'}</span>
                                        </div>
                                    </Badge>
                                </div>

                                {/* Right: Actions */}
                                <div className="flex items-center gap-2 sm:gap-2.5 md:gap-3">
                                    {/* Fullscreen Button */}
                                    <Badge
                                        onClick={toggleFullscreen}
                                        className="bg-blue-600/20 border border-blue-500/40 text-blue-300 hover:bg-blue-500/30 hover:border-blue-500/50 shadow-lg shadow-blue-500/20 backdrop-blur-sm px-3 py-1.5 sm:px-4 sm:py-2 md:px-5 md:py-2.5 rounded-full cursor-pointer transition-all duration-300 hover:scale-105 active:scale-95"
                                    >
                                        <div className="flex items-center gap-1 sm:gap-1.5 md:gap-2">
                                            <Icon icon="heroicons-outline:arrows-pointing-out" className="w-3.5 h-3.5 sm:w-4 sm:h-4 md:w-5 md:h-5" />
                                            <span className="font-semibold text-xs sm:text-sm hidden sm:inline">Toàn màn hình</span>
                                        </div>
                                    </Badge>

                                    {/* Reconnect Badge */}
                                    {!isConnected && connectionState !== 'Connecting' && (
                                        <TooltipProvider>
                                            <Tooltip>
                                                <TooltipTrigger asChild>
                                                    <Badge
                                                        onClick={handleReconnect}
                                                        className="bg-red-500/20 border border-red-500/40 text-red-300 hover:bg-red-500/30 hover:border-red-500/50 shadow-lg shadow-red-500/20 backdrop-blur-sm px-3 py-1.5 sm:px-4 sm:py-2 md:px-5 md:py-2.5 rounded-full cursor-pointer transition-all duration-300 hover:scale-105 active:scale-95"
                                                    >
                                                        <div className="flex items-center gap-1 sm:gap-1.5 md:gap-2">
                                                            <Icon icon="heroicons-outline:arrow-path" className="w-3.5 h-3.5 sm:w-4 sm:h-4 md:w-5 md:h-5 animate-spin-slow" />
                                                            <span className="font-semibold text-xs sm:text-sm hidden sm:inline">Kết Nối Lại</span>
                                                        </div>
                                                    </Badge>
                                                </TooltipTrigger>
                                                <TooltipContent className="bg-slate-800 border-slate-700">
                                                    <p className="text-white">Kết nối lại SignalR</p>
                                                </TooltipContent>
                                            </Tooltip>
                                        </TooltipProvider>
                                    )}
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Page Content - Responsive height based on status bar */}
                    <div className="h-[calc(100vh-65px)] sm:h-[calc(100vh-70px)] md:h-[calc(100vh-75px)] lg:h-[calc(100vh-80px)] overflow-hidden">
                        {children}
                    </div>
                </div>
            )}
        </SignalRProvider>
    );
}
