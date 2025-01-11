import React from "react";
import { Card, CardContent, Typography, Button, Box } from "@mui/material";
import ArrowForwardOutlinedIcon from "@mui/icons-material/ArrowForwardOutlined";
import HomeRepairServiceIcon from "@mui/icons-material/HomeRepairService";
import PrecisionManufacturingIcon from "@mui/icons-material/PrecisionManufacturing";
import SettingsIcon from "@mui/icons-material/Settings";
import "../../colors.css";
import { Link } from "react-router-dom";

export default function Others() {
  // get colos
  const primaryColor = getComputedStyle(
    document.documentElement
  ).getPropertyValue("--primary-color");

  // links
  const links = [
    {
      icon: <HomeRepairServiceIcon sx={{ color: primaryColor }} />,
      label: "إدارة المنتجات",
      buttonLabe: "استعراض القائمة ",
      to: "/others/items",
    },
    {
      icon: <PrecisionManufacturingIcon sx={{ color: primaryColor }} />,
      label: "إدارة الماكينات",
      buttonLabe: "استعراض القائمة",
      to: "/others/machines",
    },
    {
      icon: <SettingsIcon sx={{ color: primaryColor }} />,
      label: "إدارة الميكانيزم",
      buttonLabe: "استعراض القائمة",
      to: "/others/mechanisms",
    },
  ];

  return (
    <Box
      sx={{
        display: "flex",
        justifyContent: "center",
        alignItems: "center",
        flexDirection: "column",
        marginTop: "100px",
        gap: "20px",
      }}
    >
      {links.map((link, index) => (
        <Box
          sx={{
            minWidth: "500px",
          }}
          key={index}
        >
          <Card
            sx={{
              display: "flex",
              alignItems: "center",
              flexDirection: "column",
            }}
          >
            <CardContent>
              <Typography
                variant="h5"
                sx={{
                  display: "flex",
                  alignItems: "center",
                  textAlign: "center",
                  margin: "auto",
                  gap: "10px",
                  justifyContent: "center",
                }}
              >
                {link.icon}
                {link.label}
              </Typography>
              <Link to={link.to}>
                <Button
                  variant="contained"
                  sx={{
                    backgroundColor: primaryColor,
                    color: "#fff",
                    marginTop: 2,
                    padding: "10px 20px",
                    "&:hover .arrow-icon": {
                      transform: "translateX(10px)",
                      transition: "transform 0.3s ease",
                    },
                  }}
                >
                  {link.buttonLabe}
                  <ArrowForwardOutlinedIcon
                    className="arrow-icon"
                    sx={{
                      marginLeft: 1,
                    }}
                  />
                </Button>
              </Link>
            </CardContent>
          </Card>
        </Box>
      ))}
    </Box>
  );
}
