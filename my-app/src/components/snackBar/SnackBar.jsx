import { Alert, Snackbar } from "@mui/material";
import React from "react";
import { createPortal } from "react-dom";

export default function SnackBar({ open, message, type, onClose }) {
  return createPortal(
    <Snackbar
      open={open}
      onClose={onClose}
      autoHideDuration={2000}
      anchorOrigin={{ vertical: "top", horizontal: "center" }}
      sx={{
        zIndex: 999999999999999,
      }}
    >
      <Alert severity={type}>{message}</Alert>
    </Snackbar>,
    document.body
  );
}
