import React, { useState, useEffect, useCallback } from "react";
import { View, Text, StyleSheet, Image, TouchableOpacity, ScrollView, ActivityIndicator, RefreshControl } from "react-native";
import FontAwesome6 from "react-native-vector-icons/FontAwesome6";
import Ionicons from "react-native-vector-icons/Ionicons";
import { useFocusEffect, useNavigation } from "@react-navigation/native";
import { useAppSelector } from "../../redux/hooks";
import { DatabaseService, LibraryItem } from "../../services/database";
import { DownloadService } from "../../services/DownloadService";
import { supabase } from "../../supabase";

export default function MyLibrary() {
    const navigation = useNavigation<any>();
    const { user } = useAppSelector((state) => state.auth);
    const [activeTab, setActiveTab] = useState<"liked" | "downloads">("liked");
    const [libraryItems, setLibraryItems] = useState<LibraryItem[]>([]);
    const [downloadedItems, setDownloadedItems] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);

    const fetchLibrary = async () => {
        if (!user?.id) {
            setLibraryItems([]);
            setDownloadedItems([]);
            setLoading(false);
            return;
        }
        try {
            setLoading(true);

            if (activeTab === "downloads") {
                // Fetch downloads with offline support
                console.log(`MyLibrary: Fetching downloads for user:`, user.id);
                const downloads = await DownloadService.getDownloadedEpisodes(user.id);
                console.log(`MyLibrary: Got ${downloads?.length || 0} downloads`);

                // Get episode details with cached metadata fallback
                const episodesWithDetails = await Promise.all(
                    downloads.map(async (download) => {
                        try {
                            const { data: episode } = await supabase
                                .from("episodes")
                                .select("*")
                                .eq("id", download.episode_id)
                                .single();

                            if (episode) {
                                return { ...download, episode };
                            }
                        } catch (error) {
                            console.warn('Supabase query failed, using cached metadata');
                        }

                        // Fallback: use cached metadata when offline
                        const cachedMeta = await DownloadService.getEpisodeMetadata(download.episode_id);
                        return {
                            ...download,
                            episode: cachedMeta || {
                                id: download.episode_id,
                                title: "Unknown Episode",
                                image_url: "",
                                pub_date: "",
                            },
                        };
                    })
                );

                setDownloadedItems(episodesWithDetails);
            } else {
                // Fetch liked items
                console.log(`MyLibrary: Fetching liked items for user:`, user.id);
                const data = await DatabaseService.getLibrary(user.id, "liked");
                console.log(`MyLibrary: Got ${data?.length || 0} liked items`);
                setLibraryItems(data || []);
            }
        } catch (error) {
            console.error("Error fetching library:", error);
            setLibraryItems([]);
            setDownloadedItems([]);
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    };

    const handlePlay = (item: any, index: number) => {
        // Navigate to Player with the episode
        const episodes = activeTab === "liked" ? libraryItems : downloadedItems;
        navigation.navigate("Player", {
            episodes: episodes.map(e => {
                // For downloaded episodes, use local file path
                const audioUrl = activeTab === "downloads" && e.local_path
                    ? e.local_path
                    : (e.episode?.audio_url || "");

                // Provide fallback image to prevent TrackPlayer error
                const imageUrl = e.episode?.image_url || "https://via.placeholder.com/300x300.png?text=Podcast";

                return {
                    title: e.episode?.title || "Unknown",
                    audioUrl: audioUrl,
                    image: imageUrl,
                    pubDate: e.episode?.pub_date || "",
                    description: e.episode?.description || "",
                };
            }),
            index
        });
    };

    useFocusEffect(
        useCallback(() => {
            fetchLibrary();
        }, [user?.id, activeTab])
    );

    const onRefresh = () => {
        setRefreshing(true);
        fetchLibrary();
    };

    return (
        <ScrollView
            style={styles.container}
            contentContainerStyle={{ paddingBottom: 60 }}
            showsVerticalScrollIndicator={false}
            refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        >
            {/* TOP HEADER */}
            <View style={styles.header}>
                <View style={{ flexDirection: "row", alignItems: "center" }}>
                    <Ionicons name="mic-outline" size={24} color="#A637FF" />
                    <Text style={styles.heading}> My Library</Text>
                </View>

                <TouchableOpacity onPress={onRefresh} style={styles.headerIcon}>
                    <Ionicons name="refresh" size={22} color="#000" />
                </TouchableOpacity>
            </View>

            {/* TABS */}
            <View style={styles.tabs}>
                <TouchableOpacity onPress={() => setActiveTab("liked")}>
                    <View
                        style={[
                            styles.tabItem,
                            activeTab === "liked" && styles.activeTab,
                        ]}
                    >
                        <Text
                            style={
                                activeTab === "liked"
                                    ? styles.activeTabText
                                    : styles.inactiveTab
                            }
                        >
                            Liked
                        </Text>
                    </View>
                </TouchableOpacity>

                <TouchableOpacity onPress={() => setActiveTab("downloads")}>
                    <View
                        style={[
                            styles.tabItem,
                            activeTab === "downloads" && styles.activeTab,
                        ]}
                    >
                        <Text
                            style={
                                activeTab === "downloads"
                                    ? styles.activeTabText
                                    : styles.inactiveTab
                            }
                        >
                            Downloads
                        </Text>
                    </View>
                </TouchableOpacity>
            </View>

            {/* LOADING STATE */}
            {loading && !refreshing ? (
                <View style={{ marginTop: 50 }}>
                    <ActivityIndicator size="large" color="#A637FF" />
                </View>
            ) : (
                <>
                    {/* EMPTY STATE */}
                    {(activeTab === "liked" ? libraryItems : downloadedItems).length === 0 ? (
                        <View style={{ alignItems: "center", marginTop: 50 }}>
                            <Text style={{ color: "gray", fontSize: 16 }}>
                                {!user?.id
                                    ? "Please log in to view your library"
                                    : `No episodes in ${activeTab}`}
                            </Text>
                        </View>
                    ) : (
                        /* PODCAST LIST */
                        (activeTab === "liked" ? libraryItems : downloadedItems).map((item, index) => (
                            <View key={item.id} style={styles.row}>
                                {/* Numbering OUTSIDE Box */}
                                <Text style={styles.podcastNumber}>{index + 1}.</Text>

                                {/* Card */}
                                <View style={styles.podcastItem}>
                                    <Image
                                        source={item.episode?.image_url ? { uri: item.episode.image_url } : require("../../assets/pod1.jpg")}
                                        style={styles.podcastImage}
                                    />

                                    <View style={styles.podcastContent}>
                                        <Text style={styles.podcastTitle} numberOfLines={2}>{item.episode?.title}</Text>
                                        <Text style={styles.podcastSpeaker} numberOfLines={1}>{item.episode?.pub_date}</Text>

                                        <View style={styles.podcastActions}>
                                            <TouchableOpacity
                                                style={styles.playBtn}
                                                onPress={() => handlePlay(item, index)}
                                            >
                                                <Ionicons name="play" size={14} color="#fff" />
                                                <Text style={styles.playBtnText}>Play</Text>
                                            </TouchableOpacity>

                                            <FontAwesome6 name="download" size={20} style={styles.actionIcon} />
                                            <Ionicons name="ellipsis-vertical" size={20} style={styles.actionIcon} />
                                        </View>
                                    </View>
                                </View>
                            </View>
                        ))
                    )}
                </>
            )}
        </ScrollView>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: "#fff", padding: 20 },

    header: {
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "center",
        marginTop: 20,
        marginBottom: 15,
    },

    heading: {
        fontSize: 20,
        fontWeight: "700",
        color: "#000",
    },

    headerIcon: {
        width: 35,
        height: 35,
        borderRadius: 50,
        borderWidth: 1,
        borderColor: "#DDDDDD",
        justifyContent: "center",
        alignItems: "center",
    },

    tabs: {
        flexDirection: "row",
        justifyContent: "space-between",
        marginBottom: 10,
        paddingLeft: 20,
        borderBottomWidth: 1,
        borderBottomColor: "#eee",
    },

    tabItem: {
        paddingBottom: 6,
    },

    activeTab: {
        borderBottomWidth: 3,
        borderBottomColor: "#A637FF",
    },

    activeTabText: {
        fontSize: 13,
        fontWeight: "600",
        color: "#A637FF",
    },

    inactiveTab: {
        fontSize: 13,
        color: "gray",
    },

    row: {
        flexDirection: "row",
        alignItems: "center",
        marginTop: 18,
    },

    podcastNumber: {
        fontSize: 18,
        fontWeight: "700",

        // textAlign: "right",
        marginRight: 10,
    },

    podcastItem: {
        flexDirection: "row",
        backgroundColor: "#F9F9F9",
        padding: 0,
        borderRadius: 14,
        alignItems: "center",
        flex: 1,
    },

    podcastImage: {
        width: 85,
        height: 85,
        borderRadius: 12,
    },


    podcastContent: {
        flex: 1,
        marginLeft: 12,
    },

    podcastTitle: {
        fontSize: 15,
        fontWeight: "700",
    },

    podcastSpeaker: {
        color: "gray",
        marginTop: 3,
    },

    podcastActions: {
        flexDirection: "row",
        marginTop: 10,
        alignItems: "center",
    },

    playBtn: {
        flexDirection: "row",
        alignItems: "center",
        backgroundColor: "#A637FF",
        paddingHorizontal: 13,
        height: 28,
        borderRadius: 25,
    },

    playBtnText: {
        color: "#fff",
        marginLeft: 5,
        fontWeight: "700",
    },

    actionIcon: {
        marginLeft: 15,
    },
});
