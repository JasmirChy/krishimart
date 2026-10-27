import React, { useState } from "react";
import { Sprout, Mail, Phone, Lock, User, MapPin, ShieldCheck, ArrowRight } from "lucide-react";
import api from "../api";

export default function AuthView({ onAuthSuccess }) {
  const [isLogin, setIsLogin] = useState(true);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [successMsg, setSuccessMsg] = useState("");

  const [loginData, setLoginData] = useState({ identifier: "", password: "" });
  const [registerData, setRegisterData] = useState({
    full_name: "",
    email: "",
    phone_number: "",
    role: "CUSTOMER",
    location: "",
    password: "",
    confirm_password: "",
  });

  const handleLogin = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const res = await api.post("/accounts/login/", loginData);
      localStorage.setItem("krishimart_access", res.data.tokens.access);
      localStorage.setItem("krishimart_refresh", res.data.tokens.refresh);
      onAuthSuccess(res.data.user);
    } catch (err) {
      const data = err.response?.data;
      setError(
        data?.non_field_errors?.[0] ||
          data?.detail ||
          "Invalid Email/Phone or Password. Please try again."
      );
    } finally {
      setLoading(false);
    }
  };

  const handleRegister = async (e) => {
    e.preventDefault();
    setError("");
    setSuccessMsg("");

    if (!registerData.email.trim() && !registerData.phone_number.trim()) {
      setError("Please provide at least an Email address or a Phone number.");
      return;
    }
    if (registerData.password !== registerData.confirm_password) {
      setError("Passwords do not match.");
      return;
    }

    setLoading(true);
    try {
      const res = await api.post("/accounts/register/", registerData);
      setSuccessMsg(
        res.data.message ||
          "Account created! Sign in below to check your Admin verification status."
      );
      setIsLogin(true);
      setLoginData({
        identifier: registerData.email || registerData.phone_number,
        password: "",
      });
    } catch (err) {
      const data = err.response?.data;
      if (data && typeof data === "object") {
        const firstKey = Object.keys(data)[0];
        const msg = Array.isArray(data[firstKey]) ? data[firstKey][0] : data[firstKey];
        setError(`${firstKey}: ${msg}`);
      } else {
        setError("Registration failed. Please check your details.");
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen grid lg:grid-cols-2 bg-[#F8FAF7]">
      {/* Left Hero Panel */}
      <div className="hidden lg:flex flex-col justify-between p-12 bg-gradient-to-br from-[#1B4332] via-[#2D6A4F] to-[#081C15] text-white relative overflow-hidden">
        <div className="relative z-10 flex items-center gap-3">
          <div className="p-2.5 bg-amber-500 rounded-xl text-slate-950 font-bold shadow-lg">
            <Sprout className="w-7 h-7" />
          </div>
          <div>
            <span className="text-2xl font-extrabold tracking-tight">KrishiMart</span>
            <span className="block text-xs text-emerald-200 uppercase tracking-widest">
              Farm-to-Table Marketplace
            </span>
          </div>
        </div>

        <div className="relative z-10 max-w-lg space-y-6">
          <span className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full text-xs font-semibold bg-emerald-800/70 border border-emerald-600/40 text-emerald-100">
            <ShieldCheck className="w-4 h-4 text-amber-400" /> Admin-Verified Agricultural Network
          </span>
          <h1 className="text-4xl font-extrabold leading-tight">
            Direct from Local Farmers to Your Kitchen.
          </h1>
          <p className="text-emerald-100/90 text-base leading-relaxed">
            Whether you are a farmer looking to sell fresh vegetables directly to our store or a
            customer buying organic local produce, KrishiMart connects you with verified trust and
            live support.
          </p>
          <div className="grid grid-cols-3 gap-4 pt-4 border-t border-emerald-700/50 text-sm">
            <div>
              <p className="font-bold text-amber-400 text-lg">100% Verified</p>
              <p className="text-emerald-200 text-xs">Admin-approved buyers & sellers</p>
            </div>
            <div>
              <p className="font-bold text-amber-400 text-lg">Direct Selling</p>
              <p className="text-emerald-200 text-xs">Sell your harvest in minutes</p>
            </div>
            <div>
              <p className="font-bold text-amber-400 text-lg">Live Chat</p>
              <p className="text-emerald-200 text-xs">Instant chat with Admin</p>
            </div>
          </div>
        </div>

        <p className="relative z-10 text-xs text-emerald-300/70">
          © {new Date().getFullYear()} KrishiMart Agro Platform. All rights reserved.
        </p>
      </div>

      {/* Right Form Panel */}
      <div className="flex items-center justify-center p-6 sm:p-12">
        <div className="w-full max-w-md bg-white rounded-3xl shadow-xl border border-emerald-950/10 p-8">
          <div className="flex bg-emerald-950/5 p-1 rounded-2xl mb-6">
            <button
              type="button"
              onClick={() => {
                setIsLogin(true);
                setError("");
              }}
              className={`flex-1 py-2.5 text-sm font-semibold rounded-xl transition ${
                isLogin
                  ? "bg-[#1B4332] text-white shadow-sm"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              Sign In
            </button>
            <button
              type="button"
              onClick={() => {
                setIsLogin(false);
                setError("");
              }}
              className={`flex-1 py-2.5 text-sm font-semibold rounded-xl transition ${
                !isLogin
                  ? "bg-[#1B4332] text-white shadow-sm"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              Create Account
            </button>
          </div>

          {error && (
            <div className="mb-4 p-3.5 rounded-xl bg-red-50 border border-red-200 text-red-700 text-sm font-medium">
              {error}
            </div>
          )}

          {successMsg && (
            <div className="mb-4 p-3.5 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-sm font-medium">
              {successMsg}
            </div>
          )}

          {isLogin ? (
            <form onSubmit={handleLogin} className="space-y-4">
              <div>
                <h2 className="text-2xl font-bold text-slate-900">Welcome Back</h2>
                <p className="text-sm text-slate-500 mt-1">
                  Sign in with your registered <strong>Email</strong> or{" "}
                  <strong>Phone Number</strong>.
                </p>
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-600 mb-1.5">
                  Email or Phone Number
                </label>
                <div className="relative">
                  <Mail className="w-4 h-4 text-slate-400 absolute left-3.5 top-3.5" />
                  <input
                    type="text"
                    required
                    placeholder="e.g. ram@gmail.com or 9841234567"
                    value={loginData.identifier}
                    onChange={(e) =>
                      setLoginData({ ...loginData, identifier: e.target.value })
                    }
                    className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-200 focus:border-[#2D6A4F] focus:ring-2 focus:ring-[#2D6A4F]/20 outline-none text-sm"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-600 mb-1.5">
                  Password
                </label>
                <div className="relative">
                  <Lock className="w-4 h-4 text-slate-400 absolute left-3.5 top-3.5" />
                  <input
                    type="password"
                    required
                    placeholder="Enter your password"
                    value={loginData.password}
                    onChange={(e) =>
                      setLoginData({ ...loginData, password: e.target.value })
                    }
                    className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-200 focus:border-[#2D6A4F] focus:ring-2 focus:ring-[#2D6A4F]/20 outline-none text-sm"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full py-3 px-4 bg-[#1B4332] hover:bg-[#2D6A4F] text-white font-semibold rounded-xl shadow-md transition flex items-center justify-center gap-2 cursor-pointer"
              >
                {loading ? "Signing in..." : "Sign In to KrishiMart"}
                <ArrowRight className="w-4 h-4" />
              </button>
            </form>
          ) : (
            <form onSubmit={handleRegister} className="space-y-3.5">
              <div>
                <h2 className="text-2xl font-bold text-slate-900">Join KrishiMart</h2>
                <p className="text-xs text-slate-500 mt-1">
                  Register with your email or phone number. Once verified by the Admin, you get
                  full access to buy, sell, and chat.
                </p>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">
                  Full Name *
                </label>
                <div className="relative">
                  <User className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
                  <input
                    type="text"
                    required
                    placeholder="Ram Bahadur Thapa"
                    value={registerData.full_name}
                    onChange={(e) =>
                      setRegisterData({ ...registerData, full_name: e.target.value })
                    }
                    className="w-full pl-10 pr-4 py-2 rounded-xl border border-slate-200 text-sm"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1">
                    Email Address
                  </label>
                  <div className="relative">
                    <Mail className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                    <input
                      type="email"
                      placeholder="ram@example.com"
                      value={registerData.email}
                      onChange={(e) =>
                        setRegisterData({ ...registerData, email: e.target.value })
                      }
                      className="w-full pl-9 pr-3 py-2 rounded-xl border border-slate-200 text-sm"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1">
                    Phone Number
                  </label>
                  <div className="relative">
                    <Phone className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                    <input
                      type="text"
                      placeholder="9841234567"
                      value={registerData.phone_number}
                      onChange={(e) =>
                        setRegisterData({ ...registerData, phone_number: e.target.value })
                      }
                      className="w-full pl-9 pr-3 py-2 rounded-xl border border-slate-200 text-sm"
                    />
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1">
                    Account Type *
                  </label>
                  <select
                    value={registerData.role}
                    onChange={(e) =>
                      setRegisterData({ ...registerData, role: e.target.value })
                    }
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 text-sm bg-white"
                  >
                    <option value="CUSTOMER">Customer (Buyer)</option>
                    <option value="FARMER">Farmer (Seller)</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1">
                    Location / Address
                  </label>
                  <div className="relative">
                    <MapPin className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                    <input
                      type="text"
                      placeholder="Dhangadhi, Kailali"
                      value={registerData.location}
                      onChange={(e) =>
                        setRegisterData({ ...registerData, location: e.target.value })
                      }
                      className="w-full pl-9 pr-3 py-2 rounded-xl border border-slate-200 text-sm"
                    />
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1">
                    Password *
                  </label>
                  <input
                    type="password"
                    required
                    minLength={8}
                    placeholder="Min 8 chars"
                    value={registerData.password}
                    onChange={(e) =>
                      setRegisterData({ ...registerData, password: e.target.value })
                    }
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 text-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1">
                    Confirm Password *
                  </label>
                  <input
                    type="password"
                    required
                    minLength={8}
                    placeholder="Repeat password"
                    value={registerData.confirm_password}
                    onChange={(e) =>
                      setRegisterData({
                        ...registerData,
                        confirm_password: e.target.value,
                      })
                    }
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 text-sm"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full py-3 px-4 bg-amber-600 hover:bg-amber-700 text-white font-semibold rounded-xl shadow-md transition cursor-pointer"
              >
                {loading ? "Submitting..." : "Register & Request Admin Verification"}
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}