import { configureStore } from '@reduxjs/toolkit';
import toast from 'react-hot-toast';
import authReducer, { logout } from './slices/authSlice';
import storyReducer from './slices/storySlice';
import uiReducer, { openAuthModal } from './slices/uiSlice';
import { setUnauthorizedHandler } from '../utils/api';

export const store = configureStore({
  reducer: {
    auth: authReducer,
    stories: storyReducer,
    ui: uiReducer,
  },
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware({ serializableCheck: false }),
});

// Token expired/invalid: clear the session, tell the user, and open the login modal.
setUnauthorizedHandler(() => {
  // Several requests can fail together — only react once per session.
  if (!store.getState().auth.token) return;
  store.dispatch(logout());
  toast.error('Your session has expired. Please log in again.', { id: 'session-expired' });
  store.dispatch(openAuthModal('login'));
});

export default store;
