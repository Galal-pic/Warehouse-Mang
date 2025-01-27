import styles from "./Users.module.css";
import React, { useEffect, useState } from "react";
import { GridToolbarContainer, GridToolbarQuickFilter } from "@mui/x-data-grid";
import {
  TextField,
  Snackbar,
  Alert,
  Button,
  Autocomplete,
} from "@mui/material";
import EditIcon from "@mui/icons-material/Edit";
import ClearOutlinedIcon from "@mui/icons-material/ClearOutlined";
import SaveIcon from "@mui/icons-material/Save";
import CancelIcon from "@mui/icons-material/Close";
import { useNavigate } from "react-router-dom";
import GroupAddIcon from "@mui/icons-material/GroupAdd";
import CustomInput from "../../components/customEditTextField/CustomInput";

import "../../colors.css";
import DeleteRow from "../../components/deleteItem/DeleteRow";
import CustomDataGrid from "../../components/dataGrid/CustomDataGrid";
import CircularProgress from "@mui/material/CircularProgress";
function CustomToolbar() {
  const navigate = useNavigate();

  const handleClick = () => {
    navigate("/register");
  };
  return (
    <GridToolbarContainer>
      <Button
        sx={{
          width: "25%",
          fontSize: "1rem",
          fontWeight: "bold",
          borderRadius: "8px",
          border: "2px solid #1976d2",
          padding: "8px 24px",
          color: "#1976d2",
          backgroundColor: "white",
          transition: "all 0.3s ease",
          "&:hover": {
            backgroundColor: "#1976d2",
            color: "#fff",
            borderColor: "#1976d2",
          },
        }}
        color="primary"
        onClick={handleClick}
      >
        <GroupAddIcon
          sx={{
            margin: "0px 8px 3px",
          }}
        />
        إضافة موظف
      </Button>

      <GridToolbarQuickFilter
        sx={{
          direction: "rtl",
          width: "35%",
          "& .MuiInputBase-root": {
            borderRadius: "8px",
            border: "2px solid #1976d2",
            padding: "8px 16px",
            boxShadow: "none",
            backgroundColor: "white",
          },
          "& .MuiInputBase-root:hover": {
            outline: "none",
          },
          "& .MuiSvgIcon-root": {
            color: "#1976d2",
            fontSize: "1.5rem",
            marginLeft: "8px",
          },
          overflow: "hidden",
        }}
        placeholder="ابحث هنا..."
      />
    </GridToolbarContainer>
  );
}

