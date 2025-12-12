// src/features/reports/components/ReportsFilters.jsx
import React, { useRef } from "react";
import CustomAutoCompleteField from "../../../components/common/CustomAutoCompleteField";
import NumberInput from "../../../components/common/NumberInput";

const INVOICE_TYPES = [
  "اضافه",
  "صرف",
  "أمانات",
  "مرتجع",
  "توالف",
  "حجز",
  "طلب شراء",
  "تحويل",
  "الكل",
];

const STATUS_TYPES = [
  "لم تراجع",
  "لم تؤكد",
  "تم",
  "استرداد جزئي",
  "تم الاسترداد",
];

export default function ReportsFilters({
  reportType,
  onReportTypeChange,
  filters,
  errors,
  onFilterChange,
  onSearch,
  isSearching,
  loadingStates,
  options,
}) {
  const {
    employeeOptions,
    machinesOptions,
    mechanismsOptions,
    suppliersOptions,
    itemsNameOptions,
    itemsBarcodeOptions,
  } = options;

  const {
    loadingUsers,
    loadingMachines,
    loadingMechanisms,
    loadingSuppliers,
    loadingItems,
  } = loadingStates;

  const greyInputClasses =
    "bg-[#e4e4e4] h-9 text-xs md:text-[13px] text-right px-2 rounded-sm border border-transparent focus:outline-none focus:ring-1 focus:ring-[#032766]";

  const fromDateRef = useRef(null);
  const toDateRef = useRef(null);

  const handleOpenFromDate = () => {
    if (fromDateRef.current?.showPicker) {
      fromDateRef.current.showPicker();
    } else {
      fromDateRef.current?.focus();
    }
  };

  const handleOpenToDate = () => {
    if (toDateRef.current?.showPicker) {
      toDateRef.current.showPicker();
    } else {
      toDateRef.current?.focus();
    }
  };

  return (
    <div className="w-full flex justify-center items-center min-h-[70vh]">
      <div
        dir="rtl"
        className="w-[90%] md:w-[85%] lg:w-[80%] xl:w-[70%] 
               bg-white border border-gray-200 rounded-md shadow-md 
               px-4 md:px-6 py-5"
      >
        <div className="text-center mb-4">
          <h2 className="text-xl font-bold text-[#032766]">تقارير</h2>
        </div>

        <div className="flex justify-center mb-6">
          <div className="w-full max-w-xs">
            <select
              value={reportType || ""}
              onChange={(e) => onReportTypeChange(e.target.value)}
              className="w-full h-9 border border-[#032766] rounded-md bg-white text-center text-xs md:text-sm text-slate-800 focus:outline-none focus:ring-1 focus:ring-[#032766]"
            >
              <option value="">اختر نوع التقرير</option>
              <option value="فواتير">فواتير</option>
              <option value="مخازن">مخازن</option>
            </select>
          </div>
        </div>

        {reportType === "فواتير" && (
          <>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-2.5 mb-3">
              <CustomAutoCompleteField
                isLoading={loadingUsers}
                values={employeeOptions}
                editingItem={{ employee_name: filters.employee_name }}
                fieldName="employee_name"
                placeholder="اختر اسم الموظف"
                isBig
                inputClassName={greyInputClasses}
                setEditingItem={(row) =>
                  onFilterChange("employee_name", row.employee_name || "")
                }
              />

              <CustomAutoCompleteField
                values={INVOICE_TYPES}
                editingItem={{ type: filters.type }}
                fieldName="type"
                placeholder="اختر النوع"
                isBig
                inputClassName={greyInputClasses}
                setEditingItem={(row) => onFilterChange("type", row.type || "")}
              />

              <NumberInput
                value={filters.invoice_id || ""}
                onChange={(e) => onFilterChange("invoice_id", e.target.value)}
                className={greyInputClasses}
                placeholder="رقم الفاتورة"
              />

              <input
                value={filters.client_name || ""}
                onChange={(e) => onFilterChange("client_name", e.target.value)}
                className={greyInputClasses}
                placeholder="اسم العميل"
                type="text"
              />
            </div>

            <div className="grid grid-cols-1 mb-3">
              <CustomAutoCompleteField
                isLoading={loadingUsers}
                values={employeeOptions}
                editingItem={{
                  accreditation_manager: filters.accreditation_manager,
                }}
                fieldName="accreditation_manager"
                placeholder="اختر المراجع"
                isBig
                inputClassName={greyInputClasses}
                setEditingItem={(row) =>
                  onFilterChange(
                    "accreditation_manager",
                    row.accreditation_manager || ""
                  )
                }
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-2.5 mb-3">
              <CustomAutoCompleteField
                isLoading={loadingUsers}
                values={employeeOptions}
                editingItem={{
                  warehouse_manager: filters.warehouse_manager,
                }}
                fieldName="warehouse_manager"
                placeholder="اختر عامل المخزن"
                isBig
                inputClassName={greyInputClasses}
                setEditingItem={(row) =>
                  onFilterChange(
                    "warehouse_manager",
                    row.warehouse_manager || ""
                  )
                }
              />

              <CustomAutoCompleteField
                isLoading={loadingMachines}
                values={machinesOptions}
                editingItem={{ machine: filters.machine }}
                fieldName="machine"
                placeholder="اختر الماكينة"
                isBig
                inputClassName={greyInputClasses}
                setEditingItem={(row) =>
                  onFilterChange("machine", row.machine || "")
                }
              />

              <CustomAutoCompleteField
                isLoading={loadingMechanisms}
                values={mechanismsOptions}
                editingItem={{ mechanism: filters.mechanism }}
                fieldName="mechanism"
                placeholder="اختر الميكانيزم"
                isBig
                inputClassName={greyInputClasses}
                setEditingItem={(row) =>
                  onFilterChange("mechanism", row.mechanism || "")
                }
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5 mb-4">
              <CustomAutoCompleteField
                isLoading={loadingSuppliers}
                values={suppliersOptions}
                editingItem={{ supplier: filters.supplier }}
                fieldName="supplier"
                placeholder="اختر اسم المورد"
                isBig
                inputClassName={greyInputClasses}
                setEditingItem={(row) =>
                  onFilterChange("supplier", row.supplier || "")
                }
              />

              <CustomAutoCompleteField
                values={STATUS_TYPES}
                editingItem={{ status: filters.status }}
                fieldName="status"
                placeholder="اختر الحالة"
                isBig
                inputClassName={greyInputClasses}
                setEditingItem={(row) =>
                  onFilterChange("status", row.status || "")
                }
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-4">
              <div>
                <label className="block text-[11px] text-gray-700 mb-0.5">
                  من تاريخ <span className="text-red-500">*</span>
                </label>

                <div
                  className="w-full cursor-pointer"
                  onClick={handleOpenFromDate}
                >
                  <input
                    ref={fromDateRef}
                    type="date"
                    value={filters.fromDate || ""}
                    onChange={(e) => onFilterChange("fromDate", e.target.value)}
                    max={filters.toDate || undefined}
                    className={`w-full h-9 bg-white text-right text-xs px-2 rounded-md border ${
                      errors.fromDate ? "border-red-500" : "border-gray-300"
                    } focus:outline-none focus:ring-1 ${
                      errors.fromDate
                        ? "focus:ring-red-500"
                        : "focus:ring-[#032766]"
                    }`}
                  />
                </div>
              </div>

              <div>
                <label className="block text-[11px] text-gray-700 mb-0.5">
                  إلى تاريخ <span className="text-red-500">*</span>
                </label>

                <div
                  className="w-full cursor-pointer"
                  onClick={handleOpenToDate}
                >
                  <input
                    ref={toDateRef}
                    type="date"
                    value={filters.toDate || ""}
                    onChange={(e) => onFilterChange("toDate", e.target.value)}
                    min={filters.fromDate || undefined}
                    className={`w-full h-9 bg-white text-right text-xs px-2 rounded-md border ${
                      errors.toDate ? "border-red-500" : "border-gray-300"
                    } focus:outline-none focus:ring-1 ${
                      errors.toDate
                        ? "focus:ring-red-500"
                        : "focus:ring-[#032766]"
                    }`}
                  />
                </div>
              </div>
            </div>
          </>
        )}

        {reportType === "مخازن" && (
          <>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-4">
              <CustomAutoCompleteField
                isLoading={loadingItems}
                values={itemsNameOptions}
                editingItem={{ item_name: filters.item_name }}
                fieldName="item_name"
                placeholder="اختر اسم العنصر"
                isBig
                inputClassName={greyInputClasses}
                setEditingItem={(row) =>
                  onFilterChange("item_name", row.item_name || "")
                }
              />

              <CustomAutoCompleteField
                isLoading={loadingItems}
                values={itemsBarcodeOptions}
                editingItem={{ item_bar: filters.item_bar }}
                fieldName="item_bar"
                placeholder="اختر باركود العنصر"
                isBig
                inputClassName={greyInputClasses}
                setEditingItem={(row) =>
                  onFilterChange("item_bar", row.item_bar || "")
                }
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-4">
              <div>
                <label className="block text-[11px] text-gray-700 mb-0.5">
                  من تاريخ <span className="text-red-500">*</span>
                </label>

                <div
                  className="w-full cursor-pointer"
                  onClick={handleOpenFromDate}
                >
                  <input
                    ref={fromDateRef}
                    type="date"
                    value={filters.fromDate || ""}
                    onChange={(e) => onFilterChange("fromDate", e.target.value)}
                    max={filters.toDate || undefined}
                    className={`w-full h-9 bg-white text-right text-xs px-2 rounded-md border ${
                      errors.fromDate ? "border-red-500" : "border-gray-300"
                    } focus:outline-none focus:ring-1 ${
                      errors.fromDate
                        ? "focus:ring-red-500"
                        : "focus:ring-[#032766]"
                    }`}
                  />
                </div>
              </div>

              <div>
                <label className="block text-[11px] text-gray-700 mb-0.5">
                  إلى تاريخ <span className="text-red-500">*</span>
                </label>

                <div
                  className="w-full cursor-pointer"
                  onClick={handleOpenToDate}
                >
                  <input
                    ref={toDateRef}
                    type="date"
                    value={filters.toDate || ""}
                    onChange={(e) => onFilterChange("toDate", e.target.value)}
                    min={filters.fromDate || undefined}
                    className={`w-full h-9 bg-white text-right text-xs px-2 rounded-md border ${
                      errors.toDate ? "border-red-500" : "border-gray-300"
                    } focus:outline-none focus:ring-1 ${
                      errors.toDate
                        ? "focus:ring-red-500"
                        : "focus:ring-[#032766]"
                    }`}
                  />
                </div>
              </div>
            </div>
          </>
        )}

        {reportType && (
          <div className="mt-2">
            <button
              type="button"
              onClick={onSearch}
              disabled={isSearching}
              className="w-full h-11 rounded-md bg-[#f9a825] hover:bg-[#f39c12] text-white font-semibold text-sm md:text-base shadow-md transition disabled:opacity-70 disabled:cursor-not-allowed"
            >
              {isSearching ? "جاري البحث..." : "بحث"}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
