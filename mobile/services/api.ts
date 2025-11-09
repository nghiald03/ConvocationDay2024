import AsyncStorage from "@react-native-async-storage/async-storage";

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

export interface CheckinResponse {
    success: boolean;
    data?: {
        studentCode: string;
        checkinTime: string;
    };
    message?: string;
}

export const checkinAPI = {
    updateStudentCode: async (studentCode: string): Promise<CheckinResponse> => {
        console.log("Updating student code:", studentCode);
        try {
            const token = await getAccessToken();

            const response = await fetch(
                `${API_BASE_URL}/Checkin/UpdateCheckinStudentCode?studentCode=${studentCode}`,
                {
                    method: "PUT",
                    headers: {
                        "Content-Type": "application/json",
                        Authorization: `Bearer ${token}`,
                    },
                }
            );

            console.log(response);

            if (!response.ok) {
                throw new Error("Check-in thất bại");
            }

            return {
                success: true,
                data: {
                    studentCode,
                    checkinTime: new Date().toISOString(),
                },
                message: "Check-in thành công",
            };
        } catch (error) {
            if (error instanceof Error) {
                throw error;
            }
            throw new Error("Không thể kết nối đến server");
        }
    },
};

async function getAccessToken(): Promise<string> {
    const token = await AsyncStorage.getItem("@access_token");
    console.log("Token có trong bộ nhớ!");
    return token || "";
}

export interface GraduateResponse {
    success: boolean;
    data: Graduate[];
    total: number;
    message?: string;
}

export interface Graduate {
    id: number;
    imageUrl: string;
    name: string;
    studentCode: string;
    email: string;
    hall: string;
    session: number;
    seat: number;
    seatExtra: string;
    isCheckedIn: boolean;
}

export interface HallResponse {
    success: boolean;
    data: Hall[];
    message?: string;
}

export interface Hall {
    hallId: number;
    hallName: string;
}

export interface SessionResponse {
    success: boolean;
    data: Session[];
    message?: string;
}

export interface Session {
    sessionId: number;
    sessionName: string;
}

export const graduateAPI = {
    // Lấy danh sách tân cử nhân với pagination
    getAll: async (
        pageIndex: number = 1,
        pageSize: number = 20,
        keySearch?: string,
        sessionId?: number,
        hallId?: number
    ): Promise<GraduateResponse> => {
        try {
            const token = await AsyncStorage.getItem("@access_token");

            let url = `${API_BASE_URL}/Bachelor/GetAll?pageIndex=${pageIndex}&pageSize=${pageSize}`;

            if (keySearch) {
                url += `&keySearch=${encodeURIComponent(keySearch)}`;
            }
            if (sessionId) {
                url += `&sessionId=${sessionId}`;
            }
            if (hallId) {
                url += `&hallId=${hallId}`;
            }

            const response = await fetch(url, {
                method: "GET",
                headers: {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${token}`,
                },
            });

            const result = await response.json();

            if (!response.ok) {
                throw new Error(result.message || "Không thể tải dữ liệu");
            }

            console.log(result);

            // Map response data to match interface
            const graduates = result.data.items.map((item: any) => ({
                id: item.id,
                imageUrl: item.image || "https://via.placeholder.com/60",
                name: item.ten || "",
                studentCode: item.mssv || "",
                email: item.mail || "",
                hall: item.hoiTruong || "",
                session: item.session || 1,
                seat: item.ghe || 0,
                seatExtra: item.ghePhuHuynh || "",
                isCheckedIn: item.isCheckedIn || false,
            }));

            return {
                success: true,
                data: graduates,
                total: result.total || graduates.length,
            };
        } catch (error) {
            console.error("Error fetching graduates:", error);
            throw error;
        }
    },

    // Lấy danh sách halls
    getHalls: async (): Promise<HallResponse> => {
        try {
            const token = await AsyncStorage.getItem("@access_token");

            const response = await fetch(`${API_BASE_URL}/Hall/GetAll`, {
                method: "GET",
                headers: {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${token}`,
                },
            });

            const result = await response.json();

            if (!response.ok) {
                throw new Error(result.message || "Không thể tải danh sách hội trường");
            }

            return {
                success: true,
                data: result.data.map((item: any) => ({
                    hallId: item.hallId,
                    hallName: item.hallName,
                })),
            };
        } catch (error) {
            console.error("Error fetching halls:", error);
            throw error;
        }
    },

    // Lấy danh sách sessions
    getSessions: async (): Promise<SessionResponse> => {
        try {
            const token = await AsyncStorage.getItem("@access_token");

            const response = await fetch(`${API_BASE_URL}/Session/GetAll`, {
                method: "GET",
                headers: {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${token}`,
                },
            });

            const result = await response.json();

            if (!response.ok) {
                throw new Error(result.message || "Không thể tải danh sách phiên");
            }

            return {
                success: true,
                data: result.data.map((item: any) => ({
                    sessionId: item.sessionId,
                    sessionName: item.sessionN || `Phiên ${item.sessionId}`,
                })),
            };
        } catch (error) {
            console.error("Error fetching sessions:", error);
            throw error;
        }
    },
};