import styles from "./Users.module.css";
import React, { useEffect, useState } from "react";
import { GridToolbarContainer, GridToolbarQuickFilter } from "@mui/x-data-grid";
import { Snackbar, Alert, IconButton } from "@mui/material";
import ClearOutlinedIcon from "@mui/icons-material/ClearOutlined";
import { useNavigate } from "react-router-dom";
import GroupAddIcon from "@mui/icons-material/GroupAdd";

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

export default function Users() {
  const [openSnackbar, setOpenSnackbar] = useState(false);
  const [snackbarMessage, setSnackbarMessage] = useState("");
  const [snackBarType, setSnackBarType] = useState("");

  // get user info
  const {
    data: user,
    isLoading: isLoadingUser,
    refetch: refetchUser,
  } = useGetUserQuery();

  // get user data
  const {
    data: users = [],
    isLoading,
    refetch: refetchUsers,
  } = useGetUsersQuery(undefined, {
    pollingInterval: 300000,
  });
  const [deleteUser, { isLoading: isDeleting }] = useDeleteUserMutation();

  // collors
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
              // margin: "0px 8px 3px",
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

  // pagination
  const [paginationModel, setPaginationModel] = useState({
    page: 0,
    pageSize: 10,
  });
  const pageCount = Math.ceil(users.length / paginationModel.pageSize);
  const handlePageChange = (newModel) => {
    setPaginationModel((prev) => ({ ...prev, ...newModel }));
  };

  // Edit
  const handleLaunchClick = (id) => {
    const user = users.find((user) => user.id === id);
    if (user) {
      setSelectedUser(user);
      setIsModalOpen(true);
    } else {
      console.error("User not found");
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
        setSnackbarMessage("خطأ في حذف الموظف");
        setSnackBarType("error");
        setDeleteConfirmationText("");
        setSelectedUserId(null);
        setDeleteDialogOpen(false);
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
        return (
          <>
            <div className={styles.iconBtnContainer}>
              <button
                className={styles.iconBtn}
                onClick={() => handleLaunchClick(params.id)}
              >
                <LaunchIcon />
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
    refetchUser();
  }, [refetchUser, refetchUsers]);

  // manage modal component
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
            rows={users}
            columns={columns}
            paginationModel={paginationModel}
            onPageChange={handlePageChange}
            pageCount={pageCount}
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
