#!/bin/bash
# 🚀 Quick Test Jobs Seeding Script
# This file contains ready-to-use commands for testing the TALEX job seeding feature

# ============================================================================
# STEP 1: Admin Login - Get your auth token
# ============================================================================
# Replace with your backend URL and admin credentials

BACKEND_URL="http://localhost:5000"
ADMIN_EMAIL="admin@talex.com"
ADMIN_PASSWORD="admin123"

echo "🔐 Logging in as admin..."
LOGIN_RESPONSE=$(curl -s -X POST "$BACKEND_URL/api/auth/login" \
  -H "Content-Type: application/json" \
  -d "{
    \"email\": \"$ADMIN_EMAIL\",
    \"password\": \"$ADMIN_PASSWORD\"
  }")

# Extract token from response
TOKEN=$(echo $LOGIN_RESPONSE | grep -o '"token":"[^"]*' | cut -d'"' -f4)

if [ -z "$TOKEN" ]; then
  echo "❌ Login failed. Response: $LOGIN_RESPONSE"
  echo ""
  echo "💡 Make sure:"
  echo "  1. Backend is running: npm start"
  echo "  2. Admin user exists in database"
  echo "  3. Correct credentials are used"
  exit 1
fi

echo "✅ Login successful!"
echo "📝 Token: $TOKEN"
echo ""

# ============================================================================
# STEP 2: Seed Test Jobs
# ============================================================================

echo "🌱 Seeding test jobs..."
SEED_RESPONSE=$(curl -s -X POST "$BACKEND_URL/api/admin/seed-jobs" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json")

echo "✨ Seed Response:"
echo "$SEED_RESPONSE" | grep -o '{.*}' | python3 -m json.tool 2>/dev/null || echo "$SEED_RESPONSE"

# ============================================================================
# STEP 3: Verify Jobs Were Added
# ============================================================================

echo ""
echo "🔍 Verifying jobs were added..."
JOBS_RESPONSE=$(curl -s -X GET "$BACKEND_URL/jobs-search/search?limit=5" \
  -H "Content-Type: application/json")

echo "📋 First 5 jobs:"
echo "$JOBS_RESPONSE" | python3 -m json.tool 2>/dev/null || echo "$JOBS_RESPONSE"

echo ""
echo "✅ Job seeding complete! You can now:"
echo "  1. Search jobs at GET /jobs-search/search"
echo "  2. Browse jobs at GET /jobs/"
echo "  3. Apply as a user at POST /applications/apply"
echo "  4. View applications as admin at GET /admin/applications"
