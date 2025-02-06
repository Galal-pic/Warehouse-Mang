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
    getLastInvoiceId: builder.query({
      query: () => "/invoice/last-id",
    }),
    createInvoice: builder.mutation({
      query: (invoice) => ({
        url: "/invoice/",
        method: "POST",
        body: invoice,
      }),
      invalidatesTags: ["Invoice"],
    }),
    getInvoices: builder.query({
      query: (type) => `/invoice/${type}`,
      providesTags: ["Invoice"],
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
  }),
});

export const {
  useGetLastInvoiceIdQuery,
  useCreateInvoiceMutation,
  useGetInvoicesQuery,
  useUpdateInvoiceMutation,
  useDeleteInvoiceMutation,
  useConfirmInvoiceMutation,
} = invoiceApi;
