// src/features/reports/pages/ReportsFiltersPage.jsx
import React from "react";
import {
  useNavigate,
  useOutletContext,
} from "react-router-dom";
import ReportsFilters from "../components/ReportsFilters";

export default function ReportsFiltersPage() {
  const navigate = useNavigate();
  const { reports } = useOutletContext();

  const {
    reportType,
    setReportType,
    filters,
    errors,
    handleFilterChange,
    handleSearch,
    isLoadingResults,
    loadingStates,
    options,
  } = reports;

  const buildSearchParams = () => {
    const params = new URLSearchParams();

    if (reportType) {
      params.set("reportType", reportType);
    }

    Object.entries(filters).forEach(([key, value]) => {
      if (!value || value.toString().trim() === "") return;
      params.set(key, value);
    });

    return params;
  };

  const handleSearchWithNavigate = () => {
    const ok = handleSearch();
    if (!ok) return;

    const params = buildSearchParams();
    navigate(`/reports/search?${params.toString()}`);
  };

  return (
    <ReportsFilters
      reportType={reportType}
      onReportTypeChange={setReportType}
      filters={filters}
      errors={errors}
      onFilterChange={handleFilterChange}
      onSearch={handleSearchWithNavigate}
      isSearching={isLoadingResults}
      loadingStates={loadingStates}
      options={options}
    />
  );
}
