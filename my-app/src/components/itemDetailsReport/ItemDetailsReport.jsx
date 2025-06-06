import {
  Dialog,
  DialogTitle,
  DialogContent,
  Button,
  Typography,
  Card,
  CardContent,
  Box,
  Tabs,
  Tab,
  MenuItem,
  Menu,
} from "@mui/material";
import CustomDataGrid from "../dataGrid/CustomDataGrid";
import { GridToolbarContainer } from "@mui/x-data-grid";
import { useState } from "react";
import logo from "../header/logo.png";

const ItemDetailsDialog = ({ item, open, onClose, renderAsDialog = true }) => {
  // State for active tab
  const [tabValue, setTabValue] = useState(0);

  function CustomToolbar({
    columnVisibilityModel,
    searchResults,
    dataType,
    paginationModel,
    ...props
  }) {
    const [anchorEl, setAnchorEl] = useState(null);
    const open = Boolean(anchorEl);

    const handlePrintMenuClick = (event) => {
      setAnchorEl(event.currentTarget);
    };

    const handleMenuClose = () => {
      setAnchorEl(null);
    };

    const handleExport = () => {
      const columnTranslations = {
        quantity: "الكمية",
        location: "الموقع",
        unit_price: "سعر الوحدة",
        created_at: "التاريخ",
        invoice_id: "#",
        total_price: "السعر الإجمالي",
        status: "الحالة",
        invoice_date: "تاريخ الفاتورة",
        invoice_type: "نوع الفاتورة",
      };

      const statusMap = {
        draft: "لم تراجع",
        accreditation: "لم تؤكد",
        confirmed: "تم",
        returned: "تم الاسترداد",
      };

      let csvData = [];
      let headers = [];

      if (dataType === "locations") {
        csvData = searchResults.map((location) => ({
          [columnTranslations.quantity]: location.quantity || "-",
          [columnTranslations.location]: location.location || "-",
        }));
        headers = [columnTranslations.quantity, columnTranslations.location];
      } else if (dataType === "prices") {
        csvData = searchResults.map((price) => ({
          [columnTranslations.unit_price]: price.unit_price || "-",
          [columnTranslations.quantity]: price.quantity || "-",
          [columnTranslations.created_at]:
            price.created_at?.split(" ")[0] || "-",
          [columnTranslations.invoice_id]: price.invoice_id || "-",
        }));
        headers = [
          columnTranslations.unit_price,
          columnTranslations.quantity,
          columnTranslations.created_at,
          columnTranslations.invoice_id,
        ];
      } else if (dataType === "invoice_history") {
        csvData = searchResults.map((invoice) => ({
          [columnTranslations.unit_price]: invoice.unit_price || "-",
          [columnTranslations.quantity]: invoice.quantity || "-",
          [columnTranslations.location]: invoice.location || "-",
          [columnTranslations.total_price]: invoice.total_price || "-",
          [columnTranslations.status]:
            statusMap[invoice.status] || invoice.status || "-",
          [columnTranslations.invoice_date]:
            invoice.invoice_date?.split(" ")[0] || "-",
          [columnTranslations.invoice_type]: invoice.invoice_type || "-",
          [columnTranslations.invoice_id]: invoice.invoice_id || "-",
        }));
        headers = [
          columnTranslations.unit_price,
          columnTranslations.quantity,
          columnTranslations.location,
          columnTranslations.total_price,
          columnTranslations.status,
          columnTranslations.invoice_date,
          columnTranslations.invoice_type,
          columnTranslations.invoice_id,
        ];
      }

      const escapeCsvValue = (value) => {
        if (value === null || value === undefined) return "";
        const str = String(value);
        if (str.includes(",") || str.includes("\n") || str.includes('"')) {
          return `"${str.replace(/"/g, '""')}"`;
        }
        return str;
      };

      const csvRows = [
        headers.map(escapeCsvValue).join(","),
        ...csvData.map((row) =>
          headers.map((header) => escapeCsvValue(row[header])).join(",")
        ),
      ];
      const csv = csvRows.join("\n");

      const blob = new Blob(["\uFEFF" + csv], {
        type: "text/csv;charset=utf-8;",
      });
      const link = document.createElement("a");
      link.href = URL.createObjectURL(blob);
      link.download = `تقرير_${dataType}_${
        new Date().toISOString().split("T")[0]
      }.csv`;
      link.click();
      URL.revokeObjectURL(link.href);
    };

    const handlePrint = (printAll = false) => {
      if (!searchResults || searchResults.length === 0) {
        alert("لا توجد بيانات للطباعة");
        return;
      }

      const printWindowFrame = document.createElement("iframe");
      printWindowFrame.style.position = "absolute";
      printWindowFrame.style.width = "0px";
      printWindowFrame.style.height = "0px";
      printWindowFrame.style.border = "none";
      document.body.appendChild(printWindowFrame);

      const iframeDocument = printWindowFrame.contentWindow.document;
      iframeDocument.open();

      // Add item details before the table, centered
      const itemDetails = `
        <div style="margin-bottom: 20px; text-align: center; direction: rtl;">
          <h2 style="font-size: 20px; font-weight: bold;">معلومات العنصر</h2>
          <p style="font-size: 16px; display: flex; justify-content: center; align-items: center; gap: 10px;">
            <div style="display: inline-block;"><strong>اسم العنصر:</strong></div>
            <div style="display: inline-block;">${item?.item_name || "-"}</div>
          </p>
          <p style="font-size: 16px; display: flex; justify-content: center; align-items: center; gap: 10px;">
            <div style="display: inline-block;"><strong>باركود العنصر:</strong></div>
            <div style="display: inline-block;">${item?.item_bar || "-"}</div>
          </p>
          <p style="font-size: 16px; display: flex; justify-content: center; align-items: center; gap: 10px;">
            <div style="display: inline-block;"><strong>تاريخ الإنشاء:</strong></div>
            <div style="display: inline-block;">${
              item?.created_at?.split(" ")[0] || "-"
            }</div>
          </p>
        </div>
      `;

      let tableContent = `
    <table style="width: 100%; border-collapse: collapse; font-family: Arial, sans-serif;">
      <thead>
        <tr>
  `;
      const columns =
        dataType === "locations"
          ? locationColumns
          : dataType === "prices"
          ? priceColumns
          : invoiceHistoryColumns;
      columns.forEach((column) => {
        tableContent += `
      <th style="border: 1px solid #000; padding: 8px; background-color: #f0f0f0; font-weight: bold; text-align: right;">
        ${column.headerName}
      </th>
    `;
      });
      tableContent += `
        </tr>
      </thead>
      <tbody>
  `;

      const rows = printAll
        ? searchResults
        : searchResults.slice(
            paginationModel.page * paginationModel.pageSize,
            (paginationModel.page + 1) * paginationModel.pageSize
          );
      rows.forEach((row) => {
        tableContent += `<tr>`;
        columns.forEach((column) => {
          let cellValue = "-";
          if (column.renderCell) {
            cellValue = column.renderCell({ value: row[column.field] }) || "-";
          } else {
            cellValue = row[column.field] || "-";
          }
          tableContent += `
        <td style="border: 1px solid #000; padding: 8px; text-align: right;">
          ${cellValue}
        </td>
      `;
        });
        tableContent += `</tr>`;
      });

      tableContent += `
      </tbody>
    </table>
  `;

      iframeDocument.write(`
    <html>
      <head>
        <title>طباعة تقرير العنصر</title>
        <style>
          body {
            margin: 0;
            font-family: Arial, sans-serif;
            color: #000; /* لون موحد للنصوص */
          }
          .print-container {
            width: 100%;
            text-align: center; /* توسيط محتوى الحاوية */
          }
          .logo {
            max-width: 150px;
            margin-bottom: 20px;
            display: inline-block; /* جعل الصورة في وسط الصفحة */
          }
          table {
            width: 100%;
            border-collapse: collapse;
            page-break-inside: auto;
          }
          th, td {
            border: 1px solid #000;
            padding: 8px;
            text-align: right;
            font-size: 14px;
          }
          th {
            background-color: #f0f0f0;
            font-weight: bold;
          }
          tr {
            page-break-inside: avoid;
            page-break-after: auto;
          }
          @media screen {
            body {
              display: none;
            }
          }
        </style>
      </head>
      <body>
        <div class="print-container">
          <img src="${logo}" alt="Logo" class="logo" />
          ${itemDetails}
          ${tableContent}
        </div>
      </body>
    </html>
  `);

      iframeDocument.close();

      const logoImg = new Image();
      logoImg.src = logo;
      logoImg.onload = () => {
        setTimeout(() => {
          printWindowFrame.contentWindow.focus();
          printWindowFrame.contentWindow.print();
          document.body.removeChild(printWindowFrame);
        }, 500);
      };
      handleMenuClose();
    };

    return (
      <GridToolbarContainer
        sx={{
          display: "flex",
          justifyContent: "flex-end",
          padding: "12px 16px",
          backgroundColor: "#f8fafc",
          borderBottom: "1px solid #e2e8f0",
          borderRadius: "8px 8px 0 0",
        }}
      >
        <Button
          variant="contained"
          onClick={handlePrintMenuClick}
          sx={{
            padding: "8px 24px",
            backgroundColor: "#4b6584",
            borderRadius: "6px",
            fontSize: "0.95rem",
            fontWeight: 600,
            textTransform: "none",
            boxShadow: "0 2px 6px rgba(0, 0, 0, 0.1)",
            transition: "background-color 0.2s, box-shadow 0.2s",
            marginRight: "8px",
            "&:hover": {
              backgroundColor: "#3b5066",
              boxShadow: "0 4px 8px rgba(0, 0, 0, 0.15)",
            },
          }}
        >
          طباعة
        </Button>
        <Menu
          anchorEl={anchorEl}
          open={open}
          onClose={handleMenuClose}
          PaperProps={{
            sx: {
              borderRadius: "6px",
              boxShadow: "0 2px 8px rgba(0, 0, 0, 0.15)",
              direction: "rtl",
            },
          }}
        >
          <MenuItem
            onClick={() => handlePrint(false)}
            sx={{
              fontSize: "0.95rem",
              padding: "8px 16px",
              "&:hover": {
                backgroundColor: "#f1f5f9",
                color: "#4b6584",
              },
            }}
          >
            طباعة الصفحة الحالية
          </MenuItem>
          <MenuItem
            onClick={() => handlePrint(true)}
            sx={{
              fontSize: "0.95rem",
              padding: "8px 16px",
              "&:hover": {
                backgroundColor: "#f1f5f9",
                color: "#4b6584",
              },
            }}
          >
            طباعة جميع الصفحات
          </MenuItem>
        </Menu>
        <Button
          variant="contained"
          onClick={handleExport}
          sx={{
            padding: "8px 24px",
            backgroundColor: "#f39c12",
            borderRadius: "6px",
            fontSize: "0.95rem",
            fontWeight: 600,
            textTransform: "none",
            boxShadow: "0 2px 6px rgba(0, 0, 0, 0.1)",
            transition: "background-color 0.2s, box-shadow 0.2s",
            "&:hover": {
              backgroundColor: "#e68e0f",
              boxShadow: "0 4px 8px rgba(0, 0, 0, 0.15)",
            },
            "&:disabled": {
              backgroundColor: "#d1d5db",
              color: "#6b7280",
            },
          }}
        >
          تصدير
        </Button>
      </GridToolbarContainer>
    );
  }

  // Columns for tables
  const locationColumns = [
    { field: "quantity", headerName: "الكمية", flex: 1 },
    { field: "location", headerName: "الموقع", flex: 1 },
  ];

  const priceColumns = [
    { field: "unit_price", headerName: "سعر الوحدة", flex: 1 },
    { field: "quantity", headerName: "الكمية", flex: 1 },
    {
      field: "created_at",
      headerName: "التاريخ",
      flex: 1,
      renderCell: (params) => (params.value ? params.value.split(" ")[0] : "-"),
    },
    { field: "invoice_id", headerName: "#", flex: 1 },
  ];

  const invoiceHistoryColumns = [
    { field: "unit_price", headerName: "سعر الوحدة", flex: 1 },
    { field: "quantity", headerName: "الكمية", flex: 1 },
    { field: "location", headerName: "الموقع", flex: 1 },
    { field: "total_price", headerName: "السعر الإجمالي", flex: 1 },
    {
      field: "status",
      headerName: "الحالة",
      flex: 1,
      renderCell: (params) => {
        const statusMap = {
          draft: "لم تراجع",
          accreditation: "لم تؤكد",
          confirmed: "تم",
          returned: "تم الاسترداد",
        };
        return statusMap[params.value] || params.value || "-";
      },
    },
    {
      field: "invoice_date",
      headerName: "تاريخ الفاتورة",
      flex: 1,
      renderCell: (params) => (params.value ? params.value.split(" ")[0] : "-"),
    },
    { field: "invoice_type", headerName: "نوع الفاتورة", flex: 1 },
    { field: "invoice_id", headerName: "#", flex: 1 },
  ];

  // Pagination model for all tables
  const [paginationModel, setPaginationModel] = useState({
    page: 0,
    pageSize: 10,
  });
  const handlePageChange = (newModel) => {
    setPaginationModel((prev) => ({ ...prev, ...newModel }));
  };

  const primaryColor = getComputedStyle(
    document.documentElement
  ).getPropertyValue("--main-color");

  // Content to be rendered
  const content = item ? (
    <Box
      sx={{
        display: "flex",
        flexDirection: "column",
        gap: 4,
        p: 2,
        backgroundColor: primaryColor,
      }}
    >
      {/* Item basic information */}
      <Card
        sx={{
          borderRadius: "12px",
          boxShadow: "0 4px 12px rgba(0, 0, 0, 0.08)",
          border: "1px solid #e2e8f0",
          backgroundColor: "#fff",
        }}
      >
        <CardContent sx={{ padding: "24px", direction: "rtl" }}>
          <Typography
            variant="h5"
            sx={{ fontWeight: 700, color: "#1e293b", mb: 3 }}
          >
            معلومات العنصر
          </Typography>
          <Box sx={{ display: "flex", flexDirection: "column", gap: 1.5 }}>
            <Typography
              variant="body1"
              sx={{ fontSize: "1rem", color: "#4b6584" }}
            >
              {item.id}
            </Typography>
            <Typography
              variant="body1"
              sx={{ fontSize: "1rem", color: "#4b6584" }}
            >
              <strong>اسم العنصر:</strong> {item.item_name}
            </Typography>
            <Typography
              variant="body1"
              sx={{ fontSize: "1rem", color: "#4b6584" }}
            >
              <strong>باركود العنصر:</strong> {item.item_bar}
            </Typography>
            <Typography
              variant="body1"
              sx={{ fontSize: "1rem", color: "#4b6584" }}
            >
              <strong>تاريخ الإنشاء:</strong>{" "}
              {item.created_at ? item.created_at.split(" ")[0] : "-"}
            </Typography>
          </Box>
        </CardContent>
      </Card>

      {/* Tabs for tables */}
      <Box>
        <Tabs
          value={tabValue}
          onChange={(e, newValue) => setTabValue(newValue)}
          sx={{
            mb: 3,
            backgroundColor: "#f8fafc",
            borderRadius: "8px",
            boxShadow: "0 2px 4px rgba(0, 0, 0, 0.05)",
            padding: "4px",
            direction: "rtl",
            "& .MuiTabs-indicator": {
              backgroundColor: "#f39c12",
              height: "3px",
              borderRadius: "2px",
              transition: "all 0.3s ease",
            },
            "& .MuiTabs-flexContainer": {
              justifyContent: "flex-start",
            },
          }}
        >
          <Tab
            label="المواقع"
            sx={{
              fontSize: "1.1rem",
              fontWeight: 600,
              color: "#4b6584",
              padding: "12px 24px",
              borderRadius: "6px",
              transition: "all 0.2s ease",
              "&.Mui-selected": {
                color: "#f39c12",
                backgroundColor: "#fff",
                boxShadow: "0 2px 4px rgba(0, 0, 0, 0.1)",
              },
              "&:hover": {
                color: "#f39c12",
                backgroundColor: "#f1f5f9",
              },
            }}
          />
          <Tab
            label="الأسعار"
            sx={{
              fontSize: "1.1rem",
              fontWeight: 600,
              color: "#4b6584",
              padding: "12px 24px",
              borderRadius: "6px",
              transition: "all 0.2s ease",
              "&.Mui-selected": {
                color: "#f39c12",
                backgroundColor: "#fff",
                boxShadow: "0 2px 4px rgba(0, 0, 0, 0.1)",
              },
              "&:hover": {
                color: "#f39c12",
                backgroundColor: "#f1f5f9",
              },
            }}
          />
          <Tab
            label="تاريخ الفواتير"
            sx={{
              fontSize: "1.1rem",
              fontWeight: 600,
              color: "#4b6584",
              padding: "12px 24px",
              borderRadius: "6px",
              transition: "all 0.2s ease",
              "&.Mui-selected": {
                color: "#f39c12",
                backgroundColor: "#fff",
                boxShadow: "0 2px 4px rgba(0, 0, 0, 0.1)",
              },
              "&:hover": {
                color: "#f39c12",
                backgroundColor: "#f1f5f9",
              },
            }}
          />
        </Tabs>

        {/* Tab content */}
        {tabValue === 0 && (
          <CustomDataGrid
            CustomToolbarFromComponent={(props) => (
              <CustomToolbar
                {...props}
                searchResults={item.locations || []}
                dataType="locations"
                paginationModel={paginationModel}
              />
            )}
            rows={item.locations || []}
            columns={locationColumns}
            getRowId={(row) => row.location}
            paginationModel={paginationModel}
            onPageChange={handlePageChange}
            pageCount={Math.ceil(item?.locations?.length)}
            checkBox={false}
          />
        )}
        {tabValue === 1 && (
          <CustomDataGrid
            CustomToolbarFromComponent={(props) => (
              <CustomToolbar
                {...props}
                searchResults={item.prices || []}
                dataType="prices"
                paginationModel={paginationModel}
              />
            )}
            rows={item.prices || []}
            columns={priceColumns}
            getRowId={(row) => row.invoice_id + row.created_at}
            paginationModel={paginationModel}
            onPageChange={handlePageChange}
            pageCount={Math.ceil(item?.prices?.length / 10)}
            checkBox={false}
          />
        )}
        {tabValue === 2 && (
          <CustomDataGrid
            CustomToolbarFromComponent={(props) => (
              <CustomToolbar
                {...props}
                searchResults={item.invoice_history || []}
                dataType="invoice_history"
                paginationModel={paginationModel}
              />
            )}
            rows={item.invoice_history || []}
            columns={invoiceHistoryColumns}
            getRowId={(row) => row.invoice_id + row.invoice_date}
            paginationModel={paginationModel}
            onPageChange={handlePageChange}
            pageCount={Math.ceil(item?.invoice_history?.length / 10)}
            checkBox={false}
          />
        )}
      </Box>
    </Box>
  ) : (
    <Typography sx={{ fontSize: "1.1rem", color: "#4b6584", p: 2 }}>
      لا توجد بيانات للعنصر
    </Typography>
  );

  // Render as dialog or regular content
  return renderAsDialog ? (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth="lg"
      fullWidth
      sx={{
        "& .MuiDialog-paper": {
          borderRadius: "16px",
          boxShadow: "0 8px 24px rgba(0, 0, 0, 0.12)",
          backgroundColor: "#fff",
          margin: "32px",
          maxHeight: "82vh",
          overflowY: "auto",
        },
      }}
    >
      <Box
        sx={{
          display: "flex",
          direction: "rtl",
          justifyContent: "space-between",
          borderBottom: "1px solid #e2e8f0",
          boxShadow: "0 2px 8px rgba(0, 0, 0, 0.08)",
        }}
      >
        <DialogTitle
          sx={{
            fontWeight: 700,
            fontSize: "1.5rem",
            color: "#1e293b",
            padding: "24px 32px",
            borderBottom: "1px solid #e2e8f0",
          }}
        >
          تفاصيل العنصر
        </DialogTitle>
        <Box
          sx={{
            display: "flex",
            alignItems: "center",
            padding: "0 20px",
          }}
        >
          <Button
            onClick={onClose}
            variant="contained"
            sx={{
              padding: "10px 28px",
              backgroundColor: "#f39c12",
              borderRadius: "6px",
              fontSize: "1rem",
              fontWeight: 600,
              textTransform: "none",
              boxShadow: "0 2px 6px rgba(0, 0, 0, 0.1)",
              transition: "background-color 0.2s, box-shadow 0.2s",
              "&:hover": {
                backgroundColor: "#e68e0f",
                boxShadow: "0 4px 8px rgba(0, 0, 0, 0.15)",
              },
            }}
          >
            إغلاق
          </Button>
        </Box>
      </Box>
      <DialogContent sx={{ padding: "0", backgroundColor: "#f8fafc" }}>
        {content}
      </DialogContent>
    </Dialog>
  ) : (
    <Box sx={{ mt: 4, px: 2 }}>{content}</Box>
  );
};

export default ItemDetailsDialog;
