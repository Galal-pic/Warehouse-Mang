import React, { useEffect, useState } from "react";

const TYPES = {
  success: "bg-green-100 text-green-800 border border-green-200",
  error: "bg-red-100 text-red-800 border border-red-200",
  warning: "bg-yellow-100 text-yellow-800 border border-yellow-200",
  info: "bg-blue-100 text-blue-800 border border-blue-200",
};

export default function SnackBar({
  open,
  message,
  type = "info",
  onClose,
  autoHideDuration = 2500,
}) {
  const [show, setShow] = useState(false);

  useEffect(() => {
    if (open) {
      setShow(true);
      const id = setTimeout(() => {
        setShow(false);
        setTimeout(() => onClose && onClose(), 200);
      }, autoHideDuration);

      return () => clearTimeout(id);
    }
  }, [open, autoHideDuration, onClose]);

  if (!open && !show) return null;

  return (
    <div className="fixed inset-x-0 top-6 z-[9999] flex justify-center pointer-events-none">
      <div
        className={`pointer-events-auto rounded-md px-4 py-2 min-w-[240px] text-sm 
        transition-all duration-200 
        ${show ? "opacity-100 translate-y-0" : "opacity-0 -translate-y-3"} 
        ${TYPES[type]}`}
      >
        <div className="flex items-center justify-between gap-4">
          <span>{message}</span>
          <button
            onClick={() => {
              setShow(false);
              setTimeout(() => onClose && onClose(), 200);
            }}
            className="text-xs opacity-70 hover:opacity-100 bg-transparent"
          >
            ✕
          </button>
        </div>
      </div>
    </div>
  );
}
