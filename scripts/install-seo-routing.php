<?php

// Deployment-only utility. It must never execute through a web request.
if (PHP_SAPI !== 'cli') {
    http_response_code(404);
    exit;
}

$directory = realpath($argv[1] ?? '');
$checkOnly = ($argv[2] ?? '') === '--check';
if (! $directory || ! is_file($directory.'/laravel-api.php') || ! is_file($directory.'/.htaccess')) {
    throw new RuntimeException('Expected the existing Hostinger frontend and API bridge.');
}
$path = $directory.'/.htaccess';
$old = file_get_contents($path);
$rules = file_get_contents($checkOnly ? ($argv[3] ?? $directory.'/seo/apache.conf') : $directory.'/seo/apache.conf');
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

// The Hostinger bridge has its own allowlist BEFORE Laravel. Preserve its
// bootstrap/configuration verbatim; modify only the exact guard confirmed by
// the operator. Never replace the bridge or remove its default-deny policy.
$bridgePath = $directory.'/laravel-api.php';
$bridge = file_get_contents($bridgePath);
$oldPattern = '#^/(api|sanctum)(/|$)#';
$newPattern = '#^/(?:(?:api|sanctum)(?:/|$)|(?:tienda/[^/?]+/?|sitemap\\.xml)(?:\\?[^\\r\\n]*)?$)#';
$significant = [];
$offset = 0;
foreach (token_get_all($bridge, TOKEN_PARSE) as $token) {
    $text = is_array($token) ? $token[1] : $token;
    if (! is_array($token) || ! in_array($token[0], [T_WHITESPACE, T_COMMENT, T_DOC_COMMENT], true)) {
        $significant[] = ['text' => $text, 'offset' => $offset];
    }
    $offset += strlen($text);
}
$guards = [];
foreach ($significant as $index => $token) {
    // Match code tokens, not a regex appearing in comments or documentation.
    $sequence = array_column(array_slice($significant, $index, 19), 'text');
    if (count($sequence) !== 19) {
        continue;
    }
    $literal = $sequence[5];
    $sequence[5] = '@pattern';
    if ($sequence === ['if', '(', '!', 'preg_match', '(', '@pattern', ',', '$uri', ')', ')', '{', 'http_response_code', '(', '404', ')', ';', 'exit', ';', '}']) {
        foreach ([$oldPattern, $newPattern] as $pattern) {
            // Accept plain single/double quotes plus var_export's escaped form.
            if (in_array($literal, ["'".$pattern."'", '"'.$pattern.'"', var_export($pattern, true)], true)) {
                $guards[] = ['token' => $significant[$index + 5], 'pattern' => $pattern];
            }
        }
    }
}
if (count($guards) !== 1) {
    throw new RuntimeException('Unknown or ambiguous bridge guard; inspect privately. No files changed.');
}
$guard = $guards[0];
$bridgeUpdated = $guard['pattern'] === $oldPattern
    ? substr_replace($bridge, var_export($newPattern, true), $guard['token']['offset'], strlen($guard['token']['text']))
    : $bridge;
token_get_all($bridgeUpdated, TOKEN_PARSE);
if ($checkOnly) {
    echo "SEO rules and supported bridge guard validated; no files changed.\n";
    exit;
}
if ($bridgeUpdated !== $bridge) {
    $bridgeBackup = dirname($directory).'/.laravel-api.before-seo-'.gmdate('Ymd-His').'-'.bin2hex(random_bytes(4));
    if (! copy($bridgePath, $bridgeBackup) || ! chmod($bridgeBackup, 0600)) {
        throw new RuntimeException('Could not create a private bridge backup.');
    }
    // Never stage PHP source in the public document root.
    $bridgeTemporary = tempnam(dirname($directory), '.bridge-seo-');
    if ($bridgeTemporary === false || file_put_contents($bridgeTemporary, $bridgeUpdated) !== strlen($bridgeUpdated)) {
        throw new RuntimeException('Could not prepare bridge guard.');
    }
    if (! chmod($bridgeTemporary, fileperms($bridgePath) & 0777) || ! rename($bridgeTemporary, $bridgePath)) {
        throw new RuntimeException('Could not install bridge guard atomically.');
    }
    echo "API bridge allowlist extended for product pages and sitemap; private backup preserved.\n";
}
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
