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
    icon: "🥬",
    shortLabel: "Vegetables",
    title: "Fresh Vegetables",
    subtitle: "Tomatoes, potatoes, leafy greens",
    image:
      "https://images.unsplash.com/photo-1540420773420-3366772f4999?auto=format&fit=crop&w=600&q=80",
  },
  {
    id: "FRUITS",
    icon: "🍎",
    shortLabel: "Fruits",
    title: "Hill & Mountain Fruits",
    subtitle: "Mustang apples, citrus, banana",
    image:
      "https://images.unsplash.com/photo-1619566636858-adf3ef46400b?auto=format&fit=crop&w=600&q=80",
  },
  {
    id: "GRAINS",
    icon: "🌾",
    shortLabel: "Grains & Pulses",
    title: "Grains, Rice & Pulses",
    subtitle: "Jumla Marsi, Basmati, Mustang dal",
    image:
      "https://images.unsplash.com/photo-1586201375761-83865001e31c?auto=format&fit=crop&w=600&q=80",
  },
  {
    id: "SPICES",
    icon: "🌶️",
    shortLabel: "Spices & Herbs",
    title: "Spices & Aromatics",
    subtitle: "Akabare chili, Timur, ginger, garlic",
    image:
      "https://images.unsplash.com/photo-1596040033229-a9821ebd058d?auto=format&fit=crop&w=600&q=80",
  },
  {
    id: "DAIRY",
    icon: "🍯",
    shortLabel: "Dairy & Honey",
    title: "Dairy, Oils & Honey",
    subtitle: "Wild honey, pure ghee, mustard oil",
    image:
      "https://images.unsplash.com/photo-1587049352847-4a222e784d38?auto=format&fit=crop&w=600&q=80",
  },
];

// Bilingual (English + Romanized Nepali + Devanagari) Agricultural Synonym Groups for High-Accuracy Search
const AGRI_SYNONYM_GROUPS = [
  ["tomato", "tomatoes", "golbheda", "tamatar", "टमाटर", "गोलभेडा"],
  ["potato", "potatoes", "aalu", "alu", "आलु"],
  ["apple", "apples", "syau", "marpha", "स्याउ"],
  ["rice", "chamal", "marsi", "dhan", "basmati", "चामल", "मार्सी", "धान"],
  ["chili", "chilli", "chilies", "chillies", "khursani", "akabare", "dalle", "खुर्सानी", "अकबरे"],
  ["onion", "onions", "pyaj", "प्याज"],
  ["garlic", "lasun", "लसुन"],
  ["ginger", "aduwa", "अदुवा"],
  ["cauliflower", "kauli", "काउली"],
  ["cabbage", "banda", "बन्दा"],
  ["spinach", "saag", "rayo", "palungo", "greens", "leafy", "साग", "रायो", "पालुङ्गो"],
  ["honey", "maha", "bee", "मह"],
  ["oil", "mustard", "tori", "tel", "तोरी", "तेल"],
  ["ghee", "ghiu", "dairy", "milk", "dudh", "curd", "dahi", "paneer", "घिउ", "दूध", "दही"],
  ["bean", "beans", "dal", "daal", "lentil", "lentils", "pulse", "pulses", "simi", "gedagudi", "दाल", "सिमी"],
  ["cucumber", "kankro", "काँक्रो"],
  ["pumpkin", "farsi", "फर्सी"],
  ["radish", "mula", "मूला"],
  ["carrot", "carrots", "gajar", "गाजर"],
  ["banana", "bananas", "kera", "केरा"],
  ["orange", "oranges", "suntala", "citrus", "सुन्तला"],
  ["lemon", "kagati", "lime", "कागती"],
  ["cardamom", "alainchi", "elaichi", "अलैंची"],
  ["turmeric", "besar", "besaar", "बेसार"],
  ["timur", "sichuan", "pepper", "टिमुर"],
  ["vegetable", "vegetables", "veg", "tarkari", "तरकारी"],
  ["fruit", "fruits", "falful", "फलफूल"],
  ["grain", "grains", "cereal", "cereals", "khadya", "खाद्यान्न"],
  ["spice", "spices", "masala", "herb", "herbs", "मसला"],
];

function stemAgriWord(word) {
  const w = (word || "").toLowerCase().trim();
  if (w.length <= 3) return w;
  if (w.endsWith("atoes")) return w.slice(0, -2); // tomatoes -> tomato, potatoes -> potato
  if (w.endsWith("ies") && w.length > 4) return w.slice(0, -3) + "y"; // berries -> berry, chilies -> chily
  if (w.endsWith("es") && (w.endsWith("ches") || w.endsWith("shes") || w.endsWith("xes"))) {
    return w.slice(0, -2);
  }
  if (w.endsWith("s") && !w.endsWith("ss")) return w.slice(0, -1);
  return w;
}

function expandSearchToken(token) {
  const clean = (token || "").toLowerCase().trim();
  const stemmed = stemAgriWord(clean);
  const terms = new Set([clean, stemmed]);
  for (const grp of AGRI_SYNONYM_GROUPS) {
    if (grp.some((g) => g === clean || g === stemmed || (clean.length >= 4 && g.includes(clean)))) {
      grp.forEach((g) => {
        terms.add(g);
        terms.add(stemAgriWord(g));
      });
    }
  }
  return Array.from(terms).filter(Boolean);
}

function getCanonicalProductCategory(product) {
  const rawCat = (product?.category || "").toUpperCase().trim();
  if (["VEGETABLES", "FRUITS", "GRAINS", "SPICES", "DAIRY"].includes(rawCat)) {
    return rawCat;
  }
  const text = `${rawCat} ${product?.name || ""}`.toLowerCase();
  if (text.includes("fruit") || text.includes("apple") || text.includes("banana") || text.includes("orange"))
    return "FRUITS";
  if (text.includes("grain") || text.includes("rice") || text.includes("marsi") || text.includes("dal") || text.includes("pulse") || text.includes("bean"))
    return "GRAINS";
  if (text.includes("spice") || text.includes("chili") || text.includes("khursani") || text.includes("timur") || text.includes("ginger") || text.includes("garlic") || text.includes("turmeric"))
    return "SPICES";
  if (text.includes("dairy") || text.includes("honey") || text.includes("oil") || text.includes("ghee") || text.includes("milk"))
    return "DAIRY";
  return "VEGETABLES";
}

function computeProductSearchRelevance(product, rawQuery) {
  const q = (rawQuery || "").toLowerCase().trim();
  if (!q) return 1; // Neutral positive score when no search query is entered

  const name = (product?.name || "").toLowerCase();
  const desc = (product?.description || "").toLowerCase();
  const origin = (product?.origin_location || "").toLowerCase();
  const cat = getCanonicalProductCategory(product).toLowerCase();
  const fullCatText = `${cat} ${(product?.category || "").toLowerCase()}`;

  // 1. Direct full-phrase match bonus
  let totalScore = 0;
  if (name === q) totalScore += 150;
  else if (name.startsWith(q)) totalScore += 110;
  else if (name.includes(q)) totalScore += 85;
  if (origin.includes(q)) totalScore += 55;
  if (fullCatText.includes(q)) totalScore += 45;
  if (desc.includes(q)) totalScore += 25;

  // 2. Tokenized & synonym-aware matching
  const rawTokens = q
    .split(/[\s,.-]+/)
    .map((t) => t.trim())
    .filter((t) => t.length > 0);
  if (rawTokens.length === 0) return 1;

  const fillerModifiers = new Set(["fresh", "organic", "local", "pure", "natural", "nepali", "farm", "raw", "best"]);
  const coreTokens = rawTokens.filter((t) => !fillerModifiers.has(t));
  const tokensToEvaluate = coreTokens.length > 0 ? coreTokens : rawTokens;

  let matchedCoreTokens = 0;
  for (const tok of tokensToEvaluate) {
    const synonyms = expandSearchToken(tok);
    let tokenScore = 0;
    for (const syn of synonyms) {
      if (!syn) continue;
      if (name === syn || name.startsWith(syn + " ") || name.endsWith(" " + syn)) {
        tokenScore = Math.max(tokenScore, 80);
      } else if (name.includes(syn)) {
        tokenScore = Math.max(tokenScore, 65);
      } else if (origin.includes(syn)) {
        tokenScore = Math.max(tokenScore, 45);
      } else if (fullCatText.includes(syn)) {
        tokenScore = Math.max(tokenScore, 40);
      } else if (desc.includes(syn)) {
        tokenScore = Math.max(tokenScore, 20);
      }
    }
    if (tokenScore > 0) {
      matchedCoreTokens += 1;
      totalScore += tokenScore;
    }
  }

  // Require all core search tokens to match at least one field/synonym for high precision
  if (matchedCoreTokens < tokensToEvaluate.length && totalScore < 85) {
    return 0;
  }

  // Bonus if modifier words (like "organic", "local", "mustang") also match
  for (const mod of rawTokens.filter((t) => fillerModifiers.has(t))) {
    if (name.includes(mod) || desc.includes(mod)) {
      totalScore += 15;
    }
  }

  return totalScore;
}

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

function getFallbackProductImage(product) {
  const name = ((product?.name || "") + " " + (product?.category || "")).toLowerCase();
  if (name.includes("tomato") || name.includes("golbheda"))
    return "https://images.unsplash.com/photo-1592924357228-91a4daadcfea?auto=format&fit=crop&w=700&q=80";
  if (name.includes("apple") || name.includes("syau"))
    return "https://images.unsplash.com/photo-1560806887-1e4cd0b6cbd6?auto=format&fit=crop&w=700&q=80";
  if (name.includes("potato") || name.includes("aalu"))
    return "https://images.unsplash.com/photo-1518977676601-b53f82aba655?auto=format&fit=crop&w=700&q=80";
  if (name.includes("rice") || name.includes("marsi") || name.includes("chamal") || name.includes("grain"))
    return "https://images.unsplash.com/photo-1536304993881-ff6e9eefa2a6?auto=format&fit=crop&w=700&q=80";
  if (name.includes("chili") || name.includes("akabare") || name.includes("khursani") || name.includes("spice"))
    return "https://images.unsplash.com/photo-1588252303782-cb80119abd6d?auto=format&fit=crop&w=700&q=80";
  if (name.includes("oil") || name.includes("mustard") || name.includes("tori") || name.includes("ghee"))
    return "https://images.unsplash.com/photo-1474979266404-7eaacbcd87c5?auto=format&fit=crop&w=700&q=80";
  if (name.includes("honey") || name.includes("maha") || name.includes("dairy"))
    return "https://images.unsplash.com/photo-1587049352847-4a222e784d38?auto=format&fit=crop&w=700&q=80";
  if (name.includes("cauliflower") || name.includes("kauli") || name.includes("cabbage"))
    return "https://images.unsplash.com/photo-1568584711075-3d021a7c3ca3?auto=format&fit=crop&w=700&q=80";
  if (name.includes("onion") || name.includes("pyaj") || name.includes("garlic"))
    return "https://images.unsplash.com/photo-1508747703725-719777637510?auto=format&fit=crop&w=700&q=80";
  if (name.includes("banana") || name.includes("orange") || name.includes("fruit"))
    return "https://images.unsplash.com/photo-1619566636858-adf3ef46400b?auto=format&fit=crop&w=700&q=80";
  return "https://images.unsplash.com/photo-1540420773420-3366772f4999?auto=format&fit=crop&w=700&q=80";
}

function getProductImage(product) {
  if (product?.image) {
    const resolved = resolveMediaUrl(product.image);
    if (resolved) return resolved;
  }
  return getFallbackProductImage(product);
}

function compressImageToDataUriAndFile(file, maxDim = 500, quality = 0.85) {
  return new Promise((resolve) => {
    if (!file) return resolve({ dataUri: null, compressedFile: null });
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
          canvas.toBlob(
            (blob) => {
              if (blob) {
                const cleanName = (file.name || "photo.jpg").replace(/\.[^.]+$/, "") + ".jpg";
                const compFile = new File([blob], cleanName, { type: "image/jpeg" });
                resolve({ dataUri, compressedFile: compFile });
              } else {
                resolve({ dataUri, compressedFile: file });
              }
            },
            "image/jpeg",
            quality
          );
        } catch {
          resolve({ dataUri: ev.target?.result || null, compressedFile: file });
        }
      };
      img.onerror = () => resolve({ dataUri: ev.target?.result || null, compressedFile: file });
      img.src = ev.target?.result;
    };
    reader.onerror = () => resolve({ dataUri: null, compressedFile: file });
    reader.readAsDataURL(file);
  });
}


// ============================================================================
// OFFICIAL KRISHIMART HUB COORDINATES: 28°42'11.4"N 80°36'36.1"E
// Decimal Degrees: 28.703167° N, 80.610028° E (Campus Chowk Area, Dhangadhi)
// ============================================================================
const KRISHIMART_HUB = {
  lat: 28.703167,
  lng: 80.610028,
  dms: "28°42'11.4\"N 80°36'36.1\"E",
  name: "KrishiMart Hub (Campus Chowk, Dhangadhi)",
};

const DHANGADHI_DELIVERY_LOCATIONS = [
  { name: "Campus Chowk (Hub Area)", lat: 28.703167, lng: 80.610028, km: 0.5 },
  { name: "Buddha Chowk, Dhangadhi", lat: 28.6983, lng: 80.6057, km: 0.6 },
  { name: "Pushpalal Chowk, Dhangadhi", lat: 28.7049, lng: 80.6073, km: 1.0 },
  { name: "Shivnagar, Dhangadhi", lat: 28.7015, lng: 80.5962, km: 1.0 },
  { name: "Hasanpur, Dhangadhi", lat: 28.7036, lng: 80.5924, km: 1.3 },
  { name: "Moti Chowk, Dhangadhi", lat: 28.6963, lng: 80.6121, km: 1.4 },
  { name: "Bhanu Chowk, Dhangadhi", lat: 28.6987, lng: 80.6136, km: 1.5 },
  { name: "LN Chowk, Dhangadhi", lat: 28.705, lng: 80.5845, km: 2.2 },
  { name: "Covered Hall Area, Dhangadhi", lat: 28.7062, lng: 80.5872, km: 2.3 },
  { name: "Taranagar, Dhangadhi", lat: 28.7118, lng: 80.5842, km: 3.0 },
  { name: "Chauraha / Traffic Chowk, Dhangadhi", lat: 28.7025, lng: 80.5777, km: 3.1 },
  { name: "Ratopul, Dhangadhi", lat: 28.705, lng: 80.5756, km: 3.2 },
  { name: "Santoshi Tole, Dhangadhi", lat: 28.6992, lng: 80.5748, km: 3.4 },
  { name: "Uttarbehadi, Dhangadhi", lat: 28.7145, lng: 80.5805, km: 3.6 },
  { name: "Baiyabehadi, Dhangadhi", lat: 28.6975, lng: 80.5712, km: 3.7 },
  { name: "Shivpuri Dham Area, Dhangadhi", lat: 28.7172, lng: 80.5772, km: 4.0 },
  { name: "Bishalnagar, Dhangadhi", lat: 28.7082, lng: 80.5665, km: 4.8 },
  { name: "Milan Chowk, Dhangadhi", lat: 28.7042, lng: 80.5625, km: 5.0 },
  { name: "Chatakpur, Dhangadhi", lat: 28.7185, lng: 80.5682, km: 5.0 },
  { name: "Boradandi, Dhangadhi", lat: 28.7226, lng: 80.5658, km: 5.2 },
  { name: "Rajpur, Dhangadhi", lat: 28.7428, lng: 80.5692, km: 7.5 },
  { name: "Jugeda, Dhangadhi", lat: 28.6568, lng: 80.625, km: 7.9 },
  { name: "Geta / Airport Area, Kailali", lat: 28.765, lng: 80.568, km: 13.3 },
];

function computeHaversineRoadKm(lat1, lng1, lat2, lng2) {
  const toRad = (deg) => (deg * Math.PI) / 180;
  const R = 6371; // Earth radius in km
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) * Math.sin(dLng / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  const straightKm = R * c;
  // Standard urban road network winding factor (1.28x straight line)
  return Math.max(0.2, Number((straightKm * 1.28).toFixed(1)));
}

function findNearestDhangadhiArea(lat, lng) {
  let best = null;
  let minDist = Infinity;
  for (const loc of DHANGADHI_DELIVERY_LOCATIONS) {
    const d = computeHaversineRoadKm(lat, lng, loc.lat, loc.lng);
    if (d < minDist) {
      minDist = d;
      best = loc;
    }
  }
  return { nearest: best, distFromLandmark: minDist };
}

let leafletLoaderPromise = null;
function ensureLeafletLoaded() {
  if (typeof window === "undefined") return Promise.resolve(null);
  if (window.L) return Promise.resolve(window.L);
  if (leafletLoaderPromise) return leafletLoaderPromise;

  leafletLoaderPromise = new Promise((resolve) => {
    if (!document.getElementById("krishimart-leaflet-css")) {
      const link = document.createElement("link");
      link.id = "krishimart-leaflet-css";
      link.rel = "stylesheet";
      link.href = "https://unpkg.com/leaflet@1.9.4/dist/leaflet.css";
      document.head.appendChild(link);
    }
    const script = document.createElement("script");
    script.src = "https://unpkg.com/leaflet@1.9.4/dist/leaflet.js";
    script.async = true;
    script.onload = () => resolve(window.L || null);
    script.onerror = () => resolve(null);
    document.body.appendChild(script);
  });
  return leafletLoaderPromise;
}

function InteractiveDeliveryMap({
  customerPin,
  onSelectLocation,
  freeMaxKm = 7,
  expanded = false,
}) {
  const mapNodeRef = useRef(null);
  const mapInstanceRef = useRef(null);
  const customerMarkerRef = useRef(null);
  const routeLineRef = useRef(null);

  useEffect(() => {
    let isMounted = true;
    ensureLeafletLoaded().then((L) => {
      if (!isMounted || !L || !mapNodeRef.current) return;
      if (mapInstanceRef.current) return;

      const map = L.map(mapNodeRef.current, {
        center: [customerPin.lat, customerPin.lng],
        zoom: 14,
        scrollWheelZoom: true,
      });

      L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
        maxZoom: 19,
        attribution: "&copy; OpenStreetMap",
      }).addTo(map);

      // 1. KrishiMart Hub Fixed Marker at 28°42'11.4"N 80°36'36.1"E
      const hubIcon = L.divIcon({
        className: "km-hub-marker",
        html: `<div style="background:#14532D;color:#ffffff;border:3px solid #fbbf24;border-radius:999px;width:34px;height:34px;display:flex;align-items:center;justify-content:center;font-size:16px;box-shadow:0 4px 12px rgba(0,0,0,0.3);">🌱</div>`,
        iconSize: [34, 34],
        iconAnchor: [17, 17],
      });

      L.marker([KRISHIMART_HUB.lat, KRISHIMART_HUB.lng], { icon: hubIcon })
        .addTo(map)
        .bindPopup(
          `<strong>🌱 KrishiMart Hub</strong><br/><span style="font-size:11px;">${KRISHIMART_HUB.dms}<br/>Campus Chowk, Dhangadhi</span>`
        );

      // 2. 7 km Free-Delivery Zone Circle around Hub
      L.circle([KRISHIMART_HUB.lat, KRISHIMART_HUB.lng], {
        radius: (freeMaxKm / 1.28) * 1000,
        color: "#16a34a",
        weight: 1.5,
        dashArray: "6 6",
        fillColor: "#22c55e",
        fillOpacity: 0.06,
      }).addTo(map);

      // 3. Customer Draggable Delivery Pin
      const custIcon = L.divIcon({
        className: "km-cust-marker",
        html: `<div style="background:#dc2626;color:#ffffff;border:3px solid #ffffff;border-radius:999px;width:36px;height:36px;display:flex;align-items:center;justify-content:center;font-size:17px;box-shadow:0 6px 14px rgba(220,38,38,0.45);cursor:grab;">📍</div>`,
        iconSize: [36, 36],
        iconAnchor: [18, 18],
      });

      const custMarker = L.marker([customerPin.lat, customerPin.lng], {
        icon: custIcon,
        draggable: true,
      }).addTo(map);

      const routeLine = L.polyline(
        [
          [KRISHIMART_HUB.lat, KRISHIMART_HUB.lng],
          [customerPin.lat, customerPin.lng],
        ],
        {
          color: "#14532D",
          weight: 4,
          dashArray: "8 6",
          opacity: 0.85,
        }
      ).addTo(map);

      const handlePinMoved = (lat, lng) => {
        const cleanLat = Number(lat.toFixed(6));
        const cleanLng = Number(lng.toFixed(6));
        const approxKm = computeHaversineRoadKm(
          KRISHIMART_HUB.lat,
          KRISHIMART_HUB.lng,
          cleanLat,
          cleanLng
        );
        const { nearest, distFromLandmark } = findNearestDhangadhiArea(cleanLat, cleanLng);
        const areaLabel =
          nearest && distFromLandmark <= 0.9
            ? nearest.name
            : nearest
            ? `Near ${nearest.name}`
            : `Dropped Pin (${cleanLat.toFixed(4)}, ${cleanLng.toFixed(4)})`;

        onSelectLocation({
          lat: cleanLat,
          lng: cleanLng,
          km: approxKm,
          label: areaLabel,
        });

        // Query OSRM free road routing API for exact road polyline & driving distance
        fetch(
          `https://router.project-osrm.org/route/v1/driving/${KRISHIMART_HUB.lng},${KRISHIMART_HUB.lat};${cleanLng},${cleanLat}?overview=full&geometries=geojson`
        )
          .then((r) => r.json())
          .then((data) => {
            const route = data?.routes?.[0];
            if (route && route.distance) {
              const osrmKm = Math.max(0.2, Number((route.distance / 1000).toFixed(1)));
              if (route.geometry?.coordinates && routeLineRef.current) {
                const latLngs = route.geometry.coordinates.map(([ln, lt]) => [lt, ln]);
                routeLineRef.current.setLatLngs(latLngs);
              }
              onSelectLocation({
                lat: cleanLat,
                lng: cleanLng,
                km: osrmKm,
                label: areaLabel,
              });
            }
          })
          .catch(() => {});
      };

      custMarker.on("dragend", (e) => {
        const pos = e.target.getLatLng();
        if (pos) handlePinMoved(pos.lat, pos.lng);
      });

      map.on("click", (e) => {
        if (e?.latlng) {
          custMarker.setLatLng(e.latlng);
          handlePinMoved(e.latlng.lat, e.latlng.lng);
        }
      });

      mapInstanceRef.current = map;
      customerMarkerRef.current = custMarker;
      routeLineRef.current = routeLine;
    });

    return () => {
      isMounted = false;
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
        customerMarkerRef.current = null;
        routeLineRef.current = null;
      }
    };
  }, []);

  // Sync marker position and route line whenever customerPin changes externally (e.g. dropdown or GPS)
  useEffect(() => {
    const map = mapInstanceRef.current;
    const marker = customerMarkerRef.current;
    const line = routeLineRef.current;
    if (!map || !marker || !line) return;

    marker.setLatLng([customerPin.lat, customerPin.lng]);
    line.setLatLngs([
      [KRISHIMART_HUB.lat, KRISHIMART_HUB.lng],
      [customerPin.lat, customerPin.lng],
    ]);
    map.panTo([customerPin.lat, customerPin.lng], { animate: true });

    fetch(
      `https://router.project-osrm.org/route/v1/driving/${KRISHIMART_HUB.lng},${KRISHIMART_HUB.lat};${customerPin.lng},${customerPin.lat}?overview=full&geometries=geojson`
    )
      .then((r) => r.json())
      .then((data) => {
        const coords = data?.routes?.[0]?.geometry?.coordinates;
        if (coords && routeLineRef.current) {
          routeLineRef.current.setLatLngs(coords.map(([ln, lt]) => [lt, ln]));
        }
      })
      .catch(() => {});
  }, [customerPin.lat, customerPin.lng]);

  useEffect(() => {
    if (mapInstanceRef.current) {
      setTimeout(() => mapInstanceRef.current?.invalidateSize(), 150);
    }
  }, [expanded]);

  return (
    <div className="relative rounded-2xl overflow-hidden border-2 border-emerald-600/40 shadow-inner bg-slate-100">
      <div
        ref={mapNodeRef}
        className={`w-full ${expanded ? "h-72 sm:h-96" : "h-48 sm:h-56"} z-10`}
      />
      <div className="bg-slate-900/90 text-white px-3 py-1.5 text-[10px] font-semibold flex flex-wrap items-center justify-between gap-2">
        <span>🌱 Hub: {KRISHIMART_HUB.dms}</span>
        <span className="text-amber-300 font-bold">
          👆 Click anywhere on map or drag 📍 pin to set your exact home location
        </span>
      </div>
    </div>
  );
}

