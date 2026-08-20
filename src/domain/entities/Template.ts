import crypto from 'crypto';

export class Template {
    id: string;
    doc_name?: string;
    public_id?: string;
    name: string;
    type: string;
    graph: any;
    description?: string;
    original_id?: string;
    organization_id: string;
    deps?: any;
    active?: boolean;
    zip_s3_key?: string | null;
    updated_at?: Date;
    created_at?: Date;

    constructor(data: any) {
        this.id = data.id || data._id;
        this.doc_name = data.doc_name;
        this.public_id = data.public_id;
        this.name = data.name;
        this.type = data.type;
        this.graph = data.graph;
        this.description = data.description;
        this.original_id = data.original_id;
        this.organization_id = data.organization_id;
        this.deps = data.deps;
        this.active = data.active ?? false;
        this.zip_s3_key = data.zip_s3_key ?? null;
        this.updated_at = data.updated_at ? new Date(data.updated_at) : undefined;
        this.created_at = data.created_at ? new Date(data.created_at) : undefined;
    }

    static create(data: any) {
        const id = data.id || data._id || `template_${crypto.randomUUID()}`;
        return new Template({
            id,
            ...data,
        });
    }

    static fromRaw(raw: any) {
        return new Template(raw);
    }

    toDatabase() {
        return {
            id: this.id,
            doc_name: this.doc_name,
            public_id: this.public_id,
            name: this.name,
            type: this.type,
            graph: this.graph,
            description: this.description,
            original_id: this.original_id,
            organization_id: this.organization_id,
            deps: this.deps,
            active: this.active,
            zip_s3_key: this.zip_s3_key,
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
            type: this.type,
            graph: this.graph,
            description: this.description,
            original_id: this.original_id,
            organization_id: this.organization_id,
            deps: this.deps,
            active: this.active,
            zip_s3_key: this.zip_s3_key,
            updated_at: this.updated_at,
            created_at: this.created_at,
            id: this.id,
        };
    }
}
