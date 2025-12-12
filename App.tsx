import React, { useEffect } from "react";
import { Provider } from "react-redux";
import { store } from "./src/redux/store";
import AppNavigator from "./src/Appnavigation/Appnavigator";
import { supabase } from "./src/supabase";
import { setLoggedOut } from "./src/redux/authSlice";
import NotificationService from "./src/services/NotificationService";
import { handleAuthSession } from "./src/utils/authHelpers";

export default function App() {
  useEffect(() => {
    // Initialize Notifications
    try {
      NotificationService.initialize();
    } catch (error) {
      console.error("Notification initialization failed:", error);
    }

    // Initialize authentication
    const initAuth = async () => {
      try {
        const { data: sessionData, error: sessionError } = await supabase.auth.getSession();

        if (sessionError) {
          console.error("Session error:", sessionError);
          store.dispatch(setLoggedOut());
          return;
        }

        const user = sessionData.session?.user;
        if (user) {
          await handleAuthSession(user);
        } else {
          store.dispatch(setLoggedOut());
        }
      } catch (err) {
        console.error("Init error:", err);
        store.dispatch(setLoggedOut());
      }
    };

    initAuth();

    // Auth state change listener
    const { data: listener } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (session?.user) {
        await handleAuthSession(session.user);
      } else {
        store.dispatch(setLoggedOut());
      }
    });

    return () => listener.subscription.unsubscribe();
  }, []);

  return (
    <Provider store={store}>
      <AppNavigator />
    </Provider>
  );
}
