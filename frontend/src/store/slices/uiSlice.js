import { createSlice } from '@reduxjs/toolkit';

const uiSlice = createSlice({
  name: 'ui',
  initialState: {
    sidebarOpen: false,
    searchOpen: false,
    authModal: null, // 'login' | 'register' | null
    theme: 'dark',
  },
  reducers: {
    toggleSidebar: (s) => { s.sidebarOpen = !s.sidebarOpen; },
    closeSidebar:  (s) => { s.sidebarOpen = false; },
    openSearch:    (s) => { s.searchOpen = true; },
    closeSearch:   (s) => { s.searchOpen = false; },
    openAuthModal:  (s, a) => { s.authModal = a.payload; },
    closeAuthModal: (s) => { s.authModal = null; },
  },
});

export const { toggleSidebar, closeSidebar, openSearch, closeSearch, openAuthModal, closeAuthModal } = uiSlice.actions;
export default uiSlice.reducer;
