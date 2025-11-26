import React, { useCallback, useState, useEffect } from "react";
import { useNavigation } from "@react-navigation/native";
import { View, Text, Image, TouchableOpacity, FlatList, StyleSheet, Alert } from "react-native";
import { Circle, Svg } from "react-native-svg";
import Ionicons from "react-native-vector-icons/Ionicons";
import FontAwesome6 from "react-native-vector-icons/FontAwesome6";
import Feather from "react-native-vector-icons/Feather";
import { useAppSelector } from "../../redux/hooks";
import { DatabaseService } from "../../services/database";
import { DownloadService } from "../../services/DownloadService";

interface Episode {
    title: string;
    description: string;
    pubDate: string;
    audioUrl: string | null;
    image: string;
}

interface Props {
    navigation: any;
    route?: any;
}

// Memoized Episode Item Component for better performance
const EpisodeItem = React.memo(({ item, index, onPlay, onDownload, downloading, progress, isDownloaded }: any) => (
    <View style={styles.podcastItem}>
        <Image source={{ uri: item.image }} style={styles.podcastImage} />

        <View style={styles.podcastContent}>
            <Text style={styles.podcastTitle} numberOfLines={2}>{item.title}</Text>
            <Text style={styles.podcastSpeaker} numberOfLines={1}>{item.pubDate}</Text>

            <View style={styles.podcastActions}>
                <TouchableOpacity
                    style={styles.playBtn}
                    onPress={() => onPlay(index)}
                >
                    <Ionicons name="play" size={16} color="#fff" />
                    <Text style={styles.playBtnText}>Play</Text>
                </TouchableOpacity>

                {/* Download Button */}
                {!isDownloaded && (
                    <TouchableOpacity
                        onPress={() => onDownload(item)}
                        disabled={downloading}
                    >
                        {downloading ? (
                            <View style={styles.progressContainer}>
                                <Svg width="24" height="24" viewBox="0 0 24 24">
                                    <Circle
                                        cx="12"
                                        cy="12"
                                        r="10"
                                        stroke="#E0E0E0"
                                        strokeWidth="2"
                                        fill="none"
                                    />
                                    <Circle
                                        cx="12"
                                        cy="12"
                                        r="10"
                                        stroke="#4CAF50"
                                        strokeWidth="2"
                                        fill="none"
                                        strokeDasharray={`${2 * Math.PI * 10}`}
                                        strokeDashoffset={`${2 * Math.PI * 10 * (1 - progress)}`}
                                        strokeLinecap="round"
                                        transform="rotate(-90 12 12)"
                                    />
                                </Svg>
                                <Text style={styles.progressText}>{Math.round(progress * 100)}%</Text>
                            </View>
                        ) : (
                            <Feather name="download" size={22} style={styles.actionIcon} />
                        )}
                    </TouchableOpacity>
                )}

                <FontAwesome6 name="share" size={22} style={styles.actionIcon} />
            </View>
        </View>
    </View>
));

