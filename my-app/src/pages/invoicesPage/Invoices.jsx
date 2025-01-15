import styles from "./Invoices.module.css";
import React, { useEffect, useState } from "react";
import {
  DataGrid,
  GridToolbarContainer,
  GridToolbarQuickFilter,
} from "@mui/x-data-grid";
import {
  Button,
  PaginationItem,
  Box,
  Modal,
  Typography,
  Autocomplete,
  TextField,
  Table,
  TableBody,
  TableRow,
  TableCell,
  Divider,
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

  // collors
  const primaryColor = getComputedStyle(
    document.documentElement
  ).getPropertyValue("--primary-color");

  // custom toolbar
  function CustomToolbar() {
    return (
      <GridToolbarContainer>
        <GridToolbarQuickFilter
          sx={{
            direction: "rtl",
            width: "35%",
            "& .MuiInputBase-root": {
              borderRadius: "8px",
              border: `2px solid ${primaryColor}`,
              padding: "8px 16px",
              boxShadow: "none",
            },
            "& .MuiInputBase-root:hover": {
              outline: "none",
            },
            "& .MuiSvgIcon-root": {
              color: `${primaryColor}`,
              fontSize: "1.5rem",
              marginLeft: "8px",
            },
            overflow: "hidden",
            margin: "auto",
          }}
          placeholder="ابحث هنا..."
        />
      </GridToolbarContainer>
    );
  }

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
      const updatedData = data.map((invoice) => ({
        ...invoice,
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
      }));

      setInvoices(updatedData);
    } catch (err) {
      console.error("Error fetching user data:", err);
    }
  };
  useEffect(() => {
    fetchItemsData();
  }, [initialItems]);

  // open edit modal
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

  // filters invoices
  const [operationType, setOperationType] = useState("");
  const operationTypes = ["جميع العمليات", "اضافه", "صرف", "امانات", "مرتجع"];
  const filteredAndFormattedData = invoices
    .filter(
      (invoice) =>
        operationType === "" ||
        operationType === "جميع العمليات" ||
        invoice.type === operationType
    )
    .map((invoice) => ({
      ...invoice,
      itemsNames: invoice.items.map((item) => item.item_name).join(", "),
    }));

  // columns
  const columns = [
    {
      field: "actions",
      headerName: "فتح الفاتورة",
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
            onClick={() => handleDelete(params.id)}
            style={{ color: "#d32f2f" }}
          >
            <ClearOutlinedIcon />
          </button>
        </div>
      ),
    },
    { flex: 1, field: "itemsNames", headerName: "أسماء العناصر" },
    { flex: 1, field: "mechanism_name", headerName: "الميكانيزم" },
    { flex: 1, field: "machine_name", headerName: "الماكينة" },
    { flex: 1, field: "employee_name", headerName: "اسم الموظف" },
    { flex: 1, field: "Warehouse_manager", headerName: "مدير المخزن" },
    { flex: 1, field: "client_name", headerName: "اسم العميل" },
    // { flex: 1, field: "time", headerName: "وقت اصدار الفاتورة" },
    // {
    //   flex: 1,
    //   field: "date",
    //   headerName: "تاريخ اصدار الفاتورة",
    // },
    { flex: 1, field: "type", headerName: "نوع العملية" },
    { field: "id", headerName: "#" },
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

  // edited delete invoice
  const [isEditingInvoice, setIsEditingInvoice] = useState(false);
  const [editingInvoice, setEditingInvoice] = useState(null);

  const handleEditInfo = (invoice) => {
    setEditingInvoice(invoice);
    setIsEditingInvoice(true);
  };
  const handleSave = async () => {
    // const currentDate = new Date().toLocaleDateString();
    const updatedItems = editingInvoice.items.map((item) => {
      const quantity = parseFloat(item.quantity || 0);

      if (editingInvoice.type !== "اضافه") {
        return {
          ...item,
          quantity: quantity,
        };
      }
      const price = parseFloat(item.price || 0);
      return {
        ...item,
        quantity: quantity,
        price: price,
        total_price: quantity * price,
      };
    });

    const updatedInvoice = {
      ...editingInvoice,
      items: updatedItems,
      // note: `تم تعديل هذه الفاتورة بتاريخ ${currentDate}`,
    };
    // console.log(updatedInvoice);

    const accessToken = localStorage.getItem("access_token");

    try {
      const response = await fetch(
        `http://127.0.0.1:5000/invoice/${updatedInvoice.id}`,
        {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${accessToken}`,
          },
          body: JSON.stringify(updatedInvoice),
        }
      );

      if (!response.ok) {
        throw new Error(`Failed to update user: ${response.status}`);
      }
      await fetchItemsData();
      const fetchInvoiceData = async () => {
        try {
          const response = await fetch(
            `http://127.0.0.1:5000/invoice/${updatedInvoice.id}`,
            {
              method: "GET",
              headers: { Authorization: `Bearer ${accessToken}` },
            }
          );
          const data = await response.json();

          const updatedInvoiceModal = {
            ...data,
            items: data.items.map((item) => ({
              ...item,
              availableLocations:
                initialItems.find(
                  (warehouseItem) => warehouseItem.item_name === item.item_name
                )?.locations || [],
            })),
          };

          setSelectedInvoice(updatedInvoiceModal);
        } catch (err) {
          console.error("Error fetching updated invoice:", err);
        }
      };

      await fetchInvoiceData();
      setEditingInvoice(null);
      setIsEditingInvoice(false);

      setOpenSnackbar(true);
      setSnackbarMessage("تم تعديل الفاتورة");
      setSnackBarType("success");
    } catch (error) {
      console.error("Error updating user:", error);
      setOpenSnackbar(true);
      setSnackbarMessage("خطأ في تحديث الفاتورة");
      setSnackBarType("error");
    }
  };
  const handleDelete = async (id) => {
    const isConfirmed = window.confirm(
      "Are you sure you want to delete this user?"
    );
    if (!isConfirmed) return;
    const accessToken = localStorage.getItem("access_token");

    try {
      const response = await fetch(`http://127.0.0.1:5000/invoice/${id}`, {
        method: "DELETE",
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || "Failed to delete user");
      }
      setInvoices((prev) => prev.filter((invoice) => invoice.id !== id));
      setSelectedInvoice(null);
      setOpenSnackbar(true);
      setSnackbarMessage("تم حذف الفاتورة");
      setSnackBarType("success");
    } catch (error) {
      console.error("Error deleting user:", error);
      setOpenSnackbar(true);
      setSnackbarMessage("خطأ في حذف الفاتورة");
      setSnackBarType("error");
    }
  };
  const handleDeleteItem = (id, itemIndex) => {
    setInvoices((prevInvoices) => {
      const updatedInvoices = prevInvoices.map((invoice) => {
        if (invoice.id === id) {
          const updatedItems = invoice.items.filter(
            (_, index) => index !== itemIndex
          );

          const updatedItemsWithTotal = updatedItems.map((item) => {
            const quantity = parseFloat(item.quantity || 0);
            const price = parseFloat(item.price || 0);
            return {
              ...item,
              total_price: quantity * price,
            };
          });

          const newTotalAmount = updatedItemsWithTotal.reduce(
            (sum, item) => sum + item.total_price,
            0
          );

          return {
            ...invoice,
            items: updatedItemsWithTotal,
            total_amount: newTotalAmount,
          };
        }
        return invoice;
      });

      const updatedSelectedInvoice = updatedInvoices.find(
        (invoice) => invoice.id === id
      );

      setSelectedInvoice(updatedSelectedInvoice);

      // console.log("Updated selectedInvoice:", updatedSelectedInvoice);

      if (editingInvoice) {
        const updatedEditingItems = editingInvoice.items.filter(
          (_, index) => index !== itemIndex
        );

        const updatedEditingItemsWithTotal = updatedEditingItems.map((item) => {
          const quantity = parseFloat(item.quantity || 0);
          const price = parseFloat(item.price || 0);
          return {
            ...item,
            total_price: quantity * price,
          };
        });

        const newEditingTotalAmount = updatedEditingItemsWithTotal.reduce(
          (sum, item) => sum + item.total_price,
          0
        );

        setEditingInvoice({
          ...editingInvoice,
          items: updatedEditingItemsWithTotal,
          total_amount: newEditingTotalAmount,
        });
      }

      return updatedInvoices;
    });
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
        }}
      >
        {operationTypes.map((type) => (
          <Button
            key={type}
            variant={
              operationType === type ||
              (type === "جميع العمليات" && operationType === "")
                ? "contained"
                : "outlined"
            }
            onClick={() =>
              setOperationType(type === "جميع العمليات" ? "" : type)
            }
            sx={{
              backgroundColor:
                operationType === type ||
                (type === "جميع العمليات" && operationType === "")
                  ? primaryColor
                  : "",
              border: `1px solid ${primaryColor}`,
              color:
                operationType === type ||
                (type === "جميع العمليات" && operationType === "")
                  ? "white"
                  : primaryColor,
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
            backgroundColor: "#f7f7f7",
          },
          "& .MuiDataGrid-virtualScroller": {
            borderRadius: "4px",
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
          backgroundColor: "white",
          border: "none",
        }}
      />

      {/* invoice data */}
      <Modal
        open={isModalOpen}
        onClose={closeModal}
        aria-labelledby="modal-title"
        aria-describedby="modal-description"
      >
        <Box
          sx={{
            position: "absolute",
            top: "50%",
            left: "50%",
            transform: "translate(-50%, -50%)",
            width: "80%",
            bgcolor: "#fff",
            boxShadow: 24,
            p: 4,
            borderRadius: 2,
            maxHeight: "75vh",
            overflowY: "auto",
            backgroundColor: "#eee",
          }}
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
          {selectedInvoice && (
            <>
              {/* header part */}
              <Box className={styles.headerSection}>
                <Box className={styles.logoBox}>
                  <img src={logo} alt="Logo" className={styles.logoImage} />
                </Box>
                <Box className={styles.operationTypeBox}>
                  <Box className={styles.operationTypeText}>نوع العملية</Box>
                  <Box className={styles.operationTypeName}>
                    {isEditingInvoice ? (
                      <select
                        value={editingInvoice.type}
                        onChange={(e) =>
                          setEditingInvoice({
                            ...editingInvoice,
                            type: e.target.value,
                          })
                        }
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
                        <option value="اضافه">إضافة</option>
                        <option value="صرف">صرف</option>
                        <option value="حذف">حذف</option>
                      </select>
                    ) : (
                      selectedInvoice.type
                    )}
                  </Box>
                </Box>
                <Box className={styles.infoBox}>
                  <Box className={styles.infoItem}>
                    <Box className={styles.infoLabel}>رقم السند:</Box>
                    <Box className={styles.infoValue}>{selectedInvoice.id}</Box>
                  </Box>
                  {/* <Box className={styles.infoItem}>
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
                  </Box> */}
                </Box>
              </Box>

              {/* table Manager */}
              <Box className={styles.tableSection} sx={{ direction: "rtl" }}>
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
                      <TableCell className={styles.tableInputCell} colSpan={5}>
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
                                  item.name ===
                                  (editingInvoice.machine_name ||
                                    selectedInvoice.machine_name)
                              ) || ""
                            }
                            sx={{
                              minWidth: "300px",
                              "& .MuiOutlinedInput-root": {
                                padding: "10px",
                              },
                              "& .MuiOutlinedInput-root .MuiOutlinedInput-notchedOutline":
                                {
                                  border: "none",
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
                      <TableCell className={styles.tableInputCell} colSpan={5}>
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
                                  (editingInvoice.mechanism_name ||
                                    selectedInvoice.mechanism_name)
                              ) || ""
                            }
                            sx={{
                              minWidth: "300px",
                              "& .MuiOutlinedInput-root": {
                                padding: "10px",
                              },
                              "& .MuiOutlinedInput-root .MuiOutlinedInput-notchedOutline":
                                {
                                  border: "none",
                                },
                            }}
                            options={mechanisms}
                            getOptionLabel={(option) => option.name}
                            onChange={(event, newValue) =>
                              setEditingInvoice({
                                ...editingInvoice,
                                mechanism_name: newValue ? newValue.name : "",
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
                        <AddIcon onClick={addRow} className={styles.addIcon} />
                      </TableCell>
                      <TableCell className={styles.tableCell}>
                        اسم الصنف
                      </TableCell>
                      {/* <TableCell className={styles.tableCell}>الرمز</TableCell> */}
                      <TableCell className={styles.tableCell}>الموقع</TableCell>
                      <TableCell className={styles.tableCell}>الكمية</TableCell>
                      {selectedInvoice.type !== "اضافه" ? (
                        ""
                      ) : (
                        <>
                          {/* <TableCell className={styles.tableCell}>
                            السعر
                          </TableCell> */}
                          <TableCell className={styles.tableCell}>
                            إجمالي السعر
                          </TableCell>
                        </>
                      )}

                      <TableCell colSpan={2} className={styles.tableCell}>
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
                          }}
                          className={styles.tableCellRow}
                        >
                          {index + 1}
                          {isEditingInvoice && (
                            <button
                              onClick={() =>
                                handleDeleteItem(selectedInvoice.id, index)
                              }
                              className={styles.clearIcon}
                            >
                              <ClearOutlinedIcon fontSize="small" />
                            </button>
                          )}
                        </TableCell>
                        <TableCell className={styles.tableCellRow}>
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
                                initialItems.find(
                                  (item) =>
                                    item.item_name ===
                                    (editingInvoice.items[index]?.item_name ||
                                      row.item_name)
                                ) || ""
                              }
                              sx={{
                                minWidth: "300px",
                                "& .MuiOutlinedInput-root": {
                                  padding: "10px",
                                },
                                "& .MuiOutlinedInput-root .MuiOutlinedInput-notchedOutline":
                                  {
                                    border: "none",
                                  },
                              }}
                              options={initialItems}
                              getOptionLabel={(option) => option.item_name}
                              onChange={(e, newValue) => {
                                const updatedItems = [...editingInvoice.items];
                                updatedItems[index] = {
                                  ...updatedItems[index],
                                  item_name: newValue?.item_name || "",
                                  item_bar: newValue?.item_bar || "",
                                  location: "",
                                  availableLocations: newValue?.locations || [],
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
                        {/* 
                        <TableCell className={styles.tableCellRow}>
                          {isEditingInvoice
                            ? editingInvoice.items[index]?.item_bar ||
                              row.item_bar
                            : row.item_bar}
                        </TableCell> */}

                        <TableCell className={styles.tableCellRow}>
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
                                editingInvoice.items[
                                  index
                                ]?.availableLocations?.find(
                                  (loc) =>
                                    loc.location ===
                                    editingInvoice.items[index]?.location
                                ) || ""
                              }
                              sx={{
                                minWidth: "300px",
                                "& .MuiOutlinedInput-root": {
                                  padding: "10px",
                                },
                                "& .MuiOutlinedInput-root .MuiOutlinedInput-notchedOutline":
                                  {
                                    border: "none",
                                  },
                              }}
                              options={
                                editingInvoice.items[index]
                                  ?.availableLocations || []
                              }
                              getOptionLabel={(option) => option.location || ""}
                              onChange={(e, newValue) => {
                                const updatedItems = [...editingInvoice.items];
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
                                <TextField {...params} placeholder="الموقع" />
                              )}
                            />
                          ) : (
                            row.location
                          )}
                        </TableCell>

                        <TableCell className={styles.tableCellRow}>
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
                              type="number"
                              min="0"
                              max={
                                row.availableLocations?.[index]?.quantity || 0
                              }
                              value={
                                editingInvoice.items[index]?.quantity ||
                                row.quantity
                              }
                              onInput={(e) => {
                                const maxQuantity =
                                  row.availableLocations?.[index]?.quantity ||
                                  0;

                                if (e.target.value < 0) {
                                  e.target.value = 0;
                                }

                                if (e.target.value > maxQuantity) {
                                  e.target.value = maxQuantity;
                                }
                              }}
                              onChange={(e) => {
                                const newQuantity = Math.max(
                                  0,
                                  Number(e.target.value)
                                );
                                const updatedItems = [...editingInvoice.items];
                                updatedItems[index] = {
                                  ...row,
                                  quantity: newQuantity,
                                  total_price:
                                    newQuantity *
                                    (row.availableLocations?.[index]
                                      ?.price_unit || 0),
                                };

                                const totalAmount = updatedItems.reduce(
                                  (sum, item) => sum + (item.total_price || 0),
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

                        {selectedInvoice.type !== "اضافه" ? (
                          ""
                        ) : (
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
                        <TableCell colSpan={2} className={styles.tableCellRow}>
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
                              type="text"
                              value={
                                editingInvoice.items[index]?.description ||
                                row.description
                              }
                              onChange={(e) => {
                                const updatedItems = [...editingInvoice.items];
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
              {selectedInvoice.type !== "اضافه" ? (
                ""
              ) : (
                <Box className={styles.totalAmountSection}>
                  <Box className={styles.totalAmountBox}>
                    <Box className={styles.totalAmountLabel}>الإجمالي:</Box>
                    <Box className={styles.totalAmountValue}>
                      {editingInvoice?.total_amount ||
                        selectedInvoice.total_amount}
                    </Box>
                  </Box>
                </Box>
              )}
              {/* comment */}
              {/* <Box className={styles.commentFieldBox}>
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
              </Box> */}
              {/* note */}
              {/* {selectedInvoice.note === "" ? (
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
          <Divider sx={{ marginTop: 5 }} />

          <Box sx={{ mt: 3, textAlign: "center" }}>
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
      </Modal>

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
