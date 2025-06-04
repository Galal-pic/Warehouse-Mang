import React from "react";
import { DataGrid } from "@mui/x-data-grid";
import Pagination from "@mui/material/Pagination";
import Stack from "@mui/material/Stack";
import ArrowBackIcon from "@mui/icons-material/ArrowBack";
import ArrowForwardIcon from "@mui/icons-material/ArrowForward";
import { PaginationItem } from "@mui/material";
import CircularProgress from "@mui/material/CircularProgress";
import CustomToolbar from "../../components/customToolBar/CustomToolBar";

const CustomLoadingOverlay = () => (
  <div
    style={{
      display: "flex",
      justifyContent: "center",
      alignItems: "center",
      height: "100%",
    }}
  >
    <CircularProgress />
  </div>
);
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
  CustomToolbarFromComponent = CustomToolbar,
  setOpenDialog,
  loader,
  type,
  checkBox = false,
  setSelectedRows = null,
  addPermissions = false,
  rowSelectionModel = [],
  setRowSelectionModel = null,
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
  const secondColor = getComputedStyle(
    document.documentElement
  ).getPropertyValue("--second-color");
  let filteredAndFormattedData;
  if (type === "items") {
    filteredAndFormattedData = rows.map((item) => ({
      ...item,
      locations: item.locations.map((loc) => loc.location).join(", "),
      totalPrice: item.locations.reduce((sum, loc) => sum + loc.quantity, 0),
    }));
  }

  const handleSelectionChange = (selectedIds) => {
    if (setSelectedRows) {
      const selectedData = rows.filter((row) => selectedIds.includes(row.id));
      setSelectedRows(selectedData);
    }
  };

  const onRowSelectionModelChange = (newSelection) => {
    setRowSelectionModel(newSelection);
    handleSelectionChange(newSelection);
  };

  const [columnVisibilityModel, setColumnVisibilityModel] = React.useState({});

  return (
    <DataGrid
      rowSelectionModel={rowSelectionModel}
      onRowSelectionModelChange={
        checkBox ? onRowSelectionModelChange : undefined
      }
      rows={type === "items" ? filteredAndFormattedData : rows}
      columns={columns.map((col, index) => ({
        ...col,
        align: "center",
        headerAlign: "center",
        headerClassName:
          index === 0
            ? "custom-header first-column-header"
            : index === columns.length - 1
            ? "custom-header last-column-header"
            : "custom-header",
        checkboxSelection: checkBox && index === 0,
      }))}
      loading={loader}
      components={{
        LoadingOverlay: CustomLoadingOverlay,
        Toolbar: CustomToolbarFromComponent,
        Pagination: CustomPagination,
      }}
      localeText={localeText}
      rowHeight={50}
      editMode="row"
      onCellDoubleClick={(params, event) => event.stopPropagation()}
      slots={{
        toolbar: CustomToolbarFromComponent,
        pagination: CustomPagination,
      }}
      slotProps={{
        toolbar: {
          ...props,
          paginationModel,
          initialItems: rows,
          type,
          setOpenDialog,
          addPermissions,
          columnVisibilityModel,
        },
        pagination: {
          page: paginationModel.page,
          count: pageCount,
          onChange: onPageChange,
        },
      }}
      pagination
      paginationModel={paginationModel}
      columnVisibilityModel={columnVisibilityModel}
      onColumnVisibilityModelChange={(newModel) =>
        setColumnVisibilityModel(newModel)
      }
      disableVirtualization={false}
      getRowClassName={(params) => {
        const { page, pageSize } = paginationModel;
        const startIndex = page * pageSize;
        const endIndex = startIndex + pageSize - 1;
        const currentIndex = startIndex + params.indexRelativeToCurrentPage;
        if (rows.length === 1)
          return `${params.row.classname} first-row last-row`;
        if (currentIndex === startIndex)
          return `${params.row.classname} first-row`;
        if (currentIndex === endIndex || currentIndex === rows.length - 1)
          return `${params.row.classname} last-row`;
        return `${params.row.classname}`;
      }}
      checkboxSelection={checkBox}
      sx={{
        "& .custom-header": {
          backgroundColor: primaryColor,
          fontWeight: "bold",
          // fontSize: "1.5rem",
          color: "white",
        },
        "& .first-column-header": {
          borderTopLeftRadius: !checkBox && "20px",
          borderBottomLeftRadius: !checkBox && "20px",
        },
        "& .last-column-header": {
          borderTopRightRadius: "20px",
          borderBottomRightRadius: "20px",
        },
        '& .MuiDataGrid-columnHeaders div[role="row"]': {
          backgroundColor: "transparent",
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
          borderRadius: "20px",
        },
        "& .MuiDataGrid-cell": {
          fontSize: "0.85rem",
          border: "1px solid #ddd",
        },
        "& .zero-total-price .MuiDataGrid-cell": {
          backgroundColor: "#f88282",
        },
        "& .MuiDataGrid-columnSeparator": {},
        "& .MuiDataGrid-cell:focus, & .MuiDataGrid-cell:focus-within": {
          outline: "none",
        },
        "& .MuiDataGrid-virtualScroller": {
          borderRadius: "20px",
        },
        border: "none",
        margin: "0 20px",
        "& .zero-total-price": {
          backgroundColor: "#f88282",
          borderRadius: "20px",
        },
        "& .MuiDataGrid-row.zero-total-price:hover": {
          backgroundColor: "#f88282",
          borderRadius: "20px",
        },
        "& .MuiDataGrid-row.first-row .MuiDataGrid-cell:nth-of-type(2)": {
          borderTopLeftRadius: "20px",
        },
        "& .MuiDataGrid-row.first-row .MuiDataGrid-cell:last-of-type": {
          borderTopRightRadius: "20px",
        },
        "& .MuiDataGrid-row.last-row .MuiDataGrid-cell:nth-of-type(2)": {
          borderBottomLeftRadius: "20px",
        },
        "& .MuiDataGrid-row.last-row .MuiDataGrid-cell:last-of-type": {
          borderBottomRightRadius: "20px",
        },
        "& .MuiDataGrid-row:nth-of-type(1)": {
          borderTopRightRadius: "20px",
          borderTopLeftRadius: "20px",
        },
        "& .MuiDataGrid-row": {
          backgroundColor: "white",
        },
        "& .MuiDataGrid-row:hover": {
          backgroundColor: "#f0f0f0 !important",
          color: "#333",
        },
        "& .MuiDataGrid-row.Mui-selected": {
          backgroundColor: "#d3e8ff !important",
        },
        "& .MuiDataGrid-columnHeader[data-field='__check__']": {
          backgroundColor: primaryColor,
          borderTopLeftRadius: "20px",
          borderBottomLeftRadius: "20px",
        },
        "& .MuiDataGrid-columnHeaders": {
          backgroundColor: "transparent",
        },
        "& .MuiDataGrid-columnHeader[data-field='__check__'] .MuiCheckbox-root":
          {
            color: secondColor,
          },
        "& .MuiDataGrid-cell .MuiCheckbox-root": {
          color: secondColor,
        },
      }}
      {...props}
    />
  );
}
