import React from "react";
import { Box, Typography } from "@mui/material";

export default function PurchaseRequestForm() {
  return (
    <Box
      sx={{
        p: 3,
        direction: "rtl",
        backgroundColor: "white",
        minWidth: "500px",
      }}
    >
      <Typography variant="h5" sx={{ mb: 3, textAlign: "right" }}>
        إنشاء طلب شراء
      </Typography>

      <Box>test</Box>
    </Box>
  );
}
