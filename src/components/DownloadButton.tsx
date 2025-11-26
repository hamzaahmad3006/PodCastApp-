import React, { useState, useEffect } from 'react';
import { TouchableOpacity, StyleSheet, ActivityIndicator, Alert } from 'react-native';
import Icon from 'react-native-vector-icons/FontAwesome6';
import { useAppSelector, useAppDispatch } from '../redux/hooks';
import { DownloadService } from '../services/downloadService';
import {
    setDownloadProgress,
    removeDownloadProgress,
    addDownloadedEpisode,
    removeDownloadedEpisode,
} from '../redux/downloadSlice';

interface DownloadButtonProps {
    episodeId: string;
    audioUrl: string;
    episodeTitle: string;
    size?: number;
    color?: string;
}

export const DownloadButton: React.FC<DownloadButtonProps> = ({
    episodeId,
    audioUrl,
    episodeTitle,
    size = 24,
    color = '#A637FF',
}) => {
    const dispatch = useAppDispatch();
    const user = useAppSelector((state) => state.auth.user);
    const activeDownload = useAppSelector((state) => state.download.activeDownloads[episodeId]);
    const downloadedEpisodes = useAppSelector((state) => state.download.downloadedEpisodes);

    const [isDownloaded, setIsDownloaded] = useState(false);
    const [isDownloading, setIsDownloading] = useState(false);

    useEffect(() => {
        checkDownloadStatus();
    }, [downloadedEpisodes, episodeId]);

    const checkDownloadStatus = async () => {
        if (!user?.id) return;

        const downloaded = await DownloadService.isDownloaded(user.id, episodeId);
        setIsDownloaded(downloaded);
    };

    const handleDownload = async () => {
        if (!user?.id) {
            Alert.alert('Login Required', 'Please log in to download episodes');
            return;
        }

        if (isDownloaded) {
            // Delete download
            Alert.alert(
                'Delete Download',
                'Are you sure you want to delete this download?',
                [
                    { text: 'Cancel', style: 'cancel' },
                    {
                        text: 'Delete',
                        style: 'destructive',
                        onPress: async () => {
                            try {
                                await DownloadService.deleteDownload(user.id!, episodeId);
                                dispatch(removeDownloadedEpisode(episodeId));
                                setIsDownloaded(false);
                                Alert.alert('Success', 'Download deleted');
                            } catch (error: any) {
                                Alert.alert('Error', error.message || 'Failed to delete download');
                            }
                        },
                    },
                ]
            );
            return;
        }

        if (isDownloading) {
            // Cancel download
            Alert.alert(
                'Cancel Download',
                'Are you sure you want to cancel this download?',
                [
                    { text: 'No', style: 'cancel' },
                    {
                        text: 'Yes',
                        onPress: async () => {
                            await DownloadService.cancelDownload(episodeId);
                            dispatch(removeDownloadProgress(episodeId));
                            setIsDownloading(false);
                        },
                    },
                ]
            );
            return;
        }

        // Start download
        try {
            setIsDownloading(true);

            await DownloadService.downloadAudio(
                user.id,
                episodeId,
                audioUrl,
                episodeTitle,
                (progress) => {
                    dispatch(setDownloadProgress({
                        episodeId,
                        progress: progress.progress * 100,
                        bytesWritten: progress.bytesWritten,
                        totalBytes: progress.contentLength,
                    }));
                }
            );

            // Download complete
            const downloadedEpisode = await DownloadService.getDownloadedEpisode(user.id, episodeId);
            if (downloadedEpisode) {
                dispatch(addDownloadedEpisode(downloadedEpisode));
            }

            dispatch(removeDownloadProgress(episodeId));
            setIsDownloading(false);
            setIsDownloaded(true);
            Alert.alert('Success', 'Episode downloaded successfully');
        } catch (error: any) {
            console.error('Download error:', error);
            dispatch(removeDownloadProgress(episodeId));
            setIsDownloading(false);
            Alert.alert('Download Failed', error.message || 'Failed to download episode');
        }
    };

    const getIcon = () => {
        if (isDownloaded) {
            return 'circle-check';
        }
        if (isDownloading || activeDownload) {
            return null; // Show spinner
        }
        return 'circle-down';
    };

    const iconName = getIcon();

    return (
        <TouchableOpacity
            style={styles.button}
            onPress={handleDownload}
            disabled={isDownloading && !activeDownload}
        >
            {(isDownloading || activeDownload) && !isDownloaded ? (
                <ActivityIndicator size={size} color={color} />
            ) : (
                iconName && <Icon name={iconName} size={size} color={color} solid />
            )}
        </TouchableOpacity>
    );
};

const styles = StyleSheet.create({
    button: {
        padding: 8,
        justifyContent: 'center',
        alignItems: 'center',
    },
});
