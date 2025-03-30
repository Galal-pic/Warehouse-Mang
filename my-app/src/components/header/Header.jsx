import React, { useEffect, useRef, useState } from "react";
import styles from "./Header.module.css";
import logo from "./logo.png";
import logoWhite from "./logoWhite.png";
import { logout } from "../../context/AuthContext";
import { Button, Typography } from "@mui/material";
import { Link, useNavigate } from "react-router-dom";
import Box from "@mui/material/Box";
import SwipeableDrawer from "@mui/material/SwipeableDrawer";
import List from "@mui/material/List";
import ListItem from "@mui/material/ListItem";
import ListItemButton from "@mui/material/ListItemButton";
import ListItemText from "@mui/material/ListItemText";
import MenuIcon from "@mui/icons-material/Menu";
import "../../colors.css";
import { useLocation } from "react-router-dom";
import Menu from "@mui/material/Menu";
import MenuItem from "@mui/material/MenuItem";
import KeyboardArrowDownIcon from "@mui/icons-material/KeyboardArrowDown";
import HomeRepairServiceIcon from "@mui/icons-material/HomeRepairService";
import PrecisionManufacturingIcon from "@mui/icons-material/PrecisionManufacturing";
import SettingsIcon from "@mui/icons-material/Settings";
import ArrowBackIcon from "@mui/icons-material/ArrowBack";
import GroupsIcon from "@mui/icons-material/Groups";
import CircularProgress from "@mui/material/CircularProgress";
import { useGetUserQuery } from "../../pages/services/userApi";

// liks
const resourceManagementLinks = [
  {
    text: "المنتجات",
    href: "/others/items",
    icon: <HomeRepairServiceIcon sx={{ mb: 0.5 }} />,
  },
  {
    text: "الماكينات",
    href: "/others/machines",
    icon: <PrecisionManufacturingIcon sx={{ mb: 0.5 }} />,
  },
  {
    text: "الميكانيزم",
    href: "/others/mechanisms",
    icon: <SettingsIcon sx={{ mb: 0.5 }} />,
  },
  {
    text: "الموردين",
    href: "/others/supliers",
    icon: <GroupsIcon sx={{ mb: 0.5 }} />,
  },
];
const links = [
  {
    text: "الموظفين",
    href: "/users",
  },
  {
    text: "إنشاء عملية",
    href: "/createinvoice",
  },
  {
    text: "إدارة العمليات",
    href: "/invoices",
  },
  {
    text: "إدارة الموارد",
    submenu: resourceManagementLinks,
  },
];

