import React, { useState, useEffect, useMemo, useCallback } from "react";
import {
  Box,
  Table,
  TableBody,
  TableCell,
  TableRow,
  Button,
  TextField,
  Select,
  MenuItem,
  FormControl,
  IconButton,
  Autocomplete,
  InputLabel,
} from "@mui/material";
import ClearIcon from "@mui/icons-material/Clear";
import AddIcon from "@mui/icons-material/Add";
import logo from "./logo.png";
import styles from "./CreateInvoice.module.css";
import SnackBar from "../../components/snackBar/SnackBar";
import CircularProgress from "@mui/material/CircularProgress";
import NumberInput from "../../components/number/NumberInput";
import CustomAutoCompleteField from "../../components/customAutoCompleteField/CustomAutoCompleteField";
import { isNumber } from "@mui/x-data-grid/internals";

// Import RTK Query hooks
import { useGetUserQuery } from "../services/userApi";
import { useGetSuppliersQuery } from "../services/supplierApi";
import { useGetMachinesQuery } from "../services/machineApi";
import { useGetMechanismsQuery } from "../services/mechanismApi";
import { useGetWarehousesQuery } from "../services/warehouseApi";
import {
  useGetLastInvoiceIdQuery,
  useCreateInvoiceMutation,
} from "../services/invoiceApi";

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
      rows.map((row) => {
        const targetRow = row.locations.find(
          (location) => location.location === row.location
        );
        if (targetRow && row.quantity > targetRow.quantity) {
          row.quantity = 0;
        }
        return row;
      });
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
    suplier_name: "",
    type: lastSelected,
    client_name: "",
    warehouse_manager: "",
    total_amount: 0,
    employee_name: "",
    machine_name: "",
    mechanism_name: "",
    items: [],
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

  useEffect(() => {
    refetchUser();
  }, []);

  const { data: supliers, isLoading: isSupliersLoading } = useGetSuppliersQuery(
    undefined,
    { pollingInterval: 300000 }
  );

  const { data: machines, isLoading: isMachinesLoading } = useGetMachinesQuery(
    undefined,
    { pollingInterval: 300000 }
  );

  const { data: mechanisms, isLoading: isMechanismsLoading } =
    useGetMechanismsQuery(undefined, { pollingInterval: 300000 });

  const {
    data: warehouse,
    isLoading: isWareHousesLoading,
    refetch,
  } = useGetWarehousesQuery(undefined, { pollingInterval: 300000 });

  const { data: voucherNumber, isLoading: isLoadingVoucher } =
    useGetLastInvoiceIdQuery(undefined, { pollingInterval: 300000 });

  // comment field
  const [showCommentField, setShowCommentField] = useState(false);
  const handleAddComment = () => {
    setShowCommentField(true);
  };
  const handleCancelComment = () => {
    setShowCommentField(false);
  };

  // create, add, remove item
  const [rows, setRows] = useState([
    {
      counter: 1,
      item_name: "",
      barcode: "",
      quantity: 0,
      location: "",
      maxquantity: 0,
      price_unit: 0,
      total_price: 0,
      description: "",
      locations: [],
    },
  ]);
  const addRow = () => {
    setRows((prevRows) => [
      ...prevRows,
      {
        counter: prevRows.length + 1,
        item_name: "",
        barcode: "",
        quantity: 0,
        location: "",
        maxquantity: 0,
        price_unit: 0,
        total_price: 0,
        description: "",
        locations: [],
      },
    ]);
  };
  const removeRow = (index) => {
    const newRows = rows.filter((row, i) => i !== index);
    setRows(newRows.map((row, i) => ({ ...row, counter: i + 1 })));
  };

  // Create warehouse map for faster lookups
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

  // handle rows fields change
  const handleItemChange = useCallback(
    (e, newValue, index) => {
      const selectedItem = warehouseMap.get(newValue);
      if (selectedItem) {
        setRows((prevRows) => {
          const newRows = [...prevRows];
          newRows[index] = {
            ...newRows[index],
            item_name: selectedItem.item_name,
            barcode: selectedItem.item_bar,
            locations: selectedItem.locations,
            location: "",
            quantity: 0,
          };
          return newRows;
        });
      }
    },
    [warehouseMap]
  );
  const handleLocationChange = useCallback(
    (e, newLocation, index, barCodeItem) => {
      setRows((prevRows) => {
        const selectedLocation = prevRows[index].locations.find(
          (loc) => loc.location === newLocation
        );

        if (selectedLocation) {
          if (
            prevRows.some(
              (row) =>
                row.barcode === barCodeItem && row.location === newLocation
            )
          ) {
            setSnackbarMessage("هذا العنصر موجود بالفعل");
            setSnackBarType("info");
            setOpenSnackbar(true);
            return prevRows;
          }

          const newRows = [...prevRows];
          newRows[index] = {
            ...newRows[index],
            location: selectedLocation.location,
            quantity: 0,
            price_unit: selectedLocation.price_unit,
            total_price: 0,
            maxquantity: selectedLocation.quantity,
          };
          return newRows;
        }
        return prevRows;
      });
    },
    []
  );
  const handleQuantityChange = useCallback(
    (index, value, maxquantity, priceunit) => {
      const quantity = parseFloat(value);
      setRows((prevRows) => {
        const newRows = [...prevRows];
        newRows[index] = {
          ...newRows[index],
          quantity: quantity,
          total_price: priceunit * (quantity || 0),
        };
        return newRows;
      });
    },
    []
  );

  // Calculate the total
  const totalAmount = useMemo(
    () =>
      rows.reduce((total, row) => total + (row.total_price || 0), 0).toFixed(2),
    [rows]
  );

  // save invoice or not
  const [isInvoiceSaved, setIsInvoiceSaved] = useState(false);

  // Clear Invoice
  const clearInvoice = () => {
    localStorage.removeItem(LOCAL_STORAGE_KEY);
    setNewInvoice({
      suplier_name: "",
      type: lastSelected,
      client_name: "",
      warehouse_manager: "",
      total_amount: 0,
      employee_name: "",
      machine_name: "",
      mechanism_name: "",
      items: [],
      comment: "",
      payment_method: "Cash",
      amount_paid: 0,
      remain_amount: 0,
    });
    setRows([
      {
        counter: 1,
        item_name: "",
        barcode: "",
        quantity: 0,
        location: "",
        price_unit: 0,
        total_price: 0,
        description: "",
        locations: [],
      },
    ]);
    setShowCommentField(false);
    setIsInvoiceSaved(false);
    setLastSelected("");
    setPurchasesType("");
    setOperationType("");
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
    if (!isWareHousesLoading) {
      const savedDraft = localStorage.getItem(LOCAL_STORAGE_KEY);
      if (savedDraft) {
        const draft = JSON.parse(savedDraft);
        const updatedRows = draft.rows.map((row) => {
          const warehouseItem = warehouse?.find(
            (item) => item.item_name === row.item_name
          );
          return {
            ...row,
            locations: warehouseItem?.locations || [],
            maxquantity:
              warehouseItem?.locations?.find((l) => l.location === row.location)
                ?.quantity || 0,
          };
        });

        setNewInvoice(draft.newInvoice);
        setRows(updatedRows);
        setOperationType(draft.operationType);
        setPurchasesType(draft.purchasesType);
        setLastSelected(draft.lastSelected);
        setShowCommentField(draft.showCommentField);
        setIsInvoiceSaved(draft.isInvoiceSaved || false);
      }
    }
  }, [isWareHousesLoading, warehouse]);
  useEffect(() => {
    if (!isInvoiceSaved && !isWareHousesLoading) {
      const draft = {
        newInvoice,
        rows: rows.map((row) => ({
          ...row,
          locations: [],
          maxquantity: 0,
        })),
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
    rows,
    operationType,
    purchasesType,
    lastSelected,
    showCommentField,
    isInvoiceSaved,
    isWareHousesLoading,
  ]);

  // save invoice
  const [createInvoice, { isLoading: isSaving }] = useCreateInvoiceMutation();
  const handleSave = async () => {
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
        newInvoice.suplier_name === ""
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

    let newRows = rows.filter(
      (row) => row.quantity !== 0 && isNumber(row.quantity)
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
      type: newInvoice.type,
      client_name: newInvoice.client_name,
      total_amount: totalAmount || 0,
      paid: newInvoice.amount_paid || 0,
      residual: newInvoice.amount_paid - totalAmount || 0,
      comment: newInvoice.comment,
      employee_name: user.username,
      machine_name: newInvoice.machine_name,
      mechanism_name: newInvoice.mechanism_name,
      supplier_name: newInvoice.suplier_name,
      items: newRows.map((row) => ({
        item_name: row.item_name,
        barcode: row.barcode,
        quantity: row.quantity,
        location: row.location,
        total_price: row.total_price,
        description: row.description,
        unit_price: row.price_unit,
      })),
    };
    console.log("new invoice being set: ", updatedInvoice);
    const accessToken = localStorage.getItem("access_token");
    if (!accessToken) return;

    try {
      await createInvoice(updatedInvoice).unwrap();
      setIsInvoiceSaved(true);
      localStorage.removeItem(LOCAL_STORAGE_KEY);
      setRows(newRows);
      setSnackbarMessage("تم حفظ الفاتورة بنجاح");
      setSnackBarType("success");
      setOpenSnackbar(true);
      refetch();
    } catch (err) {
      console.error("Error saving invoice:", err);
      setSnackbarMessage(
        "خطا في حفظ الفاتورة اذا استمرت المشكله قم باعادة تحميل الصفحة"
      );
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
      user.create_invoice_status === "العرض والتعديل" ||
      user.create_invoice_status === "العرض"
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
          </Box>

          {/* invoice */}
          <Box className={styles.outerBox}>
            <Box
              className={`printable-box ${styles.printableBox}`}
              sx={{
                pointerEvents: isInvoiceSaved ? "none" : "",
                width: "100%",
                border: isInvoiceSaved ? "none" : "",
              }}
            >
              {/* Header Section */}
              <Box className={styles.headerSection}>
                <Box className={styles.logoBox}>
                  <img src={logo} alt="Logo" className={styles.logoImage} />
                </Box>
                <Box className={styles.operationTypeBox}>
                  <Box className={styles.operationTypeText}>نوع العملية</Box>
                  <Box className={styles.operationTypeName}>{lastSelected}</Box>
                </Box>
                <Box className={styles.infoBox}>
                  <Box className={styles.infoItem}>
                    <Box className={styles.infoLabel}>رقم السند:</Box>
                    <Box className={styles.infoValue}>
                      {isLoadingVoucher ? (
                        <CircularProgress size={15} />
                      ) : (
                        voucherNumber?.last_id
                      )}
                    </Box>
                  </Box>
                  <Box className={styles.infoItem}>
                    <Box className={styles.infoLabel}>التاريخ</Box>
                    <Box className={styles.infoValue}>{date}</Box>
                  </Box>
                  <Box className={styles.infoItem}>
                    <Box className={styles.infoLabel}>الوقت</Box>
                    <Box className={styles.infoValue}>{time}</Box>
                  </Box>
                </Box>
              </Box>

              {/* Table Section */}
              <Box className={styles.tableSection}>
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
                    {purchasesType && (
                      <TableRow className={styles.tableRow}>
                        <TableCell className={styles.tableCell} colSpan={2}>
                          اسم المورد
                        </TableCell>
                        <TableCell
                          className={styles.tableInputCell}
                          colSpan={6}
                          sx={{
                            padding: "0px !important",
                          }}
                        >
                          {isInvoiceSaved ? (
                            newInvoice.suplier_name
                          ) : (
                            <CustomAutoCompleteField
                              loading={isSupliersLoading}
                              values={supliers}
                              editingItem={newInvoice}
                              setEditingItem={setNewInvoice}
                              fieldName="suplier_name"
                              placeholder="اسم المورد"
                              isOptionEqualToValue={(option, value) =>
                                option.name === value.name
                              }
                            />
                          )}
                        </TableCell>
                      </TableRow>
                    )}
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
                        {isInvoiceSaved ? (
                          newInvoice.machine_name
                        ) : (
                          <CustomAutoCompleteField
                            loading={isMachinesLoading}
                            values={machines}
                            editingItem={newInvoice}
                            setEditingItem={setNewInvoice}
                            fieldName="machine_name"
                            placeholder="اسم الماكينة"
                            isOptionEqualToValue={(option, value) =>
                              option.name === value.name
                            }
                          />
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
                        {isInvoiceSaved ? (
                          newInvoice.mechanism_name
                        ) : (
                          <CustomAutoCompleteField
                            loading={isMechanismsLoading}
                            values={mechanisms}
                            editingItem={newInvoice}
                            setEditingItem={setNewInvoice}
                            fieldName="mechanism_name"
                            placeholder="اسم الميكانيزم"
                            isOptionEqualToValue={(option, value) =>
                              option.name === value.name
                            }
                          />
                        )}
                      </TableCell>
                    </TableRow>
                    {/* Headers for Items */}
                    <TableRow>
                      <TableCell className={styles.tableCell}>
                        <AddIcon onClick={addRow} className={styles.addIcon} />
                      </TableCell>
                      <TableCell className={styles.tableCell}>
                        اسم الصنف
                      </TableCell>
                      <TableCell className={styles.tableCell}>الرمز</TableCell>
                      <TableCell className={styles.tableCell}>الموقع</TableCell>
                      <TableCell className={styles.tableCell}>الكمية</TableCell>
                      {purchasesType && (
                        <>
                          <TableCell className={styles.tableCell}>
                            سعر القطعة
                          </TableCell>
                          <TableCell className={styles.tableCell}>
                            إجمالي السعر
                          </TableCell>
                        </>
                      )}
                      <TableCell className={styles.tableCell}>بيان</TableCell>
                    </TableRow>
                    {/* Rows for Data */}
                    {rows.map((row, index) => (
                      <TableRow key={index}>
                        <TableCell
                          className={styles.tableCellRow}
                          sx={{
                            position: "relative",
                            width: "10px !important",
                          }}
                        >
                          {row.counter}
                          <IconButton
                            variant="contained"
                            color="error"
                            onClick={() => removeRow(index)}
                            className={styles.clearIcon}
                            sx={{
                              visibility: isInvoiceSaved ? "hidden" : "",
                            }}
                          >
                            <ClearIcon fontSize="small" />
                          </IconButton>
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
                          {isInvoiceSaved ? (
                            row.item_name
                          ) : (
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
                              value={row.item_name || ""}
                              sx={{
                                "& .MuiAutocomplete-clearIndicator": {
                                  display: "none",
                                },
                                "& .MuiAutocomplete-popupIndicator": {
                                  display: isInvoiceSaved ? "none" : "",
                                },
                                "& .MuiOutlinedInput-root": {
                                  padding: "10px",
                                  paddingRight: isInvoiceSaved
                                    ? "10px!important"
                                    : "35px!important",
                                  fontSize: "14px",
                                },
                                "& .MuiOutlinedInput-root .MuiOutlinedInput-notchedOutline":
                                  {
                                    border: "none",
                                  },
                              }}
                              options={itemNames}
                              getOptionLabel={(option) => option}
                              onChange={(e, newValue) =>
                                handleItemChange(e, newValue, index)
                              }
                              renderInput={(params) => (
                                <TextField
                                  {...params}
                                  placeholder="اسم العنصر"
                                />
                              )}
                            />
                          )}
                        </TableCell>
                        <TableCell className={styles.tableCellRow}>
                          {row.barcode || ""}
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
                          {isInvoiceSaved ? (
                            row.location
                          ) : (
                            <Autocomplete
                              loading={row.item_name === "" ? false : true}
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
                              value={row.location || ""}
                              sx={{
                                "& .MuiAutocomplete-clearIndicator": {
                                  display: "none",
                                },
                                "& .MuiAutocomplete-popupIndicator": {
                                  display: isInvoiceSaved ? "none" : "",
                                },
                                "& .MuiOutlinedInput-root": {
                                  padding: "10px",
                                  paddingRight: isInvoiceSaved
                                    ? "10px!important"
                                    : "35px!important",
                                  fontSize: "14px",
                                },
                                "& .MuiOutlinedInput-root .MuiOutlinedInput-notchedOutline":
                                  {
                                    border: "none",
                                  },
                              }}
                              options={
                                row.locations
                                  ? row.locations.map((loc) => loc.location)
                                  : []
                              }
                              onChange={(e, newLocation) => {
                                handleLocationChange(
                                  e,
                                  newLocation,
                                  index,
                                  row.barcode
                                );
                              }}
                              renderInput={(params) => (
                                <TextField {...params} placeholder="الموقع" />
                              )}
                            />
                          )}
                        </TableCell>
                        <TableCell
                          className={styles.tableCellRow}
                          sx={{
                            width: isInvoiceSaved ? "" : "100px",
                          }}
                        >
                          {isInvoiceSaved ? (
                            row.quantity
                          ) : (
                            <NumberInput
                              style={{
                                width: "100px",
                              }}
                              max={operationType && row.maxquantity}
                              value={row?.quantity}
                              onInput={(e) => {
                                if (
                                  lastSelected !== "" &&
                                  row.location !== ""
                                ) {
                                  if (e.target.value < 0) {
                                    e.target.value = 0;
                                  }
                                  if (
                                    operationType &&
                                    e.target.value > row.maxquantity
                                  ) {
                                    e.target.value = row.maxquantity;
                                  }
                                } else {
                                  e.target.value = 0;
                                }
                              }}
                              onChange={(e) => {
                                handleQuantityChange(
                                  index,
                                  e.target.value,
                                  row.maxquantity,
                                  row.price_unit
                                );
                              }}
                              onClick={(event) => {
                                if (
                                  lastSelected === "" ||
                                  row.location === ""
                                ) {
                                  setSnackbarMessage(
                                    "يجب تحديد نوع العملية وموقع العنصر اولا"
                                  );
                                  setSnackBarType("info");
                                  setOpenSnackbar(true);
                                  event.target.blur();

                                  return;
                                }
                              }}
                              onDoubleClick={(event) => {
                                if (
                                  lastSelected === "" ||
                                  row.location === ""
                                ) {
                                  setSnackbarMessage(
                                    "يجب تحديد نوع العملية وموقع العنصر اولا"
                                  );
                                  setSnackBarType("info");
                                  setOpenSnackbar(true);
                                  event.target.blur();

                                  return;
                                }
                              }}
                              className={styles.cellInput}
                            />
                          )}
                        </TableCell>
                        <TableCell
                          sx={{
                            display: purchasesType ? "" : "none",
                          }}
                          className={styles.tableCellRow}
                        >
                          {row.price_unit}
                        </TableCell>
                        <TableCell
                          sx={{
                            display: purchasesType ? "" : "none",
                          }}
                          className={styles.tableCellRow}
                        >
                          {row.total_price}
                        </TableCell>
                        <TableCell
                          className={styles.tableCellRow}
                          sx={{
                            maxWidth: "150px",
                            whiteSpace: "normal",
                            wordWrap: "break-word",
                          }}
                        >
                          {isInvoiceSaved ? (
                            row.description
                          ) : (
                            <textarea
                              value={row.description}
                              onChange={(e) =>
                                setRows(
                                  rows.map((row, rowIndex) => {
                                    if (rowIndex === index) {
                                      return {
                                        ...row,
                                        description: e.target.value,
                                      };
                                    } else {
                                      return row;
                                    }
                                  })
                                )
                              }
                              className={styles.cellInput}
                              style={{
                                whiteSpace: "normal",
                                wordWrap: "break-word",
                                resize: "none",
                                width: "100%",
                              }}
                            />
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </Box>

              {/* Total Amount Section */}
              {purchasesType && (
                <>
                  <Box className={styles.MoneySection}>
                    <Box className={styles.MoneyBox}>
                      <Box className={styles.MoneyLabel}>الإجمالي</Box>
                      <Box
                        className={styles.MoneyValue}
                        sx={{ marginBottom: isInvoiceSaved ? "" : "10px" }}
                      >
                        {totalAmount}
                      </Box>
                    </Box>
                    <Box className={styles.MoneyBox}>
                      <Box className={styles.MoneyLabel}>طريقة الدفع</Box>
                      <Box
                        className={styles.MoneyValue}
                        sx={{ padding: "0px" }}
                      >
                        {isInvoiceSaved ? (
                          newInvoice.payment_method
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
                                  option.value === newInvoice.payment_method
                              ) || null
                            }
                            onChange={(event, newValue) => {
                              setNewInvoice({
                                ...newInvoice,
                                payment_method: newValue ? newValue.value : "",
                              });
                            }}
                            sx={{
                              minWidth: "200px",

                              "& .MuiAutocomplete-clearIndicator": {
                                display: "none",
                              },
                              "& .MuiAutocomplete-popupIndicator": {
                                display: isInvoiceSaved ? "none" : "",
                              },
                              "& .MuiOutlinedInput-root": {
                                paddingRight: isInvoiceSaved
                                  ? "10px!important"
                                  : "35px!important",
                                fontSize: "1rem",
                                padding: "0",
                                paddingLeft: isInvoiceSaved ? "" : "35px",
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
                        {isInvoiceSaved ? (
                          newInvoice.amount_paid || 0
                        ) : (
                          <NumberInput
                            style={{
                              width: "100%",
                              border: "none",
                              outline: "none",
                              height: "40px",
                              fontSize: "1rem",
                              textAlign: "center",
                              paddingRight: isInvoiceSaved ? "" : "15px",
                            }}
                            value={newInvoice.amount_paid}
                            onChange={(e) =>
                              setNewInvoice({
                                ...newInvoice,
                                amount_paid: parseFloat(e.target.value),
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
                        sx={{ marginBottom: isInvoiceSaved ? "" : "10px" }}
                      >
                        {newInvoice.amount_paid - totalAmount || 0}
                      </Box>
                    </Box>
                  </Box>
                </>
              )}

              {/* Comment Field */}
              {showCommentField && (
                <Box className={styles.commentFieldBox}>
                  <TextField
                    multiline
                    rows={2}
                    value={newInvoice.comment}
                    onChange={(e) =>
                      setNewInvoice({
                        ...newInvoice,
                        comment: e.target.value,
                      })
                    }
                    variant="outlined"
                    fullWidth
                    className={styles.commentTextField}
                    sx={{
                      "& .MuiOutlinedInput-input": {
                        textAlign: "center",
                      },
                    }}
                  />
                </Box>
              )}

              {/* Information Section */}
              <Box className={styles.infoSection}>
                <Box className={styles.infoItemBox}>
                  <Box className={styles.infoLabel}>اسم الموظف</Box>
                  <Box className={styles.infoValue}>
                    {isLoadingUser ? (
                      <CircularProgress size={15} />
                    ) : (
                      user?.username
                    )}
                  </Box>
                </Box>
                <Box className={styles.infoItemBox}>
                  <Box className={styles.infoLabel}>اسم المستلم</Box>
                  {isInvoiceSaved ? (
                    <div>{newInvoice.client_name}</div>
                  ) : (
                    <input
                      type="text"
                      value={newInvoice.client_name}
                      onChange={(e) =>
                        setNewInvoice({
                          ...newInvoice,
                          client_name: e.target.value,
                        })
                      }
                      className={styles.infoInput}
                    />
                  )}
                </Box>
                <Box className={styles.infoItemBox}>
                  <Box className={styles.infoLabel}>عامل المخازن </Box>
                </Box>
              </Box>
            </Box>

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
          </Box>

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
