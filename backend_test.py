#!/usr/bin/env python3
"""
Backend API Test Suite for AI Recipe & Grocery Assistant
Tests all backend endpoints and Gemini API integration
"""

import requests
import json
import os
from dotenv import load_dotenv
import time

# Load environment variables
load_dotenv('/app/frontend/.env')

# Get backend URL from frontend environment
BACKEND_URL = os.getenv('EXPO_PUBLIC_BACKEND_URL', 'https://kitchenpal.preview.emergentagent.com')
API_BASE_URL = f"{BACKEND_URL}/api"

print(f"Testing backend API at: {API_BASE_URL}")

def test_api_health():
    """Test basic API health check"""
    print("\n=== Testing API Health Check ===")
    try:
        response = requests.get(f"{API_BASE_URL}/", timeout=10)
        print(f"Status Code: {response.status_code}")
        print(f"Response: {response.json()}")
        
        if response.status_code == 200:
            data = response.json()
            if "message" in data and "AI Recipe" in data["message"]:
                print("✅ API Health Check: PASSED")
                return True
            else:
                print("❌ API Health Check: FAILED - Unexpected response format")
                return False
        else:
            print(f"❌ API Health Check: FAILED - Status code {response.status_code}")
            return False
    except Exception as e:
        print(f"❌ API Health Check: FAILED - {str(e)}")
        return False

def test_recipe_generation():
    """Test recipe generation with Gemini API"""
    print("\n=== Testing Recipe Generation ===")
    try:
        payload = {
            "ingredients": "rice, tomatoes, onions",
            "language": "English"
        }
        
        response = requests.post(
            f"{API_BASE_URL}/recipes",
            json=payload,
            headers={"Content-Type": "application/json"},
            timeout=30
        )
        
        print(f"Status Code: {response.status_code}")
        
        if response.status_code == 200:
            data = response.json()
            print(f"Response structure: {list(data.keys())}")
            
            # Validate response structure
            if "recipes" in data and isinstance(data["recipes"], list):
                recipes = data["recipes"]
                print(f"Number of recipes returned: {len(recipes)}")
                
                if len(recipes) > 0:
                    recipe = recipes[0]
                    required_fields = ["name", "description", "ingredients", "steps", "missing_items"]
                    
                    print(f"First recipe structure: {list(recipe.keys())}")
                    
                    all_fields_present = all(field in recipe for field in required_fields)
                    
                    if all_fields_present:
                        print(f"✅ Recipe name: {recipe['name']}")
                        print(f"✅ Recipe description: {recipe['description']}")
                        print(f"✅ Ingredients count: {len(recipe['ingredients'])}")
                        print(f"✅ Steps count: {len(recipe['steps'])}")
                        print(f"✅ Missing items count: {len(recipe['missing_items'])}")
                        print("✅ Recipe Generation: PASSED")
                        return True
                    else:
                        missing_fields = [field for field in required_fields if field not in recipe]
                        print(f"❌ Recipe Generation: FAILED - Missing fields: {missing_fields}")
                        return False
                else:
                    print("❌ Recipe Generation: FAILED - No recipes returned")
                    return False
            else:
                print("❌ Recipe Generation: FAILED - Invalid response structure")
                print(f"Response: {data}")
                return False
        else:
            print(f"❌ Recipe Generation: FAILED - Status code {response.status_code}")
            print(f"Response: {response.text}")
            return False
            
    except Exception as e:
        print(f"❌ Recipe Generation: FAILED - {str(e)}")
        return False

