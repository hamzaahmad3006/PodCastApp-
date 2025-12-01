import playerReducer, { setPlaybackState, setCurrentEpisode } from '../src/redux/playerSlice';

describe('playerSlice', () => {
    it('should handle initial state', () => {
        const initialState = playerReducer(undefined, { type: 'unknown' });
        expect(initialState.isPlaying).toBe(false);
        expect(initialState.currentEpisode).toBe(null);
        expect(initialState.episodes).toEqual([]);
    });

    it('should set playback state to playing', () => {
        const previousState = {
            isPlaying: false,
            currentEpisode: null,
            episodes: [],
            currentIndex: 0,
            isLiked: false,
            isDownloaded: false,
        };

        const newState = playerReducer(previousState, setPlaybackState(true));
        expect(newState.isPlaying).toBe(true);
    });

    it('should set playback state to paused', () => {
        const previousState = {
            isPlaying: true,
            currentEpisode: null,
            episodes: [],
            currentIndex: 0,
            isLiked: false,
            isDownloaded: false,
        };

        const newState = playerReducer(previousState, setPlaybackState(false));
        expect(newState.isPlaying).toBe(false);
    });

    it('should set current episode', () => {
        const previousState = {
            isPlaying: false,
            currentEpisode: null,
            episodes: [],
            currentIndex: 0,
            isLiked: false,
            isDownloaded: false,
        };

        const episode = {
            id: '1',
            title: 'Test Episode',
            audioUrl: 'https://example.com/audio.mp3',
            image: 'https://example.com/image.jpg',
        };

        const newState = playerReducer(previousState, setCurrentEpisode(episode));
        expect(newState.currentEpisode).toEqual(episode);
    });
});
