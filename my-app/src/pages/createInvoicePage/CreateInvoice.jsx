import React, { useState, useEffect, useMemo, useCallback } from "react";
import {
  Box,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  Button,
} from "@mui/material";
import styles from "./CreateInvoice.module.css";
import SnackBar from "../../components/snackBar/SnackBar";
import CircularProgress from "@mui/material/CircularProgress";
import InvoiceModal from "../../components/invoice/Invoice";

// RTK Query hooks
import { useGetUserQuery } from "../services/userApi";
import { useGetWarehousesQuery } from "../services/warehouseApi";
import {
  useGetLastInvoiceIdQuery,
  useCreateInvoiceMutation,
} from "../services/invoiceApi";

// Constants
const operationTypes = ["صرف", "أمانات", "مرتجع", "توالف", "حجز"];
const purchasesTypes = ["اضافه"];
const LOCAL_STORAGE_KEY = "invoiceDraft";
const PURCHASE_ORDER_LOCAL_STORAGE_KEY = "purchaseOrderDraft";

const initialInvoiceState = {
  id: null,
  supplier_name: "",
  type: "",
  client_name: "",
  warehouse_manager: "",
  total_amount: 0,
  employee_name: "",
  machine_name: "",
  mechanism_name: "",
  items: [
    {
      item_name: "",
      barcode: "",
      quantity: 0,
      location: "",
      unit_price: 0,
      total_price: 0,
      description: "",
    },
  ],
  comment: "",
  payment_method: "Cash",
  amount_paid: 0,
  remain_amount: 0,
};

