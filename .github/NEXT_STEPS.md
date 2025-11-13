# Next Steps After Committing CI/CD

## 1. Commit and Push Changes

```bash
cd project_plugins/backstage_plugin/backstage/plugins/backstage-plugin-conviso

# Check what changed
git status

# Add all CI/CD files
git add .github/
git add security-gate.yml

# Commit
git commit -m "feat: setup CI/CD workflows with Trusted Publisher

- Add optimized workflows (CI, Staging, Production, Release)
- Add automatic version and CHANGELOG validation
- Add automatic PR creation (staging → main)
- Add security scan with Conviso CLI
- Configure Trusted Publisher for npm publishing via OIDC
- Add automatic tag creation from package.json version
- Optimize workflows to reduce costs
- Add complete documentation in English"

# Push to staging
git push origin staging
```

---

## 2. Configure GitHub Secrets (REQUIRED)

**Action:** Configure secrets for security scan to work.

1. Go to: **GitHub Repository → Settings → Secrets and variables → Actions**

2. Add the following secret:

   **CONVISO_API_KEY** (required for security scan):
   - Your Conviso Platform API key
   - Add as secret: `CONVISO_API_KEY`

   ⚠️ **CONVISO_COMPANY_ID is not needed** - it's hardcoded as `11` (same as platform-backend)

---

## 3. Configure Trusted Publisher on npm (REQUIRED for publishing)

**Action:** Configure Trusted Publisher for secure npm publishing via OIDC.

1. Go to: https://www.npmjs.com/settings/conviso/automation
   - Replace `conviso` with your npm user/org

2. Click **"Add Trusted Publisher"**

3. Configure:
   - **Publisher Type:** GitHub Actions
   - **GitHub Owner:** `convisoappsec`
   - **Repository Name:** `backstage-plugin-conviso`
   - **Workflow filename:** `release.yml`

4. Click **"Set up connection"**

✅ **Done!** Now npm publishing will use OIDC (no tokens needed)

---

## 4. Configure Branch Protection Rules (RECOMMENDED)

**Action:** Configure branch protections to ensure quality.

1. Go to: **GitHub Repository → Settings → Branches**

2. **For branch `main`:**
   - Click "Add rule"
   - Branch name pattern: `main`
   - ✅ Require a pull request before merging
   - ✅ Require approvals: **2** (or according to policy)
   - ✅ Require status checks to pass before merging:
     - `CI / test-and-build`
     - `Pre-Release Validation / validate-release`
   - ✅ Require branches to be up to date before merging
   - ✅ Do not allow bypassing the above settings

3. **For branch `staging`:**
   - Click "Add rule"
   - Branch name pattern: `staging`
   - ✅ Require a pull request before merging
   - ✅ Require status checks to pass before merging:
     - `CI / test-and-build`
     - `Staging Build / build-and-test`
   - ✅ Require branches to be up to date before merging

---

## 5. Test the CI/CD Flow

### 5.1. Test CI in PR

```bash
# Create test branch
git checkout staging
git pull origin staging
git checkout -b test/ci-validation

# Make minimal change
echo "// test" >> src/index.ts
git add src/index.ts
git commit -m "test: validate CI workflow"
git push origin test/ci-validation

# Create PR on GitHub to staging
# Check: Actions → CI workflow should run and pass ✅
```

**Verify:**
- [ ] `CI` workflow is triggered automatically
- [ ] All steps pass (linter, type-check, test, build)

### 5.2. Test Staging Workflow

```bash
# Merge the test PR to staging
# (On GitHub, merge the PR)

# Check: Actions → Staging workflow should run ✅
```

**Verify:**
- [ ] `Tasks to build and publish pre-releases at staging environment` runs
- [ ] Build and tests execute
- [ ] Security scan executes (if secrets configured)

### 5.3. Test Automatic PR Creation

```bash
# After merge to staging, check:
# GitHub → Pull Requests → Should see automatic PR ✅
```

**Verify:**
- [ ] Automatic PR is created: `[DATE] Merging staging into main`
- [ ] PR is open (not draft)

