import { createApi, fetchBaseQuery } from "@reduxjs/toolkit/query/react";

export const warehouseApi = createApi({
  reducerPath: "warehouseApi",
  baseQuery: fetchBaseQuery({
    baseUrl: process.env.REACT_APP_API_BASE_URL,
    prepareHeaders: (headers) => {
      const token = localStorage.getItem("access_token");
      if (token) headers.set("Authorization", `Bearer ${token}`);
      return headers;
    },
  }),
  tagTypes: ["Warehouse"],
  endpoints: (builder) => ({
    getWarehouses: builder.query({
      query: () => "/warehouse/",
      providesTags: ["Warehouse"],
    }),
    addWarehouse: builder.mutation({
      query: (newItem) => ({
        url: "/warehouse/",
        method: "POST",
        body: newItem,
      }),
      invalidatesTags: ["Warehouse"],
    }),
    updateWarehouse: builder.mutation({
      query: ({ id, ...patch }) => ({
        url: `/warehouse/${id}`,
        method: "PUT",
        body: patch,
      }),
      invalidatesTags: ["Warehouse"],
    }),
    deleteWarehouse: builder.mutation({
      query: (id) => ({
        url: `/warehouse/${id}`,
        method: "DELETE",
      }),
      invalidatesTags: ["Warehouse"],
    }),
    importWarehouse: builder.mutation({
      query: (data) => ({
        url: "/warehouse/excel",
        method: "POST",
        body: { data },
      }),
      invalidatesTags: ["Warehouse"],
    }),
  }),
});

export const {
  useGetWarehousesQuery,
  useAddWarehouseMutation,
  useUpdateWarehouseMutation,
  useDeleteWarehouseMutation,
  useImportWarehouseMutation,
} = warehouseApi;
