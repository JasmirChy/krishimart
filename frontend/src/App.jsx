import React, { useState, useEffect, useRef } from "react";
import {
  Sprout,
  ShoppingBag,
  MessageCircle,
  ShieldAlert,
  CheckCircle2,
  LogOut,
  MapPin,
  Phone,
  Send,
  RefreshCw,
  LayoutDashboard,
  Search,
  ShieldCheck,
  Scale,
  ArrowRight,
  User,
  TrendingUp,
  X,
  Plus,
  Minus,
  PackageCheck,
  Home,
  Eye,
  Trash2,
} from "lucide-react";
import api, { BACKEND_URL } from "./api";
import AuthView from "./components/AuthView";
import AdminPanel from "./components/AdminPanel";

const CATEGORIES_SHOWCASE = [
  {
    id: "VEGETABLES",
    title: "Fresh Vegetables",
    subtitle: "Leafy greens, roots, gourds",
    badge: "140+ Items",
    image:
      "https://images.unsplash.com/photo-1540420773420-3366772f4999?auto=format&fit=crop&w=600&q=80",
  },
  {
    id: "FRUITS",
    title: "Hill & Mountain Fruits",
    subtitle: "Marpha apples, citrus, kiwi",
    badge: "Seasonal Pick",
    image:
      "https://images.unsplash.com/photo-1619566636858-adf3ef46400b?auto=format&fit=crop&w=600&q=80",
  },
  {
    id: "GRAINS",
    title: "Grains & Cereals",
    subtitle: "Marsi, Basmati, Millet, Barley",
    badge: "Indigenous",
    image:
      "https://images.unsplash.com/photo-1586201375761-83865001e31c?auto=format&fit=crop&w=600&q=80",
  },
  {
    id: "GRAINS",
    title: "Pulses & Legumes",
    subtitle: "Mustang dal, black beans, peas",
    badge: "High Protein",
    image:
      "https://images.unsplash.com/photo-1515543904379-3d757afe72e4?auto=format&fit=crop&w=600&q=80",
  },
  {
    id: "SPICES",
    title: "Spices & Aromatics",
    subtitle: "Timur, Ilam cardamom, ginger",
    badge: "Export Grade",
    image:
      "https://images.unsplash.com/photo-1596040033229-a9821ebd058d?auto=format&fit=crop&w=600&q=80",
  },
  {
    id: "VEGETABLES",
    title: "Seeds & Seedlings",
    subtitle: "Heirloom seeds, bio-saplings",
    badge: "Germination 95%",
    image:
      "https://images.unsplash.com/photo-1416879595882-3373a0480b5b?auto=format&fit=crop&w=600&q=80",
  },
  {
    id: "VEGETABLES",
    title: "100% Organic Produce",
    subtitle: "Zero chemical pesticide guaranteed",
    badge: "Lab Certified",
    image:
      "https://images.unsplash.com/photo-1542838132-92c53300491e?auto=format&fit=crop&w=600&q=80",
  },
  {
    id: "DAIRY",
    title: "Dairy & Forest Honey",
    subtitle: "Pure Forest Honey, Ghee, Mustard Oil",
    badge: "Pure Himalayan",
    image:
      "https://images.unsplash.com/photo-1587049352847-4a222e784d38?auto=format&fit=crop&w=600&q=80",
  },
];

function getProductImage(product) {
  if (product.image) {
    return product.image.startsWith("http")
      ? product.image
      : `${BACKEND_URL}${product.image}`;
  }
  const name = (product.name || "").toLowerCase();
  if (name.includes("tomato"))
    return "https://images.unsplash.com/photo-1592924357228-91a4daadcfea?auto=format&fit=crop&w=700&q=80";
  if (name.includes("apple"))
    return "https://images.unsplash.com/photo-1560806887-1e4cd0b6cbd6?auto=format&fit=crop&w=700&q=80";
  if (name.includes("potato"))
    return "https://images.unsplash.com/photo-1518977676601-b53f82aba655?auto=format&fit=crop&w=700&q=80";
  if (name.includes("rice") || name.includes("marsi"))
    return "https://images.unsplash.com/photo-1536304993881-ff6e9eefa2a6?auto=format&fit=crop&w=700&q=80";
  if (name.includes("chili") || name.includes("akabare"))
    return "https://images.unsplash.com/photo-1588252303782-cb80119abd6d?auto=format&fit=crop&w=700&q=80";
  if (name.includes("oil") || name.includes("mustard"))
    return "https://images.unsplash.com/photo-1474979266404-7eaacbcd87c5?auto=format&fit=crop&w=700&q=80";
  return "https://images.unsplash.com/photo-1540420773420-3366772f4999?auto=format&fit=crop&w=700&q=80";
}

