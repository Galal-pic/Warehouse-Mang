import React, { useState, useEffect } from "react";
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

export default function Type1() {
  // Operation Type Selection
  const [lastSelected, setLastSelected] = useState("");
  // create new invoice
  const [newInvoice, setNewInvoice] = useState({
    type: lastSelected,
    client_name: "",
    Warehouse_manager: "",
    total_amount: 0,
    employee_name: "",
    machine_name: "",
    mechanism_name: "",
    items: [],
    comment: "",
  });

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

  // warehouse
  const [warehouseManager, setWarehouseManager] = useState("");
  const [warehouseName, setWarehouseName] = useState("");
  const warehouses = ["المخزن الأول", "المخزن الثاني", "المخزن الثالث"];
  const handleWarehouseChange = (event, newValue) => {
    setWarehouseName(newValue || "");
  };

  // fetch warehouses
  const [warehouse, setWarehouse] = useState([]);
  const fetchWareHousesData = async () => {
    const accessToken = localStorage.getItem("access_token");
    if (!accessToken) return;
    try {
      const response = await fetch("http://127.0.0.1:5000/warehouse/", {
        method: "GET",
        headers: { Authorization: `Bearer ${accessToken}` },
      });
      const data = await response.json();
      setWarehouse(data);
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

  // User data fetch
  const [user, setUser] = useState({});
  useEffect(() => {
    const fetchUserData = async () => {
      const accessToken = localStorage.getItem("access_token");
      if (!accessToken) return;
      try {
        const response = await fetch("http://127.0.0.1:5000/auth/user", {
          method: "GET",
          headers: { Authorization: `Bearer ${accessToken}` },
        });
        if (!response.ok) return;
        const data = await response.json();
        setUser(data);
      } catch (err) {
        console.error("Error fetching user data:", err);
      }
    };
    fetchUserData();
  }, []);

  // create, add, remove item
  const [rows, setRows] = useState([
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
  const addRow = () => {
    setRows((prevRows) => [
      ...prevRows,
      {
        counter: prevRows.length + 1,
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
  };
  const removeRow = (index) => {
    const newRows = rows.filter((row, i) => i !== index);
    setRows(newRows.map((row, i) => ({ ...row, counter: i + 1 })));
  };
  const handleItemChange = (e, newValue, index) => {
    const selectedItem = warehouse.find((item) => item.item_name === newValue);
    if (selectedItem) {
      const newRows = [...rows];
      newRows[index].item_name = selectedItem.item_name;
      newRows[index].barcode = selectedItem.item_bar;
      newRows[index].locations = selectedItem.locations;
      setRows(newRows);
    }
  };
  const handleLocationChange = (e, newLocation, index) => {
    const selectedLocation = rows[index].locations.find(
      (loc) => loc.location === newLocation
    );
    if (selectedLocation) {
      const newRows = [...rows];
      newRows[index].location = selectedLocation.location;
      newRows[index].price_unit = selectedLocation.price_unit;
      newRows[index].total_price =
        selectedLocation.price_unit * newRows[index].quantity;
      setRows(newRows);
    }
  };
  const handleQuantityChange = (index, value) => {
    const newRows = [...rows];
    newRows[index].quantity = parseFloat(value);
    if (newRows[index].price_unit) {
      newRows[index].total_price =
        newRows[index].price_unit * newRows[index].quantity;
    }
    setRows(newRows);
  };

  // comment field
  const [showCommentField, setShowCommentField] = useState(false);
  const handleAddComment = () => {
    setShowCommentField(true);
  };
  const handleCancelComment = () => {
    setShowCommentField(false);
  };

  // Calculate the total
  const totalAmount = rows
    .reduce((total, row) => {
      return total + (row.total_price || 0);
    }, 0)
    .toFixed(2);

  // save invoice or not
  const [isInvoiceSaved, setIsInvoiceSaved] = useState(false);

  // Fetch last voucher ID
  const [voucherNumber, setVoucherNumber] = useState(null);
  const fetchVoucherId = async () => {
    const accessToken = localStorage.getItem("access_token");
    if (!accessToken) return;
    try {
      const response = await fetch("http://127.0.0.1:5000/invoice/last-id", {
        method: "GET",
        headers: { Authorization: `Bearer ${accessToken}` },
      });
      if (!response.ok) return;
      const data = await response.json();
      setVoucherNumber(data.last_id);
    } catch (err) {
      console.error("Error fetching voucher ID:", err);
    }
  };
  // Clear Invoice
  const clearInvoice = () => {
    setNewInvoice({
      type: lastSelected,
      client_name: "",
      Warehouse_manager: "",
      total_amount: 0,
      employee_name: "",
      machine_name: "",
      mechanism_name: "",
      items: [],
      comment: "",
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

    fetchVoucherId();
  };
  useEffect(() => {
    fetchVoucherId();
  }, []);

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
  // Handle close snack
  const handleCloseSnackbar = () => {
    setOpenSnackbar(false);
  };

  // save invoice
  const handleSave = async () => {
    if (newInvoice.type === "") {
      setSnackbarMessage("يجب تحديد نوع العملية");
      setSnackBarType("info");
      setOpenSnackbar(true);
      return;
    }
    if (newInvoice.machine_name === "" || newInvoice.mechanism_name === "") {
      setSnackbarMessage("يجب ملئ اسم الماكينة واسم الميكانيزم");
      setSnackBarType("info");
      setOpenSnackbar(true);
      return;
    }
    const newRows = rows.filter((row) => row.quantity !== 0);
    if (newRows.length === 0) {
      setSnackbarMessage("يجب ملئ عنصر واحد على الأقل");
      setSnackBarType("warning");
      setOpenSnackbar(true);
      return;
    }

    const updatedInvoice = {
      ...newInvoice,
      total_amount: totalAmount,
      items: newRows.map((row) => ({
        item_name: row.item_name,
        location: row.location,
        quantity: row.quantity,
        total_price: row.total_price,
        description: row.description,
      })),
    };
    console.log("new invoice being set: ", updatedInvoice);
    const accessToken = localStorage.getItem("access_token");
    if (!accessToken) return;
    try {
      console.log(lastSelected);
      const response = await fetch("http://127.0.0.1:5000/invoice/", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${accessToken}`,
        },
        body: JSON.stringify(updatedInvoice),
      });
      if (!response.ok) {
        throw new Error("Failed to save invoice");
      }
      fetchWareHousesData();
      setIsInvoiceSaved(true);
      setRows(rows.filter((row) => row.quantity !== 0));
      setSnackbarMessage("تم حفظ الفاتورة بنجاح");
      setSnackBarType("success");
      setOpenSnackbar(true);
    } catch (err) {
      console.error("Error saving invoice:", err);
      setSnackbarMessage("خطا في حفظ الفاتورة");
      setSnackBarType("error");
      setOpenSnackbar(true);
    }
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
          padding: 0 !important;
          margin: 0!important;
      
        }
        .printable-box .MuiIconButton-root {
          display: none;
        }
        @page {
          size: portrait;
        }
        .printable-box table {
          width: 100%;
          font-size: 7px;
        }
         .printable-box select {
          display: none;
        }
        .printable-box button {
          display: none;
        }
        .printable-box img {
          width: 300px !important;
        }
        .printable-box .operationType{
          font-size: 7px;
        }
        .printable-box .text{
          font-size: 7px;
        }
        .printable-box p {
          margin: 0;
        }
        .printable-box .MuiTypography-root {
          font-size: 7px;
        }
      }
    `;
    document.head.appendChild(style);
    window.print();
    document.head.removeChild(style);
  };

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
          <FormControl variant="standard" sx={{ m: 1, minWidth: 220 }}>
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
          <FormControl variant="standard" sx={{ m: 1, minWidth: 220 }}>
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
                <Box className={styles.infoValue}>{voucherNumber}</Box>
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

          {/* warehouse */}
          <Box
            sx={{
              display: "flex",
              justifyContent: "flex-end",
              marginBottom: "20px",
            }}
          >
            {/* Autocomplete for warehouses */}

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
              options={warehouses}
              value={warehouseName}
              onChange={handleWarehouseChange}
              renderInput={(params) => (
                <TextField
                  {...params}
                  placeholder="اختر المستودع"
                  variant="outlined"
                />
              )}
              sx={{
                marginBottom: "16px",
                "& .MuiOutlinedInput-root": { borderRadius: "4px" },
                direction: "rtl",
                minWidth: "200px",
              }}
            />
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
                {/* Inputs for Machine and Mechanism Names */}
                <TableRow className={styles.tableRow}>
                  <TableCell className={styles.tableCell} colSpan={2}>
                    اسم الماكينة
                  </TableCell>
                  <TableCell className={styles.tableInputCell} colSpan={6}>
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
                          (machine) => machine.name === newInvoice.machine_name
                        ) || null
                      }
                      sx={{
                        // minWidth: "300px",
                        "& .MuiOutlinedInput-root": {
                          padding: "10px",
                        },
                        "& .MuiOutlinedInput-root .MuiOutlinedInput-notchedOutline":
                          {
                            border: "none",
                          },
                      }}
                      options={machines}
                      getOptionLabel={(option) =>
                        option && option.name ? option.name : ""
                      }
                      isOptionEqualToValue={(option, value) =>
                        option.name === value.name
                      }
                      onChange={(event, newValue) =>
                        setNewInvoice({
                          ...newInvoice,
                          machine_name: newValue ? newValue.name : "",
                        })
                      }
                      renderInput={(params) => (
                        <TextField {...params} placeholder="اسم الماكينة" />
                      )}
                    />
                  </TableCell>
                </TableRow>
                <TableRow className={styles.tableRow}>
                  <TableCell className={styles.tableCell} colSpan={2}>
                    اسم الميكانيزم
                  </TableCell>
                  <TableCell className={styles.tableInputCell} colSpan={6}>
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
                          (mechanism) =>
                            mechanism.name === newInvoice.mechanism_name
                        ) || null
                      }
                      sx={{
                        // minWidth: "300px",
                        "& .MuiOutlinedInput-root": {
                          padding: "10px",
                        },
                        "& .MuiOutlinedInput-root .MuiOutlinedInput-notchedOutline":
                          {
                            border: "none",
                          },
                      }}
                      options={mechanisms}
                      getOptionLabel={(option) =>
                        option && option.name ? option.name : ""
                      }
                      isOptionEqualToValue={(option, value) =>
                        option.name === value.name
                      }
                      onChange={(event, newValue) =>
                        setNewInvoice({
                          ...newInvoice,
                          mechanism_name: newValue ? newValue.name : "",
                        })
                      }
                      renderInput={(params) => (
                        <TextField {...params} placeholder="اسم الميكانيزم" />
                      )}
                    />
                  </TableCell>
                </TableRow>
                {/* Headers for Items */}
                <TableRow>
                  <TableCell className={styles.tableCell}>
                    <AddIcon onClick={addRow} className={styles.addIcon} />
                  </TableCell>
                  <TableCell className={styles.tableCell}>اسم الصنف</TableCell>
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
                  <TableCell
                    colSpan={purchasesType ? 1 : 2}
                    className={styles.tableCell}
                  >
                    بيان
                  </TableCell>
                </TableRow>
                {/* Rows for Data */}
                {rows.map((row, index) => (
                  <TableRow key={index}>
                    <TableCell
                      sx={{
                        position: "relative",
                      }}
                      className={styles.tableCellRow}
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
                      sx={{
                        "&.MuiTableCell-root": {
                          padding: "0px",
                        },
                      }}
                      className={styles.tableCellRow}
                    >
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
                        value={row.item_name || ""}
                        sx={{
                          "& .MuiAutocomplete-clearIndicator, & .MuiAutocomplete-popupIndicator":
                            {
                              display: isInvoiceSaved ? "none" : "",
                            },
                          "& .MuiOutlinedInput-root": {
                            padding: "10px",
                            paddingRight: isInvoiceSaved
                              ? "10px!important"
                              : "",
                            fontSize: "14px",
                          },
                          "& .MuiOutlinedInput-root .MuiOutlinedInput-notchedOutline":
                            {
                              border: "none",
                            },
                        }}
                        options={warehouse.map((item) => item.item_name)}
                        getOptionLabel={(option) => option}
                        onChange={(e, newValue) =>
                          handleItemChange(e, newValue, index)
                        }
                        renderInput={(params) => (
                          <TextField {...params} placeholder="اسم العنصر" />
                        )}
                      />
                    </TableCell>
                    <TableCell className={styles.tableCellRow}>
                      {row.barcode || ""}
                    </TableCell>
                    <TableCell className={styles.tableCellRow}>
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
                        value={row.location || ""}
                        sx={{
                          "& .MuiAutocomplete-clearIndicator, & .MuiAutocomplete-popupIndicator":
                            {
                              display: isInvoiceSaved ? "none" : "",
                            },
                          "& .MuiOutlinedInput-root": {
                            padding: "10px",
                            paddingRight: isInvoiceSaved
                              ? "10px!important"
                              : "",
                            fontSize: "14px",
                          },
                          "& .MuiOutlinedInput-root .MuiOutlinedInput-notchedOutline":
                            {
                              wordBreak: "break-word",
                              border: "none",
                            },
                        }}
                        options={
                          row.locations
                            ? row.locations.map((loc) => loc.location)
                            : []
                        }
                        onChange={(e, newLocation) =>
                          handleLocationChange(e, newLocation, index)
                        }
                        renderInput={(params) => (
                          <TextField {...params} placeholder="الموقع" />
                        )}
                      />
                    </TableCell>
                    <TableCell className={styles.tableCellRow}>
                      <input
                        type="number"
                        min="0"
                        max={
                          operationType &&
                          row.locations
                            .filter((loc) => row.location === loc.location)
                            .map((loc) => loc.quantity)
                            .reduce(
                              (max, quantity) => Math.max(max, quantity),
                              0
                            )
                        }
                        value={row.quantity}
                        onInput={(e) => {
                          if (lastSelected !== "") {
                            const maxQuantity = row.locations
                              .filter((loc) => row.location === loc.location)
                              .map((loc) => loc.quantity)
                              .reduce(
                                (max, quantity) => Math.max(max, quantity),
                                0
                              );

                            if (e.target.value < 0) {
                              e.target.value = 0;
                            }

                            if (operationType && e.target.value > maxQuantity) {
                              e.target.value = maxQuantity;
                            }
                          } else {
                            e.target.value = 0;
                          }
                        }}
                        onChange={(e) =>
                          handleQuantityChange(index, e.target.value)
                        }
                        className={styles.cellInput}
                      />
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
                      colSpan={purchasesType ? 1 : 2}
                      className={styles.tableCellRow}
                    >
                      <input
                        type="text"
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
                      />
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </Box>

          {/* Total Amount Section */}
          {purchasesType && (
            <Box className={styles.totalAmountSection}>
              <Box className={styles.totalAmountBox}>
                <Box className={styles.totalAmountLabel}>الإجمالي:</Box>
                <Box className={styles.totalAmountValue}>{totalAmount}</Box>
              </Box>
            </Box>
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
              <Box className={styles.infoValue}>{user.username}</Box>
            </Box>
            <Box className={styles.infoItemBox}>
              <Box className={styles.infoLabel}>اسم المستلم</Box>
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
            </Box>
            <Box className={styles.infoItemBox}>
              <Box className={styles.infoLabel}>مدير المخازن </Box>
              <input
                type="text"
                value={newInvoice.Warehouse_manager}
                onChange={(e) =>
                  setNewInvoice({
                    ...newInvoice,
                    Warehouse_manager: e.target.value,
                  })
                }
                className={styles.infoInput}
              />
            </Box>
          </Box>
        </Box>

        {/* Buttons Section
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
              // onClick={handleSave}
              className={`${styles.saveButton} ${styles.infoBtn}`}
            >
              تأكيد
            </Button>

            <Button
              variant="contained"
              color="info"
              onClick={clearInvoice}
              className={`${styles.printButton} ${styles.infoBtn}`}
            >
              فاتورة جديدة
            </Button>
          </Box> */}
        {/* Buttons Section */}

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
            >
              تأكيد
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
}
