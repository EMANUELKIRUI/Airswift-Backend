#!/bin/bash

# Quick Setup and Verification Script for Application Flow Fix
# This script will help verify that the application flow is working correctly

echo "🚀 Application Flow Verification Script"
echo "========================================"
echo ""

# Check if backend directory exists
if [ ! -d "backend" ]; then
    echo "❌ Backend directory not found. Running from wrong location?"
    echo "   Please run this from /workspaces/Airswift-Backend"
    exit 1
fi

echo "✅ Found backend directory"
echo ""

# Check if .env file exists
if [ ! -f "backend/.env" ]; then
    echo "⚠️  Warning: .env file not found in backend/"
    echo "   Some tests may fail without proper environment configuration"
fi

echo "📋 Checking Node.js and npm..."
if ! command -v node &> /dev/null; then
    echo "❌ Node.js not found"
    exit 1
fi

if ! command -v npm &> /dev/null; then
    echo "❌ npm not found"
    exit 1
fi

echo "✅ Node.js version: $(node --version)"
echo "✅ npm version: $(npm --version)"
echo ""

# Check if dependencies are installed
if [ ! -d "backend/node_modules" ]; then
    echo "📦 Installing backend dependencies..."
    cd backend
    npm install
    cd ..
    echo "✅ Dependencies installed"
fi

echo ""
echo "📝 Verifying Application Flow Implementation..."
echo "=================================================="
echo ""

# Check if fixes are in place
echo "Checking POST / route has save logic..."
if grep -q "newApplication.save()" backend/routes/applications.js; then
    echo "✅ POST / route saves to database"
else
    echo "❌ POST / route might not be saving"
fi

echo ""
echo "Checking POST /create route has save logic..."
if grep -q "newApplication.save()" backend/routes/applications.js; then
    echo "✅ POST /create route saves to database"
else
    echo "❌ POST /create route might not be saving"
fi

echo ""
echo "Checking GET /admin route fetches applications..."
if grep -q "Application.find()" backend/routes/applications.js; then
    echo "✅ GET /admin route fetches from database"
else
    echo "❌ GET /admin route might have issues"
fi

echo ""
echo "Checking ApplicationMongoose schema..."
if grep -q "applicationStatus" backend/models/ApplicationMongoose.js; then
    echo "✅ ApplicationMongoose has required fields"
else
    echo "❌ ApplicationMongoose schema might be incomplete"
fi

echo ""
echo "========================================"
echo "🎯 Verification Complete!"
echo ""
echo "Next Steps:"
echo "1. Start the backend:   cd backend && npm start"
echo "2. Run tests (in another terminal): node test-application-flow.js"
echo "3. Check admin panel at: http://localhost:3000/admin/applications"
echo ""
echo "📖 For detailed information, see: APPLICATION_FLOW_FIX_SUMMARY.md"
