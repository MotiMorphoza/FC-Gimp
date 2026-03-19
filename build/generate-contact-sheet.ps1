param(
  [string[]]$ImagePaths,

  [string]$ImageListPath = "",
  [string]$FolderPath = "",

  [Parameter(Mandatory = $true)]
  [string]$OutputPath,

  [string]$Title = "",
  [int]$Columns = 4,
  [int]$ThumbWidth = 420,
  [int]$ThumbHeight = 300,
  [int]$Padding = 24,
  [int]$CaptionHeight = 38,
  [int]$TitleHeight = 70,
  [string]$Background = "#111111",
  [string]$Foreground = "#f3f1ea",
  [switch]$SkipMissing
)

Set-StrictMode -Version Latest
$ErrorActionPreference = "Stop"

Add-Type -AssemblyName System.Drawing

function Convert-HexColor {
  param([string]$Value)

  return [System.Drawing.ColorTranslator]::FromHtml($Value)
}

function Get-ScaledRect {
  param(
    [int]$SourceWidth,
    [int]$SourceHeight,
    [int]$TargetWidth,
    [int]$TargetHeight
  )

  $scale = [Math]::Min($TargetWidth / [double]$SourceWidth, $TargetHeight / [double]$SourceHeight)
  $drawWidth = [int][Math]::Round($SourceWidth * $scale)
  $drawHeight = [int][Math]::Round($SourceHeight * $scale)
  $offsetX = [int][Math]::Round(($TargetWidth - $drawWidth) / 2)
  $offsetY = [int][Math]::Round(($TargetHeight - $drawHeight) / 2)

  return [System.Drawing.Rectangle]::new($offsetX, $offsetY, $drawWidth, $drawHeight)
}

$resolved = [System.Collections.Generic.List[string]]::new()

$sourcePaths = [System.Collections.Generic.List[string]]::new()
foreach ($path in $ImagePaths) {
  if (-not [string]::IsNullOrWhiteSpace($path)) {
    $sourcePaths.Add($path)
  }
}

if (-not [string]::IsNullOrWhiteSpace($ImageListPath)) {
  $listFullPath = $ExecutionContext.SessionState.Path.GetUnresolvedProviderPathFromPSPath($ImageListPath)
  foreach ($line in [System.IO.File]::ReadAllLines($listFullPath)) {
    if (-not [string]::IsNullOrWhiteSpace($line)) {
      $sourcePaths.Add($line.Trim())
    }
  }
}

if (-not [string]::IsNullOrWhiteSpace($FolderPath)) {
  $folderFullPath = $ExecutionContext.SessionState.Path.GetUnresolvedProviderPathFromPSPath($FolderPath)
  $folderImages = Get-ChildItem -Path $folderFullPath -File |
    Where-Object { $_.Extension -match '^(?i)\.(jpg|jpeg|png)$' } |
    Sort-Object Name |
    ForEach-Object { $_.FullName }

  foreach ($item in $folderImages) {
    $sourcePaths.Add($item)
  }
}

foreach ($path in $sourcePaths) {
  if ([string]::IsNullOrWhiteSpace($path)) {
    continue
  }

  $candidate = $ExecutionContext.SessionState.Path.GetUnresolvedProviderPathFromPSPath($path)
  if (Test-Path -LiteralPath $candidate) {
    $resolved.Add($candidate)
  } elseif (-not $SkipMissing) {
    throw "Missing image: $path"
  }
}

if ($resolved.Count -eq 0) {
  throw "No images found."
}

$Columns = [Math]::Max(1, $Columns)
$rows = [int][Math]::Ceiling($resolved.Count / [double]$Columns)
$titleBlock = if ([string]::IsNullOrWhiteSpace($Title)) { 0 } else { $TitleHeight }
$cellWidth = $ThumbWidth
$cellHeight = $ThumbHeight + $CaptionHeight
$canvasWidth = ($Padding * ($Columns + 1)) + ($cellWidth * $Columns)
$canvasHeight = ($Padding * ($rows + 1)) + ($cellHeight * $rows) + $titleBlock

