# Contributing Guide

## Development Workflow

### 1. Development (Staging)

```bash
# Create feature branch
git checkout -b feature/my-feature staging

# Develop and commit
git add .
git commit -m "feat: add new feature"

# Push and create PR to staging
git push origin feature/my-feature
```

**What happens:**
- ✅ CI runs automatically (tests, lint, build)
- ✅ Build is tested but **NOT** published to npm
- ✅ PR can be merged after approval

### 2. Release to Production

**IMPORTANT:** Before creating PR to `main`, you MUST:

1. **Update version** in `package.json`:
   ```json
   {
     "version": "0.1.7"  // ← Update here
   }
   ```

2. **Update CHANGELOG.md**:
   ```markdown
   ## [0.1.7] - 2025-11-12
   
   ### Added
   - New feature X
   
   ### Fixed
   - Bug Y fixed
   ```

3. **Create PR to main**:
   ```bash
   git checkout main
   git pull origin main
   git checkout -b release/0.1.7
   
   # Edit package.json and CHANGELOG.md
   
   git add package.json CHANGELOG.md
   git commit -m "chore: bump version to 0.1.7"
   git push origin release/0.1.7
   ```

**What happens:**
- ✅ `pre-release.yml` workflow automatically validates:
  - Version was updated? ❌ → PR blocked
  - CHANGELOG was updated? ❌ → PR blocked
  - Version format is correct? ❌ → PR blocked
- ✅ Automatic comment on PR shows status
- ✅ PR can only be merged if all validations pass

### 3. Automatic Publication

After merge to `main`:

**Tag is created automatically! 🎉**

The `production.yml` workflow automatically detects when `package.json` version changed and:

1. **Creates tag automatically**:
   - ✅ Reads version from `package.json`
   - ✅ Checks if tag already exists (prevents duplicates)
   - ✅ Validates that CHANGELOG has entry for the version
   - ✅ Creates tag `v{VERSION}` with CHANGELOG message
   - ✅ Pushes the tag

2. **Automatic release workflow**:
   - ✅ Triggered automatically by created tag
   - ✅ Runs all tests
   - ✅ Builds
   - ✅ Validates version and CHANGELOG
   - ✅ Publishes to npm automatically (via Trusted Publisher)
   - ✅ Creates GitHub Release with changelog

**You don't need to create the tag manually!** Just update the version in `package.json` and CHANGELOG, merge to `main`, and everything happens automatically.

## Required Rules

### ❌ CANNOT merge to `main` without:
- [ ] Version updated in `package.json`
- [ ] CHANGELOG.md updated
- [ ] All tests passing
- [ ] Build working
- [ ] Approval from at least 1 reviewer

### ✅ CAN merge to `staging` without:
- Version updated (continuous development)
- CHANGELOG updated (updated only on release)

## Semantic Versioning

Follow [SemVer](https://semver.org/):
- **MAJOR** (1.0.0): Breaking changes
- **MINOR** (0.1.0): New features (backward compatible)
- **PATCH** (0.0.1): Bug fixes (backward compatible)

## Examples

### New feature (minor)
```json
"version": "0.2.0"  // 0.1.6 → 0.2.0
```

### Bug fix (patch)
```json
"version": "0.1.7"  // 0.1.6 → 0.1.7
```

### Breaking change (major)
```json
"version": "1.0.0"  // 0.1.6 → 1.0.0
```

## Troubleshooting

### PR blocked: "Version not updated"
- Update `package.json` with new version
- Commit and push again

### PR blocked: "CHANGELOG not updated"
- Add entry to `CHANGELOG.md` for the new version
- Commit and push again

### Publication failed on npm
- Check if Trusted Publisher is configured
- Check if version doesn't exist on npm
- See logs in: Actions → Release
