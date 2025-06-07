import { createApi, fetchBaseQuery } from "@reduxjs/toolkit/query/react";

export const api = createApi({
  reducerPath: "api",
  baseQuery: fetchBaseQuery({
    baseUrl: import.meta.env.VITE_API_BASE_URL_DEVELOPMENT,
    prepareHeaders: (headers) => {
      const token = localStorage.getItem("access_token");
      if (token) headers.set("Authorization", `Bearer ${token}`);
      return headers;
    },
  }),
  tagTypes: ["Invoice", "Warehouse", "Reports"],
  endpoints: (builder) => ({
    // Existing endpoints (unchanged)
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
      invalidatesTags: ["Invoice", "Warehouse", "Reports"],
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

    // Updated endpoint for /reports/filter (no pagination)
    getFilteredReports: builder.query({
      query: ({
        reportType,
        type,
        warehouse_manager,
        machine,
        mechanism,
        client_name,
        accreditation_manager,
        employee_name,
        supplier,
        status,
        invoice_type,
        item_name,
        item_bar,
        location,
        start_date,
        end_date,
        page,
        page_size,
        invoices_page,
        invoices_page_size,
        items_page,
        items_page_size,
        invoice_id,
        all = false,
      }) => {
        const params = new URLSearchParams();
        params.append("type", reportType);
        if (warehouse_manager)
          params.append("warehouse_manager", warehouse_manager);
        if (machine) params.append("machine", machine);
        if (mechanism) params.append("mechanism", mechanism);
        if (client_name) params.append("client_name", client_name);
        if (accreditation_manager)
          params.append("accreditation_manager", accreditation_manager);
        if (employee_name) params.append("employee_name", employee_name);
        if (type) params.append("invoice_type", type === "الكل" ? "all" : type);
        if (supplier) params.append("supplier", supplier);
        if (status) params.append("status", status);
        if (invoice_type) params.append("invoice_type", invoice_type);
        if (item_name) params.append("item_name", item_name);
        if (item_bar) params.append("item_bar", item_bar);
        if (location) params.append("location", location);
        if (start_date) params.append("start_date", start_date);
        if (end_date) params.append("end_date", end_date);
        if (invoice_id) params.append("invoice_id", invoice_id);
        if (!all) {
          params.append("page", page + 1);
          params.append("page_size", page_size);
          if (invoices_page !== undefined)
            params.append("invoices_page", invoices_page + 1);
          if (invoices_page_size)
            params.append("invoices_page_size", invoices_page_size);
          if (items_page !== undefined)
            params.append("items_page", items_page + 1);
          if (items_page_size)
            params.append("items_page_size", items_page_size);
        } else {
          params.append("all", "true");
        }
        return `/reports/filter?${params.toString()}`;
      },
      providesTags: ["Reports"],
      transformResponse: (response) => {
        if (response.all) {
          return {
            results: response.results || [],
            page: 1,
            page_size: response.results?.length || 0,
            total_pages: 1,
            total: response.results?.length || 0,
          };
        }
        return {
          results: response.results || [],
          page: response.page || 1,
          page_size: response.page_size || 10,
          total_pages: response.pages || response.total_pages || 1,
          total: response.total || 0,
        };
      },
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
  useGetReportsQuery,
  useGetFilteredReportsQuery,
} = api;
