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
    // get invoices
    getInvoices: builder.query({
      query: (type) => `/invoice/${type}`,
      providesTags: ["Invoice"],
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
        url: `/invoice/${id}/updateprice`,
        method: "POST",
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
    // price report: change to a query
    priceReport: builder.query({
      query: (id) => `/invoice/price-report/${id}`,
    }),
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
