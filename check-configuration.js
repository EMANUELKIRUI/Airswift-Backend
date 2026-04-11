#!/usr/bin/env node

/**
 * 🔍 Environment Variable Checker
 * Validates all required environment variables for application submission
 */

const fs = require('fs');
const path = require('path');

function checkEnvironmentVariables() {
  console.log('🔍 Checking Environment Variables...\n');

  const envPath = path.join(__dirname, 'backend', '.env');
  let envConfig = {};

  // Read .env file
  if (fs.existsSync(envPath)) {
    const envContent = fs.readFileSync(envPath, 'utf-8');
    envContent.split('\n').forEach(line => {
      const [key, value] = line.split('=');
      if (key && !key.startsWith('#')) {
        envConfig[key.trim()] = value ? value.trim() : '';
      }
    });
    console.log(`✅ .env file found: ${envPath}\n`);
  } else {
    console.log(`⚠️  .env file not found: ${envPath}`);
    console.log('   Run: cp backend/.env.example backend/.env\n');
  }

  // Merge with process environment (process.env takes precedence)
  const finalConfig = { ...envConfig, ...process.env };

  // Required variables for application submission
  const requiredVars = {
    // Core API
    'PORT': 'API Server Port',
    'JWT_SECRET': 'JWT signing secret',

    // Database
    'MONGO_URI': 'MongoDB connection string',

    // File Storage (Cloudinary)
    'CLOUDINARY_NAME': 'Cloudinary account name',
    'CLOUDINARY_API_KEY': 'Cloudinary API key',
    'CLOUDINARY_API_SECRET': 'Cloudinary API secret',

    // Email Service (for notifications)
    'EMAIL_HOST': 'Email SMTP host',
    'EMAIL_PORT': 'Email SMTP port',
    'EMAIL_USER': 'Email SMTP username',
    'EMAIL_PASS': 'Email SMTP password',

    // AI Features (optional)
    'OPENAI_API_KEY': 'OpenAI API key (optional for CV analysis)',
  };

  const optionalVars = {
    'FRONTEND_URL': 'Frontend URL for CORS',
    'DB_HOST': 'SQL Database host',
    'DB_PORT': 'SQL Database port',
    'DB_NAME': 'SQL Database name',
    'DB_USER': 'SQL Database user',
    'DB_PASSWORD': 'SQL Database password',
  };

  console.log('📋 REQUIRED VARIABLES FOR APPLICATION SUBMISSION:\n');

  let missingCount = 0;
  let providedCount = 0;

  Object.entries(requiredVars).forEach(([key, description]) => {
    const value = finalConfig[key] || process.env[key];
    const status = value ? '✅' : '❌';
    const displayValue = value
      ? value.length > 30
        ? value.substring(0, 20) + '...' + value.substring(value.length - 10)
        : value
      : 'NOT SET';

    console.log(`${status} ${key.padEnd(25)} | ${description}`);
    console.log(`   └─ Value: ${displayValue}`);

    if (!value) {
      missingCount++;
    } else {
      providedCount++;
    }
  });

  console.log('\n📋 OPTIONAL VARIABLES:\n');

  Object.entries(optionalVars).forEach(([key, description]) => {
    const value = finalConfig[key] || process.env[key];
    const status = value ? '✅' : '⏸️  ';

    console.log(`${status} ${key.padEnd(25)} | ${description}`);
    if (value) {
      const displayValue = value.length > 30
        ? value.substring(0, 20) + '...'
        : value;
      console.log(`   └─ Value: ${displayValue}`);
    }
  });

  console.log('\n📊 SUMMARY:\n');
  console.log(`   ✅ Provided: ${providedCount}/${Object.keys(requiredVars).length}`);
  console.log(`   ❌ Missing:  ${missingCount}/${Object.keys(requiredVars).length}`);

  if (missingCount > 0) {
    console.log('\n⚠️  MISSING CONFIGURATION:\n');
    console.log('To fix the "Error submitting application", add the missing variables to .env:');
    console.log('');
    console.log('  1. Copy .env.example as a template:');
    console.log('     cp backend/.env.example backend/.env');
    console.log('');
    console.log('  2. Fill in the following values:');
    
    Object.entries(requiredVars).forEach(([key]) => {
      if (!finalConfig[key] && !process.env[key]) {
        console.log(`     - ${key}`);
      }
    });

    console.log('');
    console.log('  3. For Cloudinary (file upload):');
    console.log('     - Sign up: https://cloudinary.com');
    console.log('     - Get API credentials from your dashboard');
    console.log('');
    console.log('  4. For Email (notifications):');
    console.log('     - Use Gmail SMTP: smtp.gmail.com');
    console.log('     - Create app-specific password: https://myaccount.google.com/apppasswords');
    console.log('');

    console.log('Restart backend after updating .env:');
    console.log('  cd backend && npm start');
    console.log('');

    return false;
  } else {
    console.log('\n✅ All required environment variables are set!');
    console.log('   Application submission should work correctly.\n');
    return true;
  }
}

