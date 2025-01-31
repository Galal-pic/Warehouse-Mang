import { Autocomplete, TextField } from "@mui/material";
import React from "react";

export default function CustomAutoCompleteField({
  isLoading,
  values,
  editingItem,
  setEditingItem,
  fieldName,
  placeholder = "اختر قيمة",
}) {
  return (
    <Autocomplete
      loading={isLoading}
      slotProps={{
        paper: {
          input: {
            sx: {
              whiteSpace: "normal",
              wordBreak: "break-word",
            },
          },
          sx: {
            "& .MuiAutocomplete-listbox": {
              "& .MuiAutocomplete-option": {
                direction: "rtl",
              },
            },
          },
        },
      }}
      value={
        Array.isArray(values)
          ? values.find((item) => item.name === editingItem[fieldName]) || null
          : null
      }
      sx={{
        "& .MuiOutlinedInput-root .MuiOutlinedInput-notchedOutline": {
          border: "none",
        },
        "& .MuiAutocomplete-clearIndicator": {
          display: "none",
        },
        "& .MuiAutocomplete-popupIndicator": {},
        "& .MuiOutlinedInput-root": {
          padding: "10px",
          paddingRight: "35px!important",
          fontSize: "14px",
        },
        minWidth: "150px",
      }}
      options={Array.isArray(values) ? values : []}
      getOptionLabel={(option) => option.name || ""}
      onChange={(event, newValue) => {
        if (!newValue) {
          return;
        }
        setEditingItem({
          ...editingItem,
          [fieldName]: newValue ? newValue.name : "",
        });
      }}
      renderInput={(params) => (
        <TextField {...params} placeholder={placeholder} />
      )}
    />
  );
}
