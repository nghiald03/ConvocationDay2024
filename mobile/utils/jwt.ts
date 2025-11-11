export interface JWTPayload {
    userId: string;
    email: string;
    exp: number;
    iat: number;
    fullname: string;
    role?: string;
}

export class JWTHelper {
    /**
     * Decode JWT token (không verify signature - BE sẽ verify)
     */
    static decode(token: string): JWTPayload | null {
        try {
            const parts = token.split(".");
            if (parts.length !== 3) {
                return null;
            }

            // Decode base64url
            const payload = parts[1];
            const base64 = payload.replace(/-/g, "+").replace(/_/g, "/");
            const jsonPayload = decodeURIComponent(
                atob(base64)
                    .split("")
                    .map((c) => "%" + ("00" + c.charCodeAt(0).toString(16)).slice(-2))
                    .join("")
            );

            return JSON.parse(jsonPayload);
        } catch (error) {
            console.error("Error decoding JWT:", error);
            return null;
        }
    }

    /**
     * Check nếu token đã hết hạn
     */
    static isExpired(token: string): boolean {
        const payload = this.decode(token);
        if (!payload) {
            return true;
        }

        // exp là unix timestamp (seconds), Date.now() là milliseconds
        const currentTime = Math.floor(Date.now() / 1000);
        return payload.exp < currentTime;
    }

    /**
     * Check nếu token sắp hết hạn (còn < 5 phút)
     */
    static isExpiringSoon(token: string, minutesBeforeExpiry: number = 5): boolean {
        const payload = this.decode(token);
        if (!payload) {
            return true;
        }

        const currentTime = Math.floor(Date.now() / 1000);
        const timeUntilExpiry = payload.exp - currentTime;
        return timeUntilExpiry < minutesBeforeExpiry * 60;
    }

    /**
     * Lấy thời gian còn lại của token (seconds)
     */
    static getTimeRemaining(token: string): number {
        const payload = this.decode(token);
        if (!payload) {
            return 0;
        }

        const currentTime = Math.floor(Date.now() / 1000);
        return Math.max(0, payload.exp - currentTime);
    }
}