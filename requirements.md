# Touré Family Recipe App

## Original Problem Statement
Build a Touré family recipe app for sharing recipes with family members. Features include:
- Family members log in with separate accounts
- Recipe details: title, ingredients, instructions, photos, cooking time, servings, categories, difficulty level
- Photo uploads from gallery and camera capture

## Architecture & Tech Stack
- **Frontend**: React 19 + Tailwind CSS + Shadcn/UI
- **Backend**: FastAPI + Python
- **Database**: MongoDB
- **Authentication**: JWT tokens with bcrypt password hashing

## Features Implemented (MVP)
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
6. Family cookbook PDF export

## Design System
- **Colors**: Terracotta primary (#E07B4C), Sage secondary (#4A7A5E), Linen background
- **Fonts**: Playfair Display (headings), Manrope (body)
- **Style**: Warm, organic, family-oriented aesthetic
