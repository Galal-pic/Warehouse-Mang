// src/features/items/components/ItemDetailsModal.jsx
import React, { useEffect, useState } from "react";
import EditIcon from "@mui/icons-material/Edit";
import SaveIcon from "@mui/icons-material/Save";
import ClearOutlinedIcon from "@mui/icons-material/ClearOutlined";
import AddIcon from "@mui/icons-material/Add";

export default function ItemDetailsModal({
  open,
  item,
  canEdit,
  loadingSave = false,
  onClose,
  onSave,
}) {
  const [editing, setEditing] = useState(false);
  const [localItem, setLocalItem] = useState(item || null);
  const [errors, setErrors] = useState({});

  useEffect(() => {
    if (open) {
      setLocalItem(item || null);
      setEditing(false);
      setErrors({});
    }
  }, [open, item]);

  if (!open || !localItem) return null;

  const handleFieldChange = (field, value) => {
    setLocalItem((prev) => ({
      ...prev,
      [field]: value,
    }));
  };

  const handleLocationChange = (index, field, value) => {
    setLocalItem((prev) => {
      const locations = Array.isArray(prev.locations)
        ? [...prev.locations]
        : [];
      locations[index] = {
        ...locations[index],
        [field]: value,
      };
      return { ...prev, locations };
    });
  };

  const handleAddLocation = () => {
    setLocalItem((prev) => ({
      ...prev,
      locations: [
        ...(Array.isArray(prev.locations) ? prev.locations : []),
        { location: "", quantity: 0 },
      ],
    }));
  };

  const handleRemoveLocation = (index) => {
    if (!editing) return;
    setLocalItem((prev) => {
      const locations = Array.isArray(prev.locations)
        ? [...prev.locations]
        : [];
      locations.splice(index, 1);
      return { ...prev, locations };
    });
  };

  const validate = () => {
    const newErrors = {};
    if (!localItem.item_name?.trim()) newErrors.item_name = "الحقل مطلوب";
    if (!localItem.item_bar?.trim()) newErrors.item_bar = "الحقل مطلوب";

    const locErrors = [];
    (localItem.locations || []).forEach((loc, i) => {
      const le = {};
      if (!loc.location?.trim()) le.location = "الموقع مطلوب";
      if (Object.keys(le).length > 0) {
        locErrors[i] = le;
      }
    });

    if (locErrors.length > 0) newErrors.locations = locErrors;

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSave = () => {
    if (!validate()) return;

    const cleaned = {
      ...localItem,
      locations: (localItem.locations || []).map((l) => ({
        location: l.location,
        quantity: Number(l.quantity) || 0,
      })),
    };

    onSave(cleaned);
  };

  const locations = Array.isArray(localItem.locations)
    ? localItem.locations
    : [];

  const rental = localItem.rental_warehouse_info || {};

  return (
    <div
      className="fixed inset-0 z-40 flex items-center justify-center bg-black/50"
      onClick={onClose} // يقفل لما تضغطي بره
    >
      <div
        className="bg-[#f6f6f6] rounded-2xl shadow-2xl w-full max-w-lg p-6 max-h-[75vh] overflow-y-auto relative"
        dir="rtl"
        onClick={(e) => e.stopPropagation()} // يمنع الإغلاق عند الضغط جوه
        style={{
          scrollbarWidth: "thin",
        }}
      >
        {/* عنوان مع الأيقونات زي القديم */}
        <div className="relative mb-5">
          <h2 className="text-center font-bold text-[1.2rem] mb-2 text-[#1976d2]">
            تفاصيل المنتج
          </h2>

          {editing ? (
            <>
              {/* زر إلغاء التعديل */}
              <button
                type="button"
                onClick={() => {
                  setEditing(false);
                  setLocalItem(item || null);
                  setErrors({});
                }}
                className="absolute top-0 left-[-10px] p-1 rounded-full hover:bg-red-50"
              >
                <ClearOutlinedIcon
                  sx={{
                    fontSize: 30,
                    color: "#d32f2f",
                  }}
                />
              </button>

              {/* زر حفظ */}
              <button
                type="button"
                disabled={loadingSave}
                onClick={handleSave}
                className="absolute top-0 left-[24px] p-1 rounded-full hover:bg-blue-50 disabled:opacity-60"
              >
                {loadingSave ? (
                  <span className="inline-block h-6 w-6 border-4 border-blue-500 border-t-transparent rounded-full animate-spin" />
                ) : (
                  <SaveIcon
                    sx={{
                      fontSize: 28,
                      color: "#1976d2",
                    }}
                  />
                )}
              </button>
            </>
          ) : (
            canEdit && (
              <button
                type="button"
                onClick={() => setEditing(true)}
                className="absolute top-0 left-[-7px] p-1 rounded-full hover:bg-blue-50"
              >
                <EditIcon
                  sx={{
                    fontSize: 28,
                    color: "#1976d2",
                  }}
                />
              </button>
            )
          )}
        </div>

        {/* بيانات أساسية (اسم + باركود) بنفس ستايل القديم */}
        <div className="mb-2">
          <div className="flex items-start mb-2">
            <h5
              className="font-bold text-[#717171]"
              style={{ minWidth: "150px" }}
            >
              اسم المنتج:
            </h5>
            <div className="flex-1">
              {editing ? (
                <>
                  <input
                    type="text"
                    value={localItem.item_name || ""}
                    onChange={(e) =>
                      handleFieldChange("item_name", e.target.value)
                    }
                    className={`w-full bg-white rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 border ${
                      errors.item_name ? "border-red-400" : "border-transparent"
                    }`}
                    style={{
                      textAlign: "right",
                    }}
                  />
                  {errors.item_name && (
                    <p className="mt-1 text-xs text-red-500 text-right">
                      {errors.item_name}
                    </p>
                  )}
                </>
              ) : (
                <h5>{localItem.item_name}</h5>
              )}
            </div>
          </div>

          <hr className="border-slate-200 my-1" />

          <div className="flex items-start mb-2">
            <h5
              className="font-bold text-[#717171]"
              style={{ minWidth: "150px" }}
            >
              باركود المنتج:
            </h5>
            <div className="flex-1">
              {editing ? (
                <>
                  <input
                    type="text"
                    value={localItem.item_bar || ""}
                    onChange={(e) =>
                      handleFieldChange("item_bar", e.target.value)
                    }
                    className={`w-full bg-white rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 border ${
                      errors.item_bar ? "border-red-400" : "border-transparent"
                    }`}
                    style={{
                      textAlign: "right",
                    }}
                  />
                  {errors.item_bar && (
                    <p className="mt-1 text-xs text-red-500 text-right">
                      {errors.item_bar}
                    </p>
                  )}
                </>
              ) : (
                <h5>{localItem.item_bar}</h5>
              )}
            </div>
          </div>

          <hr className="border-slate-200 my-2" />
        </div>

        {/* المواقع والكميات على شكل كروت زي التصميم القديم */}
        <div className="mt-2">
          {locations.length === 0 ? (
            <div className="px-3 py-2 rounded-lg bg-slate-50 text-sm text-slate-500 text-center">
              لا توجد مواقع مسجلة لهذا المنتج
            </div>
          ) : (
            <ul className="space-y-3">
              {locations.map((loc, index) => {
                const locError = errors.locations?.[index] || {};
                return (
                  <li
                    key={index}
                    className="flex flex-col bg-[#fafafa] rounded-md mb-3 shadow-md relative px-3 py-2"
                  >
                    {/* لو عايزة زر حذف للموقع */}
                    {editing && (
                      <button
                        type="button"
                        onClick={() => handleRemoveLocation(index)}
                        className="absolute left-2 top-2 text-xs text-red-600 hover:text-red-700"
                      >
                        حذف
                      </button>
                    )}

                    {/* الموقع */}
                    <div className="flex w-full mb-1 mt-1">
                      <h5
                        className="font-bold text-right"
                        style={{ width: "100px" }}
                      >
                        الموقع:
                      </h5>
                      <div className="flex-1">
                        {editing ? (
                          <>
                            <input
                              type="text"
                              value={loc.location || ""}
                              onChange={(e) =>
                                handleLocationChange(
                                  index,
                                  "location",
                                  e.target.value
                                )
                              }
                              className={`w-full bg-white rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 border ${
                                locError.location
                                  ? "border-red-400"
                                  : "border-transparent"
                              }`}
                              style={{
                                textAlign: "right",
                              }}
                            />
                            {locError.location && (
                              <p className="mt-1 text-xs text-red-500 text-right">
                                {locError.location}
                              </p>
                            )}
                          </>
                        ) : (
                          <h5>{loc.location}</h5>
                        )}
                      </div>
                    </div>

                    {/* الكمية (عرض فقط) */}
                    <div className="flex w-full mb-1">
                      <h5
                        className="font-bold text-right"
                        style={{ width: "100px" }}
                      >
                        الكمية:
                      </h5>
                      <div className="flex-1">
                        <h5 className="pr-2">{loc.quantity}</h5>
                      </div>
                    </div>
                  </li>
                );
              })}
            </ul>
          )}

          {/* زر إضافة موقع جديد زي الزر الأزرق في القديم */}
          {editing && (
            <div className="mt-2 flex justify-start">
              <button
                type="button"
                onClick={handleAddLocation}
                className="flex items-center justify-center p-1.5 bg-[#1976d2] text-white rounded-full shadow hover:bg-[#145a9c]"
              >
                <AddIcon sx={{ fontSize: 28 }} />
              </button>
            </div>
          )}
        </div>

        {/* مخزن الحجز بشكل قريب من القديم */}
        {(rental.quantity ||
          rental.reserved_quantity ||
          rental.available_quantity) && (
          <>
            <hr className="border-slate-200 mt-4 mb-2" />
            <div className="flex flex-col bg-[#fafafa] rounded-md p-3 shadow-sm mt-1">
              <h5 className="font-bold text-[#717171] mb-2 text-right">
                مخزن الحجز:
              </h5>

              <div className="flex w-full mb-1">
                <h5
                  className="font-bold text-right"
                  style={{ width: "160px" }}
                >
                  إجمالي الكمية في الحجز:
                </h5>
                <h5>{rental.quantity ?? 0}</h5>
              </div>

              <div className="flex w-full mb-1">
                <h5
                  className="font-bold text-right"
                  style={{ width: "160px" }}
                >
                  كمية محجوزة:
                </h5>
                <h5>{rental.reserved_quantity ?? 0}</h5>
              </div>

              <div className="flex w-full mb-1">
                <h5
                  className="font-bold text-right"
                  style={{ width: "160px" }}
                >
                  كمية متاحة:
                </h5>
                <h5>{rental.available_quantity ?? 0}</h5>
              </div>
            </div>
          </>
        )}

        {/* زر إغلاق تحت في النص زي القديم */}
        <div className="mt-4 text-center">
          <button
            type="button"
            onClick={onClose}
            className="px-5 py-2 rounded-full bg-[#1976d2] text-white text-sm font-semibold hover:bg-[#145a9c]"
            disabled={loadingSave}
          >
            إغلاق
          </button>
        </div>
      </div>
    </div>
  );
}
