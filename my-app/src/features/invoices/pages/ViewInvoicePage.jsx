// src/features/invoices/pages/ViewInvoicePage.jsx
import React, { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import {
  getInvoice,
  returnWarrantyInvoicePartially,
} from "../../../api/modules/invoicesApi";
import InvoiceLayout from "../components/InvoiceLayout";
import { useAuthStore } from "../../../store/useAuthStore";
import { mapInvoiceFromApi } from "../utils/invoiceHelpers"; // ✅ جديد

export default function ViewInvoicePage() {
  const { id } = useParams();
  const [invoice, setInvoice] = useState(null);
  const [isLoading, setIsLoading] = useState(true);

  const { user, isUserLoading, fetchCurrentUser } = useAuthStore();

  useEffect(() => {
    fetchCurrentUser();
  }, [fetchCurrentUser]);

  useEffect(() => {
    let mounted = true;
    setIsLoading(true);

    (async () => {
      try {
        const res = await getInvoice(id);
        if (!mounted) return;

        const data = res.data;
        let status = null;

        if (data.type === "أمانات") {
          const statusRes = await returnWarrantyInvoicePartially({
            id: data.id,
          });
          if (!mounted) return;
          status = statusRes.data;
        }

        setInvoice(mapInvoiceFromApi(data, status));
      } catch (err) {
        console.error("getInvoice error", err);
      } finally {
        mounted && setIsLoading(false);
      }
    })();

    return () => {
      mounted = false;
    };
  }, [id]);

  useEffect(() => {
    if (!invoice || invoice.type !== "أمانات") return;

    let mounted = true;

    returnWarrantyInvoicePartially({ id: invoice.id })
      .then((res) => {
        if (!mounted) return;

        const status = res.data;
        if (!status?.items) return;

        setInvoice((prev) => {
          if (!prev) return prev;
          return {
            ...prev,
            items: (prev.items || []).map((it) => {
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
            }),
          };
        });
      })
      .catch((err) =>
        console.error("returnWarrantyInvoicePartially error", err)
      );

    return () => {
      mounted = false;
    };
  }, [invoice?.id, invoice?.type]);

  if (isLoading || isUserLoading || !invoice) {
    return (
      <div className="w-full h-[60vh] flex items-center justify-center">
        <div className="h-8 w-8 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  const isAmanat = invoice.type === "أمانات";
  const isAdmin = user?.username === "admin";
  const canViewPrices = user?.view_prices || isAdmin;
  const canRecoverDeposits = user?.can_recover_deposits || isAdmin;

  return (
    <div className="w-[90%] mx-auto mt-10 mb-10" dir="rtl">
      <InvoiceLayout
        selectedInvoice={invoice}
        isEditing={false}
        editingInvoice={invoice}
        setEditingInvoice={() => {}}
        selectedNowType={{ type: invoice.type }}
        addRow={() => {}}
        deleteRow={() => {}}
        isPurchasesType={invoice.type === "اضافه"}
        showCommentField
        isCreate={false}
        canEsterdad={isAmanat && canRecoverDeposits}
        setSelectedInvoice={setInvoice}
        canViewPrices={canViewPrices}
      />
    </div>
  );
}
