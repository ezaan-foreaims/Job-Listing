// src/api/slice/jobsSlice.js
import { createSlice, createAsyncThunk } from "@reduxjs/toolkit";

const API_BASE = "http://localhost:5000";

// ----------------- Async Thunks -----------------
export const fetchJobsThunk = createAsyncThunk("jobs/fetchJobs", async (params = {}, thunkAPI) => {
  try {
    const query = new URLSearchParams(params).toString();
    const res = await fetch(`${API_BASE}/jobs/?${query}`);
    if (!res.ok) throw new Error("Failed to fetch jobs");
    return await res.json();
  } catch (err) {
    return thunkAPI.rejectWithValue(err.message);
  }
});

export const fetchJobThunk = createAsyncThunk("jobs/fetchJob", async (id, thunkAPI) => {
  try {
    const res = await fetch(`${API_BASE}/jobs/${id}`);
    if (!res.ok) throw new Error("Job not found");
    return await res.json();
  } catch (err) {
    return thunkAPI.rejectWithValue(err.message);
  }
});

export const createJobThunk = createAsyncThunk("jobs/createJob", async (job, thunkAPI) => {
  try {
    const res = await fetch(`${API_BASE}/jobs/`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(job),
    });
    if (!res.ok) throw new Error("Failed to create job");
    return await res.json();
  } catch (err) {
    return thunkAPI.rejectWithValue(err.message);
  }
});

export const updateJobThunk = createAsyncThunk(
  "jobs/updateJob",
  async ({ id, job }, thunkAPI) => {
    try {
      const res = await fetch(`http://localhost:5000/jobs/${id}`, {
        method: "PUT",   // PATCH for partial update
        headers: {
          "Content-Type": "application/json",   // 👈 ensure header
        },
        body: JSON.stringify(job),              // 👈 must not be undefined/null
      });

      if (!res.ok) {
        const errorText = await res.text(); // capture backend message
        throw new Error(`Update failed: ${errorText}`);
      }

      return await res.json();
    } catch (err) {
      return thunkAPI.rejectWithValue(err.message);
    }
  }
);


export const deleteJobThunk = createAsyncThunk("jobs/deleteJob", async (id, thunkAPI) => {
  try {
    const res = await fetch(`${API_BASE}/jobs/${id}`, { method: "DELETE" });
    if (!res.ok) throw new Error("Failed to delete job");
    return id; // return deleted job id
  } catch (err) {
    return thunkAPI.rejectWithValue(err.message);
  }
});

// ----------------- Slice -----------------
const jobsSlice = createSlice({
  name: "jobs",
  initialState: {
    jobs: [],
    job: null,
    loading: false,
    error: null,
    filters: {},
    editingJob: null,
    deletingJob: null,
  },
  reducers: {
    setFilters: (state, action) => {
      state.filters = action.payload;
    },
    setDeletingJob: (state, action) => {
      state.deletingJob = action.payload;
    },
    setEditingJob: (state, action) => {
      state.editingJob = action.payload;
    },
  },
  extraReducers: (builder) => {
    builder
      // fetch jobs
      .addCase(fetchJobsThunk.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchJobsThunk.fulfilled, (state, action) => {
        state.loading = false;
        state.jobs = action.payload;
      })
      .addCase(fetchJobsThunk.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })
      // fetch single job
      .addCase(fetchJobThunk.fulfilled, (state, action) => {
        state.job = action.payload;
      })
      // create job
      .addCase(createJobThunk.fulfilled, (state, action) => {
        state.jobs.push(action.payload);
      })
      // update job
      .addCase(updateJobThunk.fulfilled, (state, action) => {
        const index = state.jobs.findIndex((j) => j.id === action.payload.id);
        if (index !== -1) state.jobs[index] = action.payload;
      })
      // delete job
      .addCase(deleteJobThunk.fulfilled, (state, action) => {
        state.jobs = state.jobs.filter((j) => j.id !== action.payload);
      });
  },
});

export const { setFilters, setDeletingJob, setEditingJob } = jobsSlice.actions;
export default jobsSlice.reducer;
