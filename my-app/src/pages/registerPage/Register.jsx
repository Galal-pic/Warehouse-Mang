import React, { useState } from "react";
import {
  Box,
  Button,
  Paper,
  IconButton,
  CircularProgress,
} from "@mui/material";
import ArrowBackOutlinedIcon from "@mui/icons-material/ArrowBackOutlined";
import styles from "./Register.module.css";
import { useNavigate } from "react-router-dom";
import SnackBar from "../../components/snackBar/SnackBar";
import { CustomTextField } from "../../components/customTextField/CustomTextField";
import CustomSelectField from "../../components/customSelectField/CustomSelectField";
import { useAddUserMutation } from "../services/userApi";
import {
  FormControl,
  FormControlLabel,
  Radio,
  RadioGroup,
  FormLabel,
  FormHelperText,
} from "@mui/material";

const CustomRadioField = ({ label, value, setValue, options, error }) => {
  return (
    <FormControl component="fieldset" error={error}>
      <FormLabel component="legend">{label}</FormLabel>
      <RadioGroup value={value} onChange={(e) => setValue(e.target.value)}>
        {options.map((option) => (
          <FormControlLabel
            key={option.value}
            value={option.value}
            control={<Radio />}
            label={option.label}
          />
        ))}
      </RadioGroup>
      {error && <FormHelperText>{error}</FormHelperText>}
    </FormControl>
  );
};

export default function Register() {
  const [formData, setFormData] = useState({
    username: "",
    job: "",
    phoneNumber: "",
    password: "",
    confirmPassword: "",
    privilegeUsersPage: "عدم العرض او التعديل",
    privilegeCreateInvoicePage: "عدم العرض او التعديل",
    privilegeInvoicesPage: "عدم العرض او التعديل",
    privilegeItemsPage: "عدم العرض او التعديل",
    privilegeSuppliersPage: "عدم العرض او التعديل",
    privilegeMachinesPage: "عدم العرض او التعديل",
    privilegeMechanismPage: "عدم العرض او التعديل",
  });

  const [errors, setErrors] = useState({});
  const [openSnackbar, setOpenSnackbar] = useState(false);
  const [snackbarMessage, setSnackbarMessage] = useState("");
  const [snackBarType, setSnackBarType] = useState("");

  const [addUser, { isLoading: mutationLoading }] = useAddUserMutation();
  const navigate = useNavigate();

  const jobs = [
    { value: "موظف", label: "موظف" },
    { value: "مدير", label: "مدير" },
    { value: "مشرف", label: "مشرف" },
  ];

  const privileges = [
    { value: "العرض والتعديل", label: "العرض والتعديل" },
    { value: "العرض فقط", label: "العرض فقط" },
    { value: "عدم العرض او التعديل", label: "عدم العرض او التعديل" },
  ];

  const handleChange = (field, value) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
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
      privilege_users_page: formData.privilegeUsersPage,
      privilege_create_invoice_page: formData.privilegeCreateInvoicePage,
      privilege_invoices_page: formData.privilegeInvoicesPage,
      privilege_items_page: formData.privilegeItemsPage,
      privilege_suppliers_page: formData.privilegeSuppliersPage,
      privilege_machines_page: formData.privilegeMachinesPage,
      privilege_mechanism_page: formData.privilegeMechanismPage,
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

  return (
    <div className={styles.container}>
      <Box
        sx={{
          width: { xs: "95%", sm: "70%", md: "50%", lg: "40%", xl: "35%" },
        }}
        className={styles.boxForm}
      >
        <Paper className={styles.paper}>
          <IconButton className={styles.iconBtn} onClick={() => navigate(-1)}>
            <ArrowBackOutlinedIcon className={styles.arrow} />
          </IconButton>
          <h2 className={styles.subTitle}>التسجيل</h2>
          <Box
            component="form"
            onSubmit={handleSubmit}
            className={styles.textFields}
          >
            <div
              style={{
                display: "flex",
                flexWrap: "wrap",
                gap: "15px",
                justifyContent: "center",
              }}
            >
              <CustomTextField
                label="الاسم"
                value={formData.username}
                setValue={(value) => handleChange("username", value)}
                valueError={errors.username}
                className={styles.textField}
              />
              <CustomTextField
                label="رقم الهاتف"
                value={formData.phoneNumber}
                setValue={(value) => handleChange("phoneNumber", value)}
                className={styles.textField}
              />
              <CustomSelectField
                label="اختر الوظيفة"
                value={formData.job}
                setValue={(value) => handleChange("job", value)}
                options={jobs}
                error={!!errors.job}
              />
              <CustomTextField
                label="كلمة المرور"
                type="password"
                value={formData.password}
                setValue={(value) => handleChange("password", value)}
                valueError={errors.password}
                className={styles.textField}
              />
              <CustomTextField
                label="تأكيد كلمة المرور"
                type="password"
                value={formData.confirmPassword}
                setValue={(value) => handleChange("confirmPassword", value)}
                valueError={errors.confirmPassword}
                className={styles.textField}
              />
            </div>
            <div>
              <CustomRadioField
                label="صلاحيات صفحة الموظفين"
                value={formData.privilegeUsersPage}
                setValue={(value) => handleChange("privilegeUsersPage", value)}
                options={privileges}
                error={!!errors.privilegeUsersPage}
              />
              <CustomRadioField
                label="صلاحيات صفحة إنشاء عملية"
                value={formData.privilegeCreateInvoicePage}
                setValue={(value) =>
                  handleChange("privilegeCreateInvoicePage", value)
                }
                options={privileges}
                error={!!errors.privilegeCreateInvoicePage}
              />
              <CustomRadioField
                label="صلاحيات صفحة إدارة العمليات"
                value={formData.privilegeInvoicesPage}
                setValue={(value) =>
                  handleChange("privilegeInvoicesPage", value)
                }
                options={privileges}
                error={!!errors.privilegeInvoicesPage}
              />
              <CustomRadioField
                label="صلاحيات صفحة الأصناف"
                value={formData.privilegeItemsPage}
                setValue={(value) => handleChange("privilegeItemsPage", value)}
                options={privileges}
                error={!!errors.privilegeItemsPage}
              />
              <CustomRadioField
                label="صلاحيات صفحة الموردين"
                value={formData.privilegeSuppliersPage}
                setValue={(value) =>
                  handleChange("privilegeSuppliersPage", value)
                }
                options={privileges}
                error={!!errors.privilegeSuppliersPage}
              />
              <CustomRadioField
                label="صلاحيات صفحة الماكينات"
                value={formData.privilegeMachinesPage}
                setValue={(value) =>
                  handleChange("privilegeMachinesPage", value)
                }
                options={privileges}
                error={!!errors.privilegeMachinesPage}
              />
              <CustomRadioField
                label="صلاحيات صفحة الميكانيزم"
                value={formData.privilegeMechanismPage}
                setValue={(value) =>
                  handleChange("privilegeMechanismPage", value)
                }
                options={privileges}
                error={!!errors.privilegeMechanismPage}
              />
            </div>
          </Box>
          <Button
            type="submit"
            variant="contained"
            className={styles.btn}
            onClick={handleSubmit}
            disabled={mutationLoading}
          >
            إضافة موظف
          </Button>
          <Box>{mutationLoading ? <CircularProgress size={24} /> : ""}</Box>
        </Paper>
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
