import styles from "./Invoices.module.css";
import React, { useEffect, useState } from "react";
import {
  DataGrid,
  GridToolbarContainer,
  GridToolbarExport,
  GridToolbarQuickFilter,
} from "@mui/x-data-grid";
import {
  Button,
  PaginationItem,
  Box,
  Typography,
  Autocomplete,
  TextField,
  Table,
  TableBody,
  TableRow,
  TableCell,
  Divider,
  Checkbox,
} from "@mui/material";
import EditIcon from "@mui/icons-material/Edit";
import ClearOutlinedIcon from "@mui/icons-material/ClearOutlined";
import SaveIcon from "@mui/icons-material/Save";
import Pagination from "@mui/material/Pagination";
import Stack from "@mui/material/Stack";
import ArrowBackIcon from "@mui/icons-material/ArrowBack";
import ArrowForwardIcon from "@mui/icons-material/ArrowForward";
import LaunchIcon from "@mui/icons-material/Launch";
import logo from "./logo.png";
import AddIcon from "@mui/icons-material/Add";
import "../../colors.css";
import SnackBar from "../../components/snackBar/SnackBar";
import DeleteRow from "../../components/deleteItem/DeleteRow";
import RotateLeftIcon from "@mui/icons-material/RotateLeft";
import * as XLSX from "xlsx";

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
export default function Invoices() {
  const [invoices, setInvoices] = useState([]);
  const [selectedInvoice, setSelectedInvoice] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  // fetch warehouses
  const [initialItems, setInitialItems] = useState([]);
  const fetchWareHousesData = async () => {
    const accessToken = localStorage.getItem("access_token");
    if (!accessToken) return;
    try {
      const response = await fetch("http://127.0.0.1:5000/warehouse/", {
        method: "GET",
        headers: { Authorization: `Bearer ${accessToken}` },
      });
      const data = await response.json();
      setInitialItems(data);
    } catch (err) {
      console.error("Error fetching user data:", err);
    }
  };
  useEffect(() => {
    fetchWareHousesData();
  }, []);

  // fetch machines
  const [machines, setMachines] = useState([]);
  const fetchMachinesData = async () => {
    const accessToken = localStorage.getItem("access_token");
    if (!accessToken) return;
    try {
      const response = await fetch("http://127.0.0.1:5000/machine/", {
        method: "GET",
        headers: { Authorization: `Bearer ${accessToken}` },
      });
      const data = await response.json();
      setMachines(data);
    } catch (err) {
      console.error("Error fetching user data:", err);
    }
  };
  useEffect(() => {
    fetchMachinesData();
  }, []);

  // fetch mechanisms
  const [mechanisms, setMechanisms] = useState([]);
  const fetchMechanismsData = async () => {
    const accessToken = localStorage.getItem("access_token");
    if (!accessToken) return;
    try {
      const response = await fetch("http://127.0.0.1:5000/mechanism/", {
        method: "GET",
        headers: { Authorization: `Bearer ${accessToken}` },
      });
      const data = await response.json();

      setMechanisms(data);
    } catch (err) {
      console.error("Error fetching user data:", err);
    }
  };
  useEffect(() => {
    fetchMechanismsData();
  }, []);

  // snackbar
  const [openSnackbar, setOpenSnackbar] = useState(false);
  const [snackbarMessage, setSnackbarMessage] = useState("");
  const [snackBarType, setSnackBarType] = useState("");
  // Handle close snack
  const handleCloseSnackbar = () => {
    setOpenSnackbar(false);
  };

  // colors
  const orangeColor = getComputedStyle(
    document.documentElement
  ).getPropertyValue("--orange-color");
  const secondColor = getComputedStyle(
    document.documentElement
  ).getPropertyValue("--second-color");

  // fetch invoices
  const fetchItemsData = async () => {
    const accessToken = localStorage.getItem("access_token");
    if (!accessToken) return;
    try {
      const response = await fetch("http://127.0.0.1:5000/invoice/", {
        method: "GET",
        headers: { Authorization: `Bearer ${accessToken}` },
      });
      const data = await response.json();
      const updatedData = data
        .map((invoice) => {
          const [date, timeWithSeconds] = invoice.created_at.split(" ");

          const [hours, minutes] = timeWithSeconds.split(":");

          const hoursIn12Format = hours % 12 || 12;
          const ampm = hours >= 12 ? "PM" : "AM";
          const time = `${hoursIn12Format}:${minutes} ${ampm}`;

          return {
            ...invoice,
            date,
            time,
            items: invoice.items.map((item) => {
              const matchedItem = initialItems.find(
                (warehouseItem) => warehouseItem.item_name === item.item_name
              );
              if (matchedItem) {
                return {
                  ...item,
                  availableLocations: matchedItem.locations,
                };
              }
              return {
                ...item,
                availableLocations: [],
              };
            }),
          };
        })
        .reverse();

      setInvoices(updatedData);
    } catch (err) {
      console.error("Error fetching user data:", err);
    }
  };

  useEffect(() => {
    fetchItemsData();
  }, [initialItems]);

  // open close modal
  const openInvoice = (id) => {
    const invoice = invoices.find((item) => item.id === id);
    setSelectedInvoice(invoice);
    setIsModalOpen(true);
  };
  const closeModal = () => {
    setSelectedInvoice(null);
    setIsModalOpen(false);
    setEditingInvoice(null);
    setIsEditingInvoice(false);
  };
  useEffect(() => {
    const handleKeyDown = (event) => {
      if (event.key === "Escape" && isModalOpen) {
        closeModal();
      }
    };
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [isModalOpen]);

  // filters invoices
  const [operationTypesPurchasesType, setOperationTypesPurchasesType] =
    useState("");
  const operationTypes = ["صرف", "أمانات", "مرتجع", "توالف", "حجز"];
  const purchasesTypes = ["اضافه"];
  const operationTypesPurchasesTypes = [
    "جميع العمليات",
    ...operationTypes,
    ...purchasesTypes,
  ];
  const filteredAndFormattedData = invoices
    .filter(
      (invoice) =>
        operationTypesPurchasesType === "" ||
        operationTypesPurchasesType === "جميع العمليات" ||
        invoice.type === operationTypesPurchasesType
    )
    .map((invoice) => ({
      ...invoice,
      itemsNames: invoice.items.map((item) => item.item_name).join(", "),
    }));

  // select with checkboxes
  const [selectedRows, setSelectedRows] = useState([]);
  const handleCheckboxChange = (event, id) => {
    setSelectedRows((prev) =>
      event.target.checked
        ? [...prev, id]
        : prev.filter((rowId) => rowId !== id)
    );
  };
  const handleSelectAll = (event) => {
    if (selectedRows.length === 0) {
      setSelectedRows(filteredAndFormattedData.map((row) => row.id));
    } else {
      setSelectedRows([]);
    }
  };

  // delete selected invoices
  const handleDeleteSelectedRows = async (selectedIds) => {
    const accessToken = localStorage.getItem("access_token");

    try {
      // إرسال جميع طلبات الحذف بشكل متوازي
      await Promise.all(
        selectedIds.map(async (id) => {
          const response = await fetch(`http://127.0.0.1:5000/invoice/${id}`, {
            method: "DELETE",
            headers: { Authorization: `Bearer ${accessToken}` },
          });

          if (!response.ok) {
            throw new Error("Failed to delete invoice");
          }
        })
      );

      // تحديث البيانات بعد الحذف
      await fetchItemsData();

      // إغلاق الـ dialog وإعادة التعيين
      setDeleteDialogCheckBoxOpen(false);
      setDeleteCheckBoxConfirmationText("");

      // إظهار إشعار النجاح
      setOpenSnackbar(true);
      setSnackbarMessage("تم الحذف بنجاح");
      setSnackBarType("success");
    } catch (error) {
      console.error("Error deleting invoices:", error);
      setOpenSnackbar(true);
      setSnackbarMessage("حدث خطأ أثناء الحذف");
      setSnackBarType("error");
    }
  };
  // custom toolbar

  function CustomToolbar() {
    const handleExport = () => {
      const ws = XLSX.utils.json_to_sheet(filteredAndFormattedData);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, "Sheet1");

      XLSX.writeFile(wb, "exported_data.xlsx", {
        bookType: "xlsx",
        type: "binary",
      });
    };

    return (
      <GridToolbarContainer
        sx={{
          textAlign: "center",
        }}
      >
        {/* Add Delete Button */}
        <div>
          {selectedRows.length > 0 && (
            <Button
              variant="contained"
              color="error"
              startIcon={<ClearOutlinedIcon />}
              onClick={handleDeleteCheckBoxClick}
              sx={{
                backgroundColor: "#d32f2f",
                "&:hover": { backgroundColor: "#b71c1c" },
              }}
            >
              حذف المحدد ({selectedRows.length})
            </Button>
          )}
        </div>
        <GridToolbarQuickFilter
          sx={{
            width: "500px",
            direction: "rtl",
            "& .MuiInputBase-root": {
              padding: "8px",
              borderBottom: `2px solid ${secondColor}`,
              backgroundColor: "white",
              borderRadius: "5px",
            },
            "& .MuiSvgIcon-root": {
              color: secondColor,
              fontSize: "2rem",
            },
            "& .MuiInputBase-input": {
              color: "black",
              fontSize: "1.2rem",
              marginRight: "0.5rem",
            },
            "& .MuiInputBase-input::placeholder": {
              fontSize: "1rem",
              color: secondColor,
            },
            overflow: "hidden",
            margin: "auto",
          }}
          placeholder="ابحث هنا..."
        />
        {/* Add Export Button */}
        <Button
          onClick={handleExport}
          sx={{
            color: "white",
            backgroundColor: "#4caf50",
            marginLeft: "16px",
            "&:hover": { backgroundColor: "#388e3c" },
          }}
        >
          تصدير
        </Button>
      </GridToolbarContainer>
    );
  }

  // columns
  const columns = [
    {
      field: "actions",
      headerName: "فتح الفاتورة",
      width: 120,
      renderCell: (params) => (
        <div>
          <button
            className={styles.iconBtn}
            onClick={() => openInvoice(params.id)}
          >
            <LaunchIcon />
          </button>
          <button
            className={styles.iconBtn}
            onClick={() => handleDeleteClick(params.id)}
            style={{ color: "#d32f2f" }}
          >
            <ClearOutlinedIcon />
          </button>
          {params.row.type === "أمانات" && (
            <button
              className={styles.iconBtn}
              onClick={() => console.log(params.row)}
            >
              <RotateLeftIcon
                sx={{
                  color: secondColor,
                }}
              />
            </button>
          )}
        </div>
      ),
    },
    { flex: 1, field: "itemsNames", headerName: "أسماء العناصر" },
    { flex: 1, field: "mechanism_name", headerName: "الميكانيزم" },
    { flex: 1, field: "machine_name", headerName: "الماكينة" },
    { flex: 1, field: "employee_name", headerName: "اسم الموظف" },
    { flex: 1, field: "Warehouse_manager", headerName: "مدير المخزن" },
    { flex: 1, field: "client_name", headerName: "اسم العميل" },
    { flex: 1, field: "time", headerName: "وقت اصدار الفاتورة" },
    {
      flex: 1,
      field: "date",
      headerName: "تاريخ اصدار الفاتورة",
    },
    { flex: 1, field: "type", headerName: "نوع العملية" },
    { field: "id", headerName: "#" },
    {
      field: "select",
      headerName: "",
      renderHeader: () => (
        <Checkbox
          checked={
            selectedRows.length === filteredAndFormattedData.length &&
            filteredAndFormattedData.length > 0
          }
          indeterminate={
            selectedRows.length > 0 &&
            selectedRows.length < filteredAndFormattedData.length
          }
          onChange={handleSelectAll}
          sx={{
            color: secondColor,
            "&.Mui-checked": { color: secondColor },
            "&.Mui-indeterminate": { color: secondColor },
          }}
        />
      ),
      renderCell: (params) => (
        <Checkbox
          checked={selectedRows.includes(params.id)}
          onChange={(e) => handleCheckboxChange(e, params.id)}
          sx={{
            color: secondColor,
            "&.Mui-checked": { color: secondColor },
          }}
        />
      ),
      sortable: false,
      filterable: false,
      disableColumnMenu: true,
    },
  ];

  // local translate
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

  // pagination
  const [paginationModel, setPaginationModel] = useState({
    page: 0,
    pageSize: 10,
  });
  const pageCount = Math.ceil(invoices.length / paginationModel.pageSize);
  const handlePageChange = (newModel) => {
    setPaginationModel((prev) => ({ ...prev, ...newModel }));
  };

  // edited invoice
  const [isEditingInvoice, setIsEditingInvoice] = useState(false);
  const [editingInvoice, setEditingInvoice] = useState(null);

  const handleEditInfo = (invoice) => {
    setEditingInvoice(invoice);
    setIsEditingInvoice(true);
  };
  const handleSave = async () => {
    // Step 1: Check if there are any changes
    if (JSON.stringify(editingInvoice) === JSON.stringify(selectedInvoice)) {
      setIsEditingInvoice(false);
      setEditingInvoice(null);
      return;
    }

    // Step 2: Validate required fields
    if (!editingInvoice.machine_name || !editingInvoice.mechanism_name) {
      setSnackbarMessage("يجب ملئ اسم الماكينة واسم الميكانيزم");
      setSnackBarType("info");
      setOpenSnackbar(true);
      return;
    }

    // Step 3: Filter and validate items
    let newRows = editingInvoice.items.filter(
      (row) => row.quantity !== 0 && row.quantity !== ""
    );

    if (newRows.length === 0) {
      setSnackbarMessage("يجب ملء عنصر واحد على الأقل");
      setSnackBarType("warning");
      setOpenSnackbar(true);
      return;
    }

    // Step 4: Prepare newRows with counter
    newRows = newRows.map((row, index) => ({
      ...row,
      counter: index + 1,
      item_name: row.item_name,
      barcode: row.barcode,
      quantity: row.quantity,
      location: row.location,
      total_price: row.total_price,
      description: row.description,
    }));

    // Step 5: Update the invoice object
    const updatedInvoice = {
      ...editingInvoice,
      items: newRows,
    };

    const accessToken = localStorage.getItem("access_token");

    try {
      // Step 6: Send the update request
      const updateResponse = await fetch(
        `http://127.0.0.1:5000/invoice/${editingInvoice.id}`,
        {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${accessToken}`,
          },
          body: JSON.stringify(updatedInvoice),
        }
      );

      if (!updateResponse.ok) {
        throw new Error(`Failed to update invoice: ${updateResponse.status}`);
      }

      // Step 7: Fetch the updated invoice data
      const fetchResponse = await fetch(
        `http://127.0.0.1:5000/invoice/${editingInvoice.id}`,
        {
          method: "GET",
          headers: { Authorization: `Bearer ${accessToken}` },
        }
      );

      if (!fetchResponse.ok) {
        throw new Error(
          `Failed to fetch updated invoice: ${fetchResponse.status}`
        );
      }

      const fetchedData = await fetchResponse.json();
      const updatedInvoiceModal = {
        ...fetchedData,
        items: fetchedData.items.map((item) => ({
          ...item,
          availableLocations:
            initialItems.find(
              (warehouseItem) => warehouseItem.item_name === item.item_name
            )?.locations || [],
        })),
      };

      // Step 8: Update state with new data
      setSelectedInvoice(updatedInvoiceModal);
      setEditingInvoice(null);
      setIsEditingInvoice(false);

      // Step 9: Show success message
      setOpenSnackbar(true);
      setSnackbarMessage("تم تعديل الفاتورة");
      setSnackBarType("success");
    } catch (error) {
      console.error("Error updating invoice:", error);

      // Step 10: Show error message
      setOpenSnackbar(true);
      setSnackbarMessage("خطأ في تحديث الفاتورة");
      setSnackBarType("error");
    }
  };

  // add item
  const addRow = () => {
    const newItem = {
      name: "",
      item_bar: "",
      quantity: 0,
      price: 0,
      total_price: 0,
      description: "",
    };

    const updatedItems = [...(editingInvoice?.items || []), newItem];
    const totalAmount = updatedItems.reduce(
      (sum, item) => sum + (item.total_price || 0),
      0
    );

    setEditingInvoice({
      ...editingInvoice,
      items: updatedItems,
      total_amount: totalAmount,
    });
  };

  // handle print
  const handlePrint = () => {
    const style = document.createElement("style");
    style.innerHTML = `
        @media print {
          body * {
            visibility: hidden;
          }
          .printable-box, .printable-box * {
            visibility: visible;
          }
          .printable-box {
            position: absolute;
            left: 0;
            top: 0;
            padding: 10px !important;
            margin: 0!important;
            width: 100%;
          }
            .printable-box input,
        .printable-box textarea,
        .printable-box .MuiAutocomplete-root {
          display: none !important;
        }
        @page {
          size: auto;
          margin: 5mm;
        }
            
        }
      `;
    document.head.appendChild(style);
    window.print();
    document.head.removeChild(style);
  };

  // delete invoice dialog
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [selectedUserId, setSelectedUserId] = useState(null);
  const [deleteConfirmationText, setDeleteConfirmationText] = useState("");

  const handleDeleteClick = (id) => {
    setSelectedUserId(id);
    setDeleteDialogOpen(true);
    setDeleteConfirmationText("");
  };

  // handle delete invoice
  const handleDelete = async () => {
    if (deleteConfirmationText.trim().toLowerCase() === "نعم") {
      const accessToken = localStorage.getItem("access_token");

      try {
        const response = await fetch(
          `http://127.0.0.1:5000/invoice/${selectedUserId}`,
          {
            method: "DELETE",
            headers: {
              Authorization: `Bearer ${accessToken}`,
            },
          }
        );

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.message || "Failed to delete user");
        }
        setInvoices((prev) =>
          prev.filter((invoice) => invoice.id !== selectedUserId)
        );
        setSelectedInvoice(null);
        setOpenSnackbar(true);
        setSnackbarMessage("تم حذف الفاتورة");
        setSnackBarType("success");
        setDeleteConfirmationText("");
        setSelectedUserId(null);
        setDeleteDialogOpen(false);
        setSelectedRows([]);
      } catch (error) {
        console.error("Error deleting user:", error);
        setOpenSnackbar(true);
        setSnackbarMessage("خطأ في حذف الفاتورة");
        setSnackBarType("error");
        setDeleteConfirmationText("");
        setSelectedUserId(null);
        setDeleteDialogOpen(false);
      }
    }
  };

  // delete dialog Item
  const [deleteDialogItemOpen, setDeleteDialogItemOpen] = useState(false);
  const [selectedItemId, setSelectedItemId] = useState(0);
  const [deleteItemConfirmationText, setDeleteItemConfirmationText] =
    useState("");
  const handleDeleteItemClick = (id) => {
    if (editingInvoice.items[id].item_name === undefined) {
      setSelectedItemId(id);
      handleDeleteItem(id);
      return;
    }
    setSelectedItemId(id);
    setDeleteDialogItemOpen(true);
    setDeleteItemConfirmationText("");
  };

  // delete Item
  const handleDeleteItem = (id) => {
    const updatedItems = editingInvoice.items.filter(
      (item, index) => index !== id
    );
    const totalAmount = updatedItems.reduce(
      (sum, item) => sum + (item.total_price || 0),
      0
    );
    setEditingInvoice({
      ...editingInvoice,
      items: updatedItems,
      total_amount: totalAmount,
    });
    setDeleteItemConfirmationText("");
    setSelectedItemId(null);
    setDeleteDialogItemOpen(false);
  };

  // delete dialog Item
  const [deleteDialogCheckBoxOpen, setDeleteDialogCheckBoxOpen] =
    useState(false);
  const [deleteCheckBoxConfirmationText, setDeleteCheckBoxConfirmationText] =
    useState("");
  const handleDeleteCheckBoxClick = () => {
    if (selectedRows.length > 0) {
      setDeleteDialogCheckBoxOpen(true);
    }
  };

  return (
    <div className={styles.container}>
      <h1 className={styles.head}> العمليات</h1>
      {/* filter type invoice */}
      <Box
        sx={{
          display: "flex",
          gap: 2,
          margin: "auto",
          marginBottom: 2,
          justifyContent: "center",
          direction: "rtl",
          flexWrap: "wrap",
        }}
      >
        {operationTypesPurchasesTypes.map((type) => (
          <Button
            key={type}
            variant={
              operationTypesPurchasesType === type ||
              (type === "جميع العمليات" && operationTypesPurchasesType === "")
                ? "contained"
                : "outlined"
            }
            onClick={() => {
              setSelectedRows([]);
              setOperationTypesPurchasesType(
                type === "جميع العمليات" ? "" : type
              );
            }}
            sx={{
              fontWeight: "bold",
              fontSize: "15px",
              backgroundColor:
                operationTypesPurchasesType === type ||
                (type === "جميع العمليات" && operationTypesPurchasesType === "")
                  ? secondColor
                  : "white",
              border: `2px solid ${secondColor}`,
              color:
                operationTypesPurchasesType === type ||
                (type === "جميع العمليات" && operationTypesPurchasesType === "")
                  ? "white"
                  : secondColor,
            }}
          >
            {type}
          </Button>
        ))}
      </Box>

      {/* invoices data */}
      <DataGrid
        rows={filteredAndFormattedData}
        columns={columns.map((col) => ({
          ...col,
          align: "center",
          headerAlign: "center",
          headerClassName: styles.headerCell,
        }))}
        getRowClassName={(params) => `row-${params.row.type}`}
        localeText={localeText}
        rowHeight={62}
        editMode="row"
        onCellDoubleClick={(params, event) => {
          event.stopPropagation();
        }}
        slots={{
          toolbar: CustomToolbar,
          pagination: CustomPagination,
        }}
        slotProps={{
          pagination: {
            page: paginationModel.page,
            count: pageCount,
            onChange: handlePageChange,
          },
        }}
        pagination
        paginationModel={paginationModel}
        onPaginationModelChange={handlePageChange}
        disableVirtualization={false}
        sx={{
          "& .MuiDataGrid-filterIcon, & .MuiDataGrid-sortIcon, & .MuiDataGrid-menuIconButton":
            {
              color: "white",
            },
          "& .MuiDataGrid-toolbarContainer": {
            paddingBottom: "10px",
            display: "flex",
            justifyContent: "space-between",
            backgroundColor: "transparent",
          },
          "& .MuiDataGrid-cell": {
            border: "1px solid #ddd",
          },
          "&.MuiDataGrid-row:hover": {
            backgroundColor: "#f7f7f7",
          },
          "& .MuiDataGrid-columnSeparator": {},
          "& .MuiDataGrid-cell:focus": {
            outline: "none",
          },
          "& .MuiDataGrid-cell:focus-within": {
            outline: "none",
          },
          "& .MuiDataGrid-virtualScroller": {
            backgroundColor: "white",
            borderRadius: "4px",
          },
          "& .row-اضافه": {
            backgroundColor: "#81d4fa",
          },
          "& .row-صرف": {
            backgroundColor: "#f5deb3",
          },
          "& .row-أمانات": {
            backgroundColor: "#d2b48c",
          },
          "& .row-حجز": {
            backgroundColor: "#deb887",
          },
          "& .row-مرتجع": {
            backgroundColor: "#e3d7b5",
          },
          "& .row-توالف": {
            backgroundColor: "#c5b358",
          },
          border: "none",
          margin: "0 20px",
        }}
      />

      {/* invoice data */}
      {isModalOpen && (
        <div
          className="backdrop"
          style={{
            position: "fixed",
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: "rgba(0,0,0,0.5)",
            display: "flex",
            justifyContent: "center",
            alignItems: "center",
            zIndex: 1000,
          }}
          onClick={closeModal}
        >
          {/* Invoice Details Box */}
          <Box
            sx={{
              width: "80%",
              bgcolor: "#fff",
              boxShadow: 24,
              p: 4,
              borderRadius: 2,
              maxHeight: "75vh",
              overflowY: "auto",
              backgroundColor: "#eee",
              zIndex: 1001,
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <Typography
              id="modal-title"
              variant="h6"
              component="h2"
              sx={{
                textAlign: "center",
                fontWeight: "bold",
                fontSize: "1.2rem",
                marginBottom: "16px",
                color: "#1976d2",
                position: "relative",
              }}
            >
              تفاصيل الفاتورة
              <Divider sx={{ marginTop: 5 }} />
              {isEditingInvoice ? (
                <div>
                  <button
                    onClick={() => {
                      setIsEditingInvoice(false);
                    }}
                    className={styles.iconBtn}
                    style={{
                      color: "#d32f2f",
                      position: "absolute",
                      top: "0px",
                      left: "0px",
                    }}
                  >
                    <ClearOutlinedIcon />
                  </button>
                  <button
                    onClick={() => {
                      handleSave(editingInvoice);
                    }}
                    className={styles.iconBtn}
                    style={{
                      color: "#1976d2",
                      position: "absolute",
                      top: "0px",
                      left: "30px",
                    }}
                  >
                    <SaveIcon />
                  </button>
                </div>
              ) : (
                <button
                  onClick={() => {
                    handleEditInfo(selectedInvoice);
                  }}
                  className={styles.iconBtn}
                  style={{
                    color: "#1976d2",
                    position: "absolute",
                    top: "0px",
                    left: "0px",
                  }}
                >
                  <EditIcon />
                </button>
              )}
            </Typography>
            <div className="printable-box">
              {isModalOpen && (
                <>
                  {/* header part */}
                  <Box className={styles.headerSection}>
                    <Box className={styles.logoBox}>
                      <img src={logo} alt="Logo" className={styles.logoImage} />
                    </Box>
                    <Box className={styles.operationTypeBox}>
                      <Box className={styles.operationTypeText}>
                        نوع العملية
                      </Box>
                      <Box className={styles.operationTypeName}>
                        {isEditingInvoice ? (
                          <select
                            value={editingInvoice.type}
                            onChange={(e) => {
                              if (operationTypes.includes(e.target.value)) {
                                editingInvoice.items.map((row) => {
                                  const targetRows =
                                    row.availableLocations.find(
                                      (location) =>
                                        location.location === row.location
                                    );
                                  if (
                                    targetRows &&
                                    row.quantity > targetRows.quantity
                                  ) {
                                    row.quantity = 0;
                                  }
                                  return row;
                                });
                              }

                              setEditingInvoice({
                                ...editingInvoice,
                                type: e.target.value,
                              });
                            }}
                            style={{
                              border: "1px solid #ddd",
                              width: "170px",
                              padding: "5px",
                              borderRadius: "4px",
                              outline: "none",
                              fontSize: "15px",
                              textAlign: "center",
                            }}
                          >
                            {[...operationTypes, ...purchasesTypes].map(
                              (type) => (
                                <option key={type} value={type}>
                                  {type}
                                </option>
                              )
                            )}
                          </select>
                        ) : (
                          selectedInvoice.type
                        )}
                      </Box>
                    </Box>
                    <Box className={styles.infoBox}>
                      <Box className={styles.infoItem}>
                        <Box className={styles.infoLabel}>رقم السند:</Box>
                        <Box className={styles.infoValue}>
                          {selectedInvoice.id}
                        </Box>
                      </Box>
                      <Box className={styles.infoItem}>
                        <Box className={styles.infoLabel}>التاريخ</Box>
                        <Box className={styles.infoValue}>
                          {selectedInvoice.date}
                        </Box>
                      </Box>
                      <Box className={styles.infoItem}>
                        <Box className={styles.infoLabel}>الوقت</Box>
                        <Box className={styles.infoValue}>
                          {selectedInvoice.time}
                        </Box>
                      </Box>
                    </Box>
                  </Box>

                  {/* table Manager */}
                  <Box
                    className={styles.tableSection}
                    sx={{ direction: "rtl" }}
                  >
                    <Table
                      className={styles.customTable}
                      sx={{
                        "& .MuiTableCell-root": {
                          border: "1px solid #b2b0b0",
                          padding: "12px",
                          textAlign: "center",
                        },
                      }}
                    >
                      <TableBody>
                        <TableRow className={styles.tableRow}>
                          <TableCell className={styles.tableCell} colSpan={2}>
                            اسم الماكينة
                          </TableCell>
                          <TableCell
                            className={styles.tableInputCell}
                            colSpan={6}
                            sx={{
                              padding: "0px !important",
                            }}
                          >
                            {isEditingInvoice ? (
                              <Autocomplete
                                slotProps={{
                                  paper: {
                                    sx: {
                                      "& .MuiAutocomplete-listbox": {
                                        "& .MuiAutocomplete-option": {
                                          direction: "rtl",
                                        },
                                      },
                                    },
                                  },
                                }}
                                value={
                                  machines.find(
                                    (item) =>
                                      item.name === editingInvoice.machine_name
                                  ) || null
                                }
                                sx={{
                                  "& .MuiOutlinedInput-root .MuiOutlinedInput-notchedOutline":
                                    {
                                      border: "none",
                                    },
                                  "& .MuiAutocomplete-clearIndicator": {
                                    display: "none",
                                  },
                                  "& .MuiAutocomplete-popupIndicator": {},
                                  "& .MuiOutlinedInput-root": {
                                    padding: "10px",
                                    paddingRight: "35px!important",

                                    fontSize: "14px",
                                  },
                                }}
                                options={machines}
                                getOptionLabel={(option) => option.name}
                                onChange={(event, newValue) =>
                                  setEditingInvoice({
                                    ...editingInvoice,
                                    machine_name: newValue ? newValue.name : "",
                                  })
                                }
                                renderInput={(params) => (
                                  <TextField
                                    {...params}
                                    placeholder="اسم الماكينة"
                                  />
                                )}
                              />
                            ) : (
                              selectedInvoice.machine_name
                            )}
                          </TableCell>
                        </TableRow>
                        <TableRow className={styles.tableRow}>
                          <TableCell className={styles.tableCell} colSpan={2}>
                            اسم الميكانيزم
                          </TableCell>
                          <TableCell
                            className={styles.tableInputCell}
                            colSpan={6}
                            sx={{
                              padding: "0px !important",
                            }}
                          >
                            {isEditingInvoice ? (
                              <Autocomplete
                                slotProps={{
                                  paper: {
                                    sx: {
                                      "& .MuiAutocomplete-listbox": {
                                        "& .MuiAutocomplete-option": {
                                          direction: "rtl",
                                        },
                                      },
                                    },
                                  },
                                }}
                                value={
                                  mechanisms.find(
                                    (item) =>
                                      item.name ===
                                      editingInvoice.mechanism_name
                                  ) || null
                                }
                                sx={{
                                  "& .MuiOutlinedInput-root .MuiOutlinedInput-notchedOutline":
                                    {
                                      border: "none",
                                    },
                                  "& .MuiAutocomplete-clearIndicator": {
                                    display: "none",
                                  },
                                  "& .MuiAutocomplete-popupIndicator": {},
                                  "& .MuiOutlinedInput-root": {
                                    padding: "10px",
                                    paddingRight: "35px!important",

                                    fontSize: "14px",
                                  },
                                }}
                                options={mechanisms}
                                getOptionLabel={(option) => option.name}
                                onChange={(event, newValue) =>
                                  setEditingInvoice({
                                    ...editingInvoice,
                                    mechanism_name: newValue
                                      ? newValue.name
                                      : "",
                                  })
                                }
                                renderInput={(params) => (
                                  <TextField
                                    {...params}
                                    placeholder="اسم الماكينة"
                                  />
                                )}
                              />
                            ) : (
                              selectedInvoice.mechanism_name
                            )}
                          </TableCell>
                        </TableRow>
                        <TableRow>
                          <TableCell className={styles.tableCell}>
                            <AddIcon
                              onClick={addRow}
                              className={styles.addIcon}
                              sx={{
                                cursor: isEditingInvoice
                                  ? "pointer"
                                  : "context-menu",
                              }}
                            />
                          </TableCell>
                          <TableCell className={styles.tableCell}>
                            اسم الصنف
                          </TableCell>
                          <TableCell className={styles.tableCell}>
                            الرمز
                          </TableCell>
                          <TableCell className={styles.tableCell}>
                            الموقع
                          </TableCell>
                          <TableCell className={styles.tableCell}>
                            الكمية
                          </TableCell>
                          {(isEditingInvoice
                            ? editingInvoice.type
                            : selectedInvoice.type) &&
                            !operationTypes.includes(
                              isEditingInvoice
                                ? editingInvoice.type
                                : selectedInvoice.type
                            ) && (
                              <>
                                {/* <TableCell className={styles.tableCell}>
                                  السعر
                                </TableCell> */}
                                <TableCell className={styles.tableCell}>
                                  إجمالي السعر
                                </TableCell>
                              </>
                            )}

                          <TableCell className={styles.tableCell}>
                            بيان
                          </TableCell>
                        </TableRow>

                        {(isEditingInvoice
                          ? editingInvoice.items
                          : selectedInvoice.items
                        ).map((row, index) => (
                          <TableRow key={index}>
                            <TableCell
                              sx={{
                                position: "relative",
                                width: "10px !important",
                              }}
                              className={styles.tableCellRow}
                            >
                              {index + 1}
                              {isEditingInvoice && (
                                <button
                                  onClick={() => handleDeleteItemClick(index)}
                                  className={styles.clearIcon}
                                >
                                  <ClearOutlinedIcon fontSize="small" />
                                </button>
                              )}
                            </TableCell>
                            <TableCell
                              className={styles.tableCellRow}
                              sx={{
                                "&.MuiTableCell-root": {
                                  padding: "0px",
                                  maxWidth: "200px",
                                  whiteSpace: "normal",
                                  wordBreak: "break-word",
                                },
                              }}
                            >
                              {isEditingInvoice ? (
                                <Autocomplete
                                  slotProps={{
                                    input: {
                                      sx: {
                                        whiteSpace: "normal",
                                        wordBreak: "break-word",
                                      },
                                    },
                                    paper: {
                                      sx: {
                                        "& .MuiAutocomplete-listbox": {
                                          "& .MuiAutocomplete-option": {
                                            direction: "rtl",
                                          },
                                        },
                                      },
                                    },
                                  }}
                                  value={
                                    initialItems.find(
                                      (item) =>
                                        item.item_name ===
                                        (editingInvoice.items[index]
                                          ?.item_name || "")
                                    ) || null
                                  }
                                  sx={{
                                    "& .MuiAutocomplete-clearIndicator": {
                                      display: "none",
                                    },
                                    "& .MuiAutocomplete-popupIndicator": {},
                                    "& .MuiOutlinedInput-root": {
                                      padding: "10px",
                                      paddingRight: "35px!important",
                                      fontSize: "14px",
                                    },
                                    "& .MuiOutlinedInput-root .MuiOutlinedInput-notchedOutline":
                                      {
                                        border: "none",
                                      },
                                    minWidth: "150px",
                                  }}
                                  options={initialItems}
                                  getOptionLabel={(option) => option.item_name}
                                  onChange={(e, newValue) => {
                                    const updatedItems = [
                                      ...editingInvoice.items,
                                    ];
                                    updatedItems[index] = {
                                      ...updatedItems[index],
                                      item_name: newValue?.item_name || "",
                                      barcode: newValue?.item_bar || "",
                                      location: "",
                                      availableLocations:
                                        newValue?.locations || [],
                                    };
                                    setEditingInvoice({
                                      ...editingInvoice,
                                      items: updatedItems,
                                    });
                                  }}
                                  renderInput={(params) => (
                                    <TextField
                                      {...params}
                                      placeholder="اسم العنصر"
                                    />
                                  )}
                                />
                              ) : (
                                row.item_name
                              )}
                            </TableCell>
                            <TableCell className={styles.tableCellRow}>
                              {row.barcode}
                            </TableCell>
                            <TableCell
                              className={styles.tableCellRow}
                              sx={{
                                "&.MuiTableCell-root": {
                                  padding: "0px",
                                  maxWidth: "200px",
                                  whiteSpace: "normal",
                                  wordBreak: "break-word",
                                },
                              }}
                            >
                              {isEditingInvoice ? (
                                <Autocomplete
                                  slotProps={{
                                    input: {
                                      sx: {
                                        whiteSpace: "normal",
                                        wordBreak: "break-word",
                                      },
                                    },
                                    paper: {
                                      sx: {
                                        "& .MuiAutocomplete-listbox": {
                                          "& .MuiAutocomplete-option": {
                                            direction: "rtl",
                                          },
                                        },
                                      },
                                    },
                                  }}
                                  value={
                                    editingInvoice.items[
                                      index
                                    ]?.availableLocations?.find(
                                      (loc) =>
                                        loc.location ===
                                        editingInvoice.items[index]?.location
                                    ) || null
                                  }
                                  sx={{
                                    "& .MuiAutocomplete-clearIndicator": {
                                      display: "none",
                                    },
                                    "& .MuiAutocomplete-popupIndicator": {},
                                    "& .MuiOutlinedInput-root": {
                                      padding: "10px",
                                      paddingRight: "35px!important",
                                      fontSize: "14px",
                                    },
                                    "& .MuiOutlinedInput-root .MuiOutlinedInput-notchedOutline":
                                      {
                                        border: "none",
                                      },
                                    minWidth: "150px",
                                  }}
                                  options={
                                    editingInvoice.items[index]
                                      ?.availableLocations || []
                                  }
                                  getOptionLabel={(option) =>
                                    option.location || ""
                                  }
                                  onChange={(e, newValue) => {
                                    const matchedItem =
                                      editingInvoice.items.find(
                                        (row11) =>
                                          row11.barcode === row.barcode &&
                                          row11.location === newValue.location
                                      );
                                    if (matchedItem) {
                                      setSnackbarMessage(
                                        "هذا العنصر موجود بالفعل"
                                      );
                                      setSnackBarType("info");
                                      setOpenSnackbar(true);
                                      return;
                                    }
                                    const updatedItems = [
                                      ...editingInvoice.items,
                                    ];
                                    updatedItems[index] = {
                                      ...updatedItems[index],
                                      location: newValue?.location || "",
                                    };
                                    setEditingInvoice({
                                      ...editingInvoice,
                                      items: updatedItems,
                                    });
                                  }}
                                  renderInput={(params) => (
                                    <TextField
                                      {...params}
                                      placeholder="الموقع"
                                    />
                                  )}
                                />
                              ) : (
                                row.location
                              )}
                            </TableCell>
                            <TableCell
                              className={styles.tableCellRow}
                              sx={{
                                width: "50px",
                              }}
                            >
                              {isEditingInvoice ? (
                                <input
                                  style={{
                                    width: "100px",
                                    outline: "none",
                                    fontSize: "15px",
                                    textAlign: "center",
                                    border: "none",
                                    padding: "10px",
                                  }}
                                  type="number"
                                  min="0"
                                  max={
                                    operationTypes.includes(editingInvoice.type)
                                      ? row.availableLocations?.find(
                                          (loc) => loc.location === row.location
                                        )?.quantity +
                                          (selectedInvoice?.items[index]
                                            ?.quantity || 0) || 0
                                      : undefined
                                  }
                                  value={
                                    editingInvoice.items[index]?.quantity ||
                                    row.quantity
                                  }
                                  onInput={(e) => {
                                    const maxQuantity =
                                      row.availableLocations?.find(
                                        (loc) => loc.location === row.location
                                      )?.quantity +
                                        (selectedInvoice?.items[index]
                                          ?.quantity || 0) || 0;

                                    if (e.target.value < 0) {
                                      e.target.value = 0;
                                    }

                                    if (
                                      operationTypes.includes(
                                        editingInvoice.type
                                      ) &
                                      (e.target.value > maxQuantity)
                                    ) {
                                      e.target.value = maxQuantity;
                                    }
                                  }}
                                  onClick={(event) => {
                                    if (
                                      row.location === undefined ||
                                      row.location === ""
                                    ) {
                                      setSnackbarMessage(
                                        "يجب تحديد موقع العنصر اولا"
                                      );
                                      setSnackBarType("info");
                                      setOpenSnackbar(true);
                                      event.target.blur();

                                      return;
                                    }
                                  }}
                                  onDoubleClick={(event) => {
                                    if (
                                      row.location === undefined ||
                                      row.location === ""
                                    ) {
                                      setSnackbarMessage(
                                        "يجب تحديد موقع العنصر اولا"
                                      );
                                      setSnackBarType("info");
                                      setOpenSnackbar(true);
                                      event.target.blur();

                                      return;
                                    }
                                  }}
                                  onChange={(e) => {
                                    const newQuantity = Math.max(
                                      0,
                                      Number(e.target.value)
                                    );
                                    const updatedItems = [
                                      ...editingInvoice.items,
                                    ];
                                    updatedItems[index] = {
                                      ...row,
                                      quantity: newQuantity,
                                      total_price:
                                        newQuantity *
                                        (row.availableLocations?.[index]
                                          ?.price_unit || 0),
                                    };

                                    const totalAmount = updatedItems.reduce(
                                      (sum, item) =>
                                        sum + (item.total_price || 0),
                                      0
                                    );

                                    setEditingInvoice({
                                      ...editingInvoice,
                                      items: updatedItems,
                                      total_amount: totalAmount,
                                    });
                                  }}
                                />
                              ) : (
                                row.quantity
                              )}
                            </TableCell>
                            {!operationTypes.includes(
                              isEditingInvoice
                                ? editingInvoice.type
                                : selectedInvoice.type
                            ) && (
                              <>
                                {/* <TableCell className={styles.tableCellRow}>
                                  {isEditingInvoice ? (
                                    <input
                                      style={{
                                        width: "100%",
                                        outline: "none",
                                        fontSize: "15px",
                                        textAlign: "right",
                                        border: "none",
                                        padding: "10px",
                                      }}
                                      type="number"
                                      min="0"
                                      value={
                                        editingInvoice.items[index]?.price ||
                                        row.price
                                      }
                                      onInput={(e) => {
                                        if (e.target.value < 0) {
                                          e.target.value = 0;
                                        }
                                      }}
                                      onChange={(e) => {
                                        const newPrice = Math.max(
                                          0,
                                          Number(e.target.value)
                                        );
                                        const updatedItems = [
                                          ...editingInvoice.items,
                                        ];
                                        updatedItems[index] = {
                                          ...row,
                                          price: newPrice,
                                          total_price:
                                            (row.quantity || 0) * newPrice,
                                        };

                                        const totalAmount = updatedItems.reduce(
                                          (sum, item) =>
                                            sum + (item.total_price || 0),
                                          0
                                        );

                                        setEditingInvoice({
                                          ...editingInvoice,
                                          items: updatedItems,
                                          total_amount: totalAmount,
                                        });
                                      }}
                                    />
                                  ) : (
                                    row.price
                                  )}
                                </TableCell> */}
                                <TableCell className={styles.tableCellRow}>
                                  {isEditingInvoice
                                    ? editingInvoice.items[index]?.total_price
                                    : row.total_price}
                                </TableCell>
                              </>
                            )}
                            <TableCell
                              className={styles.tableCellRow}
                              sx={{
                                maxWidth: "200px",
                                whiteSpace: "normal",
                                wordWrap: "break-word",
                              }}
                            >
                              {isEditingInvoice ? (
                                <textarea
                                  style={{
                                    width: "100%",
                                    outline: "none",
                                    fontSize: "15px",
                                    textAlign: "right",
                                    border: "none",
                                    padding: "10px",
                                    whiteSpace: "normal",
                                    wordWrap: "break-word",
                                    resize: "none",
                                  }}
                                  value={
                                    editingInvoice.items[index]?.description ||
                                    row.description
                                  }
                                  onChange={(e) => {
                                    const updatedItems = [
                                      ...editingInvoice.items,
                                    ];
                                    updatedItems[index] = {
                                      ...row,
                                      description: e.target.value,
                                    };
                                    setEditingInvoice({
                                      ...editingInvoice,
                                      items: updatedItems,
                                    });
                                  }}
                                />
                              ) : (
                                row.description
                              )}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </Box>
                  {/* total amount */}
                  {!operationTypes.includes(
                    isEditingInvoice
                      ? editingInvoice.type
                      : selectedInvoice.type
                  ) && (
                    <Box className={styles.totalAmountSection}>
                      <Box className={styles.totalAmountBox}>
                        <Box className={styles.totalAmountLabel}>الإجمالي:</Box>
                        <Box className={styles.totalAmountValue}>
                          {isEditingInvoice
                            ? editingInvoice?.total_amount
                            : selectedInvoice.total_amount}
                        </Box>
                      </Box>
                    </Box>
                  )}
                  {/* comment
                  <Box className={styles.commentFieldBox}>
                    {isEditingInvoice ? (
                      <input
                        style={{
                          width: "100%",
                          outline: "none",
                          fontSize: "15px",
                          textAlign: "center",
                          border: "none",
                          padding: "10px",
                        }}
                        type="text"
                        value={editingInvoice.comment}
                        onChange={(e) =>
                          setEditingInvoice({
                            ...editingInvoice,
                            comment: e.target.value,
                          })
                        }
                      />
                    ) : (
                      selectedInvoice.comment
                    )}
                  </Box>
                  note
                  {selectedInvoice.note === "" ? (
                    ""
                  ) : (
                    <Box className={styles.commentFieldBox}>
                      {isEditingInvoice ? (
                        <input
                          style={{
                            width: "100%",
                            outline: "none",
                            fontSize: "15px",
                            textAlign: "center",
                            border: "none",
                            padding: "10px",
                            backgroundColor: "#eee",
                          }}
                          type="text"
                          value={editingInvoice.note}
                          readOnly
                          onChange={(e) =>
                            setEditingInvoice({
                              ...editingInvoice,
                              note: e.target.value,
                            })
                          }
                        />
                      ) : (
                        selectedInvoice.note
                      )}
                    </Box>
                  )} */}

                  {/* info */}
                  <Box className={styles.infoSection}>
                    <Box className={styles.infoItemBox}>
                      <Box className={styles.infoLabel}>اسم الموظف</Box>
                      <Box className={styles.infoValue}>
                        {isEditingInvoice ? (
                          <input
                            style={{
                              width: "70%",
                              margin: "auto",
                              outline: "none",
                              fontSize: "15px",
                              textAlign: "center",
                              border: "none",
                              padding: "10px",
                            }}
                            type="text"
                            value={editingInvoice.employee_name}
                            onChange={(e) =>
                              setEditingInvoice({
                                ...editingInvoice,
                                employee_name: e.target.value,
                              })
                            }
                          />
                        ) : (
                          selectedInvoice.employee_name
                        )}
                      </Box>
                    </Box>
                    <Box className={styles.infoItemBox}>
                      <Box className={styles.infoLabel}>اسم المستلم</Box>
                      {isEditingInvoice ? (
                        <input
                          style={{
                            width: "70%",
                            margin: "auto",
                            outline: "none",
                            fontSize: "15px",
                            textAlign: "center",
                            border: "none",
                            padding: "10px",
                          }}
                          type="text"
                          value={editingInvoice.client_name}
                          onChange={(e) =>
                            setEditingInvoice({
                              ...editingInvoice,
                              client_name: e.target.value,
                            })
                          }
                        />
                      ) : (
                        selectedInvoice.client_name
                      )}
                    </Box>
                    <Box className={styles.infoItemBox}>
                      <Box className={styles.infoLabel}>مدير المخازن </Box>
                      {isEditingInvoice ? (
                        <input
                          style={{
                            width: "70%",
                            margin: "auto",
                            outline: "none",
                            fontSize: "15px",
                            textAlign: "center",
                            border: "none",
                            padding: "10px",
                          }}
                          type="text"
                          value={editingInvoice.Warehouse_manager || ""}
                          onChange={(e) =>
                            setEditingInvoice({
                              ...editingInvoice,
                              Warehouse_manager: e.target.value,
                            })
                          }
                        />
                      ) : (
                        selectedInvoice.Warehouse_manager
                      )}
                    </Box>
                  </Box>
                </>
              )}
            </div>
            <Divider sx={{ marginTop: 5 }} />

            <Box
              sx={{
                mt: 3,
                textAlign: "center",
                display: "flex",
                justifyContent: "space-around",
              }}
            >
              {!isEditingInvoice && (
                <Button
                  onClick={handlePrint}
                  variant="contained"
                  color="info"
                  sx={{
                    borderRadius: "20px",
                    padding: "8px 20px",
                    backgroundColor: "#00bcd4",
                  }}
                >
                  طباعة
                </Button>
              )}

              <Button
                onClick={closeModal}
                variant="contained"
                color="primary"
                sx={{
                  borderRadius: "20px",
                  padding: "8px 20px",
                }}
              >
                إغلاق
              </Button>
            </Box>
          </Box>
        </div>
      )}

      {/* delete invoice dialog */}
      <DeleteRow
        deleteDialogOpen={deleteDialogOpen}
        setDeleteDialogOpen={setDeleteDialogOpen}
        deleteConfirmationText={deleteConfirmationText}
        setDeleteConfirmationText={setDeleteConfirmationText}
        handleDelete={handleDelete}
        message={"هل أنت متأكد من رغبتك في حذف هذه العملية؟"}
      />

      {/* delete item dialog */}
      <DeleteRow
        deleteDialogOpen={deleteDialogItemOpen}
        setDeleteDialogOpen={setDeleteDialogItemOpen}
        deleteConfirmationText={deleteItemConfirmationText}
        setDeleteConfirmationText={setDeleteItemConfirmationText}
        handleDelete={() => handleDeleteItem(selectedItemId)}
        message={"هل أنت متأكد من رغبتك في حذف هذا العنصر؟"}
        isNessary={false}
      />

      {/* delete set of invoices dialog */}
      <DeleteRow
        deleteDialogOpen={deleteDialogCheckBoxOpen}
        setDeleteDialogOpen={setDeleteDialogCheckBoxOpen}
        deleteConfirmationText={deleteCheckBoxConfirmationText}
        setDeleteConfirmationText={setDeleteCheckBoxConfirmationText}
        handleDelete={() => {
          handleDeleteSelectedRows(selectedRows);
          setSelectedRows([]);
        }}
        message={"هل أنت متأكد من رغبتك في حذف العناصر المحددة؟"}
      />

      {/* Snackbar */}
      <SnackBar
        open={openSnackbar}
        message={snackbarMessage}
        type={snackBarType}
        onClose={handleCloseSnackbar}
      />
    </div>
  );
}
