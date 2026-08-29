Add-Type -AssemblyName System.Drawing

$root = "E:\Projects\LootLens\assets\icons"

function New-Icon {
  param([int]$Size, [string]$File, [int]$Pad = 0)
  $bmp = New-Object System.Drawing.Bitmap($Size, $Size)
  $g = [System.Drawing.Graphics]::FromImage($bmp)
  $g.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::AntiAlias
  $g.TextRenderingHint = [System.Drawing.Text.TextRenderingHint]::AntiAliasGridFit
  $g.Clear([System.Drawing.Color]::FromArgb(12, 10, 9))

  $inner = $Size - ($Pad * 2)
  $rect = New-Object System.Drawing.Rectangle($Pad, $Pad, $inner, $inner)
  $radius = [int]($inner * 0.22)

  $path = New-Object System.Drawing.Drawing2D.GraphicsPath
  $d = $radius * 2
  $path.AddArc($rect.X, $rect.Y, $d, $d, 180, 90)
  $path.AddArc($rect.Right - $d, $rect.Y, $d, $d, 270, 90)
  $path.AddArc($rect.Right - $d, $rect.Bottom - $d, $d, $d, 0, 90)
  $path.AddArc($rect.X, $rect.Bottom - $d, $d, $d, 90, 90)
  $path.CloseFigure()

  $brush = New-Object System.Drawing.SolidBrush([System.Drawing.Color]::FromArgb(41, 37, 36))
  $g.FillPath($brush, $path)

  $penW = [Math]::Max(3.0, $Size * 0.055)
  $pen = New-Object System.Drawing.Pen([System.Drawing.Color]::White, $penW)
  $cx = [float]($Pad + $inner * 0.44); $cy = [float]($Pad + $inner * 0.44)
  $r = [float]($inner * 0.21)
  $g.DrawEllipse($pen, ($cx - $r), ($cy - $r), (2 * $r), (2 * $r))
  $adj = $r * 0.7071
  $hx = $cx + $adj; $hy = $cy + $adj
  $hl = [float]($inner * 0.155)
  $handlePen = New-Object System.Drawing.Pen([System.Drawing.Color]::White, ($penW * 1.15))
  $handlePen.StartCap = 'Round'
  $handlePen.EndCap = 'Round'
  $g.DrawLine($handlePen, $hx, $hy, ($hx + $hl), ($hy + $hl))
  $dashPen = New-Object System.Drawing.Pen([System.Drawing.Color]::White, ($penW * 0.85))
  $dashPen.DashStyle = [System.Drawing.Drawing2D.DashStyle]::Custom
  $dashPen.DashPattern = @(0.28, 0.55)
  $dashPen.StartCap = 'Round'
  $dashPen.EndCap = 'Round'
  $ly = $cy
  $g.DrawLine($dashPen, ($cx - $r * 0.62), $ly, ($cx + $r * 0.62), $ly)

  $g.Dispose()
  $bmp.Save("$root\$File", [System.Drawing.Imaging.ImageFormat]::Png)
  $bmp.Dispose()
  Write-Host "made $File"
}

New-Icon -Size 192 -File "icon-192.png"
New-Icon -Size 512 -File "icon-512.png"
New-Icon -Size 512 -File "maskable-512.png" -Pad 110
New-Icon -Size 180 -File "icon-180.png"

# OG image 1200x630
$w = 1200; $h = 630
$og = New-Object System.Drawing.Bitmap($w, $h)
$g = [System.Drawing.Graphics]::FromImage($og)
$g.SmoothingMode = 'AntiAlias'
$g.TextRenderingHint = 'AntiAliasGridFit'
$g.Clear([System.Drawing.Color]::FromArgb(12, 10, 9))

# subtle warm accent strip
$bar = New-Object System.Drawing.Rectangle(80, 130, 4, 280)
$brush = New-Object System.Drawing.SolidBrush([System.Drawing.Color]::FromArgb(217, 119, 6))
$g.FillRectangle($brush, $bar)

$fHead = New-Object System.Drawing.Font('Segoe UI', 88, [System.Drawing.FontStyle]::Bold)
$fSub = New-Object System.Drawing.Font('Segoe UI', 34, [System.Drawing.FontStyle]::Regular)
$fTag = New-Object System.Drawing.Font('Segoe UI', 21, [System.Drawing.FontStyle]::Bold)
$white = [System.Drawing.Brushes]::White
$muted = New-Object System.Drawing.SolidBrush([System.Drawing.Color]::FromArgb(168, 162, 158))
$amber = New-Object System.Drawing.SolidBrush([System.Drawing.Color]::FromArgb(217, 119, 6))

$g.DrawString("Stop paying the", $fHead, $white, 104, 128)
$g.DrawString("gimmick tax.", $fHead, $amber, 104, 240)
$g.DrawString('50% extra free is really 33% off. Check any offer in seconds.', $fSub, $muted, 104, 366)
$g.DrawString("LOOTLENS", $fTag, $white, 104, 466)
$g.DrawString("price per unit  decoy detector  shrinkflation check", $fTag, $muted, 248, 468)
$g.DrawString("lootlens.app", $fTag, $amber, 104, 508)

$g.Dispose()
$og.Save("$root\og.png", [System.Drawing.Imaging.ImageFormat]::Png)
$og.Dispose()
Write-Host "made og.png"
