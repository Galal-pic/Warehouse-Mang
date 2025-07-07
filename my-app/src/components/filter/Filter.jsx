import * as React from "react";
import PropTypes from "prop-types";
import Tabs from "@mui/material/Tabs";
import Tab from "@mui/material/Tab";
import Box from "@mui/material/Box";
import { useGetUserQuery } from "../../pages/services/userApi";
import { ThemeProvider, createTheme } from "@mui/material/styles";

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
    (hasPermission("view_purchase_requests") || user?.username === "admin") && {
      label: "طلب شراء",
      type: "operation",
      url: "/invoice/طلب شراء",
    },
    // user?.username === "admin" &&
    {
      label: "لم تراجع",
      type: "status",
      url: "/invoice/لم-تراجع",
    },
    // user?.username === "admin" &&
    {
      label: "لم تؤكد",
      type: "status",
      url: "/invoice/لم-تؤكد",
    },
    // user?.username === "admin" &&
    {
      label: "تم",
      type: "status",
      url: "/invoice/تم",
    },
    // user?.username === "admin" &&
    {
      label: "صفرية",
      type: "status",
      url: "/invoice/صفرية",
    },
  ]
    .filter(Boolean)
    .reverse();
};

export default function FilterTabs({
  setNowType,
  setSelectedRows,
  setPaginationModel,
}) {
  const { data: user = {} } = useGetUserQuery();
  const [value, setValue] = React.useState(10);
  const filters = React.useMemo(() => filtersTypes(user), [user]);

  // Create a theme with RTL support
  const theme = createTheme({
    // direction: "rtl",
  });

  React.useEffect(() => {
    // Reset to first tab if current value is out of bounds
    if (value >= filters.length) {
      setValue(10);
    }
  }, [filters, value]);

  const handleChange = (event, newValue) => {
    setValue(newValue);
    setNowType(filters[newValue]);
    setSelectedRows([]);
    // Reset pagination to the first page
    setPaginationModel((prev) => ({ ...prev, page: 0 }));
  };

  if (filters.length === 0) return null;

  return (
    <ThemeProvider theme={theme}>
      <Box
        className="flex justify-end items-center w-full px-4 sm:px-6 lg:px-8"
        sx={{
          display: "flex",
          justifyContent: "center",
        }}
      >
        <Box
          className="w-full max-w-7xl"
          sx={{
            width: "97%",
            bgcolor: "background.paper",
            mb: 3,
            display: "flex",
            justifyContent: "center",
          }}
        >
          <Tabs
            value={Math.min(value, filters.length - 1)}
            onChange={handleChange}
            variant="scrollable"
            scrollButtons="auto"
            aria-label="scrollable auto tabs example"
            allowScrollButtonsMobile
            sx={{
              backgroundColor: "#f8fafc",
              borderRadius: "8px",
              boxShadow: "0 2px 8px rgba(0, 0, 0, 0.1)",
              "& .MuiTabs-indicator": {
                backgroundColor: "#f39c12",
                height: "3px",
                borderRadius: "2px",
                transition: "all 0.3s ease",
                display: "block",
                width: "100%",
                left: "auto",
                right: 0,
              },
              "& .MuiTabs-scrollButtons": {
                color: "#f39c12",
                "&.Mui-disabled": {
                  opacity: 0.3,
                },
              },
            }}
          >
            {filters.map((filter, index) => (
              <Tab
                key={filter.label}
                label={filter.label}
                {...a11yProps(index)}
                sx={{
                  fontSize: { xs: "0.9rem", sm: "1rem", md: "1.1rem" },
                  fontWeight: 600,
                  color: "#4b6584",
                  padding: { xs: "8px 16px", sm: "10px 20px", md: "12px 24px" },
                  borderRadius: "6px",
                  transition: "all 0.2s ease",
                  minHeight: "36px",
                  minWidth: { xs: "60px", sm: "70px", md: "80px" },
                  "&.Mui-selected": {
                    color: "#f39c12",
                    backgroundColor: "#fff",
                    boxShadow: "0 2px 6px rgba(0, 0, 0, 0.15)",
                  },
                  "&:hover": {
                    color: "#f39c12",
                    backgroundColor: "#f1f5f9",
                  },
                  textAlign: "right",
                }}
              />
            ))}
          </Tabs>
        </Box>
      </Box>
    </ThemeProvider>
  );
}
