#!/bin/bash

# 🚀 Quick Setup Script for Application Submission
# This script creates a basic .env file with temporary values for testing

set -e

echo "🚀 Airswift Backend - Quick Setup"
echo "=================================="
echo ""

# Check if .env file exists
if [ -f "backend/.env" ]; then
    echo "ℹ️  .env file already exists"
    read -p "Overwrite it? (y/n) " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        echo "Skipping .env creation"
        exit 0
    fi
fi

# Generate random strings for secrets
JWT_SECRET=$(openssl rand -base64 32)
CLOUDINARY_USER="test_user"
CLOUDINARY_KEY="test_key"
CLOUDINARY_SECRET="test_secret"

# Create uploads directory
echo "📁 Creating uploads directory..."
mkdir -p backend/uploads
chmod 755 backend/uploads
echo "✅ Created backend/uploads/"

# Parse .env.example and create .env
echo ""
echo "📝 Creating backend/.env file..."

cat > backend/.env << EOF
# ⚙️ Development Configuration

# Server
PORT=5000
NODE_ENV=development

# Database - MongoDB
MONGO_URI=mongodb+srv://admin:password@cluster.mongodb.net/airswift?retryWrites=true&w=majority

# JWT
JWT_SECRET=$JWT_SECRET
JWT_EXPIRE=7d
REFRESH_TOKEN_SECRET=$JWT_SECRET

# Email Service (Gmail SMTP)
# Get Gmail app password from: https://myaccount.google.com/apppasswords
EMAIL_HOST=smtp.gmail.com
EMAIL_PORT=465
EMAIL_USER=your_email@gmail.com
EMAIL_PASS=your_app_password_here

# Cloudinary (File Storage for Application Uploads)
# Sign up: https://cloudinary.com
# Get credentials from: https://cloudinary.com/console/settings/api
CLOUDINARY_NAME=$CLOUDINARY_USER
CLOUDINARY_API_KEY=$CLOUDINARY_KEY
CLOUDINARY_API_SECRET=$CLOUDINARY_SECRET

# Frontend
FRONTEND_URL=http://localhost:3000

# OpenAI (for CV analysis - optional)
OPENAI_API_KEY=sk-your_openai_key

# Socket.IO
SOCKET_IO_ENABLED=true
SOCKET_IO_CORS_ORIGIN=https://talex-frontend.vercel.app,http://localhost:3000

# Audit & Logging
ENABLE_AUDIT_LOG=true
AUDIT_LOG_RETENTION_DAYS=90

# Redis (optional)
REDIS_ENABLED=false
REDIS_URL=redis://localhost:6379

# SQL Database (optional - PostgreSQL)
DB_HOST=localhost
DB_PORT=5432
DB_NAME=airswift_db
DB_USER=postgres
DB_PASSWORD=your_password
DB_DIALECT=postgres
EOF

echo "✅ Created backend/.env"
echo ""
echo "⚠️  IMPORTANT: Edit backend/.env and set these values:"
echo "   1. MONGO_URI - Your MongoDB connection string"
echo "   2. EMAIL_PASS - Gmail app-specific password"
echo "   3. CLOUDINARY_* - Your Cloudinary API credentials"
echo ""
echo "📚 Get these from:"
echo "   • MongoDB: https://www.mongodb.com/cloud/atlas"
echo "   • Gmail: https://myaccount.google.com/apppasswords"
echo "   • Cloudinary: https://cloudinary.com/console/settings/api"
echo ""
echo "🚀 Next steps:"
echo "   1. Edit: cd backend && nano .env"
echo "   2. Fill in your actual API credentials"
echo "   3. Save and start server: npm start"
echo ""
echo "✅ Setup complete!"
EOF

chmod +x /workspaces/Airswift-Backend/quick-setup.sh

echo ""
echo "📊 Configuration Status:"
echo "========================"
node check-configuration.js 2>/dev/null || echo "Run: node check-configuration.js"