def test_shopping_list_operations():
    """Test all shopping list operations"""
    print("\n=== Testing Shopping List Operations ===")
    
    # Test 1: Get initial shopping list (should be empty or existing items)
    print("\n--- Test 1: Get Shopping List ---")
    try:
        response = requests.get(f"{API_BASE_URL}/shopping-list", timeout=10)
        print(f"Status Code: {response.status_code}")
        
        if response.status_code == 200:
            initial_items = response.json()
            print(f"Initial shopping list items: {len(initial_items)}")
            print("✅ Get Shopping List: PASSED")
        else:
            print(f"❌ Get Shopping List: FAILED - Status code {response.status_code}")
            return False
    except Exception as e:
        print(f"❌ Get Shopping List: FAILED - {str(e)}")
        return False
    
    # Test 2: Clear shopping list first
    print("\n--- Test 2: Clear Shopping List ---")
    try:
        response = requests.delete(f"{API_BASE_URL}/shopping-list", timeout=10)
        print(f"Status Code: {response.status_code}")
        
        if response.status_code == 200:
            data = response.json()
            print(f"Clear response: {data}")
            print("✅ Clear Shopping List: PASSED")
        else:
            print(f"❌ Clear Shopping List: FAILED - Status code {response.status_code}")
            return False
    except Exception as e:
        print(f"❌ Clear Shopping List: FAILED - {str(e)}")
        return False
    
    # Test 3: Add single item
    print("\n--- Test 3: Add Single Item ---")
    try:
        payload = {"name": "Fresh Basil"}
        response = requests.post(
            f"{API_BASE_URL}/shopping-list",
            json=payload,
            headers={"Content-Type": "application/json"},
            timeout=10
        )
        
        print(f"Status Code: {response.status_code}")
        
        if response.status_code == 200:
            data = response.json()
            print(f"Added item: {data}")
            if "name" in data and data["name"] == "Fresh Basil":
                print("✅ Add Single Item: PASSED")
            else:
                print("❌ Add Single Item: FAILED - Unexpected response format")
                return False
        else:
            print(f"❌ Add Single Item: FAILED - Status code {response.status_code}")
            return False
    except Exception as e:
        print(f"❌ Add Single Item: FAILED - {str(e)}")
        return False
    
    # Test 4: Add bulk items
    print("\n--- Test 4: Add Bulk Items ---")
    try:
        bulk_items = ["Olive Oil", "Garlic Cloves", "Parmesan Cheese"]
        response = requests.post(
            f"{API_BASE_URL}/shopping-list/bulk",
            json=bulk_items,
            headers={"Content-Type": "application/json"},
            timeout=10
        )
        
        print(f"Status Code: {response.status_code}")
        
        if response.status_code == 200:
            data = response.json()
            print(f"Bulk add response: {data}")
            if "message" in data and "3" in data["message"]:
                print("✅ Add Bulk Items: PASSED")
            else:
                print("❌ Add Bulk Items: FAILED - Unexpected response format")
                return False
        else:
            print(f"❌ Add Bulk Items: FAILED - Status code {response.status_code}")
            return False
    except Exception as e:
        print(f"❌ Add Bulk Items: FAILED - {str(e)}")
        return False
    
    # Test 5: Verify items were added
    print("\n--- Test 5: Verify Items Added ---")
    try:
        response = requests.get(f"{API_BASE_URL}/shopping-list", timeout=10)
        print(f"Status Code: {response.status_code}")
        
        if response.status_code == 200:
            items = response.json()
            print(f"Total items in list: {len(items)}")
            
            if len(items) == 4:  # 1 single + 3 bulk items
                item_names = [item["name"] for item in items]
                print(f"Item names: {item_names}")
                expected_items = ["Fresh Basil", "Olive Oil", "Garlic Cloves", "Parmesan Cheese"]
                
                if all(item in item_names for item in expected_items):
                    print("✅ Verify Items Added: PASSED")
                    return True
                else:
                    print("❌ Verify Items Added: FAILED - Missing expected items")
                    return False
            else:
                print(f"❌ Verify Items Added: FAILED - Expected 4 items, got {len(items)}")
                return False
        else:
            print(f"❌ Verify Items Added: FAILED - Status code {response.status_code}")
            return False
    except Exception as e:
        print(f"❌ Verify Items Added: FAILED - {str(e)}")
        return False

