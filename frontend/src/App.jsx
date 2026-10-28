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
  Camera,
  LogIn,
  Receipt,
  DollarSign,
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

  // Auth Modal for Visitors
  const [authModalOpen, setAuthModalOpen] = useState(false);
  const [authModalTab, setAuthModalTab] = useState("login");

  // Database Products, Orders & Filters
  const [dbProducts, setDbProducts] = useState([]);
  const [myOrders, setMyOrders] = useState([]);
  const [selectedCategory, setSelectedCategory] = useState("ALL");
  const [selectedDistrict, setSelectedDistrict] = useState("ALL");
  const [searchQuery, setSearchQuery] = useState("");

  // Farmer's Sales to Admin Ledger State
  const [farmerSales, setFarmerSales] = useState([]);

  // Product Quick-View Modal
  const [quickViewProduct, setQuickViewProduct] = useState(null);
  const [quickViewQty, setQuickViewQty] = useState(1);

  // Interactive Basket Drawer
  const [basket, setBasket] = useState(() => {
    try {
      const saved = localStorage.getItem("krishimart_basket");
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });
  const [paymentMethod, setPaymentMethod] = useState("COD");
  const [basketDrawerOpen, setBasketDrawerOpen] = useState(false);
  const [checkoutAddress, setCheckoutAddress] = useState("");
  const [checkoutPhone, setCheckoutPhone] = useState("");
  const [checkingOut, setCheckingOut] = useState(false);

  useEffect(() => {
    localStorage.setItem("krishimart_basket", JSON.stringify(basket));
  }, [basket]);

  // Profile Modal State
  const [profileModalOpen, setProfileModalOpen] = useState(false);
  const [profileForm, setProfileForm] = useState({
    full_name: "",
    phone_number: "",
    location: "",
  });
  const [profileAvatarFile, setProfileAvatarFile] = useState(null);
  const [profileAvatarPreview, setProfileAvatarPreview] = useState(null);
  const [passwordForm, setPasswordForm] = useState({
    current_password: "",
    new_password: "",
  });

  // "Sell Your Products" Farmer Portal State
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

  // Live Chat
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

  const isFarmer = user && (user.role === "FARMER" || user.role === "ADMIN" || user.is_staff);

  const loadPublicProducts = async () => {
    try {
      const res = await api.get("/marketplace/products/");
      setDbProducts(res.data);
    } catch (err) {
      console.error("Failed to load products:", err);
    }
  };

  const loadUserData = async () => {
    if (!isVerifiedOrAdmin) return;
    try {
      const [subRes, ordRes, unreadRes, salesRes] = await Promise.all([
        isFarmer ? api.get("/marketplace/sell-submissions/") : Promise.resolve({ data: [] }),
        api.get("/marketplace/orders/"),
        api.get("/chat/messages/unread_count/"),
        isFarmer ? api.get("/marketplace/farmer-purchases/") : Promise.resolve({ data: [] }),
      ]);
      setMySubmissions(subRes.data);
      setMyOrders(ordRes.data);
      setUnreadChatCount(unreadRes.data.unread_count || 0);
      setFarmerSales(salesRes.data);
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    loadPublicProducts();
    if (user) {
      loadUserData();
    }
  }, [user, activeTab]);

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

  const handleLogout = () => {
    localStorage.removeItem("krishimart_access");
    localStorage.removeItem("krishimart_refresh");
    setUser(null);
    setActiveTab("home");
    showToast("Signed out successfully.");
  };

  const requireAuth = (actionCallback) => {
    if (!user) {
      setAuthModalTab("login");
      setAuthModalOpen(true);
      return;
    }
    if (!isVerifiedOrAdmin) {
      showToast("Your account is awaiting Admin verification.", "error");
      return;
    }
    actionCallback();
  };

  const handleAddToBasket = (product, qtyToAdd = 1) => {
    requireAuth(() => {
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
    });
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
      showToast("Please enter your contact phone and delivery address.", "error");
      return;
    }
    setCheckingOut(true);
    try {
      for (const item of basket) {
        await api.post("/marketplace/orders/", {
          product: item.id,
          quantity: item.qty,
          delivery_address: `${checkoutAddress.trim()} [${paymentMethod}]`,
          contact_phone: checkoutPhone.trim(),
        });
      }
      setBasket([]);
      setBasketDrawerOpen(false);
      await loadUserData();
      showToast("Order confirmed! Track delivery in My Orders.");
      setActiveTab("orders");
    } catch {
      showToast("Failed to place order.", "error");
    } finally {
      setCheckingOut(false);
    }
  };

  const handleCancelOrder = async (orderId) => {
    try {
      await api.patch(`/marketplace/orders/${orderId}/`, { status: "CANCELLED" });
      showToast(`Order #${orderId} has been cancelled.`);
      loadUserData();
      loadPublicProducts();
    } catch {
      showToast("Could not cancel order.", "error");
    }
  };

  const handleUpdateProfile = async (e) => {
    e.preventDefault();
    try {
      const formData = new FormData();
      formData.append("full_name", profileForm.full_name.trim());
      formData.append("phone_number", profileForm.phone_number.trim());
      formData.append("location", profileForm.location.trim());
      if (profileAvatarFile instanceof File) {
        formData.append("profile_picture", profileAvatarFile);
      }

      const res = await api.patch("/accounts/me/", formData);
      setUser(res.data);
      setProfileAvatarFile(null);
      setProfileAvatarPreview(null);
      setProfileModalOpen(false);
      showToast("Profile and photo updated!");
    } catch (err) {
      const data = err.response?.data;
      if (data && typeof data === "object") {
        const firstKey = Object.keys(data)[0];
        const msg = Array.isArray(data[firstKey]) ? data[firstKey][0] : data[firstKey];
        showToast(`${firstKey}: ${msg}`, "error");
      } else {
        showToast("Failed to update profile.", "error");
      }
    }
  };

  const handleChangePassword = async (e) => {
    e.preventDefault();
    try {
      const res = await api.post("/accounts/change-password/", passwordForm);
      showToast(res.data.message || "Password updated!");
      setPasswordForm({ current_password: "", new_password: "" });
      setProfileModalOpen(false);
    } catch (err) {
      showToast(err.response?.data?.error || "Failed to change password.", "error");
    }
  };

  const handleSellSubmit = async (e) => {
    e.preventDefault();
    try {
      const formData = new FormData();
      formData.append("vegetable_name", sellForm.vegetable_name.trim());
      formData.append("category", sellForm.category);
      formData.append("vegetable_description", sellForm.vegetable_description.trim());
      formData.append("quantity", sellForm.quantity);
      formData.append("unit", sellForm.unit);
      formData.append("expected_price_per_unit", sellForm.expected_price_per_unit);
      formData.append("contact_phone", sellForm.contact_phone.trim());
      formData.append("pickup_location", sellForm.pickup_location.trim());
      if (sellForm.image instanceof File) {
        formData.append("image", sellForm.image);
      }

      await api.post("/marketplace/sell-submissions/", formData);
      showToast("Harvest batch submitted to Admin! Check status on the right.");
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
      loadUserData();
    } catch (err) {
      console.error("Sell submit error:", err.response?.data);
      const data = err.response?.data;
      if (data && typeof data === "object") {
        const firstKey = Object.keys(data)[0];
        const msg = Array.isArray(data[firstKey]) ? data[firstKey][0] : data[firstKey];
        showToast(`${firstKey}: ${msg}`, "error");
      } else {
        showToast(err.response?.data?.detail || "Failed to submit harvest batch.", "error");
      }
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

  // Farmer's Total Sold Revenue Calculation
  const totalFarmerEarnings = farmerSales.reduce((sum, s) => sum + Number(s.total_amount || 0), 0);
  const totalFarmerWeight = farmerSales.reduce((sum, s) => sum + Number(s.quantity || 0), 0);

  return (
    <div className="min-h-screen bg-[#F6F8F5] text-slate-900 flex flex-col font-sans pb-20 md:pb-0 relative">
      {/* Toast Notification */}
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

      {/* 1. TOP UTILITY BAR */}
      <div className="bg-[#0F3822] text-emerald-100 text-[11px] sm:text-xs py-1.5 sm:py-2 px-3 sm:px-8 border-b border-emerald-900">
        <div className="max-w-7xl mx-auto flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-3 sm:gap-4">
            <span className="flex items-center gap-1 font-medium">
              <Phone className="w-3 h-3 sm:w-3.5 sm:h-3.5 text-amber-400" /> +977-1-4423456
            </span>
            <span className="hidden md:inline-flex items-center gap-1.5 text-emerald-200">
              • <TrendingUp className="w-3.5 h-3.5 text-amber-400" /> Kalimati Mandi Rate: Tomato रु 65/kg Today
            </span>
          </div>
          <div className="flex items-center gap-2 sm:gap-4">
            <span className="bg-emerald-900/80 px-2 py-0.5 rounded text-[10px] font-semibold text-amber-300">
              EN / नेपाली
            </span>
            <span className="flex items-center gap-1 font-medium">
              <MapPin className="w-3 h-3 sm:w-3.5 sm:h-3.5 text-amber-400" />{" "}
              {user?.location || "Nepal Agricultural Hub"}
            </span>
          </div>
        </div>
      </div>

      {/* 2. MAIN HEADER (DARAZ STYLE) */}
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
                Farm-Fresh Produce
              </span>
            </div>
          </div>

          {/* Search Bar */}
          <div className="hidden lg:flex items-center flex-1 max-w-xl bg-slate-100/90 border border-slate-200 rounded-full px-2 py-1 focus-within:border-[#14532D] focus-within:bg-white transition">
            <span className="px-3 py-1 text-xs font-bold text-slate-600 border-r border-slate-200">
              All ▾
            </span>
            <input
              type="text"
              placeholder="Search organic spinach, Mustang apples, Jumla Marsi rice..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="flex-1 px-3 py-1.5 text-xs bg-transparent outline-none text-slate-800"
            />
            <button
              onClick={() => {
                setActiveTab("home");
                document.getElementById("fresh-harvests")?.scrollIntoView({ behavior: "smooth" });
              }}
              className="w-8 h-8 rounded-full bg-[#14532D] text-white flex items-center justify-center hover:bg-[#1B4332] cursor-pointer"
            >
              <Search className="w-4 h-4" />
            </button>
          </div>

          {/* Right Controls */}
          <div className="flex items-center gap-2 sm:gap-3">
            <button
              onClick={() => setBasketDrawerOpen(true)}
              className="relative p-2 sm:p-2.5 rounded-full bg-slate-100 hover:bg-amber-50 text-slate-700 cursor-pointer"
              title="Your Basket"
            >
              <ShoppingBag className="w-4 h-4 text-[#14532D]" />
              <span className="absolute -top-1 -right-1 px-1.5 py-0.2 rounded-full bg-amber-500 text-slate-950 text-[10px] font-extrabold">
                {totalBasketItems}
              </span>
            </button>

            {user ? (
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

                {/* Profile Avatar Badge */}
                <button
                  onClick={() => setProfileModalOpen(true)}
                  className="flex items-center gap-2 bg-slate-50 hover:bg-slate-100 border border-slate-200/80 rounded-full p-1 sm:pl-1.5 sm:pr-3 sm:py-1 text-left transition cursor-pointer"
                  title="Click to view & change profile picture"
                >
                  <div className="w-8 h-8 rounded-full bg-emerald-800 text-white flex items-center justify-center text-xs font-bold shrink-0 overflow-hidden border border-emerald-700">
                    {user.profile_picture ? (
                      <img
                        src={
                          user.profile_picture.startsWith("http")
                            ? user.profile_picture
                            : `${BACKEND_URL}${user.profile_picture}`
                        }
                        alt={user.full_name}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <span>{user.full_name?.charAt(0).toUpperCase()}</span>
                    )}
                  </div>
                  <div className="hidden sm:block leading-tight">
                    <p className="text-xs font-bold text-slate-900 truncate max-w-[105px]">
                      {user.full_name}
                    </p>
                    <p className="text-[10px] text-emerald-700 font-semibold flex items-center gap-1">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                      {user.role === "FARMER" ? "Farmer" : user.role === "ADMIN" ? "Admin" : "Buyer"}
                    </p>
                  </div>
                </button>

                {/* ONLY FARMERS & ADMIN GET THE SELL BUTTON */}
                {isFarmer && (
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
              </>
            ) : (
              <div className="flex items-center gap-2">
                <button
                  onClick={() => {
                    setAuthModalTab("login");
                    setAuthModalOpen(true);
                  }}
                  className="px-3 sm:px-4 py-2 rounded-full border border-slate-200 hover:bg-slate-50 text-slate-800 text-xs font-bold cursor-pointer"
                >
                  Sign In
                </button>
                <button
                  onClick={() => {
                    setAuthModalTab("register");
                    setAuthModalOpen(true);
                  }}
                  className="px-3.5 sm:px-4 py-2 rounded-full bg-[#14532D] hover:bg-[#1B4332] text-white text-xs font-bold shadow-sm cursor-pointer"
                >
                  Register
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Sub-Navigation Bar */}
        <div className="hidden md:block bg-white border-t border-slate-100">
          <div className="max-w-7xl mx-auto px-4 sm:px-8 py-2 flex flex-wrap items-center justify-between gap-3">
            <nav className="flex flex-wrap items-center gap-1 sm:gap-2">
              {[
                { id: "home", label: "Home" },
                { id: "marketplace", label: "Shop Products" },
                ...(isFarmer ? [{ id: "sell", label: "Sell Your Harvest" }] : []),
                ...(isFarmer ? [{ id: "farmer_sales", label: `Sold to Admin (${farmerSales.length})` }] : []),
                ...(user ? [{ id: "orders", label: `My Orders (${myOrders.length})` }] : []),
                { id: "stories", label: "Farmer Stories" },
                ...(user ? [{ id: "chat", label: "Chat with Admin" }] : []),
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

            {user && (user.is_staff || user.role === "ADMIN") && (
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
      </header>

      {/* MAIN VIEW */}
      <main className="flex-1">
        {/* ADMIN CONTROL PANEL */}
        {activeTab === "admin" && user && (user.is_staff || user.role === "ADMIN") && (
          <div className="max-w-7xl mx-auto px-3 sm:px-8 py-6 sm:py-8">
            <AdminPanel />
          </div>
        )}

        {/* FARMER'S "SOLD TO ADMIN / MANAGER" REPORT */}
        {activeTab === "farmer_sales" && isFarmer && (
          <div className="max-w-6xl mx-auto px-4 sm:px-8 py-8 space-y-6">
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div>
                <span className="text-xs font-bold text-emerald-700 uppercase tracking-wider">
                  Farmer Earnings & Procurement Report
                </span>
                <h2 className="text-2xl font-black text-slate-900 mt-1">
                  Crops Sold to KrishiMart Admin
                </h2>
                <p className="text-xs text-slate-500">
                  Detailed payout ledger of all harvests bought by the KrishiMart management.
                </p>
              </div>
              <button
                onClick={() => setActiveTab("sell")}
                className="px-4 py-2.5 rounded-xl bg-[#14532D] text-white text-xs font-bold cursor-pointer"
              >
                + Offer New Harvest Batch
              </button>
            </div>

            {/* Farmer Earnings KPI Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="bg-white p-5 rounded-3xl border border-slate-200 shadow-2xs">
                <span className="text-xs font-bold text-slate-400 uppercase">Total Revenue Earned</span>
                <p className="text-2xl font-black text-[#14532D] mt-1">
                  रु {totalFarmerEarnings.toLocaleString()}
                </p>
                <span className="text-[11px] text-emerald-700 font-semibold">Direct farmer payouts</span>
              </div>
              <div className="bg-white p-5 rounded-3xl border border-slate-200 shadow-2xs">
                <span className="text-xs font-bold text-slate-400 uppercase">Total Crops Delivered</span>
                <p className="text-2xl font-black text-slate-900 mt-1">
                  {totalFarmerWeight.toLocaleString()} <span className="text-sm font-normal text-slate-500">kg/units</span>
                </p>
                <span className="text-[11px] text-slate-500 font-semibold">Collected by KrishiMart</span>
              </div>
              <div className="bg-white p-5 rounded-3xl border border-slate-200 shadow-2xs">
                <span className="text-xs font-bold text-slate-400 uppercase">Successful Batches Sold</span>
                <p className="text-2xl font-black text-slate-900 mt-1">{farmerSales.length}</p>
                <span className="text-[11px] text-emerald-700 font-semibold">Settled transactions</span>
              </div>
            </div>

            {/* Sold Ledger Table */}
            {farmerSales.length === 0 ? (
              <div className="bg-white rounded-3xl p-12 text-center text-slate-500 border border-slate-200">
                You haven't had crops purchased by the Admin yet. Submit your harvest in "Sell Your Harvest"!
              </div>
            ) : (
              <div className="bg-white rounded-3xl border border-slate-200 overflow-hidden shadow-2xs divide-y divide-slate-100">
                <div className="p-4 bg-slate-50 font-bold text-xs text-slate-600 grid grid-cols-12 gap-2">
                  <span className="col-span-3">Crop Name</span>
                  <span className="col-span-2">Quantity Sold</span>
                  <span className="col-span-2">Agreed Rate</span>
                  <span className="col-span-2">Total Payout</span>
                  <span className="col-span-2">Payment Status</span>
                  <span className="col-span-1 text-right">Date</span>
                </div>
                {farmerSales.map((s) => (
                  <div key={s.id} className="p-4 text-xs grid grid-cols-12 gap-2 items-center hover:bg-slate-50/70">
                    <div className="col-span-3">
                      <p className="font-extrabold text-slate-900 text-sm">{s.crop_name}</p>
                      <span className="text-[11px] text-emerald-700 font-semibold">{s.category}</span>
                    </div>
                    <div className="col-span-2 font-bold text-slate-800">
                      {s.quantity} {s.unit}
                    </div>
                    <div className="col-span-2 text-slate-700">
                      रु {s.agreed_wholesale_rate} / {s.unit}
                    </div>
                    <div className="col-span-2 font-black text-base text-[#14532D]">
                      रु {s.total_amount}
                    </div>
                    <div className="col-span-2">
                      <span className="px-2.5 py-1 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800">
                        {s.payment_status} ({s.payment_method})
                      </span>
                    </div>
                    <div className="col-span-1 text-right text-slate-400">
                      {new Date(s.created_at).toLocaleDateString()}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* "SELL YOUR HARVEST" (STRICTLY FOR FARMERS) */}
        {activeTab === "sell" && isFarmer && (
          <div className="max-w-7xl mx-auto px-4 sm:px-8 py-6 sm:py-10">
            <div className="grid lg:grid-cols-5 gap-6 sm:gap-8">
              <form
                onSubmit={handleSellSubmit}
                className="lg:col-span-3 bg-white rounded-3xl p-5 sm:p-8 shadow-sm border border-slate-200 space-y-4"
              >
                <div>
                  <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-100 text-[#14532D] text-xs font-bold">
                    <Sprout className="w-3.5 h-3.5" /> Farmer Wholesale Portal
                  </span>
                  <h2 className="text-xl sm:text-2xl font-extrabold text-slate-900 mt-2">
                    Sell Your Harvest to KrishiMart Admin
                  </h2>
                  <p className="text-xs text-slate-500 mt-1">
                    Set your <strong>Wholesale Rate (थोक मूल्य)</strong>. Our Admin reviews and buys directly from you.
                  </p>
                </div>

                <div className="grid sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      Vegetable / Crop Name *
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. Cabbage"
                      value={sellForm.vegetable_name}
                      onChange={(e) =>
                        setSellForm({ ...sellForm, vegetable_name: e.target.value })
                      }
                      className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">Category *</label>
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
                    <label className="block text-xs font-bold text-slate-700 mb-1">Quantity *</label>
                    <input
                      type="number"
                      required
                      placeholder="e.g. 20"
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
                      <option value="kg">kg</option>
                      <option value="quintal">quintal</option>
                      <option value="crate">crate</option>
                      <option value="bundle">bundle</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      Wholesale Price (रु/Unit) *
                    </label>
                    <input
                      type="number"
                      required
                      placeholder="e.g. 25"
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
                      Farmer Phone *
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="9868289311"
                      value={sellForm.contact_phone}
                      onChange={(e) =>
                        setSellForm({ ...sellForm, contact_phone: e.target.value })
                      }
                      className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      Pickup Farm Location *
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="Dhangadhi / Kavre"
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
                    Description & Harvest Date *
                  </label>
                  <textarea
                    rows={3}
                    required
                    placeholder="Describe freshness, pesticide-free details, and harvest date..."
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
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) {
                        setSellForm({ ...sellForm, image: file });
                        setSellImagePreview(URL.createObjectURL(file));
                      }
                    }}
                    className="w-full text-xs text-slate-600"
                  />
                  {sellImagePreview && (
                    <div className="relative w-32 h-24 rounded-xl overflow-hidden border border-slate-200">
                      <img src={sellImagePreview} alt="Preview" className="w-full h-full object-cover" />
                      <button
                        type="button"
                        onClick={() => {
                          setSellImagePreview(null);
                          setSellForm({ ...sellForm, image: null });
                        }}
                        className="absolute top-1 right-1 p-1 rounded-full bg-black/60 text-white"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  )}
                </div>

                <button
                  type="submit"
                  className="w-full py-3.5 bg-[#14532D] hover:bg-[#1B4332] text-white font-bold rounded-xl shadow-md cursor-pointer"
                >
                  Submit Wholesale Harvest to Admin
                </button>
              </form>

              {/* Farmer's Submitted Batches */}
              <div className="lg:col-span-2 space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-bold text-slate-900">
                    Your Submitted Batches ({mySubmissions.length})
                  </h3>
                  <button
                    onClick={() => setActiveTab("farmer_sales")}
                    className="text-xs text-emerald-800 font-bold underline"
                  >
                    View Sales Ledger →
                  </button>
                </div>

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
                        <span
                          className={`px-2.5 py-0.5 rounded-full text-[11px] font-bold ${
                            s.status === "BOUGHT"
                              ? "bg-emerald-600 text-white"
                              : s.status === "APPROVED"
                              ? "bg-emerald-100 text-emerald-800"
                              : s.status === "REJECTED"
                              ? "bg-red-100 text-red-700"
                              : "bg-amber-100 text-amber-800"
                          }`}
                        >
                          {s.status === "BOUGHT" ? "✓ BOUGHT BY ADMIN" : s.status}
                        </span>
                      </div>
                      <p className="text-xs text-slate-600">{s.vegetable_description}</p>
                      <p className="text-xs font-bold text-[#14532D]">
                        {s.quantity} {s.unit} @ रु {s.expected_price_per_unit}/{s.unit} • 📍{" "}
                        {s.pickup_location}
                      </p>
                      {s.admin_remarks && (
                        <div className="p-2.5 rounded-xl bg-emerald-50 text-xs text-emerald-900 border border-emerald-100">
                          <strong>Admin Note:</strong> {s.admin_remarks}
                        </div>
                      )}
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        )}

        {/* ORDERS VIEW */}
        {activeTab === "orders" && user && (
          <div className="max-w-5xl mx-auto px-4 sm:px-8 py-6 sm:py-10 space-y-6">
            <h2 className="text-xl sm:text-2xl font-extrabold text-slate-900">My Orders</h2>
            {myOrders.length === 0 ? (
              <div className="bg-white rounded-3xl p-10 text-center border border-slate-200 space-y-2">
                <PackageCheck className="w-10 h-10 text-slate-400 mx-auto" />
                <p className="text-sm font-bold text-slate-700">No orders placed yet</p>
              </div>
            ) : (
              <div className="space-y-3">
                {myOrders.map((o) => (
                  <div
                    key={o.id}
                    className="bg-white rounded-2xl p-4 sm:p-5 border border-slate-200 shadow-2xs flex flex-wrap items-center justify-between gap-4"
                  >
                    <div>
                      <span className="text-xs font-extrabold text-slate-400">#{o.id}</span>
                      <h3 className="font-bold text-slate-900">{o.product_name}</h3>
                      <p className="text-xs text-slate-500">
                        Qty: {o.quantity} {o.product_unit} • {o.delivery_address}
                      </p>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="text-base font-black text-[#14532D]">रु {o.total_price}</span>
                      {o.status === "PENDING" && (
                        <button
                          onClick={() => handleCancelOrder(o.id)}
                          className="px-3 py-1.5 rounded-xl bg-red-50 text-red-700 text-xs font-bold cursor-pointer"
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

        {/* MAIN DARAZ-STYLE HOMEPAGE & MARKETPLACE */}
        {(activeTab === "home" || activeTab === "marketplace" || activeTab === "stories") && (
          <>
            {activeTab === "home" && (
              <section className="relative bg-gradient-to-b from-[#EBF3EC] to-[#F6F8F5] pt-6 sm:pt-8 pb-10 sm:pb-12 px-4 sm:px-8">
                <div className="max-w-7xl mx-auto grid lg:grid-cols-12 gap-8 sm:gap-10 items-center">
                  <div className="lg:col-span-7 space-y-5 sm:space-y-6">
                    <span className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-emerald-900/10 text-[#14532D] text-[11px] sm:text-xs font-bold">
                      🌱 Empowering 12,000+ Local Farmers Across Nepal
                    </span>
                    <h1 className="text-3xl sm:text-5xl lg:text-[54px] font-black tracking-tight leading-[1.12] text-slate-900">
                      Fresh From the Farm.
                      <span className="block text-[#14532D] mt-1">Straight to You.</span>
                    </h1>
                    <p className="text-slate-600 text-sm sm:text-lg max-w-xl leading-relaxed">
                      Discover crisp mountain produce, connect directly with verified growers, and
                      enjoy farm-to-table delivery across Nepal.
                    </p>
                    <div className="flex flex-wrap items-center gap-3 pt-1">
                      <a
                        href="#fresh-harvests"
                        className="px-6 py-3.5 rounded-xl bg-[#14532D] hover:bg-[#1B4332] text-white font-bold text-xs sm:text-sm flex items-center gap-2 shadow-md"
                      >
                        Explore Store Products <ArrowRight className="w-4 h-4" />
                      </a>
                      {isFarmer ? (
                        <button
                          onClick={() => setActiveTab("sell")}
                          className="px-6 py-3.5 rounded-xl bg-[#FDE68A] hover:bg-[#FCD34D] text-slate-900 font-bold text-xs sm:text-sm flex items-center gap-2 shadow-xs cursor-pointer"
                        >
                          🌾 Sell Your Harvest
                        </button>
                      ) : !user ? (
                        <button
                          onClick={() => {
                            setAuthModalTab("register");
                            setAuthModalOpen(true);
                          }}
                          className="px-6 py-3.5 rounded-xl bg-[#FDE68A] hover:bg-[#FCD34D] text-slate-900 font-bold text-xs sm:text-sm flex items-center gap-2 shadow-xs cursor-pointer"
                        >
                          🌾 Register as Farmer to Sell
                        </button>
                      ) : null}
                    </div>
                  </div>
                  <div className="lg:col-span-5">
                    <img
                      src="https://images.unsplash.com/photo-1500937386664-56d1dfef3854?auto=format&fit=crop&w=900&q=80"
                      alt="Nepali Farm"
                      className="w-full h-64 sm:h-[360px] object-cover rounded-3xl shadow-xl"
                    />
                  </div>
                </div>
              </section>
            )}

            {/* Categories */}
            <section className="max-w-7xl mx-auto px-4 sm:px-8 py-8 sm:py-10 space-y-5">
              <h2 className="text-xl sm:text-3xl font-black text-slate-900">Explore by Category</h2>
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
                    className="group bg-white rounded-2xl p-2.5 sm:p-3 border border-slate-200 shadow-2xs hover:shadow-md transition cursor-pointer"
                  >
                    <div className="relative rounded-xl overflow-hidden h-28 sm:h-36 mb-2">
                      <img
                        src={cat.image}
                        alt={cat.title}
                        className="w-full h-full object-cover group-hover:scale-105 transition duration-300"
                      />
                      <span className="absolute top-2 left-2 px-2 py-0.5 rounded-full bg-white text-slate-800 text-[10px] font-bold">
                        {cat.badge}
                      </span>
                    </div>
                    <h3 className="font-bold text-xs sm:text-sm text-slate-900 group-hover:text-[#14532D]">
                      {cat.title}
                    </h3>
                  </div>
                ))}
              </div>
            </section>

            {/* Fresh Daily Harvests */}
            <section
              id="fresh-harvests"
              className="max-w-7xl mx-auto px-4 sm:px-8 py-6 sm:py-8 space-y-6"
            >
              <div className="flex flex-wrap items-end justify-between gap-4">
                <div>
                  <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-emerald-100 text-[#14532D] text-[11px] font-bold">
                    ● Live Farm Marketplace ({filteredProducts.length} Items)
                  </span>
                  <h2 className="text-xl sm:text-3xl font-black text-slate-900 mt-1">
                    Fresh Daily Harvests
                  </h2>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5 sm:gap-6">
                {filteredProducts.map((p) => {
                  const imgUrl = getProductImage(p);
                  return (
                    <div
                      key={p.id}
                      className="bg-white rounded-3xl p-3.5 border border-slate-200 shadow-xs hover:shadow-lg transition flex flex-col justify-between"
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
                          <span className="absolute top-3 left-3 px-2.5 py-1 rounded-full bg-white text-slate-800 text-[11px] font-bold flex items-center gap-1 shadow-xs">
                            <MapPin className="w-3 h-3 text-emerald-700" />
                            {p.origin_location || "Nepal Farm"}
                          </span>
                        </div>
                        <h3 className="font-extrabold text-base text-slate-900">{p.name}</h3>
                        <p className="text-xs text-slate-500 line-clamp-2 mt-1">{p.description}</p>
                        <p className="text-xl font-black text-slate-900 mt-2">
                          रु {p.price} <span className="text-xs text-slate-500 font-normal">/ {p.unit}</span>
                        </p>
                      </div>

                      <div className="mt-4 pt-3 border-t border-slate-100 flex items-center gap-2">
                        <button
                          onClick={() => handleAddToBasket(p, 1)}
                          className="flex-1 py-2.5 px-4 rounded-xl bg-[#14532D] hover:bg-[#1B4332] text-white text-xs font-bold flex items-center justify-center gap-2 transition cursor-pointer"
                        >
                          <ShoppingBag className="w-3.5 h-3.5" /> Buy / Add to Basket
                        </button>
                        <button
                          onClick={() => {
                            setQuickViewProduct(p);
                            setQuickViewQty(1);
                          }}
                          className="p-2.5 rounded-xl border border-slate-200 text-slate-500 hover:text-[#14532D] cursor-pointer"
                          title="View Details"
                        >
                          <Eye className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </section>
          </>
        )}
      </main>

      {/* AUTH POPUP MODAL FOR VISITORS */}
      {authModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <AuthView
            initialTab={authModalTab}
            onAuthSuccess={(u) => {
              setUser(u);
              setAuthModalOpen(false);
              showToast(`Welcome, ${u.full_name}!`);
            }}
            onCancel={() => setAuthModalOpen(false)}
          />
        </div>
      )}

      {/* USER PROFILE MODAL */}
      {profileModalOpen && user && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 space-y-4 shadow-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-extrabold text-slate-900">Your Profile & Photo</h3>
              <button
                onClick={() => setProfileModalOpen(false)}
                className="p-1 text-slate-400 hover:text-slate-700 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleUpdateProfile} className="space-y-3.5">
              <div className="flex items-center gap-4 py-2 border-b border-slate-100">
                <div className="relative w-16 h-16 rounded-full bg-slate-100 border-2 border-emerald-600/30 overflow-hidden flex items-center justify-center shrink-0">
                  {profileAvatarPreview ? (
                    <img src={profileAvatarPreview} alt="Preview" className="w-full h-full object-cover" />
                  ) : user.profile_picture ? (
                    <img
                      src={
                        user.profile_picture.startsWith("http")
                          ? user.profile_picture
                          : `${BACKEND_URL}${user.profile_picture}`
                      }
                      alt={user.full_name}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <User className="w-8 h-8 text-slate-400" />
                  )}
                </div>
                <div>
                  <label
                    htmlFor="edit-profile-avatar"
                    className="px-3 py-1.5 rounded-xl border border-slate-200 hover:bg-slate-50 text-slate-700 text-xs font-bold flex items-center gap-1.5 cursor-pointer"
                  >
                    <Camera className="w-3.5 h-3.5 text-emerald-700" /> Change Photo
                  </label>
                  <input
                    id="edit-profile-avatar"
                    type="file"
                    accept="image/*"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) {
                        setProfileAvatarFile(file);
                        setProfileAvatarPreview(URL.createObjectURL(file));
                      }
                    }}
                    className="hidden"
                  />
                  <span className="text-[10px] text-slate-400 block mt-0.5">JPG/PNG</span>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Full Name</label>
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
                <label className="block text-xs font-bold text-slate-700 mb-1">Delivery / Farm Location</label>
                <input
                  type="text"
                  value={profileForm.location}
                  onChange={(e) => setProfileForm({ ...profileForm, location: e.target.value })}
                  className="w-full px-3.5 py-2 rounded-xl border border-slate-200 text-sm"
                />
              </div>

              <button
                type="submit"
                className="w-full py-2.5 rounded-xl bg-[#14532D] text-white text-xs font-bold cursor-pointer"
              >
                Save Profile Changes & Photo
              </button>
            </form>

            <form onSubmit={handleChangePassword} className="pt-3 border-t border-slate-200 space-y-2.5">
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-700">Change Password</h4>
              <input
                type="password"
                required
                placeholder="Current Password"
                value={passwordForm.current_password}
                onChange={(e) =>
                  setPasswordForm({ ...passwordForm, current_password: e.target.value })
                }
                className="w-full px-3.5 py-2 rounded-xl border border-slate-200 text-xs"
              />
              <input
                type="password"
                required
                minLength={8}
                placeholder="New Password (min 8 chars)"
                value={passwordForm.new_password}
                onChange={(e) => setPasswordForm({ ...passwordForm, new_password: e.target.value })}
                className="w-full px-3.5 py-2 rounded-xl border border-slate-200 text-xs"
              />
              <button
                type="submit"
                className="w-full py-2 rounded-xl bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold cursor-pointer"
              >
                Update Password
              </button>
            </form>
          </div>
        </div>
      )}

      {/* QUICK VIEW MODAL */}
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
                className="absolute top-3 right-3 p-2 rounded-full bg-black/60 text-white cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="p-6 space-y-3">
              <h3 className="text-xl font-extrabold text-slate-900">{quickViewProduct.name}</h3>
              <p className="text-xs sm:text-sm text-slate-600">{quickViewProduct.description}</p>
              <p className="text-2xl font-black text-[#14532D]">
                रु {quickViewProduct.price} / {quickViewProduct.unit}
              </p>
              <button
                onClick={() => {
                  handleAddToBasket(quickViewProduct, quickViewQty);
                  setQuickViewProduct(null);
                }}
                className="w-full py-3 rounded-xl bg-[#14532D] text-white text-xs font-bold cursor-pointer"
              >
                Add to Basket
              </button>
            </div>
          </div>
        </div>
      )}

      {/* BASKET DRAWER */}
      {basketDrawerOpen && (
        <div className="fixed inset-0 z-50 bg-black/40 flex justify-end">
          <div className="bg-white w-full max-w-md h-full shadow-2xl flex flex-col justify-between p-5 sm:p-6 overflow-y-auto">
            <div>
              <div className="flex items-center justify-between border-b border-slate-200 pb-3">
                <h3 className="text-lg font-extrabold text-slate-900">Your Basket ({totalBasketItems})</h3>
                <button onClick={() => setBasketDrawerOpen(false)} className="p-1.5 text-slate-500">
                  <X className="w-5 h-5" />
                </button>
              </div>
              <div className="divide-y divide-slate-100 py-3">
                {basket.map((item) => (
                  <div key={item.id} className="py-2.5 flex items-center justify-between">
                    <div>
                      <p className="font-bold text-sm text-slate-900">{item.name}</p>
                      <p className="text-xs text-slate-500">रु {item.price} / {item.unit}</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => handleUpdateBasketQty(item.id, -1)}
                        className="w-6 h-6 border rounded flex items-center justify-center"
                      >
                        -
                      </button>
                      <span className="text-xs font-bold">{item.qty}</span>
                      <button
                        onClick={() => handleUpdateBasketQty(item.id, 1)}
                        className="w-6 h-6 border rounded flex items-center justify-center"
                      >
                        +
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {basket.length > 0 && (
              <form onSubmit={handleCheckoutBasket} className="border-t border-slate-200 pt-3 space-y-2.5">
                <div className="flex justify-between font-bold text-sm">
                  <span>Total:</span>
                  <span className="text-[#14532D]">रु {basketTotal}</span>
                </div>
                <input
                  type="text"
                  required
                  placeholder="Delivery Phone *"
                  value={checkoutPhone}
                  onChange={(e) => setCheckoutPhone(e.target.value)}
                  className="w-full px-3 py-2 border rounded-xl text-xs"
                />
                <input
                  type="text"
                  required
                  placeholder="Delivery Address *"
                  value={checkoutAddress}
                  onChange={(e) => setCheckoutAddress(e.target.value)}
                  className="w-full px-3 py-2 border rounded-xl text-xs"
                />
                <div className="grid grid-cols-3 gap-1.5 text-[11px] font-bold">
                  {["COD", "ESEWA", "KHALTI"].map((m) => (
                    <button
                      key={m}
                      type="button"
                      onClick={() => setPaymentMethod(m)}
                      className={`py-1.5 border rounded-lg ${
                        paymentMethod === m ? "bg-emerald-50 border-[#14532D] text-[#14532D]" : "text-slate-600"
                      }`}
                    >
                      {m}
                    </button>
                  ))}
                </div>
                <button
                  type="submit"
                  disabled={checkingOut}
                  className="w-full py-3 bg-[#14532D] text-white font-bold rounded-xl text-xs cursor-pointer"
                >
                  {checkingOut ? "Placing Order..." : `Confirm Order (रु ${basketTotal})`}
                </button>
              </form>
            )}
          </div>
        </div>
      )}

      {/* MOBILE BOTTOM NAVIGATION BAR */}
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

        {isFarmer && (
          <button onClick={() => setActiveTab("sell")} className="flex flex-col items-center -mt-5">
            <div className="w-11 h-11 rounded-full bg-[#14532D] text-amber-400 flex items-center justify-center shadow-md border-4 border-white">
              <Plus className="w-5 h-5" />
            </div>
            <span className="text-[10px] font-extrabold text-[#14532D] mt-0.5">Sell</span>
          </button>
        )}

        {isFarmer && (
          <button
            onClick={() => setActiveTab("farmer_sales")}
            className={`flex flex-col items-center gap-0.5 py-1 px-2 rounded-xl text-[10px] font-bold ${
              activeTab === "farmer_sales" ? "text-[#14532D]" : "text-slate-400"
            }`}
          >
            <Receipt className="w-5 h-5" />
            <span>Sales</span>
          </button>
        )}

        {user && !isFarmer && (
          <button
            onClick={() => setActiveTab("orders")}
            className={`flex flex-col items-center gap-0.5 py-1 px-2 rounded-xl text-[10px] font-bold ${
              activeTab === "orders" ? "text-[#14532D]" : "text-slate-400"
            }`}
          >
            <PackageCheck className="w-5 h-5" />
            <span>Orders</span>
          </button>
        )}

        {user ? (
          <button
            onClick={() => setProfileModalOpen(true)}
            className="flex flex-col items-center gap-0.5 py-1 px-2 rounded-xl text-[10px] font-bold text-slate-400"
          >
            <User className="w-5 h-5" />
            <span>Profile</span>
          </button>
        ) : (
          <button
            onClick={() => {
              setAuthModalTab("login");
              setAuthModalOpen(true);
            }}
            className="flex flex-col items-center gap-0.5 py-1 px-2 rounded-xl text-[10px] font-bold text-slate-400"
          >
            <LogIn className="w-5 h-5" />
            <span>Sign In</span>
          </button>
        )}
      </nav>
    </div>
  );
}