# Alternative Deployment: Export-Modify-Import Approach
# This script works around PAC CLI limitations by using solution export/import

$ErrorActionPreference = "Stop"

# Clean PATH from any problematic characters
$env:PATH = ($env:PATH -split ';' | Where-Object { $_ -and $_ -notmatch '[\r\n]' }) -join ';'

Write-Host "=== Export-Modify-Import Deployment ===" -ForegroundColor Green

# Set working directory
$projectPath = "C:\Users\josh.vantimmeren\Documents\CodeSpace\V6\FilteredDetailsListV6\FilteredDetailsList"
Set-Location $projectPath

$pacPath = "C:\Users\josh.vantimmeren\AppData\Local\Microsoft\PowerAppsCli\Microsoft.PowerApps.CLI.1.45.3\tools\pac.exe"

Write-Host "`nStep 1: Export existing FilteredDetailsList solution..." -ForegroundColor Cyan

# Create a solutions directory
if (-not (Test-Path "solutions")) {
    New-Item -ItemType Directory -Name "solutions"
}

try {
    & $pacPath solution export --name "FilteredDetailsList" --path "solutions\FilteredDetailsList_exported.zip" --managed false
    $exportExitCode = $LASTEXITCODE
    
    if ($exportExitCode -eq 0) {
        Write-Host "✅ Successfully exported existing solution!" -ForegroundColor Green
        
        if (Test-Path "solutions\FilteredDetailsList_exported.zip") {
            Write-Host "`nStep 2: Unpack the exported solution..." -ForegroundColor Cyan
            
            # Create extraction directory
            $extractPath = "solutions\FilteredDetailsList_unpacked"
            if (Test-Path $extractPath) {
                Remove-Item $extractPath -Recurse -Force
            }
            New-Item -ItemType Directory -Path $extractPath
            
            & $pacPath solution unpack --zipfile "solutions\FilteredDetailsList_exported.zip" --folder $extractPath
            $unpackExitCode = $LASTEXITCODE
            
            if ($unpackExitCode -eq 0) {
                Write-Host "✅ Successfully unpacked solution!" -ForegroundColor Green
                
                Write-Host "`nStep 3: Copy current PCF build to solution..." -ForegroundColor Cyan
                
                # Find the PCF controls directory in the unpacked solution
                $controlsPath = "$extractPath\Controls"
                if (-not (Test-Path $controlsPath)) {
                    Write-Host "Creating Controls directory in solution..." -ForegroundColor Yellow
                    New-Item -ItemType Directory -Path $controlsPath
                }
                
                # Copy our built PCF component
                $sourcePath = ".\out\controls\FilteredDetailsListV2"
                $targetPath = "$controlsPath\FilteredDetailsListV2"
                
                if (Test-Path $sourcePath) {
                    Write-Host "Copying PCF component from: $sourcePath" -ForegroundColor Gray
                    Write-Host "                        to: $targetPath" -ForegroundColor Gray
                    
                    if (Test-Path $targetPath) {
                        Remove-Item $targetPath -Recurse -Force
                    }
                    Copy-Item $sourcePath $targetPath -Recurse
                    
                    Write-Host "✅ PCF component copied to solution!" -ForegroundColor Green
                    
                    Write-Host "`nStep 4: Repack the modified solution..." -ForegroundColor Cyan
                    
                    $modifiedSolutionPath = "solutions\FilteredDetailsList_modified.zip"
                    if (Test-Path $modifiedSolutionPath) {
                        Remove-Item $modifiedSolutionPath -Force
                    }
                    
                    & $pacPath solution pack --folder $extractPath --zipfile $modifiedSolutionPath
                    $packExitCode = $LASTEXITCODE
                    
                    if ($packExitCode -eq 0) {
                        Write-Host "✅ Successfully repacked solution!" -ForegroundColor Green
                        
                        Write-Host "`nStep 5: Import the modified solution..." -ForegroundColor Cyan
                        
                        & $pacPath solution import --path $modifiedSolutionPath --force-overwrite
                        $importExitCode = $LASTEXITCODE
                        
                        if ($importExitCode -eq 0) {
                            Write-Host "🎉 SUCCESS: PCF component deployed successfully!" -ForegroundColor Green
                            Write-Host "The updated FilteredDetailsListV2 is now deployed to your environment!" -ForegroundColor Green
                            
                            Write-Host "`nStep 6: Publish customizations..." -ForegroundColor Cyan
                            & $pacPath solution publish
                            $publishExitCode = $LASTEXITCODE
                            
                            if ($publishExitCode -eq 0) {
                                Write-Host "✅ Customizations published!" -ForegroundColor Green
                            } else {
                                Write-Host "⚠️ Warning: Publish failed, but solution was imported" -ForegroundColor Yellow
                            }
                        } else {
                            Write-Host "❌ Solution import failed with exit code: $importExitCode" -ForegroundColor Red
                        }
                    } else {
                        Write-Host "❌ Solution pack failed with exit code: $packExitCode" -ForegroundColor Red
                    }
                } else {
                    Write-Host "❌ PCF build output not found at: $sourcePath" -ForegroundColor Red
                    Write-Host "Please run 'npm run build' first" -ForegroundColor Yellow
                }
            } else {
                Write-Host "❌ Solution unpack failed with exit code: $unpackExitCode" -ForegroundColor Red
            }
        } else {
            Write-Host "❌ Exported solution file not found" -ForegroundColor Red
        }
    } else {
        Write-Host "❌ Solution export failed with exit code: $exportExitCode" -ForegroundColor Red
        Write-Host "This could mean the solution doesn't exist or access is denied" -ForegroundColor Yellow
    }
} catch {
    Write-Host "❌ Exception during export: $($_.Exception.Message)" -ForegroundColor Red
}

Write-Host "`n=== Export-Modify-Import Complete ===" -ForegroundColor Green