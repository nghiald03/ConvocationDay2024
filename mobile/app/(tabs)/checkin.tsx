import React, { useState, useEffect } from "react";
import {
    StyleSheet,
    Text,
    View,
    TouchableOpacity,
    Alert,
    ActivityIndicator,
    Dimensions,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { CameraView, Camera } from "expo-camera";
import { Ionicons } from "@expo/vector-icons";
import { useAuth } from "../../context/AuthContext";
import { checkinAPI } from "../../services/api";

const { width } = Dimensions.get("window");
const SCAN_AREA_SIZE = width * 0.7;

export default function CheckInScreen() {
    const { user } = useAuth();
    const [hasPermission, setHasPermission] = useState<boolean | null>(null);
    const [isScanning, setIsScanning] = useState(false);
    const [isProcessing, setIsProcessing] = useState(false);
    const [scannedCode, setScannedCode] = useState<string | null>(null);

    useEffect(() => {
        requestCameraPermission();
    }, []);

    const requestCameraPermission = async () => {
        const { status } = await Camera.requestCameraPermissionsAsync();
        setHasPermission(status === "granted");
    };

    const handleBarCodeScanned = async ({ data }: { data: string }) => {
        if (isProcessing || scannedCode === data) return;

        setIsProcessing(true);
        setScannedCode(data);
        setIsScanning(false);

        try {
            const response = await checkinAPI.updateStudentCode(data);

            if (response.success) {
                Alert.alert(
                    "✅ Check-in thành công!",
                    `Bạn đã check-in cho sinh viên thành công!\n\nMã sinh viên: ${data}`,
                    [
                        {
                            text: "OK",
                            onPress: () => {
                                setScannedCode(null);
                                setIsProcessing(false);
                            },
                        },
                    ]
                );
            }
        } catch (error) {
            let errorMessage = "Có lỗi xảy ra. Vui lòng thử lại!";

            if (error instanceof Error) {
                errorMessage = error.message;
            }

            Alert.alert("❌ Check-in thất bại", errorMessage, [
                {
                    text: "Thử lại",
                    onPress: () => {
                        setScannedCode(null);
                        setIsProcessing(false);
                        setIsScanning(true);
                    },
                },
                {
                    text: "Hủy",
                    style: "cancel",
                    onPress: () => {
                        setScannedCode(null);
                        setIsProcessing(false);
                    },
                },
            ]);
        }
    };

    const handleStartScanning = () => {
        setIsScanning(true);
        setScannedCode(null);
    };

    const handleStopScanning = () => {
        setIsScanning(false);
    };

    if (hasPermission === null) {
        return (
            <SafeAreaView style={styles.container}>
                <View style={styles.centerContent}>
                    <ActivityIndicator size="large" color="#FF6600" />
                    <Text style={styles.loadingText}>Đang yêu cầu quyền camera...</Text>
                </View>
            </SafeAreaView>
        );
    }

    if (hasPermission === false) {
        return (
            <SafeAreaView style={styles.container}>
                <View style={styles.centerContent}>
                    <Ionicons name="camera" size={64} color="#999" />
                    <Text style={styles.permissionTitle}>Không có quyền truy cập camera</Text>
                    <Text style={styles.permissionSubtitle}>
                        Vui lòng cấp quyền camera trong Settings để sử dụng tính năng quét QR
                    </Text>
                    <TouchableOpacity style={styles.retryButton} onPress={requestCameraPermission}>
                        <Text style={styles.retryButtonText}>Thử lại</Text>
                    </TouchableOpacity>
                </View>
            </SafeAreaView>
        );
    }

    return (
        <SafeAreaView style={styles.container}>
            {/* Header */}
            <View style={styles.header}>
                <Text style={styles.title}>QR Check-in</Text>
                <Text style={styles.subtitle}>Quét mã QR để check-in tham dự lễ tốt nghiệp</Text>
            </View>

            {/* Camera / Preview */}
            <View style={styles.cameraContainer}>
                {isScanning ? (
                    <>
                        <CameraView
                            style={styles.camera}
                            facing="back"
                            onBarcodeScanned={isProcessing ? undefined : handleBarCodeScanned}
                            barcodeScannerSettings={{
                                barcodeTypes: ["qr"],
                            }}
                        />

                        {/* Scan overlay */}
                        <View style={styles.overlay}>
                            <View style={styles.scanArea}>
                                <View style={[styles.corner, styles.topLeft]} />
                                <View style={[styles.corner, styles.topRight]} />
                                <View style={[styles.corner, styles.bottomLeft]} />
                                <View style={[styles.corner, styles.bottomRight]} />
                            </View>
                        </View>

                        {/* Instruction */}
                        <View style={styles.instructionContainer}>
                            <Text style={styles.instructionText}>
                                Đặt mã QR vào giữa khung hình
                            </Text>
                        </View>

                        {/* Processing indicator */}
                        {isProcessing && (
                            <View style={styles.processingOverlay}>
                                <View style={styles.processingBox}>
                                    <ActivityIndicator size="large" color="#FF6600" />
                                    <Text style={styles.processingText}>Đang xử lý...</Text>
                                </View>
                            </View>
                        )}
                    </>
                ) : (
                    <View style={styles.previewContainer}>
                        <Ionicons name="qr-code-outline" size={120} color="#FF6600" />
                        <Text style={styles.previewTitle}>Sẵn sàng quét mã QR</Text>
                        <Text style={styles.previewSubtitle}>
                            Nhấn nút bên dưới để bắt đầu quét
                        </Text>
                    </View>
                )}
            </View>

            {/* Action buttons */}
            <View style={styles.actionContainer}>
                {!isScanning ? (
                    <TouchableOpacity style={styles.scanButton} onPress={handleStartScanning}>
                        <Ionicons name="scan" size={24} color="#FFF" />
                        <Text style={styles.scanButtonText}>Bắt đầu quét</Text>
                    </TouchableOpacity>
                ) : (
                    <TouchableOpacity
                        style={styles.cancelButton}
                        onPress={handleStopScanning}
                        disabled={isProcessing}
                    >
                        <Ionicons name="close-circle" size={24} color="#FF6600" />
                        <Text style={styles.cancelButtonText}>Dừng quét</Text>
                    </TouchableOpacity>
                )}
            </View>

            {/* Info */}
            <View style={styles.infoContainer}>
                <View style={styles.infoRow}>
                    <Ionicons name="information-circle-outline" size={20} color="#666" />
                    <Text style={styles.infoText}>
                        Mỗi mã QR chỉ được sử dụng một lần
                    </Text>
                </View>
                <View style={styles.infoRow}>
                    <Ionicons name="person-outline" size={20} color="#666" />
                    <Text style={styles.infoText}>
                        Đang đăng nhập: {user?.email}
                    </Text>
                </View>
            </View>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: "#FFF",
    },
    centerContent: {
        flex: 1,
        justifyContent: "center",
        alignItems: "center",
        padding: 24,
    },
    header: {
        padding: 24,
        alignItems: "center",
    },
    title: {
        fontSize: 28,
        fontWeight: "700",
        color: "#FF6600",
        marginBottom: 8,
    },
    subtitle: {
        fontSize: 14,
        color: "#666",
        textAlign: "center",
    },
    loadingText: {
        marginTop: 16,
        fontSize: 16,
        color: "#666",
    },
    permissionTitle: {
        fontSize: 20,
        fontWeight: "600",
        color: "#333",
        marginTop: 16,
        marginBottom: 8,
    },
    permissionSubtitle: {
        fontSize: 14,
        color: "#666",
        textAlign: "center",
        paddingHorizontal: 32,
    },
    retryButton: {
        marginTop: 24,
        backgroundColor: "#FF6600",
        paddingHorizontal: 32,
        paddingVertical: 12,
        borderRadius: 12,
    },
    retryButtonText: {
        color: "#FFF",
        fontSize: 16,
        fontWeight: "600",
    },
    cameraContainer: {
        flex: 1,
        marginHorizontal: 24,
        marginBottom: 16,
        borderRadius: 16,
        overflow: "hidden",
        backgroundColor: "#F5F5F5",
    },
    camera: {
        flex: 1,
    },
    overlay: {
        ...StyleSheet.absoluteFillObject,
        justifyContent: "center",
        alignItems: "center",
    },
    scanArea: {
        width: SCAN_AREA_SIZE,
        height: SCAN_AREA_SIZE,
        position: "relative",
    },
    corner: {
        position: "absolute",
        width: 40,
        height: 40,
        borderColor: "#FF6600",
        borderWidth: 4,
    },
    topLeft: {
        top: 0,
        left: 0,
        borderRightWidth: 0,
        borderBottomWidth: 0,
    },
    topRight: {
        top: 0,
        right: 0,
        borderLeftWidth: 0,
        borderBottomWidth: 0,
    },
    bottomLeft: {
        bottom: 0,
        left: 0,
        borderRightWidth: 0,
        borderTopWidth: 0,
    },
    bottomRight: {
        bottom: 0,
        right: 0,
        borderLeftWidth: 0,
        borderTopWidth: 0,
    },
    instructionContainer: {
        position: "absolute",
        bottom: 80,
        left: 0,
        right: 0,
        alignItems: "center",
    },
    instructionText: {
        color: "#FFF",
        fontSize: 16,
        fontWeight: "600",
        backgroundColor: "rgba(0,0,0,0.6)",
        paddingHorizontal: 20,
        paddingVertical: 10,
        borderRadius: 20,
    },
    processingOverlay: {
        ...StyleSheet.absoluteFillObject,
        backgroundColor: "rgba(0,0,0,0.7)",
        justifyContent: "center",
        alignItems: "center",
    },
    processingBox: {
        backgroundColor: "#FFF",
        padding: 32,
        borderRadius: 16,
        alignItems: "center",
    },
    processingText: {
        marginTop: 16,
        fontSize: 16,
        fontWeight: "600",
        color: "#333",
    },
    previewContainer: {
        flex: 1,
        justifyContent: "center",
        alignItems: "center",
    },
    previewTitle: {
        fontSize: 20,
        fontWeight: "600",
        color: "#333",
        marginTop: 24,
        marginBottom: 8,
    },
    previewSubtitle: {
        fontSize: 14,
        color: "#666",
    },
    actionContainer: {
        paddingHorizontal: 24,
        marginBottom: 16,
    },
    scanButton: {
        backgroundColor: "#FF6600",
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "center",
        paddingVertical: 16,
        borderRadius: 12,
        gap: 8,
        shadowColor: "#FF6600",
        shadowOpacity: 0.3,
        shadowOffset: { width: 0, height: 4 },
        shadowRadius: 6,
        elevation: 5,
    },
    scanButtonText: {
        color: "#FFF",
        fontSize: 18,
        fontWeight: "700",
    },
    cancelButton: {
        backgroundColor: "#FFF",
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "center",
        paddingVertical: 16,
        borderRadius: 12,
        gap: 8,
        borderWidth: 2,
        borderColor: "#FF6600",
    },
    cancelButtonText: {
        color: "#FF6600",
        fontSize: 18,
        fontWeight: "700",
    },
    infoContainer: {
        paddingHorizontal: 24,
        paddingBottom: 16,
        gap: 8,
    },
    infoRow: {
        flexDirection: "row",
        alignItems: "center",
        gap: 8,
    },
    infoText: {
        fontSize: 14,
        color: "#666",
        flex: 1,
    },
});
