import React, { useState, useEffect, createContext, useContext } from "react";
import "@/App.css";
import { BrowserRouter, Routes, Route, Navigate, useNavigate, useLocation, Link } from "react-router-dom";
import axios from "axios";
import { Toaster, toast } from "sonner";
import { ChefHat, Utensils, Camera, Clock, Users, Flame, Heart, Plus, LogOut, Menu, X, Home, User, Search } from "lucide-react";
import { Button } from "./components/ui/button";
import { Input } from "./components/ui/input";
import { Label } from "./components/ui/label";
import { Textarea } from "./components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "./components/ui/select";
import { Badge } from "./components/ui/badge";
import { Card, CardContent } from "./components/ui/card";

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

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

  return (
    <AuthContext.Provider value={{ user, token, login, logout, loading }}>
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

// Navigation Component
const Navigation = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const handleLogout = () => {
    logout();
    navigate("/login");
    toast.success("Logged out successfully");
  };

  if (!user) return null;

  return (
    <>
      <nav className="sticky top-0 z-30 bg-white/80 backdrop-blur-md border-b border-border/50" data-testid="navigation">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <Link to="/" className="flex items-center gap-2" data-testid="nav-logo">
              <div className="w-10 h-10 rounded-full bg-primary flex items-center justify-center">
                <ChefHat className="w-6 h-6 text-primary-foreground" />
              </div>
              <span className="font-serif text-xl font-semibold text-foreground hidden sm:block">Touré Recipes</span>
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
            </div>

            <div className="hidden md:flex items-center gap-4">
              <span className="text-sm text-muted-foreground">Welcome, <span className="font-medium text-foreground">{user.name}</span></span>
              <Button 
                variant="ghost" 
                size="sm" 
                onClick={handleLogout}
                className="text-muted-foreground hover:text-foreground"
                data-testid="logout-btn"
              >
                <LogOut className="w-4 h-4 mr-2" />
                Logout
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
      <div className={`mobile-menu ${mobileMenuOpen ? 'open' : ''}`} data-testid="mobile-menu">
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
          <div className="pt-4 border-t border-border mt-4">
            <div className="px-3 py-2 text-sm text-muted-foreground">Signed in as</div>
            <div className="px-3 py-2 font-medium">{user.name}</div>
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
        <div className="text-center mb-8">
          <div className="w-16 h-16 rounded-full bg-primary mx-auto flex items-center justify-center mb-4">
            <ChefHat className="w-8 h-8 text-primary-foreground" />
          </div>
          <h1 className="font-serif text-3xl font-bold text-foreground mb-2">Touré Family Recipes</h1>
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
                className="rounded-xl border-2 border-border/50 bg-white/50 px-4 py-3 text-lg focus:border-primary"
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
              className="rounded-xl border-2 border-border/50 bg-white/50 px-4 py-3 text-lg focus:border-primary"
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
              className="rounded-xl border-2 border-border/50 bg-white/50 px-4 py-3 text-lg focus:border-primary"
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
  const { token } = useAuth();

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
            <h1 className="font-serif text-4xl sm:text-5xl lg:text-6xl font-bold text-foreground mb-4">
              Family Recipes,<br />Shared with Love
            </h1>
            <p className="text-lg text-muted-foreground mb-8">
              Preserve and share the Touré family's culinary traditions
            </p>
            <Button 
              onClick={() => navigate("/add-recipe")}
              className="rounded-full bg-primary text-primary-foreground hover:bg-primary/90 px-8 py-6 text-lg font-serif transition-transform hover:scale-105 active:scale-95 shadow-lg shadow-primary/20"
              data-testid="hero-add-recipe-btn"
            >
              <Plus className="w-5 h-5 mr-2" />
              Share a Recipe
            </Button>
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
      await axios.post(`${API}/recipes`, {
        ...formData,
        ingredients: validIngredients
      }, {
        headers: { Authorization: `Bearer ${token}` },
      });
      toast.success("Recipe shared with the family!");
      navigate("/");
    } catch (error) {
      toast.error(error.response?.data?.detail || "Failed to create recipe");
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
              <Button 
                type="button" 
                onClick={startCamera}
                variant="outline"
                className="rounded-xl px-6 py-8 border-2 border-dashed"
                data-testid="take-photo-btn"
              >
                <Camera className="w-6 h-6 mr-2" />
                Take Photo
              </Button>
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
              className="rounded-xl border-2 border-border/50 bg-white/50 px-4 py-3 text-lg focus:border-primary"
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
                <SelectTrigger className="rounded-xl border-2 border-border/50 h-12" data-testid="select-category">
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
                <SelectTrigger className="rounded-xl border-2 border-border/50 h-12" data-testid="select-difficulty">
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
                className="rounded-xl border-2 border-border/50 h-12"
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
                className="rounded-xl border-2 border-border/50 h-12"
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
                    className="rounded-xl border-2 border-border/50"
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
              className="rounded-xl border-2 border-border/50 min-h-[200px] resize-y"
              required
              data-testid="input-instructions"
            />
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

// Recipe Detail Page
const RecipeDetailPage = () => {
  const [recipe, setRecipe] = useState(null);
  const [loading, setLoading] = useState(true);
  const [currentPhotoIndex, setCurrentPhotoIndex] = useState(0);
  const { token, user } = useAuth();
  const navigate = useNavigate();
  const { id } = useParams();

  useEffect(() => {
    fetchRecipe();
  }, [id]);

  const fetchRecipe = async () => {
    try {
      const response = await axios.get(`${API}/recipes/${id}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setRecipe(response.data);
    } catch (error) {
      toast.error("Recipe not found");
      navigate("/");
    }
    setLoading(false);
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
      toast.error("Failed to delete recipe");
    }
  };

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
              {user?.id === recipe.author_id && (
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

            <div className="prose prose-lg max-w-none">
              <h2 className="font-serif text-2xl font-semibold mb-4">Instructions</h2>
              <div className="text-foreground whitespace-pre-line leading-relaxed" data-testid="recipe-instructions">
                {recipe.instructions}
              </div>
            </div>
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

// Import useParams
import { useParams } from "react-router-dom";

function App() {
  return (
    <div className="App">
      <AuthProvider>
        <BrowserRouter>
          <Routes>
            <Route path="/login" element={<LoginPage />} />
            <Route path="/" element={<ProtectedRoute><HomePage /></ProtectedRoute>} />
            <Route path="/add-recipe" element={<ProtectedRoute><AddRecipePage /></ProtectedRoute>} />
            <Route path="/recipe/:id" element={<ProtectedRoute><RecipeDetailPage /></ProtectedRoute>} />
            <Route path="/profile" element={<ProtectedRoute><ProfilePage /></ProtectedRoute>} />
          </Routes>
        </BrowserRouter>
        <Toaster position="top-center" richColors />
      </AuthProvider>
      <div className="grain-overlay" />
    </div>
  );
}

export default App;
