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
  EyeOff,
  Trash2,
  Camera,
  LogIn,
  Receipt,
  Star,
  BookOpen,
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

  // Language Toggle ("EN" | "NP")
  const [lang, setLang] = useState("EN");
  const tr = (enText, npText) => (lang === "NP" ? npText : enText);

  // Printable 1/4 A4 Slip State (Customer Order or Farmer Sale)
  const [activeSlip, setActiveSlip] = useState(null);

  // Real Stories & Reviews (with Optional Photo Upload)
  const [stories, setStories] = useState([]);
  const [storyModalOpen, setStoryModalOpen] = useState(false);
  const [storyForm, setStoryForm] = useState({ title: "", content: "", rating: 5 });
  const [storyImageFile, setStoryImageFile] = useState(null);
  const [storyImagePreview, setStoryImagePreview] = useState(null);

  // Farmer's Sales to Admin Ledger
  const [farmerSales, setFarmerSales] = useState([]);

  // Product Quick-View Modal
  const [quickViewProduct, setQuickViewProduct] = useState(null);
  const [quickViewQty, setQuickViewQty] = useState(1);

  // Persistent Basket Drawer & Payment Method
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

  // Profile & Password Modal State
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
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);

  // Farmer Wholesale Portal State
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

  // Live Chat State
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

  const isAdmin = Boolean(user && (user.is_staff || user.role === "ADMIN"));
  const isVerifiedOrAdmin = Boolean(user && (user.is_admin_verified || isAdmin));
  const isFarmer = Boolean(user && user.role === "FARMER" && !isAdmin);

  const loadPublicData = async () => {
    try {
      const [prodRes, storyRes] = await Promise.all([
        api.get("/marketplace/products/"),
        api.get("/marketplace/stories/"),
      ]);
      setDbProducts(prodRes.data);
      setStories(storyRes.data);
    } catch (err) {
      console.error("Public data sync error:", err);
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

  // Real-time background polling every 4 seconds
  useEffect(() => {
    loadPublicData();
    if (user) {
      loadUserData();
    }
    const interval = setInterval(() => {
      loadPublicData();
      if (user) loadUserData();
    }, 4000);
    return () => clearInterval(interval);
  }, [user, activeTab]);

  // Poll Chat Messages
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
      await loadPublicData();
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
      loadPublicData();
    } catch {
      showToast("Could not cancel order.", "error");
    }
  };

  const handleStorySubmit = async (e) => {
    e.preventDefault();
    try {
      const formData = new FormData();
      formData.append("title", storyForm.title.trim());
      formData.append("content", storyForm.content.trim());
      formData.append("rating", storyForm.rating);
      formData.append(
        "story_type",
        user.role === "FARMER" ? "FARMER_STORY" : "BUYER_REVIEW"
      );
      if (storyImageFile instanceof File) {
        formData.append("image", storyImageFile);
      }

      await api.post("/marketplace/stories/", formData);
      showToast(
        "Thank you! Your story/review was sent to the Admin and will appear once approved."
      );
      setStoryModalOpen(false);
      setStoryForm({ title: "", content: "", rating: 5 });
      setStoryImageFile(null);
      setStoryImagePreview(null);
    } catch {
      showToast("Failed to submit story/review.", "error");
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
      showToast(res.data.message || "Password updated successfully!");
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

  const handleDeleteSubmission = async (subId, name) => {
    try {
      await api.delete(`/marketplace/sell-submissions/${subId}/`);
      showToast(`Withdrew "${name}" offer.`);
      loadUserData();
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

  const handleDeleteMyMessage = async (msgId) => {
    try {
      await api.delete(`/chat/messages/${msgId}/`);
      setMessages((prev) => prev.filter((m) => m.id !== msgId));
    } catch {
      showToast("You can only delete your own sent messages.", "error");
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

  const totalFarmerEarnings = farmerSales.reduce((sum, s) => sum + Number(s.total_amount || 0), 0);
  const totalFarmerWeight = farmerSales.reduce((sum, s) => sum + Number(s.quantity || 0), 0);

  const approvedFarmerStories = stories.filter((s) => s.story_type === "FARMER_STORY");
  const approvedBuyerReviews = stories.filter((s) => s.story_type === "BUYER_REVIEW");

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
            <button
              type="button"
              onClick={() => {
                const nextLang = lang === "EN" ? "NP" : "EN";
                setLang(nextLang);
                showToast(
                  nextLang === "NP"
                    ? "भाषा नेपालीमा परिवर्तन गरियो (Switched to Nepali)"
                    : "Language switched to English"
                );
              }}
              className="bg-emerald-900/80 hover:bg-emerald-800 px-2.5 py-0.5 rounded text-[10px] font-bold text-amber-300 border border-amber-400/30 transition cursor-pointer"
              title="Click to switch between English and Nepali"
            >
              {lang === "EN" ? "🌐 EN / नेपाली" : "🌐 नेपाली / EN"}
            </button>
            <span className="flex items-center gap-1 font-medium truncate max-w-[160px] sm:max-w-none">
              <MapPin className="w-3 h-3 sm:w-3.5 sm:h-3.5 text-amber-400 shrink-0" />{" "}
              {user?.location || "Dhangadhi & Kathmandu Hub"}
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

          {/* Desktop Search Bar */}
          <div className="hidden lg:flex items-center flex-1 max-w-xl bg-slate-100/90 border border-slate-200 rounded-full px-2 py-1 focus-within:border-[#14532D] focus-within:bg-white transition">
            <span className="px-3 py-1 text-xs font-bold text-slate-600 border-r border-slate-200">
              All ▾
            </span>
            <input
              type="text"
              placeholder="Search organic spinach, Mustang apples, Jumla Marsi rice..."
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

          {/* Right User Controls */}
          <div className="flex items-center gap-1.5 sm:gap-3">
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

            {user ? (
              <>
                {!isAdmin && (
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
                )}

                {/* User Avatar Badge with Real Profile Picture */}
                <button
                  onClick={() => setProfileModalOpen(true)}
                  className="flex items-center gap-2 bg-slate-50 hover:bg-slate-100 border border-slate-200/80 rounded-full p-1 sm:pl-1.5 sm:pr-3 sm:py-1 text-left transition cursor-pointer"
                  title="Click to Edit Profile & Password"
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
                      {isVerifiedOrAdmin ? `Verified ${user.role}` : "Pending Approval"}
                    </p>
                  </div>
                </button>

                {/* Strictly Farmer / Admin Only: "+ Sell Harvest" */}
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

        {/* Mobile Search Bar (Visible on Phones & Tablets < 1024px) */}
        <div className="lg:hidden px-3 pb-2.5">
          <div className="flex items-center bg-slate-100 border border-slate-200 rounded-full px-3 py-1.5">
            <Search className="w-4 h-4 text-slate-400 mr-2 shrink-0" />
            <input
              type="text"
              placeholder="Search vegetables, Mustang apples, Marsi rice..."
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

        {/* 3. DESKTOP / TABLET SUB-NAVIGATION BAR */}
        <div className="hidden md:block bg-white border-t border-slate-100">
          <div className="max-w-7xl mx-auto px-4 sm:px-8 py-2 flex flex-wrap items-center justify-between gap-3">
            <nav className="flex flex-wrap items-center gap-1 sm:gap-2">
              {[
                { id: "home", label: tr("Home", "गृहपृष्ठ") },
                { id: "marketplace", label: tr("Shop Products", "कृषि उपज किन्नुहोस्") },
                ...(isFarmer ? [{ id: "sell", label: tr("Sell Your Harvest", "उत्पादन बेच्नुहोस्") }] : []),
                ...(isFarmer
                  ? [{ id: "farmer_sales", label: tr(`Sold to Admin (${farmerSales.length})`, `बिक्री विवरण (${farmerSales.length})`) }]
                  : []),
                ...(user && !isAdmin
                  ? [{ id: "orders", label: tr(`My Orders (${myOrders.length})`, `मेरा अर्डरहरू (${myOrders.length})`) }]
                  : []),
                { id: "stories", label: tr("Farmer Stories & Reviews", "किसान कथा र समीक्षा") },
                ...(user && !isAdmin
                  ? [
                      {
                        id: "chat",
                        label:
                          unreadChatCount > 0
                            ? tr(`Chat with Admin (${unreadChatCount} new)`, `एडमिनसँग कुराकानी (${unreadChatCount})`)
                            : tr("Chat with Admin", "एडमिनसँग कुराकानी"),
                      },
                    ]
                  : []),
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

      {/* UNVERIFIED USER BANNER (IF LOGGED IN BUT NOT YET APPROVED BY ADMIN) */}
      {user && !isVerifiedOrAdmin && (
        <div className="bg-amber-50 border-b border-amber-200 px-4 py-2.5 text-center text-xs text-amber-900 flex flex-wrap items-center justify-center gap-3">
          <span className="font-medium">
            ⏳ Namaste <strong>{user.full_name}</strong>! Your account is currently{" "}
            <strong>Pending Admin Verification</strong>. You can browse the store, and full buying
            / selling features will unlock as soon as the Admin approves your account.
          </span>
          <button
            onClick={fetchCurrentUser}
            className="px-3 py-1 rounded-lg bg-[#14532D] text-white font-bold text-[11px] inline-flex items-center gap-1 cursor-pointer"
          >
            <RefreshCw className="w-3 h-3" /> Check Status
          </button>
        </div>
      )}

      {/* MAIN CONTENT */}
      <main className="flex-1">
        {/* ADMIN PANEL VIEW */}
        {activeTab === "admin" && (
          <div className="max-w-7xl mx-auto px-3 sm:px-8 py-6 sm:py-8">
            {user && (user.is_staff || user.role === "ADMIN") ? (
              <AdminPanel />
            ) : (
              <div className="max-w-md mx-auto my-12 bg-white p-6 sm:p-8 rounded-3xl shadow-lg border border-red-200 text-center space-y-4">
                <ShieldAlert className="w-12 h-12 text-red-600 mx-auto" />
                <h2 className="text-xl font-extrabold text-slate-900">
                  Admin Privileges Required
                </h2>
                <p className="text-xs text-slate-600 leading-relaxed">
                  Please sign in with an Admin account to access the Admin Control Panel.
                </p>
                <button
                  onClick={() => {
                    if (user) handleLogout();
                    setAuthModalTab("login");
                    setAuthModalOpen(true);
                  }}
                  className="w-full py-3 bg-[#14532D] text-white font-bold text-xs rounded-xl cursor-pointer"
                >
                  Sign In as Admin
                </button>
              </div>
            )}
          </div>
        )}

        {/* FARMER'S "SOLD TO ADMIN / MANAGER" FINANCIAL REPORT */}
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
                  Official payout ledger of all harvests purchased from you by KrishiMart.
                </p>
              </div>
              <button
                onClick={() => setActiveTab("sell")}
                className="px-4 py-2.5 rounded-xl bg-[#14532D] text-white text-xs font-bold cursor-pointer"
              >
                + Offer New Harvest Batch
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="bg-white p-5 rounded-3xl border border-slate-200 shadow-2xs">
                <span className="text-xs font-bold text-slate-400 uppercase">
                  Total Revenue Earned
                </span>
                <p className="text-2xl font-black text-[#14532D] mt-1">
                  रु {totalFarmerEarnings.toLocaleString()}
                </p>
                <span className="text-[11px] text-emerald-700 font-semibold">
                  Direct farmer payouts
                </span>
              </div>
              <div className="bg-white p-5 rounded-3xl border border-slate-200 shadow-2xs">
                <span className="text-xs font-bold text-slate-400 uppercase">
                  Total Crops Delivered
                </span>
                <p className="text-2xl font-black text-slate-900 mt-1">
                  {totalFarmerWeight.toLocaleString()}{" "}
                  <span className="text-sm font-normal text-slate-500">units</span>
                </p>
                <span className="text-[11px] text-slate-500 font-semibold">
                  Collected by KrishiMart
                </span>
              </div>
              <div className="bg-white p-5 rounded-3xl border border-slate-200 shadow-2xs">
                <span className="text-xs font-bold text-slate-400 uppercase">
                  Successful Batches Sold
                </span>
                <p className="text-2xl font-black text-slate-900 mt-1">{farmerSales.length}</p>
                <span className="text-[11px] text-emerald-700 font-semibold">
                  Verified transactions
                </span>
              </div>
            </div>

            {farmerSales.length === 0 ? (
              <div className="bg-white rounded-3xl p-12 text-center text-slate-500 border border-slate-200">
                No crops have been purchased by the Admin yet. Submit your harvest under "Sell Your
                Harvest"!
              </div>
            ) : (
              <div className="grid sm:grid-cols-2 gap-4">
                {farmerSales.map((s) => (
                  <div
                    key={s.id}
                    className="bg-white rounded-3xl p-5 border border-slate-200 shadow-2xs space-y-3"
                  >
                    <div className="flex items-start justify-between">
                      <div>
                        <span className="text-[10px] font-bold text-emerald-700 uppercase">
                          {s.category}
                        </span>
                        <h3 className="font-extrabold text-base text-slate-900">{s.crop_name}</h3>
                        <p className="text-xs text-slate-500">
                          Sold on {new Date(s.created_at).toLocaleDateString()}
                        </p>
                      </div>
                      <span className="px-2.5 py-1 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800">
                        {s.payment_status} ({s.payment_method})
                      </span>
                    </div>
                    <div className="p-3 bg-slate-50 rounded-2xl text-xs space-y-1">
                      <div className="flex justify-between">
                        <span>Quantity Sold:</span>
                        <strong>
                          {s.quantity} {s.unit}
                        </strong>
                      </div>
                      <div className="flex justify-between">
                        <span>Agreed Wholesale Rate:</span>
                        <strong>
                          रु {s.agreed_wholesale_rate} / {s.unit}
                        </strong>
                      </div>
                      <div className="flex justify-between border-t border-slate-200 pt-1 text-sm font-black text-[#14532D]">
                        <span>Total Payout Received:</span>
                        <span>रु {s.total_amount}</span>
                      </div>
                    </div>
                    {s.admin_notes && (
                      <p className="text-xs bg-emerald-50 p-2.5 rounded-xl text-emerald-950 border border-emerald-100">
                        <strong>Admin Receipt Note:</strong> {s.admin_notes}
                      </p>
                    )}
                    <div className="pt-2 border-t border-slate-100 flex items-center justify-between">
                      <span className="text-[11px] text-slate-400">
                        Voucher #{s.id}
                      </span>
                      <button
                        type="button"
                        onClick={() => setActiveSlip({ ...s, slipType: "FARMER_SALE" })}
                        className="px-3 py-1.5 rounded-xl border border-emerald-300 bg-emerald-50/60 hover:bg-emerald-100 text-[#14532D] text-xs font-bold flex items-center gap-1.5 transition cursor-pointer"
                      >
                        <Receipt className="w-3.5 h-3.5" /> View / Print 1/4 A4 Slip
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* DEDICATED "SELL YOUR HARVEST" PORTAL (FARMERS ONLY) */}
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
                    Enter your <strong>Wholesale Price (थोक मूल्य)</strong>, crop description,
                    contact number, and farm pickup location below.
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
                      Wholesale Price (रु / Unit) *
                    </label>
                    <input
                      type="number"
                      required
                      placeholder="e.g. 55"
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
                      Farmer Contact Phone *
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
                    Vegetable Description & Harvest Date *
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
                  Submit Wholesale Harvest to Admin
                </button>
              </form>

              <div className="lg:col-span-2 space-y-4">
                <div className="bg-[#14532D] text-white p-5 sm:p-6 rounded-3xl space-y-2">
                  <h3 className="font-extrabold text-base sm:text-lg">
                    Need Instant Rate Confirmation?
                  </h3>
                  <p className="text-xs text-emerald-100">
                    Chat directly with our KrishiMart Admin team to negotiate bulk rates or
                    schedule farm pickup.
                  </p>
                  <div className="flex flex-wrap gap-2 pt-1">
                    <button
                      onClick={() => setChatDrawerOpen(true)}
                      className="px-4 py-2 bg-amber-400 text-slate-950 font-bold text-xs rounded-xl inline-flex items-center gap-1.5 cursor-pointer"
                    >
                      <MessageCircle className="w-4 h-4" /> Live Chat with Admin
                    </button>
                    <button
                      onClick={() => setActiveTab("farmer_sales")}
                      className="px-4 py-2 bg-white/15 text-white font-bold text-xs rounded-xl inline-flex items-center gap-1.5 cursor-pointer"
                    >
                      <Receipt className="w-4 h-4" /> View Sold Report
                    </button>
                  </div>
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

        {/* DEDICATED "MY ORDERS" TRACKING VIEW */}
        {activeTab === "orders" && user && (
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
                      <button
                        type="button"
                        onClick={() => setActiveSlip({ ...o, slipType: "CUSTOMER_ORDER" })}
                        className="px-3 py-1.5 rounded-xl border border-emerald-300 bg-emerald-50/60 hover:bg-emerald-100 text-[#14532D] text-xs font-bold flex items-center gap-1.5 transition cursor-pointer"
                      >
                        <Receipt className="w-3.5 h-3.5" /> Receipt
                      </button>
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

        {/* DEDICATED CHAT VIEW */}
        {activeTab === "chat" && user && (
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

        {/* MAIN DARAZ-STYLE HOMEPAGE, MARKETPLACE & STORIES */}
        {(activeTab === "home" || activeTab === "marketplace" || activeTab === "stories") && (
          <>
            {/* 4. FULL HERO SECTION (SHOWN ON HOME) */}
            {activeTab === "home" && (
              <section className="relative bg-gradient-to-b from-[#EBF3EC] to-[#F6F8F5] pt-6 sm:pt-8 pb-10 sm:pb-12 px-4 sm:px-8">
                <div className="max-w-7xl mx-auto grid lg:grid-cols-12 gap-8 sm:gap-10 items-center">
                  <div className="lg:col-span-7 space-y-5 sm:space-y-6">
                    <span className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-emerald-900/10 text-[#14532D] text-[11px] sm:text-xs font-bold">
                      🌱 Empowering 100+ Local Farmers Across Nepal
                    </span>

                    <h1 className="text-3xl sm:text-5xl lg:text-[54px] font-black tracking-tight leading-[1.12] text-slate-900">
                      {tr("Fresh From the Farm.", "खेतबारीबाट सिधै ताजा उपज।")}
                      <span className="block text-[#14532D] mt-1">
                        {tr("Straight to You.", "तपाईंको भान्सासम्म।")}
                      </span>
                    </h1>

                    <p className="text-slate-600 text-sm sm:text-lg max-w-xl leading-relaxed">
                      {tr(
                        "Discover crisp mountain produce, connect directly with verified growers across all 7 provinces, and bridge the distance between fertile Himalayan soil and your dining table.",
                        "नेपालका ७ वटै प्रदेशका प्रमाणित किसानहरूबाट उत्पादित ताजा तरकारी, फलफूल र खाद्यान्न सिधै सुपथ मूल्यमा खरिद गर्नुहोस्।"
                      )}
                    </p>

                    <div className="flex flex-wrap items-center gap-3 pt-1">
                      <a
                        href="#fresh-harvests"
                        className="flex-1 sm:flex-initial justify-center px-5 py-3.5 rounded-xl bg-[#14532D] hover:bg-[#1B4332] text-white font-bold text-xs sm:text-sm flex items-center gap-2 shadow-md transition"
                      >
                        Explore Store Products <ArrowRight className="w-4 h-4" />
                      </a>
                      {isFarmer ? (
                        <button
                          onClick={() => setActiveTab("sell")}
                          className="flex-1 sm:flex-initial justify-center px-5 py-3.5 rounded-xl bg-[#FDE68A] hover:bg-[#FCD34D] text-slate-900 font-bold text-xs sm:text-sm flex items-center gap-2 shadow-xs transition cursor-pointer"
                        >
                          🌾 Sell Your Harvest
                        </button>
                      ) : !user ? (
                        <button
                          onClick={() => {
                            setAuthModalTab("register");
                            setAuthModalOpen(true);
                          }}
                          className="flex-1 sm:flex-initial justify-center px-5 py-3.5 rounded-xl bg-[#FDE68A] hover:bg-[#FCD34D] text-slate-900 font-bold text-xs sm:text-sm flex items-center gap-2 shadow-xs transition cursor-pointer"
                        >
                          🌾 Sell Your Harvest
                        </button>
                      ) : null}
                    </div>

                    {/* 3 Stat Cards */}
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
                          Best Market Price
                        </p>
                      </div>
                      <div className="bg-white/90 border border-slate-200/70 rounded-2xl p-2.5 sm:p-3.5 shadow-2xs">
                        <p className="text-base sm:text-xl font-black text-slate-900">5:00 Am to 10:00 Pm</p>
                        <p className="text-[10px] sm:text-[11px] text-slate-500 font-medium">
                           Delivery Service
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Right Farmer Photo Card */}
                  <div className="lg:col-span-5 relative">
                    <div className="hidden sm:flex items-center gap-2.5 bg-white px-4 py-2.5 rounded-2xl shadow-lg border border-slate-100 absolute -top-4 right-4 z-10">
                      <div className="w-7 h-7 rounded-full bg-emerald-700 text-white flex items-center justify-center text-xs font-bold">
                        ✓
                      </div>
                      <div className="text-xs leading-tight">
                        <p className="font-bold text-slate-800">Jasmir Chaudhary</p>
                        <p className="text-[10px] text-slate-500">
                          KrishiMart Admin • Official Farmer Partner
                        </p>
                      </div>
                    </div>

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

                {/* 5. FLOATING MULTI-FILTER SEARCH BAR & TRENDING PILLS */}
                <div className="max-w-7xl mx-auto mt-8 sm:mt-10 bg-white rounded-3xl p-4 sm:p-5 shadow-md border border-slate-200/80 space-y-3">
                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-12 gap-2.5 sm:gap-3">
                    <div className="sm:col-span-2 md:col-span-5 relative">
                      <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
                      <input
                        type="text"
                        placeholder="Search 'Fresh Tomatoes', 'Mustang Apples', 'Jumla Beans'..."
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

                  {/* Trending Pills */}
                  <div className="flex flex-wrap items-center gap-2 text-xs pt-1">
                    <span className="text-slate-400 font-semibold">Trending:</span>
                    {[
                      { label: "🍅 Organic Tomatoes", term: "Tomato" },
                      { label: "🍎 Mustang Marpha Apples", term: "Apple" },
                      { label: "🥔 Palpa Red Potatoes", term: "Potato" },
                      { label: "🌾 Jumla Marsi Rice", term: "Marsi" },
                      { label: "🌶️ Ilam Akabare Chili", term: "Chili" },
                    ].map((t) => (
                      <button
                        key={t.term}
                        onClick={() => setSearchQuery(t.term)}
                        className="px-3 py-1 rounded-full bg-slate-100 hover:bg-emerald-50 text-slate-700 text-[11px] font-medium transition cursor-pointer"
                      >
                        {t.label}
                      </button>
                    ))}
                    {(searchQuery ||
                      selectedCategory !== "ALL" ||
                      selectedDistrict !== "ALL") && (
                      <button
                        onClick={() => {
                          setSearchQuery("");
                          setSelectedCategory("ALL");
                          setSelectedDistrict("ALL");
                        }}
                        className="text-xs text-red-600 font-bold ml-2 cursor-pointer"
                      >
                        Reset Filters ✕
                      </button>
                    )}
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

            {/* 7. FRESH DAILY HARVESTS */}
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
                            {!isAdmin && (
                              <button
                                onClick={() => requireAuth(() => setChatDrawerOpen(true))}
                                className="p-2.5 rounded-xl border border-slate-200 text-slate-500 hover:text-[#14532D] hover:border-[#14532D] transition cursor-pointer"
                                title="Ask Admin about this batch"
                              >
                                <MessageCircle className="w-4 h-4" />
                              </button>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </section>
            )}

            {/* 8. TRANSPARENT FROM SOIL TO KITCHEN SECTION */}
            {activeTab === "home" && (
              <section className="max-w-7xl mx-auto px-4 sm:px-8 py-10 space-y-8">
                <div className="text-center max-w-2xl mx-auto space-y-1.5">
                  <span className="text-[11px] font-extrabold uppercase tracking-widest text-emerald-700">
                    HOW KRISHIMART EMPOWERS NEPAL
                  </span>
                  <h2 className="text-2xl sm:text-3xl font-black text-slate-900">
                    Transparent From Soil to Kitchen
                  </h2>
                  <p className="text-xs sm:text-sm text-slate-500">
                    Whether you are an urban household, a restaurant, or a smallholder farmer in
                    the hills.
                  </p>
                </div>

                <div className="grid md:grid-cols-2 gap-6">
                  <div className="bg-white rounded-3xl p-6 sm:p-7 border border-slate-200 shadow-2xs space-y-5">
                    <div className="flex items-center justify-between">
                      <h3 className="text-lg font-extrabold text-slate-900">
                        🛒 For Buyers & Families
                      </h3>
                      <span className="px-2.5 py-1 rounded-full bg-slate-100 text-slate-700 text-[10px] font-bold">
                        Guaranteed Quality
                      </span>
                    </div>
                    <div className="space-y-4 text-xs">
                      <div className="flex gap-3.5">
                        <span className="w-6 h-6 rounded-lg bg-[#14532D] text-white font-bold flex items-center justify-center shrink-0">
                          1
                        </span>
                        <div>
                          <p className="font-bold text-slate-900 text-sm">
                            Discover Fresh Harvests by District
                          </p>
                          <p className="text-slate-500 mt-0.5">
                            Browse produce directly from verified cooperatives in Kavre, Palpa,
                            Chitwan, Kailali, and Mustang.
                          </p>
                        </div>
                      </div>
                      <div className="flex gap-3.5">
                        <span className="w-6 h-6 rounded-lg bg-[#14532D] text-white font-bold flex items-center justify-center shrink-0">
                          2
                        </span>
                        <div>
                          <p className="font-bold text-slate-900 text-sm">Zero Middlemen Markup</p>
                          <p className="text-slate-500 mt-0.5">
                            Order at transparent farm-gate prices.
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="bg-[#EEF6F0] rounded-3xl p-6 sm:p-7 border border-emerald-200/80 shadow-2xs space-y-5">
                    <div className="flex items-center justify-between">
                      <h3 className="text-lg font-extrabold text-slate-900">
                        🌾 For Nepali Farmers
                      </h3>
                      <span className="px-2.5 py-1 rounded-full bg-emerald-200 text-[#14532D] text-[10px] font-bold">
                        0% Fee & Fast Payouts
                      </span>
                    </div>
                    <div className="space-y-4 text-xs">
                      <div className="flex gap-3.5">
                        <span className="w-6 h-6 rounded-lg bg-[#14532D] text-white font-bold flex items-center justify-center shrink-0">
                          1
                        </span>
                        <div>
                          <p className="font-bold text-slate-900 text-sm">
                            Submit Wholesale Harvest Batch
                          </p>
                          <p className="text-slate-600 mt-0.5">
                            Post your vegetables, wholesale price, and pickup location in minutes.
                          </p>
                        </div>
                      </div>
                      <div className="flex gap-3.5">
                        <span className="w-6 h-6 rounded-lg bg-[#14532D] text-white font-bold flex items-center justify-center shrink-0">
                          2
                        </span>
                        <div>
                          <p className="font-bold text-slate-900 text-sm">
                            Direct Admin Procurement & Settlement
                          </p>
                          <p className="text-slate-600 mt-0.5">
                            Track all your sold crops and payouts in your Farmer Sales Report.
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </section>
            )}

            {/* 9. FARMER SPOTLIGHT & REAL BUYER REVIEWS SECTION */}
            <section className="max-w-7xl mx-auto px-4 sm:px-8 py-8 space-y-8">
              <div className="flex flex-wrap items-center justify-between gap-4">
                <div>
                  <span className="text-[11px] font-extrabold uppercase tracking-widest text-emerald-700">
                    COMMUNITY VOICES
                  </span>
                  <h2 className="text-xl sm:text-3xl font-black text-slate-900">
                    Farmer Stories & Buyer Reviews
                  </h2>
                </div>
                <button
                  onClick={() => requireAuth(() => setStoryModalOpen(true))}
                  className="px-5 py-2.5 rounded-xl bg-[#14532D] hover:bg-[#1B4332] text-white text-xs font-bold shadow-sm cursor-pointer"
                >
                  + Share Your Story or Review
                </button>
              </div>

              {/* Farmer Stories Grid */}
              <div className="grid md:grid-cols-2 gap-5 sm:gap-6">
                {approvedFarmerStories.map((st) => (
                  <div
                    key={st.id}
                    className="bg-white rounded-3xl p-5 sm:p-6 border border-slate-200 space-y-3"
                  >
                    <div className="flex items-center gap-3.5">
                      <div className="w-12 h-12 rounded-2xl bg-emerald-800 text-white flex items-center justify-center font-bold overflow-hidden shrink-0">
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
                        <span className="px-2 py-0.5 rounded bg-emerald-100 text-[#14532D] text-[10px] font-bold">
                          ✓ Verified Farmer Story
                        </span>
                        <h4 className="font-extrabold text-slate-900 text-base mt-0.5">
                          {st.author_name}
                        </h4>
                        <p className="text-xs text-slate-500">
                          📍 {st.author_location || "Nepal"}
                        </p>
                      </div>
                    </div>
                    {st.title && (
                      <h5 className="font-bold text-sm text-slate-900">"{st.title}"</h5>
                    )}
                    <p className="text-xs text-slate-600 italic bg-slate-50 p-4 rounded-2xl leading-relaxed">
                      "{st.content}"
                    </p>
                    {st.image && (
                      <img
                        src={
                          st.image.startsWith("http")
                            ? st.image
                            : `${BACKEND_URL}${st.image}`
                        }
                        alt={st.title || "Story photo"}
                        className="w-full h-44 object-cover rounded-2xl border border-slate-200"
                      />
                    )}
                  </div>
                ))}

                {/* Default Spotlight Cards if no custom farmer stories yet */}
                {approvedFarmerStories.length === 0 && (
                  <>
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
                          <p className="text-xs text-slate-500">
                            📍 Dhading Besi, Bagmati Province
                          </p>
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
                  </>
                )}
              </div>

              {/* Approved Buyer Reviews Grid */}
              {approvedBuyerReviews.length > 0 && (
                <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4 pt-4">
                  {approvedBuyerReviews.map((br) => (
                    <div
                      key={br.id}
                      className="bg-white rounded-3xl p-5 border border-slate-200 space-y-2.5"
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2.5">
                          <div className="w-9 h-9 rounded-full bg-emerald-800 text-white flex items-center justify-center font-bold text-xs overflow-hidden">
                            {br.author_avatar ? (
                              <img
                                src={
                                  br.author_avatar.startsWith("http")
                                    ? br.author_avatar
                                    : `${BACKEND_URL}${br.author_avatar}`
                                }
                                alt={br.author_name}
                                className="w-full h-full object-cover"
                              />
                            ) : (
                              <span>{br.author_name?.charAt(0).toUpperCase()}</span>
                            )}
                          </div>
                          <div>
                            <p className="font-bold text-xs text-slate-900">{br.author_name}</p>
                            <p className="text-[10px] text-slate-400">Verified Buyer</p>
                          </div>
                        </div>
                        <div className="flex text-amber-400">
                          {Array.from({ length: br.rating || 5 }).map((_, i) => (
                            <Star key={i} className="w-3.5 h-3.5 fill-amber-400" />
                          ))}
                        </div>
                      </div>
                      {br.title && (
                        <p className="font-bold text-xs text-slate-800">"{br.title}"</p>
                      )}
                      <p className="text-xs text-slate-600 italic">"{br.content}"</p>
                      {br.image && (
                        <img
                          src={
                            br.image.startsWith("http")
                              ? br.image
                              : `${BACKEND_URL}${br.image}`
                          }
                          alt={br.title || "Review photo"}
                          className="w-full h-36 object-cover rounded-2xl border border-slate-200 mt-2"
                        />
                      )}
                    </div>
                  ))}
                </div>
              )}
            </section>
          </>
        )}
      </main>

      {/* SHARE STORY / WRITE REVIEW MODAL */}
      {storyModalOpen && user && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <form
            onSubmit={handleStorySubmit}
            className="bg-white rounded-3xl max-w-md w-full p-6 space-y-4 shadow-2xl"
          >
            <div className="flex justify-between items-center border-b border-slate-100 pb-2">
              <h3 className="text-lg font-extrabold text-slate-900">
                {user.role === "FARMER" ? "Share Your Farmer Story" : "Write a Buyer Review"}
              </h3>
              <button
                type="button"
                onClick={() => setStoryModalOpen(false)}
                className="p-1 text-slate-400"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <input
              type="text"
              placeholder="Headline (e.g. Fresh Harvest Experience)"
              value={storyForm.title}
              onChange={(e) => setStoryForm({ ...storyForm, title: e.target.value })}
              className="w-full px-3.5 py-2 border border-slate-200 rounded-xl text-sm"
            />
            <textarea
              rows={4}
              required
              placeholder="Share your experience with KrishiMart..."
              value={storyForm.content}
              onChange={(e) => setStoryForm({ ...storyForm, content: e.target.value })}
              className="w-full px-3.5 py-2 border border-slate-200 rounded-xl text-sm"
            />
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Rating</label>
              <select
                value={storyForm.rating}
                onChange={(e) => setStoryForm({ ...storyForm, rating: Number(e.target.value) })}
                className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs bg-white"
              >
                <option value={5}>⭐⭐⭐⭐⭐ (5 Stars)</option>
                <option value={4}>⭐⭐⭐⭐ (4 Stars)</option>
                <option value={3}>⭐⭐⭐ (3 Stars)</option>
              </select>
            </div>
            <div className="space-y-2">
              <label className="block text-xs font-bold text-slate-700">
                Upload Farm / Produce Photo (Optional)
              </label>
              <input
                type="file"
                accept="image/*"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) {
                    setStoryImageFile(file);
                    setStoryImagePreview(URL.createObjectURL(file));
                  }
                }}
                className="w-full text-xs text-slate-600"
              />
              {storyImagePreview && (
                <div className="relative w-32 h-24 rounded-2xl overflow-hidden border border-slate-200">
                  <img
                    src={storyImagePreview}
                    alt="Story preview"
                    className="w-full h-full object-cover"
                  />
                  <button
                    type="button"
                    onClick={() => {
                      setStoryImageFile(null);
                      setStoryImagePreview(null);
                    }}
                    className="absolute top-1 right-1 p-1 rounded-full bg-black/60 text-white cursor-pointer"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </div>
              )}
            </div>
            <button
              type="submit"
              className="w-full py-3 bg-[#14532D] text-white font-bold rounded-xl text-xs cursor-pointer"
            >
              Submit for Admin Approval
            </button>
          </form>
        </div>
      )}

      {/* PRODUCT QUICK-VIEW DETAIL MODAL (WITH QUANTITY SELECTOR) */}
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

      {/* SLIDE-OUT SHOPPING BASKET & CHECKOUT DRAWER (WITH COD / ESEWA / KHALTI) */}
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
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1.5">
                    Payment Method *
                  </label>
                  <div className="grid grid-cols-3 gap-2">
                    {[
                      { id: "COD", label: "💵 Cash on Delivery" },
                      { id: "ESEWA", label: "🟢 eSewa Wallet" },
                      { id: "KHALTI", label: "🟣 Khalti Wallet" },
                    ].map((pm) => (
                      <button
                        key={pm.id}
                        type="button"
                        onClick={() => setPaymentMethod(pm.id)}
                        className={`py-2 px-2 rounded-xl border text-[11px] font-bold transition cursor-pointer ${
                          paymentMethod === pm.id
                            ? "border-[#14532D] bg-emerald-50 text-[#14532D]"
                            : "border-slate-200 text-slate-600 hover:bg-slate-50"
                        }`}
                      >
                        {pm.label}
                      </button>
                    ))}
                  </div>
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

      {/* EDIT USER PROFILE, PHOTO & CHANGE PASSWORD MODAL */}
      {profileModalOpen && user && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 space-y-5 shadow-2xl max-h-[90vh] overflow-y-auto">
            <form onSubmit={handleUpdateProfile} className="space-y-3.5">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-extrabold text-slate-900">Your Profile & Photo</h3>
                <button
                  type="button"
                  onClick={() => setProfileModalOpen(false)}
                  className="p-1 text-slate-400 hover:text-slate-700 cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="flex items-center gap-4 py-2 border-b border-slate-100">
                <div className="relative w-16 h-16 rounded-full bg-slate-100 border-2 border-emerald-600/30 overflow-hidden flex items-center justify-center shrink-0">
                  {profileAvatarPreview ? (
                    <img
                      src={profileAvatarPreview}
                      alt="Preview"
                      className="w-full h-full object-cover"
                    />
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
                    <Camera className="w-3.5 h-3.5 text-emerald-700" /> Change Profile Photo
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
                  <span className="text-[10px] text-slate-400 block mt-0.5">JPG or PNG</span>
                </div>
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
                  onChange={(e) =>
                    setProfileForm({ ...profileForm, phone_number: e.target.value })
                  }
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
              <button
                type="submit"
                className="w-full py-2.5 rounded-xl bg-[#14532D] hover:bg-[#1B4332] text-white text-xs font-bold cursor-pointer"
              >
                Save Profile & Photo
              </button>
            </form>

            {/* Restored Change Password Section (With Show / Hide Password Toggles) */}
            <form
              onSubmit={handleChangePassword}
              className="pt-4 border-t border-slate-200 space-y-3"
            >
              <h4 className="text-sm font-extrabold text-slate-900">Change Password</h4>
              <div className="relative">
                <input
                  type={showCurrentPassword ? "text" : "password"}
                  required
                  placeholder="Current Password *"
                  value={passwordForm.current_password}
                  onChange={(e) =>
                    setPasswordForm({ ...passwordForm, current_password: e.target.value })
                  }
                  className="w-full pl-3.5 pr-10 py-2 rounded-xl border border-slate-200 text-sm"
                />
                <button
                  type="button"
                  onClick={() => setShowCurrentPassword((prev) => !prev)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700 cursor-pointer"
                  title={showCurrentPassword ? "Hide password" : "Show password"}
                >
                  {showCurrentPassword ? (
                    <EyeOff className="w-4 h-4" />
                  ) : (
                    <Eye className="w-4 h-4" />
                  )}
                </button>
              </div>
              <div className="relative">
                <input
                  type={showNewPassword ? "text" : "password"}
                  required
                  minLength={8}
                  placeholder="New Password (min 8 chars) *"
                  value={passwordForm.new_password}
                  onChange={(e) =>
                    setPasswordForm({ ...passwordForm, new_password: e.target.value })
                  }
                  className="w-full pl-3.5 pr-10 py-2 rounded-xl border border-slate-200 text-sm"
                />
                <button
                  type="button"
                  onClick={() => setShowNewPassword((prev) => !prev)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700 cursor-pointer"
                  title={showNewPassword ? "Hide password" : "Show password"}
                >
                  {showNewPassword ? (
                    <EyeOff className="w-4 h-4" />
                  ) : (
                    <Eye className="w-4 h-4" />
                  )}
                </button>
              </div>
              <button
                type="submit"
                className="w-full py-2.5 rounded-xl bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold cursor-pointer"
              >
                Update Password
              </button>
            </form>
          </div>
        </div>
      )}

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
                    <span className="flex items-center justify-between gap-2 text-[10px] opacity-75 mt-1">
                          <span>
                            {m.is_from_admin ? "KrishiMart Admin" : "You"} •{" "}
                            {new Date(m.created_at).toLocaleTimeString([], {
                              hour: "2-digit",
                              minute: "2-digit",
                            })}
                          </span>
                          {!m.is_from_admin && (
                            <button
                              type="button"
                              onClick={() => handleDeleteMyMessage(m.id)}
                              className="hover:text-red-300 cursor-pointer"
                              title="Unsend message"
                            >
                              <Trash2 className="w-3 h-3" />
                            </button>
                          )}
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

      {/* 1/4 A4 PRINTABLE & DOWNLOADABLE SLIP MODAL (FARMER VOUCHER & CUSTOMER RECEIPT) */}
      {activeSlip && (
        <div className="fixed inset-0 z-50 bg-slate-900/70 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
          <div className="bg-white rounded-3xl shadow-2xl max-w-sm w-full p-5 space-y-4 border border-slate-200">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h4 className="font-extrabold text-sm text-slate-900 flex items-center gap-1.5">
                <Receipt className="w-4 h-4 text-[#14532D]" />
                {activeSlip.slipType === "FARMER_SALE"
                  ? "Official Farmer Procurement Slip"
                  : "Official Customer Order Receipt"}
              </h4>
              <button
                type="button"
                onClick={() => setActiveSlip(null)}
                className="w-7 h-7 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-600 flex items-center justify-center font-bold text-xs cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* 1/4 A4 Printable Container (105mm x 148.5mm) */}
            <div
              id="user-printable-slip"
              className="bg-[#FCFDFD] p-4 rounded-2xl border-2 border-dashed border-slate-300 text-slate-800 space-y-3 text-[11px]"
            >
              <div className="text-center border-b border-slate-200 pb-2 space-y-0.5">
                <div className="flex items-center justify-center gap-1 font-black text-[#14532D] text-base">
                  🌱 KrishiMart Nepal
                </div>
                <p className="text-[9px] text-slate-500 uppercase tracking-wider font-semibold">
                  किसान र उपभोक्ता जोड्ने डिजिटल बजार
                </p>
                <p className="text-[10px] font-extrabold text-slate-700 mt-1">
                  {activeSlip.slipType === "FARMER_SALE"
                    ? `Procurement Voucher #${activeSlip.id}`
                    : `Order Receipt #${activeSlip.id}`}
                </p>
                <p className="text-[9px] text-slate-400">
                  Date: {new Date(activeSlip.created_at || Date.now()).toLocaleDateString()}
                </p>
              </div>

              {activeSlip.slipType === "FARMER_SALE" ? (
                <div className="space-y-1.5">
                  <div className="flex justify-between">
                    <span className="text-slate-500">Farmer:</span>
                    <span className="font-bold">
                      {activeSlip.farmer_name || user?.full_name || "Verified Farmer"}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">Crop / Category:</span>
                    <span className="font-bold">
                      {activeSlip.crop_name} ({activeSlip.category})
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">Quantity Sold:</span>
                    <span className="font-bold">
                      {activeSlip.quantity} {activeSlip.unit}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">Agreed Rate:</span>
                    <span className="font-bold">
                      रु {activeSlip.agreed_wholesale_rate} / {activeSlip.unit}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">Settlement:</span>
                    <span className="font-bold text-emerald-700">
                      {activeSlip.payment_status} ({activeSlip.payment_method})
                    </span>
                  </div>
                  <div className="border-t border-slate-200 pt-1.5 flex justify-between text-xs font-black text-[#14532D]">
                    <span>Total Payout:</span>
                    <span>रु {Number(activeSlip.total_amount).toLocaleString()}</span>
                  </div>
                </div>
              ) : (
                <div className="space-y-1.5">
                  <div className="flex justify-between">
                    <span className="text-slate-500">Customer:</span>
                    <span className="font-bold">
                      {activeSlip.customer_name || user?.full_name || "Verified Buyer"}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">Delivery Address:</span>
                    <span className="font-bold text-right max-w-[180px]">
                      {activeSlip.delivery_address || "Verified Address"}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">Phone:</span>
                    <span className="font-bold">
                      {activeSlip.contact_phone || user?.phone_number || "—"}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">Produce:</span>
                    <span className="font-bold">{activeSlip.product_name}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">Quantity:</span>
                    <span className="font-bold">
                      {activeSlip.quantity} {activeSlip.product_unit || "unit(s)"}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">Order Status:</span>
                    <span className="font-bold text-emerald-700">{activeSlip.status}</span>
                  </div>
                  <div className="border-t border-slate-200 pt-1.5 flex justify-between text-xs font-black text-[#14532D]">
                    <span>Total Amount:</span>
                    <span>रु {Number(activeSlip.total_price).toLocaleString()}</span>
                  </div>
                </div>
              )}

              <div className="border-t border-slate-200 pt-2 text-center text-[9px] text-slate-400 space-y-0.5">
                <p className="font-bold text-emerald-700">✓ Official KrishiMart Verified Slip</p>
                <p>1/4 A4 (105mm × 148.5mm) Print Format</p>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2 pt-1">
              <button
                type="button"
                onClick={() => {
                  const printContents = document.getElementById("user-printable-slip").innerHTML;
                  const win = window.open("", "", "width=460,height=620");
                  win.document.write(`
                    <html>
                      <head>
                        <title>KrishiMart Slip #${activeSlip.id}</title>
                        <style>
                          @page { size: 105mm 148.5mm; margin: 6mm; }
                          body { font-family: sans-serif; font-size: 11px; padding: 10px; margin: 0; color: #1e293b; border: 1.5px dashed #94a3b8; border-radius: 10px; }
                          .border-b { border-bottom: 1px solid #e2e8f0; padding-bottom: 6px; margin-bottom: 8px; }
                          .border-t { border-top: 1px solid #e2e8f0; padding-top: 6px; margin-top: 8px; }
                          .flex { display: flex; justify-content: space-between; margin: 4px 0; }
                          .text-center { text-align: center; }
                          .font-bold { font-weight: 700; }
                          .font-black { font-weight: 900; font-size: 13px; color: #14532D; }
                        </style>
                      </head>
                      <body onload="window.print(); window.close();">
                        ${printContents}
                      </body>
                    </html>
                  `);
                  win.document.close();
                }}
                className="py-2.5 px-3 rounded-xl bg-[#14532D] hover:bg-[#1B4332] text-white font-bold text-xs flex items-center justify-center gap-1.5 transition cursor-pointer shadow-xs"
              >
                🖨️ Print 1/4 A4
              </button>
              <button
                type="button"
                onClick={() => {
                  const canvas = document.createElement("canvas");
                  canvas.width = 420;
                  canvas.height = 594;
                  const ctx = canvas.getContext("2d");
                  ctx.fillStyle = "#ffffff";
                  ctx.fillRect(0, 0, 420, 594);
                  ctx.strokeStyle = "#14532D";
                  ctx.lineWidth = 3;
                  ctx.strokeRect(12, 12, 396, 570);

                  ctx.fillStyle = "#14532D";
                  ctx.font = "bold 20px sans-serif";
                  ctx.textAlign = "center";
                  ctx.fillText("KrishiMart Nepal", 210, 50);

                  ctx.font = "11px sans-serif";
                  ctx.fillStyle = "#64748b";
                  ctx.fillText("किसान र उपभोक्ता जोड्ने डिजिटल बजार", 210, 70);

                  ctx.fillStyle = "#0f172a";
                  ctx.font = "bold 13px sans-serif";
                  const slipTitle =
                    activeSlip.slipType === "FARMER_SALE"
                      ? `Farmer Procurement Voucher #${activeSlip.id}`
                      : `Customer Order Receipt #${activeSlip.id}`;
                  ctx.fillText(slipTitle, 210, 100);

                  ctx.font = "11px sans-serif";
                  ctx.fillStyle = "#64748b";
                  ctx.fillText(
                    `Date: ${new Date(activeSlip.created_at || Date.now()).toLocaleDateString()}`,
                    210,
                    120
                  );

                  ctx.strokeStyle = "#cbd5e1";
                  ctx.lineWidth = 1;
                  ctx.beginPath();
                  ctx.moveTo(28, 136);
                  ctx.lineTo(392, 136);
                  ctx.stroke();

                  ctx.textAlign = "left";
                  ctx.font = "12px sans-serif";
                  ctx.fillStyle = "#1e293b";
                  let y = 170;

                  if (activeSlip.slipType === "FARMER_SALE") {
                    ctx.fillText(
                      `Farmer: ${activeSlip.farmer_name || user?.full_name || "Verified Farmer"}`,
                      32,
                      y
                    );
                    y += 30;
                    ctx.fillText(
                      `Crop: ${activeSlip.crop_name} (${activeSlip.category})`,
                      32,
                      y
                    );
                    y += 30;
                    ctx.fillText(
                      `Quantity Sold: ${activeSlip.quantity} ${activeSlip.unit}`,
                      32,
                      y
                    );
                    y += 30;
                    ctx.fillText(
                      `Wholesale Rate: रु ${activeSlip.agreed_wholesale_rate} / ${activeSlip.unit}`,
                      32,
                      y
                    );
                    y += 30;
                    ctx.fillText(
                      `Payment: ${activeSlip.payment_status} (${activeSlip.payment_method})`,
                      32,
                      y
                    );
                    y += 40;
                    ctx.font = "bold 16px sans-serif";
                    ctx.fillStyle = "#14532D";
                    ctx.fillText(
                      `Total Payout: रु ${Number(activeSlip.total_amount).toLocaleString()}`,
                      32,
                      y
                    );
                  } else {
                    ctx.fillText(
                      `Customer: ${activeSlip.customer_name || user?.full_name || "Verified Buyer"}`,
                      32,
                      y
                    );
                    y += 30;
                    ctx.fillText(`Produce: ${activeSlip.product_name}`, 32, y);
                    y += 30;
                    ctx.fillText(
                      `Quantity: ${activeSlip.quantity} ${activeSlip.product_unit || "unit(s)"}`,
                      32,
                      y
                    );
                    y += 30;
                    ctx.fillText(
                      `Address: ${(activeSlip.delivery_address || "").slice(0, 36)}`,
                      32,
                      y
                    );
                    y += 30;
                    ctx.fillText(`Status: ${activeSlip.status}`, 32, y);
                    y += 40;
                    ctx.font = "bold 16px sans-serif";
                    ctx.fillStyle = "#14532D";
                    ctx.fillText(
                      `Total Amount: रु ${Number(activeSlip.total_price).toLocaleString()}`,
                      32,
                      y
                    );
                  }

                  ctx.font = "bold 11px sans-serif";
                  ctx.fillStyle = "#14532D";
                  ctx.textAlign = "center";
                  ctx.fillText("✓ Official KrishiMart Verified Digital Slip", 210, 535);
                  ctx.font = "10px sans-serif";
                  ctx.fillStyle = "#94a3b8";
                  ctx.fillText("1/4 A4 Size (105mm × 148.5mm)", 210, 555);

                  const link = document.createElement("a");
                  link.download = `KrishiMart_Slip_${activeSlip.id}.png`;
                  link.href = canvas.toDataURL("image/png");
                  link.click();
                }}
                className="py-2.5 px-3 rounded-xl border border-slate-200 hover:bg-slate-50 text-slate-700 font-bold text-xs flex items-center justify-center gap-1.5 transition cursor-pointer"
              >
                ⬇️ Download PNG
              </button>
            </div>
          </div>
        </div>
      )}

      {/* NATIVE-STYLE MOBILE BOTTOM NAVIGATION BAR (VISIBLE ON PHONES < 768px) */}
      <nav className="md:hidden fixed bottom-0 inset-x-0 z-40 bg-white/95 backdrop-blur-md border-t border-slate-200 px-2 py-1.5 flex items-center justify-around shadow-[0_-4px_20px_rgba(0,0,0,0.06)]">
        <button
          onClick={() => setActiveTab("home")}
          className={`flex flex-col items-center gap-0.5 py-1 px-2 rounded-xl text-[10px] font-bold cursor-pointer ${
            activeTab === "home" ? "text-[#14532D]" : "text-slate-400"
          }`}
        >
          <Home className="w-5 h-5" />
          <span>Home</span>
        </button>

        <button
          onClick={() => setActiveTab("marketplace")}
          className={`flex flex-col items-center gap-0.5 py-1 px-2 rounded-xl text-[10px] font-bold cursor-pointer ${
            activeTab === "marketplace" ? "text-[#14532D]" : "text-slate-400"
          }`}
        >
          <ShoppingBag className="w-5 h-5" />
          <span>Shop</span>
        </button>

        {isFarmer || !user ? (
          <button
            onClick={() => {
              if (!user) {
                setAuthModalTab("register");
                setAuthModalOpen(true);
              } else {
                setActiveTab("sell");
              }
            }}
            className="flex flex-col items-center -mt-5 cursor-pointer"
          >
            <div className="w-11 h-11 rounded-full bg-[#14532D] text-amber-400 flex items-center justify-center shadow-md border-4 border-white">
              <Plus className="w-5 h-5" />
            </div>
            <span className="text-[10px] font-extrabold text-[#14532D] mt-0.5">Sell</span>
          </button>
        ) : (
          <button
            onClick={() => setBasketDrawerOpen(true)}
            className="flex flex-col items-center -mt-5 cursor-pointer"
          >
            <div className="w-11 h-11 rounded-full bg-[#14532D] text-amber-400 flex items-center justify-center shadow-md border-4 border-white relative">
              <ShoppingBag className="w-5 h-5" />
              {totalBasketItems > 0 && (
                <span className="absolute -top-1 -right-1 px-1.5 py-0.2 rounded-full bg-amber-400 text-slate-950 text-[9px] font-black">
                  {totalBasketItems}
                </span>
              )}
            </div>
            <span className="text-[10px] font-extrabold text-[#14532D] mt-0.5">Basket</span>
          </button>
        )}

        {isFarmer ? (
          <button
            onClick={() => setActiveTab("farmer_sales")}
            className={`flex flex-col items-center gap-0.5 py-1 px-2 rounded-xl text-[10px] font-bold cursor-pointer ${
              activeTab === "farmer_sales" ? "text-[#14532D]" : "text-slate-400"
            }`}
          >
            <Receipt className="w-5 h-5" />
            <span>Sales</span>
          </button>
        ) : user ? (
          <button
            onClick={() => setActiveTab("orders")}
            className={`flex flex-col items-center gap-0.5 py-1 px-2 rounded-xl text-[10px] font-bold cursor-pointer ${
              activeTab === "orders" ? "text-[#14532D]" : "text-slate-400"
            }`}
          >
            <PackageCheck className="w-5 h-5" />
            <span>Orders</span>
          </button>
        ) : (
          <button
            onClick={() => setActiveTab("stories")}
            className={`flex flex-col items-center gap-0.5 py-1 px-2 rounded-xl text-[10px] font-bold cursor-pointer ${
              activeTab === "stories" ? "text-[#14532D]" : "text-slate-400"
            }`}
          >
            <BookOpen className="w-5 h-5" />
            <span>Stories</span>
          </button>
        )}

        {user && (user.is_staff || user.role === "ADMIN") ? (
          <button
            onClick={() => setActiveTab("admin")}
            className={`flex flex-col items-center gap-0.5 py-1 px-2 rounded-xl text-[10px] font-bold cursor-pointer ${
              activeTab === "admin" ? "text-amber-600" : "text-slate-400"
            }`}
          >
            <LayoutDashboard className="w-5 h-5" />
            <span>Admin</span>
          </button>
        ) : user ? (
          <button
            onClick={() => setProfileModalOpen(true)}
            className="flex flex-col items-center gap-0.5 py-1 px-2 rounded-xl text-[10px] font-bold text-slate-400 cursor-pointer"
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
            className="flex flex-col items-center gap-0.5 py-1 px-2 rounded-xl text-[10px] font-bold text-slate-400 cursor-pointer"
          >
            <LogIn className="w-5 h-5" />
            <span>Sign In</span>
          </button>
        )}
      </nav>

      {/* 11. FULL 4-COLUMN FOOTER */}
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
              households through transparent pricing and Admin-verified trust.
            </p>
          </div>
          <div>
            <h4 className="font-bold text-slate-900 mb-3">Market Categories</h4>
            <ul className="space-y-2">
              <li>Fresh Seasonal Vegetables</li>
              <li>Indigenous Grains & Jumla Marsi</li>
              <li>Mustang & Hill Orchard Fruits</li>
              <li>Organic Spices & Dairy</li>
            </ul>
          </div>
          <div>
            <h4 className="font-bold text-slate-900 mb-3">Farmer & Buyer Support</h4>
            <ul className="space-y-2">
              <li>Farmer Wholesale Selling Portal</li>
              <li>Track My Harvest Orders</li>
              <li>Community Stories & Reviews</li>
              <li>Live Buyer–Seller–Admin Chat</li>
            </ul>
          </div>
          <div>
            <h4 className="font-bold text-slate-900 mb-3">Central Hub Contact</h4>
            <ul className="space-y-2">
              <li>📍 Dhangadhi Hub & Kathmandu Valley</li>
              <li>📞 +977-1-4423456 / 9840000000</li>
              <li>✉️ support@krishimart.com.np</li>
              <li>🕒 6:00 AM – 8:00 PM NPT Daily</li>
            </ul>
          </div>
        </div>
      </footer>
    </div>
  );
}