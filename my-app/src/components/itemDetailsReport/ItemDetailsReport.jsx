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
} from "@mui/material";
import CustomDataGrid from "../dataGrid/CustomDataGrid";
import { GridToolbarContainer } from "@mui/x-data-grid";
import { useState } from "react"; // Add useState for tab management

const ItemDetailsDialog = ({ item, open, onClose, renderAsDialog = true }) => {
  // State for active tab
  const [tabValue, setTabValue] = useState(0);

  function CustomToolbar({
    columnVisibilityModel,
    searchResults,
    dataType,
    ...props
  }) {
    const handleExport = () => {
      console.log("handleExport");
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
    { field: "location", headerName: "الموقع", flex: 1 },
    { field: "quantity", headerName: "الكمية", flex: 1 },
  ];

  const priceColumns = [
    { field: "invoice_id", headerName: "معرف الفاتورة", flex: 1 },
    { field: "quantity", headerName: "الكمية", flex: 1 },
    { field: "unit_price", headerName: "سعر الوحدة", flex: 1 },
    {
      field: "created_at",
      headerName: "تاريخ الإنشاء",
      flex: 1,
      renderCell: (params) => (params.value ? params.value.split(" ")[0] : "-"),
    },
  ];

  const invoiceHistoryColumns = [
    { field: "invoice_id", headerName: "معرف الفاتورة", flex: 1 },
    { field: "invoice_type", headerName: "نوع الفاتورة", flex: 1 },
    {
      field: "invoice_date",
      headerName: "تاريخ الفاتورة",
      flex: 1,
      renderCell: (params) => (params.value ? params.value.split(" ")[0] : "-"),
    },
    { field: "location", headerName: "الموقع", flex: 1 },
    { field: "quantity", headerName: "الكمية", flex: 1 },
    { field: "unit_price", headerName: "سعر الوحدة", flex: 1 },
    { field: "total_price", headerName: "السعر الإجمالي", flex: 1 },
    { field: "status", headerName: "الحالة", flex: 1 },
  ];

  // Pagination model for all tables
  const paginationModel = { page: 0, pageSize: 100 };

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
              <strong>المعرف:</strong> {item.id}
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
              />
            )}
            rows={item.locations || []}
            columns={locationColumns}
            getRowId={(row) => row.location}
            paginationModel={paginationModel}
            pageCount={1}
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
              />
            )}
            rows={item.prices || []}
            columns={priceColumns}
            getRowId={(row) => row.invoice_id + row.created_at}
            paginationModel={paginationModel}
            pageCount={1}
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
              />
            )}
            rows={item.invoice_history || []}
            columns={invoiceHistoryColumns}
            getRowId={(row) => row.invoice_id + row.invoice_date}
            paginationModel={paginationModel}
            pageCount={1}
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
