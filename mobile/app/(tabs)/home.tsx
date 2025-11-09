// app/(tabs)/home.tsx
import React, { useState, useEffect } from "react";
import {
    StyleSheet,
    Text,
    View,
    FlatList,
    TouchableOpacity,
    Image,
    TextInput,
    ActivityIndicator,
    RefreshControl,
    Modal,
    ScrollView,
    Alert,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useAuth } from "../../context/AuthContext";
import { graduateAPI, Graduate, Hall, Session } from "../../services/api";

type TabType = "all" | "checkedIn" | "notCheckedIn";
type SortType = "name" | "studentCode" | "checkinStatus" | "seat";
type SortOrder = "asc" | "desc";

export default function HomeScreen() {
    const { user } = useAuth();
    const [activeTab, setActiveTab] = useState<TabType>("all");
    const [graduates, setGraduates] = useState<Graduate[]>([]);
    const [filteredGraduates, setFilteredGraduates] = useState<Graduate[]>([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [searchQuery, setSearchQuery] = useState("");
    const [selectedGraduate, setSelectedGraduate] = useState<Graduate | null>(null);
    const [detailModalVisible, setDetailModalVisible] = useState(false);
    const [filterModalVisible, setFilterModalVisible] = useState(false);
    const [sortModalVisible, setSortModalVisible] = useState(false);
    const [quickActionsVisible, setQuickActionsVisible] = useState(false);
    const [currentPage, setCurrentPage] = useState(1);
    const [totalPages, setTotalPages] = useState(1);
    const pageSize = 20;

    // Filter states
    const [halls, setHalls] = useState<Hall[]>([]);
    const [sessions, setSessions] = useState<Session[]>([]);
    const [selectedHall, setSelectedHall] = useState<number | null>(null);
    const [selectedSession, setSelectedSession] = useState<number | null>(null);

    // Sort states
    const [sortBy, setSortBy] = useState<SortType>("name");
    const [sortOrder, setSortOrder] = useState<SortOrder>("asc");

    useEffect(() => {
        loadInitialData();
    }, []);

    useEffect(() => {
        loadGraduates();
    }, [currentPage, selectedHall, selectedSession]);

    useEffect(() => {
        filterAndSortGraduates();
    }, [graduates, activeTab, searchQuery, sortBy, sortOrder]);

    const loadInitialData = async () => {
        try {
            const [hallsData, sessionsData] = await Promise.all([
                graduateAPI.getHalls(),
                graduateAPI.getSessions(),
            ]);

            if (hallsData.success) setHalls(hallsData.data);
            if (sessionsData.success) setSessions(sessionsData.data);
        } catch (error) {
            console.error("Error loading initial data:", error);
        }
    };

    const loadGraduates = async () => {
        try {
            setLoading(true);
            const response = await graduateAPI.getAll(
                currentPage,
                pageSize,
                undefined,
                selectedSession || undefined,
                selectedHall || undefined
            );

            if (response.success) {
                setGraduates(response.data);
                setTotalPages(Math.ceil(response.total / pageSize));
            }
        } catch (error) {
            console.error("Error loading graduates:", error);
            Alert.alert("Lỗi", "Không thể tải dữ liệu. Vui lòng thử lại!");
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    };

    const filterAndSortGraduates = () => {
        let filtered = [...graduates];

        // Filter by tab
        if (activeTab === "checkedIn") {
            filtered = filtered.filter((g) => g.isCheckedIn);
        } else if (activeTab === "notCheckedIn") {
            filtered = filtered.filter((g) => !g.isCheckedIn);
        }

        // Filter by search
        if (searchQuery.trim()) {
            const query = searchQuery.toLowerCase();
            filtered = filtered.filter(
                (g) =>
                    g.name.toLowerCase().includes(query) ||
                    g.studentCode.toLowerCase().includes(query) ||
                    g.email.toLowerCase().includes(query)
            );
        }

        // Sort
        filtered.sort((a, b) => {
            let comparison = 0;

            switch (sortBy) {
                case "name":
                    comparison = a.name.localeCompare(b.name, "vi");
                    break;
                case "studentCode":
                    comparison = a.studentCode.localeCompare(b.studentCode);
                    break;
                case "checkinStatus":
                    comparison = (a.isCheckedIn ? 1 : 0) - (b.isCheckedIn ? 1 : 0);
                    break;
                case "seat":
                    comparison = a.seat - b.seat;
                    break;
            }

            return sortOrder === "asc" ? comparison : -comparison;
        });

        setFilteredGraduates(filtered);
    };

    const onRefresh = () => {
        setRefreshing(true);
        setCurrentPage(1);
        loadGraduates();
    };

    const handleViewDetail = (graduate: Graduate) => {
        setSelectedGraduate(graduate);
        setDetailModalVisible(true);
    };

    const handleApplyFilter = () => {
        setFilterModalVisible(false);
        setCurrentPage(1);
        loadGraduates();
    };

    const handleResetFilter = () => {
        setSelectedHall(null);
        setSelectedSession(null);
        setFilterModalVisible(false);
        setCurrentPage(1);
        loadGraduates();
    };

    const handleApplySort = (type: SortType, order: SortOrder) => {
        setSortBy(type);
        setSortOrder(order);
        setSortModalVisible(false);
    };

    const handleQuickAction = (action: string) => {
        setQuickActionsVisible(false);

        switch (action) {
            case "refresh":
                onRefresh();
                break;
            case "exportCheckedIn":
                Alert.alert("Xuất dữ liệu", "Xuất danh sách đã check-in (Coming soon)");
                break;
            case "exportAll":
                Alert.alert("Xuất dữ liệu", "Xuất toàn bộ danh sách (Coming soon)");
                break;
            case "statistics":
                showStatistics();
                break;
        }
    };

    const showStatistics = () => {
        const total = graduates.length;
        const checkedIn = graduates.filter((g) => g.isCheckedIn).length;
        const notCheckedIn = total - checkedIn;
        const percentage = total > 0 ? ((checkedIn / total) * 100).toFixed(1) : "0";

        Alert.alert(
            "📊 Thống kê chi tiết",
            `Tổng số: ${total}\n` +
            `Đã check-in: ${checkedIn} (${percentage}%)\n` +
            `Chưa check-in: ${notCheckedIn}\n\n` +
            `${selectedHall ? `Hội trường: ${halls.find((h) => h.hallId === selectedHall)?.hallName}\n` : ""}` +
            `${selectedSession ? `Phiên: ${sessions.find((s) => s.sessionId === selectedSession)?.sessionName}\n` : ""}`
        );
    };

    const getTabCount = (tab: TabType) => {
        if (tab === "all") return graduates.length;
        if (tab === "checkedIn") return graduates.filter((g) => g.isCheckedIn).length;
        return graduates.filter((g) => !g.isCheckedIn).length;
    };

    const getActiveFilterCount = () => {
        let count = 0;
        if (selectedHall) count++;
        if (selectedSession) count++;
        return count;
    };

    const renderGraduateItem = ({ item }: { item: Graduate }) => (
        <TouchableOpacity
            style={styles.graduateCard}
            onPress={() => handleViewDetail(item)}
            activeOpacity={0.7}
        >
            <View style={styles.cardLeft}>
                <Image
                    source={{ uri: item.imageUrl || "https://via.placeholder.com/60" }}
                    style={styles.avatar}
                />
                <View style={styles.graduateInfo}>
                    <Text style={styles.graduateName} numberOfLines={1}>
                        {item.name}
                    </Text>
                    <Text style={styles.graduateCode}>{item.studentCode}</Text>
                    <View style={styles.detailRow}>
                        <Ionicons name="location-outline" size={14} color="#666" />
                        <Text style={styles.detailText}>
                            {item.hall} - Ghế {item.seat}
                        </Text>
                    </View>
                </View>
            </View>

            <View style={styles.cardRight}>
                {item.isCheckedIn ? (
                    <View style={styles.checkedInBadge}>
                        <Ionicons name="checkmark-circle" size={20} color="#4CAF50" />
                        <Text style={styles.checkedInText}>Đã check-in</Text>
                    </View>
                ) : (
                    <View style={styles.notCheckedInBadge}>
                        <Ionicons name="time-outline" size={20} color="#FF9800" />
                        <Text style={styles.notCheckedInText}>Chưa check-in</Text>
                    </View>
                )}
            </View>
        </TouchableOpacity>
    );

    const renderHeader = () => (
        <>
            {/* Welcome Section */}
            <View style={styles.welcomeSection}>
                <View style={styles.welcomeHeader}>
                    <View>
                        <Text style={styles.welcomeTitle}>🎓 Lễ Tốt Nghiệp FPT</Text>
                        <Text style={styles.welcomeSubtitle}>
                            Xin chào, {user?.fullname || user?.email}!
                        </Text>
                    </View>
                    <TouchableOpacity
                        style={styles.quickActionButton}
                        onPress={() => setQuickActionsVisible(true)}
                    >
                        <Ionicons name="menu" size={24} color="#FFF" />
                    </TouchableOpacity>
                </View>
            </View>

            {/* Stats Cards */}
            <View style={styles.statsContainer}>
                <View style={styles.statCard}>
                    <Ionicons name="people" size={24} color="#FF6600" />
                    <Text style={styles.statNumber}>{graduates.length}</Text>
                    <Text style={styles.statLabel}>Tổng số</Text>
                </View>
                <View style={styles.statCard}>
                    <Ionicons name="checkmark-done" size={24} color="#4CAF50" />
                    <Text style={styles.statNumber}>
                        {graduates.filter((g) => g.isCheckedIn).length}
                    </Text>
                    <Text style={styles.statLabel}>Đã check-in</Text>
                </View>
                <View style={styles.statCard}>
                    <Ionicons name="time" size={24} color="#FF9800" />
                    <Text style={styles.statNumber}>
                        {graduates.filter((g) => !g.isCheckedIn).length}
                    </Text>
                    <Text style={styles.statLabel}>Chưa check-in</Text>
                </View>
            </View>

            {/* Search Bar */}
            <View style={styles.searchContainer}>
                <Ionicons name="search" size={20} color="#999" />
                <TextInput
                    style={styles.searchInput}
                    placeholder="Tìm kiếm theo tên hoặc mã sinh viên"
                    placeholderTextColor="#999"
                    value={searchQuery}
                    onChangeText={setSearchQuery}
                />
                {searchQuery ? (
                    <TouchableOpacity onPress={() => setSearchQuery("")}>
                        <Ionicons name="close-circle" size={20} color="#999" />
                    </TouchableOpacity>
                ) : null}
            </View>

            {/* Filter & Sort Bar */}
            <View style={styles.filterSortContainer}>
                <TouchableOpacity
                    style={[styles.filterButton, getActiveFilterCount() > 0 && styles.filterButtonActive]}
                    onPress={() => setFilterModalVisible(true)}
                >
                    <Ionicons
                        name="funnel"
                        size={18}
                        color={getActiveFilterCount() > 0 ? "#FF6600" : "#666"}
                    />
                    <Text
                        style={[
                            styles.filterButtonText,
                            getActiveFilterCount() > 0 && styles.filterButtonTextActive,
                        ]}
                    >
                        Lọc {getActiveFilterCount() > 0 && `(${getActiveFilterCount()})`}
                    </Text>
                </TouchableOpacity>

                <TouchableOpacity
                    style={styles.sortButton}
                    onPress={() => setSortModalVisible(true)}
                >
                    <Ionicons name="swap-vertical" size={18} color="#666" />
                    <Text style={styles.sortButtonText}>Sắp xếp</Text>
                </TouchableOpacity>
            </View>

            {/* Active Filters Display */}
            {(selectedHall || selectedSession) && (
                <View style={styles.activeFiltersContainer}>
                    {selectedHall && (
                        <View style={styles.activeFilterChip}>
                            <Text style={styles.activeFilterText}>
                                {halls.find((h) => h.hallId === selectedHall)?.hallName}
                            </Text>
                            <TouchableOpacity onPress={() => setSelectedHall(null)}>
                                <Ionicons name="close-circle" size={16} color="#FF6600" />
                            </TouchableOpacity>
                        </View>
                    )}
                    {selectedSession && (
                        <View style={styles.activeFilterChip}>
                            <Text style={styles.activeFilterText}>
                                {sessions.find((s) => s.sessionId === selectedSession)?.sessionName}
                            </Text>
                            <TouchableOpacity onPress={() => setSelectedSession(null)}>
                                <Ionicons name="close-circle" size={16} color="#FF6600" />
                            </TouchableOpacity>
                        </View>
                    )}
                </View>
            )}

            {/* Tabs */}
            <View style={styles.tabsContainer}>
                <TouchableOpacity
                    style={[styles.tab, activeTab === "all" && styles.activeTab]}
                    onPress={() => setActiveTab("all")}
                >
                    <Ionicons name="list" size={20} color={activeTab === "all" ? "#FF6600" : "#666"} />
                    <Text style={[styles.tabText, activeTab === "all" && styles.activeTabText]}>
                        Tất cả ({getTabCount("all")})
                    </Text>
                </TouchableOpacity>

                <TouchableOpacity
                    style={[styles.tab, activeTab === "checkedIn" && styles.activeTab]}
                    onPress={() => setActiveTab("checkedIn")}
                >
                    <Ionicons
                        name="checkmark-circle"
                        size={20}
                        color={activeTab === "checkedIn" ? "#FF6600" : "#666"}
                    />
                    <Text style={[styles.tabText, activeTab === "checkedIn" && styles.activeTabText]}>
                        Đã check-in ({getTabCount("checkedIn")})
                    </Text>
                </TouchableOpacity>

                <TouchableOpacity
                    style={[styles.tab, activeTab === "notCheckedIn" && styles.activeTab]}
                    onPress={() => setActiveTab("notCheckedIn")}
                >
                    <Ionicons name="time" size={20} color={activeTab === "notCheckedIn" ? "#FF6600" : "#666"} />
                    <Text style={[styles.tabText, activeTab === "notCheckedIn" && styles.activeTabText]}>
                        Chưa check-in ({getTabCount("notCheckedIn")})
                    </Text>
                </TouchableOpacity>
            </View>

            {/* List Header */}
            <View style={styles.listHeader}>
                <Text style={styles.listHeaderText}>
                    Danh sách tân cử nhân ({filteredGraduates.length})
                </Text>
            </View>
        </>
    );

    const renderPagination = () => (
        <View style={styles.paginationContainer}>
            <TouchableOpacity
                style={[styles.paginationButton, currentPage === 1 && styles.paginationButtonDisabled]}
                onPress={() => setCurrentPage((prev) => Math.max(1, prev - 1))}
                disabled={currentPage === 1}
            >
                <Ionicons name="chevron-back" size={20} color={currentPage === 1 ? "#ccc" : "#FF6600"} />
            </TouchableOpacity>

            <Text style={styles.paginationText}>
                Trang {currentPage} / {totalPages}
            </Text>

            <TouchableOpacity
                style={[
                    styles.paginationButton,
                    currentPage === totalPages && styles.paginationButtonDisabled,
                ]}
                onPress={() => setCurrentPage((prev) => Math.min(totalPages, prev + 1))}
                disabled={currentPage === totalPages}
            >
                <Ionicons
                    name="chevron-forward"
                    size={20}
                    color={currentPage === totalPages ? "#ccc" : "#FF6600"}
                />
            </TouchableOpacity>
        </View>
    );

    if (loading && !refreshing) {
        return (
            <SafeAreaView style={styles.container}>
                <View style={styles.loadingContainer}>
                    <ActivityIndicator size="large" color="#FF6600" />
                    <Text style={styles.loadingText}>Đang tải dữ liệu...</Text>
                </View>
            </SafeAreaView>
        );
    }

    return (
        <SafeAreaView style={styles.container}>
            <FlatList
                data={filteredGraduates}
                renderItem={renderGraduateItem}
                keyExtractor={(item) => item.id.toString()}
                ListHeaderComponent={renderHeader}
                ListFooterComponent={renderPagination}
                contentContainerStyle={styles.listContent}
                refreshControl={
                    <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={["#FF6600"]} tintColor="#FF6600" />
                }
                ListEmptyComponent={
                    <View style={styles.emptyContainer}>
                        <Ionicons name="sad-outline" size={64} color="#ccc" />
                        <Text style={styles.emptyText}>Không tìm thấy dữ liệu</Text>
                    </View>
                }
            />

            {/* Detail Modal */}
            <Modal
                visible={detailModalVisible}
                animationType="slide"
                transparent={true}
                onRequestClose={() => setDetailModalVisible(false)}
            >
                <View style={styles.modalOverlay}>
                    <View style={styles.modalContent}>
                        <View style={styles.modalHeader}>
                            <Text style={styles.modalTitle}>Thông tin tân cử nhân</Text>
                            <TouchableOpacity onPress={() => setDetailModalVisible(false)}>
                                <Ionicons name="close" size={28} color="#333" />
                            </TouchableOpacity>
                        </View>

                        {selectedGraduate && (
                            <ScrollView style={styles.modalBody}>
                                <View style={styles.modalAvatarContainer}>
                                    <Image
                                        source={{
                                            uri: selectedGraduate.imageUrl || "https://via.placeholder.com/120",
                                        }}
                                        style={styles.modalAvatar}
                                    />
                                    {selectedGraduate.isCheckedIn ? (
                                        <View style={styles.modalCheckedBadge}>
                                            <Ionicons name="checkmark-circle" size={24} color="#FFF" />
                                            <Text style={styles.modalCheckedText}>Đã check-in</Text>
                                        </View>
                                    ) : (
                                        <View style={styles.modalNotCheckedBadge}>
                                            <Ionicons name="time" size={24} color="#FFF" />
                                            <Text style={styles.modalNotCheckedText}>Chưa check-in</Text>
                                        </View>
                                    )}
                                </View>

                                <View style={styles.modalInfoSection}>
                                    <View style={styles.modalInfoRow}>
                                        <Ionicons name="person" size={20} color="#FF6600" />
                                        <View style={styles.modalInfoTextContainer}>
                                            <Text style={styles.modalInfoLabel}>Họ và tên</Text>
                                            <Text style={styles.modalInfoValue}>{selectedGraduate.name}</Text>
                                        </View>
                                    </View>

                                    <View style={styles.modalInfoRow}>
                                        <Ionicons name="card" size={20} color="#FF6600" />
                                        <View style={styles.modalInfoTextContainer}>
                                            <Text style={styles.modalInfoLabel}>Mã sinh viên</Text>
                                            <Text style={styles.modalInfoValue}>{selectedGraduate.studentCode}</Text>
                                        </View>
                                    </View>

                                    <View style={styles.modalInfoRow}>
                                        <Ionicons name="mail" size={20} color="#FF6600" />
                                        <View style={styles.modalInfoTextContainer}>
                                            <Text style={styles.modalInfoLabel}>Email</Text>
                                            <Text style={styles.modalInfoValue}>{selectedGraduate.email}</Text>
                                        </View>
                                    </View>

                                    <View style={styles.modalInfoRow}>
                                        <Ionicons name="home" size={20} color="#FF6600" />
                                        <View style={styles.modalInfoTextContainer}>
                                            <Text style={styles.modalInfoLabel}>Hội trường</Text>
                                            <Text style={styles.modalInfoValue}>{selectedGraduate.hall}</Text>
                                        </View>
                                    </View>

                                    <View style={styles.modalInfoRow}>
                                        <Ionicons name="time" size={20} color="#FF6600" />
                                        <View style={styles.modalInfoTextContainer}>
                                            <Text style={styles.modalInfoLabel}>Phiên</Text>
                                            <Text style={styles.modalInfoValue}>Phiên {selectedGraduate.session}</Text>
                                        </View>
                                    </View>

                                    <View style={styles.modalInfoRow}>
                                        <Ionicons name="grid" size={20} color="#FF6600" />
                                        <View style={styles.modalInfoTextContainer}>
                                            <Text style={styles.modalInfoLabel}>Số ghế</Text>
                                            <Text style={styles.modalInfoValue}>
                                                Ghế {selectedGraduate.seat} ({selectedGraduate.seatExtra})
                                            </Text>
                                        </View>
                                    </View>
                                </View>
                            </ScrollView>
                        )}
                    </View>
                </View>
            </Modal>

            {/* Filter Modal */}
            <Modal
                visible={filterModalVisible}
                animationType="slide"
                transparent={true}
                onRequestClose={() => setFilterModalVisible(false)}
            >
                <View style={styles.modalOverlay}>
                    <View style={styles.modalContent}>
                        <View style={styles.modalHeader}>
                            <Text style={styles.modalTitle}>Lọc danh sách</Text>
                            <TouchableOpacity onPress={() => setFilterModalVisible(false)}>
                                <Ionicons name="close" size={28} color="#333" />
                            </TouchableOpacity>
                        </View>

                        <ScrollView style={styles.modalBody}>
                            {/* Hall Filter */}
                            <View style={styles.filterSection}>
                                <Text style={styles.filterSectionTitle}>Hội trường</Text>
                                <View style={styles.filterOptions}>
                                    <TouchableOpacity
                                        style={[styles.filterOption, !selectedHall && styles.filterOptionActive]}
                                        onPress={() => setSelectedHall(null)}
                                    >
                                        <Text
                                            style={[
                                                styles.filterOptionText,
                                                !selectedHall && styles.filterOptionTextActive,
                                            ]}
                                        >
                                            Tất cả
                                        </Text>
                                    </TouchableOpacity>
                                    {halls.map((hall) => (
                                        <TouchableOpacity
                                            key={hall.hallId}
                                            style={[
                                                styles.filterOption,
                                                selectedHall === hall.hallId && styles.filterOptionActive,
                                            ]}
                                            onPress={() => setSelectedHall(hall.hallId)}
                                        >
                                            <Text
                                                style={[
                                                    styles.filterOptionText,
                                                    selectedHall === hall.hallId && styles.filterOptionTextActive,
                                                ]}
                                            >
                                                {hall.hallName}
                                            </Text>
                                        </TouchableOpacity>
                                    ))}
                                </View>
                            </View>

                            {/* Session Filter */}
                            <View style={styles.filterSection}>
                                <Text style={styles.filterSectionTitle}>Phiên</Text>
                                <View style={styles.filterOptions}>
                                    <TouchableOpacity
                                        style={[styles.filterOption, !selectedSession && styles.filterOptionActive]}
                                        onPress={() => setSelectedSession(null)}
                                    >
                                        <Text
                                            style={[
                                                styles.filterOptionText,
                                                !selectedSession && styles.filterOptionTextActive,
                                            ]}
                                        >
                                            Tất cả
                                        </Text>
                                    </TouchableOpacity>
                                    {sessions.map((session) => (
                                        <TouchableOpacity
                                            key={session.sessionId}
                                            style={[
                                                styles.filterOption,
                                                selectedSession === session.sessionId && styles.filterOptionActive,
                                            ]}
                                            onPress={() => setSelectedSession(session.sessionId)}
                                        >
                                            <Text
                                                style={[
                                                    styles.filterOptionText,
                                                    selectedSession === session.sessionId && styles.filterOptionTextActive,
                                                ]}
                                            >
                                                {session.sessionName}
                                            </Text>
                                        </TouchableOpacity>
                                    ))}
                                </View>
                            </View>
                        </ScrollView>

                        <View style={styles.modalFooter}>
                            <TouchableOpacity style={styles.resetButton} onPress={handleResetFilter}>
                                <Text style={styles.resetButtonText}>Đặt lại</Text>
                            </TouchableOpacity>
                            <TouchableOpacity style={styles.applyButton} onPress={handleApplyFilter}>
                                <Text style={styles.applyButtonText}>Áp dụng</Text>
                            </TouchableOpacity>
                        </View>
                    </View>
                </View>
            </Modal>

            {/* Sort Modal */}
            <Modal
                visible={sortModalVisible}
                animationType="slide"
                transparent={true}
                onRequestClose={() => setSortModalVisible(false)}
            >
                <View style={styles.modalOverlay}>
                    <View style={[styles.modalContent, { maxHeight: "50%" }]}>
                        <View style={styles.modalHeader}>
                            <Text style={styles.modalTitle}>Sắp xếp</Text>
                            <TouchableOpacity onPress={() => setSortModalVisible(false)}>
                                <Ionicons name="close" size={28} color="#333" />
                            </TouchableOpacity>
                        </View>

                        <ScrollView style={styles.modalBody}>
                            <TouchableOpacity
                                style={styles.sortOption}
                                onPress={() => handleApplySort("name", sortOrder === "asc" ? "desc" : "asc")}
                            >
                                <View style={styles.sortOptionLeft}>
                                    <Ionicons name="text" size={20} color="#FF6600" />
                                    <Text style={styles.sortOptionText}>Theo tên</Text>
                                </View>
                                {sortBy === "name" && (
                                    <Ionicons
                                        name={sortOrder === "asc" ? "arrow-up" : "arrow-down"}
                                        size={20}
                                        color="#FF6600"
                                    />
                                )}
                            </TouchableOpacity>

                            <TouchableOpacity
                                style={styles.sortOption}
                                onPress={() =>
                                    handleApplySort("studentCode", sortOrder === "asc" ? "desc" : "asc")
                                }
                            >
                                <View style={styles.sortOptionLeft}>
                                    <Ionicons name="card" size={20} color="#FF6600" />
                                    <Text style={styles.sortOptionText}>Theo mã sinh viên</Text>
                                </View>
                                {sortBy === "studentCode" && (
                                    <Ionicons
                                        name={sortOrder === "asc" ? "arrow-up" : "arrow-down"}
                                        size={20}
                                        color="#FF6600"
                                    />
                                )}
                            </TouchableOpacity>

                            <TouchableOpacity
                                style={styles.sortOption}
                                onPress={() => handleApplySort("seat", sortOrder === "asc" ? "desc" : "asc")}
                            >
                                <View style={styles.sortOptionLeft}>
                                    <Ionicons name="grid" size={20} color="#FF6600" />
                                    <Text style={styles.sortOptionText}>Theo số ghế</Text>
                                </View>
                                {sortBy === "seat" && (
                                    <Ionicons
                                        name={sortOrder === "asc" ? "arrow-up" : "arrow-down"}
                                        size={20}
                                        color="#FF6600"
                                    />
                                )}
                            </TouchableOpacity>

                            <TouchableOpacity
                                style={styles.sortOption}
                                onPress={() =>
                                    handleApplySort("checkinStatus", sortOrder === "asc" ? "desc" : "asc")
                                }
                            >
                                <View style={styles.sortOptionLeft}>
                                    <Ionicons name="checkmark-done" size={20} color="#FF6600" />
                                    <Text style={styles.sortOptionText}>Theo trạng thái check-in</Text>
                                </View>
                                {sortBy === "checkinStatus" && (
                                    <Ionicons
                                        name={sortOrder === "asc" ? "arrow-up" : "arrow-down"}
                                        size={20}
                                        color="#FF6600"
                                    />
                                )}
                            </TouchableOpacity>
                        </ScrollView>
                    </View>
                </View>
            </Modal>

            {/* Quick Actions Modal */}
            <Modal
                visible={quickActionsVisible}
                animationType="fade"
                transparent={true}
                onRequestClose={() => setQuickActionsVisible(false)}
            >
                <TouchableOpacity
                    style={styles.quickActionsOverlay}
                    activeOpacity={1}
                    onPress={() => setQuickActionsVisible(false)}
                >
                    <View style={styles.quickActionsMenu}>
                        <TouchableOpacity
                            style={styles.quickActionItem}
                            onPress={() => handleQuickAction("refresh")}
                        >
                            <Ionicons name="refresh" size={24} color="#FF6600" />
                            <Text style={styles.quickActionText}>Làm mới dữ liệu</Text>
                        </TouchableOpacity>

                        <View style={styles.quickActionDivider} />

                        <TouchableOpacity
                            style={styles.quickActionItem}
                            onPress={() => handleQuickAction("statistics")}
                        >
                            <Ionicons name="stats-chart" size={24} color="#FF6600" />
                            <Text style={styles.quickActionText}>Thống kê chi tiết</Text>
                        </TouchableOpacity>

                        <View style={styles.quickActionDivider} />

                        <TouchableOpacity
                            style={styles.quickActionItem}
                            onPress={() => handleQuickAction("exportCheckedIn")}
                        >
                            <Ionicons name="cloud-download" size={24} color="#FF6600" />
                            <Text style={styles.quickActionText}>Xuất DS đã check-in</Text>
                        </TouchableOpacity>

                        <View style={styles.quickActionDivider} />

                        <TouchableOpacity
                            style={styles.quickActionItem}
                            onPress={() => handleQuickAction("exportAll")}
                        >
                            <Ionicons name="download" size={24} color="#FF6600" />
                            <Text style={styles.quickActionText}>Xuất toàn bộ DS</Text>
                        </TouchableOpacity>
                    </View>
                </TouchableOpacity>
            </Modal>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: "#F5F5F5",
    },
    loadingContainer: {
        flex: 1,
        justifyContent: "center",
        alignItems: "center",
    },
    loadingText: {
        marginTop: 12,
        fontSize: 16,
        color: "#666",
    },
    listContent: {
        paddingBottom: 20,
    },
    welcomeSection: {
        backgroundColor: "#FF6600",
        padding: 24,
        paddingTop: 16,
    },
    welcomeHeader: {
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "flex-start",
    },
    welcomeTitle: {
        fontSize: 24,
        fontWeight: "700",
        color: "#FFF",
        marginBottom: 8,
    },
    welcomeSubtitle: {
        fontSize: 16,
        color: "#FFF",
        opacity: 0.9,
    },
    quickActionButton: {
        padding: 8,
        backgroundColor: "rgba(255,255,255,0.2)",
        borderRadius: 8,
    },
    statsContainer: {
        flexDirection: "row",
        paddingHorizontal: 16,
        paddingTop: 16,
        gap: 12,
    },
    statCard: {
        flex: 1,
        backgroundColor: "#FFF",
        padding: 16,
        borderRadius: 12,
        alignItems: "center",
        shadowColor: "#000",
        shadowOpacity: 0.05,
        shadowOffset: { width: 0, height: 2 },
        shadowRadius: 4,
        elevation: 2,
    },
    statNumber: {
        fontSize: 24,
        fontWeight: "700",
        color: "#333",
        marginTop: 8,
    },
    statLabel: {
        fontSize: 12,
        color: "#666",
        marginTop: 4,
    },
    searchContainer: {
        flexDirection: "row",
        alignItems: "center",
        backgroundColor: "#FFF",
        marginHorizontal: 16,
        marginTop: 16,
        paddingHorizontal: 16,
        paddingVertical: 12,
        borderRadius: 12,
        shadowColor: "#000",
        shadowOpacity: 0.05,
        shadowOffset: { width: 0, height: 2 },
        shadowRadius: 4,
        elevation: 2,
    },
    searchInput: {
        flex: 1,
        marginLeft: 8,
        fontSize: 15,
        color: "#333",
    },
    filterSortContainer: {
        flexDirection: "row",
        paddingHorizontal: 16,
        paddingTop: 12,
        gap: 12,
    },
    filterButton: {
        flex: 1,
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "center",
        backgroundColor: "#FFF",
        paddingVertical: 10,
        paddingHorizontal: 16,
        borderRadius: 8,
        gap: 6,
        borderWidth: 1,
        borderColor: "#E0E0E0",
    },
    filterButtonActive: {
        borderColor: "#FF6600",
        backgroundColor: "#FFF5F0",
    },
    filterButtonText: {
        fontSize: 14,
        color: "#666",
        fontWeight: "600",
    },
    filterButtonTextActive: {
        color: "#FF6600",
    },
    sortButton: {
        flex: 1,
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "center",
        backgroundColor: "#FFF",
        paddingVertical: 10,
        paddingHorizontal: 16,
        borderRadius: 8,
        gap: 6,
        borderWidth: 1,
        borderColor: "#E0E0E0",
    },
    sortButtonText: {
        fontSize: 14,
        color: "#666",
        fontWeight: "600",
    },
    activeFiltersContainer: {
        flexDirection: "row",
        flexWrap: "wrap",
        paddingHorizontal: 16,
        paddingTop: 12,
        gap: 8,
    },
    activeFilterChip: {
        flexDirection: "row",
        alignItems: "center",
        backgroundColor: "#FFF5F0",
        paddingVertical: 6,
        paddingHorizontal: 12,
        borderRadius: 16,
        gap: 6,
        borderWidth: 1,
        borderColor: "#FF6600",
    },
    activeFilterText: {
        fontSize: 13,
        color: "#FF6600",
        fontWeight: "600",
    },
    tabsContainer: {
        flexDirection: "row",
        paddingHorizontal: 16,
        paddingTop: 16,
        gap: 8,
    },
    tab: {
        flex: 1,
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "center",
        backgroundColor: "#FFF",
        paddingVertical: 12,
        paddingHorizontal: 8,
        borderRadius: 8,
        gap: 6,
    },
    activeTab: {
        backgroundColor: "#FFF5F0",
        borderWidth: 2,
        borderColor: "#FF6600",
    },
    tabText: {
        fontSize: 12,
        color: "#666",
        fontWeight: "600",
    },
    activeTabText: {
        color: "#FF6600",
    },
    listHeader: {
        paddingHorizontal: 16,
        paddingTop: 16,
        paddingBottom: 12,
    },
    listHeaderText: {
        fontSize: 16,
        fontWeight: "600",
        color: "#333",
    },
    graduateCard: {
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "center",
        backgroundColor: "#FFF",
        marginHorizontal: 16,
        marginBottom: 12,
        padding: 12,
        borderRadius: 12,
        shadowColor: "#000",
        shadowOpacity: 0.05,
        shadowOffset: { width: 0, height: 2 },
        shadowRadius: 4,
        elevation: 2,
    },
    cardLeft: {
        flexDirection: "row",
        alignItems: "center",
        flex: 1,
    },
    avatar: {
        width: 60,
        height: 60,
        borderRadius: 30,
        backgroundColor: "#F0F0F0",
    },
    graduateInfo: {
        marginLeft: 12,
        flex: 1,
    },
    graduateName: {
        fontSize: 16,
        fontWeight: "600",
        color: "#333",
        marginBottom: 4,
    },
    graduateCode: {
        fontSize: 14,
        color: "#666",
        marginBottom: 4,
    },
    detailRow: {
        flexDirection: "row",
        alignItems: "center",
        gap: 4,
    },
    detailText: {
        fontSize: 12,
        color: "#666",
    },
    cardRight: {
        marginLeft: 8,
    },
    checkedInBadge: {
        alignItems: "center",
        gap: 4,
    },
    checkedInText: {
        fontSize: 11,
        color: "#4CAF50",
        fontWeight: "600",
    },
    notCheckedInBadge: {
        alignItems: "center",
        gap: 4,
    },
    notCheckedInText: {
        fontSize: 11,
        color: "#FF9800",
        fontWeight: "600",
    },
    paginationContainer: {
        flexDirection: "row",
        justifyContent: "center",
        alignItems: "center",
        paddingVertical: 20,
        gap: 16,
    },
    paginationButton: {
        padding: 8,
        borderRadius: 8,
        backgroundColor: "#FFF",
    },
    paginationButtonDisabled: {
        opacity: 0.3,
    },
    paginationText: {
        fontSize: 14,
        color: "#666",
    },
    emptyContainer: {
        alignItems: "center",
        justifyContent: "center",
        paddingVertical: 60,
    },
    emptyText: {
        marginTop: 16,
        fontSize: 16,
        color: "#999",
    },
    modalOverlay: {
        flex: 1,
        backgroundColor: "rgba(0,0,0,0.5)",
        justifyContent: "flex-end",
    },
    modalContent: {
        backgroundColor: "#FFF",
        borderTopLeftRadius: 24,
        borderTopRightRadius: 24,
        maxHeight: "85%",
    },
    modalHeader: {
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "center",
        padding: 20,
        borderBottomWidth: 1,
        borderBottomColor: "#EEE",
    },
    modalTitle: {
        fontSize: 20,
        fontWeight: "700",
        color: "#333",
    },
    modalBody: {
        padding: 20,
    },
    modalAvatarContainer: {
        alignItems: "center",
        marginBottom: 24,
    },
    modalAvatar: {
        width: 120,
        height: 120,
        borderRadius: 60,
        backgroundColor: "#F0F0F0",
        marginBottom: 16,
    },
    modalCheckedBadge: {
        flexDirection: "row",
        alignItems: "center",
        backgroundColor: "#4CAF50",
        paddingHorizontal: 16,
        paddingVertical: 8,
        borderRadius: 20,
        gap: 6,
    },
    modalCheckedText: {
        color: "#FFF",
        fontSize: 14,
        fontWeight: "600",
    },
    modalNotCheckedBadge: {
        flexDirection: "row",
        alignItems: "center",
        backgroundColor: "#FF9800",
        paddingHorizontal: 16,
        paddingVertical: 8,
        borderRadius: 20,
        gap: 6,
    },
    modalNotCheckedText: {
        color: "#FFF",
        fontSize: 14,
        fontWeight: "600",
    },
    modalInfoSection: {
        gap: 16,
    },
    modalInfoRow: {
        flexDirection: "row",
        alignItems: "flex-start",
        gap: 12,
    },
    modalInfoTextContainer: {
        flex: 1,
    },
    modalInfoLabel: {
        fontSize: 12,
        color: "#999",
        marginBottom: 4,
    },
    modalInfoValue: {
        fontSize: 16,
        color: "#333",
        fontWeight: "500",
    },
    filterSection: {
        marginBottom: 24,
    },
    filterSectionTitle: {
        fontSize: 16,
        fontWeight: "600",
        color: "#333",
        marginBottom: 12,
    },
    filterOptions: {
        flexDirection: "row",
        flexWrap: "wrap",
        gap: 8,
    },
    filterOption: {
        paddingVertical: 8,
        paddingHorizontal: 16,
        borderRadius: 20,
        backgroundColor: "#F5F5F5",
        borderWidth: 1,
        borderColor: "#E0E0E0",
    },
    filterOptionActive: {
        backgroundColor: "#FFF5F0",
        borderColor: "#FF6600",
    },
    filterOptionText: {
        fontSize: 14,
        color: "#666",
        fontWeight: "500",
    },
    filterOptionTextActive: {
        color: "#FF6600",
        fontWeight: "600",
    },
    modalFooter: {
        flexDirection: "row",
        padding: 20,
        gap: 12,
        borderTopWidth: 1,
        borderTopColor: "#EEE",
    },
    resetButton: {
        flex: 1,
        paddingVertical: 14,
        borderRadius: 12,
        backgroundColor: "#F5F5F5",
        alignItems: "center",
    },
    resetButtonText: {
        fontSize: 16,
        fontWeight: "600",
        color: "#666",
    },
    applyButton: {
        flex: 1,
        paddingVertical: 14,
        borderRadius: 12,
        backgroundColor: "#FF6600",
        alignItems: "center",
    },
    applyButtonText: {
        fontSize: 16,
        fontWeight: "600",
        color: "#FFF",
    },
    sortOption: {
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "center",
        paddingVertical: 16,
        paddingHorizontal: 4,
        borderBottomWidth: 1,
        borderBottomColor: "#F0F0F0",
    },
    sortOptionLeft: {
        flexDirection: "row",
        alignItems: "center",
        gap: 12,
    },
    sortOptionText: {
        fontSize: 16,
        color: "#333",
        fontWeight: "500",
    },
    quickActionsOverlay: {
        flex: 1,
        backgroundColor: "rgba(0,0,0,0.5)",
        justifyContent: "flex-start",
        alignItems: "flex-end",
        padding: 16,
    },
    quickActionsMenu: {
        backgroundColor: "#FFF",
        borderRadius: 12,
        minWidth: 220,
        shadowColor: "#000",
        shadowOpacity: 0.2,
        shadowOffset: { width: 0, height: 4 },
        shadowRadius: 8,
        elevation: 5,
        marginTop: 50,
    },
    quickActionItem: {
        flexDirection: "row",
        alignItems: "center",
        padding: 16,
        gap: 12,
    },
    quickActionText: {
        fontSize: 15,
        color: "#333",
        fontWeight: "500",
    },
    quickActionDivider: {
        height: 1,
        backgroundColor: "#F0F0F0",
        marginHorizontal: 16,
    },
});