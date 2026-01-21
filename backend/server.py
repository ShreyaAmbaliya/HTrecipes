from fastapi import FastAPI, APIRouter, HTTPException, Depends, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
import os
import logging
from pathlib import Path
from pydantic import BaseModel, Field, ConfigDict, EmailStr
from typing import List, Optional
import uuid
from datetime import datetime, timezone, timedelta
import jwt
import bcrypt

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

# MongoDB connection
mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]

# JWT Configuration
JWT_SECRET = os.environ['JWT_SECRET']
JWT_ALGORITHM = "HS256"
JWT_EXPIRATION_HOURS = 24 * 7  # 7 days

# Create the main app
app = FastAPI()
api_router = APIRouter(prefix="/api")
security = HTTPBearer()

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

# ===================== MODELS =====================

class UserCreate(BaseModel):
    name: str
    email: EmailStr
    password: str
    nickname: Optional[str] = None

class UserLogin(BaseModel):
    email: EmailStr
    password: str

class UserUpdate(BaseModel):
    nickname: Optional[str] = None
    avatar: Optional[str] = None  # Base64 encoded image

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

class TokenResponse(BaseModel):
    token: str
    user: UserResponse

# Notification Models
class NotificationResponse(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str
    user_id: str
    type: str  # "new_recipe", "comment", etc.
    message: str
    recipe_id: Optional[str] = None
    from_user_name: str
    is_read: bool
    created_at: str

class RecipeCreate(BaseModel):
    title: str
    ingredients: List[str]
    instructions: str
    story: Optional[str] = None  # Optional story behind the recipe
    photos: List[str] = []  # Base64 encoded images
    cooking_time: int  # minutes
    servings: int
    category: str
    difficulty: str  # easy, medium, hard

class RecipeUpdate(BaseModel):
    title: Optional[str] = None
    ingredients: Optional[List[str]] = None
    instructions: Optional[str] = None
    story: Optional[str] = None
    photos: Optional[List[str]] = None
    cooking_time: Optional[int] = None
    servings: Optional[int] = None
    category: Optional[str] = None
    difficulty: Optional[str] = None

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

# Comment Models
class CommentCreate(BaseModel):
    text: str

class CommentResponse(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str
    recipe_id: str
    user_id: str
    user_name: str
    text: str
    created_at: str

# Family Models
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

class FamilyTransferKeeperRequest(BaseModel):
    new_keeper_id: str

class FamilyMemberResponse(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str
    name: str
    nickname: Optional[str] = None
    email: str
    avatar: Optional[str] = None
    role: str
    joined_at: Optional[str] = None  # Will use created_at from user as proxy

# ===================== AUTH HELPERS =====================

def hash_password(password: str) -> str:
    return bcrypt.hashpw(password.encode('utf-8'), bcrypt.gensalt()).decode('utf-8')

def verify_password(password: str, hashed: str) -> bool:
    return bcrypt.checkpw(password.encode('utf-8'), hashed.encode('utf-8'))

def create_token(user_id: str) -> str:
    payload = {
        "user_id": user_id,
        "exp": datetime.now(timezone.utc) + timedelta(hours=JWT_EXPIRATION_HOURS)
    }
    return jwt.encode(payload, JWT_SECRET, algorithm=JWT_ALGORITHM)

async def get_current_user(credentials: HTTPAuthorizationCredentials = Depends(security)):
    try:
        token = credentials.credentials
        payload = jwt.decode(token, JWT_SECRET, algorithms=[JWT_ALGORITHM])
        user_id = payload.get("user_id")
        if not user_id:
            raise HTTPException(status_code=401, detail="Invalid token")
        
        user = await db.users.find_one({"id": user_id}, {"_id": 0})
        if not user:
            raise HTTPException(status_code=401, detail="User not found")
        return user
    except jwt.ExpiredSignatureError:
        raise HTTPException(status_code=401, detail="Token expired")
    except jwt.InvalidTokenError:
        raise HTTPException(status_code=401, detail="Invalid token")

# ===================== AUTH ROUTES =====================

@api_router.post("/auth/register", response_model=TokenResponse)
async def register(user_data: UserCreate):
    # Check if user exists
    existing = await db.users.find_one({"email": user_data.email.lower()})
    if existing:
        raise HTTPException(status_code=400, detail="Email already registered")
    
    # Create user
    user_id = str(uuid.uuid4())
    user_doc = {
        "id": user_id,
        "name": user_data.name,
        "nickname": user_data.nickname,
        "email": user_data.email.lower(),
        "password_hash": hash_password(user_data.password),
        "avatar": None,
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    await db.users.insert_one(user_doc)
    
    token = create_token(user_id)
    user_response = UserResponse(
        id=user_id,
        name=user_data.name,
        nickname=user_data.nickname,
        email=user_data.email.lower(),
        avatar=None,
        family_id=None,  # New users start without a family
        role=None,        # New users start without a role
        created_at=user_doc["created_at"]
    )
    return TokenResponse(token=token, user=user_response)

@api_router.post("/auth/login", response_model=TokenResponse)
async def login(credentials: UserLogin):
    user = await db.users.find_one({"email": credentials.email.lower()}, {"_id": 0})
    if not user or not verify_password(credentials.password, user["password_hash"]):
        raise HTTPException(status_code=401, detail="Invalid email or password")
    
    token = create_token(user["id"])
    user_response = UserResponse(
        id=user["id"],
        name=user["name"],
        nickname=user.get("nickname"),
        email=user["email"],
        avatar=user.get("avatar"),
        family_id=user.get("family_id"),  # Will be None for existing users
        role=user.get("role"),             # Will be None for existing users
        created_at=user["created_at"]
    )
    return TokenResponse(token=token, user=user_response)

@api_router.get("/auth/me", response_model=UserResponse)
async def get_me(user: dict = Depends(get_current_user)):
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

@api_router.put("/auth/profile", response_model=UserResponse)
async def update_profile(update_data: UserUpdate, user: dict = Depends(get_current_user)):
    update_fields = {}
    if update_data.nickname is not None:
        update_fields["nickname"] = update_data.nickname if update_data.nickname.strip() else None
    if update_data.avatar is not None:
        update_fields["avatar"] = update_data.avatar if update_data.avatar else None
    
    if update_fields:
        await db.users.update_one({"id": user["id"]}, {"$set": update_fields})
    
    updated_user = await db.users.find_one({"id": user["id"]}, {"_id": 0})
    return UserResponse(
        id=updated_user["id"],
        name=updated_user["name"],
        nickname=updated_user.get("nickname"),
        email=updated_user["email"],
        avatar=updated_user.get("avatar"),
        family_id=updated_user.get("family_id"),
        role=updated_user.get("role"),
        created_at=updated_user["created_at"]
    )

# ===================== RECIPE ROUTES =====================

@api_router.post("/recipes", response_model=RecipeResponse)
async def create_recipe(recipe_data: RecipeCreate, user: dict = Depends(get_current_user)):
    # Backward compatible: Allow recipe creation even without family
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
        query = {"family_id": None}
    
    # Apply filters
    if category:
        query["category"] = category
    if author_id:
        query["author_id"] = author_id
    
    recipes = await db.recipes.find(query, {"_id": 0}).sort("created_at", -1).to_list(100)
    return [RecipeResponse(**r) for r in recipes]

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

@api_router.put("/recipes/{recipe_id}", response_model=RecipeResponse)
async def update_recipe(recipe_id: str, recipe_data: RecipeUpdate, user: dict = Depends(get_current_user)):
    recipe = await db.recipes.find_one({"id": recipe_id}, {"_id": 0})
    if not recipe:
        raise HTTPException(status_code=404, detail="Recipe not found")
    
    # Check authorization: only author can update
    if recipe["author_id"] != user["id"]:
        raise HTTPException(status_code=403, detail="Not authorized to update this recipe")
    
    # Backward compatible: Check family access for family-scoped recipes
    recipe_family_id = recipe.get("family_id")
    user_family_id = user.get("family_id")
    
    if recipe_family_id is not None and recipe_family_id != user_family_id:
        raise HTTPException(status_code=403, detail="Not authorized to update this recipe")
    
    update_data = {k: v for k, v in recipe_data.model_dump().items() if v is not None}
    if update_data:
        await db.recipes.update_one({"id": recipe_id}, {"$set": update_data})
    
    updated = await db.recipes.find_one({"id": recipe_id}, {"_id": 0})
    return RecipeResponse(**updated)

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

@api_router.get("/categories", response_model=List[str])
async def get_categories():
    categories = await db.recipes.distinct("category")
    default_categories = ["Main Course", "Appetizer", "Dessert", "Soup", "Salad", "Breakfast", "Snack", "Beverage"]
    all_cats = list(set(default_categories + categories))
    return sorted(all_cats)

# ===================== COMMENT ROUTES =====================

@api_router.post("/recipes/{recipe_id}/comments", response_model=CommentResponse)
async def create_comment(recipe_id: str, comment_data: CommentCreate, user: dict = Depends(get_current_user)):
    # Verify recipe exists
    recipe = await db.recipes.find_one({"id": recipe_id})
    if not recipe:
        raise HTTPException(status_code=404, detail="Recipe not found")
    
    comment_id = str(uuid.uuid4())
    display_name = user.get("nickname") or user["name"]
    comment_doc = {
        "id": comment_id,
        "recipe_id": recipe_id,
        "user_id": user["id"],
        "user_name": display_name,
        "text": comment_data.text,
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    await db.comments.insert_one(comment_doc)
    
    # Create notification for recipe author if they're in a family and it's not their own comment
    if recipe["author_id"] != user["id"]:
        recipe_family_id = recipe.get("family_id")
        if recipe_family_id:
            # Check if recipe author is in the same family
            author = await db.users.find_one({"id": recipe["author_id"]}, {"_id": 0})
            if author and author.get("family_id") == recipe_family_id:
                notification_doc = {
                    "id": str(uuid.uuid4()),
                    "user_id": recipe["author_id"],
                    "type": "comment",
                    "message": f"{display_name} commented on your recipe: {recipe['title']}",
                    "recipe_id": recipe_id,
                    "from_user_name": display_name,
                    "is_read": False,
                    "created_at": datetime.now(timezone.utc).isoformat()
                }
                await db.notifications.insert_one(notification_doc)
    
    return CommentResponse(**{k: v for k, v in comment_doc.items() if k != "_id"})

@api_router.get("/recipes/{recipe_id}/comments", response_model=List[CommentResponse])
async def get_comments(recipe_id: str):
    comments = await db.comments.find({"recipe_id": recipe_id}, {"_id": 0}).sort("created_at", -1).to_list(100)
    return [CommentResponse(**c) for c in comments]

@api_router.delete("/comments/{comment_id}")
async def delete_comment(comment_id: str, user: dict = Depends(get_current_user)):
    comment = await db.comments.find_one({"id": comment_id}, {"_id": 0})
    if not comment:
        raise HTTPException(status_code=404, detail="Comment not found")
    if comment["user_id"] != user["id"]:
        raise HTTPException(status_code=403, detail="Not authorized to delete this comment")
    
    await db.comments.delete_one({"id": comment_id})
    return {"message": "Comment deleted successfully"}

# ===================== NOTIFICATION ROUTES =====================

@api_router.get("/notifications", response_model=List[NotificationResponse])
async def get_notifications(user: dict = Depends(get_current_user)):
    notifications = await db.notifications.find(
        {"user_id": user["id"]}, 
        {"_id": 0}
    ).sort("created_at", -1).to_list(50)
    return [NotificationResponse(**n) for n in notifications]

@api_router.get("/notifications/unread-count")
async def get_unread_count(user: dict = Depends(get_current_user)):
    count = await db.notifications.count_documents({"user_id": user["id"], "is_read": False})
    return {"count": count}

@api_router.put("/notifications/{notification_id}/read")
async def mark_notification_read(notification_id: str, user: dict = Depends(get_current_user)):
    result = await db.notifications.update_one(
        {"id": notification_id, "user_id": user["id"]},
        {"$set": {"is_read": True}}
    )
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Notification not found")
    return {"message": "Notification marked as read"}

@api_router.put("/notifications/read-all")
async def mark_all_notifications_read(user: dict = Depends(get_current_user)):
    await db.notifications.update_many(
        {"user_id": user["id"], "is_read": False},
        {"$set": {"is_read": True}}
    )
    return {"message": "All notifications marked as read"}

# ===================== FAMILY ROUTES =====================

@api_router.post("/families", response_model=FamilyResponse)
async def create_family(family_data: FamilyCreate, user: dict = Depends(get_current_user)):
    # Check if user already has a family
    if user.get("family_id"):
        raise HTTPException(status_code=400, detail="User already belongs to a family")
    
    # Generate unique invite code
    invite_code = str(uuid.uuid4())[:8].upper()
    
    # Ensure invite code is unique
    while await db.families.find_one({"invite_code": invite_code}):
        invite_code = str(uuid.uuid4())[:8].upper()
    
    family_id = str(uuid.uuid4())
    family_doc = {
        "id": family_id,
        "name": family_data.name,
        "owner_id": user["id"],
        "invite_code": invite_code,
        "metadata": {
            "description": family_data.description
        } if family_data.description else None,
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    await db.families.insert_one(family_doc)
    
    # Update user to be keeper of this family
    await db.users.update_one(
        {"id": user["id"]},
        {"$set": {"family_id": family_id, "role": "keeper"}}
    )
    
    return FamilyResponse(**{k: v for k, v in family_doc.items() if k != "_id"})

@api_router.post("/families/join", response_model=FamilyResponse)
async def join_family(join_data: FamilyJoinRequest, user: dict = Depends(get_current_user)):
    # Check if user already has a family
    if user.get("family_id"):
        raise HTTPException(status_code=400, detail="User already belongs to a family")
    
    # Find family by invite code
    family = await db.families.find_one({"invite_code": join_data.invite_code.upper()}, {"_id": 0})
    if not family:
        raise HTTPException(status_code=404, detail="Invalid invite code")
    
    # Update user to be member of this family
    await db.users.update_one(
        {"id": user["id"]},
        {"$set": {"family_id": family["id"], "role": "member"}}
    )
    
    # Create notification for family keeper
    keeper = await db.users.find_one({"id": family["owner_id"]}, {"_id": 0})
    if keeper:
        display_name = user.get("nickname") or user["name"]
        notification_doc = {
            "id": str(uuid.uuid4()),
            "user_id": family["owner_id"],
            "type": "family_invite",
            "message": f"{display_name} joined your family: {family['name']}",
            "from_user_name": display_name,
            "is_read": False,
            "created_at": datetime.now(timezone.utc).isoformat()
        }
        await db.notifications.insert_one(notification_doc)
    
    return FamilyResponse(**family)

@api_router.get("/families/{family_id}", response_model=FamilyResponse)
async def get_family(family_id: str, user: dict = Depends(get_current_user)):
    # Verify user belongs to this family
    if user.get("family_id") != family_id:
        raise HTTPException(status_code=403, detail="Not a member of this family")
    
    family = await db.families.find_one({"id": family_id}, {"_id": 0})
    if not family:
        raise HTTPException(status_code=404, detail="Family not found")
    
    return FamilyResponse(**family)

@api_router.put("/families/{family_id}", response_model=FamilyResponse)
async def update_family(family_id: str, family_data: FamilyUpdate, user: dict = Depends(get_current_user)):
    # Verify user belongs to this family and is the keeper
    if user.get("family_id") != family_id:
        raise HTTPException(status_code=403, detail="Not a member of this family")
    
    if user.get("role") != "keeper":
        raise HTTPException(status_code=403, detail="Only the family keeper can update the family")
    
    family = await db.families.find_one({"id": family_id}, {"_id": 0})
    if not family:
        raise HTTPException(status_code=404, detail="Family not found")
    
    # Build update fields
    update_fields = {}
    if family_data.name is not None:
        update_fields["name"] = family_data.name
    
    # Handle metadata updates
    metadata_updates = {}
    if family_data.description is not None:
        metadata_updates["description"] = family_data.description
    if family_data.cover_image is not None:
        metadata_updates["cover_image"] = family_data.cover_image
    
    # Update metadata if needed
    if metadata_updates:
        current_metadata = family.get("metadata") or {}
        updated_metadata = {**current_metadata, **metadata_updates}
        update_fields["metadata"] = updated_metadata
    
    # Apply updates
    if update_fields:
        await db.families.update_one({"id": family_id}, {"$set": update_fields})
    
    updated_family = await db.families.find_one({"id": family_id}, {"_id": 0})
    return FamilyResponse(**updated_family)

@api_router.delete("/families/{family_id}")
async def delete_family(family_id: str, user: dict = Depends(get_current_user)):
    # Verify user belongs to this family and is the keeper
    if user.get("family_id") != family_id:
        raise HTTPException(status_code=403, detail="Not a member of this family")
    
    if user.get("role") != "keeper":
        raise HTTPException(status_code=403, detail="Only the family keeper can delete the family")
    
    family = await db.families.find_one({"id": family_id}, {"_id": 0})
    if not family:
        raise HTTPException(status_code=404, detail="Family not found")
    
    # Remove all family members' family associations
    await db.users.update_many(
        {"family_id": family_id},
        {"$unset": {"family_id": "", "role": ""}}
    )
    
    # Delete the family
    await db.families.delete_one({"id": family_id})
    
    return {"message": "Family deleted successfully. All members have been removed from the family."}

@api_router.get("/families/{family_id}/members", response_model=List[FamilyMemberResponse])
async def get_family_members(family_id: str, user: dict = Depends(get_current_user)):
    # Verify user belongs to this family
    if user.get("family_id") != family_id:
        raise HTTPException(status_code=403, detail="Not a member of this family")
    
    # Verify family exists
    family = await db.families.find_one({"id": family_id}, {"_id": 0})
    if not family:
        raise HTTPException(status_code=404, detail="Family not found")
    
    # Get all family members
    members = await db.users.find(
        {"family_id": family_id},
        {"_id": 0, "id": 1, "name": 1, "nickname": 1, "email": 1, "avatar": 1, "role": 1, "created_at": 1}
    ).to_list(100)
    
    # Convert to response model
    member_responses = []
    for member in members:
        member_responses.append(FamilyMemberResponse(
            id=member["id"],
            name=member["name"],
            nickname=member.get("nickname"),
            email=member["email"],
            avatar=member.get("avatar"),
            role=member.get("role", "member"),
            joined_at=member.get("created_at")  # Using created_at as proxy for joined_at
        ))
    
    return member_responses

@api_router.delete("/families/{family_id}/members/{user_id}")
async def remove_family_member(family_id: str, user_id: str, user: dict = Depends(get_current_user)):
    # Verify user belongs to this family and is the keeper
    if user.get("family_id") != family_id:
        raise HTTPException(status_code=403, detail="Not a member of this family")
    
    if user.get("role") != "keeper":
        raise HTTPException(status_code=403, detail="Only the family keeper can remove members")
    
    # Verify family exists
    family = await db.families.find_one({"id": family_id}, {"_id": 0})
    if not family:
        raise HTTPException(status_code=404, detail="Family not found")
    
    # Prevent keeper from removing themselves
    if user_id == user["id"]:
        raise HTTPException(status_code=400, detail="Keeper cannot remove themselves. Delete the family instead.")
    
    # Verify the member exists and belongs to this family
    member = await db.users.find_one({"id": user_id, "family_id": family_id}, {"_id": 0})
    if not member:
        raise HTTPException(status_code=404, detail="Member not found or does not belong to this family")
    
    # Remove member from family
    await db.users.update_one(
        {"id": user_id},
        {"$unset": {"family_id": "", "role": ""}}
    )
    
    # Create notification for removed member
    display_name = user.get("nickname") or user["name"]
    notification_doc = {
        "id": str(uuid.uuid4()),
        "user_id": user_id,
        "type": "family_invite",
        "message": f"You have been removed from {family['name']} by {display_name}",
        "from_user_name": display_name,
        "is_read": False,
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    await db.notifications.insert_one(notification_doc)
    
    return {"message": "Member removed from family successfully"}

@api_router.delete("/families/{family_id}/leave")
async def leave_family(family_id: str, user: dict = Depends(get_current_user)):
    """
    Allow a member to leave the family themselves.
    - Regular members can leave immediately
    - Keeper can only leave if they are the only member, or after transferring keeper role
    """
    # Verify user belongs to this family
    if user.get("family_id") != family_id:
        raise HTTPException(status_code=403, detail="Not a member of this family")
    
    # Verify family exists
    family = await db.families.find_one({"id": family_id}, {"_id": 0})
    if not family:
        raise HTTPException(status_code=404, detail="Family not found")
    
    user_role = user.get("role")
    is_keeper = user_role == "keeper"
    
    # Check if user is the keeper
    if is_keeper:
        # Count total members in the family
        member_count = await db.users.count_documents({"family_id": family_id})
        
        if member_count > 1:
            # Keeper cannot leave if there are other members
            raise HTTPException(
                status_code=400,
                detail="Keeper cannot leave the family while other members exist. Please transfer the keeper role first or remove other members."
            )
        # If keeper is the only member, they can leave (family will be empty)
    
    # Remove user from family
    await db.users.update_one(
        {"id": user["id"]},
        {"$unset": {"family_id": "", "role": ""}}
    )
    
    # If keeper was the only member and left, optionally delete the family
    # Or keep it for potential future members (your choice)
    # For now, we'll keep the family but it will have no members
    
    # Create notification for family keeper (if there is one and it's not the leaving user)
    if not is_keeper and family.get("owner_id") != user["id"]:
        display_name = user.get("nickname") or user["name"]
        notification_doc = {
            "id": str(uuid.uuid4()),
            "user_id": family["owner_id"],
            "type": "family_invite",
            "message": f"{display_name} left your family: {family['name']}",
            "from_user_name": display_name,
            "is_read": False,
            "created_at": datetime.now(timezone.utc).isoformat()
        }
        await db.notifications.insert_one(notification_doc)
    
    return {"message": "Successfully left the family"}

@api_router.put("/families/{family_id}/transfer-keeper")
async def transfer_keeper(
    family_id: str,
    transfer_data: FamilyTransferKeeperRequest,
    user: dict = Depends(get_current_user)
):
    """
    Transfer the keeper role from the current keeper to another member.
    Only the current keeper can transfer their role.
    """
    # Verify user belongs to this family and is the keeper
    if user.get("family_id") != family_id:
        raise HTTPException(status_code=403, detail="Not a member of this family")
    
    if user.get("role") != "keeper":
        raise HTTPException(
            status_code=403,
            detail="Only the family keeper can transfer the keeper role"
        )
    
    # Verify family exists
    family = await db.families.find_one({"id": family_id}, {"_id": 0})
    if not family:
        raise HTTPException(status_code=404, detail="Family not found")
    
    # Prevent transferring to yourself
    if transfer_data.new_keeper_id == user["id"]:
        raise HTTPException(
            status_code=400,
            detail="Cannot transfer keeper role to yourself"
        )
    
    # Verify the new keeper exists and is a member of this family
    new_keeper = await db.users.find_one(
        {"id": transfer_data.new_keeper_id, "family_id": family_id},
        {"_id": 0}
    )
    if not new_keeper:
        raise HTTPException(
            status_code=404,
            detail="New keeper not found or is not a member of this family"
        )
    
    # Transfer keeper role
    # 1. Update family owner_id to new keeper
    await db.families.update_one(
        {"id": family_id},
        {"$set": {"owner_id": transfer_data.new_keeper_id}}
    )
    
    # 2. Update new keeper's role to "keeper"
    await db.users.update_one(
        {"id": transfer_data.new_keeper_id},
        {"$set": {"role": "keeper"}}
    )
    
    # 3. Update old keeper's role to "member"
    await db.users.update_one(
        {"id": user["id"]},
        {"$set": {"role": "member"}}
    )
    
    # Create notifications
    old_keeper_name = user.get("nickname") or user["name"]
    new_keeper_name = new_keeper.get("nickname") or new_keeper["name"]
    
    # Notify new keeper
    notification_doc_new = {
        "id": str(uuid.uuid4()),
        "user_id": transfer_data.new_keeper_id,
        "type": "family_invite",
        "message": f"You are now the keeper of {family['name']}",
        "from_user_name": old_keeper_name,
        "is_read": False,
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    await db.notifications.insert_one(notification_doc_new)
    
    # Notify other family members (optional - you can skip this if not needed)
    other_members = await db.users.find(
        {
            "family_id": family_id,
            "id": {"$nin": [user["id"], transfer_data.new_keeper_id]}
        },
        {"_id": 0, "id": 1}
    ).to_list(100)
    
    if other_members:
        notifications = []
        for member in other_members:
            notification_doc = {
                "id": str(uuid.uuid4()),
                "user_id": member["id"],
                "type": "family_invite",
                "message": f"{new_keeper_name} is now the keeper of {family['name']}",
                "from_user_name": old_keeper_name,
                "is_read": False,
                "created_at": datetime.now(timezone.utc).isoformat()
            }
            notifications.append(notification_doc)
        
        if notifications:
            await db.notifications.insert_many(notifications)
    
    return {"message": f"Keeper role successfully transferred to {new_keeper_name}"}

# ===================== HEALTH CHECK =====================

@api_router.get("/")
async def root():
    return {"message": "Honor Touré Family Recipe API"}

@api_router.get("/health")
async def health():
    return {"status": "healthy"}

# Include router and middleware
app.include_router(api_router)

app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=os.environ.get('CORS_ORIGINS', '*').split(','),
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.on_event("shutdown")
async def shutdown_db_client():
    client.close()
