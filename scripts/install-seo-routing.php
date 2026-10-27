<?php

// Deployment-only utility. It must never execute through a web request.
if (PHP_SAPI !== 'cli') {
    http_response_code(404);
    exit;
}

$directory = realpath($argv[1] ?? '');
if (! $directory || ! is_file($directory.'/laravel-api.php') || ! is_file($directory.'/.htaccess')) {
    throw new RuntimeException('Expected the existing Hostinger frontend and API bridge.');
}
$path = $directory.'/.htaccess';
$old = file_get_contents($path);
$rules = file_get_contents($directory.'/seo/apache.conf');
$begin = '# BEGIN UPGRADE79 PUBLIC SEO';
$end = '# END UPGRADE79 PUBLIC SEO';
if (! str_starts_with($rules, $begin) || ! str_contains($rules, $end)) {
    throw new RuntimeException('Invalid generated SEO rules.');
}
if (substr_count($old, $begin) !== substr_count($old, $end) || substr_count($old, $begin) > 1) {
    throw new RuntimeException('Ambiguous existing SEO rules; refusing to overwrite server configuration.');
}
$base = preg_replace('/^'.preg_quote($begin, '/').'.*?^'.preg_quote($end, '/').'\R?/ms', '', $old);
$updated = $rules."\n".ltrim($base, "\r\n");
if ($old === $updated) {
    echo "SEO routing already installed.\n";
    exit;
}
// Backup outside public_html; preserve all pre-existing server/API settings.
$backup = dirname($directory).'/.htaccess.before-seo-'.gmdate('Ymd-His').'-'.bin2hex(random_bytes(4));
if (! copy($path, $backup)) {
    throw new RuntimeException('Could not back up the existing server rules.');
}
$temporary = tempnam($directory, '.seo-rules-');
if ($temporary === false || file_put_contents($temporary, $updated) === false) {
    throw new RuntimeException('Could not prepare SEO routing.');
}
chmod($temporary, fileperms($path) & 0777);
if (! rename($temporary, $path)) {
    throw new RuntimeException('Could not install SEO routing atomically.');
}
echo "SEO routing installed; existing server rules preserved and backed up outside the public directory.\n";
