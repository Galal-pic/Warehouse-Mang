import * as React from "react";
import PropTypes from "prop-types";
import Tabs from "@mui/material/Tabs";
import Tab from "@mui/material/Tab";
import Box from "@mui/material/Box";
import { useGetUserQuery } from "../../pages/services/userApi";

function CustomTabPanel(props) {
  const { children, value, index, ...other } = props;

  return (
    <div
      role="tabpanel"
      hidden={value !== index}
      id={`simple-tabpanel-${index}`}
      aria-labelledby={`simple-tab-${index}`}
      {...other}
    >
      {value === index && <Box sx={{ p: "0 !" }}>{children}</Box>}
    </div>
  );
}

CustomTabPanel.propTypes = {
  children: PropTypes.node,
  index: PropTypes.number.isRequired,
  value: PropTypes.number.isRequired,
};

function a11yProps(index) {
  return {
    id: `simple-tab-${index}`,
    "aria-controls": `simple-tabpanel-${index}`,
  };
}

export const filtersTypes = (user) => {
  const hasPermission = (permission) => user?.[permission];

  return [
    (hasPermission("view_additions") || user?.username === "admin") && {
      label: "اضافه",
      type: "purchase",
      url: "/invoice/اضافه",
    },
    (hasPermission("view_withdrawals") || user?.username === "admin") && {
      label: "صرف",
      type: "operation",
      url: "/invoice/صرف",
    },
    (hasPermission("view_deposits") || user?.username === "admin") && {
      label: "أمانات",
      type: "operation",
      url: "/invoice/أمانات",
    },
    (hasPermission("view_returns") || user?.username === "admin") && {
      label: "مرتجع",
      type: "operation",
      url: "/invoice/مرتجع",
    },
    (hasPermission("view_damages") || user?.username === "admin") && {
      label: "توالف",
      type: "operation",
      url: "/invoice/توالف",
    },
    (hasPermission("view_reservations") || user?.username === "admin") && {
      label: "حجز",
      type: "operation",
      url: "/invoice/حجز",
    },
    (hasPermission("view_withdrawals") ||
      hasPermission("view_deposits") ||
      hasPermission("view_reservations") ||
      user?.username === "admin") && {
      label: "طلب شراء",
      type: "operation",
      url: "/invoice/طلب شراء",
    },
  ].filter(Boolean);
};

export default function FilterTabs({ setNowType, setSelectedRows }) {
  const { data: user = {} } = useGetUserQuery();
  const [value, setValue] = React.useState(0);
  const filters = React.useMemo(() => filtersTypes(user), [user]);

  React.useEffect(() => {
    // Reset to first tab if current value is out of bounds
    if (value >= filters.length) {
      setValue(0);
    }
  }, [filters, value]);

  const handleChange = (event, newValue) => {
    setValue(newValue);
    setNowType(filters[newValue]);
    setSelectedRows([]);
  };

  if (filters.length === 0) return null;

  return (
    <Box
      sx={{
        textAlign: "center",
        display: "flex",
        justifyContent: "center",
        alignItems: "center",
      }}
    >
      <Box>
        <Tabs
          sx={{
            marginBottom: "20px",
            direction: "rtl",
            minHeight: "43px",
            "& .MuiTabs-flexContainer": {
              gap: "20px",
            },
          }}
          value={Math.min(value, filters.length - 1)}
          onChange={handleChange}
          aria-label="filter tabs"
        >
          {filters.map((filter, index) => (
            <Tab
              key={filter.label}
              label={filter.label}
              {...a11yProps(index)}
              sx={{
                backgroundColor: "white",
                padding: "0 !important",
                borderRadius: "10px",
                transition: "0.3s",
                fontWeight: "bold",
                fontSize: "1rem",
                "&:hover": {
                  backgroundColor: "#f5f5f5",
                },
                minHeight: "40px",
                minWidth: "70px",
              }}
            />
          ))}
        </Tabs>
      </Box>
    </Box>
  );
}
