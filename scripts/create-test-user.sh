#!/bin/bash

# Create a test user for development
echo "🔧 Creating test user..."

# Test user credentials
EMAIL="test@dataticon.com"
USERNAME="testuser"
PASSWORD="testpassword123"

# Create user via API
curl -X POST "http://localhost:5000/users/signup" \
  -H "Content-Type: application/json" \
  -d "{
    \"email\": \"$EMAIL\",
    \"username\": \"$USERNAME\",
    \"password\": \"$PASSWORD\"
  }"

echo ""
echo "✅ Test user created!"
echo "📧 Email: $EMAIL"
echo "👤 Username: $USERNAME"
echo "🔑 Password: $PASSWORD"
echo ""
echo "You can now login at http://localhost:3000/login"