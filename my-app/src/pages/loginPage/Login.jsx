import React, { useState } from "react";
import { Box, Button, Paper } from "@mui/material";
import styles from "./Login.module.css";
import { useNavigate } from "react-router-dom";
import { login } from "../../context/AuthContext";
import { motion } from "framer-motion";
import logo from "./logo.png";
import LockOutlinedIcon from "@mui/icons-material/LockOutlined";
import SnackBar from "../../components/snackBar/SnackBar";
import { CustomTextField } from "../../components/customTextField/CustomTextField";
import CircularProgress from "@mui/material/CircularProgress";
import { useGetUserQuery } from "../services/userApi";

const Login = () => {
  const { data: user, isLoading: isLoadingUser, refetch } = useGetUserQuery();

  const API_BASE_URL = process.env.REACT_APP_API_BASE_URL;

  const [name, setName] = useState("");
  const [nameError, setNameError] = useState("");
  const [password, setPassword] = useState("");
  const [passwordError, setPasswordError] = useState("");
  const [openSnackbar, setOpenSnackbar] = useState(false);
  const [snackbarMessage, setSnackbarMessage] = useState("");
  const navigate = useNavigate();

  // loader
  const [isLoading, setIsLoading] = useState(false);

  // Handle close snack
  const handleCloseSnackbar = () => {
    setOpenSnackbar(false);
  };

  // Handle login
  const handleSubmit = async (e) => {
    e.preventDefault();
    setNameError("");
    setPasswordError("");
    setSnackbarMessage("");

    if (!name) {
      setNameError("يرجى ادخال الاسم");
      return;
    }
    if (!password) {
      setPasswordError("يرجى ادخال كلمة المرور");
      return;
    }

    const dataToSend = {
      username: name,
      password: password,
    };

    setIsLoading(true);
    try {
      const response = await fetch(`${API_BASE_URL}/auth/login`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(dataToSend),
      });

      if (!response.ok) {
        setSnackbarMessage(
          "فشل تسجيل الدخول. يرجى التحقق من البيانات الخاصة بك."
        );
        setOpenSnackbar(true);
        throw new Error("Network response was not ok");
      }

      const data = await response.json();
      localStorage.setItem("access_token", data.access_token);
      login(data);

      const { data: updatedUser } = await refetch();

      if (updatedUser?.username === "admin") {
        navigate("/users");
      } else if (
        user?.permissions?.createInvoice?.createInventoryOperations ||
        user?.permissions?.createInvoice?.createAdditions
      ) {
        navigate("/createinvoice");
      } else if (
        user?.permissions?.manageOperations?.viewAdditions ||
        user?.permissions?.manageOperations?.viewWithdrawals ||
        user?.permissions?.manageOperations?.viewDeposits ||
        user?.permissions?.manageOperations?.viewReturns ||
        user?.permissions?.manageOperations?.viewDamages ||
        user?.permissions?.manageOperations?.viewReservations
      ) {
        navigate("/invoices");
      } else if (
        user?.permissions?.items?.canEdit ||
        user?.permissions?.items?.canDelete ||
        user?.permissions?.items?.canAdd
      ) {
        navigate("/others/items");
      } else if (
        user?.permissions?.machines?.canEdit ||
        user?.permissions?.machines?.canDelete ||
        user?.permissions?.machines?.canAdd
      ) {
        navigate("/others/machines");
      } else if (
        user?.permissions?.mechanism?.canEdit ||
        user?.permissions?.mechanism?.canDelete ||
        user?.permissions?.mechanism?.canAdd
      ) {
        navigate("/others/mechanisms");
      } else if (
        user?.permissions?.suppliers?.canEdit ||
        user?.permissions?.suppliers?.canDelete ||
        user?.permissions?.suppliers?.canAdd
      ) {
        navigate("/others/supliers");
      }
    } catch (error) {
      console.error("Error:", error);
      setSnackbarMessage(
        "اسم المستخدم أو كلمة المرور خاطئة، يرجى المحاولة مرة أخرى"
      );
      setOpenSnackbar(true);
    } finally {
      setIsLoading(false);
    }
  };
  return (
    <div className={styles.container}>
      <div className={styles.boxText}>
        <motion.img
          initial={{ y: "-100vh" }}
          animate={{ y: 0 }}
          transition={{ type: "spring", stiffness: 50 }}
          src={logo}
          alt="logo"
          className={styles.logo}
        />
        <motion.h1
          initial={{ x: "-100vw" }}
          animate={{ x: 0 }}
          transition={{ type: "spring", stiffness: 50 }}
          className={styles.title}
        >
          Welcome to CUBII
        </motion.h1>
      </div>

      <Box
        sx={{
          width: { xs: "95%", sm: "70%", md: "50%", lg: "40%", xl: "35%" },
        }}
        className={styles.boxForm}
      >
        {/* login part */}
        <motion.div
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ type: "spring", stiffness: 100, damping: 25 }}
        >
          <Paper className={styles.paper}>
            <LockOutlinedIcon className={styles.icon} />
            <h2 className={styles.subTitle}>Login</h2>
            <Box component="form" className={styles.textFields}>
              {/* Name Field */}
              <CustomTextField
                label="الاسم"
                value={name}
                setValue={setName}
                valueError={nameError}
                className={styles.textField}
              />

              {/* Password Field */}
              <CustomTextField
                label="كلمة المرور"
                type={"password"}
                value={password}
                setValue={setPassword}
                valueError={passwordError}
                className={styles.textField}
              />

              {/* Submit Button */}
              <Button
                type="submit"
                variant="contained"
                className={styles.btn}
                onClick={handleSubmit}
                disabled={isLoading || isLoadingUser}
              >
                تسجيل الدخول
              </Button>
              <Box>
                {isLoading || isLoadingUser ? (
                  <CircularProgress size={24} />
                ) : (
                  ""
                )}
              </Box>
            </Box>
          </Paper>
        </motion.div>

        {/* Snackbar */}
        <SnackBar
          open={openSnackbar}
          message={snackbarMessage}
          type="error"
          onClose={handleCloseSnackbar}
        />
      </Box>
    </div>
  );
};

export default Login;
