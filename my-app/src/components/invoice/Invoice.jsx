import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  Box,
  Table,
  TableBody,
  TableRow,
  TableCell,
  Autocomplete,
  TextField,
  Dialog,
  IconButton,
  CircularProgress,
} from "@mui/material";
import ClearOutlinedIcon from "@mui/icons-material/ClearOutlined";
import AddIcon from "@mui/icons-material/Add";
import VisibilityIcon from "@mui/icons-material/Visibility";
import CustomAutoCompleteField from "../../components/customAutoCompleteField/CustomAutoCompleteField";
import NumberInput from "../../components/number/NumberInput";
import styles from "./Invoices.module.css";
import logo from "./logo.png";
import SnackBar from "../snackBar/SnackBar";
import { useGetSuppliersQuery } from "../../pages/services/supplierApi";
import { useGetMachinesQuery } from "../../pages/services/machineApi";
import { useGetMechanismsQuery } from "../../pages/services/mechanismApi";
import {
  useGetInvoiceQuery,
  useGetInvoicesNumbersQuery,
  useReturnWarrantyInvoicePartiallyMutation,
  useGetWarehousesQuery,
  useReturnWarrantyInvoiceMutation,
} from "../../pages/services/invoice&warehouseApi";
import KeyboardReturnIcon from "@mui/icons-material/KeyboardReturn";

