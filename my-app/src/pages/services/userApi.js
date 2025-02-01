// services/userApi.js
import { createApi, fetchBaseQuery } from "@reduxjs/toolkit/query/react";

export const userApi = createApi({
  reducerPath: "userApi",
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
  tagTypes: ["User"], // Used for caching and invalidation
  endpoints: (builder) => ({
    getUsers: builder.query({
      query: () => "/auth/users",
      providesTags: ["User"], // Invalidate cache when users are updated or deleted
    }),
    getUser: builder.query({
      query: () => "/auth/user",
    }),
    updateUser: builder.mutation({
      query: ({ id, ...patch }) => ({
        url: `/auth/user/${id}`,
        method: "PUT",
        body: patch,
      }),
      invalidatesTags: ["User"], // Invalidate cache after updating
    }),
    deleteUser: builder.mutation({
      query: (id) => ({
        url: `/auth/user/${id}`,
        method: "DELETE",
      }),
      invalidatesTags: ["User"], // Invalidate cache after deleting
    }),
    addUser: builder.mutation({
      query: (newUser) => ({
        url: `/auth/register`,
        method: "POST",
        body: newUser,
      }),
      invalidatesTags: ["User"], // Invalidate cache after adding
    }),
  }),
});

export const {
  useGetUsersQuery,
  useGetUserQuery,
  useUpdateUserMutation,
  useDeleteUserMutation,
  useAddUserMutation,
} = userApi;