$bgColor = Convert-HexColor $Background
$fgColor = Convert-HexColor $Foreground

$bitmap = [System.Drawing.Bitmap]::new($canvasWidth, $canvasHeight)
$graphics = [System.Drawing.Graphics]::FromImage($bitmap)
$graphics.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::HighQuality
$graphics.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
$graphics.PixelOffsetMode = [System.Drawing.Drawing2D.PixelOffsetMode]::HighQuality
$graphics.CompositingQuality = [System.Drawing.Drawing2D.CompositingQuality]::HighQuality
$graphics.Clear($bgColor)

$fontTitle = [System.Drawing.Font]::new("Arial", 26, [System.Drawing.FontStyle]::Bold)
$fontCaption = [System.Drawing.Font]::new("Arial", 13, [System.Drawing.FontStyle]::Regular)
$brushText = [System.Drawing.SolidBrush]::new($fgColor)
$brushFrame = [System.Drawing.SolidBrush]::new([System.Drawing.Color]::FromArgb(255, 28, 28, 28))
$penBorder = [System.Drawing.Pen]::new([System.Drawing.Color]::FromArgb(255, 55, 55, 55), 1)

try {
  if ($titleBlock -gt 0) {
    $titleRect = [System.Drawing.RectangleF]::new($Padding, $Padding * 0.5, $canvasWidth - (2 * $Padding), $titleBlock)
    $titleFormat = [System.Drawing.StringFormat]::new()
    $titleFormat.Alignment = [System.Drawing.StringAlignment]::Near
    $titleFormat.LineAlignment = [System.Drawing.StringAlignment]::Center
    $graphics.DrawString($Title, $fontTitle, $brushText, $titleRect, $titleFormat)
  }

  for ($index = 0; $index -lt $resolved.Count; $index++) {
    $row = [int][Math]::Floor($index / $Columns)
    $column = $index % $Columns
    $left = $Padding + ($column * ($cellWidth + $Padding))
    $top = $Padding + $titleBlock + ($row * ($cellHeight + $Padding))

    $graphics.FillRectangle($brushFrame, $left, $top, $cellWidth, $ThumbHeight)
    $graphics.DrawRectangle($penBorder, $left, $top, $cellWidth, $ThumbHeight)

    $image = [System.Drawing.Image]::FromFile($resolved[$index])
    try {
      $scaled = Get-ScaledRect -SourceWidth $image.Width -SourceHeight $image.Height -TargetWidth $ThumbWidth -TargetHeight $ThumbHeight
      $destination = [System.Drawing.Rectangle]::new($left + $scaled.X, $top + $scaled.Y, $scaled.Width, $scaled.Height)
      $graphics.DrawImage($image, $destination)
    } finally {
      $image.Dispose()
    }

    $caption = [System.IO.Path]::GetFileName($resolved[$index])
    $captionRect = [System.Drawing.RectangleF]::new($left, $top + $ThumbHeight + 6, $cellWidth, $CaptionHeight)
    $captionFormat = [System.Drawing.StringFormat]::new()
    $captionFormat.Alignment = [System.Drawing.StringAlignment]::Center
    $captionFormat.LineAlignment = [System.Drawing.StringAlignment]::Near
    $captionFormat.Trimming = [System.Drawing.StringTrimming]::EllipsisCharacter
    $graphics.DrawString($caption, $fontCaption, $brushText, $captionRect, $captionFormat)
  }

  $outputFullPath = $ExecutionContext.SessionState.Path.GetUnresolvedProviderPathFromPSPath($OutputPath)
  $outputDir = Split-Path -Parent $outputFullPath
  if ($outputDir -and -not (Test-Path -LiteralPath $outputDir)) {
    New-Item -ItemType Directory -Path $outputDir | Out-Null
  }

  $bitmap.Save($outputFullPath, [System.Drawing.Imaging.ImageFormat]::Png)
  Write-Output $outputFullPath
} finally {
  $penBorder.Dispose()
  $brushFrame.Dispose()
  $brushText.Dispose()
  $fontCaption.Dispose()
  $fontTitle.Dispose()
  $graphics.Dispose()
  $bitmap.Dispose()
}
