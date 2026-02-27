# Milestone 5: Profile & Family Interaction - Implementation Guide

## Overview

**Goal:** Introduce the Family system, roles, and social layer so recipes become shared, protected, and collaborative inside a family.

**Timeline:** Part of 23-28 working days delivery

**Key Deliverables:**
- User profile screen
- Family entity (family_id, ownership, metadata)
- Keeper vs Member role model
- User <> Family association (future-ready for multi-family)
- Family-scoped access enforcement for recipes
- "My Recipes" section
- Comments on recipes
- Notifications list and read state

### 🔒 Backward Compatibility Guarantee

**Critical Design Principle:** All database changes are **backward compatible** - existing data and functionality remain unaffected.

- ✅ **No breaking changes** to existing API endpoints
- ✅ **No required migrations** - system works with existing data
- ✅ **All new fields are nullable/optional**
- ✅ **Existing users** can continue using the app without joining a family
- ✅ **Existing recipes** remain accessible (legacy recipes)
- ✅ **Gradual adoption** - users opt-in to family features when ready

---

## Table of Contents

1. [Backend API Requirements](#backend-api-requirements)
2. [Data Model & Database Schema](#data-model--database-schema)
3. [Step-by-Step Implementation](#step-by-step-implementation)
4. [Flutter Implementation Details](#flutter-implementation-details)
5. [Testing & QA Checklist](#testing--qa-checklist)
6. [Future-Ready Considerations](#future-ready-considerations)

---

## Backend API Requirements

### New Endpoints Needed

The current backend needs the following additions:

#### Family Management Endpoints

```
POST   /api/families                    - Create a new family (Keeper only)
GET    /api/families/{family_id}        - Get family details
PUT    /api/families/{family_id}        - Update family (Keeper only)
DELETE /api/families/{family_id}        - Delete family (Keeper only)
POST   /api/families/join               - Join a family using code/link
GET    /api/families/{family_id}/members - Get family members
DELETE /api/families/{family_id}/members/{user_id} - Remove member (Keeper only)
```

#### Updated Recipe Endpoints (Backward Compatible)

```
GET    /api/recipes                     - Will filter by family_id if user has one, otherwise shows legacy recipes
POST   /api/recipes                     - Will include family_id if user has one, otherwise creates legacy recipe
GET    /api/recipes/{id}                - Access control: family-scoped recipes require family membership, legacy recipes accessible to all
DELETE /api/recipes/{id}                - Role-based deletion for family recipes, author-only for legacy recipes
```

#### Updated User Endpoints (Backward Compatible)

```
GET    /api/auth/me                     - Will include family_id and role (both nullable for existing users)
```

---

## Data Model & Database Schema

### ⚠️ Backward Compatibility Strategy

**Key Principle:** All new fields are **nullable/optional** to ensure existing data continues to work without migration.

- **Existing users** without `family_id` or `role` will continue to function
- **Existing recipes** without `family_id` will remain accessible (legacy recipes)
- **New features** (family scoping) only apply when `family_id` is present
- **Gradual migration:** Users can opt-in to family features when ready

### User Model (Updated - Backward Compatible)

**New Fields Added (All Nullable):**
- `family_id` - uuid (nullable) - Links user to their family
- `role` - "keeper" | "member" (nullable) - User's role in the family

**Existing Fields (Unchanged):**
- `id` - uuid
- `name` - string
- `email` - string
- `nickname` - string (optional)
- `avatar` - string (optional)
- `password_hash` - string
- `created_at` - ISO datetime

**Complete Schema:**
```json
{
  "id": "uuid",
  "name": "string",
  "email": "string",
  "nickname": "string (optional)",
  "avatar": "string (optional)",
  "password_hash": "string",
  "family_id": "uuid (nullable, NEW)",
  "role": "keeper | member (nullable, NEW)",
  "created_at": "ISO datetime"
}
```

**Migration Notes:**
- Existing users will have `family_id: null` and `role: null`
- These users can still use the app but won't see family-scoped recipes
- When they create/join a family, these fields will be populated

### Family Model (New Collection)

**This is a completely new collection, so no backward compatibility concerns.**

```json
{
  "id": "uuid",
  "name": "string",
  "owner_id": "uuid",
  "invite_code": "string (unique)",
  "metadata": {
    "description": "string (optional)",
    "cover_image": "string (optional)"
  },
  "created_at": "ISO datetime"
}
```

### Recipe Model (Updated - Backward Compatible)

**New Field Added (Nullable):**
- `family_id` - uuid (nullable) - Links recipe to a family

**Existing Fields (Unchanged):**
- `id` - uuid
- `author_id` - uuid
- `author_name` - string
- `title` - string
- `ingredients` - array of strings
- `instructions` - string
- `story` - string (optional)
- `photos` - array of strings
- `cooking_time` - int
- `servings` - int
- `category` - string
- `difficulty` - string
- `created_at` - ISO datetime

**Complete Schema:**
```json
{
  "id": "uuid",
  "family_id": "uuid (nullable, NEW)",
  "author_id": "uuid",
  "author_name": "string",
  "title": "string",
  "ingredients": ["string"],
  "instructions": "string",
  "story": "string (optional)",
  "photos": ["string"],
  "cooking_time": "int",
  "servings": "int",
  "category": "string",
  "difficulty": "string",
  "created_at": "ISO datetime"
}
```

**Migration Notes:**
- Existing recipes will have `family_id: null` (legacy recipes)
- Legacy recipes remain accessible to all users (backward compatible)
- New recipes created by users with a family will have `family_id` set
- API logic handles both cases:
  - If user has `family_id`: show only family-scoped recipes
  - If user has no `family_id`: show legacy recipes (family_id: null)
  - Optional: Admin can migrate legacy recipes to a default family later

### Comment Model (Already Exists)

```json
{
  "id": "uuid",
  "recipe_id": "uuid",
  "user_id": "uuid",
  "user_name": "string",
  "text": "string",
  "created_at": "ISO datetime"
}
```

### Notification Model (Already Exists)

```json
{
  "id": "uuid",
  "user_id": "uuid",
  "type": "new_recipe | comment | family_invite",
  "message": "string",
  "recipe_id": "uuid (optional)",
  "from_user_name": "string",
  "is_read": "boolean",
  "created_at": "ISO datetime"
}
```

---

## Database Migration Strategy

### Zero-Downtime Migration Approach

Since all new fields are **nullable/optional**, no immediate migration is required. The system will work with existing data as-is.

### Migration Steps (Optional - For Future Cleanup)

If you want to migrate existing users/recipes later, here's a safe approach:

#### 1. User Migration (Optional)

```python
# Migration script: Assign legacy users to a default family
# Run this only if you want to migrate existing users

async def migrate_users_to_default_family():
    # Create a default "Legacy" family
    default_family_id = str(uuid.uuid4())
    default_family = {
        "id": default_family_id,
        "name": "Legacy Family",
        "owner_id": None,  # Or assign to an admin user
        "invite_code": "LEGACY01",
        "metadata": {"description": "Default family for legacy users"},
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    await db.families.insert_one(default_family)
    
    # Update users without family_id
    result = await db.users.update_many(
        {"family_id": {"$exists": False}},  # Or {"family_id": None}
        {"$set": {"family_id": default_family_id, "role": "member"}}
    )
    
    print(f"Migrated {result.modified_count} users to default family")
```

#### 2. Recipe Migration (Optional)

```python
# Migration script: Assign legacy recipes to users' families
# Run this only if you want to migrate existing recipes

async def migrate_recipes_to_families():
    # Get all recipes without family_id
    legacy_recipes = await db.recipes.find({"family_id": {"$exists": False}}).to_list(1000)
    
    migrated = 0
    for recipe in legacy_recipes:
        # Get the author's family_id
        author = await db.users.find_one({"id": recipe["author_id"]})
        if author and author.get("family_id"):
            await db.recipes.update_one(
                {"id": recipe["id"]},
                {"$set": {"family_id": author["family_id"]}}
            )
            migrated += 1
    
    print(f"Migrated {migrated} recipes to authors' families")
```

### Important Notes

1. **No Migration Required**: The system works without migration
2. **Gradual Adoption**: Users can join/create families when ready
3. **Legacy Data Preserved**: All existing recipes remain accessible
4. **Migration is Optional**: Only migrate if you want to enforce family scoping for all content

---

## Step-by-Step Implementation

### STEP 1: Backend API Development

#### 1.1 Add Family Models to Backend

**File:** `backend/server.py`

**Step 1: Update UserResponse Model (Backward Compatible)**

Update the existing `UserResponse` model to include optional family fields:

```python
class UserResponse(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str
    name: str
    nickname: Optional[str] = None
    email: str
    avatar: Optional[str] = None
    family_id: Optional[str] = None  # NEW: Optional for backward compatibility
    role: Optional[str] = None       # NEW: Optional for backward compatibility
    created_at: str
```

**Step 2: Add Family Models**

Add these new Pydantic models:

```python
class FamilyCreate(BaseModel):
    name: str
    description: Optional[str] = None

class FamilyUpdate(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    cover_image: Optional[str] = None

class FamilyResponse(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str
    name: str
    owner_id: str
    invite_code: str
    metadata: Optional[dict] = None
    created_at: str

class FamilyJoinRequest(BaseModel):
    invite_code: str
```

**Step 3: Update RecipeResponse Model (Backward Compatible)**

Update the existing `RecipeResponse` model to include optional family_id:

```python
class RecipeResponse(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str
    family_id: Optional[str] = None  # NEW: Optional for backward compatibility
    title: str
    ingredients: List[str]
    instructions: str
    story: Optional[str] = None
    photos: List[str]
    cooking_time: int
    servings: int
    category: str
    difficulty: str
    author_id: str
    author_name: str
    created_at: str
```

#### 1.2 Implement Family Endpoints

**Create Family:**
```python
@api_router.post("/families", response_model=FamilyResponse)
async def create_family(family_data: FamilyCreate, user: dict = Depends(get_current_user)):
    # Generate unique invite code
    invite_code = str(uuid.uuid4())[:8].upper()
    
    family_id = str(uuid.uuid4())
    family_doc = {
        "id": family_id,
        "name": family_data.name,
        "owner_id": user["id"],
        "invite_code": invite_code,
        "metadata": {
            "description": family_data.description
        },
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    await db.families.insert_one(family_doc)
    
    # Update user to be keeper of this family
    await db.users.update_one(
        {"id": user["id"]},
        {"$set": {"family_id": family_id, "role": "keeper"}}
    )
    
    return FamilyResponse(**{k: v for k, v in family_doc.items() if k != "_id"})
```

**Join Family:**
```python
@api_router.post("/families/join", response_model=FamilyResponse)
async def join_family(join_data: FamilyJoinRequest, user: dict = Depends(get_current_user)):
    # Find family by invite code
    family = await db.families.find_one({"invite_code": join_data.invite_code.upper()})
    if not family:
        raise HTTPException(status_code=404, detail="Invalid invite code")
    
    # Update user to be member of this family
    await db.users.update_one(
        {"id": user["id"]},
        {"$set": {"family_id": family["id"], "role": "member"}}
    )
    
    return FamilyResponse(**{k: v for k, v in family.items() if k != "_id"})
```

**Get Family Details:**
```python
@api_router.get("/families/{family_id}", response_model=FamilyResponse)
async def get_family(family_id: str, user: dict = Depends(get_current_user)):
    # Verify user belongs to this family
    if user.get("family_id") != family_id:
        raise HTTPException(status_code=403, detail="Not a member of this family")
    
    family = await db.families.find_one({"id": family_id}, {"_id": 0})
    if not family:
        raise HTTPException(status_code=404, detail="Family not found")
    
    return FamilyResponse(**family)
```

#### 1.3 Update Recipe Endpoints for Family Scoping (Backward Compatible)

**Update GET /recipes:**
```python
@api_router.get("/recipes", response_model=List[RecipeResponse])
async def get_recipes(
    category: Optional[str] = None,
    author_id: Optional[str] = None,
    user: dict = Depends(get_current_user)
):
    # Backward compatible: Handle both family-scoped and legacy recipes
    user_family_id = user.get("family_id")
    
    if user_family_id:
        # User has a family: show family-scoped recipes only
        query = {"family_id": user_family_id}
    else:
        # User has no family: show legacy recipes (family_id is null)
        # This maintains backward compatibility for existing users
        query = {"family_id": None}
    
    # Apply filters
    if category:
        query["category"] = category
    if author_id:
        query["author_id"] = author_id
    
    recipes = await db.recipes.find(query, {"_id": 0}).sort("created_at", -1).to_list(100)
    return [RecipeResponse(**r) for r in recipes]
```

**Alternative Approach (More Flexible):**
If you want users without families to see ALL legacy recipes:
```python
@api_router.get("/recipes", response_model=List[RecipeResponse])
async def get_recipes(
    category: Optional[str] = None,
    author_id: Optional[str] = None,
    user: dict = Depends(get_current_user)
):
    user_family_id = user.get("family_id")
    
    if user_family_id:
        # User has family: show only family-scoped recipes
        query = {"family_id": user_family_id}
    else:
        # User has no family: show all legacy recipes (family_id is null)
        query = {"family_id": None}
    
    if category:
        query["category"] = category
    if author_id:
        query["author_id"] = author_id
    
    recipes = await db.recipes.find(query, {"_id": 0}).sort("created_at", -1).to_list(100)
    return [RecipeResponse(**r) for r in recipes]
```

**Update POST /recipes:**
```python
@api_router.post("/recipes", response_model=RecipeResponse)
async def create_recipe(recipe_data: RecipeCreate, user: dict = Depends(get_current_user)):
    # Backward compatible: Allow recipe creation even without family
    # But recommend joining/creating a family for better experience
    user_family_id = user.get("family_id")
    
    recipe_id = str(uuid.uuid4())
    display_name = user.get("nickname") or user["name"]
    recipe_doc = {
        "id": recipe_id,
        "family_id": user_family_id,  # Will be None if user has no family (legacy recipe)
        "title": recipe_data.title,
        "ingredients": recipe_data.ingredients,
        "instructions": recipe_data.instructions,
        "story": recipe_data.story,
        "photos": recipe_data.photos,
        "cooking_time": recipe_data.cooking_time,
        "servings": recipe_data.servings,
        "category": recipe_data.category,
        "difficulty": recipe_data.difficulty,
        "author_id": user["id"],
        "author_name": display_name,
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    await db.recipes.insert_one(recipe_doc)
    
    # Create notifications only if user has a family
    if user_family_id:
        family_members = await db.users.find(
            {"family_id": user_family_id, "id": {"$ne": user["id"]}},
            {"_id": 0, "id": 1}
        ).to_list(100)
        
        notifications = []
        for member in family_members:
            notification_doc = {
                "id": str(uuid.uuid4()),
                "user_id": member["id"],
                "type": "new_recipe",
                "message": f"{display_name} shared a new recipe: {recipe_data.title}",
                "recipe_id": recipe_id,
                "from_user_name": display_name,
                "is_read": False,
                "created_at": datetime.now(timezone.utc).isoformat()
            }
            notifications.append(notification_doc)
        
        if notifications:
            await db.notifications.insert_many(notifications)
    
    return RecipeResponse(**{k: v for k, v in recipe_doc.items() if k != "_id"})
```

**Update GET /recipes/{recipe_id}:**
```python
@api_router.get("/recipes/{recipe_id}", response_model=RecipeResponse)
async def get_recipe(recipe_id: str, user: dict = Depends(get_current_user)):
    recipe = await db.recipes.find_one({"id": recipe_id}, {"_id": 0})
    if not recipe:
        raise HTTPException(status_code=404, detail="Recipe not found")
    
    recipe_family_id = recipe.get("family_id")
    user_family_id = user.get("family_id")
    
    # Backward compatible access control:
    # 1. Legacy recipes (family_id is None): accessible to everyone
    # 2. Family-scoped recipes: only accessible to family members
    if recipe_family_id is None:
        # Legacy recipe: accessible to all users
        pass
    elif recipe_family_id != user_family_id:
        # Family-scoped recipe: user must be in the same family
        raise HTTPException(status_code=403, detail="Not authorized to view this recipe")
    
    return RecipeResponse(**recipe)
```

**Update DELETE /recipes/{recipe_id} with role check (Backward Compatible):**
```python
@api_router.delete("/recipes/{recipe_id}")
async def delete_recipe(recipe_id: str, user: dict = Depends(get_current_user)):
    recipe = await db.recipes.find_one({"id": recipe_id}, {"_id": 0})
    if not recipe:
        raise HTTPException(status_code=404, detail="Recipe not found")
    
    recipe_family_id = recipe.get("family_id")
    user_family_id = user.get("family_id")
    
    # Backward compatible access control:
    # 1. Legacy recipes (family_id is None): only author can delete
    # 2. Family-scoped recipes: author can always delete, keeper can delete any
    if recipe_family_id is None:
        # Legacy recipe: only author can delete
        if recipe["author_id"] != user["id"]:
            raise HTTPException(status_code=403, detail="Not authorized to delete this recipe")
    else:
        # Family-scoped recipe: check family membership
        if recipe_family_id != user_family_id:
            raise HTTPException(status_code=403, detail="Not authorized")
        
        # Role-based deletion: Keeper can delete any, Member can only delete own
        if recipe["author_id"] != user["id"] and user.get("role") != "keeper":
            raise HTTPException(status_code=403, detail="Only keepers can delete others' recipes")
    
    await db.recipes.delete_one({"id": recipe_id})
    return {"message": "Recipe deleted successfully"}
```

#### 1.4 Update User Profile Endpoint (Backward Compatible)

**Update GET /auth/me:**

The endpoint automatically works with the updated `UserResponse` model since the new fields are optional:

```python
@api_router.get("/auth/me", response_model=UserResponse)
async def get_me(user: dict = Depends(get_current_user)):
    # Backward compatible: Returns UserResponse with optional family fields
    # Existing users without family_id/role will have None values
    return UserResponse(
        id=user["id"],
        name=user["name"],
        nickname=user.get("nickname"),
        email=user["email"],
        avatar=user.get("avatar"),
        family_id=user.get("family_id"),  # Will be None for existing users
        role=user.get("role"),             # Will be None for existing users
        created_at=user["created_at"]
    )
```

**Optional: Extended Response with Family Details**

If you want to include full family details in the response, create an extended response model:

```python
class UserWithFamilyResponse(BaseModel):
    user: UserResponse
    family: Optional[FamilyResponse] = None

@api_router.get("/auth/me/extended", response_model=UserWithFamilyResponse)
async def get_me_extended(user: dict = Depends(get_current_user)):
    family = None
    if user.get("family_id"):
        family_doc = await db.families.find_one({"id": user["family_id"]}, {"_id": 0})
        if family_doc:
            family = FamilyResponse(**family_doc)
    
    return UserWithFamilyResponse(
        user=UserResponse(
            id=user["id"],
            name=user["name"],
            nickname=user.get("nickname"),
            email=user["email"],
            avatar=user.get("avatar"),
            family_id=user.get("family_id"),
            role=user.get("role"),
            created_at=user["created_at"]
        ),
        family=family
    )
```

---

### STEP 2: Flutter Project Structure Setup

#### 2.1 Create Folder Structure

```
lib/
├── models/
│   ├── user_model.dart
│   ├── family_model.dart
│   ├── recipe_model.dart
│   ├── comment_model.dart
│   └── notification_model.dart
├── services/
│   ├── api_service.dart
│   ├── auth_service.dart
│   ├── family_service.dart
│   ├── recipe_service.dart
│   └── notification_service.dart
├── screens/
│   ├── profile/
│   │   ├── profile_screen.dart
│   │   ├── my_recipes_screen.dart
│   │   └── settings_screen.dart
│   ├── family/
│   │   ├── create_family_screen.dart
│   │   ├── join_family_screen.dart
│   │   └── family_details_screen.dart
│   ├── recipes/
│   │   ├── recipe_detail_screen.dart (update for comments)
│   │   └── home_screen.dart (update for family scoping)
│   └── notifications/
│       └── notifications_screen.dart
├── widgets/
│   ├── family_card.dart
│   ├── role_badge.dart
│   ├── comment_item.dart
│   └── notification_item.dart
└── utils/
    ├── role_utils.dart
    └── family_guard.dart
```

#### 2.2 Create Models

**user_model.dart:**
```dart
class User {
  final String id;
  final String name;
  final String email;
  final String? nickname;
  final String? avatar;
  final String? familyId;
  final String? role; // 'keeper' or 'member'
  final DateTime createdAt;

  User({
    required this.id,
    required this.name,
    required this.email,
    this.nickname,
    this.avatar,
    this.familyId,
    this.role,
    required this.createdAt,
  });

  factory User.fromJson(Map<String, dynamic> json) {
    return User(
      id: json['id'],
      name: json['name'],
      email: json['email'],
      nickname: json['nickname'],
      avatar: json['avatar'],
      familyId: json['family_id'],
      role: json['role'],
      createdAt: DateTime.parse(json['created_at']),
    );
  }

  bool get isKeeper => role == 'keeper';
  bool get isMember => role == 'member';
  bool get hasFamily => familyId != null;
}
```

**family_model.dart:**
```dart
class Family {
  final String id;
  final String name;
  final String ownerId;
  final String inviteCode;
  final Map<String, dynamic>? metadata;
  final DateTime createdAt;

  Family({
    required this.id,
    required this.name,
    required this.ownerId,
    required this.inviteCode,
    this.metadata,
    required this.createdAt,
  });

  factory Family.fromJson(Map<String, dynamic> json) {
    return Family(
      id: json['id'],
      name: json['name'],
      ownerId: json['owner_id'],
      inviteCode: json['invite_code'],
      metadata: json['metadata'],
      createdAt: DateTime.parse(json['created_at']),
    );
  }
}
```

---

### STEP 3: Implement Profile Screen

#### 3.1 Create ProfileScreen Widget

**File:** `lib/screens/profile/profile_screen.dart`

```dart
import 'package:flutter/material.dart';
import '../../models/user_model.dart';
import '../../models/family_model.dart';
import '../../services/family_service.dart';
import '../../services/auth_service.dart';
import '../family/create_family_screen.dart';
import '../family/join_family_screen.dart';
import 'my_recipes_screen.dart';

class ProfileScreen extends StatefulWidget {
  @override
  _ProfileScreenState createState() => _ProfileScreenState();
}

class _ProfileScreenState extends State<ProfileScreen> {
  User? _user;
  Family? _family;
  bool _loading = true;

  @override
  void initState() {
    super.initState();
    _loadProfile();
  }

  Future<void> _loadProfile() async {
    setState(() => _loading = true);
    try {
      final user = await AuthService.getCurrentUser();
      Family? family;
      if (user?.familyId != null) {
        family = await FamilyService.getFamily(user!.familyId!);
      }
      setState(() {
        _user = user;
        _family = family;
        _loading = false;
      });
    } catch (e) {
      setState(() => _loading = false);
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text('Error loading profile: $e')),
      );
    }
  }

  @override
  Widget build(BuildContext context) {
    if (_loading) {
      return Scaffold(
        appBar: AppBar(title: Text('Profile')),
        body: Center(child: CircularProgressIndicator()),
      );
    }

    return Scaffold(
      appBar: AppBar(
        title: Text('Profile'),
        actions: [
          IconButton(
            icon: Icon(Icons.settings),
            onPressed: () => Navigator.pushNamed(context, '/settings'),
          ),
        ],
      ),
      body: RefreshIndicator(
        onRefresh: _loadProfile,
        child: SingleChildScrollView(
          physics: AlwaysScrollableScrollPhysics(),
          child: Column(
            children: [
              // Header Section
              _buildHeader(),
              SizedBox(height: 24),
              
              // Family Card
              _buildFamilyCard(),
              SizedBox(height: 24),
              
              // My Recipes Section
              _buildMyRecipesSection(),
              SizedBox(height: 24),
              
              // Logout Button
              _buildLogoutButton(),
            ],
          ),
        ),
      ),
    );
  }

  Widget _buildHeader() {
    return Container(
      padding: EdgeInsets.all(24),
      child: Column(
        children: [
          CircleAvatar(
            radius: 50,
            backgroundImage: _user?.avatar != null
                ? NetworkImage(_user!.avatar!)
                : null,
            child: _user?.avatar == null
                ? Icon(Icons.person, size: 50)
                : null,
          ),
          SizedBox(height: 16),
          Text(
            _user?.nickname ?? _user?.name ?? 'User',
            style: Theme.of(context).textTheme.headlineSmall,
          ),
          SizedBox(height: 4),
          Text(
            _user?.email ?? '',
            style: Theme.of(context).textTheme.bodyMedium?.copyWith(
              color: Colors.grey[600],
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildFamilyCard() {
    return Padding(
      padding: EdgeInsets.symmetric(horizontal: 16),
      child: Card(
        child: Padding(
          padding: EdgeInsets.all(16),
          child: _family == null
              ? Column(
                  children: [
                    Icon(Icons.group, size: 48, color: Colors.grey),
                    SizedBox(height: 16),
                    Text(
                      'Join or Create a Family',
                      style: Theme.of(context).textTheme.titleMedium,
                    ),
                    SizedBox(height: 8),
                    Text(
                      'Connect with your family to share recipes',
                      textAlign: TextAlign.center,
                      style: Theme.of(context).textTheme.bodySmall,
                    ),
                    SizedBox(height: 16),
                    Row(
                      mainAxisAlignment: MainAxisAlignment.center,
                      children: [
                        ElevatedButton.icon(
                          onPressed: () => _navigateToCreateFamily(),
                          icon: Icon(Icons.add),
                          label: Text('Create'),
                        ),
                        SizedBox(width: 16),
                        OutlinedButton.icon(
                          onPressed: () => _navigateToJoinFamily(),
                          icon: Icon(Icons.group_add),
                          label: Text('Join'),
                        ),
                      ],
                    ),
                  ],
                )
              : Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Row(
                      children: [
                        Icon(Icons.group, color: Theme.of(context).primaryColor),
                        SizedBox(width: 8),
                        Text(
                          _family!.name,
                          style: Theme.of(context).textTheme.titleLarge,
                        ),
                      ],
                    ),
                    SizedBox(height: 8),
                    RoleBadge(role: _user!.role!),
                    SizedBox(height: 16),
                    if (_user!.isKeeper)
                      Text(
                        'Invite Code: ${_family!.inviteCode}',
                        style: Theme.of(context).textTheme.bodySmall,
                      ),
                  ],
                ),
        ),
      ),
    );
  }

  Widget _buildMyRecipesSection() {
    return Padding(
      padding: EdgeInsets.symmetric(horizontal: 16),
      child: Card(
        child: ListTile(
          leading: Icon(Icons.book),
          title: Text('My Recipes'),
          trailing: Icon(Icons.chevron_right),
          onTap: () => Navigator.push(
            context,
            MaterialPageRoute(builder: (_) => MyRecipesScreen()),
          ),
        ),
      ),
    );
  }

  Widget _buildLogoutButton() {
    return Padding(
      padding: EdgeInsets.all(16),
      child: OutlinedButton.icon(
        onPressed: _handleLogout,
        icon: Icon(Icons.logout),
        label: Text('Logout'),
        style: OutlinedButton.styleFrom(
          foregroundColor: Colors.red,
        ),
      ),
    );
  }

  void _navigateToCreateFamily() async {
    final result = await Navigator.push(
      context,
      MaterialPageRoute(builder: (_) => CreateFamilyScreen()),
    );
    if (result == true) {
      _loadProfile();
    }
  }

  void _navigateToJoinFamily() async {
    final result = await Navigator.push(
      context,
      MaterialPageRoute(builder: (_) => JoinFamilyScreen()),
    );
    if (result == true) {
      _loadProfile();
    }
  }

  Future<void> _handleLogout() async {
    final confirm = await showDialog<bool>(
      context: context,
      builder: (context) => AlertDialog(
        title: Text('Logout'),
        content: Text('Are you sure you want to logout?'),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(context, false),
            child: Text('Cancel'),
          ),
          TextButton(
            onPressed: () => Navigator.pop(context, true),
            child: Text('Logout'),
          ),
        ],
      ),
    );

    if (confirm == true) {
      await AuthService.logout();
      Navigator.pushReplacementNamed(context, '/login');
    }
  }
}
```

#### 3.2 Create Role Badge Widget

**File:** `lib/widgets/role_badge.dart`

```dart
import 'package:flutter/material.dart';

class RoleBadge extends StatelessWidget {
  final String role;

  const RoleBadge({required this.role});

  @override
  Widget build(BuildContext context) {
    final isKeeper = role == 'keeper';
    return Chip(
      label: Text(
        isKeeper ? 'Keeper' : 'Member',
        style: TextStyle(
          color: Colors.white,
          fontSize: 12,
          fontWeight: FontWeight.bold,
        ),
      ),
      backgroundColor: isKeeper ? Colors.orange : Colors.blue,
      padding: EdgeInsets.symmetric(horizontal: 8, vertical: 4),
    );
  }
}
```

---

### STEP 4: Implement Family Creation & Joining

#### 4.1 Create Family Screen

**File:** `lib/screens/family/create_family_screen.dart`

```dart
import 'package:flutter/material.dart';
import '../../services/family_service.dart';
import '../../services/auth_service.dart';

class CreateFamilyScreen extends StatefulWidget {
  @override
  _CreateFamilyScreenState createState() => _CreateFamilyScreenState();
}

class _CreateFamilyScreenState extends State<CreateFamilyScreen> {
  final _formKey = GlobalKey<FormState>();
  final _nameController = TextEditingController();
  final _descriptionController = TextEditingController();
  bool _loading = false;

  @override
  void dispose() {
    _nameController.dispose();
    _descriptionController.dispose();
    super.dispose();
  }

  Future<void> _createFamily() async {
    if (!_formKey.currentState!.validate()) return;

    setState(() => _loading = true);
    try {
      await FamilyService.createFamily(
        name: _nameController.text.trim(),
        description: _descriptionController.text.trim().isEmpty
            ? null
            : _descriptionController.text.trim(),
      );
      
      Navigator.pop(context, true);
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text('Family created successfully!')),
      );
    } catch (e) {
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text('Error: $e')),
      );
    } finally {
      setState(() => _loading = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: Text('Create Family')),
      body: Form(
        key: _formKey,
        child: ListView(
          padding: EdgeInsets.all(16),
          children: [
            Text(
              'Create a new family group to share recipes',
              style: Theme.of(context).textTheme.bodyLarge,
            ),
            SizedBox(height: 24),
            TextFormField(
              controller: _nameController,
              decoration: InputDecoration(
                labelText: 'Family Name *',
                border: OutlineInputBorder(),
              ),
              validator: (value) {
                if (value == null || value.trim().isEmpty) {
                  return 'Please enter a family name';
                }
                return null;
              },
            ),
            SizedBox(height: 16),
            TextFormField(
              controller: _descriptionController,
              decoration: InputDecoration(
                labelText: 'Description (optional)',
                border: OutlineInputBorder(),
              ),
              maxLines: 3,
            ),
            SizedBox(height: 24),
            ElevatedButton(
              onPressed: _loading ? null : _createFamily,
              child: _loading
                  ? SizedBox(
                      height: 20,
                      width: 20,
                      child: CircularProgressIndicator(strokeWidth: 2),
                    )
                  : Text('Create Family'),
            ),
          ],
        ),
      ),
    );
  }
}
```

#### 4.2 Join Family Screen

**File:** `lib/screens/family/join_family_screen.dart`

```dart
import 'package:flutter/material.dart';
import '../../services/family_service.dart';

class JoinFamilyScreen extends StatefulWidget {
  @override
  _JoinFamilyScreenState createState() => _JoinFamilyScreenState();
}

class _JoinFamilyScreenState extends State<JoinFamilyScreen> {
  final _formKey = GlobalKey<FormState>();
  final _codeController = TextEditingController();
  bool _loading = false;

  @override
  void dispose() {
    _codeController.dispose();
    super.dispose();
  }

  Future<void> _joinFamily() async {
    if (!_formKey.currentState!.validate()) return;

    setState(() => _loading = true);
    try {
      await FamilyService.joinFamily(_codeController.text.trim().toUpperCase());
      
      Navigator.pop(context, true);
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text('Successfully joined family!')),
      );
    } catch (e) {
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text('Error: $e')),
      );
    } finally {
      setState(() => _loading = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: Text('Join Family')),
      body: Form(
        key: _formKey,
        child: ListView(
          padding: EdgeInsets.all(16),
          children: [
            Text(
              'Enter the invite code provided by your family keeper',
              style: Theme.of(context).textTheme.bodyLarge,
            ),
            SizedBox(height: 24),
            TextFormField(
              controller: _codeController,
              decoration: InputDecoration(
                labelText: 'Invite Code *',
                hintText: 'ABC12345',
                border: OutlineInputBorder(),
                helperText: 'Enter the 8-character invite code',
              ),
              textCapitalization: TextCapitalization.characters,
              maxLength: 8,
              validator: (value) {
                if (value == null || value.trim().isEmpty) {
                  return 'Please enter an invite code';
                }
                if (value.trim().length != 8) {
                  return 'Invite code must be 8 characters';
                }
                return null;
              },
            ),
            SizedBox(height: 24),
            ElevatedButton(
              onPressed: _loading ? null : _joinFamily,
              child: _loading
                  ? SizedBox(
                      height: 20,
                      width: 20,
                      child: CircularProgressIndicator(strokeWidth: 2),
                    )
                  : Text('Join Family'),
            ),
          ],
        ),
      ),
    );
  }
}
```

---

### STEP 5: Implement Family Service

**File:** `lib/services/family_service.dart`

```dart
import 'dart:convert';
import 'package:http/http.dart' as http;
import '../models/family_model.dart';
import '../services/auth_service.dart';
import '../utils/api_config.dart';

class FamilyService {
  static Future<Family> createFamily({
    required String name,
    String? description,
  }) async {
    final token = await AuthService.getToken();
    final response = await http.post(
      Uri.parse('${ApiConfig.baseUrl}/families'),
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer $token',
      },
      body: jsonEncode({
        'name': name,
        'description': description,
      }),
    );

    if (response.statusCode == 201) {
      return Family.fromJson(jsonDecode(response.body));
    } else {
      throw Exception('Failed to create family: ${response.body}');
    }
  }

  static Future<Family> joinFamily(String inviteCode) async {
    final token = await AuthService.getToken();
    final response = await http.post(
      Uri.parse('${ApiConfig.baseUrl}/families/join'),
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer $token',
      },
      body: jsonEncode({
        'invite_code': inviteCode,
      }),
    );

    if (response.statusCode == 200) {
      return Family.fromJson(jsonDecode(response.body));
    } else {
      throw Exception('Failed to join family: ${response.body}');
    }
  }

  static Future<Family> getFamily(String familyId) async {
    final token = await AuthService.getToken();
    final response = await http.get(
      Uri.parse('${ApiConfig.baseUrl}/families/$familyId'),
      headers: {
        'Authorization': 'Bearer $token',
      },
    );

    if (response.statusCode == 200) {
      return Family.fromJson(jsonDecode(response.body));
    } else {
      throw Exception('Failed to get family: ${response.body}');
    }
  }
}
```

---

### STEP 6: Implement Role-Based Access Control

#### 6.1 Create Role Utils

**File:** `lib/utils/role_utils.dart`

```dart
class RoleUtils {
  static bool canDeleteRecipe(String? userRole, String recipeAuthorId, String currentUserId) {
    // Keeper can delete any recipe in the family
    if (userRole == 'keeper') {
      return true;
    }
    // Member can only delete their own recipes
    return recipeAuthorId == currentUserId;
  }

  static bool canCreateFamily(String? userRole) {
    // Only users without a family can create one
    // This is handled by checking if user.familyId == null
    return true;
  }

  static bool canInviteMembers(String? userRole) {
    return userRole == 'keeper';
  }

  static bool canRemoveMembers(String? userRole) {
    return userRole == 'keeper';
  }
}
```

#### 6.2 Create Family Guard

**File:** `lib/utils/family_guard.dart`

```dart
import 'package:flutter/material.dart';
import '../services/auth_service.dart';
import '../models/user_model.dart';
import '../screens/family/create_family_screen.dart';
import '../screens/family/join_family_screen.dart';

class FamilyGuard {
  /// Checks if user has a family, redirects to join/create if not
  static Future<bool> requireFamily(BuildContext context) async {
    final user = await AuthService.getCurrentUser();
    
    if (user == null || user.familyId == null) {
      final result = await showDialog<bool>(
        context: context,
        builder: (context) => AlertDialog(
          title: Text('Family Required'),
          content: Text(
            'You need to be part of a family to access recipes. '
            'Would you like to create or join a family?',
          ),
          actions: [
            TextButton(
              onPressed: () => Navigator.pop(context, false),
              child: Text('Cancel'),
            ),
            TextButton(
              onPressed: () async {
                Navigator.pop(context);
                final action = await showDialog<String>(
                  context: context,
                  builder: (context) => AlertDialog(
                    title: Text('Choose Action'),
                    content: Column(
                      mainAxisSize: MainAxisSize.min,
                      children: [
                        ListTile(
                          leading: Icon(Icons.add),
                          title: Text('Create Family'),
                          onTap: () => Navigator.pop(context, 'create'),
                        ),
                        ListTile(
                          leading: Icon(Icons.group_add),
                          title: Text('Join Family'),
                          onTap: () => Navigator.pop(context, 'join'),
                        ),
                      ],
                    ),
                  ),
                );
                
                if (action == 'create') {
                  await Navigator.push(
                    context,
                    MaterialPageRoute(builder: (_) => CreateFamilyScreen()),
                  );
                } else if (action == 'join') {
                  await Navigator.push(
                    context,
                    MaterialPageRoute(builder: (_) => JoinFamilyScreen()),
                  );
                }
              },
              child: Text('Continue'),
            ),
          ],
        ),
      );
      
      if (result == false) {
        return false;
      }
      
      // Re-check after user action
      final updatedUser = await AuthService.getCurrentUser();
      return updatedUser?.familyId != null;
    }
    
    return true;
  }
}
```

---

### STEP 7: Update Home Screen for Family Scoping

**File:** `lib/screens/recipes/home_screen.dart` (Update existing)

Add family guard check:

```dart
@override
void initState() {
  super.initState();
  _checkFamilyAndLoadRecipes();
}

Future<void> _checkFamilyAndLoadRecipes() async {
  final hasFamily = await FamilyGuard.requireFamily(context);
  if (hasFamily) {
    _loadRecipes();
  }
}

Future<void> _loadRecipes() async {
  // Recipes will now automatically be filtered by family_id on backend
  // No need to pass family_id explicitly
  final recipes = await RecipeService.getRecipes();
  setState(() {
    _recipes = recipes;
  });
}
```

---

### STEP 8: Implement My Recipes Screen

**File:** `lib/screens/profile/my_recipes_screen.dart`

```dart
import 'package:flutter/material.dart';
import '../../models/recipe_model.dart';
import '../../services/recipe_service.dart';
import '../../services/auth_service.dart';
import '../recipes/recipe_detail_screen.dart';

class MyRecipesScreen extends StatefulWidget {
  @override
  _MyRecipesScreenState createState() => _MyRecipesScreenState();
}

class _MyRecipesScreenState extends State<MyRecipesScreen> {
  List<Recipe> _recipes = [];
  bool _loading = true;

  @override
  void initState() {
    super.initState();
    _loadMyRecipes();
  }

  Future<void> _loadMyRecipes() async {
    setState(() => _loading = true);
    try {
      final user = await AuthService.getCurrentUser();
      if (user != null) {
        final recipes = await RecipeService.getRecipesByAuthor(user.id);
        setState(() {
          _recipes = recipes;
          _loading = false;
        });
      }
    } catch (e) {
      setState(() => _loading = false);
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text('Error loading recipes: $e')),
      );
    }
  }

  Future<void> _deleteRecipe(String recipeId) async {
    final confirm = await showDialog<bool>(
      context: context,
      builder: (context) => AlertDialog(
        title: Text('Delete Recipe'),
        content: Text('Are you sure you want to delete this recipe?'),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(context, false),
            child: Text('Cancel'),
          ),
          TextButton(
            onPressed: () => Navigator.pop(context, true),
            child: Text('Delete', style: TextStyle(color: Colors.red)),
          ),
        ],
      ),
    );

    if (confirm == true) {
      try {
        await RecipeService.deleteRecipe(recipeId);
        _loadMyRecipes();
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text('Recipe deleted')),
        );
      } catch (e) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text('Error: $e')),
        );
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: Text('My Recipes')),
      body: _loading
          ? Center(child: CircularProgressIndicator())
          : _recipes.isEmpty
              ? Center(
                  child: Column(
                    mainAxisAlignment: MainAxisAlignment.center,
                    children: [
                      Icon(Icons.book_outlined, size: 64, color: Colors.grey),
                      SizedBox(height: 16),
                      Text(
                        'No recipes yet',
                        style: Theme.of(context).textTheme.titleLarge,
                      ),
                      SizedBox(height: 8),
                      Text(
                        'Start creating recipes to see them here',
                        style: Theme.of(context).textTheme.bodyMedium,
                      ),
                    ],
                  ),
                )
              : RefreshIndicator(
                  onRefresh: _loadMyRecipes,
                  child: ListView.builder(
                    itemCount: _recipes.length,
                    itemBuilder: (context, index) {
                      final recipe = _recipes[index];
                      return ListTile(
                        leading: recipe.photos.isNotEmpty
                            ? Image.network(
                                recipe.photos.first,
                                width: 60,
                                height: 60,
                                fit: BoxFit.cover,
                              )
                            : Icon(Icons.restaurant, size: 40),
                        title: Text(recipe.title),
                        subtitle: Text(recipe.category),
                        trailing: PopupMenuButton(
                          itemBuilder: (context) => [
                            PopupMenuItem(
                              child: ListTile(
                                leading: Icon(Icons.edit),
                                title: Text('Edit'),
                                onTap: () {
                                  Navigator.pop(context);
                                  // Navigate to edit screen
                                },
                              ),
                            ),
                            PopupMenuItem(
                              child: ListTile(
                                leading: Icon(Icons.delete, color: Colors.red),
                                title: Text('Delete', style: TextStyle(color: Colors.red)),
                                onTap: () {
                                  Navigator.pop(context);
                                  _deleteRecipe(recipe.id);
                                },
                              ),
                            ),
                          ],
                        ),
                        onTap: () => Navigator.push(
                          context,
                          MaterialPageRoute(
                            builder: (_) => RecipeDetailScreen(recipeId: recipe.id),
                          ),
                        ),
                      );
                    },
                  ),
                ),
    );
  }
}
```

---

### STEP 9: Implement Comments on Recipes

#### 9.1 Update Recipe Detail Screen

**File:** `lib/screens/recipes/recipe_detail_screen.dart` (Update existing)

Add comments section:

```dart
class _RecipeDetailScreenState extends State<RecipeDetailScreen> {
  Recipe? _recipe;
  List<Comment> _comments = [];
  final _commentController = TextEditingController();
  bool _loading = true;
  bool _sendingComment = false;

  @override
  void initState() {
    super.initState();
    _loadRecipeAndComments();
  }

  Future<void> _loadRecipeAndComments() async {
    setState(() => _loading = true);
    try {
      final recipe = await RecipeService.getRecipe(widget.recipeId);
      final comments = await CommentService.getComments(widget.recipeId);
      setState(() {
        _recipe = recipe;
        _comments = comments;
        _loading = false;
      });
    } catch (e) {
      setState(() => _loading = false);
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text('Error: $e')),
      );
    }
  }

  Future<void> _addComment() async {
    if (_commentController.text.trim().isEmpty) return;

    setState(() => _sendingComment = true);
    try {
      await CommentService.addComment(
        widget.recipeId,
        _commentController.text.trim(),
      );
      _commentController.clear();
      _loadRecipeAndComments();
    } catch (e) {
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text('Error adding comment: $e')),
      );
    } finally {
      setState(() => _sendingComment = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    // ... existing recipe display code ...
    
    // Add comments section before closing scaffold
    return Scaffold(
      // ... existing code ...
      body: _loading
          ? Center(child: CircularProgressIndicator())
          : _recipe == null
              ? Center(child: Text('Recipe not found'))
              : SingleChildScrollView(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      // Recipe details...
                      
                      // Comments Section
                      Divider(),
                      Padding(
                        padding: EdgeInsets.all(16),
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Text(
                              'Comments',
                              style: Theme.of(context).textTheme.titleLarge,
                            ),
                            SizedBox(height: 16),
                            
                            // Comment Input
                            Row(
                              children: [
                                Expanded(
                                  child: TextField(
                                    controller: _commentController,
                                    decoration: InputDecoration(
                                      hintText: 'Add a comment...',
                                      border: OutlineInputBorder(),
                                    ),
                                    maxLines: null,
                                  ),
                                ),
                                SizedBox(width: 8),
                                IconButton(
                                  icon: _sendingComment
                                      ? SizedBox(
                                          width: 20,
                                          height: 20,
                                          child: CircularProgressIndicator(strokeWidth: 2),
                                        )
                                      : Icon(Icons.send),
                                  onPressed: _sendingComment ? null : _addComment,
                                ),
                              ],
                            ),
                            
                            SizedBox(height: 16),
                            
                            // Comments List
                            if (_comments.isEmpty)
                              Padding(
                                padding: EdgeInsets.all(16),
                                child: Text(
                                  'No comments yet. Be the first to comment!',
                                  style: Theme.of(context).textTheme.bodySmall,
                                ),
                              )
                            else
                              ..._comments.map((comment) => CommentItem(comment: comment)),
                          ],
                        ),
                      ),
                    ],
                  ),
                ),
    );
  }
}
```

#### 9.2 Create Comment Item Widget

**File:** `lib/widgets/comment_item.dart`

```dart
import 'package:flutter/material.dart';
import 'package:intl/intl.dart';
import '../models/comment_model.dart';

class CommentItem extends StatelessWidget {
  final Comment comment;

  const CommentItem({required this.comment});

  @override
  Widget build(BuildContext context) {
    return Card(
      margin: EdgeInsets.only(bottom: 8),
      child: ListTile(
        leading: CircleAvatar(
          child: Text(comment.userName[0].toUpperCase()),
        ),
        title: Text(
          comment.userName,
          style: TextStyle(fontWeight: FontWeight.bold),
        ),
        subtitle: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            SizedBox(height: 4),
            Text(comment.text),
            SizedBox(height: 4),
            Text(
              DateFormat('MMM d, y • h:mm a').format(comment.createdAt),
              style: TextStyle(fontSize: 12, color: Colors.grey[600]),
            ),
          ],
        ),
      ),
    );
  }
}
```

#### 9.3 Create Comment Service

**File:** `lib/services/comment_service.dart`

```dart
import 'dart:convert';
import 'package:http/http.dart' as http;
import '../models/comment_model.dart';
import '../services/auth_service.dart';
import '../utils/api_config.dart';

class CommentService {
  static Future<List<Comment>> getComments(String recipeId) async {
    final token = await AuthService.getToken();
    final response = await http.get(
      Uri.parse('${ApiConfig.baseUrl}/recipes/$recipeId/comments'),
      headers: {
        'Authorization': 'Bearer $token',
      },
    );

    if (response.statusCode == 200) {
      final List<dynamic> data = jsonDecode(response.body);
      return data.map((json) => Comment.fromJson(json)).toList();
    } else {
      throw Exception('Failed to load comments: ${response.body}');
    }
  }

  static Future<Comment> addComment(String recipeId, String text) async {
    final token = await AuthService.getToken();
    final response = await http.post(
      Uri.parse('${ApiConfig.baseUrl}/recipes/$recipeId/comments'),
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer $token',
      },
      body: jsonEncode({'text': text}),
    );

    if (response.statusCode == 201) {
      return Comment.fromJson(jsonDecode(response.body));
    } else {
      throw Exception('Failed to add comment: ${response.body}');
    }
  }

  static Future<void> deleteComment(String commentId) async {
    final token = await AuthService.getToken();
    final response = await http.delete(
      Uri.parse('${ApiConfig.baseUrl}/comments/$commentId'),
      headers: {
        'Authorization': 'Bearer $token',
      },
    );

    if (response.statusCode != 200) {
      throw Exception('Failed to delete comment: ${response.body}');
    }
  }
}
```

---

### STEP 10: Implement Notifications Screen

#### 10.1 Create Notifications Screen

**File:** `lib/screens/notifications/notifications_screen.dart`

```dart
import 'package:flutter/material.dart';
import '../../models/notification_model.dart';
import '../../services/notification_service.dart';
import '../../screens/recipes/recipe_detail_screen.dart';

class NotificationsScreen extends StatefulWidget {
  @override
  _NotificationsScreenState createState() => _NotificationsScreenState();
}

class _NotificationsScreenState extends State<NotificationsScreen> {
  List<Notification> _notifications = [];
  bool _loading = true;

  @override
  void initState() {
    super.initState();
    _loadNotifications();
  }

  Future<void> _loadNotifications() async {
    setState(() => _loading = true);
    try {
      final notifications = await NotificationService.getNotifications();
      setState(() {
        _notifications = notifications;
        _loading = false;
      });
    } catch (e) {
      setState(() => _loading = false);
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text('Error loading notifications: $e')),
      );
    }
  }

  Future<void> _markAsRead(String notificationId) async {
    try {
      await NotificationService.markAsRead(notificationId);
      _loadNotifications();
    } catch (e) {
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text('Error: $e')),
      );
    }
  }

  Future<void> _markAllAsRead() async {
    try {
      await NotificationService.markAllAsRead();
      _loadNotifications();
    } catch (e) {
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text('Error: $e')),
      );
    }
  }

  void _handleNotificationTap(Notification notification) {
    if (!notification.isRead) {
      _markAsRead(notification.id);
    }
    
    if (notification.recipeId != null) {
      Navigator.push(
        context,
        MaterialPageRoute(
          builder: (_) => RecipeDetailScreen(recipeId: notification.recipeId!),
        ),
      );
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: Text('Notifications'),
        actions: [
          if (_notifications.any((n) => !n.isRead))
            TextButton(
              onPressed: _markAllAsRead,
              child: Text('Mark All Read'),
            ),
        ],
      ),
      body: _loading
          ? Center(child: CircularProgressIndicator())
          : _notifications.isEmpty
              ? Center(
                  child: Column(
                    mainAxisAlignment: MainAxisAlignment.center,
                    children: [
                      Icon(Icons.notifications_none, size: 64, color: Colors.grey),
                      SizedBox(height: 16),
                      Text(
                        'No notifications',
                        style: Theme.of(context).textTheme.titleLarge,
                      ),
                    ],
                  ),
                )
              : RefreshIndicator(
                  onRefresh: _loadNotifications,
                  child: ListView.builder(
                    itemCount: _notifications.length,
                    itemBuilder: (context, index) {
                      final notification = _notifications[index];
                      return NotificationItem(
                        notification: notification,
                        onTap: () => _handleNotificationTap(notification),
                      );
                    },
                  ),
                ),
    );
  }
}
```

#### 10.2 Create Notification Item Widget

**File:** `lib/widgets/notification_item.dart`

```dart
import 'package:flutter/material.dart';
import 'package:intl/intl.dart';
import '../models/notification_model.dart';

class NotificationItem extends StatelessWidget {
  final Notification notification;
  final VoidCallback onTap;

  const NotificationItem({
    required this.notification,
    required this.onTap,
  });

  IconData _getIcon() {
    switch (notification.type) {
      case 'new_recipe':
        return Icons.restaurant;
      case 'comment':
        return Icons.comment;
      case 'family_invite':
        return Icons.group_add;
      default:
        return Icons.notifications;
    }
  }

  @override
  Widget build(BuildContext context) {
    return ListTile(
      leading: CircleAvatar(
        backgroundColor: notification.isRead
            ? Colors.grey[300]
            : Theme.of(context).primaryColor,
        child: Icon(
          _getIcon(),
          color: notification.isRead ? Colors.grey[600] : Colors.white,
        ),
      ),
      title: Text(
        notification.message,
        style: TextStyle(
          fontWeight: notification.isRead ? FontWeight.normal : FontWeight.bold,
        ),
      ),
      subtitle: Text(
        DateFormat('MMM d, y • h:mm a').format(notification.createdAt),
        style: TextStyle(fontSize: 12),
      ),
      trailing: notification.isRead
          ? null
          : Container(
              width: 8,
              height: 8,
              decoration: BoxDecoration(
                color: Theme.of(context).primaryColor,
                shape: BoxShape.circle,
              ),
            ),
      onTap: onTap,
    );
  }
}
```

#### 10.3 Create Notification Service

**File:** `lib/services/notification_service.dart`

```dart
import 'dart:convert';
import 'package:http/http.dart' as http;
import '../models/notification_model.dart';
import '../services/auth_service.dart';
import '../utils/api_config.dart';

class NotificationService {
  static Future<List<Notification>> getNotifications() async {
    final token = await AuthService.getToken();
    final response = await http.get(
      Uri.parse('${ApiConfig.baseUrl}/notifications'),
      headers: {
        'Authorization': 'Bearer $token',
      },
    );

    if (response.statusCode == 200) {
      final List<dynamic> data = jsonDecode(response.body);
      return data.map((json) => Notification.fromJson(json)).toList();
    } else {
      throw Exception('Failed to load notifications: ${response.body}');
    }
  }

  static Future<int> getUnreadCount() async {
    final token = await AuthService.getToken();
    final response = await http.get(
      Uri.parse('${ApiConfig.baseUrl}/notifications/unread-count'),
      headers: {
        'Authorization': 'Bearer $token',
      },
    );

    if (response.statusCode == 200) {
      final data = jsonDecode(response.body);
      return data['count'] as int;
    } else {
      throw Exception('Failed to get unread count: ${response.body}');
    }
  }

  static Future<void> markAsRead(String notificationId) async {
    final token = await AuthService.getToken();
    final response = await http.put(
      Uri.parse('${ApiConfig.baseUrl}/notifications/$notificationId/read'),
      headers: {
        'Authorization': 'Bearer $token',
      },
    );

    if (response.statusCode != 200) {
      throw Exception('Failed to mark notification as read: ${response.body}');
    }
  }

  static Future<void> markAllAsRead() async {
    final token = await AuthService.getToken();
    final response = await http.put(
      Uri.parse('${ApiConfig.baseUrl}/notifications/read-all'),
      headers: {
        'Authorization': 'Bearer $token',
      },
    );

    if (response.statusCode != 200) {
      throw Exception('Failed to mark all notifications as read: ${response.body}');
    }
  }
}
```

---

## Testing & QA Checklist

### Functional Testing

- [ ] **User Profile**
  - [ ] Profile screen displays user information correctly
  - [ ] Avatar displays or shows default icon
  - [ ] Email and name are shown correctly
  - [ ] Profile updates reflect immediately

- [ ] **Family Creation**
  - [ ] User can create a family
  - [ ] User becomes keeper after creation
  - [ ] Invite code is generated and displayed
  - [ ] Family name validation works
  - [ ] Error handling for duplicate names (if applicable)

- [ ] **Family Joining**
  - [ ] User can join family with valid invite code
  - [ ] User becomes member after joining
  - [ ] Invalid invite code shows error
  - [ ] User cannot join if already in a family (or handles gracefully)

- [ ] **Role System**
  - [ ] Keeper badge displays correctly
  - [ ] Member badge displays correctly
  - [ ] Keeper can delete any recipe in family
  - [ ] Member can only delete own recipes
  - [ ] Role-based UI elements show/hide correctly

- [ ] **Family Scoping**
  - [ ] Recipes only visible to family members
  - [ ] User without family sees join/create prompt
  - [ ] Home feed filters by family_id
  - [ ] Recipe creation requires family membership
  - [ ] Cannot access recipes from other families

- [ ] **My Recipes**
  - [ ] Shows only recipes authored by current user
  - [ ] Edit button works (navigates to edit screen)
  - [ ] Delete button works with confirmation
  - [ ] Empty state displays correctly
  - [ ] Refresh works correctly

- [ ] **Comments**
  - [ ] Comments display on recipe detail screen
  - [ ] Can add new comment
  - [ ] Comments show user name and timestamp
  - [ ] Empty comment state displays
  - [ ] Comments load in correct order (newest first)
  - [ ] Comment deletion works (if implemented)

- [ ] **Notifications**
  - [ ] Notifications list displays correctly
  - [ ] Unread notifications are highlighted
  - [ ] Tap notification marks as read
  - [ ] Tap notification navigates to recipe (if applicable)
  - [ ] Mark all as read works
  - [ ] Unread count badge displays (if in app bar)
  - [ ] Empty state displays correctly
  - [ ] Pull to refresh works

### Edge Cases & Error Handling

- [ ] Network error handling (no internet)
- [ ] API error responses handled gracefully
- [ ] Invalid token handling (logout and redirect)
- [ ] User leaves family scenario
- [ ] Family deleted scenario
- [ ] Concurrent modifications handling

### Performance Testing

- [ ] Profile screen loads quickly
- [ ] Recipe list pagination (if implemented)
- [ ] Comments load efficiently
- [ ] Notifications don't cause lag
- [ ] Image loading optimized

### UI/UX Testing

- [ ] All screens follow design guidelines
- [ ] Consistent spacing and typography
- [ ] Loading states displayed
- [ ] Error messages are user-friendly
- [ ] Navigation flows are intuitive
- [ ] Role badges are visually distinct
- [ ] Family card is informative

---

## Future-Ready Considerations

### Multi-Family Support Structure

Even though MVP supports one family per user, structure the code to support multiple families:

1. **UserFamily Junction Table** (Future)
   ```dart
   class UserFamily {
     final String userId;
     final String familyId;
     final String role;
     final DateTime joinedAt;
   }
   ```

2. **Family Switching** (Future)
   - Store current active family in app state
   - Allow switching between families
   - Update all queries to use active family

3. **API Structure**
   - Keep family_id as query parameter (not just user context)
   - Support `?family_id=xxx` in recipe endpoints

### Database Migration Notes

When implementing multi-family support later:

1. Create `user_families` collection
2. Migrate existing `user.family_id` to junction records
3. Add `active_family_id` to user model
4. Update all queries to use junction table

---

## Summary

This implementation guide provides a complete roadmap for Milestone 5. Key deliverables:

1. ✅ Backend API updates for family management
2. ✅ Profile screen with family card
3. ✅ Family creation and joining flows
4. ✅ Role-based access control (Keeper/Member)
5. ✅ Family-scoped recipe access
6. ✅ My Recipes section
7. ✅ Comments on recipes
8. ✅ Notifications list with read state

**Estimated Implementation Time:** 5-7 working days

**Dependencies:**
- Backend API must be updated first
- Flutter models and services can be developed in parallel
- UI screens depend on services being ready

**Next Steps:**
1. Review and approve backend API changes
2. Set up Flutter project structure
3. Implement backend endpoints
4. Implement Flutter services
5. Build UI screens
6. Test thoroughly
7. Deploy and verify

---

## Appendix: API Endpoint Summary

### New Endpoints Required

```
POST   /api/families
GET    /api/families/{family_id}
POST   /api/families/join
```

### Updated Endpoints

```
GET    /api/auth/me          - Include family_id and role
GET    /api/recipes          - Filter by family_id
POST   /api/recipes          - Require family_id
GET    /api/recipes/{id}     - Check family_id access
DELETE /api/recipes/{id}     - Role-based deletion
```

### Existing Endpoints (No Changes)

```
GET    /api/recipes/{id}/comments
POST   /api/recipes/{id}/comments
GET    /api/notifications
PUT    /api/notifications/{id}/read
PUT    /api/notifications/read-all
```

---

**Document Version:** 1.0  
**Last Updated:** [Current Date]  
**Author:** Development Team
