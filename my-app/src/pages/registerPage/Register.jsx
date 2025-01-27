import React, { useState } from "react";
import { Box, Button, Paper, IconButton } from "@mui/material";
import ArrowBackOutlinedIcon from "@mui/icons-material/ArrowBackOutlined";
import styles from "./Register.module.css";
import { useNavigate } from "react-router-dom";
import CustomSelectField from "../../components/customSelectField/CustomSelectField";
import SnackBar from "../../components/snackBar/SnackBar";
import { CustomTextField } from "../../components/customTextField/CustomTextField";
import CircularProgress from "@mui/material/CircularProgress";

export default function Register() {
  const API_BASE_URL = process.env.REACT_APP_API_BASE_URL;

  // loader
  const [isLoading, setIsLoading] = useState(false);

  // requires
  const [username, setUserName] = useState("");
  const [job, setJob] = useState("");
  const [phoneNumber, setPhoneNumber] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  // errors
  const [nameError, setNameError] = useState("");
  const [jobError, setJobError] = useState("");
  const [passwordError, setPasswordError] = useState("");
  const [confirmPasswordError, setConfirmPasswordError] = useState("");

  // snackbar
  const [openSnackbar, setOpenSnackbar] = useState(false);
  const [snackbarMessage, setSnackbarMessage] = useState("");
  const [snackBarType, setSnackBarType] = useState("");
  // Handle close snack
  const handleCloseSnackbar = () => {
    setOpenSnackbar(false);
  };

  // navigation
  const navigate = useNavigate();

  // select field options
  const jobs = [
    { value: "موظف", label: "موظف" },
    { value: "مدير", label: "مدير" },
  ];

  const handleSubmit = (e) => {
    e.preventDefault();
    setNameError("");
    setJobError("");
    setPasswordError("");
    setConfirmPasswordError("");

    if (!username) {
      setNameError("يرجى ادخال الاسم");
      return;
    } else if (username.length > 80) {
      setNameError("الاسم لا يمكن أن يكون أطول من 80 حرفًا");
      return;
    }

    if (!job) {
      setJobError("يرجى ادخال اسم الوظيفة");
      return;
    }

    if (!password) {
      setPasswordError("يرجى ادخال كلمة المرور");
      return;
    } else if (password.length < 6 || password.length > 120) {
      setPasswordError("يجب أن تتراوح كلمة المرور بين 6 و 120 حرفًا");
      return;
    }

    if (!confirmPassword) {
      setConfirmPasswordError("يرجى تأكيد كلمة المرور");
      return;
    } else if (password !== confirmPassword) {
      setConfirmPasswordError("كلمات المرور غير متطابقة");
      return;
    }

    const dataToSend = {
      username,
      password,
      phone_number: phoneNumber,
      job_name: job,
    };

    setIsLoading(true);

    fetch(`${API_BASE_URL}/auth/register`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(dataToSend),
    })
      .then((response) => {
        if (response.status === 400) {
          response.json().then((data) => {
            setOpenSnackbar(true);
            setSnackBarType("info");
            setSnackbarMessage("الموظف موجود بالفعل");
          });
        }
        console.log("Response status:", response.status);

        if (response.status === 201) {
          response.json().then((data) => {
            navigate("/users");
          });
        }

        if (response.ok) {
          return response.json();
        } else {
          return response.json().then((data) => {
            throw new Error(data.message || "الاستجابة من الشبكة لم تكن صحيحة");
          });
        }
      })
      .then((data) => {
        setSnackbarMessage("تم تسجيل الموظف بنجاح");
        setSnackBarType("success");
        setOpenSnackbar(true);
      })
      .catch((error) => {
        setSnackbarMessage("فشل التسجيل. يرجى المحاولة مرة أخرى.");
        setOpenSnackbar(true);
        console.error("Error:", error);
      })
      .finally(() => {
        setIsLoading(false);
      });
  };

  const handleBack = () => {
    navigate(-1);
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
          <IconButton className={styles.iconBtn} onClick={handleBack}>
            <ArrowBackOutlinedIcon className={styles.arrow} />
          </IconButton>
          <h2 className={styles.subTitle}>التسجيل</h2>
          <Box
            component="form"
            onSubmit={handleSubmit}
            className={styles.textFields}
          >
            {/* Name Field */}
            <CustomTextField
              label="الاسم"
              value={username}
              setValue={setUserName}
              valueError={nameError}
              className={styles.textField}
            />

            {/* Phone Field */}
            <CustomTextField
              label="رقم الهاتف"
              value={phoneNumber}
              setValue={setPhoneNumber}
              className={styles.textField}
            />

            {/* job Field */}
            <CustomSelectField
              label="اختر الوظيفة"
              value={job}
              setValue={setJob}
              options={jobs}
              error={!!jobError}
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

            {/* Confirm Password Field */}
            <CustomTextField
              label="تأكيد كلمة المرور"
              type={"password"}
              value={confirmPassword}
              setValue={setConfirmPassword}
              valueError={confirmPasswordError}
              className={styles.textField}
            />
          </Box>
          {/* Submit Button */}
          <Button
            type="submit"
            variant="contained"
            className={styles.btn}
            onClick={handleSubmit}
            disabled={isLoading}
          >
            إضافة موظف
          </Button>
          <Box>{isLoading ? <CircularProgress size={24} /> : ""}</Box>
        </Paper>
      </Box>

      <SnackBar
        open={openSnackbar}
        message={snackbarMessage}
        type={snackBarType}
        onClose={handleCloseSnackbar}
      />
    </div>
  );
}
