import { useEffect, useRef, useState } from "react";

const CustomInput = ({ value, onChange, isUser = false }) => {
  const inputRef = useRef(null);
  const [cursorPos, setCursorPos] = useState(value.length);
  useEffect(() => {
    if (inputRef.current) {
      inputRef.current.setSelectionRange(cursorPos, cursorPos);
    }
  }, [cursorPos, value]);

  const handleKeyDown = (e) => {
    if (["ArrowLeft", "ArrowRight"].includes(e.key)) {
      e.stopPropagation();
      return;
    }
    if (e.key === " ") {
      e.stopPropagation();
    }
  };
  const handleChange = (e) => {
    setCursorPos(e.target.selectionStart);
    onChange(e.target.value);
  };

  return (
    <input
      ref={inputRef}
      type="text"
      value={value}
      onChange={handleChange}
      onKeyDown={handleKeyDown}
      style={{
        width: "100%",
        direction: "rtl",
        textAlign: "center",
        fontSize: "15px",
        padding: "10px",
        border: "none",
        outline: "none",
        borderRadius: isUser && "4px",
      }}
      autoFocus
    />
  );
};

export default CustomInput;
