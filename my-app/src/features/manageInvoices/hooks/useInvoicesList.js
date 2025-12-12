import { useState, useEffect, useCallback } from "react";
import { getInvoices } from "../../../api/modules/invoicesApi";

// تحويل الحالة من الإنجليزية للعربي
function mapStatus(status) {
  switch (status) {
    case "draft":
      return "لم تراجع";
    case "accreditation":
      return "لم تؤكد";
    case "confirmed":
      return "تم";
    case "partially_returned":
      return "استرداد جزئي";
    case "returned":
      return "تم الاسترداد";
    case "accepted":
      return "مقبول";
    case "rejected":
      return "مرفوض";
    default:
      return status || "";
  }
}

function formatTime(datetime) {
  if (!datetime) return "";
  const [date, timeWithSeconds] = datetime.split(" ");
  if (!timeWithSeconds) return "";
  const [hoursStr, minutes] = timeWithSeconds.split(":");
  const hours = Number(hoursStr);
  const hoursIn12 = hours % 12 || 12;
  const ampm = hours >= 12 ? "PM" : "AM";
  return `${hoursIn12}:${minutes} ${ampm}`;
}

export function useInvoicesList({ selectedFilter, page, pageSize }) {
  const [invoices, setInvoices] = useState([]);
  const [totalPages, setTotalPages] = useState(1);
  const [totalItems, setTotalItems] = useState(0);
  const [loading, setLoading] = useState(false);

  const fetchInvoices = useCallback(async () => {
    if (!selectedFilter) {
      setInvoices([]);
      setTotalPages(1);
      setTotalItems(0);
      return;
    }

    setLoading(true);
    try {
      const type = selectedFilter.apiType || selectedFilter.label;
      const res = await getInvoices({
        type,
        page,
        page_size: pageSize,
        all: false,
      });
      const data = res.data || {};

      const transformed =
        (data.invoices || []).map((invoice) => {
          const displayStatus = mapStatus(invoice.status);
          const itemsNames = (invoice.items || [])
            .map((item) => item.item_name)
            .join(", ");

          const [date] = (invoice.created_at || "").split(" ");
          const time = formatTime(invoice.created_at || "");

          return {
            ...invoice,
            status: displayStatus,
            rawStatus: invoice.status,
            itemsNames,
            date,
            time,
          };
        }) || [];

      setInvoices(transformed);
      setTotalPages(data.total_pages || 1);
      setTotalItems(data.total_items || transformed.length);
    } catch (error) {
      console.error("Error fetching invoices", error);
    } finally {
      setLoading(false);
    }
  }, [selectedFilter, page, pageSize]);

  useEffect(() => {
    fetchInvoices();
  }, [fetchInvoices]);

  return {
    invoices,
    totalPages,
    totalItems,
    loading,
    refetch: fetchInvoices,
  };
}
