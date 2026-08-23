$ErrorActionPreference = "Continue"
$repo = "D:\random project"

Set-Location $repo

# Ensure we're on a branch
git rev-parse --abbrev-ref HEAD | Out-Null
if ($LASTEXITCODE -ne 0) {
    Write-Output "No commits yet - creating initial commit"
    git init | Out-Null
    git add -A
    git -c user.name="daily-bot" -c user.email="daily-bot@localhost" commit -m "initial commit" | Out-Null
    if ($LASTEXITCODE -ne 0) {
        Write-Output "Nothing to commit for initial commit"
    }
}

# Add and commit any real changes
git add -A
if ($LASTEXITCODE -eq 0) {
    $hasChanges = (git status --porcelain | Measure-Object).Count -gt 0
    if ($hasChanges) {
        $msg = "daily sync $(Get-Date -Format 'yyyy-MM-dd HH:mm:ss')"
        git -c user.name="daily-bot" -c user.email="daily-bot@localhost" commit -m $msg
        if ($LASTEXITCODE -eq 0) {
            Write-Output "Committed changes: $msg"
        }
    } else {
        # Empty commit so there is always a contribution for the day
        $msg = "daily contribution $(Get-Date -Format 'yyyy-MM-dd HH:mm:ss')"
        git -c user.name="daily-bot" -c user.email="daily-bot@localhost" commit --allow-empty -m $msg
        if ($LASTEXITCODE -eq 0) {
            Write-Output "Created empty commit: $msg"
        }
    }
}

# Push to the diabetes-prediction remote ("project").
# main tracks origin/random-.git, so an unqualified `git push` would go to the
# wrong repo. Always target the "project" remote explicitly.
$targetRemote = "project"
$targetRemoteUrl = git remote get-url $targetRemote 2>$null
if ($targetRemoteUrl) {
    git push $targetRemote main
    if ($LASTEXITCODE -eq 0) {
        Write-Output "Pushed to $targetRemote ($targetRemoteUrl)"
    } else {
        Write-Output "Push to $targetRemote failed - check remote credentials"
    }
} else {
    Write-Output "Remote '$targetRemote' not configured - run: git remote add project <URL>"
}
