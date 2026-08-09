# Serves this folder over http://localhost so the browser can load
# data/paintings.csv and data/artist.json (blocked when double-clicking
# index.html directly, due to a browser security restriction on local files).
# Uses only built-in Windows/PowerShell features — nothing to install.
# Double-click "Start Preview.bat" instead of running this file directly.

$port = 8000
$root = $PSScriptRoot

$listener = New-Object System.Net.HttpListener
$listener.Prefixes.Add("http://localhost:$port/")

try {
  $listener.Start()
} catch {
  Write-Host "Could not start the preview server on port $port."
  Write-Host "Close any other program using that port and try again."
  Read-Host "Press Enter to close"
  exit 1
}

$mimeTypes = @{
  ".html" = "text/html"
  ".css"  = "text/css"
  ".js"   = "application/javascript"
  ".json" = "application/json"
  ".csv"  = "text/csv"
  ".svg"  = "image/svg+xml"
  ".jpg"  = "image/jpeg"
  ".jpeg" = "image/jpeg"
  ".png"  = "image/png"
  ".gif"  = "image/gif"
  ".ico"  = "image/x-icon"
  ".webp" = "image/webp"
}

Write-Host "Your website is running at http://localhost:$port/"
Write-Host "Opening it in your browser now. Close this window to stop the preview."
Start-Process "http://localhost:$port/index.html"

try {
  while ($listener.IsListening) {
    $context = $listener.GetContext()
    $request = $context.Request
    $response = $context.Response

    $localPath = [System.Uri]::UnescapeDataString($request.Url.LocalPath).TrimStart('/')
    if ([string]::IsNullOrEmpty($localPath)) { $localPath = "index.html" }

    $filePath = Join-Path $root $localPath

    if (Test-Path $filePath -PathType Leaf) {
      $extension = [System.IO.Path]::GetExtension($filePath)
      $contentType = $mimeTypes[$extension]
      if (-not $contentType) { $contentType = "application/octet-stream" }

      $bytes = [System.IO.File]::ReadAllBytes($filePath)
      $response.ContentType = $contentType
      $response.ContentLength64 = $bytes.Length
      $response.OutputStream.Write($bytes, 0, $bytes.Length)
    } else {
      $response.StatusCode = 404
      $notFound = [System.Text.Encoding]::UTF8.GetBytes("404 - Not Found: $localPath")
      $response.OutputStream.Write($notFound, 0, $notFound.Length)
    }

    $response.OutputStream.Close()
  }
} finally {
  $listener.Stop()
  $listener.Close()
}
