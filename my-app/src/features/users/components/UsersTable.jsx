import React from "react";
import ClearOutlinedIcon from "@mui/icons-material/ClearOutlined";
import LaunchIcon from "@mui/icons-material/Launch";
import PasswordIcon from "@mui/icons-material/Password";

export default function UsersTable({
  rows,
  page,
  totalPages,
  onPageChange,
  onEdit,
  onChangePassword,
  onDelete,
  loading,
}) {
  return (
    <div className="bg-white rounded-xl shadow-md ">
      <div className="overflow-x-auto">
        <table className="min-w-full text-sm" dir="rtl">
          <thead
            className="bg-primary
           text-white"
          >
            <tr>
              <th className="px-4 py-2 text-center">#</th>
              <th className="px-4 py-2 text-center">الاسم</th>
              <th className="px-4 py-2 text-center">رقم الهاتف</th>
              <th className="px-4 py-2 text-center">الوظيفة</th>
              <th className="px-4 py-2 text-center">الإجراءات</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={5} className="py-10 text-center">
                  <div className="inline-block h-8 w-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin" />
                </td>
              </tr>
            ) : rows.length === 0 ? (
              <tr>
                <td colSpan={5} className="py-6 text-center text-slate-500">
                  لا توجد بيانات
                </td>
              </tr>
            ) : (
              rows.map((user) => (
                <tr
                  key={user.id}
                  className="border-b last:border-b-0 odd:bg-slate-50 hover:bg-slate-100 transition"
                >
                  <td className="px-4 py-2 text-center">{user.id}</td>
                  <td className="px-4 py-2 text-center">{user.username}</td>
                  <td className="px-4 py-2 text-center">
                    {user.phone_number || "-"}
                  </td>
                  <td className="px-4 py-2 text-center">
                    {user.job_name || "-"}
                  </td>
                  <td className="px-4 py-2 text-center">
                    <div className="flex items-center justify-center gap-2">
                      {/* حذف */}
                      <button
                        onClick={() => onDelete(user.id)}
                        className="inline-flex items-center justify-center p-1 rounded-md bg-transparent hover:bg-red-100 transition"
                        title="حذف"
                      >
                        <ClearOutlinedIcon
                          sx={{ color: "#dc2626", fontSize: 20 }}
                        />
                      </button>

                      {/* تغيير كلمة السر */}
                      <button
                        onClick={() => onChangePassword(user.id)}
                        className="inline-flex items-center justify-center p-1 rounded-md bg-transparent hover:bg-indigo-100 transition"
                        title="تغيير كلمة السر"
                      >
                        <PasswordIcon sx={{ color: "#4f46e5", fontSize: 20 }} />
                      </button>

                      {/* تعديل / عرض */}
                      <button
                        onClick={() => onEdit(user.id)}
                        className="inline-flex items-center justify-center p-1 rounded-md bg-transparent hover:bg-blue-100 transition"
                        title="عرض / تعديل"
                      >
                        <LaunchIcon sx={{ color: "#2563eb", fontSize: 20 }} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* pagination بسيط */}
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
