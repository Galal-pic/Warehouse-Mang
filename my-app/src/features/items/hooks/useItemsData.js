// src/features/items/hooks/useItemsData.js
import { useCallback, useEffect, useState } from "react";
import {
  getWarehouses,
  addWarehouse as addWarehouseApi,
  updateWarehouse as updateWarehouseApi,
  deleteWarehouse as deleteWarehouseApi,
} from "../../../api/modules/warehousesApi";

export function useItemsData({ page, pageSize }) {
  const [items, setItems] = useState([]);
  const [totalPages, setTotalPages] = useState(1);

  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [error, setError] = useState(null);

  const fetchItems = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);

      const res = await getWarehouses({
        page,
        page_size: pageSize,
        all: false,
      });

      const data = res.data;
      setItems(data.warehouses || []);
      setTotalPages(data.total_pages || 1);
    } catch (err) {
      console.error(err);
      setError(err);
    } finally {
      setIsLoading(false);
    }
  }, [page, pageSize]);

  useEffect(() => {
    fetchItems();
  }, [fetchItems]);

  const addItem = async (payload) => {
    setIsSaving(true);
    try {
      await addWarehouseApi(payload);
      await fetchItems();
    } finally {
      setIsSaving(false);
    }
  };

  const updateItem = async (payload) => {
    setIsSaving(true);
    try {
      await updateWarehouseApi(payload);
      await fetchItems();
    } finally {
      setIsSaving(false);
    }
  };

  const deleteItem = async (id) => {
    setIsDeleting(true);
    try {
      await deleteWarehouseApi(id);
      await fetchItems();
    } finally {
      setIsDeleting(false);
    }
  };

  return {
    items,
    totalPages,
    isLoading,
    isSaving,
    isDeleting,
    error,
    refetch: fetchItems,
    addItem,
    updateItem,
    deleteItem,
  };
}
