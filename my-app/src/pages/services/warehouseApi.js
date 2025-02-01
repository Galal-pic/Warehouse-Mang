import { createApi, fetchBaseQuery } from "@reduxjs/toolkit/query/react";

export const warehouseApi = createApi({
  reducerPath: "warehouseApi",
  baseQuery: fetchBaseQuery({
    baseUrl: process.env.REACT_APP_API_BASE_URL,
    prepareHeaders: (headers) => {
      const token = localStorage.getItem("access_token");
      if (token) {
        headers.set("Authorization", `Bearer ${token}`);
      }
      return headers;
    },
  }),
  tagTypes: ["Warehouse"],
  endpoints: (builder) => ({
    getWarehouses: builder.query({
      query: () => "/warehouse/",
      providesTags: ["Warehouse"],
    }),
  }),
});

export const { useGetWarehousesQuery } = warehouseApi;