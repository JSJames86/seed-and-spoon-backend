#!/usr/bin/env node
/**
 * npm Detection Guardrail
 *
 * This script prevents accidental npm usage in the repository.
 * It runs as a preinstall hook and fails the build if npm is detected.
 *
 * WHY THIS EXISTS:
 * - This backend uses Bun exclusively for security reasons
 * - npm is PROHIBITED for dependency management
 * - This script ensures builds fail fast if npm is accidentally used
 *
 * SECURITY RATIONALE:
 * - Bun has better security scanning
 * - Bun's lockfile is more secure (binary + checksums)
 * - Reduces attack surface area
 * - Faster vulnerability patch cycles
 */

const packageManager = process.env.npm_config_user_agent || '';

// Check if npm is being used
if (packageManager.includes('npm')) {
  console.error('\n❌ ═══════════════════════════════════════════════════════════');
  console.error('❌ ERROR: npm is PROHIBITED in this repository');
  console.error('❌ ═══════════════════════════════════════════════════════════\n');
  console.error('This backend uses Bun exclusively for security reasons.\n');
  console.error('REASON: npm is banned due to security requirements.');
  console.error('See BUN_BACKEND_MIGRATION.md for details.\n');
  console.error('✅ CORRECT USAGE:');
  console.error('   bun install');
  console.error('   bun run dev');
  console.error('   bun run build\n');
  console.error('❌ INCORRECT (WILL FAIL):');
  console.error('   npm install');
  console.error('   npm ci');
  console.error('   npm run dev\n');
  console.error('If you are seeing this in CI/CD:');
  console.error('  - Update your build command to use "bun install"');
  console.error('  - Remove any npm cache configuration');
  console.error('  - Ensure Bun is installed in your build environment\n');
  console.error('═══════════════════════════════════════════════════════════\n');

  process.exit(1);
}

// Success - Bun is being used
if (packageManager.includes('bun')) {
  console.log('✅ Using Bun - package manager check passed');
  process.exit(0);
}

// Unknown package manager
console.warn('⚠️  Warning: Unknown package manager detected');
console.warn('    Expected: Bun');
console.warn('    Detected:', packageManager || 'unknown');
console.warn('    Proceeding with caution...\n');
