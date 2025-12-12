// src/features/users/hooks/useUsersData.js
import { useCallback, useEffect, useState } from "react";
import { getUsers, deleteUser as deleteUserApi } from "../../../api/modules/usersApi";

export function useUsersData({ page, pageSize }) {
  const [usersData, setUsersData] = useState({
    users: [],
    total_pages: 1,
    page: 0,
  });
  const [isLoading, setIsLoading] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [error, setError] = useState(null);

  const fetchUsers = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);
      const res = await getUsers({ page, page_size: pageSize, all: false });
      const data = res.data;

      setUsersData({
        users: data.users || [],
        total_pages: data.total_pages || 1,
        page: (data.page || 1) - 1,
      });
    } catch (err) {
      console.error("Error fetching users:", err);
      setError(err);
    } finally {
      setIsLoading(false);
    }
  }, [page, pageSize]);

  useEffect(() => {
    fetchUsers();
  }, [fetchUsers]);

  const deleteUser = async (id) => {
    setIsDeleting(true);
    try {
      await deleteUserApi(id);
      await fetchUsers();
    } finally {
      setIsDeleting(false);
    }
  };

  return {
    usersData,
    isLoading,
    isDeleting,
    error,
    refetch: fetchUsers,
    deleteUser,
  };
}
