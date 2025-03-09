import styles from "./Invoices.module.css";
import React, { useEffect, useMemo, useState, useRef } from "react";
import { GridToolbarContainer, GridToolbarQuickFilter } from "@mui/x-data-grid";
import {
  Button,
  Box,
  Typography,
  Autocomplete,
  TextField,
  Table,
  TableBody,
  TableRow,
  TableCell,
  Divider,
  CircularProgress,
} from "@mui/material";
import EditIcon from "@mui/icons-material/Edit";
import ClearOutlinedIcon from "@mui/icons-material/ClearOutlined";
import SaveIcon from "@mui/icons-material/Save";
import LaunchIcon from "@mui/icons-material/Launch";
import logo from "./logo.png";
import AddIcon from "@mui/icons-material/Add";
import "../../colors.css";
import SnackBar from "../../components/snackBar/SnackBar";
import DeleteRow from "../../components/deleteItem/DeleteRow";
// import PublishedWithChangesIcon from "@mui/icons-material/PublishedWithChanges";
import CustomDataGrid from "../../components/dataGrid/CustomDataGrid";
import NumberInput from "../../components/number/NumberInput";
import CustomAutoCompleteField from "../../components/customAutoCompleteField/CustomAutoCompleteField";
import FilterTabs from "../../components/filter/Filter";
import { filtersTypes } from "../../components/filter/Filter";
import Visibility from "@mui/icons-material/Visibility";
import VisibilityOff from "@mui/icons-material/VisibilityOff";
// Import RTK Query hooks
import { useGetUserQuery } from "../services/userApi";
import { useGetSuppliersQuery } from "../services/supplierApi";
import { useGetMachinesQuery } from "../services/machineApi";
import { useGetMechanismsQuery } from "../services/mechanismApi";
import { useGetWarehousesQuery } from "../services/warehouseApi";
import {
  useGetInvoicesQuery,
  useDeleteInvoiceMutation,
  useUpdateInvoiceMutation,
  useConfirmInvoiceMutation,
  useRefreshInvoiceMutation,
  useReturnWarrantyInvoiceMutation,
} from "../services/invoiceApi";
import PrintableTable from "../../components/printableTable/PrintableTable ";
import PrintIcon from "@mui/icons-material/Print";
import ArticleIcon from "@mui/icons-material/Article";
import InvoiceDetails from "../../components/invoiceDetails/InvoiceDetails";

