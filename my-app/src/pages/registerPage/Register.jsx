import React, { useState } from "react";
import {
  Box,
  Button,
  TextField,
  Paper,
  InputAdornment,
  IconButton,
  Snackbar,
  Slide,
} from "@mui/material";
import Visibility from "@mui/icons-material/Visibility";
import VisibilityOff from "@mui/icons-material/VisibilityOff";
import styles from "./Register.module.css";

export default function Register() {
  const [username, setUserName] = useState("");
  const [jobName, setJobName] = useState("");
  const [phoneNumber, setPhoneNumber] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [formError, setFormError] = useState("");
  const [nameError, setNameError] = useState("");
  const [phoneError, setPhoneError] = useState("");
  const [jobError, setJobError] = useState("");
  const [passwordError, setPasswordError] = useState("");
  const [confirmPasswordError, setConfirmPasswordError] = useState("");
  const [openSnackbar, setOpenSnackbar] = useState(false);
  const [snackbarMessage, setSnackbarMessage] = useState("");

  const validatePhone = (phone) => {
    const phoneRegex = /^[0-9]+$/;
    return phoneRegex.test(phone);
  };

  const handleClickShowPassword = () => {
    setShowPassword((prev) => !prev);
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    setFormError("");
    setNameError("");
    setPhoneError("");
    setJobError("");
    setPasswordError("");
    setConfirmPasswordError("");

    if (!username) {
      setNameError("Name is required");
      return;
    } else if (username.length > 80) {
      setNameError("Name cannot be longer than 80 characters");
      return;
    }

    if (!phoneNumber) {
      setPhoneError("Phone number is required");
      return;
    } else if (!validatePhone(phoneNumber)) {
      setPhoneError("Invalid phone number");
      return;
    } else if (phoneNumber.length > 20) {
      setPhoneError("Phone number cannot be longer than 20 digits");
      return;
    }

    if (!jobName) {
      setJobError("Job name is required");
      return;
    } else if (jobName.length > 100) {
      setJobError("Job name cannot be longer than 100 characters");
      return;
    }

    if (!password) {
      setPasswordError("Password is required");
      return;
    } else if (password.length < 6 || password.length > 120) {
      setPasswordError("Password must be between 6 and 120 characters");
      return;
    }

    if (!confirmPassword) {
      setConfirmPasswordError("Confirm password is required");
      return;
    } else if (password !== confirmPassword) {
      setConfirmPasswordError("Passwords do not match");
      return;
    }

    const dataToSend = {
      username,
      password,
      phone_number: phoneNumber,
      job_name: jobName,
    };

    fetch("http://127.0.0.1:5000/auth/register", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(dataToSend),
    })
      .then((response) => {
        if (response.ok) {
          return response.json();
        } else {
          return response.json().then((data) => {
            throw new Error(data.message || "Network response was not ok");
          });
        }
      })
      .then((data) => {
        setSnackbarMessage(data.message || "User registered successfully");
        setOpenSnackbar(true);
      })
      .catch((error) => {
        setSnackbarMessage(
          error.message || "Registration failed. Please try again."
        );
        setOpenSnackbar(true);
        console.error("Error:", error);
      });
  };

  // Custom Slide transition
  function SlideTransition(props) {
    return (
      <Slide
        {...props}
        direction="up"
        sx={{
          backgroundColor: "white",
          color: "#1976d2",
        }}
      />
    );
  }
  // Close Snackbar
  const handleCloseSnackbar = (event, reason) => {
    if (reason === "clickaway") {
      return;
    }
    setOpenSnackbar(false);
  };

  return (
    <div className={styles.container}>
      <Box
        sx={{
          width: { xs: "95%", sm: "70%", md: "50%", lg: "40%", xl: "35%" },
        }}
        className={styles.boxForm}
      >
        <Paper className={styles.paper}>
          <h2 className={styles.subTitle}>Register</h2>
          <Box
            component="form"
            onSubmit={handleSubmit}
            className={styles.textFields}
          >
            {/* Name Field */}
            <TextField
              label="Name"
              variant="outlined"
              required
              value={username}
              onChange={(e) => setUserName(e.target.value)}
              className={styles.textField}
              error={!!nameError}
              helperText={nameError}
            />
            {/* Phone Field */}
            <TextField
              label="Phone Number"
              variant="outlined"
              required
              value={phoneNumber}
              onChange={(e) => setPhoneNumber(e.target.value)}
              className={styles.textField}
              error={!!phoneError}
              helperText={phoneError}
            />

            {/* Job Field */}
            <TextField
              label="Job Name"
              variant="outlined"
              required
              value={jobName}
              onChange={(e) => setJobName(e.target.value)}
              className={styles.textField}
              error={!!jobError}
              helperText={jobError}
            />
            {/* Password Field */}
            <TextField
              label="Password"
              type={showPassword ? "text" : "password"}
              variant="outlined"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className={styles.textField}
              error={!!passwordError}
              helperText={passwordError}
              slotProps={{
                input: {
                  endAdornment: (
                    <InputAdornment position="end">
                      <IconButton
                        onClick={handleClickShowPassword}
                        edge="end"
                        className={styles.iconVisibility}
                      >
                        {showPassword ? <Visibility /> : <VisibilityOff />}
                      </IconButton>
                    </InputAdornment>
                  ),
                },
              }}
            />
            <TextField
              label="Confirm Password"
              type={showPassword ? "text" : "password"}
              variant="outlined"
              required
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              className={styles.textField}
              error={!!confirmPasswordError}
              helperText={confirmPasswordError}
            />
            {formError && (
              <p style={{ color: "red", textAlign: "center" }}>{formError}</p>
            )}
          </Box>
          {/* Submit Button */}
          <Button
            type="submit"
            variant="contained"
            className={styles.btn}
            onClick={handleSubmit}
          >
            Create User
          </Button>
        </Paper>
      </Box>

      <Snackbar
        open={openSnackbar}
        onClose={handleCloseSnackbar}
        TransitionComponent={SlideTransition}
        message={snackbarMessage}
        autoHideDuration={3000}
      />
    </div>
  );
}
