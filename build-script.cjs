#!/usr/bin/env node

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

console.log('🔨 Starting custom build script...');

// Ensure build directory exists
if (!fs.existsSync('build')) {
  fs.mkdirSync('build', { recursive: true });
  console.log('✅ Created build directory');
}

// Function to run command with error handling
function runCommand(command, description) {
  try {
    console.log(`🔧 ${description}...`);
    execSync(command, { stdio: 'inherit' });
    console.log(`✅ ${description} completed successfully`);
    return true;
  } catch (error) {
    console.error(`❌ ${description} failed:`, error.message);
    return false;
  }
}

// Build steps
console.log('📋 Starting compilation process...');

// Step 1: Compile DB.ts
const dbCompiled = runCommand(
  'npx tsc --skipLibCheck --resolveJsonModule --esModuleInterop --module ESNext --moduleResolution node --outDir build -t es2020 DB.ts',
  'Compiling DB.ts'
);

if (!dbCompiled) {
  console.error('💥 DB.ts compilation failed, exiting...');
  process.exit(1);
}

// Verify DB.js was created
if (!fs.existsSync('build/DB.js')) {
  console.error('💥 DB.js was not created, exiting...');
  process.exit(1);
}
console.log('✅ DB.js verified');

// Step 2: Compile rabbitConsumer.ts
const consumerCompiled = runCommand(
  'npx tsc --skipLibCheck --resolveJsonModule --esModuleInterop --module ESNext --moduleResolution node --outDir build -t es2020 Simulator/rabbitConsumer.ts',
  'Compiling Simulator/rabbitConsumer.ts'
);

if (!consumerCompiled) {
  console.error('💥 rabbitConsumer.ts compilation failed, trying alternative...');
  
  // Alternative approach
  const altCompiled = runCommand(
    'npx tsc Simulator/rabbitConsumer.ts --outDir build --target es2020 --module esnext --moduleResolution node --skipLibCheck --esModuleInterop --resolveJsonModule',
    'Alternative compilation of rabbitConsumer.ts'
  );
  
  if (!altCompiled) {
    console.error('💥 All compilation attempts failed, exiting...');
    process.exit(1);
  }
}

// Verify build output
console.log('📁 Verifying build output...');
if (fs.existsSync('build/Simulator/rabbitConsumer.js')) {
  console.log('✅ build/Simulator/rabbitConsumer.js created successfully');
} else {
  console.error('💥 build/Simulator/rabbitConsumer.js not found');
  process.exit(1);
}

console.log('🎉 Build completed successfully!');
console.log('📁 Build directory contents:');
execSync('find build -name "*.js"', { stdio: 'inherit' });