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
  CreditCard,
  Receipt,
  Star,
  BookOpen,
  Eye,
  EyeOff,
} from "lucide-react";
import api, { BACKEND_URL } from "../api";


function resolveMediaUrl(rawUrl, userId = null) {
  if (userId) {
    try {
      const cached = localStorage.getItem(`krishimart_avatar_${userId}`);
      if (cached && cached.startsWith("data:image/")) return cached;
    } catch {}
  }
  if (!rawUrl || typeof rawUrl !== "string") return "";
  const trimmed = rawUrl.trim();
  if (!trimmed) return "";
  if (trimmed.startsWith("data:image/") || trimmed.startsWith("blob:")) return trimmed;

  const mediaIdx = trimmed.indexOf("/media/");
  if (mediaIdx !== -1) {
    const mediaPath = trimmed.slice(mediaIdx);
    const cleanBase = (BACKEND_URL || "").replace(/\/+$/, "");
    return `${cleanBase}${mediaPath}`;
  }
  if (trimmed.startsWith("http://")) {
    if (
      trimmed.includes("onrender.com") ||
      (typeof window !== "undefined" && window.location.protocol === "https:")
    ) {
      return trimmed.replace(/^http:\/\//i, "https://");
    }
    if (trimmed.includes("127.0.0.1:8000") || trimmed.includes("localhost:8000")) {
      const pathPart = trimmed.replace(/^https?:\/\/[^/]+/i, "");
      return `${(BACKEND_URL || "").replace(/\/+$/, "")}${pathPart}`;
    }
    return trimmed;
  }
  if (trimmed.startsWith("https://")) return trimmed;
  const cleanBase = (BACKEND_URL || "").replace(/\/+$/, "");
  return `${cleanBase}${trimmed.startsWith("/") ? "" : "/"}${trimmed}`;
}

function fileToCompressedDataUri(file, maxDim = 700, quality = 0.82) {
  return new Promise((resolve) => {
    if (!file) return resolve(null);
    const reader = new FileReader();
    reader.onload = (ev) => {
      const img = new Image();
      img.onload = () => {
        try {
          let w = img.width || 400;
          let h = img.height || 400;
          if (w > maxDim || h > maxDim) {
            if (w > h) {
              h = Math.round((h * maxDim) / w);
              w = maxDim;
            } else {
              w = Math.round((w * maxDim) / h);
              h = maxDim;
            }
          }
          const canvas = document.createElement("canvas");
          canvas.width = w;
          canvas.height = h;
          const ctx = canvas.getContext("2d");
          ctx.drawImage(img, 0, 0, w, h);
          const dataUri = canvas.toDataURL("image/jpeg", quality);
          resolve(dataUri);
        } catch {
          resolve(ev.target?.result || null);
        }
      };
      img.onerror = () => resolve(ev.target?.result || null);
      img.src = ev.target?.result;
    };
    reader.onerror = () => resolve(null);
    reader.readAsDataURL(file);
  });
}

export default function AdminPanel() {
  const [subTab, setSubTab] = useState("users");
  const [users, setUsers] = useState([]);
  const [submissions, setSubmissions] = useState([]);
  const [purchases, setPurchases] = useState([]);
  const [products, setProducts] = useState([]);
  const [orders, setOrders] = useState([]);
  const [stories, setStories] = useState([]);
  const [loadingAdmin, setLoadingAdmin] = useState(true);
  const [toast, setToast] = useState(null);

  // User search & filter states
  const [userSearch, setUserSearch] = useState("");
  const [userFilter, setUserFilter] = useState("ALL");

  // Search & Filter states across all Admin tabs
  const [orderSearch, setOrderSearch] = useState("");
  const [adminOrderFilter, setAdminOrderFilter] = useState("ALL"); // "ALL" | "PENDING" | "CONFIRMED" | "DELIVERED" | "CANCELLED"
  const [adminOrderSort, setAdminOrderSort] = useState("NEWEST");

  const [subSearch, setSubSearch] = useState("");
  const [subFilter, setSubFilter] = useState("ALL"); // "ALL" | "PENDING" | "BOUGHT" | "APPROVED" | "REJECTED"

  const [purchaseSearch, setPurchaseSearch] = useState("");
  const [purchaseFilter, setPurchaseFilter] = useState("ALL"); // "ALL" | "PENDING" | "PAID"

  const [storyFilter, setStoryFilter] = useState("ALL"); // "ALL" | "PENDING" | "APPROVED" | "REJECTED" | "FARMER_STORY" | "BUYER_REVIEW"
  const [analyticsRange, setAnalyticsRange] = useState("ALL"); // "ALL" | "30D" | "7D" | "TODAY"
  const [chartMode, setChartMode] = useState("BOTH"); // "BOTH" | "PIE" | "BAR"
  const [productAdminSearch, setProductAdminSearch] = useState("");
  const [productAdminCat, setProductAdminCat] = useState("ALL");

  // Admin Chat state (Messenger Inbox)
  const [threads, setThreads] = useState([]);
  const [selectedUser, setSelectedUser] = useState(null);
  const [chatMessages, setChatMessages] = useState([]);
  const [replyText, setReplyText] = useState("");
  const [chatThreadSearch, setChatThreadSearch] = useState("");
  const [chatThreadFilter, setChatThreadFilter] = useState("ALL"); // "ALL" | "UNREAD" | "FARMER" | "CUSTOMER"
  const [adminChatActionMsg, setAdminChatActionMsg] = useState(null);
  const chatContainerRef = useRef(null);

  // "Buy from Farmer" Procurement Modal State
  const [buyModal, setBuyModal] = useState(null);
  const [procureForm, setProcureForm] = useState({
    quantity: "",
    agreed_wholesale_rate: "",
    payment_method: "CASH",
    payment_status: "PAID",
    admin_notes: "",
    publish_to_store: true,
    retail_price: "",
    actual_price: "",
  });

  // Decline Modal State
  const [declineModal, setDeclineModal] = useState(null);
  const [declineRemarks, setDeclineRemarks] = useState("");

  // Edit Product Modal state
  const [editingProduct, setEditingProduct] = useState(null);
  const [receiptOrder, setReceiptOrder] = useState(null);
  const [receiptDiscount, setReceiptDiscount] = useState(0);
  const [orderDiscounts, setOrderDiscounts] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem("krishimart_order_discounts") || "{}");
    } catch {
      return {};
    }
  });
  const [emailSentOrders, setEmailSentOrders] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem("krishimart_confirmed_emails_sent") || "{}");
    } catch {
      return {};
    }
  });

  // Always compute the true pre-discount subtotal (unit_price * quantity) so the main price is 100% consistent
  const getTrueOrderSubtotal = (order) => {
    if (!order) return 0;
    const matchedProd = products.find(
      (p) => p.id === order.product || p.name === order.product_name
    );
    if (matchedProd && Number(matchedProd.price) > 0) {
      return Number(matchedProd.price) * Number(order.quantity || 1);
    }
    return Number(order.original_subtotal || order.total_price || 0);
  };

  // Computes exact Net Payable (after Admin discount %) and Discount Amount for financial analytics
  const getOrderNetFinancials = (order) => {
    const subtotal = getTrueOrderSubtotal(order);
    const apiDisc =
      order?.discount_percent !== undefined ? Number(order.discount_percent || 0) : 0;
    const localDisc = Number(orderDiscounts[order?.id] ?? 0);
    const discPct = Math.min(100, Math.max(0, apiDisc > 0 ? apiDisc : localDisc));
    const discAmt = Number(((subtotal * discPct) / 100).toFixed(2));
    const netPayable = Number(Math.max(0, subtotal - discAmt).toFixed(2));
    return { subtotal, discPct, discAmt, netPayable };
  };

  // Add Product state
  const [newProduct, setNewProduct] = useState({
    name: "",
    category: "VEGETABLES",
    actual_price: "",
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
  const [showNewUserPassword, setShowNewUserPassword] = useState(false);
  const [showNewUserConfirm, setShowNewUserConfirm] = useState(false);
  const [showAddUserForm, setShowAddUserForm] = useState(false);
  const [showAddProductForm, setShowAddProductForm] = useState(false);

  const showToast = (message, type = "success") => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3500);
  };

  const fetchAllAdminData = async () => {
    try {
      const [uRes, sRes, purRes, pRes, oRes, tRes, storyRes] = await Promise.all([
        api.get("/accounts/admin/users/"),
        api.get("/marketplace/sell-submissions/"),
        api.get("/marketplace/farmer-purchases/"),
        api.get("/marketplace/products/"),
        api.get("/marketplace/orders/"),
        api.get("/chat/messages/threads/"),
        api.get("/marketplace/stories/"),
      ]);
      setUsers(uRes.data);
      setSubmissions(sRes.data);
      setPurchases(purRes.data);
      setProducts(pRes.data);
      setOrders(oRes.data);
      setThreads(tRes.data);
      setStories(storyRes.data);
      // Never auto-open a chat without the Admin clicking it; only refresh metadata if already open
      setSelectedUser((prev) =>
        prev ? tRes.data.find((u) => u.id === prev.id) || prev : null
      );
    } catch (err) {
      console.error("Admin auto-sync error:", err);
    } finally {
      setLoadingAdmin(false);
    }
  };

  // Real-time auto-refresh every 3.5 seconds
  useEffect(() => {
    fetchAllAdminData();
    const interval = setInterval(fetchAllAdminData, 3500);
    return () => clearInterval(interval);
  }, []);

  // Poll chat messages ONLY when Admin has the Chat tab open AND clicked a user
  useEffect(() => {
    if (!selectedUser || subTab !== "chat") return;
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
  }, [selectedUser?.id, subTab]);

  useEffect(() => {
    if (chatContainerRef.current) {
      chatContainerRef.current.scrollTop = chatContainerRef.current.scrollHeight;
    }
  }, [chatMessages.length, selectedUser?.id]);

  const handleToggleStoryStatus = async (storyId, newStatus) => {
    try {
      await api.post(`/marketplace/stories/${storyId}/toggle_status/`, { status: newStatus });
      showToast(`Story/Review status updated to ${newStatus}!`);
      fetchAllAdminData();
    } catch {
      showToast("Could not update story status.", "error");
    }
  };

  const handleDeleteStory = async (storyId) => {
    try {
      await api.delete(`/marketplace/stories/${storyId}/`);
      showToast("Story/Review deleted.");
      fetchAllAdminData();
    } catch {
      showToast("Could not delete story.", "error");
    }
  };

  const handleOpenBuyModal = (sub) => {
    setBuyModal(sub);
    setProcureForm({
      quantity: sub.quantity,
      agreed_wholesale_rate: sub.expected_price_per_unit,
      payment_method: "CASH",
      payment_status: "PAID",
      admin_notes: `Harvest pickup from ${sub.pickup_location}. Quality verified.`,
      publish_to_store: true,
      retail_price: (Number(sub.expected_price_per_unit) * 1.2).toFixed(2),
      actual_price: (Number(sub.expected_price_per_unit) * 1.35).toFixed(2),
    });
  };

  const handleConfirmPurchase = async (e) => {
    e.preventDefault();
    if (!buyModal) return;
    try {
      const res = await api.post(
        `/marketplace/sell-submissions/${buyModal.id}/buy_from_farmer/`,
        procureForm
      );
      showToast(res.data.message || `Successfully bought ${buyModal.vegetable_name}!`);
      setBuyModal(null);
      fetchAllAdminData();
    } catch (err) {
      showToast(err.response?.data?.error || "Failed to complete purchase.", "error");
    }
  };
  const handleMarkFarmerPurchasePaid = async (purchaseId) => {
    try {
      const res = await api.post(`/marketplace/farmer-purchases/${purchaseId}/mark_paid/`);
      showToast(res.data?.message || "Farmer payout marked as PAID!");
      fetchAllAdminData();
    } catch (err) {
      showToast(err.response?.data?.error || "Failed to update payment status.", "error");
    }
  };

  const handleDeleteFarmerPurchase = async (purchaseId) => {
    if (!window.confirm("Delete this farmer purchase record permanently?")) return;
    try {
      const res = await api.post(`/marketplace/farmer-purchases/${purchaseId}/remove/`);
      showToast(res.data?.message || "Farmer purchase record deleted.");
      fetchAllAdminData();
    } catch (err) {
      showToast(err.response?.data?.error || "Failed to delete purchase record.", "error");
    }
  };

  const handleConfirmDecline = async (e) => {
    e.preventDefault();
    if (!declineModal) return;
    try {
      await api.post(`/marketplace/sell-submissions/${declineModal.id}/review/`, {
        status: "REJECTED",
        admin_remarks: declineRemarks || "Declined: Current warehouse storage is full.",
      });
      showToast(`Declined offer for "${declineModal.vegetable_name}".`);
      setDeclineModal(null);
      setDeclineRemarks("");
      fetchAllAdminData();
    } catch {
      showToast("Failed to decline offer.", "error");
    }
  };

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
      setShowAddUserForm(false);
      fetchAllAdminData();
      showToast("New user created and verified!");
    } catch {
      showToast("Check email/phone uniqueness and password length (min 8).", "error");
    }
  };

