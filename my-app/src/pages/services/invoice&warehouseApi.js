import { createApi, fetchBaseQuery } from "@reduxjs/toolkit/query/react";

export const api = createApi({
  reducerPath: "api",
  baseQuery: fetchBaseQuery({
    baseUrl: process.env.REACT_APP_API_BASE_URL,
    prepareHeaders: (headers) => {
      const token = localStorage.getItem("access_token");
      if (token) headers.set("Authorization", `Bearer ${token}`);
      return headers;
    },
  }),
  tagTypes: ["Invoice", "Warehouse", "Reports"],
  endpoints: (builder) => ({
    // Existing warehouseApi endpoints
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
        body: data,
      }),
      invalidatesTags: ["Warehouse"],
    }),
    detailsReport: builder.query({
      query: (id) => `/invoice/fifo-prices/${id}`,
    }),
    getItem: builder.query({
      query: (id) => `/warehouse/${id}`,
    }),

    // Existing invoiceApi endpoints
    getLastInvoiceId: builder.query({
      query: () => "/invoice/last-id",
      providesTags: ["Invoice"],
    }),
    createInvoice: builder.mutation({
      query: (invoice) => ({
        url: "/invoice/",
        method: "POST",
        body: invoice,
      }),
      invalidatesTags: ["Invoice", "Warehouse"],
    }),
    getInvoices: builder.query({
      query: ({ type, page, page_size, all = false }) => {
        if (all) {
          return `/invoice/${type}?all=true`;
        }
        return `/invoice/${type}?page=${
          page + 1
        }&page_size=${page_size}&all=false`;
      },
      providesTags: ["Invoice"],
      transformResponse: (response) => {
        if (response.all) {
          return {
            invoices: response.invoices,
            page: 1,
            page_size: response.invoices.length,
            total_pages: 1,
            total_items: response.invoices.length,
          };
        }
        return {
          invoices: response.invoices,
          page: response.page,
          page_size: response.page_size,
          total_pages: response.total_pages,
          total_items: response.total_items,
        };
      },
    }),
    updateInvoice: builder.mutation({
      query: ({ id, ...body }) => ({
        url: `/invoice/${id}`,
        method: "PUT",
        body,
      }),
      invalidatesTags: ["Invoice"],
    }),
    deleteInvoice: builder.mutation({
      query: (id) => ({
        url: `/invoice/${id}`,
        method: "DELETE",
      }),
      invalidatesTags: ["Invoice"],
    }),
    confirmInvoice: builder.mutation({
      query: (id) => ({
        url: `/invoice/${id}/confirm`,
        method: "POST",
      }),
      invalidatesTags: ["Invoice"],
    }),
    confirmTalabSheraaInvoice: builder.mutation({
      query: (id) => ({
        url: `/invoice/${id}/PurchaseRequestConfirmation`,
        method: "POST",
      }),
      invalidatesTags: ["Invoice"],
    }),
    refreshInvoice: builder.mutation({
      query: (id) => ({
        url: `/invoice/updateprice/${id}`,
        method: "GET",
      }),
      invalidatesTags: ["Invoice"],
    }),
    returnWarrantyInvoice: builder.mutation({
      query: (id) => ({
        url: `/invoice/${id}/ReturnWarranty`,
        method: "POST",
      }),
      invalidatesTags: ["Invoice"],
    }),
    priceReport: builder.query({
      query: (id) => `/invoice/price-report/${id}`,
    }),
    getInvoice: builder.query({
      query: (id) => `/invoice/${id}`,
    }),

    // Modified endpoint for /reports/
    getReports: builder.query({
      query: () => "/reports/?all=true",
      providesTags: ["Reports"],
      transformResponse: (response) => ({
        employee: response.employee || [],
        supplier: response.supplier || [],
        machine: response.machine || [],
        mechanism: response.mechanism || [],
        invoice: response.invoice || [],
        invoice_item: response.invoice_item || [],
        warehouse: response.warehouse || [],
        item_locations: response.item_locations || [],
        prices: response.prices || [],
        invoice_price_detail: response.invoice_price_detail || [],
        purchase_requests: response.purchase_requests || [],
      }),
    }),
  }),
});

export const {
  // Existing warehouseApi hooks
  useGetWarehousesQuery,
  useAddWarehouseMutation,
  useUpdateWarehouseMutation,
  useDeleteWarehouseMutation,
  useImportWarehouseMutation,
  useDetailsReportQuery,
  useGetItemQuery,
  // Existing invoiceApi hooks
  useGetLastInvoiceIdQuery,
  useCreateInvoiceMutation,
  useGetInvoicesQuery,
  useUpdateInvoiceMutation,
  useDeleteInvoiceMutation,
  useConfirmInvoiceMutation,
  useConfirmTalabSheraaInvoiceMutation,
  useRefreshInvoiceMutation,
  useReturnWarrantyInvoiceMutation,
  usePriceReportQuery,
  useGetInvoiceQuery,
  // Hook for reports
  useGetReportsQuery,
} = api;
