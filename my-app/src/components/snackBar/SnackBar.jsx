import { Alert, Snackbar } from '@mui/material';
import React from 'react';

export default function SnackBar({
  open,
  message,
  type,
  onClose,
}) {
  return (
    <Snackbar
      open={open}
      onClose={onClose}
      autoHideDuration={2000}
      anchorOrigin={{ vertical: "top", horizontal: "center" }}
      sx={{
        zIndex: "9999999999999999999999999999999999"
      }}
    >
      <Alert severity={type}>
        {message}
      </Alert>
    </Snackbar>
  );
}