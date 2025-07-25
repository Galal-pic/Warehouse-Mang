import { createApi, fetchBaseQuery } from "@reduxjs/toolkit/query/react";

export const supplierApi = createApi({
  reducerPath: "supplierApi",
  baseQuery: fetchBaseQuery({
    baseUrl:  import.meta.env.VITE_API_BASE_URL_DEVELOPMENT,
    prepareHeaders: (headers) => {
      const token = localStorage.getItem("access_token");
      if (token) headers.set("Authorization", `Bearer ${token}`);
      return headers;
    },
  }),
  tagTypes: ["Supplier"],
  endpoints: (builder) => ({
    getSuppliers: builder.query({
      query: ({ page, page_size, all = false }) => {
        const queryParams = all
          ? "all=true"
          : `page=${page + 1}&page_size=${page_size}&all=false`;
        return `/supplier/?${queryParams}`;
      },
      providesTags: ["Supplier"],
      transformResponse: (response) => ({
        suppliers: response.suppliers,
        page: response.page,
        page_size: response.page_size,
        total_pages: response.total_pages,
        total_items: response.total_items,
        all: response.all || false,
      }),
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
  useImportSupplierMutation,
} = supplierApi;
