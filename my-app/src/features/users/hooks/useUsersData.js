// src/features/users/hooks/useUsersData.js
import { useState, useEffect, useMemo } from "react";
import {
  useGetUsersQuery,
  useDeleteUserMutation,
  useGetUserQuery,
} from "../../../services/userApi";

export default function useUsersData(paginationModel) {
  const { data: user, isLoading: isLoadingUser } = useGetUserQuery();

  const {
    data: usersData = { users: [], total_pages: 1 },
    isLoading,
    refetch: refetchUsers,
  } = useGetUsersQuery(
    { page: paginationModel.page, page_size: paginationModel.pageSize },
    { pollingInterval: 300000 }
  );

  const [deleteUser, { isLoading: isDeleting }] = useDeleteUserMutation();

  useEffect(() => {
    refetchUsers();
  }, [refetchUsers, paginationModel.page, paginationModel.pageSize]);

  return useMemo(
    () => ({
      user,
      usersData,
      isLoading,
      isLoadingUser,
      refetchUsers,
      deleteUser,
      isDeleting,
    }),
    [user, usersData, isLoading, isLoadingUser, refetchUsers, deleteUser, isDeleting]
  );
}
