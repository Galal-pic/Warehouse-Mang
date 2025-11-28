import React, { useState } from "react";
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  CircularProgress,
  IconButton,
} from "@mui/material";
import { Visibility, VisibilityOff } from "@mui/icons-material";
import { useChangePassMutation } from "../../../services/userApi"; // Import the mutation hook

const ChangePassword = ({ open, onClose, userId, onSuccess }) => {
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState("");
  const [changePass, { isLoading }] = useChangePassMutation(); // Use the mutation hook
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const handleToggleNewPassword = () => {
    setShowNewPassword((prev) => !prev);
  };

  const handleToggleConfirmPassword = () => {
    setShowConfirmPassword((prev) => !prev);
  };

  const handleSubmit = async () => {
    // Client-side validation
    if (newPassword !== confirmPassword) {
      setError("كلمات المرور غير متطابقة");
      return;
    }
    if (newPassword.length < 6) {
      setError("كلمة المرور يجب أن تكون 6 أحرف على الأقل");
      return;
    }

    try {
      // Call the changePass mutation with the correct payload
      await changePass({
        id: userId,
        new_password: newPassword,
        confirm_new_password: confirmPassword,
      }).unwrap();
      setNewPassword("");
      setConfirmPassword("");
      setError("");
      onSuccess("تم تغيير كلمة المرور بنجاح", "success");
      onClose();
    } catch (err) {
      console.log(err)
      // Extract server-side error message if available
      const errorMessage = "فشل في تغيير كلمة المرور. حاول مرة أخرى.";
      setError(errorMessage);
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
          <div style={{ position: "relative" }}>
            <input
              type={showNewPassword ? "text" : "password"}
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
            <IconButton
              onClick={handleToggleNewPassword}
              sx={{
                position: "absolute",
                left: "10px",
                top: "50%",
                transform: "translateY(-50%)",
                color: "#555",
              }}
            >
              {showNewPassword ? <VisibilityOff /> : <Visibility />}
            </IconButton>
          </div>
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
          <div style={{ position: "relative" }}>
            <input
              type={showConfirmPassword ? "text" : "password"}
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
            <IconButton
              onClick={handleToggleConfirmPassword}
              sx={{
                position: "absolute",
                left: "10px",
                top: "50%",
                transform: "translateY(-50%)",
                color: "#555",
              }}
            >
              {showConfirmPassword ? <VisibilityOff /> : <Visibility />}
            </IconButton>
          </div>
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
          disabled={isLoading}
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
          {isLoading ? <CircularProgress size={25} /> : "تغيير"}
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default ChangePassword;
