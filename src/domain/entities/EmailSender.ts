import crypto from 'crypto';

export class EmailSender {
    id: string;
    doc_name?: string;
    public_id?: string;
    title?: string;
    description?: string;
    email: string;
    user_id: string;
    organization_id?: string;
    deleted_at?: Date;
    updated_at?: Date;
    created_at?: Date;

    constructor(data: any) {
        this.id = data.id || data._id;
        this.doc_name = data.doc_name;
        this.public_id = data.public_id;
        this.title = data.title;
        this.description = data.description;
        this.email = data.email;
        this.user_id = data.user_id;
        this.organization_id = data.organization_id;
        this.deleted_at = data.deleted_at ? new Date(data.deleted_at) : undefined;
        this.updated_at = data.updated_at ? new Date(data.updated_at) : undefined;
        this.created_at = data.created_at ? new Date(data.created_at) : undefined;
    }

    static create(data: any) {
        const now = new Date();
        return new EmailSender({
            ...data,
            id: data.id || data._id || ('email_' + crypto.randomUUID()),
            doc_name: data.doc_name || 'Senders',
            public_id: data.public_id || crypto.randomUUID(),
            created_at: data.created_at || now,
            updated_at: data.updated_at || now,
        });
    }

    static fromRaw(raw: any) {
        return new EmailSender(raw);
    }

    toDatabase() {
        return {
            id: this.id,
            doc_name: this.doc_name,
            public_id: this.public_id,
            title: this.title,
            description: this.description,
            email: this.email,
            user_id: this.user_id,
            organization_id: this.organization_id,
            deleted_at: this.deleted_at,
            created_at: this.created_at,
            updated_at: this.updated_at,
        };
    }

    toJSON() {
        return {
            _id: this.id,
            doc_name: this.doc_name,
            public_id: this.public_id,
            title: this.title,
            description: this.description,
            email: this.email,
            user_id: this.user_id,
            organization_id: this.organization_id,
            updated_at: this.updated_at,
            created_at: this.created_at,
            id: this.id,
        };
    }
}
