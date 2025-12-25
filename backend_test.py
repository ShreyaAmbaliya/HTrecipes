#!/usr/bin/env python3

import requests
import sys
import json
from datetime import datetime
import uuid

class ToureFamilyRecipeAPITester:
    def __init__(self, base_url="https://family-dish.preview.emergentagent.com"):
        self.base_url = base_url
        self.api_url = f"{base_url}/api"
        self.token = None
        self.user_id = None
        self.test_recipe_id = None
        self.tests_run = 0
        self.tests_passed = 0
        self.test_results = []

    def log_test(self, name, success, details=""):
        """Log test result"""
        self.tests_run += 1
        if success:
            self.tests_passed += 1
            print(f"✅ {name} - PASSED")
        else:
            print(f"❌ {name} - FAILED: {details}")
        
        self.test_results.append({
            "test": name,
            "success": success,
            "details": details
        })

    def run_test(self, name, method, endpoint, expected_status, data=None, headers=None):
        """Run a single API test"""
        url = f"{self.api_url}/{endpoint}"
        test_headers = {'Content-Type': 'application/json'}
        
        if self.token:
            test_headers['Authorization'] = f'Bearer {self.token}'
        
        if headers:
            test_headers.update(headers)

        print(f"\n🔍 Testing {name}...")
        print(f"   URL: {url}")
        print(f"   Method: {method}")
        
        try:
            if method == 'GET':
                response = requests.get(url, headers=test_headers, timeout=30)
            elif method == 'POST':
                response = requests.post(url, json=data, headers=test_headers, timeout=30)
            elif method == 'PUT':
                response = requests.put(url, json=data, headers=test_headers, timeout=30)
            elif method == 'DELETE':
                response = requests.delete(url, headers=test_headers, timeout=30)

            print(f"   Status: {response.status_code}")
            
            success = response.status_code == expected_status
            
            if success:
                try:
                    response_data = response.json()
                    self.log_test(name, True)
                    return True, response_data
                except:
                    self.log_test(name, True, "No JSON response")
                    return True, {}
            else:
                try:
                    error_data = response.json()
                    self.log_test(name, False, f"Status {response.status_code}: {error_data}")
                except:
                    self.log_test(name, False, f"Status {response.status_code}: {response.text}")
                return False, {}

        except Exception as e:
            self.log_test(name, False, f"Request failed: {str(e)}")
            return False, {}

    def test_health_check(self):
        """Test API health endpoint"""
        return self.run_test("Health Check", "GET", "", 200)

    def test_api_root(self):
        """Test API root endpoint"""
        return self.run_test("API Root", "GET", "", 200)

    def test_user_registration(self):
        """Test user registration"""
        test_user_data = {
            "name": f"Test User {datetime.now().strftime('%H%M%S')}",
            "email": f"test_{datetime.now().strftime('%H%M%S')}@toure.com",
            "password": "testpass123"
        }
        
        success, response = self.run_test(
            "User Registration", 
            "POST", 
            "auth/register", 
            200, 
            test_user_data
        )
        
        if success and 'token' in response:
            self.token = response['token']
            self.user_id = response['user']['id']
            print(f"   Registered user: {response['user']['name']}")
            return True
        return False

    def test_existing_user_login(self):
        """Test login with existing test user"""
        login_data = {
            "email": "test@toure.com",
            "password": "password123"
        }
        
        success, response = self.run_test(
            "Existing User Login", 
            "POST", 
            "auth/login", 
            200, 
            login_data
        )
        
        if success and 'token' in response:
            self.token = response['token']
            self.user_id = response['user']['id']
            print(f"   Logged in as: {response['user']['name']}")
            return True
        return False

    def test_get_current_user(self):
        """Test get current user endpoint"""
        if not self.token:
            self.log_test("Get Current User", False, "No token available")
            return False
            
        return self.run_test("Get Current User", "GET", "auth/me", 200)

    def test_create_recipe(self):
        """Test recipe creation"""
        if not self.token:
            self.log_test("Create Recipe", False, "No token available")
            return False
            
        recipe_data = {
            "title": f"Test Recipe {datetime.now().strftime('%H%M%S')}",
            "ingredients": ["2 cups rice", "1 lb chicken", "1 onion", "2 tomatoes"],
            "instructions": "1. Cook rice\n2. Season chicken\n3. Sauté onions\n4. Add tomatoes\n5. Combine all ingredients",
            "photos": [],
            "cooking_time": 45,
            "servings": 4,
            "category": "Main Course",
            "difficulty": "medium"
        }
        
        success, response = self.run_test(
            "Create Recipe", 
            "POST", 
            "recipes", 
            200, 
            recipe_data
        )
        
        if success and 'id' in response:
            self.test_recipe_id = response['id']
            print(f"   Created recipe ID: {self.test_recipe_id}")
            return True
        return False

    def test_get_all_recipes(self):
        """Test get all recipes"""
        return self.run_test("Get All Recipes", "GET", "recipes", 200)

    def test_get_recipe_by_id(self):
        """Test get specific recipe"""
        if not self.test_recipe_id:
            self.log_test("Get Recipe by ID", False, "No test recipe ID available")
            return False
            
        return self.run_test("Get Recipe by ID", "GET", f"recipes/{self.test_recipe_id}", 200)

    def test_filter_recipes_by_category(self):
        """Test recipe filtering by category"""
        return self.run_test("Filter Recipes by Category", "GET", "recipes?category=Main Course", 200)

    def test_filter_recipes_by_author(self):
        """Test recipe filtering by author"""
        if not self.user_id:
            self.log_test("Filter Recipes by Author", False, "No user ID available")
            return False
            
        return self.run_test("Filter Recipes by Author", "GET", f"recipes?author_id={self.user_id}", 200)

    def test_update_recipe(self):
        """Test recipe update"""
        if not self.test_recipe_id or not self.token:
            self.log_test("Update Recipe", False, "No recipe ID or token available")
            return False
            
        update_data = {
            "title": f"Updated Test Recipe {datetime.now().strftime('%H%M%S')}",
            "cooking_time": 60
        }
        
        return self.run_test(
            "Update Recipe", 
            "PUT", 
            f"recipes/{self.test_recipe_id}", 
            200, 
            update_data
        )

    def test_get_categories(self):
        """Test get categories endpoint"""
        return self.run_test("Get Categories", "GET", "categories", 200)

    def test_delete_recipe(self):
        """Test recipe deletion"""
        if not self.test_recipe_id or not self.token:
            self.log_test("Delete Recipe", False, "No recipe ID or token available")
            return False
            
        return self.run_test("Delete Recipe", "DELETE", f"recipes/{self.test_recipe_id}", 200)

    def test_invalid_login(self):
        """Test login with invalid credentials"""
        invalid_data = {
            "email": "invalid@email.com",
            "password": "wrongpassword"
        }
        
        return self.run_test("Invalid Login", "POST", "auth/login", 401, invalid_data)

    def test_unauthorized_access(self):
        """Test accessing protected endpoint without token"""
        # Temporarily remove token
        temp_token = self.token
        self.token = None
        
        success, _ = self.run_test("Unauthorized Access", "GET", "auth/me", 401)
        
        # Restore token
        self.token = temp_token
        return success

    def run_all_tests(self):
        """Run all API tests"""
        print("🚀 Starting Touré Family Recipe API Tests")
        print("=" * 50)
        
        # Basic connectivity tests
        self.test_health_check()
        self.test_api_root()
        
        # Authentication tests
        auth_success = False
        if self.test_existing_user_login():
            auth_success = True
        elif self.test_user_registration():
            auth_success = True
        
        if auth_success:
            self.test_get_current_user()
            
            # Recipe CRUD tests
            if self.test_create_recipe():
                self.test_get_recipe_by_id()
                self.test_update_recipe()
                # Don't delete immediately, test other operations first
                
            self.test_get_all_recipes()
            self.test_filter_recipes_by_category()
            self.test_filter_recipes_by_author()
            self.test_get_categories()
            
            # Clean up - delete test recipe
            if self.test_recipe_id:
                self.test_delete_recipe()
        
        # Security tests
        self.test_invalid_login()
        self.test_unauthorized_access()
        
        # Print summary
        print("\n" + "=" * 50)
        print(f"📊 Test Summary: {self.tests_passed}/{self.tests_run} tests passed")
        
        if self.tests_passed == self.tests_run:
            print("🎉 All tests passed!")
            return 0
        else:
            print("⚠️  Some tests failed. Check the details above.")
            return 1

def main():
    tester = ToureFamilyRecipeAPITester()
    return tester.run_all_tests()

if __name__ == "__main__":
    sys.exit(main())