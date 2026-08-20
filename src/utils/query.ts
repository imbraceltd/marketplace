export function wildcardToRegex(search: string): RegExp {
    // Escape special regex characters except for the wildcard asterisk
    const escaped = search.replace(/[-\/\\^$+?.()|[\]{}]/g, '\\$&');
    // Replace wildcard '*' with '.*'
    const pattern = '.*' + escaped.replace(/\*/g, '.*') + '.*';
    return new RegExp(pattern, 'i'); // 'i' for case insensitive
}