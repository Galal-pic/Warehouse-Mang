import React, { useState } from "react";
import { Box, Button, IconButton, CircularProgress } from "@mui/material";
import ArrowBackOutlinedIcon from "@mui/icons-material/ArrowBackOutlined";
import styles from "./Register.module.css";
import { useNavigate } from "react-router-dom";
import SnackBar from "../../components/snackBar/SnackBar";
import { useAddUserMutation } from "../services/userApi";
import Visibility from "@mui/icons-material/Visibility";
import VisibilityOff from "@mui/icons-material/VisibilityOff";
import { Jobs } from "../../context/jobs";

const CustomCheckboxField = ({
  label,
  values,
  section,
  updatePrivileges,
  options,
  error,
}) => {
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        marginBottom: "10px",
        border: "1px solid #ddd",
        borderRadius: "5px",
        height: "100%",
      }}
    >
      <p
        style={{
          fontWeight: "bold",
          color: "#555",
          width: "200px",
          margin: 0,
          backgroundColor: "#ddd",
          padding: "7px 10px",
          display: "flex",
          alignItems: "center",
          alignSelf: "stretch",
          borderRadius: "5px",
        }}
      >
        {label}
      </p>
      <div
        style={{
          display: "flex",
          flexWrap: "wrap",
          width: "100%",
          padding: "10px 15px 10px 0",
        }}
      >
        {Object.entries(options).map(([key, optionLabel]) => (
          <label
            key={key}
            style={{
              margin: "0 10px",
              display: "flex",
              width: "210px",
              padding: "5px 15px",
              cursor: "pointer",
              transition: "0.1s",
            }}
            className={styles.label}
          >
            <input
              type="checkbox"
              checked={values[key]}
              onChange={() => updatePrivileges(section, key, !values[key])}
              style={{ margin: "5px 0 0 5px", cursor: "pointer" }}
            />
            {optionLabel}
          </label>
        ))}
      </div>
      {error && (
        <p style={{ color: "red", fontSize: "14px", margin: 0 }}>
          هناك خطأ في الاختيار
        </p>
      )}
    </div>
  );
};
export default function Register() {
  const [formData, setFormData] = useState({
    username: "",
    job: "",
    phoneNumber: "",
    password: "",
    confirmPassword: "",
    privileges: {
      createInvoice: {
        createInventoryOperations: false,
        createAdditions: false,
      },
      manageOperations: {
        viewAdditions: false,
        viewWithdrawals: false,
        viewDeposits: false,
        viewReturns: false,
        viewDamages: false,
        viewReservations: false,
        viewPrices: false,
        canEdit: false,
        canDelete: false,
        canConfirmWithdrawal: false,
        canWithdraw: false,
        canUpdatePrices: false,
        canRecoverDeposits: false,
      },
      items: {
        canEdit: false,
        canDelete: false,
        canAdd: false,
      },
      machines: {
        canEdit: false,
        canDelete: false,
        canAdd: false,
      },
      mechanism: {
        canEdit: false,
        canDelete: false,
        canAdd: false,
      },
      suppliers: {
        canEdit: false,
        canDelete: false,
        canAdd: false,
      },
    },
  });

  const [errors, setErrors] = useState({});
  const [openSnackbar, setOpenSnackbar] = useState(false);
  const [snackbarMessage, setSnackbarMessage] = useState("");
  const [snackBarType, setSnackBarType] = useState("");

  const [addUser, { isLoading: mutationLoading }] = useAddUserMutation();
  const navigate = useNavigate();

  // jobs
  const jobs = [
    { value: Jobs[0], label: Jobs[0] },
    { value: Jobs[1], label: Jobs[1] },
    { value: Jobs[2], label: Jobs[2] },
    { value: Jobs[3], label: Jobs[3] },
    { value: Jobs[4], label: Jobs[4] },
    { value: Jobs[5], label: Jobs[5] },
    { value: Jobs[6], label: Jobs[6] },
    { value: Jobs[7], label: Jobs[7] },
  ];

  const createInvoiceOptions = {
    createInventoryOperations: "إنشاء العمليات المخزونية",
    createAdditions: "إنشاء الإضافات",
  };

  const invoicesPageOptions = {
    viewAdditions: "عرض الإضافات",
    viewWithdrawals: "عرض الصرف",
    viewDeposits: "عرض الأمانات",
    viewReturns: "عرض الاسترجاع",
    viewDamages: "عرض التوالفات",
    viewReservations: "عرض الحجزات",
    viewPrices: "عرض الأسعار",
    canEdit: "التعديل",
    canDelete: "الحذف",
    canConfirmWithdrawal: "تأكيد الصرف",
    canWithdraw: "الصرف",
    canUpdatePrices: "تحديث الأسعار",
    canRecoverDeposits: "استرداد الأمانات",
  };

  const fourPageOptions = {
    canEdit: "التعديل",
    canDelete: "الحذف",
    canAdd: "الإضافة",
  };

  const handleChange = (field, value) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };
  const updatePrivileges = (section, key, value) => {
    setFormData((prev) => ({
      ...prev,
      privileges: {
        ...prev.privileges,
        [section]: {
          ...prev.privileges[section],
          [key]: value,
        },
      },
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrors({});

    let newErrors = {};
    if (!formData.username) newErrors.username = "يرجى ادخال الاسم";
    if (!formData.job) newErrors.job = "يرجى ادخال اسم الوظيفة";
    if (!formData.password) newErrors.password = "يرجى ادخال كلمة المرور";
    else if (formData.password.length < 6 || formData.password.length > 120)
      newErrors.password = "يجب أن تتراوح كلمة المرور بين 6 و 120 حرفًا";
    if (!formData.confirmPassword)
      newErrors.confirmPassword = "يرجى تأكيد كلمة المرور";
    else if (formData.password !== formData.confirmPassword)
      newErrors.confirmPassword = "كلمات المرور غير متطابقة";

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    const dataToSend = {
      username: formData.username,
      password: formData.password,
      phone_number: formData.phoneNumber,
      job_name: formData.job,
      privileges: formData.privileges,
    };
    console.log(dataToSend);

    try {
      const response = await addUser(dataToSend).unwrap();
      if (response) {
        setSnackbarMessage("تم تسجيل الموظف بنجاح");
        setSnackBarType("success");
        setOpenSnackbar(true);
        navigate("/users");
      }
    } catch (error) {
      if (error?.data?.message === "Username already exists") {
        setErrors((prev) => ({ ...prev, username: "الاسم غير متاح" }));
        setSnackbarMessage("اسم المستخدم موجود بالفعل. يرجى اختيار اسم آخر.");
        setSnackBarType("info");
      } else {
        setSnackbarMessage("فشل التسجيل. يرجى المحاولة مرة أخرى.");
        setSnackBarType("error");
      }
      setOpenSnackbar(true);
      console.error("Error:", error);
    }
  };

  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const togglePasswordVisibility = () => {
    setShowPassword((prev) => !prev);
  };

  const toggleConfirmPasswordVisibility = () => {
    setShowConfirmPassword((prev) => !prev);
  };

  return (
    <div className={styles.container}>
      <Box
        sx={{
          width: { xs: "95%", sm: "70%", md: "50%", lg: "40%", xl: "35%" },
        }}
        className={styles.boxForm}
      >
        <h2 className={styles.subTitle}>
          <IconButton className={styles.iconBtn} onClick={() => navigate(-1)}>
            <ArrowBackOutlinedIcon className={styles.arrow} />
          </IconButton>
          التسجيل
        </h2>
        <Box
          component="form"
          onSubmit={handleSubmit}
          className={styles.textFields}
        >
          <div className={styles.privilegesContainer}>
            <h3>المعلومات الأساسية</h3>
            <div className={styles.inputGroup}>
              {[
                { label: "الاسم", field: "username", type: "text" },
                { label: "رقم الهاتف", field: "phoneNumber", type: "text" },
              ].map(({ label, field, type }) => (
                <div key={field} className={styles.inputContainer}>
                  <label
                    style={{
                      display: "block",
                      marginBottom: "5px",
                      textAlign: "right",
                      fontWeight: "bold",
                      color: errors[field] ? "#d32f2f" : "#555",
                    }}
                  >
                    {label}
                  </label>
                  <input
                    type={type}
                    value={formData[field]}
                    onChange={(e) => handleChange(field, e.target.value)}
                    style={{
                      width: "100%",
                      padding: "10px",
                      fontSize: "1rem",
                      border: errors[field]
                        ? "1px solid #d32f2f"
                        : "1px solid #ccc",
                      borderRadius: "4px",
                      direction: "rtl",
                      textAlign: "right",
                      outline: "none",
                      transition: "border-color 0.2s",
                    }}
                    onFocus={(e) =>
                      (e.target.style.borderColor = !errors[field] && "#1976d2")
                    }
                    onBlur={(e) =>
                      (e.target.style.borderColor = !errors[field] && "#ccc")
                    }
                  />
                  {errors[field] && (
                    <span
                      style={{
                        color: "#d32f2f",
                        fontSize: "0.875rem",
                        marginTop: "5px",
                        display: "block",
                        textAlign: "right",
                      }}
                    >
                      {errors[field]}
                    </span>
                  )}
                </div>
              ))}
              <div key="password" className={styles.inputContainer}>
                <label
                  style={{
                    display: "block",
                    marginBottom: "5px",
                    textAlign: "right",
                    fontWeight: "bold",
                    color: errors.password ? "#d32f2f" : "#555",
                  }}
                >
                  كلمة المرور
                </label>
                <div style={{ position: "relative", width: "100%" }}>
                  <input
                    type={showPassword ? "text" : "password"}
                    value={formData.password}
                    onChange={(e) => handleChange("password", e.target.value)}
                    style={{
                      width: "100%",
                      padding: "10px 10px 10px 40px",
                      fontSize: "1rem",
                      border: errors.password
                        ? "1px solid #d32f2f"
                        : "1px solid #ccc",
                      borderRadius: "4px",
                      direction: "rtl",
                      textAlign: "right",
                      outline: "none",
                      transition: "border-color 0.2s",
                    }}
                    onFocus={(e) =>
                      (e.target.style.borderColor =
                        !errors.password && "#1976d2")
                    }
                    onBlur={(e) =>
                      (e.target.style.borderColor = !errors.password && "#ccc")
                    }
                  />
                  <IconButton
                    onClick={togglePasswordVisibility}
                    sx={{
                      position: "absolute",
                      top: "50%",
                      left: "5px",
                      transform: "translateY(-50%)",
                    }}
                  >
                    {showPassword ? <Visibility /> : <VisibilityOff />}
                  </IconButton>
                </div>
                {errors.password && (
                  <span
                    style={{
                      color: "#d32f2f",
                      fontSize: "0.875rem",
                      marginTop: "5px",
                      display: "block",
                      textAlign: "right",
                    }}
                  >
                    {errors.password}
                  </span>
                )}
              </div>

              <div key="confirmPassword" className={styles.inputContainer}>
                <label
                  style={{
                    display: "block",
                    marginBottom: "5px",
                    textAlign: "right",
                    fontWeight: "bold",
                    color: errors.confirmPassword ? "#d32f2f" : "#555",
                  }}
                >
                  تأكيد كلمة المرور
                </label>
                <div style={{ position: "relative", width: "100%" }}>
                  <input
                    type={showConfirmPassword ? "text" : "password"}
                    value={formData.confirmPassword}
                    onChange={(e) =>
                      handleChange("confirmPassword", e.target.value)
                    }
                    style={{
                      width: "100%",
                      padding: "10px 10px 10px 40px",
                      fontSize: "1rem",
                      border: errors.confirmPassword
                        ? "1px solid #d32f2f"
                        : "1px solid #ccc",
                      borderRadius: "4px",
                      direction: "rtl",
                      textAlign: "right",
                      outline: "none",
                      transition: "border-color 0.2s",
                    }}
                    onFocus={(e) =>
                      (e.target.style.borderColor =
                        !errors.confirmPassword && "#1976d2")
                    }
                    onBlur={(e) =>
                      (e.target.style.borderColor =
                        !errors.confirmPassword && "#ccc")
                    }
                  />
                  <IconButton
                    onClick={toggleConfirmPasswordVisibility}
                    sx={{
                      position: "absolute",
                      top: "50%",
                      left: "5px",
                      transform: "translateY(-50%)",
                    }}
                  >
                    {showConfirmPassword ? <Visibility /> : <VisibilityOff />}
                  </IconButton>
                </div>
                {errors.confirmPassword && (
                  <span
                    style={{
                      color: "#d32f2f",
                      fontSize: "0.875rem",
                      marginTop: "5px",
                      display: "block",
                      textAlign: "right",
                    }}
                  >
                    {errors.confirmPassword}
                  </span>
                )}
              </div>

              <div
                style={{ minWidth: "200px" }}
                className={styles.inputContainer}
              >
                <label
                  style={{
                    display: "block",
                    marginBottom: "5px",
                    textAlign: "right",
                    fontWeight: "bold",
                    color: errors.job ? "#d32f2f" : "#555",
                  }}
                >
                  اختر الوظيفة
                </label>
                <select
                  value={formData.job}
                  onChange={(e) => handleChange("job", e.target.value)}
                  style={{
                    width: "100%",
                    padding: "10px",
                    fontSize: "1rem",
                    border: errors.job ? "1px solid #d32f2f" : "1px solid #ccc",
                    borderRadius: "4px",
                    direction: "rtl",
                    textAlign: "right",
                    outline: "none",
                    transition: "border-color 0.2s",
                    backgroundColor: "#fff",
                    appearance: "none",
                  }}
                  onFocus={(e) =>
                    (e.target.style.borderColor = !errors.job && "#1976d2")
                  }
                  onBlur={(e) =>
                    (e.target.style.borderColor = !errors.job && "#ccc")
                  }
                >
                  <option value="" disabled>
                    -- اختر الوظيفة --
                  </option>
                  {jobs.map((job) => (
                    <option key={job.value} value={job.value}>
                      {job.label}
                    </option>
                  ))}
                </select>
                {errors.job && (
                  <span
                    style={{
                      color: "#d32f2f",
                      fontSize: "0.875rem",
                      marginTop: "5px",
                      display: "block",
                      textAlign: "right",
                    }}
                  >
                    {errors.job}
                  </span>
                )}
              </div>
            </div>
          </div>
          <div className={styles.privilegesContainer}>
            <h3>الصلاحيات</h3>
            <div
              className={styles.inputGroup}
              style={{ justifyContent: "right", flexDirection: "column" }}
            >
              <CustomCheckboxField
                label="صفحة إنشاء عملية"
                values={formData.privileges.createInvoice}
                section="createInvoice"
                updatePrivileges={updatePrivileges}
                options={createInvoiceOptions}
                error={!!errors.privileges?.createInvoice}
              />
              <CustomCheckboxField
                label="صفحة إدارة العمليات"
                values={formData.privileges.manageOperations}
                section="manageOperations"
                updatePrivileges={updatePrivileges}
                options={invoicesPageOptions}
                error={!!errors.privileges?.manageOperations}
              />

              <CustomCheckboxField
                label="صفحة الأصناف"
                section="items"
                updatePrivileges={updatePrivileges}
                values={formData.privileges.items}
                options={fourPageOptions}
                error={!!errors.privileges?.items}
              />
              <CustomCheckboxField
                label="صفحة الماكينات"
                section="machines"
                updatePrivileges={updatePrivileges}
                values={formData.privileges.machines}
                options={fourPageOptions}
                error={!!errors.privileges?.machines}
              />
              <CustomCheckboxField
                label="صفحة الميكانيزم"
                section="mechanism"
                updatePrivileges={updatePrivileges}
                values={formData.privileges.mechanism}
                options={fourPageOptions}
                error={!!errors.privileges?.mechanism}
              />
              <CustomCheckboxField
                label="صفحة الموردين"
                section="suppliers"
                updatePrivileges={updatePrivileges}
                values={formData.privileges.suppliers}
                options={fourPageOptions}
                error={!!errors.privileges?.suppliers}
              />
            </div>
          </div>
        </Box>
        <Button
          type="submit"
          variant="contained"
          className={styles.btn}
          onClick={handleSubmit}
          disabled={mutationLoading}
          sx={{
            transition: "0.3s",
          }}
        >
          {mutationLoading ? (
            <CircularProgress color="white" size={24} />
          ) : (
            "إضافة موظف"
          )}
        </Button>
      </Box>
      <SnackBar
        open={openSnackbar}
        message={snackbarMessage}
        type={snackBarType}
        onClose={() => setOpenSnackbar(false)}
      />
    </div>
  );
}
