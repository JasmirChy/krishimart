import React, { useState, useEffect, useRef } from "react";
import {
  Users,
  Sprout,
  Package,
  ShoppingBag,
  MessageSquare,
  CheckCircle2,
  Trash2,
  Plus,
  Send,
  MapPin,
  Phone,
  ShieldAlert,
  Edit3,
  X,
} from "lucide-react";
import api, { BACKEND_URL } from "../api";

export default function AdminPanel() {
  const [subTab, setSubTab] = useState("users");
  const [users, setUsers] = useState([]);
  const [submissions, setSubmissions] = useState([]);
  const [products, setProducts] = useState([]);
  const [orders, setOrders] = useState([]);
  const [toast, setToast] = useState(null);
  const [userSearch, setUserSearch] = useState("");
  const [userFilter, setUserFilter] = useState("ALL");

  // Admin Chat state
  const [threads, setThreads] = useState([]);
  const [selectedUser, setSelectedUser] = useState(null);
  const [chatMessages, setChatMessages] = useState([]);
  const [replyText, setReplyText] = useState("");
  const chatContainerRef = useRef(null);

  // Custom Review Modal for Farmer Submissions
  const [reviewModal, setReviewModal] = useState(null); // { id, title, status, publishToStore, remarks }

  // Edit Product Modal state
  const [editingProduct, setEditingProduct] = useState(null);

  // Add Product state
  const [newProduct, setNewProduct] = useState({
    name: "",
    category: "VEGETABLES",
    price: "",
    unit: "kg",
    stock_quantity: "",
    origin_location: "",
    description: "",
    image: null,
  });

  // Add User state
  const [newUser, setNewUser] = useState({
    full_name: "",
    email: "",
    phone_number: "",
    role: "CUSTOMER",
    location: "",
    password: "",
    confirm_password: "",
  });

  const showToast = (message, type = "success") => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3500);
  };

  const fetchAllAdminData = async () => {
    try {
      const [uRes, sRes, pRes, oRes, tRes] = await Promise.all([
        api.get("/accounts/admin/users/"),
        api.get("/marketplace/sell-submissions/"),
        api.get("/marketplace/products/"),
        api.get("/marketplace/orders/"),
        api.get("/chat/messages/threads/"),
      ]);
      setUsers(uRes.data);
      setSubmissions(sRes.data);
      setProducts(pRes.data);
      setOrders(oRes.data);
      setThreads(tRes.data);
      if (!selectedUser && tRes.data.length > 0) {
        setSelectedUser(tRes.data[0]);
      }
    } catch (err) {
      console.error("Failed to load admin data:", err);
    }
  };

  useEffect(() => {
    fetchAllAdminData();
  }, []);

  // Poll chat messages for selected user & refresh unread counts
  useEffect(() => {
    if (!selectedUser) return;
    const loadChat = async () => {
      try {
        const [msgRes, threadRes] = await Promise.all([
          api.get(`/chat/messages/?user_id=${selectedUser.id}`),
          api.get("/chat/messages/threads/"),
        ]);
        setChatMessages(msgRes.data);
        setThreads(threadRes.data);
      } catch (err) {
        console.error(err);
      }
    };
    loadChat();
    const interval = setInterval(loadChat, 3000);
    return () => clearInterval(interval);
  }, [selectedUser]);

  // Auto-scroll chat box when new messages arrive
  useEffect(() => {
    if (chatContainerRef.current) {
      chatContainerRef.current.scrollTop = chatContainerRef.current.scrollHeight;
    }
  }, [chatMessages.length, selectedUser?.id]);

  const handleToggleVerify = async (userId) => {
    try {
      const res = await api.post(`/accounts/admin/users/${userId}/toggle_verification/`);
      showToast(res.data.message || "User verification status updated.");
      fetchAllAdminData();
    } catch {
      showToast("Failed to update user verification.", "error");
    }
  };

  const handleChangeUserRole = async (userId, newRole) => {
    try {
      await api.patch(`/accounts/admin/users/${userId}/`, {
        role: newRole,
        is_staff: newRole === "ADMIN",
      });
      showToast(`User role updated to ${newRole}.`);
      fetchAllAdminData();
    } catch {
      showToast("Failed to update user role.", "error");
    }
  };

  const handleDeleteUser = async (userId, fullName) => {
    try {
      await api.delete(`/accounts/admin/users/${userId}/`);
      showToast(`Deleted user ${fullName}.`);
      fetchAllAdminData();
    } catch {
      showToast("Could not delete user.", "error");
    }
  };

  const handleCreateUser = async (e) => {
    e.preventDefault();
    try {
      const res = await api.post("/accounts/register/", newUser);
      await api.post(`/accounts/admin/users/${res.data.user.id}/toggle_verification/`);
      setNewUser({
        full_name: "",
        email: "",
        phone_number: "",
        role: "CUSTOMER",
        location: "",
        password: "",
        confirm_password: "",
      });
      fetchAllAdminData();
      showToast("New user created and verified!");
    } catch {
      showToast("Check email/phone uniqueness and password (min 8 chars).", "error");
    }
  };

  const submitFarmerReview = async (e) => {
    e.preventDefault();
    if (!reviewModal) return;
    try {
      await api.post(`/marketplace/sell-submissions/${reviewModal.id}/review/`, {
        status: reviewModal.status,
        admin_remarks: reviewModal.remarks,
        publish_to_store: reviewModal.publishToStore,
      });
      showToast(
        reviewModal.publishToStore
          ? `Approved & published "${reviewModal.title}" to Store!`
          : `Updated "${reviewModal.title}" status to ${reviewModal.status}.`
      );
      setReviewModal(null);
      fetchAllAdminData();
    } catch {
      showToast("Failed to review submission.", "error");
    }
  };

  const handleAddProduct = async (e) => {
    e.preventDefault();
    try {
      const formData = new FormData();
      Object.entries(newProduct).forEach(([key, val]) => {
        if (val !== null && val !== "") formData.append(key, val);
      });
      await api.post("/marketplace/products/", formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      setNewProduct({
        name: "",
        category: "VEGETABLES",
        price: "",
        unit: "kg",
        stock_quantity: "",
        origin_location: "",
        description: "",
        image: null,
      });
      showToast("Product published to store!");
      fetchAllAdminData();
    } catch {
      showToast("Failed to add product.", "error");
    }
  };

  const handleSaveProductEdit = async (e) => {
    e.preventDefault();
    if (!editingProduct) return;
    try {
      await api.patch(`/marketplace/products/${editingProduct.id}/`, {
        name: editingProduct.name,
        category: editingProduct.category,
        price: editingProduct.price,
        unit: editingProduct.unit,
        stock_quantity: editingProduct.stock_quantity,
        origin_location: editingProduct.origin_location,
        description: editingProduct.description,
      });
      showToast(`Updated "${editingProduct.name}" inventory details.`);
      setEditingProduct(null);
      fetchAllAdminData();
    } catch {
      showToast("Could not update product.", "error");
    }
  };

  const handleDeleteProduct = async (id, name) => {
    try {
      await api.delete(`/marketplace/products/${id}/`);
      showToast(`Removed "${name}" from store.`);
      fetchAllAdminData();
    } catch {
      showToast("Failed to delete product.", "error");
    }
  };

  const handleOrderStatus = async (orderId, status) => {
    try {
      await api.patch(`/marketplace/orders/${orderId}/`, { status });
      showToast(`Order #${orderId} marked as ${status}.`);
      fetchAllAdminData();
    } catch {
      showToast("Could not update order status.", "error");
    }
  };

  const handleSendAdminReply = async (e) => {
    e.preventDefault();
    if (!replyText.trim() || !selectedUser) return;
    try {
      await api.post("/chat/messages/", {
        conversation_user: selectedUser.id,
        message: replyText.trim(),
        is_admin_reply: true,
      });
      setReplyText("");
      const res = await api.get(`/chat/messages/?user_id=${selectedUser.id}`);
      setChatMessages(res.data);
    } catch (err) {
      showToast(err.response?.data?.error || "Could not send message.", "error");
    }
  };

  const pendingUsersCount = users.filter((u) => !u.is_admin_verified && !u.is_staff).length;
  const pendingSubmissionsCount = submissions.filter((s) => s.status === "PENDING").length;
  const totalUnreadChats = threads.reduce((acc, t) => acc + (t.unread_count || 0), 0);

  return (
    <div className="space-y-6 relative">
      {/* Floating Toast Notification */}
      {toast && (
        <div
          className={`fixed top-20 right-5 z-50 px-5 py-3 rounded-2xl shadow-xl text-xs sm:text-sm font-bold flex items-center gap-2 transition ${
            toast.type === "error" ? "bg-red-600 text-white" : "bg-[#14532D] text-white"
          }`}
        >
          <CheckCircle2 className="w-4 h-4 text-amber-400 shrink-0" />
          <span>{toast.message}</span>
        </div>
      )}

      {/* Top Summary Banner */}
      <div className="bg-gradient-to-r from-[#1B4332] to-[#2D6A4F] rounded-3xl p-5 sm:p-6 text-white shadow-lg flex flex-wrap items-center justify-between gap-4">
        <div>
          <span className="text-xs uppercase tracking-widest text-amber-300 font-bold">
            KrishiMart Control Center
          </span>
          <h2 className="text-xl sm:text-2xl font-extrabold mt-1">Admin Management Dashboard</h2>
          <p className="text-xs sm:text-sm text-emerald-100">
            Verify users, approve farmer vegetable offers, edit inventory, and reply to customer
            chats.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          {[
            { id: "users", label: "Users & Verification", icon: Users, badge: pendingUsersCount },
            {
              id: "submissions",
              label: "Farmer Sell Offers",
              icon: Sprout,
              badge: pendingSubmissionsCount,
            },
            { id: "products", label: "Store Inventory", icon: Package },
            { id: "orders", label: "Orders", icon: ShoppingBag },
            {
              id: "chat",
              label: "User Chat Inbox",
              icon: MessageSquare,
              badge: totalUnreadChats,
            },
          ].map((tab) => {
            const Icon = tab.icon;
            return (
              <button
                key={tab.id}
                onClick={() => setSubTab(tab.id)}
                className={`px-3.5 py-2 rounded-xl text-xs sm:text-sm font-semibold flex items-center gap-2 transition cursor-pointer ${
                  subTab === tab.id
                    ? "bg-amber-500 text-slate-950 shadow-md"
                    : "bg-white/10 text-white hover:bg-white/20"
                }`}
              >
                <Icon className="w-4 h-4" />
                {tab.label}
                {tab.badge > 0 && (
                  <span className="px-2 py-0.5 text-xs rounded-full bg-red-500 text-white font-bold">
                    {tab.badge}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </div>
{/* Live Admin Analytics KPI Row */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200 shadow-2xs">
          <span className="text-xs font-bold text-slate-400 uppercase">Store Revenue</span>
          <p className="text-2xl font-black text-[#1B4332] mt-1">
            रु{" "}
            {orders
              .filter((o) => o.status !== "CANCELLED")
              .reduce((sum, o) => sum + Number(o.total_price || 0), 0)
              .toLocaleString()}
          </p>
          <span className="text-[11px] text-emerald-700 font-semibold">
            {orders.filter((o) => o.status === "DELIVERED").length} orders delivered
          </span>
        </div>

        <div className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200 shadow-2xs">
          <span className="text-xs font-bold text-slate-400 uppercase">Verified Accounts</span>
          <p className="text-2xl font-black text-slate-900 mt-1">
            {users.filter((u) => u.is_admin_verified || u.is_staff).length} / {users.length}
          </p>
          <span className="text-[11px] text-amber-700 font-semibold">
            {pendingUsersCount} awaiting approval
          </span>
        </div>

        <div className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200 shadow-2xs">
          <span className="text-xs font-bold text-slate-400 uppercase">Farmer Sell Offers</span>
          <p className="text-2xl font-black text-slate-900 mt-1">{submissions.length}</p>
          <span className="text-[11px] text-amber-700 font-semibold">
            {pendingSubmissionsCount} pending review
          </span>
        </div>

        <div className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200 shadow-2xs">
          <span className="text-xs font-bold text-slate-400 uppercase">Live Store Batches</span>
          <p className="text-2xl font-black text-slate-900 mt-1">{products.length}</p>
          <span className="text-[11px] text-emerald-700 font-semibold">
            {products.filter((p) => Number(p.stock_quantity) > 0).length} in stock
          </span>
        </div>
      </div>


      {/* 1. USERS & VERIFICATION */}
      {subTab === "users" && (
        <div className="grid lg:grid-cols-3 gap-6">
          <form
            onSubmit={handleCreateUser}
            className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200 space-y-3 h-fit"
          >
            <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
              <Plus className="w-5 h-5 text-emerald-700" /> Add & Verify New User
            </h3>
            <input
              type="text"
              required
              placeholder="Full Name *"
              value={newUser.full_name}
              onChange={(e) => setNewUser({ ...newUser, full_name: e.target.value })}
              className="w-full px-3.5 py-2 rounded-xl border border-slate-200 text-sm"
            />
            <input
              type="email"
              placeholder="Email Address"
              value={newUser.email}
              onChange={(e) => setNewUser({ ...newUser, email: e.target.value })}
              className="w-full px-3.5 py-2 rounded-xl border border-slate-200 text-sm"
            />
            <input
              type="text"
              placeholder="Phone Number (10 digits)"
              value={newUser.phone_number}
              onChange={(e) => setNewUser({ ...newUser, phone_number: e.target.value })}
              className="w-full px-3.5 py-2 rounded-xl border border-slate-200 text-sm"
            />
            <div className="grid grid-cols-2 gap-2">
              <select
                value={newUser.role}
                onChange={(e) => setNewUser({ ...newUser, role: e.target.value })}
                className="px-3 py-2 rounded-xl border border-slate-200 text-sm bg-white"
              >
                <option value="CUSTOMER">Customer</option>
                <option value="FARMER">Farmer</option>
              </select>
              <input
                type="text"
                placeholder="Location"
                value={newUser.location}
                onChange={(e) => setNewUser({ ...newUser, location: e.target.value })}
                className="px-3 py-2 rounded-xl border border-slate-200 text-sm"
              />
            </div>
            <div className="grid grid-cols-2 gap-2">
              <input
                type="password"
                required
                minLength={8}
                placeholder="Password *"
                value={newUser.password}
                onChange={(e) => setNewUser({ ...newUser, password: e.target.value })}
                className="px-3 py-2 rounded-xl border border-slate-200 text-sm"
              />
              <input
                type="password"
                required
                minLength={8}
                placeholder="Confirm *"
                value={newUser.confirm_password}
                onChange={(e) => setNewUser({ ...newUser, confirm_password: e.target.value })}
                className="px-3 py-2 rounded-xl border border-slate-200 text-sm"
              />
            </div>
            <button
              type="submit"
              className="w-full py-2.5 bg-[#1B4332] hover:bg-[#2D6A4F] text-white font-semibold rounded-xl text-sm cursor-pointer"
            >
              Add Verified User
            </button>
          </form>

          {/* Users List with Search & Status Filter */}
          <div className="lg:col-span-2 bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
            <div className="p-4 sm:p-5 border-b border-slate-100 space-y-3">
              <div className="flex flex-wrap justify-between items-center gap-2">
                <h3 className="font-bold text-slate-900">All Registered Users ({users.length})</h3>
                <span className="text-xs text-amber-700 bg-amber-50 px-3 py-1 rounded-full font-semibold">
                  {pendingUsersCount} Pending Approval
                </span>
              </div>
              <div className="flex flex-wrap gap-2">
                <input
                  type="text"
                  placeholder="Search by name, email, phone, or location..."
                  value={userSearch}
                  onChange={(e) => setUserSearch(e.target.value)}
                  className="flex-1 min-w-[200px] px-3.5 py-2 rounded-xl border border-slate-200 text-xs outline-none focus:border-[#1B4332]"
                />
                {["ALL", "PENDING", "VERIFIED", "FARMER", "CUSTOMER"].map((f) => (
                  <button
                    key={f}
                    type="button"
                    onClick={() => setUserFilter(f)}
                    className={`px-3 py-1.5 rounded-xl text-xs font-bold cursor-pointer ${
                      userFilter === f
                        ? "bg-[#1B4332] text-white"
                        : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                    }`}
                  >
                    {f}
                  </button>
                ))}
              </div>
            </div>

            <div className="divide-y divide-slate-100 max-h-[520px] overflow-y-auto">
              {users
                .filter((u) => {
                  const q = userSearch.toLowerCase();
                  const matchesSearch =
                    (u.full_name || "").toLowerCase().includes(q) ||
                    (u.email || "").toLowerCase().includes(q) ||
                    (u.phone_number || "").toLowerCase().includes(q) ||
                    (u.location || "").toLowerCase().includes(q);
                  if (!matchesSearch) return false;
                  if (userFilter === "PENDING") return !u.is_admin_verified && !u.is_staff;
                  if (userFilter === "VERIFIED") return u.is_admin_verified || u.is_staff;
                  if (userFilter === "FARMER") return u.role === "FARMER";
                  if (userFilter === "CUSTOMER") return u.role === "CUSTOMER";
                  return true;
                })
                .map((u) => (
                  <div
                    key={u.id}
                    className="p-4 flex flex-wrap items-center justify-between gap-4 hover:bg-slate-50"
                  >
                    <div>
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="font-bold text-slate-900">{u.full_name}</p>
                        <select
                          value={u.role}
                          onChange={(e) => handleChangeUserRole(u.id, e.target.value)}
                          className="text-xs px-2 py-0.5 rounded-md bg-slate-100 border border-slate-200 text-slate-700 font-semibold"
                        >
                          <option value="CUSTOMER">CUSTOMER</option>
                          <option value="FARMER">FARMER</option>
                          <option value="ADMIN">ADMIN</option>
                        </select>
                        {u.is_admin_verified || u.is_staff ? (
                          <span className="inline-flex items-center gap-1 text-xs px-2.5 py-0.5 rounded-full bg-emerald-100 text-emerald-800 font-semibold">
                            <CheckCircle2 className="w-3.5 h-3.5" /> Verified
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-xs px-2.5 py-0.5 rounded-full bg-amber-100 text-amber-800 font-semibold">
                            <ShieldAlert className="w-3.5 h-3.5" /> Pending Approval
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-slate-500 mt-1">
                        Email: <strong>{u.email || "—"}</strong> | Phone:{" "}
                        <strong>{u.phone_number || "—"}</strong> | Location:{" "}
                        <strong>{u.location || "—"}</strong>
                      </p>
                    </div>

                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => handleToggleVerify(u.id)}
                        className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer ${
                          u.is_admin_verified
                            ? "bg-amber-100 text-amber-900 hover:bg-amber-200"
                            : "bg-emerald-600 text-white hover:bg-emerald-700 shadow-sm"
                        }`}
                      >
                        {u.is_admin_verified ? "Revoke Access" : "Verify & Approve"}
                      </button>
                      <button
                        onClick={() => handleDeleteUser(u.id, u.full_name)}
                        className="p-2 text-red-600 hover:bg-red-50 rounded-xl cursor-pointer"
                        title="Delete User"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                ))}
            </div>
          </div>
        </div>
      )}

      {/* 2. FARMER "SELL YOUR PRODUCTS" SUBMISSIONS */}
      {subTab === "submissions" && (
        <div className="grid md:grid-cols-2 gap-6">
          {submissions.length === 0 ? (
            <div className="col-span-2 bg-white p-12 rounded-2xl text-center text-slate-500 border border-slate-200">
              No farmer or customer product offers submitted yet.
            </div>
          ) : (
            submissions.map((sub) => (
              <div
                key={sub.id}
                className="bg-white rounded-2xl p-6 shadow-sm border border-slate-200 flex flex-col justify-between gap-4"
              >
                <div className="space-y-3">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <span className="text-xs font-bold uppercase tracking-wider text-emerald-700">
                        {sub.category}
                      </span>
                      <h3 className="text-xl font-bold text-slate-900">{sub.vegetable_name}</h3>
                      <p className="text-xs text-slate-500">
                        Submitted by <strong>{sub.seller_name}</strong> ({sub.seller_role})
                      </p>
                    </div>
                    <span
                      className={`px-3 py-1 rounded-full text-xs font-bold ${
                        sub.status === "APPROVED"
                          ? "bg-emerald-100 text-emerald-800"
                          : sub.status === "REJECTED"
                          ? "bg-red-100 text-red-700"
                          : "bg-amber-100 text-amber-800"
                      }`}
                    >
                      {sub.status}
                    </span>
                  </div>

                  {sub.image && (
                    <img
                      src={sub.image.startsWith("http") ? sub.image : `${BACKEND_URL}${sub.image}`}
                      alt={sub.vegetable_name}
                      className="w-full h-44 object-cover rounded-xl border border-slate-100"
                    />
                  )}

                  <p className="text-sm text-slate-700 bg-slate-50 p-3.5 rounded-xl">
                    {sub.vegetable_description}
                  </p>

                  <div className="grid grid-cols-2 gap-2 text-xs bg-emerald-50/60 p-3.5 rounded-xl border border-emerald-100">
                    <div>
                      <span className="text-slate-500 block">Available Quantity:</span>
                      <strong className="text-slate-900 text-sm">
                        {sub.quantity} {sub.unit}
                      </strong>
                    </div>
                    <div>
                      <span className="text-slate-500 block">Expected Price:</span>
                      <strong className="text-emerald-800 text-sm">
                        रु {sub.expected_price_per_unit} / {sub.unit}
                      </strong>
                    </div>
                    <div className="flex items-center gap-1 text-slate-700 col-span-2 pt-1">
                      <Phone className="w-3.5 h-3.5 text-emerald-700" />
                      <strong>Contact:</strong> {sub.contact_phone}
                    </div>
                    <div className="flex items-center gap-1 text-slate-700 col-span-2">
                      <MapPin className="w-3.5 h-3.5 text-emerald-700" />
                      <strong>Pickup Location:</strong> {sub.pickup_location}
                    </div>
                  </div>
                </div>

                <div className="flex flex-wrap gap-2 pt-3 border-t border-slate-100">
                  <button
                    onClick={() =>
                      setReviewModal({
                        id: sub.id,
                        title: sub.vegetable_name,
                        status: "APPROVED",
                        publishToStore: true,
                        remarks:
                          sub.admin_remarks ||
                          "Approved & published! Our team will contact you for pickup.",
                      })
                    }
                    className="flex-1 py-2 px-3 bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-bold rounded-xl cursor-pointer"
                  >
                    Approve & Publish to Store
                  </button>
                  <button
                    onClick={() =>
                      setReviewModal({
                        id: sub.id,
                        title: sub.vegetable_name,
                        status: "APPROVED",
                        publishToStore: false,
                        remarks:
                          sub.admin_remarks || "Approved for direct purchase by KrishiMart.",
                      })
                    }
                    className="py-2 px-3 bg-emerald-100 hover:bg-emerald-200 text-emerald-900 text-xs font-bold rounded-xl cursor-pointer"
                  >
                    Approve Only
                  </button>
                  <button
                    onClick={() =>
                      setReviewModal({
                        id: sub.id,
                        title: sub.vegetable_name,
                        status: "REJECTED",
                        publishToStore: false,
                        remarks:
                          sub.admin_remarks ||
                          "Thank you, but we currently have full stock for this item.",
                      })
                    }
                    className="py-2 px-3 bg-red-50 hover:bg-red-100 text-red-700 text-xs font-bold rounded-xl cursor-pointer"
                  >
                    Decline
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {/* 3. STORE INVENTORY (ADD, EDIT & DELETE PRODUCTS) */}
      {subTab === "products" && (
        <div className="grid lg:grid-cols-3 gap-6">
          <form
            onSubmit={handleAddProduct}
            className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200 space-y-3 h-fit"
          >
            <h3 className="text-lg font-bold text-slate-900">Add Product to Store</h3>
            <input
              type="text"
              required
              placeholder="Vegetable / Product Name *"
              value={newProduct.name}
              onChange={(e) => setNewProduct({ ...newProduct, name: e.target.value })}
              className="w-full px-3.5 py-2 rounded-xl border border-slate-200 text-sm"
            />
            <div className="grid grid-cols-2 gap-2">
              <select
                value={newProduct.category}
                onChange={(e) => setNewProduct({ ...newProduct, category: e.target.value })}
                className="px-3 py-2 rounded-xl border border-slate-200 text-sm bg-white"
              >
                <option value="VEGETABLES">Fresh Vegetables</option>
                <option value="FRUITS">Fresh Fruits</option>
                <option value="GRAINS">Grains & Pulses</option>
                <option value="SPICES">Herbs & Spices</option>
                <option value="DAIRY">Organic & Dairy</option>
              </select>
              <select
                value={newProduct.unit}
                onChange={(e) => setNewProduct({ ...newProduct, unit: e.target.value })}
                className="px-3 py-2 rounded-xl border border-slate-200 text-sm bg-white"
              >
                <option value="kg">per kg</option>
                <option value="bundle">per bundle</option>
                <option value="crate">per crate</option>
                <option value="quintal">per quintal</option>
              </select>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <input
                type="number"
                required
                placeholder="Price (रु) *"
                value={newProduct.price}
                onChange={(e) => setNewProduct({ ...newProduct, price: e.target.value })}
                className="px-3.5 py-2 rounded-xl border border-slate-200 text-sm"
              />
              <input
                type="number"
                required
                placeholder="Stock Qty *"
                value={newProduct.stock_quantity}
                onChange={(e) => setNewProduct({ ...newProduct, stock_quantity: e.target.value })}
                className="px-3.5 py-2 rounded-xl border border-slate-200 text-sm"
              />
            </div>
            <input
              type="text"
              placeholder="Origin Farm Location (e.g. Dhangadhi, Kailali)"
              value={newProduct.origin_location}
              onChange={(e) => setNewProduct({ ...newProduct, origin_location: e.target.value })}
              className="w-full px-3.5 py-2 rounded-xl border border-slate-200 text-sm"
            />
            <textarea
              rows={3}
              required
              placeholder="Product freshness & description *"
              value={newProduct.description}
              onChange={(e) => setNewProduct({ ...newProduct, description: e.target.value })}
              className="w-full px-3.5 py-2 rounded-xl border border-slate-200 text-sm"
            />
            <input
              type="file"
              accept="image/*"
              onChange={(e) => setNewProduct({ ...newProduct, image: e.target.files[0] })}
              className="w-full text-xs text-slate-500"
            />
            <button
              type="submit"
              className="w-full py-2.5 bg-[#1B4332] hover:bg-[#2D6A4F] text-white font-semibold rounded-xl text-sm cursor-pointer"
            >
              Publish Product
            </button>
          </form>

          <div className="lg:col-span-2 grid sm:grid-cols-2 gap-4 h-fit">
            {products.map((p) => (
              <div
                key={p.id}
                className="bg-white p-4 rounded-2xl border border-slate-200 flex justify-between items-center gap-3"
              >
                <div>
                  <span className="text-[11px] font-bold text-emerald-700">{p.category}</span>
                  <h4 className="font-bold text-slate-900">{p.name}</h4>
                  <p className="text-xs text-slate-500">
                    रु {p.price} / {p.unit} • Stock: <strong>{p.stock_quantity}</strong> {p.unit}
                  </p>
                  {p.origin_location && (
                    <p className="text-[11px] text-slate-400">📍 {p.origin_location}</p>
                  )}
                </div>
                <div className="flex items-center gap-1 shrink-0">
                  <button
                    onClick={() => setEditingProduct({ ...p })}
                    className="p-2 text-emerald-700 hover:bg-emerald-50 rounded-xl cursor-pointer"
                    title="Edit Price or Stock"
                  >
                    <Edit3 className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => handleDeleteProduct(p.id, p.name)}
                    className="p-2 text-red-600 hover:bg-red-50 rounded-xl cursor-pointer"
                    title="Delete Product"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 4. CUSTOMER ORDERS */}
      {subTab === "orders" && (
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 divide-y divide-slate-100">
          {orders.length === 0 ? (
            <p className="p-8 text-center text-slate-500">No customer orders placed yet.</p>
          ) : (
            orders.map((o) => (
              <div
                key={o.id}
                className="p-4 flex flex-wrap items-center justify-between gap-4"
              >
                <div>
                  <p className="font-bold text-slate-900">
                    Order #{o.id}: {o.product_name} ({o.quantity} {o.product_unit}) — रु{" "}
                    {o.total_price}
                  </p>
                  <p className="text-xs text-slate-500">
                    Buyer: <strong>{o.buyer_name}</strong> | Phone: {o.contact_phone} | Delivery:{" "}
                    {o.delivery_address}
                  </p>
                </div>
                <select
                  value={o.status}
                  onChange={(e) => handleOrderStatus(o.id, e.target.value)}
                  className="px-3 py-1.5 rounded-xl border border-slate-200 text-xs font-bold bg-slate-50"
                >
                  <option value="PENDING">PENDING</option>
                  <option value="CONFIRMED">CONFIRMED</option>
                  <option value="DELIVERED">DELIVERED</option>
                  <option value="CANCELLED">CANCELLED</option>
                </select>
              </div>
            ))
          )}
        </div>
      )}

      {/* 5. ADMIN LIVE CHAT INBOX */}
      {subTab === "chat" && (
        <div className="bg-white rounded-3xl shadow-sm border border-slate-200 grid md:grid-cols-3 overflow-hidden">
          <div className="border-b md:border-b-0 md:border-r border-slate-200 flex flex-col max-h-56 md:max-h-[560px]">
            <div className="p-4 border-b border-slate-100 font-bold text-sm text-slate-800 bg-slate-50 shrink-0">
              Buyers & Farmers ({threads.length})
            </div>
            <div className="overflow-y-auto flex-1 divide-y divide-slate-100">
              {threads.map((u) => (
                <button
                  key={u.id}
                  onClick={() => setSelectedUser(u)}
                  className={`w-full text-left p-3.5 hover:bg-emerald-50/60 transition flex items-center justify-between gap-2 cursor-pointer ${
                    selectedUser?.id === u.id
                      ? "bg-emerald-50 border-l-4 border-l-[#1B4332]"
                      : ""
                  }`}
                >
                  <div className="truncate">
                    <p className="font-bold text-sm text-slate-900 truncate">{u.full_name}</p>
                    <p className="text-xs text-slate-500 truncate">
                      {u.role} • {u.location || u.phone_number || u.email}
                    </p>
                  </div>
                  {u.unread_count > 0 && (
                    <span className="px-2 py-0.5 rounded-full bg-red-500 text-white text-[10px] font-extrabold shrink-0">
                      {u.unread_count} new
                    </span>
                  )}
                </button>
              ))}
            </div>
          </div>

          <div className="md:col-span-2 flex flex-col h-[500px] md:h-[560px] min-h-0">
            {selectedUser ? (
              <>
                <div className="p-4 border-b border-slate-200 bg-slate-50 flex justify-between items-center shrink-0">
                  <div>
                    <p className="font-bold text-base text-slate-900">{selectedUser.full_name}</p>
                    <p className="text-xs text-slate-500">
                      {selectedUser.role} • {selectedUser.location || "No location set"}
                    </p>
                  </div>
                  <span className="text-xs px-2.5 py-1 rounded-full bg-emerald-100 text-emerald-800 font-semibold">
                    {chatMessages.length} messages
                  </span>
                </div>

                <div
                  ref={chatContainerRef}
                  className="flex-1 min-h-0 p-4 overflow-y-auto space-y-3 bg-[#F8FAF7]"
                >
                  {chatMessages.length === 0 ? (
                    <p className="text-center text-xs text-slate-400 mt-12">
                      No messages in this conversation yet. Say hello!
                    </p>
                  ) : (
                    chatMessages.map((m) => (
                      <div
                        key={m.id}
                        className={`flex ${m.is_from_admin ? "justify-end" : "justify-start"}`}
                      >
                        <div
                          className={`max-w-xs sm:max-w-md px-4 py-2.5 rounded-2xl text-sm shadow-2xs ${
                            m.is_from_admin
                              ? "bg-[#1B4332] text-white rounded-br-none"
                              : "bg-white border border-slate-200 text-slate-800 rounded-bl-none"
                          }`}
                        >
                          <p className="break-words">{m.message}</p>
                          <span className="block text-[10px] opacity-75 mt-1">
                            {m.is_from_admin
                              ? "KrishiMart Admin (You)"
                              : m.conversation_user_name}{" "}
                            •{" "}
                            {new Date(m.created_at).toLocaleTimeString([], {
                              hour: "2-digit",
                              minute: "2-digit",
                            })}
                          </span>
                        </div>
                      </div>
                    ))
                  )}
                </div>

                <form
                  onSubmit={handleSendAdminReply}
                  className="p-3.5 border-t border-slate-200 flex gap-2 bg-white shrink-0"
                >
                  <input
                    type="text"
                    placeholder={`Reply to ${selectedUser.full_name}...`}
                    value={replyText}
                    onChange={(e) => setReplyText(e.target.value)}
                    className="flex-1 px-4 py-2.5 rounded-xl border border-slate-200 text-sm outline-none focus:border-[#1B4332]"
                  />
                  <button
                    type="submit"
                    className="px-5 py-2.5 bg-[#1B4332] hover:bg-[#2D6A4F] text-white rounded-xl text-sm font-semibold flex items-center gap-1.5 cursor-pointer shrink-0"
                  >
                    <Send className="w-4 h-4" /> Send
                  </button>
                </form>
              </>
            ) : (
              <div className="flex-1 flex items-center justify-center text-slate-400 text-sm">
                Select a Buyer or Farmer to view and reply to messages.
              </div>
            )}
          </div>
        </div>
      )}

      {/* CUSTOM FARMER SUBMISSION REVIEW MODAL */}
      {reviewModal && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
          <form
            onSubmit={submitFarmerReview}
            className="bg-white rounded-3xl max-w-md w-full p-6 space-y-4 shadow-2xl"
          >
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-extrabold text-slate-900">
                Review: {reviewModal.title}
              </h3>
              <button
                type="button"
                onClick={() => setReviewModal(null)}
                className="p-1 text-slate-400 hover:text-slate-700"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <p className="text-xs text-slate-500">
              Action:{" "}
              <strong className="text-slate-800">
                {reviewModal.publishToStore
                  ? "Approve & Publish to Store"
                  : reviewModal.status}
              </strong>
            </p>
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Admin Remarks / Pickup Instructions for Seller
              </label>
              <textarea
                rows={3}
                value={reviewModal.remarks}
                onChange={(e) => setReviewModal({ ...reviewModal, remarks: e.target.value })}
                className="w-full px-3.5 py-2 rounded-xl border border-slate-200 text-sm"
              />
            </div>
            <div className="flex gap-2 pt-2">
              <button
                type="button"
                onClick={() => setReviewModal(null)}
                className="flex-1 py-2.5 rounded-xl border border-slate-200 text-xs font-bold text-slate-600 cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="flex-1 py-2.5 rounded-xl bg-[#1B4332] text-white text-xs font-bold cursor-pointer"
              >
                Confirm Decision
              </button>
            </div>
          </form>
        </div>
      )}

      {/* EDIT STORE PRODUCT MODAL */}
      {editingProduct && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
          <form
            onSubmit={handleSaveProductEdit}
            className="bg-white rounded-3xl max-w-md w-full p-6 space-y-3.5 shadow-2xl"
          >
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-extrabold text-slate-900">Edit Store Product</h3>
              <button
                type="button"
                onClick={() => setEditingProduct(null)}
                className="p-1 text-slate-400 hover:text-slate-700"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Product Name</label>
              <input
                type="text"
                required
                value={editingProduct.name}
                onChange={(e) => setEditingProduct({ ...editingProduct, name: e.target.value })}
                className="w-full px-3.5 py-2 rounded-xl border border-slate-200 text-sm"
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Price (रु)</label>
                <input
                  type="number"
                  required
                  value={editingProduct.price}
                  onChange={(e) =>
                    setEditingProduct({ ...editingProduct, price: e.target.value })
                  }
                  className="w-full px-3.5 py-2 rounded-xl border border-slate-200 text-sm"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Stock Quantity ({editingProduct.unit})
                </label>
                <input
                  type="number"
                  required
                  value={editingProduct.stock_quantity}
                  onChange={(e) =>
                    setEditingProduct({ ...editingProduct, stock_quantity: e.target.value })
                  }
                  className="w-full px-3.5 py-2 rounded-xl border border-slate-200 text-sm"
                />
              </div>
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Origin Location
              </label>
              <input
                type="text"
                value={editingProduct.origin_location || ""}
                onChange={(e) =>
                  setEditingProduct({ ...editingProduct, origin_location: e.target.value })
                }
                className="w-full px-3.5 py-2 rounded-xl border border-slate-200 text-sm"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Description</label>
              <textarea
                rows={3}
                value={editingProduct.description || ""}
                onChange={(e) =>
                  setEditingProduct({ ...editingProduct, description: e.target.value })
                }
                className="w-full px-3.5 py-2 rounded-xl border border-slate-200 text-sm"
              />
            </div>
            <div className="flex gap-2 pt-2">
              <button
                type="button"
                onClick={() => setEditingProduct(null)}
                className="flex-1 py-2.5 rounded-xl border border-slate-200 text-xs font-bold text-slate-600 cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="flex-1 py-2.5 rounded-xl bg-[#1B4332] text-white text-xs font-bold cursor-pointer"
              >
                Save Changes
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}