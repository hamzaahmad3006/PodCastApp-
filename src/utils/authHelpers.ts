import { supabase } from '../supabase';
import { store } from '../redux/store';
import { setLoggedIn } from '../redux/authSlice';
import { loadNotifications } from '../redux/notificationSlice';
import { NotificationDatabaseService } from '../services/NotificationDatabaseService';
import { User, UserProfile } from '../types';
import { DownloadService } from '../services/DownloadService';

/**
 * Dispatch user login to Redux store
 */
export const dispatchUserLogin = (user: User, profileData?: UserProfile | null) => {
    store.dispatch(setLoggedIn({
        id: user.id,
        email: user.email,
        display_name: profileData?.display_name || user.user_metadata?.display_name || user.user_metadata?.name,
        avatar_url: profileData?.avatar_url || user.user_metadata?.avatar_url,
        user_metadata: {
            ...user.user_metadata,
            avatar_url: profileData?.avatar_url || user.user_metadata?.avatar_url
        }
    }));
};

export const loadUserProfile = async (userId: string, user: User) => {
    try {
        const { data: profileData, error } = await supabase
            .from('profiles')
            .select('*')
            .eq('id', userId)
            .single();

        if (error && error.code !== 'PGRST116') {
            console.warn('Profile fetch error:', error.message);
        } else if (profileData) {
            dispatchUserLogin(user, profileData);
        }

        const notifications = await NotificationDatabaseService.loadNotifications(userId);
        store.dispatch(loadNotifications(notifications));

        await NotificationDatabaseService.clearOldNotifications(userId);

        await DownloadService.fixDoubleExtensions(userId);
    } catch (error) {
        console.error('Background profile fetch error:', error);
    }
};

export const handleAuthSession = async (user: User) => {
    dispatchUserLogin(user);
    if (user.id) {
        loadUserProfile(user.id, user);
    }
};
