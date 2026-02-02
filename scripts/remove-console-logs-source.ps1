# Remove console.log/debug/info statements from source files
# Run this before pac pcf push for production builds

$files = Get-ChildItem -Path ".\DetailsList" -Recurse -Include "*.ts","*.tsx" -Exclude "*.test.*","*.spec.*"

$totalRemoved = 0

foreach ($file in $files) {
    $content = Get-Content $file.FullName -Raw
    if ($content -match 'console\.(log|debug|info)') {
        $before = ([regex]::Matches($content, 'console\.(log|debug|info)\s*\(')).Count
        
        # Pattern to match console.log/debug/info statements including multi-line ones
        # This handles: console.log('text'), console.log(`template`), console.log({obj})
        $pattern = 'console\.(log|debug|info)\s*\([^;]*?\);?\s*\r?\n?'
        
        $content = [regex]::Replace($content, $pattern, '')
        
        $after = ([regex]::Matches($content, 'console\.(log|debug|info)\s*\(')).Count
        $removed = $before - $after
        $totalRemoved += $removed
        
        Set-Content $file.FullName $content -NoNewline
        Write-Host "$($file.Name): Removed $removed"
    }
}

Write-Host "`nTotal console statements removed: $totalRemoved"
