import React, { useState, useEffect } from "react";
import { Button, IconButton } from "@mui/material";
import { useUpdateUserMutation } from "../../pages/services/userApi";
import SaveIcon from "@mui/icons-material/Save";
import CancelIcon from "@mui/icons-material/Close";
import EditIcon from "@mui/icons-material/Edit";
import SnackBar from "../snackBar/SnackBar";
import {
  Jobs,
  CreateInvoiceOptions,
  InvoicesPageOptions,
  ItemOptions,
  MachinesOptions,
  MechanismOptions,
  SuppliersOptions,
} from "../../context/jobs";

const EditUser = ({ open, onClose, user: initialUser }) => {
  const transformUserData = (user) => {
    return {
      id: user.id,
      username: user.username,
      phone_number: user.phone_number,
      job_name: user.job_name,
      permissions: {
        createInvoice: {
          create_inventory_operations: user.create_inventory_operations,
          create_additions: user.create_additions,
        },
        manageOperations: {
          view_additions: user.view_additions,
          view_withdrawals: user.view_withdrawals,
          view_deposits: user.view_deposits,
          view_returns: user.view_returns,
          view_damages: user.view_damages,
          view_reservations: user.view_reservations,
          view_prices: user.view_prices,
          can_edit: user.can_edit,
          can_delete: user.can_delete,
          can_confirm_withdrawal: user.can_confirm_withdrawal,
          can_withdraw: user.can_withdraw,
          can_update_prices: user.can_update_prices,
          can_recover_deposits: user.can_recover_deposits,
        },
        items: {
          items_can_edit: user.items_can_edit,
          items_can_delete: user.items_can_delete,
          items_can_add: user.items_can_add,
        },
        machines: {
          machines_can_edit: user.machines_can_edit,
          machines_can_delete: user.machines_can_delete,
          machines_can_add: user.machines_can_add,
        },
        mechanism: {
          mechanism_can_edit: user.mechanism_can_edit,
          mechanism_can_delete: user.mechanism_can_delete,
          mechanism_can_add: user.mechanism_can_add,
        },
        suppliers: {
          suppliers_can_edit: user.suppliers_can_edit,
          suppliers_can_delete: user.suppliers_can_delete,
          suppliers_can_add: user.suppliers_can_add,
        },
      },
    };
  };

  useEffect(() => {
    setUser(initialUser);
  }, [initialUser]);

  const [user, setUser] = useState(initialUser);
  const [isEditting, setIsEditting] = useState(false);
  const [updateUser, { isLoading: isUpdating }] = useUpdateUserMutation();
  const [edittingUser, setEdittingUser] = useState(
    transformUserData(user) || {}
  );

  useEffect(() => {
    setEdittingUser(transformUserData(user) || {});
  }, [user]);

  const [openSnackbar, setOpenSnackbar] = useState(false);
  const [snackbarMessage, setSnackbarMessage] = useState("");
  const [snackBarType, setSnackBarType] = useState("");

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
          marginBottom: "15px",
          border: "1px solid #ddd",
          borderRadius: "5px",
          backgroundColor: "#fff",
          boxShadow: "0 2px 4px rgba(0,0,0,0.1)",
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
            padding: "10px",
          }}
        >
          {Object.entries(options).map(([key, optionLabel]) => (
            <label
              key={key}
              style={{
                margin: "5px 10px",
                display: "flex",
                width: "210px",
                padding: "5px 15px",
                cursor: isEditting ? "pointer" : "context-menu",
                transition: "0.1s",
                alignItems: "center",
              }}
            >
              <input
                type="checkbox"
                checked={values[key]}
                onChange={() => updatePrivileges(section, key, !values[key])}
                style={{
                  marginRight: "10px",
                  cursor: isEditting ? "pointer" : "context-menu",
                }}
                disabled={!isEditting}
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

  const onCloseModal = () => {
    onClose();
    setIsEditting(false);
    setEdittingUser({});
  };

  const handleSave = async () => {
    if (
      JSON.stringify(edittingUser) === JSON.stringify(transformUserData(user))
    ) {
      setIsEditting(false);
      setEdittingUser({});
      return;
    }

    const validateFields = (selectedUser) => {
      if (!selectedUser.username) return "اسم المستخدم مطلوب";
      if (!selectedUser.job_name) return "اسم الوظيفة مطلوب";
    };
    const error = validateFields(edittingUser);
    if (error) {
      setOpenSnackbar(true);
      setSnackbarMessage(error);
      setSnackBarType("error");
      return;
    }

    const formattedEdittingUser = {
      id: edittingUser.id,
      username: edittingUser.username,
      phone_number: edittingUser.phone_number,
      job_name: edittingUser.job_name,
      create_inventory_operations:
        edittingUser.permissions.createInvoice.create_inventory_operations,
      create_additions: edittingUser.permissions.createInvoice.create_additions,
      view_additions: edittingUser.permissions.manageOperations.view_additions,
      view_withdrawals:
        edittingUser.permissions.manageOperations.view_withdrawals,
      view_deposits: edittingUser.permissions.manageOperations.view_deposits,
      view_returns: edittingUser.permissions.manageOperations.view_returns,
      view_damages: edittingUser.permissions.manageOperations.view_damages,
      view_reservations:
        edittingUser.permissions.manageOperations.view_reservations,
      view_prices: edittingUser.permissions.manageOperations.view_prices,
      view_purchase_requests: false,
      can_edit: edittingUser.permissions.manageOperations.can_edit,
      can_delete: edittingUser.permissions.manageOperations.can_delete,
      can_confirm_withdrawal:
        edittingUser.permissions.manageOperations.can_confirm_withdrawal,
      can_withdraw: edittingUser.permissions.manageOperations.can_withdraw,
      can_update_prices:
        edittingUser.permissions.manageOperations.can_update_prices,
      can_recover_deposits:
        edittingUser.permissions.manageOperations.can_recover_deposits,
      can_confirm_purchase_requests: false,
      items_can_edit: edittingUser.permissions.items.items_can_edit,
      items_can_delete: edittingUser.permissions.items.items_can_delete,
      items_can_add: edittingUser.permissions.items.items_can_add,
      machines_can_edit: edittingUser.permissions.machines.machines_can_edit,
      machines_can_delete:
        edittingUser.permissions.machines.machines_can_delete,
      machines_can_add: edittingUser.permissions.machines.machines_can_add,
      mechanism_can_edit: edittingUser.permissions.mechanism.mechanism_can_edit,
      mechanism_can_delete:
        edittingUser.permissions.mechanism.mechanism_can_delete,
      mechanism_can_add: edittingUser.permissions.mechanism.mechanism_can_add,
      suppliers_can_edit: edittingUser.permissions.suppliers.suppliers_can_edit,
      suppliers_can_delete:
        edittingUser.permissions.suppliers.suppliers_can_delete,
      suppliers_can_add: edittingUser.permissions.suppliers.suppliers_can_add,
    };
    console.log(formattedEdittingUser);

    try {
      await updateUser(formattedEdittingUser).unwrap();
      setIsEditting(false);
      setEdittingUser({});
      setSnackbarMessage("تم تحديث الموظف بنجاح");
      setSnackBarType("success");
      setOpenSnackbar(true);
      setUser({
        id: edittingUser.id,
        username: edittingUser.username,
        phone_number: edittingUser.phone_number,
        job_name: edittingUser.job_name,
        permissions: edittingUser.permissions,
        create_inventory_operations:
          edittingUser.permissions.createInvoice.create_inventory_operations,
        create_additions:
          edittingUser.permissions.createInvoice.create_additions,
        view_additions:
          edittingUser.permissions.manageOperations.view_additions,
        view_withdrawals:
          edittingUser.permissions.manageOperations.view_withdrawals,
        view_deposits: edittingUser.permissions.manageOperations.view_deposits,
        view_returns: edittingUser.permissions.manageOperations.view_returns,
        view_damages: edittingUser.permissions.manageOperations.view_damages,
        view_reservations:
          edittingUser.permissions.manageOperations.view_reservations,
        view_prices: edittingUser.permissions.manageOperations.view_prices,
        can_edit: edittingUser.permissions.manageOperations.can_edit,
        can_delete: edittingUser.permissions.manageOperations.can_delete,
        can_confirm_withdrawal:
          edittingUser.permissions.manageOperations.can_confirm_withdrawal,
        can_withdraw: edittingUser.permissions.manageOperations.can_withdraw,
        can_update_prices:
          edittingUser.permissions.manageOperations.can_update_prices,
        can_recover_deposits:
          edittingUser.permissions.manageOperations.can_recover_deposits,
        items_can_edit: edittingUser.permissions.items.items_can_edit,
        items_can_delete: edittingUser.permissions.items.items_can_delete,
        items_can_add: edittingUser.permissions.items.items_can_add,
        machines_can_edit: edittingUser.permissions.machines.machines_can_edit,
        machines_can_delete:
          edittingUser.permissions.machines.machines_can_delete,
        machines_can_add: edittingUser.permissions.machines.machines_can_add,
        mechanism_can_edit:
          edittingUser.permissions.mechanism.mechanism_can_edit,
        mechanism_can_delete:
          edittingUser.permissions.mechanism.mechanism_can_delete,
        mechanism_can_add: edittingUser.permissions.mechanism.mechanism_can_add,
        suppliers_can_edit:
          edittingUser.permissions.suppliers.suppliers_can_edit,
        suppliers_can_delete:
          edittingUser.permissions.suppliers.suppliers_can_delete,
        suppliers_can_add: edittingUser.permissions.suppliers.suppliers_can_add,
      });
    } catch (error) {
      const message =
        error.status === "FETCH_ERROR"
          ? "خطأ في الوصول إلى قاعدة البيانات"
          : "اسم الموظف موجود بالفعل";

      setSnackbarMessage(message);
      setSnackBarType("error");
      setOpenSnackbar(true);
      console.error("Error updating user:", error);
    }
  };

  useEffect(() => {
    const handleKeyDown = (event) => {
      if (event.key === "Escape" && open) {
        onCloseModal();
      }
    };
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [open]);

  const updatePrivileges = (section, key, value) => {
    console.log(edittingUser);
    setEdittingUser((prev) => ({
      ...prev,
      permissions: {
        ...prev.permissions,
        [section]: {
          ...prev.permissions[section],
          [key]: value,
        },
      },
    }));
  };

  const createInvoiceOptions = CreateInvoiceOptions;

  const invoicesPageOptions = InvoicesPageOptions;

  const itemOptions = ItemOptions;
  const machinesOptions = MachinesOptions;
  const mechanismOptions = MechanismOptions;
  const suppliersOptions = SuppliersOptions;

  const jobs = Jobs.map((job) => ({ value: job, label: job }));

  return (
    open && (
      <>
        <div
          style={{
            position: "fixed",
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: "rgba(0,0,0,0.5)",
            display: "flex",
            justifyContent: "center",
            alignItems: "center",
            zIndex: 1000,
          }}
          onClick={onCloseModal}
        >
          <div
            style={{
              width: "80%",
              maxWidth: "1000px",
              backgroundColor: "#fff",
              boxShadow: "0 4px 6px rgba(0,0,0,0.1)",
              padding: "20px",
              borderRadius: "5px",
              maxHeight: "80vh",
              overflowY: "auto",
              zIndex: 1001,
              direction: "rtl",
            }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Title */}
            <h3
              style={{
                textAlign: "center",
                position: "relative",
                marginBottom: "20px",
              }}
            >
              {isEditting ? (
                <>
                  <IconButton
                    sx={{
                      position: "absolute",
                      left: "30px",
                      top: "0",
                    }}
                    onClick={handleSave}
                    disabled={isUpdating}
                  >
                    <SaveIcon sx={{ color: "#1976d2" }} />
                  </IconButton>
                  <IconButton
                    sx={{
                      position: "absolute",
                      left: "0",
                      top: "0",
                    }}
                    onClick={() => {
                      setIsEditting(false);
                      setEdittingUser({});
                    }}
                  >
                    <CancelIcon sx={{ color: "#d32f2f" }} />
                  </IconButton>
                </>
              ) : (
                <IconButton
                  sx={{
                    position: "absolute",
                    left: "0",
                    top: "0",
                  }}
                  onClick={() => {
                    setIsEditting(true);
                    setEdittingUser(transformUserData(user));
                  }}
                >
                  <EditIcon sx={{ color: "#1976d2" }} />
                </IconButton>
              )}
              بيانات الموظف
            </h3>

            {/* Header Main Data */}
            <div
              style={{
                marginBottom: "20px",
                display: "flex",
                flexDirection: "column",
                gap: "15px",
                backgroundColor: "#f5f5f5",
                padding: "15px",
                borderRadius: "5px",
              }}
            >
              <div
                style={{
                  display: "flex",
                  gap: "20px",
                  alignItems: "center",
                }}
              >
                <label
                  style={{
                    fontWeight: "bold",
                    color: "#555",
                    minWidth: "100px",
                  }}
                >
                  اسم المستخدم:
                </label>
                <input
                  value={isEditting ? edittingUser?.username : user?.username}
                  onChange={(e) => {
                    if (isEditting) {
                      setEdittingUser({
                        ...edittingUser,
                        username: e.target.value,
                      });
                    }
                  }}
                  style={{
                    pointerEvents: isEditting ? "auto" : "none",
                    width: "100%",
                    padding: "10px",
                    fontSize: "1rem",
                    border: isEditting ? "1px solid #1976d2" : "1px solid #ddd",
                    borderRadius: "5px",
                    outline: "none",
                    transition: "border-color 0.2s",
                  }}
                />
              </div>

              <div
                style={{
                  display: "flex",
                  gap: "20px",
                  alignItems: "center",
                }}
              >
                <label
                  style={{
                    fontWeight: "bold",
                    color: "#555",
                    minWidth: "100px",
                  }}
                >
                  الوظيفة
                </label>
                <select
                  value={isEditting ? edittingUser?.job_name : user?.job_name}
                  onChange={(e) => {
                    if (isEditting) {
                      setEdittingUser({
                        ...edittingUser,
                        job_name: e.target.value,
                      });
                    }
                  }}
                  style={{
                    width: "100%",
                    padding: "10px",
                    fontSize: "1rem",
                    borderRadius: "4px",
                    direction: "rtl",
                    textAlign: "right",
                    outline: "none",
                    transition: "border-color 0.2s",
                    backgroundColor: "#fff",
                    appearance: "none",
                    pointerEvents: isEditting ? "auto" : "none",
                    border: isEditting ? "1px solid #1976d2" : "1px solid #ddd",
                  }}
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
              </div>

              <div
                style={{
                  display: "flex",
                  gap: "20px",
                  alignItems: "center",
                }}
              >
                <label
                  style={{
                    fontWeight: "bold",
                    color: "#555",
                    minWidth: "100px",
                  }}
                >
                  رقم الهاتف
                </label>
                <input
                  value={
                    isEditting ? edittingUser?.phone_number : user?.phone_number
                  }
                  onChange={(e) => {
                    if (isEditting) {
                      setEdittingUser({
                        ...edittingUser,
                        phone_number: e.target.value,
                      });
                    }
                  }}
                  style={{
                    pointerEvents: isEditting ? "auto" : "none",
                    width: "100%",
                    padding: "10px",
                    fontSize: "1rem",
                    border: isEditting ? "1px solid #1976d2" : "1px solid #ddd",
                    borderRadius: "5px",
                    outline: "none",
                    transition: "border-color 0.2s",
                  }}
                />
              </div>
            </div>

            {/* Permissions Section */}
            <h3 style={{ textAlign: "center", marginBottom: "20px" }}>
              صلاحيات الموظف
            </h3>
            <div
              style={{
                display: "flex",
                flexDirection: "column",
                gap: "15px",
                marginBottom: "20px",
                justifyContent: "center",
                flexWrap: "wrap",
              }}
            >
              <CustomCheckboxField
                label="صفحة إنشاء عملية"
                values={
                  (isEditting ? edittingUser : transformUserData(user))
                    .permissions.createInvoice
                }
                section="createInvoice"
                updatePrivileges={updatePrivileges}
                options={createInvoiceOptions}
              />
              <CustomCheckboxField
                label="صفحة إدارة العمليات"
                values={
                  (isEditting ? edittingUser : transformUserData(user))
                    .permissions.manageOperations
                }
                section="manageOperations"
                updatePrivileges={updatePrivileges}
                options={invoicesPageOptions}
              />
              <CustomCheckboxField
                label="صفحة الأصناف"
                section="items"
                updatePrivileges={updatePrivileges}
                values={
                  (isEditting ? edittingUser : transformUserData(user))
                    .permissions.items
                }
                options={itemOptions}
              />
              <CustomCheckboxField
                label="صفحة الماكينات"
                section="machines"
                updatePrivileges={updatePrivileges}
                values={
                  (isEditting ? edittingUser : transformUserData(user))
                    .permissions.machines
                }
                options={machinesOptions}
              />
              <CustomCheckboxField
                label="صفحة الميكانيزم"
                section="mechanism"
                updatePrivileges={updatePrivileges}
                values={
                  (isEditting ? edittingUser : transformUserData(user))
                    .permissions.mechanism
                }
                options={mechanismOptions}
              />
              <CustomCheckboxField
                label="صفحة الموردين"
                section="suppliers"
                updatePrivileges={updatePrivileges}
                values={
                  (isEditting ? edittingUser : transformUserData(user))
                    .permissions.suppliers
                }
                options={suppliersOptions}
              />
            </div>

            {/* Close Button */}
            <div
              style={{ display: "flex", justifyContent: "center", gap: "10px" }}
            >
              <Button
                variant="contained"
                color="primary"
                onClick={onCloseModal}
                style={{ backgroundColor: "#1976d2", color: "#fff" }}
              >
                إغلاق
              </Button>
            </div>
          </div>
        </div>
        <SnackBar
          open={openSnackbar}
          message={snackbarMessage}
          type={snackBarType}
          onClose={() => setOpenSnackbar(false)}
        />
      </>
    )
  );
};

export default EditUser;