### 5.4. Test Pre-Release Validation

```bash
# On the automatic PR, test validation:

# 1. Version NOT updated (should fail ❌)
# Check that Pre-Release Validation workflow fails

# 2. Update version (without CHANGELOG) - should fail ❌
git checkout staging
# Edit package.json: "version": "0.1.99"
git add package.json
git commit -m "chore: test version bump"
git push origin staging

# 3. Add CHANGELOG - should pass ✅
# Add entry to CHANGELOG.md for 0.1.99
git add CHANGELOG.md
git commit -m "chore: add changelog"
git push origin staging
```

**Verify:**
- [ ] Validation fails without version updated
- [ ] Validation fails without CHANGELOG
- [ ] Validation passes with version and CHANGELOG

### 5.5. Test Release with Trusted Publisher (OPTIONAL)

```bash
# ⚠️ WARNING: This will publish to npm!
# Only do this if you want to test real publication

# After merging automatic PR to main:
git checkout main
git pull origin main
git tag -a v0.1.99 -m "Test release"
git push origin v0.1.99

# Check: Actions → Release workflow should run ✅
# Check: npm → Version should be published
# Check: GitHub → Releases → Release should be created
```

**Verify:**
- [ ] `Tasks to publish release to npm` runs
- [ ] Publishing to npm works **without NPM_TOKEN** (uses OIDC)
- [ ] GitHub Release is created automatically

---

## 6. Clean Up Test Branches

```bash
# Delete local branch
git branch -d test/ci-validation

# Delete remote branch (if needed)
git push origin --delete test/ci-validation
```

---

## Quick Checklist

After committing, do this in order:

- [ ] **1. Push changes** to staging
- [ ] **2. Configure CONVISO_API_KEY secret** in GitHub
- [ ] **3. Configure Trusted Publisher** on npm
- [ ] **4. Configure Branch Protection Rules** (main and staging)
- [ ] **5. Test CI** in a PR
- [ ] **6. Test Staging Workflow** after merge
- [ ] **7. Test Automatic PR Creation**
- [ ] **8. Test Pre-Release Validation**
- [ ] **9. Test Release** (optional)

---

## What's Working Now

✅ **CI/CD workflows** - All created and optimized
✅ **Trusted Publisher** - Configured for npm (no tokens!)
✅ **Automatic tag creation** - From package.json version
✅ **Security scan** - With Conviso CLI
✅ **Documentation** - All in English

---

## First Real Release

When ready for the first real release:

1. **Update version:**
   ```bash
   # Edit package.json
   "version": "0.1.7"  # or next version
   ```

2. **Update CHANGELOG:**
   ```bash
   # Add entry to CHANGELOG.md
   ## [0.1.7] - 2025-01-XX
   
   ### Added
   - Complete CI/CD setup
   - Trusted Publisher configured
   ```

3. **Commit to staging:**
   ```bash
   git add package.json CHANGELOG.md
   git commit -m "chore: prepare release 0.1.7"
   git push origin staging
   ```

4. **Wait for automatic PR to be created**

5. **Review and merge automatic PR to main**

6. **Tag is created automatically!** 🎉
   - Production workflow creates tag `v0.1.7`
   - Release workflow publishes to npm
   - GitHub Release is created

**Everything is automatic!** 🚀

---

## Troubleshooting

### CI workflow not running
- Check if branch protection rules are blocking
- Verify workflow files are in `.github/workflows/`

### Security scan failing
- Verify `CONVISO_API_KEY` secret is configured
- Check if API key is valid

### Release workflow not publishing
- Verify Trusted Publisher is configured on npm
- Check if repository name matches exactly
- Verify workflow filename is `release.yml`

### Tag not created automatically
- Check if version in `package.json` changed
- Verify CHANGELOG has entry for the version
- Check Production workflow logs

---

## Need Help?

- Check workflow logs in: **GitHub → Actions**
- Review documentation: `CONTRIBUTING.md`, `BRANCH_PROTECTION.md`
- See workflow files in: `.github/workflows/`

