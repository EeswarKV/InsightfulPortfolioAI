import { configureStore } from "@reduxjs/toolkit";
import authReducer from "./slices/authSlice";
import portfolioReducer from "./slices/portfolioSlice";
import alertsReducer from "./slices/alertsSlice";

export const store = configureStore({
  reducer: {
    auth: authReducer,
    portfolio: portfolioReducer,
    alerts: alertsReducer,
  },
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware({
      serializableCheck: {
        ignoredActions: ["auth/setSession"],
      },
    }),
});

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;
