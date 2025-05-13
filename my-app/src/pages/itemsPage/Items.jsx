import styles from "./Items.module.css";
import React, { useEffect, useState } from "react";
import {
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Button,
  Box,
  Modal,
  Divider,
  List,
  ListItem,
  CircularProgress,
} from "@mui/material";
import EditIcon from "@mui/icons-material/Edit";
import ClearOutlinedIcon from "@mui/icons-material/ClearOutlined";
import SaveIcon from "@mui/icons-material/Save";
import LaunchIcon from "@mui/icons-material/Launch";
import "../../colors.css";
import AddIcon from "@mui/icons-material/Add";
import SnackBar from "../../components/snackBar/SnackBar";
import DeleteRow from "../../components/deleteItem/DeleteRow";
import CustomDataGrid from "../../components/dataGrid/CustomDataGrid";
import { isNumber } from "@mui/x-data-grid/internals";
import {
  useGetWarehousesQuery,
  useAddWarehouseMutation,
  useUpdateWarehouseMutation,
  useDeleteWarehouseMutation,
} from "../services/warehouseApi";
import { useGetUserQuery } from "../services/userApi";
import ArticleIcon from "@mui/icons-material/Article";
import ItemeDetails from "../../components/itemDetails/ItemeDetails";

export default function Items() {
  // RTK Query Hooks
  const { data: user, isLoading: isLoadingUser } = useGetUserQuery();

  // Pagination state
  const [paginationModel, setPaginationModel] = useState({
    page: 0,
    pageSize: 10,
  });

  // Handle page change
  const handlePageChange = (newModel) => {
    setPaginationModel((prev) => ({ ...prev, ...newModel }));
  };

  // Fetch warehouses with pagination
  const {
    data: warehousesData = { warehouses: [], total_pages: 1 },
    isLoading: isMachinesLoading,
    refetch,
  } = useGetWarehousesQuery(
    { page: paginationModel.page, page_size: paginationModel.pageSize },
    { pollingInterval: 300000 }
  );

  useEffect(() => {
    refetch();
  }, []);

  const [addWarehouse, { isLoading: isAdding }] = useAddWarehouseMutation();
  const [updateWarehouse, { isLoading: isUpdating }] =
    useUpdateWarehouseMutation();
  const [deleteWarehouse, { isLoading: isDeleting }] =
    useDeleteWarehouseMutation();

  // Colors
  const primaryColor = getComputedStyle(
    document.documentElement
  ).getPropertyValue("--primary-color");

  // Snackbar
  const [openSnackbar, setOpenSnackbar] = useState(false);
  const [snackbarMessage, setSnackbarMessage] = useState("");
  const [snackBarType, setSnackBarType] = useState("");
  // Handle close snack
  const handleCloseSnackbar = () => {
    setOpenSnackbar(false);
  };

  // Add dialog
  const [openDialog, setOpenDialog] = useState(false);

  // Add item
  const [newItem, setNewItem] = useState({
    item_name: "",
    item_bar: "",
    locations: [
      {
        location: "",
        quantity: 0,
      },
    ],
  });
  const [errors, setErrors] = useState({});

  const handleAddItem = async () => {
    const newErrors = {};

    if (newItem.item_name.trim() === "") {
      newErrors.item_name = "الحقل مطلوب";
      setErrors(newErrors);
      return;
    }

    if (newItem.item_bar.trim() === "") {
      newErrors.item_bar = "الحقل مطلوب";
      setErrors(newErrors);
      return;
    }

    const location = newItem.locations[0];

    if (!location.location || location.location.trim() === "") {
      newErrors.locations = [
        { ...newErrors.locations?.[0], location: "الموقع مطلوب" },
      ];
      setErrors(newErrors);
      return;
    }
    const updatedItems = {
      ...newItem,
      locations: [
        {
          location: newItem.locations[0].location,
          quantity:
            newItem.locations[0].quantity === "" ||
            !isNumber(newItem.locations[0].quantity)
              ? 0
              : newItem.locations[0].quantity,
        },
      ],
    };
    try {
      await addWarehouse(updatedItems).unwrap();
      await refetch();

      setNewItem({
        item_name: "",
        item_bar: "",
        locations: [{ location: "", quantity: 0 }],
      });
      setErrors({});
      setOpenDialog(false);
      setOpenSnackbar(true);
      setSnackbarMessage("تمت اضافة المنتج");
      setSnackBarType("success");
    } catch (error) {
      if (error.response && error.response.status === 500) {
        setOpenSnackbar(true);
        setSnackbarMessage("خطأ في الوصول إلى قاعدة البيانات");
        setSnackBarType("error");
      } else {
        setOpenSnackbar(true);
        setSnackbarMessage("اسم العنصر او الباركود موجود بالفعل");
        setSnackBarType("error");
      }
    }
  };

  // Columns
  const columns = [
    {
      field: "actions",
      width: 150,
      headerName: "الإجراءات",
      renderCell: (params) => (
        <div
          style={{
            display: "flex",
            justifyContent: "space-around",
            alignItems: "center",
            height: "100%",
          }}
        >
          <button
            className={styles.iconBtn}
            onClick={() => openItem(params.id)}
          >
            <LaunchIcon />
          </button>
          <button
            className={styles.iconBtn}
            onClick={() => {
              if (user?.items_can_delete || user?.username === "admin") {
                handleDeleteClick(params.id);
              } else {
                setOpenSnackbar(true);
                setSnackbarMessage("ليس لديك صلاحيات لحذف العنصر");
                setSnackBarType("info");
              }
            }}
            style={{ color: "#d32f2f" }}
          >
            <ClearOutlinedIcon />
          </button>
          <button
            className={styles.iconBtn}
            onClick={() => showItemDetails(params.id)}
            style={{ color: "#d32f2f" }}
          >
            <ArticleIcon sx={{ color: primaryColor }} />
          </button>
        </div>
      ),
    },
    {
      field: "totalPrice",
      headerName: "إجمالي الكمية",
      flex: 1,
    },
    {
      field: "locations",
      headerName: "الموقع",
      flex: 1,
    },
    { field: "item_bar", headerName: "الباركود", flex: 1 },
    { field: "item_name", headerName: "اسم المنتج", flex: 1 },
    { field: "id", headerName: "#" },
  ];

  // Modal
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedItem, setSelectedItem] = useState(null);
  const openItem = (id) => {
    const item = warehousesData.warehouses.find((item) => item.id === id);
    setSelectedItem(item);
    setIsModalOpen(true);
  };
  const closeModal = () => {
    setIsModalOpen(false);
    setIsEditingItem(false);
    setEditingItem(null);
  };

  // Edit
  const [isEditingItem, setIsEditingItem] = useState(false);
  const [editingItem, setEditingItem] = useState(null);
  const handleSave = async () => {
    if (selectedItem === editingItem) {
      setEditingItem(null);
      setIsEditingItem(false);
      return;
    }
    const hasEmptyValues = Object.values(editingItem).some((value) => {
      if (Array.isArray(value)) {
        return value.some(
          (location) =>
            !location.location ||
            location.quantity === null ||
            location.quantity === undefined
        );
      }
      return value === null || value === undefined || value === "";
    });

    if (hasEmptyValues) {
      setOpenSnackbar(true);
      setSnackbarMessage("يرجى ملئ جميع الحقول");
      setSnackBarType("info");
      return;
    }
    const newItems = editingItem.locations.map((location) => {
      return {
        ...location,
        quantity: isNumber(Number(location.quantity))
          ? Number(location.quantity)
          : 0,
      };
    });

    const updatedItems = {
      ...editingItem,
      locations: newItems,
    };
    try {
      await updateWarehouse({ id: editingItem.id, ...updatedItems }).unwrap();
      await refetch();

      setSelectedItem(updatedItems);
      setEditingItem(null);
      setIsEditingItem(false);

      setOpenSnackbar(true);
      setSnackbarMessage("تم تعديل المنتج");
      setSnackBarType("success");
    } catch (error) {
      if (error.response && error.response.status === 500) {
        setOpenSnackbar(true);
        setSnackbarMessage("خطأ في الوصول إلى قاعدة البيانات");
        setSnackBarType("error");
      } else {
        setOpenSnackbar(true);
        setSnackbarMessage("اسم العنصر او الباركود موجود بالفعل");
        setSnackBarType("error");
      }
    }
  };

  // Delete dialog item
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [selectedUserId, setSelectedUserId] = useState(null);
  const [deleteConfirmationText, setDeleteConfirmationText] = useState("");

  const handleDeleteClick = (id) => {
    setSelectedUserId(id);
    setDeleteDialogOpen(true);
    setDeleteConfirmationText("");
  };

  // Delete item
  const handleDelete = async () => {
    if (deleteConfirmationText.trim().toLowerCase() === "نعم") {
      try {
        await deleteWarehouse(selectedUserId).unwrap();
        await refetch();

        setOpenSnackbar(true);
        setSnackbarMessage("تم حذف المنتج");
        setSnackBarType("success");
        setDeleteConfirmationText("");
        setSelectedUserId(null);
        setDeleteDialogOpen(false);
      } catch (error) {
        if (error.response && error.response.status === 500) {
          setOpenSnackbar(true);
          setSnackbarMessage("خطأ في الوصول إلى قاعدة البيانات");
          setSnackBarType("error");
        } else {
          setOpenSnackbar(true);
          setSnackbarMessage(
            "فشل حذف المنتج قد يكون هناك بيانات تتعلق به او انه غير موجود بالفعل"
          );
          setSnackBarType("error");
        }
      }
    }
  };

  // Delete dialog location
  const [deleteDialogLocationOpen, setDeleteDialogLocationOpen] =
    useState(false);
  const [selectedLocationId, setSelectedLocationId] = useState(0);
  const [deleteLocationConfirmationText, setDeleteLocationConfirmationText] =
    useState("");
  const handleDeleteLocationClick = async (location, id) => {
    if (!location || location.trim() === "") {
      setSelectedLocationId(id);
      await handleDeleteLocation(id);
      return;
    }
    setSelectedLocationId(id);
    setDeleteDialogLocationOpen(true);
    setDeleteLocationConfirmationText("");
  };

  // Delete location
  const handleDeleteLocation = async (id) => {
    const filteredLocations = editingItem.locations.filter((item, idx) => {
      return idx !== id;
    });
    setEditingItem({
      ...editingItem,
      locations: filteredLocations,
    });
    setDeleteLocationConfirmationText("");
    setSelectedLocationId(null);
    setDeleteDialogLocationOpen(false);
  };

  // Manage Details component
  const [isItemDetailsOpen, setIsItemDetailsOpen] = useState(false);
  const [ItemId, setItemId] = useState(null);
  const showItemDetails = (id) => {
    setItemId(id);
    setIsItemDetailsOpen(true);
  };

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
    if (
      user?.username === "admin" ||
      user?.items_can_edit ||
      user?.items_can_add ||
      user?.items_can_delete
    ) {
      return (
        <div className={styles.container}>
          {/* Title */}
          <div>
            <h1 className={styles.title}>المنتجات</h1>
          </div>

          {/* Delete dialog item */}
          <DeleteRow
            deleteDialogOpen={deleteDialogOpen}
            setDeleteDialogOpen={setDeleteDialogOpen}
            deleteConfirmationText={deleteConfirmationText}
            setDeleteConfirmationText={setDeleteConfirmationText}
            handleDelete={handleDelete}
            message={"هل أنت متأكد من رغبتك في حذف هذا العنصر؟"}
            loader={isDeleting}
          />

          {/* Delete dialog location */}
          <DeleteRow
            deleteDialogOpen={deleteDialogLocationOpen}
            setDeleteDialogOpen={setDeleteDialogLocationOpen}
            deleteConfirmationText={deleteLocationConfirmationText}
            setDeleteConfirmationText={setDeleteLocationConfirmationText}
            handleDelete={() => handleDeleteLocation(selectedLocationId)}
            message={"هل أنت متأكد من رغبتك في حذف هذا الموقع؟"}
            isNessary={false}
          />

          {/* Table */}
          <CustomDataGrid
            rows={warehousesData.warehouses}
            type="items"
            columns={columns}
            paginationModel={paginationModel}
            onPageChange={handlePageChange}
            pageCount={warehousesData.total_pages}
            setOpenDialog={setOpenDialog}
            loader={isMachinesLoading}
            initialItems={warehousesData.warehouses}
            addPermissions={
              user?.items_can_add || user?.username === "admin" || false
            }
          />

          {/* Add dialog */}
          <Dialog
            open={openDialog}
            onClose={() => {
              setOpenDialog(false);
              setErrors({});
            }}
            sx={{
              marginTop: "30px",
              zIndex: "99999",
            }}
          >
            <DialogTitle
              sx={{
                textAlign: "center",
              }}
            >
              إضافة عنصر جديد
            </DialogTitle>
            <DialogContent sx={{ width: "500px" }}>
              <div style={{ marginBottom: "10px", marginTop: "10px" }}>
                <label
                  style={{
                    display: "block",
                    marginBottom: "5px",
                    textAlign: "right",
                    fontWeight: "bold",
                    color: errors.item_name ? "#d32f2f" : "#555",
                  }}
                >
                  الاسم
                </label>
                <input
                  type="text"
                  value={newItem.item_name}
                  onChange={(e) =>
                    setNewItem({ ...newItem, item_name: e.target.value })
                  }
                  style={{
                    width: "100%",
                    padding: "10px",
                    fontSize: "1rem",
                    border: errors.item_name
                      ? "1px solid #d32f2f"
                      : "1px solid #ccc",
                    borderRadius: "4px",
                    direction: "rtl",
                    textAlign: "right",
                    outline: "none",
                    transition: "border-color 0.2s",
                  }}
                  onFocus={(e) => (e.target.style.borderColor = "#1976d2")}
                  onBlur={(e) => (e.target.style.borderColor = "#ccc")}
                />
                {errors.item_name && (
                  <span
                    style={{
                      color: "#d32f2f",
                      fontSize: "0.875rem",
                      marginTop: "5px",
                      display: "block",
                      textAlign: "right",
                    }}
                  >
                    {errors.item_name}
                  </span>
                )}
              </div>

              <div style={{ marginBottom: "10px", marginTop: "10px" }}>
                <label
                  style={{
                    display: "block",
                    marginBottom: "5px",
                    textAlign: "right",
                    fontWeight: "bold",
                    color: errors.item_bar ? "#d32f2f" : "#555",
                  }}
                >
                  الباركود
                </label>
                <input
                  type="text"
                  value={newItem.item_bar}
                  onChange={(e) =>
                    setNewItem({ ...newItem, item_bar: e.target.value })
                  }
                  style={{
                    width: "100%",
                    padding: "10px",
                    fontSize: "1rem",
                    border: errors.item_bar
                      ? "1px solid #d32f2f"
                      : "1px solid #ccc",
                    borderRadius: "4px",
                    direction: "rtl",
                    textAlign: "right",
                    outline: "none",
                    transition: "border-color 0.2s",
                  }}
                  onFocus={(e) => (e.target.style.borderColor = "#1976d2")}
                  onBlur={(e) => (e.target.style.borderColor = "#ccc")}
                />
                {errors.item_bar && (
                  <span
                    style={{
                      color: "#d32f2f",
                      fontSize: "0.875rem",
                      marginTop: "5px",
                      display: "block",
                      textAlign: "right",
                    }}
                  >
                    {errors.item_bar}
                  </span>
                )}
              </div>

              <div style={{ marginBottom: "10px", marginTop: "10px" }}>
                <label
                  style={{
                    display: "block",
                    marginBottom: "5px",
                    textAlign: "right",
                    fontWeight: "bold",
                    color: errors?.locations?.[0]?.location
                      ? "#d32f2f"
                      : "#555",
                  }}
                >
                  الموقع
                </label>
                <input
                  type="text"
                  value={newItem?.locations?.[0]?.location || ""}
                  onChange={(e) => {
                    const updatedLocations = [...newItem.locations];
                    updatedLocations[0].location = e.target.value;
                    setNewItem({ ...newItem, locations: updatedLocations });
                  }}
                  style={{
                    width: "100%",
                    padding: "10px",
                    fontSize: "1rem",
                    border: `1px solid ${
                      errors?.locations?.[0]?.location ? "#d32f2f" : "#ccc"
                    }`,
                    borderRadius: "4px",
                    direction: "rtl",
                    textAlign: "right",
                    outline: "none",
                    transition: "border-color 0.2s",
                  }}
                  onFocus={(e) => (e.target.style.borderColor = "#1976d2")}
                  onBlur={(e) => (e.target.style.borderColor = "#ccc")}
                />
                {errors?.locations?.[0]?.location && (
                  <span
                    style={{
                      color: "#d32f2f",
                      fontSize: "0.875rem",
                      marginTop: "5px",
                      display: "block",
                      textAlign: "right",
                    }}
                  >
                    {errors.locations[0].location}
                  </span>
                )}
              </div>

              <DialogActions
                sx={{
                  display: "flex",
                  justifyContent: "space-around",
                }}
              >
                <Button
                  variant="contained"
                  color="error"
                  onClick={() => {
                    setOpenDialog(false);
                    setNewItem({
                      item_name: "",
                      item_bar: "",
                      locations: [
                        {
                          location: "",
                          quantity: 0,
                        },
                      ],
                    });
                    setErrors({});
                  }}
                  className={`${styles.cancelCommentButton} ${styles.infoBtn}`}
                >
                  الغاء
                </Button>
                <Button
                  variant="contained"
                  color="primary"
                  onClick={handleAddItem}
                  className={`${styles.saveButton} ${styles.infoBtn}`}
                  disabled={isAdding}
                >
                  {isAdding ? <CircularProgress size={25} /> : "إضافة"}
                </Button>
              </DialogActions>
            </DialogContent>
          </Dialog>

          {/* Invoice data */}
          <Modal
            open={isModalOpen}
            onClose={closeModal}
            aria-labelledby="modal-title"
            aria-describedby="modal-description"
            sx={{ zIndex: "99999" }}
          >
            <Box
              sx={{
                position: "absolute",
                top: "50%",
                left: "50%",
                transform: "translate(-50%, -50%)",
                width: "500px",
                bgcolor: "#fff",
                boxShadow: 24,
                backgroundColor: "#f6f6f6",
                p: 4,
                borderRadius: 2,
                maxHeight: "75vh",
                overflowY: "auto",
                "&::-webkit-scrollbar": {
                  width: "8px",
                },
                "&::-webkit-scrollbar-thumb": {
                  backgroundColor: primaryColor,
                  borderRadius: "10px",
                },
                "&::-webkit-scrollbar-thumb:hover": {
                  backgroundColor: "#145a9c",
                },
                "&::-webkit-scrollbar-track": {
                  backgroundColor: "#f0f0f0",
                  borderRadius: "10px",
                },
              }}
            >
              <h5
                id="modal-title"
                variant="h6"
                component="h2"
                style={{
                  textAlign: "center",
                  fontWeight: "bold",
                  fontSize: "1.2rem",
                  marginBottom: "16px",
                  color: "#1976d2",
                  position: "relative",
                  margin: "0 0 20px 0",
                }}
              >
                تفاصيل المنتج
                {isEditingItem ? (
                  <div>
                    <button
                      onClick={() => {
                        setIsEditingItem(false);
                      }}
                      className={styles.iconBtn}
                      style={{
                        position: "absolute",
                        top: "0px",
                        left: "-10px",
                      }}
                    >
                      <ClearOutlinedIcon
                        sx={{
                          fontSize: "30px",
                          color: "#d32f2f",
                        }}
                      />
                    </button>
                    <button
                      disabled={isUpdating}
                      onClick={() => {
                        handleSave();
                      }}
                      className={styles.iconBtn}
                      style={{
                        color: "#1976d2",
                        position: "absolute",
                        top: "0px",
                        left: "20px",
                      }}
                    >
                      {isUpdating ? (
                        <CircularProgress size={25} />
                      ) : (
                        <SaveIcon />
                      )}
                    </button>
                  </div>
                ) : (
                  <button
                    onClick={() => {
                      if (user?.items_can_edit || user?.username === "admin") {
                        setIsEditingItem(true);
                        setEditingItem(selectedItem);
                      } else {
                        setOpenSnackbar(true);
                        setSnackbarMessage("ليس لديك صلاحيات لإضافة عنصر");
                        setSnackBarType("info");
                      }
                    }}
                    className={styles.iconBtn}
                    style={{
                      color: "#1976d2",
                      position: "absolute",
                      top: "0px",
                      left: "-7px",
                    }}
                  >
                    <EditIcon />
                  </button>
                )}
              </h5>
              {selectedItem && (
                <Box id="modal-description" sx={{ direction: "rtl" }}>
                  <Box
                    style={{
                      display: "flex",
                      m: 1.5,
                    }}
                  >
                    <h5
                      style={{
                        fontWeight: "bold",
                        minWidth: "150px",
                        color: "#717171",
                      }}
                    >
                      اسم المنتج:
                    </h5>
                    <h5 style={{ flex: 1 }}>
                      {isEditingItem ? (
                        <input
                          type="text"
                          value={editingItem.item_name}
                          onChange={(e) =>
                            setEditingItem({
                              ...editingItem,
                              item_name: e.target.value,
                            })
                          }
                          style={{
                            width: "100%",
                            outline: "none",
                            fontSize: "15px",
                            textAlign: "right",
                            border: "none",
                            padding: "10px",
                          }}
                        />
                      ) : (
                        selectedItem.item_name
                      )}
                    </h5>
                  </Box>
                  <Divider />
                  <Box
                    style={{
                      display: "flex",
                      m: 1.5,
                    }}
                  >
                    <h5
                      style={{
                        fontWeight: "bold",
                        minWidth: "150px",
                        color: "#717171",
                      }}
                    >
                      باركود المنتج:
                    </h5>
                    <h5 style={{ flex: 1 }}>
                      {isEditingItem ? (
                        <input
                          type="text"
                          value={editingItem.item_bar}
                          onChange={(e) =>
                            setEditingItem({
                              ...editingItem,
                              item_bar: e.target.value,
                            })
                          }
                          style={{
                            width: "100%",
                            outline: "none",
                            fontSize: "15px",
                            textAlign: "right",
                            border: "none",
                            padding: "10px",
                          }}
                        />
                      ) : (
                        selectedItem.item_bar
                      )}
                    </h5>
                  </Box>
                  <Divider />

                  <List sx={{ marginTop: 1 }}>
                    {(
                      (isEditingItem && editingItem) ||
                      selectedItem
                    ).locations.map((item, index) => (
                      <ListItem
                        key={index}
                        sx={{
                          display: "flex",
                          flexDirection: "column",
                          backgroundColor: "#fafafa",
                          borderRadius: "5px",
                          marginBottom: "15px",
                          boxShadow: "0 2px 4px rgba(0, 0, 0, 0.42)",
                          position: "relative",
                        }}
                      >
                        {isEditingItem ? (
                          <button
                            onClick={(e) =>
                              handleDeleteLocationClick(item.location, index)
                            }
                            className={styles.iconBtn}
                            style={{
                              position: "absolute",
                              left: "0px",
                              top: "3px",
                            }}
                          >
                            <ClearOutlinedIcon
                              sx={{
                                fontSize: "30px",
                                color: "#d32f2f",
                              }}
                            />
                          </button>
                        ) : (
                          ""
                        )}
                        <Box
                          sx={{
                            display: "flex",
                            width: "100%",
                          }}
                        >
                          <h5
                            style={{
                              width: "100px",
                              fontWeight: "bold",
                              textAlign: "right",
                            }}
                          >
                            الموقع:
                          </h5>
                          <Box>
                            <h5>
                              {isEditingItem ? (
                                <input
                                  type="text"
                                  value={
                                    editingItem.locations[index]?.location || ""
                                  }
                                  onChange={(e) => {
                                    const updatedLocations = [
                                      ...editingItem.locations,
                                    ];
                                    updatedLocations[index] = {
                                      ...updatedLocations[index],
                                      location: e.target.value,
                                    };
                                    setEditingItem({
                                      ...editingItem,
                                      locations: updatedLocations,
                                    });
                                  }}
                                  style={{
                                    width: "100%",
                                    outline: "none",
                                    fontSize: "15px",
                                    textAlign: "right",
                                    border: "none",
                                    padding: "10px",
                                  }}
                                />
                              ) : (
                                item.location
                              )}
                            </h5>
                          </Box>
                        </Box>
                        <Box
                          sx={{
                            display: "flex",
                            width: "100%",
                          }}
                        >
                          <h5
                            style={{
                              width: "100px",
                              fontWeight: "bold",
                              textAlign: "right",
                            }}
                          >
                            الكمية:
                          </h5>
                          <Box>
                            <h5
                              style={{ paddingRight: isEditingItem && "10px" }}
                            >
                              {item.quantity}
                            </h5>
                          </Box>
                        </Box>
                      </ListItem>
                    ))}
                    {isEditingItem && (
                      <button
                        onClick={() => {
                          const newItem = {
                            location: "",
                            quantity: 0,
                          };
                          setEditingItem({
                            ...editingItem,
                            locations: [...editingItem.locations, newItem],
                          });
                        }}
                        className={styles.iconBtn}
                        style={{
                          padding: "4px",
                          backgroundColor: "#1976d2",
                          color: "white",
                          borderRadius: "50%",
                          border: "none",
                          cursor: "pointer",
                          display: "flex",
                          alignItems: "center",
                        }}
                      >
                        <AddIcon sx={{ fontSize: "30px" }} />
                      </button>
                    )}
                  </List>
                </Box>
              )}

              <Box sx={{ mt: 3, textAlign: "center" }}>
                <Button
                  onClick={closeModal}
                  variant="contained"
                  color="primary"
                  sx={{
                    borderRadius: "20px",
                    padding: "8px 20px",
                  }}
                >
                  إغلاق
                </Button>
              </Box>
            </Box>
          </Modal>

          {/* Invoice details data */}
          {isItemDetailsOpen && (
            <ItemeDetails
              open={isItemDetailsOpen}
              onClose={() => setIsItemDetailsOpen(false)}
              id={ItemId}
            />
          )}

          {/* Snackbar */}
          <SnackBar
            open={openSnackbar}
            message={snackbarMessage}
            type={snackBarType}
            onClose={handleCloseSnackbar}
          />
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
