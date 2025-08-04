import { createApi, fetchBaseQuery } from "@reduxjs/toolkit/query/react";

export const mechanismApi = createApi({
  reducerPath: "mechanismApi",
  baseQuery: fetchBaseQuery({
    baseUrl:  import.meta.env.VITE_API_BASE_URL_DEVELOPMENT,
    prepareHeaders: (headers) => {
      const token = localStorage.getItem("access_token");
      if (token) headers.set("Authorization", `Bearer ${token}`);
      return headers;
    },
  }),
  tagTypes: ["Mechanism"],
  endpoints: (builder) => ({
    getMechanisms: builder.query({
      query: ({ page, page_size, all = false }) => {
        const queryParams = all
          ? "all=true"
          : `page=${page + 1}&page_size=${page_size}&all=false`;
        return `/mechanism/?${queryParams}`;
      },
      providesTags: ["Mechanism"],
      transformResponse: (response) => ({
        mechanisms: response.mechanisms,
        page: response.page,
        page_size: response.page_size,
        total_pages: response.total_pages,
        total_items: response.total_items,
        all: response.all || false,
      }),
    }),
    addMechanism: builder.mutation({
      query: (newMechanism) => ({
        url: "/mechanism/",
        method: "POST",
        body: newMechanism,
      }),
      invalidatesTags: ["Mechanism"],
    }),
    updateMechanism: builder.mutation({
      query: ({ id, ...patch }) => ({
        url: `/mechanism/${id}`,
        method: "PUT",
        body: patch,
      }),
      invalidatesTags: ["Mechanism"],
    }),
    deleteMechanism: builder.mutation({
      query: (id) => ({
        url: `/mechanism/${id}`,
        method: "DELETE",
      }),
      invalidatesTags: ["Mechanism"],
    }),
    importMechanism: builder.mutation({
      query: (data) => ({
        url: "/mechanism/excel",
        method: "POST",
        body: { data },
      }),
      invalidatesTags: ["Mechanism"],
    }),
  }),
});

export const {
  useGetMechanismsQuery,
  useAddMechanismMutation,
  useUpdateMechanismMutation,
  useDeleteMechanismMutation,
  useImportMechanismMutation,
} = mechanismApi;
