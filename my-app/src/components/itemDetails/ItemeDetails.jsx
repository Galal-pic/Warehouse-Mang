import { Button } from "@mui/material";
import {
  useGetItemQuery,
  useDetailsReportQuery,
} from "../../pages/services/warehouseApi";
import { useEffect } from "react";

// Reusable component for info fields
const InfoBadge = ({ title, value, color = "#6c757d" }) => (
  <div>
    <span
      style={{
        fontSize: "0.9rem",
        color: "#8e8e8e",
        display: "block",
        marginBottom: "4px",
      }}
    >
      {title}
    </span>
    <span
      style={{
        fontSize: "1.1rem",
        fontWeight: 600,
        color: color,
        display: "block",
      }}
    >
      {value || "--"}
    </span>
  </div>
);

// Reusable component for invoice fields
const InfoField = ({ title, value }) => (
  <div>
    <span
      style={{
        fontSize: "0.85rem",
        color: "#8e8e8e",
        display: "block",
      }}
    >
      {title}
    </span>
    <span
      style={{
        fontSize: "1rem",
        fontWeight: 500,
        color: "#2c3e50",
        display: "block",
      }}
    >
      {value || "--"}
    </span>
  </div>
);

const ItemeDetails = ({ open, onClose, id }) => {
  const { data: itemData, refetch: refetchItemData } = useGetItemQuery(id);
  const { data: itemDataInvoices, refetch: refetchItemDataInvoices } =
    useDetailsReportQuery(id);

  // Style constants
  const styles = {
    overlay: {
      position: "fixed",
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      backgroundColor: "rgba(0,0,0,0.5)",
      backdropFilter: "blur(4px)",
      display: "flex",
      justifyContent: "center",
      alignItems: "center",
      zIndex: 1000,
      transition: "opacity 0.3s ease",
    },
    content: {
      width: "90%",
      maxWidth: "800px",
      backgroundColor: "white",
      borderRadius: "12px",
      padding: "32px",
      maxHeight: "80vh",
      overflowY: "auto",
      boxShadow: "0 8px 32px rgba(0,0,0,0.2)",
      direction: "rtl",
      fontFamily: "'Tajawal', 'Segoe UI', sans-serif",
    },
    header: {
      display: "flex",
      justifyContent: "space-between",
      alignItems: "center",
      marginBottom: "24px",
      paddingBottom: "16px",
      borderBottom: "2px solid #e0e0e0",
    },
    sectionTitle: {
      color: "#2c3e50",
      fontSize: "1.5rem",
      fontWeight: 700,
      margin: "24px 0 16px",
    },
    locationCard: {
      backgroundColor: "#f8f9fa",
      borderRadius: "8px",
      padding: "16px",
      margin: "16px 0",
      boxShadow: "0 2px 4px rgba(0,0,0,0.05)",
    },
    invoiceCard: {
      backgroundColor: "white",
      border: "1px solid #e0e0e0",
      borderRadius: "6px",
      padding: "12px",
      margin: "8px 0",
    },
  };

  useEffect(() => {
    refetchItemData();
    refetchItemDataInvoices();
  }, [refetchItemData, refetchItemDataInvoices]);

  return (
    open && (
      <div style={styles.overlay} onClick={onClose}>
        <div
          style={{ ...styles.content, ...styles.scrollbar }}
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header Section */}
          <div style={styles.header}>
            <h2
              style={{
                margin: 0,
                color: "#1976d2",
                fontSize: "1.8rem",
                fontWeight: 700,
                letterSpacing: "-0.5px",
              }}
            >
              تفاصيل العنصر
            </h2>
            <Button
              variant="contained"
              onClick={onClose}
              sx={{
                bgcolor: "#1976d2",
                "&:hover": { bgcolor: "#1565c0" },
                borderRadius: "8px",
                px: 3,
                py: 1,
                fontWeight: 600,
                boxShadow: "0 2px 4px rgba(25, 118, 210, 0.2)",
              }}
            >
              إغلاق
            </Button>
          </div>

          {/* Main Content */}
          {itemData && (
            <div>
              {/* Basic Info */}
              <div style={{ marginBottom: "24px" }}>
                <div
                  style={{ display: "flex", gap: "24px", marginBottom: "12px" }}
                >
                  <InfoBadge title="اسم العنصر" value={itemData?.item_name} />
                  <InfoBadge title="الباركود" value={itemData?.item_bar} />
                </div>
              </div>

              {/* Locations Section */}
              <h3 style={styles.sectionTitle}>التوزيع في المخازن</h3>
              {itemData?.locations?.length > 0 ? (
                itemData.locations.map((location, index) => (
                  <div key={index} style={styles.locationCard}>
                    <div
                      style={{
                        display: "flex",
                        gap: "16px",
                        marginBottom: "12px",
                      }}
                    >
                      <InfoBadge
                        title={`الموقع ${index + 1}`}
                        value={location.location}
                        color="#4caf50"
                      />
                      <InfoBadge
                        title="الكمية المتاحة"
                        value={location.quantity}
                        color="#1976d2"
                      />
                    </div>

                    {/* Invoice Sources */}
                    <h4
                      style={{
                        color: "#6c757d",
                        fontSize: "1.1rem",
                        margin: "12px 0 8px",
                      }}
                    >
                      المصادر (عمليات الإضافة)
                    </h4>

                    {itemDataInvoices?.price_records?.length > 0 ? (
                      itemDataInvoices.price_records
                        .filter(
                          (record) =>
                            record.invoice_type === "اضافه" &&
                            record.quantity <= location.quantity
                        )
                        .map((record, idx) => (
                          <div key={idx} style={styles.invoiceCard}>
                            <div
                              style={{
                                display: "flex",
                                flexWrap: "wrap",
                                gap: "12px",
                                justifyContent: "space-around",
                              }}
                            >
                              <InfoField
                                title="رقم الفاتورة"
                                value={record.invoice_id}
                              />
                              <InfoField
                                title="التاريخ"
                                value={record.invoice_date}
                              />
                              <InfoField
                                title="الكمية"
                                value={record.quantity}
                              />
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
                          backgroundColor: "#fff3e0",
                          padding: "12px",
                          borderRadius: "6px",
                          color: "#ef6c00",
                          textAlign: "center",
                        }}
                      >
                        لا توجد عمليات إضافة مرتبطة بهذا الموقع
                      </div>
                    )}
                  </div>
                ))
              ) : (
                <div
                  style={{
                    backgroundColor: "#f8d7da",
                    padding: "16px",
                    borderRadius: "8px",
                    color: "#721c24",
                    textAlign: "center",
                  }}
                >
                  لا توجد مواقع مسجلة لهذا العنصر
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
