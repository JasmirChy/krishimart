import React, { useState, useEffect } from "react";
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
  Bell,
  Heart,
  ShieldCheck,
  Truck,
  Scale,
  Award,
  Headphones,
  ArrowRight,
  Star,
  User,
  TrendingUp,
  X,
  Plus,
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
    subtitle: "Pure Forest Honey, Ghee, Chhurpi",
    badge: "Pure Himalayan",
    image:
      "https://images.unsplash.com/photo-1587049352847-4a222e784d38?auto=format&fit=crop&w=600&q=80",
  },
];

const DEFAULT_SHOWCASE_PRODUCTS = [
  {
    id: "demo-1",
    name: "Organic Kavre Red Cherry Tomatoes",
    category: "VEGETABLES",
    price: 110,
    unit: "kg",
    stock_quantity: 45,
    origin_location: "Panchkhal, Kavre",
    farmer_name: "Suman Tamang",
    tag: "Harvested Today",
    market_note: "Kalimati -15%",
    description: "Vine-ripened organic cherry tomatoes harvested this morning from Kavre hills.",
    image:
      "https://images.unsplash.com/photo-1592924357228-91a4daadcfea?auto=format&fit=crop&w=700&q=80",
  },
  {
    id: "demo-2",
    name: "Original Mustang Marpha Sweet Apples",
    category: "FRUITS",
    price: 280,
    unit: "kg",
    stock_quantity: 120,
    origin_location: "Marpha, Mustang",
    farmer_name: "Pemba Thakali",
    tag: "Fresh Batch",
    market_note: "Direct Orchard",
    description: "Crisp, high-altitude Himalayan apples straight from Marpha orchards.",
    image:
      "https://images.unsplash.com/photo-1560806887-1e4cd0b6cbd6?auto=format&fit=crop&w=700&q=80",
  },
  {
    id: "demo-3",
    name: "A-Grade Palpa Red Potatoes",
    category: "VEGETABLES",
    price: 65,
    unit: "kg",
    stock_quantity: 350,
    origin_location: "Tansen, Palpa",
    farmer_name: "Hari Prasad Pathak",
    tag: "350 kg Left",
    market_note: "Zero Middlemen",
    description: "Earthy, nutrient-rich red skin hill potatoes ideal for daily family cooking.",
    image:
      "https://images.unsplash.com/photo-1518977676601-b53f82aba655?auto=format&fit=crop&w=700&q=80",
  },
  {
    id: "demo-4",
    name: "Indigenous Jumla Marsi Brown Rice",
    category: "GRAINS",
    price: 340,
    unit: "kg",
    stock_quantity: 85,
    origin_location: "Tila, Jumla",
    farmer_name: "Dhan Bahadur Rokaya",
    tag: "High Altitude",
    market_note: "GI Tagged",
    description: "Authentic cold-water Himalayan red/brown Marsi rice with high mineral value.",
    image:
      "https://images.unsplash.com/photo-1536304993881-ff6e9eefa2a6?auto=format&fit=crop&w=700&q=80",
  },
  {
    id: "demo-5",
    name: "Fresh Crisp Akabare Chili (Dalle)",
    category: "SPICES",
    price: 450,
    unit: "kg",
    stock_quantity: 30,
    origin_location: "Ilam Hills",
    farmer_name: "Meena Rai",
    tag: "Limited Stock",
    market_note: "Farm Grade",
    description: "Aromatic, fiery round Akabare chilies handpicked from eastern Ilam farms.",
    image:
      "https://images.unsplash.com/photo-1588252303782-cb80119abd6d?auto=format&fit=crop&w=700&q=80",
  },
  {
    id: "demo-6",
    name: "Organic Chitwan Cold-Pressed Mustard Oil",
    category: "DAIRY",
    price: 380,
    unit: "litre",
    stock_quantity: 60,
    origin_location: "Bharatpur, Chitwan",
    farmer_name: "Chitwan Agro Coop",
    tag: "Cold Pressed 100%",
    market_note: "Pure Toria",
    description: "Traditional wooden-pressed yellow mustard oil from local Chitwan mustard seeds.",
    image:
      "https://images.unsplash.com/photo-1474979266404-7eaacbcd87c5?auto=format&fit=crop&w=700&q=80",
  },
];

