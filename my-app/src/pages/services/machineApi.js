import { createApi, fetchBaseQuery } from "@reduxjs/toolkit/query/react";

export const machineApi = createApi({
  reducerPath: "machineApi",
  baseQuery: fetchBaseQuery({
    baseUrl: process.env.REACT_APP_API_BASE_URL,
    prepareHeaders: (headers) => {
      const token = localStorage.getItem("access_token");
      if (token) headers.set("Authorization", `Bearer ${token}`);
      return headers;
    },
  }),
  tagTypes: ["Machine"],
  endpoints: (builder) => ({
    getMachines: builder.query({
      query: ({ page, page_size, all = false }) => {
        const queryParams = all
          ? "all=true"
          : `page=${page + 1}&page_size=${page_size}&all=false`;
        return `/machine/?${queryParams}`;
      },
      providesTags: ["Machine"],
      transformResponse: (response) => ({
        machines: response.machines,
        page: response.page,
        page_size: response.page_size,
        total_pages: response.total_pages,
        total_items: response.total_items,
        all: response.all || false,
      }),
    }),
    addMachine: builder.mutation({
      query: (newMachine) => ({
        url: "/machine/",
        method: "POST",
        body: newMachine,
      }),
      invalidatesTags: ["Machine"],
    }),
    updateMachine: builder.mutation({
      query: ({ id, ...patch }) => ({
        url: `/machine/${id}`,
        method: "PUT",
        body: patch,
      }),
      invalidatesTags: ["Machine"],
    }),
    deleteMachine: builder.mutation({
      query: (id) => ({
        url: `/machine/${id}`,
        method: "DELETE",
      }),
      invalidatesTags: ["Machine"],
    }),
    importMachines: builder.mutation({
      query: (data) => ({
        url: "/machine/excel",
        method: "POST",
        body: { data },
      }),
      invalidatesTags: ["Machine"],
    }),
  }),
});

export const {
  useGetMachinesQuery,
  useAddMachineMutation,
  useUpdateMachineMutation,
  useDeleteMachineMutation,
  useImportMachinesMutation,
} = machineApi;
