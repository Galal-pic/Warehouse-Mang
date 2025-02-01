// store.js
import { configureStore } from "@reduxjs/toolkit";
import { userApi } from "./userApi";
import { supplierApi } from "./supplierApi";
import { machineApi } from "./machineApi";
import { mechanismApi } from "./mechanismApi";
import { warehouseApi } from "./warehouseApi";
import { invoiceApi } from "./invoiceApi";

export const store = configureStore({
  reducer: {
    [userApi.reducerPath]: userApi.reducer,
    [supplierApi.reducerPath]: supplierApi.reducer,
    [machineApi.reducerPath]: machineApi.reducer,
    [mechanismApi.reducerPath]: mechanismApi.reducer,
    [warehouseApi.reducerPath]: warehouseApi.reducer,
    [invoiceApi.reducerPath]: invoiceApi.reducer,
  },
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware()
      .concat(userApi.middleware)
      .concat(supplierApi.middleware)
      .concat(machineApi.middleware)
      .concat(mechanismApi.middleware)
      .concat(warehouseApi.middleware)
      .concat(invoiceApi.middleware),
});
