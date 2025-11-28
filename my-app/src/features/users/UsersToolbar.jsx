// src/features/users/UsersToolbar.jsx
import React from "react";
import { GridToolbarContainer } from "@mui/x-data-grid";
import { IconButton } from "@mui/material";
import GroupAddIcon from "@mui/icons-material/GroupAdd";
import { useNavigate } from "react-router-dom";

export default function UsersToolbar() {
  const navigate = useNavigate();

  const primaryColor =
    typeof window !== "undefined"
      ? getComputedStyle(document.documentElement).getPropertyValue("--primary-color")
      : undefined;

  return (
    <GridToolbarContainer>
      <IconButton
        sx={{ padding: "10px", color: primaryColor }}
        color="primary"
        onClick={() => navigate("/register")}
        aria-label="add-user"
      >
        <GroupAddIcon sx={{ fontSize: "3rem" }} />
      </IconButton>
    </GridToolbarContainer>
  );
}
