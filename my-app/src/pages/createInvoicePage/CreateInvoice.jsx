import React, { useState, useEffect, useMemo } from "react";
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
import { isNumber } from "@mui/x-data-grid/internals";

// Import RTK Query hooks
import { useGetUserQuery } from "../services/userApi";
import {
  useGetLastInvoiceIdQuery,
  useCreateInvoiceMutation,
} from "../services/invoiceApi";
import InvoiceModal from "../../components/invoice/Invoice";
import { translateError } from "../../components/translateError/translateError";

export default function Type1() {
  // Operation Type Selection
  const [lastSelected, setLastSelected] = useState("");
  const operationTypes = ["صرف", "أمانات", "مرتجع", "توالف", "حجز"];
  const purchasesTypes = ["اضافه"];
  const [operationType, setOperationType] = useState("");
  const [purchasesType, setPurchasesType] = useState("");
  useEffect(() => {
    if (operationType !== "") {
      setLastSelected(operationType);
      setPurchasesType("");
    }
    if (operationType || purchasesType) {
      setNewInvoice({
        ...newInvoice,
        type: operationType || purchasesType,
      });
    }
  }, [operationType]);
  useEffect(() => {
    if (purchasesType !== "") {
      setLastSelected(purchasesType);
      setOperationType("");
    }
    if (operationType || purchasesType) {
      setNewInvoice({
        ...newInvoice,
        type: operationType || purchasesType,
      });
    }
  }, [purchasesType]);

  // create new invoice
  const [newInvoice, setNewInvoice] = useState({
    supplier_name: "",
    type: lastSelected,
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
        price_unit: 0,
        total_price: 0,
        description: "",
      },
    ],
    comment: "",
    payment_method: "Cash",
    amount_paid: 0,
    remain_amount: 0,
  });

  // Fetch data using RTK Query
  const {
    data: user,
    isLoading: isLoadingUser,
    refetch: refetchUser,
  } = useGetUserQuery();

  const {
    data: voucherNumber,
    isLoading: isLoadingVoucher,
    refetch: refetchVoucherNum,
  } = useGetLastInvoiceIdQuery(undefined, { pollingInterval: 300000 });

  // comment field
  const [showCommentField, setShowCommentField] = useState(false);
  const handleAddComment = () => {
    setShowCommentField(true);
  };
  const handleCancelComment = () => {
    setShowCommentField(false);
  };

  // create, add, remove item
  const addRow = () => {
    setNewInvoice((prev) => ({
      ...prev,
      items: [
        ...prev.items,
        {
          item_name: "",
          barcode: "",
          quantity: 0,
          location: "",
          price_unit: 0,
          total_price: 0,
          description: "",
          availableLocations: [],
        },
      ],
    }));
  };
  const removeRow = (index) => {
    setNewInvoice((prev) => ({
      ...prev,
      items: prev.items.filter((_, i) => i !== index),
    }));
  };

  // Calculate the total
  const totalAmount = useMemo(
    () =>
      newInvoice.items
        .reduce((total, row) => total + (row.total_price || 0), 0)
        .toFixed(2),
    [newInvoice.items]
  );

  // save invoice or not
  const [isInvoiceSaved, setIsInvoiceSaved] = useState(false);

  // Clear Invoice
  const clearInvoice = () => {
    localStorage.removeItem(LOCAL_STORAGE_KEY);
    setNewInvoice({
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
          price_unit: 0,
          total_price: 0,
          description: "",
        },
      ],
      comment: "",
      payment_method: "Cash",
      amount_paid: 0,
      remain_amount: 0,
    });
    setShowCommentField(false);
    setIsInvoiceSaved(false);
    setLastSelected("");
    setPurchasesType("");
    setOperationType("");
    setEditingMode(true);
  };

  // Get Date and Time
  const [date, setDate] = useState("");
  const [time, setTime] = useState("");
  useEffect(() => {
    const today = new Date();
    const formattedDate = today.toLocaleDateString({
      year: "numeric",
      month: "long",
      day: "numeric",
    });
    const formattedTime = today.toLocaleTimeString([], {
      hour: "2-digit",
      minute: "2-digit",
      hour12: true,
    });
    setDate(formattedDate);
    setTime(formattedTime);
  }, [isInvoiceSaved]);

  // snackbar
  const [openSnackbar, setOpenSnackbar] = useState(false);
  const [snackbarMessage, setSnackbarMessage] = useState("");
  const [snackBarType, setSnackBarType] = useState("");
  const handleCloseSnackbar = () => {
    setOpenSnackbar(false);
  };

  // handle local storage
  const LOCAL_STORAGE_KEY = "invoiceDraft";
  useEffect(() => {
    // if (!isWareHousesLoading) {
    const savedDraft = localStorage.getItem(LOCAL_STORAGE_KEY);
    if (savedDraft) {
      const draft = JSON.parse(savedDraft);
      // const updatedRows = draft.rows.map((row) => {
      //   const warehouseItem = warehouse?.find(
      //     (item) => item.item_name === row.item_name
      //   );
      //   return {
      //     ...row,
      //     locations: warehouseItem?.locations || [],
      //     maxquantity:
      //       warehouseItem?.locations?.find((l) => l.location === row.location)
      //         ?.quantity || 0,
      //   };
      // });

      setNewInvoice(draft.newInvoice);
      // setRows(updatedRows);
      setOperationType(draft.operationType);
      setPurchasesType(draft.purchasesType);
      setLastSelected(draft.lastSelected);
      setShowCommentField(draft.showCommentField);
      setIsInvoiceSaved(draft.isInvoiceSaved || false);
    }
    // }
  }, []);
  useEffect(() => {
    if (!isInvoiceSaved) {
      const draft = {
        newInvoice,
        operationType,
        purchasesType,
        lastSelected,
        showCommentField,
        isInvoiceSaved,
      };
      localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(draft));
    }
  }, [
    newInvoice,
    operationType,
    purchasesType,
    lastSelected,
    showCommentField,
    isInvoiceSaved,
  ]);

  // save invoice
  const [createInvoice, { isLoading: isSaving }] = useCreateInvoiceMutation();
  const handleSave = async () => {
    // console.log(draftInvoice);
    if (newInvoice.type === "") {
      setSnackbarMessage("يجب تحديد نوع العملية");
      setSnackBarType("info");
      setOpenSnackbar(true);
      return;
    }

    if (purchasesType) {
      if (
        newInvoice.machine_name === "" ||
        newInvoice.mechanism_name === "" ||
        newInvoice.supplier_name === ""
      ) {
        setSnackbarMessage("يجب ملئ اسم المورد واسم الماكينة واسم الميكانيزم");
        setSnackBarType("info");
        setOpenSnackbar(true);
        return;
      }
    } else if (
      newInvoice.machine_name === "" ||
      newInvoice.mechanism_name === ""
    ) {
      setSnackbarMessage("يجب ملئ اسم الماكينة واسم الميكانيزم");
      setSnackBarType("info");
      setOpenSnackbar(true);
      return;
    }

    let newRows = newInvoice.items.filter(
      (row) => Number(row.quantity) !== 0 && isNumber(Number(row.quantity))
    );
    if (
      newRows.length === 0 ||
      (newRows.length === 1 && isNaN(newRows[0].quantity)) ||
      (newRows.length === 1 && newRows[0].quantity === "")
    ) {
      setSnackbarMessage("يجب ملء عنصر واحد على الأقل");
      setSnackBarType("warning");
      setOpenSnackbar(true);
      return;
    }

    newRows = newRows.map((row, index) => ({
      ...row,
      counter: index + 1,
    }));

    const updatedInvoice = {
      ...newInvoice,
      items: newRows
        .filter((row) => row.quantity > 0)
        .map((row) => ({
          item_name: row.item_name,
          barcode: row.barcode,
          quantity: Number(row.quantity),
          location: row.location,
          total_price: row.total_price,
          description: row.description,
          unit_price: Number(row.unit_price),
        })),
      payment_method: newInvoice.payment_method,
      paid: newInvoice.amount_paid,
      residual: newInvoice.amount_paid - totalAmount,
      comment: newInvoice.comment,
    };

    console.log("new invoice being set: ", updatedInvoice);
    const accessToken = localStorage.getItem("access_token");
    if (!accessToken) return;

    try {
      // await createInvoice(updatedInvoice).unwrap();
      await createInvoice({
        ...updatedInvoice,
        total_amount: updatedInvoice.items.reduce(
          (sum, item) => sum + item.total_price,
          0
        ),
      }).unwrap();
      setIsInvoiceSaved(true);
      localStorage.removeItem(LOCAL_STORAGE_KEY);
      setSnackbarMessage("تم حفظ الفاتورة بنجاح");
      setSnackBarType("success");
      setOpenSnackbar(true);
      setEditingMode(false);
      setNewInvoice(updatedInvoice);
    } catch (err) {
      const translatedError = await translateError(
        err?.data?.message || "An error occurred"
      );
      setSnackbarMessage(translatedError);
      console.error("Error saving invoice:", err);
      setSnackBarType("error");
      setOpenSnackbar(true);
    }
  };

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
          margin: 0 !important;
          width: 100% !important;

        }
        .printable-box img {
          width: 200px !important;
          margin-bottom: 5px !important;
        }
        .printable-box * {
          font-size: 15px !important;
        }
        .printable-box table {
          width: 100% !important;
        }
        .printable-box .MuiTableCell-root {
          padding: 4px !important;
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

  const [editingMode, setEditingMode] = useState(true);

  const selectedNowType = useMemo(
    () => ({
      type: purchasesType || operationType,
    }),
    [purchasesType, operationType]
  );

  const draftInvoice = useMemo(
    () => ({
      ...newInvoice,
      id: voucherNumber?.last_id,
      date,
      time,
      employee_name: user?.username,
      warehouse_manager: "",
      residual: newInvoice.amount_paid - totalAmount,
      total_amount: totalAmount,
    }),
    [
      newInvoice,
      voucherNumber?.last_id,
      date,
      time,
      user?.username,
      totalAmount,
    ]
  );

  useEffect(() => {
    refetchUser();
    refetchVoucherNum();
  }, [refetchUser, refetchVoucherNum]);
  // console.log(newInvoice);

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
      user?.create_additions ||
      user?.create_inventory_operations ||
      user?.username === "admin"
    ) {
      return (
        <Box className={styles.mainBox}>
          {/* Operation Type Selection */}
          <Box
            sx={{
              display: isInvoiceSaved ? "none" : "flex",
              justifyContent: "center",
              gap: 4,
              flexWrap: "wrap",
              alignItems: "center",
            }}
          >
            {(user?.create_additions || user?.username === "admin") && (
              <div className={styles.operationTypeSelection}>
                <FormControl
                  variant="standard"
                  sx={{ m: 1, minWidth: 220, backgroundColor: "white" }}
                >
                  <InputLabel
                    id="purchases-select-label"
                    sx={{
                      fontSize: "1.2rem",
                      fontWeight: "600",
                      marginBottom: "6px",
                      color: "#1976d2",
                      transition: "all 0.3s ease",
                      position: "absolute",
                      top: "50%",
                      left: "48%",
                      "&.Mui-focused": {
                        transform: "translate(-37px, -60px)",
                      },
                      transform: purchasesType
                        ? "translate(-37px, -60px)"
                        : "translate(-50%, -50%)",
                    }}
                  >
                    مشتريات
                  </InputLabel>
                  <Select
                    labelId="purchases-select-label"
                    value={purchasesType}
                    onChange={(e) => setPurchasesType(e.target.value)}
                    label="مشتريات"
                    sx={{
                      padding: "0 0 10px 0",
                    }}
                  >
                    {purchasesTypes.map((type, index) => (
                      <MenuItem
                        sx={{
                          "&.MuiMenuItem-root": {
                            direction: "rtl",
                          },
                        }}
                        key={index}
                        value={type}
                      >
                        {type}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </div>
            )}
            {(user?.create_inventory_operations ||
              user?.username === "admin") && (
              <div className={styles.operationTypeSelection}>
                <FormControl
                  variant="standard"
                  sx={{ m: 1, minWidth: 220, backgroundColor: "white" }}
                >
                  <InputLabel
                    id="purchases-select-label"
                    sx={{
                      fontSize: "1.2rem",
                      fontWeight: "600",
                      marginBottom: "6px",
                      color: "#1976d2",
                      transition: "all 0.3s ease",
                      position: "absolute",
                      top: "50%",
                      left: "48%",
                      "&.Mui-focused": {
                        transform: "translate(-30px, -60px)",
                      },
                      transform: operationType
                        ? "translate(-30px, -60px)"
                        : "translate(-50%, -50%)",
                    }}
                  >
                    عمليات
                  </InputLabel>
                  <Select
                    labelId="operation-select-label"
                    value={operationType}
                    onChange={(e) => setOperationType(e.target.value)}
                    label="عمليات"
                    sx={{
                      padding: "0 0 10px 0",
                    }}
                  >
                    {operationTypes.map((type, index) => (
                      <MenuItem
                        sx={{
                          "&.MuiMenuItem-root": {
                            direction: "rtl",
                          },
                        }}
                        key={index}
                        value={type}
                      >
                        {type}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </div>
            )}
          </Box>

          {/* invoice */}
          {isLoadingUser ? (
            <div className={styles.loading}>
              <CircularProgress />
            </div>
          ) : (
            <>
              <InvoiceModal
                selectedInvoice={draftInvoice}
                isEditingInvoice={editingMode}
                editingInvoice={draftInvoice}
                setEditingInvoice={setNewInvoice}
                show={false}
                selectedNowType={selectedNowType}
                addRow={addRow}
                handleDeleteItemClick={removeRow}
                isPurchasesType={purchasesType}
                isCreate={true}
                showCommentField={showCommentField}
              />

              {/* Add Comment Button */}
              {!isInvoiceSaved ? (
                <Box className={styles.buttonsSection}>
                  {!showCommentField ? (
                    <Button
                      variant="contained"
                      color="success"
                      onClick={handleAddComment}
                      className={`${styles.addCommentButton} ${styles.infoBtn}`}
                    >
                      تعليق
                    </Button>
                  ) : (
                    <Button
                      variant="outlined"
                      color="error"
                      onClick={handleCancelComment}
                      className={`${styles.cancelCommentButton} ${styles.infoBtn}`}
                    >
                      الغاء
                    </Button>
                  )}

                  <Button
                    variant="contained"
                    color="primary"
                    onClick={handleSave}
                    className={`${styles.saveButton} ${styles.infoBtn}`}
                    disabled={isSaving}
                  >
                    {isSaving ? (
                      <CircularProgress size={24} sx={{ color: "white" }} />
                    ) : (
                      "تأكيد"
                    )}
                  </Button>

                  <Button
                    variant="contained"
                    color="info"
                    onClick={clearInvoice}
                    className={`${styles.printButton} ${styles.infoBtn}`}
                  >
                    فاتورة جديدة
                  </Button>
                </Box>
              ) : (
                <Box className={styles.buttonsSection}>
                  <Button
                    variant="contained"
                    color="primary"
                    onClick={clearInvoice}
                    className={`${styles.saveButton} ${styles.infoBtn}`}
                  >
                    فاتورة جديدة
                  </Button>

                  <Button
                    variant="contained"
                    color="info"
                    onClick={handlePrint}
                    className={`${styles.printButton} ${styles.infoBtn}`}
                  >
                    طباعة الفاتورة
                  </Button>
                </Box>
              )}
            </>
          )}

          {/* Snackbar */}
          <SnackBar
            open={openSnackbar}
            message={snackbarMessage}
            type={snackBarType}
            onClose={handleCloseSnackbar}
          />
        </Box>
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
