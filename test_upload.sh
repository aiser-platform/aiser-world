#!/bin/bash

# Create a test CSV file
echo "name,age,city" > test_data_upload.csv
echo "Alice,30,NYC" >> test_data_upload.csv
echo "Bob,25,LA" >> test_data_upload.csv

# Get auth token (use test user)
echo "Getting auth token..."
TOKEN_RESPONSE=$(curl -s -X POST http://localhost:5000/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"password"}')

echo "Auth response: $TOKEN_RESPONSE"

TOKEN=$(echo $TOKEN_RESPONSE | grep -o '"access_token":"[^"]*' | cut -d'"' -f4)
echo "Token: ${TOKEN:0:20}..."

if [ -z "$TOKEN" ]; then
  echo "Failed to get token"
  exit 1
fi

# Test direct backend upload
echo -e "\n\nTesting DIRECT backend upload..."
curl -v -X POST http://localhost:8000/data/upload \
  -H "Authorization: Bearer $TOKEN" \
  -F "file=@test_data_upload.csv" \
  -F "name=TestData"

# Test via proxy
echo -e "\n\n\nTesting PROXY upload..."
curl -v -X POST http://localhost:3000/api/data/upload \
  -H "Authorization: Bearer $TOKEN" \
  -F "file=@test_data_upload.csv" \
  -F "name=TestDataProxy"
