// src/store/store.js
import { configureStore } from '@reduxjs/toolkit';
import jobsReducer from "./slice/jobsSlice"

export const store = configureStore({
  reducer: {
    jobs: jobsReducer, // use "jobs" key for the slice
  },
});


