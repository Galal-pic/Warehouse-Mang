// src/components/NumberInput.jsx
import React, { useRef, useEffect } from "react";

const NumberInput = React.forwardRef(function NumberInput(
  { value, onChange, className = "", ...rest },
  ref
) {
  const inputRef = useRef(null);

  useEffect(() => {
    const el = inputRef.current;
    if (!el) return;

    const handleWheel = (e) => {
      e.preventDefault();
    };

    el.addEventListener("wheel", handleWheel, { passive: false });
    return () => el.removeEventListener("wheel", handleWheel);
  }, []);

  return (
    <input
      type="number"
      min="0"
      ref={(node) => {
        inputRef.current = node;
        if (typeof ref === "function") ref(node);
        else if (ref) ref.current = node;
      }}
      value={value ?? ""}
      onChange={onChange}
      onKeyDown={(e) => {
        if (["e", "E", "+", "-"].includes(e.key)) e.preventDefault();
      }}
      className={`w-full border border-gray-300 text-center text-sm px-2 py-1 outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${className}`}
      {...rest}
    />
  );
});

export default NumberInput;
