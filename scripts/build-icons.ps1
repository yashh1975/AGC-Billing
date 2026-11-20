Add-Type -AssemblyName System.Drawing

$projectRoot = Split-Path -Parent $PSScriptRoot
$srcPath = Join-Path $projectRoot "src\assets\logo\agc-logo-circular.png"
if (-not (Test-Path $srcPath)) {
    $srcPath = Join-Path $projectRoot "assets\logo\agc-logo.png"
}

Write-Output "Loading source image from: $srcPath"
$srcImg = [System.Drawing.Image]::FromFile($srcPath)

$sizes = @(16, 24, 32, 48, 64, 128, 256)
$pngDataList = @()
$sizeList = @()

foreach ($s in $sizes) {
    $bmp = New-Object System.Drawing.Bitmap($s, $s, [System.Drawing.Imaging.PixelFormat]::Format32bppArgb)
    $g = [System.Drawing.Graphics]::FromImage($bmp)
    $g.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
    $g.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::HighQuality
    $g.PixelOffsetMode = [System.Drawing.Drawing2D.PixelOffsetMode]::HighQuality
    $g.CompositingQuality = [System.Drawing.Drawing2D.CompositingQuality]::HighQuality
    $g.Clear([System.Drawing.Color]::Transparent)
    $g.DrawImage($srcImg, 0, 0, $s, $s)
    $g.Dispose()

    $ms = New-Object System.IO.MemoryStream
    $bmp.Save($ms, [System.Drawing.Imaging.ImageFormat]::Png)
    $bytes = $ms.ToArray()
    $ms.Dispose()
    $bmp.Dispose()

    $pngDataList += ,$bytes
    $sizeList += $s
    Write-Output "Rendered crisp $s x $s PNG: $($bytes.Length) bytes"
}

$srcImg.Dispose()

# Pack into ICO
$icoStream = New-Object System.IO.MemoryStream
$writer = New-Object System.IO.BinaryWriter($icoStream)

# Header
$writer.Write([uint16]0) # Reserved
$writer.Write([uint16]1) # Type: 1 = ICO
$count = $sizes.Length
$writer.Write([uint16]$count)

$headerSize = 6 + (16 * $count)
$currentOffset = $headerSize

# Directory entries
for ($i = 0; $i -lt $count; $i++) {
    $s = $sizeList[$i]
    $data = $pngDataList[$i]

    $w = if ($s -ge 256) { [byte]0 } else { [byte]$s }
    $h = if ($s -ge 256) { [byte]0 } else { [byte]$s }

    $writer.Write([byte]$w)
    $writer.Write([byte]$h)
    $writer.Write([byte]0) # Colors
    $writer.Write([byte]0) # Reserved
    $writer.Write([uint16]1) # Planes
    $writer.Write([uint16]32) # BPP
    $writer.Write([uint32]$data.Length) # Size
    $writer.Write([uint32]$currentOffset) # Offset

    $currentOffset += $data.Length
}

# Image data chunks
for ($i = 0; $i -lt $count; $i++) {
    $data = $pngDataList[$i]
    $writer.Write($data)
}

$writer.Flush()
$icoBytes = $icoStream.ToArray()
$writer.Dispose()
$icoStream.Dispose()

# Save to assets/icon.ico and build/icon.ico
$dest1 = Join-Path $projectRoot "assets\icon.ico"
$dest2 = Join-Path $projectRoot "build\icon.ico"
[System.IO.File]::WriteAllBytes($dest1, $icoBytes)
[System.IO.File]::WriteAllBytes($dest2, $icoBytes)

Write-Output "Successfully generated multi-size icon.ico ($($icoBytes.Length) bytes) to:"
Write-Output "  -> $dest1"
Write-Output "  -> $dest2"
