import React, { useState } from "react";
import {
  Sprout,
  Mail,
  Phone,
  Lock,
  User,
  MapPin,
  ShieldCheck,
  ArrowRight,
  Camera,
  X,
  Eye,
  EyeOff,
  KeyRound,
  CheckCircle2,
} from "lucide-react";
import api from "../api";

export default function AuthView({ onAuthSuccess, initialTab = "login", onCancel }) {
  const [isLogin, setIsLogin] = useState(initialTab === "login");
  const [isForgotPassword, setIsForgotPassword] = useState(false);
  const [otpSent, setOtpSent] = useState(false);
  const [loading, setLoading] = useState(false);
  const [isResending, setIsResending] = useState(false);
  const [error, setError] = useState("");
  const [successMsg, setSuccessMsg] = useState("");

  // Show / Hide Password Toggles
  const [showLoginPassword, setShowLoginPassword] = useState(false);
  const [showRegPassword, setShowRegPassword] = useState(false);
  const [showRegConfirmPassword, setShowRegConfirmPassword] = useState(false);
  const [showResetPassword, setShowResetPassword] = useState(false);
  const [showResetConfirm, setShowResetConfirm] = useState(false);

  const [avatarPreview, setAvatarPreview] = useState(null);
  const [avatarFile, setAvatarFile] = useState(null);

  const [loginData, setLoginData] = useState({ identifier: "", password: "" });
  const [resetData, setResetData] = useState({
    email: "",
    otp: "",
    new_password: "",
    confirm_password: "",
  });
  const [registerData, setRegisterData] = useState({
    full_name: "",
    email: "",
    phone_number: "",
    role: "CUSTOMER",
    location: "",
    password: "",
    confirm_password: "",
  });

  const handleAvatarSelect = (e) => {
    const file = e.target.files?.[0];
    if (file) {
      setAvatarFile(file);
      setAvatarPreview(URL.createObjectURL(file));
    }
  };

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

  // STEP 1: Send 6-Digit Code to User's Email
  const handleSendOtp = async (e, isResendAction = false) => {
    if (e && e.preventDefault) e.preventDefault();
    setError("");
    setSuccessMsg("");

    if (!resetData.email.trim()) {
      setError("Please enter your registered email address.");
      return;
    }

    if (isResendAction) {
      setIsResending(true);
    } else {
      setLoading(true);
    }

    try {
      const res = await api.post("/accounts/login/", {
        action: "send_otp",
        email: resetData.email.trim(),
      });
      setSuccessMsg(
        res.data?.message ||
          `A 6-digit verification code was sent to ${resetData.email}.`
      );
      setOtpSent(true);
    } catch (err) {
      setError(
        err.response?.data?.error ||
          "Could not send code. Please ensure this email is registered with KrishiMart."
      );
    } finally {
      setLoading(false);
      setIsResending(false);
    }
  };

  // STEP 2: Verify Code and Update Password
  const handleVerifyOtpAndReset = async (e) => {
    e.preventDefault();
    setError("");
    setSuccessMsg("");

    if (resetData.new_password !== resetData.confirm_password) {
      setError("New passwords do not match.");
      return;
    }

    setLoading(true);
    try {
      const res = await api.post("/accounts/login/", {
        action: "verify_otp_and_reset",
        email: resetData.email.trim(),
        otp: resetData.otp.trim(),
        new_password: resetData.new_password,
      });

      setSuccessMsg(
        res.data?.message ||
          "Password reset successfully! Please sign in with your new password."
      );
      setIsForgotPassword(false);
      setOtpSent(false);
      setIsLogin(true);
      setLoginData({
        identifier: resetData.email.trim(),
        password: "",
      });
      setResetData({
        email: "",
        otp: "",
        new_password: "",
        confirm_password: "",
      });
    } catch (err) {
      setError(
        err.response?.data?.error ||
          "Invalid or expired verification code. Please check and try again."
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
      const formData = new FormData();
      Object.entries(registerData).forEach(([k, v]) => {
        if (v !== null && v !== "") formData.append(k, v);
      });
      if (avatarFile) {
        formData.append("profile_picture", avatarFile);
      }

      const res = await api.post("/accounts/register/", formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });

      setSuccessMsg(
        res.data.message ||
          "Account created! Please sign in below to check your Admin verification status."
      );
      setIsLogin(true);
      setLoginData({
        identifier: registerData.email || registerData.phone_number,
        password: "",
      });
      setAvatarFile(null);
      setAvatarPreview(null);
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
    <div className="relative w-full max-w-md bg-white rounded-3xl shadow-2xl border border-emerald-950/10 p-6 sm:p-8 mx-auto">
      {onCancel && (
        <button
          onClick={onCancel}
          className="absolute top-4 right-4 p-2 text-slate-400 hover:text-slate-700 rounded-full cursor-pointer"
        >
          <X className="w-5 h-5" />
        </button>
      )}

      {!isForgotPassword && (
        <div className="flex bg-emerald-950/5 p-1 rounded-2xl mb-6">
          <button
            type="button"
            onClick={() => {
              setIsLogin(true);
              setIsForgotPassword(false);
              setOtpSent(false);
              setError("");
            }}
            className={`flex-1 py-2.5 text-xs sm:text-sm font-semibold rounded-xl transition cursor-pointer ${
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
              setIsForgotPassword(false);
              setOtpSent(false);
              setError("");
            }}
            className={`flex-1 py-2.5 text-xs sm:text-sm font-semibold rounded-xl transition cursor-pointer ${
              !isLogin
                ? "bg-[#1B4332] text-white shadow-sm"
                : "text-slate-600 hover:text-slate-900"
            }`}
          >
            Create Account
          </button>
        </div>
      )}

      {error && (
        <div className="mb-4 p-3.5 rounded-xl bg-red-50 border border-red-200 text-red-700 text-xs sm:text-sm font-medium">
          {error}
        </div>
      )}

      {successMsg && (
        <div className="mb-4 p-3.5 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs sm:text-sm font-medium">
          {successMsg}
        </div>
      )}

      {isForgotPassword ? (
        !otpSent ? (
          /* STEP 1: Enter Email & Request 6-Digit Code */
          <form onSubmit={(e) => handleSendOtp(e, false)} className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-xl font-bold text-slate-900 flex items-center gap-2">
                  <KeyRound className="w-5 h-5 text-[#1B4332]" />
                  Forgot Password?
                </h2>
                <p className="text-xs text-slate-500 mt-0.5">
                  Enter your registered email address to receive a 6-digit verification code.
                </p>
              </div>
              <button
                type="button"
                onClick={() => {
                  setIsForgotPassword(false);
                  setOtpSent(false);
                  setError("");
                }}
                className="text-xs font-bold text-[#1B4332] hover:underline cursor-pointer"
              >
                ← Back
              </button>
            </div>

            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-600 mb-1.5">
                Registered Email Address *
              </label>
              <div className="relative">
                <Mail className="w-4 h-4 text-slate-400 absolute left-3.5 top-3.5" />
                <input
                  type="email"
                  required
                  placeholder="e.g. ram@gmail.com"
                  value={resetData.email}
                  onChange={(e) => setResetData({ ...resetData, email: e.target.value })}
                  className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-200 text-sm outline-none focus:border-[#2D6A4F]"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 px-4 bg-[#1B4332] hover:bg-[#2D6A4F] text-white font-semibold rounded-xl shadow-md transition flex items-center justify-center gap-2 cursor-pointer text-sm"
            >
              {loading ? "Sending Code..." : "Send Verification Code"}
              <ArrowRight className="w-4 h-4" />
            </button>
          </form>
        ) : (
          /* STEP 2: Enter 6-Digit Code & Set New Password */
          <form onSubmit={handleVerifyOtpAndReset} className="space-y-3.5">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-xl font-bold text-slate-900 flex items-center gap-2">
                  <CheckCircle2 className="w-5 h-5 text-emerald-700" />
                  Enter Verification Code
                </h2>
                <p className="text-xs text-slate-500 mt-0.5">
                  Code sent to <strong>{resetData.email}</strong>.
                </p>
              </div>
              <button
                type="button"
                onClick={() => {
                  setOtpSent(false);
                  setError("");
                }}
                className="text-xs font-bold text-[#1B4332] hover:underline cursor-pointer"
              >
                Change Email
              </button>
            </div>

            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-600 mb-1">
                6-Digit Verification Code *
              </label>
              <input
                type="text"
                required
                maxLength={6}
                placeholder="e.g. 482915"
                value={resetData.otp}
                onChange={(e) =>
                  setResetData({ ...resetData, otp: e.target.value.replace(/\D/g, "") })
                }
                className="w-full px-4 py-2.5 rounded-xl border-2 border-emerald-600/40 text-center tracking-widest text-lg font-black text-slate-900 outline-none focus:border-[#1B4332]"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">
                  New Password *
                </label>
                <div className="relative">
                  <input
                    type={showResetPassword ? "text" : "password"}
                    required
                    minLength={8}
                    placeholder="Min 8 chars"
                    value={resetData.new_password}
                    onChange={(e) => setResetData({ ...resetData, new_password: e.target.value })}
                    className="w-full pl-3 pr-9 py-2 rounded-xl border border-slate-200 text-sm outline-none focus:border-[#2D6A4F]"
                  />
                  <button
                    type="button"
                    onClick={() => setShowResetPassword((prev) => !prev)}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700 cursor-pointer"
                    title={showResetPassword ? "Hide password" : "Show password"}
                  >
                    {showResetPassword ? (
                      <EyeOff className="w-4 h-4" />
                    ) : (
                      <Eye className="w-4 h-4" />
                    )}
                  </button>
                </div>
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">
                  Confirm Password *
                </label>
                <div className="relative">
                  <input
                    type={showResetConfirm ? "text" : "password"}
                    required
                    minLength={8}
                    placeholder="Repeat password"
                    value={resetData.confirm_password}
                    onChange={(e) =>
                      setResetData({ ...resetData, confirm_password: e.target.value })
                    }
                    className="w-full pl-3 pr-9 py-2 rounded-xl border border-slate-200 text-sm outline-none focus:border-[#2D6A4F]"
                  />
                  <button
                    type="button"
                    onClick={() => setShowResetConfirm((prev) => !prev)}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700 cursor-pointer"
                    title={showResetConfirm ? "Hide password" : "Show password"}
                  >
                    {showResetConfirm ? (
                      <EyeOff className="w-4 h-4" />
                    ) : (
                      <Eye className="w-4 h-4" />
                    )}
                  </button>
                </div>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading || isResending}
              className="w-full py-3 px-4 bg-[#1B4332] hover:bg-[#2D6A4F] text-white font-semibold rounded-xl shadow-md transition flex items-center justify-center gap-2 cursor-pointer text-sm"
            >
              {loading ? "Verifying..." : "Verify Code & Change Password"}
              <ArrowRight className="w-4 h-4" />
            </button>

            <p className="text-center text-xs text-slate-400 pt-1">
              Didn't receive the email?{" "}
              <button
                type="button"
                disabled={isResending || loading}
                onClick={(e) => handleSendOtp(e, true)}
                className="font-bold text-[#1B4332] hover:underline cursor-pointer disabled:text-slate-400"
              >
                {isResending ? "Resending..." : "Resend Code"}
              </button>
            </p>
          </form>
        )
      ) : isLogin ? (
        <form onSubmit={handleLogin} className="space-y-4">
          <div>
            <h2 className="text-xl sm:text-2xl font-bold text-slate-900">Welcome Back</h2>
            <p className="text-xs text-slate-500 mt-1">
              Sign in with your registered <strong>Email</strong> or <strong>Phone Number</strong>.
            </p>
          </div>

          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-600 mb-1.5">
              Email or Phone Number *
            </label>
            <div className="relative">
              <Mail className="w-4 h-4 text-slate-400 absolute left-3.5 top-3.5" />
              <input
                type="text"
                required
                placeholder="e.g. ram@gmail.com or 9841234567"
                value={loginData.identifier}
                onChange={(e) => setLoginData({ ...loginData, identifier: e.target.value })}
                className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-200 text-sm outline-none focus:border-[#2D6A4F]"
              />
            </div>
          </div>

          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-600">
                Password *
              </label>
              <button
                type="button"
                onClick={() => {
                  setIsForgotPassword(true);
                  setOtpSent(false);
                  setError("");
                  setSuccessMsg("");
                }}
                className="text-xs font-bold text-[#1B4332] hover:underline cursor-pointer"
              >
                Forgot Password?
              </button>
            </div>
            <div className="relative">
              <Lock className="w-4 h-4 text-slate-400 absolute left-3.5 top-3.5" />
              <input
                type={showLoginPassword ? "text" : "password"}
                required
                placeholder="Enter your password"
                value={loginData.password}
                onChange={(e) => setLoginData({ ...loginData, password: e.target.value })}
                className="w-full pl-10 pr-10 py-2.5 rounded-xl border border-slate-200 text-sm outline-none focus:border-[#2D6A4F]"
              />
              <button
                type="button"
                onClick={() => setShowLoginPassword((prev) => !prev)}
                className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700 cursor-pointer"
                title={showLoginPassword ? "Hide password" : "Show password"}
              >
                {showLoginPassword ? (
                  <EyeOff className="w-4 h-4" />
                ) : (
                  <Eye className="w-4 h-4" />
                )}
              </button>
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 px-4 bg-[#1B4332] hover:bg-[#2D6A4F] text-white font-semibold rounded-xl shadow-md transition flex items-center justify-center gap-2 cursor-pointer text-sm"
          >
            {loading ? "Signing in..." : "Sign In to KrishiMart"}
            <ArrowRight className="w-4 h-4" />
          </button>
        </form>
      ) : (
        <form onSubmit={handleRegister} className="space-y-3.5 max-h-[75vh] overflow-y-auto pr-1">
          <div>
            <h2 className="text-xl sm:text-2xl font-bold text-slate-900">Join KrishiMart</h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Farmers get harvest selling access. Customers get farm-fresh produce.
            </p>
          </div>

          {/* Profile Picture Upload with Preview */}
          <div className="flex items-center gap-4 py-1">
            <div className="relative w-16 h-16 rounded-full bg-slate-100 border-2 border-emerald-600/30 overflow-hidden flex items-center justify-center shrink-0">
              {avatarPreview ? (
                <img src={avatarPreview} alt="Avatar" className="w-full h-full object-cover" />
              ) : (
                <User className="w-7 h-7 text-slate-400" />
              )}
            </div>
            <div>
              <label
                htmlFor="signup-avatar"
                className="px-3 py-1.5 rounded-xl border border-slate-200 hover:bg-slate-50 text-slate-700 text-xs font-bold flex items-center gap-1.5 cursor-pointer"
              >
                <Camera className="w-3.5 h-3.5 text-emerald-700" />
                {avatarPreview ? "Change Photo" : "Add Profile Picture"}
              </label>
              <input
                id="signup-avatar"
                type="file"
                accept="image/*"
                onChange={handleAvatarSelect}
                className="hidden"
              />
              <span className="text-[10px] text-slate-400 block mt-0.5">PNG, JPG up to 5MB</span>
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1">Full Name *</label>
            <div className="relative">
              <User className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
              <input
                type="text"
                required
                placeholder="Ram Bahadur Thapa"
                value={registerData.full_name}
                onChange={(e) => setRegisterData({ ...registerData, full_name: e.target.value })}
                className="w-full pl-10 pr-4 py-2 rounded-xl border border-slate-200 text-sm"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1">Email</label>
              <input
                type="email"
                placeholder="ram@example.com"
                value={registerData.email}
                onChange={(e) => setRegisterData({ ...registerData, email: e.target.value })}
                className="w-full px-3 py-2 rounded-xl border border-slate-200 text-sm"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1">Phone *</label>
              <input
                type="text"
                placeholder="9841234567"
                value={registerData.phone_number}
                onChange={(e) =>
                  setRegisterData({ ...registerData, phone_number: e.target.value })
                }
                className="w-full px-3 py-2 rounded-xl border border-slate-200 text-sm"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1">
                Account Type *
              </label>
              <select
                value={registerData.role}
                onChange={(e) => setRegisterData({ ...registerData, role: e.target.value })}
                className="w-full px-3 py-2 rounded-xl border border-slate-200 text-sm bg-white font-medium"
              >
                <option value="CUSTOMER">Customer (Buyer Only)</option>
                <option value="FARMER">Farmer (Can Sell & Buy)</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1">Location</label>
              <input
                type="text"
                placeholder="Dhangadhi / Kavre"
                value={registerData.location}
                onChange={(e) => setRegisterData({ ...registerData, location: e.target.value })}
                className="w-full px-3 py-2 rounded-xl border border-slate-200 text-sm"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1">Password *</label>
              <div className="relative">
                <input
                  type={showRegPassword ? "text" : "password"}
                  required
                  minLength={8}
                  placeholder="Min 8 chars"
                  value={registerData.password}
                  onChange={(e) => setRegisterData({ ...registerData, password: e.target.value })}
                  className="w-full pl-3 pr-9 py-2 rounded-xl border border-slate-200 text-sm"
                />
                <button
                  type="button"
                  onClick={() => setShowRegPassword((prev) => !prev)}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700 cursor-pointer"
                  title={showRegPassword ? "Hide password" : "Show password"}
                >
                  {showRegPassword ? (
                    <EyeOff className="w-4 h-4" />
                  ) : (
                    <Eye className="w-4 h-4" />
                  )}
                </button>
              </div>
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1">Confirm *</label>
              <div className="relative">
                <input
                  type={showRegConfirmPassword ? "text" : "password"}
                  required
                  minLength={8}
                  placeholder="Repeat password"
                  value={registerData.confirm_password}
                  onChange={(e) =>
                    setRegisterData({ ...registerData, confirm_password: e.target.value })
                  }
                  className="w-full pl-3 pr-9 py-2 rounded-xl border border-slate-200 text-sm"
                />
                <button
                  type="button"
                  onClick={() => setShowRegConfirmPassword((prev) => !prev)}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700 cursor-pointer"
                  title={showRegConfirmPassword ? "Hide password" : "Show password"}
                >
                  {showRegConfirmPassword ? (
                    <EyeOff className="w-4 h-4" />
                  ) : (
                    <Eye className="w-4 h-4" />
                  )}
                </button>
              </div>
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 px-4 bg-amber-600 hover:bg-amber-700 text-white font-semibold rounded-xl shadow-md transition cursor-pointer text-sm"
          >
            {loading ? "Registering..." : "Register & Request Verification"}
          </button>
        </form>
      )}
    </div>
  );
}