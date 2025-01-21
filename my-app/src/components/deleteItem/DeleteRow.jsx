import React, { useRef, useEffect } from "react";
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogContentText,
  DialogActions,
  Button,
} from "@mui/material";
export default function DeleteRow({
  deleteDialogOpen,
  setDeleteDialogOpen,
  deleteConfirmationText,
  setDeleteConfirmationText,
  handleDelete,
  message,
  isNessary = true,
}) {
  const inputRef = useRef();

  const handleSubmit = (e) => {
    e.preventDefault();
    handleDelete();
  };

  return (
    <>
      {/* dialog */}
      <Dialog
        open={deleteDialogOpen}
        onClose={() => {
          setDeleteDialogOpen(false);
          setDeleteConfirmationText("");
        }}
        aria-labelledby="delete-dialog-title"
        sx={{
          zIndex: "99999",
        }}
        TransitionProps={{
          onEntered: () => {
            if (isNessary) inputRef.current?.focus();
          },
        }}
        disableAutoFocus
      >
        <DialogTitle
          id="delete-dialog-title"
          sx={{
            textAlign: "center",
            color: "#d32f2f",
            fontWeight: "bold",
          }}
        >
          تأكيد الحذف
        </DialogTitle>
        {isNessary ? (
          <DialogContent sx={{ width: "500px" }}>
            <DialogContentText
              style={{
                display: "block",
                marginBottom: "5px",
                textAlign: "right",
                fontWeight: "bold",
                direction: "rtl",
                marginTop: "20px",
              }}
            >
              {message}
              <br />
              للاستمرار اكتب "نعم"
            </DialogContentText>
            <form onSubmit={handleSubmit}>
              <input
                ref={inputRef}
                autoFocus
                type="text"
                value={deleteConfirmationText}
                onChange={(e) => setDeleteConfirmationText(e.target.value)}
                style={{
                  width: "100%",
                  padding: "10px",
                  fontSize: "1rem",
                  borderRadius: "4px",
                  direction: "rtl",
                  textAlign: "right",
                  outline: "none",
                  transition: "border-color 0.2s",
                  margin: "20px 0 10px",
                  border: "1px solid #ccc",
                }}
                onFocus={(e) => (e.target.style.borderColor = "#1976d2")}
                onBlur={(e) => (e.target.style.borderColor = "#ccc")}
              />
            </form>
          </DialogContent>
        ) : (
          <DialogContent sx={{ width: "500px" }}>
            <DialogContentText
              style={{
                display: "block",
                marginBottom: "5px",
                textAlign: "right",
                fontWeight: "bold",
                direction: "rtl",
                marginTop: "20px",
              }}
            >
              {message}
            </DialogContentText>
          </DialogContent>
        )}
        <DialogActions
          sx={{
            display: "flex",
            justifyContent: "space-around",
          }}
        >
          <Button
            onClick={handleSubmit}
            color="primary"
            variant="contained"
            disabled={
              isNessary ? !["نعم"].includes(deleteConfirmationText.trim()) : ""
            }
          >
            تأكيد
          </Button>
          <Button
            onClick={() => {
              setDeleteDialogOpen(false);
              setDeleteConfirmationText("");
            }}
            color="error"
            variant="outlined"
          >
            إغلاق
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );
}
