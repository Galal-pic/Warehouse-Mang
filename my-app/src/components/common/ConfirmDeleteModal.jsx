import React, { useRef, useEffect } from "react";

export default function ConfirmDeleteModal({
  open,
  onClose,
  onConfirm,
  confirmationText,
  setConfirmationText,
  message,
  isNecessary = true,
  loading = false,
}) {
  const inputRef = useRef(null);

  useEffect(() => {
    if (open && isNecessary && inputRef.current) {
      inputRef.current.focus();
    }
  }, [open, isNecessary]);

  if (!open) return null;

  const handleSubmit = (e) => {
    e.preventDefault();
    onConfirm();
  };

  const handleBackdropClick = () => {
    setConfirmationText("");
    onClose();
  };

  return (
    <div
      className="fixed inset-0 z-40 flex items-center justify-center bg-black/40"
      onClick={handleBackdropClick} // إغلاق عند الضغط على الخلفية
    >
      <div
        className="bg-white rounded-xl shadow-xl w-full max-w-lg p-5"
        dir="rtl"
        onClick={(e) => e.stopPropagation()} // منع الإغلاق عند الضغط داخل الكارت
      >
        <h2 className="text-center text-lg font-bold text-red-600 mb-4">
          {loading ? "جاري الحذف..." : "تأكيد الحذف"}
        </h2>

        {loading ? (
          <div className="flex justify-center items-center py-10">
            <div className="h-8 w-8 border-4 border-red-500 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : (
          <>
            <p className="text-right text-sm font-semibold mb-3">
              {message}
              {isNecessary && (
                <>
                  <br />
                  للاستمرار اكتب <span className="font-bold">"نعم"</span>
                </>
              )}
            </p>

            {isNecessary && (
              <form onSubmit={handleSubmit}>
                <input
                  ref={inputRef}
                  type="text"
                  value={confirmationText}
                  onChange={(e) => setConfirmationText(e.target.value)}
                  className="w-full border rounded-lg px-3 py-2 text-sm text-right focus:outline-none focus:ring-2 focus:ring-red-500"
                />
              </form>
            )}

            <div className="mt-5 flex justify-between gap-3">
              <button
                onClick={handleSubmit}
                disabled={isNecessary && confirmationText.trim() !== "نعم"}
                className="flex-1 inline-flex justify-center px-4 py-2 rounded-lg text-sm font-semibold text-white bg-red-600 disabled:opacity-50 hover:bg-red-700 transition"
              >
                تأكيد
              </button>
              <button
                onClick={handleBackdropClick}
                className="flex-1 inline-flex justify-center px-4 py-2 rounded-lg text-sm font-semibold border border-gray-300 text-gray-700 hover:bg-gray-100 transition"
              >
                إغلاق
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
