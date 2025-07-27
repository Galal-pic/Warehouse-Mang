import styles from "./Invoices.module.css";
import React, { useEffect, useMemo, useState, useRef } from "react";
import { GridToolbarContainer } from "@mui/x-data-grid";
import {
  Box,
  Button,
  CircularProgress,
  Divider,
  Typography,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
} from "@mui/material";
import ClearOutlinedIcon from "@mui/icons-material/ClearOutlined";
import LaunchIcon from "@mui/icons-material/Launch";
import "../../colors.css";
import SnackBar from "../../components/snackBar/SnackBar";
import DeleteRow from "../../components/deleteItem/DeleteRow";
import SaveIcon from "@mui/icons-material/Save";
import EditIcon from "@mui/icons-material/Edit";
import Visibility from "@mui/icons-material/Visibility";
import VisibilityOff from "@mui/icons-material/VisibilityOff";
import CustomDataGrid from "../../components/dataGrid/CustomDataGrid";
import FilterTabs from "../../components/filter/Filter";
import { filtersTypes } from "../../components/filter/Filter";
import { useGetUserQuery } from "../services/userApi";
import {
  useGetInvoicesQuery,
  useDeleteInvoiceMutation,
  useUpdateInvoiceMutation,
  useConfirmInvoiceMutation,
  useReturnWarrantyInvoiceMutation,
  useConfirmTalabSheraaInvoiceMutation,
} from "../services/invoice&warehouseApi";
import PrintableTable from "../../components/printableTable/PrintableTable ";
import PrintIcon from "@mui/icons-material/Print";
import ArticleIcon from "@mui/icons-material/Article";
import InvoiceDetails from "../../components/invoiceDetails/InvoiceDetails";
import InvoiceModal from "../../components/invoice/Invoice";

