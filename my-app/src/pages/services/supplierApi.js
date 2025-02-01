import { createApi, fetchBaseQuery } from "@reduxjs/toolkit/query/react";

export const supplierApi = createApi({
  reducerPath: "supplierApi",
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
  tagTypes: ["Supplier"],
  endpoints: (builder) => ({
    getSuppliers: builder.query({
      query: () => "/supplier/",
      providesTags: ["Supplier"],
    }),
  }),
});

export const { useGetSuppliersQuery } = supplierApi;