export default function App() {
  const [user, setUser] = useState(null);
  const [checkingAuth, setCheckingAuth] = useState(true);
 const [activeTab, setActiveTab] = useState(() =>
    window.location.pathname.toLowerCase().startsWith("/admin") ? "admin" : "home"
  );

  // Marketplace & Filters
  const [dbProducts, setDbProducts] = useState([]);
  const [selectedCategory, setSelectedCategory] = useState("ALL");
  const [selectedDistrict, setSelectedDistrict] = useState("ALL");
  const [searchQuery, setSearchQuery] = useState("");
  const [basket, setBasket] = useState([]);
  const [orderModalProduct, setOrderModalProduct] = useState(null);
  const [orderForm, setOrderForm] = useState({
    quantity: 1,
    delivery_address: "",
    contact_phone: "",
  });

  // "Sell Your Products" Form & History
  const [mySubmissions, setMySubmissions] = useState([]);
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
  const [sellSuccess, setSellSuccess] = useState("");

  // Live Chat with Admin (Modal / Drawer + Tab)
  const [messages, setMessages] = useState([]);
  const [chatInput, setChatInput] = useState("");
  const [chatDrawerOpen, setChatDrawerOpen] = useState(false);

  const fetchCurrentUser = async () => {
    const token = localStorage.getItem("krishimart_access");
    if (!token) {
      setCheckingAuth(false);
      return;
    }
    try {
      const res = await api.get("/accounts/me/");
      setUser(res.data);
      if (
        (res.data.is_staff || res.data.role === "ADMIN") &&
        window.location.pathname.toLowerCase().startsWith("/admin")
      ) {
        setActiveTab("admin");
      }
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
      const [prodRes, subRes] = await Promise.all([
        api.get("/marketplace/products/"),
        api.get("/marketplace/sell-submissions/"),
      ]);
      setDbProducts(prodRes.data);
      setMySubmissions(subRes.data);
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    loadMarketplaceData();
  }, [user]);

  useEffect(() => {
    if (!isVerifiedOrAdmin || (!chatDrawerOpen && activeTab !== "chat")) return;
    const fetchChat = async () => {
      try {
        const res = await api.get("/chat/messages/");
        setMessages(res.data);
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
  };

  const handleSellSubmit = async (e) => {
    e.preventDefault();
    setSellSuccess("");
    try {
      const formData = new FormData();
      Object.entries(sellForm).forEach(([k, v]) => {
        if (v !== null && v !== "") formData.append(k, v);
      });
      await api.post("/marketplace/sell-submissions/", formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      setSellSuccess(
        "Your harvest batch has been submitted to the Admin! Our team will verify and contact you for pickup."
      );
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
      alert("Please fill in all required fields with valid numbers for quantity and price.");
    }
  };

  const handlePlaceOrder = async (e) => {
    e.preventDefault();
    if (!orderModalProduct) return;

    // If it's a database product, save order to PostgreSQL; also add to basket
    if (typeof orderModalProduct.id === "number") {
      try {
        await api.post("/marketplace/orders/", {
          product: orderModalProduct.id,
          quantity: orderForm.quantity,
          delivery_address: orderForm.delivery_address,
          contact_phone: orderForm.contact_phone,
        });
      } catch {
        // Fallback to local basket if needed
      }
    }
    setBasket((prev) => [...prev, { ...orderModalProduct, qty: orderForm.quantity }]);
    alert(
      `Order confirmed for ${orderForm.quantity} ${orderModalProduct.unit} of ${orderModalProduct.name}!`
    );
    setOrderModalProduct(null);
  };

  const handleSendUserMessage = async (e) => {
    e.preventDefault();
    if (!chatInput.trim()) return;
    try {
      await api.post("/chat/messages/", { message: chatInput });
      setChatInput("");
      const res = await api.get("/chat/messages/");
      setMessages(res.data);
    } catch {
      alert("Failed to send message.");
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

  // Combine database products with default showcase products so the grid always looks rich
  const allProducts = [...dbProducts, ...DEFAULT_SHOWCASE_PRODUCTS];

  const filteredProducts = allProducts.filter((p) => {
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

  return (
    <div className="min-h-screen bg-[#F6F8F5] text-slate-900 flex flex-col font-sans">
      {/* 1. TOP DARK GREEN UTILITY BAR */}
      <div className="bg-[#0F3822] text-emerald-100 text-xs py-2 px-4 sm:px-8 border-b border-emerald-900">
        <div className="max-w-7xl mx-auto flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-4">
            <span className="flex items-center gap-1.5 font-medium">
              <Phone className="w-3.5 h-3.5 text-amber-400" /> Helpline: +977-1-4423456
            </span>
            <span className="hidden md:inline-flex items-center gap-1.5 text-emerald-200">
              • <TrendingUp className="w-3.5 h-3.5 text-amber-400" /> Kalimati Mandi Live Rate:
              Tomato रु 65/kg Today
            </span>
          </div>
          <div className="flex items-center gap-4">
            <span className="bg-emerald-900/80 px-2.5 py-0.5 rounded text-[11px] font-semibold text-amber-300">
              EN / नेपाली
            </span>
            <span className="flex items-center gap-1 font-medium">
              <MapPin className="w-3.5 h-3.5 text-amber-400" /> Hub: All Nepal Valley & Hills
            </span>
          </div>
        </div>
      </div>

      {/* 2. MAIN BRAND & SEARCH HEADER */}
      <header className="sticky top-0 z-30 bg-white border-b border-slate-200/80 shadow-xs">
        <div className="max-w-7xl mx-auto px-4 sm:px-8 py-3.5 flex items-center justify-between gap-4">
          {/* Logo */}
          <div
            onClick={() => setActiveTab("home")}
            className="flex items-center gap-2.5 cursor-pointer shrink-0"
          >
            <div className="w-10 h-10 rounded-xl bg-[#14532D] flex items-center justify-center text-amber-400 shadow-sm">
              <Sprout className="w-6 h-6" />
            </div>
            <div>
              <span className="text-xl font-extrabold text-[#112A1E] tracking-tight block leading-none">
                KrishiMart
              </span>
              <span className="text-[10px] text-slate-500 font-medium">
                Empowering Farmers, Fresh Produce
              </span>
            </div>
          </div>

          {/* Center Search Bar */}
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
                  if (activeTab !== "home") setActiveTab("home");
                }}
                className="flex-1 px-3 py-1.5 text-xs bg-transparent outline-none text-slate-800"
              />
              <button
                onClick={() => setActiveTab("home")}
                className="w-8 h-8 rounded-full bg-[#14532D] text-white flex items-center justify-center hover:bg-[#1B4332] cursor-pointer"
              >
                <Search className="w-4 h-4" />
              </button>
            </div>
          )}

          {/* Right User Pill, Basket & "+ Sell Harvest" Button */}
          <div className="flex items-center gap-2.5 sm:gap-3">
            {isVerifiedOrAdmin && (
              <>
                <button
                  onClick={() => setChatDrawerOpen(true)}
                  className="relative p-2.5 rounded-full bg-slate-100 hover:bg-emerald-50 text-slate-700 cursor-pointer"
                  title="Live Chat with Admin"
                >
                  <MessageCircle className="w-4 h-4 text-[#14532D]" />
                  <span className="absolute -top-0.5 -right-0.5 w-2.5 h-2.5 rounded-full bg-emerald-500 ring-2 ring-white" />
                </button>

                <div
                  className="relative p-2.5 rounded-full bg-slate-100 text-slate-700"
                  title="Your Basket"
                >
                  <ShoppingBag className="w-4 h-4 text-[#14532D]" />
                  <span className="absolute -top-1 -right-1 px-1.5 py-0.2 rounded-full bg-amber-500 text-slate-950 text-[10px] font-extrabold">
                    {basket.length}
                  </span>
                </div>
              </>
            )}

            {/* User Badge */}
            <div className="hidden sm:flex items-center gap-2 bg-slate-50 border border-slate-200/80 rounded-full pl-2 pr-3 py-1">
              <div className="w-7 h-7 rounded-full bg-emerald-800 text-white flex items-center justify-center text-xs font-bold">
                {user.full_name?.charAt(0).toUpperCase()}
              </div>
              <div className="leading-tight">
                <p className="text-xs font-bold text-slate-900 truncate max-w-[110px]">
                  {user.full_name}
                </p>
                <p className="text-[10px] text-emerald-700 font-semibold flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                  {isVerifiedOrAdmin ? `Verified ${user.role}` : "Pending Approval"}
                </p>
              </div>
            </div>

            {isVerifiedOrAdmin && (
              <button
                onClick={() => setActiveTab("sell")}
                className="px-4 py-2.5 rounded-full bg-[#14532D] hover:bg-[#1B4332] text-white text-xs font-bold flex items-center gap-1.5 shadow-sm transition cursor-pointer"
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

        {/* 3. SUB-NAVIGATION BAR */}
        {isVerifiedOrAdmin && (
          <div className="bg-white border-t border-slate-100">
            <div className="max-w-7xl mx-auto px-4 sm:px-8 py-2 flex items-center justify-between overflow-x-auto gap-4">
              <nav className="flex items-center gap-1 sm:gap-2">
                {[
                  { id: "home", label: "Home" },
                  { id: "marketplace", label: "Shop Products" },
                  { id: "sell", label: "Sell Your Products" },
                  { id: "stories", label: "Farmer Stories" },
                  { id: "chat", label: "Chat with Admin" },
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
        <main className="max-w-xl w-full mx-auto px-4 py-16 flex-1">
          <div className="bg-white rounded-3xl p-8 shadow-xl border border-amber-200 text-center space-y-5">
            <div className="w-16 h-16 mx-auto rounded-2xl bg-amber-100 text-amber-700 flex items-center justify-center">
              <ShieldAlert className="w-9 h-9" />
            </div>
            <h2 className="text-2xl font-extrabold text-slate-900">
              Account Pending Admin Verification
            </h2>
            <p className="text-sm text-slate-600 leading-relaxed">
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
              className="inline-flex items-center gap-2 px-6 py-3 bg-[#14532D] hover:bg-[#1B4332] text-white font-semibold rounded-xl text-sm shadow-md transition cursor-pointer"
            >
              <RefreshCw className="w-4 h-4" /> Refresh Verification Status
            </button>
          </div>
        </main>
      ) : (
        <main className="flex-1">
          {/* ADMIN PANEL VIEW */}
          {/* ADMIN PANEL VIEW */}
          {activeTab === "admin" && (
            <div className="max-w-7xl mx-auto px-4 sm:px-8 py-8">
              {user.is_staff || user.role === "ADMIN" ? (
                <AdminPanel />
              ) : (
                <div className="max-w-md mx-auto my-12 bg-white p-8 rounded-3xl shadow-lg border border-red-200 text-center space-y-4">
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

          {/* DEDICATED "SELL YOUR PRODUCTS" VIEW */}
          {activeTab === "sell" && (
            <div className="max-w-7xl mx-auto px-4 sm:px-8 py-10">
              <div className="grid lg:grid-cols-5 gap-8">
                <form
                  onSubmit={handleSellSubmit}
                  className="lg:col-span-3 bg-white rounded-3xl p-6 sm:p-8 shadow-sm border border-slate-200 space-y-4"
                >
                  <div>
                    <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-100 text-[#14532D] text-xs font-bold">
                      <Sprout className="w-3.5 h-3.5" /> Direct Farmer & Customer Selling Portal
                    </span>
                    <h2 className="text-2xl font-extrabold text-slate-900 mt-2">
                      Sell Your Products to KrishiMart Admin
                    </h2>
                    <p className="text-xs text-slate-500 mt-1">
                      Have fresh vegetables, fruits, or local grains to sell? Enter your contact
                      number, vegetable description, price, and farm pickup location below.
                    </p>
                  </div>

                  {sellSuccess && (
                    <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-900 text-sm font-medium">
                      {sellSuccess}
                    </div>
                  )}

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

                  <div className="grid sm:grid-cols-3 gap-4">
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
                        placeholder="e.g. Dhangadhi, Kailali or Panchkhal, Kavre"
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

                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      Upload Harvest Photo (Optional)
                    </label>
                    <input
                      type="file"
                      accept="image/*"
                      onChange={(e) => setSellForm({ ...sellForm, image: e.target.files[0] })}
                      className="w-full text-xs text-slate-600"
                    />
                  </div>

                  <button
                    type="submit"
                    className="w-full py-3.5 bg-[#14532D] hover:bg-[#1B4332] text-white font-bold rounded-xl shadow-md transition cursor-pointer"
                  >
                    Submit Harvest Batch to Admin
                  </button>
                </form>

                {/* Seller's Submitted Batches */}
                <div className="lg:col-span-2 space-y-4">
                  <div className="bg-[#14532D] text-white p-6 rounded-3xl space-y-2">
                    <h3 className="font-extrabold text-lg">Need Instant Rate Confirmation?</h3>
                    <p className="text-xs text-emerald-100">
                      Chat directly with our KrishiMart Admin team to negotiate bulk rates or
                      schedule farm pickup.
                    </p>
                    <button
                      onClick={() => setChatDrawerOpen(true)}
                      className="mt-2 px-4 py-2 bg-amber-400 text-slate-950 font-bold text-xs rounded-xl inline-flex items-center gap-1.5 cursor-pointer"
                    >
                      <MessageCircle className="w-4 h-4" /> Open Live Chat with Admin
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
                        className="bg-white rounded-2xl p-5 shadow-xs border border-slate-200 space-y-2"
                      >
                        <div className="flex items-center justify-between">
                          <h4 className="font-bold text-slate-900">{s.vegetable_name}</h4>
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
            <div className="max-w-3xl mx-auto px-4 py-10">
              <div className="bg-white rounded-3xl shadow-sm border border-slate-200 overflow-hidden flex flex-col h-[540px]">
                <div className="p-5 bg-[#14532D] text-white">
                  <h3 className="font-bold text-lg">Direct Support Chat with KrishiMart Admin</h3>
                  <p className="text-xs text-emerald-200">
                    Connected as {user.full_name} ({user.role})
                  </p>
                </div>
                <div className="flex-1 p-5 overflow-y-auto space-y-3 bg-[#F6F8F5]">
                  {messages.length === 0 ? (
                    <div className="text-center text-slate-400 text-sm mt-16">
                      Send a message below to chat with the Admin about buying or selling products!
                    </div>
                  ) : (
                    messages.map((m) => (
                      <div
                        key={m.id}
                        className={`flex ${m.is_from_admin ? "justify-start" : "justify-end"}`}
                      >
                        <div
                          className={`max-w-xs sm:max-w-md px-4 py-2.5 rounded-2xl text-sm ${
                            m.is_from_admin
                              ? "bg-white border border-slate-200 text-slate-900 rounded-bl-none"
                              : "bg-[#14532D] text-white rounded-br-none"
                          }`}
                        >
                          <p>{m.message}</p>
                          <span className="block text-[10px] opacity-70 mt-1">
                            {m.is_from_admin ? "KrishiMart Admin" : "You"}
                          </span>
                        </div>
                      </div>
                    ))
                  )}
                </div>
                <form
                  onSubmit={handleSendUserMessage}
                  className="p-4 border-t border-slate-200 bg-white flex gap-2"
                >
                  <input
                    type="text"
                    placeholder="Write a message to Admin..."
                    value={chatInput}
                    onChange={(e) => setChatInput(e.target.value)}
                    className="flex-1 px-4 py-2.5 rounded-xl border border-slate-200 text-sm outline-none"
                  />
                  <button
                    type="submit"
                    className="px-5 py-2.5 bg-[#14532D] text-white font-semibold rounded-xl text-sm flex items-center gap-2 cursor-pointer"
                  >
                    <Send className="w-4 h-4" /> Send
                  </button>
                </form>
              </div>
            </div>
          )}

          {/* MAIN LANDING & MARKETPLACE VIEW (MATCHING SCREENSHOT DESIGN) */}
          {(activeTab === "home" || activeTab === "marketplace" || activeTab === "stories") && (
            <>
              {/* 4. HERO SECTION */}
              <section className="relative bg-gradient-to-b from-[#EBF3EC] to-[#F6F8F5] pt-8 pb-12 px-4 sm:px-8">
                <div className="max-w-7xl mx-auto grid lg:grid-cols-12 gap-10 items-center">
                  {/* Left Column */}
                  <div className="lg:col-span-7 space-y-6">
                    <span className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-emerald-900/10 text-[#14532D] text-xs font-bold">
                      🌱 Empowering 12,000+ Local Farmers Across Nepal
                    </span>

                    <h1 className="text-4xl sm:text-5xl lg:text-[54px] font-black tracking-tight leading-[1.1] text-slate-900">
                      Fresh From the Farm.
                      <span className="block text-[#14532D] mt-1">Straight to You.</span>
                    </h1>

                    <p className="text-slate-600 text-base sm:text-lg max-w-xl leading-relaxed">
                      Discover crisp mountain produce, connect directly with verified growers
                      across all 7 provinces, and bridge the distance between fertile Himalayan
                      soil and your dining table.
                    </p>

                    {/* CTA Buttons */}
                    <div className="flex flex-wrap items-center gap-3.5 pt-1">
                      <a
                        href="#fresh-harvests"
                        className="px-6 py-3.5 rounded-xl bg-[#14532D] hover:bg-[#1B4332] text-white font-bold text-sm flex items-center gap-2 shadow-md transition"
                      >
                        Explore Products <ArrowRight className="w-4 h-4" />
                      </a>
                      <button
                        onClick={() => setActiveTab("sell")}
                        className="px-6 py-3.5 rounded-xl bg-[#FDE68A] hover:bg-[#FCD34D] text-slate-900 font-bold text-sm flex items-center gap-2 shadow-xs transition cursor-pointer"
                      >
                        🌾 Sell Your Harvest
                      </button>
                    </div>

                    {/* 3 Stat Cards */}
                    <div className="grid grid-cols-3 gap-3 max-w-lg pt-3">
                      <div className="bg-white/90 border border-slate-200/70 rounded-2xl p-3.5 shadow-2xs">
                        <p className="text-xl font-black text-slate-900">100%</p>
                        <p className="text-[11px] text-slate-500 font-medium">Verified Growers</p>
                      </div>
                      <div className="bg-white/90 border border-slate-200/70 rounded-2xl p-3.5 shadow-2xs">
                        <p className="text-xl font-black text-slate-900">0% Cut</p>
                        <p className="text-[11px] text-slate-500 font-medium">Direct Farm Price</p>
                      </div>
                      <div className="bg-white/90 border border-slate-200/70 rounded-2xl p-3.5 shadow-2xs">
                        <p className="text-xl font-black text-slate-900">24 Hr</p>
                        <p className="text-[11px] text-slate-500 font-medium">Valley Delivery</p>
                      </div>
                    </div>
                  </div>

                  {/* Right Farmer Photo Card */}
                  <div className="lg:col-span-5 relative">
                    {/* Top floating notification pill */}
                    <div className="hidden sm:flex items-center gap-2.5 bg-white px-4 py-2.5 rounded-2xl shadow-lg border border-slate-100 absolute -top-4 right-4 z-10">
                      <div className="w-7 h-7 rounded-full bg-emerald-700 text-white flex items-center justify-center text-xs font-bold">
                        ✓
                      </div>
                      <div className="text-xs leading-tight">
                        <p className="font-bold text-slate-800">Ram Thapa</p>
                        <p className="text-[10px] text-slate-500">Listed 50kg Organic Cauliflower</p>
                      </div>
                    </div>

                    <div className="rounded-3xl overflow-hidden shadow-2xl border-4 border-white relative">
                      <img
                        src="https://images.unsplash.com/photo-1500937386664-56d1dfef3854?auto=format&fit=crop&w=900&q=80"
                        alt="Nepali Terraced Farm"
                        className="w-full h-[380px] object-cover"
                      />
                      {/* Bottom overlay badge */}
                      <div className="absolute bottom-4 left-4 right-4 bg-white/95 backdrop-blur-md p-4 rounded-2xl shadow-lg flex items-center justify-between gap-3">
                        <div className="flex items-center gap-3">
                          <div className="w-9 h-9 rounded-xl bg-emerald-100 text-[#14532D] flex items-center justify-center font-bold">
                            <ShieldCheck className="w-5 h-5" />
                          </div>
                          <div>
                            <p className="text-xs font-extrabold text-slate-900">
                              100% Nepal Origin Verified
                            </p>
                            <p className="text-[11px] text-slate-500">
                              Traceable to village & cooperative
                            </p>
                          </div>
                        </div>
                        <span className="px-2.5 py-1 rounded-lg bg-[#14532D] text-white text-[10px] font-bold">
                          Guaranteed
                        </span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* 5. FLOATING MULTI-FILTER SEARCH BAR & TRENDING PILLS */}
                <div className="max-w-7xl mx-auto mt-10 bg-white rounded-3xl p-5 shadow-md border border-slate-200/80 space-y-3.5">
                  <div className="grid md:grid-cols-12 gap-3">
                    <div className="md:col-span-5 relative">
                      <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3.5" />
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
                        <option value="FRUITS">Hill & Mountain Fruits</option>
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
                        <option value="ALL">📍 All Nepal Districts</option>
                        <option value="Kavre">Kavre</option>
                        <option value="Mustang">Mustang</option>
                        <option value="Palpa">Palpa</option>
                        <option value="Jumla">Jumla</option>
                        <option value="Ilam">Ilam</option>
                        <option value="Chitwan">Chitwan</option>
                        <option value="Kailali">Kailali / Dhangadhi</option>
                      </select>
                    </div>
                    <div className="md:col-span-2">
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
                    {searchQuery && (
                      <button
                        onClick={() => setSearchQuery("")}
                        className="text-xs text-red-600 font-bold ml-2 cursor-pointer"
                      >
                        Clear Filter ✕
                      </button>
                    )}
                  </div>
                </div>
              </section>

              {/* 6. EXPLORE BY CATEGORY (8-CARD GRID) */}
              <section className="max-w-7xl mx-auto px-4 sm:px-8 py-10 space-y-6">
                <div className="flex items-end justify-between">
                  <div>
                    <span className="text-[11px] font-extrabold uppercase tracking-widest text-emerald-700">
                      OUR HARVEST RANGE
                    </span>
                    <h2 className="text-2xl sm:text-3xl font-black text-slate-900 mt-0.5">
                      Explore by Category
                    </h2>
                    <p className="text-xs sm:text-sm text-slate-500">
                      Directly sourced fresh vegetables, indigenous grains, and organic goods
                      across Nepal.
                    </p>
                  </div>
                  <button
                    onClick={() => setSelectedCategory("ALL")}
                    className="text-xs font-bold text-[#14532D] hover:underline cursor-pointer"
                  >
                    View All Categories →
                  </button>
                </div>

                <div className="grid grid-cols-2 md:grid-cols-4 gap-5">
                  {CATEGORIES_SHOWCASE.map((cat, idx) => (
                    <div
                      key={idx}
                      onClick={() => {
                        setSelectedCategory(cat.id);
                        document
                          .getElementById("fresh-harvests")
                          ?.scrollIntoView({ behavior: "smooth" });
                      }}
                      className="group bg-white rounded-2xl p-3 border border-slate-200/80 shadow-2xs hover:shadow-md transition cursor-pointer"
                    >
                      <div className="relative rounded-xl overflow-hidden h-36 mb-3">
                        <img
                          src={cat.image}
                          alt={cat.title}
                          className="w-full h-full object-cover group-hover:scale-105 transition duration-300"
                        />
                        <span className="absolute top-2.5 left-2.5 px-2.5 py-0.5 rounded-full bg-white/95 text-slate-800 text-[10px] font-bold shadow-xs">
                          {cat.badge}
                        </span>
                      </div>
                      <h3 className="font-bold text-sm text-slate-900 group-hover:text-[#14532D]">
                        {cat.title}
                      </h3>
                      <p className="text-[11px] text-slate-500">{cat.subtitle}</p>
                    </div>
                  ))}
                </div>
              </section>

              {/* 7. FRESH DAILY HARVESTS (LIVE MARKETPLACE CARDS) */}
              <section id="fresh-harvests" className="max-w-7xl mx-auto px-4 sm:px-8 py-8 space-y-6">
                <div className="flex flex-wrap items-end justify-between gap-4">
                  <div>
                    <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-emerald-100 text-[#14532D] text-[11px] font-bold">
                      ● Live Farm Marketplace
                    </span>
                    <h2 className="text-2xl sm:text-3xl font-black text-slate-900 mt-1">
                      Fresh Daily Harvests
                    </h2>
                    <p className="text-xs sm:text-sm text-slate-500">
                      Harvested by local farmers within 24 hours. Ordered today, at your doorstep
                      tomorrow morning.
                    </p>
                  </div>

                  <div className="flex items-center gap-1.5 bg-white p-1 rounded-xl border border-slate-200">
                    {[
                      { id: "ALL", label: "All Live Batches" },
                      { id: "VEGETABLES", label: "Vegetables" },
                      { id: "FRUITS", label: "Mountain Fruits" },
                      { id: "GRAINS", label: "Grains & Organic" },
                    ].map((tab) => (
                      <button
                        key={tab.id}
                        onClick={() => setSelectedCategory(tab.id)}
                        className={`px-3 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer ${
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

                {/* Product Cards Grid */}
                <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
                  {filteredProducts.map((p) => {
                    const imgUrl = p.image
                      ? p.image.startsWith("http")
                        ? p.image
                        : `${BACKEND_URL}${p.image}`
                      : "https://images.unsplash.com/photo-1540420773420-3366772f4999?auto=format&fit=crop&w=600&q=80";

                    return (
                      <div
                        key={p.id}
                        className="bg-white rounded-3xl p-3.5 border border-slate-200/90 shadow-xs hover:shadow-lg transition flex flex-col justify-between"
                      >
                        <div>
                          <div className="relative h-52 rounded-2xl overflow-hidden mb-3.5">
                            <img src={imgUrl} alt={p.name} className="w-full h-full object-cover" />
                            <span className="absolute top-3 left-3 px-2.5 py-1 rounded-full bg-white/95 text-slate-800 text-[11px] font-bold flex items-center gap-1 shadow-xs">
                              <MapPin className="w-3 h-3 text-emerald-700" />
                              {p.origin_location || "Nepal Farm"}
                            </span>
                            <span className="absolute top-3 right-3 px-2.5 py-1 rounded-full bg-emerald-700 text-white text-[10px] font-bold shadow-xs">
                              {p.tag || "Fresh Batch"}
                            </span>
                          </div>

                          <div className="px-1.5 space-y-1.5">
                            <div className="flex items-center justify-between text-[11px] text-slate-500">
                              <span className="flex items-center gap-1 font-medium text-emerald-800">
                                <User className="w-3.5 h-3.5" /> {p.farmer_name || "Verified Farmer"}
                              </span>
                              <span>
                                {p.stock_quantity} {p.unit} left
                              </span>
                            </div>

                            <h3 className="font-extrabold text-base text-slate-900">{p.name}</h3>
                            <p className="text-xs text-slate-500 line-clamp-2">{p.description}</p>

                            <div className="pt-2 flex items-center justify-between">
                              <div>
                                <span className="text-xl font-black text-slate-900">
                                  रु {p.price}
                                </span>
                                <span className="text-xs text-slate-500"> / {p.unit}</span>
                              </div>
                              <span className="px-2.5 py-0.5 rounded-md bg-emerald-50 text-emerald-800 border border-emerald-200 text-[10px] font-bold">
                                {p.market_note || "Direct Farm Rate"}
                              </span>
                            </div>
                          </div>
                        </div>

                        <div className="mt-4 pt-3 border-t border-slate-100 flex items-center gap-2">
                          <button
                            onClick={() => {
                              setOrderModalProduct(p);
                              setOrderForm({
                                quantity: 1,
                                delivery_address: user.location || "",
                                contact_phone: user.phone_number || "",
                              });
                            }}
                            className="flex-1 py-2.5 px-4 rounded-xl bg-[#14532D] hover:bg-[#1B4332] text-white text-xs font-bold flex items-center justify-center gap-2 transition cursor-pointer"
                          >
                            <ShoppingBag className="w-3.5 h-3.5" /> Add to Basket
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

                {/* Kalimati Wholesale Rate Ticker Banner */}
                <div className="bg-white rounded-2xl p-4 border border-slate-200 flex flex-wrap items-center justify-between gap-4">
                  <div className="flex items-center gap-3">
                    <div className="p-2.5 rounded-xl bg-[#14532D] text-white">
                      <TrendingUp className="w-5 h-5" />
                    </div>
                    <div>
                      <p className="text-xs font-extrabold text-slate-900">
                        Kalimati Market Rate Benchmark
                      </p>
                      <p className="text-xs text-slate-500">
                        Real-time price calibration saves buyers 15–20% while farmers earn 30%
                        more.
                      </p>
                    </div>
                  </div>
                  <button
                    onClick={() => setActiveTab("sell")}
                    className="text-xs font-bold text-[#14532D] border border-emerald-200 bg-emerald-50 px-4 py-2 rounded-xl hover:bg-emerald-100 cursor-pointer"
                  >
                    Sell Your Produce at Fair Rates →
                  </button>
                </div>
              </section>

              {/* 8. TRANSPARENT FROM SOIL TO KITCHEN SECTION */}
              <section className="max-w-7xl mx-auto px-4 sm:px-8 py-12 space-y-8">
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
                  {/* Left: For Buyers */}
                  <div className="bg-white rounded-3xl p-7 border border-slate-200 shadow-2xs space-y-5">
                    <div className="flex items-center justify-between">
                      <h3 className="text-lg font-extrabold text-slate-900 flex items-center gap-2">
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
                            Order at transparent farm-gate prices. See exactly how much money goes
                            into the grower's hands.
                          </p>
                        </div>
                      </div>
                      <div className="flex gap-3.5">
                        <span className="w-6 h-6 rounded-lg bg-[#14532D] text-white font-bold flex items-center justify-center shrink-0">
                          3
                        </span>
                        <div>
                          <p className="font-bold text-slate-900 text-sm">
                            Cold-Chain Valley Express
                          </p>
                          <p className="text-slate-500 mt-0.5">
                            Next-morning doorstep delivery with live Admin chat support.
                          </p>
                        </div>
                      </div>
                    </div>
                    <a
                      href="#fresh-harvests"
                      className="block text-center w-full py-3 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-900 font-bold text-xs transition"
                    >
                      Start Shopping Fresh Harvests →
                    </a>
                  </div>

                  {/* Right: For Nepali Farmers */}
                  <div className="bg-[#EEF6F0] rounded-3xl p-7 border border-emerald-200/80 shadow-2xs space-y-5">
                    <div className="flex items-center justify-between">
                      <h3 className="text-lg font-extrabold text-slate-900 flex items-center gap-2">
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
                            List Harvest via "Sell Your Products"
                          </p>
                          <p className="text-slate-600 mt-0.5">
                            Post a photo of your vegetables, expected quantity, description, and
                            pickup location in under 2 minutes.
                          </p>
                        </div>
                      </div>
                      <div className="flex gap-3.5">
                        <span className="w-6 h-6 rounded-lg bg-[#14532D] text-white font-bold flex items-center justify-center shrink-0">
                          2
                        </span>
                        <div>
                          <p className="font-bold text-slate-900 text-sm">
                            Fair Admin Rate Validation
                          </p>
                          <p className="text-slate-600 mt-0.5">
                            Our Admin team verifies quality and approves your batch directly with
                            fair market payouts.
                          </p>
                        </div>
                      </div>
                      <div className="flex gap-3.5">
                        <span className="w-6 h-6 rounded-lg bg-[#14532D] text-white font-bold flex items-center justify-center shrink-0">
                          3
                        </span>
                        <div>
                          <p className="font-bold text-slate-900 text-sm">
                            Direct Pickup & Instant Settlement
                          </p>
                          <p className="text-slate-600 mt-0.5">
                            No waiting months for payment—receive instant settlement when your
                            harvest is collected.
                          </p>
                        </div>
                      </div>
                    </div>
                    <button
                      onClick={() => setActiveTab("sell")}
                      className="w-full py-3 rounded-xl bg-[#14532D] hover:bg-[#1B4332] text-white font-bold text-xs transition cursor-pointer"
                    >
                      Sell Your Products Now ↗
                    </button>
                  </div>
                </div>
              </section>

              {/* 9. FARMER SPOTLIGHT */}
              <section className="max-w-7xl mx-auto px-4 sm:px-8 py-8 space-y-6">
                <div>
                  <span className="text-[11px] font-extrabold uppercase tracking-widest text-emerald-700">
                    MEET OUR GROWERS
                  </span>
                  <h2 className="text-2xl sm:text-3xl font-black text-slate-900">
                    Farmer Spotlight
                  </h2>
                  <p className="text-xs sm:text-sm text-slate-500">
                    Meet the diligent custodians of Nepal's land who supply fresh crops daily to
                    our marketplace.
                  </p>
                </div>

                <div className="grid md:grid-cols-2 gap-6">
                  <div className="bg-white rounded-3xl p-6 border border-slate-200 space-y-4">
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
                      "For 15 years, I had to sell cabbages and tomatoes to highway middlemen who
                      paid us barely enough for seeds. With KrishiMart, my cooperative gets 35%
                      higher returns directly with digital weighing and instant chat support."
                    </p>
                    <div className="grid grid-cols-3 gap-2 pt-1 text-xs">
                      <div>
                        <strong className="block text-slate-900">12.5 T</strong>
                        <span className="text-[11px] text-slate-400">Harvest Supplied</span>
                      </div>
                      <div>
                        <strong className="block text-slate-900">4.9 / 5 ★</strong>
                        <span className="text-[11px] text-slate-400">Buyer Rating</span>
                      </div>
                      <div>
                        <strong className="block text-slate-900">4 Years</strong>
                        <span className="text-[11px] text-slate-400">With KrishiMart</span>
                      </div>
                    </div>
                  </div>

                  <div className="bg-white rounded-3xl p-6 border border-slate-200 space-y-4">
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
                      "Growing organic vegetables was discouraging when local markets refused to
                      pay fair value for pesticide-free greens. KrishiMart connected our women's
                      group directly to families who value authentic health."
                    </p>
                    <div className="grid grid-cols-3 gap-2 pt-1 text-xs">
                      <div>
                        <strong className="block text-slate-900">180+</strong>
                        <span className="text-[11px] text-slate-400">Batches Sold</span>
                      </div>
                      <div>
                        <strong className="block text-slate-900">100%</strong>
                        <span className="text-[11px] text-slate-400">Certified Organic</span>
                      </div>
                      <div>
                        <strong className="block text-slate-900">42 Families</strong>
                        <span className="text-[11px] text-slate-400">In Cooperative</span>
                      </div>
                    </div>
                  </div>
                </div>
              </section>

              {/* 10. DARK GREEN CTA BANNER ("YOUR HARD WORK DESERVES A FAIR MARKET") */}
              <section className="max-w-7xl mx-auto px-4 sm:px-8 py-8">
                <div className="bg-gradient-to-r from-[#0F3822] to-[#1B5E3A] rounded-3xl p-8 sm:p-10 text-white flex flex-col md:flex-row items-center justify-between gap-6 shadow-xl">
                  <div className="space-y-3 max-w-xl">
                    <span className="inline-block px-3 py-1 rounded-full bg-white/10 text-amber-300 text-[11px] font-bold">
                      🌾 Direct Farmer Collection Network
                    </span>
                    <h2 className="text-2xl sm:text-3xl font-black leading-tight">
                      Your Hard Work Deserves a Fair Market.
                    </h2>
                    <p className="text-xs sm:text-sm text-emerald-100 leading-relaxed">
                      Are you a farmer, cooperative representative, or kitchen-garden grower?
                      Submit your current harvest details with contact and location—our Admin team
                      collects directly from your district hub.
                    </p>
                    <div className="flex flex-wrap gap-3 pt-2">
                      <button
                        onClick={() => setActiveTab("sell")}
                        className="px-5 py-3 rounded-xl bg-[#FDE68A] hover:bg-[#FCD34D] text-slate-950 font-extrabold text-xs cursor-pointer"
                      >
                        🌾 Submit Your Harvest Batch
                      </button>
                      <button
                        onClick={() => setChatDrawerOpen(true)}
                        className="px-5 py-3 rounded-xl bg-white/10 hover:bg-white/20 border border-white/20 text-white font-bold text-xs cursor-pointer"
                      >
                        💬 Chat with Admin Now
                      </button>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3 text-xs w-full md:w-auto">
                    <div className="bg-white/10 p-4 rounded-2xl backdrop-blur-xs">
                      <ShieldCheck className="w-5 h-5 text-amber-400 mb-1" />
                      <p className="font-bold">100% Verified Growers</p>
                      <p className="text-[11px] text-emerald-200">Admin-checked accounts</p>
                    </div>
                    <div className="bg-white/10 p-4 rounded-2xl backdrop-blur-xs">
                      <Scale className="w-5 h-5 text-amber-400 mb-1" />
                      <p className="font-bold">Digital Scale Accuracy</p>
                      <p className="text-[11px] text-emerald-200">Zero weight deductions</p>
                    </div>
                  </div>
                </div>
              </section>
            </>
          )}
        </main>
      )}

      {/* ORDER MODAL */}
      {orderModalProduct && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
          <form
            onSubmit={handlePlaceOrder}
            className="bg-white rounded-3xl max-w-md w-full p-6 space-y-4 shadow-2xl"
          >
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-extrabold text-slate-900">
                Order {orderModalProduct.name}
              </h3>
              <button
                type="button"
                onClick={() => setOrderModalProduct(null)}
                className="p-1 text-slate-400 hover:text-slate-700"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <p className="text-xs text-slate-500">
              Rate: <strong>रु {orderModalProduct.price}</strong> per {orderModalProduct.unit} •
              Origin: {orderModalProduct.origin_location}
            </p>
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Quantity ({orderModalProduct.unit}) *
              </label>
              <input
                type="number"
                min="1"
                required
                value={orderForm.quantity}
                onChange={(e) => setOrderForm({ ...orderForm, quantity: e.target.value })}
                className="w-full px-3.5 py-2 rounded-xl border border-slate-200 text-sm"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Your Contact Phone Number *
              </label>
              <input
                type="text"
                required
                value={orderForm.contact_phone}
                onChange={(e) => setOrderForm({ ...orderForm, contact_phone: e.target.value })}
                className="w-full px-3.5 py-2 rounded-xl border border-slate-200 text-sm"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Delivery Location / Address *
              </label>
              <input
                type="text"
                required
                value={orderForm.delivery_address}
                onChange={(e) => setOrderForm({ ...orderForm, delivery_address: e.target.value })}
                className="w-full px-3.5 py-2 rounded-xl border border-slate-200 text-sm"
              />
            </div>
            <div className="flex gap-2 pt-2">
              <button
                type="button"
                onClick={() => setOrderModalProduct(null)}
                className="flex-1 py-2.5 rounded-xl border border-slate-200 text-xs font-bold text-slate-600 cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="flex-1 py-2.5 rounded-xl bg-[#14532D] text-white text-xs font-bold cursor-pointer"
              >
                Confirm Order (रु {orderModalProduct.price * orderForm.quantity})
              </button>
            </div>
          </form>
        </div>
      )}

      {/* FLOATING LIVE CHAT DRAWER */}
      {chatDrawerOpen && isVerifiedOrAdmin && (
        <div className="fixed bottom-5 right-5 z-50 w-80 sm:w-96 bg-white rounded-3xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col h-[450px]">
          <div className="p-4 bg-[#14532D] text-white flex items-center justify-between">
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
          <div className="flex-1 p-4 overflow-y-auto space-y-2.5 bg-[#F6F8F5]">
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
                    className={`max-w-[75%] px-3.5 py-2 rounded-2xl text-xs ${
                      m.is_from_admin
                        ? "bg-white border border-slate-200 text-slate-800"
                        : "bg-[#14532D] text-white"
                    }`}
                  >
                    <p>{m.message}</p>
                  </div>
                </div>
              ))
            )}
          </div>
          <form
            onSubmit={handleSendUserMessage}
            className="p-3 border-t border-slate-200 bg-white flex gap-2"
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
              <li>
                <button onClick={() => setActiveTab("sell")} className="hover:underline">
                  Sell Your Products to Admin
                </button>
              </li>
              <li>Kalimati Wholesale Rate Index</li>
              <li>Admin Account Verification</li>
              <li>Live Buyer–Seller–Admin Chat</li>
            </ul>
          </div>
          <div>
            <h4 className="font-bold text-slate-900 mb-3">Central Hub Contact</h4>
            <ul className="space-y-2">
              <li>📍 Krishi Bhawan, Kathmandu & Dhangadhi Hub</li>
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