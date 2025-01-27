import React, { useRef, useEffect } from "react";

const NumberInput = React.forwardRef((props, ref) => {
  const inputRef = useRef(null);

  useEffect(() => {
    const inputElement = inputRef.current;

    const handleWheel = (e) => {
      e.preventDefault();
      e.stopPropagation();
    };

    if (inputElement) {
      inputElement.addEventListener("wheel", handleWheel, { passive: false });
    }

    return () => {
      if (inputElement) {
        inputElement.removeEventListener("wheel", handleWheel);
      }
    };
  }, []);

  return (
    <input
      {...props}
      type="number"
      min="0"
      ref={(node) => {
        inputRef.current = node;
        if (ref) {
          ref.current = node;
        }
      }}
      onWheel={(e) => {
        e.preventDefault();
        e.stopPropagation();
      }}
    />
  );
});

export default NumberInput;
