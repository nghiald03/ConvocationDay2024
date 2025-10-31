import { Ionicons } from "@expo/vector-icons";
import { Alert, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useAuth } from "../../context/AuthContext";

export default function ProfileScreen() {
    const { user, logout } = useAuth();

    const handleLogout = () => {
        Alert.alert("Đăng xuất", "Bạn có chắc muốn đăng xuất?", [
            { text: "Hủy", style: "cancel" },
            {
                text: "Đăng xuất",
                style: "destructive",
                onPress: logout,
            },
        ]);
    };

    return (
        <SafeAreaView style={styles.container}>
            <View style={styles.content}>
                <View style={styles.avatarContainer}>
                    <Ionicons name="person-circle" size={100} color="#FF6600" />
                </View>

                <Text style={styles.email}>{user?.email}</Text>
                <Text style={styles.role}>Tân Cử Nhân</Text>

                <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
                    <Ionicons name="log-out-outline" size={20} color="#FFF" />
                    <Text style={styles.logoutText}>Đăng xuất</Text>
                </TouchableOpacity>
            </View>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: "#FFF",
    },
    content: {
        flex: 1,
        padding: 24,
        alignItems: "center",
        justifyContent: "center",
    },
    avatarContainer: {
        marginBottom: 24,
    },
    email: {
        fontSize: 20,
        fontWeight: "600",
        color: "#333",
        marginBottom: 8,
    },
    role: {
        fontSize: 16,
        color: "#666",
        marginBottom: 32,
    },
    logoutButton: {
        flexDirection: "row",
        alignItems: "center",
        backgroundColor: "#FF6600",
        borderRadius: 12,
        paddingVertical: 12,
        paddingHorizontal: 24,
        gap: 8,
    },
    logoutText: {
        color: "#FFF",
        fontSize: 16,
        fontWeight: "600",
    },
});