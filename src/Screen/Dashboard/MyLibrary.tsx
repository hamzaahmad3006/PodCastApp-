import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import Ionicons from 'react-native-vector-icons/Ionicons';
import { useNavigation, useFocusEffect, NavigationProp } from '@react-navigation/native';
import { useAppSelector, useAppDispatch } from '../../redux/hooks';
import { DatabaseService } from '../../services/database';
import { DownloadService } from '../../services/DownloadService';
import { supabase } from '../../supabase';
import PodcastCard from '../../components/PodCastCard';
import { SafeAreaView } from 'react-native-safe-area-context';
import { setPlaylist } from '../../redux/playerSlice';
import { COLORS } from '../../constants/colors';
import { LibraryItem, MainStackParamList, DownloadedEpisode, Episode } from '../../types';

export default function MyLibrary() {
  const dispatch = useAppDispatch();
  const navigation = useNavigation<NavigationProp<MainStackParamList>>();
  const { user } = useAppSelector(state => state.auth);
  const [activeTab, setActiveTab] = useState<'liked' | 'downloads'>('liked');
  const [libraryItems, setLibraryItems] = useState<LibraryItem[]>([]);
  const [downloadedItems, setDownloadedItems] = useState<DownloadedEpisode[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [downloadedEpisodeIds, setDownloadedEpisodeIds] = useState<Set<string>>(
    new Set(),
  );

  const fetchLibrary = async () => {
    if (!user?.id) {
      setLibraryItems([]);
      setDownloadedItems([]);
      setDownloadedEpisodeIds(new Set());
      setLoading(false);
      return;
    }
    try {
      setLoading(true);

      const downloads = await DownloadService.getDownloadedEpisodes(user.id);
      const downloadIds = new Set(downloads.map((d: DownloadedEpisode) => d.episode_id));
      setDownloadedEpisodeIds(downloadIds);

      if (activeTab === 'downloads') {
        const episodeIds = downloads.map((d: DownloadedEpisode) => d.episode_id);
        let episodesMap = new Map();

        if (episodeIds.length > 0) {
          try {
            const { data: episodes } = await supabase
              .from('episodes')
              .select('*')
              .in('id', episodeIds);

            if (episodes) {
              episodes.forEach((ep: Episode) => episodesMap.set(ep.id, ep));
            }
          } catch (error) {

          }
        }


        const episodesWithDetails = await Promise.all(
          downloads.map(async (download: DownloadedEpisode) => {
            if (episodesMap.has(download.episode_id)) {
              return {
                ...download,
                episode: episodesMap.get(download.episode_id),
              };
            }

            const cachedMeta = await DownloadService.getEpisodeMetadata(
              download.episode_id,
            );
            return {
              ...download,
              episode: cachedMeta || {
                id: download.episode_id,
                title: 'Unknown Episode',
                image: '',
                pubDate: '',
              },
            };
          }),
        );

        setDownloadedItems(episodesWithDetails);
      } else {
        const data = await DatabaseService.getLibrary(user.id, 'liked');
        setLibraryItems(data || []);
      }
    } catch (error) {
      setLibraryItems([]);
      setDownloadedItems([]);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const handlePlay = (item: LibraryItem | DownloadedEpisode, index: number) => {
    const episodes = activeTab === 'liked' ? libraryItems : downloadedItems;
    const mappedEpisodes: Episode[] = episodes.map((e: LibraryItem | DownloadedEpisode) => {
      const audioUrl =
        activeTab === 'downloads' && (e as DownloadedEpisode).local_path
          ? (e as DownloadedEpisode).local_path
          : e.episode?.audio_url || '';

      const imageUrl =
        e.episode?.image_url ||
        'https://via.placeholder.com/300x300.png?text=Podcast';

      return {
        id: e.episode_id,
        title: e.episode?.title || 'Unknown',
        audioUrl: audioUrl,
        image: imageUrl,
        pubDate: e.episode?.pub_date || '',
        description: e.episode?.description || '',
        artist: e.episode?.artist || 'Unknown Artist',
      } as Episode;
    });
    dispatch(setPlaylist({ episodes: mappedEpisodes, index }));

    navigation.navigate('Player', {
      episodes: mappedEpisodes,
      index,
    });
  };

  const onDownloadComplete = () => {
    fetchLibrary();
  };

  useFocusEffect(
    useCallback(() => {
      fetchLibrary();
    }, [user?.id, activeTab]),
  );

  const onRefresh = () => {
    setRefreshing(true);
    fetchLibrary();
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: COLORS.WHITE }} edges={['top']}>
      <ScrollView
        style={styles.container}
        contentContainerStyle={{ paddingBottom: 60 }}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        {/*==== TOP HEADER ======*/}
        <View style={styles.header}>
          <View style={{ flexDirection: 'row', alignItems: 'center' }}>
            <Ionicons name="mic-outline" size={24} color={COLORS.PRIMARY} />
            <Text style={styles.heading}> My Library</Text>
          </View>

          <TouchableOpacity onPress={onRefresh} style={styles.headerIcon}>
            <Ionicons name="refresh" size={22} color={COLORS.BLACK} />
          </TouchableOpacity>
        </View>

        {/* TABS */}
        <View style={styles.tabs}>
          <TouchableOpacity onPress={() => setActiveTab('liked')}>
            <View
              style={[
                styles.tabItem,
                activeTab === 'liked' && styles.activeTab,
              ]}
            >
              <Text
                style={
                  activeTab === 'liked'
                    ? styles.activeTabText
                    : styles.inactiveTab
                }
              >
                Liked
              </Text>
            </View>
          </TouchableOpacity>

          <TouchableOpacity onPress={() => setActiveTab('downloads')}>
            <View
              style={[
                styles.tabItem,
                activeTab === 'downloads' && styles.activeTab,
              ]}
            >
              <Text
                style={
                  activeTab === 'downloads'
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
            <ActivityIndicator size="large" color={COLORS.PRIMARY} />
          </View>
        ) : (
          <>
            {/* EMPTY STATE */}
            {(activeTab === 'liked' ? libraryItems : downloadedItems).length ===
              0 ? (
              <View style={{ alignItems: 'center', marginTop: 50 }}>
                <Text style={{ color: 'gray', fontSize: 16 }}>
                  {!user?.id
                    ? 'Please log in to view your library'
                    : `No episodes in ${activeTab}`}
                </Text>
              </View>
            ) : (
              /* PODCAST LIST */
              (activeTab === 'liked' ? libraryItems : downloadedItems).map(
                (item: LibraryItem | DownloadedEpisode, index) => {
                  const audioUrl =
                    item.episode?.audio_url ||
                    item.episode?.audioUrl ||
                    item.audioUrl;

                  const safeId = DatabaseService.getEpisodeIdFromUrl(audioUrl);
                  const isDownloaded = downloadedEpisodeIds.has(safeId);

                  return (
                    <PodcastCard
                      key={item.id || index}
                      item={
                        item.episode || {
                          id: item.episode_id || 'unknown',
                          title: 'Unknown Title',
                          audioUrl: '',
                          image: 'https://via.placeholder.com/150',
                          pubDate: '',
                        }
                      }
                      onPlay={() => handlePlay(item, index)}
                      onDownloadComplete={onDownloadComplete}
                      userId={user?.id}
                      isDownloaded={isDownloaded}
                    />
                  );
                },
              )
            )}
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.WHITE, padding: 20 },

  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',

    marginBottom: 15,
  },

  heading: {
    fontSize: 17,
    fontFamily: 'Inter-Bold',
    color: COLORS.BLACK,
  },

  headerIcon: {
    width: 35,
    height: 35,
    borderRadius: 50,
    borderWidth: 1,
    borderColor: COLORS.LIGHT_GRAY,
    justifyContent: 'center',
    alignItems: 'center',
  },

  tabs: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 10,
    paddingLeft: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },

  tabItem: {
    paddingBottom: 6,
  },

  activeTab: {
    borderBottomWidth: 3,
    borderBottomColor: COLORS.PRIMARY,
  },

  activeTabText: {
    fontSize: 13,
    fontFamily: 'Inter-SemiBold',
    color: COLORS.PRIMARY,
  },

  inactiveTab: {
    fontSize: 13,
    fontFamily: 'Inter-SemiBold',
    color: 'gray',
  },

  row: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 18,
  },

  podcastNumber: {
    fontSize: 18,
    fontWeight: '700',
    marginRight: 10,
  },

  podcastItem: {
    flexDirection: 'row',
    backgroundColor: COLORS.LIGHT_GRAY,
    padding: 0,
    borderRadius: 14,
    alignItems: 'center',
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
    fontWeight: '700',
  },

  podcastSpeaker: {
    color: 'gray',
    marginTop: 3,
  },

  podcastActions: {
    flexDirection: 'row',
    marginTop: 10,
    alignItems: 'center',
  },

  playBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.PRIMARY,
    paddingHorizontal: 13,
    height: 28,
    borderRadius: 25,
  },

  playBtnText: {
    color: COLORS.WHITE,
    marginLeft: 5,
    fontWeight: '700',
  },

  actionIcon: {
    marginLeft: 15,
  },
});
