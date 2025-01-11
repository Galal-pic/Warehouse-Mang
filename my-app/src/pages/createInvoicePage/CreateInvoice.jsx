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
  InputLabel,
  FormControl,
} from "@mui/material";

import logo from "./logo.png";

export default function Type1() {
  const [rows, setRows] = useState([
    {
      counter: 1,
      itemsBar: "",
      itemName: "",
      quantity: "",
      description: "",
    },
  ]);
  const [machineName, setMachineName] = useState("");
  const [mechanismName, setMechanismName] = useState("");
  const [date, setDate] = useState("");
  const [time, setTime] = useState("");
  const [comment, setComment] = useState("");
  const [showCommentField, setShowCommentField] = useState(false);

  const operationTypes = [
    "إضافة/Add",
    "صرف/Withdraw",
    "أمانات/Deposits",
    "مرتجع/Return",
    "توالف/Scrap",
    "حجز/Reservation",
    "رصيد افتتاحي/Opening Balance",
  ];
  const [operationType, setOperationType] = useState(operationTypes[0]); // لتخزين نوع العملية

  const handleAddComment = () => {
    setShowCommentField(true);
  };

  const handleCancelComment = () => {
    setShowCommentField(false);
    setComment("");
  };

  useEffect(() => {
    const handleKeyPress = (event) => {
      if (event.key === "Enter") {
        const activeElement = document.activeElement;
        if (
          activeElement.tagName === "INPUT" || // تحقق من العنصر الذي تم التفاعل معه
          activeElement.tagName === "TEXTAREA"
        ) {
          addRow(); // هنا يتم إضافة صف جديد عند الضغط على Enter
        }
      }
    };

    window.addEventListener("keydown", handleKeyPress); // إضافة event listener

    // تنظيف event listener عند فك الارتباط
    return () => {
      window.removeEventListener("keydown", handleKeyPress);
    };
  }, [rows]);

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
  }, []);

  const addRow = () => {
    setRows([
      ...rows,
      {
        counter: rows.length + 1,
        itemsBar: "",
        itemName: "",
        quantity: "",
        description: "",
      },
    ]);
  };

  const handleInputChange = (index, field, value) => {
    const newRows = [...rows];
    newRows[index][field] = value;
    setRows(newRows);
  };

  const handlePrint = () => {
    const style = document.createElement("style");
    style.innerHTML = `
        @media print {
          body * {
            visibility: hidden; /* إخفاء جميع العناصر */
          }
          .printable-box, .printable-box * {
            visibility: visible; /* إظهار العنصر المحدد فقط */
          }
          .printable-box {
            position: absolute;
            left: 0;
            top: 0;
          }
          @page {
            size: landscape;
          }
        }
      `;
    document.head.appendChild(style);
    window.print();
    document.head.removeChild(style);
  };

  return (
    <Box
      sx={{
        padding: 4,
        width: "90%",
        margin: "auto",
        marginTop: "100px",
      }}
    >
      {/* Dropdown for Operation Type */}
      <FormControl sx={{ minWidth: 250, marginBottom: 2 }}>
        <InputLabel>نوع العملية / Operation Type</InputLabel>
        <Select
          value={operationType}
          onChange={(e) => setOperationType(e.target.value)}
          label="نوع العملية / Operation Type"
          fullWidth
        >
          {operationTypes.map((type, index) => (
            <MenuItem key={index} value={type}>
              {type}
            </MenuItem>
          ))}
        </Select>
      </FormControl>
      <Box
        sx={{
          direction: "rtl",
          borderRadius: "8px",
          width: "100%",
          margin: "auto",
        }}
      >
        <Box
          className="printable-box"
          sx={{
            border: "1px solid #ddd",
            padding: "10px 20px",
          }}
        >
          {/* Header Section */}
          <Box
            sx={{
              display: "flex",
              alignItems: "center",
              marginBottom: 3,
            }}
          >
            <Box>
              <img
                src={logo}
                alt="Logo"
                style={{ width: "300px", height: "" }}
              />
            </Box>
            <Box sx={{ textAlign: "center", flex: 1 }}>
              <Box variant="h5" sx={{ fontWeight: "bold", color: "#333" }}>
                CUBII
              </Box>
              <Box sx={{ fontSize: "16px", color: "#555" }}>
                INDUSTRIAL SOLUTIONS
              </Box>
            </Box>
            <Box sx={{ textAlign: "right" }}>
              <Box sx={{ fontWeight: "bold", color: "#555" }}>
                نوع العملية/ Operation type :
                <span
                  style={{
                    fontWeight: "400",
                    color: "#999090",
                  }}
                >
                  {operationType}
                </span>
              </Box>
              <Box
                sx={{
                  fontWeight: "bold",
                  color: "#555",
                  display: "flex",
                  alignItems: "center",
                }}
              >
                <Box sx={{ display: "inline" }}>
                  رقم السند / Voucher Number:
                </Box>
                <Box
                  sx={{ display: "inline", marginLeft: 1, marginRight: "5px" }}
                >
                  <span
                    style={{
                      fontWeight: "400",
                      color: "#999090",
                    }}
                  >
                    1
                  </span>
                </Box>
              </Box>
              <Box
                sx={{
                  fontWeight: "bold",
                  color: "#555",
                  display: "flex",
                  alignItems: "center",
                }}
              >
                <Box sx={{ display: "inline" }}>التاريخ / Date:</Box>
                <Box
                  sx={{ display: "inline", marginLeft: 1, marginRight: "5px" }}
                >
                  <span
                    style={{
                      fontWeight: "400",
                      color: "#999090",
                    }}
                  >
                    {date}
                  </span>
                </Box>
              </Box>

              <Box
                sx={{
                  fontWeight: "bold",
                  color: "#555",
                  display: "flex",
                  alignItems: "center",
                }}
              >
                <Box sx={{ display: "inline" }}> الوقت / Time:</Box>
                <Box
                  sx={{ display: "inline", marginLeft: 1, marginRight: "5px" }}
                >
                  <span
                    style={{
                      fontWeight: "400",
                      color: "#999090",
                    }}
                  >
                    {time}
                  </span>
                </Box>
              </Box>
            </Box>
          </Box>

          <Table
            sx={{
              border: "1px solid #b2b0b0",
              marginBottom: 3,
              "& .MuiTableCell-root": {
                border: "1px solid #b2b0b0",
                padding: "12px",
                textAlign: "center",
              },
              backgroundColor: "white",
            }}
          >
            <TableBody>
              {/* First two rows for inputs */}
              <TableRow>
                <TableCell
                  colSpan={2}
                  sx={{
                    fontWeight: "bold",
                    width: "110px",
                    textAlign: "right",
                    backgroundColor: "#ddd",
                  }}
                >
                  اسم الماكينة / Machine Name
                </TableCell>
                <TableCell colSpan={1}>
                  <input
                    type="text"
                    onChange={(e) => setMachineName(e.target.value)}
                    style={{
                      border: "none",
                      outline: "none",
                      width: "100%", // Make input field take 100% width
                    }}
                  />
                </TableCell>
                <TableCell colSpan={2}>
                  <input
                    type="text"
                    onChange={(e) => setMachineName(e.target.value)}
                    style={{
                      border: "none",
                      outline: "none",
                      width: "100%", // Make input field take 100% width
                    }}
                  />
                </TableCell>
              </TableRow>
              <TableRow>
                <TableCell
                  colSpan={2}
                  sx={{
                    textAlign: "right",
                    fontWeight: "bold",
                    backgroundColor: "#ddd",
                    width: "110px",
                  }}
                >
                  اسم الميكانيزم / Mechanism Name
                </TableCell>
                <TableCell colSpan={1}>
                  <input
                    type="text"
                    onChange={(e) => setMachineName(e.target.value)}
                    style={{
                      border: "none",
                      outline: "none",
                      width: "100%", // Make input field take 100% width
                    }}
                  />
                </TableCell>
                <TableCell colSpan={2}>
                  <input
                    type="text"
                    onChange={(e) => setMachineName(e.target.value)}
                    style={{
                      border: "none",
                      outline: "none",
                      width: "100%", // Make input field take 100% width
                    }}
                  />
                </TableCell>
              </TableRow>

              {/* Headers for items */}
              <TableRow
                sx={{
                  "& .MuiTableCell-root": { border: "none" },
                  backgroundColor: "#ddd",
                }}
              >
                <TableCell sx={{ fontWeight: "bold", width: "auto", }}>
                  +
                </TableCell>
                <TableCell sx={{ fontWeight: "bold", width: "auto", }}>
                  اسم الصنف / Item Name
                </TableCell>
                <TableCell sx={{ fontWeight: "bold", width: "auto", }}>
                  الكمية / Quantity
                </TableCell>
                <TableCell sx={{ fontWeight: "bold", width: "auto", }}>
                  بيان / Description
                </TableCell>
                <TableCell sx={{ fontWeight: "bold", width: "auto", }}>
                  شريط العناصر / Items Bar
                </TableCell>
              </TableRow>

              {/* Rows for data */}
              {rows.map((row, index) => (
                <TableRow key={index}>
                  <TableCell
                    sx={{
                      width: "auto",
                      
                      textAlign: "center",
                    }}
                  >
                    <Box>{row.counter}</Box>
                  </TableCell>

                  <TableCell
                    sx={{
                      width: "auto",
                      
                      textAlign: "center",
                    }}
                  >
                    <input
                      type="text"
                      onChange={(e) =>
                        handleInputChange(index, "itemsBar", e.target.value)
                      }
                      style={{
                        border: "none",
                        outline: "none",
                      }}
                    />
                  </TableCell>

                  <TableCell
                    sx={{
                      width: "auto",
                      
                      textAlign: "center",
                    }}
                  >
                    <input
                      type="text"
                      onChange={(e) =>
                        handleInputChange(index, "itemName", e.target.value)
                      }
                      style={{
                        border: "none",
                        outline: "none",
                      }}
                    />
                  </TableCell>

                  <TableCell
                    sx={{
                      width: "auto",
                      
                      textAlign: "center",
                    }}
                  >
                    <input
                      type="text"
                      onChange={(e) =>
                        handleInputChange(index, "quantity", e.target.value)
                      }
                      style={{
                        border: "none",
                        outline: "none",
                      }}
                    />
                  </TableCell>

                  <TableCell
                    sx={{
                      width: "auto",
                      
                      textAlign: "center",
                    }}
                  >
                    <input
                      type="text"
                      onChange={(e) =>
                        handleInputChange(index, "description", e.target.value)
                      }
                      style={{
                        border: "none",
                        outline: "none",
                      }}
                    />
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>

          {/* Comment Field */}
          {showCommentField && (
            <Box>
              <TextField
                multiline
                rows={2}
                value={comment}
                onChange={(e) => setComment(e.target.value)}
                variant="outlined"
                fullWidth
                sx={{
                  marginTop: 2,
                  borderRadius: "8px",
                  "& .MuiOutlinedInput-root": {
                    borderRadius: "8px",
                  },
                  "& .MuiInputBase-root": {
                    height: "auto", // لضبط الحجم التلقائي
                  },
                }}
              />
            </Box>
          )}

          {/* Information */}
          <Box
            sx={{
              marginTop: 3,
              display: "flex",
              justifyContent: "space-around",
            }}
          >
            <Box
              sx={{
                display: "flex",
                justifyContent: "flex-start",
                marginBottom: 2,
                gap: 2,
                flexDirection: "column",
              }}
            >
              <Box sx={{ fontWeight: "bold", color: "#555" }}>
                اسم الموظف / Employee Name
              </Box>
              <Box sx={{ color: "#555" }}>Ahmed</Box>
            </Box>

            <Box
              sx={{
                display: "flex",
                justifyContent: "flex-start",
                marginBottom: 2,
                gap: 2,
                flexDirection: "column",
              }}
            >
              <Box sx={{ fontWeight: "bold", color: "#555" }}>
                اسم المستلم / Client Name
              </Box>
              <Box sx={{ color: "#555" }}>Mohammed</Box>
            </Box>

            <Box
              sx={{
                display: "flex",
                justifyContent: "flex-start",
                marginBottom: 2,
                gap: 2,
                flexDirection: "column",
              }}
            >
              <Box sx={{ fontWeight: "bold", color: "#555" }}>
                مدير المخازن / Warehouse Manager
              </Box>
              <Box sx={{ color: "#555" }}>Manager</Box>
            </Box>
          </Box>
        </Box>
        {/* Buttons */}
        <Box
          sx={{
            display: "flex",
            justifyContent: "space-between",
            flexWrap: "wrap",
            gap: 2, // المسافة بين الأزرار
            marginTop: 3,
          }}
        >
          {/* Add Comment Button */}
          {!showCommentField ? (
            <Button
              variant="contained"
              color="success"
              onClick={handleAddComment}
              sx={{
                padding: "12px 24px",
                borderRadius: "12px",
                fontWeight: "bold",
                backgroundColor: "#4CAF50",
                "&:hover": {
                  backgroundColor: "#45a049",
                },
              }}
            >
              تعليق / Comment
            </Button>
          ) : (
            <Button
              variant="outlined"
              color="error"
              onClick={handleCancelComment}
              sx={{
                padding: "10px 20px",
                borderRadius: "12px",
                fontWeight: "bold",
                borderColor: "#e57373", // لون الحدود عند التحديد
                "&:hover": {
                  borderColor: "#d32f2f", // تغيير لون الحدود عند المرور بالمؤشر
                },
              }}
            >
              الغاء / Cancel
            </Button>
          )}

          {/* Sure Button */}
          <Button
            variant="contained"
            color="primary"
            // onClick={handleSave}
            sx={{
              padding: "12px 24px",
              borderRadius: "12px",
              fontWeight: "bold",
              backgroundColor: "#1976d2", // اللون الأزرق
              "&:hover": {
                backgroundColor: "#1565c0", // تأثير عند مرور الماوس
              },
            }}
          >
            تأكيد / Save
          </Button>

          {/* Print Button */}
          <Button
            variant="contained"
            color="info"
            onClick={handlePrint}
            sx={{
              padding: "12px 24px",
              borderRadius: "12px",
              fontWeight: "bold",
              backgroundColor: "#00bcd4", // لون الأزرق الفاتح
              "&:hover": {
                backgroundColor: "#0097a7", // تأثير hover
              },
            }}
          >
            طباعة / Print
          </Button>
        </Box>
      </Box>
    </Box>
  );
}
