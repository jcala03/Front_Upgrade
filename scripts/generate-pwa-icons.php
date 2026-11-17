<?php
// Technical canvases only: the authentic 150x150 art is never reconstructed.
// Upscaling to installation sizes cannot recover detail absent in the original.
$source = imagecreatefrompng(__DIR__.'/../src/assets/logos/upgrade79-logo.png');
if ($source === false) {
    throw new RuntimeException('Original brand asset unavailable.');
}
$directory = $argv[1] ?? __DIR__.'/../public/icons';
if (! is_dir($directory)) {
    mkdir($directory, 0755, true);
}
foreach (['pwa-192.png' => [192, 0.94], 'pwa-512.png' => [512, 0.94], 'pwa-maskable-512.png' => [512, 0.72], 'apple-touch-icon.png' => [180, 0.94]] as $file => [$size, $ratio]) {
    $canvas = imagecreatetruecolor($size, $size);
    imagefill($canvas, 0, 0, imagecolorallocate($canvas, 8, 11, 18));
    // The maskable artwork fits within the central 80%-diameter safe circle.
    // Retain the existing dark icon canvas; preserve the original alpha edges.
    $scale = $size * $ratio / max(imagesx($source), imagesy($source));
    $width = (int) round(imagesx($source) * $scale);
    $height = (int) round(imagesy($source) * $scale);
    imagecopyresampled($canvas, $source, (int) (($size - $width) / 2), (int) (($size - $height) / 2), 0, 0, $width, $height, imagesx($source), imagesy($source));
    imagepng($canvas, $directory.'/'.$file);
    imagedestroy($canvas);
}
imagedestroy($source);