export default function Users() {
  const API_BASE_URL = process.env.REACT_APP_API_BASE_URL;
  const [users, setUsers] = useState([]);
  const [editedRow, setEditedRow] = useState(null);
  const [selectedRow, setSelectedRow] = useState(null);
  const [openSnackbar, setOpenSnackbar] = useState(false);
  const [snackbarMessage, setSnackbarMessage] = useState("");
  const [snackBarType, setSnackBarType] = useState("");

  // loader
  const [isLoading, setIsLoading] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  // jobs
  const jobs = [
    { value: "موظف", label: "موظف" },
    { value: "مدير", label: "مدير" },
    { value: "مشرف", label: "مشرف" },
  ];

  // pagination
  const [paginationModel, setPaginationModel] = useState({
    page: 0,
    pageSize: 10,
  });
  const pageCount = Math.ceil(users.length / paginationModel.pageSize);
  const handlePageChange = (newModel) => {
    setPaginationModel((prev) => ({ ...prev, ...newModel }));
  };

  // Fetch data from API
  const fetchData = async (url, method = "GET", body = null) => {
    const accessToken = localStorage.getItem("access_token");

    try {
      const response = await fetch(url, {
        method,
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
        body: body ? JSON.stringify(body) : null,
      });
      if (!response.ok) throw new Error("حدث خطأ أثناء العملية");
      return await response.json();
    } catch (error) {
      throw error;
    }
  };

  // Edit
  const handleEditClick = (id) => {
    const row = users.find((row) => row.id === id);
    setEditedRow({ ...row });
    setSelectedRow({ ...row });
  };

  const validateFields = (row) => {
    if (!row.username) return "اسم المستخدم مطلوب";
    if (!row.job_name) return "اسم الوظيفة مطلوب";
  };

  const handleSave = async (id) => {
    if (
      editedRow &&
      selectedRow &&
      JSON.stringify(editedRow) === JSON.stringify(selectedRow)
    ) {
      setEditedRow(null);
      setSelectedRow(null);
      return;
    }
    const error = validateFields(editedRow);

    if (error) {
      setOpenSnackbar(true);
      setSnackbarMessage(error);
      setSnackBarType("error");
      return;
    }
    setIsUpdating(true);
    const accessToken = localStorage.getItem("access_token");
    try {
      const { username, job_name, phone_number } = editedRow;
      const response = await fetch(`${API_BASE_URL}/auth/user/${id}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${accessToken}`,
        },
        body: JSON.stringify({ username, job_name, phone_number }),
      });

      if (!response.ok) {
        throw new Error(`Failed to update user: ${response.status}`);
      }
      const updatedRows = users.map((row) =>
        row.id === id ? { ...row, ...editedRow } : row
      );
      setUsers(updatedRows);
      setOpenSnackbar(true);
      setSnackbarMessage("تم تحديث بيانات الموظف بنجاح");
      setSnackBarType("success");
      setEditedRow(null);
      setSelectedRow(null);
    } catch (error) {
      console.error("Error updating user:", error);
      setOpenSnackbar(true);
      setSnackbarMessage("اسم الموظف موجود بالفعل");
      setSnackBarType("error");
    } finally {
      setIsUpdating(false);
    }
  };

  // dialog
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [selectedUserId, setSelectedUserId] = useState(null);
  const [deleteConfirmationText, setDeleteConfirmationText] = useState("");

  const handleDeleteClick = (id) => {
    setSelectedUserId(id);
    setDeleteDialogOpen(true);
    setDeleteConfirmationText("");
  };

  // Delete
  const handleDelete = async () => {
    if (deleteConfirmationText.trim().toLowerCase() === "نعم") {
      setIsDeleting(true);

      const accessToken = localStorage.getItem("access_token");
      try {
        const response = await fetch(
          `${API_BASE_URL}/auth/user/${selectedUserId}`,
          {
            method: "DELETE",
            headers: {
              Authorization: `Bearer ${accessToken}`,
            },
          }
        );

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.message || "Failed to delete user");
        }

        setOpenSnackbar(true);
        setSnackbarMessage("تم حذف الموظف بنجاح");
        setSnackBarType("success");
        setUsers((prevRows) =>
          prevRows.filter((row) => row.id !== selectedUserId)
        );
        setDeleteConfirmationText("");
        setSelectedUserId(null);
        setDeleteDialogOpen(false);
      } catch (error) {
        console.error("Error deleting user:", error);
        setOpenSnackbar(true);
        setSnackbarMessage("خطأ في حذف الموظف");
        setSnackBarType("error");
        setDeleteConfirmationText("");
        setSelectedUserId(null);
        setDeleteDialogOpen(false);
      } finally {
        setIsDeleting(false);
      }
    }
  };

  const columns = [
    {
      field: "actions",
      headerName: "الإجراءات",
      width: 150,
      headerClassName: styles.actionsColumn,
      cellClassName: styles.actionsColumn,
      renderCell: (params) => {
        if (editedRow && editedRow.id === params.id) {
          return (
            <>
              <div className={styles.iconBtnContainer}>
                <button
                  className={styles.iconBtn}
                  onClick={() => handleSave(params.id)}
                  disabled={isUpdating}
                >
                  {isUpdating ? <CircularProgress size={24} /> : <SaveIcon />}
                </button>
                <button
                  className={styles.iconBtn}
                  onClick={() => {
                    setEditedRow(null);
                    setSelectedRow(null);
                  }}
                >
                  <CancelIcon
                    sx={{
                      color: "red",
                    }}
                  />
                </button>
              </div>
            </>
          );
        }
        return (
          <>
            <div className={styles.iconBtnContainer}>
              <button
                className={styles.iconBtn}
                onClick={() => handleEditClick(params.id)}
              >
                <EditIcon />
              </button>
              <button
                className={styles.iconBtn}
                onClick={() => handleDeleteClick(params.id)}
              >
                <ClearOutlinedIcon
                  sx={{
                    color: "red",
                  }}
                />
              </button>
            </div>
          </>
        );
      },
    },
    {
      field: "job_name",
      headerName: "الوظيفة",
      flex: 1,
      renderCell: (params) => {
        if (editedRow && editedRow.id === params.id) {
          return (
            <Autocomplete
              slotProps={{
                paper: {
                  sx: {
                    "& .MuiAutocomplete-listbox": {
                      "& .MuiAutocomplete-option": {
                        direction: "rtl",
                      },
                    },
                  },
                },
              }}
              options={jobs}
              value={
                jobs.find((job) => job.value === editedRow.job_name) || null
              }
              getOptionLabel={(option) => option.label}
              onChange={(event, newValue) => {
                setEditedRow({ ...editedRow, job_name: newValue?.value || "" });
              }}
              renderInput={(params) => (
                <TextField
                  sx={{
                    backgroundColor: "white",
                    borderRadius: "5px",
                    margin: "5px 0",
                    height: "50px",
                    "& .MuiOutlinedInput-input": {
                      textAlign: "center",
                    },
                  }}
                  {...params}
                  placeholder="اسم الوظيفة"
                />
              )}
              isOptionEqualToValue={(option, value) =>
                option.value === value?.value
              }
              fullWidth
              sx={{
                "& .MuiOutlinedInput-root .MuiOutlinedInput-notchedOutline": {
                  border: "none",
                },
                "& .MuiAutocomplete-clearIndicator": {
                  display: "none",
                },
                "& .MuiAutocomplete-popupIndicator": {},
                "& .MuiOutlinedInput-root": {
                  padding: "10px",
                  fontSize: "14px",
                },
              }}
            />
          );
        }
        return params.value;
      },
    },
    {
      field: "phone_number",
      headerName: "رقم الهاتف",
      flex: 1,
      renderCell: (params) => {
        if (editedRow && editedRow.id === params.id) {
          return (
            <CustomInput
              value={editedRow.phone_number || ""}
              onChange={(newValue) =>
                setEditedRow((prev) => ({
                  ...prev,
                  phone_number: newValue,
                }))
              }
              isUser={true}
            />
          );
        }
        return params.value;
      },
    },
    {
      field: "username",
      headerName: "الاسم",
      flex: 1,
      renderCell: (params) => {
        if (editedRow && editedRow.id === params.id) {
          return (
            <CustomInput
              value={editedRow.username || ""}
              onChange={(newValue) =>
                setEditedRow((prev) => ({
                  ...prev,
                  username: newValue,
                }))
              }
              isUser={true}
            />
          );
        }
        return params.value;
      },
    },
    {
      field: "rowNumber",
      headerName: "#",
      width: 100,
      sortable: false,
    },
  ];

  // fetch employees
  useEffect(() => {
    const fetchUserData = async () => {
      const accessToken = localStorage.getItem("access_token");
      if (!accessToken) return;
      setIsLoading(true);
      try {
        const data = await fetchData(`${API_BASE_URL}/auth/users`, "GET");
        const updatedData = data.map((user, index) => ({
          ...user,
          rowNumber: index + 1,
        }));
        setUsers(updatedData);
      } catch (error) {
        console.error("Error fetching data:", error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchUserData();
  }, []);

  return (
    <div className={styles.container}>
      <h1 className={styles.head}>بيانات الموظفين</h1>
      {/* dialog */}
      <DeleteRow
        deleteDialogOpen={deleteDialogOpen}
        setDeleteDialogOpen={setDeleteDialogOpen}
        deleteConfirmationText={deleteConfirmationText}
        setDeleteConfirmationText={setDeleteConfirmationText}
        handleDelete={handleDelete}
        message={"هل أنت متأكد من رغبتك في حذف هذا المستخدم؟"}
        loader={isDeleting}
      />

      <CustomDataGrid
        rows={users}
        columns={columns}
        paginationModel={paginationModel}
        onPageChange={handlePageChange}
        pageCount={pageCount}
        CustomToolbar={CustomToolbar}
        loader={isLoading}
        onCellKeyDown={(params, event) => {
          if ([" ", "ArrowLeft", "ArrowRight"].includes(event.key)) {
            event.stopPropagation();
            event.preventDefault();
          }
        }}
      />

      {/* snack bar */}
      <Snackbar
        open={openSnackbar}
        autoHideDuration={2000}
        onClose={() => setOpenSnackbar(false)}
        anchorOrigin={{ vertical: "top", horizontal: "center" }}
        sx={{
          zIndex: "9999999999999999999999999999999999",
        }}
      >
        <Alert onClose={() => setOpenSnackbar(false)} severity={snackBarType}>
          {snackbarMessage}
        </Alert>
      </Snackbar>
    </div>
  );
}