export default function InvoiceModal({
  selectedInvoice,
  isEditingInvoice,
  editingInvoice,
  setEditingInvoice,
  show,
  selectedNowType,
  addRow,
  handleDeleteItemClick,
  isPurchasesType = false,
  isCreate = false,
  showCommentField = false,
  className = "",
  justEditUnitPrice = false,
  canEsterdad = false,
  setSelectedInvoice = null,
}) {
  // Data from API
  const isAdditionType =
    selectedNowType?.type === "اضافه" ||
    selectedInvoice?.type === "اضافه" ||
    editingInvoice?.type === "اضافه";

  const {
    data: suppliersData,
    isLoading: isSuppliersLoading,
    refetch: refetchSuppliers,
  } = useGetSuppliersQuery(
    { all: true },
    {
      pollingInterval: 300000,
      skip: !isEditingInvoice || !isAdditionType || justEditUnitPrice,
    } // Only fetch when editing and isAdditionType
  );
  const suppliers = suppliersData?.suppliers || [];

  const {
    data: machinesData,
    isLoading: isMachinesLoading,
    refetch: refetchMachines,
  } = useGetMachinesQuery(
    { all: true },
    { pollingInterval: 300000, skip: !isEditingInvoice || justEditUnitPrice } // Only fetch when editing
  );
  const machines = machinesData?.machines || [];

  const {
    data: mechanismsData,
    isLoading: isMechanismsLoading,
    refetch: refetchMechanisms,
  } = useGetMechanismsQuery(
    { all: true },
    { pollingInterval: 300000, skip: !isEditingInvoice || justEditUnitPrice } // Only fetch when editing
  );
  const mechanisms = mechanismsData?.mechanisms || [];

  const {
    data: warehouseData,
    isLoading: isWarehousesLoading,
    refetch: refetchWarehouses,
  } = useGetWarehousesQuery(
    { all: true },
    { pollingInterval: 300000, skip: !isEditingInvoice || justEditUnitPrice }
  );
  const warehouse = warehouseData?.warehouses || [];

  // Fetch invoices with all=true
  const isMortaga3Type = useMemo(
    () =>
      selectedNowType?.type === "مرتجع" ||
      selectedInvoice?.type === "مرتجع" ||
      editingInvoice?.type === "مرتجع",
    [selectedNowType?.type, selectedInvoice?.type, editingInvoice?.type]
  );

  const isAmanatType = useMemo(
    () =>
      selectedNowType?.type === "أمانات" ||
      selectedInvoice?.type === "أمانات" ||
      editingInvoice?.type === "أمانات",
    [selectedNowType?.type, selectedInvoice?.type, editingInvoice?.type]
  );
  const isEdafaType = useMemo(
    () =>
      selectedNowType?.type === "اضافه" ||
      selectedInvoice?.type === "اضافه" ||
      editingInvoice?.type === "اضافه",
    [selectedNowType?.type, selectedInvoice?.type, editingInvoice?.type]
  );

  const isTransferType = useMemo(
    () =>
      selectedNowType?.type === "تحويل" ||
      selectedInvoice?.type === "تحويل" ||
      editingInvoice?.type === "تحويل",
    [selectedNowType?.type, selectedInvoice?.type, editingInvoice?.type]
  );

  const {
    data: invoicesData,
    isLoading: isInvoiceNumbersLoading,
    refetch: refetcInvoicesNumbers,
    isError: isInvoiceNumbersError,
  } = useGetInvoicesNumbersQuery(undefined, {
    pollingInterval: 300000,
    skip:
      !isEditingInvoice ||
      !isMortaga3Type ||
      !editingInvoice?.type ||
      justEditUnitPrice,
  });

  const invoiceNumbers = invoicesData?.["sales-invoices"]?.map((number) =>
    number.toString()
  );

  useEffect(() => {
    if (isInvoiceNumbersError) {
      setSnackBarType("error");
      setSnackbarMessage("فشل تحميل أرقام الفواتير");
      setOpenSnackbar(true);
    }
  }, [isInvoiceNumbersError]);

  const [returnWarrantyInvoicePartially, { data: amanatReturnInfo }] =
    useReturnWarrantyInvoicePartiallyMutation();

  const [isInitialLoading, setIsInitialLoading] = useState(true);
  const [isFetchError, setIsFetchError] = useState(false);
  const lastFetchedInvoiceId = useRef(null);
  const isFetching = useRef(false);
  const [loadingItems, setLoadingItems] = useState([]);

  useEffect(() => {
    if (
      selectedInvoice?.id &&
      canEsterdad &&
      isAmanatType &&
      selectedInvoice.id !== lastFetchedInvoiceId.current &&
      !isFetching.current
    ) {
      isFetching.current = true;
      setIsInitialLoading(true);
      setIsFetchError(false);
      returnWarrantyInvoicePartially({ id: selectedInvoice.id })
        .unwrap()
        .then((updatedAmanatReturnInfo) => {
          setSelectedInvoice((prev) => ({
            ...prev,
            items: prev.items.map((item) => ({
              ...item,
              is_fully_returned:
                updatedAmanatReturnInfo?.items?.find(
                  (retItem) =>
                    retItem.item_name === item.item_name &&
                    retItem.item_bar === item.barcode &&
                    retItem.location === item.location
                )?.is_fully_returned ||
                item.is_fully_returned ||
                false,
              total_returned:
                updatedAmanatReturnInfo?.items?.find(
                  (retItem) =>
                    retItem.item_name === item.item_name &&
                    retItem.item_bar === item.barcode &&
                    retItem.location === item.location
                )?.total_returned ||
                item.total_returned ||
                0,
            })),
          }));
          lastFetchedInvoiceId.current = selectedInvoice.id;
        })
        .catch((error) => {
          console.error(
            "خطأ في استدعاء /invoice/{id}/WarrantyReturnStatus:",
            error
          );
          setSnackBarType("error");
          setSnackbarMessage("فشل في جلب بيانات الاسترداد");
          setOpenSnackbar(true);
          setIsFetchError(true);
        })
        .finally(() => {
          setIsInitialLoading(false);
          isFetching.current = false;
        });
    } else {
      setIsInitialLoading(false);
      setIsFetchError(false);
    }
  }, [
    selectedInvoice.id,
    canEsterdad,
    isAmanatType,
    returnWarrantyInvoicePartially,
    setSelectedInvoice,
  ]);

  const [openOriginalInvoiceModal, setOpenOriginalInvoiceModal] =
    useState(false);
  const [selectedInvoiceId, setSelectedInvoiceId] = useState(null);

  // Fetch original invoice
  const {
    data: originalInvoice,
    isLoading: isOriginalInvoiceLoading,
    isError: isOriginalInvoiceError,
  } = useGetInvoiceQuery(
    selectedInvoiceId || editingInvoice?.original_invoice_id,
    {
      skip:
        (!selectedInvoiceId && !editingInvoice?.original_invoice_id) ||
        justEditUnitPrice,
    }
  );

  const transformedInvoice = originalInvoice
    ? {
        ...originalInvoice,
        date: originalInvoice.created_at
          ? originalInvoice.created_at.split(" ")[0]
          : originalInvoice.date || "غير متوفر",
        time: originalInvoice.created_at
          ? new Date(
              `1970-01-01 ${originalInvoice.created_at.split(" ")[1]}`
            ).toLocaleTimeString("en-US", {
              hour12: true,
              hour: "numeric",
              minute: "2-digit",
            })
          : originalInvoice.time || "غير متوفر",
      }
    : null;

  // Handle opening the original invoice modal
  const handleOpenOriginalInvoice = (invoiceId) => {
    if (invoiceId) {
      setSelectedInvoiceId(invoiceId);
      setOpenOriginalInvoiceModal(true);
    } else {
      setSnackBarType("error");
      setSnackbarMessage("يرجى تحديد رقم الفاتورة أولاً");
      setOpenSnackbar(true);
    }
  };

  // Recovery
  const [ReturnWarrantyInvoice] = useReturnWarrantyInvoiceMutation();

  const [openReturnDialog, setOpenReturnDialog] = useState(false);
  const [selectedItemIndex, setSelectedItemIndex] = useState(null);
  const [returnQuantity, setReturnQuantity] = useState("");

  // Handle closing the original invoice modal
  const handleCloseOriginalInvoiceModal = () => {
    setOpenOriginalInvoiceModal(false);
    setSelectedInvoiceId(null);
  };

  // Show error message if fetching invoice fails
  useEffect(() => {
    if (isOriginalInvoiceError && openOriginalInvoiceModal) {
      setSnackBarType("error");
      setSnackbarMessage("فشل تحميل الفاتورة الأصلية");
      setOpenSnackbar(true);
      setOpenOriginalInvoiceModal(false);
    }
  }, [isOriginalInvoiceError]);

  // Handle items, warehouses, and locations
  const warehouseMap = useMemo(() => {
    const map = new Map();
    if (!Array.isArray(warehouse)) return map;

    warehouse.forEach((item) => {
      const key = item.item_name.trim().toLowerCase();
      map.set(key, item);
    });
    return map;
  }, [warehouse]);

  // Filter itemNames based on invoice type
  const itemNames = useMemo(() => {
    if (
      (selectedNowType?.type === "مرتجع" ||
        selectedInvoice?.type === "مرتجع" ||
        editingInvoice?.type === "مرتجع") &&
      originalInvoice?.items
    ) {
      return originalInvoice.items.map((item) => item.item_name);
    }
    return Array.isArray(warehouse)
      ? warehouse.map((item) => item.item_name)
      : [];
  }, [
    warehouse,
    originalInvoice,
    selectedNowType?.type,
    selectedInvoice?.type,
    editingInvoice?.type,
  ]);

  // Update items with filtered locations and maxquantity for return invoices
  useEffect(() => {
    if (isEditingInvoice && warehouseMap && editingInvoice) {
      const updatedItems = editingInvoice.items.map((item) => {
        const warehouseItem = warehouseMap.get(
          item.item_name?.trim()?.toLowerCase()
        );
        let availableLocations = warehouseItem?.locations || [];
        let maxquantity = item.maxquantity || 0;
        let unit_price = item.unit_price;
        let price_details = item.price_details || [];

        // For return invoices, filter locations and set maxquantity, unit_price, and total_price
        if (
          (selectedNowType?.type === "مرتجع" ||
            editingInvoice?.type === "مرتجع") &&
          originalInvoice?.items
        ) {
          const originalItem = originalInvoice.items.find(
            (oi) =>
              oi.item_name.trim().toLowerCase() ===
              item.item_name?.trim()?.toLowerCase()
          );
          if (originalItem) {
            // Filter locations to only those in the original invoice
            availableLocations = availableLocations.filter((loc) =>
              originalInvoice.items.some(
                (oi) =>
                  oi.item_name.trim().toLowerCase() ===
                    item.item_name?.trim()?.toLowerCase() &&
                  oi.location === loc.location
              )
            );
            // Set maxquantity, unit_price, and total_price based on the original invoice
            if (item.location) {
              const originalLocationItem = originalInvoice.items.find(
                (oi) =>
                  oi.item_name.trim().toLowerCase() ===
                    item.item_name?.trim()?.toLowerCase() &&
                  oi.location === item.location
              );
              maxquantity = originalLocationItem
                ? originalLocationItem.quantity
                : 0;
              unit_price = originalLocationItem
                ? originalLocationItem.unit_price
                : 0;
              price_details = originalLocationItem
                ? originalLocationItem.price_details
                : [];
            }
          }
        } else if (selectedNowType?.type !== "اضافه") {
          // For non-return invoices, use warehouse quantities
          maxquantity =
            warehouseItem?.locations?.find(
              (loc) => loc.location === item.location
            )?.quantity || 0;
        }
        if (isTransferType && item.location) {
          const selectedLocation = availableLocations.find(
            (loc) => loc.location === item.location
          );
          maxquantity = selectedLocation ? selectedLocation.quantity : 0;
        }

        return {
          ...item,
          availableLocations,
          unit_price,
          price_details,
          maxquantity,
          new_location: item.new_location || "",
        };
      });

      // Check if updatedItems differ from current items to avoid infinite loop
      const itemsChanged =
        JSON.stringify(updatedItems) !== JSON.stringify(editingInvoice.items);

      if (itemsChanged) {
        setEditingInvoice((prev) => ({
          ...prev,
          items: updatedItems,
          total_amount:
            editingInvoice.type === "مرتجع" && originalInvoice
              ? originalInvoice.total_amount
              : prev.total_amount,
        }));
      }
    }
  }, [
    warehouseMap,
    originalInvoice,
    selectedNowType?.type,
    editingInvoice,
    setEditingInvoice,
    isEditingInvoice,
    isTransferType,
  ]);

  // Snackbar
  const [openSnackbar, setOpenSnackbar] = useState(false);
  const [snackbarMessage, setSnackbarMessage] = useState("");
  const [snackBarType, setSnackBarType] = useState("");
  const handleCloseSnackbar = () => {
    setOpenSnackbar(false);
  };

  // Refetch data only in editing mode
  useEffect(() => {
    if (isEditingInvoice) {
      if (isAdditionType) {
        refetchSuppliers();
      }
      if (isMortaga3Type) {
        refetcInvoicesNumbers();
      }
      refetchMachines();
      refetchMechanisms();
      refetchWarehouses();
    }
  }, []);

  // The rest of the JSX remains unchanged
  return (
    <>
      <div
        className={`${className} printable-box`}
        style={{
          backgroundColor: isCreate && "white",
          padding: isCreate && "10px 35px",
        }}
      >
        <Box className={styles.headerSection}>
          <Box className={styles.headerSection}>
            <Box className={styles.logoBox}>
              <img src={logo} alt="Logo" className={styles.logoImage} />
            </Box>
            <Box className={styles.operationTypeBox}>
              <Box className={styles.operationTypeText}>نوع العملية</Box>
              <Box className={styles.operationTypeName}>
                {selectedInvoice.type}
              </Box>
            </Box>
            <Box className={styles.infoBox}>
              <Box className={styles.infoItem}>
                <Box className={styles.infoLabel}>رقم السند:</Box>
                <Box className={styles.infoValue}>{selectedInvoice.id}</Box>
              </Box>
              <Box className={styles.infoItem}>
                <Box className={styles.infoLabel}>التاريخ</Box>
                <Box className={styles.infoValue}>{selectedInvoice.date}</Box>
              </Box>
              <Box className={styles.infoItem}>
                <Box className={styles.infoLabel}>الوقت</Box>
                <Box className={styles.infoValue}>{selectedInvoice.time}</Box>
              </Box>
            </Box>
          </Box>
        </Box>
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
              {/* Inputs for Machine, Mechanism Names, and Invoice Number */}
              {(selectedNowType?.type === "مرتجع" ||
                selectedInvoice?.type === "مرتجع" ||
                editingInvoice?.type === "مرتجع") && (
                <TableRow className={styles.tableRow}>
                  <TableCell className={styles.tableCell} colSpan={2}>
                    رقم الفاتورة
                  </TableCell>
                  <TableCell
                    className={styles.tableInputCell}
                    colSpan={6}
                    sx={{
                      padding: "0px !important",
                    }}
                  >
                    {isEditingInvoice && !justEditUnitPrice ? (
                      <>
                        <CustomAutoCompleteField
                          loading={isInvoiceNumbersLoading}
                          values={invoiceNumbers}
                          editingItem={editingInvoice}
                          setEditingItem={setEditingInvoice}
                          fieldName="original_invoice_id"
                          placeholder="رقم الفاتورة"
                        />
                        <IconButton
                          onClick={() =>
                            handleOpenOriginalInvoice(
                              editingInvoice.original_invoice_id
                            )
                          }
                          disabled={!editingInvoice.original_invoice_id}
                          sx={{
                            position: "absolute",
                            top: "50%",
                            left: "0",
                            transform: "translateY(-50%)",
                          }}
                        >
                          <VisibilityIcon />
                        </IconButton>
                      </>
                    ) : (
                      selectedInvoice.original_invoice_id || "-"
                    )}
                  </TableCell>
                </TableRow>
              )}
              {selectedNowType?.type !== "اضافه" &&
                selectedInvoice?.type !== "اضافه" &&
                editingInvoice?.type !== "اضافه" && (
                  <>
                    <TableRow className={styles.tableRow}>
                      <TableCell className={styles.tableCell} colSpan={2}>
                        اسم الماكينة
                      </TableCell>
                      <TableCell
                        className={styles.tableInputCell}
                        colSpan={canEsterdad && isAmanatType ? 7 : 6}
                        sx={{
                          padding: "0px !important",
                        }}
                      >
                        {isEditingInvoice && !justEditUnitPrice ? (
                          <CustomAutoCompleteField
                            loading={isMachinesLoading}
                            values={machines}
                            editingItem={editingInvoice}
                            setEditingItem={setEditingInvoice}
                            fieldName="machine_name"
                            placeholder="اسم الماكينة"
                            isBig={true}
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
                        colSpan={canEsterdad && isAmanatType ? 7 : 6}
                        sx={{
                          padding: "0px !important",
                        }}
                      >
                        {isEditingInvoice && !justEditUnitPrice ? (
                          <CustomAutoCompleteField
                            loading={isMechanismsLoading}
                            values={mechanisms}
                            editingItem={editingInvoice}
                            setEditingItem={setEditingInvoice}
                            fieldName="mechanism_name"
                            placeholder="اسم الميكانيزم"
                            isBig={true}
                          />
                        ) : (
                          selectedInvoice.mechanism_name
                        )}
                      </TableCell>
                    </TableRow>
                  </>
                )}
              <TableRow>
                <TableCell className={styles.tableCell}>
                  <AddIcon
                    onClick={
                      isEditingInvoice && !justEditUnitPrice ? addRow : null
                    }
                    className={styles.addIcon}
                    sx={{
                      cursor:
                        isEditingInvoice && !justEditUnitPrice
                          ? "pointer"
                          : "not-allowed",
                    }}
                  />
                </TableCell>
                {isEdafaType && (
                  <TableCell className={styles.tableCell}>اسم المورد</TableCell>
                )}
                <TableCell className={styles.tableCell}>اسم الصنف</TableCell>
                <TableCell className={styles.tableCell}>الرمز</TableCell>
                <TableCell className={styles.tableCell}>الموقع</TableCell>
                <TableCell className={styles.tableCell}>الكمية</TableCell>
                {isTransferType && (
                  <TableCell className={styles.tableCell}>
                    الموقع الجديد
                  </TableCell>
                )}
                {canEsterdad && isAmanatType && (
                  <TableCell className={styles.tableCell}>
                    الكمية المستردة
                  </TableCell>
                )}
                {(show || isPurchasesType) && (
                  <>
                    <TableCell className={styles.tableCell}>السعر</TableCell>
                    <TableCell className={styles.tableCell}>
                      إجمالي السعر
                    </TableCell>
                  </>
                )}
                <TableCell className={styles.tableCell}>بيان</TableCell>
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
                    {isEditingInvoice && !justEditUnitPrice && (
                      <button
                        onClick={() => handleDeleteItemClick(index)}
                        className={styles.clearIcon}
                      >
                        <ClearOutlinedIcon fontSize="small" />
                      </button>
                    )}
                    {isAmanatType &&
                      canEsterdad &&
                      (((isInitialLoading || loadingItems[index]) &&
                        !isFetchError) ||
                      selectedInvoice?.items[index]?.is_fully_returned ===
                        undefined ? (
                        <CircularProgress
                          className={styles.clearIcon}
                          size={22}
                          sx={{
                            position: "absolute",
                            right: "-25px",
                            top: "5px",
                            cursor: "default",
                          }}
                        />
                      ) : !isInitialLoading &&
                        !isFetchError &&
                        selectedInvoice?.items[index]?.is_fully_returned !==
                          undefined &&
                        !selectedInvoice?.items[index]?.is_fully_returned &&
                        !amanatReturnInfo?.items?.find(
                          (item) =>
                            item.item_name === row.item_name &&
                            item.item_bar === row.barcode &&
                            item.location === row.location &&
                            item.is_fully_returned
                        ) &&
                        canEsterdad &&
                        isAmanatType &&
                        selectedInvoice?.status !== "returned" &&
                        selectedInvoice?.status !== "تم الاسترداد" ? (
                        <button
                          onClick={() => {
                            setSelectedItemIndex(index);
                            setReturnQuantity("");
                            setOpenReturnDialog(true);
                          }}
                          className={styles.clearIcon}
                          title="استرداد العنصر"
                        >
                          <KeyboardReturnIcon fontSize="small" />
                        </button>
                      ) : null)}
                  </TableCell>
                  {isEdafaType && (
                    <TableCell
                      className={styles.tableCellRow}
                      sx={{
                        "&.MuiTableCell-root": {
                          padding: "0px",
                          whiteSpace: "normal",
                          wordBreak: "break-word",
                        },
                      }}
                    >
                      {isEditingInvoice && !justEditUnitPrice ? (
                        <CustomAutoCompleteField
                          loading={isSuppliersLoading}
                          values={suppliers}
                          editingItem={row}
                          setEditingItem={(newItem) => {
                            const updatedItems = [...editingInvoice.items];
                            updatedItems[index] = {
                              ...updatedItems[index],
                              supplier_name: newItem.supplier_name,
                            };
                            setEditingInvoice({
                              ...editingInvoice,
                              items: updatedItems,
                            });
                          }}
                          fieldName="supplier_name"
                          placeholder="اسم المورد"
                          isBig={true}
                        />
                      ) : (
                        row.supplier_name || "-"
                      )}
                    </TableCell>
                  )}
                  <TableCell
                    className={styles.tableCellRow}
                    sx={{
                      "&.MuiTableCell-root": {
                        padding: "0px",
                        whiteSpace: "normal",
                        wordBreak: "break-word",
                      },
                    }}
                  >
                    {isEditingInvoice && !justEditUnitPrice ? (
                      <CustomAutoCompleteField
                        isBig={true}
                        isLoading={isWarehousesLoading}
                        values={itemNames || []}
                        editingItem={row}
                        setEditingItem={(newItem) => {
                          const normalizedValue = newItem.item_name
                            .trim()
                            .toLowerCase();
                          const selectedItem = Array.from(
                            warehouseMap.values()
                          ).find(
                            (item) =>
                              item.item_name.trim().toLowerCase() ===
                              normalizedValue
                          );
                          const updatedItems = [...editingInvoice.items];
                          updatedItems[index] = {
                            ...updatedItems[index],
                            item_name:
                              selectedItem?.item_name || newItem.item_name,
                            barcode: selectedItem?.item_bar || "",
                            location: "",
                            quantity: 0,
                            unit_price: 0,
                            total_price: 0,
                            availableLocations: selectedItem?.locations || [],
                            maxquantity: 0,
                            supplier_name:
                              updatedItems[index].supplier_name || "", // Preserve supplier_name
                          };
                          setEditingInvoice({
                            ...editingInvoice,
                            items: updatedItems,
                          });
                        }}
                        fieldName="item_name"
                        placeholder="اسم العنصر"
                      />
                    ) : (
                      row.item_name
                    )}
                  </TableCell>
                  {/* بقية الخلايا كما هي */}
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
                    {isEditingInvoice && !justEditUnitPrice ? (
                      <CustomAutoCompleteField
                        loading={row.item_name === "" ? false : true}
                        values={row?.availableLocations || []}
                        editingItem={row}
                        setEditingItem={(newItem) => {
                          if (!newItem.location) {
                            return;
                          }
                          const matchedItem = editingInvoice?.items?.find(
                            (row11) =>
                              row11.barcode === row.barcode &&
                              row11.location === newItem.location
                          );
                          if (matchedItem) {
                            setSnackbarMessage("هذا العنصر موجود بالفعل");
                            setSnackBarType("info");
                            setOpenSnackbar(true);
                            return;
                          }
                          let maxquantity = row.maxquantity || 0;
                          if (
                            (selectedNowType?.type === "مرتجع" ||
                              editingInvoice?.type === "مرتجع") &&
                            originalInvoice?.items
                          ) {
                            const originalLocationItem =
                              originalInvoice.items.find(
                                (oi) =>
                                  oi.item_name.trim().toLowerCase() ===
                                    row.item_name?.trim()?.toLowerCase() &&
                                  oi.location === newItem.location
                              );
                            maxquantity = originalLocationItem
                              ? originalLocationItem.quantity
                              : 0;
                          } else {
                            maxquantity = newItem?.quantity || 0;
                          }
                          const updatedItems = [...editingInvoice.items];
                          updatedItems[index] = {
                            ...updatedItems[index],
                            location: newItem?.location || "",
                            quantity: 0,
                            unit_price:
                              newItem?.unit_price &&
                              selectedNowType?.type !== "اضافه"
                                ? newItem.unit_price
                                : row.unit_price,
                            total_price: 0,
                            maxquantity,
                            supplier_name:
                              updatedItems[index].supplier_name || "", // Preserve supplier_name
                          };
                          setEditingInvoice({
                            ...editingInvoice,
                            items: updatedItems,
                          });
                        }}
                        fieldName="location"
                        placeholder="الموقع"
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
                        value={row?.quantity}
                        onInput={(e) => {
                          if (e.target.value < 0) {
                            e.target.value = 0;
                          }
                          if (
                            (isTransferType ||
                              selectedNowType?.type === "مرتجع" ||
                              editingInvoice?.type === "مرتجع") &&
                            e.target.value > row.maxquantity
                          ) {
                            e.target.value = row.maxquantity;
                            setSnackbarMessage(
                              `الكمية القصوى المسموح بها هي ${row.maxquantity}`
                            );
                            setSnackBarType("warning");
                            setOpenSnackbar(true);
                          } else if (
                            selectedInvoice?.type !== "مرتجع" &&
                            editingInvoice?.type !== "مرتجع" &&
                            (selectedNowType?.type === "operation" ||
                              (!isPurchasesType && isCreate)) &&
                            e.target.value > row.maxquantity &&
                            selectedInvoice.type !== "طلب شراء"
                          ) {
                            e.target.value = row.maxquantity;
                          }
                        }}
                        onClick={(event) => {
                          if (
                            row.location === undefined ||
                            row.location === ""
                          ) {
                            setSnackbarMessage("يجب تحديد موقع العنصر أولا");
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
                            setSnackbarMessage("يجب تحديد موقع العنصر أولا");
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
                            setSnackbarMessage("يجب تحديد موقع العنصر أولا");
                            setSnackBarType("info");
                            setOpenSnackbar(true);
                            e.target.blur();
                            return;
                          }
                          const newQuantity = Math.max(
                            0,
                            Number(e.target.value)
                          );
                          const updatedItems = [...editingInvoice.items];
                          updatedItems[index] = {
                            ...row,
                            quantity: e.target.value,
                            total_price:
                              selectedNowType?.type === "purchase"
                                ? newQuantity * row.unit_price
                                : isPurchasesType
                                ? newQuantity * Number(row.unit_price)
                                : newQuantity * row.unit_price,
                            supplier_name:
                              updatedItems[index].supplier_name || "", // Preserve supplier_name
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
                  {isTransferType && (
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
                      {isEditingInvoice && !justEditUnitPrice ? (
                        <CustomAutoCompleteField
                          loading={row.item_name === "" ? false : true}
                          values={(row?.availableLocations || []).filter(
                            (loc) => loc.location !== row.location
                          )}
                          editingItem={row}
                          setEditingItem={(newItem) => {
                            if (!newItem.new_location) return;
                            const matchedItem = editingInvoice?.items?.find(
                              (row11) =>
                                row11.barcode === row.barcode &&
                                row11.new_location === newItem.new_location
                            );
                            if (matchedItem) {
                              setSnackbarMessage(
                                "هذا الموقع الجديد موجود بالفعل"
                              );
                              setSnackBarType("info");
                              setOpenSnackbar(true);
                              return;
                            }
                            if (newItem.new_location === row.location) {
                              setSnackbarMessage(
                                "لا يمكن تحويل الكمية إلى نفس الموقع"
                              );
                              setSnackBarType("warning");
                              setOpenSnackbar(true);
                              return;
                            }
                            const updatedItems = [...editingInvoice.items];
                            updatedItems[index] = {
                              ...updatedItems[index],
                              new_location: newItem?.new_location || "",
                            };
                            setEditingInvoice({
                              ...editingInvoice,
                              items: updatedItems,
                            });
                          }}
                          fieldName="new_location"
                          placeholder="الموقع الجديد"
                        />
                      ) : (
                        row.new_location || "-"
                      )}
                    </TableCell>
                  )}
                  {canEsterdad && isAmanatType && (
                    <TableCell
                      className={styles.tableCellRow}
                      sx={{
                        position: "relative",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        minWidth: "80px",
                        padding: "8px",
                        transition: "all 0.3s ease",
                      }}
                    >
                      {((isInitialLoading || loadingItems[index]) &&
                        !isFetchError) ||
                      selectedInvoice?.items[index]?.is_fully_returned ===
                        undefined ? (
                        <Box
                          sx={{
                            display: "flex",
                            alignItems: "center",
                            gap: "8px",
                            justifyContent: "center",
                          }}
                        >
                          <CircularProgress
                            size={20}
                            sx={{
                              color: "#1976d2",
                              cursor: "default",
                            }}
                          />
                          <span
                            style={{
                              fontSize: "14px",
                              color: "#666",
                              fontWeight: 400,
                            }}
                          >
                            جارٍ التحميل...
                          </span>
                        </Box>
                      ) : (
                        <span
                          style={{
                            fontSize: "16px",
                            color: "#333",
                            fontWeight: 500,
                            textAlign: "center",
                          }}
                        >
                          {row.total_returned || 0}
                        </span>
                      )}
                    </TableCell>
                  )}
                  {(show || isPurchasesType) && (
                    <>
                      <TableCell className={styles.tableCellRow}>
                        {isEditingInvoice &&
                        editingInvoice?.type === "اضافه" ? (
                          <NumberInput
                            style={{
                              width: "100px",
                              outline: "none",
                              fontSize: "15px",
                              textAlign: "center",
                              border: "none",
                              padding: "10px",
                            }}
                            value={row.unit_price ?? row?.unit_price}
                            onInput={(e) => {
                              if (e.target.value < 0) {
                                e.target.value = 0;
                              }
                              if (
                                selectedNowType?.type === "operation" &&
                                e.target.value > row.maxquantity
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
                                  "يجب تحديد موقع العنصر أولا"
                                );
                                setSnackBarType("info");
                                setOpenSnackbar(true);
                                e.target.blur();
                                return;
                              }

                              const newUnitPrice = Number(e.target.value) || 0;
                              const updatedItems = editingInvoice.items.map(
                                (item) => {
                                  if (
                                    item.item_name === row.item_name &&
                                    item.supplier_name === row.supplier_name
                                  ) {
                                    const newTotalPrice =
                                      newUnitPrice * (item.quantity || 0);
                                    return {
                                      ...item,
                                      unit_price: e.target.value,
                                      total_price: newTotalPrice,
                                    };
                                  }
                                  return item;
                                }
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
                            }}
                            onClick={(event) => {
                              if (
                                row.location === undefined ||
                                row.location === ""
                              ) {
                                setSnackbarMessage(
                                  "يجب تحديد موقع العنصر أولا"
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
                                  "يجب تحديد موقع العنصر أولا"
                                );
                                setSnackBarType("info");
                                setOpenSnackbar(true);
                                event.target.blur();
                                return;
                              }
                            }}
                          />
                        ) : (
                          row.unit_price
                        )}
                      </TableCell>
                      <TableCell className={styles.tableCellRow}>
                        {!isEditingInvoice
                          ? row?.total_price
                          : editingInvoice.type === "اضافه" || justEditUnitPrice
                          ? row?.total_price
                          : "-"}
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
                    {isEditingInvoice && !justEditUnitPrice ? (
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
                        value={row?.description || row.description}
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
        {(show || isPurchasesType) && (
          <Box className={styles.MoneySection}>
            <Box className={styles.MoneySection}>
              <Box className={styles.MoneyBox}>
                <Box className={styles.MoneyLabel}>الإجمالي</Box>
                <Box className={styles.MoneyValue}>
                  {!isEditingInvoice
                    ? selectedInvoice?.total_amount
                    : editingInvoice.type === "اضافه" || justEditUnitPrice
                    ? editingInvoice?.total_amount
                    : "-"}
                </Box>
              </Box>
              <Box className={styles.MoneyBox}>
                <Box className={styles.MoneyLabel}>طريقة الدفع</Box>
                <Box
                  className={styles.MoneyValue}
                  sx={{
                    display: "flex",
                    direction: "rtl",
                    gap: "10px",
                  }}
                >
                  {!isEditingInvoice ? (
                    editingInvoice?.payment_method === "Custody" ? (
                      `عهدة مع ${editingInvoice.custody_person || "-"}`
                    ) : (
                      editingInvoice?.payment_method
                    )
                  ) : (
                    <>
                      <Autocomplete
                        loading={true}
                        options={[
                          { label: "Cash", value: "Cash" },
                          { label: "Credit", value: "Credit" },
                          { label: "عهدة", value: "Custody" },
                        ]}
                        getOptionLabel={(option) => option.label}
                        value={
                          [
                            { label: "Cash", value: "Cash" },
                            { label: "Credit", value: "Credit" },
                            { label: "عهدة", value: "Custody" },
                          ].find(
                            (option) =>
                              option.value === editingInvoice.payment_method
                          ) || null
                        }
                        onChange={(event, newValue) => {
                          setEditingInvoice({
                            ...editingInvoice,
                            payment_method: newValue ? newValue.value : "",
                            custody_person:
                              newValue?.value === "Custody"
                                ? editingInvoice.custody_person || ""
                                : "",
                          });
                        }}
                        sx={{
                          minWidth:
                            editingInvoice.payment_method === "Custody"
                              ? "30%"
                              : "200px",
                          "& .MuiAutocomplete-clearIndicator": {
                            display: "none",
                          },
                          "& .MuiOutlinedInput-root": {
                            paddingRight: "35px!important",
                            fontSize: "1rem",
                            padding: "0",
                            paddingLeft: "35px",
                          },
                          "& .MuiOutlinedInput-root .MuiOutlinedInput-notchedOutline":
                            { border: "none" },
                          "& .MuiInputBase-input": { textAlign: "center" },
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

                      {editingInvoice.payment_method === "Custody" && (
                        <input
                          placeholder="اسم الشخص"
                          value={editingInvoice.custody_person || ""}
                          onChange={(e) =>
                            setEditingInvoice({
                              ...editingInvoice,
                              custody_person: e.target.value,
                            })
                          }
                          style={{
                            width: "100%",
                            outline: "none",
                            fontSize: "15px",
                            textAlign: "center",
                            border: "1px solid #ddd",
                          }}
                        />
                      )}
                    </>
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
                  {(editingInvoice?.paid || 0) -
                    (editingInvoice?.total_amount || 0)}
                </Box>
              </Box>
            </Box>
          </Box>
        )}
        {/* Comment */}
        {(!isCreate || showCommentField) &&
          (!isEditingInvoice || justEditUnitPrice ? (
            selectedInvoice.comment && (
              <Box className={styles.commentFieldBox}>
                {selectedInvoice.comment}
              </Box>
            )
          ) : (
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
          ))}
        {/* Info */}
        <Box className={styles.infoSection}>
          <Box className={styles.infoItemBox}>
            <Box className={styles.infoLabel}>اسم الموظف</Box>
            <Box className={styles.infoValue}>
              {selectedInvoice.employee_name}
            </Box>
          </Box>
          <Box className={styles.infoItemBox}>
            <Box className={styles.infoLabel}>اسم المستلم</Box>
            {isEditingInvoice && !justEditUnitPrice ? (
              <input
                style={{
                  width: "70%",
                  margin: "auto",
                  outline: "none",
                  fontSize: "15px",
                  textAlign: "center",
                  border: isCreate ? "2px solid #eee" : "none",
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
      </div>

      {/* Modal for displaying the original invoice */}
      <Dialog
        open={openOriginalInvoiceModal}
        onClose={handleCloseOriginalInvoiceModal}
        maxWidth="lg"
        fullWidth
      >
        <Box sx={{ padding: "20px", direction: "rtl" }}>
          {isOriginalInvoiceLoading ? (
            <Box>جاري تحميل الفاتورة...</Box>
          ) : transformedInvoice ? (
            <InvoiceModal
              selectedInvoice={transformedInvoice}
              isEditingInvoice={false}
              editingInvoice={transformedInvoice}
              setEditingInvoice={() => {}}
              show={false}
              selectedNowType={{ type: transformedInvoice.type }}
              addRow={() => {}}
              handleDeleteItemClick={() => {}}
              isPurchasesType={transformedInvoice.type === "purchase"}
              isCreate={false}
              showCommentField={true}
              canEsterdad={canEsterdad}
            />
          ) : (
            <Box>لم يتم العثور على الفاتورة</Box>
          )}
        </Box>
      </Dialog>
      <Dialog
        open={openReturnDialog}
        onClose={() => setOpenReturnDialog(false)}
        sx={{ direction: "rtl" }}
      >
        <Box sx={{ padding: "20px", textAlign: "center" }}>
          <Box sx={{ marginBottom: "20px" }}>
            <label
              style={{
                display: "block",
                fontSize: "16px",
                marginBottom: "8px",
                color: "#333",
                fontWeight: "500",
              }}
            >
              كمية الاسترداد
            </label>
            <input
              type="number"
              value={returnQuantity}
              onChange={(e) => {
                const value = Math.max(0, Number(e.target.value));
                setReturnQuantity(value);
              }}
              onInput={(e) => {
                const maxQuantity =
                  amanatReturnInfo?.items[selectedItemIndex]
                    ?.remaining_quantity || 0;
                if (e.target.value < 0) {
                  e.target.value = 0;
                }
                if (e.target.value > maxQuantity) {
                  e.target.value = maxQuantity;
                  setSnackBarType("warning");
                  setSnackbarMessage(
                    `الكمية القصوى المسموح بها هي ${maxQuantity}`
                  );
                  setOpenSnackbar(true);
                }
              }}
              style={{
                width: "200px",
                padding: "10px",
                fontSize: "16px",
                textAlign: "center",
                border: "1px solid #ccc",
                borderRadius: "4px",
                outline: "none",
                transition: "border-color 0.3s ease",
              }}
              onFocus={(e) => (e.target.style.borderColor = "#1976d2")}
              onBlur={(e) => (e.target.style.borderColor = "#ccc")}
              min="0"
            />
          </Box>
          <Box sx={{ display: "flex", gap: "10px", justifyContent: "center" }}>
            <button
              onClick={async () => {
                if (!returnQuantity || returnQuantity <= 0) {
                  setSnackBarType("error");
                  setSnackbarMessage("يرجى إدخال كمية استرداد صالحة");
                  setOpenSnackbar(true);
                  return;
                }
                const data = {
                  id: selectedInvoice?.id,
                  itemName:
                    selectedInvoice?.items[selectedItemIndex]?.item_name,
                  itemBar: selectedInvoice?.items[selectedItemIndex]?.barcode,
                  location: selectedInvoice?.items[selectedItemIndex]?.location,
                  quantity: returnQuantity,
                };

                setLoadingItems((prev) => {
                  const newLoadingItems = [...prev];
                  newLoadingItems[selectedItemIndex] = true;
                  return newLoadingItems;
                });

                try {
                  await ReturnWarrantyInvoice(data).unwrap();

                  const updatedAmanatReturnInfo =
                    await returnWarrantyInvoicePartially({
                      id: selectedInvoice.id,
                    }).unwrap();

                  setSelectedInvoice((prev) => ({
                    ...prev,
                    items: prev.items.map((item, i) =>
                      i === selectedItemIndex
                        ? {
                            ...item,
                            is_fully_returned:
                              updatedAmanatReturnInfo?.items?.find(
                                (retItem) =>
                                  retItem.item_name === item.item_name &&
                                  retItem.item_bar === item.barcode &&
                                  retItem.location === item.location
                              )?.is_fully_returned ||
                              returnQuantity === item.quantity,
                            total_returned:
                              updatedAmanatReturnInfo?.items?.find(
                                (retItem) =>
                                  retItem.item_name === item.item_name &&
                                  retItem.item_bar === item.barcode &&
                                  retItem.location === item.location
                              )?.total_returned ||
                              (item.total_returned || 0) + returnQuantity,
                          }
                        : item
                    ),
                  }));

                  setSnackBarType("success");
                  setSnackbarMessage("تم التحديث بنجاح");
                  setOpenSnackbar(true);
                  setOpenReturnDialog(false);
                } catch (error) {
                  setSnackBarType("error");
                  setSnackbarMessage(
                    error.response && error.response.status === "FETCH_ERROR"
                      ? "خطأ في الوصول إلى قاعدة البيانات"
                      : "خطأ في التحديث، إذا استمرت المشكلة حاول إعادة تحميل الصفحة"
                  );
                  setOpenSnackbar(true);
                } finally {
                  setLoadingItems((prev) => {
                    const newLoadingItems = [...prev];
                    newLoadingItems[selectedItemIndex] = false;
                    return newLoadingItems;
                  });
                  setOpenReturnDialog(false);
                }
              }}
              style={{
                padding: "10px 20px",
                backgroundColor: "#1976d2",
                color: "white",
                border: "none",
                borderRadius: "4px",
                cursor: "pointer",
                fontSize: "16px",
                transition: "background-color 0.3s ease",
              }}
              onMouseOver={(e) => (e.target.style.backgroundColor = "#1565c0")}
              onMouseOut={(e) => (e.target.style.backgroundColor = "#1976d2")}
              disabled={loadingItems[selectedItemIndex] || !returnQuantity}
            >
              {loadingItems[selectedItemIndex] ? "جاري التحميل..." : "تأكيد"}
            </button>
            <button
              onClick={() => setOpenReturnDialog(false)}
              style={{
                padding: "10px 20px",
                backgroundColor: "#d32f2f",
                color: "white",
                border: "none",
                borderRadius: "4px",
                cursor: "pointer",
                fontSize: "16px",
                transition: "background-color 0.3s ease",
              }}
              onMouseOver={(e) => (e.target.style.backgroundColor = "#b71c1c")}
              onMouseOut={(e) => (e.target.style.backgroundColor = "#d32f2f")}
            >
              إلغاء
            </button>
          </Box>
        </Box>
      </Dialog>

      {/* Snackbar */}
      <SnackBar
        open={openSnackbar}
        message={snackbarMessage}
        type={snackBarType}
        onClose={handleCloseSnackbar}
      />
    </>
  );
}
