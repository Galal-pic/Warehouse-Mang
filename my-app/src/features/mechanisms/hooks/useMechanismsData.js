// src/features/mechanisms/hooks/useMechanismsData.js
import { useCallback, useEffect, useState } from "react";
import {
  getMechanisms,
  addMechanism as addMechanismApi,
  updateMechanism as updateMechanismApi,
  deleteMechanism as deleteMechanismApi,
} from "../../../api/modules/mechanismsApi";

export function useMechanismsData({ page, pageSize }) {
  const [mechanisms, setMechanisms] = useState([]);
  const [totalPages, setTotalPages] = useState(1);

  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [error, setError] = useState(null);

  const fetchMechanisms = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);

      const res = await getMechanisms({
        page,
        page_size: pageSize,
        all: false,
      });

      const data = res.data;
      setMechanisms(data.mechanisms || []);
      setTotalPages(data.total_pages || 1);
    } catch (err) {
      console.error(err);
      setError(err);
    } finally {
      setIsLoading(false);
    }
  }, [page, pageSize]);

  useEffect(() => {
    fetchMechanisms();
  }, [fetchMechanisms]);

  const addMechanism = async (payload) => {
    setIsSaving(true);
    try {
      await addMechanismApi(payload);
      await fetchMechanisms();
    } finally {
      setIsSaving(false);
    }
  };

  const updateMechanism = async (payload) => {
    setIsSaving(true);
    try {
      await updateMechanismApi(payload);
      await fetchMechanisms();
    } finally {
      setIsSaving(false);
    }
  };

  const deleteMechanism = async (id) => {
    setIsDeleting(true);
    try {
      await deleteMechanismApi(id);
      await fetchMechanisms();
    } finally {
      setIsDeleting(false);
    }
  };

  return {
    mechanisms,
    totalPages,
    isLoading,
    isSaving,
    isDeleting,
    error,
    refetch: fetchMechanisms,
    addMechanism,
    updateMechanism,
    deleteMechanism,
  };
}
