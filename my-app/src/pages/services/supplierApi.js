import { createApi, fetchBaseQuery } from "@reduxjs/toolkit/query/react";

export const supplierApi = createApi({
  reducerPath: "supplierApi",
  baseQuery: fetchBaseQuery({
    baseUrl: process.env.REACT_APP_API_BASE_URL,
    prepareHeaders: (headers) => {
      const token = localStorage.getItem("access_token");
      if (token) headers.set("Authorization", `Bearer ${token}`);
      return headers;
    },
  }),
  tagTypes: ["Supplier"],
  endpoints: (builder) => ({
    getSuppliers: builder.query({
      query: () => "/supplier/",
      providesTags: ["Supplier"],
    }),
    addSupplier: builder.mutation({
      query: (newSupplier) => ({
        url: "/supplier/",
        method: "POST",
        body: newSupplier,
      }),
      invalidatesTags: ["Supplier"],
    }),
    updateSupplier: builder.mutation({
      query: ({ id, ...patch }) => ({
        url: `/supplier/${id}`,
        method: "PUT",
        body: patch,
      }),
      invalidatesTags: ["Supplier"],
    }),
    deleteSupplier: builder.mutation({
      query: (id) => ({
        url: `/supplier/${id}`,
        method: "DELETE",
      }),
      invalidatesTags: ["Supplier"],
    }),
    importSupplier: builder.mutation({
      query: (data) => ({
        url: "/supplier/excel",
        method: "POST",
        body: { data },
      }),
      invalidatesTags: ["Supplier"],
    }),
  }),
});

export const { 
  useGetSuppliersQuery,
  useAddSupplierMutation,
  useUpdateSupplierMutation,
  useDeleteSupplierMutation,
  useImportSupplierMutation
} = supplierApi;