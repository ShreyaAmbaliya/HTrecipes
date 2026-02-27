import React, { useState, useEffect, createContext, useContext, useCallback } from "react";
import "@/App.css";
import { BrowserRouter, Routes, Route, Navigate, useNavigate, useLocation, Link, useParams } from "react-router-dom";
import axios from "axios";
import { Toaster, toast } from "sonner";
import { ChefHat, Utensils, Camera, Clock, Users, Flame, Heart, Plus, LogOut, Menu, X, Home, User, Search, Download, BookOpen, Moon, Sun, Edit, MessageCircle, Trash2, Send, Bell, Settings, Upload, Copy, Crown, UserPlus } from "lucide-react";
import * as familiesApi from "./api/families";
import jsPDF from "jspdf";
import { Button } from "./components/ui/button";
import { Input } from "./components/ui/input";
import { Label } from "./components/ui/label";
import { Textarea } from "./components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "./components/ui/select";
import { Badge } from "./components/ui/badge";
import { Card, CardContent } from "./components/ui/card";
import { Checkbox } from "./components/ui/checkbox";
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogCancel,
} from "./components/ui/alert-dialog";

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL || "";
const API = `${BACKEND_URL}/api`;

// Sanitize string for safe JSON: strip control chars, normalize line endings, ensure string
function sanitizeForJson(value) {
  if (value == null || value === "") return value === "" ? "" : null;
  const s = String(value)
    .replace(/\r\n/g, "\n")
    .replace(/\r/g, "\n")
    .replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, "");
  return s;
}

const isValidEmail = (value) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test((value || "").trim());

// Resize/compress a data URL image to reduce payload size and avoid truncation
function compressDataUrl(dataUrl, maxWidth = 1200, quality = 0.8) {
  return new Promise((resolve) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => {
      const w = img.width;
      const h = img.height;
      const scale = w > maxWidth ? maxWidth / w : 1;
      const cw = Math.round(w * scale);
      const ch = Math.round(h * scale);
      const canvas = document.createElement("canvas");
      canvas.width = cw;
      canvas.height = ch;
      const ctx = canvas.getContext("2d");
      ctx.drawImage(img, 0, 0, cw, ch);
      try {
        resolve(canvas.toDataURL("image/jpeg", quality));
      } catch {
        resolve(dataUrl);
      }
    };
    img.onerror = () => resolve(dataUrl);
    img.src = dataUrl;
  });
}

async function compressPhotoList(photos) {
  if (!Array.isArray(photos) || photos.length === 0) return [];
  const out = [];
  for (const p of photos) {
    if (typeof p !== "string") continue;
    out.push(p.startsWith("data:") ? await compressDataUrl(p) : p);
  }
  return out;
}

// Theme Context
const ThemeContext = createContext(null);

export const useTheme = () => useContext(ThemeContext);

const ThemeProvider = ({ children }) => {
  const [isDark, setIsDark] = useState(() => {
    const saved = localStorage.getItem("theme");
    return saved === "dark";
  });

  useEffect(() => {
    if (isDark) {
      document.documentElement.classList.add("dark");
      localStorage.setItem("theme", "dark");
    } else {
      document.documentElement.classList.remove("dark");
      localStorage.setItem("theme", "light");
    }
  }, [isDark]);

  const toggleTheme = () => setIsDark(!isDark);

  return (
    <ThemeContext.Provider value={{ isDark, toggleTheme }}>
      {children}
    </ThemeContext.Provider>
  );
};

// Auth Context
const AuthContext = createContext(null);

export const useAuth = () => useContext(AuthContext);

const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(localStorage.getItem("token"));
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchUser = async () => {
      if (token) {
        try {
          const response = await axios.get(`${API}/auth/me`, {
            headers: { Authorization: `Bearer ${token}` },
          });
          setUser(response.data);
        } catch (error) {
          localStorage.removeItem("token");
          setToken(null);
        }
      }
      setLoading(false);
    };
    fetchUser();
  }, [token]);

  const login = (newToken, userData) => {
    localStorage.setItem("token", newToken);
    setToken(newToken);
    setUser(userData);
  };

  const logout = () => {
    localStorage.removeItem("token");
    setToken(null);
    setUser(null);
  };

  const updateUser = (updatedData) => {
    setUser(prev => ({ ...prev, ...updatedData }));
  };

  // Get display name (nickname or name)
  const getDisplayName = (userData = user) => {
    return userData?.nickname || userData?.name || "User";
  };

  return (
    <AuthContext.Provider value={{ user, token, login, logout, loading, updateUser, getDisplayName }}>
      {children}
    </AuthContext.Provider>
  );
};

// Protected Route
const ProtectedRoute = ({ children }) => {
  const { user, loading } = useAuth();
  
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="animate-spin rounded-full h-12 w-12 border-4 border-primary border-t-transparent"></div>
      </div>
    );
  }
  
  if (!user) {
    return <Navigate to="/login" replace />;
  }
  
  return children;
};

// Family Logo Component — app-logo (light) / app-logo-white (dark)
const FamilyLogo = ({ size = "md", showText = true }) => {
  const { isDark } = useTheme();
  const sizes = {
    sm: { container: "w-10 h-10", text: "text-lg" },
    md: { container: "w-12 h-12", text: "text-xl" },
    lg: { container: "w-16 h-16", text: "text-2xl" },
    xl: { container: "w-24 h-24", text: "text-3xl" }
  };
  const s = sizes[size];
  const logoSrc = isDark
    ? `${process.env.PUBLIC_URL || ""}/app-logo-white.png`
    : `${process.env.PUBLIC_URL || ""}/app-logo.png`;

  return (
    <div className="flex items-center gap-3">
      <div className={`${s.container} relative flex shrink-0`}>
        <img
          src={logoSrc}
          alt="Legacy Table"
          className="w-full h-full object-contain"
        />
      </div>
      {showText && (
        <div className="flex flex-col">
          <span style={{ fontFamily: "'Dancing Script', cursive" }} className={`${s.text} font-semibold text-foreground leading-tight`}>Legacy Table</span>
          <span className="text-xs uppercase tracking-widest text-muted-foreground font-medium">Family Recipes</span>
        </div>
      )}
    </div>
  );
};

// Navigation Component
const Navigation = () => {
  const { user, logout, getDisplayName, token } = useAuth();
  const { isDark, toggleTheme } = useTheme();
  const navigate = useNavigate();
  const location = useLocation();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [showNotifications, setShowNotifications] = useState(false);

  useEffect(() => {
    if (user && token) {
      fetchUnreadCount();
      // Poll for new notifications every 30 seconds
      const interval = setInterval(fetchUnreadCount, 30000);
      return () => clearInterval(interval);
    }
  }, [user, token]);

  const fetchUnreadCount = async () => {
    try {
      const response = await axios.get(`${API}/notifications/unread-count`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setUnreadCount(response.data.count);
    } catch (error) {
      console.error("Failed to fetch notification count");
    }
  };

  const fetchNotifications = async () => {
    try {
      const response = await axios.get(`${API}/notifications`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setNotifications(response.data);
    } catch (error) {
      console.error("Failed to fetch notifications");
    }
  };

  const handleNotificationClick = async (notification) => {
    // Mark as read
    if (!notification.is_read) {
      try {
        await axios.put(`${API}/notifications/${notification.id}/read`, {}, {
          headers: { Authorization: `Bearer ${token}` },
        });
        setUnreadCount(prev => Math.max(0, prev - 1));
        setNotifications(prev => 
          prev.map(n => n.id === notification.id ? { ...n, is_read: true } : n)
        );
      } catch (error) {
        console.error("Failed to mark notification as read");
      }
    }
    
    // Navigate to recipe if applicable
    if (notification.recipe_id) {
      navigate(`/recipe/${notification.recipe_id}`);
      setShowNotifications(false);
    }
  };

  const markAllAsRead = async () => {
    try {
      await axios.put(`${API}/notifications/read-all`, {}, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setUnreadCount(0);
      setNotifications(prev => prev.map(n => ({ ...n, is_read: true })));
    } catch (error) {
      console.error("Failed to mark all as read");
    }
  };

  const toggleNotifications = () => {
    if (!showNotifications) {
      fetchNotifications();
    }
    setShowNotifications(!showNotifications);
  };

  const handleLogout = () => {
    logout();
    navigate("/login");
    toast.success("Logged out successfully");
  };

  if (!user) return null;

  return (
    <>
      <nav className="sticky top-0 z-30 bg-card/80 backdrop-blur-md border-b border-border/50" data-testid="navigation">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <Link to="/" className="flex items-center gap-2" data-testid="nav-logo">
              <FamilyLogo size="sm" showText={false} />
              <span className="font-serif text-xl font-semibold text-foreground hidden sm:block">Legacy Table</span>
            </Link>

            {/* Desktop Nav */}
            <div className="hidden md:flex items-center gap-6">
              <Link 
                to="/" 
                className={`nav-link flex items-center gap-2 text-sm font-medium ${location.pathname === '/' ? 'text-primary' : 'text-muted-foreground hover:text-foreground'}`}
                data-testid="nav-home"
              >
                <Home className="w-4 h-4" />
                Home
              </Link>
              <Link 
                to="/add-recipe" 
                className={`nav-link flex items-center gap-2 text-sm font-medium ${location.pathname === '/add-recipe' ? 'text-primary' : 'text-muted-foreground hover:text-foreground'}`}
                data-testid="nav-add-recipe"
              >
                <Plus className="w-4 h-4" />
                Add Recipe
              </Link>
              <Link 
                to="/profile" 
                className={`nav-link flex items-center gap-2 text-sm font-medium ${location.pathname === '/profile' ? 'text-primary' : 'text-muted-foreground hover:text-foreground'}`}
                data-testid="nav-profile"
              >
                <User className="w-4 h-4" />
                My Recipes
              </Link>
              <Link 
                to="/cookbook" 
                className={`nav-link flex items-center gap-2 text-sm font-medium ${location.pathname === '/cookbook' ? 'text-primary' : 'text-muted-foreground hover:text-foreground'}`}
                data-testid="nav-cookbook"
              >
                <BookOpen className="w-4 h-4" />
                Family Cookbook
              </Link>
              <Link 
                to="/family" 
                className={`nav-link flex items-center gap-2 text-sm font-medium ${location.pathname === '/family' ? 'text-primary' : 'text-muted-foreground hover:text-foreground'}`}
                data-testid="nav-family"
              >
                <Users className="w-4 h-4" />
                Family
              </Link>
            </div>

            <div className="hidden md:flex items-center gap-3">
              {/* Notifications */}
              <div className="relative">
                <button
                  onClick={toggleNotifications}
                  className="p-2 rounded-full hover:bg-muted transition-colors relative"
                  data-testid="notifications-btn"
                  aria-label="Notifications"
                >
                  <Bell className="w-5 h-5 text-muted-foreground" />
                  {unreadCount > 0 && (
                    <span className="absolute -top-1 -right-1 w-5 h-5 bg-primary text-primary-foreground text-xs rounded-full flex items-center justify-center font-semibold">
                      {unreadCount > 9 ? '9+' : unreadCount}
                    </span>
                  )}
                </button>
                
                {/* Notifications Dropdown */}
                {showNotifications && (
                  <div className="absolute right-0 top-12 w-80 bg-card border border-border rounded-xl shadow-lg z-50 overflow-hidden" data-testid="notifications-dropdown">
                    <div className="p-3 border-b border-border flex items-center justify-between">
                      <h3 className="font-semibold">Notifications</h3>
                      {unreadCount > 0 && (
                        <button onClick={markAllAsRead} className="text-xs text-primary hover:underline">
                          Mark all as read
                        </button>
                      )}
                    </div>
                    <div className="max-h-80 overflow-y-auto">
                      {notifications.length === 0 ? (
                        <p className="p-4 text-center text-muted-foreground text-sm">No notifications yet</p>
                      ) : (
                        notifications.map(notification => (
                          <button
                            key={notification.id}
                            onClick={() => handleNotificationClick(notification)}
                            className={`w-full p-3 text-left hover:bg-muted/50 transition-colors border-b border-border/50 last:border-0 ${
                              !notification.is_read ? 'bg-primary/5' : ''
                            }`}
                          >
                            <p className={`text-sm ${!notification.is_read ? 'font-medium' : ''}`}>
                              {notification.message}
                            </p>
                            <p className="text-xs text-muted-foreground mt-1">
                              {new Date(notification.created_at).toLocaleDateString()}
                            </p>
                          </button>
                        ))
                      )}
                    </div>
                  </div>
                )}
              </div>

              <button
                onClick={toggleTheme}
                className="p-2 rounded-full hover:bg-muted transition-colors"
                data-testid="theme-toggle"
                aria-label="Toggle dark mode"
              >
                {isDark ? <Sun className="w-5 h-5 text-accent" /> : <Moon className="w-5 h-5 text-muted-foreground" />}
              </button>

              {/* User Avatar & Settings */}
              <div className="flex items-center gap-2">
                {user?.role && (
                  <span 
                    className="text-xs font-medium px-2 py-0.5 rounded-full bg-primary/10 text-primary capitalize"
                    data-testid="nav-role-badge"
                    title={user.role === "keeper" ? "Family keeper" : "Family member"}
                  >
                    {user.role}
                  </span>
                )}
                <Link to="/settings" className="flex items-center gap-2 hover:opacity-80 transition-opacity" data-testid="nav-settings">
                  {user.avatar ? (
                    <img src={user.avatar} alt={getDisplayName()} className="w-8 h-8 rounded-full object-cover border-2 border-border" />
                  ) : (
                    <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
                      <span className="text-sm font-semibold text-primary">{getDisplayName().charAt(0).toUpperCase()}</span>
                    </div>
                  )}
                  <span className="text-sm font-medium text-foreground">{getDisplayName()}</span>
                </Link>
              </div>

              <Button 
                variant="ghost" 
                size="sm" 
                onClick={handleLogout}
                className="text-muted-foreground hover:text-foreground"
                data-testid="logout-btn"
              >
                <LogOut className="w-4 h-4" />
              </Button>
            </div>

            {/* Mobile menu button */}
            <button 
              className="md:hidden p-2 rounded-lg hover:bg-muted"
              onClick={() => setMobileMenuOpen(true)}
              data-testid="mobile-menu-btn"
            >
              <Menu className="w-6 h-6" />
            </button>
          </div>
        </div>
      </nav>

      {/* Mobile Menu Overlay */}
      <div 
        className={`mobile-menu-overlay ${mobileMenuOpen ? 'open' : ''}`}
        onClick={() => setMobileMenuOpen(false)}
      />

      {/* Mobile Menu */}
      <div className={`mobile-menu ${mobileMenuOpen ? 'open' : ''} bg-card`} data-testid="mobile-menu">
        <div className="p-4 border-b border-border">
          <div className="flex items-center justify-between">
            <span className="font-serif text-lg font-semibold">Menu</span>
            <button onClick={() => setMobileMenuOpen(false)} className="p-2 hover:bg-muted rounded-lg">
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>
        <div className="p-4 space-y-2">
          <Link 
            to="/" 
            onClick={() => setMobileMenuOpen(false)}
            className="flex items-center gap-3 p-3 rounded-lg hover:bg-muted"
          >
            <Home className="w-5 h-5 text-primary" />
            <span className="font-medium">Home</span>
          </Link>
          <Link 
            to="/add-recipe" 
            onClick={() => setMobileMenuOpen(false)}
            className="flex items-center gap-3 p-3 rounded-lg hover:bg-muted"
          >
            <Plus className="w-5 h-5 text-primary" />
            <span className="font-medium">Add Recipe</span>
          </Link>
          <Link 
            to="/profile" 
            onClick={() => setMobileMenuOpen(false)}
            className="flex items-center gap-3 p-3 rounded-lg hover:bg-muted"
          >
            <User className="w-5 h-5 text-primary" />
            <span className="font-medium">My Recipes</span>
          </Link>
          <Link 
            to="/cookbook" 
            onClick={() => setMobileMenuOpen(false)}
            className="flex items-center gap-3 p-3 rounded-lg hover:bg-muted"
          >
            <BookOpen className="w-5 h-5 text-primary" />
            <span className="font-medium">Family Cookbook</span>
          </Link>
          <Link 
            to="/family" 
            onClick={() => setMobileMenuOpen(false)}
            className="flex items-center gap-3 p-3 rounded-lg hover:bg-muted"
            data-testid="mobile-nav-family"
          >
            <Users className="w-5 h-5 text-primary" />
            <span className="font-medium">Family</span>
          </Link>
          <Link 
            to="/settings" 
            onClick={() => setMobileMenuOpen(false)}
            className="flex items-center gap-3 p-3 rounded-lg hover:bg-muted"
          >
            <Settings className="w-5 h-5 text-primary" />
            <span className="font-medium">Profile Settings</span>
          </Link>
          <div className="pt-4 border-t border-border mt-4">
            <div className="flex items-center gap-3 px-3 py-2">
              {user.avatar ? (
                <img src={user.avatar} alt={getDisplayName()} className="w-10 h-10 rounded-full object-cover border-2 border-border" />
              ) : (
                <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                  <span className="text-lg font-semibold text-primary">{getDisplayName().charAt(0).toUpperCase()}</span>
                </div>
              )}
              <div>
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="font-medium">{getDisplayName()}</span>
                  {user?.role && (
                    <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-primary/10 text-primary capitalize">
                      {user.role}
                    </span>
                  )}
                </div>
                <div className="text-xs text-muted-foreground">{user.email}</div>
              </div>
            </div>
            {unreadCount > 0 && (
              <Link 
                to="/" 
                onClick={() => { toggleNotifications(); setMobileMenuOpen(false); }}
                className="flex items-center gap-3 p-3 rounded-lg hover:bg-muted"
              >
                <Bell className="w-5 h-5 text-primary" />
                <span className="font-medium">Notifications</span>
                <span className="ml-auto bg-primary text-primary-foreground text-xs rounded-full px-2 py-0.5">{unreadCount}</span>
              </Link>
            )}
            <button 
              onClick={toggleTheme}
              className="flex items-center gap-3 p-3 rounded-lg hover:bg-muted w-full text-left"
            >
              {isDark ? <Sun className="w-5 h-5 text-accent" /> : <Moon className="w-5 h-5 text-muted-foreground" />}
              <span className="font-medium">{isDark ? "Light Mode" : "Dark Mode"}</span>
            </button>
            <button 
              onClick={() => { handleLogout(); setMobileMenuOpen(false); }}
              className="flex items-center gap-3 p-3 rounded-lg hover:bg-muted w-full text-left text-destructive"
            >
              <LogOut className="w-5 h-5" />
              <span className="font-medium">Logout</span>
            </button>
          </div>
        </div>
      </div>
    </>
  );
};

// Login Page
const LoginPage = () => {
  const [isLogin, setIsLogin] = useState(true);
  const [formData, setFormData] = useState({ name: "", email: "", password: "" });
  const [loading, setLoading] = useState(false);
  const { login, user } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (user) navigate("/");
  }, [user, navigate]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const endpoint = isLogin ? "/auth/login" : "/auth/register";
      const payload = isLogin ? { email: formData.email, password: formData.password } : formData;
      const response = await axios.post(`${API}${endpoint}`, payload);
      login(response.data.token, response.data.user);
      toast.success(isLogin ? "Welcome back!" : "Account created successfully!");
      navigate("/");
    } catch (error) {
      toast.error(error.response?.data?.detail || "An error occurred");
    }
    setLoading(false);
  };

  return (
    <div className="auth-container" data-testid="auth-page">
      <div className="auth-card animate-fade-in">
        <div className="text-center mb-8 flex flex-col items-center">
          <FamilyLogo size="lg" showText={false} />
          <h1 className="font-serif text-3xl font-bold text-foreground mb-2 mt-4">Legacy Table</h1>
          <p className="text-muted-foreground">Share your culinary heritage</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5">
          {!isLogin && (
            <div className="space-y-2">
              <Label htmlFor="name" className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">Name</Label>
              <Input
                id="name"
                type="text"
                placeholder="Your name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                className="rounded-xl border-2 border-border/50 bg-background/50 dark:bg-muted/30 px-4 py-3 text-lg focus:border-primary"
                required={!isLogin}
                data-testid="input-name"
              />
            </div>
          )}
          <div className="space-y-2">
            <Label htmlFor="email" className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">Email</Label>
            <Input
              id="email"
              type="email"
              placeholder="your@email.com"
              value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              className="rounded-xl border-2 border-border/50 bg-background/50 dark:bg-muted/30 px-4 py-3 text-lg focus:border-primary"
              required
              data-testid="input-email"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="password" className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">Password</Label>
            <Input
              id="password"
              type="password"
              placeholder="••••••••"
              value={formData.password}
              onChange={(e) => setFormData({ ...formData, password: e.target.value })}
              className="rounded-xl border-2 border-border/50 bg-background/50 dark:bg-muted/30 px-4 py-3 text-lg focus:border-primary"
              required
              data-testid="input-password"
            />
          </div>
          <Button 
            type="submit" 
            disabled={loading}
            className="w-full rounded-full bg-primary text-primary-foreground hover:bg-primary/90 px-8 py-6 text-lg font-serif transition-transform hover:scale-105 active:scale-95 shadow-lg shadow-primary/20"
            data-testid="auth-submit-btn"
          >
            {loading ? "Please wait..." : isLogin ? "Sign In" : "Create Account"}
          </Button>
        </form>

        <p className="text-center mt-6 text-muted-foreground">
          {isLogin ? "New to the family?" : "Already have an account?"}{" "}
          <button
            type="button"
            onClick={() => setIsLogin(!isLogin)}
            className="text-primary font-semibold hover:underline"
            data-testid="toggle-auth-mode"
          >
            {isLogin ? "Create account" : "Sign in"}
          </button>
        </p>
      </div>
    </div>
  );
};

