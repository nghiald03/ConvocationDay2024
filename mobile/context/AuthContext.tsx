import { JWTHelper } from "@/utils/jwt";
import AsyncStorage from "@react-native-async-storage/async-storage";
import React, { createContext, useContext, useEffect, useState } from "react";
import { authAPI } from "../services/api";

interface User {
    userId: string;
    email: string;
    fullname: string;
    role?: string;
}

interface AuthContextType {
    user: User | null;
    accessToken: string | null;
    loading: boolean;
    login: (email: string, password: string) => Promise<void>;
    logout: () => Promise<void>;
    // refreshAccessToken: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const USER_KEY = "@user";
const ACCESS_TOKEN_KEY = "@access_token";
const REFRESH_TOKEN_KEY = "@refresh_token";

export function AuthProvider({ children }: { children: React.ReactNode }) {
    const [user, setUser] = useState<User | null>(null);
    const [accessToken, setAccessToken] = useState<string | null>(null);
    // const [refreshToken, setRefreshToken] = useState<string | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        loadStoredAuth();
    }, []);

    // Auto refresh token khi sắp hết hạn
    // useEffect(() => {
    //     if (!accessToken) return;

    //     const interval = setInterval(() => {
    //         // Check mỗi phút
    //         if (JWTHelper.isExpiringSoon(accessToken, 5)) {
    //             console.log("Access token sắp hết hạn, đang refresh...");
    //             refreshAccessToken();
    //         }
    //     }, 60000); // Check mỗi 60 giây

    //     return () => clearInterval(interval);
    // }, [accessToken]);

    const loadStoredAuth = async () => {
        try {
            // const [storedUser, storedAccessToken, storedRefreshToken] = await Promise.all([
            //     AsyncStorage.getItem(USER_KEY),
            //     AsyncStorage.getItem(ACCESS_TOKEN_KEY),
            //     AsyncStorage.getItem(REFRESH_TOKEN_KEY),
            // ]);
            const [storedUser, storedAccessToken] = await Promise.all([
                AsyncStorage.getItem(USER_KEY),
                AsyncStorage.getItem(ACCESS_TOKEN_KEY)
            ]);

            if (storedAccessToken) {
                // Check nếu access token hết hạn
                // if (JWTHelper.isExpired(storedAccessToken)) {
                //     console.log("Access token hết hạn, đang refresh...");

                //     // Thử refresh token
                //     try {
                //         const response = await authAPI.refreshToken(storedRefreshToken);
                //         const newAccessToken = response.data.accessToken;

                //         await AsyncStorage.setItem(ACCESS_TOKEN_KEY, newAccessToken);
                //         setAccessToken(newAccessToken);
                //         setRefreshToken(storedRefreshToken);
                //         setUser(JSON.parse(storedUser));
                //     } catch (error) {
                //         console.error("Refresh token thất bại:", error);
                //         // Refresh token cũng hết hạn, clear auth
                //         await clearAuth();
                //     }
                // } else {
                //     // Token còn hạn
                //     setUser(JSON.parse(storedUser));
                //     setAccessToken(storedAccessToken);
                //     setRefreshToken(storedRefreshToken);
                // }
                setUser(storedUser ? JSON.parse(storedUser) : null);
                setAccessToken(storedAccessToken);
                // setRefreshToken(storedRefreshToken);
            }
        } catch (error) {
            console.error("Error loading auth:", error);
            await clearAuth();
        } finally {
            setLoading(false);
        }
    };

    const login = async (userName: string, password: string) => {
        try {
            const response = await authAPI.login({ userName, password });

            if (response.status == 200) {
                // const { status: userData, accessToken: newAccessToken, refreshToken: newRefreshToken } = response.data;
                const { accessToken: newAccessToken } = response;

                // Lưu vào state
                setAccessToken(newAccessToken);
                console.log(JWTHelper.decode(newAccessToken));
                const payload = JWTHelper.decode(newAccessToken);
                const userData: User = {
                    userId: payload?.userId || "",
                    email: payload?.email || "",
                    fullname: payload?.fullname || "",
                    role: payload?.role || "",
                };
                setUser(userData);
                setUser(userData);
                // setRefreshToken(newRefreshToken);

                // Lưu vào storage
                await Promise.all([
                    AsyncStorage.setItem(USER_KEY, JSON.stringify(userData)),
                    AsyncStorage.setItem(ACCESS_TOKEN_KEY, newAccessToken),
                    // AsyncStorage.setItem(REFRESH_TOKEN_KEY, newRefreshToken),
                ]);
            } else {
                throw new Error(response.data || "Đăng nhập thất bại");
            }
        } catch (error) {
            console.error("Login error:", error);
            throw error;
        }
    };

    // const refreshAccessToken = async () => {
    //     if (!refreshToken) {
    //         console.error("Không có refresh token");
    //         return;
    //     }

    //     try {
    //         const response = await authAPI.refreshToken(refreshToken);
    //         const newAccessToken = response.data.accessToken;

    //         setAccessToken(newAccessToken);
    //         await AsyncStorage.setItem(ACCESS_TOKEN_KEY, newAccessToken);

    //         console.log("Refresh token thành công");
    //     } catch (error) {
    //         console.error("Refresh token error:", error);
    //         // Refresh token hết hạn, logout user
    //         await logout();
    //     }
    // };

    const logout = async () => {
        try {
            // Call API logout để invalidate refresh token trên server
            // if (refreshToken) {
            //     await authAPI.logout(refreshToken);
            // }
        } catch (error) {
            console.error("Error calling logout API:", error);
        } finally {
            await clearAuth();
            setUser(null);
            setAccessToken(null);
            // setRefreshToken(null);
        }
    };

    const clearAuth = async () => {
        await Promise.all([
            AsyncStorage.removeItem(USER_KEY),
            AsyncStorage.removeItem(ACCESS_TOKEN_KEY),
            AsyncStorage.removeItem(REFRESH_TOKEN_KEY),
        ]);
    };

    return (
        // <AuthContext.Provider value={{ user, accessToken, loading, login, logout, refreshAccessToken }}>
        //     {children}
        // </AuthContext.Provider>
        <AuthContext.Provider value={{ user, accessToken, loading, login, logout }}>
            {children}
        </AuthContext.Provider>

    );
}

export function useAuth() {
    const context = useContext(AuthContext);
    if (context === undefined) {
        throw new Error("useAuth must be used within an AuthProvider");
    }
    return context;
}
