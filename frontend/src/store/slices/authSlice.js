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
    return rejectWithValue({ message: err.response?.data?.message || 'Registration failed' });
  }
});

export const login = createAsyncThunk('auth/login', async (data, { rejectWithValue }) => {
  try {
    const res = await api.post('/auth/login', data);
    return res.data;
  } catch (err) {
    return rejectWithValue({
      message: err.response?.data?.message || 'Login failed',
      notVerified: !!err.response?.data?.notVerified,
      email: err.response?.data?.email,
    });
  }
});

export const verifyEmail = createAsyncThunk('auth/verifyEmail', async (token, { rejectWithValue }) => {
  try {
    const res = await api.get(`/auth/verify-email/${token}`);
    return res.data;
  } catch (err) {
    return rejectWithValue({ message: err.response?.data?.message || 'Verification failed' });
  }
});

export const resendVerification = createAsyncThunk('auth/resendVerification', async (email, { rejectWithValue }) => {
  try {
    const res = await api.post('/auth/resend-verification', { email });
    return res.data;
  } catch (err) {
    return rejectWithValue({ message: err.response?.data?.message || 'Failed to resend verification email' });
  }
});

export const forgotPassword = createAsyncThunk('auth/forgotPassword', async (email, { rejectWithValue }) => {
  try {
    const res = await api.post('/auth/forgot-password', { email });
    return res.data;
  } catch (err) {
    return rejectWithValue({ message: err.response?.data?.message || 'Failed to send reset email' });
  }
});

export const resetPassword = createAsyncThunk('auth/resetPassword', async ({ token, password }, { rejectWithValue }) => {
  try {
    const res = await api.post(`/auth/reset-password/${token}`, { password });
    return res.data;
  } catch (err) {
    return rejectWithValue({ message: err.response?.data?.message || 'Password reset failed' });
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
    // Set after register()/resendVerification() to the email awaiting verification.
    pendingVerificationEmail: null,
  },
  reducers: {
    logout: (state) => {
      state.user = null;
      state.token = null;
      localStorage.removeItem('gathalok_user');
      localStorage.removeItem('gathalok_token');
    },
    clearError: (state) => { state.error = null; },
    clearPendingVerification: (state) => { state.pendingVerificationEmail = null; },
  },
  extraReducers: (builder) => {
    const pending = (state) => { state.loading = true; state.error = null; };
    const rejected = (state, action) => { state.loading = false; state.error = action.payload; };

    const handleSuccess = (state, action) => {
      state.loading = false;
      state.user = action.payload.user;
      state.token = action.payload.token;
      state.pendingVerificationEmail = null;
      localStorage.setItem('gathalok_user', JSON.stringify(action.payload.user));
      localStorage.setItem('gathalok_token', action.payload.token);
    };

    builder
      .addCase(register.pending, pending)
      .addCase(register.fulfilled, (state, action) => {
        state.loading = false;
        state.pendingVerificationEmail = action.payload.email || null;
      })
      .addCase(register.rejected, rejected)

      .addCase(login.pending, pending)
      .addCase(login.fulfilled, handleSuccess)
      .addCase(login.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
        if (action.payload?.notVerified) state.pendingVerificationEmail = action.payload.email || null;
      })

      .addCase(verifyEmail.pending, pending)
      .addCase(verifyEmail.fulfilled, (state, action) => {
        state.loading = false;
        if (action.payload.token) {
          state.user = action.payload.user;
          state.token = action.payload.token;
          localStorage.setItem('gathalok_user', JSON.stringify(action.payload.user));
          localStorage.setItem('gathalok_token', action.payload.token);
        }
      })
      .addCase(verifyEmail.rejected, rejected)

      .addCase(resendVerification.pending, pending)
      .addCase(resendVerification.fulfilled, (state) => { state.loading = false; })
      .addCase(resendVerification.rejected, rejected)

      .addCase(forgotPassword.pending, pending)
      .addCase(forgotPassword.fulfilled, (state) => { state.loading = false; })
      .addCase(forgotPassword.rejected, rejected)

      .addCase(resetPassword.pending, pending)
      .addCase(resetPassword.fulfilled, handleSuccess)
      .addCase(resetPassword.rejected, rejected)

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

export const { logout, clearError, clearPendingVerification } = authSlice.actions;
export default authSlice.reducer;
