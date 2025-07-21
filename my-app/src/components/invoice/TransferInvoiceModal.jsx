import React, { useEffect, useMemo, useState } from "react";
import {
  Box,
  Table,
  TableBody,
  TableRow,
  TableCell,
  IconButton,
} from "@mui/material";
import ClearOutlinedIcon from "@mui/icons-material/ClearOutlined";
import AddIcon from "@mui/icons-material/Add";
import CustomAutoCompleteField from "../customAutoCompleteField/CustomAutoCompleteField";
import NumberInput from "../number/NumberInput";
import styles from "./Invoices.module.css";
import logo from "./logo.png";
import SnackBar from "../snackBar/SnackBar";
import { useGetWarehousesQuery } from "../../pages/services/invoice&warehouseApi";


export default function TransferInvoiceModal({
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
  const isTransferType =
    selectedNowType?.type === "تحويل" ||
    selectedInvoice?.type === "تحويل" ||
    editingInvoice?.type === "تحويل";

  const {
    data: warehouseData,
    isLoading: isWarehousesLoading,
    refetch: refetchWarehouses,
  } = useGetWarehousesQuery(
    { all: true },
    { pollingInterval: 300000, skip: !isEditingInvoice || justEditUnitPrice }
  );
  const warehouse = warehouseData?.warehouses || [];

  const [openSnackbar, setOpenSnackbar] = useState(false);
  const [snackbarMessage, setSnackbarMessage] = useState("");
  const [snackBarType, setSnackBarType] = useState("");

  const handleCloseSnackbar = () => setOpenSnackbar(false);

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
            (loc) => loc.location === item.from_location
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
                <TableCell className={styles.tableCell}>من الموقع</TableCell>
                <TableCell className={styles.tableCell}>إلى الموقع</TableCell>
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
                            from_location: "",
                            to_location: "",
                            quantity: 0,
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
                          if (!newItem.from_location) return;
                          const matchedItem = editingInvoice?.items?.find(
                            (row11) =>
                              row11.barcode === row.barcode &&
                              row11.from_location === newItem.from_location
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
                            from_location: newItem?.from_location || "",
                            quantity: 0,
                            maxquantity,
                          };
                          setEditingInvoice({
                            ...editingInvoice,
                            items: updatedItems,
                          });
                        }}
                        fieldName="from_location"
                        placeholder="من الموقع"
                      />
                    ) : (
                      row.from_location
                    )}
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
                          if (!newItem.to_location) return;
                          if (newItem.to_location === row.from_location) {
                            setSnackbarMessage(
                              "لا يمكن أن يكون الموقع المصدر والوجهة متطابقين"
                            );
                            setSnackBarType("error");
                            setOpenSnackbar(true);
                            return;
                          }
                          const updatedItems = [...editingInvoice.items];
                          updatedItems[index] = {
                            ...updatedItems[index],
                            to_location: newItem?.to_location || "",
                          };
                          setEditingInvoice({
                            ...editingInvoice,
                            items: updatedItems,
                          });
                        }}
                        fieldName="to_location"
                        placeholder="إلى الموقع"
                      />
                    ) : (
                      row.to_location
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
                            row.from_location === undefined ||
                            row.from_location === ""
                          ) {
                            setSnackbarMessage("يجب تحديد موقع المصدر أولا");
                            setSnackBarType("info");
                            setOpenSnackbar(true);
                            event.target.blur();
                            return;
                          }
                          if (
                            row.to_location === undefined ||
                            row.to_location === ""
                          ) {
                            setSnackbarMessage("يجب تحديد موقع الوجهة أولا");
                            setSnackBarType("info");
                            setOpenSnackbar(true);
                            event.target.blur();
                            return;
                          }
                        }}
                        onDoubleClick={(event) => {
                          if (
                            row.from_location === undefined ||
                            row.from_location === ""
                          ) {
                            setSnackbarMessage("يجب تحديد موقع المصدر أولا");
                            setSnackBarType("info");
                            setOpenSnackbar(true);
                            event.target.blur();
                            return;
                          }
                          if (
                            row.to_location === undefined ||
                            row.to_location === ""
                          ) {
                            setSnackbarMessage("يجب تحديد موقع الوجهة أولا");
                            setSnackBarType("info");
                            setOpenSnackbar(true);
                            event.target.blur();
                            return;
                          }
                        }}
                        onChange={(e) => {
                          if (
                            row.from_location === undefined ||
                            row.from_location === ""
                          ) {
                            setSnackbarMessage("يجب تحديد موقع المصدر أولا");
                            setSnackBarType("info");
                            setOpenSnackbar(true);
                            e.target.blur();
                            return;
                          }
                          if (
                            row.to_location === undefined ||
                            row.to_location === ""
                          ) {
                            setSnackbarMessage("يجب تحديد موقع الوجهة أولا");
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
      <SnackBar
        open={openSnackbar}
        message={snackbarMessage}
        type={snackBarType}
        onClose={handleCloseSnackbar}
      />
    </>
  );
}
