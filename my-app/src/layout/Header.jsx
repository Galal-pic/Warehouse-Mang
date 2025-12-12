// src/layout/Header.jsx
import React, { useEffect, useRef, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import logo from "../assets/logo.png";
import logoWhite from "../assets/logoWhite.png";
import { useCurrentUser } from "../features/auth/hooks/useCurrentUser";

const resourceManagementLinks = [
  { text: "المنتجات", href: "/others/items" },
  { text: "الماكينات", href: "/others/machines" },
  { text: "الميكانيزم", href: "/others/mechanisms" },
  { text: "الموردين", href: "/others/supliers" },
];

const links = [
  { text: "الموظفين", href: "/employee" },
  { text: "إنشاء عملية", href: "/createinvoice" },
  { text: "إدارة العمليات", href: "/invoices" },
  { text: "تقارير", href: "/reports" },
  { text: "إدارة الموارد", submenu: resourceManagementLinks },
];

export default function Header() {
  const navigate = useNavigate();
  const location = useLocation();

  const [selectedLink, setSelectedLink] = useState(location.pathname);
  const [isMobile, setIsMobile] = useState(window.innerWidth <= 750);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [isResourcesOpen, setIsResourcesOpen] = useState(false);
  const [isLogoutLoading, setIsLogoutLoading] = useState(false);

  const menuRef = useRef(null);

  const { user, isLoading: isUserLoading } = useCurrentUser();

  useEffect(() => {
    setSelectedLink(location.pathname);
  }, [location]);

  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth <= 750);
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  useEffect(() => {
    const handleClickOutside = (e) => {
      const isClickInsideMenu = menuRef.current?.contains(e.target);
      const isClickOnMenuButton = e.target.closest("[data-nav-item]");
      if (isResourcesOpen && !isClickInsideMenu && !isClickOnMenuButton) {
        setIsResourcesOpen(false);
      }
    };
    document.addEventListener("click", handleClickOutside);
    return () => document.removeEventListener("click", handleClickOutside);
  }, [isResourcesOpen]);

  const handleLinkClick = (href) => {
    setSelectedLink(href);
    navigate(href);
    setIsDrawerOpen(false);
    setIsResourcesOpen(false);
  };

  const isSubmenuActive = (submenu) =>
    submenu?.some((item) => item.href === selectedLink);

  const handleLogout = async (e) => {
    e.stopPropagation();
    setIsLogoutLoading(true);
    localStorage.clear();
    navigate("/login");
    setIsLogoutLoading(false);
  };

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
        user?.view_reservations ||
        user?.view_transfers ||
        user?.view_purchase_requests
      );

    if (link.text === "تقارير")
      return user?.username === "admin" || user?.view_reports;

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

  const updatedFilteredLinks = filteredLinks.map((link) =>
    link.text === "إدارة الموارد"
      ? { ...link, submenu: filteredResourceManagementLinks }
      : link
  );

  return (
    <>
      {/* الهيدر */}
      <header className="fixed top-0 inset-x-0 h-[56px] md:h-[64px] bg-primary text-white shadow-md z-50">
        <div className="max-w-6xl mx-auto h-full flex items-center justify-between px-3 md:px-6">
          {/* اليسار: الشعار */}
          <div className="flex items-center gap-2">
            <Link to="/employee">
              <img
                src={logoWhite}
                alt="logo"
                className="w-14 md:w-16 select-none"
              />
            </Link>
          </div>

          {/* اليمين: نافيجيشن + معلومات المستخدم / تسجيل خروج */}
          <div className="flex items-center gap-3">
            {/* روابط الديسكتوب */}
            {!isMobile && (
              <nav className="hidden md:flex items-center flex-row-reverse gap-1 md:gap-2">
                {updatedFilteredLinks.map((link) => {
                  const isActive =
                    selectedLink === link.href || isSubmenuActive(link.submenu);

                  return (
                    <li
                      key={link.text}
                      data-nav-item
                      className="list-none h-full flex items-center"
                    >
                      {link.submenu ? (
                        <div className="relative" ref={menuRef}>
                          <button
                            type="button"
                            onClick={() => setIsResourcesOpen((v) => !v)}
                            className={`flex items-center gap-1 px-4 h-9 rounded-full text-xs md:text-sm font-medium tracking-wide transition-all
                      ${
                        isActive
                          ? "bg-white/20 shadow-sm text-white"
                          : "bg-white/5 text-slate-100 hover:bg-white/15"
                      }`}
                          >
                            <span className="mt-[2px] text-xs">⌄</span>
                            <span>إدارة الموارد</span>
                          </button>

                          {isResourcesOpen && (
                            <div className="absolute right-0 mt-2 w-44 bg-white/95 backdrop-blur-md text-slate-900 rounded-2xl shadow-xl border border-slate-100 ">
                              <div className="px-3 py-2 text-xs font-semibold text-slate-500 border-b border-slate-100">
                                إدارة الموارد
                              </div>
                              {filteredResourceManagementLinks.map(
                                (resource) => (
                                  <button
                                    key={resource.text}
                                    type="button"
                                    onClick={() =>
                                      handleLinkClick(resource.href)
                                    }
                                    className={`w-full text-right px-3 py-2 text-sm flex items-center justify-between transition
                              ${
                                selectedLink === resource.href
                                  ? "bg-primary/10 text-primary font-semibold"
                                  : "hover:bg-slate-100"
                              }`}
                                  >
                                    <span className="pr-1">
                                      {resource.text}
                                    </span>
                                    <span className="text-xs opacity-60">
                                      ›
                                    </span>
                                  </button>
                                )
                              )}
                            </div>
                          )}
                        </div>
                      ) : (
                        <button
                          type="button"
                          onClick={() => handleLinkClick(link.href)}
                          className={`h-9 px-4 rounded-full text-xs md:text-sm font-medium tracking-wide transition-all flex items-center
                      focus:outline-none focus:ring-0
                      ${
                        isActive
                          ? "bg-white/20 text-white shadow-sm"
                          : "bg-white/5 text-slate-100 hover:bg-white/15"
                      }
                    `}
                        >
                          {link.text}
                        </button>
                      )}
                    </li>
                  );
                })}
              </nav>
            )}

            {/* زر القائمة للموبايل */}
            <div className="flex md:hidden items-center gap-2">
              {/* اسم المستخدم كمحة بسيطة في الهيدر للموبايل */}
              {!isUserLoading && user?.username && (
                <span className="text-xs bg-white/15 px-2 py-1 rounded-full max-w-[90px] truncate">
                  {user.username}
                </span>
              )}
              <button
                type="button"
                onClick={() => setIsDrawerOpen(true)}
                className="p-2 rounded-full bg-white/10 hover:bg-white/20 transition flex flex-col justify-center items-center gap-[3px]"
              >
                <span className="block w-6 h-[2px] bg-white rounded-full" />
                <span className="block w-6 h-[2px] bg-white rounded-full" />
                <span className="block w-6 h-[2px] bg-white rounded-full" />
              </button>
            </div>
          </div>
          {/* معلومات المستخدم + تسجيل خروج للديسكتوب / اللابتوب */}
          <div className="hidden md:flex items-center gap-3">
            {!isUserLoading && user?.username && (
              <span className="text-xs md:text-sm bg-white/15 px-3 py-1 rounded-full max-w-[160px] truncate">
                {user.username}
              </span>
            )}

            <button
              type="button"
              onClick={handleLogout}
              disabled={isLogoutLoading}
              className="text-xs md:text-sm font-semibold bg-white/10 hover:bg-white/20 px-3 py-1.5 rounded-full border border-white/20 disabled:opacity-60"
            >
              {isLogoutLoading ? "جاري تسجيل الخروج..." : "تسجيل الخروج"}
            </button>
          </div>
        </div>
      </header>

      {/* Drawer للموبايل */}
      {isDrawerOpen && (
        <div className="fixed inset-0 z-40">
          {/* الخلفية */}
          <div
            className="absolute inset-0 bg-black/40 backdrop-blur-[2px]"
            onClick={() => setIsDrawerOpen(false)}
          />
          {/* البانل */}
          <div className="absolute right-0 top-0 h-full w-72 max-w-[80%] bg-white text-black flex flex-col shadow-2xl rounded-s-2xl ">
            {/* الهيدر داخل الـ Drawer */}
            <div className="flex items-center justify-between px-4 pt-4 pb-2">
              <div className="flex items-center gap-2">
                <div className="h-9 w-9 rounded-full bg-primary/10 flex items-center justify-center">
                  <span className="text-primary text-sm font-bold">
                    {user?.username?.[0]?.toUpperCase() || "م"}
                  </span>
                </div>
                <div className="flex flex-col text-right">
                  <span className="text-sm font-semibold">
                    {user?.username || "المستخدم"}
                  </span>
                  <span className="text-[0.7rem] text-gray-500">
                    {user?.job_name || "وظيفة غير محددة"}
                  </span>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setIsDrawerOpen(false)}
                className="h-8 w-8 flex items-center justify-center rounded-full bg-gray-100 hover:bg-gray-200 text-gray-600 text-lg leading-none"
              >
                ×
              </button>
            </div>

            {/* كرت معلومات المستخدم */}
            <div className="px-4 mb-3">
              <div className="rounded-2xl bg-gradient-to-l from-primary to-sky-500 text-white p-3 shadow-md">
                <div className="flex items-center justify-between gap-2">
                  <div className="flex flex-col text-right">
                    <span className="text-xs opacity-80">أهلاً بك</span>
                    <div className="flex items-center gap-1">
                      {isUserLoading ? (
                        <div className="h-4 w-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      ) : (
                        <span className="text-sm font-semibold">
                          {user?.username || "المستخدم"}
                        </span>
                      )}
                    </div>
                    <span className="text-[0.7rem] opacity-90 mt-1">
                      {isUserLoading
                        ? "جاري تحميل البيانات..."
                        : user?.job_name || "لا توجد وظيفة مسجلة"}
                    </span>
                  </div>
                  <img
                    src={logo}
                    alt="logo"
                    className="h-12 object-contain opacity-90"
                  />
                </div>
              </div>
            </div>

            {/* روابط الموبايل */}
            <div className="px-3 flex-1 overflow-y-auto">
              <ul className="flex flex-col gap-1 mb-4">
                {[...updatedFilteredLinks, ...filteredResourceManagementLinks]
                  .filter((l) => l.href)
                  .map((link) => (
                    <li key={link.text} className="list-none">
                      <button
                        type="button"
                        onClick={() => handleLinkClick(link.href)}
                        className={`w-full text-right flex items-center justify-between py-2.5 text-sm rounded-xl px-2 transition
                        ${
                          selectedLink === link.href
                            ? "bg-primary/10 text-primary font-semibold"
                            : "hover:bg-gray-100 text-gray-800"
                        }`}
                      >
                        <span>{link.text}</span>
                        <span className="text-xs opacity-70">◀</span>
                      </button>
                    </li>
                  ))}
              </ul>
            </div>

            {/* زر تسجيل الخروج */}
            <div className="px-4 pb-4 pt-2 border-t border-gray-100">
              <button
                type="button"
                onClick={handleLogout}
                disabled={isLogoutLoading}
                className="w-full bg-primary text-white font-bold py-2.5 rounded-xl hover:bg-blue-700 transition disabled:opacity-60 text-sm"
              >
                {isLogoutLoading ? "جاري تسجيل الخروج..." : "تسجيل الخروج"}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
