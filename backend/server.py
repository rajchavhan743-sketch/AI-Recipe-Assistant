from fastapi import FastAPI, APIRouter, HTTPException
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
import os
import logging
from pathlib import Path
from pydantic import BaseModel, Field
from typing import List, Optional
import uuid
from datetime import datetime
import requests
import json

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

# MongoDB connection
mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]

# Create the main app without a prefix
app = FastAPI()

# Create a router with the /api prefix
api_router = APIRouter(prefix="/api")

# Gemini API configuration
GEMINI_API_KEY = os.getenv("GEMINI_API_KEY")
GEMINI_API_URL = f"https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key={GEMINI_API_KEY}"

# Define Models
class StatusCheck(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    client_name: str
    timestamp: datetime = Field(default_factory=datetime.utcnow)

class StatusCheckCreate(BaseModel):
    client_name: str

class Recipe(BaseModel):
    name: str
    description: str
    ingredients: List[str]
    steps: List[str]
    missing_items: List[str]

class RecipeRequest(BaseModel):
    ingredients: str
    language: Optional[str] = "English"

class RecipeResponse(BaseModel):
    recipes: List[Recipe]

class ShoppingItem(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    name: str
    added_at: datetime = Field(default_factory=datetime.utcnow)

class ShoppingItemCreate(BaseModel):
    name: str

class TranslateRequest(BaseModel):
    text: str
    target_language: str

class UserSettings(BaseModel):
    preferred_language: str = "English"
    updated_at: datetime = Field(default_factory=datetime.utcnow)

# Add your routes to the router instead of directly to app
@api_router.get("/")
async def root():
    return {"message": "AI Recipe & Grocery Assistant API"}

@api_router.post("/status", response_model=StatusCheck)
async def create_status_check(input: StatusCheckCreate):
    status_dict = input.dict()
    status_obj = StatusCheck(**status_dict)
    _ = await db.status_checks.insert_one(status_obj.dict())
    return status_obj

@api_router.get("/status", response_model=List[StatusCheck])
async def get_status_checks():
    status_checks = await db.status_checks.find().to_list(1000)
    return [StatusCheck(**status_check) for status_check in status_checks]

@api_router.post("/recipes", response_model=RecipeResponse)
async def get_recipes(request: RecipeRequest):
    try:
        # Create the prompt for Gemini
        prompt = f"""You are an expert chef and helpful cooking assistant.

The user has the following ingredients: {request.ingredients}.

Task:
1. Suggest 2 simple recipes the user can cook with these ingredients.
2. For each recipe, include:
   - "name" (string) → Recipe title
   - "description" (string) → Short 1–2 line description
   - "ingredients" (array of strings) → Full list of needed ingredients
   - "steps" (array of strings) → Step-by-step instructions
   - "missing_items" (array of strings) → Ingredients that the user does NOT have

Important:
- Return ONLY valid JSON.
- Do not include extra text, explanations, or formatting outside of the JSON.
- Respond in {request.language} language.

Format Example:
{{
  "recipes": [
    {{
      "name": "Tomato Rice",
      "description": "A quick and tasty rice dish with tomatoes.",
      "ingredients": ["Rice", "Tomatoes", "Onion", "Salt", "Oil"],
      "steps": ["Cook rice", "Sauté onions and tomatoes", "Mix with rice"],
      "missing_items": ["Onion", "Salt", "Oil"]
    }},
    {{
      "name": "Chicken Curry",
      "description": "A simple chicken curry with spices.",
      "ingredients": ["Chicken", "Tomatoes", "Onion", "Garlic", "Salt"],
      "steps": ["Sauté onions and garlic", "Add chicken", "Add tomatoes and spices", "Cook until done"],
      "missing_items": ["Garlic", "Salt"]
    }}
  ]
}}"""

        # Prepare the request payload for Gemini API
        payload = {
            "contents": [{
                "role": "user",
                "parts": [{"text": prompt}]
            }]
        }

        # Make the API call to Gemini
        response = requests.post(
            GEMINI_API_URL,
            headers={"Content-Type": "application/json"},
            json=payload,
            timeout=30
        )

        if response.status_code != 200:
            raise HTTPException(status_code=500, detail=f"Gemini API error: {response.status_code}")

        gemini_response = response.json()
        
        # Extract the generated text from Gemini response
        if "candidates" not in gemini_response or not gemini_response["candidates"]:
            raise HTTPException(status_code=500, detail="No response from Gemini API")

        generated_text = gemini_response["candidates"][0]["content"]["parts"][0]["text"]
        
        # Try to parse the JSON response
        try:
            # Clean up the response if it has markdown formatting
            if "```json" in generated_text:
                generated_text = generated_text.split("```json")[1].split("```")[0]
            elif "```" in generated_text:
                generated_text = generated_text.split("```")[1].split("```")[0]
            
            recipe_data = json.loads(generated_text.strip())
            return RecipeResponse(**recipe_data)
        except json.JSONDecodeError as e:
            logging.error(f"Failed to parse Gemini response: {generated_text}")
            raise HTTPException(status_code=500, detail="Failed to parse recipe data from AI response")

    except requests.RequestException as e:
        logging.error(f"Request to Gemini API failed: {e}")
        raise HTTPException(status_code=500, detail="Failed to connect to AI service")
    except Exception as e:
        logging.error(f"Unexpected error in get_recipes: {e}")
        raise HTTPException(status_code=500, detail="Internal server error")

@api_router.post("/translate")
async def translate_text(request: TranslateRequest):
    try:
        prompt = f"Translate the following text to {request.target_language}. Return only the translated text without any additional explanations:\n\n{request.text}"
        
        payload = {
            "contents": [{
                "role": "user",
                "parts": [{"text": prompt}]
            }]
        }

        response = requests.post(
            GEMINI_API_URL,
            headers={"Content-Type": "application/json"},
            json=payload,
            timeout=30
        )

        if response.status_code != 200:
            raise HTTPException(status_code=500, detail=f"Translation API error: {response.status_code}")

        gemini_response = response.json()
        
        if "candidates" not in gemini_response or not gemini_response["candidates"]:
            raise HTTPException(status_code=500, detail="No response from translation API")

        translated_text = gemini_response["candidates"][0]["content"]["parts"][0]["text"].strip()
        
        return {"translated_text": translated_text}

    except requests.RequestException as e:
        logging.error(f"Translation request failed: {e}")
        raise HTTPException(status_code=500, detail="Failed to connect to translation service")
    except Exception as e:
        logging.error(f"Unexpected error in translate_text: {e}")
        raise HTTPException(status_code=500, detail="Translation failed")

# Shopping List endpoints
@api_router.get("/shopping-list", response_model=List[ShoppingItem])
async def get_shopping_list():
    try:
        items = await db.shopping_items.find().to_list(1000)
        return [ShoppingItem(**item) for item in items]
    except Exception as e:
        logging.error(f"Error fetching shopping list: {e}")
        raise HTTPException(status_code=500, detail="Failed to fetch shopping list")

@api_router.post("/shopping-list", response_model=ShoppingItem)
async def add_shopping_item(item: ShoppingItemCreate):
    try:
        shopping_item = ShoppingItem(name=item.name)
        await db.shopping_items.insert_one(shopping_item.dict())
        return shopping_item
    except Exception as e:
        logging.error(f"Error adding shopping item: {e}")
        raise HTTPException(status_code=500, detail="Failed to add shopping item")

@api_router.post("/shopping-list/bulk")
async def add_bulk_shopping_items(items: List[str]):
    try:
        shopping_items = [ShoppingItem(name=item) for item in items]
        if shopping_items:
            await db.shopping_items.insert_many([item.dict() for item in shopping_items])
        return {"message": f"Added {len(shopping_items)} items to shopping list"}
    except Exception as e:
        logging.error(f"Error adding bulk shopping items: {e}")
        raise HTTPException(status_code=500, detail="Failed to add shopping items")

@api_router.delete("/shopping-list")
async def clear_shopping_list():
    try:
        result = await db.shopping_items.delete_many({})
        return {"message": f"Cleared {result.deleted_count} items from shopping list"}
    except Exception as e:
        logging.error(f"Error clearing shopping list: {e}")
        raise HTTPException(status_code=500, detail="Failed to clear shopping list")

@api_router.delete("/shopping-list/{item_id}")
async def delete_shopping_item(item_id: str):
    try:
        result = await db.shopping_items.delete_one({"id": item_id})
        if result.deleted_count == 0:
            raise HTTPException(status_code=404, detail="Shopping item not found")
        return {"message": "Shopping item deleted successfully"}
    except HTTPException:
        raise
    except Exception as e:
        logging.error(f"Error deleting shopping item: {e}")
        raise HTTPException(status_code=500, detail="Failed to delete shopping item")

# User Settings endpoints
@api_router.get("/settings")
async def get_user_settings():
    try:
        settings = await db.user_settings.find_one({"_id": "default"})
        if not settings:
            # Return default settings
            return {"preferred_language": "English"}
        return {"preferred_language": settings.get("preferred_language", "English")}
    except Exception as e:
        logging.error(f"Error fetching user settings: {e}")
        raise HTTPException(status_code=500, detail="Failed to fetch user settings")

@api_router.post("/settings")
async def update_user_settings(settings: UserSettings):
    try:
        await db.user_settings.update_one(
            {"_id": "default"},
            {"$set": {
                "preferred_language": settings.preferred_language,
                "updated_at": settings.updated_at
            }},
            upsert=True
        )
        return {"message": "Settings updated successfully"}
    except Exception as e:
        logging.error(f"Error updating user settings: {e}")
        raise HTTPException(status_code=500, detail="Failed to update settings")

# Include the router in the main app
app.include_router(api_router)

app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

@app.on_event("shutdown")
async def shutdown_db_client():
    client.close()