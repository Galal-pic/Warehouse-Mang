// src/features/mechanisms/pages/MechanismsPage.jsx
import React, { useEffect, useState, useRef } from "react";
import { useMechanismsData } from "../hooks/useMechanismsData";
import MechanismsTable from "../components/MechanismsTable";
import MechanismFormModal from "../components/MechanismFormModal";
import { useAuthStore } from "../../../store/useAuthStore";
import AddCircleIcon from "@mui/icons-material/AddCircle";
import ImportExportIcon from "@mui/icons-material/ImportExport";
import * as XLSX from "xlsx";
import { importMechanism } from "../../../api/modules/mechanismsApi";

export default function MechanismsPage() {
  const { user, isUserLoading, fetchCurrentUser } = useAuthStore();

  useEffect(() => {
    fetchCurrentUser();
  }, [fetchCurrentUser]);

  const [pagination, setPagination] = useState({ page: 0, pageSize: 10 });

  const {
    mechanisms,
    totalPages,
    isLoading,
    isSaving,
    isDeleting,
    addMechanism,
    updateMechanism,
    deleteMechanism,
    refetch,
  } = useMechanismsData({
    page: pagination.page,
    pageSize: pagination.pageSize,
  });

  // استيراد من Excel
  const [isImporting, setIsImporting] = useState(false);
  const fileInputRef = useRef(null);

  // Snackbar بسيط
  const [snackbar, setSnackbar] = useState({
    open: false,
    message: "",
    type: "success",
  });

  const showMessage = (message, type = "success") => {
    setSnackbar({ open: true, message, type });
    setTimeout(() => setSnackbar((s) => ({ ...s, open: false })), 2000);
  };

  // مودال إضافة / تعديل
  const [formOpen, setFormOpen] = useState(false);
  const [formMode, setFormMode] = useState("add");
  const [editingMechanism, setEditingMechanism] = useState(null);

  // مودال حذف
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [mechanismToDelete, setMechanismToDelete] = useState(null);
  const [deleteText, setDeleteText] = useState("");

  // تحميل بيانات المستخدم
  if (isUserLoading) {
    return (
      <div className="h-[80vh] flex items-center justify-center">
        <div className="h-8 w-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  // تأكيد صلاحيات الميكانيزم
  if (
    user?.username !== "admin" &&
    !user?.mechanism_can_edit &&
    !user?.mechanism_can_add &&
    !user?.mechanism_can_delete
  ) {
    return (
      <div className="h-[80vh] flex items-center justify-center" dir="rtl">
        <h1 className="text-xl font-semibold text-slate-700">
          هذه الصفحة غير متوفرة
        </h1>
      </div>
    );
  }

  const handleAddClick = () => {
    if (!user?.mechanism_can_add && user?.username !== "admin") {
      showMessage("ليس لديك صلاحيات لإضافة عنصر", "info");
      return;
    }
    setFormMode("add");
    setEditingMechanism(null);
    setFormOpen(true);
  };

  const handleEditClick = (row) => {
    if (!user?.mechanism_can_edit && user?.username !== "admin") {
      showMessage("ليس لديك صلاحيات لتعديل عنصر", "info");
      return;
    }
    setFormMode("edit");
    setEditingMechanism(row);
    setFormOpen(true);
  };

  const handleDeleteClick = (row) => {
    if (!user?.mechanism_can_delete && user?.username !== "admin") {
      showMessage("ليس لديك صلاحيات لحذف العنصر", "info");
      return;
    }
    setMechanismToDelete(row);
    setDeleteDialogOpen(true);
    setDeleteText("");
  };

  const handleSubmitForm = async (values) => {
    try {
      if (formMode === "add") {
        await addMechanism(values);
        showMessage("تمت إضافة الميكانيزم", "success");
      } else if (formMode === "edit" && editingMechanism) {
        await updateMechanism({ id: editingMechanism.id, ...values });
        showMessage("تم تعديل الميكانيزم", "success");
      }
      setFormOpen(false);
      setEditingMechanism(null);
    } catch (err) {
      console.error(err);
      showMessage("حدث خطأ أثناء الحفظ", "error");
    }
  };

  const handleConfirmDelete = async () => {
    if (!mechanismToDelete) return;
    if (deleteText.trim().toLowerCase() !== "نعم") return;

    try {
      await deleteMechanism(mechanismToDelete.id);
      showMessage("تم حذف الميكانيزم", "success");
    } catch (err) {
      console.error(err);
      showMessage(
        "خطأ في حذف الميكانيزم قد يكون هناك بيانات متعلقة به أو أنه غير موجود بالفعل",
        "error"
      );
    } finally {
      setDeleteDialogOpen(false);
      setMechanismToDelete(null);
      setDeleteText("");
    }
  };

  // فتح اختيار ملف الاستيراد
  const handleImportClick = () => {
    if (!user?.mechanism_can_add && user?.username !== "admin") {
      showMessage("ليس لديك صلاحيات لإضافة عنصر", "info");
      return;
    }

    if (fileInputRef.current) {
      fileInputRef.current.click();
    }
  };

  // التعامل مع ملف Excel
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

      await importMechanism(jsonData);

      showMessage("تم استيراد الميكانيزمات بنجاح", "success");

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
    <div className="max-w-5xl mx-auto py-8 px-4" dir="rtl">
      {/* Snackbar بسيط */}
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
        الميكانيزم
      </h1>

      {/* العنوان + زر إضافة + زر استيراد (واحد يمين – واحد يسار) */}
      <div className="flex items-center justify-between mb-6 mt-4">


        {/* زر استيراد على أقصى يسار */}
        <div>
          {/* input مخفي لرفع ملف الإكسل */}
          <input
            ref={fileInputRef}
            type="file"
            accept=".xlsx,.xls"
            className="hidden"
            onChange={handleImportFile}
            disabled={isImporting}
          />

          {/* أيقونة import */}
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
                {/* زر إضافة على أقصى يمين */}
        <button
          type="button"
          onClick={handleAddClick}
          className="inline-flex items-center gap-2 rounded-lg text-white text-sm font-semibold px-4 py-2"
        >
          <AddCircleIcon sx={{ color: "#001473", fontSize: "50px" }} />
        </button>
      </div>

      {/* جدول الميكانيزم */}
      <MechanismsTable
        rows={mechanisms}
        page={pagination.page}
        totalPages={totalPages}
        onPageChange={(p) =>
          setPagination((prev) => ({
            ...prev,
            page: p,
          }))
        }
        onEdit={handleEditClick}
        onDelete={handleDeleteClick}
        loading={isLoading}
      />

      {/* مودال إضافة / تعديل */}
      <MechanismFormModal
        open={formOpen}
        mode={formMode}
        initialValues={editingMechanism || { name: "", description: "" }}
        loading={isSaving}
        onClose={() => {
          setFormOpen(false);
          setEditingMechanism(null);
        }}
        onSubmit={handleSubmitForm}
      />

      {/* مودال تأكيد حذف */}
      {deleteDialogOpen && (
        <div
          className="fixed inset-0 z-40 flex items-center justify-center bg-black/50"
          onClick={() => {
            setDeleteDialogOpen(false);
            setMechanismToDelete(null);
            setDeleteText("");
          }}
        >
          <div
            className="bg-white rounded-xl shadow-xl w-full max-w-md p-6"
            dir="rtl"
            onClick={(e) => e.stopPropagation()}
          >
            <h2 className="text-lg font-semibold text-center text-red-600 mb-4">
              تأكيد الحذف
            </h2>
            <p className="text-sm text-right mb-3">
              هل أنت متأكد من رغبتك في حذف هذا الميكانيزم؟
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
                  setDeleteDialogOpen(false);
                  setMechanismToDelete(null);
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
