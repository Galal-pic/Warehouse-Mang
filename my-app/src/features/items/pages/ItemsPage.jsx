// src/features/items/pages/ItemsPage.jsx
import React, { useEffect, useState, useRef } from "react";
import { useItemsData } from "../hooks/useItemsData";
import ItemsTable from "../components/ItemsTable";
import ItemFormModal from "../components/ItemFormModal";
import ItemDetailsModal from "../components/ItemDetailsModal";
import ItemPriceSourcesModal from "../components/ItemPriceSourcesModal";
import { useAuthStore } from "../../../store/useAuthStore";
import AddCircleIcon from "@mui/icons-material/AddCircle";
import ImportExportIcon from "@mui/icons-material/ImportExport";
import * as XLSX from "xlsx";
import { importWarehouse } from "../../../api/modules/warehousesApi";

export default function ItemsPage() {
  const { user, isUserLoading, fetchCurrentUser } = useAuthStore();

  useEffect(() => {
    fetchCurrentUser();
  }, [fetchCurrentUser]);

  const [pagination, setPagination] = useState({ page: 0, pageSize: 10 });

  const {
    items,
    totalPages,
    isLoading,
    isSaving,
    isDeleting,
    addItem,
    updateItem,
    deleteItem,
    refetch,
  } = useItemsData({
    page: pagination.page,
    pageSize: pagination.pageSize,
  });

  const [snackbar, setSnackbar] = useState({
    open: false,
    message: "",
    type: "success",
  });

  const showMessage = (message, type = "success") => {
    setSnackbar({ open: true, message, type });
    setTimeout(() => setSnackbar((s) => ({ ...s, open: false })), 2000);
  };

  // Add modal
  const [addOpen, setAddOpen] = useState(false);

  // Details modal
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [selectedItem, setSelectedItem] = useState(null);

  // Price sources modal
  const [priceOpen, setPriceOpen] = useState(false);
  const [priceItemId, setPriceItemId] = useState(null);

  // Delete modal
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [itemToDelete, setItemToDelete] = useState(null);
  const [deleteText, setDeleteText] = useState("");

  // Import Excel
  const [isImporting, setIsImporting] = useState(false);
  const fileInputRef = useRef(null);

  // تحميل بيانات المستخدم
  if (isUserLoading) {
    return (
      <div className="h-[80vh] flex items-center justify-center">
        <div className="h-8 w-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  const canViewPage =
    user?.username === "admin" ||
    user?.items_can_edit ||
    user?.items_can_add ||
    user?.items_can_delete;

  if (!canViewPage) {
    return (
      <div className="h-[80vh] flex items-center justify-center" dir="rtl">
        <h1 className="text-xl font-semibold text-slate-700">
          هذه الصفحة غير متوفرة
        </h1>
      </div>
    );
  }

  const handleAddClick = () => {
    if (!user?.items_can_add && user?.username !== "admin") {
      showMessage("ليس لديك صلاحيات لإضافة عنصر", "info");
      return;
    }
    setAddOpen(true);
  };

  const handleAddSubmit = async (values) => {
    const payload = {
      item_name: values.item_name.trim(),
      item_bar: values.item_bar.trim(),
      locations: [
        {
          location: values.location.trim(),
          quantity: 0,
        },
      ],
    };

    try {
      await addItem(payload);
      showMessage("تمت إضافة المنتج", "success");
      setAddOpen(false);
    } catch (err) {
      console.error(err);
      showMessage("اسم العنصر أو الباركود موجود بالفعل", "error");
    }
  };

  const handleOpenDetails = (item) => {
    setSelectedItem(item);
    setDetailsOpen(true);
  };

  const handleSaveDetails = async (updatedItem) => {
    try {
      await updateItem({
        id: updatedItem.id,
        item_name: updatedItem.item_name,
        item_bar: updatedItem.item_bar,
        locations: updatedItem.locations,
      });
      showMessage("تم تعديل المنتج", "success");
      setDetailsOpen(false);
      setSelectedItem(null);
    } catch (err) {
      console.error(err);
      showMessage("اسم العنصر أو الباركود موجود بالفعل", "error");
    }
  };

  const handleShowPriceSources = (item) => {
    setPriceItemId(item.id);
    setPriceOpen(true);
  };

  const handleDeleteClick = (item) => {
    if (!user?.items_can_delete && user?.username !== "admin") {
      showMessage("ليس لديك صلاحيات لحذف العنصر", "info");
      return;
    }
    setItemToDelete(item);
    setDeleteText("");
    setDeleteOpen(true);
  };

  const handleConfirmDelete = async () => {
    if (!itemToDelete) return;
    if (deleteText.trim().toLowerCase() !== "نعم") return;

    try {
      await deleteItem(itemToDelete.id);
      showMessage("تم حذف المنتج", "success");
    } catch (err) {
      console.error(err);
      showMessage(
        "فشل حذف المنتج قد يكون هناك بيانات تتعلق به أو أنه غير موجود بالفعل",
        "error"
      );
    } finally {
      setDeleteOpen(false);
      setItemToDelete(null);
      setDeleteText("");
    }
  };

  // Import Excel handlers
  const handleImportClick = () => {
    if (!user?.items_can_add && user?.username !== "admin") {
      showMessage("ليس لديك صلاحيات لإضافة عنصر", "info");
      return;
    }
    if (fileInputRef.current) {
      fileInputRef.current.click();
    }
  };

  const handleImportFile = async (event) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setIsImporting(true);

    try {
      const data = await file.arrayBuffer();
      const workbook = XLSX.read(data, { type: "array" });
      const sheetName = workbook.SheetNames[0];
      const sheet = workbook.Sheets[sheetName];
      const jsonData = XLSX.utils.sheet_to_json(sheet);

      // زي الكود القديم: نجهز بيانات المستودع
      const formattedData = {
        warehouse_manager: "esraa",
        data: jsonData.map((row) => ({
          id: row.id,
          item_name: row.item_name,
          item_bar: row.item_bar,
          location: row.location,
          quantity: row.quantity,
          price_unit: row.price_unit,
        })),
      };

      await importWarehouse(formattedData);

      showMessage("تم استيراد البيانات بنجاح", "success");

      if (typeof refetch === "function") {
        await refetch();
      }
    } catch (err) {
      console.error(err);
      showMessage("البيانات غير متوافقة أو حدث خطأ في الاستيراد", "error");
    } finally {
      setIsImporting(false);
      event.target.value = "";
    }
  };

  return (
    <div className="max-w-6xl mx-auto py-8 px-4" dir="rtl">
      {/* Snackbar */}
      {snackbar.open && (
        <div className="fixed top-4 left-1/2 -translate-x-1/2 z-40">
          <div
            className={`px-4 py-2 rounded-lg shadow-lg text-sm font-semibold text-white ${
              snackbar.type === "success"
                ? "bg-emerald-600"
                : snackbar.type === "error"
                  ? "bg-red-600"
                  : "bg-slate-700"
            }`}
          >
            {snackbar.message}
          </div>
        </div>
      )}

      {/* العنوان */}
      <h1 className="text-2xl md:text-3xl font-bold text-slate-800 text-center">
        المنتجات
      </h1>

      {/* العنوان + زر إضافة + زر استيراد */}
      <div className="flex items-center justify-between mb-6 mt-4">
        {/* زر استيراد (يسار) */}
        <div>
          <input
            ref={fileInputRef}
            type="file"
            accept=".xlsx,.xls"
            className="hidden"
            onChange={handleImportFile}
            disabled={isImporting}
          />

          <button
            type="button"
            onClick={handleImportClick}
            disabled={isImporting}
            className="inline-flex items-center justify-center rounded-full"
          >
            <ImportExportIcon
              sx={{
                fontSize: 40,
                color: "white",
                backgroundColor: "#4caf50",
                padding: "8px",
                borderRadius: "50%",
                opacity: isImporting ? 0.6 : 1,
              }}
            />
          </button>
        </div>
        {/* زر إضافة (يمين) */}
        <button
          type="button"
          onClick={handleAddClick}
          className="inline-flex items-center gap-2 rounded-lg text-white text-sm font-semibold px-4 py-2"
        >
          <AddCircleIcon sx={{ color: "#001473", fontSize: "50px" }} />
        </button>
      </div>

      {/* Table */}
      <ItemsTable
        rows={items}
        page={pagination.page}
        totalPages={totalPages}
        onPageChange={(p) =>
          setPagination((prev) => ({
            ...prev,
            page: p,
          }))
        }
        onOpenItem={handleOpenDetails}
        onDelete={handleDeleteClick}
        onShowPriceSources={handleShowPriceSources}
        loading={isLoading}
      />

      {/* Add Modal */}
      <ItemFormModal
        open={addOpen}
        loading={isSaving}
        onClose={() => setAddOpen(false)}
        onSubmit={handleAddSubmit}
      />

      {/* Details Modal */}
      <ItemDetailsModal
        open={detailsOpen}
        item={selectedItem}
        canEdit={user?.items_can_edit || user?.username === "admin"}
        loadingSave={isSaving}
        onClose={() => {
          setDetailsOpen(false);
          setSelectedItem(null);
        }}
        onSave={handleSaveDetails}
      />

      {/* Price Sources Modal */}
      <ItemPriceSourcesModal
        open={priceOpen}
        onClose={() => setPriceOpen(false)}
        itemId={priceItemId}
      />

      {/* Delete Confirm Modal */}
      {deleteOpen && (
        <div
          className="fixed inset-0 z-40 flex items-center justify-center bg-black/50"
          onClick={() => {
            setDeleteOpen(false);
            setItemToDelete(null);
            setDeleteText("");
          }}
        >
          <div
            className="bg-white rounded-xl shadow-xl w-full max-w-md p-6"
            dir="rtl"
            onClick={(e) => e.stopPropagation()}
          >
            <h2 className="text-lg font-semibold text-center text-red-600 mb-3">
              تأكيد الحذف
            </h2>
            <p className="text-sm text-right mb-3">
              هل أنت متأكد من رغبتك في حذف هذا العنصر؟
              <br />
              للاستمرار اكتب كلمة <span className="font-semibold">"نعم"</span>
            </p>
            <input
              type="text"
              value={deleteText}
              onChange={(e) => setDeleteText(e.target.value)}
              className="w-full rounded-lg border px-3 py-2 text-sm bg-white text-slate-900 focus:outline-none focus:ring-2 focus:ring-red-500 mb-4"
            />

            <div className="flex justify-between mt-2">
              <button
                type="button"
                onClick={() => {
                  setDeleteOpen(false);
                  setItemToDelete(null);
                  setDeleteText("");
                }}
                className="px-4 py-2 rounded-lg border border-slate-300 text-slate-700 text-sm hover:bg-slate-100"
                disabled={isDeleting}
              >
                إغلاق
              </button>
              <button
                type="button"
                onClick={handleConfirmDelete}
                disabled={
                  isDeleting || deleteText.trim().toLowerCase() !== "نعم"
                }
                className="px-4 py-2 rounded-lg bg-red-600 text-white text-sm font-semibold hover:bg-red-700 disabled:opacity-60"
              >
                {isDeleting ? "جارٍ الحذف..." : "تأكيد"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
