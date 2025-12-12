// src/features/machines/hooks/useMachinesData.js
import { useCallback, useEffect, useState } from "react";
import {
  getMachines,
  addMachine as addMachineApi,
  updateMachine as updateMachineApi,
  deleteMachine as deleteMachineApi,
} from "../../../api/modules/machinesApi";

export function useMachinesData({ page, pageSize }) {
  const [machines, setMachines] = useState([]);
  const [totalPages, setTotalPages] = useState(1);

  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [error, setError] = useState(null);

  const fetchMachines = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);

      const res = await getMachines({
        page,
        page_size: pageSize,
        all: false,
      });

      const data = res.data;
      setMachines(data.machines || []);
      setTotalPages(data.total_pages || 1);
    } catch (err) {
      console.error(err);
      setError(err);
    } finally {
      setIsLoading(false);
    }
  }, [page, pageSize]);

  useEffect(() => {
    fetchMachines();
  }, [fetchMachines]);

  const addMachine = async (payload) => {
    setIsSaving(true);
    try {
      await addMachineApi(payload);
      await fetchMachines();
    } finally {
      setIsSaving(false);
    }
  };

  const updateMachine = async (payload) => {
    setIsSaving(true);
    try {
      await updateMachineApi(payload);
      await fetchMachines();
    } finally {
      setIsSaving(false);
    }
  };

  const deleteMachine = async (id) => {
    setIsDeleting(true);
    try {
      await deleteMachineApi(id);
      await fetchMachines();
    } finally {
      setIsDeleting(false);
    }
  };

  return {
    machines,
    totalPages,
    isLoading,
    isSaving,
    isDeleting,
    error,
    refetch: fetchMachines,
    addMachine,
    updateMachine,
    deleteMachine,
  };
}
