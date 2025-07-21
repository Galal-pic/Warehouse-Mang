import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  Box,
  Table,
  TableBody,
  TableRow,
  TableCell,
  IconButton,
  CircularProgress,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
} from "@mui/material";
import ClearOutlinedIcon from "@mui/icons-material/ClearOutlined";
import AddIcon from "@mui/icons-material/Add";
import KeyboardReturnIcon from "@mui/icons-material/KeyboardReturn";
import CustomAutoCompleteField from "../customAutoCompleteField/CustomAutoCompleteField";
import NumberInput from "../number/NumberInput";
import styles from "./Invoices.module.css";
import logo from "./logo.png";
import SnackBar from "../snackBar/SnackBar";
import {
  useGetWarehousesQuery,
  useReturnWarrantyInvoicePartiallyMutation,
  useReturnWarrantyInvoiceMutation,
} from "../../pages/services/invoice&warehouseApi";

export default function CustodyInvoiceModal({
  selectedInvoice,
  isEditingInvoice,
  editingInvoice,
  setEditingInvoice,
  show,
  selectedNowType,
  addRow,
  handleDeleteItemClick,
  isPurchasesType = false,
  isCreate = false,
  showCommentField = false,
  className = "",
  justEditUnitPrice = false,
  canEsterdad = false,
  setSelectedInvoice = null,
}) {
  const isAmanatType =
    selectedNowType?.type === "أمانات" ||
    selectedInvoice?.type === "أمانات" ||
    editingInvoice?.type === "أمانات";

  const {
    data: warehouseData,
    isLoading: isWarehousesLoading,
    refetch: refetchWarehouses,
  } = useGetWarehousesQuery(
    { all: true },
    { pollingInterval: 300000, skip: !isEditingInvoice || justEditUnitPrice }
  );
  const warehouse = warehouseData?.warehouses || [];

  const [
    returnWarrantyInvoicePartially,
    { data: amanatReturnInfo, isLoading: isReturnLoading },
  ] = useReturnWarrantyInvoicePartiallyMutation();
  const [returnWarrantyInvoice] = useReturnWarrantyInvoiceMutation();

  const [isInitialLoading, setIsInitialLoading] = useState(true);
  const [isFetchError, setIsFetchError] = useState(false);
  const lastFetchedInvoiceId = useRef(null);
  const isFetching = useRef(false);
  const [loadingItems, setLoadingItems] = useState([]);

  const [openReturnDialog, setOpenReturnDialog] = useState(false);
  const [selectedItemIndex, setSelectedItemIndex] = useState(null);
  const [returnQuantity, setReturnQuantity] = useState("");
  const [openSnackbar, setOpenSnackbar] = useState(false);
  const [snackbarMessage, setSnackbarMessage] = useState("");
  const [snackBarType, setSnackBarType] = useState("");

  const handleCloseSnackbar = () => setOpenSnackbar(false);

  const handleOpenReturnDialog = (index) => {
    setSelectedItemIndex(index);
    setReturnQuantity("");
    setOpenReturnDialog(true);
  };

  const handleCloseReturnDialog = () => {
    setOpenReturnDialog(false);
    setSelectedItemIndex(null);
    setReturnQuantity("");
  };

  const handleReturnItem = async () => {
    if (!selectedItemIndex && selectedItemIndex !== 0) return;

    const item = selectedInvoice.items[selectedItemIndex];
    const quantityToReturn = parseInt(returnQuantity, 10);

    if (isNaN(quantityToReturn) || quantityToReturn <= 0) {
      setSnackbarMessage("يرجى إدخال كمية صالحة للاسترداد");
      setSnackBarType("error");
      setOpenSnackbar(true);
      return;
    }

    if (quantityToReturn > item.quantity - (item.total_returned || 0)) {
      setSnackbarMessage(
        `الكمية المستردة لا يمكن أن تتجاوز ${
          item.quantity - (item.total_returned || 0)
        }`
      );
      setSnackBarType("error");
      setOpenSnackbar(true);
      return;
    }

    const updatedLoadingItems = [...loadingItems];
    updatedLoadingItems[selectedItemIndex] = true;
    setLoadingItems(updatedLoadingItems);

    try {
      await returnWarrantyInvoicePartially({
        id: selectedInvoice.id,
        items: [
          {
            item_name: item.item_name,
            barcode: item.barcode,
            location: item.location,
            return_quantity: quantityToReturn,
          },
        ],
      }).unwrap();

      setSelectedInvoice((prev) => ({
        ...prev,
        items: prev.items.map((row, idx) =>
          idx === selectedItemIndex
            ? {
                ...row,
                total_returned: (row.total_returned || 0) + quantityToReturn,
                is_fully_returned:
                  row.quantity === (row.total_returned || 0) + quantityToReturn,
              }
            : row
        ),
      }));

      setSnackbarMessage("تم استرداد العنصر بنجاح");
      setSnackBarType("success");
      setOpenSnackbar(true);
    } catch (error) {
      console.error("خطأ في استرداد العنصر:", error);
      setSnackbarMessage("فشل في استرداد العنصر");
      setSnackBarType("error");
      setOpenSnackbar(true);
    } finally {
      updatedLoadingItems[selectedItemIndex] = false;
      setLoadingItems(updatedLoadingItems);
      handleCloseReturnDialog();
    }
  };

  useEffect(() => {
    if (
      selectedInvoice?.id &&
      canEsterdad &&
      isAmanatType &&
      selectedInvoice.id !== lastFetchedInvoiceId.current &&
      !isFetching.current
    ) {
      isFetching.current = true;
      setIsInitialLoading(true);
      setIsFetchError(false);
      returnWarrantyInvoicePartially({ id: selectedInvoice.id })
        .unwrap()
        .then((updatedAmanatReturnInfo) => {
          setSelectedInvoice((prev) => ({
            ...prev,
            items: prev.items.map((item) => ({
              ...item,
              is_fully_returned:
                updatedAmanatReturnInfo?.items?.find(
                  (retItem) =>
                    retItem.item_name === item.item_name &&
                    retItem.item_bar === item.barcode &&
                    retItem.location === item.location
                )?.is_fully_returned ||
                item.is_fully_returned ||
                false,
              total_returned:
                updatedAmanatReturnInfo?.items?.find(
                  (retItem) =>
                    retItem.item_name === item.item_name &&
                    retItem.item_bar === item.barcode &&
                    retItem.location === item.location
                )?.total_returned ||
                item.total_returned ||
                0,
            })),
          }));
          lastFetchedInvoiceId.current = selectedInvoice.id;
        })
        .catch((error) => {
          console.error(
            "خطأ في استدعاء /invoice/{id}/WarrantyReturnStatus:",
            error
          );
          setSnackBarType("error");
          setSnackbarMessage("فشل في جلب بيانات الاسترداد");
          setOpenSnackbar(true);
          setIsFetchError(true);
        })
        .finally(() => {
          setIsInitialLoading(false);
          isFetching.current = false;
        });
    } else {
      setIsInitialLoading(false);
      setIsFetchError(false);
    }
  }, [
    selectedInvoice.id,
    canEsterdad,
    isAmanatType,
    returnWarrantyInvoicePartially,
    setSelectedInvoice,
  ]);

  const warehouseMap = useMemo(() => {
    const map = new Map();
    if (!Array.isArray(warehouse)) return map;
    warehouse.forEach((item) =>
      map.set(item.item_name.trim().toLowerCase(), item)
    );
    return map;
  }, [warehouse]);

  const itemNames = useMemo(
    () =>
      Array.isArray(warehouse) ? warehouse.map((item) => item.item_name) : [],
    [warehouse]
  );

  useEffect(() => {
    if (isEditingInvoice && warehouseMap && editingInvoice) {
      const updatedItems = editingInvoice.items.map((item) => {
        const warehouseItem = warehouseMap.get(
          item.item_name?.trim()?.toLowerCase()
        );
        const availableLocations = warehouseItem?.locations || [];
        let maxquantity =
          warehouseItem?.locations?.find(
            (loc) => loc.location === item.location
          )?.quantity || 0;
        return { ...item, availableLocations, maxquantity };
      });
      setEditingInvoice((prev) => ({ ...prev, items: updatedItems }));
    }
  }, [warehouseMap, editingInvoice, setEditingInvoice, isEditingInvoice]);

  useEffect(() => {
    if (isEditingInvoice) refetchWarehouses();
  }, [isEditingInvoice, refetchWarehouses]);

  return (
    <>
      <div
        className={`${className} ${styles.printableBox}`}
        style={{
          backgroundColor: isCreate && "white",
          padding: isCreate && "10px 35px",
        }}
      >
        <Box className={styles.headerSection}>
          <Box className={styles.logoBox}>
            <img src={logo} alt="Logo" className={styles.logoImage} />
          </Box>
          <Box className={styles.operationTypeBox}>
            <Box className={styles.operationTypeName}>
              {selectedInvoice.type}
            </Box>
          </Box>
          <Box className={styles.infoBox}>
            <Box className={styles.infoItem}>
              <Box className={styles.infoLabel}>رقم السند:</Box>
              <Box className={styles.infoValue}>{selectedInvoice.id}</Box>
            </Box>
            <Box className={styles.infoItem}>
              <Box className={styles.infoLabel}>التاريخ</Box>
              <Box className={styles.infoValue}>{selectedInvoice.date}</Box>
            </Box>
            <Box className={styles.infoItem}>
              <Box className={styles.infoLabel}>الوقت</Box>
              <Box className={styles.infoValue}>{selectedInvoice.time}</Box>
            </Box>
          </Box>
        </Box>
        <Box className={styles.tableSection} sx={{ direction: "rtl" }}>
          <Table
            className={styles.customTable}
            sx={{
              "& .MuiTableCell-root": {
                border: "1px solid #b2b0b0",
                padding: "12px",
                textAlign: "center",
              },
            }}
          >
            <TableBody>
              <TableRow>
                <TableCell className={styles.tableCell}>
                  <AddIcon
                    onClick={
                      isEditingInvoice && !justEditUnitPrice ? addRow : null
                    }
                    className={styles.addIcon}
                    sx={{
                      cursor:
                        isEditingInvoice && !justEditUnitPrice
                          ? "pointer"
                          : "not-allowed",
                    }}
                  />
                </TableCell>
                <TableCell className={styles.tableCell}>اسم الصنف</TableCell>
                <TableCell className={styles.tableCell}>الرمز</TableCell>
                <TableCell className={styles.tableCell}>الموقع</TableCell>
                <TableCell className={styles.tableCell}>الكمية</TableCell>
                {canEsterdad && isAmanatType && (
                  <TableCell className={styles.tableCell}>
                    الكمية المستردة
                  </TableCell>
                )}
                <TableCell className={styles.tableCell}>بيان</TableCell>
              </TableRow>
              {(isEditingInvoice
                ? editingInvoice.items
                : selectedInvoice.items
              ).map((row, index) => (
                <TableRow key={index}>
                  <TableCell
                    sx={{ position: "relative", width: "10px !important" }}
                    className={styles.tableCellRow}
                  >
                    {index + 1}
                    {isEditingInvoice && !justEditUnitPrice && (
                      <button
                        onClick={() => handleDeleteItemClick(index)}
                        className={styles.clearIcon}
                      >
                        <ClearOutlinedIcon fontSize="small" />
                      </button>
                    )}
                    {isAmanatType &&
                      canEsterdad &&
                      (((isInitialLoading || loadingItems[index]) &&
                        !isFetchError) ||
                      row.is_fully_returned === undefined ? (
                        <CircularProgress
                          className={styles.clearIcon}
                          size={22}
                          sx={{
                            position: "absolute",
                            right: "-25px",
                            top: "5px",
                            cursor: "default",
                          }}
                        />
                      ) : (
                        !isInitialLoading &&
                        !isFetchError &&
                        row.is_fully_returned !== undefined &&
                        !row.is_fully_returned &&
                        !amanatReturnInfo?.items?.find(
                          (item) =>
                            item.item_name === row.item_name &&
                            item.item_bar === row.barcode &&
                            item.location === row.location &&
                            item.is_fully_returned
                        ) &&
                        canEsterdad &&
                        isAmanatType &&
                        selectedInvoice?.status !== "returned" &&
                        selectedInvoice?.status !== "تم الاسترداد" && (
                          <button
                            onClick={() => handleOpenReturnDialog(index)}
                            className={styles.clearIcon}
                            title="استرداد العنصر"
                          >
                            <KeyboardReturnIcon fontSize="small" />
                          </button>
                        )
                      ))}
                  </TableCell>
                  <TableCell
                    className={styles.tableCellRow}
                    sx={{
                      "&.MuiTableCell-root": {
                        padding: "0px",
                        whiteSpace: "normal",
                        wordBreak: "break-word",
                      },
                    }}
                  >
                    {isEditingInvoice && !justEditUnitPrice ? (
                      <CustomAutoCompleteField
                        isBig={true}
                        isLoading={isWarehousesLoading}
                        values={itemNames || []}
                        editingItem={row}
                        setEditingItem={(newItem) => {
                          const normalizedValue = newItem.item_name
                            .trim()
                            .toLowerCase();
                          const selectedItem = Array.from(
                            warehouseMap.values()
                          ).find(
                            (item) =>
                              item.item_name.trim().toLowerCase() ===
                              normalizedValue
                          );
                          const updatedItems = [...editingInvoice.items];
                          updatedItems[index] = {
                            ...updatedItems[index],
                            item_name:
                              selectedItem?.item_name || newItem.item_name,
                            barcode: selectedItem?.item_bar || "",
                            location: "",
                            quantity: 0,
                            unit_price: 0,
                            total_price: 0,
                            availableLocations: selectedItem?.locations || [],
                            maxquantity: 0,
                          };
                          setEditingInvoice({
                            ...editingInvoice,
                            items: updatedItems,
                          });
                        }}
                        fieldName="item_name"
                        placeholder="اسم العنصر"
                      />
                    ) : (
                      row.item_name
                    )}
                  </TableCell>
                  <TableCell className={styles.tableCellRow}>
                    {row.barcode}
                  </TableCell>
                  <TableCell
                    className={styles.tableCellRow}
                    sx={{
                      "&.MuiTableCell-root": {
                        padding: "0px",
                        maxWidth: "200px",
                        whiteSpace: "normal",
                        wordBreak: "break-word",
                      },
                    }}
                  >
                    {isEditingInvoice && !justEditUnitPrice ? (
                      <CustomAutoCompleteField
                        loading={row.item_name === "" ? false : true}
                        values={row?.availableLocations || []}
                        editingItem={row}
                        setEditingItem={(newItem) => {
                          if (!newItem.location) return;
                          const matchedItem = editingInvoice?.items?.find(
                            (row11) =>
                              row11.barcode === row.barcode &&
                              row11.location === newItem.location
                          );
                          if (matchedItem) {
                            setSnackbarMessage("هذا العنصر موجود بالفعل");
                            setSnackBarType("info");
                            setOpenSnackbar(true);
                            return;
                          }
                          const maxquantity = newItem?.quantity || 0;
                          const updatedItems = [...editingInvoice.items];
                          updatedItems[index] = {
                            ...updatedItems[index],
                            location: newItem?.location || "",
                            quantity: 0,
                            unit_price: 0,
                            total_price: 0,
                            maxquantity,
                          };
                          setEditingInvoice({
                            ...editingInvoice,
                            items: updatedItems,
                          });
                        }}
                        fieldName="location"
                        placeholder="الموقع"
                      />
                    ) : (
                      row.location
                    )}
                  </TableCell>
                  <TableCell
                    className={styles.tableCellRow}
                    sx={{ width: "100px" }}
                  >
                    {isEditingInvoice ? (
                      <NumberInput
                        style={{
                          width: "100px",
                          outline: "none",
                          fontSize: "15px",
                          textAlign: "center",
                          border: "none",
                          padding: "10px",
                        }}
                        value={row?.quantity}
                        onInput={(e) => {
                          if (e.target.value < 0) e.target.value = 0;
                          if (e.target.value > row.maxquantity) {
                            e.target.value = row.maxquantity;
                            setSnackbarMessage(
                              `الكمية القصوى المسموح بها هي ${row.maxquantity}`
                            );
                            setSnackBarType("warning");
                            setOpenSnackbar(true);
                          }
                        }}
                        onClick={(event) => {
                          if (
                            row.location === undefined ||
                            row.location === ""
                          ) {
                            setSnackbarMessage("يجب تحديد موقع العنصر أولا");
                            setSnackBarType("info");
                            setOpenSnackbar(true);
                            event.target.blur();
                            return;
                          }
                        }}
                        onDoubleClick={(event) => {
                          if (
                            row.location === undefined ||
                            row.location === ""
                          ) {
                            setSnackbarMessage("يجب تحديد موقع العنصر أولا");
                            setSnackBarType("info");
                            setOpenSnackbar(true);
                            event.target.blur();
                            return;
                          }
                        }}
                        onChange={(e) => {
                          if (
                            row.location === undefined ||
                            row.location === ""
                          ) {
                            setSnackbarMessage("يجب تحديد موقع العنصر أولا");
                            setSnackBarType("info");
                            setOpenSnackbar(true);
                            e.target.blur();
                            return;
                          }
                          const newQuantity = Math.max(
                            0,
                            Number(e.target.value)
                          );
                          const updatedItems = [...editingInvoice.items];
                          updatedItems[index] = {
                            ...row,
                            quantity: e.target.value,
                            total_price: 0,
                          };
                          setEditingInvoice({
                            ...editingInvoice,
                            items: updatedItems,
                          });
                        }}
                      />
                    ) : (
                      row.quantity
                    )}
                  </TableCell>
                  {canEsterdad && isAmanatType && (
                    <TableCell
                      className={styles.tableCellRow}
                      sx={{
                        position: "relative",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        minWidth: "80px",
                        padding: "8px",
                        transition: "all 0.3s ease",
                      }}
                    >
                      {((isInitialLoading || loadingItems[index]) &&
                        !isFetchError) ||
                      row.is_fully_returned === undefined ? (
                        <Box
                          sx={{
                            display: "flex",
                            alignItems: "center",
                            gap: "8px",
                            justifyContent: "center",
                          }}
                        >
                          <CircularProgress
                            size={20}
                            sx={{ color: "#1976d2", cursor: "default" }}
                          />
                          <span
                            style={{
                              fontSize: "14px",
                              color: "#666",
                              fontWeight: 400,
                            }}
                          >
                            جارٍ التحميل...
                          </span>
                        </Box>
                      ) : (
                        <span
                          style={{
                            fontSize: "16px",
                            color: "#333",
                            fontWeight: 500,
                            textAlign: "center",
                          }}
                        >
                          {row.total_returned || 0}
                        </span>
                      )}
                    </TableCell>
                  )}
                  <TableCell
                    className={styles.tableCellRow}
                    sx={{
                      maxWidth: "200px",
                      whiteSpace: "normal",
                      wordWrap: "break-word",
                    }}
                  >
                    {isEditingInvoice && !justEditUnitPrice ? (
                      <textarea
                        style={{
                          width: "100%",
                          outline: "none",
                          fontSize: "15px",
                          textAlign: "right",
                          border: "none",
                          padding: "10px",
                          whiteSpace: "normal",
                          wordWrap: "break-word",
                          resize: "none",
                        }}
                        value={row?.description || row.description}
                        onChange={(e) => {
                          const updatedItems = [...editingInvoice.items];
                          updatedItems[index] = {
                            ...row,
                            description: e.target.value,
                          };
                          setEditingInvoice({
                            ...editingInvoice,
                            items: updatedItems,
                          });
                        }}
                      />
                    ) : (
                      row.description
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </Box>
        {(!isCreate || showCommentField) &&
          (!isEditingInvoice || justEditUnitPrice ? (
            selectedInvoice.comment && (
              <Box className={styles.commentFieldBox}>
                {selectedInvoice.comment}
              </Box>
            )
          ) : (
            <Box className={styles.commentFieldBox}>
              <input
                style={{
                  width: "100%",
                  outline: "none",
                  fontSize: "15px",
                  textAlign: "center",
                  border: "none",
                  padding: "10px",
                }}
                type="text"
                value={editingInvoice.comment}
                onChange={(e) =>
                  setEditingInvoice({
                    ...editingInvoice,
                    comment: e.target.value,
                  })
                }
              />
            </Box>
          ))}
        <Box className={styles.infoSection}>
          <Box className={styles.infoItemBox}>
            <Box className={styles.infoLabel}>اسم الموظف</Box>
            <Box className={styles.infoValue}>
              {selectedInvoice.employee_name}
            </Box>
          </Box>
          <Box className={styles.infoItemBox}>
            <Box className={styles.infoLabel}>اسم المستلم</Box>
            {isEditingInvoice && !justEditUnitPrice ? (
              <input
                style={{
                  width: "70%",
                  margin: "auto",
                  outline: "none",
                  fontSize: "15px",
                  textAlign: "center",
                  border: isCreate ? "2px solid #eee" : "none",
                  padding: "10px",
                }}
                type="text"
                value={editingInvoice.client_name}
                onChange={(e) =>
                  setEditingInvoice({
                    ...editingInvoice,
                    client_name: e.target.value,
                  })
                }
              />
            ) : (
              selectedInvoice.client_name
            )}
          </Box>
          <Box className={styles.infoItemBox}>
            <Box className={styles.infoLabel}>عامل المخازن</Box>
            <Box className={styles.infoValue}>
              {selectedInvoice.warehouse_manager}
            </Box>
          </Box>
        </Box>
      </div>
      <Dialog
        open={openReturnDialog}
        onClose={handleCloseReturnDialog}
        sx={{ direction: "rtl" }}
      >
        <DialogTitle>استرداد عنصر</DialogTitle>
        <DialogContent>
          <Box
            sx={{
              display: "flex",
              flexDirection: "column",
              gap: "16px",
              padding: "16px",
            }}
          >
            <Box>
              <span style={{ fontWeight: "bold" }}>اسم الصنف:</span>{" "}
              {selectedInvoice.items[selectedItemIndex]?.item_name}
            </Box>
            <Box>
              <span style={{ fontWeight: "bold" }}>الرمز:</span>{" "}
              {selectedInvoice.items[selectedItemIndex]?.barcode}
            </Box>
            <Box>
              <span style={{ fontWeight: "bold" }}>الموقع:</span>{" "}
              {selectedInvoice.items[selectedItemIndex]?.location}
            </Box>
            <Box>
              <span style={{ fontWeight: "bold" }}>
                الكمية المتاحة للاسترداد:
              </span>{" "}
              {(selectedInvoice.items[selectedItemIndex]?.quantity || 0) -
                (selectedInvoice.items[selectedItemIndex]?.total_returned || 0)}
            </Box>
            <NumberInput
              label="الكمية المستردة"
              value={returnQuantity}
              onChange={(e) => setReturnQuantity(e.target.value)}
              onInput={(e) => {
                if (e.target.value < 0) e.target.value = 0;
                if (
                  e.target.value >
                  (selectedInvoice.items[selectedItemIndex]?.quantity || 0) -
                    (selectedInvoice.items[selectedItemIndex]?.total_returned ||
                      0)
                ) {
                  e.target.value =
                    (selectedInvoice.items[selectedItemIndex]?.quantity || 0) -
                    (selectedInvoice.items[selectedItemIndex]?.total_returned ||
                      0);
                  setSnackbarMessage(
                    `الكمية القصوى المسموح بها هي ${
                      (selectedInvoice.items[selectedItemIndex]?.quantity ||
                        0) -
                      (selectedInvoice.items[selectedItemIndex]
                        ?.total_returned || 0)
                    }`
                  );
                  setSnackBarType("warning");
                  setOpenSnackbar(true);
                }
              }}
              style={{
                width: "100%",
                outline: "none",
                fontSize: "15px",
                textAlign: "center",
                border: "1px solid #ddd",
                padding: "10px",
              }}
            />
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseReturnDialog} color="secondary">
            إلغاء
          </Button>
          <Button
            onClick={handleReturnItem}
            color="primary"
            disabled={isReturnLoading}
          >
            {isReturnLoading ? (
              <CircularProgress size={24} />
            ) : (
              "تأكيد الاسترداد"
            )}
          </Button>
        </DialogActions>
      </Dialog>
      <SnackBar
        open={openSnackbar}
        message={snackbarMessage}
        type={snackBarType}
        onClose={handleCloseSnackbar}
      />
    </>
  );
}
