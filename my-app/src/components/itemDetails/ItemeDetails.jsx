import { Button } from "@mui/material";
import { useDetailsReportQuery } from "../../pages/services/invoice&warehouseApi";
import { useEffect } from "react";

// Reusable component for info fields
const ItemeDetails = ({ open, onClose, id }) => {
  const { data: itemDataInvoices, refetch } = useDetailsReportQuery(id);

  // Style constants
  const styles = {
    overlay: {
      position: "fixed",
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      backgroundColor: "rgba(0,0,0,0.5)",
      display: "flex",
      justifyContent: "center",
      alignItems: "center",
      zIndex: 1000,
      direction: "rtl",
    },
    content: {
      width: "90%",
      maxWidth: "800px",
      backgroundColor: "#f8f9fa",
      borderRadius: "12px",
      padding: "24px",
      maxHeight: "80vh",
      overflowY: "auto",
      boxShadow: "0 8px 32px rgba(0,0,0,0.2)",
      fontFamily: "'Segoe UI', Tahoma, Geneva, Verdana, sans-serif",
    },
    header: {
      display: "flex",
      justifyContent: "space-between",
      alignItems: "center",
      marginBottom: "24px",
      borderBottom: "2px solid #1976d2",
      paddingBottom: "12px",
    },
    title: {
      margin: 0,
      color: "#2c3e50",
      fontSize: "1.8rem",
      fontWeight: 600,
    },
    button: {
      backgroundColor: "#1976d2",
      color: "white",
      borderRadius: "8px",
      padding: "8px 20px",
      textTransform: "none",
      fontWeight: 500,
      "&:hover": {
        backgroundColor: "#1565c0",
      },
    },
    badgeTitle: {
      fontSize: "0.9rem",
      color: "#7f8c8d",
      marginBottom: "4px",
    },
    badgeValue: {
      fontSize: "1.3rem",
      color: "#2c3e50",
      fontWeight: 700,
      display: "block",
    },
    fieldTitle: {
      fontSize: "0.9rem",
      color: "#7f8c8d",
      marginBottom: "4px",
    },
    fieldValue: {
      fontSize: "1rem",
      color: "#2c3e50",
      fontWeight: 500,
      display: "block",
    },
    card: {
      backgroundColor: "white",
      borderRadius: "8px",
      padding: "20px",
      marginBottom: "20px",
      boxShadow: "0 2px 8px rgba(0,0,0,0.1)",
      borderLeft: `4px solid #1976d2`,
    },
  };

  const InfoBadge = ({ title, value }) => (
    <div>
      <span style={styles.badgeTitle}>{title}</span>
      <span style={styles.badgeValue}>{value || "--"}</span>
    </div>
  );

  const InfoField = ({ title, value }) => (
    <div>
      <span style={styles.fieldTitle}>{title}</span>
      <span style={styles.fieldValue}>{value || "--"}</span>
    </div>
  );

  useEffect(() => {
    if (open) refetch();
  }, [open, refetch]);

  return (
    open && (
      <div style={styles.overlay} onClick={onClose}>
        <div style={styles.content} onClick={(e) => e.stopPropagation()}>
          {/* Header Section */}
          <div style={styles.header}>
            <h2 style={styles.title}>المصادر (عمليات الإضافة)</h2>
            <Button variant="contained" onClick={onClose} style={styles.button}>
              إغلاق
            </Button>
          </div>

          {/* Main Content */}
          {itemDataInvoices && (
            <div>
              {/* Basic Info */}
              <div style={{ display: "flex", gap: 32, marginBottom: 24 }}>
                <InfoBadge
                  title="اسم العنصر"
                  value={itemDataInvoices?.item_name}
                />
                <InfoBadge
                  title="الباركود"
                  value={itemDataInvoices?.item_bar}
                />
              </div>

              {/* Invoices Section */}
              {itemDataInvoices?.price_records?.length > 0 ? (
                itemDataInvoices.price_records.map((record, idx) => (
                  <div key={idx} style={styles.card}>
                    <div
                      style={{
                        display: "flex",
                        gap: 24,
                        justifyContent: "space-around",
                      }}
                    >
                      <InfoField
                        title="رقم الفاتورة"
                        value={record.invoice_id}
                      />
                      <InfoField title="التاريخ" value={record.invoice_date} />
                      <InfoField title="الكمية" value={record.quantity} />
                      <InfoField
                        title="السعر/قطعة"
                        value={`${record.unit_price} ج.م`}
                      />
                    </div>
                  </div>
                ))
              ) : (
                <div
                  style={{
                    textAlign: "center",
                    padding: 16,
                    color: "#6c757d",
                    backgroundColor: "#f8f9fa",
                    borderRadius: 8,
                  }}
                >
                  لا توجد عمليات إضافة مرتبطة بهذا العنصر
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    )
  );
};

export default ItemeDetails;