def test_translation_service():
    """Test translation service with Gemini API"""
    print("\n=== Testing Translation Service ===")
    try:
        payload = {
            "text": "Hello World",
            "target_language": "Hindi"
        }
        
        response = requests.post(
            f"{API_BASE_URL}/translate",
            json=payload,
            headers={"Content-Type": "application/json"},
            timeout=30
        )
        
        print(f"Status Code: {response.status_code}")
        
        if response.status_code == 200:
            data = response.json()
            print(f"Response: {data}")
            
            if "translated_text" in data:
                translated_text = data["translated_text"]
                print(f"Original: Hello World")
                print(f"Translated: {translated_text}")
                
                # Basic validation - translated text should be different and non-empty
                if translated_text and translated_text.strip() != "Hello World":
                    print("✅ Translation Service: PASSED")
                    return True
                else:
                    print("❌ Translation Service: FAILED - Translation appears invalid")
                    return False
            else:
                print("❌ Translation Service: FAILED - Missing translated_text in response")
                return False
        else:
            print(f"❌ Translation Service: FAILED - Status code {response.status_code}")
            print(f"Response: {response.text}")
            return False
            
    except Exception as e:
        print(f"❌ Translation Service: FAILED - {str(e)}")
        return False

def test_user_settings():
    """Test user settings operations"""
    print("\n=== Testing User Settings ===")
    
    # Test 1: Get default settings
    print("\n--- Test 1: Get Default Settings ---")
    try:
        response = requests.get(f"{API_BASE_URL}/settings", timeout=10)
        print(f"Status Code: {response.status_code}")
        
        if response.status_code == 200:
            data = response.json()
            print(f"Default settings: {data}")
            
            if "preferred_language" in data:
                print(f"Default language: {data['preferred_language']}")
                print("✅ Get Default Settings: PASSED")
            else:
                print("❌ Get Default Settings: FAILED - Missing preferred_language")
                return False
        else:
            print(f"❌ Get Default Settings: FAILED - Status code {response.status_code}")
            return False
    except Exception as e:
        print(f"❌ Get Default Settings: FAILED - {str(e)}")
        return False
    
    # Test 2: Update settings
    print("\n--- Test 2: Update Settings ---")
    try:
        payload = {"preferred_language": "Spanish"}
        response = requests.post(
            f"{API_BASE_URL}/settings",
            json=payload,
            headers={"Content-Type": "application/json"},
            timeout=10
        )
        
        print(f"Status Code: {response.status_code}")
        
        if response.status_code == 200:
            data = response.json()
            print(f"Update response: {data}")
            
            if "message" in data and "updated" in data["message"].lower():
                print("✅ Update Settings: PASSED")
            else:
                print("❌ Update Settings: FAILED - Unexpected response format")
                return False
        else:
            print(f"❌ Update Settings: FAILED - Status code {response.status_code}")
            return False
    except Exception as e:
        print(f"❌ Update Settings: FAILED - {str(e)}")
        return False
    
    # Test 3: Verify settings update
    print("\n--- Test 3: Verify Settings Update ---")
    try:
        response = requests.get(f"{API_BASE_URL}/settings", timeout=10)
        print(f"Status Code: {response.status_code}")
        
        if response.status_code == 200:
            data = response.json()
            print(f"Updated settings: {data}")
            
            if data.get("preferred_language") == "Spanish":
                print("✅ Verify Settings Update: PASSED")
                return True
            else:
                print(f"❌ Verify Settings Update: FAILED - Expected Spanish, got {data.get('preferred_language')}")
                return False
        else:
            print(f"❌ Verify Settings Update: FAILED - Status code {response.status_code}")
            return False
    except Exception as e:
        print(f"❌ Verify Settings Update: FAILED - {str(e)}")
        return False

def main():
    """Run all backend tests"""
    print("🚀 Starting Backend API Test Suite")
    print("=" * 50)
    
    test_results = {
        "API Health Check": test_api_health(),
        "Recipe Generation": test_recipe_generation(),
        "Shopping List Operations": test_shopping_list_operations(),
        "Translation Service": test_translation_service(),
        "User Settings": test_user_settings()
    }
    
    print("\n" + "=" * 50)
    print("📊 TEST RESULTS SUMMARY")
    print("=" * 50)
    
    passed = 0
    total = len(test_results)
    
    for test_name, result in test_results.items():
        status = "✅ PASSED" if result else "❌ FAILED"
        print(f"{test_name}: {status}")
        if result:
            passed += 1
    
    print(f"\nOverall: {passed}/{total} tests passed")
    
    if passed == total:
        print("🎉 All tests passed! Backend API is working correctly.")
        return True
    else:
        print("⚠️  Some tests failed. Please check the detailed output above.")
        return False

if __name__ == "__main__":
    main()