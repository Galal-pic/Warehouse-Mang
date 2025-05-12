import { createApi, fetchBaseQuery } from "@reduxjs/toolkit/query/react";

export const invoiceApi = createApi({
  reducerPath: "invoiceApi",
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
  tagTypes: ["Invoice"],
  endpoints: (builder) => ({
    // get last id
    getLastInvoiceId: builder.query({
      query: () => "/invoice/last-id",
    }),
    // create invoice
    createInvoice: builder.mutation({
      query: (invoice) => ({
        url: "/invoice/",
        method: "POST",
        body: invoice,
      }),
      invalidatesTags: ["Invoice"],
    }),
    // get invoices with pagination or all
    getInvoices: builder.query({
      query: ({ type, page, page_size, all = false }) => {
        if (all) {
          return `/invoice/${type}?all=true`;
        }
        return `/invoice/${type}?page=${page + 1}&page_size=${page_size}&all=false`;
      },
      providesTags: ["Invoice"],
      transformResponse: (response) => {
        // If fetching all, return only the invoices array
        if (response.all) {
          return {
            invoices: response.invoices,
            page: 1,
            page_size: response.invoices.length,
            total_pages: 1,
            total_items: response.invoices.length,
          };
        }
        // For paginated response, return full metadata
        return {
          invoices: response.invoices,
          page: response.page,
          page_size: response.page_size,
          total_pages: response.total_pages,
          total_items: response.total_items,
        };
      },
    }),
    // edit invoice
    updateInvoice: builder.mutation({
      query: ({ id, ...body }) => ({
        url: `/invoice/${id}`,
        method: "PUT",
        body,
      }),
      invalidatesTags: ["Invoice"],
    }),
    // delete invoice
    deleteInvoice: builder.mutation({
      query: (id) => ({
        url: `/invoice/${id}`,
        method: "DELETE",
      }),
      invalidatesTags: ["Invoice"],
    }),
    // confirm invoice
    confirmInvoice: builder.mutation({
      query: (id) => ({
        url: `/invoice/${id}/confirm`,
        method: "POST",
      }),
      invalidatesTags: ["Invoice"],
    }),
    // refresh invoice
    refreshInvoice: builder.mutation({
      query: (id) => ({
        url: `/invoice/updateprice/${id}`,
        method: "GET",
      }),
      invalidatesTags: ["Invoice"],
    }),
    // return warranty invoice
    returnWarrantyInvoice: builder.mutation({
      query: (id) => ({
        url: `/invoice/${id}/ReturnWarranty`,
        method: "POST",
      }),
      invalidatesTags: ["Invoice"],
    }),
    // price report
    priceReport: builder.query({
      query: (id) => `/invoice/price-report/${id}`,
    }),
    // get single invoice
    getInvoice: builder.query({
      query: (id) => `/invoice/${id}`,
    }),
  }),
});

// Export hooks
export const {
  useGetLastInvoiceIdQuery,
  useCreateInvoiceMutation,
  useGetInvoicesQuery,
  useUpdateInvoiceMutation,
  useDeleteInvoiceMutation,
  useConfirmInvoiceMutation,
  useRefreshInvoiceMutation,
  useReturnWarrantyInvoiceMutation,
  usePriceReportQuery,
  useGetInvoiceQuery,
} = invoiceApi;
