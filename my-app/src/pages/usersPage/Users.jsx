import styles from "./Users.module.css";
import React, { useEffect, useState } from "react";
import { GridToolbarContainer, GridToolbarQuickFilter } from "@mui/x-data-grid";
import { Snackbar, Alert, IconButton } from "@mui/material";
import ClearOutlinedIcon from "@mui/icons-material/ClearOutlined";
import { useNavigate } from "react-router-dom";
import GroupAddIcon from "@mui/icons-material/GroupAdd";
import PasswordIcon from "@mui/icons-material/Password";
import "../../colors.css";
import DeleteRow from "../../components/deleteItem/DeleteRow";
import CustomDataGrid from "../../components/dataGrid/CustomDataGrid";
import CircularProgress from "@mui/material/CircularProgress";
import {
  useGetUsersQuery,
  useDeleteUserMutation,
  useGetUserQuery,
} from "../services/userApi";
import LaunchIcon from "@mui/icons-material/Launch";
import EditUser from "../../components/editUser/EditUser";
import ChangePassword from "../../components/changePassword/ChangePassword";

export default function Users() {
  const [openSnackbar, setOpenSnackbar] = useState(false);
  const [snackbarMessage, setSnackbarMessage] = useState("");
  const [snackBarType, setSnackBarType] = useState("");
  const [changePassOpen, setChangePassOpen] = useState(false);
  const [selectedUserId, setSelectedUserId] = useState(null);

  // Get user info
  const { data: user, isLoading: isLoadingUser } = useGetUserQuery();

  // Pagination state
  const [paginationModel, setPaginationModel] = useState({
    page: 0,
    pageSize: 10,
  });

  // Get users data with pagination
  const {
    data: usersData = { users: [], total_pages: 1 },
    isLoading,
    refetch: refetchUsers,
  } = useGetUsersQuery(
    { page: paginationModel.page, page_size: paginationModel.pageSize },
    { pollingInterval: 300000 }
  );

  const [deleteUser, { isLoading: isDeleting }] = useDeleteUserMutation();

  // Colors
  const primaryColor = getComputedStyle(
    document.documentElement
  ).getPropertyValue("--primary-color");

  function CustomToolbar() {
    const navigate = useNavigate();

    const handleClick = () => {
      navigate("/register");
    };
    return (
      <GridToolbarContainer>
        <IconButton
          sx={{
            padding: "10px",
            color: primaryColor,
          }}
          color="primary"
          onClick={handleClick}
        >
          <GroupAddIcon
            sx={{
              fontSize: "3rem",
            }}
          />
        </IconButton>

        <GridToolbarQuickFilter
          sx={{
            direction: "rtl",
            width: "50%",
            "& .MuiInputBase-root": {
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

  // Handle page change
  const handlePageChange = (newModel) => {
    setPaginationModel((prev) => {
      const updatedModel = { ...prev, ...newModel };
      return updatedModel;
    });
  };

  // Edit
  const handleLaunchClick = (id) => {
    const user = usersData.users.find((user) => user.id === id);
    if (user) {
      setSelectedUser(user);
      setIsModalOpen(true);
    } else {
      console.error("User not found");
    }
  };

  // Dialog
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [deleteConfirmationText, setDeleteConfirmationText] = useState("");

  const handleDeleteClick = (id) => {
    setSelectedUserId(id);
    setDeleteDialogOpen(true);
    setDeleteConfirmationText("");
  };

  // Change password
  const handleChangePass = (id) => {
    setSelectedUserId(id);
    setChangePassOpen(true);
  };

  // Delete
  const handleDelete = async () => {
    if (deleteConfirmationText.trim().toLowerCase() === "نعم") {
      try {
        await deleteUser(selectedUserId).unwrap();
        setOpenSnackbar(true);
        setSnackbarMessage("تم حذف الموظف بنجاح");
        setSnackBarType("success");
        setDeleteConfirmationText("");
        setSelectedUserId(null);
        setDeleteDialogOpen(false);
      } catch (error) {
        setOpenSnackbar(true);
        if (error.response && error.response.status === "FETCH_ERROR") {
          setSnackbarMessage("خطأ في الوصول إلى قاعدة البيانات");
        } else {
          setSnackbarMessage(
            "خطأ في حذف الموظف، قد يكون هناك بيانات تتعلق به او انه غير موجود بالفعل"
          );
        }
        setSnackBarType("error");
        setDeleteConfirmationText("");
        setSelectedUserId(null);
        setDeleteDialogOpen(false);
      }
    }
  };

  // Handle snackbar for password change
  const handlePasswordChangeSuccess = (message, type) => {
    setOpenSnackbar(true);
    setSnackbarMessage(message);
    setSnackBarType(type);
  };

  const columns = [
    {
      field: "actions",
      headerName: "الإجراءات",
      width: 150,
      headerClassName: styles.actionsColumn,
      cellClassName: styles.actionsColumn,
      renderCell: (params) => {
        return (
          <>
            <div
              className={styles.iconBtnContainer}
              style={{
                display: "flex",
                justifyContent: "space-around",
                alignItems: "center",
                height: "100%",
              }}
            >
              <button
                className={styles.iconBtn}
                onClick={() => handleLaunchClick(params.id)}
              >
                <LaunchIcon />
              </button>
              <button
                className={styles.iconBtn}
                onClick={() => handleChangePass(params.id)}
              >
                <PasswordIcon />
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
    },
    {
      field: "phone_number",
      headerName: "رقم الهاتف",
      flex: 1,
    },
    {
      field: "username",
      headerName: "الاسم",
      flex: 1,
    },
    {
      field: "id",
      headerName: "#",
      width: 100,
      sortable: false,
    },
  ];

  useEffect(() => {
    refetchUsers();
  }, [refetchUsers]);

  // Manage modal component
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState(null);

  if (isLoadingUser) {
    return (
      <div
        style={{
          height: "100vh",
          display: "flex",
          justifyContent: "center",
          alignItems: "center",
        }}
      >
        <h1 className={styles.head}>
          <CircularProgress />
        </h1>
      </div>
    );
  } else {
    if (user?.username === "admin") {
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
            rows={usersData.users}
            columns={columns}
            paginationModel={paginationModel}
            onPageChange={handlePageChange}
            pageCount={usersData.total_pages}
            CustomToolbarFromComponent={CustomToolbar}
            loader={isLoading}
            onCellKeyDown={(params, event) => {
              if ([" ", "ArrowLeft", "ArrowRight"].includes(event.key)) {
                event.stopPropagation();
                event.preventDefault();
              }
            }}
          />

          {selectedUser && (
            <EditUser
              open={isModalOpen}
              onClose={() => setIsModalOpen(false)}
              user={selectedUser}
            />
          )}

          <ChangePassword
            open={changePassOpen}
            onClose={() => setChangePassOpen(false)}
            userId={selectedUserId}
            onSuccess={handlePasswordChangeSuccess}
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
            <Alert
              onClose={() => setOpenSnackbar(false)}
              severity={snackBarType}
            >
              {snackbarMessage}
            </Alert>
          </Snackbar>
        </div>
      );
    } else {
      return (
        <div
          style={{
            height: "100vh",
            display: "flex",
            justifyContent: "center",
            alignItems: "center",
          }}
        >
          <h1 className={styles.head}>هذه الصفحة غير متوفره</h1>
        </div>
      );
    }
  }
}