function checkDirectories() {
  console.log('📁 Checking Directory Structure...\n');

  const requiredDirs = [
    { path: 'backend/uploads', create: true, description: 'File upload directory' },
    { path: 'backend/config', create: false, description: 'Configuration files' },
    { path: 'backend/controllers', create: false, description: 'Controllers' },
    { path: 'backend/utils', create: false, description: 'Utility files' },
  ];

  let allExist = true;

  requiredDirs.forEach(({ path: dirPath, create, description }) => {
    const fullPath = path.join(__dirname, dirPath);
    const exists = fs.existsSync(fullPath);
    const status = exists ? '✅' : create ? '⚠️  (will create)' : '❌';

    console.log(`${status} ${dirPath.padEnd(25)} | ${description}`);

    if (!exists && create) {
      try {
        const fs = require('fs');
        fs.mkdirSync(fullPath, { recursive: true });
        console.log(`   └─ Created: ${fullPath}`);
      } catch (error) {
        console.log(`   └─ Error creating: ${error.message}`);
        allExist = false;
      }
    } else if (!exists) {
      allExist = false;
    }
  });

  return allExist;
}

function checkFiles() {
  console.log('\n📄 Checking Critical Files...\n');

  const requiredFiles = [
    { path: 'backend/config/cloudinary.js', description: 'Cloudinary config' },
    { path: 'backend/middleware/upload.js', description: 'Upload middleware' },
    { path: 'backend/controllers/applicationController.js', description: 'Application controller' },
    { path: 'backend/routes/applications.js', description: 'Application routes' },
    { path: 'backend/utils/cvEncryption.js', description: 'File encryption utility' },
  ];

  let allExist = true;

  requiredFiles.forEach(({ path: filePath, description }) => {
    const fullPath = path.join(__dirname, filePath);
    const exists = fs.existsSync(fullPath);
    const status = exists ? '✅' : '❌';

    console.log(`${status} ${filePath.padEnd(50)} | ${description}`);

    if (!exists) {
      allExist = false;
    }
  });

  return allExist;
}

function main() {
  console.log('\n' + '═'.repeat(70));
  console.log('🔧 Environment & Configuration Check');
  console.log('═'.repeat(70) + '\n');

  const envOk = checkEnvironmentVariables();
  const dirsOk = checkDirectories();
  const filesOk = checkFiles();

  console.log('\n' + '═'.repeat(70));
  console.log('📊 Overall Status');
  console.log('═'.repeat(70) + '\n');

  const allOk = envOk && dirsOk && filesOk;

  console.log(`Environment Variables: ${envOk ? '✅' : '❌'} ${envOk ? 'OK' : 'NEEDS ATTENTION'}`);
  console.log(`Directory Structure:   ${dirsOk ? '✅' : '❌'} ${dirsOk ? 'OK' : 'NEEDS ATTENTION'}`);
  console.log(`Critical Files:        ${filesOk ? '✅' : '❌'} ${filesOk ? 'OK' : 'NEEDS ATTENTION'}`);

  console.log('');

  if (allOk) {
    console.log('✅ Everything looks good! Ready to submit applications.\n');
  } else {
    console.log('❌ Please fix the issues above before submitting applications.\n');
    console.log('📚 See APPLICATION_SUBMISSION_DEBUG.md for detailed guidance.\n');
  }

  process.exit(allOk ? 0 : 1);
}

main();
