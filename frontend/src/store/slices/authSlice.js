import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import api from '../../utils/api';

const stored = localStorage.getItem('gathalok_user');
const initialUser = stored ? JSON.parse(stored) : null;
const initialToken = localStorage.getItem('gathalok_token') || null;

// ─── Thunks ───────────────────────────────────────────────
export const register = createAsyncThunk('auth/register', async (data, { rejectWithValue }) => {
  try {
    const res = await api.post('/auth/register', data);
    return res.data;
  } catch (err) {
    return rejectWithValue(err.response?.data?.message || 'Registration failed');
  }
});

export const login = createAsyncThunk('auth/login', async (data, { rejectWithValue }) => {
  try {
    const res = await api.post('/auth/login', data);
    return res.data;
  } catch (err) {
    return rejectWithValue(err.response?.data?.message || 'Login failed');
  }
});

export const getMe = createAsyncThunk('auth/getMe', async (_, { rejectWithValue }) => {
  try {
    const res = await api.get('/auth/me');
    return res.data;
  } catch (err) {
    return rejectWithValue(err.response?.data?.message || 'Failed');
  }
});

export const updateProfile = createAsyncThunk('auth/updateProfile', async (data, { rejectWithValue }) => {
  try {
    const res = await api.put('/auth/profile', data);
    return res.data;
  } catch (err) {
    return rejectWithValue(err.response?.data?.message || 'Update failed');
  }
});

export const becomeContributor = createAsyncThunk('auth/becomeContributor', async (_, { rejectWithValue }) => {
  try {
    const res = await api.post('/auth/become-contributor');
    return res.data;
  } catch (err) {
    return rejectWithValue(err.response?.data?.message || 'Failed');
  }
});

// ─── Slice ────────────────────────────────────────────────
const authSlice = createSlice({
  name: 'auth',
  initialState: {
    user: initialUser,
    token: initialToken,
    loading: false,
    error: null,
  },
  reducers: {
    logout: (state) => {
      state.user = null;
      state.token = null;
      localStorage.removeItem('gathalok_user');
      localStorage.removeItem('gathalok_token');
    },
    clearError: (state) => { state.error = null; },
  },
  extraReducers: (builder) => {
    const pending = (state) => { state.loading = true; state.error = null; };
    const rejected = (state, action) => { state.loading = false; state.error = action.payload; };

    const handleSuccess = (state, action) => {
      state.loading = false;
      state.user = action.payload.user;
      state.token = action.payload.token;
      localStorage.setItem('gathalok_user', JSON.stringify(action.payload.user));
      localStorage.setItem('gathalok_token', action.payload.token);
    };

    builder
      .addCase(register.pending, pending)
      .addCase(register.fulfilled, handleSuccess)
      .addCase(register.rejected, rejected)
      .addCase(login.pending, pending)
      .addCase(login.fulfilled, handleSuccess)
      .addCase(login.rejected, rejected)
      .addCase(getMe.fulfilled, (state, action) => {
        state.user = action.payload.user;
        localStorage.setItem('gathalok_user', JSON.stringify(action.payload.user));
      })
      .addCase(updateProfile.fulfilled, (state, action) => {
        state.loading = false;
        state.user = { ...state.user, ...action.payload.user };
        localStorage.setItem('gathalok_user', JSON.stringify(state.user));
      })
      .addCase(updateProfile.pending, pending)
      .addCase(updateProfile.rejected, rejected)
      .addCase(becomeContributor.fulfilled, (state, action) => {
        state.user = { ...state.user, role: 'contributor' };
        localStorage.setItem('gathalok_user', JSON.stringify(state.user));
      });
  },
});

export const { logout, clearError } = authSlice.actions;
export default authSlice.reducer;
