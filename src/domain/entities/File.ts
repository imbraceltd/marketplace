import crypto from 'crypto';

export class FileEntity {
    id: string;
    doc_name?: string;
    public_id?: string;
    name: string;
    organization_id?: string;
    short_path: string;
    is_public?: boolean;
    size?: number;
    brief?: string;
    description?: string;
    file_type?: string;
    file_extension?: string;
    file_path?: string;
    file_url?: string;
    file_thumbnail_url?: string;
    ttl?: number;
    will_delete_at?: Date;
    deleted?: boolean;
    updated_at?: Date;
    created_at?: Date;

    constructor(data: any) {
        this.id = data.id || data._id;
        this.doc_name = data.doc_name;
        this.public_id = data.public_id;
        this.name = data.name;
        this.organization_id = data.organization_id;
        this.short_path = data.short_path;
        this.is_public = data.is_public ?? false;
        this.size = data.size;
        this.brief = data.brief;
        this.description = data.description;
        this.file_type = data.file_type;
        this.file_extension = data.file_extension;
        this.file_path = data.file_path;
        this.file_url = data.file_url;
        this.file_thumbnail_url = data.file_thumbnail_url;
        this.ttl = data.ttl ?? 0;
        this.will_delete_at = data.will_delete_at ? new Date(data.will_delete_at) : undefined;
        this.deleted = data.deleted ?? false;
        this.updated_at = data.updated_at ? new Date(data.updated_at) : undefined;
        this.created_at = data.created_at ? new Date(data.created_at) : undefined;
    }

    static create(data: any) {
        return new FileEntity({
            id: data.id || data._id || crypto.randomUUID(),
            ...data,
        });
    }

    static fromRaw(raw: any) {
        return new FileEntity(raw);
    }

    toDatabase() {
        return {
            id: this.id,
            doc_name: this.doc_name,
            public_id: this.public_id,
            name: this.name,
            organization_id: this.organization_id,
            short_path: this.short_path,
            is_public: this.is_public,
            size: this.size,
            brief: this.brief,
            description: this.description,
            file_type: this.file_type,
            file_extension: this.file_extension,
            file_path: this.file_path,
            file_url: this.file_url,
            file_thumbnail_url: this.file_thumbnail_url,
            ttl: this.ttl,
            will_delete_at: this.will_delete_at,
            deleted: this.deleted,
            created_at: this.created_at,
            updated_at: this.updated_at,
        };
    }

    toJSON() {
        return {
            _id: this.id,
            doc_name: this.doc_name,
            public_id: this.public_id,
            name: this.name,
            organization_id: this.organization_id,
            short_path: this.short_path,
            is_public: this.is_public,
            size: this.size,
            brief: this.brief,
            description: this.description,
            file_type: this.file_type,
            file_extension: this.file_extension,
            file_path: this.file_path,
            file_url: this.file_url,
            file_thumbnail_url: this.file_thumbnail_url,
            ttl: this.ttl,
            will_delete_at: this.will_delete_at,
            deleted: this.deleted,
            updated_at: this.updated_at,
            created_at: this.created_at,
            id: this.id,
        };
    }
}