// Recipe Card Component
const RecipeCard = ({ recipe, onClick }) => {
  const getDifficultyClass = (difficulty) => {
    switch (difficulty?.toLowerCase()) {
      case 'easy': return 'difficulty-easy';
      case 'medium': return 'difficulty-medium';
      case 'hard': return 'difficulty-hard';
      default: return 'difficulty-easy';
    }
  };

  return (
    <Card 
      className="recipe-card cursor-pointer group relative overflow-hidden rounded-2xl bg-card border border-border/50 shadow-sm hover:shadow-md transition-all duration-300"
      onClick={onClick}
      data-testid={`recipe-card-${recipe.id}`}
    >
      <div className="aspect-[4/5] w-full overflow-hidden bg-muted">
        {recipe.photos && recipe.photos.length > 0 ? (
          <img 
            src={recipe.photos[0]} 
            alt={recipe.title}
            className="recipe-image h-full w-full object-cover"
          />
        ) : (
          <div className="h-full w-full flex items-center justify-center bg-muted">
            <Utensils className="w-12 h-12 text-muted-foreground/50" />
          </div>
        )}
      </div>
      <CardContent className="p-5 flex flex-col gap-3">
        <div className="flex items-start justify-between gap-2">
          <h3 className="font-serif text-xl font-semibold text-foreground line-clamp-2">{recipe.title}</h3>
          <span className={`difficulty-badge shrink-0 ${getDifficultyClass(recipe.difficulty)}`}>
            {recipe.difficulty}
          </span>
        </div>
        <div className="flex items-center gap-4 text-sm text-muted-foreground">
          <span className="flex items-center gap-1">
            <Clock className="w-4 h-4" />
            {recipe.cooking_time} min
          </span>
          <span className="flex items-center gap-1">
            <Users className="w-4 h-4" />
            {recipe.servings} servings
          </span>
        </div>
        <div className="flex items-center gap-2 mt-1">
          <Badge variant="secondary" className="rounded-full bg-secondary/10 text-secondary hover:bg-secondary/20">
            {recipe.category}
          </Badge>
        </div>
        <p className="text-sm text-muted-foreground mt-1">by {recipe.author_name}</p>
      </CardContent>
    </Card>
  );
};

