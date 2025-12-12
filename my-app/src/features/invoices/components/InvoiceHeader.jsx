// src/features/invoices/components/InvoiceHeader.jsx
import React from "react";
import logo from "../../../assets/logo.png";

export default function InvoiceHeader({ invoice }) {
  return (
    <div
      className="flex flex-row-reverse items-center justify-center mb-6 gap-8 pb-3"
      dir="rtl"
    >
      {/* رقم السند / التاريخ / الوقت */}
      <div className="flex-1 flex flex-col items-center justify-center text-sm text-gray-700 gap-1 text-center">
        <div className="flex flex-col gap-1">
          <div className="flex gap-2 justify-center">
            <span className="font-semibold">رقم السند:</span>
            <span>{invoice.id}</span>
          </div>
          <div className="flex gap-2 justify-center">
            <span className="font-semibold">التاريخ:</span>
            <span>{invoice.date}</span>
          </div>
          <div className="flex gap-2 justify-center">
            <span className="font-semibold">الوقت:</span>
            <span>{invoice.time}</span>
          </div>
        </div>
      </div>

      {/* نوع العملية في المنتصف */}
      <div className="flex-1 flex flex-col items-center justify-center text-center leading-relaxed">
        <div className="font-bold text-[#001473] text-lg">
          نوع العملية
        </div>
        <div className="font-bold text-gray-800 text-lg mt-1">
          {invoice.type}
        </div>
      </div>

      {/* اللوجو ناحية اليمين لكن برضه متوسّط */}
      <div className="flex-1 flex items-center justify-center">
        <img src={logo} alt="Logo" className="w-32 md:w-40 object-contain" />
      </div>
    </div>
  );
}
