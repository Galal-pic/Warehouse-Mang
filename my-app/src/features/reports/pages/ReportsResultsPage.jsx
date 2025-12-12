// src/features/reports/pages/ReportsResultsPage.jsx
import React from "react";
import {
  useNavigate,
  useOutletContext,
} from "react-router-dom";
import ReportsResults from "../components/ReportsResults";

export default function ReportsResultsPage() {
  const navigate = useNavigate();
  const {
    reports,
    onOpenInvoice,
    onOpenInvoiceDetails,
    onOpenItemDetails,
  } = useOutletContext();

  const {
    reportType,
    results,
    isLoadingResults,
    canViewPrices,
    page,
    totalPages,
    totalItems,
    handlePageChange,
  } = reports;

  const handleBackToFilters = () => {
    const params = new URLSearchParams();
    if (reportType) params.set("reportType", reportType);
    navigate(`/reports?${params.toString()}`);
  };

  return (
    <ReportsResults
      reportType={reportType}
      results={results}
      isLoading={isLoadingResults}
      canViewPrices={canViewPrices}
      page={page}
      totalPages={totalPages}
      totalItems={totalItems}
      onPageChange={handlePageChange}
      onBackToFilters={handleBackToFilters}
      onOpenInvoice={onOpenInvoice}
      onOpenInvoiceDetails={onOpenInvoiceDetails}
      onOpenItemDetails={onOpenItemDetails}
    />
  );
}
