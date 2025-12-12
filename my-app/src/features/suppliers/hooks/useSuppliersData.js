// src/features/suppliers/hooks/useSuppliersData.js
import { useCallback, useEffect, useState } from "react";
import {
  getSuppliers,
  addSupplier as addSupplierApi,
  updateSupplier as updateSupplierApi,
  deleteSupplier as deleteSupplierApi,
} from "../../../api/modules/suppliersApi";

export function useSuppliersData({ page, pageSize }) {
  const [suppliers, setSuppliers] = useState([]);
  const [totalPages, setTotalPages] = useState(1);

  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false); // إضافة / تعديل
  const [isDeleting, setIsDeleting] = useState(false);
  const [error, setError] = useState(null);

  const fetchSuppliers = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);

      const res = await getSuppliers({
        page,
        page_size: pageSize,
        all: false,
      });

      const data = res.data;
      setSuppliers(data.suppliers || []);
      setTotalPages(data.total_pages || 1);
    } catch (err) {
      console.error(err);
      setError(err);
    } finally {
      setIsLoading(false);
    }
  }, [page, pageSize]);

  useEffect(() => {
    fetchSuppliers();
  }, [fetchSuppliers]);

  const addSupplier = async (payload) => {
    setIsSaving(true);
    try {
      await addSupplierApi(payload);
      await fetchSuppliers();
    } finally {
      setIsSaving(false);
    }
  };

  const updateSupplier = async (payload) => {
    setIsSaving(true);
    try {
      await updateSupplierApi(payload);
      await fetchSuppliers();
    } finally {
      setIsSaving(false);
    }
  };

  const deleteSupplier = async (id) => {
    setIsDeleting(true);
    try {
      await deleteSupplierApi(id);
      await fetchSuppliers();
    } finally {
      setIsDeleting(false);
    }
  };

  return {
    suppliers,
    totalPages,
    isLoading,
    isSaving,
    isDeleting,
    error,
    refetch: fetchSuppliers,
    addSupplier,
    updateSupplier,
    deleteSupplier,
  };
}
