import crypto from 'crypto';

export class EmailTemplate {
    id: string;
    doc_name?: string;
    public_id?: string;
    name: string;
    subject: string;
    body: string;
    variables?: any;
    status?: string;
    category?: string;
    unsubscribe_link?: string;
    unsubscribe_text?: string;
    links?: any;
    organization_id?: string;
    attachments?: any[];
    app_id?: string;
    board_id?: string;
    template_language?: string;
    updated_at?: Date;
    created_at?: Date;

    constructor(data: any) {
        this.id = data.id || data._id;
        this.doc_name = data.doc_name;
        this.public_id = data.public_id;
        this.name = data.name;
        this.subject = data.subject;
        this.body = data.body;
        this.variables = data.variables;
        this.status = data.status;
        this.category = data.category;
        this.unsubscribe_link = data.unsubscribe_link;
        this.unsubscribe_text = data.unsubscribe_text;
        this.links = data.links;
        this.organization_id = data.organization_id;
        this.attachments = data.attachments;
        this.app_id = data.app_id;
        this.board_id = data.board_id;
        this.template_language = data.template_language;
        this.updated_at = data.updated_at ? new Date(data.updated_at) : undefined;
        this.created_at = data.created_at ? new Date(data.created_at) : undefined;
    }

    static create(data: any) {
        const now = new Date();
        return new EmailTemplate({
            ...data,
            id: data.id || data._id || ('ema_' + crypto.randomUUID()),
            doc_name: data.doc_name || 'EmailTemplate',
            public_id: data.public_id || crypto.randomUUID(),
            status: data.status || 'draft',
            links: data.links || [],
            attachments: data.attachments || [],
            created_at: data.created_at || now,
            updated_at: data.updated_at || now,
        });
    }

    static fromRaw(raw: any) {
        return new EmailTemplate(raw);
    }

    toDatabase() {
        return {
            id: this.id,
            doc_name: this.doc_name,
            public_id: this.public_id,
            name: this.name,
            subject: this.subject,
            body: this.body,
            variables: this.variables,
            status: this.status,
            category: this.category,
            unsubscribe_link: this.unsubscribe_link,
            unsubscribe_text: this.unsubscribe_text,
            links: this.links,
            organization_id: this.organization_id,
            attachments: this.attachments,
            app_id: this.app_id,
            board_id: this.board_id,
            template_language: this.template_language,
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
            subject: this.subject,
            body: this.body,
            variables: this.variables,
            status: this.status,
            category: this.category,
            unsubscribe_link: this.unsubscribe_link,
            unsubscribe_text: this.unsubscribe_text,
            links: this.links,
            organization_id: this.organization_id,
            attachments: this.attachments,
            app_id: this.app_id,
            board_id: this.board_id,
            template_language: this.template_language,
            updated_at: this.updated_at,
            created_at: this.created_at,
            id: this.id,
        };
    }
}
