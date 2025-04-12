#!/usr/bin/env node

/**
 * This script prepares the files modified by update-build-number.js for commit.
 * It should be run after update-build-number.js as part of the prepush process.
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

// Get the current version from package.json
const packageJsonPath = path.join(__dirname, '..', 'package.json');
const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));
const currentVersion = packageJson.version;

console.log('Preparing to commit version update...');

try {
  // Stage the files that are modified by update-build-number.js
  console.log('Staging package.json...');
  execSync('git add package.json');
  
  console.log('Staging Requirements file...');
  execSync('git add Requirements');
  
  // Check if .env.local is ignored in .gitignore (it usually is)
  const gitIgnorePath = path.join(__dirname, '..', '.gitignore');
  const gitIgnoreContent = fs.readFileSync(gitIgnorePath, 'utf8');
  
  if (!gitIgnoreContent.includes('.env*')) {
    console.log('Staging .env.local...');
    execSync('git add .env.local');
  } else {
    console.log('.env.local is in .gitignore - not staging');
  }
  
  // Create a commit message with the new version
  const commitMessage = `Bump version to ${currentVersion}`;
  console.log(`Creating commit: "${commitMessage}"`);
  
  // Check if there are changes to commit
  const status = execSync('git status --porcelain').toString();
  
  if (status.trim()) {
    console.log('Changes detected, creating commit...');
    execSync(`git commit -m "${commitMessage}"`);
    console.log('Commit created successfully!');
  } else {
    console.log('No changes detected. Nothing to commit.');
  }
  
  console.log('✅ Version update prepared for push!');
  console.log(`🔢 New version: ${currentVersion}`);
  console.log('🚀 You can now run: git push');
  
} catch (error) {
  console.error('❌ Error preparing version commit:', error.message);
  process.exit(1);
} 