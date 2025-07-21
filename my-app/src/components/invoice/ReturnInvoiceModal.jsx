import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  Box,
  Table,
  TableBody,
  TableRow,
  TableCell,
  IconButton,
  Dialog,
  CircularProgress,
} from "@mui/material";
import ClearOutlinedIcon from "@mui/icons-material/ClearOutlined";
import AddIcon from "@mui/icons-material/Add";
import VisibilityIcon from "@mui/icons-material/Visibility";
import CustomAutoCompleteField from "../customAutoCompleteField/CustomAutoCompleteField";
import NumberInput from "../number/NumberInput";
import styles from "./Invoices.module.css";
import logo from "./logo.png";
import SnackBar from "../snackBar/SnackBar";
import {
  useGetInvoicesNumbersQuery,
  useGetWarehousesQuery,
  useGetInvoiceQuery,
} from "../../pages/services/invoice&warehouseApi";

export default function ReturnInvoiceModal({
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
}) {
  const isMortaga3Type =
    selectedNowType?.type === "مرتجع" ||
    selectedInvoice?.type === "مرتجع" ||
    editingInvoice?.type === "مرتجع";

  const {
    data: invoicesData,
    isLoading: isInvoiceNumbersLoading,
    refetch: refetcInvoicesNumbers,
    isError: isInvoiceNumbersError,
  } = useGetInvoicesNumbersQuery(undefined, {
    pollingInterval: 300000,
    skip: !isEditingInvoice || !isMortaga3Type || justEditUnitPrice,
  });

  const invoiceNumbers = invoicesData?.["sales-invoices"]?.map((number) =>
    number.toString()
  );

  const {
    data: warehouseData,
    isLoading: isWarehousesLoading,
    refetch: refetchWarehouses,
  } = useGetWarehousesQuery(
    { all: true },
    { pollingInterval: 300000, skip: !isEditingInvoice || justEditUnitPrice }
  );
  const warehouse = warehouseData?.warehouses || [];

  const [openOriginalInvoiceModal, setOpenOriginalInvoiceModal] =
    useState(false);
  const [selectedInvoiceId, setSelectedInvoiceId] = useState(null);

  const {
    data: originalInvoice,
    isLoading: isOriginalInvoiceLoading,
    isError: isOriginalInvoiceError,
  } = useGetInvoiceQuery(
    selectedInvoiceId || editingInvoice?.original_invoice_id,
    {
      skip:
        (!selectedInvoiceId && !editingInvoice?.original_invoice_id) ||
        justEditUnitPrice,
    }
  );

  const transformedInvoice = originalInvoice
    ? {
        ...originalInvoice,
        date: originalInvoice.created_at
          ? originalInvoice.created_at.split(" ")[0]
          : originalInvoice.date || "غير متوفر",
        time: originalInvoice.created_at
          ? new Date(
              `1970-01-01 ${originalInvoice.created_at.split(" ")[1]}`
            ).toLocaleTimeString("en-US", {
              hour12: true,
              hour: "numeric",
              minute: "2-digit",
            })
          : originalInvoice.time || "غير متوفر",
      }
    : null;

  const [openSnackbar, setOpenSnackbar] = useState(false);
  const [snackbarMessage, setSnackbarMessage] = useState("");
  const [snackBarType, setSnackBarType] = useState("");

  const handleCloseSnackbar = () => setOpenSnackbar(false);

  const handleOpenOriginalInvoice = (invoiceId) => {
    if (invoiceId) {
      setSelectedInvoiceId(invoiceId);
      setOpenOriginalInvoiceModal(true);
    } else {
      setSnackBarType("error");
      setSnackbarMessage("يرجى تحديد رقم الفاتورة أولاً");
      setOpenSnackbar(true);
    }
  };

  const handleCloseOriginalInvoiceModal = () => {
    setOpenOriginalInvoiceModal(false);
    setSelectedInvoiceId(null);
  };

  useEffect(() => {
    if (isInvoiceNumbersError) {
      setSnackBarType("error");
      setSnackbarMessage("فشل تحميل أرقام الفواتير");
      setOpenSnackbar(true);
    }
  }, [isInvoiceNumbersError]);

  useEffect(() => {
    if (isOriginalInvoiceError && openOriginalInvoiceModal) {
      setSnackBarType("error");
      setSnackbarMessage("فشل تحميل الفاتورة الأصلية");
      setOpenSnackbar(true);
      setOpenOriginalInvoiceModal(false);
    }
  }, [isOriginalInvoiceError]);

  const warehouseMap = useMemo(() => {
    const map = new Map();
    if (!Array.isArray(warehouse)) return map;
    warehouse.forEach((item) =>
      map.set(item.item_name.trim().toLowerCase(), item)
    );
    return map;
  }, [warehouse]);

  const itemNames = useMemo(() => {
    if (isMortaga3Type && originalInvoice?.items) {
      return originalInvoice.items.map((item) => item.item_name);
    }
    return Array.isArray(warehouse)
      ? warehouse.map((item) => item.item_name)
      : [];
  }, [warehouse, originalInvoice, isMortaga3Type]);

  useEffect(() => {
    if (isEditingInvoice && warehouseMap && editingInvoice) {
      const updatedItems = editingInvoice.items.map((item) => {
        const warehouseItem = warehouseMap.get(
          item.item_name?.trim()?.toLowerCase()
        );
        let availableLocations = warehouseItem?.locations || [];
        let maxquantity = item.maxquantity || 0;
        let unit_price = item.unit_price;
        let price_details = item.price_details || [];

        if (isMortaga3Type && originalInvoice?.items) {
          const originalItem = originalInvoice.items.find(
            (oi) =>
              oi.item_name.trim().toLowerCase() ===
              item.item_name?.trim()?.toLowerCase()
          );
          if (originalItem) {
            availableLocations = availableLocations.filter((loc) =>
              originalInvoice.items.some(
                (oi) =>
                  oi.item_name.trim().toLowerCase() ===
                    item.item_name?.trim()?.toLowerCase() &&
                  oi.location === loc.location
              )
            );
            if (item.location) {
              const originalLocationItem = originalInvoice.items.find(
                (oi) =>
                  oi.item_name.trim().toLowerCase() ===
                    item.item_name?.trim()?.toLowerCase() &&
                  oi.location === item.location
              );
              maxquantity = originalLocationItem
                ? originalLocationItem.quantity
                : 0;
              unit_price = originalLocationItem
                ? originalLocationItem.unit_price
                : 0;
              price_details = originalLocationItem
                ? originalLocationItem.price_details
                : [];
            }
          }
        }
        return {
          ...item,
          availableLocations,
          unit_price,
          price_details,
          maxquantity,
        };
      });

      const itemsChanged =
        JSON.stringify(updatedItems) !== JSON.stringify(editingInvoice.items);

      if (itemsChanged) {
        setEditingInvoice((prev) => ({
          ...prev,
          items: updatedItems,
          total_amount:
            isMortaga3Type && originalInvoice
              ? originalInvoice.total_amount
              : prev.total_amount,
        }));
      }
    }
  }, [
    warehouseMap,
    originalInvoice,
    isMortaga3Type,
    editingInvoice,
    setEditingInvoice,
    isEditingInvoice,
  ]);

  useEffect(() => {
    if (isEditingInvoice) refetcInvoicesNumbers();
    refetchWarehouses();
  }, [isEditingInvoice, refetcInvoicesNumbers, refetchWarehouses]);

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
              <TableRow className={styles.tableRow}>
                <TableCell className={styles.tableCell} colSpan={2}>
                  رقم الفاتورة
                </TableCell>
                <TableCell
                  className={styles.tableInputCell}
                  colSpan={6}
                  sx={{ padding: "0px !important" }}
                >
                  {isEditingInvoice && !justEditUnitPrice ? (
                    <>
                      <CustomAutoCompleteField
                        loading={isInvoiceNumbersLoading}
                        values={invoiceNumbers}
                        editingItem={editingInvoice}
                        setEditingItem={setEditingInvoice}
                        fieldName="original_invoice_id"
                        placeholder="رقم الفاتورة"
                      />
                      <IconButton
                        onClick={() =>
                          handleOpenOriginalInvoice(
                            editingInvoice.original_invoice_id
                          )
                        }
                        disabled={!editingInvoice.original_invoice_id}
                        sx={{
                          position: "absolute",
                          top: "50%",
                          left: "0",
                          transform: "translateY(-50%)",
                        }}
                      >
                        <VisibilityIcon />
                      </IconButton>
                    </>
                  ) : (
                    selectedInvoice.original_invoice_id || "-"
                  )}
                </TableCell>
              </TableRow>
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
                          const originalLocationItem =
                            originalInvoice?.items.find(
                              (oi) =>
                                oi.item_name.trim().toLowerCase() ===
                                  row.item_name?.trim()?.toLowerCase() &&
                                oi.location === newItem.location
                            );
                          const maxquantity = originalLocationItem
                            ? originalLocationItem.quantity
                            : 0;
                          const updatedItems = [...editingInvoice.items];
                          updatedItems[index] = {
                            ...updatedItems[index],
                            location: newItem?.location || "",
                            quantity: 0,
                            unit_price: originalLocationItem
                              ? originalLocationItem.unit_price
                              : 0,
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
        open={openOriginalInvoiceModal}
        onClose={handleCloseOriginalInvoiceModal}
        maxWidth="lg"
        fullWidth
      >
        <Box sx={{ padding: "20px", direction: "rtl" }}>
          {isOriginalInvoiceLoading ? (
            <Box>جاري تحميل الفاتورة...</Box>
          ) : transformedInvoice ? (
            <ReturnInvoiceModal
              selectedInvoice={transformedInvoice}
              isEditingInvoice={false}
              editingInvoice={transformedInvoice}
              setEditingInvoice={() => {}}
              show={false}
              selectedNowType={{ type: transformedInvoice.type }}
              addRow={() => {}}
              handleDeleteItemClick={() => {}}
              isPurchasesType={transformedInvoice.type === "purchase"}
              isCreate={false}
              showCommentField={true}
            />
          ) : (
            <Box>لم يتم العثور على الفاتورة</Box>
          )}
        </Box>
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
