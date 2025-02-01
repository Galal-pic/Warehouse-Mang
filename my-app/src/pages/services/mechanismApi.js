import { createApi, fetchBaseQuery } from "@reduxjs/toolkit/query/react";

export const mechanismApi = createApi({
  reducerPath: "mechanismApi",
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
  tagTypes: ["Mechanism"],
  endpoints: (builder) => ({
    getMechanisms: builder.query({
      query: () => "/mechanism/",
      providesTags: ["Mechanism"],
    }),
  }),
});

export const { useGetMechanismsQuery } = mechanismApi;