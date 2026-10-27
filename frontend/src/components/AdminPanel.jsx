import React, { useState, useEffect } from "react";
import {
  Users,
  Sprout,
  Package,
  ShoppingBag,
  MessageSquare,
  CheckCircle2,
  XCircle,
  Trash2,
  Plus,
  Send,
  MapPin,
  Phone,
  ShieldAlert,
} from "lucide-react";
import api, { BACKEND_URL } from "../api";

export default function AdminPanel() {
  const [subTab, setSubTab] = useState("users");
  const [users, setUsers] = useState([]);
  const [submissions, setSubmissions] = useState([]);
  const [products, setProducts] = useState([]);
  const [orders, setOrders] = useState([]);

  // Admin Chat state
  const [threads, setThreads] = useState([]);
  const [selectedUser, setSelectedUser] = useState(null);
  const [chatMessages, setChatMessages] = useState([]);
  const [replyText, setReplyText] = useState("");

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

  // Poll chat messages for selected user
  useEffect(() => {
    if (!selectedUser) return;
    const loadChat = async () => {
      try {
        const res = await api.get(`/chat/messages/?user_id=${selectedUser.id}`);
        setChatMessages(res.data);
      } catch (err) {
        console.error(err);
      }
    };
    loadChat();
    const interval = setInterval(loadChat, 3000);
    return () => clearInterval(interval);
  }, [selectedUser]);

  const handleToggleVerify = async (userId) => {
    try {
      await api.post(`/accounts/admin/users/${userId}/toggle_verification/`);
      fetchAllAdminData();
    } catch (err) {
      alert("Failed to update user verification.");
    }
  };

  const handleDeleteUser = async (userId) => {
    if (!window.confirm("Are you sure you want to delete this user?")) return;
    try {
      await api.delete(`/accounts/admin/users/${userId}/`);
      fetchAllAdminData();
    } catch (err) {
      alert("Could not delete user.");
    }
  };

  const handleCreateUser = async (e) => {
    e.preventDefault();
    try {
      const res = await api.post("/accounts/register/", newUser);
      // Auto-verify user added directly by Admin
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
      alert("User added and verified!");
    } catch (err) {
      alert("Failed to add user. Check email/phone uniqueness and password length (min 8).");
    }
  };

  const handleReviewSubmission = async (id, status, publishToStore = false) => {
    const remarks = window.prompt(
      "Optional remarks for the farmer/seller:",
      status === "APPROVED" ? "Approved! Our team will contact you for pickup." : ""
    );
    if (remarks === null) return;
    try {
      await api.post(`/marketplace/sell-submissions/${id}/review/`, {
        status,
        admin_remarks: remarks,
        publish_to_store: publishToStore,
      });
      fetchAllAdminData();
    } catch (err) {
      alert("Failed to review submission.");
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
      fetchAllAdminData();
    } catch (err) {
      alert("Failed to add product.");
    }
  };

  const handleDeleteProduct = async (id) => {
    if (!window.confirm("Remove this product from the store?")) return;
    await api.delete(`/marketplace/products/${id}/`);
    fetchAllAdminData();
  };

  const handleOrderStatus = async (orderId, status) => {
    await api.patch(`/marketplace/orders/${orderId}/`, { status });
    fetchAllAdminData();
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
      alert(err.response?.data?.error || "Could not send message.");
    }
  };
  const pendingUsersCount = users.filter((u) => !u.is_admin_verified && !u.is_staff).length;
  const pendingSubmissionsCount = submissions.filter((s) => s.status === "PENDING").length;

  return (
    <div className="space-y-6">
      {/* Top Summary Banner */}
      <div className="bg-gradient-to-r from-[#1B4332] to-[#2D6A4F] rounded-3xl p-6 text-white shadow-lg flex flex-wrap items-center justify-between gap-4">
        <div>
          <span className="text-xs uppercase tracking-widest text-amber-300 font-bold">
            KrishiMart Control Center
          </span>
          <h2 className="text-2xl font-extrabold mt-1">Admin Management Dashboard</h2>
          <p className="text-sm text-emerald-100">
            Verify users, approve farmer vegetable offers, manage inventory, and chat with customers.
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
            { id: "chat", label: "User Chat Inbox", icon: MessageSquare },
          ].map((tab) => {
            const Icon = tab.icon;
            return (
              <button
                key={tab.id}
                onClick={() => setSubTab(tab.id)}
                className={`px-4 py-2.5 rounded-xl text-sm font-semibold flex items-center gap-2 transition cursor-pointer ${
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

      {/* 1. USERS & VERIFICATION */}
      {subTab === "users" && (
        <div className="grid lg:grid-cols-3 gap-6">
          {/* Add User Form */}
          <form
            onSubmit={handleCreateUser}
            className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200 space-y-3 h-fit"
          >
            <h3 className="text-lg font-bold text-slate-900 flex items-center gap-2">
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

          {/* Users Table */}
          <div className="lg:col-span-2 bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
            <div className="p-5 border-b border-slate-100 flex justify-between items-center">
              <h3 className="font-bold text-slate-900">All Registered Users ({users.length})</h3>
              <span className="text-xs text-amber-700 bg-amber-50 px-3 py-1 rounded-full font-semibold">
                {pendingUsersCount} Pending Approval
              </span>
            </div>
            <div className="divide-y divide-slate-100">
              {users.map((u) => (
                <div
                  key={u.id}
                  className="p-4 flex flex-wrap items-center justify-between gap-4 hover:bg-slate-50"
                >
                  <div>
                    <div className="flex items-center gap-2">
                      <p className="font-bold text-slate-900">{u.full_name}</p>
                      <span className="text-xs px-2 py-0.5 rounded-md bg-slate-100 text-slate-700 font-semibold">
                        {u.role}
                      </span>
                      {u.is_admin_verified || u.is_staff ? (
                        <span className="inline-flex items-center gap-1 text-xs px-2.5 py-0.5 rounded-full bg-emerald-100 text-emerald-800 font-semibold">
                          <CheckCircle2 className="w-3.5 h-3.5" /> Verified
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-xs px-2.5 py-0.5 rounded-full bg-amber-100 text-amber-800 font-semibold">
                          <ShieldAlert className="w-3.5 h-3.5" /> Pending Admin Approval
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-slate-500 mt-1">
                      Email: <strong>{u.email || "—"}</strong> | Phone:{" "}
                      <strong>{u.phone_number || "—"}</strong> | Location:{" "}
                      <strong>{u.location || "—"}</strong>
                    </p>
                  </div>

                  {!u.is_staff && (
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
                        onClick={() => handleDeleteUser(u.id)}
                        className="p-2 text-red-600 hover:bg-red-50 rounded-xl cursor-pointer"
                        title="Delete User"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  )}
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
                        Rs. {sub.expected_price_per_unit} / {sub.unit}
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
                    onClick={() => handleReviewSubmission(sub.id, "APPROVED", true)}
                    className="flex-1 py-2 px-3 bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-bold rounded-xl cursor-pointer"
                  >
                    Approve & Publish to Store
                  </button>
                  <button
                    onClick={() => handleReviewSubmission(sub.id, "APPROVED", false)}
                    className="py-2 px-3 bg-emerald-100 hover:bg-emerald-200 text-emerald-900 text-xs font-bold rounded-xl cursor-pointer"
                  >
                    Approve Only
                  </button>
                  <button
                    onClick={() => handleReviewSubmission(sub.id, "REJECTED", false)}
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

      {/* 3. STORE INVENTORY */}
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
                placeholder="Price (Rs.) *"
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

          <div className="lg:col-span-2 grid sm:grid-cols-2 gap-4">
            {products.map((p) => (
              <div
                key={p.id}
                className="bg-white p-4 rounded-2xl border border-slate-200 flex justify-between items-center gap-4"
              >
                <div>
                  <span className="text-[11px] font-bold text-emerald-700">{p.category}</span>
                  <h4 className="font-bold text-slate-900">{p.name}</h4>
                  <p className="text-xs text-slate-500">
                    Rs. {p.price} / {p.unit} • Stock: {p.stock_quantity} {p.unit}
                  </p>
                </div>
                <button
                  onClick={() => handleDeleteProduct(p.id)}
                  className="p-2 text-red-600 hover:bg-red-50 rounded-xl cursor-pointer"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
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
                    Order #{o.id}: {o.product_name} ({o.quantity} {o.product_unit}) — Rs.{" "}
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
          {/* Left Sidebar: Buyers & Farmers List (Scrollable) */}
          <div className="border-b md:border-b-0 md:border-r border-slate-200 flex flex-col max-h-56 md:max-h-[560px]">
            <div className="p-4 border-b border-slate-100 font-bold text-sm text-slate-800 bg-slate-50 shrink-0">
              Buyers & Farmers ({threads.length})
            </div>
            <div className="overflow-y-auto flex-1 divide-y divide-slate-100">
              {threads.map((u) => (
                <button
                  key={u.id}
                  onClick={() => setSelectedUser(u)}
                  className={`w-full text-left p-3.5 hover:bg-emerald-50/60 transition cursor-pointer ${
                    selectedUser?.id === u.id
                      ? "bg-emerald-50 border-l-4 border-l-[#1B4332]"
                      : ""
                  }`}
                >
                  <p className="font-bold text-sm text-slate-900">{u.full_name}</p>
                  <p className="text-xs text-slate-500">
                    {u.role} • {u.location || u.phone_number || u.email}
                  </p>
                </button>
              ))}
            </div>
          </div>

          {/* Right Panel: Conversation Messages + Pinned Reply Box */}
          <div className="md:col-span-2 flex flex-col h-[500px] md:h-[560px] min-h-0">
            {selectedUser ? (
              <>
                {/* Pinned Header */}
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

                {/* Scrollable Messages Container */}
                <div className="flex-1 min-h-0 p-4 overflow-y-auto space-y-3 bg-[#F8FAF7]">
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
                          <p className=" break-words">{m.message}</p>
                          <span className="block text-[10px] opacity-75 mt-1">
                            {m.is_from_admin
                              ? "KrishiMart Admin (You)"
                              : m.conversation_user_name}
                          </span>
                        </div>
                      </div>
                    ))
                  )}
                </div>

                {/* Pinned Bottom Input Form */}
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
    </div>
  );
}