const handleAddProduct = async (e) => {
    e.preventDefault();
    try {
      const formData = new FormData();
      Object.entries(newProduct).forEach(([key, val]) => {
        if (val !== null && val !== "") formData.append(key, val);
      });
      formData.append("is_available", "true");
      await api.post("/marketplace/products/", formData);
      setNewProduct({
        name: "",
        category: "VEGETABLES",
        actual_price: "",
        price: "",
        unit: "kg",
        stock_quantity: "",
        origin_location: "",
        description: "",
        image: null,
      });
      setShowAddProductForm(false);
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
        actual_price: editingProduct.actual_price || "",
        price: editingProduct.price,
        unit: editingProduct.unit,
        stock_quantity: editingProduct.stock_quantity,
        origin_location: editingProduct.origin_location,
        description: editingProduct.description,
      });
      showToast(`Updated "${editingProduct.name}" details.`);
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
      const res = await api.patch(`/marketplace/orders/${orderId}/`, { status });
      showToast(
        status === "CONFIRMED"
          ? `Order #${orderId} status set to CONFIRMED. Apply discount (0% or more) in receipt to send email.`
          : `Order #${orderId} marked as ${status} (Notification email sent).`
      );
      fetchAllAdminData();
      if (status === "CONFIRMED") {
        const targetOrder = orders.find((o) => o.id === orderId) || res.data;
        const savedDisc = orderDiscounts[orderId] ?? 0;
        setReceiptDiscount(savedDisc);
        setReceiptOrder({
          ...targetOrder,
          original_subtotal: getTrueOrderSubtotal(targetOrder),
          status: "CONFIRMED",
        });
      }
    } catch {
      showToast("Could not update order status.", "error");
    }
  };

  // Saves Discount (%) and sends the Confirmed Receipt Email strictly ONE TIME
  const handleApplyDiscountAndEmail = async (order, discountPct) => {
    if (!order) return;
    const cleanDisc = Math.min(100, Math.max(0, Number(discountPct || 0)));

    // Persist discount % for this order in localStorage so reopening the receipt is always consistent
    const updatedDiscounts = { ...orderDiscounts, [order.id]: cleanDisc };
    setOrderDiscounts(updatedDiscounts);
    localStorage.setItem("krishimart_order_discounts", JSON.stringify(updatedDiscounts));

    try {
      const res = await api.post(
        `/marketplace/orders/${order.id}/apply_discount_and_email/`,
        { discount_percent: cleanDisc }
      );

      const updatedSent = { ...emailSentOrders, [order.id]: true };
      setEmailSentOrders(updatedSent);
      localStorage.setItem("krishimart_confirmed_emails_sent", JSON.stringify(updatedSent));

      fetchAllAdminData();
      showToast(
        res.data?.message ||
          `Discount (${cleanDisc}%) applied and confirmation email sent to customer!`
      );
    } catch {
      showToast("Could not apply discount or send email. Make sure backend views.py is updated.", "error");
    }
  };

  // Feature 3: Export Farmer Purchases or Customer Orders to Excel-compatible CSV
  const handleExportCSV = (filename, headers, rows) => {
    const escapeCell = (val) => {
      const str = String(val ?? "").replace(/"/g, '""');
      return `"${str}"`;
    };
    const csvContent =
      "\uFEFF" +
      [headers.map(escapeCell).join(","), ...rows.map((r) => r.map(escapeCell).join(","))].join(
        "\n"
      );
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = filename;
    link.click();
    showToast(`Exported ${filename} successfully!`);
  };

  // Print receipt formatted to exact 1/4 of an A4 page (105mm x 148.5mm) with Discount %
  const handlePrintQuarterA4 = (order, rawDiscountPercent = 0) => {
    const subtotal = Number(order.total_price || 0);
    const discountPct = Math.min(100, Math.max(0, Number(rawDiscountPercent || 0)));
    const discountAmt = subtotal * (discountPct / 100);
    const netTotal = (subtotal - discountAmt).toFixed(2);

    const paymentMatch = (order.delivery_address || "").match(/\[(COD|ESEWA|KHALTI)\]/i);
    const paymentMode = paymentMatch ? paymentMatch[1].toUpperCase() : "COD";
    const cleanAddress = (order.delivery_address || "").replace(/\s*\[(COD|ESEWA|KHALTI)\]/i, "");
    const unitRate = (subtotal / Number(order.quantity || 1)).toFixed(2);
    const dateStr = new Date(order.created_at).toLocaleString("en-NP", {
      dateStyle: "medium",
      timeStyle: "short",
    });

    const printWindow = window.open("", "_blank", "width=800,height=900");
    if (!printWindow) return;

    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>KrishiMart Receipt #KM-${order.id}</title>
          <style>
            @page {
              size: A4 portrait;
              margin: 8mm;
            }
            * {
              box-sizing: border-box;
              margin: 0;
              padding: 0;
              font-family: 'Segoe UI', Inter, Arial, sans-serif;
            }
            body {
              background: #ffffff;
              color: #0f172a;
            }
            .quarter-a4-slip {
              width: 97mm;
              height: 138mm;
              border: 1.5px solid #14532d;
              border-right: 1.5px dashed #64748b;
              border-bottom: 1.5px dashed #64748b;
              padding: 4.5mm;
              display: flex;
              flex-direction: column;
              justify-content: space-between;
              position: relative;
            }
            .cut-note {
              position: absolute;
              bottom: -4.5mm;
              left: 0;
              font-size: 7pt;
              color: #64748b;
            }
            .header {
              text-align: center;
              border-bottom: 1.5px solid #14532d;
              padding-bottom: 2mm;
            }
            .brand {
              font-size: 13pt;
              font-weight: 900;
              color: #14532d;
              letter-spacing: 0.5px;
            }
            .sub {
              font-size: 7.5pt;
              color: #475569;
              margin-top: 1px;
            }
            .meta {
              display: flex;
              justify-content: space-between;
              font-size: 8pt;
              padding: 2mm 0;
              border-bottom: 1px dashed #cbd5e1;
            }
            .badge {
              background: #dcfce7;
              color: #14532d;
              font-weight: 800;
              padding: 1px 6px;
              border-radius: 4px;
              font-size: 7.5pt;
            }
            .customer-box {
              background: #f8fafc;
              border: 1px solid #e2e8f0;
              border-radius: 6px;
              padding: 2.2mm;
              font-size: 8pt;
              line-height: 1.4;
              margin: 1.5mm 0;
            }
            table {
              width: 100%;
              border-collapse: collapse;
              font-size: 8.5pt;
              margin: 1mm 0;
            }
            th {
              text-align: left;
              border-bottom: 1px solid #0f172a;
              padding: 1.2mm 0;
              font-size: 7.5pt;
              text-transform: uppercase;
              color: #475569;
            }
            td {
              padding: 2mm 0;
              border-bottom: 1px dashed #cbd5e1;
              font-weight: 600;
            }
            .summary-rows {
              font-size: 8pt;
              padding: 1.5mm 0;
              line-height: 1.5;
            }
            .summary-line {
              display: flex;
              justify-content: space-between;
            }
            .total-box {
              background: #14532d;
              color: #ffffff;
              padding: 2.2mm 3mm;
              border-radius: 6px;
              display: flex;
              justify-content: space-between;
              align-items: center;
              font-size: 9.5pt;
              font-weight: 900;
              margin-top: 1mm;
            }
            .footer {
              border-top: 1px solid #e2e8f0;
              padding-top: 2mm;
              display: flex;
              justify-content: space-between;
              align-items: flex-end;
              font-size: 7.5pt;
              color: #475569;
            }
            .sig-line {
              border-top: 1px solid #0f172a;
              width: 32mm;
              text-align: center;
              padding-top: 1mm;
              font-weight: 700;
              color: #0f172a;
            }
          </style>
        </head>
        <body>
          <div class="quarter-a4-slip">
            <div>
              <div class="header">
                <div class="brand">🌱 KRISHIMART NEPAL</div>
                <div class="sub">Dhangadhi Hub & Kathmandu Valley • Tel: +977-1-4423456</div>
                <div class="sub" style="font-weight:700; color:#0f172a; margin-top:2px;">OFFICIAL ORDER DISPATCH RECEIPT</div>
              </div>

              <div class="meta">
                <div>
                  <strong>Receipt:</strong> #KM-ORD-${order.id}<br/>
                  <strong>Date:</strong> ${dateStr}
                </div>
                <div style="text-align:right;">
                  <span class="badge">${order.status}</span><br/>
                  <span style="font-size:7.5pt;">Pay: <strong>${paymentMode}</strong></span>
                </div>
              </div>

              <div class="customer-box">
                <div><strong>Customer:</strong> ${order.buyer_name}</div>
                <div><strong>Phone:</strong> ${order.contact_phone}</div>
                <div><strong>Address:</strong> ${cleanAddress}</div>
              </div>

              <table>
                <thead>
                  <tr>
                    <th>Produce Item</th>
                    <th>Qty</th>
                    <th>Rate</th>
                    <th style="text-align:right;">Subtotal</th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td>${order.product_name}</td>
                    <td>${order.quantity} ${order.product_unit}</td>
                    <td>रु ${unitRate}</td>
                    <td style="text-align:right;">रु ${subtotal.toFixed(2)}</td>
                  </tr>
                </tbody>
              </table>

              <div class="summary-rows">
                <div class="summary-line">
                  <span>Subtotal Amount:</span>
                  <strong>रु ${subtotal.toFixed(2)}</strong>
                </div>
                <div class="summary-line" style="color:#b45309;">
                  <span>Discount (${discountPct}%):</span>
                  <strong>- रु ${discountAmt.toFixed(2)}</strong>
                </div>
              </div>

              <div class="total-box">
                <span>TOTAL PAYABLE</span>
                <span>रु ${Number(netTotal).toLocaleString()}</span>
              </div>
            </div>

            <div class="footer">
              <div>
                <strong>100% Farm-Fresh Verified</strong><br/>
                Thank you for shopping at KrishiMart!
              </div>
              <div class="sig-line">Authorized Stamp</div>
            </div>
            <div class="cut-note">✂️ 1/4 A4 Cut Guide (105mm × 148.5mm)</div>
          </div>
          <script>
            window.onload = function() {
              window.print();
            };
          </script>
        </body>
      </html>
    `);
    printWindow.document.close();
  };

  // Download high-resolution 1/4 A4 PNG Receipt with Discount %
  const handleDownloadReceiptPNG = (order, rawDiscountPercent = 0) => {
    const subtotal = Number(order.total_price || 0);
    const discountPct = Math.min(100, Math.max(0, Number(rawDiscountPercent || 0)));
    const discountAmt = subtotal * (discountPct / 100);
    const netTotal = (subtotal - discountAmt).toFixed(2);

    const paymentMatch = (order.delivery_address || "").match(/\[(COD|ESEWA|KHALTI)\]/i);
    const paymentMode = paymentMatch ? paymentMatch[1].toUpperCase() : "COD";
    const cleanAddress = (order.delivery_address || "").replace(/\s*\[(COD|ESEWA|KHALTI)\]/i, "");
    const unitRate = (subtotal / Number(order.quantity || 1)).toFixed(2);
    const dateStr = new Date(order.created_at).toLocaleDateString("en-NP");

    const canvas = document.createElement("canvas");
    canvas.width = 630;
    canvas.height = 890;
    const ctx = canvas.getContext("2d");

    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.strokeStyle = "#14532d";
    ctx.lineWidth = 4;
    ctx.strokeRect(16, 16, canvas.width - 32, canvas.height - 32);

    ctx.fillStyle = "#14532d";
    ctx.fillRect(16, 16, canvas.width - 32, 115);
    ctx.fillStyle = "#ffffff";
    ctx.font = "bold 28px Segoe UI, sans-serif";
    ctx.fillText("KRISHIMART NEPAL", 40, 62);
    ctx.fillStyle = "#fde68a";
    ctx.font = "bold 14px Segoe UI, sans-serif";
    ctx.fillText("OFFICIAL ORDER DISPATCH RECEIPT (1/4 A4)", 40, 90);
    ctx.fillStyle = "#d1fae5";
    ctx.font = "13px Segoe UI, sans-serif";
    ctx.fillText("Dhangadhi Hub & Kathmandu • Helpline: +977-1-4423456", 40, 114);

    ctx.fillStyle = "#0f172a";
    ctx.font = "bold 16px Segoe UI, sans-serif";
    ctx.fillText(`Receipt No: #KM-ORD-${order.id}`, 40, 170);
    ctx.fillText(`Status: ${order.status}`, 410, 170);
    ctx.font = "14px Segoe UI, sans-serif";
    ctx.fillStyle = "#475569";
    ctx.fillText(`Order Date: ${dateStr}`, 40, 196);
    ctx.fillText(`Payment Mode: ${paymentMode}`, 410, 196);

    ctx.fillStyle = "#f8fafc";
    ctx.fillRect(40, 220, canvas.width - 80, 120);
    ctx.strokeStyle = "#cbd5e1";
    ctx.lineWidth = 1.5;
    ctx.strokeRect(40, 220, canvas.width - 80, 120);

    ctx.fillStyle = "#0f172a";
    ctx.font = "bold 15px Segoe UI, sans-serif";
    ctx.fillText(`Customer Name: ${order.buyer_name}`, 58, 250);
    ctx.font = "15px Segoe UI, sans-serif";
    ctx.fillText(`Contact Phone: ${order.contact_phone}`, 58, 282);
    ctx.fillText(`Delivery Address: ${cleanAddress.slice(0, 42)}`, 58, 314);

    ctx.fillStyle = "#1e293b";
    ctx.font = "bold 14px Segoe UI, sans-serif";
    ctx.fillText("PRODUCE ITEM", 40, 380);
    ctx.fillText("QTY", 320, 380);
    ctx.fillText("RATE", 410, 380);
    ctx.fillText("SUBTOTAL", 500, 380);

    ctx.beginPath();
    ctx.moveTo(40, 392);
    ctx.lineTo(canvas.width - 40, 392);
    ctx.strokeStyle = "#0f172a";
    ctx.stroke();

    ctx.fillStyle = "#0f172a";
    ctx.font = "bold 16px Segoe UI, sans-serif";
    ctx.fillText(String(order.product_name).slice(0, 25), 40, 428);
    ctx.font = "15px Segoe UI, sans-serif";
    ctx.fillText(`${order.quantity} ${order.product_unit}`, 320, 428);
    ctx.fillText(`Rs. ${unitRate}`, 410, 428);
    ctx.font = "bold 16px Segoe UI, sans-serif";
    ctx.fillText(`Rs. ${subtotal.toFixed(2)}`, 500, 428);

    // Subtotal & Discount % Rows
    ctx.font = "15px Segoe UI, sans-serif";
    ctx.fillStyle = "#334155";
    ctx.fillText("Subtotal Amount:", 300, 480);
    ctx.fillText(`Rs. ${subtotal.toFixed(2)}`, 495, 480);

    ctx.fillStyle = "#b45309";
    ctx.font = "bold 15px Segoe UI, sans-serif";
    ctx.fillText(`Discount (${discountPct}%):`, 300, 508);
    ctx.fillText(`- Rs. ${discountAmt.toFixed(2)}`, 490, 508);

    // Grand Total Bar
    ctx.fillStyle = "#14532d";
    ctx.fillRect(40, 530, canvas.width - 80, 58);
    ctx.fillStyle = "#ffffff";
    ctx.font = "bold 18px Segoe UI, sans-serif";
    ctx.fillText("TOTAL PAYABLE (AFTER DISCOUNT)", 58, 566);
    ctx.fillStyle = "#fde68a";
    ctx.font = "bold 22px Segoe UI, sans-serif";
    ctx.fillText(`Rs. ${Number(netTotal).toLocaleString()}`, 445, 566);

    ctx.fillStyle = "#475569";
    ctx.font = "italic 14px Segoe UI, sans-serif";
    ctx.fillText("100% Nepal Origin Verified • Fresh From the Farm", 40, 645);
    ctx.font = "bold 14px Segoe UI, sans-serif";
    ctx.fillStyle = "#0f172a";
    ctx.fillText("Authorized Signature: _______________________", 260, 790);
    ctx.fillStyle = "#64748b";
    ctx.font = "13px Segoe UI, sans-serif";
    ctx.fillText("Thank you for choosing KrishiMart!", 40, 840);

    const link = document.createElement("a");
    link.download = `KrishiMart_Receipt_Order_${order.id}.png`;
    link.href = canvas.toDataURL("image/png");
    link.click();
  };
  const handleDeleteSubmission = async (id, cropName) => {
    try {
      await api.delete(`/marketplace/sell-submissions/${id}/`);
      showToast(`Deleted farmer offer "${cropName}".`);
      fetchAllAdminData();
    } catch {
      showToast("Failed to delete farmer offer.", "error");
    }
  };

  const handleDeleteOrder = async (orderId) => {
    try {
      await api.delete(`/marketplace/orders/${orderId}/`);
      showToast(`Deleted Order #${orderId}.`);
      fetchAllAdminData();
    } catch {
      showToast("Failed to delete order.", "error");
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

  const handleClearChatThread = async (mode = "everyone") => {
    if (!selectedUser || chatMessages.length === 0) return;
    try {
      await api.delete(
        `/chat/messages/clear_thread/?user_id=${selectedUser.id}&mode=${mode}`
      );
      setChatMessages([]);
      showToast(
        mode === "me"
          ? `Cleared chat with ${selectedUser.full_name} from your view.`
          : `Cleared entire conversation with ${selectedUser.full_name} for everyone.`
      );
      fetchAllAdminData();
    } catch {
      showToast("Failed to clear chat history.", "error");
    }
  };

  const handleDeleteSingleMessage = async (msgId, mode = "everyone") => {
    try {
      await api.delete(`/chat/messages/${msgId}/?mode=${mode}`);
      if (mode === "me") {
        setChatMessages((prev) => prev.filter((m) => m.id !== msgId));
        showToast("Message removed from your view.");
      } else {
        setChatMessages((prev) =>
          prev.map((m) =>
            m.id === msgId
              ? { ...m, message: "🚫 This message was unsent", is_unsent: true }
              : m
          )
        );
        showToast("Message unsent for everyone.");
      }
      setAdminChatActionMsg(null);
    } catch {
      showToast("Could not delete message.", "error");
    }
  };

  const pendingUsersCount = users.filter((u) => !u.is_admin_verified && !u.is_staff).length;
  const pendingSubmissionsCount = submissions.filter((s) => s.status === "PENDING").length;
  const pendingStoriesCount = stories.filter((st) => st.status === "PENDING").length;
  const pendingOrdersCount = orders.filter((o) => o.status === "PENDING").length;
  const totalUnreadChats = threads.reduce((acc, t) => acc + (t.unread_count || 0), 0);
  const totalProcuredAmount = purchases.reduce((sum, p) => sum + Number(p.total_amount || 0), 0);

  return (
    <div className="space-y-6 relative">
      <style>{`
        @keyframes kmAdminShimmer {
          0% { background-position: -200% 0; }
          100% { background-position: 200% 0; }
        }
        .km-shimmer {
          background: linear-gradient(90deg, #e2e8f0 25%, #f8fafc 50%, #e2e8f0 75%);
          background-size: 200% 100%;
          animation: kmAdminShimmer 1.4s infinite linear;
        }
      `}</style>
      {/* Toast Notification */}
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

      {/* Executive Command Center Header + Segmented Navigation Dock */}
      <div className="bg-gradient-to-r from-[#0F3822] via-[#14532D] to-[#1B4332] rounded-3xl p-5 sm:p-7 text-white shadow-xl border border-emerald-800/60 relative overflow-hidden">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 relative z-10">
          <div className="space-y-1">
            <div className="flex flex-wrap items-center gap-2">
              <span className="px-2.5 py-0.5 rounded-full bg-amber-400/20 border border-amber-300/40 text-amber-300 text-[10px] font-black uppercase tracking-widest">
                🌱 KrishiMart Executive Control Center
              </span>
              <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-emerald-950/60 border border-emerald-700/60 text-emerald-200 text-[10px] font-bold">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                Real-Time Cloud Sync (3.5s)
              </span>
            </div>
            <h2 className="text-xl sm:text-3xl font-black tracking-tight mt-1">
              Admin Operations & Financial Hub
            </h2>
            <p className="text-xs sm:text-sm text-emerald-100/90 max-w-2xl">
              Manage wholesale farmer procurement, customer orders, 1/4 A4 discounted receipts,
              user verifications, and real-time P&L analytics from one unified workspace.
            </p>
          </div>

          {/* Right Quick Action Summary Pill */}
          <div className="flex flex-wrap items-center gap-2.5 shrink-0">
            {(pendingOrdersCount + pendingSubmissionsCount + pendingUsersCount) > 0 && (
              <div className="px-3.5 py-2 rounded-2xl bg-amber-400/15 border border-amber-300/30 text-amber-200 text-xs font-bold flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-amber-400 animate-ping" />
                <span>
                  {pendingOrdersCount + pendingSubmissionsCount + pendingUsersCount} Pending
                  Action(s)
                </span>
              </div>
            )}
            <button
              type="button"
              onClick={() => setSubTab(subTab === "analytics" ? "orders" : "analytics")}
              className="px-4 py-2.5 rounded-2xl bg-amber-400 hover:bg-amber-300 text-slate-950 font-black text-xs sm:text-sm flex items-center gap-2 shadow-md transition cursor-pointer"
            >
              <CreditCard className="w-4 h-4" />
              <span>
                {subTab === "analytics" ? "← Back to Operations" : "📊 View Analytics & P&L"}
              </span>
            </button>
          </div>
        </div>

        {/* Sleek Segmented Navigation Dock */}
        <div className="mt-5 pt-4 border-t border-white/10 flex items-center gap-1.5 overflow-x-auto no-scrollbar">
          {[
            {
              id: "analytics",
              label: "Analytics & P&L",
              icon: CreditCard,
              badge: 0,
            },
            {
              id: "orders",
              label: "Customer Orders",
              icon: ShoppingBag,
              badge: pendingOrdersCount,
            },
            {
              id: "submissions",
              label: "Farmer Offers",
              icon: Sprout,
              badge: pendingSubmissionsCount,
            },
            {
              id: "purchases",
              label: "Farmer Ledger",
              icon: Receipt,
              badge: purchases.filter((p) => p.payment_status === "PENDING").length,
            },
            {
              id: "products",
              label: "Store Inventory",
              icon: Package,
              badge: 0,
            },
            {
              id: "users",
              label: "Users & Roles",
              icon: Users,
              badge: pendingUsersCount,
            },
            {
              id: "chat",
              label: "Messenger Inbox",
              icon: MessageSquare,
              badge: totalUnreadChats,
            },
            {
              id: "stories",
              label: "Stories & Reviews",
              icon: BookOpen,
              badge: pendingStoriesCount,
            },
          ].map((tab) => {
            const Icon = tab.icon;
            const active = subTab === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => setSubTab(tab.id)}
                className={`px-3.5 py-2.5 rounded-2xl text-xs font-extrabold whitespace-nowrap flex items-center gap-2 transition cursor-pointer shrink-0 ${
                  active
                    ? "bg-white text-[#14532D] shadow-md scale-[1.01]"
                    : "bg-white/10 text-emerald-50 hover:bg-white/20"
                }`}
              >
                <Icon className={`w-4 h-4 ${active ? "text-[#14532D]" : "text-amber-300"}`} />
                <span>{tab.label}</span>
                {tab.badge > 0 && (
                  <span
                    className={`px-2 py-0.2 text-[10px] rounded-full font-black ${
                      active ? "bg-red-600 text-white" : "bg-amber-400 text-slate-950"
                    }`}
                  >
                    {tab.badge}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* Interactive 4-Card KPI Strip (Shown on Operational Tabs; Hidden on Analytics & Chat to keep view focused) */}
      {subTab !== "analytics" && subTab !== "chat" && (
        loadingAdmin ? (
          <div className="space-y-6">
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              {[1, 2, 3, 4].map((n) => (
                <div
                  key={n}
                  className="bg-white p-5 rounded-3xl border border-slate-200 shadow-2xs space-y-2.5"
                >
                  <div className="w-28 h-3 rounded km-shimmer" />
                  <div className="w-36 h-7 rounded-lg km-shimmer" />
                  <div className="w-24 h-3 rounded km-shimmer" />
                </div>
              ))}
            </div>
            <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-2xs space-y-4">
              <div className="flex justify-between items-center">
                <div className="w-48 h-6 rounded-lg km-shimmer" />
                <div className="w-32 h-8 rounded-xl km-shimmer" />
              </div>
              {[1, 2, 3, 4].map((row) => (
                <div
                  key={row}
                  className="p-4 rounded-2xl border border-slate-100 flex items-center justify-between gap-4"
                >
                  <div className="flex items-center gap-3 flex-1">
                    <div className="w-11 h-11 rounded-full km-shimmer shrink-0" />
                    <div className="space-y-2 flex-1">
                      <div className="w-44 h-4 rounded km-shimmer" />
                      <div className="w-64 h-3 rounded km-shimmer" />
                    </div>
                  </div>
                  <div className="w-28 h-8 rounded-xl km-shimmer" />
                </div>
              ))}
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3.5 sm:gap-4">
            {/* KPI 1: Net Customer Sales Revenue */}
            <div
              onClick={() => setSubTab("orders")}
              className="bg-white p-4 sm:p-5 rounded-3xl border border-slate-200/90 hover:border-emerald-300 shadow-2xs hover:shadow-md transition cursor-pointer group"
            >
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-extrabold text-slate-400 uppercase tracking-wider">
                  Customer Order Revenue
                </span>
                <div className="w-8 h-8 rounded-xl bg-emerald-50 text-[#14532D] flex items-center justify-center group-hover:bg-[#14532D] group-hover:text-white transition">
                  <ShoppingBag className="w-4 h-4" />
                </div>
              </div>
              <p className="text-xl sm:text-2xl font-black text-[#14532D] mt-1.5">
                रु{" "}
                {orders
                  .filter((o) => o.status !== "CANCELLED")
                  .reduce((sum, o) => sum + getOrderNetFinancials(o).netPayable, 0)
                  .toLocaleString(undefined, { maximumFractionDigits: 2 })}
              </p>
              <div className="flex items-center justify-between mt-1 text-[11px]">
                <span className="text-emerald-700 font-bold">
                  ✓ {orders.filter((o) => o.status === "DELIVERED").length} Delivered
                </span>
                {pendingOrdersCount > 0 && (
                  <span className="px-2 py-0.2 rounded-full bg-amber-100 text-amber-900 font-black text-[10px]">
                    {pendingOrdersCount} Pending
                  </span>
                )}
              </div>
            </div>

            {/* KPI 2: Farmer Wholesale Payouts */}
            <div
              onClick={() => setSubTab("purchases")}
              className="bg-white p-4 sm:p-5 rounded-3xl border border-slate-200/90 hover:border-amber-300 shadow-2xs hover:shadow-md transition cursor-pointer group"
            >
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-extrabold text-slate-400 uppercase tracking-wider">
                  Farmer Procurement
                </span>
                <div className="w-8 h-8 rounded-xl bg-amber-50 text-amber-700 flex items-center justify-center group-hover:bg-amber-500 group-hover:text-slate-950 transition">
                  <Receipt className="w-4 h-4" />
                </div>
              </div>
              <p className="text-xl sm:text-2xl font-black text-amber-700 mt-1.5">
                रु {totalProcuredAmount.toLocaleString()}
              </p>
              <div className="flex items-center justify-between mt-1 text-[11px]">
                <span className="text-slate-500 font-semibold">
                  {purchases.length} Batches Bought
                </span>
                {purchases.filter((p) => p.payment_status === "PENDING").length > 0 && (
                  <span className="px-2 py-0.2 rounded-full bg-red-100 text-red-700 font-black text-[10px]">
                    {purchases.filter((p) => p.payment_status === "PENDING").length} Unpaid
                  </span>
                )}
              </div>
            </div>

            {/* KPI 3: Farmer Harvest Offers */}
            <div
              onClick={() => setSubTab("submissions")}
              className="bg-white p-4 sm:p-5 rounded-3xl border border-slate-200/90 hover:border-emerald-300 shadow-2xs hover:shadow-md transition cursor-pointer group"
            >
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-extrabold text-slate-400 uppercase tracking-wider">
                  Farmer Crop Offers
                </span>
                <div className="w-8 h-8 rounded-xl bg-emerald-50 text-emerald-700 flex items-center justify-center group-hover:bg-emerald-700 group-hover:text-white transition">
                  <Sprout className="w-4 h-4" />
                </div>
              </div>
              <p className="text-xl sm:text-2xl font-black text-slate-900 mt-1.5">
                {submissions.length}
              </p>
              <div className="flex items-center justify-between mt-1 text-[11px]">
                <span className="text-amber-700 font-bold">
                  {pendingSubmissionsCount} Awaiting Review
                </span>
                <span className="text-slate-400 font-semibold">
                  {submissions.filter((s) => s.status === "BOUGHT").length} Procured
                </span>
              </div>
            </div>

            {/* KPI 4: Registered Users & Verification */}
            <div
              onClick={() => setSubTab("users")}
              className="bg-white p-4 sm:p-5 rounded-3xl border border-slate-200/90 hover:border-blue-300 shadow-2xs hover:shadow-md transition cursor-pointer group"
            >
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-extrabold text-slate-400 uppercase tracking-wider">
                  Platform Members
                </span>
                <div className="w-8 h-8 rounded-xl bg-blue-50 text-blue-700 flex items-center justify-center group-hover:bg-blue-600 group-hover:text-white transition">
                  <Users className="w-4 h-4" />
                </div>
              </div>
              <p className="text-xl sm:text-2xl font-black text-slate-900 mt-1.5">
                {users.length}
              </p>
              <div className="flex items-center justify-between mt-1 text-[11px]">
                <span className="text-emerald-700 font-bold">
                  ✓ {users.filter((u) => u.is_admin_verified).length} Verified
                </span>
                {pendingUsersCount > 0 && (
                  <span className="px-2 py-0.2 rounded-full bg-amber-100 text-amber-900 font-black text-[10px]">
                    {pendingUsersCount} Unverified
                  </span>
                )}
              </div>
            </div>
          </div>
        )
      )}

      {/* 1. USERS & VERIFICATION TAB (WITH PROFILE PICTURES) */}
      {subTab === "users" && (
        <div className="space-y-4">
          {!showAddUserForm && (
            <div className="flex flex-wrap items-center justify-between gap-3 bg-white p-4 rounded-2xl border border-slate-200 shadow-2xs">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-emerald-50 border border-emerald-200 flex items-center justify-center text-[#1B4332]">
                  <Users className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-sm sm:text-base font-extrabold text-slate-900">
                    Manage & Verify Accounts
                  </h3>
                  <p className="text-xs text-slate-500">
                    Click the button on the right to register and auto-verify a new Customer or Farmer account
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowAddUserForm(true)}
                className="px-4 py-2.5 bg-[#1B4332] hover:bg-[#2D6A4F] text-white font-bold rounded-xl text-xs sm:text-sm flex items-center gap-2 shadow-sm transition cursor-pointer"
              >
                <Plus className="w-4 h-4" />
                <span>Add & Verify New User</span>
              </button>
            </div>
          )}

          <div className={`grid gap-6 ${showAddUserForm ? "lg:grid-cols-3" : "grid-cols-1"}`}>
            {showAddUserForm && (
              <form
                onSubmit={handleCreateUser}
                className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200 space-y-3 h-fit animate-fadeIn"
              >
                <div className="flex items-center justify-between gap-2">
                  <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                    <Plus className="w-5 h-5 text-emerald-700" /> Add & Verify New User
                  </h3>
                  <button
                    type="button"
                    onClick={() => setShowAddUserForm(false)}
                    className="p-1.5 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition cursor-pointer"
                    title="Close form"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
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
              <div className="relative">
                <input
                  type={showNewUserPassword ? "text" : "password"}
                  required
                  minLength={8}
                  placeholder="Password *"
                  value={newUser.password}
                  onChange={(e) => setNewUser({ ...newUser, password: e.target.value })}
                  className="w-full pl-3 pr-8 py-2 rounded-xl border border-slate-200 text-sm"
                />
                <button
                  type="button"
                  onClick={() => setShowNewUserPassword((prev) => !prev)}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700 cursor-pointer"
                  title={showNewUserPassword ? "Hide password" : "Show password"}
                >
                  {showNewUserPassword ? (
                    <EyeOff className="w-3.5 h-3.5" />
                  ) : (
                    <Eye className="w-3.5 h-3.5" />
                  )}
                </button>
              </div>
              <div className="relative">
                <input
                  type={showNewUserConfirm ? "text" : "password"}
                  required
                  minLength={8}
                  placeholder="Confirm *"
                  value={newUser.confirm_password}
                  onChange={(e) => setNewUser({ ...newUser, confirm_password: e.target.value })}
                  className="w-full pl-3 pr-8 py-2 rounded-xl border border-slate-200 text-sm"
                />
                <button
                  type="button"
                  onClick={() => setShowNewUserConfirm((prev) => !prev)}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700 cursor-pointer"
                  title={showNewUserConfirm ? "Hide password" : "Show password"}
                >
                  {showNewUserConfirm ? (
                    <EyeOff className="w-3.5 h-3.5" />
                  ) : (
                    <Eye className="w-3.5 h-3.5" />
                  )}
                </button>
              </div>
            </div>
            <button
              type="submit"
              className="w-full py-2.5 bg-[#1B4332] hover:bg-[#2D6A4F] text-white font-semibold rounded-xl text-sm cursor-pointer"
            >
              Add Verified User
            </button>
          </form>
            )}

          <div className={`${showAddUserForm ? "lg:col-span-2" : "col-span-1"} bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden`}>
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
                {[
                  { id: "ALL", label: "All Users", count: users.length },
                  {
                    id: "PENDING",
                    label: "⏳ Unverified",
                    count: users.filter((u) => !u.is_admin_verified && !u.is_staff).length,
                    highlight: true,
                  },
                  {
                    id: "VERIFIED",
                    label: "✓ Verified",
                    count: users.filter((u) => u.is_admin_verified || u.is_staff).length,
                  },
                  {
                    id: "FARMER",
                    label: "🌾 Farmers",
                    count: users.filter((u) => u.role === "FARMER").length,
                  },
                  {
                    id: "CUSTOMER",
                    label: "🛒 Buyers",
                    count: users.filter((u) => u.role === "CUSTOMER").length,
                  },
                  {
                    id: "ADMIN",
                    label: "🛡️ Admins",
                    count: users.filter((u) => u.role === "ADMIN" || u.is_staff).length,
                  },
                ].map((tab) => {
                  const active = userFilter === tab.id;
                  return (
                    <button
                      key={tab.id}
                      type="button"
                      onClick={() => setUserFilter(tab.id)}
                      className={`px-3 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 transition cursor-pointer ${
                        active
                          ? "bg-[#1B4332] text-white shadow-2xs"
                          : tab.highlight && tab.count > 0
                          ? "bg-amber-100 text-amber-900 border border-amber-300 hover:bg-amber-200"
                          : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                      }`}
                    >
                      <span>{tab.label}</span>
                      <span
                        className={`px-1.5 py-0.2 rounded-full text-[10px] font-black ${
                          active ? "bg-amber-400 text-slate-950" : "bg-white/80 text-slate-700"
                        }`}
                      >
                        {tab.count}
                      </span>
                    </button>
                  );
                })}
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
                  if (userFilter === "ADMIN") return u.role === "ADMIN" || Boolean(u.is_staff);
                  return true;
                })
                .map((u) => (
                  <div
                    key={u.id}
                    className="p-4 flex flex-wrap items-center justify-between gap-4 hover:bg-slate-50"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-12 h-12 rounded-full bg-emerald-800 text-white flex items-center justify-center font-bold overflow-hidden border-2 border-emerald-600/30 shrink-0 shadow-xs">
                        {u.profile_picture ? (
                          <img
                            src={
                              resolveMediaUrl(u.profile_picture, u.id)
                            }
                            alt={u.full_name}
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <span>{u.full_name?.charAt(0).toUpperCase()}</span>
                        )}
                      </div>

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
        </div>
      )}

      {/* 2. FARMER OFFERS TAB ("BUY FROM FARMER") WITH SEARCH & STATUS FILTER PILLS */}
      {subTab === "submissions" && (() => {
        const subCounts = {
          ALL: submissions.length,
          PENDING: submissions.filter((s) => s.status === "PENDING").length,
          APPROVED: submissions.filter((s) => s.status === "APPROVED").length,
          BOUGHT: submissions.filter((s) => s.status === "BOUGHT").length,
          REJECTED: submissions.filter((s) => s.status === "REJECTED").length,
        };

        const displayedSubmissions = submissions.filter((sub) => {
          const q = subSearch.toLowerCase();
          const matchesSearch =
            (sub.vegetable_name || "").toLowerCase().includes(q) ||
            (sub.seller_name || "").toLowerCase().includes(q) ||
            (sub.pickup_location || "").toLowerCase().includes(q) ||
            (sub.contact_phone || "").includes(subSearch) ||
            (sub.category || "").toLowerCase().includes(q);

          const matchesStatus = subFilter === "ALL" || sub.status === subFilter;
          return matchesSearch && matchesStatus;
        });

        return (
          <div className="space-y-4">
            {/* Search & Filter Bar */}
            <div className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200 flex flex-col md:flex-row md:items-center justify-between gap-3 shadow-2xs">
              <div className="relative flex-1 max-w-md">
                <input
                  type="text"
                  placeholder="Search offers by crop, farmer name, pickup location..."
                  value={subSearch}
                  onChange={(e) => setSubSearch(e.target.value)}
                  className="w-full px-3.5 py-2 pl-9 border border-slate-200 rounded-xl text-xs outline-none focus:border-[#1B4332] bg-slate-50 focus:bg-white"
                />
                <span className="absolute left-3 top-2.5 text-slate-400 text-xs">🔍</span>
                {subSearch && (
                  <button
                    type="button"
                    onClick={() => setSubSearch("")}
                    className="absolute right-3 top-2 text-slate-400 hover:text-slate-600 text-xs font-bold"
                  >
                    ✕
                  </button>
                )}
              </div>

              <div className="flex flex-wrap gap-1.5 overflow-x-auto no-scrollbar">
                {[
                  { id: "ALL", label: "All Offers", count: subCounts.ALL },
                  {
                    id: "PENDING",
                    label: "⏳ Pending Review",
                    count: subCounts.PENDING,
                    highlight: true,
                  },
                  { id: "BOUGHT", label: "✓ Procured", count: subCounts.BOUGHT },
                  { id: "APPROVED", label: "Approved", count: subCounts.APPROVED },
                  { id: "REJECTED", label: "✕ Declined", count: subCounts.REJECTED },
                ].map((tab) => {
                  const active = subFilter === tab.id;
                  return (
                    <button
                      key={tab.id}
                      type="button"
                      onClick={() => setSubFilter(tab.id)}
                      className={`px-3 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 transition cursor-pointer shrink-0 ${
                        active
                          ? "bg-[#1B4332] text-white shadow-2xs"
                          : tab.highlight && tab.count > 0
                          ? "bg-amber-100 text-amber-900 border border-amber-300 hover:bg-amber-200"
                          : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                      }`}
                    >
                      <span>{tab.label}</span>
                      <span
                        className={`px-1.5 py-0.2 rounded-full text-[10px] font-black ${
                          active ? "bg-amber-400 text-slate-950" : "bg-white/80 text-slate-700"
                        }`}
                      >
                        {tab.count}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="grid md:grid-cols-2 gap-6">
              {displayedSubmissions.length === 0 ? (
                <div className="col-span-2 bg-white p-12 rounded-2xl text-center text-slate-500 border border-slate-200">
                  {submissions.length === 0
                    ? "No farmer wholesale crop offers submitted yet."
                    : "No crop offers match your current filter."}
                </div>
              ) : (
                displayedSubmissions.map((sub) => (
              <div
                key={sub.id}
                className="bg-white rounded-3xl p-6 shadow-sm border border-slate-200 flex flex-col justify-between gap-4"
              >
                <div className="space-y-3">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-emerald-800 text-white flex items-center justify-center font-bold text-xs overflow-hidden shrink-0">
                        {sub.seller_avatar ? (
                          <img
                            src={
                              resolveMediaUrl(sub.seller_avatar, sub.seller)
                            }
                            alt={sub.seller_name}
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <span>{sub.seller_name?.charAt(0).toUpperCase()}</span>
                        )}
                      </div>
                      <div>
                        <span className="text-xs font-bold uppercase tracking-wider text-emerald-700">
                          {sub.category}
                        </span>
                        <h3 className="text-xl font-bold text-slate-900">{sub.vegetable_name}</h3>
                        <p className="text-xs text-slate-500">
                          Offered by <strong>{sub.seller_name}</strong> ({sub.seller_role})
                        </p>
                      </div>
                    </div>
                    <span
                      className={`px-3 py-1 rounded-full text-xs font-bold ${
                        sub.status === "BOUGHT"
                          ? "bg-emerald-600 text-white shadow-xs"
                          : sub.status === "APPROVED"
                          ? "bg-emerald-100 text-emerald-800"
                          : sub.status === "REJECTED"
                          ? "bg-red-100 text-red-700"
                          : "bg-amber-100 text-amber-800"
                      }`}
                    >
                      {sub.status === "BOUGHT" ? "✓ BOUGHT FROM FARMER" : sub.status}
                    </span>
                  </div>

                  {sub.image && (
                    <img
                      src={resolveMediaUrl(sub.image)}
                      alt={sub.vegetable_name}
                      className="w-full h-44 object-cover rounded-2xl border border-slate-100"
                    />
                  )}

                  <p className="text-sm text-slate-700 bg-slate-50 p-3.5 rounded-xl">
                    {sub.vegetable_description}
                  </p>

                  <div className="grid grid-cols-2 gap-2 text-xs bg-emerald-50/60 p-3.5 rounded-xl border border-emerald-100">
                    <div>
                      <span className="text-slate-500 block">Offered Quantity:</span>
                      <strong className="text-slate-900 text-sm">
                        {sub.quantity} {sub.unit}
                      </strong>
                    </div>
                    <div>
                      <span className="text-slate-500 block">Wholesale Rate:</span>
                      <strong className="text-emerald-800 text-sm">
                        रु {sub.expected_price_per_unit} / {sub.unit}
                      </strong>
                    </div>
                    <div className="flex items-center gap-1 text-slate-700 col-span-2 pt-1">
                      <Phone className="w-3.5 h-3.5 text-emerald-700" />
                      <strong>Farmer Phone:</strong> {sub.contact_phone}
                    </div>
                    <div className="flex items-center gap-1 text-slate-700 col-span-2">
                      <MapPin className="w-3.5 h-3.5 text-emerald-700" />
                      <strong>Pickup Farm Location:</strong> {sub.pickup_location}
                    </div>
                  </div>

                  {sub.admin_remarks && (
                    <div className="p-3 bg-amber-50 rounded-xl border border-amber-200 text-xs text-amber-900">
                      <strong>Procurement Note:</strong> {sub.admin_remarks}
                    </div>
                  )}
                </div>

                <div className="flex flex-wrap items-center gap-2 pt-3 border-t border-slate-100">
                  {sub.status === "BOUGHT" ? (
                    <div className="flex-1 flex items-center justify-between gap-2 bg-emerald-50 border border-emerald-200 px-3.5 py-2 rounded-xl">
                      <span className="text-xs font-extrabold text-[#14532D] flex items-center gap-1.5">
                        <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                        Purchased & Recorded
                      </span>
                      <button
                        type="button"
                        onClick={() => setSubTab("purchases")}
                        className="text-xs font-bold text-emerald-800 underline hover:text-emerald-950 cursor-pointer"
                      >
                        View Receipt →
                      </button>
                    </div>
                  ) : sub.status === "REJECTED" ? (
                    <div className="flex-1 flex items-center justify-between gap-2 bg-red-50 border border-red-200 px-3.5 py-2 rounded-xl">
                      <span className="text-xs font-bold text-red-700">✗ Offer Declined</span>
                      <button
                        type="button"
                        onClick={() => handleOpenBuyModal(sub)}
                        className="text-xs font-bold text-slate-600 underline hover:text-slate-900 cursor-pointer"
                      >
                        Reconsider & Buy
                      </button>
                    </div>
                  ) : (
                    <>
                      <button
                        onClick={() => handleOpenBuyModal(sub)}
                        className="flex-1 py-2.5 px-4 bg-[#14532D] hover:bg-[#1B4332] text-white text-xs font-bold rounded-xl flex items-center justify-center gap-1.5 shadow-sm cursor-pointer"
                      >
                        <CreditCard className="w-4 h-4 text-amber-300" /> Buy from Farmer
                      </button>
                      <button
                        onClick={() => {
                          setDeclineModal(sub);
                          setDeclineRemarks("");
                        }}
                        className="py-2.5 px-4 bg-red-50 hover:bg-red-100 text-red-700 text-xs font-bold rounded-xl cursor-pointer"
                      >
                        Decline
                      </button>
                    </>
                  )}

                  {/* Delete Farmer Offer Button */}
                  <button
                    type="button"
                    onClick={() => handleDeleteSubmission(sub.id, sub.vegetable_name)}
                    className="p-2.5 text-red-600 bg-red-50/70 hover:bg-red-100 rounded-xl transition cursor-pointer"
                    title="Delete Farmer Offer"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
        </div>
        );
      })()}

      {/* 3. BOUGHT FROM FARMERS LEDGER TAB WITH SEARCH & SETTLEMENT FILTERS */}
      {subTab === "purchases" && (() => {
        const purchaseCounts = {
          ALL: purchases.length,
          PENDING: purchases.filter((p) => p.payment_status === "PENDING").length,
          PAID: purchases.filter((p) => p.payment_status === "PAID").length,
        };

        const displayedPurchases = purchases.filter((p) => {
          const q = purchaseSearch.toLowerCase();
          const matchesSearch =
            (p.crop_name || "").toLowerCase().includes(q) ||
            (p.farmer_name || "").toLowerCase().includes(q) ||
            (p.farmer_phone || "").includes(purchaseSearch) ||
            (p.pickup_location || "").toLowerCase().includes(q) ||
            String(p.id).includes(purchaseSearch);

          const matchesStatus =
            purchaseFilter === "ALL" || p.payment_status === purchaseFilter;
          return matchesSearch && matchesStatus;
        });

        return (
          <div className="space-y-4">
            {/* Search & Payout Settlement Filter Pills */}
            <div className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200 flex flex-col md:flex-row md:items-center justify-between gap-3 shadow-2xs">
              <div className="relative flex-1 max-w-md">
                <input
                  type="text"
                  placeholder="Search ledger by voucher #, crop name, farmer name..."
                  value={purchaseSearch}
                  onChange={(e) => setPurchaseSearch(e.target.value)}
                  className="w-full px-3.5 py-2 pl-9 border border-slate-200 rounded-xl text-xs outline-none focus:border-[#1B4332] bg-slate-50 focus:bg-white"
                />
                <span className="absolute left-3 top-2.5 text-slate-400 text-xs">🔍</span>
                {purchaseSearch && (
                  <button
                    type="button"
                    onClick={() => setPurchaseSearch("")}
                    className="absolute right-3 top-2 text-slate-400 hover:text-slate-600 text-xs font-bold"
                  >
                    ✕
                  </button>
                )}
              </div>

              <div className="flex flex-wrap gap-1.5">
                {[
                  { id: "ALL", label: "All Vouchers", count: purchaseCounts.ALL },
                  {
                    id: "PENDING",
                    label: "⏳ Pending Settlement",
                    count: purchaseCounts.PENDING,
                    highlight: true,
                  },
                  { id: "PAID", label: "✓ Settled (PAID)", count: purchaseCounts.PAID },
                ].map((tab) => {
                  const active = purchaseFilter === tab.id;
                  return (
                    <button
                      key={tab.id}
                      type="button"
                      onClick={() => setPurchaseFilter(tab.id)}
                      className={`px-3 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 transition cursor-pointer ${
                        active
                          ? "bg-[#1B4332] text-white shadow-2xs"
                          : tab.highlight && tab.count > 0
                          ? "bg-amber-100 text-amber-900 border border-amber-300 hover:bg-amber-200"
                          : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                      }`}
                    >
                      <span>{tab.label}</span>
                      <span
                        className={`px-1.5 py-0.2 rounded-full text-[10px] font-black ${
                          active ? "bg-amber-400 text-slate-950" : "bg-white/80 text-slate-700"
                        }`}
                      >
                        {tab.count}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="bg-white p-5 rounded-3xl border border-slate-200 flex flex-wrap items-center justify-between gap-4">
            <div>
              <h3 className="text-lg font-extrabold text-slate-900">
                Official Farmer Procurement Ledger ({purchases.length} Transactions)
              </h3>
              <p className="text-xs text-slate-500">
                Full breakdown of crops purchased from farmers, rates paid, and payment settlements.
              </p>
            </div>
            <div className="flex items-center gap-4">
              <button
                type="button"
                onClick={() =>
                  handleExportCSV(
                    `KrishiMart_Farmer_Purchases_${new Date().toISOString().slice(0, 10)}.csv`,
                    [
                      "Voucher ID",
                      "Date",
                      "Farmer Name",
                      "Farmer Phone",
                      "Crop Name",
                      "Category",
                      "Quantity",
                      "Unit",
                      "Wholesale Rate (NPR)",
                      "Total Paid (NPR)",
                      "Payment Method",
                      "Payment Status",
                      "Pickup Location",
                    ],
                    purchases.map((p) => [
                      `#KM-PUR-${p.id}`,
                      new Date(p.created_at).toLocaleDateString(),
                      p.farmer_name,
                      p.farmer_phone,
                      p.crop_name,
                      p.category,
                      p.quantity,
                      p.unit,
                      p.agreed_wholesale_rate,
                      p.total_amount,
                      p.payment_method,
                      p.payment_status,
                      p.pickup_location,
                    ])
                  )
                }
                className="px-3.5 py-2 rounded-xl bg-emerald-50 hover:bg-emerald-100 text-[#14532D] border border-emerald-200 text-xs font-extrabold transition cursor-pointer"
              >
                📊 Export Ledger (.CSV / Excel)
              </button>
              <div className="text-right">
                <span className="text-xs text-slate-400 font-bold uppercase block">
                  Total Disbursed
                </span>
                <span className="text-2xl font-black text-[#14532D]">
                  रु {totalProcuredAmount.toLocaleString()}
                </span>
              </div>
            </div>
          </div>

          {displayedPurchases.length === 0 ? (
            <div className="bg-white rounded-3xl p-12 text-center text-slate-500 border border-slate-200">
              {purchases.length === 0
                ? "No crops bought from farmers yet. Click 'Buy from Farmer' on any offer to procure."
                : "No purchase vouchers match your current filter."}
            </div>
          ) : (
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {displayedPurchases.map((p) => (
                <div
                  key={p.id}
                  className="bg-white rounded-3xl p-5 border border-slate-200 shadow-2xs space-y-3 flex flex-col justify-between"
                >
                  <div className="space-y-2">
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-center gap-2.5">
                        <div className="w-9 h-9 rounded-full bg-emerald-800 text-white flex items-center justify-center font-bold text-xs overflow-hidden shrink-0">
                          {p.farmer_avatar ? (
                            <img
                              src={
                                resolveMediaUrl(p.farmer_avatar, p.farmer)
                              }
                              alt={p.farmer_name}
                              className="w-full h-full object-cover"
                            />
                          ) : (
                            <span>{p.farmer_name?.charAt(0).toUpperCase()}</span>
                          )}
                        </div>
                        <div>
                          <span className="text-[10px] font-bold text-emerald-700 uppercase">
                            {p.category}
                          </span>
                          <h4 className="font-extrabold text-base text-slate-900">{p.crop_name}</h4>
                          <p className="text-xs text-slate-500">
                            Farmer: <strong>{p.farmer_name}</strong>
                          </p>
                        </div>
                      </div>
                      <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800">
                        {p.payment_status}
                      </span>
                    </div>

                    <div className="p-3 bg-slate-50 rounded-2xl text-xs space-y-1">
                      <div className="flex justify-between">
                        <span className="text-slate-500">Purchased Qty:</span>
                        <strong>
                          {p.quantity} {p.unit}
                        </strong>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-500">Agreed Rate:</span>
                        <strong>
                          रु {p.agreed_wholesale_rate} / {p.unit}
                        </strong>
                      </div>
                      <div className="flex justify-between border-t border-slate-200 pt-1 text-sm font-black text-[#14532D]">
                        <span>Total Paid:</span>
                        <span>रु {p.total_amount}</span>
                      </div>
                    </div>

                    <p className="text-[11px] text-slate-500 flex items-center gap-1">
                      <MapPin className="w-3.5 h-3.5 text-emerald-700" /> {p.pickup_location}
                    </p>
                    <p className="text-[11px] text-slate-500 flex items-center gap-1">
                      <Phone className="w-3.5 h-3.5 text-emerald-700" /> {p.farmer_phone}
                    </p>

                    {p.admin_notes && (
                      <p className="text-xs bg-emerald-50/70 p-2.5 rounded-xl text-emerald-950 border border-emerald-100">
                        <strong>Notes:</strong> {p.admin_notes}
                      </p>
                    )}
                  </div>

                 <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-400">
                    <span>Payment: {p.payment_method} • {new Date(p.created_at).toLocaleDateString()}</span>
                    <div className="flex items-center gap-1.5">
                      {p.payment_status === "PENDING" && (
                        <button
                          type="button"
                          onClick={() => handleMarkFarmerPurchasePaid(p.id)}
                          className="px-2.5 py-1 rounded-lg bg-emerald-700 hover:bg-emerald-800 text-white text-[11px] font-bold transition cursor-pointer shadow-xs"
                        >
                          ✓ Mark as Paid
                        </button>
                      )}
                      <button
                        type="button"
                        onClick={() => handleDeleteFarmerPurchase(p.id)}
                        className="p-1 rounded-lg bg-red-50 hover:bg-red-100 text-red-600 transition cursor-pointer"
                        title="Delete Purchase"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
        );
      })()}

      {/* 4. STORIES & REVIEWS MODERATION TAB WITH FILTER PILLS */}
      {subTab === "stories" && (() => {
        const storyCounts = {
          ALL: stories.length,
          PENDING: stories.filter((s) => s.status === "PENDING").length,
          APPROVED: stories.filter((s) => s.status === "APPROVED").length,
          REJECTED: stories.filter((s) => s.status === "REJECTED").length,
          FARMER_STORY: stories.filter((s) => s.story_type === "FARMER_STORY").length,
          BUYER_REVIEW: stories.filter((s) => s.story_type === "BUYER_REVIEW").length,
        };

        const displayedStories = stories.filter((s) => {
          if (storyFilter === "ALL") return true;
          if (storyFilter === "FARMER_STORY" || storyFilter === "BUYER_REVIEW") {
            return s.story_type === storyFilter;
          }
          return s.status === storyFilter;
        });

        return (
          <div className="space-y-4">
            <div className="bg-white p-5 rounded-3xl border border-slate-200 flex flex-col md:flex-row md:items-center justify-between gap-3 shadow-2xs">
              <div>
                <h3 className="text-lg font-extrabold text-slate-900">
                  Farmer Stories & Buyer Reviews ({stories.length})
                </h3>
                <p className="text-xs text-slate-500">
                  Approve genuine farmer stories and buyer reviews to publish them on the website.
                </p>
              </div>

              <div className="flex flex-wrap gap-1.5">
                {[
                  { id: "ALL", label: "All Items", count: storyCounts.ALL },
                  {
                    id: "PENDING",
                    label: "⏳ Pending",
                    count: storyCounts.PENDING,
                    highlight: true,
                  },
                  { id: "APPROVED", label: "✓ Approved", count: storyCounts.APPROVED },
                  { id: "REJECTED", label: "✕ Rejected", count: storyCounts.REJECTED },
                  { id: "FARMER_STORY", label: "🌾 Farmers", count: storyCounts.FARMER_STORY },
                  { id: "BUYER_REVIEW", label: "🛒 Buyers", count: storyCounts.BUYER_REVIEW },
                ].map((tab) => {
                  const active = storyFilter === tab.id;
                  return (
                    <button
                      key={tab.id}
                      type="button"
                      onClick={() => setStoryFilter(tab.id)}
                      className={`px-3 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 transition cursor-pointer ${
                        active
                          ? "bg-[#1B4332] text-white shadow-2xs"
                          : tab.highlight && tab.count > 0
                          ? "bg-amber-100 text-amber-900 border border-amber-300 hover:bg-amber-200"
                          : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                      }`}
                    >
                      <span>{tab.label}</span>
                      <span
                        className={`px-1.5 py-0.2 rounded-full text-[10px] font-black ${
                          active ? "bg-amber-400 text-slate-950" : "bg-white/80 text-slate-700"
                        }`}
                      >
                        {tab.count}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>

          {displayedStories.length === 0 ? (
            <div className="bg-white rounded-3xl p-12 text-center text-slate-500 border border-slate-200">
              {stories.length === 0
                ? "No stories or buyer reviews submitted yet."
                : "No items match your current moderation filter."}
            </div>
          ) : (
            <div className="grid sm:grid-cols-2 gap-4">
              {displayedStories.map((st) => (
                <div
                  key={st.id}
                  className="bg-white rounded-3xl p-5 border border-slate-200 shadow-2xs space-y-3 flex flex-col justify-between"
                >
                  <div className="space-y-2.5">
                    <div className="flex items-center justify-between">
                      <span
                        className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                          st.story_type === "FARMER_STORY"
                            ? "bg-emerald-100 text-[#14532D]"
                            : "bg-blue-100 text-blue-800"
                        }`}
                      >
                        {st.story_type === "FARMER_STORY" ? "🌾 Farmer Story" : "🛒 Buyer Review"}
                      </span>
                      <span
                        className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                          st.status === "APPROVED"
                            ? "bg-emerald-600 text-white"
                            : st.status === "REJECTED"
                            ? "bg-red-100 text-red-700"
                            : "bg-amber-100 text-amber-800"
                        }`}
                      >
                        {st.status}
                      </span>
                    </div>

                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-emerald-800 text-white flex items-center justify-center font-bold text-xs overflow-hidden shrink-0">
                        {st.author_avatar ? (
                          <img
                            src={
                              resolveMediaUrl(st.author_avatar, st.author)
                            }
                            alt={st.author_name}
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <span>{st.author_name?.charAt(0).toUpperCase()}</span>
                        )}
                      </div>
                      <div>
                        <h4 className="font-bold text-sm text-slate-900">{st.author_name}</h4>
                        <p className="text-[11px] text-slate-500">
                          {st.author_location || "Nepal"} • {st.author_role}
                        </p>
                      </div>
                    </div>

                    {st.title && (
                      <h5 className="font-extrabold text-sm text-slate-900">"{st.title}"</h5>
                    )}
                    <p className="text-xs text-slate-600 bg-slate-50 p-3.5 rounded-2xl italic">
                      "{st.content}"
                    </p>

                    {st.image && (
                      <img
                        src={
                          resolveMediaUrl(st.image)
                        }
                        alt={st.title || "Story or review photo"}
                        className="w-full h-44 object-cover rounded-2xl border border-slate-200"
                      />
                    )}

                    {st.rating && (
                      <div className="flex items-center gap-1 text-amber-400">
                        {Array.from({ length: st.rating }).map((_, i) => (
                          <Star key={i} className="w-3.5 h-3.5 fill-amber-400" />
                        ))}
                      </div>
                    )}
                  </div>

                  <div className="pt-3 border-t border-slate-100 flex items-center gap-2">
                    {st.status !== "APPROVED" && (
                      <button
                        onClick={() => handleToggleStoryStatus(st.id, "APPROVED")}
                        className="flex-1 py-2 px-3 rounded-xl bg-[#14532D] hover:bg-[#1B4332] text-white text-xs font-bold cursor-pointer"
                      >
                        ✓ Approve & Feature on Site
                      </button>
                    )}
                    {st.status === "APPROVED" && (
                      <button
                        onClick={() => handleToggleStoryStatus(st.id, "REJECTED")}
                        className="flex-1 py-2 px-3 rounded-xl bg-amber-100 text-amber-900 text-xs font-bold cursor-pointer"
                      >
                        Hide from Site
                      </button>
                    )}
                    <button
                      onClick={() => handleDeleteStory(st.id)}
                      className="p-2 text-red-600 hover:bg-red-50 rounded-xl cursor-pointer"
                      title="Delete Story"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
        );
      })()}

      {/* 5. STORE INVENTORY TAB */}
      {subTab === "products" && (
        <div className="space-y-4">
          {!showAddProductForm && (
            <div className="flex flex-wrap items-center justify-between gap-3 bg-white p-4 rounded-2xl border border-slate-200 shadow-2xs">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-emerald-50 border border-emerald-200 flex items-center justify-center text-[#1B4332]">
                  <Package className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-sm sm:text-base font-extrabold text-slate-900">
                    Store Inventory & Retail Pricing
                  </h3>
                  <p className="text-xs text-slate-500">
                    Click the button on the right to publish a new crop or product to the customer marketplace
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowAddProductForm(true)}
                className="px-4 py-2.5 bg-[#1B4332] hover:bg-[#2D6A4F] text-white font-bold rounded-xl text-xs sm:text-sm flex items-center gap-2 shadow-sm transition cursor-pointer"
              >
                <Plus className="w-4 h-4" />
                <span>Add Product to Store</span>
              </button>
            </div>
          )}

          <div className={`grid gap-6 ${showAddProductForm ? "lg:grid-cols-3" : "grid-cols-1"}`}>
            {showAddProductForm && (
              <form
                onSubmit={handleAddProduct}
                className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200 space-y-3.5 h-fit animate-fadeIn"
              >
                <div className="flex items-center justify-between gap-2">
                  <h3 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                    <Plus className="w-5 h-5 text-emerald-700" /> Add Product to Store
                  </h3>
                  <button
                    type="button"
                    onClick={() => setShowAddProductForm(false)}
                    className="p-1.5 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition cursor-pointer"
                    title="Close form"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Vegetable / Product Name *
              </label>
              <input
                type="text"
                required
                placeholder="e.g. Organic Local Cauliflower"
                value={newProduct.name}
                onChange={(e) => setNewProduct({ ...newProduct, name: e.target.value })}
                className="w-full px-3.5 py-2 rounded-xl border border-slate-200 text-sm"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Select Category *
              </label>
              <select
                value={newProduct.category}
                onChange={(e) => setNewProduct({ ...newProduct, category: e.target.value })}
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm bg-white font-semibold text-slate-800"
              >
                <option value="VEGETABLES">🥬 Fresh Vegetables</option>
                <option value="FRUITS">🍎 Hill & Mountain Fruits</option>
                <option value="GRAINS">🌾 Grains, Pulses & Cereals</option>
                <option value="SPICES">🌶️ Spices, Herbs & Aromatics</option>
                <option value="DAIRY">🍯 Organic Dairy, Oils & Honey</option>
              </select>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Actual Price / Original (रु)
                </label>
                <input
                  type="number"
                  step="0.01"
                  placeholder="Before discount (e.g. 500)"
                  value={newProduct.actual_price || ""}
                  onChange={(e) => setNewProduct({ ...newProduct, actual_price: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 text-sm bg-slate-50"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-[#14532D] mb-1">
                  Selling Price / MRP (रु) *
                </label>
                <input
                  type="number"
                  step="0.01"
                  required
                  placeholder="Customer price (e.g. 450)"
                  value={newProduct.price}
                  onChange={(e) => setNewProduct({ ...newProduct, price: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl border border-emerald-300 text-sm font-bold"
                />
              </div>
            </div>
            {Number(newProduct.actual_price) > Number(newProduct.price) &&
              Number(newProduct.price) > 0 && (
                <div className="px-3 py-1.5 rounded-xl bg-emerald-50 border border-emerald-200 text-[11px] font-bold text-[#14532D] flex items-center justify-between">
                  <span>
                    Customer sees: रु {newProduct.price}{" "}
                    <span className="line-through text-slate-400 ml-1">
                      रु {newProduct.actual_price}
                    </span>
                  </span>
                  <span className="px-2 py-0.5 rounded-full bg-amber-400 text-slate-950 text-[10px] font-black">
                    SAVE{" "}
                    {Math.round(
                      ((Number(newProduct.actual_price) - Number(newProduct.price)) /
                        Number(newProduct.actual_price)) *
                        100
                    )}
                    %
                  </span>
                </div>
              )}

            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Stock Qty *</label>
                <input
                  type="number"
                  required
                  placeholder="e.g. 50"
                  value={newProduct.stock_quantity}
                  onChange={(e) => setNewProduct({ ...newProduct, stock_quantity: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 text-sm"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Unit *</label>
                <select
                  value={newProduct.unit}
                  onChange={(e) => setNewProduct({ ...newProduct, unit: e.target.value })}
                  className="w-full px-2.5 py-2 rounded-xl border border-slate-200 text-sm bg-white font-medium"
                >
                  <option value="kg">per kg</option>
                  <option value="g">per g</option>
                  <option value="bundle">per bundle</option>
                  <option value="crate">per crate</option>
                  <option value="quintal">per quintal</option>
                </select>
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Origin Farm Location
              </label>
              <input
                type="text"
                placeholder="e.g. Dhangadhi, Kailali"
                value={newProduct.origin_location}
                onChange={(e) => setNewProduct({ ...newProduct, origin_location: e.target.value })}
                className="w-full px-3.5 py-2 rounded-xl border border-slate-200 text-sm"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Product Description *
              </label>
              <textarea
                rows={3}
                required
                placeholder="Product freshness, harvest details & description..."
                value={newProduct.description}
                onChange={(e) => setNewProduct({ ...newProduct, description: e.target.value })}
                className="w-full px-3.5 py-2 rounded-xl border border-slate-200 text-sm"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Product Photo (Optional)
              </label>
              <input
                type="file"
                accept="image/*"
                onChange={(e) => setNewProduct({ ...newProduct, image: e.target.files[0] })}
                className="w-full text-xs text-slate-500"
              />
            </div>

            <button
              type="submit"
              className="w-full py-2.5 bg-[#1B4332] hover:bg-[#2D6A4F] text-white font-semibold rounded-xl text-sm cursor-pointer"
            >
              Publish Product to Store
            </button>
          </form>
            )}

          <div className={`${showAddProductForm ? "lg:col-span-2" : "col-span-1"} space-y-4`}>
            {/* Store Inventory Search & Category Filter Bar */}
            <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-2xs space-y-3">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div>
                  <h3 className="font-extrabold text-sm sm:text-base text-slate-900">
                    Live Store Inventory ({products.length} Batches)
                  </h3>
                  <p className="text-xs text-slate-500">
                    Manage customer selling prices, original MRP discounts, and available stock
                  </p>
                </div>
                <span className="px-3 py-1 rounded-full bg-emerald-50 border border-emerald-200 text-[#14532D] text-xs font-extrabold">
                  Stock Value: रु{" "}
                  {products
                    .reduce((s, p) => s + Number(p.price || 0) * Number(p.stock_quantity || 0), 0)
                    .toLocaleString()}
                </span>
              </div>

              <div className="flex flex-col sm:flex-row sm:items-center gap-2">
                <div className="relative flex-1">
                  <input
                    type="text"
                    placeholder="Search store inventory by crop name or origin..."
                    value={productAdminSearch}
                    onChange={(e) => setProductAdminSearch(e.target.value)}
                    className="w-full pl-8 pr-4 py-2 rounded-xl bg-slate-50 focus:bg-white border border-slate-200 text-xs outline-none focus:border-[#14532D]"
                  />
                  <span className="absolute left-2.5 top-2 text-slate-400 text-xs">🔍</span>
                </div>

                <div className="flex gap-1 overflow-x-auto no-scrollbar">
                  {[
                    { id: "ALL", label: "All" },
                    { id: "VEGETABLES", label: "🥬 Veg" },
                    { id: "FRUITS", label: "🍎 Fruits" },
                    { id: "GRAINS", label: "🌾 Grains" },
                    { id: "SPICES", label: "🌶️ Spices" },
                    { id: "DAIRY", label: "🍯 Dairy" },
                  ].map((cat) => (
                    <button
                      key={cat.id}
                      type="button"
                      onClick={() => setProductAdminCat(cat.id)}
                      className={`px-2.5 py-1.5 rounded-xl text-[11px] font-bold whitespace-nowrap transition cursor-pointer ${
                        productAdminCat === cat.id
                          ? "bg-[#14532D] text-white"
                          : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                      }`}
                    >
                      {cat.label}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Rich Store Inventory Cards */}
            <div className="grid sm:grid-cols-2 gap-3.5">
              {products
                .filter((p) => {
                  const q = productAdminSearch.toLowerCase();
                  const matchesSearch =
                    (p.name || "").toLowerCase().includes(q) ||
                    (p.origin_location || "").toLowerCase().includes(q) ||
                    (p.category || "").toLowerCase().includes(q);
                  const matchesCat =
                    productAdminCat === "ALL" || p.category === productAdminCat;
                  return matchesSearch && matchesCat;
                })
                .map((p) => {
                  const stockNum = Number(p.stock_quantity || 0);
                  const hasDiscount = Number(p.actual_price) > Number(p.price);
                  const discPct = hasDiscount
                    ? Math.round(
                        ((Number(p.actual_price) - Number(p.price)) / Number(p.actual_price)) *
                          100
                      )
                    : 0;
                  return (
                    <div
                      key={p.id}
                      className="bg-white p-4 rounded-2xl border border-slate-200/90 shadow-2xs hover:shadow-md transition flex flex-col justify-between gap-3"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="space-y-1 min-w-0">
                          <div className="flex flex-wrap items-center gap-1.5">
                            <span className="px-2 py-0.5 rounded-md bg-emerald-50 text-[#14532D] text-[10px] font-extrabold uppercase">
                              {p.category}
                            </span>
                            <span
                              className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                                stockNum <= 0
                                  ? "bg-red-100 text-red-700"
                                  : stockNum <= 35
                                  ? "bg-amber-100 text-amber-800"
                                  : "bg-emerald-100 text-emerald-800"
                              }`}
                            >
                              {stockNum > 0
                                ? `${p.stock_quantity} ${p.unit} in stock`
                                : "Out of Stock"}
                            </span>
                            {hasDiscount && (
                              <span className="px-2 py-0.5 rounded-full bg-amber-400 text-slate-950 text-[10px] font-black">
                                -{discPct}% OFF
                              </span>
                            )}
                          </div>
                          <h4 className="font-extrabold text-sm sm:text-base text-slate-900 truncate">
                            {p.name}
                          </h4>
                          {p.origin_location && (
                            <p className="text-[11px] text-slate-500 flex items-center gap-1">
                              <MapPin className="w-3 h-3 text-emerald-700 shrink-0" />
                              {p.origin_location}
                            </p>
                          )}
                        </div>

                        <div className="flex items-center gap-1 shrink-0">
                          <button
                            type="button"
                            onClick={() => setEditingProduct({ ...p })}
                            className="p-2 text-emerald-700 bg-emerald-50/70 hover:bg-emerald-100 rounded-xl transition cursor-pointer"
                            title="Edit Product Details, Actual Price or Selling Price"
                          >
                            <Edit3 className="w-4 h-4" />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDeleteProduct(p.id, p.name)}
                            className="p-2 text-red-600 bg-red-50/70 hover:bg-red-100 rounded-xl transition cursor-pointer"
                            title="Delete Product"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>

                      <div className="pt-2.5 border-t border-slate-100 flex items-baseline justify-between">
                        <div>
                          <span className="text-base font-black text-[#14532D]">
                            रु {p.price}
                          </span>
                          <span className="text-xs text-slate-500"> / {p.unit}</span>
                          {hasDiscount && (
                            <span className="ml-2 text-xs text-slate-400 line-through font-semibold">
                              रु {p.actual_price}
                            </span>
                          )}
                        </div>
                        <span className="text-[11px] font-bold text-slate-400">
                          Batch #{p.id}
                        </span>
                      </div>
                    </div>
                  );
                })}
            </div>
          </div>
          </div>
        </div>
      )}

      {/* 6. CUSTOMER ORDERS TAB WITH SEARCH, STATUS FILTER PILLS & SORT */}
      {subTab === "orders" && (() => {
        const orderCounts = {
          ALL: orders.length,
          PENDING: orders.filter((o) => o.status === "PENDING").length,
          CONFIRMED: orders.filter((o) => o.status === "CONFIRMED").length,
          DELIVERED: orders.filter((o) => o.status === "DELIVERED").length,
          CANCELLED: orders.filter((o) => o.status === "CANCELLED").length,
        };

        const displayedOrders = orders
          .filter((o) => {
            const q = orderSearch.toLowerCase();
            const matchesSearch =
              String(o.id).includes(orderSearch) ||
              (o.buyer_name || "").toLowerCase().includes(q) ||
              (o.contact_phone || "").includes(orderSearch) ||
              (o.product_name || "").toLowerCase().includes(q) ||
              (o.delivery_address || "").toLowerCase().includes(q);

            const matchesStatus =
              adminOrderFilter === "ALL" || o.status === adminOrderFilter;
            return matchesSearch && matchesStatus;
          })
          .sort((a, b) => {
            if (adminOrderSort === "NEWEST") return Number(b.id) - Number(a.id);
            if (adminOrderSort === "OLDEST") return Number(a.id) - Number(b.id);
            if (adminOrderSort === "PRICE_DESC") return Number(b.total_price || 0) - Number(a.total_price || 0);
            if (adminOrderSort === "PRICE_ASC") return Number(a.total_price || 0) - Number(b.total_price || 0);
            return 0;
          });

        return (
          <div className="space-y-4">
            {/* Search, Filter Pills & Export Bar */}
            <div className="bg-white p-4 sm:p-5 rounded-3xl shadow-sm border border-slate-200 space-y-3.5">
              <div className="flex flex-wrap justify-between items-center gap-3">
                <div>
                  <h3 className="font-extrabold text-base sm:text-lg text-slate-900">
                    Live Customer Orders ({orders.length})
                  </h3>
                  <p className="text-xs text-slate-500">
                    Search orders, filter by status, apply discount in receipt, or print 1/4 A4 dispatch slips.
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() =>
                      handleExportCSV(
                        `KrishiMart_Customer_Orders_${new Date().toISOString().slice(0, 10)}.csv`,
                        [
                          "Order ID",
                          "Date",
                          "Customer Name",
                          "Contact Phone",
                          "Produce Item",
                          "Quantity",
                          "Unit",
                          "Total Payable (NPR)",
                          "Status",
                          "Delivery Address",
                        ],
                        displayedOrders.map((o) => [
                          `#KM-ORD-${o.id}`,
                          new Date(o.created_at).toLocaleDateString(),
                          o.buyer_name,
                          o.contact_phone,
                          o.product_name,
                          o.quantity,
                          o.product_unit,
                          o.total_price,
                          o.status,
                          o.delivery_address,
                        ])
                      )
                    }
                    className="px-3 py-1.5 rounded-xl bg-emerald-50 hover:bg-emerald-100 text-[#14532D] border border-emerald-200 text-xs font-extrabold transition cursor-pointer"
                  >
                    📊 Export (.CSV / Excel)
                  </button>
                  <span className="text-xs text-emerald-700 font-semibold flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" /> Auto-syncing
                  </span>
                </div>
              </div>

              {/* Search & Sort Controls */}
              <div className="flex flex-col sm:flex-row sm:items-center gap-2.5 pt-1">
                <div className="relative flex-1">
                  <input
                    type="text"
                    placeholder="Search orders by Order #, buyer name, phone, produce, or address..."
                    value={orderSearch}
                    onChange={(e) => setOrderSearch(e.target.value)}
                    className="w-full px-3.5 py-2 pl-9 border border-slate-200 rounded-xl text-xs outline-none focus:border-[#1B4332] bg-slate-50 focus:bg-white"
                  />
                  <span className="absolute left-3 top-2.5 text-slate-400 text-xs">🔍</span>
                  {orderSearch && (
                    <button
                      type="button"
                      onClick={() => setOrderSearch("")}
                      className="absolute right-3 top-2 text-slate-400 hover:text-slate-600 text-xs font-bold"
                    >
                      ✕
                    </button>
                  )}
                </div>

                <div className="flex items-center gap-2">
                  <select
                    value={adminOrderSort}
                    onChange={(e) => setAdminOrderSort(e.target.value)}
                    className="px-3 py-2 rounded-xl border border-slate-200 text-xs font-bold bg-white text-slate-700 outline-none cursor-pointer"
                  >
                    <option value="NEWEST">⚡ Newest Order First</option>
                    <option value="OLDEST">⏳ Oldest Order First</option>
                    <option value="PRICE_DESC">💰 Amount: High to Low</option>
                    <option value="PRICE_ASC">💵 Amount: Low to High</option>
                  </select>
                </div>
              </div>

              {/* Status Filter Pills with Live Badges */}
              <div className="flex flex-wrap gap-1.5 pt-1 border-t border-slate-100">
                {[
                  { id: "ALL", label: "All Orders", count: orderCounts.ALL },
                  {
                    id: "PENDING",
                    label: "⏳ Pending Confirmation",
                    count: orderCounts.PENDING,
                    highlight: true,
                  },
                  { id: "CONFIRMED", label: "Packing / Confirmed", count: orderCounts.CONFIRMED },
                  { id: "DELIVERED", label: "✓ Delivered", count: orderCounts.DELIVERED },
                  { id: "CANCELLED", label: "✕ Cancelled", count: orderCounts.CANCELLED },
                ].map((tab) => {
                  const active = adminOrderFilter === tab.id;
                  return (
                    <button
                      key={tab.id}
                      type="button"
                      onClick={() => setAdminOrderFilter(tab.id)}
                      className={`px-3 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 transition cursor-pointer ${
                        active
                          ? "bg-[#1B4332] text-white shadow-2xs"
                          : tab.highlight && tab.count > 0
                          ? "bg-amber-100 text-amber-900 border border-amber-300 hover:bg-amber-200"
                          : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                      }`}
                    >
                      <span>{tab.label}</span>
                      <span
                        className={`px-1.5 py-0.2 rounded-full text-[10px] font-black ${
                          active ? "bg-amber-400 text-slate-950" : "bg-white/80 text-slate-700"
                        }`}
                      >
                        {tab.count}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Orders Feed */}
            <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden divide-y divide-slate-100">
              {displayedOrders.length === 0 ? (
                <p className="p-8 text-center text-slate-500">
                  {orders.length === 0
                    ? "No customer orders placed yet."
                    : "No orders match your search and filter criteria."}
                </p>
              ) : (
                displayedOrders.map((o) => {
                  const { subtotal, discPct, discAmt, netPayable } = getOrderNetFinancials(o);
                  const isEmailSent = Boolean(emailSentOrders[o.id]);
                  return (
              <div
                key={o.id}
                className="p-4 sm:p-5 flex flex-wrap items-center justify-between gap-4 hover:bg-slate-50/80 transition"
              >
                <div className="space-y-1.5">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="px-2.5 py-0.5 rounded-lg bg-slate-100 text-slate-700 text-xs font-black">
                      #KM-ORD-{o.id}
                    </span>
                    <h4 className="font-extrabold text-sm sm:text-base text-slate-900">
                      {o.product_name} ({o.quantity} {o.product_unit})
                    </h4>
                    <span
                      className={`px-2.5 py-0.5 rounded-full text-[11px] font-extrabold ${
                        o.status === "DELIVERED"
                          ? "bg-emerald-100 text-[#14532D]"
                          : o.status === "CONFIRMED"
                          ? "bg-blue-100 text-blue-800"
                          : o.status === "CANCELLED"
                          ? "bg-red-100 text-red-700"
                          : "bg-amber-100 text-amber-900"
                      }`}
                    >
                      {o.status}
                    </span>
                    {discPct > 0 && (
                      <span className="px-2 py-0.5 rounded-full bg-amber-400 text-slate-950 text-[10px] font-black">
                        🎉 {discPct}% Discount (-रु {discAmt.toFixed(2)})
                      </span>
                    )}
                    {isEmailSent && (
                      <span className="px-2 py-0.5 rounded-full bg-emerald-50 border border-emerald-200 text-emerald-800 text-[10px] font-bold">
                        ✉️ Receipt Emailed
                      </span>
                    )}
                  </div>

                  <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-slate-500">
                    <span>
                      Buyer: <strong className="text-slate-800">{o.buyer_name}</strong>
                    </span>
                    <span>•</span>
                    <span>
                      Phone: <strong className="text-slate-800">{o.contact_phone}</strong>
                    </span>
                    <span>•</span>
                    <span>
                      Address: <strong className="text-slate-800">{o.delivery_address}</strong>
                    </span>
                    <span>•</span>
                    <span className="text-slate-400">
                      {new Date(o.created_at || Date.now()).toLocaleDateString()}
                    </span>
                  </div>

                  <div className="flex items-center gap-2 text-xs pt-0.5">
                    {discPct > 0 ? (
                      <>
                        <span className="text-slate-400 line-through">
                          Subtotal: रु {subtotal.toFixed(2)}
                        </span>
                        <span className="font-black text-[#14532D] text-sm">
                          Net Payable: रु {netPayable.toFixed(2)}
                        </span>
                      </>
                    ) : (
                      <span className="font-black text-[#14532D] text-sm">
                        Total Payable: रु {subtotal.toFixed(2)}
                      </span>
                    )}
                  </div>
                </div>
                {/* <div className="flex items-center gap-2">
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
                  <button
                    type="button"
                    onClick={() => handleDeleteOrder(o.id)}
                    className="p-2 text-red-600 hover:bg-red-50 rounded-xl transition cursor-pointer"
                    title="Delete Order"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div> */}
                <div className="flex items-center gap-2">
                  {(o.status === "CONFIRMED" || o.status === "DELIVERED") && (
                    <button
                      type="button"
                      onClick={() => {
                        setReceiptDiscount(orderDiscounts[o.id] ?? 0);
                        setReceiptOrder({
                          ...o,
                          original_subtotal: getTrueOrderSubtotal(o),
                        });
                      }}
                      className="px-3 py-1.5 rounded-xl bg-emerald-50 hover:bg-emerald-100 text-[#14532D] border border-emerald-200 text-xs font-bold flex items-center gap-1.5 transition cursor-pointer"
                      title="View, Print (1/4 A4) or Download Receipt"
                    >
                      <Receipt className="w-3.5 h-3.5" /> Receipt
                    </button>
                  )}
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
                  <button
                    type="button"
                    onClick={() => handleDeleteOrder(o.id)}
                    className="p-2 text-red-600 hover:bg-red-50 rounded-xl transition cursor-pointer"
                    title="Delete Order"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
                  );
                })
          )}
        </div>
        </div>
        );
      })()}

      {/* 7. WHATSAPP WEB / FACEBOOK MESSENGER-STYLE ADMIN LIVE CHAT INBOX */}
      {subTab === "chat" && (() => {
        const filteredThreads = threads.filter((u) => {
          const q = chatThreadSearch.toLowerCase();
          const matchesSearch =
            (u.full_name || "").toLowerCase().includes(q) ||
            (u.phone_number || "").includes(chatThreadSearch) ||
            (u.location || "").toLowerCase().includes(q) ||
            (u.email || "").toLowerCase().includes(q);
          if (!matchesSearch) return false;
          if (chatThreadFilter === "UNREAD") return (u.unread_count || 0) > 0;
          if (chatThreadFilter === "FARMER") return u.role === "FARMER";
          if (chatThreadFilter === "CUSTOMER") return u.role === "CUSTOMER";
          return true;
        });

        return (
          <div className="bg-white rounded-2xl sm:rounded-3xl shadow-xl border border-slate-200/90 grid grid-cols-1 md:grid-cols-12 overflow-hidden h-[calc(100vh-180px)] min-h-[540px] max-h-[680px]">
            {/* Left 4 Columns: WhatsApp / Messenger Conversation List (Full-Screen on Mobile when no user is selected) */}
            <div
              className={`md:col-span-4 border-r border-slate-200 flex-col h-full min-h-0 bg-white ${
                selectedUser ? "hidden md:flex" : "flex"
              }`}
            >
              {/* Left Sidebar Header */}
              <div className="p-3.5 border-b border-slate-200 bg-[#F0F2F5] space-y-2.5 shrink-0">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-full bg-[#14532D] text-amber-300 flex items-center justify-center font-black text-xs">
                      💬
                    </div>
                    <div>
                      <h4 className="font-extrabold text-sm text-slate-900 leading-tight">
                        Chats ({threads.length})
                      </h4>
                      <p className="text-[10px] text-slate-500">
                        Farmers & Buyers Direct Inbox
                      </p>
                    </div>
                  </div>
                  {totalUnreadChats > 0 && (
                    <span className="px-2.5 py-0.5 rounded-full bg-emerald-600 text-white text-[10px] font-black shadow-2xs">
                      {totalUnreadChats} Unread
                    </span>
                  )}
                </div>

                {/* Search Input */}
                <div className="relative">
                  <input
                    type="text"
                    placeholder="Search or start new chat..."
                    value={chatThreadSearch}
                    onChange={(e) => setChatThreadSearch(e.target.value)}
                    className="w-full pl-8 pr-7 py-2 rounded-xl bg-white border border-slate-200/90 text-xs outline-none focus:border-[#14532D] shadow-2xs"
                  />
                  <span className="absolute left-2.5 top-2 text-slate-400 text-xs">🔍</span>
                  {chatThreadSearch && (
                    <button
                      type="button"
                      onClick={() => setChatThreadSearch("")}
                      className="absolute right-2.5 top-2 text-slate-400 hover:text-slate-700 text-xs font-bold cursor-pointer"
                    >
                      ✕
                    </button>
                  )}
                </div>

                {/* Filter Pills */}
                <div className="flex gap-1.5 overflow-x-auto no-scrollbar">
                  {[
                    { id: "ALL", label: "All" },
                    { id: "UNREAD", label: `Unread (${totalUnreadChats})` },
                    { id: "FARMER", label: "🌾 Farmers" },
                    { id: "CUSTOMER", label: "🛒 Buyers" },
                  ].map((ft) => (
                    <button
                      key={ft.id}
                      type="button"
                      onClick={() => setChatThreadFilter(ft.id)}
                      className={`px-2.5 py-1 rounded-full text-[10px] font-extrabold whitespace-nowrap transition cursor-pointer ${
                        chatThreadFilter === ft.id
                          ? "bg-[#14532D] text-white shadow-2xs"
                          : "bg-white border border-slate-200 text-slate-600 hover:bg-slate-100"
                      }`}
                    >
                      {ft.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Scrollable Thread List */}
              <div className="overflow-y-auto flex-1 divide-y divide-slate-100">
                {filteredThreads.length === 0 ? (
                  <p className="p-8 text-center text-xs text-slate-400">
                    No conversations match your search.
                  </p>
                ) : (
                  filteredThreads.map((u) => {
                    const isSelected = selectedUser?.id === u.id;
                    return (
                      <button
                        key={u.id}
                        type="button"
                        onClick={() => setSelectedUser(u)}
                        className={`w-full text-left px-3.5 py-3 hover:bg-slate-50 transition flex items-center justify-between gap-2.5 cursor-pointer ${
                          isSelected
                            ? "bg-emerald-50/90 border-l-4 border-l-[#14532D]"
                            : ""
                        }`}
                      >
                        <div className="flex items-center gap-3 min-w-0 flex-1">
                          <div className="relative shrink-0">
                            <div className="w-11 h-11 rounded-full bg-emerald-800 text-white flex items-center justify-center font-bold text-sm overflow-hidden shadow-2xs">
                              {u.profile_picture ? (
                                <img
                                  src={
                                    resolveMediaUrl(u.profile_picture, u.id)
                                  }
                                  alt={u.full_name}
                                  className="w-full h-full object-cover"
                                />
                              ) : (
                                <span>{u.full_name?.charAt(0).toUpperCase()}</span>
                              )}
                            </div>
                            <span
                              className={`w-3 h-3 rounded-full border-2 border-white absolute bottom-0 right-0 ${
                                u.is_admin_verified ? "bg-emerald-500" : "bg-amber-400"
                              }`}
                            />
                          </div>

                          <div className="min-w-0 flex-1">
                            <div className="flex items-center justify-between gap-1">
                              <div className="flex items-center gap-1.5 min-w-0">
                                <p
                                  className={`text-xs sm:text-sm truncate ${
                                    u.unread_count > 0
                                      ? "font-black text-slate-950"
                                      : "font-bold text-slate-800"
                                  }`}
                                >
                                  {u.full_name}
                                </p>
                                <span
                                  className={`px-1.5 py-0.2 rounded text-[9px] font-black uppercase shrink-0 ${
                                    u.role === "FARMER"
                                      ? "bg-emerald-100 text-[#14532D]"
                                      : "bg-blue-100 text-blue-800"
                                  }`}
                                >
                                  {u.role}
                                </span>
                              </div>
                              {u.last_message_time && (
                                <span
                                  className={`text-[10px] shrink-0 ${
                                    u.unread_count > 0
                                      ? "font-extrabold text-emerald-700"
                                      : "text-slate-400"
                                  }`}
                                >
                                  {new Date(u.last_message_time).toLocaleTimeString([], {
                                    hour: "2-digit",
                                    minute: "2-digit",
                                  })}
                                </span>
                              )}
                            </div>

                            <div className="flex items-center justify-between gap-2 mt-0.5">
                              <p
                                className={`text-[11px] truncate ${
                                  u.unread_count > 0
                                    ? "font-bold text-slate-900"
                                    : "text-slate-500"
                                }`}
                              >
                                {u.last_message_preview
                                  ? u.last_message_preview
                                  : `📍 ${u.location || u.phone_number || u.email}`}
                              </p>
                              {u.unread_count > 0 && (
                                <span className="px-1.5 py-0.2 rounded-full bg-emerald-600 text-white text-[10px] font-black shrink-0">
                                  {u.unread_count}
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                      </button>
                    );
                  })
                )}
              </div>
            </div>

            {/* Right 8 Columns: Active WhatsApp / Messenger Conversation Window */}
            <div
              className={`md:col-span-8 flex-col h-full min-h-0 ${
                selectedUser ? "flex" : "hidden md:flex"
              }`}
            >
              {selectedUser ? (
                <>
                  {/* Conversation Top Header (With Mobile ← Back Button) */}
                  <div className="px-3.5 sm:px-5 py-3 border-b border-slate-200 bg-[#F0F2F5] flex items-center justify-between gap-2 shrink-0">
                    <div className="flex items-center gap-2.5 min-w-0">
                      <button
                        type="button"
                        onClick={() => setSelectedUser(null)}
                        className="md:hidden px-2.5 py-1.5 rounded-xl bg-white border border-slate-200 text-slate-700 font-extrabold text-xs flex items-center gap-1 shadow-2xs cursor-pointer shrink-0"
                      >
                        ← Chats
                      </button>

                      <div className="relative shrink-0">
                        <div className="w-10 h-10 rounded-full bg-emerald-800 text-white flex items-center justify-center font-bold text-xs overflow-hidden shadow-2xs">
                          {selectedUser.profile_picture ? (
                            <img
                              src={
                                resolveMediaUrl(selectedUser.profile_picture, selectedUser.id)
                              }
                              alt={selectedUser.full_name}
                              className="w-full h-full object-cover"
                            />
                          ) : (
                            <span>{selectedUser.full_name?.charAt(0).toUpperCase()}</span>
                          )}
                        </div>
                        <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 border-2 border-white absolute bottom-0 right-0" />
                      </div>

                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <p className="font-extrabold text-xs sm:text-sm text-slate-900 truncate">
                            {selectedUser.full_name}
                          </p>
                          <span
                            className={`px-2 py-0.5 rounded-full text-[9px] font-black uppercase shrink-0 ${
                              selectedUser.role === "FARMER"
                                ? "bg-emerald-100 text-[#14532D]"
                                : "bg-blue-100 text-blue-800"
                            }`}
                          >
                            {selectedUser.role}
                          </span>
                        </div>
                        <p className="text-[10px] sm:text-[11px] text-slate-500 truncate">
                          📍 {selectedUser.location || "Nepal"} • 📞{" "}
                          {selectedUser.phone_number || "—"}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-1.5 shrink-0">
                      {chatMessages.length > 0 && (
                        <button
                          type="button"
                          onClick={() => handleClearChatThread("me")}
                          className="px-2.5 py-1.5 rounded-xl bg-white hover:bg-slate-100 border border-slate-200 text-slate-700 text-[11px] font-bold flex items-center gap-1 transition cursor-pointer shadow-2xs"
                          title="Clear this conversation from your Admin view only"
                        >
                          <Trash2 className="w-3 h-3 text-slate-500" />
                          <span className="hidden sm:inline">Clear for Me</span>
                        </button>
                      )}
                      <button
                        type="button"
                        onClick={() => setSelectedUser(null)}
                        className="p-1.5 rounded-xl bg-white hover:bg-slate-100 border border-slate-200 text-slate-500 hover:text-slate-800 transition cursor-pointer shadow-2xs"
                        title="Close conversation"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  </div>

                  {/* WhatsApp / Messenger Messages Stream */}
                  <div
                    ref={chatContainerRef}
                    className="flex-1 min-h-0 p-3.5 sm:p-5 overflow-y-auto space-y-2.5 bg-[#EFEAE2]"
                  >
                    <div className="text-center pb-1">
                      <span className="inline-block px-3 py-1 rounded-xl bg-[#FFF8C5] border border-amber-200/80 text-[10px] font-bold text-slate-700 shadow-2xs">
                        🔒 Direct Support Thread with {selectedUser.full_name} ({selectedUser.role})
                      </span>
                    </div>

                    {chatMessages.length === 0 ? (
                      <div className="bg-white/95 rounded-2xl p-6 text-center max-w-sm mx-auto mt-12 border border-slate-200/80 space-y-1.5 shadow-2xs">
                        <p className="text-xs font-extrabold text-slate-700">
                          No messages with {selectedUser.full_name} yet
                        </p>
                        <p className="text-[11px] text-slate-400">
                          Send a message or tap a quick reply below to start the conversation.
                        </p>
                      </div>
                    ) : (
                      chatMessages.map((m, idx) => {
                        const isUnsent =
                          Boolean(m.is_unsent) || m.message === "🚫 This message was unsent";
                        const fromAdmin = Boolean(m.is_from_admin || m.is_admin_reply);
                        const msgDateStr = new Date(m.created_at).toLocaleDateString([], {
                          month: "short",
                          day: "numeric",
                          year: "numeric",
                        });
                        const prevDateStr =
                          idx > 0
                            ? new Date(chatMessages[idx - 1].created_at).toLocaleDateString([], {
                                month: "short",
                                day: "numeric",
                                year: "numeric",
                              })
                            : null;
                        const showDateChip = idx === 0 || msgDateStr !== prevDateStr;
                        const displayText = isUnsent
                          ? fromAdmin
                            ? "🚫 You unsent a message"
                            : `🚫 ${selectedUser.full_name} unsent a message`
                          : m.message;

                        return (
                          <React.Fragment key={m.id}>
                            {showDateChip && (
                              <div className="flex justify-center my-2">
                                <span className="px-3 py-0.5 rounded-full bg-white/90 text-slate-600 text-[10px] font-extrabold shadow-2xs border border-slate-200/60">
                                  {msgDateStr}
                                </span>
                              </div>
                            )}
                            <div
                              className={`flex items-end gap-2 group ${
                                fromAdmin ? "justify-end" : "justify-start"
                              }`}
                            >
                              {/* User Avatar on Left of Incoming User Messages */}
                              {!fromAdmin && (
                                <div className="w-7 h-7 rounded-full bg-emerald-800 text-white font-bold text-[11px] flex items-center justify-center shrink-0 shadow-2xs">
                                  {(selectedUser.full_name || "U").charAt(0).toUpperCase()}
                                </div>
                              )}

                              {/* Delete/Unsend Action Button on Left of Admin's Outgoing Bubble */}
                              {fromAdmin && (
                                <button
                                  type="button"
                                  onClick={() => setAdminChatActionMsg(m)}
                                  className="opacity-85 sm:opacity-0 group-hover:opacity-100 p-1.5 rounded-full bg-white/90 hover:bg-red-50 text-slate-500 hover:text-red-600 border border-slate-200 shadow-2xs transition cursor-pointer mb-1 shrink-0"
                                  title="Unsend or Delete Options"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              )}

                              {/* WhatsApp / Messenger Bubble */}
                              <div
                                className={`max-w-[78%] sm:max-w-md px-3.5 py-2 rounded-2xl text-xs sm:text-sm shadow-xs ${
                                  isUnsent
                                    ? "bg-white/80 border border-dashed border-slate-300 text-slate-400 italic"
                                    : fromAdmin
                                    ? "bg-[#14532D] text-white rounded-br-xs"
                                    : "bg-white border border-slate-100 text-slate-900 rounded-bl-xs"
                                }`}
                              >
                                {!fromAdmin && !isUnsent && (
                                  <p className="text-[10px] font-extrabold text-emerald-700 mb-0.5">
                                    {selectedUser.full_name}
                                  </p>
                                )}
                                <p className="break-words leading-relaxed">{displayText}</p>
                                <div
                                  className={`flex items-center justify-end gap-1 text-[10px] mt-1 ${
                                    isUnsent || !fromAdmin ? "text-slate-400" : "text-emerald-200"
                                  }`}
                                >
                                  <span>
                                    {new Date(m.created_at).toLocaleTimeString([], {
                                      hour: "2-digit",
                                      minute: "2-digit",
                                    })}
                                  </span>
                                  {fromAdmin && !isUnsent && (
                                    <span
                                      className={`font-black ${
                                        m.is_read ? "text-amber-300" : "text-emerald-200"
                                      }`}
                                    >
                                      {m.is_read ? "✓✓ Seen" : "✓ Sent"}
                                    </span>
                                  )}
                                </div>
                              </div>

                              {/* Delete for Me Action Button on Right of User's Incoming Bubble */}
                              {!fromAdmin && (
                                <button
                                  type="button"
                                  onClick={() => setAdminChatActionMsg(m)}
                                  className="opacity-85 sm:opacity-0 group-hover:opacity-100 p-1.5 rounded-full bg-white/90 hover:bg-red-50 text-slate-500 hover:text-red-600 border border-slate-200 shadow-2xs transition cursor-pointer mb-1 shrink-0"
                                  title="Delete for Me"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              )}
                            </div>
                          </React.Fragment>
                        );
                      })
                    )}
                  </div>

                  {/* Admin 1-Tap Quick Replies Bar */}
                  <div className="px-3 py-2 bg-white border-t border-slate-200/80 flex items-center gap-1.5 overflow-x-auto no-scrollbar shrink-0">
                    {(selectedUser.role === "FARMER"
                      ? [
                          "🌾 Namaste! We reviewed and approved your harvest offer.",
                          "💳 Your farmer payout has been settled (PAID).",
                          "🚚 Our pickup vehicle will arrive at your farm today.",
                        ]
                      : [
                          "✓ Namaste! Your order is confirmed and being packed.",
                          "🚚 Your order is out for delivery today!",
                          "🎉 We applied a special discount to your order receipt.",
                        ]
                    ).map((chip) => (
                      <button
                        key={chip}
                        type="button"
                        onClick={() => setReplyText(chip)}
                        className="px-3 py-1 rounded-full bg-slate-100 hover:bg-emerald-50 border border-slate-200 text-slate-700 hover:text-[#14532D] text-[11px] font-bold whitespace-nowrap transition cursor-pointer shrink-0"
                      >
                        {chip}
                      </button>
                    ))}
                  </div>

                  {/* WhatsApp / Messenger Reply Composer */}
                  <form
                    onSubmit={handleSendAdminReply}
                    className="p-2.5 sm:p-3.5 border-t border-slate-200 flex items-center gap-2 bg-[#F0F2F5] shrink-0"
                  >
                    <input
                      type="text"
                      placeholder={`Type a message to ${selectedUser.full_name}...`}
                      value={replyText}
                      onChange={(e) => setReplyText(e.target.value)}
                      className="flex-1 px-4 py-2.5 rounded-full bg-white border border-slate-200 focus:border-[#1B4332] text-xs sm:text-sm outline-none transition shadow-2xs"
                    />
                    <button
                      type="submit"
                      disabled={!replyText.trim()}
                      className="px-4 sm:px-5 py-2.5 bg-[#14532D] hover:bg-[#1B4332] disabled:bg-slate-300 text-white rounded-full text-xs sm:text-sm font-extrabold flex items-center gap-1.5 shadow-sm cursor-pointer shrink-0"
                    >
                      <Send className="w-4 h-4" />
                      <span className="hidden sm:inline">Send</span>
                    </button>
                  </form>
                </>
              ) : (
                <div className="flex-1 flex flex-col items-center justify-center text-slate-400 p-8 text-center space-y-2.5 bg-[#EFEAE2]">
                  <div className="w-14 h-14 rounded-full bg-white text-[#14532D] flex items-center justify-center shadow-sm">
                    <MessageSquare className="w-7 h-7" />
                  </div>
                  <p className="font-extrabold text-base text-slate-800">
                    KrishiMart Messenger Web
                  </p>
                  <p className="text-xs text-slate-500 max-w-xs leading-relaxed">
                    Select a Farmer or Buyer conversation from the left panel to view messages and
                    reply in real time.
                  </p>
                </div>
              )}
            </div>
          </div>
        );
      })()}

      {/* 8. DEDICATED REAL-TIME FINANCIAL ANALYTICS, PIE CHART & BAR CHART PAGE */}
      {subTab === "analytics" && (() => {
        const now = new Date();
        const isWithinRange = (dateStr) => {
          if (analyticsRange === "ALL" || !dateStr) return true;
          const d = new Date(dateStr);
          if (Number.isNaN(d.getTime())) return true;
          const diffDays = (now.getTime() - d.getTime()) / (1000 * 60 * 60 * 24);
          if (analyticsRange === "TODAY") {
            return d.toDateString() === now.toDateString();
          }
          if (analyticsRange === "7D") return diffDays <= 7;
          if (analyticsRange === "30D") return diffDays <= 30;
          return true;
        };

        const filteredOrdersForAnalytics = orders.filter((o) => isWithinRange(o.created_at));
        const filteredPurchasesForAnalytics = purchases.filter((p) => isWithinRange(p.created_at));

        // 1. Calculate Real-Time Income (Customer Orders excluding CANCELLED)
        const activeOrders = filteredOrdersForAnalytics.filter((o) => o.status !== "CANCELLED");
        const deliveredOrders = activeOrders.filter((o) => o.status === "DELIVERED");
        const confirmedOrders = activeOrders.filter((o) => o.status === "CONFIRMED");
        const pendingOrdersList = activeOrders.filter((o) => o.status === "PENDING");
        const cancelledOrdersList = filteredOrdersForAnalytics.filter(
          (o) => o.status === "CANCELLED"
        );

        const grossOrderSubtotal = activeOrders.reduce(
          (sum, o) => sum + getOrderNetFinancials(o).subtotal,
          0
        );
        const totalDiscountGiven = activeOrders.reduce(
          (sum, o) => sum + getOrderNetFinancials(o).discAmt,
          0
        );
        const totalIncome = activeOrders.reduce(
          (sum, o) => sum + getOrderNetFinancials(o).netPayable,
          0
        );
        const realizedDeliveredIncome = deliveredOrders.reduce(
          (sum, o) => sum + getOrderNetFinancials(o).netPayable,
          0
        );
        const pipelineOrderIncome = Math.max(0, totalIncome - realizedDeliveredIncome);

        // 2. Calculate Real-Time Expenses (Farmer Wholesale Procurement Payouts)
        const settledExpenses = filteredPurchasesForAnalytics
          .filter((p) => p.payment_status === "PAID")
          .reduce((sum, p) => sum + Number(p.total_amount || 0), 0);
        const pendingExpenses = filteredPurchasesForAnalytics
          .filter((p) => p.payment_status !== "PAID")
          .reduce((sum, p) => sum + Number(p.total_amount || 0), 0);
        const totalExpenses = settledExpenses + pendingExpenses;

        // 3. Net Profit / Cashflow Balance & Margin
        const netBalance = totalIncome - totalExpenses;
        const profitMarginPct =
          totalIncome > 0 ? ((netBalance / totalIncome) * 100).toFixed(1) : "0.0";
        const totalInventoryValuation = products.reduce(
          (sum, p) => sum + Number(p.price || 0) * Number(p.stock_quantity || 0),
          0
        );

        // 4. SVG Donut / Pie Chart Segments (4 Financial Slices)
        const pieSegmentsRaw = [
          {
            id: "delivered_income",
            label: "Delivered Order Income",
            value: realizedDeliveredIncome,
            color: "#14532D",
            bgBadge: "bg-[#14532D]",
            type: "INCOME",
          },
          {
            id: "pipeline_income",
            label: "Confirmed / Pending Order Income",
            value: pipelineOrderIncome,
            color: "#10B981",
            bgBadge: "bg-emerald-500",
            type: "INCOME",
          },
          {
            id: "settled_expense",
            label: "Farmer Payouts (PAID Expense)",
            value: settledExpenses,
            color: "#D97706",
            bgBadge: "bg-amber-600",
            type: "EXPENSE",
          },
          {
            id: "pending_expense",
            label: "Farmer Payables (PENDING Expense)",
            value: pendingExpenses,
            color: "#EF4444",
            bgBadge: "bg-red-500",
            type: "EXPENSE",
          },
        ];

        const totalPieVolume = pieSegmentsRaw.reduce((sum, s) => sum + s.value, 0);
        const radius = 72;
        const circumference = 2 * Math.PI * radius;
        let cumulativePercent = 0;

        const pieSlices = pieSegmentsRaw.map((seg) => {
          const pct = totalPieVolume > 0 ? seg.value / totalPieVolume : 0;
          const strokeDasharray = `${(pct * circumference).toFixed(2)} ${circumference.toFixed(2)}`;
          const strokeDashoffset = (-cumulativePercent * circumference).toFixed(2);
          cumulativePercent += pct;
          return {
            ...seg,
            pct: (pct * 100).toFixed(1),
            strokeDasharray,
            strokeDashoffset,
          };
        });

        // 5. Category-Wise Income vs. Expense Bar Chart Data
        const categoriesList = ["VEGETABLES", "FRUITS", "GRAINS", "SPICES", "DAIRY"];
        const categoryChartData = categoriesList.map((cat) => {
          // Match orders to category via product lookup
          const catIncome = activeOrders
            .filter((o) => {
              const matchedProd = products.find(
                (p) => p.id === o.product || p.name === o.product_name
              );
              const prodCat = (matchedProd?.category || "VEGETABLES").toUpperCase();
              return prodCat === cat;
            })
            .reduce((sum, o) => sum + getOrderNetFinancials(o).netPayable, 0);

          const catExpense = filteredPurchasesForAnalytics
            .filter((p) => {
              const pCat = (p.category || "").toUpperCase();
              if (cat === "FRUITS") return pCat.includes("FRUIT");
              if (cat === "GRAINS") return pCat.includes("GRAIN") || pCat.includes("PULSE");
              if (cat === "SPICES") return pCat.includes("SPICE") || pCat.includes("HERB");
              if (cat === "DAIRY") return pCat.includes("DAIRY") || pCat.includes("HONEY") || pCat.includes("OIL");
              return (
                pCat.includes("VEG") ||
                (!pCat.includes("FRUIT") &&
                  !pCat.includes("GRAIN") &&
                  !pCat.includes("SPICE") &&
                  !pCat.includes("DAIRY"))
              );
            })
            .reduce((sum, p) => sum + Number(p.total_amount || 0), 0);

          const catStockVal = products
            .filter((p) => (p.category || "").toUpperCase() === cat)
            .reduce((sum, p) => sum + Number(p.price || 0) * Number(p.stock_quantity || 0), 0);

          return {
            category: cat,
            label:
              cat === "VEGETABLES"
                ? "🥬 Vegetables"
                : cat === "FRUITS"
                ? "🍎 Fruits"
                : cat === "GRAINS"
                ? "🌾 Grains"
                : cat === "SPICES"
                ? "🌶️ Spices"
                : "🍯 Dairy & Oils",
            income: Number(catIncome.toFixed(2)),
            expense: Number(catExpense.toFixed(2)),
            stockVal: Number(catStockVal.toFixed(2)),
          };
        });

        const maxBarValue = Math.max(
          1000,
          ...categoryChartData.map((d) => Math.max(d.income, d.expense))
        );

        // 6. Chronological Combined Financial Ledger (Income + Expenses)
        const combinedLedger = [
          ...activeOrders.map((o) => {
            const { discPct, netPayable } = getOrderNetFinancials(o);
            return {
              uid: `ORD-${o.id}`,
              refId: `#KM-ORD-${o.id}`,
              date: o.created_at,
              type: "INCOME",
              party: o.buyer_name || "Customer",
              item: `${o.product_name} (${o.quantity} ${o.product_unit || "unit"})`,
              status: o.status,
              note: discPct > 0 ? `${discPct}% Discount Applied` : "Standard Hub Rate",
              amount: netPayable,
            };
          }),
          ...filteredPurchasesForAnalytics.map((p) => ({
            uid: `PUR-${p.id}`,
            refId: `#KM-PUR-${p.id}`,
            date: p.created_at,
            type: "EXPENSE",
            party: p.farmer_name || "Farmer",
            item: `${p.crop_name} (${p.quantity} ${p.unit || "kg"})`,
            status: p.payment_status,
            note: `Paid via ${p.payment_method}`,
            amount: Number(p.total_amount || 0),
          })),
        ].sort((a, b) => new Date(b.date || 0) - new Date(a.date || 0));

        return (
          <div className="space-y-6">
            {/* Top Analytics Control Bar */}
            <div className="bg-white rounded-3xl p-4 sm:p-6 border border-slate-200 shadow-xs flex flex-col lg:flex-row lg:items-center justify-between gap-4">
              <div>
                <div className="flex items-center gap-2">
                  <span className="px-2.5 py-0.5 rounded-full bg-emerald-100 text-[#14532D] text-[10px] font-black uppercase tracking-wider">
                    ● Real-Time Financial Intelligence
                  </span>
                  <span className="text-[11px] text-slate-400 font-semibold">
                    Auto-updates every 3.5s
                  </span>
                </div>
                <h3 className="text-lg sm:text-2xl font-black text-slate-900 mt-1">
                  KrishiMart Income vs. Expenses Analytics
                </h3>
                <p className="text-xs text-slate-500">
                  Live comparison of customer sales revenue (after discounts) against farmer
                  wholesale procurement payouts.
                </p>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                {/* Timeframe Filter Pills */}
                <div className="flex bg-slate-100 p-1 rounded-2xl border border-slate-200">
                  {[
                    { id: "ALL", label: "All Time" },
                    { id: "30D", label: "Last 30 Days" },
                    { id: "7D", label: "Last 7 Days" },
                    { id: "TODAY", label: "Today" },
                  ].map((tf) => (
                    <button
                      key={tf.id}
                      type="button"
                      onClick={() => setAnalyticsRange(tf.id)}
                      className={`px-3 py-1.5 rounded-xl text-xs font-extrabold transition cursor-pointer ${
                        analyticsRange === tf.id
                          ? "bg-[#14532D] text-white shadow-2xs"
                          : "text-slate-600 hover:text-slate-900"
                      }`}
                    >
                      {tf.label}
                    </button>
                  ))}
                </div>

                {/* Chart View Mode Selector */}
                <div className="flex bg-slate-100 p-1 rounded-2xl border border-slate-200">
                  {[
                    { id: "BOTH", label: "📊 Both Charts" },
                    { id: "PIE", label: "🍩 Pie Chart" },
                    { id: "BAR", label: "📈 Bar Chart" },
                  ].map((cm) => (
                    <button
                      key={cm.id}
                      type="button"
                      onClick={() => setChartMode(cm.id)}
                      className={`px-3 py-1.5 rounded-xl text-xs font-extrabold transition cursor-pointer ${
                        chartMode === cm.id
                          ? "bg-amber-400 text-slate-950 shadow-2xs"
                          : "text-slate-600 hover:text-slate-900"
                      }`}
                    >
                      {cm.label}
                    </button>
                  ))}
                </div>

                <button
                  type="button"
                  onClick={() =>
                    handleExportCSV(
                      `KrishiMart_Financial_Statement_${new Date().toISOString().slice(0, 10)}.csv`,
                      [
                        "Reference ID",
                        "Date",
                        "Transaction Type",
                        "Counterparty (Buyer / Farmer)",
                        "Crop / Item Details",
                        "Status",
                        "Remarks",
                        "Amount (NPR)",
                      ],
                      combinedLedger.map((row) => [
                        row.refId,
                        new Date(row.date || Date.now()).toLocaleDateString(),
                        row.type,
                        row.party,
                        row.item,
                        row.status,
                        row.note,
                        row.type === "INCOME" ? `+${row.amount.toFixed(2)}` : `-${row.amount.toFixed(2)}`,
                      ])
                    )
                  }
                  className="px-3.5 py-2 rounded-xl bg-emerald-50 hover:bg-emerald-100 text-[#14532D] border border-emerald-200 text-xs font-extrabold transition cursor-pointer"
                >
                  📊 Export P&L (.CSV)
                </button>
              </div>
            </div>

            {/* 4 Executive Financial KPI Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {/* Card 1: Total Net Income */}
              <div className="bg-white rounded-3xl p-5 border border-emerald-200/90 shadow-2xs space-y-2 relative overflow-hidden">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-extrabold uppercase tracking-wider text-emerald-700">
                    Total Sales Income (Net)
                  </span>
                  <span className="px-2 py-0.5 rounded-full bg-emerald-100 text-[#14532D] text-[10px] font-black">
                    + INCOME
                  </span>
                </div>
                <p className="text-2xl sm:text-3xl font-black text-[#14532D]">
                  रु {totalIncome.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </p>
                <div className="text-[11px] text-slate-500 space-y-0.5 pt-1 border-t border-slate-100">
                  <div className="flex justify-between">
                    <span>Delivered Cash:</span>
                    <strong className="text-emerald-700">रु {realizedDeliveredIncome.toLocaleString()}</strong>
                  </div>
                  <div className="flex justify-between">
                    <span>Discounts Given:</span>
                    <strong className="text-amber-700">- रु {totalDiscountGiven.toLocaleString()}</strong>
                  </div>
                </div>
              </div>

              {/* Card 2: Total Procurement Expenses */}
              <div className="bg-white rounded-3xl p-5 border border-amber-200/90 shadow-2xs space-y-2 relative overflow-hidden">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-extrabold uppercase tracking-wider text-amber-800">
                    Farmer Payout Expenses
                  </span>
                  <span className="px-2 py-0.5 rounded-full bg-amber-100 text-amber-900 text-[10px] font-black">
                    - EXPENSE
                  </span>
                </div>
                <p className="text-2xl sm:text-3xl font-black text-amber-700">
                  रु {totalExpenses.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </p>
                <div className="text-[11px] text-slate-500 space-y-0.5 pt-1 border-t border-slate-100">
                  <div className="flex justify-between">
                    <span>Settled (PAID):</span>
                    <strong className="text-slate-800">रु {settledExpenses.toLocaleString()}</strong>
                  </div>
                  <div className="flex justify-between">
                    <span>Pending Payable:</span>
                    <strong className="text-red-600">रु {pendingExpenses.toLocaleString()}</strong>
                  </div>
                </div>
              </div>

              {/* Card 3: Net Profit / Cashflow Balance */}
              <div
                className={`rounded-3xl p-5 border shadow-2xs space-y-2 ${
                  netBalance >= 0
                    ? "bg-gradient-to-br from-emerald-50/90 to-white border-emerald-300"
                    : "bg-gradient-to-br from-amber-50/90 to-white border-amber-300"
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-extrabold uppercase tracking-wider text-slate-600">
                    {netBalance >= 0 ? "Net Operating Profit" : "Net Inventory Investment"}
                  </span>
                  <span
                    className={`px-2 py-0.5 rounded-full text-[10px] font-black ${
                      netBalance >= 0
                        ? "bg-[#14532D] text-amber-300"
                        : "bg-amber-200 text-amber-950"
                    }`}
                  >
                    {netBalance >= 0 ? `Margin ${profitMarginPct}%` : "Stocking Phase"}
                  </span>
                </div>
                <p
                  className={`text-2xl sm:text-3xl font-black ${
                    netBalance >= 0 ? "text-[#14532D]" : "text-amber-800"
                  }`}
                >
                  {netBalance >= 0 ? "+" : "-"} रु{" "}
                  {Math.abs(netBalance).toLocaleString(undefined, {
                    minimumFractionDigits: 2,
                    maximumFractionDigits: 2,
                  })}
                </p>
                <div className="text-[11px] text-slate-500 space-y-0.5 pt-1 border-t border-slate-200/60">
                  <div className="flex justify-between">
                    <span>Formula:</span>
                    <strong className="text-slate-700">Income − Farmer Cost</strong>
                  </div>
                  <div className="flex justify-between">
                    <span>Active Orders:</span>
                    <strong className="text-slate-800">{activeOrders.length} orders</strong>
                  </div>
                </div>
              </div>

              {/* Card 4: Live Store Inventory Asset Value */}
              <div className="bg-white rounded-3xl p-5 border border-slate-200 shadow-2xs space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-extrabold uppercase tracking-wider text-slate-500">
                    Unsold Store Stock Value
                  </span>
                  <span className="px-2 py-0.5 rounded-full bg-blue-100 text-blue-800 text-[10px] font-black">
                    ASSET VALUE
                  </span>
                </div>
                <p className="text-2xl sm:text-3xl font-black text-slate-900">
                  रु {totalInventoryValuation.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </p>
                <div className="text-[11px] text-slate-500 space-y-0.5 pt-1 border-t border-slate-100">
                  <div className="flex justify-between">
                    <span>Active Store Batches:</span>
                    <strong className="text-slate-800">{products.length} items</strong>
                  </div>
                  <div className="flex justify-between">
                    <span>Total Stock Weight:</span>
                    <strong className="text-emerald-700">
                      {products.reduce((s, p) => s + Number(p.stock_quantity || 0), 0).toFixed(0)} units
                    </strong>
                  </div>
                </div>
              </div>
            </div>

            {/* MAIN CHARTS GRID: PIE / DONUT CHART + VERTICAL GROUPED BAR CHART */}
            <div
              className={`grid grid-cols-1 ${
                chartMode === "BOTH" ? "lg:grid-cols-12" : ""
              } gap-6`}
            >
              {/* 1. INTERACTIVE SVG DONUT / PIE CHART: INCOME VS. EXPENSES BREAKDOWN */}
              {(chartMode === "BOTH" || chartMode === "PIE") && (
                <div
                  className={`${
                    chartMode === "BOTH" ? "lg:col-span-5" : ""
                  } bg-white rounded-3xl p-5 sm:p-6 border border-slate-200 shadow-xs flex flex-col justify-between space-y-5`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <span className="text-[10px] font-extrabold uppercase tracking-widest text-emerald-700">
                        PROPORTIONAL DISTRIBUTION
                      </span>
                      <h4 className="text-base sm:text-lg font-black text-slate-900">
                        Income vs. Expenses Pie Chart
                      </h4>
                      <p className="text-xs text-slate-500">
                        Real-time share of customer sales revenue vs. farmer payouts
                      </p>
                    </div>
                    <span className="px-2.5 py-1 rounded-xl bg-slate-100 text-slate-700 text-[11px] font-extrabold">
                      Total Volume: रु {totalPieVolume.toLocaleString()}
                    </span>
                  </div>

                  {/* SVG Donut Chart Centerpiece */}
                  <div className="flex flex-col sm:flex-row items-center justify-center gap-6 py-2">
                    <div className="relative w-48 h-48 flex items-center justify-center shrink-0">
                      <svg className="w-48 h-48 -rotate-90" viewBox="0 0 180 180">
                        {/* Background Ring */}
                        <circle
                          cx="90"
                          cy="90"
                          r={radius}
                          fill="transparent"
                          stroke="#F1F5F9"
                          strokeWidth="24"
                        />
                        {totalPieVolume > 0 &&
                          pieSlices.map((slice) =>
                            slice.value > 0 ? (
                              <circle
                                key={slice.id}
                                cx="90"
                                cy="90"
                                r={radius}
                                fill="transparent"
                                stroke={slice.color}
                                strokeWidth="24"
                                strokeDasharray={slice.strokeDasharray}
                                strokeDashoffset={slice.strokeDashoffset}
                                className="transition-all duration-500 hover:opacity-85 cursor-pointer"
                              >
                                <title>{`${slice.label}: रु ${slice.value.toLocaleString()} (${slice.pct}%)`}</title>
                              </circle>
                            ) : null
                          )}
                      </svg>
                      {/* Center Donut Label */}
                      <div className="absolute inset-0 flex flex-col items-center justify-center text-center px-4">
                        <span className="text-[10px] font-extrabold uppercase text-slate-400">
                          Income Share
                        </span>
                        <span className="text-xl font-black text-[#14532D]">
                          {totalPieVolume > 0
                            ? `${Math.round((totalIncome / totalPieVolume) * 100)}%`
                            : "0%"}
                        </span>
                        <span className="text-[10px] font-bold text-amber-700">
                          Expense:{" "}
                          {totalPieVolume > 0
                            ? `${Math.round((totalExpenses / totalPieVolume) * 100)}%`
                            : "0%"}
                        </span>
                      </div>
                    </div>

                    {/* Pie Chart Legend & Exact Values */}
                    <div className="flex-1 w-full space-y-2.5">
                      {pieSlices.map((slice) => (
                        <div
                          key={slice.id}
                          className="p-2.5 rounded-2xl bg-slate-50 border border-slate-200/70 flex items-center justify-between gap-2"
                        >
                          <div className="flex items-center gap-2.5 min-w-0">
                            <span
                              className="w-3.5 h-3.5 rounded-md shrink-0"
                              style={{ backgroundColor: slice.color }}
                            />
                            <div className="truncate">
                              <p className="text-xs font-extrabold text-slate-800 truncate">
                                {slice.label}
                              </p>
                              <p className="text-[10px] text-slate-400 font-semibold">
                                {slice.type} • {slice.pct}% of flow
                              </p>
                            </div>
                          </div>
                          <span className="text-xs font-black text-slate-900 shrink-0">
                            रु {slice.value.toLocaleString()}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Direct Income vs Expense Summary Bar */}
                  <div className="pt-3 border-t border-slate-100 space-y-2">
                    <div className="flex justify-between text-xs font-bold">
                      <span className="text-[#14532D]">
                        🟢 Total Income: रु {totalIncome.toLocaleString()}
                      </span>
                      <span className="text-amber-700">
                        🟠 Total Expense: रु {totalExpenses.toLocaleString()}
                      </span>
                    </div>
                    <div className="w-full h-3 rounded-full bg-amber-500/25 overflow-hidden flex">
                      <div
                        className="h-full bg-[#14532D] transition-all duration-500"
                        style={{
                          width: `${
                            totalPieVolume > 0
                              ? Math.round((totalIncome / totalPieVolume) * 100)
                              : 50
                          }%`,
                        }}
                      />
                      <div
                        className="h-full bg-amber-500 transition-all duration-500"
                        style={{
                          width: `${
                            totalPieVolume > 0
                              ? Math.round((totalExpenses / totalPieVolume) * 100)
                              : 50
                          }%`,
                        }}
                      />
                    </div>
                  </div>
                </div>
              )}

              {/* 2. INTERACTIVE VERTICAL GROUPED BAR CHART: CATEGORY-WISE INCOME VS. EXPENSE */}
              {(chartMode === "BOTH" || chartMode === "BAR") && (
                <div
                  className={`${
                    chartMode === "BOTH" ? "lg:col-span-7" : ""
                  } bg-white rounded-3xl p-5 sm:p-6 border border-slate-200 shadow-xs flex flex-col justify-between space-y-5`}
                >
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <span className="text-[10px] font-extrabold uppercase tracking-widest text-emerald-700">
                        CATEGORY PERFORMANCE
                      </span>
                      <h4 className="text-base sm:text-lg font-black text-slate-900">
                        Income vs. Farmer Procurement Cost Bar Chart
                      </h4>
                      <p className="text-xs text-slate-500">
                        Side-by-side comparison across all 5 produce categories
                      </p>
                    </div>

                    {/* Bar Chart Legend */}
                    <div className="flex items-center gap-4 text-xs font-bold bg-slate-50 px-3.5 py-2 rounded-2xl border border-slate-200">
                      <span className="flex items-center gap-1.5 text-[#14532D]">
                        <span className="w-3 h-3 rounded-xs bg-[#14532D] inline-block" />
                        Sales Income (रु)
                      </span>
                      <span className="flex items-center gap-1.5 text-amber-700">
                        <span className="w-3 h-3 rounded-xs bg-amber-500 inline-block" />
                        Farmer Expense (रु)
                      </span>
                    </div>
                  </div>

                  {/* Vertical Grouped Bar Chart Canvas */}
                  <div className="pt-6 pb-2 px-2 sm:px-4 bg-slate-50/70 rounded-2xl border border-slate-200/80">
                    <div className="grid grid-cols-5 gap-2 sm:gap-5 items-end h-56 pt-6 border-b border-slate-300 px-1 sm:px-3">
                      {categoryChartData.map((row) => {
                        const incHeightPct = Math.max(
                          row.income > 0 ? 8 : 2,
                          Math.round((row.income / maxBarValue) * 100)
                        );
                        const expHeightPct = Math.max(
                          row.expense > 0 ? 8 : 2,
                          Math.round((row.expense / maxBarValue) * 100)
                        );
                        return (
                          <div
                            key={row.category}
                            className="flex flex-col items-center justify-end h-full group"
                          >
                            <div className="flex items-end justify-center gap-1.5 sm:gap-2.5 w-full h-full">
                              {/* Income Bar */}
                              <div className="flex flex-col items-center justify-end h-full flex-1 max-w-[34px]">
                                <span className="text-[9px] sm:text-[10px] font-black text-[#14532D] mb-1 truncate">
                                  {row.income > 0 ? `रु${row.income.toLocaleString()}` : "0"}
                                </span>
                                <div
                                  className="w-full rounded-t-xl bg-gradient-to-t from-[#14532D] to-emerald-500 transition-all duration-500 shadow-2xs group-hover:brightness-110"
                                  style={{ height: `${incHeightPct}%` }}
                                  title={`${row.label} Income: रु ${row.income.toLocaleString()}`}
                                />
                              </div>

                              {/* Expense Bar */}
                              <div className="flex flex-col items-center justify-end h-full flex-1 max-w-[34px]">
                                <span className="text-[9px] sm:text-[10px] font-black text-amber-700 mb-1 truncate">
                                  {row.expense > 0 ? `रु${row.expense.toLocaleString()}` : "0"}
                                </span>
                                <div
                                  className="w-full rounded-t-xl bg-gradient-to-t from-amber-600 to-amber-400 transition-all duration-500 shadow-2xs group-hover:brightness-110"
                                  style={{ height: `${expHeightPct}%` }}
                                  title={`${row.label} Expense: रु ${row.expense.toLocaleString()}`}
                                />
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>

                    {/* X-Axis Category Labels */}
                    <div className="grid grid-cols-5 gap-2 sm:gap-5 pt-2.5 text-center">
                      {categoryChartData.map((row) => {
                        const catNet = row.income - row.expense;
                        return (
                          <div key={row.category} className="space-y-0.5">
                            <p className="text-[10px] sm:text-xs font-extrabold text-slate-800 truncate">
                              {row.label}
                            </p>
                            <p
                              className={`text-[9px] sm:text-[10px] font-bold ${
                                catNet >= 0 ? "text-emerald-700" : "text-amber-700"
                              }`}
                            >
                              {catNet >= 0 ? `+रु ${catNet.toLocaleString()}` : `-रु ${Math.abs(catNet).toLocaleString()}`}
                            </p>
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  {/* Order Status Distribution Mini Bar Strip */}
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 pt-1">
                    <div className="p-2.5 rounded-2xl bg-emerald-50/70 border border-emerald-200/70 text-center">
                      <p className="text-[10px] font-bold text-emerald-800 uppercase">Delivered</p>
                      <p className="text-base font-black text-[#14532D]">
                        {deliveredOrders.length} Orders
                      </p>
                    </div>
                    <div className="p-2.5 rounded-2xl bg-blue-50/70 border border-blue-200/70 text-center">
                      <p className="text-[10px] font-bold text-blue-800 uppercase">Confirmed</p>
                      <p className="text-base font-black text-blue-900">
                        {confirmedOrders.length} Orders
                      </p>
                    </div>
                    <div className="p-2.5 rounded-2xl bg-amber-50/70 border border-amber-200/70 text-center">
                      <p className="text-[10px] font-bold text-amber-800 uppercase">Pending</p>
                      <p className="text-base font-black text-amber-800">
                        {pendingOrdersList.length} Orders
                      </p>
                    </div>
                    <div className="p-2.5 rounded-2xl bg-red-50/70 border border-red-200/70 text-center">
                      <p className="text-[10px] font-bold text-red-700 uppercase">Cancelled</p>
                      <p className="text-base font-black text-red-700">
                        {cancelledOrdersList.length} Orders
                      </p>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* UNIFIED REAL-TIME INCOME & EXPENSE CASHFLOW LEDGER TABLE */}
            <div className="bg-white rounded-3xl border border-slate-200 shadow-xs overflow-hidden">
              <div className="p-4 sm:p-5 border-b border-slate-200 flex flex-wrap items-center justify-between gap-3 bg-slate-50/70">
                <div>
                  <h4 className="font-extrabold text-sm sm:text-base text-slate-900">
                    Unified Real-Time Income & Expense Cashflow Statement ({combinedLedger.length} Entries)
                  </h4>
                  <p className="text-xs text-slate-500">
                    Every customer order (+ Income) and farmer harvest purchase (− Expense) sorted chronologically
                  </p>
                </div>
                <span className="px-3 py-1 rounded-full bg-emerald-100 text-[#14532D] text-xs font-extrabold">
                  Net Balance: {netBalance >= 0 ? "+" : "-"} रु {Math.abs(netBalance).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </span>
              </div>

              {combinedLedger.length === 0 ? (
                <p className="p-8 text-center text-xs text-slate-400">
                  No financial transactions recorded in this timeframe yet.
                </p>
              ) : (
                <div className="overflow-x-auto max-h-96">
                  <table className="w-full text-left border-collapse text-xs">
                    <thead>
                      <tr className="bg-slate-100/90 text-slate-600 uppercase text-[10px] font-extrabold border-b border-slate-200">
                        <th className="py-3 px-4">Ref ID</th>
                        <th className="py-3 px-4">Date</th>
                        <th className="py-3 px-4">Type</th>
                        <th className="py-3 px-4">Buyer / Farmer</th>
                        <th className="py-3 px-4">Produce Batch</th>
                        <th className="py-3 px-4">Status / Note</th>
                        <th className="py-3 px-4 text-right">Amount (रु)</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {combinedLedger.slice(0, 30).map((row) => (
                        <tr key={row.uid} className="hover:bg-slate-50/80 transition">
                          <td className="py-3 px-4 font-black text-slate-700">{row.refId}</td>
                          <td className="py-3 px-4 text-slate-500">
                            {new Date(row.date || Date.now()).toLocaleDateString()}
                          </td>
                          <td className="py-3 px-4">
                            <span
                              className={`px-2 py-0.5 rounded-full text-[10px] font-black ${
                                row.type === "INCOME"
                                  ? "bg-emerald-100 text-[#14532D]"
                                  : "bg-amber-100 text-amber-900"
                              }`}
                            >
                              {row.type === "INCOME" ? "↑ INCOME" : "↓ EXPENSE"}
                            </span>
                          </td>
                          <td className="py-3 px-4 font-bold text-slate-800">{row.party}</td>
                          <td className="py-3 px-4 text-slate-600">{row.item}</td>
                          <td className="py-3 px-4">
                            <span className="font-semibold text-slate-700">{row.status}</span>
                            <span className="text-slate-400 ml-1">({row.note})</span>
                          </td>
                          <td
                            className={`py-3 px-4 text-right font-black text-sm ${
                              row.type === "INCOME" ? "text-[#14532D]" : "text-amber-700"
                            }`}
                          >
                            {row.type === "INCOME" ? "+" : "-"} रु{" "}
                            {row.amount.toLocaleString(undefined, {
                              minimumFractionDigits: 2,
                              maximumFractionDigits: 2,
                            })}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        );
      })()}

      {/* FACEBOOK MESSENGER / WHATSAPP DELETE MODAL (ADMIN SIDE) */}
      {/* STRICT PERMISSION: Admin can ONLY "Unsend for Everyone" messages sent by Admin! */}
      {adminChatActionMsg && (() => {
        const isSentByAdmin = Boolean(
          adminChatActionMsg.is_from_admin || adminChatActionMsg.is_admin_reply
        );
        const canUnsendForEveryone =
          isSentByAdmin &&
          !adminChatActionMsg.is_unsent &&
          adminChatActionMsg.message !== "🚫 This message was unsent";

        return (
          <div className="fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-xs flex items-center justify-center p-4">
            <div className="bg-white rounded-3xl max-w-sm w-full p-5 shadow-2xl border border-slate-200 space-y-4">
              <div className="flex items-center justify-between border-b border-slate-100 pb-2.5">
                <h4 className="font-extrabold text-sm text-slate-900">
                  {canUnsendForEveryone
                    ? "Who do you want to remove this message for?"
                    : "Remove message from your inbox?"}
                </h4>
                <button
                  type="button"
                  onClick={() => setAdminChatActionMsg(null)}
                  className="p-1 rounded-full hover:bg-slate-100 text-slate-400 cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="p-3 rounded-2xl bg-slate-50 border border-slate-200/80 text-xs text-slate-600 italic line-clamp-2">
                "{adminChatActionMsg.message}"
              </div>

              <div className="space-y-2">
                {/* ONLY shown if Admin sent this message themselves */}
                {canUnsendForEveryone && (
                  <button
                    type="button"
                    onClick={() => handleDeleteSingleMessage(adminChatActionMsg.id, "everyone")}
                    className="w-full p-3 rounded-2xl bg-red-50 hover:bg-red-100 border border-red-200 text-left flex items-start gap-3 transition cursor-pointer"
                  >
                    <div className="w-8 h-8 rounded-xl bg-red-600 text-white flex items-center justify-center shrink-0 mt-0.5">
                      <Trash2 className="w-4 h-4" />
                    </div>
                    <div>
                      <p className="font-extrabold text-xs text-red-900">
                        Unsend for Everyone
                      </p>
                      <p className="text-[11px] text-red-700 leading-snug">
                        Unsends your Admin reply for both you and{" "}
                        {selectedUser?.full_name || "the user"}.
                      </p>
                    </div>
                  </button>
                )}

                <button
                  type="button"
                  onClick={() => handleDeleteSingleMessage(adminChatActionMsg.id, "me")}
                  className="w-full p-3 rounded-2xl bg-slate-50 hover:bg-slate-100 border border-slate-200 text-left flex items-start gap-3 transition cursor-pointer"
                >
                  <div className="w-8 h-8 rounded-xl bg-slate-700 text-white flex items-center justify-center shrink-0 mt-0.5">
                    <Trash2 className="w-4 h-4" />
                  </div>
                  <div>
                    <p className="font-extrabold text-xs text-slate-900">
                      Delete for Me
                    </p>
                    <p className="text-[11px] text-slate-500 leading-snug">
                      Removes this message from your Admin inbox only.
                    </p>
                  </div>
                </button>
              </div>

              <button
                type="button"
                onClick={() => setAdminChatActionMsg(null)}
                className="w-full py-2.5 rounded-xl border border-slate-200 text-xs font-bold text-slate-600 hover:bg-slate-50 cursor-pointer"
              >
                Cancel
              </button>
            </div>
          </div>
        );
      })()}

      {/* COMPLETE "BUY FROM FARMER" PROCUREMENT MODAL */}
      {buyModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <form
            onSubmit={handleConfirmPurchase}
            className="bg-white rounded-3xl max-w-lg w-full p-6 space-y-4 shadow-2xl max-h-[90vh] overflow-y-auto"
          >
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div>
                <span className="text-xs font-bold text-emerald-700 uppercase">
                  Crop Procurement
                </span>
                <h3 className="text-xl font-extrabold text-slate-900">
                  Buy "{buyModal.vegetable_name}" from {buyModal.seller_name}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setBuyModal(null)}
                className="p-1.5 text-slate-400 hover:text-slate-700"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-3 bg-emerald-50 rounded-2xl text-xs space-y-1 text-emerald-950 border border-emerald-200">
              <p>
                Farmer Phone: <strong>{buyModal.contact_phone}</strong>
              </p>
              <p>
                Pickup Location: <strong>{buyModal.pickup_location}</strong>
              </p>
              <p>
                Offered Wholesale:{" "}
                <strong>
                  रु {buyModal.expected_price_per_unit} / {buyModal.unit}
                </strong>
              </p>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Purchased Quantity ({buyModal.unit}) *
                </label>
                <input
                  type="number"
                  required
                  value={procureForm.quantity}
                  onChange={(e) => setProcureForm({ ...procureForm, quantity: e.target.value })}
                  className="w-full px-3.5 py-2 border border-slate-200 rounded-xl text-sm"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Agreed Wholesale Rate (रु/{buyModal.unit}) *
                </label>
                <input
                  type="number"
                  required
                  value={procureForm.agreed_wholesale_rate}
                  onChange={(e) =>
                    setProcureForm({ ...procureForm, agreed_wholesale_rate: e.target.value })
                  }
                  className="w-full px-3.5 py-2 border border-slate-200 rounded-xl text-sm"
                />
              </div>
            </div>

            <div className="p-3.5 bg-slate-900 text-white rounded-2xl flex items-center justify-between">
              <span className="text-xs font-bold">Total Payout to Farmer:</span>
              <span className="text-xl font-black text-amber-400">
                रु{" "}
                {(
                  Number(procureForm.quantity || 0) *
                  Number(procureForm.agreed_wholesale_rate || 0)
                ).toLocaleString()}
              </span>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Payment Method
                </label>
                <select
                  value={procureForm.payment_method}
                  onChange={(e) =>
                    setProcureForm({ ...procureForm, payment_method: e.target.value })
                  }
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs bg-white"
                >
                  <option value="CASH">Cash on Pickup</option>
                  <option value="BANK">Direct Bank Transfer</option>
                  <option value="ESEWA">eSewa / Digital Wallet</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Payment Settlement
                </label>
                <select
                  value={procureForm.payment_status}
                  onChange={(e) =>
                    setProcureForm({ ...procureForm, payment_status: e.target.value })
                  }
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs bg-white"
                >
                  <option value="PAID">Settled / Paid</option>
                  <option value="PENDING">Pending upon physical pickup</option>
                </select>
              </div>
            </div>

            <div className="pt-2 border-t border-slate-100 space-y-2">
              <label className="flex items-center gap-2 cursor-pointer text-xs font-bold text-slate-800">
                <input
                  type="checkbox"
                  checked={procureForm.publish_to_store}
                  onChange={(e) =>
                    setProcureForm({ ...procureForm, publish_to_store: e.target.checked })
                  }
                  className="w-4 h-4 rounded text-emerald-700"
                />
                Publish this bought batch directly to Customer Store for sale
              </label>

              {procureForm.publish_to_store && (
                <div className="grid grid-cols-2 gap-2 pt-1">
                  <div>
                    <label className="block text-[11px] font-bold text-slate-600 mb-1">
                      Actual / Original Price (रु/{buyModal.unit})
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      value={procureForm.actual_price || ""}
                      onChange={(e) =>
                        setProcureForm({ ...procureForm, actual_price: e.target.value })
                      }
                      className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm bg-white"
                      placeholder="Original price"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-bold text-[#14532D] mb-1">
                      Selling Price / MRP (रु/{buyModal.unit}) *
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      value={procureForm.retail_price}
                      onChange={(e) =>
                        setProcureForm({ ...procureForm, retail_price: e.target.value })
                      }
                      className="w-full px-3 py-2 border border-emerald-300 rounded-xl text-sm font-bold bg-white"
                      placeholder="Selling price"
                    />
                  </div>
                </div>
              )}
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Admin Remarks & Notes for Farmer
              </label>
              <textarea
                rows={2}
                value={procureForm.admin_notes}
                onChange={(e) => setProcureForm({ ...procureForm, admin_notes: e.target.value })}
                className="w-full px-3.5 py-2 border border-slate-200 rounded-xl text-xs"
                placeholder="Pickup notes, driver phone, or invoice reference..."
              />
            </div>

            <div className="flex gap-2 pt-2">
              <button
                type="button"
                onClick={() => setBuyModal(null)}
                className="flex-1 py-2.5 rounded-xl border border-slate-200 text-xs font-bold text-slate-600 cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="flex-1 py-2.5 rounded-xl bg-[#14532D] hover:bg-[#1B4332] text-white text-xs font-bold cursor-pointer"
              >
                Confirm Purchase from Farmer
              </button>
            </div>
          </form>
        </div>
      )}

      {/* DECLINE MODAL */}
      {declineModal && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
          <form
            onSubmit={handleConfirmDecline}
            className="bg-white rounded-3xl max-w-md w-full p-6 space-y-4 shadow-2xl"
          >
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-extrabold text-slate-900">Decline Crop Offer</h3>
              <button
                type="button"
                onClick={() => setDeclineModal(null)}
                className="p-1 text-slate-400"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <p className="text-xs text-slate-600">
              Are you sure you want to decline <strong>{declineModal.vegetable_name}</strong> from{" "}
              {declineModal.seller_name}?
            </p>
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Reason for Farmer
              </label>
              <textarea
                rows={3}
                required
                value={declineRemarks}
                onChange={(e) => setDeclineRemarks(e.target.value)}
                className="w-full px-3.5 py-2 border border-slate-200 rounded-xl text-xs"
                placeholder="e.g. Storage currently full for this crop..."
              />
            </div>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setDeclineModal(null)}
                className="flex-1 py-2 rounded-xl border border-slate-200 text-xs font-bold text-slate-600 cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="flex-1 py-2 rounded-xl bg-red-600 text-white text-xs font-bold cursor-pointer"
              >
                Confirm Decline
              </button>
            </div>
          </form>
        </div>
      )}

      {/* EDIT STORE PRODUCT MODAL */}
      {/* EDIT STORE PRODUCT MODAL */}
      {editingProduct && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
          <form
            onSubmit={handleSaveProductEdit}
            className="bg-white rounded-3xl max-w-md w-full p-6 space-y-3.5 shadow-2xl max-h-[90vh] overflow-y-auto"
          >
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-extrabold text-slate-900">Edit Store Product</h3>
              <button
                type="button"
                onClick={() => setEditingProduct(null)}
                className="p-1 text-slate-400 hover:text-slate-700 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Product Name *</label>
              <input
                type="text"
                required
                value={editingProduct.name}
                onChange={(e) => setEditingProduct({ ...editingProduct, name: e.target.value })}
                className="w-full px-3.5 py-2 rounded-xl border border-slate-200 text-sm"
              />
            </div>

            {/* Category Selector inside Edit Store Product */}
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Select Category *
              </label>
              <select
                value={editingProduct.category || "VEGETABLES"}
                onChange={(e) =>
                  setEditingProduct({ ...editingProduct, category: e.target.value })
                }
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm bg-white font-semibold text-slate-800"
              >
                <option value="VEGETABLES">🥬 Fresh Vegetables</option>
                <option value="FRUITS">🍎 Hill & Mountain Fruits</option>
                <option value="GRAINS">🌾 Grains, Pulses & Cereals</option>
                <option value="SPICES">🌶️ Spices, Herbs & Aromatics</option>
                <option value="DAIRY">🍯 Organic Dairy, Oils & Honey</option>
              </select>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Actual / Original Price (रु)
                </label>
                <input
                  type="number"
                  step="0.01"
                  placeholder="Optional (before discount)"
                  value={editingProduct.actual_price || ""}
                  onChange={(e) =>
                    setEditingProduct({ ...editingProduct, actual_price: e.target.value })
                  }
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 text-sm bg-slate-50"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-[#14532D] mb-1">
                  Selling Price / MRP (रु) *
                </label>
                <input
                  type="number"
                  step="0.01"
                  required
                  value={editingProduct.price}
                  onChange={(e) =>
                    setEditingProduct({ ...editingProduct, price: e.target.value })
                  }
                  className="w-full px-3 py-2 rounded-xl border border-emerald-300 text-sm font-bold"
                />
              </div>
            </div>
            {Number(editingProduct.actual_price) > Number(editingProduct.price) &&
              Number(editingProduct.price) > 0 && (
                <div className="px-3 py-1.5 rounded-xl bg-emerald-50 border border-emerald-200 text-[11px] font-bold text-[#14532D] flex items-center justify-between">
                  <span>
                    Customer sees: रु {editingProduct.price}{" "}
                    <span className="line-through text-slate-400 ml-1">
                      रु {editingProduct.actual_price}
                    </span>
                  </span>
                  <span className="px-2 py-0.5 rounded-full bg-amber-400 text-slate-950 text-[10px] font-black">
                    SAVE{" "}
                    {Math.round(
                      ((Number(editingProduct.actual_price) - Number(editingProduct.price)) /
                        Number(editingProduct.actual_price)) *
                        100
                    )}
                    %
                  </span>
                </div>
              )}

            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Stock Qty *</label>
                <input
                  type="number"
                  required
                  value={editingProduct.stock_quantity}
                  onChange={(e) =>
                    setEditingProduct({ ...editingProduct, stock_quantity: e.target.value })
                  }
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 text-sm"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Unit *</label>
                <select
                  value={editingProduct.unit || "kg"}
                  onChange={(e) => setEditingProduct({ ...editingProduct, unit: e.target.value })}
                  className="w-full px-2.5 py-2 rounded-xl border border-slate-200 text-sm bg-white font-medium"
                >
                  <option value="kg">per kg</option>
                  <option value="g">per g</option>
                  <option value="bundle">per bundle</option>
                  <option value="crate">per crate</option>
                  <option value="quintal">per quintal</option>
                </select>
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
              <label className="block text-xs font-bold text-slate-700 mb-1">Description *</label>
              <textarea
                rows={3}
                required
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
                className="flex-1 py-2.5 rounded-xl bg-[#1B4332] hover:bg-[#2D6A4F] text-white text-xs font-bold cursor-pointer"
              >
                Save Changes
              </button>
            </div>
          </form>
        </div>
      )}
      {/* 1/4 A4 ORDER RECEIPT PREVIEW, PRINT & DOWNLOAD MODAL */}
      {/* 1/4 A4 ORDER RECEIPT PREVIEW, PRINT & DOWNLOAD MODAL (WITH DISCOUNT %) */}
      {receiptOrder && (() => {
        const subtotal = getTrueOrderSubtotal(receiptOrder);
        const discountPct = Math.min(100, Math.max(0, Number(receiptDiscount || 0)));
        const discountAmt = subtotal * (discountPct / 100);
        const finalPayable = (subtotal - discountAmt).toFixed(2);
        const orderForSlip = { ...receiptOrder, total_price: subtotal };
        const isEmailAlreadySent = Boolean(emailSentOrders[receiptOrder.id]);

        return (
          <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
            <div className="bg-white rounded-3xl max-w-md w-full p-6 space-y-3.5 shadow-2xl max-h-[92vh] overflow-y-auto">
              <div className="flex items-center justify-between border-b border-slate-100 pb-2.5">
                <div>
                  <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-700">
                    1/4 A4 Dispatch Slip (105mm × 148.5mm)
                  </span>
                  <h3 className="text-lg font-extrabold text-slate-900">
                    Order Receipt #KM-ORD-{receiptOrder.id}
                  </h3>
                </div>
                <button
                  type="button"
                  onClick={() => setReceiptOrder(null)}
                  className="p-1.5 text-slate-400 hover:text-slate-700 cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Admin Optional Discount Percentage (%) Input */}
              <div className="bg-amber-50/80 border border-amber-200 rounded-2xl p-3 flex items-center justify-between gap-3">
                <div>
                  <label className="block text-xs font-extrabold text-amber-950">
                    Add Discount (%)
                  </label>
                  <span className="text-[10px] text-amber-800">
                    Enter 0–100% (Deduction: रु {discountAmt.toFixed(2)})
                  </span>
                </div>
                <div className="flex items-center gap-1.5">
                  <input
                    type="number"
                    min="0"
                    max="100"
                    placeholder="0"
                    value={receiptDiscount}
                    onChange={(e) => setReceiptDiscount(e.target.value)}
                    className="w-20 px-3 py-1.5 rounded-xl border border-amber-300 bg-white text-right font-extrabold text-sm text-slate-900 outline-none focus:border-[#14532D]"
                  />
                  <span className="font-extrabold text-sm text-amber-950">%</span>
                </div>
              </div>

              {/* Visual 1/4 A4 Slip Preview */}
              <div className="border-2 border-[#14532D] border-r-dashed border-b-dashed rounded-2xl p-4 bg-[#FCFDFB] space-y-2.5 text-xs">
                <div className="text-center border-b border-[#14532D] pb-2">
                  <p className="font-black text-base text-[#14532D]">🌱 KRISHIMART NEPAL</p>
                  <p className="text-[11px] text-slate-500">
                    Dhangadhi Hub & Kathmandu Valley • +977-1-4423456
                  </p>
                  <span className="inline-block mt-1 px-2.5 py-0.5 rounded bg-emerald-100 text-[#14532D] text-[10px] font-extrabold">
                    OFFICIAL ORDER RECEIPT • {receiptOrder.status}
                  </span>
                </div>

                <div className="flex justify-between text-[11px] text-slate-600 border-b border-dashed border-slate-200 pb-2">
                  <span>
                    <strong>Receipt:</strong> #KM-ORD-{receiptOrder.id}
                  </span>
                  <span>
                    <strong>Date:</strong>{" "}
                    {new Date(receiptOrder.created_at).toLocaleDateString()}
                  </span>
                </div>

                <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-200 space-y-0.5">
                  <p>
                    <strong>Customer:</strong> {receiptOrder.buyer_name}
                  </p>
                  <p>
                    <strong>Phone:</strong> {receiptOrder.contact_phone}
                  </p>
                  <p>
                    <strong>Delivery Address:</strong> {receiptOrder.delivery_address}
                  </p>
                </div>

                <div className="border-t border-b border-slate-200 py-2 flex justify-between items-center">
                  <div>
                    <p className="font-extrabold text-sm text-slate-900">
                      {receiptOrder.product_name}
                    </p>
                    <p className="text-[11px] text-slate-500">
                      Quantity: {receiptOrder.quantity} {receiptOrder.product_unit}
                    </p>
                  </div>
                  <span className="font-bold text-sm text-slate-900">
                    रु {subtotal.toFixed(2)}
                  </span>
                </div>

                {/* Subtotal & Discount (%) Breakdown */}
                <div className="space-y-1 text-xs px-1">
                  <div className="flex justify-between text-slate-600">
                    <span>Subtotal Amount:</span>
                    <strong>रु {subtotal.toFixed(2)}</strong>
                  </div>
                  <div className="flex justify-between text-amber-700 font-bold">
                    <span>Discount ({discountPct}%):</span>
                    <span>- रु {discountAmt.toFixed(2)}</span>
                  </div>
                </div>

                <div className="bg-[#14532D] text-white p-3 rounded-xl flex justify-between items-center">
                  <span className="font-bold">TOTAL PAYABLE</span>
                  <span className="text-base font-black text-amber-300">
                    रु {Number(finalPayable).toLocaleString()}
                  </span>
                </div>

                <div className="pt-2 flex justify-between items-end text-[10px] text-slate-400">
                  <span>100% Nepal Origin Verified</span>
                  <span className="border-t border-slate-400 pt-0.5 text-slate-700 font-bold">
                    Authorized Stamp
                  </span>
                </div>
              </div>

              {/* Email (Sent Once Only), Print (1/4 A4) & Download (.PNG) Action Buttons */}
              <div className="space-y-2 pt-1">
                <button
                  type="button"
                  onClick={() => handleApplyDiscountAndEmail(receiptOrder, discountPct)}
                  className={`w-full py-2.5 px-4 rounded-xl font-bold text-xs flex items-center justify-center gap-1.5 shadow-sm transition cursor-pointer ${
                    isEmailAlreadySent
                      ? "bg-emerald-100 text-[#14532D] border border-emerald-300 hover:bg-emerald-200"
                      : "bg-emerald-700 hover:bg-emerald-800 text-white"
                  }`}
                >
                  {isEmailAlreadySent
                    ? `✓ Confirmation Email Sent (Save ${discountPct}% Discount)`
                    : `✉️ Apply ${discountPct}% Discount & Email Receipt to Customer`}
                </button>
                <div className="grid grid-cols-2 gap-2.5">
                  <button
                    type="button"
                    onClick={() => handlePrintQuarterA4(orderForSlip, discountPct)}
                    className="py-3 px-4 rounded-xl bg-[#14532D] hover:bg-[#1B4332] text-white font-bold text-xs flex items-center justify-center gap-1.5 shadow-md cursor-pointer"
                  >
                    🖨️ Print 1/4 A4 Slip
                  </button>
                  <button
                    type="button"
                    onClick={() => handleDownloadReceiptPNG(orderForSlip, discountPct)}
                    className="py-3 px-4 rounded-xl bg-amber-500 hover:bg-amber-600 text-slate-950 font-extrabold text-xs flex items-center justify-center gap-1.5 shadow-md cursor-pointer"
                  >
                    ⬇️ Download Receipt
                  </button>
                </div>
              </div>
            </div>
          </div>
        );
      })()}
    </div>
  );
}