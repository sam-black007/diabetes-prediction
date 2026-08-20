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

# Push if a remote is configured
$remote = git remote
if ($remote) {
    git push
    if ($LASTEXITCODE -eq 0) {
        Write-Output "Pushed successfully"
    } else {
        Write-Output "Push failed - check remote credentials"
    }
} else {
    Write-Output "No remote configured - run: git remote add origin <URL>"
}