export default function Invoices() {
  const {
    data: user,
    isLoading: isLoadingUser,
    refetch: refetchUser,
  } = useGetUserQuery();

  const [selectedInvoice, setSelectedInvoice] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedNowType, setSelectedNowType] = useState(null);

  useEffect(() => {
    setSelectedNowType((user ? filtersTypes(user) : [])[0]);
  }, [user]);

  // Loaders - Only keep UI-specific loading states
  const [isConfirmDone, setIsConfirmDone] = useState(false);
  const [isArrayDeleting, setIsArrayDeleting] = useState(false);
  const [isSaved, setIsSaved] = useState(false);
  const [isInvoiceDeleting, setIsInvoiceDeleting] = useState(false);

  // RTK Query Hooks
  const {
    data: suppliers = [],
    isLoading: isSupliersLoading,
    refetch: refetchSupliers,
  } = useGetSuppliersQuery(undefined, { pollingInterval: 300000 });

  const {
    data: machines = [],
    isLoading: isMachinesLoading,
    refetch: refetchMachines,
  } = useGetMachinesQuery(undefined, { pollingInterval: 300000 });

  const {
    data: mechanisms = [],
    isLoading: isMechanismsLoading,
    refetch: refetchMechanisms,
  } = useGetMechanismsQuery(undefined, { pollingInterval: 300000 });

  const {
    data: warehouse = [],
    isLoading: isWareHousesLoading,
    refetch,
  } = useGetWarehousesQuery(undefined, { pollingInterval: 300000 });

  // Invoices query with automatic refetch
  const {
    data: invoicesData = [],
    isLoading: isInvoicesLoading,
    refetch: refetchInvoices,
  } = useGetInvoicesQuery(selectedNowType?.label, {
    pollingInterval: 300000,
  });

  // Mutations
  const [deleteInvoice] = useDeleteInvoiceMutation();
  const [updateInvoice] = useUpdateInvoiceMutation();
  const [confirmInvoice] = useConfirmInvoiceMutation();
  const [refreshInvoice] = useRefreshInvoiceMutation();
  const [ReturnWarrantyInvoice] = useReturnWarrantyInvoiceMutation();

  // Helper function
  const formatTime = (datetime) => {
    const [date, timeWithSeconds] = datetime.split(" ");
    const [hours, minutes] = timeWithSeconds.split(":");
    const hoursIn12Format = hours % 12 || 12;
    const ampm = hours >= 12 ? "PM" : "AM";
    return `${hoursIn12Format}:${minutes} ${ampm}`;
  };

  // Transformed invoices state
  const invoices = useMemo(() => {
    if (!invoicesData || !warehouse) return [];
    const warehouseMap = new Map();
    warehouse.forEach((wh) => {
      warehouseMap.set(wh.item_name, wh);
    });
    return invoicesData
      .slice()
      .reverse()
      .map((invoice) => {
        return {
          refresh: invoice.items.some((item) => item.total_price === 0)
            ? "تحديث اسعار"
            : "",
          ...invoice,
          status:
            invoice.status === "returned"
              ? "تم الاسترداد"
              : invoice.status === "confirmed"
              ? "تم"
              : invoice.status === "draft"
              ? "لم تراجع"
              : "لم تؤكد",
          itemsNames: invoice.items.map((item) => item.item_name).join(", "),
          date: invoice.created_at.split(" ")[0],
          time: formatTime(invoice.created_at),
          classname: invoice.items.some((item) => item.total_price === 0)
            ? "zero-total-price"
            : "",
        };
      });
  }, [invoicesData, warehouse]);

  // Simplified delete handler
  const handleDeleteSelectedRows = async (selectedIds) => {
    setIsArrayDeleting(true);
    try {
      await Promise.all(
        selectedRows.map((invoice) => deleteInvoice(invoice.id).unwrap())
      );
      refetch();
      setOpenSnackbar(true);
      setSnackbarMessage("تم الحذف بنجاح");
      setSnackBarType("success");
    } catch (error) {
      setOpenSnackbar(true);
      setSnackbarMessage("حدث خطأ أثناء الحذف");
      setSnackBarType("error");
    } finally {
      setIsArrayDeleting(false);
      setDeleteDialogCheckBoxOpen(false);
      setDeleteCheckBoxConfirmationText("");
    }
  };

  // Simplified delete handler
  const [isRefreshArrayLoading, setIsRefreshArrayLoading] = useState(false);
  const handleRefreshSelectedRows = async (selectedRows) => {
    setIsRefreshArrayLoading(true);
    try {
      await Promise.all(
        selectedRows.map((invoice) => refreshInvoice(invoice.id).unwrap())
      );
      setOpenSnackbar(true);
      setSnackbarMessage("تم التحديث بنجاح");
      setSnackBarType("success");
    } catch (error) {
      setOpenSnackbar(true);
      setSnackbarMessage("حدث خطأ أثناء التحديث");
      setSnackBarType("error");
    } finally {
      setIsRefreshArrayLoading(false);
      setDeleteDialogCheckBoxOpen(false);
      setDeleteCheckBoxConfirmationText("");
      setSelectedRows([]);
    }
  };

  // Confirm Invoice
  const handleInvoiceAction = async (id) => {
    setIsConfirmDone((prev) => ({ ...prev, [id]: true }));
    try {
      await confirmInvoice(id).unwrap();
      setOpenSnackbar(true);
      setSnackbarMessage("تم التحديث بنجاح");
      setSnackBarType("success");
    } catch (error) {
      setOpenSnackbar(true);
      setSnackbarMessage("حدث خطأ أثناء التحديث");
      setSnackBarType("error");
    } finally {
      setIsConfirmDone((prev) => ({ ...prev, [id]: false }));
    }
  };

  // Save Invoice
  const handleSave = async () => {
    // Step 1: Check if there are any changes
    if (JSON.stringify(editingInvoice) === JSON.stringify(selectedInvoice)) {
      setIsEditingInvoice(false);
      setEditingInvoice(null);
      return;
    }

    // Step 2: Validate required fields
    if (selectedNowType?.type === "purchase") {
      if (
        !editingInvoice.machine_name ||
        !editingInvoice.mechanism_name ||
        !editingInvoice.supplier_name
      ) {
        setSnackbarMessage("يجب ملئ اسم المورد واسم الماكينة واسم الميكانيزم");
        setSnackBarType("info");
        setOpenSnackbar(true);
        return;
      }
    } else if (!editingInvoice.machine_name || !editingInvoice.mechanism_name) {
      setSnackbarMessage("يجب ملئ اسم الماكينة واسم الميكانيزم");
      setSnackBarType("info");
      setOpenSnackbar(true);
      return;
    }

    // Step 3: Filter and validate items
    let newRows = editingInvoice.items.filter(
      (row) => Number(row.quantity) !== 0 && row.quantity !== ""
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
      unit_price:
        selectedNowType?.type !== "purchase"
          ? Number(row.priceunit)
          : Number(row.unit_price),
      description: row.description,
    }));

    // Step 5: Update the invoice object
    const updatedInvoice = {
      id: editingInvoice.id,
      type: editingInvoice.type,
      supplier_name: editingInvoice.supplier_name,
      machine_name: editingInvoice.machine_name,
      mechanism_name: editingInvoice.mechanism_name,
      total_amount: editingInvoice.total_amount,
      paid: editingInvoice.paid || 0,
      residual: editingInvoice.paid - editingInvoice.total_amount || 0,
      employee_name: editingInvoice.employee_name,
      client_name: editingInvoice.client_name,
      warehouse_manager: editingInvoice.warehouse_manager,
      comment: editingInvoice.comment,
      items: newRows.map((row) => ({
        item_name: row.item_name,
        barcode: row.barcode,
        location: row.location,
        quantity: Number(row.quantity),
        total_price: row.total_price,
        unit_price:
          selectedNowType?.type !== "purchase"
            ? Number(row.priceunit)
            : Number(row.unit_price),
        description: row.description,
      })),
    };
    console.log("updatedInvoice", updatedInvoice);

    setIsSaved(true);

    try {
      await updateInvoice(updatedInvoice).unwrap();
      setOpenSnackbar(true);
      setSnackbarMessage("تم التعديل بنجاح");
      setSnackBarType("success");
      setIsEditingInvoice(false);
      setIsModalOpen(true);
      openInvoice(updatedInvoice.id);
      setSelectedInvoice(updatedInvoice);
    } catch (error) {
      setOpenSnackbar(true);
      setSnackbarMessage("حدث خطأ أثناء التحديث");
      setSnackBarType("error");
    } finally {
      setIsSaved(false);
    }
  };

  // Recovery
  const [loadingRowsReturn, setLoadingRowsReturn] = useState({});
  const handleRecovery = async (id) => {
    setLoadingRowsReturn((prev) => ({ ...prev, [id]: true }));
    try {
      await ReturnWarrantyInvoice(id).unwrap();
      setSnackbarMessage("تم التحديث بنجاح");
      setSnackBarType("success");
    } catch (error) {
      setSnackbarMessage("حدث خطأ أثناء التحديث");
      setSnackBarType("error");
    } finally {
      setOpenSnackbar(true);
      setLoadingRowsReturn((prev) => ({ ...prev, [id]: false }));
    }
  };

  // Refresh Data
  const [loadingRows, setLoadingRows] = useState({});
  const handleRefresh = async (id) => {
    setLoadingRows((prev) => ({ ...prev, [id]: true }));
    try {
      await refreshInvoice(id).unwrap();
      setSnackbarMessage("تم التحديث بنجاح");
      setSnackBarType("success");
    } catch (error) {
      setSnackbarMessage("حدث خطأ أثناء التحديث");
      setSnackBarType("error");
    } finally {
      setOpenSnackbar(true);
      setLoadingRows((prev) => ({ ...prev, [id]: false }));
    }
  };

  // Delete Single Invoice
  const handleDelete = async () => {
    if (deleteConfirmationText.trim().toLowerCase() === "نعم") {
      setIsInvoiceDeleting(true);
      try {
        await deleteInvoice(selectedUserId).unwrap();
        refetch();
        setOpenSnackbar(true);
        setSnackbarMessage("تم الحذف بنجاح");
        setSnackBarType("success");
      } catch (error) {
        setOpenSnackbar(true);
        setSnackbarMessage("حدث خطأ أثناء الحذف");
        setSnackBarType("error");
      } finally {
        setIsInvoiceDeleting(false);
        setDeleteConfirmationText("");
        setSelectedUserId(null);
        setDeleteDialogOpen(false);
      }
    }
  };

  // snackbar
  const [openSnackbar, setOpenSnackbar] = useState(false);
  const [snackbarMessage, setSnackbarMessage] = useState("");
  const [snackBarType, setSnackBarType] = useState("");
  // Handle close snack
  const handleCloseSnackbar = () => {
    setOpenSnackbar(false);
  };

  // colors
  const secondColor = getComputedStyle(
    document.documentElement
  ).getPropertyValue("--second-color");

  // open close modal
  const openInvoice = (id) => {
    const invoice = invoices?.find((item) => item.id === id);
    if (!invoice) {
      console.error("Invoice not found:", id);
      return;
    }
    const items =
      invoice.items?.map((item) => {
        const matchedItem = warehouseMap.get(item.item_name);
        const location = matchedItem?.locations?.find(
          (l) => l.location === item.location
        );
        return {
          ...item,
          priceunit: location?.price_unit ?? 0,
          maxquantity: (location?.quantity ?? 0) + (item.quantity ?? 0),
          availableLocations: matchedItem?.locations ?? [],
        };
      }) ?? [];
    setSelectedInvoice({ ...invoice, items });
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

  // select with checkboxes
  const [selectedRows, setSelectedRows] = useState([]);

  // custom toolbar
  function CustomToolbar() {
    const printableTableRef = useRef(null);

    const handlePrint = () => {
      if (printableTableRef.current) {
        const printContent = printableTableRef.current.innerHTML;
        const printWindow = document.createElement("div");
        printWindow.innerHTML = `
          <html>
            <head>
              <title>Print Table</title>
              <style>
                table {
                  width: 100%;
                  border-collapse: collapse;
                }
                th, td {
                  border: 1px solid black;
                  padding: 8px;
                  text-align: center;
                }
              </style>
            </head>
            <body>
              ${printContent}
            </body>
          </html>
        `;

        const printWindowFrame = document.createElement("iframe");
        printWindowFrame.style.position = "absolute";
        printWindowFrame.style.width = "0px";
        printWindowFrame.style.height = "0px";
        printWindowFrame.style.border = "none";
        document.body.appendChild(printWindowFrame);

        const iframeDocument = printWindowFrame.contentWindow.document;
        iframeDocument.open();
        iframeDocument.write(printWindow.innerHTML);
        iframeDocument.close();

        printWindowFrame.contentWindow.focus();
        printWindowFrame.contentWindow.print();

        document.body.removeChild(printWindowFrame);
      } else {
        console.error("Printable table reference is null.");
      }
    };

    return (
      <GridToolbarContainer
        sx={{
          textAlign: "center",
        }}
      >
        <GridToolbarQuickFilter
          sx={{
            width: "500px",
            direction: "rtl",
            "& .MuiInputBase-root": {
              padding: "8px",
              borderBottom: `2px solid ${secondColor}`,
              backgroundColor: "white",
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
        {selectedRows.length > 0 && (
          <>
            {(user?.can_delete || user?.username === "admin") && (
              <Button
                variant="contained"
                color="error"
                startIcon={<ClearOutlinedIcon />}
                onClick={handleDeleteCheckBoxClick}
                sx={{
                  backgroundColor: "#d32f2f",
                  "&:hover": { backgroundColor: "#b71c1c" },
                  position: "absolute",
                  top: "15px",
                  left: "0",
                }}
              >
                حذف المحدد ({selectedRows.length})
              </Button>
            )}
            {selectedRows.some((invoice) =>
              invoice.items.every((item) => item.total_price !== 0)
            )
              ? ""
              : (user?.can_update_prices || user?.username === "admin") && (
                  <Button
                    variant="contained"
                    startIcon={<ClearOutlinedIcon />}
                    onClick={() => handleRefreshSelectedRows(selectedRows)}
                    sx={{
                      position: "absolute",
                      top: "15px",
                      left: user?.username === "admin" ? "150px" : "0",
                    }}
                    disabled={isRefreshArrayLoading}
                  >
                    {isRefreshArrayLoading ? (
                      <CircularProgress size={24} />
                    ) : (
                      `تحديث اسعار المحدد (${selectedRows.length})`
                    )}
                  </Button>
                )}
          </>
        )}
        <Button
          onClick={handlePrint}
          startIcon={<PrintIcon />}
          variant="contained"
          color="info"
          sx={{
            backgroundColor: "#00bcd4",
            position: "absolute",
            top: "15px",
            right: "0",
          }}
        >
          طباعة التقرير
        </Button>
        <PrintableTable
          ref={printableTableRef}
          data={invoices}
          columns={columns}
        />
      </GridToolbarContainer>
    );
  }

  // handle confirm
  const getButtonText = (invoiceType) => {
    switch (invoiceType) {
      case "صرف":
        return "لم تراجع";
      case "أمانات":
        return "لم تراجع";
      case "حجز":
        return "لم تراجع";
      case "مرتجع":
        return "لم تراجع";
      default:
        return "لم تراجع";
    }
  };
  // handle confirm
  const getButtonTextStatge = (invoiceType) => {
    switch (invoiceType) {
      case "صرف":
        return "لم تؤكد";
      case "أمانات":
        return "لم تؤكد";
      case "حجز":
        return "لم تؤكد";
      case "مرتجع":
        return "لم تؤكد";
      default:
        return "لم تؤكد";
    }
  };

  // manage Details component
  const [isInvoiceDetailsOpen, setIsInvoiceDetailsOpen] = useState(false);
  const [invoiceId, setInvoiceId] = useState(null);
  const showInvoiceDetails = (id) => {
    setInvoiceId(id);
    setIsInvoiceDetailsOpen(true);
  };

  // columns
  const columns = [
    {
      field: "refresh",
      headerName: "فتح الفاتورة",
      width: selectedNowType?.label === "أمانات" ? 300 : 165,
      renderCell: (params) => {
        return (
          <div
            style={{
              display: "flex",
              justifyContent: "space-around",
              alignItems: "center",
              height: "100%",
            }}
          >
            <button
              className={styles.iconBtn}
              onClick={() => openInvoice(params.id)}
            >
              <LaunchIcon />
            </button>
            {(user?.can_delete || user?.username === "admin") && (
              <button
                className={styles.iconBtn}
                onClick={() => handleDeleteClick(params.id)}
                style={{ color: "#d32f2f" }}
              >
                <ClearOutlinedIcon />
              </button>
            )}
            {(user?.view_prices || user?.username === "admin") &&
              selectedNowType?.label !== "اضافه" && (
                <button
                  className={styles.iconBtn}
                  onClick={() => showInvoiceDetails(params.id)}
                  style={{ color: "#d32f2f" }}
                >
                  <ArticleIcon sx={{ color: secondColor }} />
                </button>
              )}
            {selectedNowType?.label === "أمانات" &&
              (params.row.status !== "تم الاسترداد" ? (
                <Button
                  variant="contained"
                  color="info"
                  onClick={() => handleRecovery(params.row.id)}
                  sx={{
                    borderRadius: "8px",
                    padding: "6px 16px",
                  }}
                  disabled={
                    loadingRowsReturn[params.row.id] ||
                    (user?.can_recover_deposits &&
                      !user?.can_recover_deposits) ||
                    user?.username !== "admin"
                  }
                >
                  {loadingRowsReturn[params.row.id] ? (
                    <CircularProgress size={24} />
                  ) : (
                    "استرداد"
                  )}
                </Button>
              ) : (
                "تم الاسترداد"
              ))}
            {params.row.items.some((item) => item.total_price === 0) && (
              <Button
                variant="contained"
                color="info"
                onClick={() => handleRefresh(params.row.id)}
                sx={{
                  borderRadius: "8px",
                  padding: "6px 16px",
                }}
                disabled={
                  loadingRows[params.row.id] ||
                  (user?.can_update_prices && !user?.can_update_prices) ||
                  user?.username !== "admin"
                }
              >
                {loadingRows[params.row.id] ? (
                  <CircularProgress size={24} />
                ) : (
                  "تحديث اسعار"
                )}
              </Button>
            )}
          </div>
        );
      },
    },
    {
      width: 86,
      field: "status",
      headerName: "حالة العملية",
      renderCell: (params) => {
        const { status, id } = params.row;
        const invoiceType = selectedNowType?.label || "default";
        const isLoading = isConfirmDone[id] || false;

        let buttonText;
        let buttonColor;

        if (status === "تم" || status === "تم الاسترداد") {
          return "تم";
        } else if (status === "لم تؤكد") {
          buttonText = getButtonTextStatge(invoiceType);
          buttonColor = "primary";
        } else {
          buttonText = getButtonText(invoiceType);
          buttonColor = "error";
        }

        return (
          <Button
            variant="contained"
            color={buttonColor}
            onClick={() => handleInvoiceAction(params.row.id)}
            sx={{
              borderRadius: "8px",
              padding: "6px 10px",
            }}
            disabled={
              isLoading ||
              (status === "لم تراجع" &&
                !(
                  user?.can_confirm_withdrawal || user?.username === "admin"
                )) ||
              (status === "لم تؤكد" &&
                !(user?.can_withdraw || user?.username === "admin"))
            }
          >
            {isLoading ? <CircularProgress size={24} /> : buttonText}
          </Button>
        );
      },
    },
    { flex: 1, field: "itemsNames", headerName: "أسماء العناصر" },
    { flex: 1, field: "mechanism_name", headerName: "الميكانيزم" },
    { flex: 1, field: "machine_name", headerName: "الماكينة" },
    { flex: 1, field: "employee_name", headerName: "اسم الموظف" },
    { flex: 1, field: "warehouse_manager", headerName: "عامل المخازن" },
    { flex: 1, field: "accreditation_manager", headerName: "المراجع" },
    { flex: 1, field: "client_name", headerName: "اسم العميل" },
    {
      flex: 1,
      field: "time",
      headerName: "وقت اصدار الفاتورة",
    },
    {
      flex: 1,
      field: "date",
      headerName: "تاريخ اصدار الفاتورة",
    },
    { flex: 1, field: "type", headerName: "نوع العملية" },
    { field: "id", headerName: "#", width: 50 },
  ];

  // pagination
  const [paginationModel, setPaginationModel] = useState({
    page: 0,
    pageSize: 10,
  });
  const pageCount = Math.ceil(invoices.length / paginationModel.pageSize);
  const handlePageChange = (newModel) => {
    setPaginationModel((prev) => ({ ...prev, ...newModel }));
  };

  const warehouseMap = useMemo(() => {
    const map = new Map();

    if (!Array.isArray(warehouse) || warehouse.length === 0) {
      return map;
    }

    warehouse?.forEach((item) => map.set(item.item_name, item));
    return map;
  }, [warehouse]);
  const itemNames = useMemo(() => {
    return Array.isArray(warehouse)
      ? warehouse.map((item) => item.item_name)
      : [];
  }, [warehouse]);

  // edited invoice
  const [isEditingInvoice, setIsEditingInvoice] = useState(false);
  const [editingInvoice, setEditingInvoice] = useState(null);

  const handleEditInfo = (invoice) => {
    setEditingInvoice(invoice);
    setIsEditingInvoice(true);
  };

  // add item
  const addRow = () => {
    const newItem = {
      item_name: "",
      barcode: "",
      quantity: 0,
      priceunit: 0,
      total_price: 0,
      description: "",
      maxquantity: 0,
      availableLocations: [],
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

  // show details
  const [show, setShow] = useState(false);

  // delete invoice dialog
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [selectedUserId, setSelectedUserId] = useState(null);
  const [deleteConfirmationText, setDeleteConfirmationText] = useState("");

  const handleDeleteClick = (id) => {
    setSelectedUserId(id);
    setDeleteDialogOpen(true);
    setDeleteConfirmationText("");
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
  useEffect(() => {
    refetch();
    refetchUser();
    refetchSupliers();
    refetchMachines();
    refetchMechanisms();
    refetchInvoices();
  }, [
    refetch,
    refetchInvoices,
    refetchMachines,
    refetchMechanisms,
    refetchSupliers,
    refetchUser,
  ]);

  if (isLoadingUser) {
    return (
      <div
        style={{
          height: "100vh",
          display: "flex",
          justifyContent: "center",
          alignItems: "center",
        }}
      >
        <h1 className={styles.head}>
          <CircularProgress />
        </h1>
      </div>
    );
  } else {
    if (
      user?.view_additions ||
      user?.view_withdrawals ||
      user?.view_deposits ||
      user?.view_returns ||
      user?.view_damages ||
      user?.view_reservations ||
      user?.username === "admin"
    ) {
      return (
        <div className={styles.container}>
          <h1 className={styles.head}> العمليات</h1>
          {/* filter type invoice */}
          <FilterTabs
            setNowType={setSelectedNowType}
            setSelectedRows={setSelectedRows}
          />
          {/* invoices data */}
          <CustomDataGrid
            rows={invoices}
            columns={columns}
            paginationModel={paginationModel}
            onPageChange={handlePageChange}
            pageCount={pageCount}
            CustomToolbarFromComponent={CustomToolbar}
            loader={isInvoicesLoading}
            checkBox={true}
            setSelectedRows={setSelectedRows}
            selectedRows={selectedRows}
          />

          {/* invoice details data */}
          {isInvoiceDetailsOpen && (
            <InvoiceDetails
              open={isInvoiceDetailsOpen}
              onClose={() => setIsInvoiceDetailsOpen(false)}
              id={invoiceId}
            />
          )}
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
                          left: "30px",
                        }}
                      >
                        <ClearOutlinedIcon />
                      </button>
                      <button
                        disabled={isSaved}
                        onClick={() => {
                          handleSave(editingInvoice);
                        }}
                        className={styles.iconBtn}
                        style={{
                          color: "#1976d2",
                          position: "absolute",
                          top: "0px",
                          left: "60px",
                        }}
                      >
                        {isSaved ? (
                          <CircularProgress size={24} />
                        ) : (
                          <SaveIcon />
                        )}
                      </button>
                    </div>
                  ) : (
                    <div>
                      {selectedInvoice.status === "تم" ||
                      selectedInvoice.status === "تم الاسترداد"
                        ? ""
                        : (user?.can_edit || user?.username === "admin") && (
                            <button
                              onClick={() => {
                                handleEditInfo(selectedInvoice);
                              }}
                              className={styles.iconBtn}
                              style={{
                                color: "#1976d2",
                                position: "absolute",
                                top: "0px",
                                left: "30px",
                              }}
                            >
                              <EditIcon />
                            </button>
                          )}
                    </div>
                  )}
                  {(user?.view_prices || user?.username === "admin") && (
                    <button
                      onClick={() => {
                        const newShow = !show;
                        setShow(newShow);
                      }}
                      className={styles.iconBtn}
                      style={{
                        color: "#1976d2",
                        position: "absolute",
                        top: "0px",
                        left: "0px",
                      }}
                    >
                      {show ? <Visibility /> : <VisibilityOff />}
                    </button>
                  )}
                </Typography>
                <div className="printable-box">
                  {isModalOpen && (
                    <>
                      {/* header part */}
                      <Box className={styles.headerSection}>
                        <Box className={styles.logoBox}>
                          <img
                            src={logo}
                            alt="Logo"
                            className={styles.logoImage}
                          />
                        </Box>
                        <Box className={styles.operationTypeBox}>
                          <Box className={styles.operationTypeText}>
                            نوع العملية
                          </Box>
                          <Box className={styles.operationTypeName}>
                            {selectedInvoice.type}
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
                            {/* Inputs for Suplier, Machine and Mechanism Names */}
                            {selectedNowType?.type === "purchase" && (
                              <TableRow className={styles.tableRow}>
                                <TableCell
                                  className={styles.tableCell}
                                  colSpan={2}
                                >
                                  اسم المورد
                                </TableCell>
                                <TableCell
                                  className={styles.tableInputCell}
                                  colSpan={6}
                                  sx={{
                                    padding: "0px !important",
                                  }}
                                >
                                  {isEditingInvoice ? (
                                    <CustomAutoCompleteField
                                      loading={isSupliersLoading}
                                      values={suppliers}
                                      editingItem={editingInvoice}
                                      setEditingItem={setEditingInvoice}
                                      fieldName="supplier_name"
                                      placeholder="اسم المورد"
                                    />
                                  ) : (
                                    selectedInvoice.supplier_name
                                  )}
                                </TableCell>
                              </TableRow>
                            )}
                            <TableRow className={styles.tableRow}>
                              <TableCell
                                className={styles.tableCell}
                                colSpan={2}
                              >
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
                                  <CustomAutoCompleteField
                                    loading={isMachinesLoading}
                                    values={machines}
                                    editingItem={editingInvoice}
                                    setEditingItem={setEditingInvoice}
                                    fieldName="machine_name"
                                    placeholder="اسم الماكينة"
                                  />
                                ) : (
                                  selectedInvoice.machine_name
                                )}
                              </TableCell>
                            </TableRow>
                            <TableRow className={styles.tableRow}>
                              <TableCell
                                className={styles.tableCell}
                                colSpan={2}
                              >
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
                                  <CustomAutoCompleteField
                                    loading={isMechanismsLoading}
                                    values={mechanisms}
                                    editingItem={editingInvoice}
                                    setEditingItem={setEditingInvoice}
                                    fieldName="mechanism_name"
                                    placeholder="اسم الميكانيزم"
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
                              {(show ||
                                selectedNowType?.type === "purchase") && (
                                <>
                                  <TableCell className={styles.tableCell}>
                                    السعر
                                  </TableCell>
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
                                      onClick={() =>
                                        handleDeleteItemClick(index)
                                      }
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
                                      loading={isWareHousesLoading}
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
                                        itemNames?.find(
                                          (item) => item === row.item_name
                                        ) || ""
                                      }
                                      isOptionEqualToValue={(option, value) =>
                                        option === value
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
                                      options={itemNames || []}
                                      getOptionLabel={(option) => option || ""}
                                      onChange={(e, newValue) => {
                                        if (!newValue) {
                                          return;
                                        }
                                        const updatedItems = [
                                          ...editingInvoice.items,
                                        ];
                                        const selectedItem =
                                          warehouseMap.get(newValue);
                                        updatedItems[index] = {
                                          ...updatedItems[index],
                                          item_name: newValue || "",
                                          barcode: selectedItem?.item_bar || "",
                                          location: "",
                                          quantity: 0,
                                          priceunit: 0,
                                          total_price: 0,
                                          availableLocations:
                                            selectedItem?.locations || [],
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
                                      loading={
                                        row.item_name === "" ? false : true
                                      }
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
                                        row?.availableLocations?.find(
                                          (location1) =>
                                            location1.location === row.location
                                        ) || null
                                      }
                                      isOptionEqualToValue={(option, value) =>
                                        option.location === value?.location
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
                                      options={row?.availableLocations || []}
                                      getOptionLabel={(option) =>
                                        option.location || ""
                                      }
                                      onChange={(e, newValue) => {
                                        if (!newValue) {
                                          return;
                                        }

                                        const matchedItem =
                                          editingInvoice?.items?.find(
                                            (row11) =>
                                              row11.barcode === row.barcode &&
                                              row11.location ===
                                                newValue.location
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
                                          quantity: 0,
                                          priceunit:
                                            newValue?.price_unit &&
                                            selectedNowType?.type !== "purchase"
                                              ? newValue.price_unit
                                              : 0,
                                          total_price: 0,
                                          maxquantity:
                                            newValue?.quantity + row.quantity,
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
                                    width: "100px",
                                  }}
                                >
                                  {isEditingInvoice ? (
                                    <NumberInput
                                      style={{
                                        width: "100px",
                                        outline: "none",
                                        fontSize: "15px",
                                        textAlign: "center",
                                        border: "none",
                                        padding: "10px",
                                      }}
                                      max={
                                        selectedNowType?.type === "purchase" &&
                                        row.maxquantity
                                      }
                                      value={row?.quantity}
                                      onInput={(e) => {
                                        if (e.target.value < 0) {
                                          e.target.value = 0;
                                        }
                                        if (
                                          (selectedNowType?.type ===
                                            "operation") &
                                          (e.target.value > row.maxquantity)
                                        ) {
                                          e.target.value = row.maxquantity;
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
                                        if (
                                          row.location === undefined ||
                                          row.location === ""
                                        ) {
                                          setSnackbarMessage(
                                            "يجب تحديد موقع العنصر اولا"
                                          );
                                          setSnackBarType("info");
                                          setOpenSnackbar(true);
                                          e.target.blur();

                                          return;
                                        }
                                        const newQuantity = Math.max(
                                          0,
                                          Number(e.target.value)
                                        );
                                        const updatedItems = [
                                          ...editingInvoice.items,
                                        ];
                                        updatedItems[index] = {
                                          ...row,
                                          quantity: e.target.value,
                                          total_price:
                                            selectedNowType?.type === "purchase"
                                              ? newQuantity * row.unit_price
                                              : newQuantity * row.priceunit,
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
                                {(show ||
                                  selectedNowType?.type === "purchase") && (
                                  <>
                                    {!isEditingInvoice ? (
                                      <TableCell
                                        className={styles.tableCellRow}
                                      >
                                        {row.unit_price}
                                      </TableCell>
                                    ) : selectedNowType?.type !== "purchase" ? (
                                      <TableCell
                                        className={styles.tableCellRow}
                                      >
                                        {row.priceunit}
                                      </TableCell>
                                    ) : (
                                      <TableCell
                                        className={styles.tableCellRow}
                                        sx={{
                                          width: "100px",
                                        }}
                                      >
                                        <NumberInput
                                          style={{
                                            width: "100px",
                                            outline: "none",
                                            fontSize: "15px",
                                            textAlign: "center",
                                            border: "none",
                                            padding: "10px",
                                          }}
                                          value={
                                            row.unit_price ?? row?.unit_price
                                          }
                                          onInput={(e) => {
                                            if (e.target.value < 0) {
                                              e.target.value = 0;
                                            }
                                            if (
                                              (selectedNowType?.type ===
                                                "operation") &
                                              (e.target.value > row.maxquantity)
                                            ) {
                                              e.target.value = row.maxquantity;
                                            }
                                          }}
                                          onChange={(e) => {
                                            if (
                                              row.location === undefined ||
                                              row.location === ""
                                            ) {
                                              setSnackbarMessage(
                                                "يجب تحديد موقع العنصر اولا"
                                              );
                                              setSnackBarType("info");
                                              setOpenSnackbar(true);
                                              e.target.blur();
                                              return;
                                            }
                                            const newValue = e.target.value;
                                            const newTotalPrice =
                                              (e.target.value || 0) *
                                              (row.quantity || 0);

                                            const updatedItems = [
                                              ...editingInvoice.items,
                                            ];
                                            updatedItems[index] = {
                                              ...row,
                                              unit_price: newValue,
                                              total_price: newTotalPrice,
                                            };
                                            const totalAmount =
                                              updatedItems.reduce(
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
                                        />
                                      </TableCell>
                                    )}
                                    <TableCell className={styles.tableCellRow}>
                                      {isEditingInvoice
                                        ? row?.total_price
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
                                        row?.description || row.description
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
                      {(show || selectedNowType?.type === "purchase") && (
                        <Box className={styles.MoneySection}>
                          <Box className={styles.MoneyBox}>
                            <Box className={styles.MoneyLabel}>الإجمالي</Box>
                            <Box className={styles.MoneyValue}>
                              {isEditingInvoice
                                ? editingInvoice?.total_amount
                                : selectedInvoice?.total_amount}
                            </Box>
                          </Box>
                          <Box className={styles.MoneyBox}>
                            <Box className={styles.MoneyLabel}>طريقة الدفع</Box>
                            <Box
                              className={styles.MoneyValue}
                              sx={{ padding: "0px" }}
                            >
                              {!isEditingInvoice ? (
                                editingInvoice?.payment_method
                              ) : (
                                <Autocomplete
                                  loading={true}
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
                                  options={[
                                    { label: "Cash", value: "Cash" },
                                    { label: "Visa", value: "Visa" },
                                  ]}
                                  getOptionLabel={(option) => option.label}
                                  value={
                                    [
                                      { label: "Cash", value: "Cash" },
                                      { label: "Visa", value: "Visa" },
                                    ].find(
                                      (option) =>
                                        option.value ===
                                        editingInvoice.payment_method
                                    ) || null
                                  }
                                  onChange={(event, newValue) => {
                                    setEditingInvoice({
                                      ...editingInvoice,
                                      payment_method: newValue
                                        ? newValue.value
                                        : "",
                                    });
                                  }}
                                  sx={{
                                    minWidth: "200px",

                                    "& .MuiAutocomplete-clearIndicator": {
                                      display: "none",
                                    },
                                    "& .MuiAutocomplete-popupIndicator": {},
                                    "& .MuiOutlinedInput-root": {
                                      paddingRight: "35px!important",
                                      fontSize: "1rem",
                                      padding: "0",
                                      paddingLeft: "35px",
                                    },
                                    "& .MuiOutlinedInput-root .MuiOutlinedInput-notchedOutline":
                                      {
                                        border: "none",
                                      },
                                    "& .MuiInputBase-input": {
                                      textAlign: "center",
                                    },
                                  }}
                                  renderInput={(params) => (
                                    <TextField
                                      {...params}
                                      placeholder="طريقة الدفع"
                                      fullWidth
                                    />
                                  )}
                                  isOptionEqualToValue={(option, value) =>
                                    option.value === value.value
                                  }
                                />
                              )}
                            </Box>
                          </Box>
                          <Box className={styles.MoneyBox}>
                            <Box className={styles.MoneyLabel}>المدفوع</Box>
                            <Box className={styles.MoneyValue}>
                              {!isEditingInvoice ? (
                                selectedInvoice?.paid || 0
                              ) : (
                                <NumberInput
                                  style={{
                                    width: "100%",
                                    border: "none",
                                    outline: "none",
                                    height: "40px",
                                    fontSize: "1rem",
                                    textAlign: "center",
                                    paddingLeft: "15px",
                                  }}
                                  value={editingInvoice?.paid}
                                  onChange={(e) =>
                                    setEditingInvoice({
                                      ...editingInvoice,
                                      paid: parseFloat(e.target.value),
                                    })
                                  }
                                />
                              )}
                            </Box>
                          </Box>
                          <Box className={styles.MoneyBox}>
                            <Box className={styles.MoneyLabel}>المتبقى</Box>
                            <Box
                              className={styles.MoneyValue}
                              sx={{ marginBottom: "10px" }}
                            >
                              {isEditingInvoice
                                ? (editingInvoice.paid || 0) -
                                  (editingInvoice.total_amount || 0)
                                : selectedInvoice?.residual}
                            </Box>
                          </Box>
                        </Box>
                      )}
                      {/* comment */}
                      {isEditingInvoice ? (
                        <Box className={styles.commentFieldBox}>
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
                        </Box>
                      ) : (
                        selectedInvoice.comment && (
                          <Box className={styles.commentFieldBox}>
                            {selectedInvoice.comment}
                          </Box>
                        )
                      )}

                      {/* info */}
                      <Box className={styles.infoSection}>
                        <Box className={styles.infoItemBox}>
                          <Box className={styles.infoLabel}>اسم الموظف</Box>
                          <Box className={styles.infoValue}>
                            {selectedInvoice.employee_name}
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
                          <Box className={styles.infoLabel}>عامل المخازن </Box>
                          {selectedInvoice.warehouse_manager}
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
            loader={isInvoiceDeleting}
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
            loader={isArrayDeleting}
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
    } else {
      return (
        <div
          style={{
            height: "100vh",
            display: "flex",
            justifyContent: "center",
            alignItems: "center",
          }}
        >
          <h1 className={styles.head}>هذه الصفحة غير متوفره</h1>
        </div>
      );
    }
  }
}
