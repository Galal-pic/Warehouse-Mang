import React, { useRef, useEffect } from "react";

const NumberInput = React.forwardRef((props, ref) => {
  const { style, ...restProps } = props; // استخراج style من props
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
      {...restProps}
      type="number"
      min="0"
      ref={(node) => {
        inputRef.current = node;
        if (ref) {
          ref.current = node;
        }
      }}
      style={{
        ...style,
        height: "100%",
      }}
      onWheel={(e) => {
        e.preventDefault();
        e.stopPropagation();
      }}
    />
  );
});

export default NumberInput;