export default function Header() {
  // get user data
  const [isLogoutLoading, setIsLogoutLoading] = useState(false);
  const { data: user, isLoading: isUserLoading } = useGetUserQuery();

  // selected link
  const [selectedLink, setSelectedLink] = useState("");
  const location = useLocation();
  useEffect(() => {
    setSelectedLink(location.pathname);
  }, [location]);
  const handleLinkClick = (href) => {
    setSelectedLink(href);
    navigate(href);
    handleClose();
  };
  const isSubmenuActive = (submenu) => {
    return submenu?.some((item) => item.href === selectedLink);
  };

  // logOut
  const navigate = useNavigate();
  const handleLogout = async (event) => {
    event.stopPropagation();
    setIsLogoutLoading(true);
    logout();
    navigate("/login");
    localStorage.clear();
    setIsLogoutLoading(false);
  };

  // drawer
  const [state, setState] = useState(false);
  const toggleDrawer = (open) => (event) => {
    if (
      event &&
      event.type === "keydown" &&
      (event.key === "Tab" || event.key === "Shift")
    ) {
      return;
    }
    setState(open);
  };

  // dropdown for others
  const [anchorEl, setAnchorEl] = React.useState(null);
  const open = Boolean(anchorEl);
  const handleClick = (event) => {
    setAnchorEl(event.currentTarget);
  };
  const handleClose = () => {
    setAnchorEl(null);
  };
  const menuRef = useRef();
  const headerRef = useRef();
  useEffect(() => {
    const handleClickOutside = (e) => {
      const isClickInsideMenu = menuRef.current?.contains(e.target);
      const isClickOnMenuButton = e.target.closest("[data-nav-item]");

      if (open && !isClickInsideMenu && !isClickOnMenuButton) {
        handleClose();
      }
    };

    document.addEventListener("click", handleClickOutside);
    return () => document.removeEventListener("click", handleClickOutside);
  }, [open]);

  // responsive
  const [isMobile, setIsMobile] = useState(window.innerWidth <= 750);

  useEffect(() => {
    const handleResize = () => {
      setIsMobile(window.innerWidth <= 750);
    };

    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  const filteredLinks = links.filter((link) => {
    if (link.text === "الموظفين") return user?.username === "admin";
    if (link.text === "إنشاء عملية")
      return (
        user?.username === "admin" ||
        user?.create_inventory_operations ||
        user?.create_additions
      );
    if (link.text === "إدارة العمليات")
      return (
        user?.username === "admin" ||
        user?.view_additions ||
        user?.view_withdrawals ||
        user?.view_deposits ||
        user?.view_returns ||
        user?.view_damages ||
        user?.view_reservations
      );
    if (link.text === "إدارة الموارد")
      return (
        user?.username === "admin" ||
        user?.items_can_edit ||
        user?.items_can_delete ||
        user?.items_can_add ||
        user?.machines_can_edit ||
        user?.machines_can_delete ||
        user?.machines_can_add ||
        user?.mechanism_can_edit ||
        user?.mechanism_can_delete ||
        user?.mechanism_can_add ||
        user?.suppliers_can_edit ||
        user?.suppliers_can_delete ||
        user?.suppliers_can_add
      );
    return true;
  });

  const filteredResourceManagementLinks = resourceManagementLinks.filter(
    (resource) => {
      if (resource.text === "المنتجات")
        return (
          user?.username === "admin" ||
          user?.items_can_edit ||
          user?.items_can_delete ||
          user?.items_can_add
        );
      if (resource.text === "الماكينات")
        return (
          user?.username === "admin" ||
          user?.machines_can_edit ||
          user?.machines_can_delete ||
          user?.machines_can_add
        );
      if (resource.text === "الميكانيزم")
        return (
          user?.username === "admin" ||
          user?.mechanism_can_edit ||
          user?.mechanism_can_delete ||
          user?.mechanism_can_add
        );
      if (resource.text === "الموردين")
        return (
          user?.username === "admin" ||
          user?.suppliers_can_edit ||
          user?.suppliers_can_delete ||
          user?.suppliers_can_add
        );
      return false;
    }
  );

  const updatedFilteredLinks = filteredLinks.map((link) => {
    if (link.text === "إدارة الموارد") {
      return { ...link, submenu: filteredResourceManagementLinks };
    }
    return link;
  });

  return (
    <div className={styles.header} ref={headerRef}>
      {/* logo */}
      <div
        style={{ justifyContent: "flex-start" }}
        className={styles.logoContainer}
      >
        <Link to="/users">
          <img
            style={{ justifyContent: "flex-start" }}
            src={logoWhite}
            alt=""
            className={styles.logo}
          />
        </Link>
      </div>

      {/* links */}
      {!isMobile && (
        <div className={styles.navbarContainer}>
          {filteredLinks.map((link) => (
            <li
              key={link.text}
              className={`${styles.navItem} ${
                selectedLink === link.href || isSubmenuActive(link.submenu)
                  ? styles.activeNavItem
                  : ""
              }`}
              data-nav-item
            >
              {link.submenu ? (
                <div>
                  <div
                    className={`${styles.navLink} ${
                      selectedLink === link.href ||
                      isSubmenuActive(link.submenu)
                        ? styles.activeNavLink
                        : ""
                    }`}
                    onClick={handleClick}
                  >
                    <KeyboardArrowDownIcon className={styles.icon} />
                    إدارة الموارد
                  </div>
                  <Menu
                    ref={menuRef}
                    anchorEl={anchorEl}
                    open={open}
                    onClose={handleClose}
                    MenuListProps={{
                      className: styles.menuList,
                    }}
                    className={styles.menuContainer}
                  >
                    {filteredResourceManagementLinks.map((resource) => {
                      return (
                        <MenuItem
                          key={resource.text}
                          onClick={handleClose}
                          className={styles.menuItem}
                          sx={{
                            "&.MuiMenuItem-root": {
                              backgroundColor: "transparent",
                            },
                          }}
                        >
                          <Link
                            to={resource.href}
                            className={`${styles.link} ${
                              selectedLink === resource.href
                                ? styles.activeLink
                                : ""
                            }`}
                          >
                            <span className={styles.span}>
                              {resource.icon}
                              {resource.text}
                            </span>
                          </Link>
                        </MenuItem>
                      );
                    })}
                  </Menu>
                </div>
              ) : (
                <Link
                  to={link.href}
                  onClick={() => handleLinkClick(link.href)}
                  className={`${styles.navLinkMain} ${
                    selectedLink === link.href ? styles.activeNavLinkMain : ""
                  }`}
                  style={{
                    height: "100%",
                    display: "flex",
                    alignItems: "center",
                  }}
                >
                  {link.text}
                </Link>
              )}
            </li>
          ))}
        </div>
      )}

      {/* Drawer icon */}
      <div
        style={{
          flex: 1,
        }}
      >
        <Button onClick={toggleDrawer(true)} className={styles.drawerButton}>
          <MenuIcon
            sx={{
              fontSize: "50px",
              color: "white",
            }}
          />
        </Button>
      </div>

      {/* Drawer */}
      <SwipeableDrawer
        anchor="right"
        open={state}
        onClose={toggleDrawer(false)}
        onOpen={toggleDrawer(true)}
        sx={{
          zIndex: "9999999999999999999999999999999999999",
        }}
      >
        <Box
          sx={{
            width: 260,
            height: "100vh",
            padding: !isMobile ? 2 : "5px 20px 0",
            direction: "rtl",
          }}
          role="presentation"
          onClick={toggleDrawer(false)}
          onKeyDown={toggleDrawer(false)}
        >
          <List
            sx={{
              display: "flex",
              flexDirection: "column",
              justifyContent: "center",
            }}
          >
            {/* User Information */}
            <ListItem
              disablePadding
              sx={{
                marginBottom: !isMobile ? 3 : 0,
              }}
            >
              <ListItemButton
                sx={{
                  cursor: "context-menu",
                  display: "flex",
                  gap: 1,
                  textAlign: "right",
                  fontSize: "1.5rem",
                }}
              >
                <Typography
                  variant="h6"
                  sx={{ fontWeight: "bold", fontSize: "1.5rem" }}
                >
                  الاسم:
                </Typography>
                <ListItemText
                  sx={{ textAlign: isUserLoading ? "center" : "" }}
                  primary={
                    isUserLoading ? (
                      <CircularProgress size={24} />
                    ) : (
                      <Typography sx={{ color: "#555", fontSize: "1.5rem" }}>
                        {user?.username}
                      </Typography>
                    )
                  }
                />
              </ListItemButton>
            </ListItem>
            <ListItem
              disablePadding
              sx={{
                marginBottom: !isMobile ? 3 : 0,
              }}
            >
              <ListItemButton
                sx={{
                  cursor: "context-menu",
                  display: "flex",
                  gap: 1,
                  textAlign: "right",
                  fontSize: "1.5rem",
                }}
              >
                <Typography variant="h6" sx={{ fontWeight: "bold" }}>
                  الوظيفة:
                </Typography>
                <ListItemText
                  sx={{ textAlign: isUserLoading ? "center" : "" }}
                  primary={
                    isUserLoading ? (
                      <CircularProgress size={24} />
                    ) : (
                      <Typography sx={{ color: "#555", fontSize: "1.5rem" }}>
                        {user?.job_name}
                      </Typography>
                    )
                  }
                />
              </ListItemButton>
            </ListItem>
            {isMobile && (
              <div
                style={{
                  flexDirection: "column-reverse",
                  gap: "10px",
                  margin: "10px 0 20px",
                }}
              >
                {[
                  ...updatedFilteredLinks,
                  ...filteredResourceManagementLinks,
                ].map((link) => (
                  <li className={styles.liDrawer} key={link.text} data-nav-item>
                    {link.href && (
                      <Link
                        to={link.href}
                        onClick={() => handleLinkClick(link.href)}
                        className={styles.navLinkDrawer}
                      >
                        <ArrowBackIcon />
                        {link.text}
                      </Link>
                    )}
                  </li>
                ))}
              </div>
            )}
            {/* Logout Button */}
            <ListItem disablePadding>
              <ListItemButton
                sx={{
                  cursor: "default",
                  "&:hover": { backgroundColor: "transparent" },
                }}
              >
                <Button
                  variant="contained"
                  color="primary"
                  onClick={(event) => handleLogout(event)}
                  disabled={isLogoutLoading}
                  sx={{
                    width: "100%",
                    height: "50px",
                    fontSize: "16px",
                    fontWeight: "bold",
                    backgroundColor: "#1976d2",
                    "&:hover": {
                      backgroundColor: "#115293",
                    },
                  }}
                >
                  تسجيل الخروج
                </Button>
              </ListItemButton>
            </ListItem>
            <Box sx={{ margin: "auto", mt: isLogoutLoading ? 3 : "" }}>
              {isLogoutLoading ? <CircularProgress size={24} /> : ""}
            </Box>
            {/* logo */}
            <ListItem
              disablePadding
              sx={{
                marginBottom: !isMobile ? 3 : 0,
              }}
            >
              <img
                src={logo}
                alt="logo"
                style={{
                  height: "100px",
                  margin: "50px auto",
                }}
              />
            </ListItem>
          </List>
        </Box>
      </SwipeableDrawer>
    </div>
  );
}
