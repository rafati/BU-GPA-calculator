#!/usr/bin/env node

/**
 * This script updates the build number for the application.
 * It can be run as part of the build process to automatically increment the build number.
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

// Get the current date in YYYY-MM-DD format
const currentDate = new Date().toISOString().split('T')[0];

// Get the current git commit hash
let commitHash = '';
try {
  commitHash = execSync('git rev-parse --short HEAD').toString().trim();
  console.log(`Current commit hash: ${commitHash}`);
} catch (error) {
  console.warn('Unable to get git commit hash:', error.message);
}

// Read the current version from package.json
const packageJsonPath = path.join(__dirname, '..', 'package.json');
const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));
const currentVersion = packageJson.version;

// Extract major.minor from version
const versionParts = currentVersion.split('.');
const majorMinor = `${versionParts[0]}.${versionParts[1]}`;

// Generate new build number (patch version)
const patchVersion = parseInt(versionParts[2] || 0, 10) + 1;
const newVersion = `${majorMinor}.${patchVersion}`;

// Update the version in package.json
packageJson.version = newVersion;
fs.writeFileSync(packageJsonPath, JSON.stringify(packageJson, null, 2) + '\n');

// Create or update .env.local to include build variables
const envPath = path.join(__dirname, '..', '.env.local');
let envContent = '';

try {
  envContent = fs.readFileSync(envPath, 'utf8');
} catch (error) {
  console.warn('Unable to read .env.local, creating new file');
}

// Replace or add BUILD variables
const buildVars = [
  `BUILD_NUMBER=${newVersion}`,
  `NEXT_PUBLIC_BUILD_NUMBER=${newVersion}`,
  `BUILD_DATE=${currentDate}`,
  `NEXT_PUBLIC_BUILD_DATE=${currentDate}`,
  `COMMIT_HASH=${commitHash}`,
  `NEXT_PUBLIC_COMMIT_HASH=${commitHash}`
];

buildVars.forEach(varLine => {
  const varName = varLine.split('=')[0];
  if (envContent.includes(`${varName}=`)) {
    envContent = envContent.replace(new RegExp(`${varName}=.*`, 'g'), varLine);
  } else {
    envContent += `\n${varLine}`;
  }
});

fs.writeFileSync(envPath, envContent);

// Also update the Requirements file version if it exists
try {
  const requirementsPath = path.join(__dirname, '..', 'Requirements');
  if (fs.existsSync(requirementsPath)) {
    let reqContent = fs.readFileSync(requirementsPath, 'utf8');
    
    // This updates a version on line 4 if it starts with "Version" or "version"
    reqContent = reqContent.replace(
      /^(Version|version).*$/m,
      `Version ${newVersion}`
    );
    
    fs.writeFileSync(requirementsPath, reqContent);
    console.log(`Updated Requirements file to version ${newVersion}`);
  }
} catch (error) {
  console.warn('Unable to update Requirements file:', error.message);
}

// Log the update
console.log(`Updated version from ${currentVersion} to ${newVersion}`);
console.log(`Build date: ${currentDate}`);
console.log(`Environment variables updated in .env.local`);

// Exit with success
process.exit(0); 