export default function Invoices() {
  const { data: user, isLoading: isLoadingUser } = useGetUserQuery();

  const [selectedInvoice, setSelectedInvoice] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedNowType, setSelectedNowType] = useState(null);

  useEffect(() => {
    if (!isLoadingUser && user) {
      setSelectedNowType(filtersTypes(user)[filtersTypes(user).length - 1]);
    }
  }, [user, isLoadingUser]);

  // Loaders - Only keep UI-specific loading states
  const [isConfirmDone, setIsConfirmDone] = useState({});
  const [isArrayDeleting, setIsArrayDeleting] = useState(false);
  const [isSaved, setIsSaved] = useState(false);
  const [isInvoiceDeleting, setIsInvoiceDeleting] = useState(false);

  // pagination
  const [paginationModel, setPaginationModel] = useState({
    page: 0,
    pageSize: 10,
  });
  const handlePageChange = (newModel) => {
    setPaginationModel((prev) => ({ ...prev, ...newModel }));
  };

  // Invoices query with pagination
  const {
    data: invoicesData = { invoices: [], total_pages: 1 },
    isLoading: isInvoicesLoading,
    refetch: refetchInvoices,
  } = useGetInvoicesQuery(
    {
      type: selectedNowType?.label,
      page: paginationModel.page,
      page_size: paginationModel.pageSize,
    },
    { pollingInterval: 300000, skip: !selectedNowType?.label }
  );

  // Mutations
  const [deleteInvoice] = useDeleteInvoiceMutation();
  const [updateInvoice] = useUpdateInvoiceMutation();
  const [confirmInvoice] = useConfirmInvoiceMutation();
  const [ReturnWarrantyInvoice] = useReturnWarrantyInvoiceMutation();
  const [confirmTalabSheraaInvoice] = useConfirmTalabSheraaInvoiceMutation();

  // Helper function
  const formatTime = (datetime) => {
    const [date, timeWithSeconds] = datetime.split(" ");
    const [hours, minutes] = timeWithSeconds.split(":");
    const hoursIn12Format = hours % 12 || 12;
    const ampm = hours >= 12 ? "PM" : "AM";
    return `${hoursIn12Format}:${minutes} ${ampm}`;
  };

  const invoices = useMemo(() => {
    return invoicesData.invoices.slice().map((invoice) => {
      let displayStatus;
      if (invoice.status === "draft") {
        displayStatus = "لم تراجع";
      } else if (invoice.status === "accreditation") {
        displayStatus = "لم تؤكد";
      } else if (invoice.status === "confirmed") {
        displayStatus = "تم";
      } else if (invoice.status === "partially_returned") {
        displayStatus = "استرداد جزئي";
      } else if (invoice.status === "returned") {
        displayStatus = "تم الاسترداد";
      } else if (invoice.status === "accepted") {
        displayStatus = "مقبول";
      } else if (invoice.status === "rejected") {
        displayStatus = "مرفوض";
      } else {
        displayStatus = invoice.status;
      }

      return {
        ...invoice,
        status: displayStatus,
        rawStatus: invoice.status,
        itemsNames: invoice.items.map((item) => item.item_name).join(", "),
        date: invoice.created_at.split(" ")[0],
        time: formatTime(invoice.created_at),
        classname:
          invoice.items.some((item) => item.total_price === 0) &&
          invoice?.type !== "تحويل"
            ? "zero-total-price"
            : "",
      };
    });
  }, [invoicesData.invoices]);

  const handleEditInfo = (invoice) => {
    setEditingInvoice(invoice);
    setIsEditingInvoice(true);
  };

  // Simplified delete handler
  const handleDeleteSelectedRows = async () => {
    if (deleteCheckBoxConfirmationText.trim().toLowerCase() === "نعم") {
      const confirmedInvoices = selectedRows.filter(
        (invoice) =>
          invoice.rawStatus === "تم" ||
          invoice.rawStatus === "تم الاسترداد" ||
          invoice.rawStatus === "confirmed" ||
          invoice.rawStatus === "returned"
      );
      if (confirmedInvoices.length > 0) {
        setOpenSnackbar(true);
        setSnackbarMessage("لا يمكن حذف بعض الفواتير");
        setSnackBarType("warning");
        setDeleteDialogCheckBoxOpen(false);
        setDeleteCheckBoxConfirmationText("");
        setIsArrayDeleting(false);
        setSelectedRows([]);
        setRowSelectionModel([]);
        return;
      }

      setIsArrayDeleting(true);
      try {
        for (const invoice of selectedRows) {
          await deleteInvoice(invoice.id).unwrap();
        }
        setOpenSnackbar(true);
        setSnackbarMessage("تم الحذف بنجاح");
        setSnackBarType("success");
      } catch (error) {
        if (error.response && error.response.status === "FETCH_ERROR") {
          setOpenSnackbar(true);
          setSnackbarMessage("خطأ في الوصول إلى قاعدة البيانات");
          setSnackBarType("error");
        } else {
          setOpenSnackbar(true);
          setSnackbarMessage(
            "خطأ في حذف العمليات، قد يكون هناك بيانات متعلقه بها او انها غير موجوده بالفعل"
          );
          setSnackBarType("error");
        }
      } finally {
        setIsArrayDeleting(false);
        setDeleteDialogCheckBoxOpen(false);
        setDeleteCheckBoxConfirmationText("");
        setSelectedRows([]);
        setRowSelectionModel([]);
      }
    }
  };

  // Simplified delete handler
  const [rowSelectionModel, setRowSelectionModel] = useState([]);

  // Confirm Invoice
  const handleInvoiceAction = async (id) => {
    setIsConfirmDone((prev) => ({ ...prev, [id]: true }));
    try {
      await confirmInvoice(id).unwrap();
      setOpenSnackbar(true);
      setSnackbarMessage("تم التحديث بنجاح");
      setSnackBarType("success");
    } catch (error) {
      if (error.response && error.response.status === "FETCH_ERROR") {
        setOpenSnackbar(true);
        setSnackbarMessage("خطأ في الوصول إلى قاعدة البيانات");
        setSnackBarType("error");
      } else {
        setOpenSnackbar(true);
        setSnackbarMessage(
          "خطأ في التحديث، إذا استمرت المشكله حاول اعادة تحميل الصفحة"
        );
        setSnackBarType("error");
      }
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

    // Step 3: Filter and validate items
    let newRows = editingInvoice.items;

    // Step 4: Prepare newRows with counter
    newRows = newRows.map((row, index) => ({
      ...row,
      counter: index + 1,
      item_name: row.item_name,
      barcode: row.barcode,
      quantity: row.quantity,
      location: row.location,
      total_price: row.total_price,
      unit_price: Number(row.unit_price),
      description: row.description,
    }));

    // Step 5: Update the invoice object
    const updatedInvoice = {
      id: editingInvoice.id,
      type: editingInvoice.type,
      machine_name: editingInvoice.machine_name,
      mechanism_name: editingInvoice.mechanism_name,
      total_amount: editingInvoice.total_amount,
      paid: editingInvoice?.paid || 0,
      residual: editingInvoice?.paid - editingInvoice.total_amount || 0,
      payment_method: editingInvoice?.payment_method,
      custody_person:
        editingInvoice?.payment_method === "Custody"
          ? editingInvoice?.custody_person
          : null,
      employee_name: editingInvoice.employee_name,
      client_name: editingInvoice.client_name,
      warehouse_manager: editingInvoice.warehouse_manager,
      comment: editingInvoice.comment,
      original_invoice_id:
        editingInvoice.type === "مرتجع"
          ? editingInvoice.original_invoice_id
          : undefined,
      items: newRows.map((row) => ({
        supplier_name: row.supplier_name,
        item_name: row.item_name,
        barcode: row.barcode,
        location: row.location,
        quantity: Number(row.quantity),
        total_price: row.total_price,
        unit_price: Number(row.unit_price),
        description: row.description,
        price_details: row.price_details,
      })),
    };
    console.log("updatedInvoice", updatedInvoice);

    setIsSaved(true);

    try {
      await updateInvoice(updatedInvoice).unwrap();
      refetchInvoices();
      setOpenSnackbar(true);
      setSnackbarMessage("تم التعديل بنجاح");
      setSnackBarType("success");
      setIsEditingInvoice(false);
      setIsModalOpen(true);
      openInvoice(updatedInvoice.id);
      setSelectedInvoice(updatedInvoice);
    } catch (error) {
      if (error.response && error.response.status === "FETCH_ERROR") {
        setOpenSnackbar(true);
        setSnackbarMessage("خطأ في الوصول إلى قاعدة البيانات");
        setSnackBarType("error");
      } else if (
        error?.data?.message?.includes("exceeds") ||
        error?.data?.message?.includes("enough")
      ) {
        setOpenSnackbar(true);
        setSnackbarMessage("الكمية التى يتم ارجاعها تفوق الحد المسموح");
        setSnackBarType("error");
      } else {
        setOpenSnackbar(true);
        setSnackbarMessage(
          "خطأ في التعديل، قد يكون هناك تعارض في البيانات الجديده مع بيانات اخرى"
        );
        setSnackBarType("error");
      }
    } finally {
      setIsSaved(false);
    }
  };

  // Recovery
  const [loadingRowsReturn, setLoadingRowsReturn] = useState({});
  const handleRecovery = async (id) => {
    setLoadingRowsReturn((prev) => ({ ...prev, [id]: true }));
    try {
      await ReturnWarrantyInvoice({ id }).unwrap();
      setSnackbarMessage("تم التحديث بنجاح");
      setSnackBarType("success");
    } catch (error) {
      if (error.response && error.response.status === "FETCH_ERROR") {
        setOpenSnackbar(true);
        setSnackbarMessage("خطأ في الوصول إلى قاعدة البيانات");
        setSnackBarType("error");
      } else {
        setOpenSnackbar(true);
        setSnackbarMessage(
          "خطأ في التحديث، إذا استمرت المشكله حاول اعادة تحميل الصفحة"
        );
        setSnackBarType("error");
      }
    } finally {
      setOpenSnackbar(true);
      setLoadingRowsReturn((prev) => ({ ...prev, [id]: false }));
    }
  };

  // Delete Single Invoice
  const handleDelete = async () => {
    if (deleteConfirmationText.trim().toLowerCase() === "نعم") {
      setIsInvoiceDeleting(true);
      try {
        await deleteInvoice(selectedUserId).unwrap();
        setOpenSnackbar(true);
        setSnackbarMessage("تم الحذف بنجاح");
        setSnackBarType("success");
      } catch (error) {
        if (error.response && error.response.status === "FETCH_ERROR") {
          setOpenSnackbar(true);
          setSnackbarMessage("خطأ في الوصول إلى قاعدة البيانات");
          setSnackBarType("error");
        } else {
          setOpenSnackbar(true);
          setSnackbarMessage(
            "خطأ في الحذف، قد يكون هناك بيانات متعلقه بها او انها غير موجوده بالفعل"
          );
          setSnackBarType("error");
        }
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
    setSelectedInvoice({ ...invoice });
    setIsModalOpen(true);
  };
  const closeModal = () => {
    setShow(false);
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
  function CustomToolbar({ columnVisibilityModel }) {
    const printableTableRef = useRef(null);

    const handlePrint = () => {
      if (printableTableRef.current) {
        const printWindowFrame = document.createElement("iframe");
        printWindowFrame.style.position = "absolute";
        printWindowFrame.style.width = "0px";
        printWindowFrame.style.height = "0px";
        printWindowFrame.style.border = "none";
        document.body.appendChild(printWindowFrame);

        const iframeDocument = printWindowFrame.contentWindow.document;
        iframeDocument.open();

        iframeDocument.write(`
        <html>
          <head>
            <title>Print</title>
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
            ${printableTableRef.current.innerHTML}
          </body>
        </html>
      `);

        iframeDocument.close();

        setTimeout(() => {
          printWindowFrame.contentWindow.focus();
          printWindowFrame.contentWindow.print();
          document.body.removeChild(printWindowFrame);
        }, 300);
      }
    };

    return (
      <GridToolbarContainer
        sx={{
          textAlign: "center",
          direction: "rtl",
        }}
      >
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
                  top: "4px",
                  left: "0",
                  direction: "ltr",
                }}
              >
                حذف المحدد ({selectedRows.length})
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
            direction: "ltr",
          }}
        >
          طباعة التقرير
        </Button>
        <PrintableTable
          ref={printableTableRef}
          data={invoices}
          columns={columns}
          columnVisibilityModel={columnVisibilityModel}
        />
      </GridToolbarContainer>
    );
  }

  // manage Details component
  const [isInvoiceDetailsOpen, setIsInvoiceDetailsOpen] = useState(false);
  const [invoiceId, setInvoiceId] = useState(null);
  const showInvoiceDetails = (id) => {
    setInvoiceId(id);
    setIsInvoiceDetailsOpen(true);
  };

  // accept or reject sheraa talab
  const [rejectDialogOpen, setRejectDialogOpen] = useState(false);
  const [rejectReason, setRejectReason] = useState("");
  const [selectedInvoiceId, setSelectedInvoiceId] = useState(null);

  const handleRejectInvoice = (id) => {
    setSelectedInvoiceId(id);
    setRejectDialogOpen(true);
    setRejectReason("");
  };

  const handleConfirmReject = async () => {
    if (!rejectReason.trim()) {
      setOpenSnackbar(true);
      setSnackbarMessage("يرجى إدخال سبب الرفض");
      setSnackBarType("error");
      return;
    }

    setIsConfirmDone((prev) => ({ ...prev, [selectedInvoiceId]: true }));
    try {
      await confirmTalabSheraaInvoice({
        id: selectedInvoiceId,
        isPurchaseApproved: false,
      }).unwrap();

      const invoice = invoices.find((inv) => inv.id === selectedInvoiceId);
      if (!invoice) {
        throw new Error("الفاتورة غير موجودة");
      }

      await updateInvoice({
        ...invoice,
        id: selectedInvoiceId,
        comment: rejectReason,
      }).unwrap();

      setOpenSnackbar(true);
      setSnackbarMessage("تم رفض الفاتورة بنجاح");
      setSnackBarType("success");
      refetchInvoices();
    } catch (error) {
      console.log(error);
      setOpenSnackbar(true);
      setSnackbarMessage("خطأ في رفض الفاتورة أو تحديث التعليق");
      setSnackBarType("error");
    } finally {
      setIsConfirmDone((prev) => ({ ...prev, [selectedInvoiceId]: false }));
      setRejectDialogOpen(false);
      setRejectReason("");
      setSelectedInvoiceId(null);
    }
  };
  const handleAcceptInvoice = async (id) => {
    setIsConfirmDone((prev) => ({ ...prev, [id]: true }));
    try {
      await confirmTalabSheraaInvoice({
        id,
        isPurchaseApproved: true,
      }).unwrap();
      setOpenSnackbar(true);
      setSnackbarMessage("تم قبول الفاتورة بنجاح");
      setSnackBarType("success");
      refetchInvoices();
    } catch (error) {
      console.log(error);
      setOpenSnackbar(true);
      setSnackbarMessage("خطأ في قبول الفاتورة");
      setSnackBarType("error");
    } finally {
      setIsConfirmDone((prev) => ({ ...prev, [id]: false }));
    }
  };

  // columns
  const columns = [
    {
      field: "refresh",
      headerName: "فتح الفاتورة",
      width: selectedNowType?.label === "أمانات" ? 250 : 200,
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
              selectedNowType?.label !== "اضافه" &&
              selectedNowType?.label !== "مرتجع" &&
              selectedNowType?.label !== "طلب شراء" &&
              params.row.type !== "اضافه" &&
              params.row.type !== "طلب شراء" && (
                <button
                  className={styles.iconBtn}
                  onClick={() => showInvoiceDetails(params.row)}
                  style={{ color: "#d32f2f" }}
                >
                  <ArticleIcon sx={{ color: secondColor }} />
                </button>
              )}
            {selectedNowType?.label === "أمانات" &&
              (params.row.status === "تم الاسترداد" ? (
                "تم الاسترداد"
              ) : params.row.status === "استرداد جزئي" ? (
                "استرداد جزئي"
              ) : (
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
                    (user?.username !== "admin" && !user?.can_recover_deposits)
                  }
                >
                  {loadingRowsReturn[params.row.id] ? (
                    <CircularProgress size={24} />
                  ) : (
                    "استرداد"
                  )}
                </Button>
              ))}
          </div>
        );
      },
    },
    {
      width: 200,
      field: "status",
      headerName: "حالة العملية",
      renderCell: (params) => {
        const { status, rawStatus, id, type } = params.row;
        const isLoading = isConfirmDone[id] || false;

        if (status === "تم" || status === "تم الاسترداد") {
          return "تم";
        }
        if (status === "استرداد جزئي") {
          return "استرداد جزئي";
        }
        if (status === "مقبول") {
          return "مقبول";
        }
        if (status === "مرفوض") {
          return "مرفوض";
        }

        if (type === "طلب شراء" && rawStatus === "draft") {
          return (
            <div
              style={{
                display: "flex",
                gap: "8px",
                justifyContent: "center",
                marginTop: "4px",
              }}
            >
              <Button
                variant="contained"
                color="success"
                onClick={() => handleAcceptInvoice(id)}
                sx={{
                  borderRadius: "8px",
                  padding: "6px 10px",
                }}
                disabled={
                  isLoading ||
                  !(user?.can_confirm_withdrawal || user?.username === "admin")
                }
              >
                {isLoading ? <CircularProgress size={24} /> : "قبول"}
              </Button>
              <Button
                variant="contained"
                color="error"
                onClick={() => handleRejectInvoice(id)}
                sx={{
                  borderRadius: "8px",
                  padding: "6px 10px",
                }}
                disabled={
                  isLoading ||
                  !(user?.can_confirm_withdrawal || user?.username === "admin")
                }
              >
                {isLoading ? <CircularProgress size={24} /> : "رفض"}
              </Button>
            </div>
          );
        }

        let buttonText = status;
        let buttonColor = rawStatus === "draft" ? "error" : "primary";

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
              (rawStatus === "draft" &&
                !(
                  user?.can_confirm_withdrawal || user?.username === "admin"
                )) ||
              (rawStatus === "accreditation" &&
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
  // edited invoice
  const [isEditingInvoice, setIsEditingInvoice] = useState(false);
  const [editingInvoice, setEditingInvoice] = useState(null);
  useEffect(() => {
    if (selectedInvoice) {
      setEditingInvoice({ ...selectedInvoice });
    }
  }, [selectedInvoice]);

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

  // Delete Single Invoice
  const handleDeleteClick = (id) => {
    const invoice = invoices.find((item) => item.id === id);
    if (
      invoice?.rawStatus === "تم" ||
      invoice?.rawStatus === "تم الاسترداد" ||
      invoice?.rawStatus === "confirmed" ||
      invoice?.rawStatus === "returned"
    ) {
      setOpenSnackbar(true);
      setSnackbarMessage("لا يمكن حذف هذه الفاتورة");
      setSnackBarType("warning");
      return;
    }

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
      user?.view_purchase_requests ||
      user?.view_transfers ||
      user?.username === "admin"
    ) {
      return (
        <div className={styles.container}>
          <h1 className={styles.head}> العمليات</h1>
          {/* filter type invoice */}
          <FilterTabs
            setNowType={setSelectedNowType}
            setSelectedRows={setSelectedRows}
            setPaginationModel={setPaginationModel}
          />
          {/* invoices data */}
          <CustomDataGrid
            rows={invoices}
            columns={columns}
            paginationModel={paginationModel}
            onPageChange={handlePageChange}
            pageCount={invoicesData.total_pages}
            CustomToolbarFromComponent={CustomToolbar}
            loader={isInvoicesLoading}
            checkBox={true}
            setSelectedRows={setSelectedRows}
            selectedRows={selectedRows}
            rowSelectionModel={rowSelectionModel}
            setRowSelectionModel={setRowSelectionModel}
          />

          {/* invoice details data */}
          {isInvoiceDetailsOpen && (
            <InvoiceDetails
              open={isInvoiceDetailsOpen}
              onClose={() => setIsInvoiceDetailsOpen(false)}
              invoice={invoiceId}
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
                        onClick={() => setIsEditingInvoice(false)}
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
                        onClick={handleSave}
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
                      {(user?.can_edit || user?.username === "admin") &&
                        selectedInvoice?.rawStatus !== "confirmed" &&
                        selectedInvoice?.status !== "تم" && (
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
                  {(user?.view_prices || user?.username === "admin") &&
                    selectedInvoice?.type !== "طلب شراء" &&
                    selectedInvoice?.type !== "تحويل" && (
                      <button
                        onClick={() => setShow(!show)}
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
                <InvoiceModal
                  selectedInvoice={selectedInvoice}
                  isEditingInvoice={isEditingInvoice}
                  editingInvoice={editingInvoice}
                  setEditingInvoice={setEditingInvoice}
                  show={show}
                  selectedNowType={selectedNowType}
                  addRow={addRow}
                  handleDeleteItemClick={handleDeleteItemClick}
                  justEditUnitPrice={true}
                  canEsterdad={
                    user?.can_recover_deposits || user?.username === "admin"
                  }
                  setSelectedInvoice={setSelectedInvoice}
                />
                <Divider sx={{ marginTop: 5 }} />

                <Box
                  sx={{
                    mt: 3,
                    textAlign: "center",
                    display: "flex",
                    justifyContent: "space-around",
                  }}
                >
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

          {/* reject talab sheraa */}
          <Dialog
            open={rejectDialogOpen}
            onClose={() => setRejectDialogOpen(false)}
            dir="rtl"
          >
            <DialogTitle>سبب رفض الفاتورة</DialogTitle>
            <DialogContent>
              <textarea
                autoFocus
                style={{
                  margin: "dense",
                  width: "250px",
                  textAlign: "right",
                  padding: "10px 10px",
                }}
                placeholder="سبب الرفض"
                rows={4}
                value={rejectReason}
                onChange={(e) => setRejectReason(e.target.value)}
              />
            </DialogContent>
            <DialogActions
              sx={{ display: "flex", justifyContent: "space-around" }}
            >
              <Button
                onClick={() => setRejectDialogOpen(false)}
                color="primary"
                variant="contained"
              >
                إلغاء
              </Button>
              <Button
                onClick={handleConfirmReject}
                color="error"
                variant="contained"
                disabled={
                  isConfirmDone[selectedInvoiceId] || !rejectReason.trim()
                }
              >
                {isConfirmDone[selectedInvoiceId] ? (
                  <CircularProgress size={24} />
                ) : (
                  "تأكيد الرفض"
                )}
              </Button>
            </DialogActions>
          </Dialog>

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
