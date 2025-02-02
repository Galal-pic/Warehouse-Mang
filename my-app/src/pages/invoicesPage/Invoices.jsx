import styles from "./Invoices.module.css";
import React, { useEffect, useMemo, useState } from "react";
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
  Checkbox,
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
import PublishedWithChangesIcon from "@mui/icons-material/PublishedWithChanges";
import CustomDataGrid from "../../components/dataGrid/CustomDataGrid";
import NumberInput from "../../components/number/NumberInput";
import CustomAutoCompleteField from "../../components/customAutoCompleteField/CustomAutoCompleteField";
import FilterTabs from "../../components/filter/Filter";

export default function Invoices() {
  const API_BASE_URL = process.env.REACT_APP_API_BASE_URL;

  const [invoices, setInvoices] = useState([]);
  const [selectedInvoice, setSelectedInvoice] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  // loaders
  const [isConfirmDone, setIsConfirmDone] = useState(false);
  const [isInvoicesLoading, setIsInvoicesLoading] = useState(false);
  const [isArrayDeleting, setIsArrayDeleting] = useState(false);
  const [isSaved, setIsSaved] = useState(false);
  const [isInvoiceDeleting, setIsInvoiceDeleting] = useState(false);
  const [isSupliersLoading, setIsSupliersLoading] = useState(false);
  const [isMacinesLoading, setIsMacinesLoading] = useState(false);
  const [isMechanismsLoading, setIsMechanismsLoading] = useState(false);
  const [isWareHousesLoading, setIsWareHousesLoading] = useState(false);
  const [isRefresh, setIsRefresh] = useState(false);

  // fetch machines
  const [supliers, setSupliers] = useState([]);
  const [machines, setMachines] = useState([]);
  const [mechanisms, setMechanisms] = useState([]);
  const [warehouse, setWarehouse] = useState([]);
  const fetchFun = async (url, setValues) => {
    const accessToken = localStorage.getItem("access_token");
    if (!accessToken) return;
    try {
      const response = await fetch(url, {
        method: "GET",
        headers: { Authorization: `Bearer ${accessToken}` },
      });
      const data = await response.json();
      setValues(data);
    } catch (err) {
      console.error("Error fetching user data:", err);
    }
  };
  const fetchSupliersData = () =>
    fetchFun(`${API_BASE_URL}/supplier/`, setSupliers, setIsSupliersLoading);
  const fetchMachinesData = () =>
    fetchFun(`${API_BASE_URL}/machine/`, setMachines, setIsMacinesLoading);
  const fetchMechanismsData = () =>
    fetchFun(
      `${API_BASE_URL}/mechanism/`,
      setMechanisms,
      setIsMechanismsLoading
    );
  const fetchWareHousesData = () =>
    fetchFun(
      `${API_BASE_URL}/warehouse/`,
      setWarehouse,
      setIsWareHousesLoading
    );
  useEffect(() => {
    fetchSupliersData();
    fetchMachinesData();
    fetchMechanismsData();
    fetchWareHousesData();
  }, []);

  // select Now Type
  const [selectedNowType, setSelectedNowType] = useState({
    label: "صرف",
    type: "operation",
    url: "/invoice/صرف",
    status: true,
  });

  // fetch invoices
  const fetchInvoicesData = async () => {
    const accessToken = localStorage.getItem("access_token");
    if (!accessToken) return;
    setIsInvoicesLoading(true);
    try {
      const response = await fetch(`${API_BASE_URL}${selectedNowType.url}`, {
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
            itemsNames: invoice.items.map((item) => item.item_name).join(", "),
            date,
            time,
            items: invoice.items.map((item) => {
              const matchedItem = warehouse.find(
                (warehouseItem) => warehouseItem.item_name === item.item_name
              );

              if (matchedItem) {
                const currentLocation = matchedItem.locations.find(
                  (location) => location.location === item.location
                );
                return {
                  ...item,
                  priceunit: currentLocation ? currentLocation.price_unit : 0,
                  maxquantity: currentLocation
                    ? currentLocation.quantity + item.quantity
                    : 0,
                  availableLocations: matchedItem.locations,
                };
              }

              return {
                ...item,
                priceunit: 0,
                maxquantity: 0,
                availableLocations: [],
              };
            }),
          };
        })
        .reverse();
      setInvoices(updatedData);
    } catch (err) {
      console.error("Error fetching user data:", err);
    } finally {
      setIsInvoicesLoading(false);
    }
  };
  useEffect(() => {
    fetchInvoicesData();
  }, [warehouse, selectedNowType]);

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
      setSelectedRows(invoices.map((row) => row.id));
    } else {
      setSelectedRows([]);
    }
  };

  // delete selected invoices
  const handleDeleteSelectedRows = async (selectedIds) => {
    const accessToken = localStorage.getItem("access_token");
    setIsArrayDeleting(true);
    try {
      await Promise.all(
        selectedIds.map(async (id) => {
          const response = await fetch(`${API_BASE_URL}/invoice/${id}`, {
            method: "DELETE",
            headers: { Authorization: `Bearer ${accessToken}` },
          });

          if (!response.ok) {
            throw new Error("Failed to delete invoice");
          }
        })
      );
      await fetchInvoicesData();
      setDeleteDialogCheckBoxOpen(false);
      setDeleteCheckBoxConfirmationText("");
      setOpenSnackbar(true);
      setSnackbarMessage("تم الحذف بنجاح");
      setSnackBarType("success");
    } catch (error) {
      console.error("Error deleting invoices:", error);
      setOpenSnackbar(true);
      setSnackbarMessage("حدث خطأ أثناء الحذف");
      setSnackBarType("error");
    } finally {
      setIsArrayDeleting(false);
    }
  };
  // custom toolbar
  function CustomToolbar() {
    const handleRefresh = async () => {
      console.log("refresh");
      const accessToken = localStorage.getItem("access_token");
      setIsRefresh(true);
      try {
        const response = await fetch(`${API_BASE_URL}/invoice/test`, {
          method: "GET",
          headers: { Authorization: `Bearer ${accessToken}` },
        });

        if (!response.ok) {
          throw new Error("Failed to refresh invoice");
        }
        await fetchInvoicesData();
        setOpenSnackbar(true);
        setSnackbarMessage("تم التحديث بنجاح");
        setSnackBarType("success");
      } catch (error) {
        console.error("Error post invoice:", error);
        setOpenSnackbar(true);
        setSnackbarMessage("حدث خطأ أثناء التحديث حاول مرة اخرى");
        setSnackBarType("error");
      } finally {
        setIsRefresh(false);
      }
    };
    return (
      <GridToolbarContainer
        sx={{
          textAlign: "center",
        }}
      >
        {/* Add Delete Button */}
        <Button
          variant="contained"
          color="success"
          startIcon={<PublishedWithChangesIcon />}
          onClick={handleRefresh}
          sx={{
            position: "absolute",
            top: "15px",
            fontWeight: "bold",
          }}
          disabled={isRefresh}
        >
          {isRefresh ? <CircularProgress size={24} /> : "استكمال البيانات"}
        </Button>
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
              right: "0",
            }}
          >
            حذف المحدد ({selectedRows.length})
          </Button>
        )}
      </GridToolbarContainer>
    );
  }

  // handle confirm
  const getButtonText = (invoiceType) => {
    switch (invoiceType) {
      case "صرف":
        return "صرف الفاتورة";
      case "أمانات":
        return "صرف الأمانة";
      case "حجز":
        return "تاكيد الحجز";
      case "مرتجع":
        return "تاكيد الاسترجاع";
      default:
        return "صرف الفاتورة";
    }
  };

  const handleInvoiceAction = async (id) => {
    const accessToken = localStorage.getItem("access_token");
    setIsConfirmDone((prev) => ({ ...prev, [id]: true }));
    try {
      const response = await fetch(`${API_BASE_URL}/invoice/${id}/confirm`, {
        method: "POST",
        headers: { Authorization: `Bearer ${accessToken}` },
        body: JSON.stringify({}),
      });

      if (!response.ok) {
        throw new Error("Failed to update invoice");
      }
      await fetchInvoicesData();
      setOpenSnackbar(true);
      setSnackbarMessage("تم التحديث بنجاح");
      setSnackBarType("success");
    } catch (error) {
      console.error("Error post invoice:", error);
      setOpenSnackbar(true);
      setSnackbarMessage("حدث خطأ أثناء التحديث حاول مرة اخرى");
      setSnackBarType("error");
    } finally {
      setIsConfirmDone((prev) => ({ ...prev, [id]: false }));
    }
  };

  // columns
  const columns = [
    {
      field: "actions",
      headerName: "فتح الفاتورة",
      width: selectedNowType.label === "أمانات" ? 180 : 100,
      renderCell: (params) => {
        // const isLoading = isConfirmDone[params.row.id] || false;
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
            <button
              className={styles.iconBtn}
              onClick={() => handleDeleteClick(params.id)}
              style={{ color: "#d32f2f" }}
            >
              <ClearOutlinedIcon />
            </button>
            {selectedNowType.label === "أمانات" &&
              (params.row.test !== "" ? (
                <Button
                  variant="contained"
                  color="info"
                  onClick={() => console.log(params.row)}
                  sx={{
                    borderRadius: "8px",
                    padding: "6px 16px",
                  }}
                  // disabled={isLoading}
                >
                  استرداد
                </Button>
              ) : (
                "تم الاسترداد"
              ))}
          </div>
        );
      },
    },
    ...(selectedNowType.status
      ? [
          {
            width: 150,
            field: "status",
            headerName: "حالة العملية",
            renderCell: (params) => {
              if (params.row.status === "confirmed") {
                return "تم";
              } else {
                const invoiceType = selectedNowType.label;
                const buttonText = getButtonText(invoiceType);
                const isLoading = isConfirmDone[params.row.id] || false;
                return (
                  <Button
                    variant="contained"
                    color="error"
                    onClick={() => handleInvoiceAction(params.row.id)}
                    sx={{
                      borderRadius: "8px",
                      padding: "6px 16px",
                    }}
                    disabled={isLoading}
                  >
                    {isLoading ? <CircularProgress size={24} /> : buttonText}
                  </Button>
                );
              }
            },
          },
        ]
      : []),
    { flex: 1, field: "itemsNames", headerName: "أسماء العناصر" },
    { flex: 1, field: "mechanism_name", headerName: "الميكانيزم" },
    { flex: 1, field: "machine_name", headerName: "الماكينة" },
    { flex: 1, field: "employee_name", headerName: "اسم الموظف" },
    { flex: 1, field: "warehouse_manager", headerName: "عامل المخازن" },
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
            selectedRows.length === invoices.length && invoices.length > 0
          }
          indeterminate={
            selectedRows.length > 0 && selectedRows.length < invoices.length
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
  const handleSave = async () => {
    // Step 1: Check if there are any changes
    if (JSON.stringify(editingInvoice) === JSON.stringify(selectedInvoice)) {
      setIsEditingInvoice(false);
      setEditingInvoice(null);
      return;
    }

    // Step 2: Validate required fields
    if (selectedNowType.type === "purchase") {
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
        description: row.description,
      })),
    };
    console.log("updatedInvoice", updatedInvoice);

    const accessToken = localStorage.getItem("access_token");

    setIsSaved(true);
    try {
      // Step 6: Send the update request
      const updateResponse = await fetch(
        `${API_BASE_URL}/invoice/${editingInvoice.id}`,
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
        const errorData = await updateResponse.json(); // Get server error details
        console.error("Server Error:", errorData);
        throw new Error(errorData.message || "Failed to update invoice");
      }

      // Step 8: Update state with new data
      setSelectedInvoice({ ...editingInvoice, items: newRows });
      setEditingInvoice(null);
      setIsEditingInvoice(false);
      fetchInvoicesData();

      // Step 9: Show success message
      setOpenSnackbar(true);
      setSnackbarMessage("تم تعديل الفاتورة");
      setSnackBarType("success");
    } catch (error) {
      console.error("Error updating invoice:", error);

      // Step 10: Show error message
      setOpenSnackbar(true);
      setSnackbarMessage(
        "خطأ في تحديث الفاتورة اذا استمرت المشكله قم باعادة تحميل الصفحة"
      );
      setSnackBarType("error");
    } finally {
      setIsSaved(false);
    }
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
      setIsInvoiceDeleting(true);
      try {
        const response = await fetch(
          `${API_BASE_URL}/invoice/${selectedUserId}`,
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
      } finally {
        setIsInvoiceDeleting(false);
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
  const [isUserLoading, setIsUserLoading] = useState(false);
  const [user, setUser] = useState({});
  useEffect(() => {
    const fetchUserData = async () => {
      const accessToken = localStorage.getItem("access_token");

      if (!accessToken) {
        console.error("No access token found.");
        return;
      }

      setIsUserLoading(true);
      setTimeout(async () => {
        try {
          const response = await fetch(`${API_BASE_URL}/auth/user`, {
            method: "GET",
            headers: {
              Authorization: `Bearer ${accessToken}`,
            },
          });

          if (!response.ok) {
            throw new Error(
              `Failed to fetch user data: ${response.statusText}`
            );
          }

          const data = await response.json();
          setUser(data);
          return data;
        } catch (err) {
          console.error("Error fetching user data:", err);
        } finally {
          setIsUserLoading(false);
        }
      }, 2000);
    };

    fetchUserData();
  }, [API_BASE_URL]);
  // if (isUserLoading) {
  //   return (
  //     <div
  //       style={{
  //         height: "100vh",
  //         display: "flex",
  //         justifyContent: "center",
  //         alignItems: "center",
  //       }}
  //     >
  //       <h1 className={styles.head}>
  //         {" "}
  //         <CircularProgress />
  //       </h1>
  //     </div>
  //   );
  // } else {
  //   if (user.username === "esraa") {
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
            CustomToolbar={CustomToolbar}
            loader={isInvoicesLoading}
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
                        disabled={isSaved}
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
                        {isSaved ? (
                          <CircularProgress size={24} />
                        ) : (
                          <SaveIcon />
                        )}
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
                            {selectedNowType.type === "purchase" && (
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
                                      values={supliers}
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
                                    loading={isMacinesLoading}
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
                              {selectedNowType.type === "purchase" && (
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
                                        itemNames.find(
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
                                        row.availableLocations.find(
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
                                          editingInvoice.items.find(
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
                                          priceunit: newValue?.price_unit,
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
                                        selectedNowType.type === "purchase" &&
                                        row.maxquantity
                                      }
                                      value={row?.quantity}
                                      onInput={(e) => {
                                        if (e.target.value < 0) {
                                          e.target.value = 0;
                                        }
                                        if (
                                          (selectedNowType.type ===
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
                                            newQuantity * row.priceunit,
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
                                {selectedNowType.type === "purchase" && (
                                  <>
                                    <TableCell className={styles.tableCellRow}>
                                      {row.priceunit}
                                    </TableCell>
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
                      {selectedNowType.type === "purchase" && (
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
                      {selectedInvoice.comment.trim() === "" ? (
                        ""
                      ) : (
                        <Box className={styles.commentFieldBox}>
                          {selectedInvoice.comment}
                        </Box>
                      )}
                      {isEditingInvoice && (
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
                      )}

                      {/* note
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
  //   } else {
  //     return (
  //       <div
  //         style={{
  //           height: "100vh",
  //           display: "flex",
  //           justifyContent: "center",
  //           alignItems: "center",
  //         }}
  //       >
  //         <h1 className={styles.head}>هذه الصفحة غير متوفره</h1>
  //       </div>
  //     );
  //   }
  // }
}
