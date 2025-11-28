// src/features/users/UsersTable.jsx
import React from "react";
import styles from "./Users.module.css";
import ClearOutlinedIcon from "@mui/icons-material/ClearOutlined";
import LaunchIcon from "@mui/icons-material/Launch";
import PasswordIcon from "@mui/icons-material/Password";
import CustomDataGrid from "../../components/dataGrid/CustomDataGrid";

export default function UsersTable({
  rows,
  pageCount,
  paginationModel,
  onPageChange,
  onLaunch,
  onChangePass,
  onDelete,
  loading,
  CustomToolbarFromComponent,
}) {
  const columns = [
    {
      field: "actions",
      headerName: "الإجراءات",
      width: 150,
      headerClassName: styles.actionsColumn,
      cellClassName: styles.actionsColumn,
      sortable: false,
      filterable: false,
      disableColumnMenu: true,
      renderCell: (params) => (
        <div
          className={styles.iconBtnContainer}
          style={{
            display: "flex",
            justifyContent: "space-around",
            alignItems: "center",
            height: "100%",
            width: "100%",
          }}
        >
          <button
            className={styles.iconBtn}
            onClick={() => onLaunch(params.id)}
            title="عرض/تعديل"
          >
            <LaunchIcon />
          </button>

          <button
            className={styles.iconBtn}
            onClick={() => onChangePass(params.id)}
            title="تغيير كلمة السر"
          >
            <PasswordIcon />
          </button>

          <button
            className={styles.iconBtn}
            onClick={() => onDelete(params.id)}
            title="حذف"
          >
            <ClearOutlinedIcon sx={{ color: "red" }} />
          </button>
        </div>
      ),
    },
    { field: "job_name", headerName: "الوظيفة", flex: 1 },
    { field: "phone_number", headerName: "رقم الهاتف", flex: 1 },
    { field: "username", headerName: "الاسم", flex: 1 },
    { field: "id", headerName: "#", width: 100, sortable: false },
  ];

  return (
    <>
      {/* مهم: مرر التولبار كـ slot للـ DataGrid عبر CustomDataGrid */}
      <CustomDataGrid
        rows={rows}
        columns={columns}
        paginationModel={paginationModel}
        onPageChange={onPageChange}
        pageCount={pageCount}
        CustomToolbarFromComponent={CustomToolbarFromComponent}
        loader={loading}
        onCellKeyDown={(params, event) => {
          if ([" ", "ArrowLeft", "ArrowRight"].includes(event.key)) {
            event.stopPropagation();
            event.preventDefault();
          }
        }}
      />
    </>
  );
}
