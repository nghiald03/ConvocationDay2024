import { useAuth } from "@/context/AuthContext";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { router } from "expo-router";
import { Alert } from "react-native";

const API_BASE_URL = "https://your-api-url.com/api";
const ACCESS_TOKEN_KEY = "@access_token";
const REFRESH_TOKEN_KEY = "@refresh_token";

class ApiClient {
    private baseURL: string;
    private isRefreshing: boolean = false;
    private refreshPromise: Promise<string> | null = null;

    constructor(baseURL: string) {
        this.baseURL = baseURL;
    }

    private async getAccessToken(): Promise<string | null> {
        return await AsyncStorage.getItem(ACCESS_TOKEN_KEY);
    }

    private async getRefreshToken(): Promise<string | null> {
        return await AsyncStorage.getItem(REFRESH_TOKEN_KEY);
    }

    /**
     * Refresh access token nếu hết hạn
     */
    // private async refreshAccessTokenIfNeeded(): Promise<string | null> {
    //     const accessToken = await this.getAccessToken();

    //     if (!accessToken) {
    //         return null;
    //     }

    //     // Nếu token chưa hết hạn, return luôn
    //     if (!JWTHelper.isExpired(accessToken)) {
    //         return accessToken;
    //     }

    //     // Nếu đang refresh, đợi promise hiện tại
    //     if (this.isRefreshing && this.refreshPromise) {
    //         return await this.refreshPromise;
    //     }

    //     // Bắt đầu refresh
    //     this.isRefreshing = true;
    //     this.refreshPromise = this.performRefresh();

    //     try {
    //         const newToken = await this.refreshPromise;
    //         return newToken;
    //     } finally {
    //         this.isRefreshing = false;
    //         this.refreshPromise = null;
    //     }
    // }

    // private async performRefresh(): Promise<string> {
    //     const refreshToken = await this.getRefreshToken();

    //     if (!refreshToken) {
    //         throw new Error("No refresh token available");
    //     }

    //     try {
    //         const response = await authAPI.refreshToken(refreshToken);
    //         const newAccessToken = response.data.accessToken;

    //         // Lưu token mới
    //         await AsyncStorage.setItem(ACCESS_TOKEN_KEY, newAccessToken);

    //         return newAccessToken;
    //     } catch (error) {
    //         // Refresh token thất bại, clear auth
    //         await AsyncStorage.multiRemove([ACCESS_TOKEN_KEY, REFRESH_TOKEN_KEY, "@user"]);
    //         throw new Error("Session expired. Please login again.");
    //     }
    // }

    async request<T>(
        endpoint: string,
        options: RequestInit = {}
    ): Promise<T> {
        const headers: Record<string, string> = {
            "Content-Type": "application/json",
        };

        try {
            const { user, logout } = useAuth();

            const response = await fetch(`${this.baseURL}${endpoint}`, {
                ...options,
                headers,
            });

            const data = await response.json();

            // 🔥 Nếu token hết hạn
            if (response.status === 401) {
                Alert.alert(
                    "Phiên đăng nhập hết hạn",
                    "Vui lòng đăng nhập lại để tiếp tục.",
                    [
                        {
                            text: "Đăng nhập lại",
                            onPress: () => {
                                // Xóa token cũ nếu có
                                // AsyncStorage.removeItem("accessToken");
                                // Điều hướng về login
                                logout()
                            },
                        },
                    ]
                );
                throw new Error("Token expired");
            }

            if (!response.ok) {
                throw new Error(data.message || "API request failed");
            }

            return data;
        } catch (error) {
            if (error instanceof Error) {
                throw error;
            }
            throw new Error("Network error");
        }
    }

    get<T>(endpoint: string, options?: RequestInit): Promise<T> {
        return this.request<T>(endpoint, { ...options, method: "GET" });
    }

    post<T>(endpoint: string, body: any, options?: RequestInit): Promise<T> {
        return this.request<T>(endpoint, {
            ...options,
            method: "POST",
            body: JSON.stringify(body),
        });
    }

    put<T>(endpoint: string, body: any, options?: RequestInit): Promise<T> {
        return this.request<T>(endpoint, {
            ...options,
            method: "PUT",
            body: JSON.stringify(body),
        });
    }

    delete<T>(endpoint: string, options?: RequestInit): Promise<T> {
        return this.request<T>(endpoint, { ...options, method: "DELETE" });
    }
}

export const apiClient = new ApiClient(API_BASE_URL);