export default function AllEpisodes({ navigation, route }: Props) {
    const { user } = useAppSelector((state) => state.auth);
    const params = route?.params || {};
    const episodes: Episode[] = params.episodes || [];

    const nav = useNavigation<any>();

    // Download state
    const [downloadingEpisodes, setDownloadingEpisodes] = useState<Set<string>>(new Set());
    const [downloadProgress, setDownloadProgress] = useState<Map<string, number>>(new Map());
    const [downloadedEpisodes, setDownloadedEpisodes] = useState<Set<string>>(new Set());

    // Check for existing downloads
    useEffect(() => {
        const checkDownloads = async () => {
            if (user?.id) {
                const downloads = await DownloadService.getDownloadedEpisodes(user.id);
                const ids = new Set(downloads.map(d => d.episode_id));
                setDownloadedEpisodes(ids);
            }
        };
        checkDownloads();
    }, [user?.id]);

    // Handle download
    const handleDownload = useCallback(async (episode: Episode) => {
        if (!episode.audioUrl) {
            Alert.alert("Error", "No audio URL available");
            return;
        }

        if (!user?.id) {
            Alert.alert("Error", "Please log in to download episodes");
            return;
        }

        const episodeUrl = episode.audioUrl;
        setDownloadingEpisodes(prev => new Set(prev).add(episodeUrl));

        // Extract a safe ID for the download service
        const safeEpisodeId = episode.audioUrl.split('/').pop()?.split('?')[0] || `ep_${Date.now()}`;

        try {
            // Ensure episode exists in database BEFORE downloading
            await DatabaseService.upsertEpisode({
                ...episode,
                id: safeEpisodeId
            });

            // Download the file
            await DownloadService.downloadAudio(
                user.id,
                safeEpisodeId,
                episode.audioUrl,
                episode.title,
                (progress) => {
                    const percent = progress.progress;
                    setDownloadProgress(prev => new Map(prev).set(episodeUrl, percent));
                }
            );

            // Cache episode metadata for offline access
            await DownloadService.cacheEpisodeMetadata(safeEpisodeId, {
                title: episode.title,
                description: episode.description,
                image_url: episode.image,
                pub_date: episode.pubDate,
                audio_url: episode.audioUrl,
            });

            Alert.alert("Success", "Episode downloaded successfully!");
            setDownloadedEpisodes(prev => new Set(prev).add(safeEpisodeId));

        } catch (error: any) {
            console.error("Download error:", error);
            Alert.alert("Download Failed", error.message || "Failed to download episode");
        } finally {
            setDownloadingEpisodes(prev => {
                const newSet = new Set(prev);
                newSet.delete(episodeUrl);
                return newSet;
            });
            setDownloadProgress(prev => {
                const newMap = new Map(prev);
                newMap.delete(episodeUrl);
                return newMap;
            });
        }
    }, [user?.id]);

    // Memoized callback for playing episodes
    const handlePlay = useCallback((index: number) => {
        nav.navigate("Player", { episodes, index });
    }, [episodes, nav]);

    // Memoized render function
    const renderEpisode = useCallback(({ item, index }: { item: Episode; index: number }) => {
        const episodeId = item.audioUrl?.split('/').pop()?.split('?')[0] || '';
        return (
            <EpisodeItem
                item={item}
                index={index}
                onPlay={handlePlay}
                onDownload={handleDownload}
                downloading={downloadingEpisodes.has(item.audioUrl || '')}
                progress={downloadProgress.get(item.audioUrl || '') || 0}
                isDownloaded={downloadedEpisodes.has(episodeId)}
            />
        );
    }, [handlePlay, handleDownload, downloadingEpisodes, downloadProgress, downloadedEpisodes]);

    // Get item layout for better scrolling performance
    const getItemLayout = useCallback((data: any, index: number) => ({
        length: 119, // height of podcastItem (95 + 12 + 12 padding)
        offset: 119 * index,
        index,
    }), []);

    return (
        <View style={styles.container}>
            {/* Header */}
            <View style={styles.header}>
                <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
                    <Ionicons name="arrow-back" size={20} color="#000" />
                </TouchableOpacity>

                <Text style={styles.headerTitle}>All Episodes</Text>

                <View style={{ width: 36 }} />
            </View>

            {/* Episodes List */}
            <FlatList
                data={episodes}
                keyExtractor={(item, idx) => item.audioUrl || String(idx)}
                renderItem={renderEpisode}
                contentContainerStyle={{ padding: 20, paddingTop: 10 }}
                showsVerticalScrollIndicator={false}
                // Performance optimizations
                getItemLayout={getItemLayout}
                removeClippedSubviews={true}
                maxToRenderPerBatch={10}
                updateCellsBatchingPeriod={50}
                initialNumToRender={10}
                windowSize={5}
            />
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: "#fff",
    },
    header: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
        paddingHorizontal: 20,
        paddingTop: 40,
        paddingBottom: 15,
    },
    backBtn: {
        backgroundColor: "#F2F2F2",
        width: 36,
        height: 36,
        borderRadius: 18,
        justifyContent: "center",
        alignItems: "center",
    },
    headerTitle: {
        fontSize: 18,
        fontWeight: "700",
    },
    podcastItem: {
        flexDirection: "row",
        marginTop: 15,
        backgroundColor: "#F9F9F9",
        padding: 12,
        borderRadius: 14,
        alignItems: "center",
    },
    podcastImage: {
        width: 95,
        height: 95,
        borderRadius: 14,
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
        fontSize: 12,
    },
    podcastActions: {
        flexDirection: "row",
        marginTop: 10,
        alignItems: "center",
    },
    playBtn: {
        flexDirection: "row",
        backgroundColor: "#A637FF",
        width: 66,
        height: 28,
        borderRadius: 25,
        justifyContent: "center",
        alignItems: "center",
    },
    playBtnText: {
        color: "#fff",
        fontWeight: "600",
    },
    actionIcon: {
        marginLeft: 15,
    },
    progressContainer: {
        position: "relative",
        width: 24,
        height: 24,
        justifyContent: "center",
        alignItems: "center",
        marginLeft: 15,
    },
    progressText: {
        position: "absolute",
        fontSize: 8,
        fontWeight: "700",
        color: "#4CAF50",
    },
});
