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
import {
  useGetLastInvoiceIdQuery,
  useCreateInvoiceMutation,
} from "../services/invoiceApi";

// Constants
const operationTypes = ["صرف", "أمانات", "مرتجع", "توالف", "حجز"];
const purchasesTypes = ["اضافه"];
const LOCAL_STORAGE_KEY = "invoiceDraft";

const initialInvoiceState = {
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
  const [isInvoiceSaved, setIsInvoiceSaved] = useState(false);
  const [editingMode, setEditingMode] = useState(true);

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

  // Derived values
  const totalAmount = useMemo(
    () =>
      newInvoice.items
        .reduce((total, row) => total + (row.total_price || 0), 0)
        .toFixed(2),
    [newInvoice.items]
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
    ); // h:mm AM/PM
  }, [isInvoiceSaved]);

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
  const addRow = useCallback(() => {
    setNewInvoice((prev) => ({
      ...prev,
      items: [...prev.items, { ...initialInvoiceState.items[0] }],
    }));
  }, []);

  const removeRow = useCallback((index) => {
    setNewInvoice((prev) => ({
      ...prev,
      items: prev.items.filter((_, i) => i !== index),
    }));
  }, []);

  // Local storage persistence
  useEffect(() => {
    if (!isInvoiceSaved) {
      const draft = {
        newInvoice,
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

  // Validation helpers
  const validateRequiredFields = () => {
    if (!newInvoice.type) return "يجب تحديد نوع العملية";

    const requiredFields = purchasesType
      ? ["machine_name", "mechanism_name", "supplier_name"]
      : ["machine_name", "mechanism_name"];

    const missingFields = requiredFields.filter((field) => !newInvoice[field]);

    if (missingFields.length > 0) {
      return purchasesType
        ? "يجب ملء اسم المورد واسم الماكينة واسم الميكانيزم"
        : "يجب ملء اسم الماكينة واسم الميكانيزم";
    }
    return null;
  };

  const validateItems = () => {
    const validItems = newInvoice.items.filter(
      (item) => Number(item.quantity) > 0 && !isNaN(Number(item.quantity))
    );

    if (validItems.length === 0) return "يجب ملء عنصر واحد على الأقل";
    return null;
  };

  // Save invoice handler
  const handleSave = async () => {
    const fieldError = validateRequiredFields() || validateItems();
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

    console.log(invoiceData);
    try {
      await createInvoice(invoiceData).unwrap();
      setIsInvoiceSaved(true);
      setEditingMode(false);
      localStorage.removeItem(LOCAL_STORAGE_KEY);
      setSnackbar({
        open: true,
        message: "تم حفظ الفاتورة بنجاح",
        type: "success",
      });
    } catch (error) {
      if (error.response && error.response.status === 500) {
        setSnackbar({
          open: true,
          message: "خطأ في الوصول إلى قاعدة البيانات",
          type: "error",
        });
      } else {
        setSnackbar({
          open: true,
          message:
            "حدث خطأ، الرجاء المحاولة مرة اخرى او محاولة اعادة تحميل الصفحة",
          type: "error",
        });
      }
    }
  };

  // Clear invoice handler
  const clearInvoice = () => {
    setNewInvoice(initialInvoiceState);
    setOperationType("");
    setPurchasesType("");
    setShowCommentField(false);
    setIsInvoiceSaved(false);
    setEditingMode(true);
    localStorage.removeItem(LOCAL_STORAGE_KEY);
    refetchLastId();
  };
  useEffect(() => {
    refetchLastId();
  }, [refetchLastId]);
  
  // Print handler
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
          padding: 0px !important;
          margin: 0 !important;
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
      {/* Operation Type Selectors */}
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
        </Box>
      )}

      {/* Invoice Component */}
      <InvoiceModal
        selectedInvoice={{
          ...newInvoice,
          id: voucherNumber?.last_id,
          date,
          time,
          employee_name: user?.username,
        }}
        isEditingInvoice={editingMode}
        editingInvoice={newInvoice}
        setEditingInvoice={setNewInvoice}
        selectedNowType={selectedNowType}
        addRow={addRow}
        handleDeleteItemClick={removeRow}
        isPurchasesType={!!purchasesType}
        showCommentField={showCommentField}
        show={false}
        isCreate={true}
      />

      {/* Action Buttons */}
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
              {showCommentField ? "الغاء" : "تعليق"}
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
              onClick={handlePrint}
              className={styles.mainButton}
            >
              طباعة الفاتورة
            </Button>
          </>
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
      {options.map((option, index) => (
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