export default function CreateInvoice() {
  // State management
  const [operationType, setOperationType] = useState(() => {
    const savedDraft = localStorage.getItem(LOCAL_STORAGE_KEY);
    return savedDraft ? JSON.parse(savedDraft).operationType : "";
  });
  const [purchasesType, setPurchasesType] = useState(() => {
    const savedDraft = localStorage.getItem(LOCAL_STORAGE_KEY);
    return savedDraft ? JSON.parse(savedDraft).purchasesType : "";
  });
  const [showCommentField, setShowCommentField] = useState(false);
  const [showPurchaseOrderCommentField, setShowPurchaseOrderCommentField] =
    useState(false);
  const [isInvoiceSaved, setIsInvoiceSaved] = useState(false);
  const [editingMode, setEditingMode] = useState(true);

  // Purchase order state
  const [isPurchaseOrder, setIsPurchaseOrder] = useState(false);
  const [isPurchaseOrderSaved, setIsPurchaseOrderSaved] = useState(false);
  const [isPurchaseOrderEditing, setIsPurchaseOrderEditing] = useState(true);
  const [purchaseOrderInvoice, setPurchaseOrderInvoice] = useState(() => {
    const savedDraft = localStorage.getItem(PURCHASE_ORDER_LOCAL_STORAGE_KEY);
    return savedDraft
      ? {
          ...initialInvoiceState,
          ...JSON.parse(savedDraft).purchaseOrderInvoice,
          type: "طلب شراء",
          id: JSON.parse(savedDraft).purchaseOrderInvoice.id || null,
        }
      : { ...initialInvoiceState, type: "طلب شراء" };
  });

  // Invoice data state
  const [newInvoice, setNewInvoice] = useState(() => {
    const savedDraft = localStorage.getItem(LOCAL_STORAGE_KEY);
    return savedDraft
      ? {
          ...initialInvoiceState,
          ...JSON.parse(savedDraft).newInvoice,
          type:
            JSON.parse(savedDraft).operationType ||
            JSON.parse(savedDraft).purchasesType,
          id: JSON.parse(savedDraft).newInvoice.id || null,
        }
      : initialInvoiceState;
  });

  // Snackbar state
  const [snackbar, setSnackbar] = useState({
    open: false,
    message: "",
    type: "",
  });

  // RTK Queries
  const { data: user, isLoading: isLoadingUser } = useGetUserQuery();
  const { data: voucherNumber, refetch: refetchLastId } =
    useGetLastInvoiceIdQuery();
  const [createInvoice, { isLoading: isSaving }] = useCreateInvoiceMutation();
  const { refetch: refetchWarehouses } = useGetWarehousesQuery(
    { all: true },
    { pollingInterval: 300000 }
  );

  // Derived values
  const totalAmount = useMemo(
    () =>
      newInvoice.items
        .reduce((total, row) => total + (row.total_price || 0), 0)
        .toFixed(2),
    [newInvoice.items]
  );

  const purchaseOrderTotalAmount = useMemo(
    () =>
      purchaseOrderInvoice.items
        .reduce((total, row) => total + (row.total_price || 0), 0)
        .toFixed(2),
    [purchaseOrderInvoice.items]
  );

  const selectedNowType = useMemo(
    () => ({
      type: purchasesType || operationType,
    }),
    [purchasesType, operationType]
  );

  // Date and time handling
  const [date, setDate] = useState("");
  const [time, setTime] = useState("");

  useEffect(() => {
    const today = new Date();
    setDate(today.toISOString().split("T")[0]);
    setTime(
      today.toLocaleTimeString("en-US", {
        hour: "numeric",
        minute: "2-digit",
        hour12: true,
      })
    );
  }, [isInvoiceSaved, isPurchaseOrderSaved]);

  // Type selection handler
  const handleTypeChange = useCallback((type, isPurchase) => {
    if (isPurchase) {
      setPurchasesType(type);
      setOperationType("");
    } else {
      setOperationType(type);
      setPurchasesType("");
    }
  }, []);

  useEffect(() => {
    setNewInvoice((prev) => ({
      ...prev,
      type: operationType || purchasesType,
    }));
  }, [operationType, purchasesType]);

  // Items management
  const addRow = useCallback((isPurchaseOrder = false) => {
    const setInvoice = isPurchaseOrder
      ? setPurchaseOrderInvoice
      : setNewInvoice;
    setInvoice((prev) => ({
      ...prev,
      items: [...prev.items, { ...initialInvoiceState.items[0] }],
    }));
  }, []);

  const removeRow = useCallback((index, isPurchaseOrder = false) => {
    const setInvoice = isPurchaseOrder
      ? setPurchaseOrderInvoice
      : setNewInvoice;
    setInvoice((prev) => ({
      ...prev,
      items: prev.items.filter((_, i) => i !== index),
    }));
  }, []);

  // Local storage persistence for main invoice
  useEffect(() => {
    if (!isInvoiceSaved) {
      const modifiedInvoice = {
        ...newInvoice,
        items: newInvoice.items.map((item) => ({
          ...item,
          quantity: 0,
        })),
      };

      const draft = {
        newInvoice: modifiedInvoice,
        operationType,
        purchasesType,
        showCommentField,
        isInvoiceSaved,
      };
      localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(draft));
    }
  }, [
    newInvoice,
    operationType,
    purchasesType,
    showCommentField,
    isInvoiceSaved,
  ]);

  // Local storage persistence for purchase order
  useEffect(() => {
    if (!isPurchaseOrderSaved) {
      const modifiedPurchaseOrderInvoice = {
        ...purchaseOrderInvoice,
        items: purchaseOrderInvoice.items.map((item) => ({
          ...item,
          quantity: 0,
        })),
      };

      const draft = {
        purchaseOrderInvoice: modifiedPurchaseOrderInvoice,
        isPurchaseOrderSaved,
      };
      localStorage.setItem(
        PURCHASE_ORDER_LOCAL_STORAGE_KEY,
        JSON.stringify(draft)
      );
    }
  }, [purchaseOrderInvoice, isPurchaseOrderSaved]);

  // Validation helpers
  const validateRequiredFields = (invoice, isPurchaseOrder = false) => {
    if (!invoice.type) return "يجب تحديد نوع العملية";

    const requiredFields = isPurchaseOrder
      ? ["machine_name", "mechanism_name"]
      : purchasesType
      ? ["machine_name", "mechanism_name", "supplier_name"]
      : ["machine_name", "mechanism_name"];

    const missingFields = requiredFields.filter((field) => !invoice[field]);

    if (missingFields.length > 0) {
      return isPurchaseOrder
        ? "يجب ملء اسم الماكينة واسم الميكانيزم"
        : purchasesType
        ? "يجب ملء اسم المورد واسم الماكينة واسم الميكانيزم"
        : "يجب ملء اسم الماكينة واسم الميكانيزم";
    }
    return null;
  };

  const validateItems = (items) => {
    const validItems = items.filter(
      (item) => Number(item.quantity) > 0 && !isNaN(Number(item.quantity))
    );

    if (validItems.length === 0) return "يجب ملء عنصر واحد على الأقل";
    return null;
  };

  // Save invoice handler
  const handleSave = async () => {
    const fieldError =
      validateRequiredFields(newInvoice) || validateItems(newInvoice.items);
    if (fieldError) {
      setSnackbar({ open: true, message: fieldError, type: "error" });
      return;
    }

    const invoiceData = {
      ...newInvoice,
      items: newInvoice.items
        .filter((item) => Number(item.quantity) > 0)
        .map((item) => ({
          item_name: item.item_name,
          barcode: item.barcode,
          location: item.location,
          quantity: Number(item.quantity),
          unit_price: Number(item.unit_price),
          total_price: Number(item.total_price),
          description: item.description,
        })),
      total_amount: totalAmount,
      employee_name: user?.username,
      id: voucherNumber?.last_id,
      date,
      time,
    };

    try {
      await createInvoice(invoiceData).unwrap();
      setIsInvoiceSaved(true);
      setEditingMode(false);
      localStorage.removeItem(LOCAL_STORAGE_KEY);
      setNewInvoice((prev) => ({
        ...prev,
        id: voucherNumber?.last_id, // Store the saved ID
      }));
      setSnackbar({
        open: true,
        message: "تم حفظ الفاتورة بنجاح",
        type: "success",
      });

      // Update purchase order ID if purchase order view is active

      if (!isPurchaseOrderSaved) {
        if (isPurchaseOrder) {
          await refetchLastId();
          setPurchaseOrderInvoice((prev) => ({
            ...prev,
            id: voucherNumber?.last_id, // Set to latest ID
          }));
          // Update purchase order local storage if not saved
          if (!isPurchaseOrderSaved) {
            const draft = {
              purchaseOrderInvoice: {
                ...purchaseOrderInvoice,
                id: voucherNumber?.last_id,
              },
              isPurchaseOrderSaved,
            };
            localStorage.setItem(
              PURCHASE_ORDER_LOCAL_STORAGE_KEY,
              JSON.stringify(draft)
            );
          }
        }
        setPurchaseOrderInvoice((prev) => ({
          ...prev,
          id: null,
          type: "طلب شراء",
        }));
      }
      refetchWarehouses();
    } catch (error) {
      setSnackbar({
        open: true,
        message:
          error.status === "FETCH_ERROR"
            ? "خطأ في الوصول إلى قاعدة البيانات"
            : "حدث خطأ، الرجاء المحاولة مرة أخرى أو إعادة تحميل الصفحة",
        type: "error",
      });
    }
  };

  // Save purchase order handler
  const handleSavePurchaseOrder = async () => {
    const fieldError =
      validateRequiredFields(purchaseOrderInvoice, true) ||
      validateItems(purchaseOrderInvoice.items);
    if (fieldError) {
      setSnackbar({ open: true, message: fieldError, type: "error" });
      return;
    }

    const purchaseOrderData = {
      ...purchaseOrderInvoice,
      supplier_name: "", // Ensure supplier_name is empty for purchase order
      items: purchaseOrderInvoice.items
        .filter((item) => Number(item.quantity) > 0)
        .map((item) => ({
          item_name: item.item_name,
          barcode: item.barcode,
          location: item.location,
          quantity: Number(item.quantity),
          unit_price: Number(item.unit_price),
          total_price: Number(item.total_price),
          description: item.description,
        })),
      total_amount: purchaseOrderTotalAmount,
      employee_name: user?.username,
      id: voucherNumber?.last_id,
      date,
      time,
    };

    try {
      await createInvoice(purchaseOrderData).unwrap();
      setIsPurchaseOrderSaved(true);
      setIsPurchaseOrderEditing(false);
      localStorage.removeItem(PURCHASE_ORDER_LOCAL_STORAGE_KEY);
      setPurchaseOrderInvoice((prev) => ({
        ...prev,
        id: voucherNumber?.last_id,
      }));
      setSnackbar({
        open: true,
        message: "تم حفظ طلب الشراء بنجاح",
        type: "success",
      });

      if (!isInvoiceSaved) {
        await refetchLastId();
        setNewInvoice((prev) => ({
          ...prev,
          id: voucherNumber?.last_id,
        }));
        setNewInvoice((prev) => ({
          ...prev,
          id: null,
        }));
      }
      refetchWarehouses();
    } catch (error) {
      setSnackbar({
        open: true,
        message:
          error.status === "FETCH_ERROR"
            ? "خطأ في الوصول إلى قاعدة البيانات"
            : "حدث خطأ، الرجاء المحاولة مرة أخرى أو إعادة تحميل الصفحة",
        type: "error",
      });
    }
  };

  // Clear invoice handler
  const clearInvoice = async () => {
    // Reset all relevant states
    setOperationType("");
    setPurchasesType("");
    setShowCommentField(false);
    setIsInvoiceSaved(false);
    setEditingMode(true);
    localStorage.removeItem(LOCAL_STORAGE_KEY);

    try {
      // Force refetch to get the latest ID
      const { data: updatedVoucherNumber } = await refetchLastId();
      const newId = updatedVoucherNumber?.last_id ?? null;

      // Update newInvoice with initial state and latest ID
      setNewInvoice({
        ...initialInvoiceState,
        id: newId,
      });

      // Log for debugging
      console.log("Cleared invoice, new ID:", newId);
    } catch (error) {
      console.error("Error refetching last invoice ID:", error);
      // Fallback: Reset with null ID
      setNewInvoice({
        ...initialInvoiceState,
        id: null,
      });
    }
  };

  // Clear purchase order handler
  const clearPurchaseOrder = async () => {
    // Reset all relevant states
    setIsPurchaseOrderSaved(false);
    setIsPurchaseOrderEditing(true);
    setShowPurchaseOrderCommentField(false);
    localStorage.removeItem(PURCHASE_ORDER_LOCAL_STORAGE_KEY);

    try {
      // Force refetch to get the latest ID
      const { data: updatedVoucherNumber } = await refetchLastId();
      const newId = updatedVoucherNumber?.last_id ?? null;

      // Update purchaseOrderInvoice with initial state and latest ID
      setPurchaseOrderInvoice({
        ...initialInvoiceState,
        type: "طلب شراء",
        id: newId,
      });

      // Log for debugging
      console.log("Cleared purchase order, new ID:", newId);
    } catch (error) {
      console.error("Error refetching last invoice ID:", error);
      // Fallback: Reset with null ID
      setPurchaseOrderInvoice({
        ...initialInvoiceState,
        type: "طلب شراء",
        id: null,
      });
    }
  };
  useEffect(() => {
    refetchLastId();
  }, [refetchLastId]);

  // Print handler
  const handlePrint = (isPurchaseOrder = false) => {
    const printClass = isPurchaseOrder
      ? "printable-purchase-order"
      : "printable-invoice";

    const style = document.createElement("style");
    style.innerHTML = `
    @media print {
      body * {
        visibility: hidden;
      }
      .${printClass}, .${printClass} * {
        visibility: visible;
      }
      .${printClass} {
        position: absolute;
        left: 0;
        top: 0;
        padding: 0px !important;
        margin: 0 !important;
        width: 100%;
      }
      .${printClass} input,
      .${printClass} textarea,
      .${printClass} .MuiAutocomplete-root {
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

  if (isLoadingUser) {
    return (
      <div className={styles.loadingContainer}>
        <CircularProgress />
      </div>
    );
  }

  if (
    !user?.create_additions &&
    !user?.create_inventory_operations &&
    user?.username !== "admin"
  ) {
    return <div className={styles.accessDenied}>هذه الصفحة غير متوفرة</div>;
  }

  return (
    <Box className={styles.mainBox}>
      {/* Operation Type Selectors and Purchase Order Button */}
      {!isInvoiceSaved && (
        <Box className={styles.typeSelectors}>
          {(user?.create_additions || user?.username === "admin") && (
            <TypeSelector
              newInvoice={newInvoice}
              label="مشتريات"
              value={purchasesType}
              options={purchasesTypes}
              onChange={(e) => handleTypeChange(e.target.value, true)}
            />
          )}

          {(user?.create_inventory_operations ||
            user?.username === "admin") && (
            <TypeSelector
              newInvoice={newInvoice}
              label="عمليات"
              value={operationType}
              options={operationTypes}
              onChange={(e) => handleTypeChange(e.target.value, false)}
              purchasesType={purchasesType}
            />
          )}

          <Box
            sx={{
              display: "flex",
              alignItems: "center",
            }}
          >
            {!isPurchaseOrder ? (
              <Button
                variant="contained"
                color="primary"
                sx={{ width: "100px" }}
                onClick={() => setIsPurchaseOrder(!isPurchaseOrder)}
              >
                طلب شراء
              </Button>
            ) : (
              <Button
                variant="outlined"
                color="error"
                sx={{ width: "100px" }}
                onClick={() => setIsPurchaseOrder(!isPurchaseOrder)}
              >
                إلغاء
              </Button>
            )}
          </Box>
        </Box>
      )}

      <Box sx={{ display: "flex", gap: "20px", overflowX: "auto" }}>
        {/* Invoice Component */}
        <Box sx={{ flex: isPurchaseOrder ? "1" : "auto" }}>
          <InvoiceModal
            className="printable-invoice"
            selectedInvoice={{
              ...newInvoice,
              id:
                newInvoice.id !== null ? newInvoice.id : voucherNumber?.last_id,
              date,
              time,
              employee_name: user?.username,
            }}
            isEditingInvoice={editingMode}
            editingInvoice={newInvoice}
            setEditingInvoice={setNewInvoice}
            selectedNowType={selectedNowType}
            addRow={() => addRow(false)}
            handleDeleteItemClick={(index) => removeRow(index, false)}
            isPurchasesType={!!purchasesType}
            showCommentField={showCommentField}
            show={false}
            isCreate={true}
          />
          {/* Main Invoice Action Buttons */}
          <Box className={styles.buttonsSection}>
            {!isInvoiceSaved ? (
              <>
                <Button
                  variant={showCommentField ? "outlined" : "contained"}
                  color={showCommentField ? "error" : "success"}
                  onClick={() => setShowCommentField(!showCommentField)}
                  className={
                    showCommentField
                      ? `${styles.cancelCommentButton} ${styles.infoBtn}`
                      : `${styles.addCommentButton} ${styles.infoBtn}`
                  }
                >
                  {showCommentField ? "إلغاء التعليق" : "إضافة تعليق"}
                </Button>

                <Button
                  variant="contained"
                  color="primary"
                  onClick={handleSave}
                  disabled={isSaving}
                  className={`${styles.saveButton} ${styles.infoBtn}`}
                >
                  {isSaving ? <CircularProgress size={24} /> : "تأكيد الحفظ"}
                </Button>

                <Button
                  variant="contained"
                  color="info"
                  onClick={clearInvoice}
                  className={`${styles.printButton} ${styles.infoBtn}`}
                >
                  فاتورة جديدة
                </Button>
              </>
            ) : (
              <>
                <Button
                  variant="contained"
                  color="primary"
                  onClick={clearInvoice}
                  className={styles.mainButton}
                >
                  فاتورة جديدة
                </Button>

                <Button
                  variant="contained"
                  color="success"
                  onClick={() => handlePrint(false)}
                  className={styles.mainButton}
                >
                  طباعة الفاتورة
                </Button>
              </>
            )}
          </Box>
        </Box>

        {/* Purchase Order Component */}
        {isPurchaseOrder && (
          <Box sx={{ flex: "1" }}>
            <InvoiceModal
              className="printable-purchase-order"
              selectedInvoice={{
                ...purchaseOrderInvoice,
                id:
                  purchaseOrderInvoice.id !== null
                    ? purchaseOrderInvoice.id
                    : voucherNumber?.last_id,
                type: "طلب شراء",
                date,
                time,
                employee_name: user?.username,
              }}
              isEditingInvoice={isPurchaseOrderEditing}
              editingInvoice={purchaseOrderInvoice}
              setEditingInvoice={setPurchaseOrderInvoice}
              selectedNowType={{ type: "طلب شراء" }}
              addRow={() => addRow(true)}
              handleDeleteItemClick={(index) => removeRow(index, true)}
              isPurchasesType={false}
              showCommentField={showPurchaseOrderCommentField}
              show={false}
              isCreate={true}
            />
            {/* Purchase Order Action Buttons */}
            <Box className={styles.buttonsSection}>
              {!isPurchaseOrderSaved ? (
                <>
                  <Button
                    variant={
                      showPurchaseOrderCommentField ? "outlined" : "contained"
                    }
                    color={showPurchaseOrderCommentField ? "error" : "success"}
                    onClick={() =>
                      setShowPurchaseOrderCommentField(
                        !showPurchaseOrderCommentField
                      )
                    }
                    className={
                      showPurchaseOrderCommentField
                        ? `${styles.cancelCommentButton} ${styles.infoBtn}`
                        : `${styles.addCommentButton} ${styles.infoBtn}`
                    }
                  >
                    {showPurchaseOrderCommentField
                      ? "إلغاء التعليق"
                      : "إضافة تعليق"}
                  </Button>

                  <Button
                    variant="contained"
                    color="primary"
                    onClick={handleSavePurchaseOrder}
                    disabled={isSaving}
                    className={`${styles.saveButton} ${styles.infoBtn}`}
                  >
                    {isSaving ? <CircularProgress size={24} /> : "تأكيد الحفظ"}
                  </Button>

                  <Button
                    variant="contained"
                    color="info"
                    onClick={clearPurchaseOrder}
                    className={`${styles.printButton} ${styles.infoBtn}`}
                  >
                    طلب جديد
                  </Button>
                </>
              ) : (
                <>
                  <Button
                    variant="contained"
                    color="primary"
                    onClick={clearPurchaseOrder}
                    className={styles.mainButton}
                  >
                    طلب جديد
                  </Button>

                  <Button
                    variant="contained"
                    color="success"
                    onClick={() => handlePrint(true)}
                    className={styles.mainButton}
                  >
                    طباعة الطلب
                  </Button>
                </>
              )}
            </Box>
          </Box>
        )}
      </Box>

      <SnackBar
        open={snackbar.open}
        message={snackbar.message}
        type={snackbar.type}
        onClose={() => setSnackbar((prev) => ({ ...prev, open: false }))}
      />
    </Box>
  );
}

// Reusable Type Selector Component
const TypeSelector = ({ newInvoice, label, value, options, onChange }) => (
  <FormControl
    sx={{
      m: 1,
      minWidth: 200,
      maxWidth: 300,
      backgroundColor: "white",
      borderRadius: "4px",
    }}
    variant="standard"
  >
    <InputLabel
      sx={{
        fontSize: "1.2rem",
        fontWeight: 600,
        color: "#1976d2",
        direction: "rtl",
        transition: "all 0.3s ease",
        position: "absolute",
        top: "50%",
        left: "47%",
        "&.Mui-focused": {
          transform:
            newInvoice.type === "اضافه"
              ? "translate(-30px, -60px)"
              : "translate(-30px, -60px)",
        },
        transform:
          newInvoice.type === "اضافه" && label === "مشتريات"
            ? "translate(-30px, -60px)"
            : newInvoice.type !== "اضافه" &&
              newInvoice.type !== "" &&
              label === "عمليات"
            ? "translate(-30px, -60px)"
            : "translate(-50%, -50%)",
      }}
      id={label}
    >
      {label}
    </InputLabel>
    <Select
      value={value}
      onChange={onChange}
      sx={{
        textAlign: "center",
        direction: "rtl",
        "& .MuiSelect-select": {
          padding: "8px 24px 8px 8px",
          fontSize: "1rem",
        },
      }}
      labelId={label}
      label={label}
      MenuProps={{
        PaperProps: {
          sx: {
            "& .MuiMenuItem-root": {
              justifyContent: "center",
              textAlign: "center",
              direction: "rtl",
              fontSize: "1rem",
              "&:hover": {
                backgroundColor: "#e3f2fd",
              },
            },
          },
        },
      }}
    >
      {(options || []).map((option, index) => (
        <MenuItem
          key={index}
          value={option}
          sx={{
            justifyContent: "center",
            textAlign: "center",
            direction: "rtl",
            "&:hover": {
              backgroundColor: "#e3f2fd",
            },
          }}
        >
          {option}
        </MenuItem>
      ))}
    </Select>
  </FormControl>
);
