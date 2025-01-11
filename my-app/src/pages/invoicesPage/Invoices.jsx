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

function CustomToolbar() {
  return (
    <GridToolbarContainer>
      <GridToolbarQuickFilter
        sx={{
          direction: "rtl",
          width: "35%",
          "& .MuiInputBase-root": {
            borderRadius: "8px",
            border: "2px solid #1976d2",
            padding: "8px 16px",
            boxShadow: "none",
          },
          "& .MuiInputBase-root:hover": {
            outline: "none",
          },
          "& .MuiSvgIcon-root": {
            color: "#1976d2",
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
  const itemsNames = [
    { name: "item 1", parcode: "123" },
    { name: "item 2", parcode: "456" },
    { name: "item 3", parcode: "789" },
    { name: "item 4", parcode: "1234" },
  ];

  // Fetch data from API
  const fetchData = async (url, method = "GET", body = null) => {
    try {
      const response = await fetch(url, {
        method,
        body: body ? JSON.stringify(body) : null,
      });
      if (!response.ok) throw new Error("حدث خطأ أثناء العملية");
      return await response.json();
    } catch (error) {
      throw error;
    }
  };

  //fake data
  const initialData = [
    {
      id: 1,
      type: "اضافه",
      machine_name: "آلة التغليف",
      mechanism: "آلية التغليف التلقائي",
      client_name: "شركة التقنية",
      Warehouse: "المخزن الاول",
      Warehouse_manager: "علي محمود",
      total_amount: 5000,
      Employee_Name: "محمد أحمد",
      date: "1/7/2025",
      time: "04:09 PM",
      items: [
        {
          name: "جهاز كمبيوتر",
          item_bar: "123456",
          quantity: 1,
          price: 1200,
          total_price: 3600,
          description: "جهاز كمبيوتر مكتبي",
        },
        {
          name: "طابعة",
          item_bar: "654321",
          quantity: 2,
          price: 700,
          total_price: 1400,
          description: "طابعة ليزر",
        },
      ],
      comment: "أنا تعليق",
      note: "تم تعديل هذه الفاتوره في 1 يناير من سنة 2023",
    },
    {
      id: 2,
      type: "صرف",
      machine_name: "آلة الطباعة",
      mechanism: "آلية الطباعة السريعة",
      client_name: "شركة المستقبل",
      Warehouse: "المخزن الاول",
      Warehouse_manager: "سعيد عمر",
      Employee_Name: "خالد سعيد",
      date: "1/8/2025",
      time: "10:15 AM",
      items: [
        {
          name: "ماسح ضوئي",
          item_bar: "987654",
          quantity: 3,
          description: "ماسح ضوئي عالي الجودة",
        },
        {
          name: "شاشة عرض",
          item_bar: "789456",
          quantity: 2,
          description: "شاشة عرض LED",
        },
      ],
      comment: "تعليق جديد",
      note: "",
    },
    // بقية البيانات...
  ];

  // fetch invoices
  useEffect(() => {
    // const fetchInvoicesData = async () => {
    //   try {
    //     const data = await fetchData(`http://localhost:3001/users`, "GET");
    //     const updatedData = data.map((invoice, index) => ({
    //       ...invoice,
    //       rowNumber: index + 1,
    //     }));
    //     setInvoices(updatedData);
    //   } catch (error) {
    //     console.error("Error fetching data:", error);
    //   }
    // };
    // fetchInvoicesData();
    setInvoices(initialData);
  }, []);

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
  const operationTypes = ["كل الفواتير", "اضافه", "صرف", "امانات", "مرتجع"];
  const filteredAndFormattedData = invoices
    .filter(
      (invoice) =>
        operationType === "" ||
        operationType === "كل الفواتير" ||
        invoice.type === operationType
    )
    .map((invoice) => ({
      ...invoice,
      itemsNames: invoice.items.map((item) => item.name).join(", "),
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
    { flex: 1, field: "Employee_Name", headerName: "اسم الموظف" },
    { flex: 1, field: "Warehouse_manager", headerName: "مدير المخزن" },
    { flex: 1, field: "client_name", headerName: "اسم العميل" },
    { flex: 1, field: "mechanism", headerName: "الميكانيزم" },
    { flex: 1, field: "machine_name", headerName: "الماكينة" },
    { flex: 1, field: "time", headerName: "وقت اصدار الفاتورة" },
    {
      flex: 1,
      field: "date",
      headerName: "تاريخ اصدار الفاتورة",
    },
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
    footerRowSelected: (count) => `${count} صفوف محددة`,
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
  const handleSave = () => {
    const currentDate = new Date().toLocaleDateString();
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
      note: `تم تعديل هذه الفاتورة بتاريخ ${currentDate}`,
    };
    setInvoices((prev) =>
      prev.map((invoice) =>
        invoice.id === updatedInvoice.id ? updatedInvoice : invoice
      )
    );
    setSelectedInvoice(updatedInvoice);
    console.log("Updated selectedInvoice:", updatedInvoice);
    setEditingInvoice(null);
    setIsEditingInvoice(false);
  };
  const handleDelete = (id) => {
    setInvoices((prev) => prev.filter((invoice) => invoice.id !== id));
    setSelectedInvoice(null);
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

      console.log("Updated selectedInvoice:", updatedSelectedInvoice);

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
      <h1 className={styles.head}> الفواتير</h1>
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
              (type === "كل الفواتير" && operationType === "")
                ? "contained"
                : "outlined"
            }
            onClick={() => setOperationType(type === "كل الفواتير" ? "" : type)}
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
              {/* Warehouse */}
              <Box className={styles.warehouseBox}>
                {isEditingInvoice ? (
                  <select
                    value={editingInvoice.Warehouse}
                    onChange={(e) =>
                      setEditingInvoice({
                        ...editingInvoice,
                        Warehouse: e.target.value,
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
                    <option value="المخزن الاول">المخزن الاول</option>
                    <option value="المخزن الثانى">المخزن الثانى</option>
                    <option value="المخزن الثالث">المخزن الثالث</option>
                  </select>
                ) : (
                  <Box className={styles.warehouseText}>
                    {selectedInvoice.Warehouse}
                  </Box>
                )}
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
                          <input
                            type="text"
                            value={editingInvoice.machine_name}
                            onChange={(e) =>
                              setEditingInvoice({
                                ...editingInvoice,
                                machine_name: e.target.value,
                              })
                            }
                            style={{
                              width: "100%",
                              outline: "none",
                              fontSize: "15px",
                              textAlign: "right",
                              border: "none",
                              padding: "10px",
                            }}
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
                          <input
                            type="text"
                            value={editingInvoice.mechanism}
                            onChange={(e) =>
                              setEditingInvoice({
                                ...editingInvoice,
                                mechanism: e.target.value,
                              })
                            }
                            style={{
                              width: "100%",
                              outline: "none",
                              fontSize: "15px",
                              textAlign: "right",
                              border: "none",
                              padding: "10px",
                            }}
                          />
                        ) : (
                          selectedInvoice.mechanism
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
                      <TableCell className={styles.tableCell}>الرمز</TableCell>
                      <TableCell className={styles.tableCell}>الكمية</TableCell>
                      {selectedInvoice.type !== "اضافه" ? (
                        ""
                      ) : (
                        <>
                          <TableCell className={styles.tableCell}>
                            السعر
                          </TableCell>
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
                          {editingInvoice && (
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
                        <TableCell
                          sx={{
                            "&.MuiTableCell-root": {
                              padding: "0px",
                            },
                          }}
                          className={styles.tableCellRow}
                        >
                          {isEditingInvoice ? (
                            <Autocomplete
                              value={
                                itemsNames.find(
                                  (item) =>
                                    item.name ===
                                    (editingInvoice.items[index]?.name ||
                                      row.name)
                                ) || null
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
                              options={itemsNames}
                              getOptionLabel={(option) => option.name}
                              onChange={(e, newValue) => {
                                const updatedItems = [...editingInvoice.items];
                                updatedItems[index] = {
                                  ...updatedItems[index],
                                  name: newValue?.name || "",
                                  item_bar: newValue?.parcode || "",
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
                            row.name
                          )}
                        </TableCell>
                        <TableCell className={styles.tableCellRow}>
                          {isEditingInvoice
                            ? editingInvoice.items[index]?.item_bar ||
                              row.item_bar
                            : row.item_bar}
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
                              value={
                                editingInvoice.items[index]?.quantity ||
                                row.quantity
                              }
                              onInput={(e) => {
                                if (e.target.value < 0) {
                                  e.target.value = 0;
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
                                  total_price: newQuantity * (row.price || 0),
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
                            <TableCell className={styles.tableCellRow}>
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
                            </TableCell>
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
              {/* note */}
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
              )}
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
                        value={editingInvoice.Employee_Name}
                        onChange={(e) =>
                          setEditingInvoice({
                            ...editingInvoice,
                            Employee_Name: e.target.value,
                          })
                        }
                      />
                    ) : (
                      selectedInvoice.Employee_Name
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
                      value={editingInvoice.Warehouse_manager}
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
    </div>
  );
}
