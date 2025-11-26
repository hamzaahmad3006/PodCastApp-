import { configureStore } from "@reduxjs/toolkit";
import authReducer from "./authSlice"; // Auth slice import
import downloadReducer from "./downloadSlice"; // Download slice import

export const store = configureStore({
  reducer: {
    auth: authReducer,
    download: downloadReducer,
  },
});

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;
