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
  tagTypes: ["User"],
  endpoints: (builder) => ({
    getUsers: builder.query({
      query: ({ page, page_size, all = false }) => {
        const queryParams = all
          ? "all=true"
          : `page=${page + 1}&page_size=${page_size}&all=false`;
        return `/auth/users?${queryParams}`;
      },
      providesTags: ["User"],
      transformResponse: (response) => ({
        users: response.users,
        page: response.page,
        page_size: response.page_size,
        total_pages: response.total_pages,
        total_items: response.total_items,
        all: response.all || false,
      }),
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
      invalidatesTags: ["User"],
    }),
    deleteUser: builder.mutation({
      query: (id) => ({
        url: `/auth/user/${id}`,
        method: "DELETE",
      }),
      invalidatesTags: ["User"],
    }),
    addUser: builder.mutation({
      query: (newUser) => ({
        url: `/auth/register`,
        method: "POST",
        body: newUser,
      }),
      invalidatesTags: ["User"],
    }),
    changePass: builder.mutation({
      query: ({ id, ...newUser }) => ({
        url: `/auth/user/${id}/change-password`,
        method: "POST",
        body: newUser,
      }),
      invalidatesTags: ["User"],
    }),
  }),
});

export const {
  useGetUsersQuery,
  useGetUserQuery,
  useUpdateUserMutation,
  useDeleteUserMutation,
  useAddUserMutation,
  useChangePassMutation,
} = userApi;
