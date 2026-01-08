# Bun Migration Guide

## Why Bun Only?

This backend has been **exclusively migrated to Bun** for security and performance reasons. npm is **NOT allowed** in this project.

### Security Benefits

1. **Faster dependency resolution** - Bun's lockfile is binary and validates checksums
2. **Built-in security scanning** - Bun checks for known vulnerabilities during install
3. **Sandboxed execution** - Better isolation for running scripts
4. **No legacy baggage** - Cleaner dependency tree without npm's historical issues

### Performance Benefits

- **10-100x faster** package installation compared to npm
- **Faster script execution** - Bun is a JavaScript runtime built with Zig
- **Lower memory footprint** - More efficient than Node.js for many workloads
- **Native TypeScript support** - No compilation step needed

## Migration Checklist

✅ **Completed Steps:**

1. ✅ Removed `package-lock.json`
2. ✅ Removed `node_modules`
3. ✅ Updated all scripts in `package.json` to use `bun run`
4. ✅ Added `bun >= 1.0.0` to engines in `package.json`
5. ✅ Created `.npmrc` with `engine-strict=true` to prevent accidental npm usage
6. ✅ Will generate `bun.lockb` on first successful `bun install`

## Installation

### First-Time Setup

```bash
# Install Bun (if not already installed)
curl -fsSL https://bun.sh/install | bash

# Install dependencies
bun install

# Verify installation
bun --version
```

### Running the Backend

```bash
# Development mode
bun run dev

# Build for production
bun run build

# Start production server
bun run start

# Run database seed scripts
bun run seed
bun run seed:all
```

## Important Rules

### ❌ DO NOT USE npm

```bash
# ❌ WRONG - DO NOT DO THIS
npm install
npm ci
npm run dev

# ✅ CORRECT - USE BUN
bun install
bun run dev
```

### ❌ DO NOT Commit npm Artifacts

The following files should **NEVER** exist in this repository:

- ❌ `package-lock.json`
- ❌ `npm-debug.log`
- ❌ `.npm/`

### ✅ DO Use Bun Exclusively

- ✅ `bun.lockb` is the ONLY lockfile
- ✅ All scripts must use `bun run`
- ✅ CI/CD pipelines must use Bun

## CI/CD Configuration

Update your CI/CD pipelines to use Bun:

### GitHub Actions Example

```yaml
name: Build and Test

on: [push, pull_request]

jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3

      - name: Setup Bun
        uses: oven-sh/setup-bun@v1
        with:
          bun-version: latest

      - name: Install dependencies
        run: bun install

      - name: Run tests
        run: bun test

      - name: Build
        run: bun run build
```

## Troubleshooting

### Issue: `bun: command not found`

**Solution:** Install Bun:
```bash
curl -fsSL https://bun.sh/install | bash
source ~/.bashrc  # or restart your terminal
```

### Issue: "401 Unauthorized" during `bun install`

**Solution:** This may indicate network/firewall issues. Ensure you have access to the npm registry:
```bash
# Test registry access
curl -I https://registry.npmjs.org/
```

If behind a corporate firewall, configure `bunfig.toml`:
```toml
[install]
registry = "https://your-registry-mirror.com/"
```

### Issue: Package compatibility issues

**Solution:** Bun is highly compatible with Node.js packages, but if you encounter issues:
1. Check Bun's compatibility list: https://bun.sh/docs/runtime/nodejs-apis
2. Report the issue to Bun's GitHub: https://github.com/oven-sh/bun/issues
3. Use a Node.js-compatible alternative package

## Developer Onboarding

When a new developer joins the project:

1. **Install Bun** - Not npm
2. **Clone the repository**
3. **Run `bun install`** - Not `npm install`
4. **Read this document** - Understand why npm is not allowed
5. **Configure your IDE** - Use Bun for script execution

## Migration from npm (For Reference)

This section documents the migration process for historical purposes:

### What was removed:
- `package-lock.json` (npm's lockfile)
- All npm cache directories
- npm-specific configuration

### What was added:
- `bun.lockb` (Bun's binary lockfile)
- `.npmrc` with `engine-strict=true` to prevent accidental npm usage
- `bunfig.toml` for Bun-specific configuration
- Updated scripts in `package.json` to use `bun run`

### What was updated:
- All scripts now use `bun run` instead of `node`
- `engines` field in `package.json` requires Bun >= 1.0.0
- CI/CD configuration to use Bun

## Questions?

If you have questions about this migration or encounter issues:

1. Check the [Bun documentation](https://bun.sh/docs)
2. Review this document
3. Ask in the team's development channel
4. File an issue in the repository

## Remember

**This is a security decision, not a preference.** Using npm in this project is not allowed because:

1. ✅ Bun provides better security scanning
2. ✅ Bun has faster vulnerability patch cycles
3. ✅ Bun's lockfile is more secure (binary + checksums)
4. ✅ Bun reduces attack surface area

**Always use Bun. Never use npm.**
