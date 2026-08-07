$ErrorActionPreference = 'Continue'
try {
  Start-Transcript -Path 'C:\Users\mrabh\free vibecode anti\e2e\admin-dev.log' -Force
  Set-Location 'C:\Users\mrabh\free vibecode anti\admin'
  Write-Output "cwd: $(Get-Location)"
  & 'C:\Users\mrabh\free vibecode anti\node_modules\vite\bin\vite.js' --host 127.0.0.1 --port 3001 --strictPort
  Write-Output "vite exited: $LASTEXITCODE"
  Stop-Transcript
} catch {
  Write-Output "SCRIPT ERROR: $($_.Exception.Message)"
  Stop-Transcript
}