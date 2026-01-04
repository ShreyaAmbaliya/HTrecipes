# Honor Touré Family Recipe App

## Original Problem Statement
Build a Touré family recipe app for sharing recipes with family members. Features include:
- Family members log in with separate accounts
- Recipe details: title, ingredients, instructions, photos, cooking time, servings, categories, difficulty level
- Photo uploads from gallery and camera capture
- Family Cookbook PDF export feature
- Custom family logo

## Architecture & Tech Stack
- **Frontend**: React 19 + Tailwind CSS + Shadcn/UI + jsPDF
- **Backend**: FastAPI + Python
- **Database**: MongoDB
- **Authentication**: JWT tokens with bcrypt password hashing

## Features Implemented
1. ✅ User authentication (register/login/logout)
2. ✅ JWT token-based security
3. ✅ Recipe CRUD operations
4. ✅ Photo upload from gallery
5. ✅ Camera capture functionality
6. ✅ Category filtering
7. ✅ Search recipes
8. ✅ My Recipes (profile) page
9. ✅ Responsive mobile design
10. ✅ Warm "Spice & Linen" design system
11. ✅ **Family Logo (HT monogram)**
12. ✅ **Family Cookbook PDF Export**
13. ✅ **Renamed to Honor Touré Family Recipes**

## Family Cookbook PDF Export
- Select individual recipes or "Select All"
- Generates professional PDF with:
  - Cover page with family name and decorative borders
  - Table of Contents
  - Individual recipe pages with ingredients and instructions
  - Category and difficulty badges
  - Author attribution

## API Endpoints
- `POST /api/auth/register` - Create new account
- `POST /api/auth/login` - Login and get JWT token
- `GET /api/auth/me` - Get current user info
- `GET /api/recipes` - List all recipes (with optional category/author filter)
- `POST /api/recipes` - Create new recipe
- `GET /api/recipes/{id}` - Get recipe details
- `PUT /api/recipes/{id}` - Update recipe
- `DELETE /api/recipes/{id}` - Delete recipe
- `GET /api/categories` - List all categories

## Next Tasks
1. Edit recipe functionality (update form)
2. Add comments/likes for family interaction
3. User profile pictures/avatars
4. Recipe favorites/bookmarks
5. Share recipes externally

## Design System
- **Colors**: Terracotta primary (#E07B4C), Sage secondary (#4A7A5E), Linen background
- **Fonts**: Playfair Display (headings), Manrope (body)
- **Logo**: HT monogram with gradient ring and decorative dots
- **Style**: Warm, organic, family-oriented aesthetic
