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
        Array.isArray(values) && String(editingItem[fieldName]) !== undefined
          ? values.find(
              (item) =>
                item &&
                (fieldName === "original_invoice_id"
                  ? item.id === String(editingItem[fieldName])
                  : item.name === String(editingItem[fieldName]))
            ) || null
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
      getOptionLabel={(option) =>
        fieldName === "original_invoice_id"
          ? option.id || ""
          : option.name || ""
      }
      isOptionEqualToValue={(option, value) =>
        fieldName === "original_invoice_id"
          ? option.id === value?.id
          : option.name === value?.name
      }
      onChange={(event, newValue) => {
        setEditingItem({
          ...editingItem,
          [fieldName]:
            newValue && fieldName === "original_invoice_id"
              ? newValue.id
              : newValue
              ? newValue.name
              : "",
        });
      }}
      renderInput={(params) => (
        <TextField {...params} placeholder={placeholder} />
      )}
    />
  );
}
