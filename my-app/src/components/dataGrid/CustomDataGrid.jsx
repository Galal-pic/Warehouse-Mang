import React from "react";
import { DataGrid } from "@mui/x-data-grid";
import Pagination from "@mui/material/Pagination";
import Stack from "@mui/material/Stack";
import ArrowBackIcon from "@mui/icons-material/ArrowBack";
import ArrowForwardIcon from "@mui/icons-material/ArrowForward";
import { PaginationItem } from "@mui/material";
const CustomPagination = ({ page, count, onChange }) => {
  const handlePageChange = (event, value) => {
    onChange({ page: value - 1 });
  };

  return (
    <Stack
      spacing={2}
      sx={{
        margin: "auto",
        direction: "rtl",
      }}
    >
      <Pagination
        count={count}
        page={page + 1}
        onChange={handlePageChange}
        renderItem={(item) => (
          <PaginationItem
            slots={{ previous: ArrowForwardIcon, next: ArrowBackIcon }}
            {...item}
          />
        )}
      />
    </Stack>
  );
};
export default function CustomDataGrid({
  rows,
  columns,
  paginationModel,
  onPageChange,
  pageCount,
  CustomToolbar,
  ...props
}) {
  // translate
  const localeText = {
    toolbarColumns: "الأعمدة",
    toolbarFilters: "التصفية",
    toolbarDensity: "الكثافة",
    toolbarExport: "تصدير",
    columnMenuSortAsc: "ترتيب تصاعدي",
    columnMenuSortDesc: "ترتيب تنازلي",
    columnMenuFilter: "تصفية",
    columnMenuHideColumn: "إخفاء العمود",
    columnMenuUnsort: "إلغاء الترتيب",
    filterPanelOperator: "الشرط",
    filterPanelValue: "القيمة",
    filterOperatorContains: "يحتوي على",
    filterOperatorEquals: "يساوي",
    filterOperatorStartsWith: "يبدأ بـ",
    filterOperatorEndsWith: "ينتهي بـ",
    filterOperatorIsEmpty: "فارغ",
    filterOperatorIsNotEmpty: "غير فارغ",
    columnMenuManageColumns: "إدارة الأعمدة",
    columnMenuShowColumns: "إظهار الأعمدة",
    toolbarDensityCompact: "مضغوط",
    toolbarDensityStandard: "عادي",
    toolbarDensityComfortable: "مريح",
    toolbarExportCSV: "تصدير إلى CSV",
    toolbarExportPrint: "طباعة",
    noRowsLabel: "لا توجد بيانات",
    noResultsOverlayLabel: "لا توجد نتائج",
    columnMenuShowHideAllColumns: "إظهار/إخفاء الكل",
    columnMenuResetColumns: "إعادة تعيين الأعمدة",
    filterOperatorDoesNotContain: "لا يحتوي على",
    filterOperatorDoesNotEqual: "لا يساوي",
    filterOperatorIsAnyOf: "أي من",
    filterPanelColumns: "الأعمدة",
    filterPanelInputPlaceholder: "أدخل القيمة",
    filterPanelInputLabel: "قيمة التصفية",
    filterOperatorIs: "هو",
    filterOperatorIsNot: "ليس",
    toolbarExportExcel: "تصدير إلى Excel",
    errorOverlayDefaultLabel: "حدث خطأ.",
    footerRowSelected: (count) => ``,
    footerTotalRows: "إجمالي الصفوف:",
    footerTotalVisibleRows: (visibleCount, totalCount) =>
      `${visibleCount} من ${totalCount}`,
    filterPanelDeleteIconLabel: "حذف",
    filterPanelAddFilter: "إضافة تصفية",
    filterPanelDeleteFilter: "حذف التصفية",
    loadingOverlay: "جارٍ التحميل...",
    columnMenuReset: "إعادة تعيين",
    footerPaginationRowsPerPage: "عدد الصفوف في الصفحة:",
    paginationLabelDisplayedRows: ({ from, to, count }) =>
      `${from} - ${to} من ${count}`,

    filterOperatorIsAny: "أي",
    filterOperatorIsTrue: "نعم",
    filterOperatorIsFalse: "لا",
    filterValueAny: "أي",
    filterValueTrue: "نعم",
    filterValueFalse: "لا",
    toolbarColumnsLabel: "إدارة الأعمدة",
    toolbarResetColumns: "إعادة تعيين",
  };

  // collors
  const primaryColor = getComputedStyle(
    document.documentElement
  ).getPropertyValue("--primary-color");

  return (
    <DataGrid
      rows={rows}
      columns={columns.map((col) => ({
        ...col,
        align: "center",
        headerAlign: "center",
        headerClassName: "custom-header",
      }))}
      localeText={localeText}
      rowHeight={62}
      editMode="row"
      onCellDoubleClick={(params, event) => event.stopPropagation()}
      slots={{
        toolbar: CustomToolbar,
        pagination: CustomPagination,
      }}
      slotProps={{
        pagination: {
          page: paginationModel.page,
          count: pageCount,
          onChange: onPageChange,
        },
      }}
      pagination
      paginationModel={paginationModel}
      onPaginationModelChange={onPageChange}
      disableVirtualization={false}
      sx={{
        "& .custom-header": {
          backgroundColor: primaryColor,
          fontWeight: "bold",
          fontSize: "1.5rem",
          color: "white",
        },
        "& .MuiDataGrid-filterIcon, & .MuiDataGrid-sortIcon, & .MuiDataGrid-menuIconButton":
          {
            color: "white",
          },
        "& .MuiDataGrid-columnHeader": {},
        "& .MuiDataGrid-toolbarContainer": {
          paddingBottom: "10px",
          display: "flex",
          justifyContent: "space-between",
          backgroundColor: "transparent",
        },
        "& .MuiDataGrid-cell": { border: "1px solid #ddd" },
        "&.MuiDataGrid-row:hover": { backgroundColor: "#f7f7f7" },
        "& .MuiDataGrid-columnSeparator": {},
        "& .MuiDataGrid-cell:focus, & .MuiDataGrid-cell:focus-within": {
          outline: "none",
        },
        "& .MuiDataGrid-virtualScroller": {
          backgroundColor: "white",
          borderRadius: "4px",
        },
        border: "none",
        margin: "0 20px",
      }}
      {...props}
    />
  );
}
