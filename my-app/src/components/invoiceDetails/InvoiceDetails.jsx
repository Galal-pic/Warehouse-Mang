import { Button } from "@mui/material";
import { usePriceReportQuery } from "../../pages/services/invoice&warehouseApi";
import { useEffect } from "react";

const DetailItem = ({ label, value, valueStyle }) => (
  <div
    style={{
      lineHeight: 1.4,
      minWidth: "200px",
      textAlign: "center",
      margin: "auto",
    }}
  >
    <div
      style={{
        color: "#7f8c8d",
        fontSize: "0.9rem",
        marginBottom: "4px",
      }}
    >
      {label}
    </div>
    <div
      style={{
        color: "#2c3e50",
        fontSize: "1rem",
        fontWeight: 500,
        ...valueStyle,
      }}
    >
      {value}
    </div>
  </div>
);

const InvoiceDetails = ({ open, onClose, invoice }) => {
  const { data: invoiceData, refetch } = usePriceReportQuery(invoice?.id);

  useEffect(() => {
    refetch();
  }, [refetch]);

  return (
    open && (
      <div
        style={{
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
        }}
        onClick={onClose}
      >
        <div
          style={{
            width: "90%",
            maxWidth: "800px",
            backgroundColor: "#f8f9fa",
            borderRadius: "12px",
            padding: "24px",
            maxHeight: "80vh",
            overflowY: "auto",
            boxShadow: "0 8px 32px rgba(0,0,0,0.2)",
            direction: "rtl",
            fontFamily: "'Segoe UI', Tahoma, Geneva, Verdana, sans-serif",
          }}
          onClick={(e) => e.stopPropagation()}
        >
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              marginBottom: "24px",
              borderBottom: "2px solid #1976d2",
              paddingBottom: "12px",
            }}
          >
            <h2
              style={{
                margin: 0,
                color: "#2c3e50",
                fontSize: "1.8rem",
                fontWeight: 600,
              }}
            >
              تفاصيل العناصر
            </h2>
            <Button
              variant="contained"
              onClick={onClose}
              style={{
                backgroundColor: "#1976d2",
                color: "white",
                borderRadius: "8px",
                padding: "8px 20px",
                textTransform: "none",
                fontWeight: 500,
                "&:hover": {
                  backgroundColor: "#1565c0",
                },
              }}
            >
              إغلاق
            </Button>
          </div>

          {invoiceData?.items?.map((item) => (
            <div
              key={item.item_id}
              style={{
                backgroundColor: "white",
                borderRadius: "8px",
                padding: "20px",
                marginBottom: "20px",
                boxShadow: "0 2px 8px rgba(0,0,0,0.1)",
              }}
            >
              <div style={{ marginBottom: "16px" }}>
                <h3
                  style={{
                    color: "#1976d2",
                    margin: "0 0 12px 0",
                    fontSize: "1.3rem",
                  }}
                >
                  {item.item_name}
                </h3>
                <div
                  style={{
                    display: "flex",
                    flexWrap: "wrap",
                    gap: "12px",
                  }}
                >
                  <DetailItem label="الباركود" value={item.barcode} />
                  <DetailItem
                    label="الموقع"
                    value={
                      invoice?.items
                        ?.filter(
                          (invItem) =>
                            invItem.item_name === item.item_name &&
                            invItem.barcode === item.barcode
                        )
                        .map((invItem, idx) => (
                          <div key={idx} style={{ marginBottom: "4px" }}>
                            {invItem.location || "غير متوفر"}
                          </div>
                        )) || "غير متوفر"
                    }
                  />
                  <DetailItem label="الكمية" value={item.quantity} />
                  <DetailItem
                    label="سعر الوحدة"
                    value={`${item.unit_price} جنيه`}
                  />
                  <DetailItem
                    label="السعر الكلي"
                    value={`${item.total_price} جنيه`}
                  />
                  <DetailItem
                    label="عدد المصادر"
                    value={
                      item.price_breakdowns?.filter(
                        (breakdown) => breakdown.quantity !== 0
                      ).length
                    }
                  />
                </div>
              </div>

              {item.price_breakdowns
                ?.filter((breakdown) => breakdown.quantity !== 0)
                .map((breakdown, idx) => (
                  <div
                    key={idx}
                    style={{
                      backgroundColor: "#f8f9fa",
                      borderRadius: "6px",
                      padding: "16px",
                      margin: "12px 0",
                      borderLeft: `4px solid #1976d2`,
                    }}
                  >
                    <h4
                      style={{
                        color: "#2c3e50",
                        margin: "0 0 12px 0",
                        fontSize: "1.1rem",
                      }}
                    >
                      المصدر رقم {idx + 1}
                    </h4>
                    <div
                      style={{
                        display: "flex",
                        flexWrap: "wrap",
                        gap: "10px",
                      }}
                    >
                      <DetailItem
                        label="رقم الفاتورة"
                        value={breakdown.source_invoice_id}
                      />
                      <DetailItem
                        label="تاريخ الفاتورة"
                        value={breakdown.source_invoice_date}
                      />
                      <DetailItem label="الكمية" value={breakdown.quantity} />
                      <DetailItem
                        label="سعر الوحدة"
                        value={`${breakdown.unit_price} جنيه`}
                      />
                      <DetailItem
                        label="الإجمالي"
                        value={`${breakdown.subtotal} جنيه`}
                      />
                      <DetailItem
                        label="النسبة من الإجمالي"
                        value={`${breakdown.percentage_of_total}%`}
                        valueStyle={{ color: "#27ae60" }}
                      />
                    </div>
                  </div>
                ))}
            </div>
          ))}
        </div>
      </div>
    )
  );
};

export default InvoiceDetails;
