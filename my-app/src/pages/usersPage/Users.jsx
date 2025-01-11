import styles from "./Users.module.css";
import React, { useEffect, useState } from "react";
import {
  DataGrid,
  GridToolbarContainer,
  GridToolbarQuickFilter,
} from "@mui/x-data-grid";
import {
  TextField,
  Snackbar,
  Alert,
  Button,
  Select,
  MenuItem,
  PaginationItem,
} from "@mui/material";
import EditIcon from "@mui/icons-material/Edit";
import ClearOutlinedIcon from "@mui/icons-material/ClearOutlined";
import SaveIcon from "@mui/icons-material/Save";
import CancelIcon from "@mui/icons-material/Close";
import { useNavigate } from "react-router-dom";
import GroupAddIcon from "@mui/icons-material/GroupAdd";
import Pagination from "@mui/material/Pagination";
import Stack from "@mui/material/Stack";
import ArrowBackIcon from "@mui/icons-material/ArrowBack";
import ArrowForwardIcon from "@mui/icons-material/ArrowForward";
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
          backgroundColor: "transparent",
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
        إضافة موظف
        <GroupAddIcon
          sx={{
            marginRight: "8px",
          }}
        />
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

const CustomPagination = ({ page, count, onChange }) => {
  const handlePageChange = (event, value) => {
    onChange({ page: value - 1 });
  };

  return (
    <Stack
      spacing={2}
      sx={{
        margin: "auto",
        direction: "rtl",
      }}
    >
      <Pagination
        count={count}
        page={page + 1}
        onChange={handlePageChange}
        renderItem={(item) => (
          <PaginationItem
            slots={{ previous: ArrowForwardIcon, next: ArrowBackIcon }}
            {...item}
          />
        )}
      />
    </Stack>
  );
};
export default function Users() {
  const API_BASE_URL = "http://127.0.0.1:5000/auth";
  const [users, setUsers] = useState([]);
  const [editedRow, setEditedRow] = useState(null);
  const [openSnackbar, setOpenSnackbar] = useState(false);
  const [snackbarMessage, setSnackbarMessage] = useState("");
  const [snackBarType, setSnackBarType] = useState("");

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
  };
  const validatePhone = (phone) => {
    const phoneRegex = /^[0-9]{10,15}$/;
    return phoneRegex.test(phone);
  };

  const validateFields = (row) => {
    if (!row.username) return "اسم المستخدم مطلوب";
    if (!row.job_name) return "اسم الوظيفة مطلوب";
    if (!row.phone_number) return "رقم الهاتف مطلوب";
    if (!validatePhone(row.phone_number)) return "رقم الهاتف غير صالح";
    return null;
  };

  const handleSave = async (id) => {
    const error = validateFields(editedRow);

    if (error) {
      setOpenSnackbar(true);
      setSnackbarMessage(error);
      setSnackBarType("error");
      setEditedRow(null);
      return;
    }

    const updatedRows = users.map((row) =>
      row.id === id ? { ...row, ...editedRow } : row
    );

    setUsers(updatedRows);

    const accessToken = localStorage.getItem("access_token");

    try {
      const { username, job_name, phone_number } = editedRow;
      const response = await fetch(`${API_BASE_URL}/user/${id}`, {
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

      setOpenSnackbar(true);
      setSnackbarMessage("تم تحديث بيانات الموظف بنجاح");
      setSnackBarType("success");
    } catch (error) {
      console.error("Error updating user:", error);
      setOpenSnackbar(true);
      setSnackbarMessage("خطأ في تحديث بيانات الموظف");
      setSnackBarType("error");
    }

    setEditedRow(null);
  };

  // Delete
  const handleDelete = async (id) => {
    const isConfirmed = window.confirm(
      "Are you sure you want to delete this user?"
    );
    if (!isConfirmed) return;
    const accessToken = localStorage.getItem("access_token");
    try {
      const response = await fetch(`${API_BASE_URL}/user/${id}`, {
        method: "DELETE",
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || "Failed to delete user");
      }

      setOpenSnackbar(true);
      setSnackbarMessage("تم حذف الموظف بنجاح");
      setSnackBarType("success");
      setUsers((prevRows) => prevRows.filter((row) => row.id !== id));
    } catch (error) {
      console.error("Error deleting user:", error);
      setOpenSnackbar(true);
      setSnackbarMessage("خطأ في حذف الموظف");
      setSnackBarType("error");
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
                >
                  <SaveIcon />
                </button>
                <button
                  className={styles.iconBtn}
                  onClick={() => setEditedRow(null)}
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
                onClick={() => handleDelete(params.id)}
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
            <Select
              value={editedRow.job_name || ""}
              onChange={(e) =>
                setEditedRow({ ...editedRow, job_name: e.target.value })
              }
            >
              <MenuItem value="مبرمج">مبرمج</MenuItem>
              <MenuItem value="مدير">مدير</MenuItem>
            </Select>
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
            <TextField
              sx={{ marginY: 0.2 }}
              value={editedRow.phone_number || ""}
              onChange={(e) =>
                setEditedRow({ ...editedRow, phone_number: e.target.value })
              }
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
            <TextField
              sx={{ marginY: 0.2 }}
              value={editedRow.username || ""}
              onChange={(e) =>
                setEditedRow({ ...editedRow, username: e.target.value })
              }
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

      try {
        const data = await fetchData(`${API_BASE_URL}/users`, "GET");
        const updatedData = data.map((user, index) => ({
          ...user,
          rowNumber: index + 1,
        }));
        setUsers(updatedData);
      } catch (error) {
        console.error("Error fetching data:", error);
      }
    };

    fetchUserData();
  }, []);

  const localeText = {
    toolbarColumns: "الأعمدة",
    toolbarFilters: "التصفية",
    toolbarDensity: "الكثافة",
    toolbarExport: "تصدير",
    columnMenuSortAsc: "ترتيب تصاعدي",
    columnMenuSortDesc: "ترتيب تنازلي",
    columnMenuFilter: "تصفية",
    columnMenuHideColumn: "إخفاء العمود",
    columnMenuUnsort: "إلغاء الترتيب",
    filterPanelOperator: "الشرط",
    filterPanelValue: "القيمة",
    filterOperatorContains: "يحتوي على",
    filterOperatorEquals: "يساوي",
    filterOperatorStartsWith: "يبدأ بـ",
    filterOperatorEndsWith: "ينتهي بـ",
    filterOperatorIsEmpty: "فارغ",
    filterOperatorIsNotEmpty: "غير فارغ",
    columnMenuManageColumns: "إدارة الأعمدة",
    columnMenuShowColumns: "إظهار الأعمدة",
    toolbarDensityCompact: "مضغوط",
    toolbarDensityStandard: "عادي",
    toolbarDensityComfortable: "مريح",
    toolbarExportCSV: "تصدير إلى CSV",
    toolbarExportPrint: "طباعة",
    noRowsLabel: "لا توجد بيانات",
    noResultsOverlayLabel: "لا توجد نتائج",
    columnMenuShowHideAllColumns: "إظهار/إخفاء الكل",
    columnMenuResetColumns: "إعادة تعيين الأعمدة",
    filterOperatorDoesNotContain: "لا يحتوي على",
    filterOperatorDoesNotEqual: "لا يساوي",
    filterOperatorIsAnyOf: "أي من",
    filterPanelColumns: "الأعمدة",
    filterPanelInputPlaceholder: "أدخل القيمة",
    filterPanelInputLabel: "قيمة التصفية",
    filterOperatorIs: "هو",
    filterOperatorIsNot: "ليس",
    toolbarExportExcel: "تصدير إلى Excel",
    errorOverlayDefaultLabel: "حدث خطأ.",
    footerRowSelected: (count) => `${count} صفوف محددة`,
    footerTotalRows: "إجمالي الصفوف:",
    footerTotalVisibleRows: (visibleCount, totalCount) =>
      `${visibleCount} من ${totalCount}`,
    filterPanelDeleteIconLabel: "حذف",
    filterPanelAddFilter: "إضافة تصفية",
    filterPanelDeleteFilter: "حذف التصفية",
    loadingOverlay: "جارٍ التحميل...",
    columnMenuReset: "إعادة تعيين",
    footerPaginationRowsPerPage: "عدد الصفوف في الصفحة:",
    paginationLabelDisplayedRows: ({ from, to, count }) =>
      `${from} - ${to} من ${count}`,

    filterOperatorIsAny: "أي",
    filterOperatorIsTrue: "نعم",
    filterOperatorIsFalse: "لا",
    filterValueAny: "أي",
    filterValueTrue: "نعم",
    filterValueFalse: "لا",
    toolbarColumnsLabel: "إدارة الأعمدة",
    toolbarResetColumns: "إعادة تعيين",
  };

  return (
    <div className={styles.container}>
      <h1 className={styles.head}>بيانات الموظفين</h1>

      <DataGrid
        rows={users}
        columns={columns.map((col) => ({
          ...col,
          align: "center",
          headerAlign: "center",
          headerClassName: styles.headerCell,
        }))}
        localeText={localeText}
        rowHeight={62}
        editMode="row"
        onCellDoubleClick={(params, event) => {
          event.stopPropagation();
        }}
        slots={{
          toolbar: CustomToolbar,
          pagination: CustomPagination,
        }}
        slotProps={{
          pagination: {
            page: paginationModel.page,
            count: pageCount,
            onChange: handlePageChange,
          },
        }}
        pagination
        paginationModel={paginationModel}
        onPaginationModelChange={handlePageChange}
        disableVirtualization={false}
        sx={{
          "& .MuiDataGrid-toolbarContainer": {
            paddingBottom: "10px",
            display: "flex",
            justifyContent: "space-between",
            backgroundColor: "#f7f7f7",
          },
          "& .MuiDataGrid-virtualScroller": {
            borderRadius: "4px",
          },
          "& .MuiDataGrid-cell": {
            border: "1px solid #ddd",
          },
          "&.MuiDataGrid-row:hover": {
            backgroundColor: "#f7f7f7",
          },
          "& .MuiDataGrid-columnSeparator": {},
          "& .MuiDataGrid-cell:focus": {
            outline: "none",
          },
          "& .MuiDataGrid-cell:focus-within": {
            outline: "none",
          },
          backgroundColor: "white",
          border: "none",
          // direction: "rtl",
        }}
      />

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
