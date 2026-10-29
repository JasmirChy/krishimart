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
} from "lucide-react";
import api, { BACKEND_URL } from "../api";

export default function AdminPanel() {
  const [subTab, setSubTab] = useState("users");
  const [users, setUsers] = useState([]);
  const [submissions, setSubmissions] = useState([]);
  const [purchases, setPurchases] = useState([]);
  const [products, setProducts] = useState([]);
  const [orders, setOrders] = useState([]);
  const [stories, setStories] = useState([]);
  const [toast, setToast] = useState(null);

  // User search & filter states
  const [userSearch, setUserSearch] = useState("");
  const [userFilter, setUserFilter] = useState("ALL");

  // Admin Chat state
  const [threads, setThreads] = useState([]);
  const [selectedUser, setSelectedUser] = useState(null);
  const [chatMessages, setChatMessages] = useState([]);
  const [replyText, setReplyText] = useState("");
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
  });

  // Decline Modal State
  const [declineModal, setDeclineModal] = useState(null);
  const [declineRemarks, setDeclineRemarks] = useState("");

  // Edit Product Modal state
  const [editingProduct, setEditingProduct] = useState(null);
  const [receiptOrder, setReceiptOrder] = useState(null);
  const [receiptDiscount, setReceiptDiscount] = useState(0);

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
      setSelectedUser((prev) => prev || (tRes.data.length > 0 ? tRes.data[0] : null));
    } catch (err) {
      console.error("Admin auto-sync error:", err);
    }
  };

  // Real-time auto-refresh every 3.5 seconds
  useEffect(() => {
    fetchAllAdminData();
    const interval = setInterval(fetchAllAdminData, 3500);
    return () => clearInterval(interval);
  }, []);

  // Poll chat messages for selected user
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
  }, [selectedUser?.id]);

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
      showToast(`Order #${orderId} marked as ${status}.`);
      fetchAllAdminData();
      if (status === "CONFIRMED") {
        const targetOrder = orders.find((o) => o.id === orderId) || res.data;
        setReceiptDiscount(0);
        setReceiptOrder({ ...targetOrder, status: "CONFIRMED" });
      }
    } catch {
      showToast("Could not update order status.", "error");
    }
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

  const handleClearChatThread = async () => {
    if (!selectedUser || chatMessages.length === 0) return;
    try {
      await api.delete(`/chat/messages/clear_thread/?user_id=${selectedUser.id}`);
      setChatMessages([]);
      showToast(`Cleared chat history with ${selectedUser.full_name}.`);
      fetchAllAdminData();
    } catch {
      showToast("Failed to clear chat history.", "error");
    }
  };

  const handleDeleteSingleMessage = async (msgId) => {
    try {
      await api.delete(`/chat/messages/${msgId}/`);
      setChatMessages((prev) => prev.filter((m) => m.id !== msgId));
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

      {/* Top Banner & Tab Navigation */}
      <div className="bg-gradient-to-r from-[#1B4332] to-[#2D6A4F] rounded-3xl p-5 sm:p-6 text-white shadow-lg flex flex-wrap items-center justify-between gap-4">
        <div>
          <span className="text-xs uppercase tracking-widest text-amber-300 font-bold">
            KrishiMart Control Center
          </span>
          <h2 className="text-xl sm:text-2xl font-extrabold mt-1">Admin Management Dashboard</h2>
          <p className="text-xs sm:text-sm text-emerald-100 flex items-center gap-1.5 mt-0.5">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" /> Live Real-Time
            Auto-Sync Active
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          {[
            { id: "users", label: "Users & Verification", icon: Users, badge: pendingUsersCount },
            {
              id: "submissions",
              label: "Farmer Offers",
              icon: Sprout,
              badge: pendingSubmissionsCount,
            },
            {
              id: "purchases",
              label: "Bought from Farmers",
              icon: Receipt,
              badge: purchases.filter((p) => p.payment_status === "PENDING").length,
            },
            {
              id: "stories",
              label: "Stories & Reviews",
              icon: BookOpen,
              badge: pendingStoriesCount,
            },
            { id: "products", label: "Store Inventory", icon: Package },
            {
              id: "orders",
              label: "Customer Orders",
              icon: ShoppingBag,
              badge: pendingOrdersCount,
            },
            {
              id: "chat",
              label: "Chat Inbox",
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

      {/* Top Financial & Procurement Analytics */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200 shadow-2xs">
          <span className="text-xs font-bold text-slate-400 uppercase">Customer Sales Revenue</span>
          <p className="text-2xl font-black text-[#1B4332] mt-1">
            रु{" "}
            {orders
              .filter((o) => o.status !== "CANCELLED")
              .reduce((sum, o) => sum + Number(o.total_price || 0), 0)
              .toLocaleString()}
          </p>
          <span className="text-[11px] text-emerald-700 font-semibold">
            {orders.filter((o) => o.status === "DELIVERED").length} delivered • {orders.length}{" "}
            total
          </span>
        </div>

        <div className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200 shadow-2xs">
          <span className="text-xs font-bold text-slate-400 uppercase">Paid to Farmers</span>
          <p className="text-2xl font-black text-amber-700 mt-1">
            रु {totalProcuredAmount.toLocaleString()}
          </p>
          <span className="text-[11px] text-slate-500 font-semibold">
            {purchases.length} batches bought
          </span>
        </div>

        <div className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200 shadow-2xs">
          <span className="text-xs font-bold text-slate-400 uppercase">Pending Farmer Offers</span>
          <p className="text-2xl font-black text-slate-900 mt-1">{pendingSubmissionsCount}</p>
          <span className="text-[11px] text-amber-700 font-semibold">awaiting purchase</span>
        </div>

        <div className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200 shadow-2xs">
          <span className="text-xs font-bold text-slate-400 uppercase">Community Reviews</span>
          <p className="text-2xl font-black text-slate-900 mt-1">{stories.length}</p>
          <span className="text-[11px] text-emerald-700 font-semibold">
            {pendingStoriesCount} pending approval
          </span>
        </div>
      </div>

      {/* 1. USERS & VERIFICATION TAB (WITH PROFILE PICTURES) */}
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
                    <div className="flex items-center gap-3">
                      <div className="w-12 h-12 rounded-full bg-emerald-800 text-white flex items-center justify-center font-bold overflow-hidden border-2 border-emerald-600/30 shrink-0 shadow-xs">
                        {u.profile_picture ? (
                          <img
                            src={
                              u.profile_picture.startsWith("http")
                                ? u.profile_picture
                                : `${BACKEND_URL}${u.profile_picture}`
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
      )}

      {/* 2. FARMER OFFERS TAB ("BUY FROM FARMER") */}
      {subTab === "submissions" && (
        <div className="grid md:grid-cols-2 gap-6">
          {submissions.length === 0 ? (
            <div className="col-span-2 bg-white p-12 rounded-2xl text-center text-slate-500 border border-slate-200">
              No farmer wholesale crop offers submitted yet.
            </div>
          ) : (
            submissions.map((sub) => (
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
                              sub.seller_avatar.startsWith("http")
                                ? sub.seller_avatar
                                : `${BACKEND_URL}${sub.seller_avatar}`
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
                      src={sub.image.startsWith("http") ? sub.image : `${BACKEND_URL}${sub.image}`}
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
      )}

      {/* 3. BOUGHT FROM FARMERS LEDGER TAB */}
      {subTab === "purchases" && (
        <div className="space-y-4">
          <div className="bg-white p-5 rounded-3xl border border-slate-200 flex flex-wrap items-center justify-between gap-4">
            <div>
              <h3 className="text-lg font-extrabold text-slate-900">
                Official Farmer Procurement Ledger ({purchases.length} Transactions)
              </h3>
              <p className="text-xs text-slate-500">
                Full breakdown of crops purchased from farmers, rates paid, and payment settlements.
              </p>
            </div>
            <div className="text-right">
              <span className="text-xs text-slate-400 font-bold uppercase block">
                Total Disbursed
              </span>
              <span className="text-2xl font-black text-[#14532D]">
                रु {totalProcuredAmount.toLocaleString()}
              </span>
            </div>
          </div>

          {purchases.length === 0 ? (
            <div className="bg-white rounded-3xl p-12 text-center text-slate-500 border border-slate-200">
              No crops bought from farmers yet. Click "Buy from Farmer" on any offer to procure.
            </div>
          ) : (
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {purchases.map((p) => (
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
                                p.farmer_avatar.startsWith("http")
                                  ? p.farmer_avatar
                                  : `${BACKEND_URL}${p.farmer_avatar}`
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
      )}

      {/* 4. STORIES & REVIEWS MODERATION TAB */}
      {subTab === "stories" && (
        <div className="space-y-4">
          <div className="bg-white p-5 rounded-3xl border border-slate-200 flex flex-wrap justify-between items-center gap-3">
            <div>
              <h3 className="text-lg font-extrabold text-slate-900">
                Farmer Stories & Buyer Reviews ({stories.length})
              </h3>
              <p className="text-xs text-slate-500">
                Approve genuine farmer stories and buyer reviews to publish them on the website.
              </p>
            </div>
            <span className="px-3 py-1 rounded-full text-xs font-bold bg-amber-100 text-amber-800">
              {pendingStoriesCount} Pending Moderation
            </span>
          </div>

          {stories.length === 0 ? (
            <div className="bg-white rounded-3xl p-12 text-center text-slate-500 border border-slate-200">
              No stories or buyer reviews submitted yet.
            </div>
          ) : (
            <div className="grid sm:grid-cols-2 gap-4">
              {stories.map((st) => (
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
                              st.author_avatar.startsWith("http")
                                ? st.author_avatar
                                : `${BACKEND_URL}${st.author_avatar}`
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
      )}

      {/* 5. STORE INVENTORY TAB */}
      {/* 5. STORE INVENTORY TAB */}
      {subTab === "products" && (
        <div className="grid lg:grid-cols-3 gap-6">
          <form
            onSubmit={handleAddProduct}
            className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200 space-y-3.5 h-fit"
          >
            <h3 className="text-lg font-bold text-slate-900">Add Product to Store</h3>

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

            <div className="grid grid-cols-3 gap-2">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Price (रु) *</label>
                <input
                  type="number"
                  required
                  placeholder="e.g. 65"
                  value={newProduct.price}
                  onChange={(e) => setNewProduct({ ...newProduct, price: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 text-sm"
                />
              </div>
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
                    title="Edit Category, Price or Stock"
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

      {/* 6. CUSTOMER ORDERS TAB */}
      {subTab === "orders" && (
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 divide-y divide-slate-100">
          <div className="p-4 bg-slate-50 flex justify-between items-center">
            <h3 className="font-bold text-sm text-slate-900">
              Live Customer Orders ({orders.length})
            </h3>
            <span className="text-xs text-emerald-700 font-semibold flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" /> Auto-syncing
            </span>
          </div>
          {orders.length === 0 ? (
            <p className="p-8 text-center text-slate-500">No customer orders placed yet.</p>
          ) : (
            orders.map((o) => (
              <div
                key={o.id}
                className="p-4 flex flex-wrap items-center justify-between gap-4 hover:bg-slate-50"
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
                      onClick={() => setReceiptOrder(o)}
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
            ))
          )}
        </div>
      )}

      {/* 7. LIVE CHAT INBOX TAB */}
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
                  className={`w-full text-left p-3 hover:bg-emerald-50/60 transition flex items-center justify-between gap-2.5 cursor-pointer ${
                    selectedUser?.id === u.id
                      ? "bg-emerald-50 border-l-4 border-l-[#1B4332]"
                      : ""
                  }`}
                >
                  <div className="flex items-center gap-2.5 truncate">
                    <div className="w-9 h-9 rounded-full bg-emerald-800 text-white flex items-center justify-center font-bold text-xs overflow-hidden shrink-0">
                      {u.profile_picture ? (
                        <img
                          src={
                            u.profile_picture.startsWith("http")
                              ? u.profile_picture
                              : `${BACKEND_URL}${u.profile_picture}`
                          }
                          alt={u.full_name}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <span>{u.full_name?.charAt(0).toUpperCase()}</span>
                      )}
                    </div>
                    <div className="truncate leading-tight">
                      <p className="font-bold text-xs sm:text-sm text-slate-900 truncate">
                        {u.full_name}
                      </p>
                      <p className="text-[11px] text-slate-500 truncate">
                        {u.role} • {u.location || u.phone_number || u.email}
                      </p>
                    </div>
                  </div>
                  {u.unread_count > 0 && (
                    <span className="px-2 py-0.5 rounded-full bg-red-500 text-white text-[10px] font-extrabold shrink-0">
                      {u.unread_count}
                    </span>
                  )}
                </button>
              ))}
            </div>
          </div>

          <div className="md:col-span-2 flex flex-col h-[500px] md:h-[560px] min-h-0">
            {selectedUser ? (
              <>
                <div className="p-3.5 border-b border-slate-200 bg-slate-50 flex items-center justify-between shrink-0">
                  <div className="flex items-center gap-2.5">
                    <div className="w-9 h-9 rounded-full bg-emerald-800 text-white flex items-center justify-center font-bold text-xs overflow-hidden shrink-0">
                      {selectedUser.profile_picture ? (
                        <img
                          src={
                            selectedUser.profile_picture.startsWith("http")
                              ? selectedUser.profile_picture
                              : `${BACKEND_URL}${selectedUser.profile_picture}`
                          }
                          alt={selectedUser.full_name}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <span>{selectedUser.full_name?.charAt(0).toUpperCase()}</span>
                      )}
                    </div>
                    <div>
                      <p className="font-bold text-sm text-slate-900">{selectedUser.full_name}</p>
                      <p className="text-[11px] text-slate-500">
                        {selectedUser.role} • {selectedUser.location || "No location set"}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs px-2.5 py-1 rounded-full bg-emerald-100 text-emerald-800 font-semibold">
                      {chatMessages.length} messages
                    </span>
                    {chatMessages.length > 0 && (
                      <button
                        type="button"
                        onClick={handleClearChatThread}
                        className="px-2.5 py-1 rounded-xl bg-red-50 hover:bg-red-100 text-red-700 text-xs font-bold flex items-center gap-1 transition cursor-pointer"
                        title="Clear Entire Conversation"
                      >
                        <Trash2 className="w-3.5 h-3.5" /> Clear Chat
                      </button>
                    )}
                  </div>
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
                          <span className="flex items-center justify-between gap-3 text-[10px] opacity-75 mt-1">
                              <span>
                                {m.is_from_admin
                                  ? "KrishiMart Admin (You)"
                                  : m.conversation_user_name}{" "}
                                •{" "}
                                {new Date(m.created_at).toLocaleTimeString([], {
                                  hour: "2-digit",
                                  minute: "2-digit",
                                })}
                              </span>
                              <button
                                type="button"
                                onClick={() => handleDeleteSingleMessage(m.id)}
                                className="hover:text-red-400 cursor-pointer"
                                title="Delete this message"
                              >
                                <Trash2 className="w-3 h-3" />
                              </button>
                            </span>
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
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Customer Retail Selling Price (रु/{buyModal.unit})
                  </label>
                  <input
                    type="number"
                    value={procureForm.retail_price}
                    onChange={(e) =>
                      setProcureForm({ ...procureForm, retail_price: e.target.value })
                    }
                    className="w-full px-3.5 py-2 border border-slate-200 rounded-xl text-sm"
                    placeholder="Enter retail price"
                  />
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

            <div className="grid grid-cols-3 gap-2">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Price (रु) *</label>
                <input
                  type="number"
                  required
                  value={editingProduct.price}
                  onChange={(e) =>
                    setEditingProduct({ ...editingProduct, price: e.target.value })
                  }
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 text-sm"
                />
              </div>
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
        const subtotal = Number(receiptOrder.total_price || 0);
        const discountPct = Math.min(100, Math.max(0, Number(receiptDiscount || 0)));
        const discountAmt = subtotal * (discountPct / 100);
        const finalPayable = (subtotal - discountAmt).toFixed(2);

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

              {/* Print (1/4 A4) & Download (.PNG) Action Buttons */}
              <div className="grid grid-cols-2 gap-2.5 pt-1">
                <button
                  type="button"
                  onClick={() => handlePrintQuarterA4(receiptOrder, discountPct)}
                  className="py-3 px-4 rounded-xl bg-[#14532D] hover:bg-[#1B4332] text-white font-bold text-xs flex items-center justify-center gap-1.5 shadow-md cursor-pointer"
                >
                  🖨️ Print 1/4 A4 Slip
                </button>
                <button
                  type="button"
                  onClick={() => handleDownloadReceiptPNG(receiptOrder, discountPct)}
                  className="py-3 px-4 rounded-xl bg-amber-500 hover:bg-amber-600 text-slate-950 font-extrabold text-xs flex items-center justify-center gap-1.5 shadow-md cursor-pointer"
                >
                  ⬇️ Download Receipt
                </button>
              </div>
            </div>
          </div>
        );
      })()}
    </div>
  );
}