// store.js
import { configureStore } from "@reduxjs/toolkit";
import { userApi } from "./userApi";
import { supplierApi } from "./supplierApi";
import { machineApi } from "./machineApi";
import { mechanismApi } from "./mechanismApi";
import { api } from "./invoice&warehouseApi";

export const store = configureStore({
  reducer: {
    [userApi.reducerPath]: userApi.reducer,
    [supplierApi.reducerPath]: supplierApi.reducer,
    [machineApi.reducerPath]: machineApi.reducer,
    [mechanismApi.reducerPath]: mechanismApi.reducer,
    [api.reducerPath]: api.reducer, // أضف api هنا
  },
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware()
      .concat(userApi.middleware)
      .concat(supplierApi.middleware)
      .concat(machineApi.middleware)
      .concat(mechanismApi.middleware)
      .concat(api.middleware), // أضف middleware الخاص بـ api
});
