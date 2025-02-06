import React from "react";
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  CircularProgress,
  Typography,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
} from "@mui/material";

export default function InvoiceDetails({
  invoice,
  displayDialogOpen,
  setDisplayDialogOpen,
  handleDisplay,
  loader,
}) {
  const handleSubmit = (e) => {
    e.preventDefault();
    handleDisplay();
    setDisplayDialogOpen(false);
  };

  return (
    <Dialog
      open={displayDialogOpen}
      onClose={() => setDisplayDialogOpen(false)}
      aria-labelledby="delete-dialog-title"
      sx={{ zIndex: "99999" }}
      disableAutoFocus
    >
      <DialogTitle
        id="delete-dialog-title"
        sx={{
          textAlign: "center",
          color: "#d32f2f",
          fontWeight: "bold",
        }}
      >
        {loader ? "جاري التنفيذ..." : "صرف الفاتورة"}
      </DialogTitle>

      {loader ? (
        <DialogContent
          sx={{
            display: "flex",
            justifyContent: "center",
            alignItems: "center",
            height: "150px",
            width: "500px",
          }}
        >
          <CircularProgress />
        </DialogContent>
      ) : (
        <DialogContent sx={{ width: "500px", direction: "rtl" }}>
          <div style={{ display: "flex", gap: "10px", marginBottom: "10px" }}>
            <div style={{ width: "150px" }}>
              <strong>رقم الفاتورة:</strong>
            </div>
            <div>{invoice?.id}</div>
          </div>
          <div style={{ display: "flex", gap: "10px", marginBottom: "10px" }}>
            <div style={{ width: "150px" }}>
              <strong>النوع:</strong>
            </div>
            <div>{invoice?.type}</div>
          </div>
          <div style={{ display: "flex", gap: "10px", marginBottom: "10px" }}>
            <div style={{ width: "150px" }}>
              <strong>الموظف المسؤول:</strong>
            </div>
            <div>{invoice?.employee_name}</div>
          </div>
          <div style={{ display: "flex", gap: "10px", marginBottom: "10px" }}>
            <div style={{ width: "150px" }}>
              <strong>اسم الآلة:</strong>
            </div>
            <div>{invoice?.machine_name}</div>
          </div>
          <div style={{ display: "flex", gap: "10px", marginBottom: "10px" }}>
            <div style={{ width: "150px" }}>
              <strong>اسم الميكانيزم:</strong>
            </div>
            <div>{invoice?.mechanism_name}</div>
          </div>
          <div style={{ display: "flex", gap: "10px", marginBottom: "10px" }}>
            <div style={{ width: "150px" }}>
              <strong>الإجمالي:</strong>
            </div>
            <div>{invoice?.total_amount} جنيه</div>
          </div>
          <div style={{ display: "flex", gap: "10px", marginBottom: "10px" }}>
            <div style={{ width: "150px" }}>
              <strong>المبلغ المدفوع:</strong>
            </div>
            <div>{invoice?.paid} جنيه</div>
          </div>
          <div style={{ display: "flex", gap: "10px", marginBottom: "10px" }}>
            <div style={{ width: "150px" }}>
              <strong>المتبقي:</strong>
            </div>
            <div>{invoice?.residual} جنيه</div>
          </div>
          <div style={{ display: "flex", gap: "10px", marginBottom: "10px" }}>
            <div style={{ width: "150px" }}>
              <strong>الحالة:</strong>
            </div>
            <div>{invoice?.status}</div>
          </div>
          <div style={{ display: "flex", gap: "10px", marginBottom: "10px" }}>
            <div style={{ width: "150px" }}>
              <strong>التعليق:</strong>
            </div>
            <div>{invoice?.comment || "لا يوجد"}</div>
          </div>
          {invoice?.items?.length > 0 && (
            <>
              <Typography variant="h6" sx={{ marginTop: "10px" }}>
                العناصر
              </Typography>
              <TableContainer component={Paper} sx={{ marginTop: "10px" }}>
                <Table>
                  <TableHead>
                    <TableRow>
                      <TableCell align="right">اسم العنصر</TableCell>
                      <TableCell align="right">الباركود</TableCell>
                      <TableCell align="right">الكمية</TableCell>
                      <TableCell align="right">الموقع</TableCell>
                      <TableCell align="right">السعر الإجمالي</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {invoice.items.map((item, index) => (
                      <TableRow key={index}>
                        <TableCell align="right">{item.item_name}</TableCell>
                        <TableCell align="right">{item.barcode}</TableCell>
                        <TableCell align="right">{item.quantity}</TableCell>
                        <TableCell align="right">{item.location}</TableCell>
                        <TableCell align="right">
                          {item.total_price} جنيه
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
            </>
          )}
        </DialogContent>
      )}

      {!loader && (
        <DialogActions sx={{ display: "flex", justifyContent: "space-around" }}>
          <Button onClick={handleSubmit} color="primary" variant="contained">
            تأكيد
          </Button>
          <Button
            onClick={() => setDisplayDialogOpen(false)}
            color="error"
            variant="outlined"
            
          >
            إغلاق
          </Button>
        </DialogActions>
      )}
    </Dialog>
  );
}
