import { createApi, fetchBaseQuery } from "@reduxjs/toolkit/query/react";

export const mechanismApi = createApi({
  reducerPath: "mechanismApi",
  baseQuery: fetchBaseQuery({
    baseUrl: process.env.REACT_APP_API_BASE_URL,
    prepareHeaders: (headers) => {
      const token = localStorage.getItem("access_token");
      if (token) headers.set("Authorization", `Bearer ${token}`);
      return headers;
    },
  }),
  tagTypes: ["Mechanism"],
  endpoints: (builder) => ({
    getMechanisms: builder.query({
      query: () => "/mechanism/",
      providesTags: ["Mechanism"],
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
  }),
});

export const { 
  useGetMechanismsQuery,
  useAddMechanismMutation,
  useUpdateMechanismMutation,
  useDeleteMechanismMutation 
} = mechanismApi;