export default function App() {
  const [user, setUser] = useState(null);
  const [checkingAuth, setCheckingAuth] = useState(true);
  const [loadingProducts, setLoadingProducts] = useState(true);
  const [loadingUserData, setLoadingUserData] = useState(true);
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
  const [sortBy, setSortBy] = useState("FEATURED");
  const [inStockOnly, setInStockOnly] = useState(false);
  const [orderStatusFilter, setOrderStatusFilter] = useState("ALL");
  const [farmerSalesFilter, setFarmerSalesFilter] = useState("ALL"); // "ALL" | "PAID" | "PENDING"
  const [submissionFilter, setSubmissionFilter] = useState("ALL"); // "ALL" | "PENDING" | "BOUGHT" | "REJECTED" 

  // Language Toggle ("EN" | "NP")
  const [lang, setLang] = useState("EN");
  const tr = (enText, npText) => (lang === "NP" ? npText : enText);

  // Printable 1/4 A4 Slip State (Customer Order or Farmer Sale)
  const [activeSlip, setActiveSlip] = useState(null);

  // Syncs the Admin's applied Discount (%) and true original subtotal onto Customer's My Orders & 1/4 A4 Receipt
  const getCustomerOrderPricing = (order) => {
    if (!order) {
      return { subtotal: 0, unitPrice: 0, discPct: 0, discAmt: 0, netTotal: 0 };
    }
    const qty = Math.max(1, Number(order.quantity || 1));
    const matchedProd = (Array.isArray(dbProducts) ? dbProducts : []).find(
      (p) => p.id === order.product || p.name === order.product_name
    );
    let subtotal = 0;
    if (order.subtotal_price !== undefined && Number(order.subtotal_price) > 0) {
      subtotal = Number(order.subtotal_price);
    } else if (matchedProd && Number(matchedProd.price) > 0) {
      subtotal = Number(matchedProd.price) * qty;
    } else {
      subtotal = Number(order.total_price || 0);
    }
    subtotal = Number(subtotal.toFixed(2));
    const unitPrice = Number((subtotal / qty).toFixed(2));

    let localDisc = 0;
    try {
      const savedMap = JSON.parse(localStorage.getItem("krishimart_order_discounts") || "{}");
      if (savedMap[order.id] !== undefined) {
        localDisc = Number(savedMap[order.id] || 0);
      }
    } catch {
      localDisc = 0;
    }

    const apiDisc =
      order.discount_percent !== undefined ? Number(order.discount_percent || 0) : 0;
    const discPct = Math.min(100, Math.max(0, apiDisc > 0 ? apiDisc : localDisc));
    const discAmt = Number(((subtotal * discPct) / 100).toFixed(2));

    let localDelivMeta = {};
    try {
      const dMap = JSON.parse(localStorage.getItem("krishimart_order_delivery_meta") || "{}");
      if (order.id && dMap[order.id]) localDelivMeta = dMap[order.id];
    } catch {}

    const deliveryCharge = Number(
      order.delivery_charge !== undefined
        ? Number(order.delivery_charge || 0)
        : Number(localDelivMeta.delivery_charge || 0)
    );
    const distanceKm =
      order.delivery_distance_km !== undefined && order.delivery_distance_km !== null
        ? Number(order.delivery_distance_km)
        : localDelivMeta.distance_km !== undefined
        ? Number(localDelivMeta.distance_km)
        : null;
    const isFreeDelivery = Boolean(
      order.is_free_delivery !== undefined
        ? order.is_free_delivery
        : localDelivMeta.is_free_delivery
    );
    const deliveryLat = order.delivery_lat ?? localDelivMeta.lat ?? null;
    const deliveryLng = order.delivery_lng ?? localDelivMeta.lng ?? null;

    const netTotal = Number(Math.max(0, subtotal - discAmt + deliveryCharge).toFixed(2));

    return {
      subtotal,
      unitPrice,
      discPct,
      discAmt,
      deliveryCharge,
      distanceKm,
      isFreeDelivery,
      deliveryLat,
      deliveryLng,
      netTotal,
    };
  };

  // Real Stories & Reviews (with Optional Photo Upload)
  const [stories, setStories] = useState([]);
  const [storyModalOpen, setStoryModalOpen] = useState(false);
  const [storyForm, setStoryForm] = useState({ title: "", content: "", rating: 5 });
  const [storyImageFile, setStoryImageFile] = useState(null);
  const [storyImagePreview, setStoryImagePreview] = useState(null);
  const [reviewTargetProduct, setReviewTargetProduct] = useState(null); // { product_id, product_name, order_id }

  // Helper to get all reviews belonging to a specific product
  const getReviewsForProduct = (product) => {
    if (!product) return [];
    const pName = (product.name || "").trim().toLowerCase();
    return stories.filter((s) => {
      if (s.story_type !== "BUYER_REVIEW") return false;
      if (s.product_id && Number(s.product_id) === Number(product.id)) return true;
      if (s.product_name && s.product_name.trim().toLowerCase() === pName) return true;
      if (pName && (s.title || "").toLowerCase().includes(pName)) return true;
      return false;
    });
  };

  // Farmer's Sales to Admin Ledger
  const [farmerSales, setFarmerSales] = useState([]);

  // Full-Page Daraz-Style Product Detail View State
  const [quickViewProduct, setQuickViewProduct] = useState(null);
  const [quickViewQty, setQuickViewQty] = useState(1);
  const [detailTab, setDetailTab] = useState("specs"); // "specs" | "reviews" | "delivery"

  // Scroll to top smoothly whenever a user opens a Product Detail Page, and close it on tab change
  useEffect(() => {
    if (quickViewProduct) {
      window.scrollTo({ top: 0, behavior: "smooth" });
    }
  }, [quickViewProduct]);

  useEffect(() => {
    setQuickViewProduct(null);
  }, [activeTab]);

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
  const [basketRecCategory, setBasketRecCategory] = useState("ALL");
  const [checkoutAddress, setCheckoutAddress] = useState("Hasanpur, Dhangadhi");
  const [checkoutPhone, setCheckoutPhone] = useState("");
  const [checkingOut, setCheckingOut] = useState(false);

  // Interactive Map Delivery Pin, Distance & Admin-Editable Rate State
  const [deliveryRatePerKm, setDeliveryRatePerKm] = useState(() => {
    try {
      const saved = localStorage.getItem("krishimart_delivery_rate_per_km");
      return saved !== null && saved !== "" ? Number(saved) : 10;
    } catch {
      return 10;
    }
  });
  const [freeDeliveryMinKg, setFreeDeliveryMinKg] = useState(6);
  const [freeDeliveryMaxKm, setFreeDeliveryMaxKm] = useState(7);
  const [customerPin, setCustomerPin] = useState({
    lat: 28.7036,
    lng: 80.5924,
    km: 1.3,
    label: "Hasanpur, Dhangadhi",
  });
  const [mapExpanded, setMapExpanded] = useState(false);
  const [locatingGps, setLocatingGps] = useState(false);

  useEffect(() => {
    localStorage.setItem("krishimart_basket", JSON.stringify(basket));
  }, [basket]);

  // Profile Page & OTP Password Security State
  const [profileModalOpen, setProfileModalOpen] = useState(false);
  const [savingProfile, setSavingProfile] = useState(false);
  const [profileForm, setProfileForm] = useState({
    full_name: "",
    phone_number: "",
    location: "",
  });
  const [profileAvatarFile, setProfileAvatarFile] = useState(null);
  const [profileAvatarPreview, setProfileAvatarPreview] = useState(null);
  const [profileAvatarDataUri, setProfileAvatarDataUri] = useState(null);
  const [avatarLoadError, setAvatarLoadError] = useState(false);

  const [passwordForm, setPasswordForm] = useState({
    current_password: "",
    new_password: "",
    confirm_password: "",
    otp: "",
  });
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmNewPassword, setShowConfirmNewPassword] = useState(false);
  const [skipCurrentPasswordForOtp, setSkipCurrentPasswordForOtp] = useState(false);
  const [profileOtpSent, setProfileOtpSent] = useState(false);
  const [sendingProfileOtp, setSendingProfileOtp] = useState(false);
  const [verifyingProfileOtp, setVerifyingProfileOtp] = useState(false);

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
  const [chatActionMsg, setChatActionMsg] = useState(null); // Message selected for "Delete for Me" / "Delete for Everyone" 
  const chatTabScrollRef = useRef(null);
  const chatDrawerScrollRef = useRef(null);

  // ==============================================================================
  // DARAZ-STYLE 1-STEP BROWSER & MOBILE HARDWARE BACK BUTTON NAVIGATION
  // ==============================================================================
  const isPopstateNavRef = useRef(false);
  const isManualCloseRef = useRef(false);

  const activeTabRef = useRef(activeTab);
  const quickViewProductRef = useRef(quickViewProduct);
  const basketDrawerOpenRef = useRef(basketDrawerOpen);
  const activeSlipRef = useRef(activeSlip);
  const storyModalOpenRef = useRef(storyModalOpen);
  const profileModalOpenRef = useRef(profileModalOpen);
  const authModalOpenRef = useRef(authModalOpen);
  const chatDrawerOpenRef = useRef(chatDrawerOpen);

  useEffect(() => { activeTabRef.current = activeTab; }, [activeTab]);
  useEffect(() => { quickViewProductRef.current = quickViewProduct; }, [quickViewProduct]);
  useEffect(() => { basketDrawerOpenRef.current = basketDrawerOpen; }, [basketDrawerOpen]);
  useEffect(() => { activeSlipRef.current = activeSlip; }, [activeSlip]);
  useEffect(() => { storyModalOpenRef.current = storyModalOpen; }, [storyModalOpen]);
  useEffect(() => { profileModalOpenRef.current = profileModalOpen; }, [profileModalOpen]);
  useEffect(() => { authModalOpenRef.current = authModalOpen; }, [authModalOpen]);
  useEffect(() => { chatDrawerOpenRef.current = chatDrawerOpen; }, [chatDrawerOpen]);

  // Synchronize history entries when opening or closing modals/drawers/views
  const syncOpenLayer = (layerName, meta = {}) => {
    if (!isPopstateNavRef.current) {
      window.history.pushState({ layer: layerName, ...meta }, "");
    }
  };

  const syncCloseLayer = (layerName) => {
    if (!isPopstateNavRef.current && window.history.state?.layer === layerName) {
      isManualCloseRef.current = true;
      window.history.back();
    }
  };

  // Push history entry for Basket Drawer
  useEffect(() => {
    if (basketDrawerOpen) {
      syncOpenLayer("basket");
    } else {
      syncCloseLayer("basket");
    }
  }, [basketDrawerOpen]);

  // Push history entry for 1/4 A4 Printable Slip Modal
  useEffect(() => {
    if (activeSlip) {
      syncOpenLayer("slip", { id: activeSlip.id });
    } else {
      syncCloseLayer("slip");
    }
  }, [activeSlip]);

  // Push history entry for Full-Page Product Detail View
  useEffect(() => {
    if (quickViewProduct) {
      syncOpenLayer("product", { id: quickViewProduct.id });
    } else {
      syncCloseLayer("product");
    }
  }, [quickViewProduct]);

  // Push history entry for Review / Story Modal
  useEffect(() => {
    if (storyModalOpen) {
      syncOpenLayer("story");
    } else {
      syncCloseLayer("story");
    }
  }, [storyModalOpen]);

  // Push history entry for Profile / Change Password Modal
  useEffect(() => {
    if (profileModalOpen) {
      setQuickViewProduct(null);
      setActiveTab("profile");
      setProfileModalOpen(false);
    }
  }, [profileModalOpen]);

  // Push history entry for Auth Modal (Sign In / Register)
  useEffect(() => {
    if (authModalOpen) {
      syncOpenLayer("auth");
    } else {
      syncCloseLayer("auth");
    }
  }, [authModalOpen]);

  // Push history entry for Floating Mobile Chat Drawer
  useEffect(() => {
    if (chatDrawerOpen) {
      syncOpenLayer("chat");
    } else {
      syncCloseLayer("chat");
    }
  }, [chatDrawerOpen]);

  // Push history entry when navigating to inner tabs away from Home
  useEffect(() => {
    if (activeTab !== "home") {
      syncOpenLayer("tab", { tab: activeTab });
    } else {
      syncCloseLayer("tab");
    }
  }, [activeTab]);

  // Listen to browser/mobile hardware Back button (popstate event)
  useEffect(() => {
    if (!window.history.state || !window.history.state.layer) {
      window.history.replaceState({ layer: "base", tab: "home" }, "");
    }

    const handlePopState = () => {
      // If close was triggered manually (e.g. clicking the X button), do not double-close
      if (isManualCloseRef.current) {
        isManualCloseRef.current = false;
        return;
      }

      isPopstateNavRef.current = true;

      // Close exactly ONE level at a time in strict hierarchical order:
      // Level 1: Drawers and Modals (Basket, Slip, Story, Profile, Auth, Chat)
      // Level 2: Full-Page Product Detail View
      // Level 3: Inner Tabs (Marketplace, Orders, Farmer Sales, Sell, Admin) back to Home
      if (basketDrawerOpenRef.current) {
        setBasketDrawerOpen(false);
      } else if (activeSlipRef.current) {
        setActiveSlip(null);
      } else if (storyModalOpenRef.current) {
        setStoryModalOpen(false);
        setReviewTargetProduct(null);
      } else if (profileModalOpenRef.current) {
        setProfileModalOpen(false);
      } else if (authModalOpenRef.current) {
        setAuthModalOpen(false);
      } else if (chatDrawerOpenRef.current) {
        setChatDrawerOpen(false);
      } else if (quickViewProductRef.current) {
        setQuickViewProduct(null);
      } else if (activeTabRef.current !== "home") {
        setActiveTab("home");
      }

      // Re-enable history pushing after React finishes updating
      setTimeout(() => {
        isPopstateNavRef.current = false;
      }, 60);
    };

    window.addEventListener("popstate", handlePopState);
    return () => window.removeEventListener("popstate", handlePopState);
  }, []);

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
      setCheckoutAddress((prev) => res.data.location || prev || "Hasanpur, Dhangadhi");
      setCheckoutPhone((prev) => res.data.phone_number || prev || "");
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

  const syncDeliverySettings = async () => {
    try {
      const res = await api.get("/marketplace/orders/delivery_settings/");
      if (res.data) {
        if (res.data.rate_per_km !== undefined) {
          const r = Number(res.data.rate_per_km);
          setDeliveryRatePerKm(r);
          localStorage.setItem("krishimart_delivery_rate_per_km", String(r));
        }
        if (res.data.free_min_kg !== undefined) setFreeDeliveryMinKg(Number(res.data.free_min_kg));
        if (res.data.free_max_km !== undefined) setFreeDeliveryMaxKm(Number(res.data.free_max_km));
      }
    } catch {
      try {
        const localRate = localStorage.getItem("krishimart_delivery_rate_per_km");
        if (localRate !== null && localRate !== "") setDeliveryRatePerKm(Number(localRate));
      } catch {}
    }
  };

  useEffect(() => {
    if (basketDrawerOpen) {
      syncDeliverySettings();
    }
  }, [basketDrawerOpen]);

  const loadPublicData = async () => {
    syncDeliverySettings();
    try {
      const [prodRes, storyRes] = await Promise.all([
        api.get("/marketplace/products/"),
        api.get("/marketplace/stories/"),
      ]);
      const liveProds = Array.isArray(prodRes.data) ? prodRes.data : [];
      setDbProducts(liveProds);
      setStories(Array.isArray(storyRes.data) ? storyRes.data : []);
      if (liveProds.length > 0) {
        setBasket((prev) => {
          if (!Array.isArray(prev) || prev.length === 0) return prev;
          const reconciled = prev
            .map((item) => {
              const matched =
                liveProds.find((p) => Number(p.id) === Number(item.id)) ||
                liveProds.find(
                  (p) =>
                    p.name &&
                    item.name &&
                    p.name.trim().toLowerCase() === item.name.trim().toLowerCase()
                );
              if (!matched) return null;
              return {
                ...item,
                ...matched,
                id: matched.id,
                qty: Math.max(1, Number(item.qty || 1)),
              };
            })
            .filter(Boolean);
          return reconciled;
        });
      }
    } catch (err) {
      console.error("Public data sync error:", err);
    } finally {
      setLoadingProducts(false);
    }
  };

  const loadUserData = async () => {
    if (!isVerifiedOrAdmin) {
      setLoadingUserData(false);
      return;
    }
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
    } finally {
      setLoadingUserData(false);
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

  const handleAddToBasket = (product, qtyToAdd = 1, openDrawer = false) => {
    requireAuth(() => {
      setBasket((prev) => {
        const existing = prev.find((item) => Number(item.id) === Number(product.id));
        if (existing) {
          return prev.map((item) =>
            Number(item.id) === Number(product.id)
              ? { ...item, ...product, qty: Number(item.qty || 0) + Number(qtyToAdd || 1) }
              : item
          );
        }
        return [...prev, { ...product, qty: Number(qtyToAdd || 1) }];
      });
      showToast(`Added ${qtyToAdd} ${product.unit} of ${product.name} to basket!`);
      if (openDrawer) {
        setBasketDrawerOpen(true);
      }
    });
  };

  const handleRemoveFromBasket = (productId, productName = "Item") => {
    setBasket((prev) => prev.filter((item) => item.id !== productId));
    showToast(`Removed ${productName} from basket.`);
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

  const handleDetectLiveGps = () => {
    if (!navigator.geolocation) {
      showToast("GPS geolocation is not supported on this browser.", "error");
      return;
    }
    setLocatingGps(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const lat = Number(pos.coords.latitude.toFixed(6));
        const lng = Number(pos.coords.longitude.toFixed(6));
        const approxKm = computeHaversineRoadKm(KRISHIMART_HUB.lat, KRISHIMART_HUB.lng, lat, lng);
        const { nearest, distFromLandmark } = findNearestDhangadhiArea(lat, lng);
        const label =
          nearest && distFromLandmark <= 1.2
            ? `${nearest.name} (GPS Pin)`
            : `Live GPS Location (${lat.toFixed(4)}, ${lng.toFixed(4)})`;
        setCustomerPin({ lat, lng, km: approxKm, label });
        setCheckoutAddress(`${label} — ${approxKm} km from Hub`);
        setLocatingGps(false);
        showToast(`GPS location pinned (${approxKm} km from KrishiMart Hub)!`);
      },
      () => {
        setLocatingGps(false);
        showToast("Could not read GPS location. Please click directly on the map or pick an area.", "error");
      },
      { enableHighAccuracy: true, timeout: 10000 }
    );
  };

  // Compute Basket Totals, Weight (in kg), Distance (in km), and Live Delivery Charge
  const basketTotal = basket.reduce((sum, item) => sum + Number(item.price) * item.qty, 0);
  const totalBasketItems = basket.reduce((sum, item) => sum + item.qty, 0);
  const totalBasketWeightKg = basket.reduce((sum, item) => {
    const u = (item.unit || "kg").toLowerCase();
    const q = Number(item.qty || 0);
    if (u === "g") return sum + q / 1000;
    if (u === "quintal") return sum + q * 100;
    return sum + q;
  }, 0);

  const deliveryDistanceKm = Number((customerPin.km || 0).toFixed(1));
  const rawCalculatedDeliveryFee =
    deliveryDistanceKm <= 0
      ? 0
      : Math.max(
          Math.round(deliveryRatePerKm),
          Math.round(deliveryDistanceKm * Number(deliveryRatePerKm || 10))
        );
  const isFreeDeliveryUnlocked =
    totalBasketWeightKg > freeDeliveryMinKg && deliveryDistanceKm <= freeDeliveryMaxKm;
  const finalDeliveryCharge = isFreeDeliveryUnlocked ? 0 : rawCalculatedDeliveryFee;
  const basketGrandTotal = Number((basketTotal + finalDeliveryCharge).toFixed(2));

  const checkoutInFlightRef = useRef(false);

  const handleCheckoutBasket = async (e) => {
    if (e && e.preventDefault) e.preventDefault();
    if (checkoutInFlightRef.current || checkingOut) return;
    if (!Array.isArray(basket) || basket.length === 0) return;

    const finalPhone = (checkoutPhone || user?.phone_number || "").trim();
    const finalAddressBase = (
      checkoutAddress ||
      customerPin?.label ||
      user?.location ||
      "Campus Chowk Area, Dhangadhi"
    ).trim();

    if (!finalPhone) {
      showToast("Please enter your contact phone number.", "error");
      return;
    }

    checkoutInFlightRef.current = true;
    setCheckingOut(true);
    let localDelivMap = {};
    try {
      localDelivMap = JSON.parse(
        localStorage.getItem("krishimart_order_delivery_meta") || "{}"
      );
    } catch {
      localDelivMap = {};
    }

    // Deduplicate snapshot by product id in case any legacy items had string vs number IDs
    const mergedMap = new Map();
    for (const rawItem of basket) {
      const k = Number(rawItem.id);
      if (mergedMap.has(k)) {
        const prevItem = mergedMap.get(k);
        mergedMap.set(k, { ...prevItem, qty: Number(prevItem.qty || 0) + Number(rawItem.qty || 1) });
      } else {
        mergedMap.set(k, { ...rawItem, qty: Number(rawItem.qty || 1) });
      }
    }
    const itemsSnapshot = Array.from(mergedMap.values());
    const succeededIds = new Set();
    let lastErrorMsg = "";

    try {
      for (let idx = 0; idx < itemsSnapshot.length; idx++) {
        const item = itemsSnapshot[idx];
        // Resolve against live dbProducts so even a stale product ID in localStorage maps to the real DB product
        const liveMatch =
          (Array.isArray(dbProducts) ? dbProducts : []).find(
            (p) => Number(p.id) === Number(item.id)
          ) ||
          (Array.isArray(dbProducts) ? dbProducts : []).find(
            (p) =>
              p.name &&
              item.name &&
              p.name.trim().toLowerCase() === item.name.trim().toLowerCase()
          );

        const targetProductId = liveMatch ? liveMatch.id : item.id;
        const orderQty = Math.max(1, Number(item.qty || 1));

        // Attach the delivery charge to the first successfully placed order in the batch
        const isFirstOrderInBatch = succeededIds.size === 0;
        const orderDelivCharge = isFirstOrderInBatch ? finalDeliveryCharge : 0;
        const delivNote = isFreeDeliveryUnlocked
          ? `(${deliveryDistanceKm} km • FREE Delivery >6kg)`
          : orderDelivCharge > 0
          ? `(${deliveryDistanceKm} km • Delivery: रु ${orderDelivCharge})`
          : `(${deliveryDistanceKm} km)`;

        const cleanFullAddress = `${finalAddressBase} ${delivNote} [${paymentMethod}]`.slice(
          0,
          240
        );

        try {
          const res = await api.post("/marketplace/orders/", {
            product: targetProductId,
            quantity: orderQty,
            delivery_address: cleanFullAddress,
            contact_phone: finalPhone.slice(0, 15),
            delivery_charge: orderDelivCharge,
            delivery_distance_km: deliveryDistanceKm,
            delivery_lat: customerPin.lat,
            delivery_lng: customerPin.lng,
            is_free_delivery: isFreeDeliveryUnlocked || !isFirstOrderInBatch,
          });

          succeededIds.add(item.id);
          if (res.data?.id) {
            localDelivMap[res.data.id] = {
              delivery_charge: orderDelivCharge,
              distance_km: deliveryDistanceKm,
              lat: customerPin.lat,
              lng: customerPin.lng,
              is_free_delivery: isFreeDeliveryUnlocked || !isFirstOrderInBatch,
              rate_per_km: deliveryRatePerKm,
            };
          }
        } catch (itemErr) {
          const errData = itemErr.response?.data;
          if (errData && typeof errData === "object") {
            const k = Object.keys(errData)[0];
            const v = Array.isArray(errData[k]) ? errData[k][0] : errData[k];
            lastErrorMsg = `${k}: ${v}`;
          } else {
            lastErrorMsg = "Could not place order for one of the items.";
          }
        }
      }

      try {
        localStorage.setItem("krishimart_order_delivery_meta", JSON.stringify(localDelivMap));
      } catch {}

      if (succeededIds.size > 0) {
        // Clear the basket immediately in both React state and localStorage!
        setBasket([]);
        try {
          localStorage.removeItem("krishimart_basket");
          localStorage.setItem("krishimart_basket", "[]");
        } catch {}
        setBasketDrawerOpen(false);
        setActiveTab("orders");
        showToast(
          isFreeDeliveryUnlocked
            ? "Order confirmed with FREE Home Delivery! Track in My Orders."
            : `Order confirmed (Delivery: रु ${finalDeliveryCharge})! Track in My Orders.`
        );
        // Refresh orders and products in background
        loadUserData();
        loadPublicData();
      } else {
        showToast(lastErrorMsg || "Failed to place order. Please check your account verification.", "error");
      }
    } finally {
      checkoutInFlightRef.current = false;
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
      const finalTitle =
        storyForm.title.trim() ||
        (reviewTargetProduct ? `${reviewTargetProduct.product_name} — Verified Review` : "Verified Review");
      formData.append("title", finalTitle);
      formData.append("content", storyForm.content.trim());
      formData.append("rating", storyForm.rating);
      formData.append(
        "story_type",
        reviewTargetProduct ? "BUYER_REVIEW" : user.role === "FARMER" ? "FARMER_STORY" : "BUYER_REVIEW"
      );
      if (reviewTargetProduct?.product_id) {
        formData.append("product_id", reviewTargetProduct.product_id);
      }
      if (reviewTargetProduct?.product_name) {
        formData.append("product_name", reviewTargetProduct.product_name);
      }
      if (reviewTargetProduct?.order_id) {
        formData.append("order_id", reviewTargetProduct.order_id);
      }
      if (storyImageFile instanceof File) {
        formData.append("image", storyImageFile);
        const { dataUri: stUri } = await compressImageToDataUriAndFile(storyImageFile, 700, 0.82);
        if (stUri) formData.append("image_data_uri", stUri);
      }

      await api.post("/marketplace/stories/", formData);
      await loadPublicData();
      showToast(
        reviewTargetProduct
          ? `Thank you! Your ${storyForm.rating}-star review for ${reviewTargetProduct.product_name} is now live!`
          : "Thank you! Your story/review was sent to the Admin and will appear once approved."
      );
      setStoryModalOpen(false);
      setReviewTargetProduct(null);
      setStoryForm({ title: "", content: "", rating: 5 });
      setStoryImageFile(null);
      setStoryImagePreview(null);
    } catch {
      showToast("Failed to submit story/review.", "error");
    }
  };

  const handleSelectProfilePhoto = async (e) => {
    const rawFile = e.target.files?.[0];
    if (!rawFile) return;
    setAvatarLoadError(false);
    const { dataUri, compressedFile } = await compressImageToDataUriAndFile(rawFile, 500, 0.86);
    setProfileAvatarFile(compressedFile || rawFile);
    setProfileAvatarDataUri(dataUri);
    setProfileAvatarPreview(dataUri || URL.createObjectURL(rawFile));
  };

  const handleUpdateProfile = async (e) => {
    e.preventDefault();
    setSavingProfile(true);
    try {
      const formData = new FormData();
      formData.append("full_name", profileForm.full_name.trim());
      formData.append("phone_number", profileForm.phone_number.trim());
      formData.append("location", profileForm.location.trim());
      if (profileAvatarFile instanceof File) {
        formData.append("profile_picture", profileAvatarFile);
      }
      if (profileAvatarDataUri && profileAvatarDataUri.startsWith("data:image/")) {
        formData.append("avatar_data_uri", profileAvatarDataUri);
        if (user?.id) {
          try {
            localStorage.setItem(`krishimart_avatar_${user.id}`, profileAvatarDataUri);
          } catch {}
        }
      }

      const res = await api.patch("/accounts/me/", formData);
      const updatedUser = {
        ...res.data,
        profile_picture: profileAvatarDataUri || res.data.profile_picture,
      };
      if (updatedUser.id && updatedUser.profile_picture?.startsWith("data:image/")) {
        try {
          localStorage.setItem(`krishimart_avatar_${updatedUser.id}`, updatedUser.profile_picture);
        } catch {}
      }
      setUser(updatedUser);
      setAvatarLoadError(false);
      setProfileAvatarFile(null);
      setProfileAvatarPreview(null);
      setProfileAvatarDataUri(null);
      showToast("Profile & photo saved! Synced across mobile and desktop.");
    } catch (err) {
      const data = err.response?.data;
      if (data && typeof data === "object") {
        const firstKey = Object.keys(data)[0];
        const msg = Array.isArray(data[firstKey]) ? data[firstKey][0] : data[firstKey];
        showToast(`${firstKey}: ${msg}`, "error");
      } else {
        showToast("Failed to update profile.", "error");
      }
    } finally {
      setSavingProfile(false);
    }
  };

  const handleRequestPasswordOtp = async (e) => {
    if (e && e.preventDefault) e.preventDefault();
    if (!user?.email) {
      showToast("No email address is linked to your account for OTP delivery.", "error");
      return;
    }
    if (!skipCurrentPasswordForOtp && !passwordForm.current_password) {
      showToast("Please enter your current password (or select Verify via Email OTP only).", "error");
      return;
    }
    if (!passwordForm.new_password || passwordForm.new_password.length < 8) {
      showToast("New password must be at least 8 characters long.", "error");
      return;
    }
    if (passwordForm.new_password !== (passwordForm.confirm_password || "")) {
      showToast("New password and confirm password do not match.", "error");
      return;
    }

    setSendingProfileOtp(true);
    try {
      const res = await api.post("/accounts/change-password/", {
        action: "send_otp",
        current_password: passwordForm.current_password,
        new_password: passwordForm.new_password,
        skip_current_password: skipCurrentPasswordForOtp,
      });
      setProfileOtpSent(true);
      showToast(res.data?.message || `6-digit OTP sent to ${user.email}!`);
    } catch (err) {
      const status = err.response?.status;
      const errMsg = err.response?.data?.error || "";
      // If current password is explicitly wrong, show the error immediately
      if (errMsg.toLowerCase().includes("current password is incorrect")) {
        showToast("Current password is incorrect.", "error");
        setSendingProfileOtp(false);
        return;
      }
      // Automatic fallback to /accounts/login/ (action: "send_otp") if backend hasn't been redeployed yet
      if (status === 400 || status === 404 || status === 405) {
        try {
          const fallbackRes = await api.post("/accounts/login/", {
            action: "send_otp",
            email: user.email,
          });
          setProfileOtpSent(true);
          showToast(fallbackRes.data?.message || `6-digit OTP sent to ${user.email}!`);
          setSendingProfileOtp(false);
          return;
        } catch (fbErr) {
          showToast(fbErr.response?.data?.error || "Could not send verification OTP.", "error");
          setSendingProfileOtp(false);
          return;
        }
      }
      showToast(errMsg || "Could not send verification OTP.", "error");
    } finally {
      setSendingProfileOtp(false);
    }
  };

  const handleChangePassword = async (e) => {
    e.preventDefault();
    if (!profileOtpSent) {
      await handleRequestPasswordOtp(e);
      return;
    }
    const cleanOtp = (passwordForm.otp || "").trim();
    if (cleanOtp.length !== 6) {
      showToast("Please enter the 6-digit OTP code sent to your email.", "error");
      return;
    }
    if (!passwordForm.new_password || passwordForm.new_password.length < 8) {
      showToast("New password must be at least 8 characters long.", "error");
      return;
    }

    setVerifyingProfileOtp(true);
    try {
      const res = await api.post("/accounts/change-password/", {
        action: "verify_otp_and_change",
        current_password: passwordForm.current_password,
        new_password: passwordForm.new_password,
        otp: cleanOtp,
        skip_current_password: skipCurrentPasswordForOtp,
      });
      showToast(res.data?.message || "Password updated securely via Email OTP!");
      setPasswordForm({ current_password: "", new_password: "", confirm_password: "", otp: "" });
      setProfileOtpSent(false);
    } catch (err) {
      const errMsg = err.response?.data?.error || "";
      if (
        errMsg.toLowerCase().includes("invalid") ||
        errMsg.toLowerCase().includes("expired") ||
        errMsg.toLowerCase().includes("no active otp")
      ) {
        // Also try verifying against /accounts/login/ (action: "verify_otp_and_reset") if OTP was issued there
        try {
          const fbVerify = await api.post("/accounts/login/", {
            action: "verify_otp_and_reset",
            email: user?.email,
            otp: cleanOtp,
            new_password: passwordForm.new_password,
          });
          showToast(fbVerify.data?.message || "Password updated securely via Email OTP!");
          setPasswordForm({ current_password: "", new_password: "", confirm_password: "", otp: "" });
          setProfileOtpSent(false);
          setVerifyingProfileOtp(false);
          return;
        } catch (fbErr) {
          showToast(fbErr.response?.data?.error || errMsg || "Invalid OTP code.", "error");
          setVerifyingProfileOtp(false);
          return;
        }
      }
      // Fallback to /accounts/login/ verify_otp_and_reset
      try {
        const fbVerify = await api.post("/accounts/login/", {
          action: "verify_otp_and_reset",
          email: user?.email,
          otp: cleanOtp,
          new_password: passwordForm.new_password,
        });
        showToast(fbVerify.data?.message || "Password updated securely via Email OTP!");
        setPasswordForm({ current_password: "", new_password: "", confirm_password: "", otp: "" });
        setProfileOtpSent(false);
      } catch (fbErr) {
        showToast(fbErr.response?.data?.error || errMsg || "Failed to verify OTP and change password.", "error");
      }
    } finally {
      setVerifyingProfileOtp(false);
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
        const { dataUri: sUri } = await compressImageToDataUriAndFile(sellForm.image, 800, 0.82);
        if (sUri) formData.append("image_data_uri", sUri);
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

  const handleDeleteMyMessage = async (msgId, mode = "everyone") => {
    try {
      await api.delete(`/chat/messages/${msgId}/?mode=${mode}`);
      if (mode === "me") {
        setMessages((prev) => prev.filter((m) => m.id !== msgId));
        showToast("Message removed for you.");
      } else {
        setMessages((prev) =>
          prev.map((m) =>
            m.id === msgId
              ? { ...m, message: "🚫 This message was unsent", is_unsent: true }
              : m
          )
        );
        showToast("Message unsent for everyone.");
      }
      setChatActionMsg(null);
    } catch {
      showToast("Could not delete message.", "error");
    }
  };

  const handleClearUserChatForMe = async () => {
    if (messages.length === 0) return;
    try {
      await api.delete(`/chat/messages/clear_thread/?mode=me`);
      setMessages([]);
      showToast("Chat history cleared from your view.");
    } catch {
      showToast("Could not clear chat.", "error");
    }
  };

  // Facebook-Style Shimmer CSS Wave
  const shimmerStyleTag = (
    <style>{`
      @keyframes kmFacebookShimmer {
        0% { background-position: -200% 0; }
        100% { background-position: 200% 0; }
      }
      .km-shimmer {
        background: linear-gradient(90deg, #e2e8f0 25%, #f8fafc 50%, #e2e8f0 75%);
        background-size: 200% 100%;
        animation: kmFacebookShimmer 1.4s infinite linear;
      }
    `}</style>
  );

  if (checkingAuth) {
    return (
      <div className="min-h-screen bg-[#F6F8F5] flex flex-col font-sans">
        {shimmerStyleTag}
        {/* Top Utility Bar Skeleton */}
        <div className="bg-[#0F3822] h-8 px-4 sm:px-8 flex items-center justify-between">
          <div className="w-36 h-3 rounded-full bg-emerald-800/70 animate-pulse" />
          <div className="w-28 h-3 rounded-full bg-emerald-800/70 animate-pulse" />
        </div>
        {/* Sticky Brand Header Skeleton */}
        <div className="bg-white border-b border-slate-200 px-4 sm:px-8 py-3.5">
          <div className="max-w-7xl mx-auto flex items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl km-shimmer" />
              <div className="space-y-1.5">
                <div className="w-32 h-4 rounded-md km-shimmer" />
                <div className="w-24 h-2.5 rounded-md km-shimmer" />
              </div>
            </div>
            <div className="hidden lg:block flex-1 max-w-md h-10 rounded-2xl km-shimmer" />
            <div className="flex items-center gap-2.5">
              <div className="w-24 h-9 rounded-xl km-shimmer" />
              <div className="w-9 h-9 rounded-full km-shimmer" />
            </div>
          </div>
        </div>
        {/* Main Hero & Produce Grid Skeleton */}
        <div className="max-w-7xl mx-auto w-full px-3 sm:px-8 py-6 space-y-6">
          <div className="w-full h-52 sm:h-72 rounded-3xl km-shimmer" />
          <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-6">
            {[1, 2, 3, 4, 5, 6].map((n) => (
              <div
                key={n}
                className="bg-white rounded-2xl sm:rounded-3xl p-3 sm:p-4 border border-slate-200/80 space-y-3 shadow-2xs"
              >
                <div className="h-36 sm:h-48 rounded-xl sm:rounded-2xl km-shimmer" />
                <div className="space-y-2">
                  <div className="w-1/2 h-3 rounded km-shimmer" />
                  <div className="w-3/4 h-4 rounded km-shimmer" />
                  <div className="w-full h-3 rounded km-shimmer" />
                </div>
                <div className="pt-2 flex items-center justify-between">
                  <div className="w-20 h-5 rounded km-shimmer" />
                  <div className="w-24 h-8 rounded-xl km-shimmer" />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  // Dynamically extract real distinct farm origins from dbProducts for 100% accurate Origin filtering
  const availableOrigins = Array.from(
    new Set(
      (Array.isArray(dbProducts) ? dbProducts : [])
        .map((p) => (p.origin_location || "").split(",")[0].trim())
        .filter((loc) => loc.length >= 2)
    )
  ).sort((a, b) => a.localeCompare(b));

  // Category batch counts (respecting current search/origin/stock filters for accurate counts)
  const categoryBatchCounts = (Array.isArray(dbProducts) ? dbProducts : []).reduce(
    (acc, p) => {
      const c = getCanonicalProductCategory(p);
      acc[c] = (acc[c] || 0) + 1;
      acc.ALL = (acc.ALL || 0) + 1;
      return acc;
    },
    { ALL: 0, VEGETABLES: 0, FRUITS: 0, GRAINS: 0, SPICES: 0, DAIRY: 0 }
  );

  const hasActiveFilters =
    Boolean(searchQuery.trim()) ||
    selectedCategory !== "ALL" ||
    selectedDistrict !== "ALL" ||
    inStockOnly ||
    sortBy !== "FEATURED";

  const filteredProducts = (Array.isArray(dbProducts) ? dbProducts : [])
    .map((p) => ({
      product: p,
      relevance: computeProductSearchRelevance(p, searchQuery),
    }))
    .filter(({ product: p, relevance }) => {
      const prodCat = getCanonicalProductCategory(p);
      const matchesCat = selectedCategory === "ALL" || prodCat === selectedCategory;
      const matchesDistrict =
        selectedDistrict === "ALL" ||
        (p.origin_location &&
          p.origin_location.toLowerCase().includes(selectedDistrict.toLowerCase()));
      const matchesSearch = !searchQuery.trim() || relevance > 0;
      const matchesStock = !inStockOnly || Number(p.stock_quantity) > 0;
      return matchesCat && matchesDistrict && matchesSearch && matchesStock;
    })
    .sort((a, b) => {
      if (sortBy === "PRICE_ASC") return Number(a.product.price) - Number(b.product.price);
      if (sortBy === "PRICE_DESC") return Number(b.product.price) - Number(a.product.price);
      if (sortBy === "STOCK_DESC")
        return Number(b.product.stock_quantity) - Number(a.product.stock_quantity);
      if (sortBy === "DISCOUNT_DESC") {
        const discA =
          Number(a.product.actual_price) > Number(a.product.price)
            ? ((Number(a.product.actual_price) - Number(a.product.price)) /
                Number(a.product.actual_price)) *
              100
            : 0;
        const discB =
          Number(b.product.actual_price) > Number(b.product.price)
            ? ((Number(b.product.actual_price) - Number(b.product.price)) /
                Number(b.product.actual_price)) *
              100
            : 0;
        return discB - discA;
      }
      // Default ("FEATURED" / Best Match): sort by search relevance first, then in-stock status
      if (searchQuery.trim() && b.relevance !== a.relevance) {
        return b.relevance - a.relevance;
      }
      const inStockA = Number(a.product.stock_quantity) > 0 ? 1 : 0;
      const inStockB = Number(b.product.stock_quantity) > 0 ? 1 : 0;
      if (inStockB !== inStockA) return inStockB - inStockA;
      return Number(b.product.id || 0) - Number(a.product.id || 0);
    })
    .map(({ product }) => product);

  const totalFarmerEarnings = farmerSales.reduce((sum, s) => sum + Number(s.total_amount || 0), 0);
  const totalFarmerWeight = farmerSales.reduce((sum, s) => sum + Number(s.quantity || 0), 0);

  const approvedFarmerStories = stories.filter((s) => s.story_type === "FARMER_STORY");

  // Helper to determine if a review is an individual product purchase review
  const isProductPurchaseReview = (s) => {
    if (s.product_id || s.product_name || s.order_id) return true;
    const titleLower = (s.title || "").toLowerCase();
    const contentLower = (s.content || "").toLowerCase();
    return (Array.isArray(dbProducts) ? dbProducts : []).some(
      (p) =>
        p.name &&
        (titleLower.includes(p.name.toLowerCase()) || contentLower.includes(p.name.toLowerCase()))
    );
  };

  // Only general platform testimonials appear on the homepage; individual product purchase reviews
  // appear strictly and exclusively on their respective product detail pages!
  const generalPlatformReviews = stories.filter(
    (s) => s.story_type === "BUYER_REVIEW" && !isProductPurchaseReview(s)
  );

  return (
    <div className="min-h-screen bg-[#F6F8F5] text-slate-900 flex flex-col font-sans pb-20 md:pb-0 relative">
      {shimmerStyleTag}
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
              <Phone className="w-3 h-3 sm:w-3.5 sm:h-3.5 text-amber-400" /> +977-9703931744
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
              {user?.location || "Dhangadhi  Hub"}
            </span>
          </div>
        </div>
      </div>

      {/* 2. MAIN BRAND & SEARCH HEADER */}
      <header className="sticky top-0 z-30 bg-white border-b border-slate-200/80 shadow-xs">
        <div className="max-w-7xl mx-auto px-3 sm:px-8 py-2.5 sm:py-3.5 flex items-center justify-between gap-2 sm:gap-4">
          <div
            onClick={() => { setQuickViewProduct(null); setActiveTab("home"); }}
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

          {/* Desktop Search Bar (Synced with Category & Live Relevance Search) */}
          <div className="hidden lg:flex items-center flex-1 max-w-xl bg-slate-100/90 border border-slate-200 rounded-full px-2 py-1 focus-within:border-[#14532D] focus-within:bg-white transition">
            <select
              value={selectedCategory}
              onChange={(e) => {
                setSelectedCategory(e.target.value);
                if (activeTab !== "home" && activeTab !== "marketplace") {
                  setActiveTab("home");
                }
              }}
              className="px-2.5 py-1 text-xs font-bold text-slate-700 bg-transparent border-r border-slate-200 outline-none cursor-pointer"
              title="Filter by produce category"
            >
              <option value="ALL">All ({categoryBatchCounts.ALL})</option>
              <option value="VEGETABLES">🥬 Vegetables ({categoryBatchCounts.VEGETABLES})</option>
              <option value="FRUITS">🍎 Fruits ({categoryBatchCounts.FRUITS})</option>
              <option value="GRAINS">🌾 Grains ({categoryBatchCounts.GRAINS})</option>
              <option value="SPICES">🌶️ Spices ({categoryBatchCounts.SPICES})</option>
              <option value="DAIRY">🍯 Dairy/Honey ({categoryBatchCounts.DAIRY})</option>
            </select>
            <input
              type="text"
              placeholder="Search crops, Nepali names (aalu, syau, marsi), or farm origin..."
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                if (activeTab !== "home" && activeTab !== "marketplace") {
                  setActiveTab("home");
                }
              }}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  setQuickViewProduct(null);
                  setActiveTab("home");
                  document
                    .getElementById("fresh-harvests")
                    ?.scrollIntoView({ behavior: "smooth" });
                }
              }}
              className="flex-1 px-3 py-1.5 text-xs bg-transparent outline-none text-slate-800"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery("")}
                className="px-2 text-slate-400 hover:text-slate-700 text-xs font-bold cursor-pointer"
                title="Clear search"
              >
                ✕
              </button>
            )}
            <button
              type="button"
              onClick={() => {
                setQuickViewProduct(null);
                setActiveTab("home");
                document
                  .getElementById("fresh-harvests")
                  ?.scrollIntoView({ behavior: "smooth" });
              }}
              className="w-8 h-8 rounded-full bg-[#14532D] text-white flex items-center justify-center hover:bg-[#1B4332] cursor-pointer shrink-0"
              title="Search harvest batches"
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
                  onClick={() => {
                    setQuickViewProduct(null);
                    setActiveTab("profile");
                  }}
                  className={`flex items-center gap-2 border rounded-full p-1 sm:pl-1.5 sm:pr-3 sm:py-1 text-left transition cursor-pointer ${
                    activeTab === "profile"
                      ? "bg-emerald-50 border-emerald-500 ring-2 ring-emerald-500/20"
                      : "bg-slate-50 hover:bg-slate-100 border-slate-200/80"
                  }`}
                  title="Open My Profile & Security Page"
                >
                  <div className="w-8 h-8 rounded-full bg-emerald-800 text-white flex items-center justify-center text-xs font-bold shrink-0 overflow-hidden border border-emerald-700">
                    {resolveMediaUrl(user.profile_picture, user.id) && !avatarLoadError ? (
                      <img
                        src={resolveMediaUrl(user.profile_picture, user.id)}
                        alt={user.full_name}
                        onError={() => setAvatarLoadError(true)}
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
                ...(user
                  ? [
                      {
                        id: "profile",
                        label: tr("My Profile & Security", "मेरो प्रोफाइल"),
                      },
                    ]
                  : []),
              ].map((item) => (
                <button
                  key={item.id}
                  onClick={() => { setQuickViewProduct(null); setActiveTab(item.id); }}
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
        {/* DEDICATED FULL-PAGE USER PROFILE, PHOTO STUDIO & OTP PASSWORD SECURITY PAGE */}
        {activeTab === "profile" && user && (() => {
          const currentAvatarUrl = profileAvatarPreview || resolveMediaUrl(user.profile_picture, user.id);
          const newPass = passwordForm.new_password || "";
          const passScore =
            (newPass.length >= 8 ? 1 : 0) +
            (/[A-Z]/.test(newPass) ? 1 : 0) +
            (/[0-9]/.test(newPass) ? 1 : 0) +
            (/[^A-Za-z0-9]/.test(newPass) || newPass.length >= 12 ? 1 : 0);
          const passStrengthLabel =
            newPass.length === 0
              ? "Min 8 characters"
              : newPass.length < 8
              ? "Too short (< 8 chars)"
              : passScore <= 1
              ? "Fair password"
              : passScore === 2
              ? "Good password"
              : "Strong password";

          return (
            <div className="max-w-6xl mx-auto px-3 sm:px-8 py-6 sm:py-8 space-y-6">
              {/* Top Navigation & Breadcrumb Bar */}
              <div className="flex flex-wrap items-center justify-between gap-3">
                <button
                  type="button"
                  onClick={() => setActiveTab("home")}
                  className="inline-flex items-center gap-2 px-4 py-2 rounded-2xl bg-white hover:bg-slate-50 border border-slate-200 text-slate-700 font-extrabold text-xs sm:text-sm shadow-2xs transition cursor-pointer"
                >
                  <span>← Back to Marketplace</span>
                </button>
                <div className="flex items-center gap-2">
                  <span className="px-3 py-1.5 rounded-full bg-emerald-50 border border-emerald-200 text-[#14532D] text-xs font-extrabold">
                    Member ID: #KM-USR-{user.id}
                  </span>
                  {isVerifiedOrAdmin ? (
                    <span className="px-3 py-1.5 rounded-full bg-emerald-600 text-white text-xs font-extrabold flex items-center gap-1 shadow-xs">
                      <CheckCircle2 className="w-3.5 h-3.5" /> Verified {user.role}
                    </span>
                  ) : (
                    <span className="px-3 py-1.5 rounded-full bg-amber-100 text-amber-900 border border-amber-300 text-xs font-extrabold">
                      ⏳ Pending Verification
                    </span>
                  )}
                </div>
              </div>

              {/* Executive Hero Banner with Large Avatar Studio */}
              <div className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-[#0F2E1E] via-[#14532D] to-[#1B4332] text-white p-6 sm:p-8 shadow-xl border border-emerald-800/40">
                <div className="absolute -top-24 -right-24 w-72 h-72 rounded-full bg-emerald-400/10 blur-3xl pointer-events-none" />
                <div className="absolute -bottom-24 -left-24 w-64 h-64 rounded-full bg-amber-400/10 blur-3xl pointer-events-none" />

                <div className="relative flex flex-col md:flex-row md:items-center justify-between gap-6">
                  <div className="flex flex-col sm:flex-row items-center sm:items-center gap-5 text-center sm:text-left">
                    <div className="relative group shrink-0">
                      <div className="w-24 h-24 sm:w-28 sm:h-28 rounded-full bg-emerald-900/90 border-4 border-amber-400/90 shadow-xl overflow-hidden flex items-center justify-center text-3xl font-black text-white">
                        {currentAvatarUrl && !avatarLoadError ? (
                          <img
                            src={currentAvatarUrl}
                            alt={user.full_name}
                            onError={() => setAvatarLoadError(true)}
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <span>{(user.full_name || "U").charAt(0).toUpperCase()}</span>
                        )}
                      </div>
                      <label
                        htmlFor="profile-page-avatar-input"
                        className="absolute bottom-0 right-0 w-9 h-9 rounded-full bg-amber-400 hover:bg-amber-300 text-slate-950 flex items-center justify-center shadow-lg border-2 border-[#14532D] cursor-pointer transition transform hover:scale-105"
                        title="Change Profile Picture"
                      >
                        <Camera className="w-4 h-4" />
                      </label>
                      <input
                        id="profile-page-avatar-input"
                        type="file"
                        accept="image/*"
                        onChange={handleSelectProfilePhoto}
                        className="hidden"
                      />
                    </div>

                    <div className="space-y-1.5">
                      <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2">
                        <span className="px-2.5 py-0.5 rounded-full bg-amber-400 text-slate-950 text-[10px] font-black uppercase tracking-wider">
                          {user.role || "CUSTOMER"} ACCOUNT
                        </span>
                        <span className="px-2.5 py-0.5 rounded-full bg-white/10 border border-white/15 text-emerald-100 text-[11px] font-semibold">
                          🌱 KrishiMart Nepal Member
                        </span>
                      </div>
                      <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-white">
                        {user.full_name}
                      </h1>
                      <div className="flex flex-wrap items-center justify-center sm:justify-start gap-x-4 gap-y-1 text-xs text-emerald-100/90">
                        <span>✉️ {user.email || "No email linked"}</span>
                        <span>📞 {user.phone_number || "No phone added"}</span>
                        <span>📍 {user.location || "Nepal"}</span>
                      </div>
                    </div>
                  </div>

                  {/* Quick Account Activity Summary */}
                  <div className="grid grid-cols-3 gap-2.5 sm:gap-3 bg-white/10 backdrop-blur-md border border-white/15 rounded-2xl p-3.5 sm:p-4 text-center shrink-0">
                    <div
                      onClick={() => !isAdmin && setActiveTab("orders")}
                      className="px-2 sm:px-3 py-1 rounded-xl hover:bg-white/10 transition cursor-pointer"
                    >
                      <p className="text-lg sm:text-xl font-black text-amber-300">
                        {myOrders.length}
                      </p>
                      <p className="text-[10px] font-bold text-emerald-100 uppercase tracking-wider">
                        My Orders
                      </p>
                    </div>
                    <div
                      onClick={() => isFarmer && setActiveTab("sell")}
                      className="px-2 sm:px-3 py-1 rounded-xl border-x border-white/10 hover:bg-white/10 transition cursor-pointer"
                    >
                      <p className="text-lg sm:text-xl font-black text-emerald-300">
                        {mySubmissions.length}
                      </p>
                      <p className="text-[10px] font-bold text-emerald-100 uppercase tracking-wider">
                        Harvest Offers
                      </p>
                    </div>
                    <div className="px-2 sm:px-3 py-1 rounded-xl">
                      <p className="text-lg sm:text-xl font-black text-white">OTP</p>
                      <p className="text-[10px] font-bold text-emerald-100 uppercase tracking-wider">
                        2FA Security
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              {/* 2-Column Main Profile & OTP Security Grid */}
              <div className="grid lg:grid-cols-12 gap-6 items-start">
                {/* LEFT COLUMN (7 Cols): Personal Details & Profile Photo Card */}
                <form
                  onSubmit={handleUpdateProfile}
                  className="lg:col-span-7 bg-white rounded-3xl p-6 sm:p-8 border border-slate-200/90 shadow-sm space-y-6"
                >
                  <div className="flex flex-wrap items-center justify-between gap-2 pb-4 border-b border-slate-100">
                    <div>
                      <h2 className="text-lg sm:text-xl font-black text-slate-900 flex items-center gap-2">
                        <User className="w-5 h-5 text-[#14532D]" />
                        <span>Personal Details & Profile Photo</span>
                      </h2>
                      <p className="text-xs text-slate-500 mt-0.5">
                        Your photo is automatically optimized so it loads fast on all mobile phones and laptops
                      </p>
                    </div>
                  </div>

                  {/* Photo Upload Strip */}
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 rounded-2xl bg-emerald-50/60 border border-emerald-200/70">
                    <div className="flex items-center gap-4">
                      <div className="w-16 h-16 rounded-2xl bg-[#14532D] text-white font-black text-xl flex items-center justify-center overflow-hidden border-2 border-emerald-600/30 shadow-sm shrink-0">
                        {currentAvatarUrl && !avatarLoadError ? (
                          <img
                            src={currentAvatarUrl}
                            alt={user.full_name}
                            onError={() => setAvatarLoadError(true)}
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <span>{(user.full_name || "U").charAt(0).toUpperCase()}</span>
                        )}
                      </div>
                      <div>
                        <p className="text-xs sm:text-sm font-extrabold text-slate-900">
                          {profileAvatarPreview
                            ? "✨ New Photo Ready to Save"
                            : "Profile Picture (Mobile & Desktop Synced)"}
                        </p>
                        <p className="text-[11px] text-slate-500 mt-0.5">
                          Supports camera photos & gallery images (JPG, PNG, WebP)
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <label
                        htmlFor="profile-page-avatar-input"
                        className="px-4 py-2.5 rounded-xl bg-white hover:bg-slate-50 border border-emerald-300 text-[#14532D] text-xs font-extrabold flex items-center gap-1.5 shadow-2xs transition cursor-pointer"
                      >
                        <Camera className="w-4 h-4 text-emerald-700" />
                        <span>{profileAvatarPreview ? "Change Photo" : "Upload Photo"}</span>
                      </label>
                      {profileAvatarPreview && (
                        <button
                          type="button"
                          onClick={() => {
                            setProfileAvatarFile(null);
                            setProfileAvatarPreview(null);
                            setProfileAvatarDataUri(null);
                          }}
                          className="px-3 py-2.5 rounded-xl bg-red-50 hover:bg-red-100 text-red-700 text-xs font-bold transition cursor-pointer"
                        >
                          Reset
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Form Fields */}
                  <div className="grid sm:grid-cols-2 gap-4">
                    <div className="sm:col-span-2">
                      <label className="block text-xs font-extrabold text-slate-700 mb-1.5">
                        Full Name *
                      </label>
                      <input
                        type="text"
                        required
                        placeholder="Enter your full name"
                        value={profileForm.full_name}
                        onChange={(e) =>
                          setProfileForm({ ...profileForm, full_name: e.target.value })
                        }
                        className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:border-[#14532D] bg-slate-50/50 focus:bg-white text-sm font-medium outline-none transition"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-extrabold text-slate-700 mb-1.5">
                        Registered Email (For OTP & Receipts)
                      </label>
                      <input
                        type="email"
                        disabled
                        value={user.email || ""}
                        className="w-full px-4 py-3 rounded-xl border border-slate-200 bg-slate-100 text-slate-500 text-sm font-medium cursor-not-allowed"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-extrabold text-slate-700 mb-1.5">
                        Phone Number (10 digits)
                      </label>
                      <input
                        type="text"
                        placeholder="98XXXXXXXX"
                        value={profileForm.phone_number}
                        onChange={(e) =>
                          setProfileForm({ ...profileForm, phone_number: e.target.value })
                        }
                        className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:border-[#14532D] bg-slate-50/50 focus:bg-white text-sm font-medium outline-none transition"
                      />
                    </div>

                    <div className="sm:col-span-2">
                      <label className="block text-xs font-extrabold text-slate-700 mb-1.5">
                        Default Delivery / Farm Location
                      </label>
                      <input
                        type="text"
                        placeholder="e.g. Dhangadhi-4, Kailali or Baneshwor, Kathmandu"
                        value={profileForm.location}
                        onChange={(e) =>
                          setProfileForm({ ...profileForm, location: e.target.value })
                        }
                        className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:border-[#14532D] bg-slate-50/50 focus:bg-white text-sm font-medium outline-none transition"
                      />
                    </div>
                  </div>

                  <div className="pt-2 flex flex-wrap items-center justify-between gap-3">
                    <span className="text-[11px] text-slate-500">
                      ✓ Changes take effect immediately across your orders, reviews, and chat profile.
                    </span>
                    <button
                      type="submit"
                      disabled={savingProfile}
                      className="px-6 py-3 rounded-xl bg-[#14532D] hover:bg-[#1B4332] disabled:opacity-60 text-white text-xs sm:text-sm font-extrabold shadow-md transition cursor-pointer"
                    >
                      {savingProfile ? "Saving Profile & Photo..." : "✓ Save Profile & Photo"}
                    </button>
                  </div>
                </form>

                {/* RIGHT COLUMN (5 Cols): Change Password with 6-Digit Email OTP Verification */}
                <div className="lg:col-span-5 bg-white rounded-3xl p-6 sm:p-8 border border-slate-200/90 shadow-sm space-y-5">
                  <div className="pb-4 border-b border-slate-100">
                    <div className="flex items-center justify-between gap-2">
                      <h2 className="text-lg sm:text-xl font-black text-slate-900 flex items-center gap-2">
                        <ShieldCheck className="w-5 h-5 text-amber-600" />
                        <span>Change Password (OTP)</span>
                      </h2>
                      <span className="px-2.5 py-1 rounded-full bg-amber-50 border border-amber-200 text-amber-900 text-[10px] font-black uppercase">
                        6-Digit Email OTP
                      </span>
                    </div>
                    <p className="text-xs text-slate-500 mt-1">
                      Protected by 2-step email verification sent to{" "}
                      <strong className="text-slate-700">{user.email}</strong>
                    </p>
                  </div>

                  {/* 2-Step Visual Progress Pill */}
                  <div className="grid grid-cols-2 gap-2 p-1.5 rounded-2xl bg-slate-100 text-xs font-extrabold">
                    <div
                      className={`py-2 px-3 rounded-xl text-center transition ${
                        !profileOtpSent
                          ? "bg-[#14532D] text-white shadow-xs"
                          : "bg-emerald-100 text-[#14532D]"
                      }`}
                    >
                      1. Set New Password
                    </div>
                    <div
                      className={`py-2 px-3 rounded-xl text-center transition ${
                        profileOtpSent
                          ? "bg-amber-500 text-slate-950 shadow-xs"
                          : "text-slate-500"
                      }`}
                    >
                      2. Verify 6-Digit OTP
                    </div>
                  </div>

                  <form onSubmit={handleChangePassword} className="space-y-4">
                    {/* Option to use Current Password or Email OTP only */}
                    <div className="flex items-center justify-between text-[11px]">
                      <span className="font-bold text-slate-600">
                        {skipCurrentPasswordForOtp
                          ? "Mode: Verify via Email OTP Only"
                          : "Mode: Current Password + Email OTP"}
                      </span>
                      <button
                        type="button"
                        onClick={() => {
                          setSkipCurrentPasswordForOtp((prev) => !prev);
                          setProfileOtpSent(false);
                        }}
                        className="text-emerald-700 hover:underline font-extrabold cursor-pointer"
                      >
                        {skipCurrentPasswordForOtp
                          ? "Use Current Password"
                          : "Forgot Current Password?"}
                      </button>
                    </div>

                    {!skipCurrentPasswordForOtp && (
                      <div>
                        <label className="block text-xs font-extrabold text-slate-700 mb-1">
                          Current Password *
                        </label>
                        <div className="relative">
                          <input
                            type={showCurrentPassword ? "text" : "password"}
                            required={!skipCurrentPasswordForOtp}
                            disabled={profileOtpSent}
                            placeholder="Enter your current password"
                            value={passwordForm.current_password}
                            onChange={(e) =>
                              setPasswordForm({ ...passwordForm, current_password: e.target.value })
                            }
                            className="w-full pl-3.5 pr-10 py-2.5 rounded-xl border border-slate-200 bg-slate-50/50 focus:bg-white text-sm outline-none focus:border-[#14532D] disabled:opacity-60"
                          />
                          <button
                            type="button"
                            onClick={() => setShowCurrentPassword((prev) => !prev)}
                            className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700 cursor-pointer"
                          >
                            {showCurrentPassword ? (
                              <EyeOff className="w-4 h-4" />
                            ) : (
                              <Eye className="w-4 h-4" />
                            )}
                          </button>
                        </div>
                      </div>
                    )}

                    <div>
                      <label className="block text-xs font-extrabold text-slate-700 mb-1">
                        New Password (min 8 characters) *
                      </label>
                      <div className="relative">
                        <input
                          type={showNewPassword ? "text" : "password"}
                          required
                          minLength={8}
                          disabled={profileOtpSent}
                          placeholder="Create a strong new password"
                          value={passwordForm.new_password}
                          onChange={(e) =>
                            setPasswordForm({ ...passwordForm, new_password: e.target.value })
                          }
                          className="w-full pl-3.5 pr-10 py-2.5 rounded-xl border border-slate-200 bg-slate-50/50 focus:bg-white text-sm outline-none focus:border-[#14532D] disabled:opacity-60"
                        />
                        <button
                          type="button"
                          onClick={() => setShowNewPassword((prev) => !prev)}
                          className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700 cursor-pointer"
                        >
                          {showNewPassword ? (
                            <EyeOff className="w-4 h-4" />
                          ) : (
                            <Eye className="w-4 h-4" />
                          )}
                        </button>
                      </div>

                      {/* Password Strength Meter */}
                      <div className="mt-2 space-y-1">
                        <div className="grid grid-cols-4 gap-1.5">
                          {[1, 2, 3, 4].map((lvl) => (
                            <div
                              key={lvl}
                              className={`h-1.5 rounded-full transition-all ${
                                newPass.length === 0
                                  ? "bg-slate-200"
                                  : passScore >= lvl
                                  ? passScore <= 1
                                    ? "bg-red-500"
                                    : passScore === 2
                                    ? "bg-amber-500"
                                    : "bg-emerald-600"
                                  : "bg-slate-200"
                              }`}
                            />
                          ))}
                        </div>
                        <p className="text-[10px] font-bold text-slate-500 text-right">
                          {passStrengthLabel}
                        </p>
                      </div>
                    </div>

                    <div>
                      <label className="block text-xs font-extrabold text-slate-700 mb-1">
                        Confirm New Password *
                      </label>
                      <div className="relative">
                        <input
                          type={showConfirmNewPassword ? "text" : "password"}
                          required
                          minLength={8}
                          disabled={profileOtpSent}
                          placeholder="Re-enter new password"
                          value={passwordForm.confirm_password || ""}
                          onChange={(e) =>
                            setPasswordForm({ ...passwordForm, confirm_password: e.target.value })
                          }
                          className="w-full pl-3.5 pr-10 py-2.5 rounded-xl border border-slate-200 bg-slate-50/50 focus:bg-white text-sm outline-none focus:border-[#14532D] disabled:opacity-60"
                        />
                        <button
                          type="button"
                          onClick={() => setShowConfirmNewPassword((prev) => !prev)}
                          className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700 cursor-pointer"
                        >
                          {showConfirmNewPassword ? (
                            <EyeOff className="w-4 h-4" />
                          ) : (
                            <Eye className="w-4 h-4" />
                          )}
                        </button>
                      </div>
                      {passwordForm.confirm_password && (
                        <p
                          className={`text-[11px] font-bold mt-1 ${
                            passwordForm.new_password === passwordForm.confirm_password
                              ? "text-emerald-700"
                              : "text-red-600"
                          }`}
                        >
                          {passwordForm.new_password === passwordForm.confirm_password
                            ? "✓ Passwords match"
                            : "✕ Passwords do not match"}
                        </p>
                      )}
                    </div>

                    {!profileOtpSent ? (
                      <button
                        type="button"
                        onClick={handleRequestPasswordOtp}
                        disabled={sendingProfileOtp}
                        className="w-full py-3 rounded-xl bg-amber-500 hover:bg-amber-400 disabled:opacity-60 text-slate-950 font-black text-xs sm:text-sm shadow-md transition cursor-pointer"
                      >
                        {sendingProfileOtp
                          ? "Sending 6-Digit OTP to Email..."
                          : `📩 Send 6-Digit OTP to ${user.email}`}
                      </button>
                    ) : (
                      <div className="p-4 rounded-2xl bg-emerald-50/90 border-2 border-emerald-500/40 space-y-3 animate-fadeIn">
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-extrabold text-[#14532D]">
                            ✓ 6-Digit OTP Sent to Inbox
                          </span>
                          <button
                            type="button"
                            onClick={() => setProfileOtpSent(false)}
                            className="text-[11px] font-bold text-slate-500 hover:text-slate-800 underline cursor-pointer"
                          >
                            ← Edit Password
                          </button>
                        </div>
                        <p className="text-[11px] text-slate-600 leading-relaxed">
                          Enter the 6-digit verification code sent to{" "}
                          <strong>{user.email}</strong> to confirm your password update:
                        </p>
                        <input
                          type="text"
                          inputMode="numeric"
                          maxLength={6}
                          required
                          placeholder="000000"
                          value={passwordForm.otp || ""}
                          onChange={(e) =>
                            setPasswordForm({
                              ...passwordForm,
                              otp: e.target.value.replace(/[^0-9]/g, "").slice(0, 6),
                            })
                          }
                          className="w-full py-3 px-4 rounded-xl border-2 border-emerald-600 bg-white text-center text-xl font-black tracking-[0.4em] text-[#14532D] outline-none"
                        />
                        <button
                          type="submit"
                          disabled={verifyingProfileOtp}
                          className="w-full py-3 rounded-xl bg-[#14532D] hover:bg-[#1B4332] disabled:opacity-60 text-white font-black text-xs sm:text-sm shadow-md transition cursor-pointer"
                        >
                          {verifyingProfileOtp
                            ? "Verifying OTP & Updating..."
                            : "🔒 Verify OTP & Update Password"}
                        </button>
                        <div className="text-center">
                          <button
                            type="button"
                            onClick={handleRequestPasswordOtp}
                            disabled={sendingProfileOtp}
                            className="text-[11px] font-extrabold text-emerald-800 hover:underline cursor-pointer"
                          >
                            {sendingProfileOtp ? "Resending code..." : "↻ Resend 6-Digit OTP Code"}
                          </button>
                        </div>
                      </div>
                    )}
                  </form>
                </div>
              </div>
            </div>
          );
        })()}

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

        {/* FARMER'S "SOLD TO ADMIN / MANAGER" FINANCIAL REPORT (ENHANCED UX & SETTLEMENT TRACKER) */}
        {activeTab === "farmer_sales" && isFarmer && (() => {
          const totalPaidAmount = farmerSales
            .filter((s) => s.payment_status === "PAID")
            .reduce((sum, s) => sum + Number(s.total_amount || 0), 0);
          const totalPendingAmount = farmerSales
            .filter((s) => s.payment_status !== "PAID")
            .reduce((sum, s) => sum + Number(s.total_amount || 0), 0);
          const totalEarnings = totalPaidAmount + totalPendingAmount;
          const paidPercentage =
            totalEarnings > 0 ? Math.round((totalPaidAmount / totalEarnings) * 100) : 100;

          const salesCounts = {
            ALL: farmerSales.length,
            PAID: farmerSales.filter((s) => s.payment_status === "PAID").length,
            PENDING: farmerSales.filter((s) => s.payment_status !== "PAID").length,
          };

          const displayedSales =
            farmerSalesFilter === "ALL"
              ? farmerSales
              : farmerSales.filter((s) =>
                  farmerSalesFilter === "PAID"
                    ? s.payment_status === "PAID"
                    : s.payment_status !== "PAID"
                );

          return (
          <div className="max-w-6xl mx-auto px-3 sm:px-8 py-5 sm:py-8 space-y-5">
            {/* Top Header & Offer Crop Action */}
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <span className="text-[11px] font-extrabold text-emerald-700 uppercase tracking-wider">
                  ● Verified Farmer Financial Ledger & Payouts
                </span>
                <h2 className="text-xl sm:text-2xl font-black text-slate-900 mt-0.5">
                  {tr("Crops Sold to KrishiMart Admin", "कृषि उपज बिक्री तथा भुक्तानी विवरण")}
                </h2>
                <p className="text-xs text-slate-500">
                  Direct procurement records, settlement statuses, and official 1/4 A4 vouchers.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setActiveTab("sell")}
                className="px-4 py-2.5 rounded-xl bg-[#14532D] hover:bg-[#1B4332] text-white text-xs font-bold cursor-pointer shadow-xs transition"
              >
                + Offer New Harvest Batch
              </button>
            </div>

            {/* 4-Card Settlement & Payout Portfolio Breakdown */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 sm:gap-4">
              <div className="bg-white p-3.5 sm:p-5 rounded-2xl border border-slate-200/90 shadow-2xs">
                <span className="text-[10px] sm:text-xs font-bold text-slate-400 uppercase tracking-wider">
                  Total Procurement
                </span>
                <p className="text-lg sm:text-2xl font-black text-slate-900 mt-0.5">
                  रु {totalEarnings.toLocaleString()}
                </p>
                <span className="text-[10px] sm:text-[11px] text-slate-500 font-semibold">
                  {farmerSales.length} harvest vouchers
                </span>
              </div>

              <div className="bg-emerald-50/70 p-3.5 sm:p-5 rounded-2xl border border-emerald-200/80 shadow-2xs">
                <span className="text-[10px] sm:text-xs font-bold text-emerald-700 uppercase tracking-wider">
                  Settled (PAID)
                </span>
                <p className="text-lg sm:text-2xl font-black text-[#14532D] mt-0.5">
                  रु {totalPaidAmount.toLocaleString()}
                </p>
                <span className="text-[10px] sm:text-[11px] text-emerald-700 font-semibold">
                  ✓ Received via Cash / Bank
                </span>
              </div>

              <div className="bg-amber-50/70 p-3.5 sm:p-5 rounded-2xl border border-amber-200/80 shadow-2xs">
                <span className="text-[10px] sm:text-xs font-bold text-amber-800 uppercase tracking-wider">
                  Pending Payout
                </span>
                <p className="text-lg sm:text-2xl font-black text-amber-700 mt-0.5">
                  रु {totalPendingAmount.toLocaleString()}
                </p>
                <span className="text-[10px] sm:text-[11px] text-amber-800 font-semibold">
                  ⏳ Awaiting Admin release
                </span>
              </div>

              <div className="bg-white p-3.5 sm:p-5 rounded-2xl border border-slate-200/90 shadow-2xs">
                <span className="text-[10px] sm:text-xs font-bold text-slate-400 uppercase tracking-wider">
                  Volume Delivered
                </span>
                <p className="text-lg sm:text-2xl font-black text-slate-900 mt-0.5">
                  {totalFarmerWeight.toLocaleString()}{" "}
                  <span className="text-xs font-normal text-slate-500">units</span>
                </p>
                <span className="text-[10px] sm:text-[11px] text-emerald-700 font-semibold">
                  Collected by Hub
                </span>
              </div>
            </div>

            {/* Visual Settlement Progress Bar */}
            {totalEarnings > 0 && (
              <div className="bg-white rounded-2xl p-4 border border-slate-200/90 shadow-2xs space-y-2">
                <div className="flex items-center justify-between text-xs font-bold">
                  <span className="text-slate-700 flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-emerald-600 inline-block" />
                    Overall Payout Settlement Rate
                  </span>
                  <span className="text-[#14532D] font-black">{paidPercentage}% Settled</span>
                </div>
                <div className="w-full h-3 rounded-full bg-slate-100 overflow-hidden flex">
                  <div
                    className="h-full bg-emerald-600 transition-all duration-500 rounded-full"
                    style={{ width: `${paidPercentage}%` }}
                    title={`Paid: रु ${totalPaidAmount.toLocaleString()}`}
                  />
                </div>
                <div className="flex items-center justify-between text-[11px] text-slate-400 pt-0.5">
                  <span>रु {totalPaidAmount.toLocaleString()} Settled</span>
                  <span>रु {totalPendingAmount.toLocaleString()} Remaining</span>
                </div>
              </div>
            )}

            {/* 1-Tap Filter Tabs */}
            <div className="flex items-center gap-1.5 overflow-x-auto pb-1 no-scrollbar">
              {[
                { id: "ALL", label: "All Vouchers", count: salesCounts.ALL },
                { id: "PAID", label: "✓ Settled (PAID)", count: salesCounts.PAID },
                { id: "PENDING", label: "⏳ Pending Payout", count: salesCounts.PENDING },
              ].map((tab) => {
                const active = farmerSalesFilter === tab.id;
                return (
                  <button
                    key={tab.id}
                    type="button"
                    onClick={() => setFarmerSalesFilter(tab.id)}
                    className={`px-3.5 py-2 rounded-xl text-xs font-bold whitespace-nowrap flex items-center gap-1.5 transition cursor-pointer shrink-0 ${
                      active
                        ? "bg-[#14532D] text-white shadow-xs"
                        : "bg-white text-slate-600 border border-slate-200 hover:bg-slate-50"
                    }`}
                  >
                    <span>{tab.label}</span>
                    <span
                      className={`px-1.5 py-0.2 rounded-full text-[10px] font-extrabold ${
                        active ? "bg-amber-400 text-slate-950" : "bg-slate-100 text-slate-600"
                      }`}
                    >
                      {tab.count}
                    </span>
                  </button>
                );
              })}
            </div>

            {loadingUserData && farmerSales.length === 0 ? (
              <div className="grid sm:grid-cols-2 gap-4">
                {[1, 2, 3, 4].map((n) => (
                  <div
                    key={n}
                    className="bg-white rounded-3xl p-5 border border-slate-200 shadow-2xs space-y-3"
                  >
                    <div className="flex justify-between">
                      <div className="space-y-1.5">
                        <div className="w-20 h-3 rounded km-shimmer" />
                        <div className="w-40 h-5 rounded km-shimmer" />
                      </div>
                      <div className="w-24 h-6 rounded-full km-shimmer" />
                    </div>
                    <div className="h-20 rounded-2xl km-shimmer" />
                    <div className="flex justify-between items-center pt-2">
                      <div className="w-24 h-3.5 rounded km-shimmer" />
                      <div className="w-28 h-8 rounded-xl km-shimmer" />
                    </div>
                  </div>
                ))}
              </div>
            ) : displayedSales.length === 0 ? (
              <div className="bg-white rounded-3xl p-10 text-center text-slate-500 border border-slate-200 space-y-2">
                <Receipt className="w-10 h-10 text-slate-300 mx-auto" />
                <p className="text-sm font-bold text-slate-700">
                  {farmerSalesFilter === "ALL"
                    ? "No crops have been purchased by the Admin yet."
                    : `No ${farmerSalesFilter.toLowerCase()} vouchers found.`}
                </p>
                <p className="text-xs text-slate-400">
                  Submit your harvest under "Sell Your Harvest" to start receiving wholesale payouts!
                </p>
              </div>
            ) : (
              <div className="grid sm:grid-cols-2 gap-4">
                {displayedSales.map((s) => (
                  <div
                    key={s.id}
                    className="bg-white rounded-2xl sm:rounded-3xl p-4 sm:p-5 border border-slate-200 shadow-2xs hover:shadow-md transition space-y-3"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <span className="text-[10px] font-extrabold text-emerald-700 uppercase tracking-wider">
                          {s.category}
                        </span>
                        <h3 className="font-extrabold text-base text-slate-900">{s.crop_name}</h3>
                        <p className="text-[11px] text-slate-400">
                          Sold on {new Date(s.created_at).toLocaleDateString()}
                        </p>
                      </div>
                      <span
                        className={`px-2.5 py-1 rounded-full text-[11px] font-extrabold ${
                          s.payment_status === "PAID"
                            ? "bg-emerald-100 text-[#14532D]"
                            : "bg-amber-100 text-amber-900"
                        }`}
                      >
                        {s.payment_status === "PAID" ? "✓ PAID" : "⏳ PENDING"} ({s.payment_method})
                      </span>
                    </div>

                    <div className="p-3 bg-slate-50/90 rounded-2xl text-xs space-y-1.5 border border-slate-100">
                      <div className="flex justify-between text-slate-600">
                        <span>Quantity Procured:</span>
                        <strong className="text-slate-900">
                          {s.quantity} {s.unit}
                        </strong>
                      </div>
                      <div className="flex justify-between text-slate-600">
                        <span>Agreed Rate:</span>
                        <strong className="text-slate-900">
                          रु {s.agreed_wholesale_rate} / {s.unit}
                        </strong>
                      </div>
                      <div className="flex justify-between border-t border-slate-200/80 pt-1.5 text-sm font-black text-[#14532D]">
                        <span>Total Farmer Payout:</span>
                        <span>रु {Number(s.total_amount).toLocaleString()}</span>
                      </div>
                    </div>

                    {s.admin_notes && (
                      <p className="text-xs bg-emerald-50/70 p-2.5 rounded-xl text-emerald-950 border border-emerald-100 leading-snug">
                        <strong>Admin Note:</strong> {s.admin_notes}
                      </p>
                    )}

                    <div className="pt-2 border-t border-slate-100 flex items-center justify-between">
                      <span className="text-[11px] font-extrabold text-slate-400">
                        Voucher #KM-PUR-{s.id}
                      </span>
                      <button
                        type="button"
                        onClick={() => setActiveSlip({ ...s, slipType: "FARMER_SALE" })}
                        className="px-3 py-1.5 rounded-xl border border-emerald-300 bg-emerald-50/70 hover:bg-emerald-100 text-[#14532D] text-xs font-bold flex items-center gap-1.5 transition cursor-pointer"
                      >
                        <Receipt className="w-3.5 h-3.5" /> 🖨️ 1/4 A4 Slip
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
          );
        })()}

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

                {/* Enhanced Wholesale Harvest Batches & Status Stepper */}
                {(() => {
                  const subCounts = {
                    ALL: mySubmissions.length,
                    PENDING: mySubmissions.filter((s) => s.status === "PENDING").length,
                    BOUGHT: mySubmissions.filter((s) => s.status === "BOUGHT" || s.status === "APPROVED").length,
                    REJECTED: mySubmissions.filter((s) => s.status === "REJECTED").length,
                  };

                  const displayedSubs =
                    submissionFilter === "ALL"
                      ? mySubmissions
                      : mySubmissions.filter((s) =>
                          submissionFilter === "BOUGHT"
                            ? s.status === "BOUGHT" || s.status === "APPROVED"
                            : s.status === submissionFilter
                        );

                  return (
                    <div className="space-y-3.5">
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <h3 className="text-base sm:text-lg font-black text-slate-900">
                          Your Submitted Harvest Batches ({mySubmissions.length})
                        </h3>
                        <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar">
                          {[
                            { id: "ALL", label: "All", count: subCounts.ALL },
                            { id: "PENDING", label: "⏳ Pending", count: subCounts.PENDING },
                            { id: "BOUGHT", label: "✓ Procured", count: subCounts.BOUGHT },
                            { id: "REJECTED", label: "✕ Declined", count: subCounts.REJECTED },
                          ].map((tab) => (
                            <button
                              key={tab.id}
                              type="button"
                              onClick={() => setSubmissionFilter(tab.id)}
                              className={`px-2.5 py-1 rounded-lg text-[11px] font-bold whitespace-nowrap transition cursor-pointer ${
                                submissionFilter === tab.id
                                  ? "bg-[#14532D] text-white shadow-2xs"
                                  : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                              }`}
                            >
                              {tab.label} ({tab.count})
                            </button>
                          ))}
                        </div>
                      </div>

                      {displayedSubs.length === 0 ? (
                        <div className="bg-white rounded-2xl p-6 text-center text-xs text-slate-500 border border-slate-200">
                          {submissionFilter === "ALL"
                            ? "No harvest batches submitted yet."
                            : `No ${submissionFilter.toLowerCase()} batches found.`}
                        </div>
                      ) : (
                        displayedSubs.map((s) => {
                          const stepIdx =
                            s.status === "BOUGHT"
                              ? 3
                              : s.status === "APPROVED"
                              ? 2
                              : s.status === "PENDING"
                              ? 1
                              : 0;

                          return (
                            <div
                              key={s.id}
                              className="bg-white rounded-2xl p-4 sm:p-5 shadow-2xs border border-slate-200 space-y-3"
                            >
                              <div className="flex flex-wrap items-start justify-between gap-2">
                                <div>
                                  <div className="flex items-center gap-2">
                                    <span className="px-2 py-0.5 rounded-md bg-slate-100 text-[10px] font-black text-slate-600">
                                      #KM-SUB-{s.id}
                                    </span>
                                    <h4 className="font-extrabold text-base text-slate-900">
                                      {s.vegetable_name}
                                    </h4>
                                  </div>
                                  <p className="text-xs text-slate-500 mt-0.5">
                                    {s.quantity} {s.unit} @ रु {s.expected_price_per_unit}/{s.unit} •
                                    📍 {s.pickup_location}
                                  </p>
                                </div>

                                <div className="flex items-center gap-2">
                                  <span
                                    className={`px-2.5 py-1 rounded-full text-[11px] font-extrabold ${
                                      s.status === "BOUGHT"
                                        ? "bg-emerald-600 text-white shadow-2xs"
                                        : s.status === "APPROVED"
                                        ? "bg-emerald-100 text-emerald-800"
                                        : s.status === "REJECTED"
                                        ? "bg-red-100 text-red-700"
                                        : "bg-amber-100 text-amber-800"
                                    }`}
                                  >
                                    {s.status === "BOUGHT" ? "✓ BOUGHT BY KRISHIMART" : s.status}
                                  </span>
                                  {s.status === "PENDING" && (
                                    <button
                                      type="button"
                                      onClick={() => handleDeleteSubmission(s.id, s.vegetable_name)}
                                      className="p-1.5 text-red-500 hover:bg-red-50 rounded-lg cursor-pointer transition"
                                      title="Withdraw Pending Offer"
                                    >
                                      <Trash2 className="w-4 h-4" />
                                    </button>
                                  )}
                                </div>
                              </div>

                              <p className="text-xs text-slate-600 leading-relaxed">
                                {s.vegetable_description}
                              </p>

                              {s.admin_remarks && (
                                <div className="p-2.5 rounded-xl bg-emerald-50 text-xs text-emerald-950 border border-emerald-100 leading-snug">
                                  <strong>Admin Remark:</strong> {s.admin_remarks}
                                </div>
                              )}

                              {/* Visual Wholesale 3-Step Lifecycle Tracker */}
                              {s.status === "REJECTED" ? (
                                <div className="bg-red-50/80 border border-red-200/80 rounded-xl px-3 py-2 text-xs text-red-700 font-semibold flex items-center justify-between">
                                  <span>✕ Offer was declined by Admin. See remarks above.</span>
                                  <span className="text-[10px] font-extrabold uppercase">
                                    Declined
                                  </span>
                                </div>
                              ) : (
                                <div className="bg-slate-50/90 border border-slate-200/70 rounded-xl p-2.5">
                                  <div className="grid grid-cols-3 gap-1.5 text-center">
                                    {[
                                      { step: 1, title: "1. Submitted", sub: "Waiting Admin" },
                                      { step: 2, title: "2. Approved", sub: "Quality Checked" },
                                      { step: 3, title: "3. Procured (Bought)", sub: "Payout Added" },
                                    ].map((st) => {
                                      const done = stepIdx >= st.step;
                                      const current = stepIdx === st.step;
                                      return (
                                        <div key={st.step} className="flex flex-col items-center">
                                          <div
                                            className={`w-5 h-5 rounded-full text-[10px] font-black flex items-center justify-center transition ${
                                              done
                                                ? "bg-[#14532D] text-white shadow-2xs"
                                                : "bg-slate-200 text-slate-500"
                                            } ${current ? "ring-2 ring-emerald-300" : ""}`}
                                          >
                                            {done ? "✓" : st.step}
                                          </div>
                                          <p
                                            className={`text-[10px] font-extrabold mt-0.5 ${
                                              done ? "text-[#14532D]" : "text-slate-400"
                                            }`}
                                          >
                                            {st.title}
                                          </p>
                                        </div>
                                      );
                                    })}
                                  </div>
                                </div>
                              )}
                            </div>
                          );
                        })
                      )}
                    </div>
                  );
                })()}
              </div>
            </div>
          </div>
        )}

        {/* DEDICATED "MY ORDERS" TRACKING VIEW (DARAZ-STYLE MOBILE & DESKTOP UX) */}
        {activeTab === "orders" && user && (() => {
          const orderCounts = {
            ALL: myOrders.length,
            PENDING: myOrders.filter((o) => o.status === "PENDING").length,
            CONFIRMED: myOrders.filter((o) => o.status === "CONFIRMED").length,
            DELIVERED: myOrders.filter((o) => o.status === "DELIVERED").length,
            CANCELLED: myOrders.filter((o) => o.status === "CANCELLED").length,
          };
          const totalSavedAmount = myOrders.reduce((acc, o) => {
            if (o.status === "CANCELLED") return acc;
            const { discAmt } = getCustomerOrderPricing(o);
            return acc + discAmt;
          }, 0);
          const displayedOrders =
            orderStatusFilter === "ALL"
              ? myOrders
              : myOrders.filter((o) => o.status === orderStatusFilter);

          return (
          <div className="max-w-5xl mx-auto px-3 sm:px-8 py-5 sm:py-10 space-y-5">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <span className="text-[11px] font-extrabold uppercase tracking-wider text-emerald-700">
                  ● Live Order Tracking & Digital Receipts
                </span>
                <h2 className="text-xl sm:text-2xl font-black text-slate-900">
                  {tr("My Harvest Orders", "मेरा अर्डरहरू")}
                </h2>
              </div>
              <button
                onClick={() => { setQuickViewProduct(null); setActiveTab("marketplace"); }}
                className="px-4 py-2 rounded-xl bg-[#14532D] hover:bg-[#1B4332] text-white text-xs font-bold cursor-pointer shadow-xs transition"
              >
                + Continue Shopping
              </button>
            </div>

            {/* Daraz-Style 4-Card Mobile-First Summary Strip */}
            {myOrders.length > 0 && (
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 sm:gap-3.5">
                <div className="bg-white rounded-2xl p-3.5 border border-slate-200/90 shadow-2xs">
                  <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                    Total Orders
                  </p>
                  <p className="text-lg sm:text-xl font-black text-slate-900 mt-0.5">
                    {orderCounts.ALL}
                  </p>
                </div>
                <div className="bg-blue-50/60 rounded-2xl p-3.5 border border-blue-200/80 shadow-2xs">
                  <p className="text-[10px] font-bold uppercase tracking-wider text-blue-700">
                    Active / Packing
                  </p>
                  <p className="text-lg sm:text-xl font-black text-blue-900 mt-0.5">
                    {orderCounts.PENDING + orderCounts.CONFIRMED}
                  </p>
                </div>
                <div className="bg-emerald-50/70 rounded-2xl p-3.5 border border-emerald-200/80 shadow-2xs">
                  <p className="text-[10px] font-bold uppercase tracking-wider text-emerald-700">
                    Delivered
                  </p>
                  <p className="text-lg sm:text-xl font-black text-[#14532D] mt-0.5">
                    {orderCounts.DELIVERED}
                  </p>
                </div>
                <div className="bg-amber-50/70 rounded-2xl p-3.5 border border-amber-200/80 shadow-2xs">
                  <p className="text-[10px] font-bold uppercase tracking-wider text-amber-800">
                    Total Discount Saved
                  </p>
                  <p className="text-lg sm:text-xl font-black text-amber-700 mt-0.5">
                    रु {totalSavedAmount.toFixed(2)}
                  </p>
                </div>
              </div>
            )}

            {/* Daraz-Style Horizontal Swipeable Status Filter Tabs */}
            <div className="flex items-center gap-1.5 overflow-x-auto pb-1 no-scrollbar">
              {[
                { id: "ALL", label: "All Orders", count: orderCounts.ALL },
                { id: "PENDING", label: "To Confirm", count: orderCounts.PENDING },
                { id: "CONFIRMED", label: "Confirmed & Packing", count: orderCounts.CONFIRMED },
                { id: "DELIVERED", label: "Delivered", count: orderCounts.DELIVERED },
                { id: "CANCELLED", label: "Cancelled", count: orderCounts.CANCELLED },
              ].map((tab) => {
                const active = orderStatusFilter === tab.id;
                return (
                  <button
                    key={tab.id}
                    type="button"
                    onClick={() => setOrderStatusFilter(tab.id)}
                    className={`px-3.5 py-2 rounded-xl text-xs font-bold whitespace-nowrap flex items-center gap-1.5 transition cursor-pointer shrink-0 ${
                      active
                        ? "bg-[#14532D] text-white shadow-xs"
                        : "bg-white text-slate-600 border border-slate-200 hover:bg-slate-50"
                    }`}
                  >
                    <span>{tab.label}</span>
                    <span
                      className={`px-1.5 py-0.2 rounded-full text-[10px] font-extrabold ${
                        active ? "bg-amber-400 text-slate-950" : "bg-slate-100 text-slate-600"
                      }`}
                    >
                      {tab.count}
                    </span>
                  </button>
                );
              })}
            </div>

            {loadingUserData && myOrders.length === 0 ? (
              <div className="space-y-3.5">
                {[1, 2, 3].map((n) => (
                  <div
                    key={n}
                    className="bg-white rounded-2xl p-4 sm:p-5 border border-slate-200/90 shadow-2xs space-y-3.5"
                  >
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div className="space-y-2 flex-1">
                        <div className="flex items-center gap-2">
                          <div className="w-20 h-5 rounded-md km-shimmer" />
                          <div className="w-44 h-5 rounded-md km-shimmer" />
                          <div className="w-20 h-5 rounded-full km-shimmer" />
                        </div>
                        <div className="w-3/4 h-3.5 rounded km-shimmer" />
                        <div className="w-32 h-3 rounded km-shimmer" />
                      </div>
                      <div className="flex items-center gap-3">
                        <div className="w-24 h-7 rounded-lg km-shimmer" />
                        <div className="w-24 h-9 rounded-xl km-shimmer" />
                      </div>
                    </div>
                    <div className="h-14 rounded-xl km-shimmer" />
                  </div>
                ))}
              </div>
            ) : displayedOrders.length === 0 ? (
              <div className="bg-white rounded-3xl p-10 text-center border border-slate-200 space-y-3">
                <PackageCheck className="w-10 h-10 text-slate-400 mx-auto" />
                <p className="text-sm font-bold text-slate-700">
                  {orderStatusFilter === "ALL"
                    ? "No orders placed yet"
                    : `No ${orderStatusFilter.toLowerCase()} orders found`}
                </p>
                <p className="text-xs text-slate-500">
                  Add fresh vegetables or fruits to your basket to place an order directly from Nepali farms.
                </p>
                {orderStatusFilter !== "ALL" && (
                  <button
                    type="button"
                    onClick={() => setOrderStatusFilter("ALL")}
                    className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold cursor-pointer"
                  >
                    View All Orders
                  </button>
                )}
              </div>
            ) : (
              <div className="space-y-3.5">
                {displayedOrders.map((o) => {
                  const {
                    subtotal,
                    unitPrice,
                    discPct,
                    discAmt,
                    deliveryCharge,
                    distanceKm,
                    isFreeDelivery,
                    deliveryLat,
                    deliveryLng,
                    netTotal,
                  } = getCustomerOrderPricing(o);
                  const stepIdx =
                    o.status === "DELIVERED"
                      ? 3
                      : o.status === "CONFIRMED"
                      ? 2
                      : o.status === "PENDING"
                      ? 1
                      : 0;
                  const matchedProductForReorder = (Array.isArray(dbProducts) ? dbProducts : []).find(
                    (p) => p.id === o.product || p.name === o.product_name
                  );

                  return (
                  <div
                    key={o.id}
                    className="bg-white rounded-2xl p-4 sm:p-5 border border-slate-200/90 shadow-2xs hover:shadow-md transition space-y-3.5"
                  >
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div className="space-y-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="px-2 py-0.5 rounded-md bg-slate-100 text-[11px] font-black text-slate-600">
                            #KM-ORD-{o.id}
                          </span>
                          <h3 className="font-extrabold text-sm sm:text-base text-slate-900">
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
                          {discPct > 0 && (
                            <span className="px-2.5 py-0.5 rounded-full text-[11px] font-extrabold bg-emerald-50 text-[#14532D] border border-emerald-200">
                              🎉 {discPct}% OFF
                            </span>
                          )}
                        </div>
                        <p className="text-xs text-slate-500">
                          Qty:{" "}
                          <strong className="text-slate-800">
                            {o.quantity} {o.product_unit}
                          </strong>{" "}
                          (रु {unitPrice.toFixed(2)}/{o.product_unit || "unit"}) • Address:{" "}
                          <strong className="text-slate-800">{o.delivery_address}</strong> • Phone:{" "}
                          <strong className="text-slate-800">{o.contact_phone}</strong>
                        </p>
                        <p className="text-[11px] text-slate-400">
                          Ordered on {new Date(o.created_at).toLocaleDateString()}
                        </p>
                      </div>

                      <div className="flex flex-wrap items-center gap-3 sm:gap-4 w-full sm:w-auto justify-between sm:justify-end border-t sm:border-t-0 pt-2.5 sm:pt-0 border-slate-100">
                        <div className="text-left sm:text-right space-y-0.5">
                          <p className="text-[10px] font-bold text-slate-500">
                            Produce: रु {subtotal.toFixed(2)}{" "}
                            {discPct > 0 ? `(-${discPct}%)` : ""} •{" "}
                            <span className="text-emerald-700">
                              Delivery{distanceKm ? ` (${distanceKm} km)` : ""}:{" "}
                              {isFreeDelivery ? "FREE" : `+रु ${deliveryCharge.toFixed(2)}`}
                            </span>
                          </p>
                          <p className="text-base sm:text-lg font-black text-[#14532D]">
                            Total Payable: रु {netTotal.toFixed(2)}
                          </p>
                          {deliveryLat && deliveryLng && (
                            <a
                              href={`https://www.google.com/maps/dir/${KRISHIMART_HUB.lat},${KRISHIMART_HUB.lng}/${deliveryLat},${deliveryLng}`}
                              target="_blank"
                              rel="noreferrer"
                              className="inline-flex items-center gap-1 text-[10px] font-extrabold text-blue-700 hover:underline"
                            >
                              🗺️ View Delivery Route on Map
                            </a>
                          )}
                        </div>

                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            onClick={() => setActiveSlip({ ...o, slipType: "CUSTOMER_ORDER" })}
                            className="px-3 py-2 rounded-xl border border-emerald-300 bg-emerald-50/70 hover:bg-emerald-100 text-[#14532D] text-xs font-bold flex items-center gap-1.5 transition cursor-pointer"
                          >
                            <Receipt className="w-3.5 h-3.5" /> Receipt
                          </button>
                          {o.status === "DELIVERED" && (() => {
                            const alreadyReviewed = stories.some(
                              (s) =>
                                s.story_type === "BUYER_REVIEW" &&
                                ((s.order_id && Number(s.order_id) === Number(o.id)) ||
                                  (s.author_name === user?.full_name &&
                                    ((s.product_id && Number(s.product_id) === Number(o.product)) ||
                                      (s.product_name || s.title || "")
                                        .toLowerCase()
                                        .includes((o.product_name || "").toLowerCase()))))
                            );
                            return (
                              <button
                                type="button"
                                onClick={() => {
                                  setReviewTargetProduct({
                                    product_id: o.product,
                                    product_name: o.product_name,
                                    order_id: o.id,
                                  });
                                  setStoryForm({
                                    title: `${o.product_name} — Fresh & Delivered on Time!`,
                                    content: "",
                                    rating: 5,
                                  });
                                  setStoryModalOpen(true);
                                }}
                                className={`px-3 py-2 rounded-xl text-xs font-extrabold flex items-center gap-1.5 transition cursor-pointer ${
                                  alreadyReviewed
                                    ? "bg-amber-50 border border-amber-200 text-amber-800 hover:bg-amber-100"
                                    : "bg-amber-400 hover:bg-amber-300 text-slate-950 shadow-2xs"
                                }`}
                                title="Rate & review this delivered product"
                              >
                                <Star className="w-3.5 h-3.5 fill-current" />
                                {alreadyReviewed ? "Add / Update Review" : "Write Review"}
                              </button>
                            );
                          })()}
                          {matchedProductForReorder && Number(matchedProductForReorder.stock_quantity) > 0 && (
                            <button
                              type="button"
                              onClick={() => handleAddToBasket(matchedProductForReorder, 1)}
                              className="px-3 py-2 rounded-xl bg-slate-100 hover:bg-emerald-50 text-slate-700 hover:text-[#14532D] text-xs font-bold transition cursor-pointer"
                              title="Add this produce item to basket again"
                            >
                              ↻ Buy Again
                            </button>
                          )}
                          {o.status === "PENDING" && (
                            <button
                              onClick={() => handleCancelOrder(o.id)}
                              className="px-3 py-2 rounded-xl bg-red-50 hover:bg-red-100 text-red-700 text-xs font-bold cursor-pointer"
                            >
                              Cancel
                            </button>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Daraz-Style 3-Step Visual Order Progress Tracker */}
                    {o.status === "CANCELLED" ? (
                      <div className="bg-red-50/80 border border-red-200/80 rounded-xl px-3.5 py-2 flex items-center justify-between text-xs text-red-700 font-semibold">
                        <span>✕ This order was cancelled and stock has been restored.</span>
                        <span className="text-[11px] font-bold uppercase">Cancelled</span>
                      </div>
                    ) : (
                      <div className="bg-slate-50/90 border border-slate-200/70 rounded-xl p-3">
                        <div className="grid grid-cols-3 gap-2 relative">
                          {[
                            { step: 1, title: "1. Order Placed", sub: "Received by Hub" },
                            {
                              step: 2,
                              title: "2. Confirmed & Packing",
                              sub: discPct > 0 ? `Approved (${discPct}% OFF)` : "Quality Checked",
                            },
                            { step: 3, title: "3. Delivered", sub: "Handed to Customer" },
                          ].map((st) => {
                            const done = stepIdx >= st.step;
                            const current = stepIdx === st.step;
                            return (
                              <div key={st.step} className="flex flex-col items-center text-center">
                                <div
                                  className={`w-6 h-6 rounded-full text-[11px] font-black flex items-center justify-center transition ${
                                    done
                                      ? "bg-[#14532D] text-white shadow-2xs"
                                      : "bg-slate-200 text-slate-500"
                                  } ${current ? "ring-4 ring-emerald-200/80" : ""}`}
                                >
                                  {done ? "✓" : st.step}
                                </div>
                                <p
                                  className={`text-[11px] font-extrabold mt-1 ${
                                    done ? "text-[#14532D]" : "text-slate-400"
                                  }`}
                                >
                                  {st.title}
                                </p>
                                <p className="text-[9px] text-slate-400 hidden sm:block">{st.sub}</p>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    )}
                  </div>
                  );
                })}
              </div>
            )}
          </div>
          );
        })()}

        {/* DEDICATED WHATSAPP / MESSENGER-STYLE SUPPORT CHAT VIEW */}
        {activeTab === "chat" && user && (
          <div className="max-w-4xl mx-auto px-2 sm:px-6 py-2 sm:py-6">
            <div className="bg-white rounded-2xl sm:rounded-3xl shadow-xl border border-slate-200/90 overflow-hidden flex flex-col h-[calc(100vh-145px)] sm:h-[640px] min-h-[440px]">
              {/* Messenger Top Header */}
              <div className="px-3.5 sm:px-6 py-3 sm:py-3.5 bg-gradient-to-r from-[#0F3822] via-[#14532D] to-[#1B4332] text-white flex items-center justify-between gap-2 shrink-0 shadow-xs">
                <div className="flex items-center gap-2.5 sm:gap-3 min-w-0">
                  <button
                    type="button"
                    onClick={() => setActiveTab("home")}
                    className="md:hidden p-1.5 -ml-1 rounded-full hover:bg-white/15 text-emerald-100 cursor-pointer shrink-0"
                    title="Back to Home"
                  >
                    ←
                  </button>
                  <div className="relative shrink-0">
                    <div className="w-10 h-10 sm:w-11 sm:h-11 rounded-full bg-white/15 border-2 border-amber-400/80 flex items-center justify-center text-base sm:text-lg shadow-inner">
                      🌱
                    </div>
                    <span className="w-3 h-3 rounded-full bg-emerald-400 border-2 border-[#14532D] absolute bottom-0 right-0" />
                  </div>
                  <div className="truncate">
                    <div className="flex items-center gap-2">
                      <h3 className="font-extrabold text-xs sm:text-base leading-tight truncate">
                        KrishiMart Official Hub
                      </h3>
                      <span className="hidden sm:inline-block px-2 py-0.5 rounded-full bg-emerald-500/25 border border-emerald-300/30 text-amber-300 text-[10px] font-black">
                        Verified Support
                      </span>
                    </div>
                    <p className="text-[10px] sm:text-[11px] text-emerald-200 flex items-center gap-1.5 mt-0.5 truncate">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse shrink-0" />
                      <span className="truncate">Online • Direct Messenger ({user.full_name})</span>
                    </p>
                  </div>
                </div>

                {messages.length > 0 && (
                  <button
                    type="button"
                    onClick={handleClearUserChatForMe}
                    className="px-2.5 sm:px-3 py-1.5 rounded-xl bg-white/10 hover:bg-white/20 text-emerald-100 text-[11px] sm:text-xs font-bold flex items-center gap-1.5 transition cursor-pointer shrink-0"
                    title="Clear conversation from your screen"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    <span className="hidden sm:inline">Clear for Me</span>
                  </button>
                )}
              </div>

              {/* WhatsApp / Messenger Conversation Stream */}
              <div
                ref={chatTabScrollRef}
                className="flex-1 min-h-0 p-3 sm:p-5 overflow-y-auto space-y-2.5 bg-[#EFEAE2]"
              >
                <div className="text-center pb-1">
                  <span className="inline-block px-3 py-1 rounded-xl bg-[#FFF8C5] border border-amber-200/80 text-[10px] font-bold text-slate-700 shadow-2xs">
                    🔒 Messages are end-to-end verified with KrishiMart Support Hub
                  </span>
                </div>

                {messages.length === 0 ? (
                  <div className="bg-white/95 rounded-3xl p-6 sm:p-8 text-center max-w-md mx-auto my-6 border border-slate-200/80 shadow-xs space-y-2.5">
                    <div className="w-12 h-12 rounded-2xl bg-emerald-50 text-[#14532D] flex items-center justify-center mx-auto">
                      <MessageCircle className="w-6 h-6" />
                    </div>
                    <p className="font-extrabold text-sm text-slate-800">
                      Namaste {user.full_name}! 👋
                    </p>
                    <p className="text-xs text-slate-500 leading-relaxed">
                      Send a message or tap a quick topic below to chat directly with our Admin team
                      about orders, wholesale rates, or delivery.
                    </p>
                  </div>
                ) : (
                  messages.map((m, idx) => {
                    const isUnsent =
                      Boolean(m.is_unsent) || m.message === "🚫 This message was unsent";
                    const fromAdmin = Boolean(m.is_from_admin || m.is_admin_reply);
                    const isSentByMe = !fromAdmin;
                    const msgDateStr = new Date(m.created_at).toLocaleDateString([], {
                      month: "short",
                      day: "numeric",
                      year: "numeric",
                    });
                    const prevDateStr =
                      idx > 0
                        ? new Date(messages[idx - 1].created_at).toLocaleDateString([], {
                            month: "short",
                            day: "numeric",
                            year: "numeric",
                          })
                        : null;
                    const showDateChip = idx === 0 || msgDateStr !== prevDateStr;
                    const displayText = isUnsent
                      ? isSentByMe
                        ? "🚫 You unsent a message"
                        : "🚫 KrishiMart Admin unsent a message"
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
                            fromAdmin ? "justify-start" : "justify-end"
                          }`}
                        >
                          {/* Admin Avatar on Left */}
                          {fromAdmin && (
                            <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-full bg-[#14532D] text-amber-300 font-black text-xs flex items-center justify-center shrink-0 shadow-xs">
                              🌱
                            </div>
                          )}

                          {/* Delete / Unsend Action Button on Left of User's Outgoing Bubble */}
                          {isSentByMe && (
                            <button
                              type="button"
                              onClick={() => setChatActionMsg(m)}
                              className="opacity-85 sm:opacity-0 group-hover:opacity-100 p-1.5 rounded-full bg-white/90 hover:bg-red-50 text-slate-500 hover:text-red-600 border border-slate-200 shadow-2xs transition cursor-pointer mb-1 shrink-0"
                              title="Unsend or Delete Options"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          )}

                          {/* WhatsApp / Messenger Bubble */}
                          <div
                            className={`max-w-[78%] sm:max-w-md px-3.5 py-2 rounded-2xl text-xs sm:text-sm shadow-xs transition ${
                              isUnsent
                                ? "bg-white/80 border border-dashed border-slate-300 text-slate-400 italic"
                                : fromAdmin
                                ? "bg-white text-slate-900 rounded-bl-xs border border-slate-100"
                                : "bg-[#14532D] text-white rounded-br-xs"
                            }`}
                          >
                            {fromAdmin && !isUnsent && (
                              <p className="text-[10px] font-extrabold text-emerald-700 mb-0.5">
                                KrishiMart Admin
                              </p>
                            )}
                            <p className="break-words leading-relaxed">{displayText}</p>
                            <div
                              className={`flex items-center justify-end gap-1 text-[10px] mt-1 ${
                                isUnsent
                                  ? "text-slate-400"
                                  : fromAdmin
                                  ? "text-slate-400"
                                  : "text-emerald-200"
                              }`}
                            >
                              <span>
                                {new Date(m.created_at).toLocaleTimeString([], {
                                  hour: "2-digit",
                                  minute: "2-digit",
                                })}
                              </span>
                              {isSentByMe && !isUnsent && (
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

                          {/* Delete for Me Button on Right of Admin's Incoming Bubble */}
                          {fromAdmin && (
                            <button
                              type="button"
                              onClick={() => setChatActionMsg(m)}
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

              {/* Messenger Quick-Reply Suggestion Chips */}
              <div className="px-3 py-2 bg-white border-t border-slate-200/80 flex items-center gap-1.5 overflow-x-auto no-scrollbar shrink-0">
                {(isFarmer
                  ? [
                      "🌾 I submitted a new harvest batch",
                      "💳 When will my farmer payout be settled?",
                      "🚚 Ready for farm pickup today",
                    ]
                  : [
                      "📦 What is my order delivery status?",
                      "💰 Can I get a discount on my order?",
                      "🥬 Are today's vegetables fresh?",
                    ]
                ).map((chip) => (
                  <button
                    key={chip}
                    type="button"
                    onClick={() => setChatInput(chip)}
                    className="px-3 py-1 rounded-full bg-slate-100 hover:bg-emerald-50 border border-slate-200 hover:border-emerald-300 text-slate-700 hover:text-[#14532D] text-[11px] font-bold whitespace-nowrap transition cursor-pointer shrink-0"
                  >
                    {chip}
                  </button>
                ))}
              </div>

              {/* Messenger Input Composer */}
              <form
                onSubmit={handleSendUserMessage}
                className="p-2.5 sm:p-3.5 border-t border-slate-200 bg-[#F0F2F5] flex items-center gap-2 shrink-0"
              >
                <input
                  type="text"
                  placeholder="Type a message..."
                  value={chatInput}
                  onChange={(e) => setChatInput(e.target.value)}
                  className="flex-1 px-4 py-2.5 rounded-full bg-white border border-slate-200 focus:border-[#14532D] text-xs sm:text-sm outline-none transition shadow-2xs"
                />
                <button
                  type="submit"
                  disabled={!chatInput.trim()}
                  className="px-4 sm:px-5 py-2.5 bg-[#14532D] hover:bg-[#1B4332] disabled:bg-slate-300 text-white font-extrabold rounded-full text-xs sm:text-sm flex items-center gap-1.5 shadow-sm transition cursor-pointer shrink-0"
                >
                  <Send className="w-4 h-4" />
                  <span className="hidden sm:inline">Send</span>
                </button>
              </form>
            </div>
          </div>
        )}

        {/* FULL-PAGE DARAZ-STYLE PRODUCT DETAIL VIEW (DESKTOP & MOBILE) */}
        {quickViewProduct && activeTab !== "admin" && (() => {
          const p = quickViewProduct;
          const imgUrl = getProductImage(p);
          const stockNum = Number(p.stock_quantity || 0);
          const isLowStock = stockNum > 0 && stockNum <= 35;
          const unitPrice = Number(p.price || 0);
          const actualOriginalPrice = Number(p.actual_price || 0);
          const hasAdminDiscount = actualOriginalPrice > unitPrice;
          const savingsPct = hasAdminDiscount
            ? Math.max(1, Math.round(((actualOriginalPrice - unitPrice) / actualOriginalPrice) * 100))
            : 0;

          // Strictly get reviews for THIS specific product
          const productSpecificReviews = getReviewsForProduct(p);
          const productReviewCount = productSpecificReviews.length;
          const avgRating =
            productReviewCount > 0
              ? (
                  productSpecificReviews.reduce((sum, r) => sum + Number(r.rating || 5), 0) /
                  productReviewCount
                ).toFixed(1)
              : "0.0";

          // Check if current logged-in customer has a DELIVERED order for this product
          const deliveredOrderForProduct = (Array.isArray(myOrders) ? myOrders : []).find(
            (o) =>
              o.status === "DELIVERED" &&
              (Number(o.product) === Number(p.id) ||
                (o.product_name || "").trim().toLowerCase() ===
                  (p.name || "").trim().toLowerCase())
          );
          const basketItem = basket.find((item) => item.id === p.id);
          const qtyInBasket = basketItem ? basketItem.qty : 0;

          // Extract grower name if present in description like "(Grown by: Name)"
          const growerMatch = (p.description || "").match(/\(Grown by:\s*([^)]+)\)/i);
          const growerName = growerMatch ? growerMatch[1].trim() : "KrishiMart Verified Cooperative";
          const cleanDescription = (p.description || "").replace(/\s*\(Grown by:[^)]+\)/i, "").trim();

          const relatedProducts = (Array.isArray(dbProducts) ? dbProducts : [])
            .filter((item) => item.id !== p.id)
            .sort((a, b) => (a.category === p.category ? -1 : b.category === p.category ? 1 : 0))
            .slice(0, 6);

          return (
            <div className="max-w-7xl mx-auto px-3 sm:px-8 py-4 sm:py-8 space-y-6 pb-28 md:pb-12">
              {/* Top Breadcrumb & Back Navigation Bar */}
              <div className="flex flex-wrap items-center justify-between gap-2 bg-white px-3.5 py-2.5 rounded-2xl border border-slate-200/90 shadow-2xs">
                <div className="flex items-center gap-2 text-xs text-slate-500 overflow-x-auto no-scrollbar">
                  <button
                    type="button"
                    onClick={() => setQuickViewProduct(null)}
                    className="px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-emerald-50 text-slate-800 hover:text-[#14532D] font-extrabold text-xs flex items-center gap-1.5 transition cursor-pointer shrink-0"
                  >
                    ← {tr("Back to Shop", "पछाडि जानुहोस्")}
                  </button>
                  <span className="text-slate-300">/</span>
                  <button
                    type="button"
                    onClick={() => {
                      setSelectedCategory(p.category || "ALL");
                      setQuickViewProduct(null);
                      setActiveTab("marketplace");
                    }}
                    className="hover:text-[#14532D] font-semibold uppercase text-[11px] cursor-pointer shrink-0"
                  >
                    {p.category}
                  </button>
                  <span className="text-slate-300">/</span>
                  <span className="font-bold text-slate-800 truncate max-w-[160px] sm:max-w-xs">
                    {p.name}
                  </span>
                </div>

                <div className="flex items-center gap-2">
                  <span className="px-2.5 py-1 rounded-full bg-emerald-50 text-[#14532D] border border-emerald-200 text-[10px] font-extrabold">
                    Batch #KM-PRD-{p.id}
                  </span>
                </div>
              </div>

              {/* Main Daraz 12-Column Product Hero Container */}
              <div className="bg-white rounded-3xl border border-slate-200/90 shadow-xs p-3.5 sm:p-6 lg:p-8 grid grid-cols-1 lg:grid-cols-12 gap-6 lg:gap-8">
                {/* Left 5 Columns: High-Res Product Image & Trust Highlights */}
                <div className="lg:col-span-5 space-y-3.5">
                  <div className="relative h-72 sm:h-96 rounded-2xl overflow-hidden bg-slate-100 border border-slate-200/80 group">
                    <img
                      src={imgUrl}
                      alt={p.name}
                      onError={(e) => {
                        e.currentTarget.onerror = null;
                        e.currentTarget.src = getFallbackProductImage(p);
                      }}
                      className="w-full h-full object-cover group-hover:scale-105 transition duration-500"
                    />
                    <span className="absolute top-3 left-3 px-3 py-1 rounded-full bg-white/95 text-slate-900 text-xs font-extrabold flex items-center gap-1.5 shadow-sm">
                      <MapPin className="w-3.5 h-3.5 text-emerald-700" />
                      {p.origin_location || "Nepal Farm"}
                    </span>
                    <span
                      className={`absolute top-3 right-3 px-3 py-1 rounded-full text-white text-xs font-extrabold shadow-sm ${
                        stockNum <= 0
                          ? "bg-red-600"
                          : isLowStock
                          ? "bg-amber-600"
                          : "bg-emerald-700"
                      }`}
                    >
                      {stockNum > 0
                        ? isLowStock
                          ? `🔥 Low Stock: ${p.stock_quantity} ${p.unit} Left`
                          : `✓ In Stock: ${p.stock_quantity} ${p.unit}`
                        : "Out of Stock"}
                    </span>
                    <div className="absolute bottom-3 inset-x-3 flex items-center justify-between gap-2">
                      <span className="px-3 py-1 rounded-xl bg-slate-950/75 backdrop-blur-xs text-amber-300 text-[11px] font-bold">
                        🌾 100% Direct Nepali Farm Harvest
                      </span>
                      {qtyInBasket > 0 && (
                        <span className="px-3 py-1 rounded-xl bg-[#14532D] text-white text-[11px] font-extrabold shadow-sm">
                          ✓ {qtyInBasket} {p.unit} in Basket
                        </span>
                      )}
                    </div>
                  </div>

                  {/* 3 Quick Farm-to-Kitchen Trust Badges Below Image */}
                  <div className="grid grid-cols-3 gap-2 text-center">
                    <div className="bg-emerald-50/70 border border-emerald-200/70 rounded-xl p-2.5">
                      <p className="text-xs font-black text-[#14532D]">100% Fresh</p>
                      <p className="text-[10px] text-slate-500">Morning Harvest</p>
                    </div>
                    <div className="bg-amber-50/70 border border-amber-200/70 rounded-xl p-2.5">
                      <p className="text-xs font-black text-amber-800">0% Middlemen</p>
                      <p className="text-[10px] text-slate-500">Direct Farm Price</p>
                    </div>
                    <div className="bg-blue-50/70 border border-blue-200/70 rounded-xl p-2.5">
                      <p className="text-xs font-black text-blue-900">Lab & Hub Checked</p>
                      <p className="text-[10px] text-slate-500">Quality Sorted</p>
                    </div>
                  </div>
                </div>

                {/* Middle 4 Columns: Product Title, Rating, Daraz Price Card, Bulk Presets & Actions */}
                <div className="lg:col-span-4 flex flex-col justify-between space-y-5">
                  <div className="space-y-3.5">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="px-2.5 py-0.5 rounded-md bg-emerald-100 text-[#14532D] text-[11px] font-extrabold uppercase">
                        {p.category}
                      </span>
                      <button
                        type="button"
                        onClick={() => {
                          setDetailTab("reviews");
                          setTimeout(() => {
                            document
                              .getElementById("daraz-product-reviews-section")
                              ?.scrollIntoView({ behavior: "smooth", block: "start" });
                          }, 60);
                        }}
                        className="flex items-center gap-1.5 px-2.5 py-0.5 rounded-md bg-amber-50 hover:bg-amber-100 border border-amber-200 text-amber-600 text-xs font-bold transition cursor-pointer"
                        title="Click to view verified customer reviews for this product"
                      >
                        <Star className="w-3.5 h-3.5 fill-amber-400 text-amber-400" />
                        <span className="text-slate-900 font-extrabold">
                          {productReviewCount > 0 ? avgRating : "New"}
                        </span>
                        <span className="text-slate-600 font-semibold underline decoration-dotted">
                          ({productReviewCount}{" "}
                          {productReviewCount === 1 ? "Customer Review" : "Customer Reviews"})
                        </span>
                      </button>
                    </div>

                    <h1 className="text-xl sm:text-2xl font-black text-slate-900 leading-snug">
                      {p.name}
                    </h1>

                    <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-slate-500">
                      <span>
                        Grower: <strong className="text-emerald-800">{growerName}</strong>
                      </span>
                      <span>•</span>
                      <span>
                        Origin: <strong className="text-slate-800">{p.origin_location || "Nepal"}</strong>
                      </span>
                    </div>

                    {/* Daraz-Style Highlighted Selling Price & Admin Actual Price Comparison Box */}
                    <div className="bg-gradient-to-r from-emerald-50/90 via-emerald-50/40 to-amber-50/40 border border-emerald-200/80 rounded-2xl p-4 space-y-1.5">
                      <div className="flex items-baseline justify-between gap-2">
                        <div>
                          <span className="text-2xl sm:text-3xl font-black text-[#14532D]">
                            रु {unitPrice.toFixed(2)}
                          </span>
                          <span className="text-xs sm:text-sm font-bold text-slate-600">
                            {" "}
                            / {p.unit}
                          </span>
                        </div>
                        {hasAdminDiscount ? (
                          <span className="px-2.5 py-1 rounded-full bg-amber-400 text-slate-950 text-[10px] font-black uppercase">
                            SAVE {savingsPct}% OFF
                          </span>
                        ) : (
                          <span className="px-2.5 py-1 rounded-full bg-emerald-100 text-[#14532D] text-[10px] font-black uppercase">
                            ✓ Direct Farm Rate
                          </span>
                        )}
                      </div>
                      {hasAdminDiscount ? (
                        <div className="flex items-center gap-2 text-xs text-slate-500">
                          <span>Actual Price:</span>
                          <span className="line-through text-slate-400 font-semibold">
                            रु {actualOriginalPrice.toFixed(2)} / {p.unit}
                          </span>
                          <span className="text-emerald-700 font-bold">
                            • Save रु {(actualOriginalPrice - unitPrice).toFixed(2)}/{p.unit}
                          </span>
                        </div>
                      ) : (
                        <p className="text-[11px] text-emerald-800 font-semibold">
                          Transparent farm-to-kitchen selling price set by KrishiMart Hub
                        </p>
                      )}
                    </div>

                    {/* Clean Product Summary */}
                    <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">
                      {cleanDescription ||
                        "Freshly harvested, hand-sorted quality produce sourced directly from verified Nepali farmers."}
                    </p>

                    {/* Daraz-Style Quantity Selector + Quick Weight Presets */}
                    <div className="pt-1 space-y-2.5 border-t border-slate-100">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-extrabold text-slate-700">
                          Select Quantity ({p.unit}):
                        </span>
                        <span className="text-xs font-bold text-emerald-700">
                          Subtotal: रु {(unitPrice * quickViewQty).toFixed(2)}
                        </span>
                      </div>

                      <div className="flex flex-wrap items-center gap-3">
                        <div className="flex items-center bg-slate-100 rounded-xl p-1 border border-slate-200">
                          <button
                            type="button"
                            onClick={() => setQuickViewQty(Math.max(1, quickViewQty - 1))}
                            className="w-8 h-8 rounded-lg bg-white hover:bg-slate-50 text-slate-800 font-black flex items-center justify-center shadow-2xs cursor-pointer"
                          >
                            <Minus className="w-3.5 h-3.5" />
                          </button>
                          <span className="w-12 text-center font-black text-sm text-slate-900">
                            {quickViewQty}
                          </span>
                          <button
                            type="button"
                            onClick={() =>
                              setQuickViewQty(
                                stockNum > 0 ? Math.min(stockNum, quickViewQty + 1) : quickViewQty + 1
                              )
                            }
                            className="w-8 h-8 rounded-lg bg-[#14532D] hover:bg-[#1B4332] text-white font-black flex items-center justify-center shadow-2xs cursor-pointer"
                          >
                            <Plus className="w-3.5 h-3.5" />
                          </button>
                        </div>

                        {/* 1-Tap Quick Bulk Quantity Pills */}
                        <div className="flex items-center gap-1.5">
                          {[1, 2, 5, 10]
                            .filter((q) => stockNum <= 0 || q <= stockNum)
                            .map((preset) => (
                              <button
                                key={preset}
                                type="button"
                                onClick={() => setQuickViewQty(preset)}
                                className={`px-2.5 py-1.5 rounded-lg text-[11px] font-extrabold border transition cursor-pointer ${
                                  quickViewQty === preset
                                    ? "bg-emerald-50 border-[#14532D] text-[#14532D]"
                                    : "bg-white border-slate-200 text-slate-600 hover:bg-slate-50"
                                }`}
                              >
                                {preset} {p.unit}
                              </button>
                            ))}
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Desktop & Tablet Primary CTA Buttons (Buy Now + Add to Basket) */}
                  <div className="pt-3 border-t border-slate-100 space-y-2.5">
                    <div className="grid grid-cols-2 gap-2.5">
                      <button
                        type="button"
                        disabled={stockNum <= 0}
                        onClick={() => {
                          handleAddToBasket(p, quickViewQty);
                          setBasketDrawerOpen(true);
                        }}
                        className="py-3 px-4 rounded-xl bg-amber-400 hover:bg-amber-300 disabled:bg-slate-200 text-slate-950 font-black text-xs sm:text-sm flex items-center justify-center gap-2 shadow-sm transition cursor-pointer"
                      >
                        ⚡ {tr("Buy Now", "तुरुन्तै किन्नुहोस्")}
                      </button>
                      <button
                        type="button"
                        disabled={stockNum <= 0}
                        onClick={() => handleAddToBasket(p, quickViewQty)}
                        className="py-3 px-4 rounded-xl bg-[#14532D] hover:bg-[#1B4332] disabled:bg-slate-300 text-white font-black text-xs sm:text-sm flex items-center justify-center gap-2 shadow-sm transition cursor-pointer"
                      >
                        <ShoppingBag className="w-4 h-4" />
                        {stockNum > 0
                          ? tr("Add to Basket", "झोलामा राख्नुहोस्")
                          : "Out of Stock"}
                      </button>
                    </div>

                    {!isAdmin && (
                      <button
                        type="button"
                        onClick={() => requireAuth(() => setChatDrawerOpen(true))}
                        className="w-full py-2.5 px-4 rounded-xl border border-slate-200 hover:border-[#14532D] text-slate-700 hover:text-[#14532D] text-xs font-bold flex items-center justify-center gap-2 transition cursor-pointer"
                      >
                        <MessageCircle className="w-4 h-4 text-emerald-700" />
                        Ask KrishiMart Admin About Bulk Rate or Freshness
                      </button>
                    )}
                  </div>
                </div>

                {/* Right 3 Columns: Daraz-Style Delivery, Payment & Seller Assurance Sidebar */}
                <div className="lg:col-span-3 bg-slate-50/90 rounded-2xl p-4 sm:p-5 border border-slate-200/80 space-y-4 h-fit">
                  <div className="space-y-2.5 border-b border-slate-200/80 pb-3.5">
                    <p className="text-[11px] font-extrabold uppercase tracking-wider text-slate-400">
                      Delivery & Dispatch
                    </p>
                    <div className="flex items-start gap-2.5 text-xs">
                      <MapPin className="w-4 h-4 text-[#14532D] shrink-0 mt-0.5" />
                      <div>
                        <p className="font-bold text-slate-800">
                          {user?.location || "Dhangadhi Hub & Kathmandu Valley"}
                        </p>
                        <p className="text-[11px] text-slate-500">
                          Direct cold-chain & hub dispatch to your doorstep
                        </p>
                      </div>
                    </div>
                    <div className="flex items-start gap-2.5 text-xs">
                      <PackageCheck className="w-4 h-4 text-emerald-700 shrink-0 mt-0.5" />
                      <div>
                        <p className="font-bold text-slate-800">Same-Day / Next-Morning Delivery</p>
                        <p className="text-[11px] text-slate-500">
                          Sorted & weighed at KrishiMart Collection Hub
                        </p>
                      </div>
                    </div>
                  </div>

                  <div className="space-y-2.5 border-b border-slate-200/80 pb-3.5">
                    <p className="text-[11px] font-extrabold uppercase tracking-wider text-slate-400">
                      Payment & Receipt
                    </p>
                    <div className="flex flex-wrap gap-1.5">
                      <span className="px-2.5 py-1 rounded-lg bg-white border border-slate-200 text-[11px] font-bold text-slate-700">
                        💵 Cash on Delivery
                      </span>
                      <span className="px-2.5 py-1 rounded-lg bg-emerald-50 border border-emerald-200 text-[11px] font-bold text-emerald-800">
                        🟢 eSewa
                      </span>
                      <span className="px-2.5 py-1 rounded-lg bg-purple-50 border border-purple-200 text-[11px] font-bold text-purple-800">
                        🟣 Khalti
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-500 flex items-center gap-1.5 pt-0.5">
                      <Receipt className="w-3.5 h-3.5 text-[#14532D] shrink-0" />
                      Includes 1/4 A4 Printable & PNG Digital Receipt
                    </p>
                  </div>

                  <div className="space-y-2">
                    <p className="text-[11px] font-extrabold uppercase tracking-wider text-slate-400">
                      Verified Source
                    </p>
                    <div className="bg-white rounded-xl p-3 border border-slate-200/80 space-y-1.5">
                      <div className="flex items-center gap-2">
                        <div className="w-8 h-8 rounded-lg bg-[#14532D] text-amber-300 font-black text-xs flex items-center justify-center">
                          KM
                        </div>
                        <div>
                          <p className="text-xs font-extrabold text-slate-900">{growerName}</p>
                          <p className="text-[10px] text-emerald-700 font-bold">
                            ✓ KrishiMart Quality Verified
                          </p>
                        </div>
                      </div>
                      <div className="grid grid-cols-2 gap-2 pt-2 border-t border-slate-100 text-center">
                        <div>
                          <p className="text-[10px] text-slate-400">Farm Rating</p>
                          <p className="text-xs font-black text-slate-800">98% Positive</p>
                        </div>
                        <div>
                          <p className="text-[10px] text-slate-400">Farmer Payout</p>
                          <p className="text-xs font-black text-[#14532D]">100% Direct</p>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Daraz-Style Detailed Specifications, Buyer Reviews & Delivery Tabs */}
              <div
                id="daraz-product-reviews-section"
                className="bg-white rounded-3xl border border-slate-200/90 shadow-2xs overflow-hidden scroll-mt-24"
              >
                <div className="flex border-b border-slate-200 overflow-x-auto no-scrollbar bg-slate-50/70">
                  {[
                    { id: "specs", label: "📋 Product Details & Farm Specs" },
                    {
                      id: "reviews",
                      label: `⭐ Customer Reviews (${productReviewCount})`,
                    },
                    { id: "delivery", label: "🚚 Hub Quality & Delivery Info" },
                  ].map((tb) => (
                    <button
                      key={tb.id}
                      type="button"
                      onClick={() => setDetailTab(tb.id)}
                      className={`px-5 py-3.5 text-xs sm:text-sm font-extrabold whitespace-nowrap border-b-2 transition cursor-pointer ${
                        detailTab === tb.id
                          ? "border-[#14532D] text-[#14532D] bg-white"
                          : "border-transparent text-slate-500 hover:text-slate-800"
                      }`}
                    >
                      {tb.label}
                    </button>
                  ))}
                </div>

                <div className="p-4 sm:p-6">
                  {detailTab === "specs" && (
                    <div className="grid md:grid-cols-2 gap-6">
                      <div className="space-y-3">
                        <h3 className="text-sm sm:text-base font-extrabold text-slate-900">
                          About This Harvest Batch
                        </h3>
                        <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">
                          {p.description ||
                            "Sourced directly from registered Nepali farmers, inspected for freshness and grading at the KrishiMart hub."}
                        </p>
                        <div className="p-3.5 rounded-2xl bg-emerald-50/70 border border-emerald-200/80 text-xs text-emerald-950 space-y-1">
                          <p className="font-extrabold text-[#14532D]">
                            🌱 Why Buy From KrishiMart Instead of Middlemen?
                          </p>
                          <p className="text-slate-600 leading-relaxed">
                            Every order supports verified local growers in{" "}
                            <strong>{p.origin_location || "Nepal"}</strong> with transparent wholesale
                            settlements while giving your family chemical-free, farm-fresh produce.
                          </p>
                        </div>
                      </div>

                      <div className="bg-slate-50 rounded-2xl p-4 border border-slate-200/80 space-y-2 text-xs">
                        <h4 className="font-extrabold text-slate-900 mb-2">
                          Batch Specifications
                        </h4>
                        <div className="flex justify-between py-1.5 border-b border-slate-200/70">
                          <span className="text-slate-500">Batch Reference:</span>
                          <span className="font-bold text-slate-900">#KM-PRD-{p.id}</span>
                        </div>
                        <div className="flex justify-between py-1.5 border-b border-slate-200/70">
                          <span className="text-slate-500">Category:</span>
                          <span className="font-bold text-slate-900">{p.category}</span>
                        </div>
                        <div className="flex justify-between py-1.5 border-b border-slate-200/70">
                          <span className="text-slate-500">Origin Location:</span>
                          <span className="font-bold text-slate-900">
                            {p.origin_location || "Nepal Farm"}
                          </span>
                        </div>
                        <div className="flex justify-between py-1.5 border-b border-slate-200/70">
                          <span className="text-slate-500">Producer / Cooperative:</span>
                          <span className="font-bold text-emerald-800">{growerName}</span>
                        </div>
                        <div className="flex justify-between py-1.5 border-b border-slate-200/70">
                          <span className="text-slate-500">Unit Price:</span>
                          <span className="font-bold text-[#14532D]">
                            रु {unitPrice.toFixed(2)} per {p.unit}
                          </span>
                        </div>
                        <div className="flex justify-between py-1.5">
                          <span className="text-slate-500">Available Stock:</span>
                          <span className="font-bold text-slate-900">
                            {p.stock_quantity} {p.unit}
                          </span>
                        </div>
                      </div>
                    </div>
                  )}

                  {detailTab === "reviews" && (
                    <div className="space-y-6">
                      {/* Daraz-Style Rating Summary & 5-Star Progress Bars */}
                      <div className="bg-slate-50/90 rounded-2xl p-4 sm:p-6 border border-slate-200/90 grid grid-cols-1 md:grid-cols-12 gap-6 items-center">
                        {/* Left Score Box */}
                        <div className="md:col-span-4 text-center md:border-r border-slate-200/80 md:pr-4 space-y-1.5">
                          <div className="flex items-baseline justify-center gap-1">
                            <span className="text-3xl sm:text-4xl font-black text-slate-900">
                              {productReviewCount > 0 ? avgRating : "0.0"}
                            </span>
                            <span className="text-base font-bold text-slate-400">/ 5.0</span>
                          </div>
                          <div className="flex items-center justify-center gap-1 text-amber-400">
                            {[1, 2, 3, 4, 5].map((st) => (
                              <Star
                                key={st}
                                className={`w-4 h-4 ${
                                  productReviewCount > 0 && st <= Math.round(Number(avgRating))
                                    ? "fill-amber-400 text-amber-400"
                                    : "text-slate-300"
                                }`}
                              />
                            ))}
                          </div>
                          <p className="text-xs font-bold text-slate-600">
                            {productReviewCount}{" "}
                            {productReviewCount === 1
                              ? "Verified Purchase Rating"
                              : "Verified Purchase Ratings"}
                          </p>
                        </div>

                        {/* Middle 5-Star to 1-Star Breakdown Bars */}
                        <div className="md:col-span-5 space-y-1.5">
                          {[5, 4, 3, 2, 1].map((starVal) => {
                            const countForStar = productSpecificReviews.filter(
                              (r) => Number(r.rating || 5) === starVal
                            ).length;
                            const pct =
                              productReviewCount > 0
                                ? Math.round((countForStar / productReviewCount) * 100)
                                : 0;
                            return (
                              <div key={starVal} className="flex items-center gap-2.5 text-xs">
                                <span className="w-12 font-bold text-slate-700 flex items-center gap-1 shrink-0">
                                  {starVal} <Star className="w-3 h-3 fill-amber-400 text-amber-400" />
                                </span>
                                <div className="flex-1 h-2.5 rounded-full bg-slate-200 overflow-hidden">
                                  <div
                                    className="h-full bg-amber-400 rounded-full transition-all duration-300"
                                    style={{ width: `${pct}%` }}
                                  />
                                </div>
                                <span className="w-8 text-right font-bold text-slate-500 text-[11px]">
                                  {countForStar}
                                </span>
                              </div>
                            );
                          })}
                        </div>

                        {/* Right Verified Delivered Buyer Action Box */}
                        <div className="md:col-span-3 flex flex-col items-center md:items-end justify-center text-center md:text-right space-y-2">
                          {deliveredOrderForProduct ? (
                            <>
                              <span className="px-2.5 py-1 rounded-full bg-emerald-100 text-[#14532D] text-[10px] font-extrabold">
                                ✓ Verified Delivered Buyer
                              </span>
                              <button
                                type="button"
                                onClick={() => {
                                  setReviewTargetProduct({
                                    product_id: p.id,
                                    product_name: p.name,
                                    order_id: deliveredOrderForProduct.id,
                                  });
                                  setStoryForm({
                                    title: `${p.name} — Great Quality!`,
                                    content: "",
                                    rating: 5,
                                  });
                                  setStoryModalOpen(true);
                                }}
                                className="w-full py-2.5 px-4 rounded-xl bg-amber-400 hover:bg-amber-300 text-slate-950 text-xs font-black flex items-center justify-center gap-1.5 shadow-2xs transition cursor-pointer"
                              >
                                <Star className="w-3.5 h-3.5 fill-current" />
                                Write Product Review
                              </button>
                            </>
                          ) : (
                            <div className="bg-white rounded-xl p-3 border border-slate-200/90 text-[11px] text-slate-600 space-y-1.5 w-full">
                              <p className="font-extrabold text-slate-800 flex items-center justify-center md:justify-end gap-1">
                                <ShieldCheck className="w-3.5 h-3.5 text-emerald-700 shrink-0" />
                                100% Verified Reviews
                              </p>
                              <p className="text-[10px] text-slate-500 leading-snug">
                                Only customers who have received a{" "}
                                <strong className="text-emerald-800">DELIVERED</strong> order for{" "}
                                <strong>{p.name}</strong> can add a review.
                              </p>
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Daraz-Style Customer Reviews Feed */}
                      {productSpecificReviews.length === 0 ? (
                        <div className="p-8 text-center bg-slate-50/70 rounded-2xl border border-dashed border-slate-200 space-y-2">
                          <Star className="w-8 h-8 text-amber-300 mx-auto" />
                          <p className="text-xs sm:text-sm font-extrabold text-slate-700">
                            No verified customer reviews for {p.name} yet
                          </p>
                          <p className="text-[11px] text-slate-500 max-w-md mx-auto">
                            Once a customer orders {p.name} and their order is marked as{" "}
                            <strong>DELIVERED</strong>, they can rate and review it from{" "}
                            <strong>My Orders</strong> or right here!
                          </p>
                        </div>
                      ) : (
                        <div className="space-y-3">
                          {productSpecificReviews.map((br) => (
                            <div
                              key={br.id}
                              className="bg-white rounded-2xl p-4 sm:p-5 border border-slate-200/90 shadow-2xs space-y-2.5"
                            >
                              <div className="flex flex-wrap items-center justify-between gap-2">
                                <div className="flex items-center gap-2.5">
                                  <div className="w-9 h-9 rounded-full bg-[#14532D] text-white font-black text-xs flex items-center justify-center overflow-hidden">
                                    {br.author_avatar ? (
                                      <img
                                        src={
                                          resolveMediaUrl(br.author_avatar, br.author)
                                        }
                                        alt={br.author_name}
                                        className="w-full h-full object-cover"
                                      />
                                    ) : (
                                      <span>{(br.author_name || "U").charAt(0).toUpperCase()}</span>
                                    )}
                                  </div>
                                  <div>
                                    <div className="flex items-center gap-2">
                                      <span className="font-extrabold text-xs sm:text-sm text-slate-900">
                                        {br.author_name}
                                      </span>
                                      <span className="px-2 py-0.5 rounded-full bg-emerald-50 border border-emerald-200 text-[#14532D] text-[10px] font-extrabold flex items-center gap-1">
                                        ✓ Verified Purchase
                                      </span>
                                    </div>
                                    <p className="text-[10px] text-slate-400">
                                      Reviewed on{" "}
                                      {new Date(br.created_at || Date.now()).toLocaleDateString()}
                                    </p>
                                  </div>
                                </div>

                                <div className="flex items-center gap-0.5 text-amber-400">
                                  {[1, 2, 3, 4, 5].map((st) => (
                                    <Star
                                      key={st}
                                      className={`w-3.5 h-3.5 ${
                                        st <= Number(br.rating || 5)
                                          ? "fill-amber-400 text-amber-400"
                                          : "text-slate-200"
                                      }`}
                                    />
                                  ))}
                                </div>
                              </div>

                              {br.title && (
                                <p className="font-extrabold text-xs sm:text-sm text-slate-800">
                                  {br.title}
                                </p>
                              )}
                              <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">
                                {br.content}
                              </p>
                              {br.image && (
                                <div className="pt-1">
                                  <img
                                    src={
                                      resolveMediaUrl(br.image)
                                    }
                                    alt={br.title || "Customer review photo"}
                                    className="w-28 h-28 sm:w-36 sm:h-36 object-cover rounded-2xl border border-slate-200 shadow-2xs"
                                  />
                                </div>
                              )}
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )}

                  {detailTab === "delivery" && (
                    <div className="grid sm:grid-cols-3 gap-4 text-xs">
                      <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-1.5">
                        <p className="font-extrabold text-slate-900 text-sm">
                          1. Direct Farm Collection
                        </p>
                        <p className="text-slate-600 leading-relaxed">
                          Harvested in the morning and weighed digitally at our collection center with
                          zero middleman handling.
                        </p>
                      </div>
                      <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-1.5">
                        <p className="font-extrabold text-slate-900 text-sm">
                          2. Quality Grading & Packing
                        </p>
                        <p className="text-slate-600 leading-relaxed">
                          Packed in breathable, food-safe crates so your vegetables and fruits arrive
                          crisp and unbruised.
                        </p>
                      </div>
                      <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-1.5">
                        <p className="font-extrabold text-slate-900 text-sm">
                          3. Instant Receipt & Email Tracking
                        </p>
                        <p className="text-slate-600 leading-relaxed">
                          Receive automated HTML email updates on Confirmation, Discount, and Delivery
                          plus a 1/4 A4 printable slip.
                        </p>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Daraz-Style "Similar Fresh Harvests You May Like" Section (2-Col Mobile Grid) */}
              {relatedProducts.length > 0 && (
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <span className="text-[10px] font-extrabold uppercase tracking-wider text-emerald-700">
                        MORE FROM NEPALI FARMS
                      </span>
                      <h3 className="text-lg sm:text-xl font-black text-slate-900">
                        Similar Fresh Harvests You May Like
                      </h3>
                    </div>
                    <button
                      type="button"
                      onClick={() => setQuickViewProduct(null)}
                      className="text-xs font-bold text-[#14532D] hover:underline cursor-pointer"
                    >
                      View All →
                    </button>
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2.5 sm:gap-4">
                    {relatedProducts.map((rp) => (
                      <div
                        key={rp.id}
                        onClick={() => {
                          setQuickViewProduct(rp);
                          setQuickViewQty(1);
                        }}
                        className="bg-white rounded-2xl p-2.5 border border-slate-200/90 shadow-2xs hover:shadow-md transition cursor-pointer flex flex-col justify-between group"
                      >
                        <div>
                          <div className="h-28 sm:h-32 rounded-xl overflow-hidden bg-slate-100 mb-2">
                            <img
                              src={getProductImage(rp)}
                              alt={rp.name}
                              loading="lazy"
                              onError={(e) => {
                                e.currentTarget.onerror = null;
                                e.currentTarget.src = getFallbackProductImage(rp);
                              }}
                              className="w-full h-full object-cover group-hover:scale-105 transition duration-300"
                            />
                          </div>
                          <p className="text-[10px] font-bold text-emerald-700 truncate">
                            📍 {rp.origin_location || "Nepal"}
                          </p>
                          <h4 className="font-extrabold text-xs text-slate-900 line-clamp-1 mt-0.5 group-hover:text-[#14532D]">
                            {rp.name}
                          </h4>
                        </div>
                        <div className="pt-2 mt-1 border-t border-slate-100 flex items-baseline justify-between">
                          <span className="text-xs sm:text-sm font-black text-[#14532D]">
                            रु {rp.price}
                          </span>
                          <span className="text-[10px] text-slate-400">/{rp.unit}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* DARAZ-STYLE STICKY MOBILE BOTTOM ACTION BAR (FOR PRODUCT DETAIL VIEW ON PHONES) */}
              <div className="md:hidden fixed bottom-0 inset-x-0 z-50 bg-white border-t border-slate-200 px-3 py-2 flex items-center gap-2 shadow-[0_-6px_24px_rgba(0,0,0,0.1)]">
                <button
                  type="button"
                  onClick={() => setQuickViewProduct(null)}
                  className="flex flex-col items-center justify-center px-2 py-1 text-slate-500 hover:text-[#14532D] text-[10px] font-bold cursor-pointer"
                >
                  <Home className="w-4 h-4" />
                  <span>Shop</span>
                </button>
                {!isAdmin && (
                  <button
                    type="button"
                    onClick={() => requireAuth(() => setChatDrawerOpen(true))}
                    className="flex flex-col items-center justify-center px-2 py-1 text-slate-500 hover:text-[#14532D] text-[10px] font-bold cursor-pointer"
                  >
                    <MessageCircle className="w-4 h-4" />
                    <span>Chat</span>
                  </button>
                )}
                <button
                  type="button"
                  disabled={stockNum <= 0}
                  onClick={() => handleAddToBasket(p, quickViewQty)}
                  className="flex-1 py-2.5 px-3 rounded-xl bg-emerald-50 border border-emerald-300 text-[#14532D] font-extrabold text-xs flex items-center justify-center gap-1 cursor-pointer disabled:opacity-50"
                >
                  <ShoppingBag className="w-3.5 h-3.5" />
                  <span>+ Basket</span>
                </button>
                <button
                  type="button"
                  disabled={stockNum <= 0}
                  onClick={() => {
                    handleAddToBasket(p, quickViewQty);
                    setBasketDrawerOpen(true);
                  }}
                  className="flex-1 py-2.5 px-3 rounded-xl bg-[#14532D] text-amber-300 font-black text-xs flex items-center justify-center gap-1 shadow-sm cursor-pointer disabled:opacity-50"
                >
                  <span>⚡ Buy Now (रु {(unitPrice * quickViewQty).toFixed(0)})</span>
                </button>
              </div>
            </div>
          );
        })()}

        {/* MAIN DARAZ-STYLE HOMEPAGE, MARKETPLACE & STORIES */}
        {!quickViewProduct && (activeTab === "home" || activeTab === "marketplace" || activeTab === "stories") && (
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
                        "Discover the freshness of Nepal’s farms. Shop fresh vegetables, fruits, and quality grains directly from trusted farmers across the country at fair and affordable prices. Bringing the richness of fertile fields straight to your table.",
                        "नेपालभरिका विश्वसनीय किसानहरूबाट उत्पादित ताजा तरकारी, फलफूल तथा गुणस्तरीय खाद्यान्न अब सिधै तपाईंको घरसम्म। उचित मूल्यमा ताजा कृषि उपज खरिद गर्नुहोस् र किसानसँग प्रत्यक्ष जोडिनुहोस्।"
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

              </section>
            )}

            {/* 5. COMPACT 5-CATEGORY VISUAL STRIP (SYNCED WITH MARKETPLACE FILTER) */}
            {activeTab === "home" && (
              <section className="max-w-7xl mx-auto px-3 sm:px-8 pt-6 pb-2 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="text-[11px] font-extrabold uppercase tracking-wider text-emerald-800">
                      🌱 Browse by Category
                    </span>
                    <span className="text-xs text-slate-400 hidden sm:inline">
                      • Click any category to filter batches below
                    </span>
                  </div>
                  {selectedCategory !== "ALL" && (
                    <button
                      type="button"
                      onClick={() => setSelectedCategory("ALL")}
                      className="text-xs font-extrabold text-[#14532D] hover:underline cursor-pointer"
                    >
                      Show All ({categoryBatchCounts.ALL}) →
                    </button>
                  )}
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2.5 sm:gap-3.5">
                  {CATEGORIES_SHOWCASE.map((cat) => {
                    const isSelected = selectedCategory === cat.id;
                    const count = categoryBatchCounts[cat.id] || 0;
                    return (
                      <button
                        key={cat.id}
                        type="button"
                        onClick={() => {
                          setSelectedCategory(isSelected ? "ALL" : cat.id);
                          document
                            .getElementById("fresh-harvests")
                            ?.scrollIntoView({ behavior: "smooth" });
                        }}
                        className={`group flex items-center gap-3 p-2.5 sm:p-3 rounded-2xl border text-left transition cursor-pointer ${
                          isSelected
                            ? "bg-[#14532D] text-white border-[#14532D] shadow-md ring-2 ring-emerald-500/30"
                            : "bg-white hover:bg-emerald-50/50 text-slate-900 border-slate-200/90 shadow-2xs"
                        }`}
                      >
                        <div className="relative w-12 h-12 sm:w-14 sm:h-14 rounded-xl overflow-hidden shrink-0 bg-slate-100">
                          <img
                            src={cat.image}
                            alt={cat.title}
                            className="w-full h-full object-cover group-hover:scale-105 transition duration-300"
                          />
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center justify-between gap-1">
                            <span
                              className={`text-[10px] font-extrabold px-1.5 py-0.2 rounded-full ${
                                isSelected
                                  ? "bg-amber-400 text-slate-950"
                                  : "bg-emerald-50 text-emerald-800"
                              }`}
                            >
                              {count} {count === 1 ? "Batch" : "Batches"}
                            </span>
                          </div>
                          <h3
                            className={`font-extrabold text-xs sm:text-sm truncate mt-0.5 ${
                              isSelected ? "text-white" : "text-slate-900 group-hover:text-[#14532D]"
                            }`}
                          >
                            {cat.icon} {cat.shortLabel}
                          </h3>
                          <p
                            className={`text-[10px] truncate ${
                              isSelected ? "text-emerald-100" : "text-slate-500"
                            }`}
                          >
                            {cat.subtitle}
                          </p>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </section>
            )}

            {/* 6. FRESH DAILY HARVESTS WITH UNIFIED COMPACT PRECISION FILTER & SEARCH TOOLBAR */}
            {activeTab !== "stories" && (
              <section
                id="fresh-harvests"
                className="max-w-7xl mx-auto px-3 sm:px-8 py-5 sm:py-7 space-y-4"
              >
                {/* Unified Compact Filter & Search Bar */}
                <div className="bg-white rounded-2xl sm:rounded-3xl p-3.5 sm:p-4 border border-slate-200/90 shadow-2xs space-y-3">
                  {/* Top Row: Title + Live Batch Count + Scrollable Category Pills */}
                  <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
                    <div className="flex flex-wrap items-center gap-2.5">
                      <h2 className="text-lg sm:text-2xl font-black text-slate-900 tracking-tight">
                        {tr("Fresh Daily Harvests", "ताजा दैनिक कृषि उपज")}
                      </h2>
                      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-50 border border-emerald-200 text-[#14532D] text-[11px] font-extrabold">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-600 animate-pulse" />
                        {filteredProducts.length === dbProducts.length
                          ? `${filteredProducts.length} Batches`
                          : `${filteredProducts.length} of ${dbProducts.length} Batches`}
                      </span>
                    </div>

                    {/* Category Filter Pills with Live Counts */}
                    <div className="flex overflow-x-auto max-w-full gap-1 bg-slate-100/90 p-1 rounded-xl border border-slate-200/70 no-scrollbar">
                      {[
                        { id: "ALL", label: "All", count: categoryBatchCounts.ALL },
                        { id: "VEGETABLES", label: "🥬 Veg", count: categoryBatchCounts.VEGETABLES },
                        { id: "FRUITS", label: "🍎 Fruits", count: categoryBatchCounts.FRUITS },
                        { id: "GRAINS", label: "🌾 Grains", count: categoryBatchCounts.GRAINS },
                        { id: "SPICES", label: "🌶️ Spices", count: categoryBatchCounts.SPICES },
                        { id: "DAIRY", label: "🍯 Dairy", count: categoryBatchCounts.DAIRY },
                      ].map((tab) => {
                        const active = selectedCategory === tab.id;
                        return (
                          <button
                            key={tab.id}
                            type="button"
                            onClick={() => setSelectedCategory(tab.id)}
                            className={`px-2.5 py-1.5 rounded-lg text-[11px] font-extrabold whitespace-nowrap flex items-center gap-1.5 transition cursor-pointer ${
                              active
                                ? "bg-[#14532D] text-white shadow-2xs"
                                : "text-slate-600 hover:bg-white hover:text-slate-900"
                            }`}
                          >
                            <span>{tab.label}</span>
                            <span
                              className={`px-1.5 py-0.2 rounded-full text-[9px] font-black ${
                                active
                                  ? "bg-amber-400 text-slate-950"
                                  : "bg-slate-200/80 text-slate-600"
                              }`}
                            >
                              {tab.count}
                            </span>
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* Second Row: Compact Search + Dynamic Origin + Sort + In-Stock Toggle */}
                  <div className="flex flex-col md:flex-row items-stretch md:items-center gap-2 pt-1 border-t border-slate-100">
                    {/* Precision Instant Search Input */}
                    <div className="relative flex-1">
                      <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                      <input
                        type="text"
                        placeholder="Search by crop name, Nepali name (e.g. aalu, syau, marsi), or farm origin..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="w-full pl-9 pr-8 py-2 rounded-xl bg-slate-50 focus:bg-white border border-slate-200 focus:border-[#14532D] text-xs font-medium text-slate-800 outline-none transition"
                      />
                      {searchQuery && (
                        <button
                          type="button"
                          onClick={() => setSearchQuery("")}
                          className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700 text-xs font-bold cursor-pointer"
                          title="Clear search"
                        >
                          ✕
                        </button>
                      )}
                    </div>

                    {/* Controls Group */}
                    <div className="flex flex-wrap sm:flex-nowrap items-center gap-2">
                      {/* Dynamic Origin Location Filter */}
                      <select
                        value={selectedDistrict}
                        onChange={(e) => setSelectedDistrict(e.target.value)}
                        className="flex-1 sm:flex-initial px-3 py-2 rounded-xl bg-slate-50 hover:bg-white border border-slate-200 text-xs font-bold text-slate-700 outline-none focus:border-[#14532D] cursor-pointer"
                        title="Filter by farm origin"
                      >
                        <option value="ALL">📍 All Farm Origins</option>
                        {availableOrigins.map((loc) => (
                          <option key={loc} value={loc}>
                            📍 {loc}
                          </option>
                        ))}
                      </select>

                      {/* Sort Selector */}
                      <select
                        value={sortBy}
                        onChange={(e) => setSortBy(e.target.value)}
                        className="flex-1 sm:flex-initial px-3 py-2 rounded-xl bg-slate-50 hover:bg-white border border-slate-200 text-xs font-bold text-slate-700 outline-none focus:border-[#14532D] cursor-pointer"
                        title="Sort produce batches"
                      >
                        <option value="FEATURED">
                          {searchQuery.trim() ? "🎯 Sort: Best Match" : "✨ Sort: Featured"}
                        </option>
                        <option value="PRICE_ASC">💰 Price: Low to High</option>
                        <option value="PRICE_DESC">💎 Price: High to Low</option>
                        <option value="DISCOUNT_DESC">🔥 Biggest Discount</option>
                        <option value="STOCK_DESC">📦 Stock: High to Low</option>
                      </select>

                      {/* In-Stock Toggle */}
                      <button
                        type="button"
                        onClick={() => setInStockOnly(!inStockOnly)}
                        className={`px-3 py-2 rounded-xl text-xs font-bold whitespace-nowrap border transition cursor-pointer ${
                          inStockOnly
                            ? "bg-emerald-50 border-emerald-500 text-[#14532D]"
                            : "bg-slate-50 border-slate-200 text-slate-600 hover:bg-white"
                        }`}
                      >
                        {inStockOnly ? "✓ In Stock" : "In Stock Only"}
                      </button>

                      {/* Quick Reset Button (Only shown when a filter/search is active) */}
                      {hasActiveFilters && (
                        <button
                          type="button"
                          onClick={() => {
                            setSearchQuery("");
                            setSelectedCategory("ALL");
                            setSelectedDistrict("ALL");
                            setSortBy("FEATURED");
                            setInStockOnly(false);
                          }}
                          className="px-3 py-2 rounded-xl bg-red-50 hover:bg-red-100 border border-red-200 text-red-700 text-xs font-extrabold whitespace-nowrap transition cursor-pointer"
                        >
                          Reset ✕
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Compact Quick-Search Pills OR Active Filter Chips */}
                  {hasActiveFilters ? (
                    <div className="flex flex-wrap items-center gap-1.5 pt-0.5 text-[11px]">
                      <span className="text-slate-400 font-bold">Active:</span>
                      {selectedCategory !== "ALL" && (
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-emerald-50 border border-emerald-200 text-[#14532D] font-bold">
                          Category: {selectedCategory}
                          <button
                            type="button"
                            onClick={() => setSelectedCategory("ALL")}
                            className="ml-0.5 hover:text-red-600 cursor-pointer"
                          >
                            ✕
                          </button>
                        </span>
                      )}
                      {selectedDistrict !== "ALL" && (
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-emerald-50 border border-emerald-200 text-[#14532D] font-bold">
                          Origin: {selectedDistrict}
                          <button
                            type="button"
                            onClick={() => setSelectedDistrict("ALL")}
                            className="ml-0.5 hover:text-red-600 cursor-pointer"
                          >
                            ✕
                          </button>
                        </span>
                      )}
                      {searchQuery.trim() && (
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-amber-50 border border-amber-200 text-amber-900 font-bold">
                          Search: &ldquo;{searchQuery.trim()}&rdquo;
                          <button
                            type="button"
                            onClick={() => setSearchQuery("")}
                            className="ml-0.5 hover:text-red-600 cursor-pointer"
                          >
                            ✕
                          </button>
                        </span>
                      )}
                      {inStockOnly && (
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-slate-100 text-slate-700 font-bold">
                          In Stock Only
                          <button
                            type="button"
                            onClick={() => setInStockOnly(false)}
                            className="ml-0.5 hover:text-red-600 cursor-pointer"
                          >
                            ✕
                          </button>
                        </span>
                      )}
                    </div>
                  ) : (
                    <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar pt-0.5 text-[11px]">
                      <span className="text-slate-400 font-bold shrink-0">Popular:</span>
                      {[
                        { label: "🍅 Tomato", term: "Tomato" },
                        { label: "🍎 Apple", term: "Apple" },
                        { label: "🥔 Potato", term: "Potato" },
                        { label: "🌾 Marsi Rice", term: "Marsi" },
                        { label: "🌶️ Akabare Chili", term: "Chili" },
                        { label: "🍯 Honey", term: "Honey" },
                      ].map((t) => (
                        <button
                          key={t.term}
                          type="button"
                          onClick={() => setSearchQuery(t.term)}
                          className="px-2.5 py-0.5 rounded-full bg-slate-100 hover:bg-emerald-50 hover:text-[#14532D] text-slate-600 font-semibold whitespace-nowrap transition cursor-pointer"
                        >
                          {t.label}
                        </button>
                      ))}
                    </div>
                  )}
                </div>

                                {loadingProducts && dbProducts.length === 0 ? (
                  <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-3 gap-2.5 sm:gap-6">
                    {[1, 2, 3, 4, 5, 6].map((n) => (
                      <div
                        key={n}
                        className="bg-white rounded-2xl sm:rounded-3xl p-2.5 sm:p-3.5 border border-slate-200/90 shadow-2xs space-y-3"
                      >
                        <div className="h-36 sm:h-52 rounded-xl sm:rounded-2xl km-shimmer" />
                        <div className="px-1 space-y-2">
                          <div className="flex justify-between">
                            <div className="w-20 h-3 rounded km-shimmer" />
                            <div className="w-12 h-3 rounded km-shimmer hidden sm:block" />
                          </div>
                          <div className="w-4/5 h-4 sm:h-5 rounded km-shimmer" />
                          <div className="w-full h-3 rounded km-shimmer" />
                          <div className="pt-1 flex items-center justify-between">
                            <div className="w-16 h-5 sm:h-6 rounded km-shimmer" />
                            <div className="w-14 h-4 rounded km-shimmer hidden sm:block" />
                          </div>
                        </div>
                        <div className="pt-2 border-t border-slate-100 flex gap-2">
                          <div className="flex-1 h-9 rounded-xl km-shimmer" />
                          <div className="w-9 h-9 rounded-xl km-shimmer" />
                        </div>
                      </div>
                    ))}
                  </div>
                ) : filteredProducts.length === 0 ? (
                  <div className="bg-white rounded-3xl p-10 text-center border border-slate-200 space-y-3">
                    <p className="text-sm font-bold text-slate-700">
                      No harvest batches match your current filter.
                    </p>
                    <button
                      onClick={() => {
                        setSelectedCategory("ALL");
                        setSelectedDistrict("ALL");
                        setSearchQuery("");
                        setSortBy("FEATURED");
                        setInStockOnly(false);
                      }}
                      className="px-4 py-2 rounded-xl bg-[#14532D] text-white text-xs font-bold cursor-pointer"
                    >
                      Show All Harvests
                    </button>
                  </div>
                ) : (
                  /* Daraz-Style 2-Column Mobile Grid (grid-cols-2 on phones, 3-col on desktop) */
                  <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-3 gap-2.5 sm:gap-6">
                    {filteredProducts.map((p) => {
                      const imgUrl = getProductImage(p);
                      const stockNum = Number(p.stock_quantity || 0);
                      const isLowStock = stockNum > 0 && stockNum <= 35;
                      const basketItem = basket.find((item) => item.id === p.id);
                      const qtyInBasket = basketItem ? basketItem.qty : 0;

                      return (
                        <div
                          key={p.id}
                          className="bg-white rounded-2xl sm:rounded-3xl p-2.5 sm:p-3.5 border border-slate-200/90 shadow-2xs hover:shadow-xl hover:-translate-y-0.5 transition duration-200 flex flex-col justify-between"
                        >
                          <div>
                            <div
                              onClick={() => {
                                setQuickViewProduct(p);
                                setQuickViewQty(1);
                              }}
                              className="relative h-36 sm:h-52 rounded-xl sm:rounded-2xl overflow-hidden mb-2.5 sm:mb-3.5 cursor-pointer group bg-slate-100"
                            >
                              <img
                                src={imgUrl}
                                alt={p.name}
                                loading="lazy"
                                onError={(e) => {
                                  e.currentTarget.onerror = null;
                                  e.currentTarget.src = getFallbackProductImage(p);
                                }}
                                className="w-full h-full object-cover group-hover:scale-105 transition duration-300"
                              />
                              <span className="absolute top-2 left-2 sm:top-3 sm:left-3 px-2 py-0.5 sm:px-2.5 sm:py-1 rounded-full bg-white/95 text-slate-800 text-[9px] sm:text-[11px] font-bold flex items-center gap-1 shadow-xs max-w-[75%] truncate">
                                <MapPin className="w-2.5 h-2.5 sm:w-3 sm:h-3 text-emerald-700 shrink-0" />
                                <span className="truncate">{p.origin_location || "Nepal Farm"}</span>
                              </span>
                              <span
                                className={`absolute bottom-2 right-2 sm:top-3 sm:bottom-auto sm:right-3 px-2 py-0.5 sm:px-2.5 sm:py-1 rounded-full text-white text-[9px] sm:text-[10px] font-bold shadow-xs ${
                                  stockNum <= 0
                                    ? "bg-red-600"
                                    : isLowStock
                                    ? "bg-amber-600"
                                    : "bg-emerald-700"
                                }`}
                              >
                                {stockNum > 0
                                  ? isLowStock
                                    ? `🔥 ${p.stock_quantity} ${p.unit} Left`
                                    : `${p.stock_quantity} ${p.unit} Left`
                                  : "Sold Out"}
                              </span>
                              {qtyInBasket > 0 && (
                                <span className="absolute top-2 right-2 sm:bottom-2 sm:top-auto sm:left-3 sm:right-auto px-2 py-0.5 rounded-full bg-[#14532D] text-amber-300 text-[9px] sm:text-[10px] font-black shadow-xs">
                                  ✓ {qtyInBasket} {p.unit} in Basket
                                </span>
                              )}
                            </div>

                            <div className="px-0.5 sm:px-1.5 space-y-1 sm:space-y-1.5">
                              <div className="flex items-center justify-between text-[10px] sm:text-[11px] text-slate-500">
                                <span className="flex items-center gap-1 font-semibold text-emerald-800 truncate">
                                  <ShieldCheck className="w-3 h-3 sm:w-3.5 sm:h-3.5 shrink-0 text-emerald-600" />
                                  <span className="truncate">Verified Farm</span>
                                </span>
                                <span className="uppercase font-bold text-[9px] sm:text-[10px] text-slate-400 hidden sm:inline">
                                  {p.category}
                                </span>
                              </div>

                              <h3
                                onClick={() => {
                                  setQuickViewProduct(p);
                                  setQuickViewQty(1);
                                }}
                                className="font-extrabold text-xs sm:text-base text-slate-900 hover:text-[#14532D] cursor-pointer line-clamp-1 sm:line-clamp-2 leading-snug"
                              >
                                {p.name}
                              </h3>
                              <p className="text-[10px] sm:text-xs text-slate-500 line-clamp-1 sm:line-clamp-2">
                                {p.description}
                              </p>

                              <div className="pt-1 sm:pt-2 flex items-baseline justify-between gap-1">
                                <div>
                                  <span className="text-sm sm:text-xl font-black text-[#14532D] sm:text-slate-900">
                                    रु {p.price}
                                  </span>
                                  <span className="text-[10px] sm:text-xs text-slate-500">
                                    /{p.unit}
                                  </span>
                                  {Number(p.actual_price) > Number(p.price) && (
                                    <span className="ml-1.5 text-[10px] sm:text-xs text-slate-400 line-through font-semibold">
                                      रु {p.actual_price}
                                    </span>
                                  )}
                                </div>
                                {Number(p.actual_price) > Number(p.price) ? (
                                  <span className="px-1.5 sm:px-2 py-0.5 rounded-md bg-amber-100 text-amber-900 border border-amber-300 text-[9px] sm:text-[10px] font-black">
                                    -{p.discount_pct || Math.round(((Number(p.actual_price) - Number(p.price)) / Number(p.actual_price)) * 100)}%
                                  </span>
                                ) : (
                                  <span className="hidden sm:inline-block px-2 py-0.5 rounded-md bg-emerald-50 text-emerald-800 border border-emerald-200 text-[10px] font-bold">
                                    Direct Rate
                                  </span>
                                )}
                              </div>
                            </div>
                          </div>

                          <div className="mt-2.5 sm:mt-4 pt-2 sm:pt-3 border-t border-slate-100 flex items-center gap-1.5 sm:gap-2">
                            {qtyInBasket > 0 ? (
                              <div className="flex-1 flex items-center justify-between bg-emerald-50 border border-emerald-300 rounded-xl p-1">
                                <button
                                  type="button"
                                  onClick={() => handleUpdateBasketQty(p.id, -1)}
                                  className="w-7 h-7 sm:w-8 sm:h-8 rounded-lg bg-white hover:bg-slate-100 text-slate-800 font-black text-xs flex items-center justify-center shadow-2xs cursor-pointer"
                                >
                                  <Minus className="w-3 h-3 sm:w-3.5 sm:h-3.5" />
                                </button>
                                <span className="text-[11px] sm:text-xs font-black text-[#14532D]">
                                  {qtyInBasket} {p.unit}
                                </span>
                                <button
                                  type="button"
                                  onClick={() => handleAddToBasket(p, 1)}
                                  className="w-7 h-7 sm:w-8 sm:h-8 rounded-lg bg-[#14532D] hover:bg-[#1B4332] text-white font-black text-xs flex items-center justify-center shadow-2xs cursor-pointer"
                                >
                                  <Plus className="w-3 h-3 sm:w-3.5 sm:h-3.5" />
                                </button>
                              </div>
                            ) : (
                              <button
                                disabled={stockNum <= 0}
                                onClick={() => handleAddToBasket(p, 1)}
                                className="flex-1 py-2 sm:py-2.5 px-2.5 sm:px-4 rounded-xl bg-[#14532D] hover:bg-[#1B4332] disabled:bg-slate-300 text-white text-[11px] sm:text-xs font-bold flex items-center justify-center gap-1.5 transition cursor-pointer"
                              >
                                <ShoppingBag className="w-3 h-3 sm:w-3.5 sm:h-3.5 shrink-0" />
                                <span>{stockNum > 0 ? "Add" : "Sold Out"}</span>
                              </button>
                            )}
                            <button
                              onClick={() => {
                                setQuickViewProduct(p);
                                setQuickViewQty(1);
                              }}
                              className="p-2 sm:p-2.5 rounded-xl border border-slate-200 text-slate-500 hover:text-[#14532D] hover:border-[#14532D] transition cursor-pointer"
                              title="Quick View Details"
                            >
                              <Eye className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                            </button>
                            {!isAdmin && (
                              <button
                                onClick={() => requireAuth(() => setChatDrawerOpen(true))}
                                className="hidden sm:flex p-2.5 rounded-xl border border-slate-200 text-slate-500 hover:text-[#14532D] hover:border-[#14532D] transition cursor-pointer"
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

            {/* 9. FARMER SPOTLIGHT & COMMUNITY VOICES (PRODUCT REVIEWS APPEAR EXCLUSIVELY ON PRODUCT PAGES) */}
            <section className="max-w-7xl mx-auto px-4 sm:px-8 py-8 space-y-8">
              <div className="flex flex-wrap items-center justify-between gap-4">
                <div>
                  <span className="text-[11px] font-extrabold uppercase tracking-widest text-emerald-700">
                    COMMUNITY VOICES
                  </span>
                  <h2 className="text-xl sm:text-3xl font-black text-slate-900">
                    Farmer Stories & Community Experiences
                  </h2>
                </div>
                <button
                  onClick={() =>
                    requireAuth(() => {
                      setReviewTargetProduct(null);
                      setStoryForm({ title: "", content: "", rating: 5 });
                      setStoryModalOpen(true);
                    })
                  }
                  className="px-5 py-2.5 rounded-xl bg-[#14532D] hover:bg-[#1B4332] text-white text-xs font-bold shadow-sm cursor-pointer"
                >
                  + Share Your Story
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
                          resolveMediaUrl(st.image)
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

              {/* General Platform Testimonials (Individual product purchase reviews appear ONLY on product detail pages) */}
              {generalPlatformReviews.length > 0 && (
                <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4 pt-4">
                  {generalPlatformReviews.map((br) => (
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
                                  resolveMediaUrl(br.author_avatar, br.author)
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
                            resolveMediaUrl(br.image)
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
            <div className="flex justify-between items-center border-b border-slate-100 pb-2.5">
              <div>
                <h3 className="text-lg font-extrabold text-slate-900">
                  {reviewTargetProduct
                    ? "Rate & Review Delivered Product"
                    : user.role === "FARMER"
                    ? "Share Your Farmer Story"
                    : "Write a Buyer Review"}
                </h3>
                {reviewTargetProduct && (
                  <p className="text-xs font-bold text-emerald-700 mt-0.5">
                    ✓ Verified Delivered Order #{reviewTargetProduct.order_id} •{" "}
                    {reviewTargetProduct.product_name}
                  </p>
                )}
              </div>
              <button
                type="button"
                onClick={() => {
                  setStoryModalOpen(false);
                  setReviewTargetProduct(null);
                }}
                className="p-1 text-slate-400 hover:text-slate-700 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Interactive Daraz 5-Star Tap Selector */}
            <div className="bg-amber-50/70 border border-amber-200/80 rounded-2xl p-3 flex items-center justify-between">
              <span className="text-xs font-extrabold text-slate-800">Tap to Rate:</span>
              <div className="flex items-center gap-1.5">
                {[1, 2, 3, 4, 5].map((starNum) => (
                  <button
                    key={starNum}
                    type="button"
                    onClick={() => setStoryForm({ ...storyForm, rating: starNum })}
                    className="p-0.5 transition transform hover:scale-110 cursor-pointer"
                  >
                    <Star
                      className={`w-6 h-6 ${
                        starNum <= Number(storyForm.rating || 5)
                          ? "fill-amber-400 text-amber-400"
                          : "text-slate-300"
                      }`}
                    />
                  </button>
                ))}
                <span className="ml-1 text-xs font-black text-amber-800">
                  {storyForm.rating}/5
                </span>
              </div>
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

{/* Product Details now open in Full-Page Daraz View inside <main> */}

      {/* DARAZ-STYLE SHOPPING BASKET, EXPRESS CHECKOUT & "JUST FOR YOU" PRODUCTS VIEW */}
      {basketDrawerOpen && (() => {
        // Enrich basket items with live dbProducts metadata (photo, actual_price, stock, origin)
        const enrichedBasket = basket.map((item) => {
          const liveProd =
            (Array.isArray(dbProducts) ? dbProducts : []).find((p) => p.id === item.id) || item;
          const unitPrice = Number(liveProd.price || item.price || 0);
          const origUnit =
            Number(liveProd.actual_price || item.actual_price || 0) > unitPrice
              ? Number(liveProd.actual_price || item.actual_price)
              : unitPrice;
          return {
            ...liveProd,
            ...item,
            price: unitPrice,
            actual_price: origUnit > unitPrice ? origUnit : null,
            origin_location: liveProd.origin_location || item.origin_location || "Nepal Farm",
            category: getCanonicalProductCategory(liveProd),
            stock_quantity: liveProd.stock_quantity ?? item.stock_quantity ?? 50,
            lineTotal: unitPrice * item.qty,
            lineOriginalTotal: origUnit * item.qty,
            lineSavings: Math.max(0, (origUnit - unitPrice) * item.qty),
          };
        });

        const basketOriginalSubtotal = enrichedBasket.reduce(
          (sum, it) => sum + it.lineOriginalTotal,
          0
        );
        const basketDiscountSavings = enrichedBasket.reduce(
          (sum, it) => sum + it.lineSavings,
          0
        );

        // Build Daraz-style "Just For You / Fresh Farm Recommendations" product list
        const basketIds = new Set(basket.map((b) => b.id));
        const recommendedProducts = (Array.isArray(dbProducts) ? dbProducts : [])
          .filter((p) => {
            if (basketRecCategory === "ALL") return true;
            return getCanonicalProductCategory(p) === basketRecCategory;
          })
          .sort((a, b) => {
            // Show in-stock items not yet in basket first so customers can easily discover & add more
            const aInBasket = basketIds.has(a.id) ? 1 : 0;
            const bInBasket = basketIds.has(b.id) ? 1 : 0;
            if (aInBasket !== bInBasket) return aInBasket - bInBasket;
            const aStock = Number(a.stock_quantity) > 0 ? 1 : 0;
            const bStock = Number(b.stock_quantity) > 0 ? 1 : 0;
            if (bStock !== aStock) return bStock - aStock;
            return Number(b.id || 0) - Number(a.id || 0);
          });

        return (
          <div className="fixed inset-0 z-50 bg-[#F4F6F3] overflow-y-auto animate-fadeIn">
            {/* Sticky Daraz Basket Top Navigation Bar */}
            <div className="sticky top-0 z-30 bg-white/95 backdrop-blur-md border-b border-slate-200/90 shadow-2xs">
              <div className="max-w-7xl mx-auto px-3 sm:px-8 py-3 flex flex-wrap items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <button
                    type="button"
                    onClick={() => setBasketDrawerOpen(false)}
                    className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-slate-100 hover:bg-emerald-50 text-slate-700 hover:text-[#14532D] font-extrabold text-xs transition cursor-pointer"
                  >
                    <span>← Continue Shopping</span>
                  </button>
                  <div className="flex items-center gap-2">
                    <div className="w-9 h-9 rounded-xl bg-[#14532D] text-amber-400 flex items-center justify-center shadow-2xs">
                      <ShoppingBag className="w-5 h-5" />
                    </div>
                    <div>
                      <h2 className="text-base sm:text-xl font-black text-slate-900 leading-tight">
                        My Harvest Basket ({totalBasketItems})
                      </h2>
                      <p className="text-[10px] sm:text-xs text-slate-500 font-medium hidden xs:block">
                        Direct from Verified Nepali Farmers • Instant Checkout
                      </p>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  {basket.length > 0 && (
                    <button
                      type="button"
                      onClick={() => {
                        setBasket([]);
                        showToast("Cleared all items from your basket.");
                      }}
                      className="px-3 py-2 rounded-xl bg-red-50 hover:bg-red-100 border border-red-200 text-red-700 text-xs font-extrabold flex items-center gap-1.5 transition cursor-pointer"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      <span className="hidden sm:inline">Clear Basket</span>
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() => setBasketDrawerOpen(false)}
                    className="p-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-600 transition cursor-pointer"
                    title="Close Basket"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>
              </div>
            </div>

            <div className="max-w-7xl mx-auto px-3 sm:px-8 py-5 sm:py-7 space-y-8 pb-20">
              {/* TOP SECTION: CART ITEMS + ORDER SUMMARY & CHECKOUT */}
              {enrichedBasket.length === 0 ? (
                <div className="bg-white rounded-3xl p-8 sm:p-12 text-center border border-slate-200/90 shadow-2xs max-w-2xl mx-auto space-y-4">
                  <div className="w-20 h-20 rounded-3xl bg-emerald-50 border border-emerald-200 text-[#14532D] flex items-center justify-center mx-auto shadow-xs">
                    <ShoppingBag className="w-10 h-10" />
                  </div>
                  <div className="space-y-1.5">
                    <h3 className="text-xl sm:text-2xl font-black text-slate-900">
                      Your Harvest Basket is Empty
                    </h3>
                    <p className="text-xs sm:text-sm text-slate-500 max-w-md mx-auto leading-relaxed">
                      Add fresh seasonal vegetables, Mustang apples, Jumla Marsi rice, or wild honey from the{" "}
                      <strong className="text-[#14532D]">Just For You</strong> products below!
                    </p>
                  </div>
                  <div className="flex flex-wrap items-center justify-center gap-2.5 pt-2">
                    <button
                      type="button"
                      onClick={() => setBasketDrawerOpen(false)}
                      className="px-5 py-2.5 rounded-xl bg-[#14532D] hover:bg-[#1B4332] text-white text-xs sm:text-sm font-extrabold shadow-sm transition cursor-pointer"
                    >
                      🌱 Explore Full Marketplace
                    </button>
                  </div>
                </div>
              ) : (
                <div className="grid lg:grid-cols-12 gap-6 items-start">
                  {/* LEFT 8 COLUMNS: DARAZ STORE PACKAGE & BASKET ITEM CARDS */}
                  <div className="lg:col-span-8 space-y-3.5">
                    {/* Daraz Store Package Header */}
                    <div className="bg-white rounded-2xl p-3.5 sm:p-4 border border-slate-200/90 shadow-2xs flex flex-wrap items-center justify-between gap-2">
                      <div className="flex items-center gap-2.5">
                        <span className="px-2.5 py-1 rounded-lg bg-[#14532D] text-amber-300 text-[10px] font-black uppercase tracking-wider">
                          ✓ Verified Mall
                        </span>
                        <div>
                          <p className="text-xs sm:text-sm font-extrabold text-slate-900">
                            KrishiMart Nepal Official Farm Hub
                          </p>
                          <p className="text-[11px] text-slate-500">
                            {enrichedBasket.length} {enrichedBasket.length === 1 ? "Product" : "Products"} ({totalBasketItems} total units) • Direct Farmer Dispatch
                          </p>
                        </div>
                      </div>
                      <span className="px-3 py-1 rounded-full bg-emerald-50 border border-emerald-200 text-[#14532D] text-[11px] font-extrabold">
                        🚚 Free Hub Handling
                      </span>
                    </div>

                    {/* Individual Basket Item Cards */}
                    <div className="space-y-3">
                      {enrichedBasket.map((item) => {
                        const imgUrl = getProductImage(item);
                        const hasDiscount =
                          item.actual_price && Number(item.actual_price) > Number(item.price);
                        const discPct = hasDiscount
                          ? Math.round(
                              ((Number(item.actual_price) - Number(item.price)) /
                                Number(item.actual_price)) *
                                100
                            )
                          : 0;

                        return (
                          <div
                            key={item.id}
                            className="bg-white rounded-2xl sm:rounded-3xl p-3.5 sm:p-4 border border-slate-200/90 shadow-2xs hover:border-emerald-300 transition flex flex-col sm:flex-row sm:items-center justify-between gap-4"
                          >
                            <div className="flex items-center gap-3.5 min-w-0 flex-1">
                              {/* Clickable Product Image */}
                              <div
                                onClick={() => {
                                  setQuickViewProduct(item);
                                  setQuickViewQty(item.qty || 1);
                                  setBasketDrawerOpen(false);
                                }}
                                className="relative w-20 h-20 sm:w-24 sm:h-24 rounded-2xl overflow-hidden bg-slate-100 border border-slate-200/80 shrink-0 cursor-pointer group"
                              >
                                <img
                                  src={imgUrl}
                                  alt={item.name}
                                  onError={(e) => {
                                    e.currentTarget.onerror = null;
                                    e.currentTarget.src = getFallbackProductImage(item);
                                  }}
                                  className="w-full h-full object-cover group-hover:scale-105 transition duration-300"
                                />
                                {hasDiscount && (
                                  <span className="absolute top-1.5 left-1.5 px-1.5 py-0.5 rounded-md bg-amber-400 text-slate-950 text-[9px] font-black shadow-2xs">
                                    -{discPct}%
                                  </span>
                                )}
                              </div>

                              {/* Item Metadata & Pricing */}
                              <div className="min-w-0 flex-1 space-y-1">
                                <div className="flex flex-wrap items-center gap-1.5">
                                  <span className="px-2 py-0.5 rounded-md bg-emerald-50 text-[#14532D] text-[10px] font-extrabold">
                                    📍 {item.origin_location}
                                  </span>
                                  <span className="px-2 py-0.5 rounded-md bg-slate-100 text-slate-600 text-[10px] font-bold uppercase">
                                    {item.category}
                                  </span>
                                </div>

                                <h4
                                  onClick={() => {
                                    setQuickViewProduct(item);
                                    setQuickViewQty(item.qty || 1);
                                    setBasketDrawerOpen(false);
                                  }}
                                  className="font-extrabold text-sm sm:text-base text-slate-900 hover:text-[#14532D] truncate cursor-pointer"
                                >
                                  {item.name}
                                </h4>

                                <div className="flex flex-wrap items-baseline gap-2">
                                  <span className="text-sm sm:text-base font-black text-[#14532D]">
                                    रु {item.price}
                                  </span>
                                  <span className="text-xs text-slate-500">/ {item.unit}</span>
                                  {hasDiscount && (
                                    <>
                                      <span className="text-xs text-slate-400 line-through font-semibold">
                                        रु {item.actual_price}
                                      </span>
                                      <span className="text-[10px] font-extrabold text-amber-800 bg-amber-50 px-1.5 py-0.2 rounded">
                                        Save रु {(item.actual_price - item.price).toFixed(0)}/{item.unit}
                                      </span>
                                    </>
                                  )}
                                </div>

                                <p className="text-[11px] text-slate-400">
                                  Available Stock: <strong className="text-slate-600">{item.stock_quantity} {item.unit}</strong>
                                </p>
                              </div>
                            </div>

                            {/* Right Side: Quantity Stepper, Quick Add Presets, Line Total & Remove */}
                            <div className="flex sm:flex-col items-center sm:items-end justify-between gap-2 pt-2.5 sm:pt-0 border-t sm:border-t-0 border-slate-100 shrink-0">
                              <div className="text-left sm:text-right">
                                <span className="text-[10px] font-bold uppercase text-slate-400 block">
                                  Item Subtotal
                                </span>
                                <span className="text-base sm:text-lg font-black text-slate-900">
                                  रु {item.lineTotal.toLocaleString()}
                                </span>
                              </div>

                              <div className="flex items-center gap-2">
                                <div className="flex items-center bg-slate-100 border border-slate-200 rounded-xl p-0.5">
                                  <button
                                    type="button"
                                    onClick={() => handleUpdateBasketQty(item.id, -1)}
                                    className="w-7 h-7 sm:w-8 sm:h-8 rounded-lg bg-white hover:bg-slate-50 text-slate-700 flex items-center justify-center shadow-2xs transition cursor-pointer"
                                    title="Decrease quantity"
                                  >
                                    <Minus className="w-3.5 h-3.5" />
                                  </button>
                                  <span className="px-2.5 sm:px-3 text-xs sm:text-sm font-black text-slate-900 min-w-[44px] text-center">
                                    {item.qty} {item.unit}
                                  </span>
                                  <button
                                    type="button"
                                    onClick={() => handleUpdateBasketQty(item.id, 1)}
                                    className="w-7 h-7 sm:w-8 sm:h-8 rounded-lg bg-[#14532D] hover:bg-[#1B4332] text-white flex items-center justify-center shadow-2xs transition cursor-pointer"
                                    title="Increase quantity"
                                  >
                                    <Plus className="w-3.5 h-3.5" />
                                  </button>
                                </div>

                                <button
                                  type="button"
                                  onClick={() => handleRemoveFromBasket(item.id, item.name)}
                                  className="p-2 rounded-xl text-slate-400 hover:text-red-600 hover:bg-red-50 border border-transparent hover:border-red-200 transition cursor-pointer"
                                  title="Remove item from basket"
                                >
                                  <Trash2 className="w-4 h-4" />
                                </button>
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  {/* RIGHT 4 COLUMNS: INTERACTIVE DELIVERY MAP PICKER, ORDER SUMMARY & CHECKOUT */}
                  <div className="lg:col-span-4 lg:sticky lg:top-20 bg-white rounded-3xl p-4 sm:p-6 border border-slate-200/90 shadow-md space-y-4">
                    <div className="pb-3 border-b border-slate-100 flex items-center justify-between">
                      <div>
                        <h3 className="text-base sm:text-lg font-black text-slate-900">
                          Delivery Map &amp; Order Summary
                        </h3>
                        <p className="text-[11px] text-slate-500">
                          Hub: <strong>{KRISHIMART_HUB.dms}</strong>
                        </p>
                      </div>
                      <span className="px-2.5 py-1 rounded-full bg-emerald-50 border border-emerald-200 text-[#14532D] text-[11px] font-extrabold">
                        ⚖️ {totalBasketWeightKg.toFixed(1)} kg
                      </span>
                    </div>

                    {/* > 6 kg within 7 km Free Delivery Progress Banner */}
                    {isFreeDeliveryUnlocked ? (
                      <div className="p-3 rounded-2xl bg-emerald-50 border-2 border-emerald-500/40 text-[#14532D] space-y-1">
                        <div className="flex items-center justify-between text-xs font-black">
                          <span>🎉 FREE Home Delivery Unlocked!</span>
                          <span className="px-2 py-0.5 rounded-full bg-amber-400 text-slate-950 text-[10px]">
                            Saved रु {rawCalculatedDeliveryFee}
                          </span>
                        </div>
                        <p className="text-[11px] text-emerald-800">
                          Your basket is <strong>{totalBasketWeightKg.toFixed(1)} kg</strong> (&gt; {freeDeliveryMinKg} kg) within <strong>{deliveryDistanceKm} km</strong> (&le; {freeDeliveryMaxKm} km of Hub).
                        </p>
                      </div>
                    ) : deliveryDistanceKm <= freeDeliveryMaxKm ? (
                      <div className="p-3 rounded-2xl bg-amber-50/90 border border-amber-200 space-y-1.5">
                        <div className="flex items-center justify-between text-[11px] font-extrabold text-amber-950">
                          <span>🚚 Free Delivery Progress (&gt; {freeDeliveryMinKg} kg within {freeDeliveryMaxKm} km)</span>
                          <span>
                            {totalBasketWeightKg.toFixed(1)} / {freeDeliveryMinKg}+ kg
                          </span>
                        </div>
                        <div className="w-full h-2 rounded-full bg-amber-200/70 overflow-hidden">
                          <div
                            className="h-full bg-gradient-to-r from-[#14532D] to-emerald-500 rounded-full transition-all duration-300"
                            style={{
                              width: `${Math.min(100, Math.round((totalBasketWeightKg / 6.1) * 100))}%`,
                            }}
                          />
                        </div>
                        <p className="text-[11px] text-amber-900">
                          Add <strong>{Math.max(0.1, 6.1 - totalBasketWeightKg).toFixed(1)} kg more</strong> to get{" "}
                          <strong className="text-[#14532D]">FREE Delivery</strong> and save{" "}
                          <strong>रु {rawCalculatedDeliveryFee}</strong>!
                        </p>
                      </div>
                    ) : (
                      <div className="p-3 rounded-2xl bg-blue-50 border border-blue-200 text-blue-900 text-[11px] font-semibold">
                        📏 Your pinned location is <strong>{deliveryDistanceKm} km</strong> from Hub (Free delivery for &gt;{freeDeliveryMinKg} kg applies within {freeDeliveryMaxKm} km). Standard rate: <strong>रु {deliveryRatePerKm}/km</strong>.
                      </div>
                    )}

                    {/* INTERACTIVE LEAFLET MAP PICKER STUDIO */}
                    <div className="space-y-2.5 bg-slate-50/80 p-3 rounded-2xl border border-slate-200/90">
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <span className="text-xs font-extrabold text-slate-900 flex items-center gap-1.5">
                          <MapPin className="w-4 h-4 text-red-600" />
                          <span>Choose Delivery Location on Map *</span>
                        </span>
                        <div className="flex items-center gap-1.5">
                          <button
                            type="button"
                            onClick={handleDetectLiveGps}
                            disabled={locatingGps}
                            className="px-2.5 py-1 rounded-lg bg-[#14532D] hover:bg-[#1B4332] text-white text-[10px] font-extrabold transition cursor-pointer"
                          >
                            {locatingGps ? "Locating..." : "📍 Live GPS"}
                          </button>
                          <button
                            type="button"
                            onClick={() => setMapExpanded((prev) => !prev)}
                            className="px-2 py-1 rounded-lg bg-white border border-slate-200 text-slate-700 text-[10px] font-bold hover:bg-slate-100 cursor-pointer"
                          >
                            {mapExpanded ? "Compact Map" : "⛶ Expand Map"}
                          </button>
                        </div>
                      </div>

                      {/* Quick Dhangadhi Area / Chowk Selector */}
                      <select
                        value=""
                        onChange={(e) => {
                          const found = DHANGADHI_DELIVERY_LOCATIONS.find(
                            (l) => l.name === e.target.value
                          );
                          if (found) {
                            setCustomerPin({
                              lat: found.lat,
                              lng: found.lng,
                              km: found.km,
                              label: found.name,
                            });
                            setCheckoutAddress(found.name);
                          }
                        }}
                        className="w-full px-3 py-2 rounded-xl bg-white border border-slate-200 text-xs font-bold text-slate-700 outline-none focus:border-[#14532D] cursor-pointer"
                      >
                        <option value="" disabled>
                          📍 Quick Jump to Dhangadhi Chowk / Area ({customerPin.label})...
                        </option>
                        {DHANGADHI_DELIVERY_LOCATIONS.map((loc) => (
                          <option key={loc.name} value={loc.name}>
                            {loc.name} — {loc.km} km (रु {Math.round(loc.km * deliveryRatePerKm)})
                          </option>
                        ))}
                      </select>

                      {/* Live Interactive OpenStreetMap */}
                      <InteractiveDeliveryMap
                        customerPin={customerPin}
                        freeMaxKm={freeDeliveryMaxKm}
                        expanded={mapExpanded}
                        onSelectLocation={(newPin) => {
                          setCustomerPin(newPin);
                          setCheckoutAddress(newPin.label);
                        }}
                      />

                      {/* Live Distance & Rate Calculation Pill */}
                      <div className="flex flex-wrap items-center justify-between gap-2 px-3 py-2 rounded-xl bg-white border border-emerald-200 text-xs">
                        <div>
                          <span className="text-slate-500 font-medium">Distance from Hub: </span>
                          <strong className="text-slate-900">{deliveryDistanceKm} km</strong>
                          <span className="text-[10px] text-slate-400 ml-1">
                            (@ रु {deliveryRatePerKm}/km)
                          </span>
                        </div>
                        <div>
                          {isFreeDeliveryUnlocked ? (
                            <span className="font-black text-emerald-700">
                              <span className="line-through text-slate-400 font-normal mr-1">
                                रु {rawCalculatedDeliveryFee}
                              </span>
                              FREE (रु 0)
                            </span>
                          ) : (
                            <span className="font-black text-[#14532D]">
                              Delivery: + रु {finalDeliveryCharge}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Complete Bill Breakdown */}
                    <div className="space-y-2 text-xs sm:text-sm pt-1">
                      <div className="flex items-center justify-between text-slate-600">
                        <span>Original MRP Total</span>
                        <span className="font-bold text-slate-800">
                          रु {basketOriginalSubtotal.toLocaleString()}
                        </span>
                      </div>
                      {basketDiscountSavings > 0 && (
                        <div className="flex items-center justify-between text-emerald-700 font-bold">
                          <span>Farm Direct Discount</span>
                          <span>- रु {basketDiscountSavings.toLocaleString()}</span>
                        </div>
                      )}
                      <div className="flex items-center justify-between text-slate-700 font-semibold">
                        <span>Produce Subtotal ({totalBasketWeightKg.toFixed(1)} kg)</span>
                        <span className="font-bold text-slate-900">
                          रु {basketTotal.toLocaleString()}
                        </span>
                      </div>
                      <div className="flex items-center justify-between text-slate-700">
                        <span>
                          Home Delivery ({deliveryDistanceKm} km @ रु {deliveryRatePerKm}/km)
                        </span>
                        {isFreeDeliveryUnlocked ? (
                          <span className="text-emerald-700 font-black">
                            <span className="line-through text-slate-400 font-normal mr-1">
                              रु {rawCalculatedDeliveryFee}
                            </span>
                            FREE
                          </span>
                        ) : (
                          <span className="font-extrabold text-[#14532D]">
                            + रु {finalDeliveryCharge}
                          </span>
                        )}
                      </div>
                      <div className="pt-2.5 border-t border-slate-200 flex items-baseline justify-between">
                        <span className="text-sm font-extrabold text-slate-900">
                          Grand Total Payable
                        </span>
                        <span className="text-xl sm:text-2xl font-black text-[#14532D]">
                          रु {basketGrandTotal.toLocaleString()}
                        </span>
                      </div>
                    </div>

                    {/* Checkout Delivery & Payment Form */}
                    <form onSubmit={handleCheckoutBasket} className="pt-2 border-t border-slate-100 space-y-3.5">
                      <div>
                        <label className="block text-xs font-extrabold text-slate-700 mb-1">
                          📞 Contact Phone Number *
                        </label>
                        <input
                          type="text"
                          required
                          placeholder="e.g. 9841234567"
                          value={checkoutPhone}
                          onChange={(e) => setCheckoutPhone(e.target.value)}
                          className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 bg-slate-50/60 focus:bg-white focus:border-[#14532D] text-xs font-medium outline-none transition"
                        />
                      </div>

                      <div>
                        <label className="block text-xs font-extrabold text-slate-700 mb-1">
                          📍 Selected Delivery Address / Landmark *
                        </label>
                        <input
                          type="text"
                          required
                          placeholder="House/Tole landmark (auto-filled from map)"
                          value={checkoutAddress}
                          onChange={(e) => setCheckoutAddress(e.target.value)}
                          className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 bg-slate-50/60 focus:bg-white focus:border-[#14532D] text-xs font-medium outline-none transition"
                        />
                      </div>

                      <div>
                        <label className="block text-xs font-extrabold text-slate-700 mb-1.5">
                          💳 Select Payment Method *
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
                              className={`py-2.5 px-2 rounded-xl border text-[11px] font-extrabold transition cursor-pointer ${
                                paymentMethod === pm.id
                                  ? "border-[#14532D] bg-emerald-50 text-[#14532D] ring-2 ring-emerald-500/20"
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
                        className="w-full py-3.5 rounded-xl bg-[#14532D] hover:bg-[#1B4332] disabled:opacity-60 text-white font-black text-xs sm:text-sm shadow-lg transition cursor-pointer flex items-center justify-center gap-2"
                      >
                        <ShoppingBag className="w-4 h-4 text-amber-400" />
                        <span>
                          {checkingOut
                            ? "Placing Your Order..."
                            : `Confirm Order • रु ${basketGrandTotal.toLocaleString()}`}
                        </span>
                      </button>
                    </form>
                  </div>
                </div>
              )}

                            {/* BOTTOM SECTION (DARAZ-STYLE "JUST FOR YOU" RECOMMENDED PRODUCTS LIST INSIDE BASKET) */}
              <div className="pt-4 border-t border-slate-200/90 space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div>
                    <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-amber-100 text-amber-900 text-[10px] font-black uppercase tracking-wider">
                      🔥 Daraz-Style Picks
                    </div>
                    <h3 className="text-lg sm:text-2xl font-black text-slate-900 mt-0.5">
                      Just For You • Fresh Farm Harvests
                    </h3>
                    <p className="text-xs text-slate-500">
                      Tap <strong>+ Add to Basket</strong> on any item below to include it in your current order
                    </p>
                  </div>

                  {/* Category Filter Pills Inside Basket Recommendations */}
                  <div className="flex overflow-x-auto max-w-full gap-1 bg-white p-1 rounded-xl border border-slate-200/80 no-scrollbar">
                    {[
                      { id: "ALL", label: "All Picks" },
                      { id: "VEGETABLES", label: "🥬 Veg" },
                      { id: "FRUITS", label: "🍎 Fruits" },
                      { id: "GRAINS", label: "🌾 Grains" },
                      { id: "SPICES", label: "🌶️ Spices" },
                      { id: "DAIRY", label: "🍯 Dairy" },
                    ].map((cat) => (
                      <button
                        key={cat.id}
                        type="button"
                        onClick={() => setBasketRecCategory(cat.id)}
                        className={`px-2.5 py-1.5 rounded-lg text-[11px] font-extrabold whitespace-nowrap transition cursor-pointer ${
                          basketRecCategory === cat.id
                            ? "bg-[#14532D] text-white shadow-2xs"
                            : "text-slate-600 hover:bg-slate-100"
                        }`}
                      >
                        {cat.label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Daraz 2-Column Mobile / 4-Column Desktop Product Grid */}
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3 sm:gap-4">
                  {recommendedProducts.slice(0, 12).map((p) => {
                    const imgUrl = getProductImage(p);
                    const stockNum = Number(p.stock_quantity || 0);
                    const inCartItem = basket.find((item) => item.id === p.id);
                    const qtyInBasket = inCartItem ? inCartItem.qty : 0;
                    const hasDisc = Number(p.actual_price) > Number(p.price);
                    const discPct = hasDisc
                      ? p.discount_pct ||
                        Math.round(
                          ((Number(p.actual_price) - Number(p.price)) / Number(p.actual_price)) *
                            100
                        )
                      : 0;

                    return (
                      <div
                        key={p.id}
                        className="bg-white rounded-2xl p-2.5 sm:p-3 border border-slate-200/90 shadow-2xs hover:shadow-md transition flex flex-col justify-between group"
                      >
                        <div>
                          <div
                            onClick={() => {
                              setQuickViewProduct(p);
                              setQuickViewQty(1);
                              setBasketDrawerOpen(false);
                            }}
                            className="relative h-32 sm:h-40 rounded-xl overflow-hidden bg-slate-100 mb-2.5 cursor-pointer"
                          >
                            <img
                              src={imgUrl}
                              alt={p.name}
                              loading="lazy"
                              onError={(e) => {
                                e.currentTarget.onerror = null;
                                e.currentTarget.src = getFallbackProductImage(p);
                              }}
                              className="w-full h-full object-cover group-hover:scale-105 transition duration-300"
                            />
                            <span className="absolute top-2 left-2 px-2 py-0.5 rounded-full bg-white/95 text-slate-800 text-[9px] font-bold shadow-2xs truncate max-w-[75%]">
                              📍 {p.origin_location || "Nepal Farm"}
                            </span>
                            {hasDisc && (
                              <span className="absolute top-2 right-2 px-1.5 py-0.5 rounded-md bg-amber-400 text-slate-950 text-[9px] font-black shadow-2xs">
                                -{discPct}%
                              </span>
                            )}
                            {qtyInBasket > 0 && (
                              <span className="absolute bottom-2 left-2 px-2 py-0.5 rounded-full bg-[#14532D] text-amber-300 text-[9px] font-black shadow-2xs">
                                ✓ {qtyInBasket} {p.unit} in Basket
                              </span>
                            )}
                          </div>

                          <div className="px-0.5 space-y-1">
                            <h4
                              onClick={() => {
                                setQuickViewProduct(p);
                                setQuickViewQty(1);
                                setBasketDrawerOpen(false);
                              }}
                              className="font-extrabold text-xs sm:text-sm text-slate-900 group-hover:text-[#14532D] line-clamp-1 cursor-pointer"
                            >
                              {p.name}
                            </h4>
                            <p className="text-[10px] text-slate-500 line-clamp-1">
                              {p.description}
                            </p>
                            <div className="pt-0.5 flex items-baseline gap-1.5">
                              <span className="text-sm sm:text-base font-black text-[#14532D]">
                                रु {p.price}
                              </span>
                              <span className="text-[10px] text-slate-500">/{p.unit}</span>
                              {hasDisc && (
                                <span className="text-[10px] text-slate-400 line-through font-semibold">
                                  रु {p.actual_price}
                                </span>
                              )}
                            </div>
                          </div>
                        </div>

                        <div className="mt-2.5 pt-2 border-t border-slate-100">
                          {qtyInBasket > 0 ? (
                            <div className="flex items-center justify-between bg-emerald-50 border border-emerald-300 rounded-xl p-1">
                              <button
                                type="button"
                                onClick={() => handleUpdateBasketQty(p.id, -1)}
                                className="w-7 h-7 rounded-lg bg-white hover:bg-slate-100 text-slate-800 font-black text-xs flex items-center justify-center shadow-2xs cursor-pointer"
                              >
                                <Minus className="w-3 h-3" />
                              </button>
                              <span className="text-[11px] font-black text-[#14532D]">
                                {qtyInBasket} {p.unit}
                              </span>
                              <button
                                type="button"
                                onClick={() => handleAddToBasket(p, 1, false)}
                                className="w-7 h-7 rounded-lg bg-[#14532D] hover:bg-[#1B4332] text-white font-black text-xs flex items-center justify-center shadow-2xs cursor-pointer"
                              >
                                <Plus className="w-3 h-3" />
                              </button>
                            </div>
                          ) : (
                            <button
                              type="button"
                              disabled={stockNum <= 0}
                              onClick={() => handleAddToBasket(p, 1, false)}
                              className="w-full py-2 px-3 rounded-xl bg-[#14532D] hover:bg-[#1B4332] disabled:bg-slate-200 text-white disabled:text-slate-400 text-[11px] font-extrabold flex items-center justify-center gap-1.5 transition cursor-pointer"
                            >
                              <Plus className="w-3.5 h-3.5 text-amber-400" />
                              <span>{stockNum > 0 ? "Add to Basket" : "Sold Out"}</span>
                            </button>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>
        );
      })()}

      {/* AUTH POPUP MODAL FOR VISITORS */}
      {authModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <AuthView
            initialTab={authModalTab}
            onAuthSuccess={(u) => {
              setUser(u);
              if (u?.phone_number) setCheckoutPhone(u.phone_number);
              if (u?.location) setCheckoutAddress(u.location);
              setProfileForm({
                full_name: u?.full_name || "",
                phone_number: u?.phone_number || "",
                location: u?.location || "",
              });
              setAuthModalOpen(false);
              showToast(`Welcome, ${u.full_name}!`);
            }}
            onCancel={() => setAuthModalOpen(false)}
          />
        </div>
      )}

      {/* MOBILE-RESPONSIVE FLOATING WHATSAPP / MESSENGER LIVE CHAT DRAWER */}
      {chatDrawerOpen && isVerifiedOrAdmin && (
        <div className="fixed inset-x-2 bottom-16 sm:inset-x-auto sm:bottom-5 sm:right-5 z-50 sm:w-[400px] bg-white rounded-3xl shadow-2xl border border-slate-200/90 overflow-hidden flex flex-col h-[72vh] max-h-[520px] min-h-[360px]">
          {/* Messenger Drawer Header */}
          <div className="px-4 py-3 bg-gradient-to-r from-[#0F3822] via-[#14532D] to-[#1B4332] text-white flex items-center justify-between shrink-0">
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="relative shrink-0">
                <div className="w-9 h-9 rounded-full bg-white/15 border border-amber-400/70 flex items-center justify-center text-sm">
                  🌱
                </div>
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 border-2 border-[#14532D] absolute bottom-0 right-0" />
              </div>
              <div className="truncate">
                <p className="font-extrabold text-xs sm:text-sm leading-tight truncate">
                  KrishiMart Admin Messenger
                </p>
                <p className="text-[10px] text-emerald-200">
                  ● Online • Direct Support
                </p>
              </div>
            </div>
            <div className="flex items-center gap-1 shrink-0">
              {messages.length > 0 && (
                <button
                  type="button"
                  onClick={handleClearUserChatForMe}
                  className="p-1.5 rounded-lg hover:bg-white/15 text-emerald-200 hover:text-white transition cursor-pointer"
                  title="Clear chat for me"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              )}
              <button
                type="button"
                onClick={() => setChatDrawerOpen(false)}
                className="p-1.5 rounded-lg hover:bg-white/15 text-emerald-200 hover:text-white transition cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>

          {/* Messenger Drawer Feed */}
          <div
            ref={chatDrawerScrollRef}
            className="flex-1 min-h-0 p-3 overflow-y-auto space-y-2 bg-[#EFEAE2]"
          >
            {messages.length === 0 ? (
              <div className="bg-white/95 rounded-2xl p-5 text-center mt-8 border border-slate-200/80 space-y-1.5 shadow-2xs">
                <p className="font-extrabold text-xs text-slate-800">
                  Namaste {user.full_name}! 👋
                </p>
                <p className="text-[11px] text-slate-500">
                  Message the Admin about produce prices, discounts, or selling your harvest.
                </p>
              </div>
            ) : (
              messages.map((m) => {
                const isUnsent =
                  Boolean(m.is_unsent) || m.message === "🚫 This message was unsent";
                const fromAdmin = Boolean(m.is_from_admin || m.is_admin_reply);
                const isSentByMe = !fromAdmin;
                const displayText = isUnsent
                  ? isSentByMe
                    ? "🚫 You unsent a message"
                    : "🚫 KrishiMart Admin unsent a message"
                  : m.message;

                return (
                  <div
                    key={m.id}
                    className={`flex items-end gap-1.5 group ${
                      fromAdmin ? "justify-start" : "justify-end"
                    }`}
                  >
                    {fromAdmin && (
                      <div className="w-6 h-6 rounded-full bg-[#14532D] text-amber-300 text-[10px] font-bold flex items-center justify-center shrink-0">
                        🌱
                      </div>
                    )}

                    {isSentByMe && (
                      <button
                        type="button"
                        onClick={() => setChatActionMsg(m)}
                        className="p-1 rounded-full bg-white/90 hover:bg-red-50 text-slate-400 hover:text-red-600 border border-slate-200 shadow-2xs transition cursor-pointer mb-0.5 shrink-0"
                        title="Unsend or Delete Options"
                      >
                        <Trash2 className="w-3 h-3" />
                      </button>
                    )}

                    <div
                      className={`max-w-[76%] px-3.5 py-2 rounded-2xl text-xs shadow-2xs ${
                        isUnsent
                          ? "bg-white/80 border border-dashed border-slate-300 text-slate-400 italic"
                          : fromAdmin
                          ? "bg-white border border-slate-100 text-slate-900 rounded-bl-xs"
                          : "bg-[#14532D] text-white rounded-br-xs"
                      }`}
                    >
                      <p className="break-words leading-relaxed">{displayText}</p>
                      <div
                        className={`flex items-center justify-end gap-1 text-[9px] mt-1 ${
                          isUnsent || fromAdmin ? "text-slate-400" : "text-emerald-200"
                        }`}
                      >
                        <span>
                          {new Date(m.created_at).toLocaleTimeString([], {
                            hour: "2-digit",
                            minute: "2-digit",
                          })}
                        </span>
                        {isSentByMe && !isUnsent && (
                          <span className="font-bold">{m.is_read ? "✓✓" : "✓"}</span>
                        )}
                      </div>
                    </div>

                    {fromAdmin && (
                      <button
                        type="button"
                        onClick={() => setChatActionMsg(m)}
                        className="p-1 rounded-full bg-white/90 hover:bg-red-50 text-slate-400 hover:text-red-600 border border-slate-200 shadow-2xs transition cursor-pointer mb-0.5 shrink-0"
                        title="Delete for Me"
                      >
                        <Trash2 className="w-3 h-3" />
                      </button>
                    )}
                  </div>
                );
              })
            )}
          </div>

          {/* Quick-Reply Pills inside Drawer */}
          <div className="px-2.5 py-1.5 bg-white border-t border-slate-200/80 flex items-center gap-1.5 overflow-x-auto no-scrollbar shrink-0">
            {["📦 Order Status", "💰 Discount Request", "🌾 Sell Harvest"].map((chip) => (
              <button
                key={chip}
                type="button"
                onClick={() => setChatInput(chip)}
                className="px-2.5 py-0.5 rounded-full bg-slate-100 hover:bg-emerald-50 border border-slate-200 text-slate-700 text-[10px] font-bold whitespace-nowrap cursor-pointer shrink-0"
              >
                {chip}
              </button>
            ))}
          </div>

          <form
            onSubmit={handleSendUserMessage}
            className="p-2.5 border-t border-slate-200 bg-[#F0F2F5] flex items-center gap-2 shrink-0"
          >
            <input
              type="text"
              placeholder="Type a message..."
              value={chatInput}
              onChange={(e) => setChatInput(e.target.value)}
              className="flex-1 px-3.5 py-2 rounded-full bg-white border border-slate-200 focus:border-[#14532D] text-xs outline-none"
            />
            <button
              type="submit"
              disabled={!chatInput.trim()}
              className="w-8 h-8 bg-[#14532D] hover:bg-[#1B4332] disabled:bg-slate-300 text-white rounded-full flex items-center justify-center cursor-pointer shrink-0"
            >
              <Send className="w-3.5 h-3.5" />
            </button>
          </form>
        </div>
      )}

      {/* FACEBOOK MESSENGER-STYLE MESSAGE DELETE / UNSEND MODAL (USER SIDE) */}
      {/* STRICT PERMISSION: Customer/Farmer can ONLY "Unsend for Everyone" their OWN sent messages! */}
      {chatActionMsg && (() => {
        const isFromAdmin = Boolean(chatActionMsg.is_from_admin || chatActionMsg.is_admin_reply);
        const isMyOwnSentMessage = !isFromAdmin;
        const canUnsendForEveryone =
          isMyOwnSentMessage &&
          !chatActionMsg.is_unsent &&
          chatActionMsg.message !== "🚫 This message was unsent";

        return (
          <div className="fixed inset-0 z-[60] bg-slate-950/60 backdrop-blur-xs flex items-center justify-center p-4">
            <div className="bg-white rounded-3xl max-w-sm w-full p-5 shadow-2xl border border-slate-200 space-y-4">
              <div className="flex items-center justify-between border-b border-slate-100 pb-2.5">
                <h4 className="font-extrabold text-sm text-slate-900">
                  {canUnsendForEveryone
                    ? "Who do you want to remove this message for?"
                    : "Remove message from your chat?"}
                </h4>
                <button
                  type="button"
                  onClick={() => setChatActionMsg(null)}
                  className="p-1 rounded-full hover:bg-slate-100 text-slate-400 cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="p-3 rounded-2xl bg-slate-50 border border-slate-200/80 text-xs text-slate-600 italic line-clamp-2">
                "{chatActionMsg.message}"
              </div>

              <div className="space-y-2">
                {/* ONLY shown if the User sent this message themselves */}
                {canUnsendForEveryone && (
                  <button
                    type="button"
                    onClick={() => handleDeleteMyMessage(chatActionMsg.id, "everyone")}
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
                        Unsends your message for both you and KrishiMart Admin.
                      </p>
                    </div>
                  </button>
                )}

                <button
                  type="button"
                  onClick={() => handleDeleteMyMessage(chatActionMsg.id, "me")}
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
                      Removes this message from your chat screen only.
                    </p>
                  </div>
                </button>
              </div>

              <button
                type="button"
                onClick={() => setChatActionMsg(null)}
                className="w-full py-2.5 rounded-xl border border-slate-200 text-xs font-bold text-slate-600 hover:bg-slate-50 cursor-pointer"
              >
                Cancel
              </button>
            </div>
          </div>
        );
      })()}

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
              ) : (() => {
                const {
                  subtotal,
                  unitPrice,
                  discPct,
                  discAmt,
                  deliveryCharge,
                  distanceKm,
                  isFreeDelivery,
                  netTotal,
                } = getCustomerOrderPricing(activeSlip);
                return (
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
                      <span className="text-slate-500">Quantity & Rate:</span>
                      <span className="font-bold">
                        {activeSlip.quantity} {activeSlip.product_unit || "unit(s)"} (रु {unitPrice.toFixed(2)}/{activeSlip.product_unit || "unit"})
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-500">Order Status:</span>
                      <span className="font-bold text-emerald-700">{activeSlip.status}</span>
                    </div>
                    <div className="border-t border-slate-200 pt-1.5 space-y-1">
                      <div className="flex justify-between text-slate-600">
                        <span>Subtotal Amount:</span>
                        <span className="font-bold">रु {subtotal.toFixed(2)}</span>
                      </div>
                      {discPct > 0 && (
                        <div className="flex justify-between text-amber-700 font-bold">
                          <span>Discount ({discPct}%):</span>
                          <span>- रु {discAmt.toFixed(2)}</span>
                        </div>
                      )}
                      <div className="flex justify-between text-emerald-800 font-bold">
                        <span>
                          Home Delivery{distanceKm ? ` (${distanceKm} km)` : ""}:
                        </span>
                        <span>
                          {isFreeDelivery ? "FREE (रु 0.00)" : `+ रु ${deliveryCharge.toFixed(2)}`}
                        </span>
                      </div>
                      <div className="border-t border-dashed border-slate-300 pt-1 flex justify-between text-xs font-black text-[#14532D]">
                        <span>Total Payable:</span>
                        <span>रु {netTotal.toFixed(2)}</span>
                      </div>
                    </div>
                  </div>
                );
              })()}

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
                    const {
                      subtotal,
                      unitPrice,
                      discPct,
                      discAmt,
                      deliveryCharge,
                      distanceKm,
                      isFreeDelivery,
                      netTotal,
                    } = getCustomerOrderPricing(activeSlip);
                    ctx.fillText(
                      `Customer: ${activeSlip.customer_name || user?.full_name || "Verified Buyer"}`,
                      32,
                      y
                    );
                    y += 26;
                    ctx.fillText(`Produce: ${activeSlip.product_name}`, 32, y);
                    y += 26;
                    ctx.fillText(
                      `Quantity: ${activeSlip.quantity} ${activeSlip.product_unit || "unit(s)"} (रु ${unitPrice.toFixed(2)}/${activeSlip.product_unit || "unit"})`,
                      32,
                      y
                    );
                    y += 26;
                    ctx.fillText(
                      `Address: ${(activeSlip.delivery_address || "").slice(0, 36)}`,
                      32,
                      y
                    );
                    y += 26;
                    ctx.fillText(`Status: ${activeSlip.status}`, 32, y);
                    y += 28;
                    ctx.fillText(`Subtotal Amount: रु ${subtotal.toFixed(2)}`, 32, y);
                    if (discPct > 0) {
                      y += 22;
                      ctx.fillStyle = "#b45309";
                      ctx.font = "bold 12px sans-serif";
                      ctx.fillText(`Discount (${discPct}%): - रु ${discAmt.toFixed(2)}`, 32, y);
                    }
                    y += 22;
                    ctx.fillStyle = "#14532D";
                    ctx.font = "bold 12px sans-serif";
                    ctx.fillText(
                      `Home Delivery${distanceKm ? ` (${distanceKm} km)` : ""}: ${
                        isFreeDelivery ? "FREE (रु 0.00)" : `+ रु ${deliveryCharge.toFixed(2)}`
                      }`,
                      32,
                      y
                    );
                    y += 28;
                    ctx.font = "bold 16px sans-serif";
                    ctx.fillStyle = "#14532D";
                    ctx.fillText(
                      `Total Payable: रु ${netTotal.toFixed(2)}`,
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

      {/* DARAZ-STYLE FLOATING MOBILE MINI-BASKET BAR (VISIBLE WHEN ITEMS ARE IN BASKET) */}
      {totalBasketItems > 0 && !basketDrawerOpen && !quickViewProduct && activeTab !== "admin" && (
        <div className="md:hidden fixed bottom-16 inset-x-3 z-40">
          <button
            type="button"
            onClick={() => setBasketDrawerOpen(true)}
            className="w-full py-3 px-4 rounded-2xl bg-[#14532D] text-white shadow-xl border border-emerald-500/40 flex items-center justify-between cursor-pointer"
          >
            <div className="flex items-center gap-2.5">
              <span className="w-6 h-6 rounded-full bg-amber-400 text-slate-950 font-black text-xs flex items-center justify-center">
                {totalBasketItems}
              </span>
              <div className="text-left">
                <p className="text-xs font-extrabold leading-tight">
                  View Basket • रु {basketTotal.toLocaleString()}
                </p>
                <p className="text-[10px] text-emerald-200">
                  Direct Farm Rate • Tap to Checkout
                </p>
              </div>
            </div>
            <span className="px-3 py-1.5 rounded-xl bg-amber-400 text-slate-950 text-xs font-black flex items-center gap-1">
              Checkout <ArrowRight className="w-3.5 h-3.5" />
            </span>
          </button>
        </div>
      )}

      {/* NATIVE-STYLE MOBILE BOTTOM NAVIGATION BAR (VISIBLE ON PHONES < 768px) */}
      <nav className="md:hidden fixed bottom-0 inset-x-0 z-40 bg-white/95 backdrop-blur-md border-t border-slate-200 px-2 py-1.5 flex items-center justify-around shadow-[0_-4px_20px_rgba(0,0,0,0.06)]">
        <button
          onClick={() => { setQuickViewProduct(null); setActiveTab("home"); }}
          className={`flex flex-col items-center gap-0.5 py-1 px-2 rounded-xl text-[10px] font-bold cursor-pointer ${
            activeTab === "home" ? "text-[#14532D]" : "text-slate-400"
          }`}
        >
          <Home className="w-5 h-5" />
          <span>Home</span>
        </button>

        <button
          onClick={() => { setQuickViewProduct(null); setActiveTab("marketplace"); }}
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
            onClick={() => {
              setQuickViewProduct(null);
              setActiveTab("profile");
            }}
            className={`flex flex-col items-center gap-0.5 py-1 px-2 rounded-xl text-[10px] font-bold cursor-pointer ${
              activeTab === "profile" ? "text-[#14532D]" : "text-slate-400"
            }`}
          >
            <div
              className={`w-5 h-5 rounded-full overflow-hidden flex items-center justify-center bg-emerald-800 text-white text-[10px] font-black border ${
                activeTab === "profile" ? "border-[#14532D] ring-2 ring-emerald-500/30" : "border-slate-300"
              }`}
            >
              {resolveMediaUrl(user.profile_picture, user.id) && !avatarLoadError ? (
                <img
                  src={resolveMediaUrl(user.profile_picture, user.id)}
                  alt={user.full_name}
                  onError={() => setAvatarLoadError(true)}
                  className="w-full h-full object-cover"
                />
              ) : (
                <span>{(user.full_name || "U").charAt(0).toUpperCase()}</span>
              )}
            </div>
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
              <li>📍 Dhangadhi Hub </li>
             <li>
              📞 <a href="tel:+9779703931744" className="hover:text-green-600 transition-colors">
                +977-9703931744
              </a>
              {" / "}
              <a href="tel:+9779766528500" className="hover:text-green-600 transition-colors">
                9766528500
              </a>
            </li>

            <li>
              ✉️ <a href="mailto:support@krishimart.com.np" className="hover:text-green-600 transition-colors">
                support@krishimart.com.np
              </a>
            </li>
              <li>🕒 6:00 AM – 10:00 PM NPT Daily</li>
            </ul>
          </div>
        </div>
      </footer>
    </div>
  );
}