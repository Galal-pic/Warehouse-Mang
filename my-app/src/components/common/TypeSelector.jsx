// src/components/TypeSelector.jsx
import React from "react";

export default function TypeSelector({
  label,
  value,
  options = [],
  onChange,
  // بقية الـ props اللي ممكن تتبعت من غير ما نستخدمها:
  ...rest
}) {
  const handleClick = (option) => {
    if (!onChange) return;
    // نكوّن event شبه الـ MUI عشان handleTypeChange يشتغل زي ما هو
    const fakeEvent = { target: { value: option } };
    onChange(fakeEvent);
  };

  return (
    <div className="flex flex-col items-center gap-2" {...rest}>
      {label && (
        <div className="text-sm font-semibold text-blue-600">{label}</div>
      )}
      <div className="flex flex-wrap items-center justify-center gap-2">
        {options.map((opt) => {
          const selected = value === opt;
          return (
            <button
              key={opt}
              type="button"
              onClick={() => handleClick(opt)}
              className={`min-w-[80px] rounded-md px-3 py-1 text-sm border transition
                ${
                  selected
                    ? "bg-blue-600 text-white border-blue-600"
                    : "bg-white text-gray-700 border-gray-300 hover:bg-gray-100"
                }`}
            >
              {opt}
            </button>
          );
        })}
      </div>
    </div>
  );
}
