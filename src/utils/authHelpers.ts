import { supabase } from '../supabase';
import { store } from '../redux/store';
import { setLoggedIn } from '../redux/authSlice';
import { loadNotifications } from '../redux/notificationSlice';
import { NotificationDatabaseService } from '../services/NotificationDatabaseService';
import { DownloadService } from '../services/DownloadService';

/**
 * Dispatch user login to Redux store
 */
export const dispatchUserLogin = (user: any, profileData?: any) => {
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

/**
 * Load user profile, notifications, and run cleanup tasks
 */
export const loadUserProfile = async (userId: string, user: any) => {
    try {
        // Fetch profile from database
        const { data: profileData, error } = await supabase
            .from('profiles')
            .select('*')
            .eq('id', userId)
            .single();

        if (error && error.code !== 'PGRST116') {
            console.warn('Profile fetch error:', error.message);
        } else if (profileData) {
            // Update Redux with profile data
            dispatchUserLogin(user, profileData);
        }

        // Load notifications from Supabase
        const notifications = await NotificationDatabaseService.loadNotifications(userId);
        store.dispatch(loadNotifications(notifications));

        // Auto-cleanup old notifications (7+ days)
        await NotificationDatabaseService.clearOldNotifications(userId);

        // Fix any existing files with double extensions (migration)
        await DownloadService.fixDoubleExtensions(userId);
    } catch (error) {
        console.error('Background profile fetch error:', error);
    }
};

/**
 * Handle auth session - dispatch user and load profile in background
 */
export const handleAuthSession = async (user: any) => {
    // Dispatch immediately to unblock UI
    dispatchUserLogin(user);

    // Load profile in background (fire and forget)
    loadUserProfile(user.id, user);
};
