// src/features/invoices/components/InvoiceComment.jsx
import React from "react";

export default function InvoiceComment({
  selectedInvoice,
  editingInvoice,
  setEditingInvoice,
  isEditing,
  isCreate,
  showCommentField,
}) {
  if (!isCreate && !selectedInvoice.comment && !editingInvoice.comment) {
    return null;
  }

  return (
    <div className="mt-3 border border-gray-200  p-2 text-center text-sm">
      {isEditing ? (
        showCommentField && (
          <input
            type="text"
            className="w-full border-0 outline-none text-sm text-center"
            value={editingInvoice.comment || ""}
            onChange={(e) =>
              setEditingInvoice({
                ...editingInvoice,
                comment: e.target.value,
              })
            }
          />
        )
      ) : (
        <span>{selectedInvoice.comment || ""}</span>
      )}
    </div>
  );
}