export default function App() {
  const [user, setUser] = useState(null);
  const [checkingAuth, setCheckingAuth] = useState(true);
  const [activeTab, setActiveTab] = useState(() =>
    window.location.pathname.toLowerCase().startsWith("/admin") ? "admin" : "home"
  );
  const [toast, setToast] = useState(null);

  // Database Products, Orders & Filters
  const [dbProducts, setDbProducts] = useState([]);
  const [myOrders, setMyOrders] = useState([]);
  const [selectedCategory, setSelectedCategory] = useState("ALL");
  const [selectedDistrict, setSelectedDistrict] = useState("ALL");
  const [searchQuery, setSearchQuery] = useState("");

  // Product Quick-View Modal
  const [quickViewProduct, setQuickViewProduct] = useState(null);
  const [quickViewQty, setQuickViewQty] = useState(1);

  // Interactive Basket Drawer
  const [basket, setBasket] = useState([]);
  const [basketDrawerOpen, setBasketDrawerOpen] = useState(false);
  const [checkoutAddress, setCheckoutAddress] = useState("");
  const [checkoutPhone, setCheckoutPhone] = useState("");
  const [checkingOut, setCheckingOut] = useState(false);

  // User Profile Edit Modal
  const [profileModalOpen, setProfileModalOpen] = useState(false);
  const [profileForm, setProfileForm] = useState({
    full_name: "",
    phone_number: "",
    location: "",
  });

  // "Sell Your Products" Form, Photo Preview & History
  const [mySubmissions, setMySubmissions] = useState([]);
  const [sellImagePreview, setSellImagePreview] = useState(null);
  const [sellForm, setSellForm] = useState({
    vegetable_name: "",
    category: "Fresh Vegetables",
    vegetable_description: "",
    quantity: "",
    unit: "kg",
    expected_price_per_unit: "",
    contact_phone: "",
    pickup_location: "",
    image: null,
  });

  // Live Chat with Admin + Unread Counter + Auto-Scroll Refs
  const [messages, setMessages] = useState([]);
  const [unreadChatCount, setUnreadChatCount] = useState(0);
  const [chatInput, setChatInput] = useState("");
  const [chatDrawerOpen, setChatDrawerOpen] = useState(false);
  const chatTabScrollRef = useRef(null);
  const chatDrawerScrollRef = useRef(null);

  const showToast = (message, type = "success") => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3500);
  };

  const fetchCurrentUser = async () => {
    const token = localStorage.getItem("krishimart_access");
    if (!token) {
      setCheckingAuth(false);
      return;
    }
    try {
      const res = await api.get("/accounts/me/");
      setUser(res.data);
      setCheckoutAddress(res.data.location || "");
      setCheckoutPhone(res.data.phone_number || "");
      setProfileForm({
        full_name: res.data.full_name || "",
        phone_number: res.data.phone_number || "",
        location: res.data.location || "",
      });
      setSellForm((prev) => ({
        ...prev,
        contact_phone: res.data.phone_number || "",
        pickup_location: res.data.location || "",
      }));
    } catch {
      localStorage.removeItem("krishimart_access");
      localStorage.removeItem("krishimart_refresh");
      setUser(null);
    } finally {
      setCheckingAuth(false);
    }
  };

  useEffect(() => {
    fetchCurrentUser();
  }, []);

  const isVerifiedOrAdmin =
    user && (user.is_admin_verified || user.is_staff || user.role === "ADMIN");

  const loadMarketplaceData = async () => {
    if (!isVerifiedOrAdmin) return;
    try {
      const [prodRes, subRes, ordRes, unreadRes] = await Promise.all([
        api.get("/marketplace/products/"),
        api.get("/marketplace/sell-submissions/"),
        api.get("/marketplace/orders/"),
        api.get("/chat/messages/unread_count/"),
      ]);
      setDbProducts(prodRes.data);
      setMySubmissions(subRes.data);
      setMyOrders(ordRes.data);
      setUnreadChatCount(unreadRes.data.unread_count || 0);
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    loadMarketplaceData();
  }, [user, activeTab]);

  // Poll unread chat count in background
  useEffect(() => {
    if (!isVerifiedOrAdmin) return;
    const pollUnread = async () => {
      try {
        const res = await api.get("/chat/messages/unread_count/");
        setUnreadChatCount(res.data.unread_count || 0);
      } catch {
        // Ignore background poll error
      }
    };
    const timer = setInterval(pollUnread, 5000);
    return () => clearInterval(timer);
  }, [user]);

  // Poll chat messages when drawer or chat tab is open
  useEffect(() => {
    if (!isVerifiedOrAdmin || (!chatDrawerOpen && activeTab !== "chat")) return;
    const fetchChat = async () => {
      try {
        const res = await api.get("/chat/messages/");
        setMessages(res.data);
        setUnreadChatCount(0);
      } catch (err) {
        console.error(err);
      }
    };
    fetchChat();
    const timer = setInterval(fetchChat, 3000);
    return () => clearInterval(timer);
  }, [user, chatDrawerOpen, activeTab]);

  // Auto-scroll chat containers when new messages arrive
  useEffect(() => {
    if (chatTabScrollRef.current) {
      chatTabScrollRef.current.scrollTop = chatTabScrollRef.current.scrollHeight;
    }
    if (chatDrawerScrollRef.current) {
      chatDrawerScrollRef.current.scrollTop = chatDrawerScrollRef.current.scrollHeight;
    }
  }, [messages.length, chatDrawerOpen, activeTab]);

  const handleLogout = () => {
    localStorage.removeItem("krishimart_access");
    localStorage.removeItem("krishimart_refresh");
    setUser(null);
  };

  const handleAddToBasket = (product, qtyToAdd = 1) => {
    setBasket((prev) => {
      const existing = prev.find((item) => item.id === product.id);
      if (existing) {
        return prev.map((item) =>
          item.id === product.id ? { ...item, qty: item.qty + qtyToAdd } : item
        );
      }
      return [...prev, { ...product, qty: qtyToAdd }];
    });
    showToast(`Added ${qtyToAdd} ${product.unit} of ${product.name} to basket!`);
    setBasketDrawerOpen(true);
  };

  const handleUpdateBasketQty = (productId, delta) => {
    setBasket((prev) =>
      prev
        .map((item) =>
          item.id === productId ? { ...item, qty: Math.max(0, item.qty + delta) } : item
        )
        .filter((item) => item.qty > 0)
    );
  };

  const handleCheckoutBasket = async (e) => {
    e.preventDefault();
    if (basket.length === 0) return;
    if (!checkoutPhone.trim() || !checkoutAddress.trim()) {
      showToast("Please enter your contact phone number and delivery address.", "error");
      return;
    }
    setCheckingOut(true);
    try {
      for (const item of basket) {
        await api.post("/marketplace/orders/", {
          product: item.id,
          quantity: item.qty,
          delivery_address: checkoutAddress.trim(),
          contact_phone: checkoutPhone.trim(),
        });
      }
      setBasket([]);
      setBasketDrawerOpen(false);
      await loadMarketplaceData();
      showToast("Order confirmed! Track your delivery status below.");
      setActiveTab("orders");
    } catch {
      showToast("Failed to place order. Please check your connection.", "error");
    } finally {
      setCheckingOut(false);
    }
  };

  const handleCancelOrder = async (orderId) => {
    try {
      await api.patch(`/marketplace/orders/${orderId}/`, { status: "CANCELLED" });
      showToast(`Order #${orderId} has been cancelled.`);
      loadMarketplaceData();
    } catch {
      showToast("Could not cancel order.", "error");
    }
  };

  const handleUpdateProfile = async (e) => {
    e.preventDefault();
    try {
      const res = await api.patch("/accounts/me/", profileForm);
      setUser(res.data);
      setCheckoutAddress(res.data.location || "");
      setCheckoutPhone(res.data.phone_number || "");
      setProfileModalOpen(false);
      showToast("Your profile details have been saved!");
    } catch {
      showToast("Could not update profile. Check phone format (10-15 digits).", "error");
    }
  };

  const handleSelectSellImage = (e) => {
    const file = e.target.files?.[0];
    if (file) {
      setSellForm({ ...sellForm, image: file });
      setSellImagePreview(URL.createObjectURL(file));
    }
  };

  const handleSellSubmit = async (e) => {
    e.preventDefault();
    try {
      const formData = new FormData();
      Object.entries(sellForm).forEach(([k, v]) => {
        if (v !== null && v !== "") formData.append(k, v);
      });
      await api.post("/marketplace/sell-submissions/", formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      showToast("Harvest batch submitted to Admin! Check your status on the right.");
      setSellImagePreview(null);
      setSellForm({
        vegetable_name: "",
        category: "Fresh Vegetables",
        vegetable_description: "",
        quantity: "",
        unit: "kg",
        expected_price_per_unit: "",
        contact_phone: user?.phone_number || "",
        pickup_location: user?.location || "",
        image: null,
      });
      loadMarketplaceData();
    } catch {
      showToast("Please check all required fields and valid numbers.", "error");
    }
  };

  const handleDeleteSubmission = async (subId, name) => {
    try {
      await api.delete(`/marketplace/sell-submissions/${subId}/`);
      showToast(`Withdrew "${name}" offer.`);
      loadMarketplaceData();
    } catch {
      showToast("Could not withdraw offer.", "error");
    }
  };

  const handleSendUserMessage = async (e) => {
    e.preventDefault();
    if (!chatInput.trim()) return;
    try {
      await api.post("/chat/messages/", { message: chatInput.trim() });
      setChatInput("");
      const res = await api.get("/chat/messages/");
      setMessages(res.data);
    } catch {
      showToast("Failed to send message.", "error");
    }
  };

  if (checkingAuth) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#F8FAF7] text-[#14532D] font-bold">
        Loading KrishiMart...
      </div>
    );
  }

  if (!user) {
    return (
      <AuthView
        onAuthSuccess={(u) => {
          setUser(u);
          if (
            window.location.pathname.toLowerCase().startsWith("/admin") ||
            u.is_staff ||
            u.role === "ADMIN"
          ) {
            setActiveTab("admin");
          }
        }}
      />
    );
  }

  const filteredProducts = dbProducts.filter((p) => {
    const matchesCat = selectedCategory === "ALL" || p.category === selectedCategory;
    const matchesDistrict =
      selectedDistrict === "ALL" ||
      (p.origin_location &&
        p.origin_location.toLowerCase().includes(selectedDistrict.toLowerCase()));
    const matchesSearch =
      p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (p.origin_location && p.origin_location.toLowerCase().includes(searchQuery.toLowerCase()));
    return matchesCat && matchesDistrict && matchesSearch;
  });

  const basketTotal = basket.reduce((sum, item) => sum + Number(item.price) * item.qty, 0);
  const totalBasketItems = basket.reduce((sum, item) => sum + item.qty, 0);

  return (
    <div className="min-h-screen bg-[#F6F8F5] text-slate-900 flex flex-col font-sans pb-20 md:pb-0 relative">
      {/* FLOATING TOAST NOTIFICATION */}
      {toast && (
        <div
          className={`fixed top-20 right-4 z-50 px-5 py-3 rounded-2xl shadow-xl text-xs sm:text-sm font-bold flex items-center gap-2 transition ${
            toast.type === "error" ? "bg-red-600 text-white" : "bg-[#14532D] text-white"
          }`}
        >
          <CheckCircle2 className="w-4 h-4 text-amber-400 shrink-0" />
          <span>{toast.message}</span>
        </div>
      )}

      {/* 1. TOP DARK GREEN UTILITY BAR */}
      <div className="bg-[#0F3822] text-emerald-100 text-[11px] sm:text-xs py-1.5 sm:py-2 px-3 sm:px-8 border-b border-emerald-900">
        <div className="max-w-7xl mx-auto flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-3 sm:gap-4">
            <span className="flex items-center gap-1 font-medium">
              <Phone className="w-3 h-3 sm:w-3.5 sm:h-3.5 text-amber-400" /> +977-1-4423456
            </span>
            <span className="hidden md:inline-flex items-center gap-1.5 text-emerald-200">
              • <TrendingUp className="w-3.5 h-3.5 text-amber-400" /> Kalimati Mandi Live Rate:
              Tomato रु 65/kg Today
            </span>
          </div>
          <div className="flex items-center gap-2 sm:gap-4">
            <span className="bg-emerald-900/80 px-2 py-0.5 rounded text-[10px] font-semibold text-amber-300">
              EN / नेपाली
            </span>
            <span className="flex items-center gap-1 font-medium truncate max-w-[160px] sm:max-w-none">
              <MapPin className="w-3 h-3 sm:w-3.5 sm:h-3.5 text-amber-400 shrink-0" />{" "}
              {user.location || "Dhangadhi & Kathmandu"}
            </span>
          </div>
        </div>
      </div>

      {/* 2. MAIN BRAND & SEARCH HEADER */}
      <header className="sticky top-0 z-30 bg-white border-b border-slate-200/80 shadow-xs">
        <div className="max-w-7xl mx-auto px-3 sm:px-8 py-2.5 sm:py-3.5 flex items-center justify-between gap-2 sm:gap-4">
          <div
            onClick={() => setActiveTab("home")}
            className="flex items-center gap-2 cursor-pointer shrink-0"
          >
            <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-[#14532D] flex items-center justify-center text-amber-400 shadow-sm">
              <Sprout className="w-5 h-5 sm:w-6 sm:h-6" />
            </div>
            <div>
              <span className="text-lg sm:text-xl font-extrabold text-[#112A1E] tracking-tight block leading-none">
                KrishiMart
              </span>
              <span className="hidden xs:block text-[10px] text-slate-500 font-medium">
                Empowering Farmers, Fresh Produce
              </span>
            </div>
          </div>

          {isVerifiedOrAdmin && (
            <div className="hidden lg:flex items-center flex-1 max-w-xl bg-slate-100/90 border border-slate-200 rounded-full px-2 py-1 focus-within:border-[#14532D] focus-within:bg-white transition">
              <span className="px-3 py-1 text-xs font-bold text-slate-600 border-r border-slate-200">
                All ▾
              </span>
              <input
                type="text"
                placeholder="Search organic spinach, Jumla Marsi rice, seeds..."
                value={searchQuery}
                onChange={(e) => {
                  setSearchQuery(e.target.value);
                  if (activeTab !== "home" && activeTab !== "marketplace") {
                    setActiveTab("home");
                  }
                }}
                className="flex-1 px-3 py-1.5 text-xs bg-transparent outline-none text-slate-800"
              />
              <button
                onClick={() => {
                  setActiveTab("home");
                  document
                    .getElementById("fresh-harvests")
                    ?.scrollIntoView({ behavior: "smooth" });
                }}
                className="w-8 h-8 rounded-full bg-[#14532D] text-white flex items-center justify-center hover:bg-[#1B4332] cursor-pointer"
              >
                <Search className="w-4 h-4" />
              </button>
            </div>
          )}

          {/* Right User Controls */}
          <div className="flex items-center gap-1.5 sm:gap-3">
            {isVerifiedOrAdmin && (
              <>
                <button
                  onClick={() => setChatDrawerOpen(true)}
                  className="relative p-2 sm:p-2.5 rounded-full bg-slate-100 hover:bg-emerald-50 text-slate-700 cursor-pointer"
                  title="Live Chat with Admin"
                >
                  <MessageCircle className="w-4 h-4 text-[#14532D]" />
                  {unreadChatCount > 0 ? (
                    <span className="absolute -top-1 -right-1 px-1.5 py-0.2 rounded-full bg-red-600 text-white text-[10px] font-extrabold">
                      {unreadChatCount}
                    </span>
                  ) : (
                    <span className="absolute -top-0.5 -right-0.5 w-2.5 h-2.5 rounded-full bg-emerald-500 ring-2 ring-white" />
                  )}
                </button>

                <button
                  onClick={() => setBasketDrawerOpen(true)}
                  className="relative p-2 sm:p-2.5 rounded-full bg-slate-100 hover:bg-amber-50 text-slate-700 cursor-pointer"
                  title="Open Your Basket"
                >
                  <ShoppingBag className="w-4 h-4 text-[#14532D]" />
                  <span className="absolute -top-1 -right-1 px-1.5 py-0.2 rounded-full bg-amber-500 text-slate-950 text-[10px] font-extrabold">
                    {totalBasketItems}
                  </span>
                </button>
              </>
            )}

            <button
              onClick={() => setProfileModalOpen(true)}
              className="flex items-center gap-2 bg-slate-50 hover:bg-slate-100 border border-slate-200/80 rounded-full p-1 sm:pl-2 sm:pr-3 sm:py-1 text-left transition cursor-pointer"
              title="Tap to Edit Profile"
            >
              <div className="w-7 h-7 rounded-full bg-emerald-800 text-white flex items-center justify-center text-xs font-bold shrink-0">
                {user.full_name?.charAt(0).toUpperCase()}
              </div>
              <div className="hidden sm:block leading-tight">
                <p className="text-xs font-bold text-slate-900 truncate max-w-[110px]">
                  {user.full_name}
                </p>
                <p className="text-[10px] text-emerald-700 font-semibold flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                  {isVerifiedOrAdmin ? `Verified ${user.role}` : "Pending"}
                </p>
              </div>
            </button>

            {isVerifiedOrAdmin && (
              <button
                onClick={() => setActiveTab("sell")}
                className="hidden md:flex px-4 py-2.5 rounded-full bg-[#14532D] hover:bg-[#1B4332] text-white text-xs font-bold items-center gap-1.5 shadow-sm transition cursor-pointer"
              >
                <Plus className="w-4 h-4 text-amber-400" /> Sell Harvest
              </button>
            )}

            <button
              onClick={handleLogout}
              className="p-2 text-slate-400 hover:text-red-600 rounded-full hover:bg-red-50 transition cursor-pointer"
              title="Log Out"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Mobile Search Bar */}
        {isVerifiedOrAdmin && (
          <div className="lg:hidden px-3 pb-2.5">
            <div className="flex items-center bg-slate-100 border border-slate-200 rounded-full px-3 py-1.5">
              <Search className="w-4 h-4 text-slate-400 mr-2 shrink-0" />
              <input
                type="text"
                placeholder="Search vegetables, Fruits, Grains..."
                value={searchQuery}
                onChange={(e) => {
                  setSearchQuery(e.target.value);
                  if (activeTab !== "home" && activeTab !== "marketplace") {
                    setActiveTab("marketplace");
                  }
                }}
                className="w-full text-xs bg-transparent outline-none text-slate-800"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery("")}
                  className="text-slate-400 hover:text-slate-700 ml-1"
                >
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>
          </div>
        )}

        {/* 3. DESKTOP / TABLET SUB-NAVIGATION BAR */}
        {isVerifiedOrAdmin && (
          <div className="hidden md:block bg-white border-t border-slate-100">
            <div className="max-w-7xl mx-auto px-4 sm:px-8 py-2 flex flex-wrap items-center justify-between gap-3">
              <nav className="flex flex-wrap items-center gap-1 sm:gap-2">
                {[
                  { id: "home", label: "Home" },
                  { id: "marketplace", label: "Shop Products" },
                  { id: "sell", label: "Sell Your Products" },
                  { id: "orders", label: `My Orders (${myOrders.length})` },
                  { id: "stories", label: "Farmer Stories" },
                  {
                    id: "chat",
                    label:
                      unreadChatCount > 0
                        ? `Chat with Admin (${unreadChatCount} new)`
                        : "Chat with Admin",
                  },
                ].map((item) => (
                  <button
                    key={item.id}
                    onClick={() => setActiveTab(item.id)}
                    className={`px-3.5 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap transition cursor-pointer ${
                      activeTab === item.id
                        ? "bg-[#14532D] text-white"
                        : "text-slate-600 hover:bg-slate-100"
                    }`}
                  >
                    {item.label}
                  </button>
                ))}
              </nav>

              <div className="flex items-center gap-2 shrink-0">
                {(user.is_staff || user.role === "ADMIN") && (
                  <button
                    onClick={() => setActiveTab("admin")}
                    className={`px-3.5 py-1.5 rounded-full text-xs font-bold flex items-center gap-1.5 cursor-pointer ${
                      activeTab === "admin"
                        ? "bg-amber-500 text-slate-950"
                        : "bg-amber-100 text-amber-900 hover:bg-amber-200"
                    }`}
                  >
                    <LayoutDashboard className="w-3.5 h-3.5" /> Admin Control Panel
                  </button>
                )}
              </div>
            </div>
          </div>
        )}
      </header>

      {/* STRICT ADMIN VERIFICATION GATE FOR UNVERIFIED USERS */}
      {!isVerifiedOrAdmin ? (
        <main className="max-w-xl w-full mx-auto px-4 py-12 sm:py-16 flex-1">
          <div className="bg-white rounded-3xl p-6 sm:p-8 shadow-xl border border-amber-200 text-center space-y-5">
            <div className="w-16 h-16 mx-auto rounded-2xl bg-amber-100 text-amber-700 flex items-center justify-center">
              <ShieldAlert className="w-9 h-9" />
            </div>
            <h2 className="text-xl sm:text-2xl font-extrabold text-slate-900">
              Account Pending Admin Verification
            </h2>
            <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">
              Namaste <strong>{user.full_name}</strong>! Your account has been created. For buyer
              and farmer safety, an Admin must verify your account before you can buy produce,
              submit vegetables under <strong>Sell Your Products</strong>, or chat.
            </p>
            <div className="bg-slate-50 p-4 rounded-2xl text-xs text-left space-y-1.5 border border-slate-200">
              <p>
                <strong>Name:</strong> {user.full_name} ({user.role})
              </p>
              <p>
                <strong>Registered Email / Phone:</strong> {user.email || "—"} /{" "}
                {user.phone_number || "—"}
              </p>
              <p>
                <strong>Status:</strong>{" "}
                <span className="text-amber-700 font-bold">Awaiting Admin Verification</span>
              </p>
            </div>
            <button
              onClick={fetchCurrentUser}
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-6 py-3 bg-[#14532D] hover:bg-[#1B4332] text-white font-semibold rounded-xl text-sm shadow-md transition cursor-pointer"
            >
              <RefreshCw className="w-4 h-4" /> Refresh Verification Status
            </button>
          </div>
        </main>
      ) : (
        <main className="flex-1">
          {/* ADMIN PANEL VIEW */}
          {activeTab === "admin" && (
            <div className="max-w-7xl mx-auto px-3 sm:px-8 py-6 sm:py-8">
              {user.is_staff || user.role === "ADMIN" ? (
                <AdminPanel />
              ) : (
                <div className="max-w-md mx-auto my-12 bg-white p-6 sm:p-8 rounded-3xl shadow-lg border border-red-200 text-center space-y-4">
                  <ShieldAlert className="w-12 h-12 text-red-600 mx-auto" />
                  <h2 className="text-xl font-extrabold text-slate-900">
                    Admin Privileges Required
                  </h2>
                  <p className="text-xs text-slate-600 leading-relaxed">
                    You are currently signed in as <strong>{user.full_name}</strong> ({user.role}
                    ). To access <strong>/admin</strong>, please sign out and sign in with your
                    Admin Superuser account.
                  </p>
                  <button
                    onClick={handleLogout}
                    className="w-full py-3 bg-[#14532D] hover:bg-[#1B4332] text-white font-bold text-xs rounded-xl cursor-pointer"
                  >
                    Sign Out & Log In as Admin
                  </button>
                </div>
              )}
            </div>
          )}

          {/* DEDICATED "MY ORDERS" TRACKING VIEW (WITH CANCEL PENDING ORDER) */}
          {activeTab === "orders" && (
            <div className="max-w-5xl mx-auto px-4 sm:px-8 py-6 sm:py-10 space-y-6">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <span className="text-xs font-bold uppercase tracking-wider text-emerald-700">
                    Order History & Live Status
                  </span>
                  <h2 className="text-xl sm:text-2xl font-extrabold text-slate-900">
                    My Harvest Orders
                  </h2>
                </div>
                <button
                  onClick={() => setActiveTab("marketplace")}
                  className="px-4 py-2 rounded-xl bg-[#14532D] text-white text-xs font-bold cursor-pointer"
                >
                  + Continue Shopping
                </button>
              </div>

              {myOrders.length === 0 ? (
                <div className="bg-white rounded-3xl p-10 text-center border border-slate-200 space-y-3">
                  <PackageCheck className="w-10 h-10 text-slate-400 mx-auto" />
                  <p className="text-sm font-bold text-slate-700">No orders placed yet</p>
                  <p className="text-xs text-slate-500">
                    Add fresh vegetables or fruits to your basket to place your first order.
                  </p>
                </div>
              ) : (
                <div className="space-y-3">
                  {myOrders.map((o) => (
                    <div
                      key={o.id}
                      className="bg-white rounded-2xl p-4 sm:p-5 border border-slate-200 shadow-2xs flex flex-wrap items-center justify-between gap-4"
                    >
                      <div className="space-y-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="text-xs font-extrabold text-slate-400">#{o.id}</span>
                          <h3 className="font-bold text-sm sm:text-base text-slate-900">
                            {o.product_name}
                          </h3>
                          <span
                            className={`px-2.5 py-0.5 rounded-full text-[11px] font-bold ${
                              o.status === "DELIVERED"
                                ? "bg-emerald-100 text-emerald-800"
                                : o.status === "CONFIRMED"
                                ? "bg-blue-100 text-blue-800"
                                : o.status === "CANCELLED"
                                ? "bg-red-100 text-red-700"
                                : "bg-amber-100 text-amber-800"
                            }`}
                          >
                            {o.status}
                          </span>
                        </div>
                        <p className="text-xs text-slate-500">
                          Qty:{" "}
                          <strong>
                            {o.quantity} {o.product_unit}
                          </strong>{" "}
                          • Address: <strong>{o.delivery_address}</strong> • Phone:{" "}
                          <strong>{o.contact_phone}</strong>
                        </p>
                      </div>
                      <div className="flex items-center gap-4">
                        <div className="text-right">
                          <p className="text-base sm:text-lg font-black text-[#14532D]">
                            रु {o.total_price}
                          </p>
                          <p className="text-[11px] text-slate-400">
                            {new Date(o.created_at).toLocaleDateString()}
                          </p>
                        </div>
                        {o.status === "PENDING" && (
                          <button
                            onClick={() => handleCancelOrder(o.id)}
                            className="px-3 py-1.5 rounded-xl bg-red-50 hover:bg-red-100 text-red-700 text-xs font-bold cursor-pointer"
                          >
                            Cancel
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* DEDICATED "SELL YOUR PRODUCTS" VIEW (WITH LIVE IMAGE PREVIEW & WITHDRAW) */}
          {activeTab === "sell" && (
            <div className="max-w-7xl mx-auto px-4 sm:px-8 py-6 sm:py-10">
              <div className="grid lg:grid-cols-5 gap-6 sm:gap-8">
                <form
                  onSubmit={handleSellSubmit}
                  className="lg:col-span-3 bg-white rounded-3xl p-5 sm:p-8 shadow-sm border border-slate-200 space-y-4"
                >
                  <div>
                    <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-100 text-[#14532D] text-xs font-bold">
                      <Sprout className="w-3.5 h-3.5" /> Direct Farmer & Customer Selling Portal
                    </span>
                    <h2 className="text-xl sm:text-2xl font-extrabold text-slate-900 mt-2">
                      Sell Your Products to KrishiMart Admin
                    </h2>
                    <p className="text-xs text-slate-500 mt-1">
                      Have fresh vegetables, fruits, or local grains to sell? Enter your contact
                      number, vegetable description, price, and farm pickup location below.
                    </p>
                  </div>

                  <div className="grid sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1">
                        Vegetable / Produce Name *
                      </label>
                      <input
                        type="text"
                        required
                        placeholder="e.g. Organic Local Cauliflower"
                        value={sellForm.vegetable_name}
                        onChange={(e) =>
                          setSellForm({ ...sellForm, vegetable_name: e.target.value })
                        }
                        className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1">
                        Category *
                      </label>
                      <select
                        value={sellForm.category}
                        onChange={(e) => setSellForm({ ...sellForm, category: e.target.value })}
                        className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm bg-white"
                      >
                        <option value="Fresh Vegetables">Fresh Vegetables</option>
                        <option value="Hill & Mountain Fruits">Hill & Mountain Fruits</option>
                        <option value="Grains & Cereals">Grains & Cereals</option>
                        <option value="Spices & Aromatics">Spices & Aromatics</option>
                      </select>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1">
                        Quantity Available *
                      </label>
                      <input
                        type="number"
                        required
                        placeholder="e.g. 80"
                        value={sellForm.quantity}
                        onChange={(e) => setSellForm({ ...sellForm, quantity: e.target.value })}
                        className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1">Unit *</label>
                      <select
                        value={sellForm.unit}
                        onChange={(e) => setSellForm({ ...sellForm, unit: e.target.value })}
                        className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm bg-white"
                      >
                        <option value="kg">Kilogram (kg)</option>
                        <option value="quintal">Quintal</option>
                        <option value="crate">Crate</option>
                        <option value="bundle">Bundle</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1">
                        Expected Rate (रु / Unit) *
                      </label>
                      <input
                        type="number"
                        required
                        placeholder="e.g. 60"
                        value={sellForm.expected_price_per_unit}
                        onChange={(e) =>
                          setSellForm({ ...sellForm, expected_price_per_unit: e.target.value })
                        }
                        className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm"
                      />
                    </div>
                  </div>

                  <div className="grid sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1">
                        Seller Contact Phone Number *
                      </label>
                      <input
                        type="text"
                        required
                        placeholder="e.g. 9841234567"
                        value={sellForm.contact_phone}
                        onChange={(e) =>
                          setSellForm({ ...sellForm, contact_phone: e.target.value })
                        }
                        className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1">
                        Exact Farm / Pickup Location *
                      </label>
                      <input
                        type="text"
                        required
                        placeholder="e.g. Dhangadhi, Kailali or Panchkhal"
                        value={sellForm.pickup_location}
                        onChange={(e) =>
                          setSellForm({ ...sellForm, pickup_location: e.target.value })
                        }
                        className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      Vegetable Description (Quality, Harvest Date, Organic Info) *
                    </label>
                    <textarea
                      rows={4}
                      required
                      placeholder="Describe your vegetables, harvest time, freshness, and when our collection van can pick it up..."
                      value={sellForm.vegetable_description}
                      onChange={(e) =>
                        setSellForm({ ...sellForm, vegetable_description: e.target.value })
                      }
                      className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm"
                    />
                  </div>

                  <div className="space-y-2">
                    <label className="block text-xs font-bold text-slate-700">
                      Upload Harvest Photo (Optional)
                    </label>
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleSelectSellImage}
                      className="w-full text-xs text-slate-600"
                    />
                    {sellImagePreview && (
                      <div className="relative w-36 h-28 rounded-2xl overflow-hidden border border-slate-200">
                        <img
                          src={sellImagePreview}
                          alt="Preview"
                          className="w-full h-full object-cover"
                        />
                        <button
                          type="button"
                          onClick={() => {
                            setSellImagePreview(null);
                            setSellForm({ ...sellForm, image: null });
                          }}
                          className="absolute top-1.5 right-1.5 p-1 rounded-full bg-black/60 text-white cursor-pointer"
                        >
                          <X className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    )}
                  </div>

                  <button
                    type="submit"
                    className="w-full py-3.5 bg-[#14532D] hover:bg-[#1B4332] text-white font-bold rounded-xl shadow-md transition cursor-pointer"
                  >
                    Submit Harvest Batch to Manager for Approval
                  </button>
                </form>

                {/* Seller's Submitted Batches */}
                <div className="lg:col-span-2 space-y-4">
                  <div className="bg-[#14532D] text-white p-5 sm:p-6 rounded-3xl space-y-2">
                    <h3 className="font-extrabold text-base sm:text-lg">
                      Need Instant Rate Confirmation?
                    </h3>
                    <p className="text-xs text-emerald-100">
                      Chat directly with our KrishiMart Managerial team to negotiate bulk rates or
                      schedule farm pickup.
                    </p>
                    <button
                      onClick={() => setChatDrawerOpen(true)}
                      className="mt-2 px-4 py-2 bg-amber-400 text-slate-950 font-bold text-xs rounded-xl inline-flex items-center gap-1.5 cursor-pointer"
                    >
                      <MessageCircle className="w-4 h-4" /> Open Live Chat with Manager
                    </button>
                  </div>

                  <h3 className="text-lg font-bold text-slate-900">
                    Your Submitted Harvest Batches ({mySubmissions.length})
                  </h3>
                  {mySubmissions.length === 0 ? (
                    <div className="bg-white rounded-2xl p-6 text-center text-xs text-slate-500 border border-slate-200">
                      No harvest batches submitted yet.
                    </div>
                  ) : (
                    mySubmissions.map((s) => (
                      <div
                        key={s.id}
                        className="bg-white rounded-2xl p-4 sm:p-5 shadow-xs border border-slate-200 space-y-2"
                      >
                        <div className="flex items-center justify-between gap-2">
                          <h4 className="font-bold text-slate-900">{s.vegetable_name}</h4>
                          <div className="flex items-center gap-1.5">
                            <span
                              className={`px-2.5 py-0.5 rounded-full text-[11px] font-bold ${
                                s.status === "APPROVED"
                                  ? "bg-emerald-100 text-emerald-800"
                                  : s.status === "REJECTED"
                                  ? "bg-red-100 text-red-700"
                                  : "bg-amber-100 text-amber-800"
                              }`}
                            >
                              {s.status}
                            </span>
                            {s.status === "PENDING" && (
                              <button
                                onClick={() => handleDeleteSubmission(s.id, s.vegetable_name)}
                                className="p-1 text-red-500 hover:bg-red-50 rounded-lg cursor-pointer"
                                title="Withdraw Pending Offer"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            )}
                          </div>
                        </div>
                        <p className="text-xs text-slate-600">{s.vegetable_description}</p>
                        <p className="text-xs font-bold text-[#14532D]">
                          {s.quantity} {s.unit} @ रु {s.expected_price_per_unit}/{s.unit} • 📍{" "}
                          {s.pickup_location}
                        </p>
                        {s.admin_remarks && (
                          <div className="p-2.5 rounded-xl bg-emerald-50 text-xs text-emerald-900 border border-emerald-100">
                            <strong>Admin Response:</strong> {s.admin_remarks}
                          </div>
                        )}
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>
          )}

          {/* DEDICATED CHAT VIEW */}
          {activeTab === "chat" && (
            <div className="max-w-3xl mx-auto px-3 sm:px-4 py-6 sm:py-10">
              <div className="bg-white rounded-3xl shadow-sm border border-slate-200 overflow-hidden flex flex-col h-[500px] sm:h-[540px] min-h-0">
                <div className="p-4 sm:p-5 bg-[#14532D] text-white shrink-0">
                  <h3 className="font-bold text-base sm:text-lg">
                    Direct Support Chat with KrishiMart Admin
                  </h3>
                  <p className="text-xs text-emerald-200">
                    Connected as {user.full_name} ({user.role})
                  </p>
                </div>
                <div
                  ref={chatTabScrollRef}
                  className="flex-1 min-h-0 p-4 sm:p-5 overflow-y-auto space-y-3 bg-[#F6F8F5]"
                >
                  {messages.length === 0 ? (
                    <div className="text-center text-slate-400 text-xs sm:text-sm mt-16">
                      Send a message below to chat with the Admin about buying or selling products!
                    </div>
                  ) : (
                    messages.map((m) => (
                      <div
                        key={m.id}
                        className={`flex ${m.is_from_admin ? "justify-start" : "justify-end"}`}
                      >
                        <div
                          className={`max-w-[80%] sm:max-w-md px-4 py-2.5 rounded-2xl text-xs sm:text-sm ${
                            m.is_from_admin
                              ? "bg-white border border-slate-200 text-slate-900 rounded-bl-none"
                              : "bg-[#14532D] text-white rounded-br-none"
                          }`}
                        >
                          <p className="break-words">{m.message}</p>
                          <span className="block text-[10px] opacity-70 mt-1">
                            {m.is_from_admin ? "KrishiMart Admin" : "You"} •{" "}
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
                  onSubmit={handleSendUserMessage}
                  className="p-3 sm:p-4 border-t border-slate-200 bg-white flex gap-2 shrink-0"
                >
                  <input
                    type="text"
                    placeholder="Write a message to Admin..."
                    value={chatInput}
                    onChange={(e) => setChatInput(e.target.value)}
                    className="flex-1 px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs sm:text-sm outline-none"
                  />
                  <button
                    type="submit"
                    className="px-4 sm:px-5 py-2.5 bg-[#14532D] text-white font-semibold rounded-xl text-xs sm:text-sm flex items-center gap-1.5 cursor-pointer"
                  >
                    <Send className="w-4 h-4" /> Send
                  </button>
                </form>
              </div>
            </div>
          )}

          {/* MAIN LANDING, MARKETPLACE & STORIES VIEW */}
          {(activeTab === "home" || activeTab === "marketplace" || activeTab === "stories") && (
            <>
              {/* 4. HERO SECTION */}
              {activeTab === "home" && (
                <section className="relative bg-gradient-to-b from-[#EBF3EC] to-[#F6F8F5] pt-6 sm:pt-8 pb-10 sm:pb-12 px-4 sm:px-8">
                  <div className="max-w-7xl mx-auto grid lg:grid-cols-12 gap-8 sm:gap-10 items-center">
                    <div className="lg:col-span-7 space-y-5 sm:space-y-6">
                      <span className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-emerald-900/10 text-[#14532D] text-[11px] sm:text-xs font-bold">
                        🌱 Empowering 100+ Local Farmers Across Nepal
                      </span>

                      <h1 className="text-3xl sm:text-5xl lg:text-[54px] font-black tracking-tight leading-[1.12] text-slate-900">
                        Fresh From the Farm.
                        <span className="block text-[#14532D] mt-1">Straight to You.</span>
                      </h1>

                      <p className="text-slate-600 text-sm sm:text-lg max-w-xl leading-relaxed">
                        Discover crisp Nepali products, connect directly with verified growers
                        across different places, and bridge the distance between fertile Nepali
                        soil and your dining table.
                      </p>

                      <div className="flex flex-wrap items-center gap-3 pt-1">
                        <a
                          href="#fresh-harvests"
                          className="flex-1 sm:flex-initial justify-center px-5 py-3.5 rounded-xl bg-[#14532D] hover:bg-[#1B4332] text-white font-bold text-xs sm:text-sm flex items-center gap-2 shadow-md transition"
                        >
                          Explore Products <ArrowRight className="w-4 h-4" />
                        </a>
                        <button
                          onClick={() => setActiveTab("sell")}
                          className="flex-1 sm:flex-initial justify-center px-5 py-3.5 rounded-xl bg-[#FDE68A] hover:bg-[#FCD34D] text-slate-900 font-bold text-xs sm:text-sm flex items-center gap-2 shadow-xs transition cursor-pointer"
                        >
                          🌾 Sell Your Harvest
                        </button>
                      </div>

                      <div className="grid grid-cols-3 gap-2 sm:gap-3 max-w-lg pt-2">
                        <div className="bg-white/90 border border-slate-200/70 rounded-2xl p-2.5 sm:p-3.5 shadow-2xs">
                          <p className="text-base sm:text-xl font-black text-slate-900">100%</p>
                          <p className="text-[10px] sm:text-[11px] text-slate-500 font-medium">
                            Verified Growers
                          </p>
                        </div>
                        <div className="bg-white/90 border border-slate-200/70 rounded-2xl p-2.5 sm:p-3.5 shadow-2xs">
                          <p className="text-base sm:text-xl font-black text-slate-900">0% Cut</p>
                          <p className="text-[10px] sm:text-[11px] text-slate-500 font-medium">
                            Direct Farm Price
                          </p>
                        </div>
                        <div className="bg-white/90 border border-slate-200/70 rounded-2xl p-2.5 sm:p-3.5 shadow-2xs">
                          <p className="text-base sm:text-xl font-black text-slate-900">24 Hr</p>
                          <p className="text-[10px] sm:text-[11px] text-slate-500 font-medium">
                            City Delivery
                          </p>
                        </div>
                      </div>
                    </div>

                    <div className="lg:col-span-5 relative">
                      <div className="rounded-3xl overflow-hidden shadow-2xl border-4 border-white relative">
                        <img
                          src="https://images.unsplash.com/photo-1500937386664-56d1dfef3854?auto=format&fit=crop&w=900&q=80"
                          alt="Nepali Terraced Farm"
                          className="w-full h-64 sm:h-[380px] object-cover"
                        />
                        <div className="absolute bottom-3 left-3 right-3 bg-white/95 backdrop-blur-md p-3 sm:p-4 rounded-2xl shadow-lg flex items-center justify-between gap-2">
                          <div className="flex items-center gap-2.5">
                            <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-xl bg-emerald-100 text-[#14532D] flex items-center justify-center font-bold shrink-0">
                              <ShieldCheck className="w-5 h-5" />
                            </div>
                            <div>
                              <p className="text-xs font-extrabold text-slate-900">
                                100% Nepal Origin Verified
                              </p>
                              <p className="text-[10px] sm:text-[11px] text-slate-500">
                                Traceable to village & cooperative
                              </p>
                            </div>
                          </div>
                          <span className="px-2 py-1 rounded-lg bg-[#14532D] text-white text-[10px] font-bold">
                            Guaranteed
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* 5. FLOATING MULTI-FILTER SEARCH BAR */}
                  <div className="max-w-7xl mx-auto mt-8 sm:mt-10 bg-white rounded-3xl p-4 sm:p-5 shadow-md border border-slate-200/80 space-y-3">
                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-12 gap-2.5 sm:gap-3">
                      <div className="sm:col-span-2 md:col-span-5 relative">
                        <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
                        <input
                          type="text"
                          placeholder="Search 'Fresh Tomatoes', 'Mustang Apples'..."
                          value={searchQuery}
                          onChange={(e) => setSearchQuery(e.target.value)}
                          className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-slate-50 border border-slate-200 text-xs outline-none focus:bg-white focus:border-[#14532D]"
                        />
                      </div>
                      <div className="md:col-span-3">
                        <select
                          value={selectedCategory}
                          onChange={(e) => setSelectedCategory(e.target.value)}
                          className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 border border-slate-200 text-xs font-semibold text-slate-700"
                        >
                          <option value="ALL">🌱 All Produce Categories</option>
                          <option value="VEGETABLES">Fresh Vegetables</option>
                          <option value="FRUITS">Fruits</option>
                          <option value="GRAINS">Grains & Cereals</option>
                          <option value="SPICES">Spices & Aromatics</option>
                          <option value="DAIRY">Dairy & Oils</option>
                        </select>
                      </div>
                      <div className="md:col-span-2">
                        <select
                          value={selectedDistrict}
                          onChange={(e) => setSelectedDistrict(e.target.value)}
                          className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 border border-slate-200 text-xs font-semibold text-slate-700"
                        >
                          <option value="ALL">📍 All Districts</option>
                          <option value="Kavre">Kavre</option>
                          <option value="Mustang">Mustang</option>
                          <option value="Palpa">Palpa</option>
                          <option value="Jumla">Jumla</option>
                          <option value="Ilam">Ilam</option>
                          <option value="Chitwan">Chitwan</option>
                          <option value="Dhangadhi">Dhangadhi / Kailali</option>
                          <option value="Kanchanpur">Kanchanpur</option>
                          <option value="Bardiya">Bardiya</option>
                        </select>
                      </div>
                      <div className="sm:col-span-2 md:col-span-2">
                        <a
                          href="#fresh-harvests"
                          className="w-full h-full py-2.5 rounded-xl bg-[#14532D] hover:bg-[#1B4332] text-white font-bold text-xs flex items-center justify-center gap-1.5"
                        >
                          Find Harvest
                        </a>
                      </div>
                    </div>
                  </div>
                </section>
              )}

              {/* 6. EXPLORE BY CATEGORY */}
              {activeTab !== "stories" && (
                <section className="max-w-7xl mx-auto px-4 sm:px-8 py-8 sm:py-10 space-y-5">
                  <div className="flex items-end justify-between">
                    <div>
                      <span className="text-[11px] font-extrabold uppercase tracking-widest text-emerald-700">
                        OUR HARVEST RANGE
                      </span>
                      <h2 className="text-xl sm:text-3xl font-black text-slate-900 mt-0.5">
                        Explore by Category
                      </h2>
                    </div>
                    <button
                      onClick={() => setSelectedCategory("ALL")}
                      className="text-xs font-bold text-[#14532D] hover:underline cursor-pointer"
                    >
                      View All →
                    </button>
                  </div>

                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-5">
                    {CATEGORIES_SHOWCASE.map((cat, idx) => (
                      <div
                        key={idx}
                        onClick={() => {
                          setSelectedCategory(cat.id);
                          document
                            .getElementById("fresh-harvests")
                            ?.scrollIntoView({ behavior: "smooth" });
                        }}
                        className="group bg-white rounded-2xl p-2.5 sm:p-3 border border-slate-200/80 shadow-2xs hover:shadow-md transition cursor-pointer"
                      >
                        <div className="relative rounded-xl overflow-hidden h-28 sm:h-36 mb-2.5">
                          <img
                            src={cat.image}
                            alt={cat.title}
                            className="w-full h-full object-cover group-hover:scale-105 transition duration-300"
                          />
                          <span className="absolute top-2 left-2 px-2 py-0.5 rounded-full bg-white/95 text-slate-800 text-[9px] sm:text-[10px] font-bold shadow-xs">
                            {cat.badge}
                          </span>
                        </div>
                        <h3 className="font-bold text-xs sm:text-sm text-slate-900 group-hover:text-[#14532D]">
                          {cat.title}
                        </h3>
                        <p className="text-[10px] sm:text-[11px] text-slate-500 line-clamp-1">
                          {cat.subtitle}
                        </p>
                      </div>
                    ))}
                  </div>
                </section>
              )}

              {/* 7. FRESH DAILY HARVESTS (WITH QUICK-VIEW DETAIL MODAL) */}
              {activeTab !== "stories" && (
                <section
                  id="fresh-harvests"
                  className="max-w-7xl mx-auto px-4 sm:px-8 py-6 sm:py-8 space-y-6"
                >
                  <div className="flex flex-wrap items-end justify-between gap-4">
                    <div>
                      <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-emerald-100 text-[#14532D] text-[11px] font-bold">
                        ● Live Farm Marketplace ({filteredProducts.length} Batches)
                      </span>
                      <h2 className="text-xl sm:text-3xl font-black text-slate-900 mt-1">
                        Fresh Daily Harvests
                      </h2>
                    </div>

                    <div className="flex overflow-x-auto max-w-full gap-1.5 bg-white p-1 rounded-xl border border-slate-200">
                      {[
                        { id: "ALL", label: "All" },
                        { id: "VEGETABLES", label: "Vegetables" },
                        { id: "FRUITS", label: "Fruits" },
                        { id: "GRAINS", label: "Grains" },
                        { id: "SPICES", label: "Spices" },
                        { id: "DAIRY", label: "Dairy" },
                      ].map((tab) => (
                        <button
                          key={tab.id}
                          onClick={() => setSelectedCategory(tab.id)}
                          className={`px-3 py-1.5 rounded-lg text-xs font-bold whitespace-nowrap transition cursor-pointer ${
                            selectedCategory === tab.id
                              ? "bg-[#14532D] text-white"
                              : "text-slate-600 hover:bg-slate-100"
                          }`}
                        >
                          {tab.label}
                        </button>
                      ))}
                    </div>
                  </div>

                  {filteredProducts.length === 0 ? (
                    <div className="bg-white rounded-3xl p-10 text-center border border-slate-200 space-y-3">
                      <p className="text-sm font-bold text-slate-700">
                        No harvest batches match your current filter.
                      </p>
                      <button
                        onClick={() => {
                          setSelectedCategory("ALL");
                          setSelectedDistrict("ALL");
                          setSearchQuery("");
                        }}
                        className="px-4 py-2 rounded-xl bg-[#14532D] text-white text-xs font-bold cursor-pointer"
                      >
                        Show All Harvests
                      </button>
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5 sm:gap-6">
                      {filteredProducts.map((p) => {
                        const imgUrl = getProductImage(p);
                        return (
                          <div
                            key={p.id}
                            className="bg-white rounded-3xl p-3.5 border border-slate-200/90 shadow-xs hover:shadow-lg transition flex flex-col justify-between"
                          >
                            <div>
                              <div
                                onClick={() => {
                                  setQuickViewProduct(p);
                                  setQuickViewQty(1);
                                }}
                                className="relative h-48 sm:h-52 rounded-2xl overflow-hidden mb-3.5 cursor-pointer group"
                              >
                                <img
                                  src={imgUrl}
                                  alt={p.name}
                                  className="w-full h-full object-cover group-hover:scale-105 transition duration-300"
                                />
                                <span className="absolute top-3 left-3 px-2.5 py-1 rounded-full bg-white/95 text-slate-800 text-[11px] font-bold flex items-center gap-1 shadow-xs">
                                  <MapPin className="w-3 h-3 text-emerald-700" />
                                  {p.origin_location || "Nepal Farm"}
                                </span>
                                <span className="absolute top-3 right-3 px-2.5 py-1 rounded-full bg-emerald-700 text-white text-[10px] font-bold shadow-xs">
                                  {Number(p.stock_quantity) > 0
                                    ? `${p.stock_quantity} ${p.unit} Left`
                                    : "Out of Stock"}
                                </span>
                              </div>

                              <div className="px-1.5 space-y-1.5">
                                <div className="flex items-center justify-between text-[11px] text-slate-500">
                                  <span className="flex items-center gap-1 font-medium text-emerald-800">
                                    <User className="w-3.5 h-3.5" /> Verified Grower
                                  </span>
                                  <span className="uppercase font-bold text-[10px] text-slate-400">
                                    {p.category}
                                  </span>
                                </div>

                                <h3
                                  onClick={() => {
                                    setQuickViewProduct(p);
                                    setQuickViewQty(1);
                                  }}
                                  className="font-extrabold text-base text-slate-900 hover:text-[#14532D] cursor-pointer"
                                >
                                  {p.name}
                                </h3>
                                <p className="text-xs text-slate-500 line-clamp-2">
                                  {p.description}
                                </p>

                                <div className="pt-2 flex items-center justify-between">
                                  <div>
                                    <span className="text-xl font-black text-slate-900">
                                      रु {p.price}
                                    </span>
                                    <span className="text-xs text-slate-500"> / {p.unit}</span>
                                  </div>
                                  <span className="px-2.5 py-0.5 rounded-md bg-emerald-50 text-emerald-800 border border-emerald-200 text-[10px] font-bold">
                                    Direct Farm Rate
                                  </span>
                                </div>
                              </div>
                            </div>

                            <div className="mt-4 pt-3 border-t border-slate-100 flex items-center gap-2">
                              <button
                                disabled={Number(p.stock_quantity) <= 0}
                                onClick={() => handleAddToBasket(p, 1)}
                                className="flex-1 py-2.5 px-4 rounded-xl bg-[#14532D] hover:bg-[#1B4332] disabled:bg-slate-300 text-white text-xs font-bold flex items-center justify-center gap-2 transition cursor-pointer"
                              >
                                <ShoppingBag className="w-3.5 h-3.5" />
                                {Number(p.stock_quantity) > 0 ? "Add to Basket" : "Sold Out"}
                              </button>
                              <button
                                onClick={() => {
                                  setQuickViewProduct(p);
                                  setQuickViewQty(1);
                                }}
                                className="p-2.5 rounded-xl border border-slate-200 text-slate-500 hover:text-[#14532D] hover:border-[#14532D] transition cursor-pointer"
                                title="Quick View Details"
                              >
                                <Eye className="w-4 h-4" />
                              </button>
                              <button
                                onClick={() => setChatDrawerOpen(true)}
                                className="p-2.5 rounded-xl border border-slate-200 text-slate-500 hover:text-[#14532D] hover:border-[#14532D] transition cursor-pointer"
                                title="Ask Admin about this batch"
                              >
                                <MessageCircle className="w-4 h-4" />
                              </button>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </section>
              )}

              {/* 8. FARMER SPOTLIGHT */}
              <section className="max-w-7xl mx-auto px-4 sm:px-8 py-8 space-y-6">
                <div>
                  <span className="text-[11px] font-extrabold uppercase tracking-widest text-emerald-700">
                    MEET OUR GROWERS
                  </span>
                  <h2 className="text-xl sm:text-3xl font-black text-slate-900">
                    Farmer Spotlight
                  </h2>
                </div>

                <div className="grid md:grid-cols-2 gap-5 sm:gap-6">
                  <div className="bg-white rounded-3xl p-5 sm:p-6 border border-slate-200 space-y-4">
                    <div className="flex items-center gap-4">
                      <img
                        src="https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=200&q=80"
                        alt="Ram Bahadur Karki"
                        className="w-14 h-14 rounded-2xl object-cover"
                      />
                      <div>
                        <span className="px-2 py-0.5 rounded bg-emerald-100 text-[#14532D] text-[10px] font-bold">
                          ✓ Cooperative Leader
                        </span>
                        <h4 className="font-extrabold text-slate-900 text-base mt-0.5">
                          Ram Bahadur Karki
                        </h4>
                        <p className="text-xs text-slate-500">📍 Dhading Besi, Bagmati Province</p>
                      </div>
                    </div>
                    <p className="text-xs text-slate-600 italic bg-slate-50 p-4 rounded-2xl leading-relaxed">
                      "With KrishiMart, my cooperative gets 35% higher returns directly with
                      digital weighing and instant chat support."
                    </p>
                  </div>

                  <div className="bg-white rounded-3xl p-5 sm:p-6 border border-slate-200 space-y-4">
                    <div className="flex items-center gap-4">
                      <img
                        src="https://images.unsplash.com/photo-1544005313-94ddf0286df2?auto=format&fit=crop&w=200&q=80"
                        alt="Sita Devi Adhikari"
                        className="w-14 h-14 rounded-2xl object-cover"
                      />
                      <div>
                        <span className="px-2 py-0.5 rounded bg-amber-100 text-amber-900 text-[10px] font-bold">
                          ★ Organic Pioneer
                        </span>
                        <h4 className="font-extrabold text-slate-900 text-base mt-0.5">
                          Sita Devi Adhikari
                        </h4>
                        <p className="text-xs text-slate-500">📍 Bharatpur-14, Chitwan</p>
                      </div>
                    </div>
                    <p className="text-xs text-slate-600 italic bg-slate-50 p-4 rounded-2xl leading-relaxed">
                      "KrishiMart connected our women's group directly to families who value
                      authentic pesticide-free vegetables."
                    </p>
                  </div>
                </div>
              </section>
            </>
          )}
        </main>
      )}

      {/* PRODUCT QUICK-VIEW DETAIL MODAL */}
      {quickViewProduct && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-lg w-full overflow-hidden shadow-2xl">
            <div className="relative h-60">
              <img
                src={getProductImage(quickViewProduct)}
                alt={quickViewProduct.name}
                className="w-full h-full object-cover"
              />
              <button
                onClick={() => setQuickViewProduct(null)}
                className="absolute top-3 right-3 p-2 rounded-full bg-black/60 text-white hover:bg-black cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
              <span className="absolute bottom-3 left-3 px-3 py-1 rounded-full bg-white/95 text-slate-900 text-xs font-bold flex items-center gap-1">
                <MapPin className="w-3.5 h-3.5 text-emerald-700" />
                {quickViewProduct.origin_location || "Nepal Farm"}
              </span>
            </div>
            <div className="p-6 space-y-4">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <span className="text-[11px] font-bold uppercase text-emerald-700">
                    {quickViewProduct.category}
                  </span>
                  <h3 className="text-xl font-extrabold text-slate-900">
                    {quickViewProduct.name}
                  </h3>
                </div>
                <div className="text-right shrink-0">
                  <span className="text-2xl font-black text-[#14532D]">
                    रु {quickViewProduct.price}
                  </span>
                  <span className="text-xs text-slate-500 block">
                    per {quickViewProduct.unit}
                  </span>
                </div>
              </div>
              <p className="text-xs sm:text-sm text-slate-600 leading-relaxed bg-slate-50 p-4 rounded-2xl">
                {quickViewProduct.description}
              </p>
              <div className="flex items-center justify-between pt-2">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold text-slate-700">Quantity:</span>
                  <button
                    onClick={() => setQuickViewQty(Math.max(1, quickViewQty - 1))}
                    className="w-8 h-8 rounded-xl border border-slate-200 flex items-center justify-center cursor-pointer"
                  >
                    <Minus className="w-3.5 h-3.5" />
                  </button>
                  <span className="w-8 text-center font-extrabold text-sm">{quickViewQty}</span>
                  <button
                    onClick={() => setQuickViewQty(quickViewQty + 1)}
                    className="w-8 h-8 rounded-xl border border-slate-200 flex items-center justify-center cursor-pointer"
                  >
                    <Plus className="w-3.5 h-3.5" />
                  </button>
                </div>
                <button
                  onClick={() => {
                    handleAddToBasket(quickViewProduct, quickViewQty);
                    setQuickViewProduct(null);
                  }}
                  className="px-6 py-3 rounded-xl bg-[#14532D] hover:bg-[#1B4332] text-white text-xs font-bold flex items-center gap-2 cursor-pointer"
                >
                  <ShoppingBag className="w-4 h-4" /> Add to Basket (रु{" "}
                  {Number(quickViewProduct.price) * quickViewQty})
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* SLIDE-OUT SHOPPING BASKET & CHECKOUT DRAWER */}
      {basketDrawerOpen && (
        <div className="fixed inset-0 z-50 bg-black/40 flex justify-end">
          <div className="bg-white w-full max-w-md h-full shadow-2xl flex flex-col justify-between p-5 sm:p-6 overflow-y-auto">
            <div className="space-y-4">
              <div className="flex items-center justify-between border-b border-slate-200 pb-4">
                <div className="flex items-center gap-2">
                  <ShoppingBag className="w-5 h-5 text-[#14532D]" />
                  <h3 className="text-lg font-extrabold text-slate-900">
                    Your Harvest Basket ({totalBasketItems})
                  </h3>
                </div>
                <button
                  onClick={() => setBasketDrawerOpen(false)}
                  className="p-1.5 rounded-full hover:bg-slate-100 text-slate-500 cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {basket.length === 0 ? (
                <div className="py-16 text-center space-y-2 text-slate-400">
                  <ShoppingBag className="w-10 h-10 mx-auto opacity-40" />
                  <p className="text-sm font-semibold">Your basket is empty</p>
                  <p className="text-xs">Tap "Add to Basket" on any harvest item to start.</p>
                </div>
              ) : (
                <div className="divide-y divide-slate-100">
                  {basket.map((item) => (
                    <div key={item.id} className="py-3.5 flex items-center justify-between gap-3">
                      <div>
                        <p className="font-bold text-sm text-slate-900">{item.name}</p>
                        <p className="text-xs text-slate-500">
                          रु {item.price} / {item.unit}
                        </p>
                      </div>
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => handleUpdateBasketQty(item.id, -1)}
                          className="w-7 h-7 rounded-lg border border-slate-200 flex items-center justify-center hover:bg-slate-100 cursor-pointer"
                        >
                          <Minus className="w-3.5 h-3.5" />
                        </button>
                        <span className="text-xs font-extrabold w-6 text-center">{item.qty}</span>
                        <button
                          onClick={() => handleUpdateBasketQty(item.id, 1)}
                          className="w-7 h-7 rounded-lg border border-slate-200 flex items-center justify-center hover:bg-slate-100 cursor-pointer"
                        >
                          <Plus className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {basket.length > 0 && (
              <form
                onSubmit={handleCheckoutBasket}
                className="border-t border-slate-200 pt-4 space-y-3"
              >
                <div className="flex items-center justify-between text-base font-black text-slate-900">
                  <span>Total Amount:</span>
                  <span className="text-[#14532D]">रु {basketTotal}</span>
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Contact Phone Number *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. 9841234567"
                    value={checkoutPhone}
                    onChange={(e) => setCheckoutPhone(e.target.value)}
                    className="w-full px-3.5 py-2 rounded-xl border border-slate-200 text-xs"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Delivery Address / Location *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Ward 4, Dhangadhi or Kathmandu"
                    value={checkoutAddress}
                    onChange={(e) => setCheckoutAddress(e.target.value)}
                    className="w-full px-3.5 py-2 rounded-xl border border-slate-200 text-xs"
                  />
                </div>
                <button
                  type="submit"
                  disabled={checkingOut}
                  className="w-full py-3 rounded-xl bg-[#14532D] hover:bg-[#1B4332] text-white font-bold text-xs shadow-md transition cursor-pointer"
                >
                  {checkingOut ? "Placing Order..." : `Confirm Order (रु ${basketTotal})`}
                </button>
              </form>
            )}
          </div>
        </div>
      )}

      {/* EDIT USER PROFILE MODAL */}
      {profileModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
          <form
            onSubmit={handleUpdateProfile}
            className="bg-white rounded-3xl max-w-md w-full p-6 space-y-4 shadow-2xl"
          >
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-extrabold text-slate-900">Edit Your Profile</h3>
              <button
                type="button"
                onClick={() => setProfileModalOpen(false)}
                className="p-1 text-slate-400 hover:text-slate-700 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Full Name *</label>
              <input
                type="text"
                required
                value={profileForm.full_name}
                onChange={(e) => setProfileForm({ ...profileForm, full_name: e.target.value })}
                className="w-full px-3.5 py-2 rounded-xl border border-slate-200 text-sm"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Phone Number</label>
              <input
                type="text"
                value={profileForm.phone_number}
                onChange={(e) => setProfileForm({ ...profileForm, phone_number: e.target.value })}
                className="w-full px-3.5 py-2 rounded-xl border border-slate-200 text-sm"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Default Location / Address
              </label>
              <input
                type="text"
                value={profileForm.location}
                onChange={(e) => setProfileForm({ ...profileForm, location: e.target.value })}
                className="w-full px-3.5 py-2 rounded-xl border border-slate-200 text-sm"
              />
            </div>
            <div className="flex gap-2 pt-2">
              <button
                type="button"
                onClick={() => setProfileModalOpen(false)}
                className="flex-1 py-2.5 rounded-xl border border-slate-200 text-xs font-bold text-slate-600 cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="flex-1 py-2.5 rounded-xl bg-[#14532D] text-white text-xs font-bold cursor-pointer"
              >
                Save Changes
              </button>
            </div>
          </form>
        </div>
      )}

      {/* MOBILE-RESPONSIVE FLOATING LIVE CHAT DRAWER */}
      {chatDrawerOpen && isVerifiedOrAdmin && (
        <div className="fixed inset-x-3 bottom-20 sm:inset-x-auto sm:bottom-5 sm:right-5 z-50 sm:w-96 bg-white rounded-3xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col h-[420px] sm:h-[460px] min-h-0">
          <div className="p-4 bg-[#14532D] text-white flex items-center justify-between shrink-0">
            <div>
              <p className="font-bold text-sm">KrishiMart Live Admin Support</p>
              <p className="text-[11px] text-emerald-200">Buyers & Farmers Direct Chat</p>
            </div>
            <button
              onClick={() => setChatDrawerOpen(false)}
              className="p-1 text-emerald-200 hover:text-white cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
          <div
            ref={chatDrawerScrollRef}
            className="flex-1 min-h-0 p-4 overflow-y-auto space-y-2.5 bg-[#F6F8F5]"
          >
            {messages.length === 0 ? (
              <p className="text-center text-xs text-slate-400 mt-12">
                Hello {user.full_name}! Message the Admin about product prices or selling your
                vegetables.
              </p>
            ) : (
              messages.map((m) => (
                <div
                  key={m.id}
                  className={`flex ${m.is_from_admin ? "justify-start" : "justify-end"}`}
                >
                  <div
                    className={`max-w-[78%] px-3.5 py-2 rounded-2xl text-xs ${
                      m.is_from_admin
                        ? "bg-white border border-slate-200 text-slate-800"
                        : "bg-[#14532D] text-white"
                    }`}
                  >
                    <p className="break-words">{m.message}</p>
                    <span className="block text-[9px] opacity-70 mt-0.5">
                      {m.is_from_admin ? "KrishiMart Admin" : "You"} •{" "}
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
            onSubmit={handleSendUserMessage}
            className="p-3 border-t border-slate-200 bg-white flex gap-2 shrink-0"
          >
            <input
              type="text"
              placeholder="Message Admin..."
              value={chatInput}
              onChange={(e) => setChatInput(e.target.value)}
              className="flex-1 px-3 py-2 rounded-xl border border-slate-200 text-xs outline-none"
            />
            <button
              type="submit"
              className="px-3.5 py-2 bg-[#14532D] text-white rounded-xl text-xs font-bold cursor-pointer"
            >
              <Send className="w-3.5 h-3.5" />
            </button>
          </form>
        </div>
      )}

      {/* NATIVE-STYLE MOBILE BOTTOM NAVIGATION BAR */}
      {isVerifiedOrAdmin && (
        <nav className="md:hidden fixed bottom-0 inset-x-0 z-40 bg-white border-t border-slate-200 px-2 py-1.5 flex items-center justify-around shadow-lg">
          <button
            onClick={() => setActiveTab("home")}
            className={`flex flex-col items-center gap-0.5 py-1 px-2 rounded-xl text-[10px] font-bold ${
              activeTab === "home" ? "text-[#14532D]" : "text-slate-400"
            }`}
          >
            <Home className="w-5 h-5" />
            <span>Home</span>
          </button>

          <button
            onClick={() => setActiveTab("marketplace")}
            className={`flex flex-col items-center gap-0.5 py-1 px-2 rounded-xl text-[10px] font-bold ${
              activeTab === "marketplace" ? "text-[#14532D]" : "text-slate-400"
            }`}
          >
            <ShoppingBag className="w-5 h-5" />
            <span>Shop</span>
          </button>

          <button
            onClick={() => setActiveTab("sell")}
            className="flex flex-col items-center -mt-5"
          >
            <div className="w-11 h-11 rounded-full bg-[#14532D] text-amber-400 flex items-center justify-center shadow-md border-4 border-white">
              <Plus className="w-5 h-5" />
            </div>
            <span className="text-[10px] font-extrabold text-[#14532D] mt-0.5">Sell</span>
          </button>

          <button
            onClick={() => setActiveTab("orders")}
            className={`flex flex-col items-center gap-0.5 py-1 px-2 rounded-xl text-[10px] font-bold ${
              activeTab === "orders" ? "text-[#14532D]" : "text-slate-400"
            }`}
          >
            <PackageCheck className="w-5 h-5" />
            <span>Orders</span>
          </button>

          {user.is_staff || user.role === "ADMIN" ? (
            <button
              onClick={() => setActiveTab("admin")}
              className={`flex flex-col items-center gap-0.5 py-1 px-2 rounded-xl text-[10px] font-bold ${
                activeTab === "admin" ? "text-amber-600" : "text-slate-400"
              }`}
            >
              <LayoutDashboard className="w-5 h-5" />
              <span>Admin</span>
            </button>
          ) : (
            <button
              onClick={() => setActiveTab("chat")}
              className={`relative flex flex-col items-center gap-0.5 py-1 px-2 rounded-xl text-[10px] font-bold ${
                activeTab === "chat" ? "text-[#14532D]" : "text-slate-400"
              }`}
            >
              <MessageCircle className="w-5 h-5" />
              <span>Chat</span>
              {unreadChatCount > 0 && (
                <span className="absolute top-0 right-1 w-2 h-2 rounded-full bg-red-600" />
              )}
            </button>
          )}
        </nav>
      )}

      {/* 11. FOOTER */}
      <footer className="bg-white border-t border-slate-200 mt-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-8 py-10 grid sm:grid-cols-2 lg:grid-cols-4 gap-8 text-xs text-slate-600">
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-[#14532D] flex items-center justify-center text-amber-400">
                <Sprout className="w-5 h-5" />
              </div>
              <span className="text-lg font-extrabold text-slate-900">KrishiMart</span>
            </div>
            <p className="leading-relaxed text-slate-500">
              Empowering Nepal's agricultural backbone. Connecting local farmers, cooperatives, and
              households through transparent pricing and Manager-verified trust.
            </p>
          </div>
          <div>
            <h4 className="font-bold text-slate-900 mb-3">Market Categories</h4>
            <ul className="space-y-2">
              <li>Fresh Seasonal Vegetables</li>
              <li>Indigenous Grains </li>
              <li>Fruits</li>
              <li>Organic Spices & Dairy</li>
            </ul>
          </div>
          <div>
            <h4 className="font-bold text-slate-900 mb-3">Farmer & Buyer Support</h4>
            <ul className="space-y-2">
              <li>Sell Products to KrishiMart</li>
              <li>Track My Harvest Orders</li>
              <li>Live Buyer–Seller–Manager Chat</li>
            </ul>
          </div>
          <div>
            <h4 className="font-bold text-slate-900 mb-3">Central Hub Contact</h4>
            <ul className="space-y-2">
              <li>📍 Dhangadhi Hub </li>
              <li>📞 +977-9703931744 / 9766528500</li>
              <li>✉️ support@krishimart.com.np</li>
              <li>🕒 6:00 AM – 8:00 PM NPT Daily</li>
            </ul>
          </div>
        </div>
      </footer>
    </div>
  );
}