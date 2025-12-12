// src/features/invoices/utils/invoiceHelpers.js
export function mapInvoiceFromApi(data, status = null) {
  if (!data) return null;

  const datePart = data.created_at
    ? data.created_at.split(" ")[0]
    : data.date || "";

  const timePart = data.created_at
    ? new Date(
        `1970-01-01 ${data.created_at.split(" ")[1]}`
      ).toLocaleTimeString("en-US", {
        hour12: true,
        hour: "numeric",
        minute: "2-digit",
      })
    : data.time || "";

  let items = data.items || [];

  if (status?.items && data.type === "أمانات") {
    items = items.map((it) => {
      const match = status.items.find(
        (r) =>
          r.item_name === it.item_name &&
          r.item_bar === it.barcode &&
          r.location === it.location
      );

      if (!match) {
        return {
          ...it,
          total_returned: it.total_returned || 0,
          is_fully_returned: it.is_fully_returned || false,
        };
      }

      return {
        ...it,
        total_returned:
          typeof match.total_returned === "number"
            ? match.total_returned
            : it.total_returned || 0,
        is_fully_returned:
          typeof match.is_fully_returned === "boolean"
            ? match.is_fully_returned
            : it.is_fully_returned || false,
      };
    });
  }

  return {
    ...data,
    date: datePart,
    time: timePart,
    items,
  };
}
