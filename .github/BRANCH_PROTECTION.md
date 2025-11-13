# Branch Protection Rules

## Recommended GitHub Configuration

### Branch: `main` (Production)

**Required protections:**
1. ✅ Require a pull request before merging
2. ✅ Require approvals: **2** (or more, according to policy)
3. ✅ Dismiss stale pull request approvals when new commits are pushed
4. ✅ Require status checks to pass before merging:
   - `CI / test-and-build`
   - `Pre-Release Validation / validate-release`
5. ✅ Require branches to be up to date before merging
6. ✅ Do not allow bypassing the above settings
7. ✅ Require linear history (optional, but recommended)

### Branch: `staging` (Development)

**Recommended protections:**
1. ✅ Require a pull request before merging
2. ✅ Require status checks to pass before merging:
   - `CI / test-and-build`
   - `Staging Build / build-and-test`
3. ⚠️ Allow force pushes (only for developers)

## How to Configure

1. Go to: **Settings → Branches**
2. Click **Add rule** or edit existing rule
3. Configure as above
4. Save changes

## Workflow

### Development (Staging)
```
feature/xyz → staging → (CI runs, build tested)
```

### Production
```
staging → main → (Validations run) → Tag created → npm publish automatic
```

## Automatic Rules

The `pre-release.yml` workflow automatically validates:
- ✅ Version updated in `package.json`
- ✅ CHANGELOG.md updated
- ✅ Correct version format (semantic versioning)

**Without these validations, the PR cannot be merged!**
