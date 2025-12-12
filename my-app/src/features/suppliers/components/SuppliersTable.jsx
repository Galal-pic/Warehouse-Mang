// src/features/suppliers/components/SuppliersTable.jsx
import React from "react";
import EditIcon from "@mui/icons-material/Edit";
import ClearOutlinedIcon from "@mui/icons-material/ClearOutlined";

export default function SuppliersTable({
  rows,
  page,
  totalPages,
  onPageChange,
  onEdit,
  onDelete,
  loading,
}) {
  return (
    <div className="bg-white rounded-xl shadow-md ">
      <div className="overflow-x-auto">
        <table className="min-w-full text-sm" dir="rtl">
          <thead className="bg-[#001473] text-white">
            <tr>
              <th className="px-4 py-2 text-center">#</th>
              <th className="px-4 py-2 text-center">اسم المورد</th>
              <th className="px-4 py-2 text-center">الباركود</th>
              <th className="px-4 py-2 text-center">الإجراءات</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={4} className="py-10 text-center">
                  <div className="inline-block h-8 w-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin" />
                </td>
              </tr>
            ) : rows.length === 0 ? (
              <tr>
                <td colSpan={4} className="py-6 text-center text-slate-500">
                  لا توجد بيانات
                </td>
              </tr>
            ) : (
              rows.map((s) => (
                <tr
                  key={s.id}
                  className="border-b last:border-b-0 odd:bg-slate-50 hover:bg-slate-100 transition"
                >
                  <td className="px-4 py-2 text-center">{s.id}</td>
                  <td className="px-4 py-2 text-center">{s.name}</td>
                  <td className="px-4 py-2 text-center">
                    {s.description || "-"}
                  </td>
                  <td className="px-4 py-2 text-center">
                    <div className="flex items-center justify-center gap-2">
                      <button
                        onClick={() => onEdit(s)}
                        className="p-1 rounded-md hover:bg-gray-100"
                      >
                        <EditIcon sx={{ color: "#001473" }} />
                      </button>

                      <button
                        onClick={() => onDelete(s)}
                        className="p-1 rounded-md hover:bg-gray-100"
                      >
                        <ClearOutlinedIcon sx={{ color: "red" }} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* pagination */}
      {totalPages > 1 && (
        <div className="flex justify-center items-center gap-3 py-3 bg-slate-50">
          <button
            onClick={() => onPageChange(Math.max(0, page - 1))}
            disabled={page === 0}
            className="px-3 py-1 rounded-md text-xs border border-gray-300 text-gray-700 disabled:opacity-40"
          >
            السابق
          </button>
          <span className="text-xs text-slate-600">
            صفحة {page + 1} من {totalPages}
          </span>
          <button
            onClick={() => onPageChange(Math.min(totalPages - 1, page + 1))}
            disabled={page >= totalPages - 1}
            className="px-3 py-1 rounded-md text-xs border border-gray-300 text-gray-700 disabled:opacity-40"
          >
            التالي
          </button>
        </div>
      )}
    </div>
  );
}
