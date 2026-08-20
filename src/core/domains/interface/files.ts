import crypto from 'crypto';
export default interface IFile {
    _id?: string;
    is_public: boolean;
    short_path: string; // Key of file but only 6 characters
    name: string;
    organization_id?: string;
    size?: number;
    brief?: string;
    description?: string;
    file_type?: string;
    file_extension?: string;
    file_path: string;
    file_url?: string;
    file_thumbnail_url?: string;
    TTL?: number; // Time to live
    will_delete_at?: string;
    created_at?: string;
    updated_at?: string;
    deleted_at?: string;
    deleted?: boolean;
}

// return 6 characters of file name
// using SHA1
export const generateShortPath = (key: string, org_id: string) => {
    const hash = crypto.createHash('sha1');
    hash.update(key + org_id + Date.now());
    return hash.digest('hex').substring(0, 6);
}
