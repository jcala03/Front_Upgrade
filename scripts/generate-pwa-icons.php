<?php
// Reproducible resizing of the existing brand asset, not a replacement logo.
$source = imagecreatefrompng(__DIR__.'/../src/assets/logos/upgrade79-logo-hq.png');
$directory = __DIR__.'/../public/icons';
if (! is_dir($directory)) {
    mkdir($directory, 0755, true);
}
foreach (['pwa-192.png' => [192, 0.94], 'pwa-512.png' => [512, 0.94], 'pwa-maskable-512.png' => [512, 0.76], 'apple-touch-icon.png' => [180, 0.94]] as $file => [$size, $ratio]) {
    $canvas = imagecreatetruecolor($size, $size);
    imagefill($canvas, 0, 0, imagecolorallocate($canvas, 8, 11, 18));
    $width = (int) round($size * $ratio);
    $height = (int) round($width * imagesy($source) / imagesx($source));
    imagecopyresampled($canvas, $source, (int) (($size - $width) / 2), (int) (($size - $height) / 2), 0, 0, $width, $height, imagesx($source), imagesy($source));
    imagepng($canvas, $directory.'/'.$file);
    imagedestroy($canvas);
}
imagedestroy($source);
