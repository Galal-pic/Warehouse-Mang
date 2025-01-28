import * as React from "react";
import PropTypes from "prop-types";
import Tabs from "@mui/material/Tabs";
import Tab from "@mui/material/Tab";
import Box from "@mui/material/Box";

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

export default function FilterTabs({ setNowType, setSelectedRows }) {
  const [value, setValue] = React.useState(0);

  const handleChange = (event, newValue) => {
    setValue(newValue);
    setNowType(filtersTypes[newValue]);
    setSelectedRows([]);
  };

  const filtersTypes = [
    { label: "صرف", type: "operation", url: "/invoice/صرف", status: true },
    {
      label: "أمانات",
      type: "operation",
      url: "/invoice/أمانات",
      status: true,
    },
    { label: "مرتجع", type: "operation", url: "/invoice/مرتجع", status: true },
    { label: "توالف", type: "operation", url: "/invoice/توالف", status: false },
    { label: "حجز", type: "operation", url: "/invoice/حجز", status: true },
    { label: "اضافه", type: "purchase", url: "/invoice/اضافه", status: false },
  ];

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
          sx={{ marginBottom: "20px", direction: "rtl" }}
          value={value}
          onChange={handleChange}
          aria-label="filter tabs"
        >
          {filtersTypes.map((filter, index) => (
            <Tab
              key={filter.label}
              label={filter.label}
              {...a11yProps(index)}
              sx={{
                backgroundColor: "white",
                padding: "0 !important",
                margin: "3px 20px",
                borderRadius: "10px",
                transition: "0.3s",
                fontWeight: "bold",
                fontSize: "1.2rem",
                "&:hover": {
                  backgroundColor: "#f5f5f5",
                },
              }}
            />
          ))}
        </Tabs>
      </Box>
    </Box>
  );
}
