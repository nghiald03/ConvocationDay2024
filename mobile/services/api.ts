const API_BASE_URL = "http://143.198.84.82:85/api"; // Thay bằng URL thực tế

export interface LoginRequest {
    userName: string;
    password: string;
}

export interface LoginResponse {
    accessToken: string;
    status: number;
    data: string;
}

// export interface RefreshTokenResponse {
//     success: boolean;
//     data: {
//         accessToken: string;
//     };
//     message?: string;
// }

export const authAPI = {
    login: async (credentials: LoginRequest): Promise<LoginResponse> => {
        try {
            const response = await fetch(`${API_BASE_URL}/auth/login`, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify(credentials),
            });

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.message || "Đăng nhập thất bại");
            }

            return data;
        } catch (error) {
            if (error instanceof Error) {
                throw error;
            }
            throw new Error("Không thể kết nối đến server");
        }
    },

    // refreshToken: async (refreshToken: string): Promise<RefreshTokenResponse> => {
    //     try {
    //         const response = await fetch(`${API_BASE_URL}/auth/refresh`, {
    //             method: "POST",
    //             headers: {
    //                 "Content-Type": "application/json",
    //             },
    //             body: JSON.stringify({ refreshToken }),
    //         });

    //         const data = await response.json();

    //         if (!response.ok) {
    //             throw new Error(data.message || "Refresh token thất bại");
    //         }

    //         return data;
    //     } catch (error) {
    //         if (error instanceof Error) {
    //             throw error;
    //         }
    //         throw new Error("Không thể refresh token");
    //     }
    // },

    logout: async (refreshToken: string): Promise<void> => {
        try {
            await fetch(`${API_BASE_URL}/auth/logout`, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({ refreshToken }),
            });
        } catch (error) {
            console.error("Logout API error:", error);
        }
    },
};