import { createApi, fetchBaseQuery } from "@reduxjs/toolkit/query/react";

export const warehouseApi = createApi({
  reducerPath: "warehouseApi",
  baseQuery: fetchBaseQuery({
    baseUrl:  import.meta.env.VITE_API_BASE_URL_DEVELOPMENT,
    prepareHeaders: (headers) => {
      const token = localStorage.getItem("access_token");
      if (token) headers.set("Authorization", `Bearer ${token}`);
      return headers;
    },
  }),
  tagTypes: ["Warehouse"],
  endpoints: (builder) => ({
    getWarehouses: builder.query({
      query: ({ page, page_size, all = false }) => {
        const queryParams = all
          ? "all=true"
          : `page=${page + 1}&page_size=${page_size}&all=false`;
        return `/warehouse/?${queryParams}`;
      },
      providesTags: ["Warehouse"],
      transformResponse: (response) => ({
        warehouses: response.warehouses,
        page: response.page,
        page_size: response.page_size,
        total_pages: response.total_pages,
        total_items: response.total_items,
        all: response.all || false,
      }),
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
    detailsReport: builder.query({
      query: (id) => `/invoice/fifo-prices/${id}`,
    }),
    getItem: builder.query({
      query: (id) => `/warehouse/${id}`,
    }),
  }),
});

export const {
  useGetWarehousesQuery,
  useAddWarehouseMutation,
  useUpdateWarehouseMutation,
  useDeleteWarehouseMutation,
  useImportWarehouseMutation,
  useDetailsReportQuery,
  useGetItemQuery,
} = warehouseApi;
