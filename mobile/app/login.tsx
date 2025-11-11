import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import React, { useState } from "react";
import {
    ActivityIndicator,
    Alert,
    Image,
    KeyboardAvoidingView,
    Platform,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useAuth } from "../context/AuthContext";

export default function LoginScreen() {
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [isLoading, setIsLoading] = useState(false);

    const { login } = useAuth();
    const router = useRouter();

    const handleLogin = async () => {
        if (!email || !password) {
            Alert.alert("Thông báo", "Vui lòng nhập đầy đủ email và mật khẩu");
            return;
        }

        // Validate email FPT
        // if (!email.toLowerCase().endsWith("@fpt.edu.vn")) {
        //     Alert.alert("Thông báo", "Vui lòng sử dụng email FPT (@fpt.edu.vn)");
        //     return;
        // }

        setIsLoading(true);

        try {
            await login(email, password);
            // Login thành công, router sẽ tự động redirect
            console.info("Login success!")
            router.replace("/(tabs)/home");
        } catch (error) {
            let errorMessage = "Đăng nhập thất bại. Vui lòng thử lại!";

            if (error instanceof Error) {
                errorMessage = error.message;
            }

            Alert.alert("Lỗi đăng nhập", errorMessage);
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <SafeAreaView style={styles.container}>
            <KeyboardAvoidingView
                behavior={Platform.OS === "ios" ? "padding" : "height"}
                style={styles.inner}
            >
                {/* Logo */}
                <View style={styles.logoContainer}>
                    <Image
                        source={{
                            uri: "https://upload.wikimedia.org/wikipedia/commons/4/41/FPT_logo_2010.svg",
                        }}
                        style={styles.logo}
                        resizeMode="contain"
                    />
                    <Text style={styles.title}>Welcome! 🎓</Text>
                    <Text style={styles.subtitle}>Đăng nhập để bắt đầu check-in</Text>
                </View>

                {/* Form */}
                <View style={styles.formContainer}>
                    <View style={styles.inputWrapper}>
                        <Ionicons name="mail-outline" size={20} color="#FF6600" />
                        <TextInput
                            placeholder="Email FPT"
                            placeholderTextColor="#999"
                            keyboardType="email-address"
                            autoCapitalize="none"
                            style={styles.input}
                            value={email}
                            onChangeText={setEmail}
                            editable={!isLoading}
                        />
                    </View>

                    <View style={styles.inputWrapper}>
                        <Ionicons name="lock-closed-outline" size={20} color="#FF6600" />
                        <TextInput
                            placeholder="Mật khẩu"
                            placeholderTextColor="#999"
                            secureTextEntry
                            style={styles.input}
                            value={password}
                            onChangeText={setPassword}
                            editable={!isLoading}
                        />
                    </View>

                    <TouchableOpacity
                        style={[styles.loginButton, isLoading && styles.loginButtonDisabled]}
                        onPress={handleLogin}
                        disabled={isLoading}
                    >
                        {isLoading ? (
                            <ActivityIndicator color="#FFF" />
                        ) : (
                            <Text style={styles.loginText}>Đăng nhập</Text>
                        )}
                    </TouchableOpacity>
                </View>

                {/* Footer */}
                <Text style={styles.footer}>© FPT University 2025</Text>
            </KeyboardAvoidingView>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: "#FFF",
    },
    inner: {
        flex: 1,
        paddingHorizontal: 24,
        justifyContent: "space-between",
        alignItems: "center",
    },
    logoContainer: {
        alignItems: "center",
        marginTop: 40,
    },
    logo: {
        width: 140,
        height: 60,
    },
    title: {
        fontSize: 22,
        fontWeight: "700",
        color: "#FF6600",
        marginTop: 24,
    },
    subtitle: {
        fontSize: 14,
        color: "#555",
        marginTop: 8,
    },
    formContainer: {
        width: "100%",
        marginTop: 24,
    },
    inputWrapper: {
        flexDirection: "row",
        alignItems: "center",
        backgroundColor: "#FFF",
        borderWidth: 1,
        borderColor: "#FF6600",
        borderRadius: 12,
        paddingHorizontal: 12,
        paddingVertical: 10,
        marginBottom: 16,
    },
    input: {
        flex: 1,
        marginLeft: 8,
        fontSize: 16,
        color: "#333",
    },
    loginButton: {
        backgroundColor: "#FF6600",
        borderRadius: 12,
        paddingVertical: 14,
        alignItems: "center",
        shadowColor: "#FF6600",
        shadowOpacity: 0.3,
        shadowOffset: { width: 0, height: 4 },
        shadowRadius: 6,
        elevation: 5,
    },
    loginButtonDisabled: {
        opacity: 0.6,
    },
    loginText: {
        color: "#FFF",
        fontSize: 16,
        fontWeight: "700",
    },
    footer: {
        fontSize: 12,
        color: "#999",
        marginBottom: 20,
    },
});