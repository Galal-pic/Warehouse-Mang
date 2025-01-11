import React from "react";
import { FormControl, InputLabel, Select, MenuItem } from "@mui/material";
import ArrowDropDownIcon from "@mui/icons-material/ArrowDropDown";

const CustomArrow = (props) => (
  <ArrowDropDownIcon
    {...props}
    sx={{
      marginRight: "85%",
    }}
  />
);

export default function CustomSelectField({
  label,
  error,
  value,
  setValue,
  options = [],
}) {
  return (
    <FormControl
      variant="outlined"
      error={!!error}
      sx={{
        minWidth: "260px",
      }}
    >
      <InputLabel
        sx={{
          textAlign: "right",
          width: "calc(100% - 28px)",
          transformOrigin: "right",
        }}
      >
        {label}
      </InputLabel>
      <Select
        value={value}
        onChange={(e) => setValue(e.target.value)}
        label={label}
        sx={{
          "& .MuiOutlinedInput-notchedOutline": {
            textAlign: "right",
          },
        }}
        IconComponent={CustomArrow}
      >
        {options.map((option) => (
          <MenuItem
            key={option.value}
            sx={{
              direction: "rtl",
            }}
            value={option.value}
          >
            {option.label}
          </MenuItem>
        ))}
      </Select>
    </FormControl>
  );
}
