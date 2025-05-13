import React, { useState } from "react";
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  CircularProgress,
} from "@mui/material";

const ChangePassword = ({ open, onClose, userId, onSuccess }) => {
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState("");

  const handleSubmit = async () => {
    if (newPassword !== confirmPassword) {
      setError("كلمات المرور غير متطابقة");
      return;
    }
    if (newPassword.length < 6) {
      setError("كلمة المرور يجب أن تكون 6 أحرف على الأقل");
      return;
    }
    console.log("done");

    try {
      // Simulate API call (uncomment when using actual API)
      // await changePassword({ userId, newPassword }).unwrap();
      setNewPassword("");
      setConfirmPassword("");
      setError("");
      onSuccess("تمت تغيير كلمة السر", "success");
      onClose();
    } catch (err) {
      setError("فشل في تغيير كلمة المرور");
    }
  };

  const handleClose = () => {
    setNewPassword("");
    setConfirmPassword("");
    setError("");
    onClose();
  };

  return (
    <Dialog
      open={open}
      onClose={handleClose}
      sx={{
        marginTop: "30px",
        zIndex: "99999",
        "& .MuiDialog-paper": {
          width: "500px",
          direction: "rtl",
        },
      }}
    >
      <DialogTitle
        sx={{
          textAlign: "center",
          fontSize: "1.5rem",
          color: "var(--primary-color)",
        }}
      >
        تغيير كلمة المرور
      </DialogTitle>
      <DialogContent>
        <div style={{ marginBottom: "10px", marginTop: "10px" }}>
          <label
            style={{
              display: "block",
              marginBottom: "5px",
              textAlign: "right",
              fontWeight: "bold",
              color: error ? "#d32f2f" : "#555",
            }}
          >
            كلمة المرور الجديدة
          </label>
          <input
            type="password"
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
            style={{
              width: "100%",
              padding: "10px",
              fontSize: "1rem",
              border: error ? "1px solid #d32f2f" : "1px solid #ccc",
              borderRadius: "4px",
              direction: "rtl",
              textAlign: "right",
              outline: "none",
              transition: "border-color 0.2s",
            }}
            onFocus={(e) => (e.target.style.borderColor = "#1976d2")}
            onBlur={(e) =>
              (e.target.style.borderColor = error ? "#d32f2f" : "#ccc")
            }
          />
        </div>
        <div style={{ marginBottom: "10px", marginTop: "10px" }}>
          <label
            style={{
              display: "block",
              marginBottom: "5px",
              textAlign: "right",
              fontWeight: "bold",
              color: error ? "#d32f2f" : "#555",
            }}
          >
            تأكيد كلمة المرور
          </label>
          <input
            type="password"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            style={{
              width: "100%",
              padding: "10px",
              fontSize: "1rem",
              border: error ? "1px solid #d32f2f" : "1px solid #ccc",
              borderRadius: "4px",
              direction: "rtl",
              textAlign: "right",
              outline: "none",
              transition: "border-color 0.2s",
            }}
            onFocus={(e) => (e.target.style.borderColor = "#1976d2")}
            onBlur={(e) =>
              (e.target.style.borderColor = error ? "#d32f2f" : "#ccc")
            }
          />
          {error && (
            <span
              style={{
                color: "#d32f2f",
                fontSize: "0.875rem",
                marginTop: "5px",
                display: "block",
                textAlign: "right",
              }}
            >
              {error}
            </span>
          )}
        </div>
      </DialogContent>
      <DialogActions
        sx={{
          display: "flex",
          justifyContent: "space-around",
          padding: "16px",
        }}
      >
        <Button
          variant="contained"
          color="error"
          onClick={handleClose}
          sx={{
            fontSize: "1rem",
            padding: "8px 16px",
            borderRadius: "4px",
            backgroundColor: "#d32f2f",
            "&:hover": {
              backgroundColor: "#b71c1c",
            },
          }}
        >
          إلغاء
        </Button>
        <Button
          variant="contained"
          color="primary"
          onClick={handleSubmit}
          sx={{
            fontSize: "1rem",
            padding: "8px 16px",
            borderRadius: "4px",
            backgroundColor: "var(--primary-color)",
            "&:hover": {
              backgroundColor: "#1565c0",
            },
          }}
        >
          {false ? <CircularProgress size={25} /> : "تغيير"}
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default ChangePassword;
