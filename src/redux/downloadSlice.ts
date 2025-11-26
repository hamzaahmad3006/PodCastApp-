import { createSlice, PayloadAction } from '@reduxjs/toolkit';

export interface DownloadProgress {
    episodeId: string;
    progress: number; // 0-100
    bytesWritten: number;
    totalBytes: number;
}

export interface DownloadedEpisode {
    id: string;
    user_id: string;
    episode_id: string;
    local_path: string;
    file_size: number;
    downloaded_at: string;
}

interface DownloadState {
    activeDownloads: Record<string, DownloadProgress>;
    downloadedEpisodes: DownloadedEpisode[];
    totalCacheSize: number;
    error: string | null;
}

const initialState: DownloadState = {
    activeDownloads: {},
    downloadedEpisodes: [],
    totalCacheSize: 0,
    error: null,
};

const downloadSlice = createSlice({
    name: 'download',
    initialState,
    reducers: {
        setDownloadProgress: (state, action: PayloadAction<DownloadProgress>) => {
            state.activeDownloads[action.payload.episodeId] = action.payload;
        },
        removeDownloadProgress: (state, action: PayloadAction<string>) => {
            delete state.activeDownloads[action.payload];
        },
        setDownloadedEpisodes: (state, action: PayloadAction<DownloadedEpisode[]>) => {
            state.downloadedEpisodes = action.payload;
        },
        addDownloadedEpisode: (state, action: PayloadAction<DownloadedEpisode>) => {
            state.downloadedEpisodes.unshift(action.payload);
        },
        removeDownloadedEpisode: (state, action: PayloadAction<string>) => {
            state.downloadedEpisodes = state.downloadedEpisodes.filter(
                (ep) => ep.episode_id !== action.payload
            );
        },
        clearAllDownloads: (state) => {
            state.downloadedEpisodes = [];
            state.totalCacheSize = 0;
        },
        setTotalCacheSize: (state, action: PayloadAction<number>) => {
            state.totalCacheSize = action.payload;
        },
        setDownloadError: (state, action: PayloadAction<string | null>) => {
            state.error = action.payload;
        },
    },
});

export const {
    setDownloadProgress,
    removeDownloadProgress,
    setDownloadedEpisodes,
    addDownloadedEpisode,
    removeDownloadedEpisode,
    clearAllDownloads,
    setTotalCacheSize,
    setDownloadError,
} = downloadSlice.actions;

export default downloadSlice.reducer;
