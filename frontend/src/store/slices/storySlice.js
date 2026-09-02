import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import api from '../../utils/api';

// ─── Story Thunks ─────────────────────────────────────────
export const fetchStories = createAsyncThunk('stories/fetch', async (params, { rejectWithValue }) => {
  try {
    const res = await api.get('/stories', { params });
    return res.data;
  } catch (err) {
    return rejectWithValue(err.response?.data?.message || 'Failed to fetch stories');
  }
});

export const fetchStory = createAsyncThunk('stories/fetchOne', async (slug, { rejectWithValue }) => {
  try {
    const res = await api.get(`/stories/${slug}`);
    return res.data;
  } catch (err) {
    return rejectWithValue(err.response?.data?.message || 'Story not found');
  }
});

export const fetchFeatured = createAsyncThunk('stories/featured', async (_, { rejectWithValue }) => {
  try {
    const res = await api.get('/stories/featured');
    return res.data;
  } catch (err) {
    return rejectWithValue(err.response?.data?.message);
  }
});

export const fetchTrending = createAsyncThunk('stories/trending', async (_, { rejectWithValue }) => {
  try {
    const res = await api.get('/stories/trending');
    return res.data;
  } catch (err) {
    return rejectWithValue(err.response?.data?.message);
  }
});

export const createStory = createAsyncThunk('stories/create', async (data, { rejectWithValue }) => {
  try {
    const res = await api.post('/stories', data);
    return res.data;
  } catch (err) {
    return rejectWithValue(err.response?.data?.message || 'Failed to create story');
  }
});

export const updateStory = createAsyncThunk('stories/update', async ({ id, data }, { rejectWithValue }) => {
  try {
    const res = await api.put(`/stories/${id}`, data);
    return res.data;
  } catch (err) {
    return rejectWithValue(err.response?.data?.message || 'Failed to update story');
  }
});

const storySlice = createSlice({
  name: 'stories',
  initialState: {
    list: [],
    featured: [],
    trending: [],
    current: null,
    pagination: null,
    loading: false,
    error: null,
  },
  reducers: {
    clearCurrent: (state) => { state.current = null; },
    clearError: (state) => { state.error = null; },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchStories.pending, (s) => { s.loading = true; s.error = null; })
      .addCase(fetchStories.fulfilled, (s, a) => { s.loading = false; s.list = a.payload.data; s.pagination = a.payload.pagination; })
      .addCase(fetchStories.rejected, (s, a) => { s.loading = false; s.error = a.payload; })
      .addCase(fetchStory.pending, (s) => { s.loading = true; s.error = null; s.current = null; })
      .addCase(fetchStory.fulfilled, (s, a) => { s.loading = false; s.current = a.payload.data; })
      .addCase(fetchStory.rejected, (s, a) => { s.loading = false; s.error = a.payload; })
      .addCase(fetchFeatured.fulfilled, (s, a) => { s.featured = a.payload.data; })
      .addCase(fetchTrending.fulfilled, (s, a) => { s.trending = a.payload.data; })
      .addCase(createStory.pending, (s) => { s.loading = true; })
      .addCase(createStory.fulfilled, (s) => { s.loading = false; })
      .addCase(createStory.rejected, (s, a) => { s.loading = false; s.error = a.payload; });
  },
});

export const { clearCurrent, clearError } = storySlice.actions;
export default storySlice.reducer;