// Home Page
const HomePage = () => {
  const [recipes, setRecipes] = useState([]);
  const [categories, setCategories] = useState([]);
  const [selectedCategory, setSelectedCategory] = useState("");
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const navigate = useNavigate();
  const { token, user } = useAuth();

  useEffect(() => {
    fetchRecipes();
    fetchCategories();
  }, [selectedCategory]);

  const fetchRecipes = async () => {
    try {
      const params = selectedCategory ? `?category=${encodeURIComponent(selectedCategory)}` : "";
      const response = await axios.get(`${API}/recipes${params}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setRecipes(response.data);
    } catch (error) {
      toast.error("Failed to load recipes");
    }
    setLoading(false);
  };

  const fetchCategories = async () => {
    try {
      const response = await axios.get(`${API}/categories`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setCategories(response.data);
    } catch (error) {
      console.error("Failed to load categories");
    }
  };

  const filteredRecipes = recipes.filter(r => 
    r.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
    r.author_name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="min-h-screen bg-background" data-testid="home-page">
      <Navigation />
      
      {/* Hero Section */}
      <section className="relative bg-gradient-to-b from-primary/5 to-background py-12 md:py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-3xl mx-auto animate-slide-up">
            <div className="flex justify-center mb-6">
              <FamilyLogo size="xl" showText={false} />
            </div>
            <h1 className="font-serif text-4xl sm:text-5xl lg:text-6xl font-bold text-foreground mb-4">
              Legacy Table<br />Family Recipes
            </h1>
            <p className="text-lg text-muted-foreground mb-8">
              Preserve and share our family's culinary traditions with love
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Button 
                onClick={() => navigate("/add-recipe")}
                className="rounded-full bg-primary text-primary-foreground hover:bg-primary/90 px-8 py-6 text-lg font-serif transition-transform hover:scale-105 active:scale-95 shadow-lg shadow-primary/20"
                data-testid="hero-add-recipe-btn"
              >
                <Plus className="w-5 h-5 mr-2" />
                Share a Recipe
              </Button>
              <Button 
                onClick={() => navigate("/cookbook")}
                variant="outline"
                className="rounded-full border-2 border-primary text-primary hover:bg-primary/5 px-8 py-6 text-lg font-serif"
                data-testid="hero-cookbook-btn"
              >
                <BookOpen className="w-5 h-5 mr-2" />
                Family Cookbook
              </Button>
            </div>
          </div>
        </div>
      </section>

      {/* Filters */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex flex-col md:flex-row gap-4 items-start md:items-center justify-between">
          <div className="relative w-full md:w-72">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
            <Input
              placeholder="Search recipes..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10 rounded-full border-2 border-border/50"
              data-testid="search-input"
            />
          </div>
          <div className="flex gap-2 flex-wrap">
            <button
              onClick={() => setSelectedCategory("")}
              className={`category-tag ${!selectedCategory ? 'active' : ''}`}
              data-testid="category-all"
            >
              All
            </button>
            {categories.map((cat) => (
              <button
                key={cat}
                onClick={() => setSelectedCategory(cat)}
                className={`category-tag ${selectedCategory === cat ? 'active' : ''}`}
                data-testid={`category-${cat.toLowerCase().replace(' ', '-')}`}
              >
                {cat}
              </button>
            ))}
          </div>
        </div>

        {/* Recipe scope copy (family vs legacy) */}
        {!loading && (
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 mt-2">
            <p className="text-sm text-muted-foreground">
              {user?.family_id ? "Showing family recipes." : "Showing legacy recipes."}
            </p>
            {!user?.family_id && (
              <Button
                variant="outline"
                size="sm"
                className="rounded-full text-primary border-primary"
                onClick={() => navigate("/family")}
                data-testid="create-join-family-cta"
              >
                Create a family or join with invite code
              </Button>
            )}
          </div>
        )}
      </section>

      {/* Recipe Grid */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-16">
        {loading ? (
          <div className="recipe-grid">
            {[...Array(6)].map((_, i) => (
              <div key={i} className="rounded-2xl overflow-hidden">
                <div className="skeleton aspect-[4/5]" />
                <div className="p-5 space-y-3">
                  <div className="skeleton h-6 w-3/4" />
                  <div className="skeleton h-4 w-1/2" />
                </div>
              </div>
            ))}
          </div>
        ) : filteredRecipes.length > 0 ? (
          <div className="recipe-grid" data-testid="recipe-grid">
            {filteredRecipes.map((recipe, index) => (
              <div key={recipe.id} className="animate-fade-in" style={{ animationDelay: `${index * 0.1}s` }}>
                <RecipeCard 
                  recipe={recipe} 
                  onClick={() => navigate(`/recipe/${recipe.id}`)}
                />
              </div>
            ))}
          </div>
        ) : (
          <div className="empty-state" data-testid="empty-state">
            <div className="empty-state-icon">
              <Utensils className="w-10 h-10" />
            </div>
            <h3 className="font-serif text-2xl font-semibold mb-2">No recipes yet</h3>
            <p className="text-muted-foreground mb-6">Be the first to share a family recipe!</p>
            <Button 
              onClick={() => navigate("/add-recipe")}
              className="rounded-full bg-primary text-primary-foreground"
              data-testid="empty-add-recipe-btn"
            >
              <Plus className="w-4 h-4 mr-2" />
              Add Recipe
            </Button>
          </div>
        )}
      </section>
    </div>
  );
};

// Add Recipe Page
const AddRecipePage = () => {
  const [formData, setFormData] = useState({
    title: "",
    ingredients: [""],
    instructions: "",
    story: "",
    photos: [],
    cooking_time: 30,
    servings: 4,
    category: "",
    difficulty: "easy"
  });
  const [loading, setLoading] = useState(false);
  const [cameraActive, setCameraActive] = useState(false);
  const videoRef = React.useRef(null);
  const streamRef = React.useRef(null);
  const { token } = useAuth();
  const navigate = useNavigate();

  const categories = ["Main Course", "Appetizer", "Dessert", "Soup", "Salad", "Breakfast", "Snack", "Beverage"];

  const handleAddIngredient = () => {
    setFormData({ ...formData, ingredients: [...formData.ingredients, ""] });
  };

  const handleIngredientChange = (index, value) => {
    const newIngredients = [...formData.ingredients];
    newIngredients[index] = value;
    setFormData({ ...formData, ingredients: newIngredients });
  };

  const handleRemoveIngredient = (index) => {
    const newIngredients = formData.ingredients.filter((_, i) => i !== index);
    setFormData({ ...formData, ingredients: newIngredients });
  };

  const handlePhotoUpload = (e) => {
    const files = Array.from(e.target.files);
    files.forEach(file => {
      const reader = new FileReader();
      reader.onload = (event) => {
        setFormData(prev => ({
          ...prev,
          photos: [...prev.photos, event.target.result]
        }));
      };
      reader.readAsDataURL(file);
    });
  };

  const startCamera = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ 
        video: { facingMode: 'environment' } 
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }
      setCameraActive(true);
    } catch (error) {
      toast.error("Could not access camera");
    }
  };

  const capturePhoto = () => {
    if (videoRef.current) {
      const canvas = document.createElement('canvas');
      canvas.width = videoRef.current.videoWidth;
      canvas.height = videoRef.current.videoHeight;
      const ctx = canvas.getContext('2d');
      ctx.drawImage(videoRef.current, 0, 0);
      const photo = canvas.toDataURL('image/jpeg', 0.8);
      setFormData(prev => ({
        ...prev,
        photos: [...prev.photos, photo]
      }));
      stopCamera();
      toast.success("Photo captured!");
    }
  };

  const stopCamera = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
    }
    setCameraActive(false);
  };

  const removePhoto = (index) => {
    setFormData(prev => ({
      ...prev,
      photos: prev.photos.filter((_, i) => i !== index)
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!formData.title || !formData.instructions || !formData.category) {
      toast.error("Please fill in all required fields");
      return;
    }

    const validIngredients = formData.ingredients.filter(i => i.trim());
    if (validIngredients.length === 0) {
      toast.error("Please add at least one ingredient");
      return;
    }

    setLoading(true);
    try {
      const photos = await compressPhotoList(formData.photos || []);
      const payload = {
        title: sanitizeForJson(formData.title),
        ingredients: validIngredients.map((i) => sanitizeForJson(i)),
        instructions: sanitizeForJson(formData.instructions),
        story: sanitizeForJson(formData.story) || null,
        photos,
        cooking_time: formData.cooking_time ?? 30,
        servings: formData.servings ?? 4,
        category: sanitizeForJson(formData.category),
        difficulty: formData.difficulty || "easy",
      };
      await axios.post(`${API}/recipes`, payload, {
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
      });
      toast.success("Recipe shared with the family!");
      navigate("/");
    } catch (error) {
      const detail = error.response?.data?.detail;
      const msg = Array.isArray(detail)
        ? detail.find((d) => d.msg)?.msg || detail?.[0]?.msg || "Failed to create recipe"
        : detail || "Failed to create recipe";
      toast.error(typeof msg === "string" ? msg : "Failed to create recipe");
    }
    setLoading(false);
  };

  return (
    <div className="min-h-screen bg-background" data-testid="add-recipe-page">
      <Navigation />
      
      {/* Camera Overlay */}
      {cameraActive && (
        <div className="photo-capture-overlay" data-testid="camera-overlay">
          <video 
            ref={videoRef} 
            autoPlay 
            playsInline 
            className="photo-capture-video"
          />
          <div className="flex gap-4 mt-6">
            <Button 
              onClick={capturePhoto}
              className="rounded-full bg-white text-foreground px-8 py-6"
              data-testid="capture-btn"
            >
              <Camera className="w-6 h-6 mr-2" />
              Capture
            </Button>
            <Button 
              onClick={stopCamera}
              variant="outline"
              className="rounded-full border-white text-white px-8 py-6"
              data-testid="cancel-camera-btn"
            >
              Cancel
            </Button>
          </div>
        </div>
      )}

      <div className="max-w-3xl mx-auto px-4 sm:px-6 py-8">
        <div className="mb-8 animate-fade-in">
          <h1 className="font-serif text-3xl md:text-4xl font-bold text-foreground mb-2">Share a Recipe</h1>
          <p className="text-muted-foreground">Add a new dish to the family collection</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-8 animate-slide-up">
          {/* Photos Section */}
          <div className="space-y-4">
            <Label className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">Photos</Label>
            
            <div className="flex gap-3">
              <label className="flex-1">
                <div className="photo-upload-zone flex items-center justify-center gap-3" data-testid="photo-upload-zone">
                  <Camera className="w-6 h-6 text-muted-foreground" />
                  <span className="text-muted-foreground">Upload from gallery</span>
                </div>
                <input 
                  type="file" 
                  accept="image/*" 
                  multiple 
                  className="hidden" 
                  onChange={handlePhotoUpload}
                  data-testid="photo-input"
                />
              </label>
             
            </div>

            {formData.photos.length > 0 && (
              <div className="photo-preview-grid" data-testid="photo-preview-grid">
                {formData.photos.map((photo, index) => (
                  <div key={index} className="photo-preview-item">
                    <img src={photo} alt={`Recipe photo ${index + 1}`} />
                    <button 
                      type="button"
                      onClick={() => removePhoto(index)}
                      className="remove-btn"
                      data-testid={`remove-photo-${index}`}
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Title */}
          <div className="space-y-2">
            <Label htmlFor="title" className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">Recipe Title *</Label>
            <Input
              id="title"
              placeholder="e.g., Grandma's Special Jollof Rice"
              value={formData.title}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              className="rounded-xl border-2 border-border/50 bg-background/50 dark:bg-muted/30 px-4 py-3 text-lg focus:border-primary"
              required
              data-testid="input-title"
            />
          </div>

          {/* Category & Difficulty */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <Label className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">Category *</Label>
              <Select 
                value={formData.category} 
                onValueChange={(value) => setFormData({ ...formData, category: value })}
              >
                <SelectTrigger className="rounded-xl border-2 border-border/50 bg-background/50 dark:bg-muted/30 h-12" data-testid="select-category">
                  <SelectValue placeholder="Select category" />
                </SelectTrigger>
                <SelectContent>
                  {categories.map(cat => (
                    <SelectItem key={cat} value={cat}>{cat}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">Difficulty</Label>
              <Select 
                value={formData.difficulty} 
                onValueChange={(value) => setFormData({ ...formData, difficulty: value })}
              >
                <SelectTrigger className="rounded-xl border-2 border-border/50 bg-background/50 dark:bg-muted/30 h-12" data-testid="select-difficulty">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="easy">Easy</SelectItem>
                  <SelectItem value="medium">Medium</SelectItem>
                  <SelectItem value="hard">Hard</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Time & Servings */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <Label htmlFor="time" className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">Cooking Time (minutes)</Label>
              <Input
                id="time"
                type="number"
                min="1"
                value={formData.cooking_time}
                onChange={(e) => setFormData({ ...formData, cooking_time: parseInt(e.target.value) || 0 })}
                className="rounded-xl border-2 border-border/50 bg-background/50 dark:bg-muted/30 h-12"
                data-testid="input-time"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="servings" className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">Servings</Label>
              <Input
                id="servings"
                type="number"
                min="1"
                value={formData.servings}
                onChange={(e) => setFormData({ ...formData, servings: parseInt(e.target.value) || 0 })}
                className="rounded-xl border-2 border-border/50 bg-background/50 dark:bg-muted/30 h-12"
                data-testid="input-servings"
              />
            </div>
          </div>

          {/* Ingredients */}
          <div className="space-y-4">
            <Label className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">Ingredients *</Label>
            <div className="space-y-3">
              {formData.ingredients.map((ingredient, index) => (
                <div key={index} className="flex gap-2">
                  <Input
                    placeholder={`Ingredient ${index + 1}`}
                    value={ingredient}
                    onChange={(e) => handleIngredientChange(index, e.target.value)}
                    className="rounded-xl border-2 border-border/50 bg-background/50 dark:bg-muted/30"
                    data-testid={`ingredient-${index}`}
                  />
                  {formData.ingredients.length > 1 && (
                    <Button 
                      type="button" 
                      variant="ghost" 
                      onClick={() => handleRemoveIngredient(index)}
                      className="px-3"
                      data-testid={`remove-ingredient-${index}`}
                    >
                      <X className="w-4 h-4" />
                    </Button>
                  )}
                </div>
              ))}
            </div>
            <Button 
              type="button" 
              variant="outline" 
              onClick={handleAddIngredient}
              className="rounded-full"
              data-testid="add-ingredient-btn"
            >
              <Plus className="w-4 h-4 mr-2" />
              Add Ingredient
            </Button>
          </div>

          {/* Instructions */}
          <div className="space-y-2">
            <Label htmlFor="instructions" className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">Instructions *</Label>
            <Textarea
              id="instructions"
              placeholder="Write the step-by-step cooking instructions..."
              value={formData.instructions}
              onChange={(e) => setFormData({ ...formData, instructions: e.target.value })}
              className="rounded-xl border-2 border-border/50 bg-background/50 dark:bg-muted/30 min-h-[200px] resize-y"
              required
              data-testid="input-instructions"
            />
          </div>

          {/* Story (Optional) */}
          <div className="space-y-2">
            <Label htmlFor="story" className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
              The Story Behind This Recipe <span className="text-muted-foreground/60 normal-case">(optional)</span>
            </Label>
            <Textarea
              id="story"
              placeholder="Share the story of this recipe... Where did it come from? Who passed it down? What memories does it hold for your family?"
              value={formData.story}
              onChange={(e) => setFormData({ ...formData, story: e.target.value })}
              className="rounded-xl border-2 border-border/50 bg-background/50 dark:bg-muted/30 min-h-[120px] resize-y"
              data-testid="input-story"
            />
            <p className="text-xs text-muted-foreground">Tell us about the history, traditions, or special memories connected to this dish.</p>
          </div>

          {/* Submit */}
          <div className="flex gap-4 pt-4">
            <Button 
              type="button" 
              variant="outline" 
              onClick={() => navigate("/")}
              className="rounded-full px-8 py-6"
              data-testid="cancel-btn"
            >
              Cancel
            </Button>
            <Button 
              type="submit" 
              disabled={loading}
              className="flex-1 rounded-full bg-primary text-primary-foreground hover:bg-primary/90 px-8 py-6 text-lg font-serif transition-transform hover:scale-105 active:scale-95 shadow-lg shadow-primary/20"
              data-testid="submit-recipe-btn"
            >
              {loading ? "Saving..." : "Share Recipe"}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
};

// Edit Recipe Page
const EditRecipePage = () => {
  const { id } = useParams();
  const [formData, setFormData] = useState({
    title: "",
    ingredients: [""],
    instructions: "",
    story: "",
    photos: [],
    cooking_time: 30,
    servings: 4,
    category: "",
    difficulty: "easy"
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [accessDenied, setAccessDenied] = useState(false);
  const { token, user } = useAuth();
  const navigate = useNavigate();

  const categories = ["Main Course", "Appetizer", "Dessert", "Soup", "Salad", "Breakfast", "Snack", "Beverage"];

  useEffect(() => {
    fetchRecipe();
  }, [id]);

  const fetchRecipe = async () => {
    try {
      const response = await axios.get(`${API}/recipes/${id}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const recipe = response.data;
      setAccessDenied(false);

      // Check if user is the author (or keeper can edit family recipes)
      if (recipe.author_id !== user?.id && user?.role !== "keeper") {
        toast.error("You can only edit your own recipes");
        navigate(`/recipe/${id}`);
        return;
      }

      setFormData({
        title: recipe.title,
        ingredients: recipe.ingredients.length > 0 ? recipe.ingredients : [""],
        instructions: recipe.instructions,
        story: recipe.story || "",
        photos: recipe.photos || [],
        cooking_time: recipe.cooking_time,
        servings: recipe.servings,
        category: recipe.category,
        difficulty: recipe.difficulty
      });
    } catch (error) {
      if (error.response?.status === 403) {
        setAccessDenied(true);
      } else {
        toast.error("Recipe not found");
        navigate("/");
      }
    }
    setLoading(false);
  };

  const handleAddIngredient = () => {
    setFormData({ ...formData, ingredients: [...formData.ingredients, ""] });
  };

  const handleIngredientChange = (index, value) => {
    const newIngredients = [...formData.ingredients];
    newIngredients[index] = value;
    setFormData({ ...formData, ingredients: newIngredients });
  };

  const handleRemoveIngredient = (index) => {
    const newIngredients = formData.ingredients.filter((_, i) => i !== index);
    setFormData({ ...formData, ingredients: newIngredients });
  };

  const handlePhotoUpload = (e) => {
    const files = Array.from(e.target.files);
    files.forEach(file => {
      const reader = new FileReader();
      reader.onload = (event) => {
        setFormData(prev => ({
          ...prev,
          photos: [...prev.photos, event.target.result]
        }));
      };
      reader.readAsDataURL(file);
    });
  };

  const removePhoto = (index) => {
    setFormData(prev => ({
      ...prev,
      photos: prev.photos.filter((_, i) => i !== index)
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!formData.title || !formData.instructions || !formData.category) {
      toast.error("Please fill in all required fields");
      return;
    }

    const validIngredients = formData.ingredients.filter(i => i.trim());
    if (validIngredients.length === 0) {
      toast.error("Please add at least one ingredient");
      return;
    }

    setSaving(true);
    try {
      const photos = await compressPhotoList(formData.photos || []);
      const payload = {
        title: sanitizeForJson(formData.title),
        ingredients: validIngredients.map((i) => sanitizeForJson(i)),
        instructions: sanitizeForJson(formData.instructions),
        story: sanitizeForJson(formData.story) || null,
        photos,
        cooking_time: formData.cooking_time ?? 30,
        servings: formData.servings ?? 4,
        category: sanitizeForJson(formData.category),
        difficulty: formData.difficulty || "easy",
      };
      await axios.put(`${API}/recipes/${id}`, payload, {
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
      });
      toast.success("Recipe updated successfully!");
      navigate(`/recipe/${id}`);
    } catch (error) {
      const detail = error.response?.data?.detail;
      const msg = Array.isArray(detail)
        ? detail.find((d) => d.msg)?.msg || detail?.[0]?.msg || "Failed to update recipe"
        : detail || "Failed to update recipe";
      toast.error(typeof msg === "string" ? msg : "Failed to update recipe");
    }
    setSaving(false);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        <Navigation />
        <div className="max-w-3xl mx-auto px-4 py-12">
          <div className="skeleton h-10 w-1/2 mb-4" />
          <div className="skeleton h-6 w-1/3 mb-8" />
          <div className="space-y-6">
            <div className="skeleton h-40 rounded-xl" />
            <div className="skeleton h-12 rounded-xl" />
            <div className="skeleton h-32 rounded-xl" />
          </div>
        </div>
      </div>
    );
  }

  if (accessDenied) {
    return (
      <div className="min-h-screen bg-background" data-testid="edit-recipe-page">
        <Navigation />
        <div className="max-w-3xl mx-auto px-4 sm:px-6 py-12">
          <div className="text-center py-12 px-4 rounded-2xl bg-muted/50 border border-border">
            <h2 className="font-serif text-2xl font-semibold text-foreground mb-2">You don't have access to this recipe</h2>
            <p className="text-muted-foreground mb-6">Join the family to edit it, or it may be private to another family.</p>
            <div className="flex flex-wrap gap-3 justify-center">
              <Button onClick={() => navigate("/")} className="rounded-full">Go home</Button>
              {!user?.family_id && (
                <Button variant="outline" onClick={() => navigate("/family")} className="rounded-full border-primary text-primary">Join a family</Button>
              )}
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background" data-testid="edit-recipe-page">
      <Navigation />

      <div className="max-w-3xl mx-auto px-4 sm:px-6 py-8">
        <div className="mb-8 animate-fade-in">
          <h1 className="font-serif text-3xl md:text-4xl font-bold text-foreground mb-2">Edit Recipe</h1>
          <p className="text-muted-foreground">Update your family recipe</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-8 animate-slide-up">
          {/* Photos Section */}
          <div className="space-y-4">
            <Label className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">Photos</Label>
            
            <label className="block">
              <div className="photo-upload-zone flex items-center justify-center gap-3" data-testid="edit-photo-upload-zone">
                <Camera className="w-6 h-6 text-muted-foreground" />
                <span className="text-muted-foreground">Add more photos</span>
              </div>
              <input 
                type="file" 
                accept="image/*" 
                multiple 
                className="hidden" 
                onChange={handlePhotoUpload}
                data-testid="edit-photo-input"
              />
            </label>

            {formData.photos.length > 0 && (
              <div className="photo-preview-grid" data-testid="edit-photo-preview-grid">
                {formData.photos.map((photo, index) => (
                  <div key={index} className="photo-preview-item">
                    <img src={photo} alt={`Recipe photo ${index + 1}`} />
                    <button 
                      type="button"
                      onClick={() => removePhoto(index)}
                      className="remove-btn"
                      data-testid={`edit-remove-photo-${index}`}
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Title */}
          <div className="space-y-2">
            <Label htmlFor="title" className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">Recipe Title *</Label>
            <Input
              id="title"
              value={formData.title}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              className="rounded-xl border-2 border-border/50 bg-background/50 dark:bg-muted/30 px-4 py-3 text-lg focus:border-primary"
              required
              data-testid="edit-input-title"
            />
          </div>

          {/* Category & Difficulty */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <Label className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">Category *</Label>
              <Select 
                value={formData.category} 
                onValueChange={(value) => setFormData({ ...formData, category: value })}
              >
                <SelectTrigger className="rounded-xl border-2 border-border/50 bg-background/50 dark:bg-muted/30 h-12" data-testid="edit-select-category">
                  <SelectValue placeholder="Select category" />
                </SelectTrigger>
                <SelectContent>
                  {categories.map(cat => (
                    <SelectItem key={cat} value={cat}>{cat}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">Difficulty</Label>
              <Select 
                value={formData.difficulty} 
                onValueChange={(value) => setFormData({ ...formData, difficulty: value })}
              >
                <SelectTrigger className="rounded-xl border-2 border-border/50 bg-background/50 dark:bg-muted/30 h-12" data-testid="edit-select-difficulty">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="easy">Easy</SelectItem>
                  <SelectItem value="medium">Medium</SelectItem>
                  <SelectItem value="hard">Hard</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Time & Servings */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <Label htmlFor="time" className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">Cooking Time (minutes)</Label>
              <Input
                id="time"
                type="number"
                min="1"
                value={formData.cooking_time}
                onChange={(e) => setFormData({ ...formData, cooking_time: parseInt(e.target.value) || 0 })}
                className="rounded-xl border-2 border-border/50 bg-background/50 dark:bg-muted/30 h-12"
                data-testid="edit-input-time"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="servings" className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">Servings</Label>
              <Input
                id="servings"
                type="number"
                min="1"
                value={formData.servings}
                onChange={(e) => setFormData({ ...formData, servings: parseInt(e.target.value) || 0 })}
                className="rounded-xl border-2 border-border/50 bg-background/50 dark:bg-muted/30 h-12"
                data-testid="edit-input-servings"
              />
            </div>
          </div>

          {/* Ingredients */}
          <div className="space-y-4">
            <Label className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">Ingredients *</Label>
            <div className="space-y-3">
              {formData.ingredients.map((ingredient, index) => (
                <div key={index} className="flex gap-2">
                  <Input
                    placeholder={`Ingredient ${index + 1}`}
                    value={ingredient}
                    onChange={(e) => handleIngredientChange(index, e.target.value)}
                    className="rounded-xl border-2 border-border/50 bg-background/50 dark:bg-muted/30"
                    data-testid={`edit-ingredient-${index}`}
                  />
                  {formData.ingredients.length > 1 && (
                    <Button 
                      type="button" 
                      variant="ghost" 
                      onClick={() => handleRemoveIngredient(index)}
                      className="px-3"
                      data-testid={`edit-remove-ingredient-${index}`}
                    >
                      <X className="w-4 h-4" />
                    </Button>
                  )}
                </div>
              ))}
            </div>
            <Button 
              type="button" 
              variant="outline" 
              onClick={handleAddIngredient}
              className="rounded-full"
              data-testid="edit-add-ingredient-btn"
            >
              <Plus className="w-4 h-4 mr-2" />
              Add Ingredient
            </Button>
          </div>

          {/* Instructions */}
          <div className="space-y-2">
            <Label htmlFor="instructions" className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">Instructions *</Label>
            <Textarea
              id="instructions"
              value={formData.instructions}
              onChange={(e) => setFormData({ ...formData, instructions: e.target.value })}
              className="rounded-xl border-2 border-border/50 bg-background/50 dark:bg-muted/30 min-h-[200px] resize-y"
              required
              data-testid="edit-input-instructions"
            />
          </div>

          {/* Story (Optional) */}
          <div className="space-y-2">
            <Label htmlFor="story" className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
              The Story Behind This Recipe <span className="text-muted-foreground/60 normal-case">(optional)</span>
            </Label>
            <Textarea
              id="story"
              placeholder="Share the story of this recipe..."
              value={formData.story}
              onChange={(e) => setFormData({ ...formData, story: e.target.value })}
              className="rounded-xl border-2 border-border/50 bg-background/50 dark:bg-muted/30 min-h-[120px] resize-y"
              data-testid="edit-input-story"
            />
          </div>

          {/* Submit */}
          <div className="flex gap-4 pt-4">
            <Button 
              type="button" 
              variant="outline" 
              onClick={() => navigate(`/recipe/${id}`)}
              className="rounded-full px-8 py-6"
              data-testid="edit-cancel-btn"
            >
              Cancel
            </Button>
            <Button 
              type="submit" 
              disabled={saving}
              className="flex-1 rounded-full bg-primary text-primary-foreground hover:bg-primary/90 px-8 py-6 text-lg font-serif transition-transform hover:scale-105 active:scale-95 shadow-lg shadow-primary/20"
              data-testid="edit-submit-btn"
            >
              {saving ? "Saving..." : "Update Recipe"}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
};

// Recipe Detail Page
const RecipeDetailPage = () => {
  const [recipe, setRecipe] = useState(null);
  const [loading, setLoading] = useState(true);
  const [currentPhotoIndex, setCurrentPhotoIndex] = useState(0);
  const [comments, setComments] = useState([]);
  const [newComment, setNewComment] = useState("");
  const [submittingComment, setSubmittingComment] = useState(false);
  const [accessDenied, setAccessDenied] = useState(false);
  const { token, user } = useAuth();
  const navigate = useNavigate();
  const { id } = useParams();

  useEffect(() => {
    fetchRecipe();
    fetchComments();
  }, [id]);

  const fetchRecipe = async () => {
    try {
      const response = await axios.get(`${API}/recipes/${id}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setRecipe(response.data);
      setAccessDenied(false);
    } catch (error) {
      if (error.response?.status === 403) {
        setAccessDenied(true);
        setRecipe(null);
      } else {
        toast.error("Recipe not found");
        navigate("/");
      }
    }
    setLoading(false);
  };

  const fetchComments = async () => {
    try {
      const response = await axios.get(`${API}/recipes/${id}/comments`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setComments(response.data);
    } catch (error) {
      console.error("Failed to load comments");
    }
  };

  const handleAddComment = async (e) => {
    e.preventDefault();
    if (!newComment.trim()) return;
    
    setSubmittingComment(true);
    try {
      const response = await axios.post(`${API}/recipes/${id}/comments`, 
        { text: newComment },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setComments([response.data, ...comments]);
      setNewComment("");
      toast.success("Comment added!");
    } catch (error) {
      toast.error("Failed to add comment");
    }
    setSubmittingComment(false);
  };

  const handleDeleteComment = async (commentId) => {
    try {
      await axios.delete(`${API}/comments/${commentId}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setComments(comments.filter(c => c.id !== commentId));
      toast.success("Comment deleted");
    } catch (error) {
      toast.error("Failed to delete comment");
    }
  };

  const handleDelete = async () => {
    if (!window.confirm("Are you sure you want to delete this recipe?")) return;
    
    try {
      await axios.delete(`${API}/recipes/${id}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      toast.success("Recipe deleted");
      navigate("/");
    } catch (error) {
      if (error.response?.status === 403) {
        toast.error("You can't delete this recipe");
      } else {
        toast.error("Failed to delete recipe");
      }
    }
  };

  const canDeleteRecipe = recipe && (user?.id === recipe.author_id || user?.role === "keeper");

  const getDifficultyClass = (difficulty) => {
    switch (difficulty?.toLowerCase()) {
      case 'easy': return 'difficulty-easy';
      case 'medium': return 'difficulty-medium';
      case 'hard': return 'difficulty-hard';
      default: return 'difficulty-easy';
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        <Navigation />
        <div className="max-w-5xl mx-auto px-4 py-12">
          <div className="skeleton h-96 rounded-3xl mb-8" />
          <div className="skeleton h-10 w-2/3 mb-4" />
          <div className="skeleton h-6 w-1/3" />
        </div>
      </div>
    );
  }

  if (accessDenied) {
    return (
      <div className="min-h-screen bg-background" data-testid="recipe-detail-page">
        <Navigation />
        <div className="max-w-5xl mx-auto px-4 sm:px-6 py-12">
          <div className="text-center py-12 px-4 rounded-2xl bg-muted/50 border border-border">
            <h2 className="font-serif text-2xl font-semibold text-foreground mb-2">You don't have access to this recipe</h2>
            <p className="text-muted-foreground mb-6">Join the family to see it, or it may be private to another family.</p>
            <div className="flex flex-wrap gap-3 justify-center">
              <Button onClick={() => navigate("/")} className="rounded-full" data-testid="recipe-403-go-home">
                Go home
              </Button>
              {!user?.family_id && (
                <Button variant="outline" onClick={() => navigate("/family")} className="rounded-full border-primary text-primary" data-testid="recipe-403-join-family">
                  Join a family
                </Button>
              )}
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (!recipe) return null;

  return (
    <div className="min-h-screen bg-background" data-testid="recipe-detail-page">
      <Navigation />
      
      <div className="max-w-5xl mx-auto px-4 sm:px-6 py-8">
        {/* Photo Gallery */}
        {recipe.photos && recipe.photos.length > 0 && (
          <div className="mb-8 animate-fade-in">
            <div className="aspect-[16/10] rounded-3xl overflow-hidden bg-muted">
              <img 
                src={recipe.photos[currentPhotoIndex]} 
                alt={recipe.title}
                className="w-full h-full object-cover"
                data-testid="recipe-main-photo"
              />
            </div>
            {recipe.photos.length > 1 && (
              <div className="flex gap-2 mt-4 overflow-x-auto pb-2">
                {recipe.photos.map((photo, index) => (
                  <button
                    key={index}
                    onClick={() => setCurrentPhotoIndex(index)}
                    className={`flex-shrink-0 w-20 h-20 rounded-xl overflow-hidden border-2 transition-all ${
                      currentPhotoIndex === index ? 'border-primary' : 'border-transparent'
                    }`}
                    data-testid={`photo-thumb-${index}`}
                  >
                    <img src={photo} alt="" className="w-full h-full object-cover" />
                  </button>
                ))}
              </div>
            )}
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 lg:gap-12">
          {/* Main Content */}
          <div className="lg:col-span-2 animate-slide-up">
            <div className="flex items-start justify-between gap-4 mb-6">
              <div>
                <h1 className="font-serif text-3xl md:text-4xl font-bold text-foreground mb-2" data-testid="recipe-title">
                  {recipe.title}
                </h1>
                <div className="flex items-center gap-4 text-muted-foreground">
                  <span>by {recipe.author_name}</span>
                  <span className={`difficulty-badge ${getDifficultyClass(recipe.difficulty)}`}>
                    {recipe.difficulty}
                  </span>
                </div>
              </div>
              {(user?.id === recipe.author_id || user?.role === "keeper") && (
                <div className="flex gap-2">
                  {user?.id === recipe.author_id && (
                    <Button 
                      variant="outline" 
                      size="sm"
                      onClick={() => navigate(`/recipe/${recipe.id}/edit`)}
                      className="rounded-full"
                      data-testid="edit-recipe-btn"
                    >
                      <Edit className="w-4 h-4 mr-1" />
                      Edit
                    </Button>
                  )}
                  {canDeleteRecipe && (
                    <Button 
                      variant="destructive" 
                      size="sm"
                      onClick={handleDelete}
                      className="rounded-full"
                      data-testid="delete-recipe-btn"
                    >
                      Delete
                    </Button>
                  )}
                </div>
              )}
            </div>

            <div className="prose prose-lg max-w-none">
              <h2 className="font-serif text-2xl font-semibold mb-4">Instructions</h2>
              <div className="text-foreground whitespace-pre-line leading-relaxed" data-testid="recipe-instructions">
                {recipe.instructions}
              </div>
            </div>

            {/* Recipe Story */}
            {recipe.story && (
              <div className="mt-10 p-6 rounded-2xl bg-primary/5 border border-primary/10" data-testid="recipe-story">
                <h2 className="font-serif text-2xl font-semibold mb-4 flex items-center gap-2">
                  <Heart className="w-5 h-5 text-primary" />
                  The Story
                </h2>
                <div className="text-foreground whitespace-pre-line leading-relaxed italic">
                  "{recipe.story}"
                </div>
                <p className="text-sm text-muted-foreground mt-4">— Shared by {recipe.author_name}</p>
              </div>
            )}
          </div>

          {/* Sidebar */}
          <div className="space-y-6 animate-fade-in" style={{ animationDelay: '0.2s' }}>
            {/* Quick Info */}
            <Card className="rounded-2xl border-border/50">
              <CardContent className="p-6 space-y-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                    <Clock className="w-5 h-5 text-primary" />
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Cooking Time</p>
                    <p className="font-semibold">{recipe.cooking_time} minutes</p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-secondary/10 flex items-center justify-center">
                    <Users className="w-5 h-5 text-secondary" />
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Servings</p>
                    <p className="font-semibold">{recipe.servings} people</p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-accent/20 flex items-center justify-center">
                    <Utensils className="w-5 h-5 text-accent-foreground" />
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Category</p>
                    <p className="font-semibold">{recipe.category}</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Ingredients */}
            <Card className="rounded-2xl border-border/50">
              <CardContent className="p-6">
                <h3 className="font-serif text-xl font-semibold mb-4">Ingredients</h3>
                <ul className="space-y-2" data-testid="ingredients-list">
                  {recipe.ingredients.map((ingredient, index) => (
                    <li key={index} className="ingredient-item">
                      <span className="w-2 h-2 rounded-full bg-primary shrink-0" />
                      <span>{ingredient}</span>
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Comments Section */}
        <div className="max-w-3xl mt-12 animate-fade-in" data-testid="comments-section">
          <h2 className="font-serif text-2xl font-semibold mb-6 flex items-center gap-2">
            <MessageCircle className="w-6 h-6 text-primary" />
            Family Comments ({comments.length})
          </h2>
          
          {/* Add Comment Form */}
          <form onSubmit={handleAddComment} className="mb-8">
            <div className="flex gap-3">
              <div className="flex-1">
                <Input
                  placeholder="Share your thoughts about this recipe..."
                  value={newComment}
                  onChange={(e) => setNewComment(e.target.value)}
                  className="rounded-xl border-2 border-border/50 bg-background/50 dark:bg-muted/30"
                  data-testid="comment-input"
                />
              </div>
              <Button 
                type="submit" 
                disabled={submittingComment || !newComment.trim()}
                className="rounded-xl bg-primary text-primary-foreground"
                data-testid="submit-comment-btn"
              >
                <Send className="w-4 h-4" />
              </Button>
            </div>
          </form>

          {/* Comments List */}
          <div className="space-y-4">
            {comments.length === 0 ? (
              <p className="text-muted-foreground text-center py-8">No comments yet. Be the first to share your thoughts!</p>
            ) : (
              comments.map((comment) => (
                <div 
                  key={comment.id} 
                  className="p-4 rounded-xl bg-card border border-border/50"
                  data-testid={`comment-${comment.id}`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <span className="font-semibold text-foreground">{comment.user_name}</span>
                        <span className="text-xs text-muted-foreground">
                          {new Date(comment.created_at).toLocaleDateString('en-US', { 
                            month: 'short', 
                            day: 'numeric',
                            year: 'numeric'
                          })}
                        </span>
                      </div>
                      <p className="text-foreground">{comment.text}</p>
                    </div>
                    {user?.id === comment.user_id && (
                      <button
                        onClick={() => handleDeleteComment(comment.id)}
                        className="p-1 text-muted-foreground hover:text-destructive transition-colors"
                        data-testid={`delete-comment-${comment.id}`}
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

// Family page: Create / Join when no family; Family Settings when in a family
const FamilyPage = () => {
  const { user, token, updateUser } = useAuth();
  const navigate = useNavigate();
  const [family, setFamily] = useState(null);
  const [members, setMembers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [createName, setCreateName] = useState("");
  const [createDescription, setCreateDescription] = useState("");
  const [createSubmitting, setCreateSubmitting] = useState(false);
  const [joinCode, setJoinCode] = useState("");
  const [joinSubmitting, setJoinSubmitting] = useState(false);
  const [editMode, setEditMode] = useState(false);
  const [editName, setEditName] = useState("");
  const [editDescription, setEditDescription] = useState("");
  const [editSubmitting, setEditSubmitting] = useState(false);
  const [actionLoading, setActionLoading] = useState(null); // 'leave' | 'delete' | 'remove-{id}' | 'transfer-{id}'

  const refreshUser = async () => {
    try {
      const res = await axios.get(`${API}/auth/me`, { headers: { Authorization: `Bearer ${token}` } });
      updateUser(res.data);
    } catch {
      toast.error("Failed to refresh profile");
    }
  };

  const fetchFamilyData = useCallback(async () => {
    if (!user?.family_id || !token) return;
    setLoading(true);
    try {
      const [fam, mems] = await Promise.all([
        familiesApi.getFamily(token, user.family_id),
        familiesApi.getFamilyMembers(token, user.family_id),
      ]);
      setFamily(fam);
      setMembers(mems);
      setEditName(fam.name || "");
      setEditDescription(fam.description || "");
    } catch (err) {
      const msg = err.response?.data?.message || err.message || "Failed to load family";
      toast.error(msg);
      setFamily(null);
      setMembers([]);
    } finally {
      setLoading(false);
    }
  }, [user?.family_id, token]);

  useEffect(() => {
    if (!user?.family_id) {
      setLoading(false);
      return;
    }
    fetchFamilyData();
  }, [user?.family_id, fetchFamilyData]);

  const handleCreateFamily = async (e) => {
    e.preventDefault();
    if (!createName.trim()) {
      toast.error("Please enter a family name");
      return;
    }
    setCreateSubmitting(true);
    try {
      await familiesApi.createFamily(token, { name: createName.trim(), description: createDescription.trim() || null });
      toast.success("Family created! You're the Keeper.");
      await refreshUser();
      setCreateName("");
      setCreateDescription("");
    } catch (err) {
      const msg = err.response?.data?.message || err.message || "Failed to create family";
      toast.error(msg);
    } finally {
      setCreateSubmitting(false);
    }
  };

  const handleJoinFamily = async (e) => {
    e.preventDefault();
    if (!joinCode.trim()) {
      toast.error("Please enter an invite code");
      return;
    }
    setJoinSubmitting(true);
    try {
      await familiesApi.joinFamily(token, { invite_code: joinCode.trim() });
      toast.success("You joined the family!");
      await refreshUser();
      setJoinCode("");
    } catch (err) {
      const msg = err.response?.data?.message || err.message || "Invalid or expired invite code";
      toast.error(msg);
    } finally {
      setJoinSubmitting(false);
    }
  };

  const handleCopyInviteCode = () => {
    if (!family?.invite_code) return;
    navigator.clipboard.writeText(family.invite_code);
    toast.success("Invite code copied to clipboard");
  };

  const handleLeaveFamily = async () => {
    if (!user?.family_id || !window.confirm("Are you sure you want to leave this family? You'll lose access to family recipes until you join again.")) return;
    setActionLoading("leave");
    try {
      await familiesApi.leaveFamily(token, user.family_id);
      toast.success("You left the family.");
      await refreshUser();
    } catch (err) {
      const msg = err.response?.data?.message || err.message || "Could not leave family";
      toast.error(msg);
    } finally {
      setActionLoading(null);
    }
  };

  const handleDeleteFamily = async () => {
    if (!user?.family_id || !window.confirm("Permanently delete this family? All members will be removed and family recipes will become legacy. This cannot be undone.")) return;
    setActionLoading("delete");
    try {
      await familiesApi.deleteFamily(token, user.family_id);
      toast.success("Family deleted.");
      await refreshUser();
    } catch (err) {
      const msg = err.response?.data?.message || err.message || "Could not delete family";
      toast.error(msg);
    } finally {
      setActionLoading(null);
    }
  };

  const handleRemoveMember = async (memberId) => {
    if (!user?.family_id || !window.confirm("Remove this member from the family? They will lose access to family recipes.")) return;
    setActionLoading(`remove-${memberId}`);
    try {
      await familiesApi.removeMember(token, user.family_id, memberId);
      toast.success("Member removed.");
      await fetchFamilyData();
    } catch (err) {
      const msg = err.response?.data?.message || err.message || "Could not remove member";
      toast.error(msg);
    } finally {
      setActionLoading(null);
    }
  };

  const handleTransferKeeper = async (newKeeperId) => {
    if (!user?.family_id || !window.confirm("Transfer the Keeper role to this member? You will become a Member and they will manage the family.")) return;
    setActionLoading(`transfer-${newKeeperId}`);
    try {
      await familiesApi.transferKeeper(token, user.family_id, { new_keeper_id: newKeeperId });
      toast.success("Keeper role transferred.");
      await refreshUser();
      await fetchFamilyData();
    } catch (err) {
      const msg = err.response?.data?.message || err.message || "Could not transfer role";
      toast.error(msg);
    } finally {
      setActionLoading(null);
    }
  };

  const handleSaveEdit = async (e) => {
    e.preventDefault();
    if (!user?.family_id) return;
    setEditSubmitting(true);
    try {
      await familiesApi.updateFamily(token, user.family_id, { name: editName.trim(), description: editDescription.trim() || null });
      toast.success("Family updated.");
      setEditMode(false);
      await fetchFamilyData();
    } catch (err) {
      const msg = err.response?.data?.message || err.message || "Failed to update family";
      toast.error(msg);
    } finally {
      setEditSubmitting(false);
    }
  };

  const isKeeper = user?.role === "keeper";
  const getMemberDisplayName = (m) => m.nickname || m.name || m.email || "Member";

  if (!user?.family_id) {
    return (
      <div className="min-h-screen bg-background" data-testid="family-page">
        <Navigation />
        <div className="max-w-2xl mx-auto px-4 sm:px-6 py-8">
          <h1 className="font-serif text-3xl md:text-4xl font-bold text-foreground mb-2">Family</h1>
          <p className="text-muted-foreground mb-8">Create or join a family to share recipes.</p>

          <div className="space-y-6">
            <Card className="rounded-2xl border-border/50">
              <CardContent className="p-8">
                <div className="flex items-center gap-3 mb-6">
                  <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
                    <UserPlus className="w-6 h-6 text-primary" />
                  </div>
                  <h2 className="font-serif text-xl font-semibold">Create a family</h2>
                </div>
                <form onSubmit={handleCreateFamily} className="space-y-4">
                  <div>
                    <Label htmlFor="create-name">Family name</Label>
                    <Input
                      id="create-name"
                      placeholder="e.g. Smith Family"
                      value={createName}
                      onChange={(e) => setCreateName(e.target.value)}
                      className="rounded-xl border-2 border-border/50 bg-background/50 dark:bg-muted/30 mt-1"
                      data-testid="create-family-name"
                    />
                  </div>
                  <div>
                    <Label htmlFor="create-desc">Description (optional)</Label>
                    <Textarea
                      id="create-desc"
                      placeholder="Our family recipe collection"
                      value={createDescription}
                      onChange={(e) => setCreateDescription(e.target.value)}
                      className="rounded-xl border-2 border-border/50 bg-background/50 dark:bg-muted/30 mt-1 min-h-[80px]"
                      data-testid="create-family-description"
                    />
                  </div>
                  <Button type="submit" className="rounded-full" disabled={createSubmitting} data-testid="create-family-btn">
                    {createSubmitting ? "Creating…" : "Create family"}
                  </Button>
                </form>
              </CardContent>
            </Card>

            <Card className="rounded-2xl border-border/50">
              <CardContent className="p-8">
                <div className="flex items-center gap-3 mb-6">
                  <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
                    <Users className="w-6 h-6 text-primary" />
                  </div>
                  <h2 className="font-serif text-xl font-semibold">Join with invite code</h2>
                </div>
                <form onSubmit={handleJoinFamily} className="space-y-4">
                  <div>
                    <Label htmlFor="join-code">Invite code</Label>
                    <Input
                      id="join-code"
                      placeholder="Enter code from your family Keeper"
                      value={joinCode}
                      onChange={(e) => setJoinCode(e.target.value)}
                      className="rounded-xl border-2 border-border/50 bg-background/50 dark:bg-muted/30 mt-1 font-mono"
                      data-testid="join-family-code"
                    />
                  </div>
                  <Button type="submit" variant="outline" className="rounded-full border-2 border-primary text-primary" disabled={joinSubmitting} data-testid="join-family-btn">
                    {joinSubmitting ? "Joining…" : "Join family"}
                  </Button>
                </form>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background" data-testid="family-page">
      <Navigation />
      <div className="max-w-2xl mx-auto px-4 sm:px-6 py-8">
        <h1 className="font-serif text-3xl md:text-4xl font-bold text-foreground mb-2">Family settings</h1>
        <p className="text-muted-foreground mb-8">Manage your family and invite code.</p>

        {loading ? (
          <div className="flex justify-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-4 border-primary border-t-transparent" />
          </div>
        ) : family ? (
          <div className="space-y-6">
            <Card className="rounded-2xl border-border/50">
              <CardContent className="p-6">
                {editMode ? (
                  <form onSubmit={handleSaveEdit} className="space-y-4">
                    <Label>Family name</Label>
                    <Input
                      value={editName}
                      onChange={(e) => setEditName(e.target.value)}
                      className="rounded-xl border-2 border-border/50 bg-background/50 dark:bg-muted/30"
                      data-testid="edit-family-name"
                    />
                    <Label>Description (optional)</Label>
                    <Textarea
                      value={editDescription}
                      onChange={(e) => setEditDescription(e.target.value)}
                      className="rounded-xl border-2 border-border/50 bg-background/50 dark:bg-muted/30 min-h-[80px]"
                      data-testid="edit-family-description"
                    />
                    <div className="flex gap-2">
                      <Button type="submit" disabled={editSubmitting} data-testid="save-family-edit">
                        {editSubmitting ? "Saving…" : "Save"}
                      </Button>
                      <Button type="button" variant="outline" onClick={() => { setEditMode(false); setEditName(family.name); setEditDescription(family.description || ""); }}>
                        Cancel
                      </Button>
                    </div>
                  </form>
                ) : (
                  <>
                    <div className="flex items-center justify-between flex-wrap gap-2">
                      <h2 className="font-serif text-xl font-semibold">{family.name}</h2>
                      {isKeeper && (
                        <Button variant="outline" size="sm" onClick={() => setEditMode(true)} className="rounded-full" data-testid="edit-family-btn">
                          <Edit className="w-4 h-4 mr-1" /> Edit
                        </Button>
                      )}
                    </div>
                    {family.description && <p className="text-muted-foreground text-sm mt-1">{family.description}</p>}
                  </>
                )}
              </CardContent>
            </Card>

            <Card className="rounded-2xl border-border/50">
              <CardContent className="p-6">
                <h3 className="font-semibold mb-2">Invite code</h3>
                <div className="flex items-center gap-2 flex-wrap">
                  <code className="px-3 py-2 rounded-lg bg-muted font-mono text-sm">{family.invite_code}</code>
                  <Button variant="outline" size="sm" onClick={handleCopyInviteCode} className="rounded-full" data-testid="copy-invite-code">
                    <Copy className="w-4 h-4 mr-1" /> Copy
                  </Button>
                </div>
                <p className="text-xs text-muted-foreground mt-2">Share this code so others can join your family.</p>
              </CardContent>
            </Card>

            <Card className="rounded-2xl border-border/50">
              <CardContent className="p-6">
                <h3 className="font-semibold mb-4">Members</h3>
                <ul className="space-y-3">
                  {members.map((m) => (
                    <li key={m.id} className="flex items-center justify-between gap-2 flex-wrap py-2 border-b border-border/50 last:border-0">
                      <div className="flex items-center gap-2">
                        {m.avatar ? (
                          <img src={m.avatar} alt="" className="w-8 h-8 rounded-full object-cover" />
                        ) : (
                          <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-sm font-medium text-primary">
                            {getMemberDisplayName(m).charAt(0).toUpperCase()}
                          </div>
                        )}
                        <span className="font-medium">{getMemberDisplayName(m)}</span>
                        {m.role === "keeper" && <Crown className="w-4 h-4 text-primary" title="Keeper" />}
                        <Badge variant="secondary" className="capitalize text-xs">{m.role}</Badge>
                      </div>
                      {isKeeper && m.id !== user.id && (
                        <div className="flex items-center gap-1">
                          {m.role === "member" && (
                            <Button
                              variant="outline"
                              size="sm"
                              className="rounded-full text-xs"
                              disabled={!!actionLoading}
                              onClick={() => handleTransferKeeper(m.id)}
                              data-testid={`transfer-keeper-${m.id}`}
                            >
                              {actionLoading === `transfer-${m.id}` ? "…" : "Make Keeper"}
                            </Button>
                          )}
                          <Button
                            variant="ghost"
                            size="sm"
                            className="text-destructive hover:text-destructive rounded-full text-xs"
                            disabled={!!actionLoading}
                            onClick={() => handleRemoveMember(m.id)}
                            data-testid={`remove-member-${m.id}`}
                          >
                            {actionLoading === `remove-${m.id}` ? "…" : "Remove"}
                          </Button>
                        </div>
                      )}
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>

            <div className="flex flex-col sm:flex-row gap-3">
              <Button
                variant="outline"
                className="rounded-full border-destructive text-destructive hover:bg-destructive/10"
                disabled={!!actionLoading}
                onClick={handleLeaveFamily}
                data-testid="leave-family-btn"
              >
                {actionLoading === "leave" ? "Leaving…" : "Leave family"}
              </Button>
              {isKeeper && (
                <Button
                  variant="outline"
                  className="rounded-full border-destructive text-destructive hover:bg-destructive/10"
                  disabled={!!actionLoading}
                  onClick={handleDeleteFamily}
                  data-testid="delete-family-btn"
                >
                  {actionLoading === "delete" ? "Deleting…" : "Delete family"}
                </Button>
              )}
            </div>
          </div>
        ) : (
          <Card className="rounded-2xl border-border/50">
            <CardContent className="p-8 text-center text-muted-foreground">
              Could not load family. You may have left or been removed.
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
};

// Settings Page (Profile Management)
const SettingsPage = () => {
  const { user, token, updateUser, getDisplayName } = useAuth();
  const [nickname, setNickname] = useState(user?.nickname || "");
  const [avatar, setAvatar] = useState(user?.avatar || "");
  const [saving, setSaving] = useState(false);
  const navigate = useNavigate();

  const handleAvatarUpload = (e) => {
    const file = e.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        setAvatar(event.target.result);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const response = await axios.put(`${API}/auth/profile`, {
        nickname: nickname.trim() || null,
        avatar: avatar || null
      }, {
        headers: { Authorization: `Bearer ${token}` },
      });
      updateUser(response.data);
      toast.success("Profile updated successfully!");
    } catch (error) {
      toast.error("Failed to update profile");
    }
    setSaving(false);
  };

  return (
    <div className="min-h-screen bg-background" data-testid="settings-page">
      <Navigation />
      
      <div className="max-w-2xl mx-auto px-4 sm:px-6 py-8">
        <div className="mb-8 animate-fade-in">
          <h1 className="font-serif text-3xl md:text-4xl font-bold text-foreground mb-2">Profile Settings</h1>
          <p className="text-muted-foreground">Customize how you appear to the family</p>
        </div>

        <div className="space-y-8 animate-slide-up">
          {/* Avatar Section */}
          <Card className="rounded-2xl border-border/50">
            <CardContent className="p-6">
              <h3 className="font-semibold text-lg mb-4">Profile Picture</h3>
              <div className="flex items-center gap-6">
                <div className="relative">
                  {avatar ? (
                    <img 
                      src={avatar} 
                      alt="Profile" 
                      className="w-24 h-24 rounded-full object-cover border-4 border-border"
                      data-testid="avatar-preview"
                    />
                  ) : (
                    <div className="w-24 h-24 rounded-full bg-primary/10 flex items-center justify-center border-4 border-border">
                      <span className="text-3xl font-bold text-primary">{getDisplayName().charAt(0).toUpperCase()}</span>
                    </div>
                  )}
                  <label className="absolute bottom-0 right-0 w-8 h-8 bg-primary text-primary-foreground rounded-full flex items-center justify-center cursor-pointer hover:bg-primary/90 transition-colors">
                    <Upload className="w-4 h-4" />
                    <input 
                      type="file" 
                      accept="image/*" 
                      className="hidden" 
                      onChange={handleAvatarUpload}
                      data-testid="avatar-input"
                    />
                  </label>
                </div>
                <div className="flex-1">
                  <p className="text-sm text-muted-foreground mb-2">Upload a photo to personalize your profile</p>
                  {avatar && (
                    <Button 
                      variant="outline" 
                      size="sm" 
                      onClick={() => setAvatar("")}
                      className="rounded-full"
                      data-testid="remove-avatar-btn"
                    >
                      Remove photo
                    </Button>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Nickname Section */}
          <Card className="rounded-2xl border-border/50">
            <CardContent className="p-6">
              <h3 className="font-semibold text-lg mb-4">Display Name</h3>
              <div className="space-y-4">
                <div>
                  <Label className="text-sm text-muted-foreground">Full Name</Label>
                  <p className="text-foreground font-medium">{user?.name}</p>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="nickname" className="text-sm text-muted-foreground">Nickname (optional)</Label>
                  <Input
                    id="nickname"
                    placeholder="Enter a nickname..."
                    value={nickname}
                    onChange={(e) => setNickname(e.target.value)}
                    className="rounded-xl border-2 border-border/50 bg-background/50 dark:bg-muted/30 max-w-sm"
                    data-testid="nickname-input"
                  />
                  <p className="text-xs text-muted-foreground">
                    Your nickname will be shown instead of your full name on recipes and comments.
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Family & Role */}
          <Card className="rounded-2xl border-border/50">
            <CardContent className="p-6">
              <h3 className="font-semibold text-lg mb-4">Family & Role</h3>
              <div className="space-y-3">
                {user?.role && (
                  <div>
                    <Label className="text-sm text-muted-foreground">Role</Label>
                    <p className="text-foreground">
                      <span className="inline-flex items-center px-2 py-0.5 rounded-full text-sm font-medium bg-primary/10 text-primary capitalize">
                        {user.role}
                      </span>
                    </p>
                  </div>
                )}
                <div>
                  <Label className="text-sm text-muted-foreground">Family</Label>
                  {user?.family_id ? (
                    <p className="text-foreground flex items-center gap-2 flex-wrap">
                      <span>You're in a family.</span>
                      <Button variant="link" className="p-0 h-auto text-primary font-medium" onClick={() => navigate("/family")} data-testid="settings-family-link">
                        Family settings →
                      </Button>
                    </p>
                  ) : (
                    <p className="text-foreground flex items-center gap-2 flex-wrap">
                      <span>You're not in a family.</span>
                      <Button variant="link" className="p-0 h-auto text-primary font-medium" onClick={() => navigate("/family")} data-testid="settings-join-family-link">
                        Create or join a family →
                      </Button>
                    </p>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Account Info */}
          <Card className="rounded-2xl border-border/50">
            <CardContent className="p-6">
              <h3 className="font-semibold text-lg mb-4">Account Information</h3>
              <div className="space-y-3">
                <div>
                  <Label className="text-sm text-muted-foreground">Email</Label>
                  <p className="text-foreground">{user?.email}</p>
                </div>
                <div>
                  <Label className="text-sm text-muted-foreground">Member Since</Label>
                  <p className="text-foreground">
                    {new Date(user?.created_at).toLocaleDateString('en-US', { 
                      year: 'numeric', 
                      month: 'long', 
                      day: 'numeric' 
                    })}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Save Button */}
          <div className="flex gap-4">
            <Button 
              variant="outline" 
              onClick={() => navigate(-1)}
              className="rounded-full px-6"
              data-testid="settings-cancel-btn"
            >
              Cancel
            </Button>
            <Button 
              onClick={handleSave}
              disabled={saving}
              className="rounded-full bg-primary text-primary-foreground px-8"
              data-testid="settings-save-btn"
            >
              {saving ? "Saving..." : "Save Changes"}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};

// Profile Page (My Recipes)
const ProfilePage = () => {
  const [recipes, setRecipes] = useState([]);
  const [loading, setLoading] = useState(true);
  const { token, user } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    fetchMyRecipes();
  }, []);

  const fetchMyRecipes = async () => {
    try {
      const response = await axios.get(`${API}/recipes?author_id=${user.id}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setRecipes(response.data);
    } catch (error) {
      toast.error("Failed to load your recipes");
    }
    setLoading(false);
  };

  return (
    <div className="min-h-screen bg-background" data-testid="profile-page">
      <Navigation />
      
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8 animate-fade-in">
          <h1 className="font-serif text-3xl md:text-4xl font-bold text-foreground mb-2">My Recipes</h1>
          <p className="text-muted-foreground">Recipes you've shared with the family</p>
        </div>

        {loading ? (
          <div className="recipe-grid">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="rounded-2xl overflow-hidden">
                <div className="skeleton aspect-[4/5]" />
                <div className="p-5 space-y-3">
                  <div className="skeleton h-6 w-3/4" />
                  <div className="skeleton h-4 w-1/2" />
                </div>
              </div>
            ))}
          </div>
        ) : recipes.length > 0 ? (
          <div className="recipe-grid" data-testid="my-recipes-grid">
            {recipes.map((recipe, index) => (
              <div key={recipe.id} className="animate-fade-in" style={{ animationDelay: `${index * 0.1}s` }}>
                <RecipeCard 
                  recipe={recipe} 
                  onClick={() => navigate(`/recipe/${recipe.id}`)}
                />
              </div>
            ))}
          </div>
        ) : (
          <div className="empty-state" data-testid="empty-my-recipes">
            <div className="empty-state-icon">
              <ChefHat className="w-10 h-10" />
            </div>
            <h3 className="font-serif text-2xl font-semibold mb-2">No recipes yet</h3>
            <p className="text-muted-foreground mb-6">Share your first recipe with the family!</p>
            <Button 
              onClick={() => navigate("/add-recipe")}
              className="rounded-full bg-primary text-primary-foreground"
              data-testid="profile-add-recipe-btn"
            >
              <Plus className="w-4 h-4 mr-2" />
              Add Recipe
            </Button>
          </div>
        )}
      </div>
    </div>
  );
};

// Family Cookbook Page with PDF Export
const CookbookPage = () => {
  const [recipes, setRecipes] = useState([]);
  const [selectedRecipes, setSelectedRecipes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const { token } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    fetchAllRecipes();
  }, []);

  const fetchAllRecipes = async () => {
    try {
      const response = await axios.get(`${API}/recipes`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setRecipes(response.data);
    } catch (error) {
      toast.error("Failed to load recipes");
    }
    setLoading(false);
  };

  const toggleRecipeSelection = (recipeId) => {
    setSelectedRecipes(prev => 
      prev.includes(recipeId) 
        ? prev.filter(id => id !== recipeId)
        : [...prev, recipeId]
    );
  };

  const selectAll = () => {
    if (selectedRecipes.length === recipes.length) {
      setSelectedRecipes([]);
    } else {
      setSelectedRecipes(recipes.map(r => r.id));
    }
  };

  const generatePDF = async () => {
    if (selectedRecipes.length === 0) {
      toast.error("Please select at least one recipe");
      return;
    }

    setGenerating(true);
    toast.info("Generating your cookbook...");

    try {
      const doc = new jsPDF();
      const pageWidth = doc.internal.pageSize.getWidth();
      const pageHeight = doc.internal.pageSize.getHeight();
      const margin = 20;
      const contentWidth = pageWidth - (margin * 2);

      // Cover Page
      doc.setFillColor(248, 245, 241); // Linen background
      doc.rect(0, 0, pageWidth, pageHeight, 'F');
      
      // Decorative border
      doc.setDrawColor(218, 127, 96); // Terracotta
      doc.setLineWidth(2);
      doc.rect(10, 10, pageWidth - 20, pageHeight - 20);
      doc.setLineWidth(0.5);
      doc.rect(15, 15, pageWidth - 30, pageHeight - 30);

      // Title
      doc.setFont("helvetica", "bold");
      doc.setFontSize(36);
      doc.setTextColor(74, 58, 51); // Warm charcoal
      doc.text("Legacy Table", pageWidth / 2, 80, { align: "center" });
      doc.setFontSize(28);
      doc.text("Family Cookbook", pageWidth / 2, 100, { align: "center" });
      
      // Decorative line
      doc.setDrawColor(74, 122, 94); // Sage
      doc.setLineWidth(1);
      doc.line(60, 115, pageWidth - 60, 115);
      
      // Subtitle
      doc.setFont("helvetica", "italic");
      doc.setFontSize(14);
      doc.setTextColor(128, 118, 110);
      doc.text("Recipes passed down with love", pageWidth / 2, 135, { align: "center" });
      
      // Recipe count
      doc.setFont("helvetica", "normal");
      doc.setFontSize(12);
      doc.text(`${selectedRecipes.length} cherished recipes`, pageWidth / 2, 155, { align: "center" });
      
      // Date
      const today = new Date().toLocaleDateString('en-US', { 
        year: 'numeric', 
        month: 'long', 
        day: 'numeric' 
      });
      doc.text(`Created on ${today}`, pageWidth / 2, 175, { align: "center" });
      
      // Footer quote
      doc.setFont("helvetica", "italic");
      doc.setFontSize(11);
      doc.setTextColor(128, 118, 110);
      doc.text('"The fondest memories are made when gathered around the table."', pageWidth / 2, pageHeight - 40, { align: "center" });

      // Table of Contents
      doc.addPage();
      doc.setFillColor(248, 245, 241);
      doc.rect(0, 0, pageWidth, pageHeight, 'F');
      
      doc.setFont("helvetica", "bold");
      doc.setFontSize(24);
      doc.setTextColor(74, 58, 51);
      doc.text("Table of Contents", pageWidth / 2, 30, { align: "center" });
      
      doc.setDrawColor(218, 127, 96);
      doc.setLineWidth(0.5);
      doc.line(margin, 40, pageWidth - margin, 40);

      let tocY = 55;
      const selectedRecipesList = recipes.filter(r => selectedRecipes.includes(r.id));
      
      doc.setFont("helvetica", "normal");
      doc.setFontSize(12);
      selectedRecipesList.forEach((recipe, index) => {
        if (tocY > pageHeight - 30) {
          doc.addPage();
          doc.setFillColor(248, 245, 241);
          doc.rect(0, 0, pageWidth, pageHeight, 'F');
          tocY = 30;
        }
        doc.setTextColor(74, 58, 51);
        doc.text(`${index + 1}. ${recipe.title}`, margin, tocY);
        doc.setTextColor(128, 118, 110);
        doc.text(`by ${recipe.author_name}`, margin + 10, tocY + 5);
        tocY += 18;
      });

      // Recipe Pages
      for (const recipe of selectedRecipesList) {
        doc.addPage();
        doc.setFillColor(248, 245, 241);
        doc.rect(0, 0, pageWidth, pageHeight, 'F');
        
        let y = 25;

        // Recipe title
        doc.setFont("helvetica", "bold");
        doc.setFontSize(22);
        doc.setTextColor(74, 58, 51);
        const titleLines = doc.splitTextToSize(recipe.title, contentWidth);
        doc.text(titleLines, margin, y);
        y += titleLines.length * 10 + 5;

        // Category badge
        doc.setFillColor(74, 122, 94);
        doc.roundedRect(margin, y, 40, 8, 2, 2, 'F');
        doc.setFont("helvetica", "bold");
        doc.setFontSize(8);
        doc.setTextColor(255, 255, 255);
        doc.text(recipe.category.toUpperCase(), margin + 4, y + 5.5);
        
        // Difficulty
        const diffColors = {
          easy: [74, 122, 94],
          medium: [218, 175, 96],
          hard: [218, 127, 96]
        };
        const dc = diffColors[recipe.difficulty] || diffColors.easy;
        doc.setFillColor(dc[0], dc[1], dc[2]);
        doc.roundedRect(margin + 45, y, 25, 8, 2, 2, 'F');
        doc.text(recipe.difficulty.toUpperCase(), margin + 49, y + 5.5);
        y += 15;

        // Meta info
        doc.setFont("helvetica", "normal");
        doc.setFontSize(10);
        doc.setTextColor(128, 118, 110);
        doc.text(`By ${recipe.author_name}  •  ${recipe.cooking_time} min  •  ${recipe.servings} servings`, margin, y);
        y += 15;

        // Decorative line
        doc.setDrawColor(218, 127, 96);
        doc.setLineWidth(0.3);
        doc.line(margin, y, pageWidth - margin, y);
        y += 10;

        // Ingredients section
        doc.setFont("helvetica", "bold");
        doc.setFontSize(14);
        doc.setTextColor(74, 58, 51);
        doc.text("Ingredients", margin, y);
        y += 8;

        doc.setFont("helvetica", "normal");
        doc.setFontSize(10);
        doc.setTextColor(74, 58, 51);
        
        for (const ingredient of recipe.ingredients) {
          if (y > pageHeight - 30) {
            doc.addPage();
            doc.setFillColor(248, 245, 241);
            doc.rect(0, 0, pageWidth, pageHeight, 'F');
            y = 25;
          }
          doc.setFillColor(218, 127, 96);
          doc.circle(margin + 2, y - 1.5, 1.5, 'F');
          const ingredientLines = doc.splitTextToSize(ingredient, contentWidth - 10);
          doc.text(ingredientLines, margin + 8, y);
          y += ingredientLines.length * 5 + 3;
        }
        y += 8;

        // Instructions section
        if (y > pageHeight - 60) {
          doc.addPage();
          doc.setFillColor(248, 245, 241);
          doc.rect(0, 0, pageWidth, pageHeight, 'F');
          y = 25;
        }

        doc.setFont("helvetica", "bold");
        doc.setFontSize(14);
        doc.setTextColor(74, 58, 51);
        doc.text("Instructions", margin, y);
        y += 8;

        doc.setFont("helvetica", "normal");
        doc.setFontSize(10);
        
        const instructionLines = doc.splitTextToSize(recipe.instructions, contentWidth);
        for (const line of instructionLines) {
          if (y > pageHeight - 20) {
            doc.addPage();
            doc.setFillColor(248, 245, 241);
            doc.rect(0, 0, pageWidth, pageHeight, 'F');
            y = 25;
          }
          doc.text(line, margin, y);
          y += 5;
        }

        // Recipe Story (if exists)
        if (recipe.story) {
          y += 10;
          if (y > pageHeight - 60) {
            doc.addPage();
            doc.setFillColor(248, 245, 241);
            doc.rect(0, 0, pageWidth, pageHeight, 'F');
            y = 25;
          }

          doc.setFont("helvetica", "bolditalic");
          doc.setFontSize(12);
          doc.setTextColor(218, 127, 96); // Terracotta
          doc.text("The Story", margin, y);
          y += 8;

          doc.setFont("helvetica", "italic");
          doc.setFontSize(10);
          doc.setTextColor(74, 58, 51);
          
          const storyLines = doc.splitTextToSize(`"${recipe.story}"`, contentWidth);
          for (const line of storyLines) {
            if (y > pageHeight - 20) {
              doc.addPage();
              doc.setFillColor(248, 245, 241);
              doc.rect(0, 0, pageWidth, pageHeight, 'F');
              y = 25;
            }
            doc.text(line, margin, y);
            y += 5;
          }
          
          doc.setFont("helvetica", "normal");
          doc.setFontSize(9);
          doc.setTextColor(128, 118, 110);
          y += 3;
          doc.text(`— Shared by ${recipe.author_name}`, margin, y);
        }
      }

      // Save PDF
      doc.save("Legacy_Table_Family_Cookbook.pdf");
      toast.success("Cookbook generated successfully!");
    } catch (error) {
      console.error("PDF generation error:", error);
      toast.error("Failed to generate cookbook");
    }
    setGenerating(false);
  };

  return (
    <div className="min-h-screen bg-background" data-testid="cookbook-page">
      <Navigation />
      
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8 animate-fade-in">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div>
              <h1 className="font-serif text-3xl md:text-4xl font-bold text-foreground mb-2">Family Cookbook</h1>
              <p className="text-muted-foreground">Select recipes to create a printable PDF cookbook</p>
            </div>
            <div className="flex gap-3">
              <Button
                variant="outline"
                onClick={selectAll}
                className="rounded-full"
                data-testid="select-all-btn"
              >
                {selectedRecipes.length === recipes.length ? "Deselect All" : "Select All"}
              </Button>
              <Button
                onClick={generatePDF}
                disabled={selectedRecipes.length === 0 || generating}
                className="rounded-full bg-primary text-primary-foreground hover:bg-primary/90 shadow-lg shadow-primary/20"
                data-testid="generate-pdf-btn"
              >
                <Download className="w-4 h-4 mr-2" />
                {generating ? "Generating..." : `Export PDF (${selectedRecipes.length})`}
              </Button>
            </div>
          </div>
        </div>

        {/* Selection Info Banner */}
        {selectedRecipes.length > 0 && (
          <div className="mb-6 p-4 rounded-2xl bg-primary/10 border border-primary/20 animate-fade-in" data-testid="selection-banner">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <BookOpen className="w-5 h-5 text-primary" />
                <span className="font-medium text-foreground">
                  {selectedRecipes.length} recipe{selectedRecipes.length !== 1 ? 's' : ''} selected for your cookbook
                </span>
              </div>
              <button 
                onClick={() => setSelectedRecipes([])}
                className="text-sm text-muted-foreground hover:text-foreground"
              >
                Clear selection
              </button>
            </div>
          </div>
        )}

        {loading ? (
          <div className="recipe-grid">
            {[...Array(6)].map((_, i) => (
              <div key={i} className="rounded-2xl overflow-hidden">
                <div className="skeleton aspect-[4/5]" />
                <div className="p-5 space-y-3">
                  <div className="skeleton h-6 w-3/4" />
                  <div className="skeleton h-4 w-1/2" />
                </div>
              </div>
            ))}
          </div>
        ) : recipes.length > 0 ? (
          <div className="recipe-grid" data-testid="cookbook-grid">
            {recipes.map((recipe, index) => (
              <div 
                key={recipe.id} 
                className="animate-fade-in relative" 
                style={{ animationDelay: `${index * 0.05}s` }}
              >
                {/* Selection Checkbox */}
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    toggleRecipeSelection(recipe.id);
                  }}
                  className={`absolute top-3 left-3 z-10 w-8 h-8 rounded-full border-2 flex items-center justify-center transition-all ${
                    selectedRecipes.includes(recipe.id)
                      ? 'bg-primary border-primary text-white'
                      : 'bg-white/80 border-border hover:border-primary'
                  }`}
                  data-testid={`select-recipe-${recipe.id}`}
                >
                  {selectedRecipes.includes(recipe.id) && (
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                    </svg>
                  )}
                </button>
                <RecipeCard 
                  recipe={recipe} 
                  onClick={() => navigate(`/recipe/${recipe.id}`)}
                />
              </div>
            ))}
          </div>
        ) : (
          <div className="empty-state" data-testid="empty-cookbook">
            <div className="empty-state-icon">
              <BookOpen className="w-10 h-10" />
            </div>
            <h3 className="font-serif text-2xl font-semibold mb-2">No recipes to compile</h3>
            <p className="text-muted-foreground mb-6">Add some recipes first to create your family cookbook!</p>
            <Button 
              onClick={() => navigate("/add-recipe")}
              className="rounded-full bg-primary text-primary-foreground"
              data-testid="cookbook-add-recipe-btn"
            >
              <Plus className="w-4 h-4 mr-2" />
              Add Recipe
            </Button>
          </div>
        )}
      </div>
    </div>
  );
};

// Delete Account Page
const DeleteAccountPage = () => {
  const [email, setEmail] = useState("");
  const [confirmEmail, setConfirmEmail] = useState("");
  const [understood, setUnderstood] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [loading, setLoading] = useState(false);
  const [touched, setTouched] = useState({ email: false, confirmEmail: false });
  const { user } = useAuth();

  const emailTrimmed = email.trim();
  const confirmTrimmed = confirmEmail.trim();
  const emailValid = isValidEmail(emailTrimmed);
  const confirmEmailValid = isValidEmail(confirmTrimmed);
  const emailsMatch = emailTrimmed.toLowerCase() === confirmTrimmed.toLowerCase();
  const canSubmit = emailValid && confirmEmailValid && understood && emailsMatch;

  const showEmailError = touched.email && emailTrimmed && !emailValid;
  const showConfirmError = touched.confirmEmail && confirmTrimmed && !confirmEmailValid;
  const showMatchError = touched.confirmEmail && confirmTrimmed && confirmEmailValid && !emailsMatch;

  const handleRequestDeletion = (e) => {
    e.preventDefault();
    setTouched({ email: true, confirmEmail: true });
    if (!emailValid || !confirmEmailValid) {
      toast.error("Please enter valid email addresses.");
      return;
    }
    if (!emailsMatch) {
      toast.error("Email addresses do not match.");
      return;
    }
    if (!understood) {
      toast.error("Please confirm that you understand this action is permanent.");
      return;
    }
    setShowConfirm(true);
  };

  const handleConfirm = async () => {
    setLoading(true);
    try {
      await axios.post(`${API}/delete-account`, { email: email.trim().toLowerCase() });
      toast.success("Your deletion request has been received. We will process it within 7 business days and notify you by email.");
      setEmail("");
      setConfirmEmail("");
      setUnderstood(false);
      setShowConfirm(false);
    } catch (err) {
      toast.error(err.response?.data?.detail || "Request failed");
    }
    setLoading(false);
  };

  return (
    <div className="min-h-screen bg-background flex flex-col" data-testid="delete-account-page">
      {user ? <Navigation /> : (
        <header className="border-b border-border/50 bg-card/50 sticky top-0 z-30">
          <div className="max-w-3xl mx-auto px-4 sm:px-6 py-4 flex items-center justify-between">
            <FamilyLogo size="sm" showText={true} />
            <Link to="/login" className="text-sm font-medium text-primary hover:underline">Back to Login</Link>
          </div>
        </header>
      )}

      <main className="flex-1 w-full max-w-2xl mx-auto px-4 sm:px-6 py-8 sm:py-10">
        <h1 className="font-serif text-3xl font-bold text-foreground mb-8">Delete Account – Legacy Table</h1>

        <section className="mb-8 animate-fade-in">
          <h2 className="font-serif text-xl font-bold text-foreground mb-2">Request Account Deletion</h2>
          <p className="text-muted-foreground text-base leading-relaxed">
            If you would like to delete your Legacy Table account, you can submit a request below.
          </p>
        </section>

        <section className="mb-8">
          <h2 className="font-serif text-xl font-bold text-foreground mb-3">What This Means</h2>
          <p className="text-muted-foreground text-sm mb-2">By requesting account deletion:</p>
          <ul className="list-disc pl-6 space-y-1 text-muted-foreground text-sm">
            <li>Your account will be permanently deleted</li>
            <li>Your personal information will be removed</li>
            <li>You will no longer be able to log in</li>
            <li>This action cannot be undone</li>
          </ul>
        </section>

        <section className="mb-8">
          <h2 className="font-serif text-xl font-bold text-foreground mb-3">Deletion Timeline</h2>
          <ul className="list-disc pl-6 space-y-1 text-muted-foreground text-sm">
            <li>Requests are processed within 7 business days</li>
            <li>You will receive a confirmation email once completed</li>
          </ul>
        </section>

        <section className="bg-card border border-border rounded-2xl p-6 sm:p-8 shadow-lg mb-8">
          <h2 className="font-serif text-xl font-bold text-foreground mb-5">Delete Account Form</h2>
          <form onSubmit={handleRequestDeletion} className="space-y-5">
            <div className="space-y-2">
              <Label htmlFor="delete-email" className="text-sm font-semibold text-foreground">Email Address</Label>
              <Input
                id="delete-email"
                type="email"
                placeholder="your@email.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                onBlur={() => setTouched((t) => ({ ...t, email: true }))}
                className={`rounded-xl border-2 bg-background px-4 py-3 text-foreground focus:border-primary ${showEmailError ? "border-destructive" : "border-border/50"}`}
                required
                aria-invalid={showEmailError}
              />
              {showEmailError && (
                <p className="text-destructive text-sm">Please enter a valid email address.</p>
              )}
            </div>
            <div className="space-y-2">
              <Label htmlFor="delete-confirm-email" className="text-sm font-semibold text-foreground">Confirm Email Address</Label>
              <Input
                id="delete-confirm-email"
                type="email"
                placeholder="your@email.com"
                value={confirmEmail}
                onChange={(e) => setConfirmEmail(e.target.value)}
                onBlur={() => setTouched((t) => ({ ...t, confirmEmail: true }))}
                className={`rounded-xl border-2 bg-background px-4 py-3 text-foreground focus:border-primary ${showConfirmError || showMatchError ? "border-destructive" : "border-border/50"}`}
                required
                aria-invalid={showConfirmError || showMatchError}
              />
              {showConfirmError && (
                <p className="text-destructive text-sm">Please enter a valid email address.</p>
              )}
              {showMatchError && !showConfirmError && (
                <p className="text-destructive text-sm">Email addresses do not match.</p>
              )}
            </div>
            <div className="flex items-start gap-3">
              <Checkbox
                id="delete-understood"
                checked={understood}
                onCheckedChange={(checked) => setUnderstood(checked === true)}
                className="mt-0.5 border-2 border-border"
              />
              <Label htmlFor="delete-understood" className="text-sm text-foreground cursor-pointer leading-tight">
                I understand that deleting my account is permanent and cannot be undone.
              </Label>
            </div>
            <Button
              type="submit"
              variant="destructive"
              className="w-full rounded-full px-8 py-6 text-lg font-serif"
              disabled={!canSubmit}
            >
              Request Account Deletion
            </Button>
          </form>
        </section>

        <section className="border-t border-border pt-6">
          <h2 className="font-serif text-lg font-bold text-foreground mb-2">Need Help?</h2>
          <p className="text-muted-foreground text-sm">
            Contact us at:{" "}
            <a href="mailto:support@cookinglegacy.online" className="text-primary font-medium hover:underline">
              support@cookinglegacy.online
            </a>
          </p>
        </section>
      </main>

      <AlertDialog open={showConfirm} onOpenChange={setShowConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="text-foreground">Confirm deletion request</AlertDialogTitle>
            <AlertDialogDescription className="text-muted-foreground">
              Submit a deletion request for <strong className="text-foreground">{email}</strong>? We will process it within 7 business days and notify you by email.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="text-foreground">Cancel</AlertDialogCancel>
            <Button
              type="button"
              variant="destructive"
              onClick={handleConfirm}
              disabled={loading}
            >
              {loading ? "Submitting…" : "Confirm"}
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

// Privacy Policy Page
const PrivacyPolicyPage = () => {
  const navigate = useNavigate();
  const { user } = useAuth();

  return (
    <div className="min-h-screen bg-background" data-testid="privacy-policy-page">
      {user ? <Navigation /> : (
        <header className="border-b border-border/50 bg-card/50 sticky top-0 z-30">
          <div className="max-w-3xl mx-auto px-4 sm:px-6 py-4 flex items-center justify-between">
            <FamilyLogo size="sm" showText={true} />
            <Link to="/login" className="text-sm font-medium text-primary hover:underline">Back to Login</Link>
          </div>
        </header>
      )}

      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8 animate-fade-in">
          <h1 className="font-serif text-3xl md:text-4xl font-bold text-foreground mb-2">Privacy Policy</h1>
          <p className="text-muted-foreground">Effective Date: February 3, 2025</p>
        </div>

        <div className="space-y-6 text-foreground animate-slide-up">
          <p className="text-base leading-relaxed text-muted-foreground">
            Legacy Table (&quot;Legacy Table,&quot; &quot;we,&quot; &quot;our,&quot; or &quot;us&quot;) is a private, invite-only family app designed to help families preserve recipes, photos, and food traditions together. We are committed to protecting your privacy and handling your data with care.
          </p>
          <p className="text-base leading-relaxed text-muted-foreground">
            This Privacy Policy explains how information is collected, used, and protected when you use the Legacy Table mobile application and related services.
          </p>

          <section>
            <h2 className="font-serif text-xl font-bold text-foreground mb-3">1. Information We Collect</h2>
            <p className="text-base leading-relaxed text-muted-foreground mb-3">We collect only the information necessary to provide the core functionality of the app.</p>
            <h3 className="font-semibold text-lg text-foreground mb-2">Information You Provide</h3>
            <ul className="list-disc pl-6 space-y-1 text-base text-muted-foreground mb-4">
              <li><strong className="text-foreground">Account information:</strong> name, email address, and password</li>
              <li><strong className="text-foreground">Family content:</strong> recipes, photos, comments, notes, and cookbook collections</li>
              <li><strong className="text-foreground">Invitations:</strong> email addresses or invite codes used to add family members</li>
            </ul>
            <h3 className="font-semibold text-lg text-foreground mb-2">Automatically Collected Information</h3>
            <ul className="list-disc pl-6 space-y-1 text-base text-muted-foreground mb-2">
              <li><strong className="text-foreground">App usage data:</strong> basic interactions such as feature usage and performance</li>
              <li><strong className="text-foreground">Device information:</strong> device type, operating system version, and app version</li>
            </ul>
            <p className="text-base leading-relaxed text-muted-foreground">We do not collect precise location data.</p>
          </section>

          <section>
            <h2 className="font-serif text-xl font-bold text-foreground mb-3">2. How We Use Information</h2>
            <p className="text-base leading-relaxed text-muted-foreground mb-2">We use your information solely to operate and improve Legacy Table, including to:</p>
            <ul className="list-disc pl-6 space-y-1 text-base text-muted-foreground mb-2">
              <li>Create and manage private family spaces</li>
              <li>Enable recipe sharing, comments, and photo uploads</li>
              <li>Authenticate users and manage invitations</li>
              <li>Maintain app performance, reliability, and security</li>
              <li>Respond to support requests</li>
            </ul>
            <p className="text-base leading-relaxed text-muted-foreground">We do not use your data for advertising purposes.</p>
          </section>

          <section>
            <h2 className="font-serif text-xl font-bold text-foreground mb-3">3. Private, Invite-Only Design</h2>
            <p className="text-base leading-relaxed text-muted-foreground mb-2">Legacy Table is private by default.</p>
            <ul className="list-disc pl-6 space-y-1 text-base text-muted-foreground">
              <li>Family content is visible only to invited members of that family</li>
              <li>There are no public profiles, public feeds, or searchable family content</li>
              <li>Content is not shared outside your family unless you explicitly choose to export it</li>
            </ul>
          </section>

          <section>
            <h2 className="font-serif text-xl font-bold text-foreground mb-3">4. Data Sharing</h2>
            <p className="text-base leading-relaxed text-muted-foreground mb-2">We do not sell, rent, or trade personal or family data.</p>
            <p className="text-base leading-relaxed text-muted-foreground mb-2">We may share limited data only:</p>
            <ul className="list-disc pl-6 space-y-1 text-base text-muted-foreground">
              <li>With trusted service providers who help operate the app (such as cloud hosting and image storage), under strict confidentiality agreements</li>
              <li>If required by law or to protect the safety and rights of users and the platform</li>
            </ul>
          </section>

          <section>
            <h2 className="font-serif text-xl font-bold text-foreground mb-3">5. Data Storage and Security</h2>
            <p className="text-base leading-relaxed text-muted-foreground mb-2">We take reasonable measures to protect your information, including:</p>
            <ul className="list-disc pl-6 space-y-1 text-base text-muted-foreground mb-2">
              <li>Secure authentication</li>
              <li>Encrypted data transmission</li>
              <li>Restricted access to user data</li>
            </ul>
            <p className="text-base leading-relaxed text-muted-foreground">No system is perfectly secure, but we design Legacy Table with privacy and care as core principles.</p>
          </section>

          <section>
            <h2 className="font-serif text-xl font-bold text-foreground mb-3">6. Data Retention and Deletion</h2>
            <ul className="list-disc pl-6 space-y-1 text-base text-muted-foreground">
              <li>Your data is retained for as long as your account is active</li>
              <li>You may request account deletion at any time</li>
              <li>When an account is deleted, associated personal data is removed or anonymized in accordance with applicable laws</li>
            </ul>
          </section>

          <section>
            <h2 className="font-serif text-xl font-bold text-foreground mb-3">7. Children&apos;s Privacy</h2>
            <p className="text-base leading-relaxed text-muted-foreground">Legacy Table is intended for family use. We do not knowingly collect personal information from children under 13 without parental or guardian consent.</p>
          </section>

          <section>
            <h2 className="font-serif text-xl font-bold text-foreground mb-3">8. Your Rights</h2>
            <p className="text-base leading-relaxed text-muted-foreground mb-2">Depending on your location, you may have rights to:</p>
            <ul className="list-disc pl-6 space-y-1 text-base text-muted-foreground mb-2">
              <li>Access your personal data</li>
              <li>Request correction or deletion</li>
              <li>Withdraw consent where applicable</li>
            </ul>
            <p className="text-base leading-relaxed text-muted-foreground">To make a request, contact us using the information below.</p>
          </section>

          <section>
            <h2 className="font-serif text-xl font-bold text-foreground mb-3">9. Changes to This Policy</h2>
            <p className="text-base leading-relaxed text-muted-foreground">We may update this Privacy Policy from time to time. Any changes will be posted on this page with an updated effective date.</p>
          </section>

          <section>
            <h2 className="font-serif text-xl font-bold text-foreground mb-3">10. Contact Us</h2>
            <p className="text-base leading-relaxed text-muted-foreground mb-2">If you have questions or concerns about this Privacy Policy or your data, contact us at:</p>
            <p className="text-base leading-relaxed text-foreground font-medium">Email: <a href="mailto:support@legacytable.app" className="text-primary hover:underline">support@legacytable.app</a></p>
          </section>
        </div>

        {!user && (
          <div className="mt-10 text-center">
            <Button onClick={() => navigate("/login")} variant="outline" className="rounded-full">Back to Login</Button>
          </div>
        )}
      </div>
    </div>
  );
};

function App() {
  return (
    <div className="App">
      <ThemeProvider>
        <AuthProvider>
          <BrowserRouter>
            <Routes>
              <Route path="/login" element={<LoginPage />} />
              <Route path="/privacy-policy" element={<PrivacyPolicyPage />} />
              <Route path="/delete-account" element={<DeleteAccountPage />} />
              <Route path="/" element={<ProtectedRoute><HomePage /></ProtectedRoute>} />
              <Route path="/add-recipe" element={<ProtectedRoute><AddRecipePage /></ProtectedRoute>} />
              <Route path="/recipe/:id" element={<ProtectedRoute><RecipeDetailPage /></ProtectedRoute>} />
              <Route path="/recipe/:id/edit" element={<ProtectedRoute><EditRecipePage /></ProtectedRoute>} />
              <Route path="/profile" element={<ProtectedRoute><ProfilePage /></ProtectedRoute>} />
              <Route path="/settings" element={<ProtectedRoute><SettingsPage /></ProtectedRoute>} />
              <Route path="/family" element={<ProtectedRoute><FamilyPage /></ProtectedRoute>} />
              <Route path="/cookbook" element={<ProtectedRoute><CookbookPage /></ProtectedRoute>} />
            </Routes>
          </BrowserRouter>
          <Toaster position="top-center" richColors />
        </AuthProvider>
      </ThemeProvider>
      <div className="grain-overlay" />
    </div>
  );
}

export default App;
