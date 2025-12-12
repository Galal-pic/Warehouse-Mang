import React, { useMemo, useState, useEffect } from "react";
import { useUsersData } from "../hooks/useUsersData";
import UsersTable from "../components/UsersTable";
import EditUserModal from "../components/EditUserModal";
import ChangePasswordModal from "../components/ChangePasswordModal";
import ConfirmDeleteModal from "../../../components/common/ConfirmDeleteModal";
import { useAuthStore } from "../../../store/useAuthStore";
import AddUserModal from "../components/AddUserModal";
import GroupAddIcon from "@mui/icons-material/GroupAdd";

export default function UsersPage() {
  const [addOpen, setAddOpen] = useState(false);

  // current logged-in user (عشان نتأكد إنه admin)
  const { user: currentUser, isUserLoading, fetchCurrentUser } = useAuthStore();

  useEffect(() => {
    // هتتحرك مرة واحدة بس، والستور نفسه هو اللى بيمنع التكرار
    fetchCurrentUser();
  }, [fetchCurrentUser]);

  // pagination
  const [pagination, setPagination] = useState({ page: 0, pageSize: 10 });

  const { usersData, isLoading, isDeleting, refetch, deleteUser } =
    useUsersData({
      page: pagination.page,
      pageSize: pagination.pageSize,
    });

  // snack bar بسيط بتيلويند
  const [snackbar, setSnackbar] = useState({
    open: false,
    message: "",
    type: "success",
  });

  const showMessage = (message, type = "success") => {
    setSnackbar({ open: true, message, type });
    setTimeout(() => setSnackbar((s) => ({ ...s, open: false })), 2000);
  };

  // delete state
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [deleteConfirmationText, setDeleteConfirmationText] = useState("");
  const [selectedUserId, setSelectedUserId] = useState(null);

  // edit modal
  const [editOpen, setEditOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState(null);

  // change password modal
  const [changePassOpen, setChangePassOpen] = useState(false);

  const handlePageChange = (newPage) => {
    setPagination((prev) => ({ ...prev, page: newPage }));
  };

  const handleOpenEdit = (id) => {
    const u = usersData.users.find((x) => x.id === id);
    if (!u) return;
    setSelectedUser(u);
    setEditOpen(true);
  };

  const handleOpenDelete = (id) => {
    setSelectedUserId(id);
    setDeleteConfirmationText("");
    setDeleteDialogOpen(true);
  };

  const handleOpenChangePass = (id) => {
    setSelectedUserId(id);
    setChangePassOpen(true);
  };

  const handleDelete = async () => {
    if (!selectedUserId) return;
    try {
      await deleteUser(selectedUserId);
      showMessage("تم حذف الموظف بنجاح", "success");
    } catch (err) {
      console.error(err);
      showMessage("خطأ في حذف الموظف", "error");
    } finally {
      setDeleteConfirmationText("");
      setSelectedUserId(null);
      setDeleteDialogOpen(false);
      refetch();
    }
  };

  const handleUpdatedUser = (updated) => {
    setSelectedUser((prev) => ({ ...prev, ...updated }));
    refetch();
  };

  const isAdmin = useMemo(
    () => currentUser?.username === "admin",
    [currentUser]
  );

  // تحميل بيانات المستخدم (مين داخل)
  if (isUserLoading) {
    return (
      <div className="h-[80vh] flex items-center justify-center">
        <div className="h-8 w-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  // لو مش أدمن
  if (!isAdmin) {
    return (
      <div className="h-[80vh] flex items-center justify-center">
        <h1 className="text-xl md:text-2xl font-bold text-red-600">
          هذه الصفحة غير متوفرة
        </h1>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto py-8 px-4" dir="rtl">
      {/* Snackbar */}
      {snackbar.open && (
        <div className="fixed top-4 left-1/2 -translate-x-1/2 z-40">
          <div
            className={`px-4 py-2 rounded-lg shadow-lg text-sm font-semibold text-white ${
              snackbar.type === "success"
                ? "bg-emerald-600"
                : snackbar.type === "error"
                  ? "bg-red-600"
                  : "bg-slate-700"
            }`}
          >
            {snackbar.message}
          </div>
        </div>
      )}

      <h1 className="text-2xl md:text-3xl font-bold text-slate-800 mb-4 text-center">
        بيانات الموظفين
      </h1>

      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-3 mb-6">
        <p className="text-sm text-slate-600"></p>

        <button
          type="button"
          onClick={() => setAddOpen(true)}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-full text-white text-sm font-semibold"
        >
          <GroupAddIcon sx={{ color: "#001473", fontSize: "3rem" }} />
        </button>
      </div>

      <UsersTable
        rows={usersData.users}
        page={pagination.page}
        totalPages={usersData.total_pages}
        onPageChange={handlePageChange}
        onEdit={handleOpenEdit}
        onChangePassword={handleOpenChangePass}
        onDelete={handleOpenDelete}
        loading={isLoading}
      />

      {/* Edit Modal */}
      <EditUserModal
        open={editOpen}
        onClose={() => setEditOpen(false)}
        user={selectedUser}
        onUpdated={handleUpdatedUser}
        onMessage={showMessage}
      />

      {/* Change Password Modal */}
      <ChangePasswordModal
        open={changePassOpen}
        onClose={() => setChangePassOpen(false)}
        userId={selectedUserId}
        onSuccess={showMessage}
      />

      {/* Delete confirm */}
      <ConfirmDeleteModal
        open={deleteDialogOpen}
        onClose={() => setDeleteDialogOpen(false)}
        onConfirm={handleDelete}
        confirmationText={deleteConfirmationText}
        setConfirmationText={setDeleteConfirmationText}
        message="هل أنت متأكد من رغبتك في حذف هذا المستخدم؟"
        isNecessary={true}
        loading={isDeleting}
      />

      <AddUserModal
        open={addOpen}
        onClose={() => setAddOpen(false)}
        onCreated={refetch}
        onMessage={showMessage}
      />
    </div>
  );
}
