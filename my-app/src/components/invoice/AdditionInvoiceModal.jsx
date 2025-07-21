import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  Box,
  Table,
  TableBody,
  TableRow,
  TableCell,
  Autocomplete,
  TextField,
  IconButton,
} from "@mui/material";
import ClearOutlinedIcon from "@mui/icons-material/ClearOutlined";
import AddIcon from "@mui/icons-material/Add";
import CustomAutoCompleteField from "../customAutoCompleteField/CustomAutoCompleteField";
import NumberInput from "../number/NumberInput";
import styles from "./Invoices.module.css";
import logo from "./logo.png";
import SnackBar from "../snackBar/SnackBar";
import { useGetSuppliersQuery } from "../../pages/services/supplierApi";
import { useGetWarehousesQuery } from "../../pages/services/invoice&warehouseApi";

export default function AdditionInvoiceModal({
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
  const isAdditionType =
    selectedNowType?.type === "اضافه" ||
    selectedInvoice?.type === "اضافه" ||
    editingInvoice?.type === "اضافه";

  const {
    data: suppliersData,
    isLoading: isSuppliersLoading,
    refetch: refetchSuppliers,
  } = useGetSuppliersQuery(
    { all: true },
    {
      pollingInterval: 300000,
      skip: !isEditingInvoice || !isAdditionType || justEditUnitPrice,
    }
  );
  const suppliers = suppliersData?.suppliers || [];

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
    if (isEditingInvoice) refetchSuppliers();
  }, [isEditingInvoice, refetchSuppliers, refetchWarehouses]);

  useEffect(() => {
    if (isEditingInvoice && warehouseMap && editingInvoice) {
      const updatedItems = editingInvoice.items.map((item) => {
        const warehouseItem = warehouseMap.get(
          item.item_name?.trim()?.toLowerCase()
        );
        const availableLocations = warehouseItem?.locations || [];
        return { ...item, availableLocations };
      });
      setEditingInvoice((prev) => ({ ...prev, items: updatedItems }));
    }
  }, [warehouseMap, editingInvoice, setEditingInvoice, isEditingInvoice]);

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
                <TableCell className={styles.tableCell}>اسم المورد</TableCell>
                <TableCell className={styles.tableCell}>اسم الصنف</TableCell>
                <TableCell className={styles.tableCell}>الرمز</TableCell>
                <TableCell className={styles.tableCell}>الموقع</TableCell>
                <TableCell className={styles.tableCell}>الكمية</TableCell>
                <TableCell className={styles.tableCell}>السعر</TableCell>
                <TableCell className={styles.tableCell}>إجمالي السعر</TableCell>
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
                        loading={isSuppliersLoading}
                        values={suppliers}
                        editingItem={row}
                        setEditingItem={(newItem) => {
                          const updatedItems = [...editingInvoice.items];
                          updatedItems[index] = {
                            ...updatedItems[index],
                            supplier_name: newItem.supplier_name,
                          };
                          setEditingInvoice({
                            ...editingInvoice,
                            items: updatedItems,
                          });
                        }}
                        fieldName="supplier_name"
                        placeholder="اسم المورد"
                        isBig={true}
                      />
                    ) : (
                      row.supplier_name || "-"
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
                            supplier_name:
                              updatedItems[index].supplier_name || "",
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
                          const updatedItems = [...editingInvoice.items];
                          updatedItems[index] = {
                            ...updatedItems[index],
                            location: newItem?.location || "",
                            quantity: 0,
                            unit_price: row.unit_price,
                            total_price: 0,
                            maxquantity: 0,
                            supplier_name:
                              updatedItems[index].supplier_name || "",
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
                            total_price: newQuantity * Number(row.unit_price),
                            supplier_name:
                              updatedItems[index].supplier_name || "",
                          };
                          const totalAmount = updatedItems.reduce(
                            (sum, item) => sum + (item.total_price || 0),
                            0
                          );
                          setEditingInvoice({
                            ...editingInvoice,
                            items: updatedItems,
                            total_amount: totalAmount,
                          });
                        }}
                      />
                    ) : (
                      row.quantity
                    )}
                  </TableCell>
                  <TableCell className={styles.tableCellRow}>
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
                        value={row.unit_price ?? row?.unit_price}
                        onInput={(e) => {
                          if (e.target.value < 0) e.target.value = 0;
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
                          const newUnitPrice = Number(e.target.value) || 0;
                          const updatedItems = editingInvoice.items.map(
                            (item) => {
                              if (
                                item.item_name === row.item_name &&
                                item.supplier_name === row.supplier_name
                              ) {
                                const newTotalPrice =
                                  newUnitPrice * (item.quantity || 0);
                                return {
                                  ...item,
                                  unit_price: e.target.value,
                                  total_price: newTotalPrice,
                                };
                              }
                              return item;
                            }
                          );
                          const totalAmount = updatedItems.reduce(
                            (sum, item) => sum + (item.total_price || 0),
                            0
                          );
                          setEditingInvoice({
                            ...editingInvoice,
                            items: updatedItems,
                            total_amount: totalAmount,
                          });
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
                      />
                    ) : (
                      row.unit_price
                    )}
                  </TableCell>
                  <TableCell className={styles.tableCellRow}>
                    {row?.total_price}
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
        {(show || isPurchasesType) && (
          <Box className={styles.MoneySection}>
            <Box className={styles.MoneyBox}>
              <Box className={styles.MoneyLabel}>الإجمالي</Box>
              <Box className={styles.MoneyValue}>
                {!isEditingInvoice
                  ? selectedInvoice?.total_amount
                  : editingInvoice?.total_amount}
              </Box>
            </Box>
            <Box className={styles.MoneyBox}>
              <Box className={styles.MoneyLabel}>طريقة الدفع</Box>
              <Box
                className={styles.MoneyValue}
                sx={{ display: "flex", direction: "rtl", gap: "10px" }}
              >
                {!isEditingInvoice ? (
                  editingInvoice?.payment_method === "Custody" ? (
                    `عهدة مع ${editingInvoice.custody_person || "-"}`
                  ) : (
                    editingInvoice?.payment_method
                  )
                ) : (
                  <>
                    <Autocomplete
                      loading={true}
                      options={[
                        { label: "Cash", value: "Cash" },
                        { label: "Credit", value: "Credit" },
                        { label: "عهدة", value: "Custody" },
                      ]}
                      getOptionLabel={(option) => option.label}
                      value={
                        [
                          { label: "Cash", value: "Cash" },
                          { label: "Credit", value: "Credit" },
                          { label: "عهدة", value: "Custody" },
                        ].find(
                          (option) =>
                            option.value === editingInvoice.payment_method
                        ) || null
                      }
                      onChange={(event, newValue) => {
                        setEditingInvoice({
                          ...editingInvoice,
                          payment_method: newValue ? newValue.value : "",
                          custody_person:
                            newValue?.value === "Custody"
                              ? editingInvoice.custody_person || ""
                              : "",
                        });
                      }}
                      sx={{
                        minWidth:
                          editingInvoice.payment_method === "Custody"
                            ? "30%"
                            : "200px",
                        "& .MuiAutocomplete-clearIndicator": {
                          display: "none",
                        },
                        "& .MuiOutlinedInput-root": {
                          paddingRight: "35px!important",
                          fontSize: "1rem",
                          padding: "0",
                          paddingLeft: "35px",
                        },
                        "& .MuiOutlinedInput-root .MuiOutlinedInput-notchedOutline":
                          { border: "none" },
                        "& .MuiInputBase-input": { textAlign: "center" },
                      }}
                      renderInput={(params) => (
                        <TextField
                          {...params}
                          placeholder="طريقة الدفع"
                          fullWidth
                        />
                      )}
                      isOptionEqualToValue={(option, value) =>
                        option.value === value.value
                      }
                    />
                    {editingInvoice.payment_method === "Custody" && (
                      <input
                        placeholder="اسم الشخص"
                        value={editingInvoice.custody_person || ""}
                        onChange={(e) =>
                          setEditingInvoice({
                            ...editingInvoice,
                            custody_person: e.target.value,
                          })
                        }
                        style={{
                          width: "100%",
                          outline: "none",
                          fontSize: "15px",
                          textAlign: "center",
                          border: "1px solid #ddd",
                        }}
                      />
                    )}
                  </>
                )}
              </Box>
            </Box>
            <Box className={styles.MoneyBox}>
              <Box className={styles.MoneyLabel}>المدفوع</Box>
              <Box className={styles.MoneyValue}>
                {!isEditingInvoice ? (
                  selectedInvoice?.paid || 0
                ) : (
                  <NumberInput
                    style={{
                      width: "100%",
                      border: "none",
                      outline: "none",
                      height: "40px",
                      fontSize: "1rem",
                      textAlign: "center",
                      paddingLeft: "15px",
                    }}
                    value={editingInvoice?.paid}
                    onChange={(e) =>
                      setEditingInvoice({
                        ...editingInvoice,
                        paid: parseFloat(e.target.value),
                      })
                    }
                  />
                )}
              </Box>
            </Box>
            <Box className={styles.MoneyBox}>
              <Box className={styles.MoneyLabel}>المتبقى</Box>
              <Box className={styles.MoneyValue} sx={{ marginBottom: "10px" }}>
                {(editingInvoice?.paid || 0) -
                  (editingInvoice?.total_amount || 0)}
              </Box>
            </Box>
          </Box>
        )}
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
