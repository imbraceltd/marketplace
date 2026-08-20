import crypto from 'crypto';

export class Form {
    id: string;
    doc_name?: string;
    public_id?: string;
    name: string;
    description?: string;
    extended_from?: string;
    board_id?: string;
    board_name?: string;
    type?: string;
    engagement_count?: number;
    submitted_count?: number;
    teams?: any;
    owner?: any;
    organization_id: string;
    start_date?: string;
    end_date?: string;
    app_id: string;
    is_active?: boolean;
    created_by?: string;
    use_captcha?: boolean;
    hidden?: boolean;
    data_board_id?: string;
    contact_board_id?: string;
    submit_button_text?: string;
    footer?: string;
    header?: string;
    sub_header?: string;
    banner_image?: string;
    logo?: string;
    fields?: any[];
    map_to_contact?: any;
    is_system?: boolean;
    updated_at?: Date;
    created_at?: Date;

    constructor(data: any) {
        this.id = data.id || data._id;
        this.doc_name = data.doc_name;
        this.public_id = data.public_id;
        this.name = data.name;
        this.description = data.description;
        this.extended_from = data.extended_from;
        this.board_id = data.board_id;
        this.board_name = data.board_name;
        this.type = data.type;
        this.engagement_count = data.engagement_count ?? 0;
        this.submitted_count = data.submitted_count ?? 0;
        this.teams = data.teams;
        this.owner = data.owner;
        this.organization_id = data.organization_id;
        this.start_date = data.start_date;
        this.end_date = data.end_date;
        this.app_id = data.app_id;
        this.is_active = data.is_active ?? true;
        this.created_by = data.created_by;
        this.use_captcha = data.use_captcha ?? false;
        this.hidden = data.hidden ?? false;
        this.data_board_id = data.data_board_id;
        this.contact_board_id = data.contact_board_id;
        this.submit_button_text = data.submit_button_text ?? 'Submit';
        this.footer = data.footer ?? 'Powered by iMBrace Limited';
        this.header = data.header;
        this.sub_header = data.sub_header;
        this.banner_image = data.banner_image;
        this.logo = data.logo;
        this.fields = data.fields;
        if (data.map_to_contact) {
            if (typeof data.map_to_contact.toJSON === 'function') {
                this.map_to_contact = data.map_to_contact.toJSON();
            } else if (data.map_to_contact instanceof Map) {
                this.map_to_contact = Object.fromEntries(data.map_to_contact);
            } else if (typeof data.map_to_contact.entries === 'function') {
                this.map_to_contact = Object.fromEntries(data.map_to_contact.entries());
            } else if (typeof data.map_to_contact.toObject === 'function') {
                this.map_to_contact = data.map_to_contact.toObject();
            } else {
                this.map_to_contact = data.map_to_contact;
            }
        } else {
            this.map_to_contact = {};
        }
        this.is_system = data.is_system ?? false;
        this.updated_at = data.updated_at ? new Date(data.updated_at) : undefined;
        this.created_at = data.created_at ? new Date(data.created_at) : undefined;
    }

    static create(data: any) {
        return new Form({
            id: data.id || data._id || crypto.randomUUID(),
            ...data,
        });
    }

    static fromRaw(raw: any) {
        return new Form(raw);
    }

    toDatabase() {
        return {
            id: this.id,
            doc_name: this.doc_name,
            public_id: this.public_id,
            name: this.name,
            description: this.description,
            extended_from: this.extended_from,
            board_id: this.board_id,
            board_name: this.board_name,
            type: this.type,
            engagement_count: this.engagement_count,
            submitted_count: this.submitted_count,
            teams: this.teams,
            owner: this.owner,
            organization_id: this.organization_id,
            start_date: this.start_date,
            end_date: this.end_date,
            app_id: this.app_id,
            is_active: this.is_active,
            created_by: this.created_by,
            use_captcha: this.use_captcha,
            hidden: this.hidden,
            data_board_id: this.data_board_id,
            contact_board_id: this.contact_board_id,
            submit_button_text: this.submit_button_text,
            footer: this.footer,
            header: this.header,
            sub_header: this.sub_header,
            banner_image: this.banner_image,
            logo: this.logo,
            fields: this.fields,
            map_to_contact: this.map_to_contact,
            is_system: this.is_system,
            created_at: this.created_at,
            updated_at: this.updated_at,
        };
    }

    toJSON(options: { includeMapToContact?: boolean } = {}) {
        const result: any = {
            owner: this.owner,
            _id: this.id,
            doc_name: this.doc_name || 'Form',
            name: this.name,
            description: this.description || '',
            board_name: this.board_name,
            engagement_count: this.engagement_count || 0,
            submitted_count: this.submitted_count || 0,
            teams: this.teams || [],
            organization_id: this.organization_id,
            app_id: this.app_id,
            is_active: this.is_active,
            created_by: this.created_by,
            use_captcha: this.use_captcha,
            hidden: this.hidden,
            data_board_id: this.data_board_id,
            contact_board_id: this.contact_board_id,
            submit_button_text: this.submit_button_text,
            footer: this.footer,
            header: this.header,
            sub_header: this.sub_header,
            banner_image: this.banner_image,
            fields: (this.fields || [])
                .filter((field: any) => !field.is_system)
                .map((field: any) => {
                    const f = (typeof field.toObject === 'function' ? field.toObject() : { ...field });
                    const _id = f._id || f.id;

                    // Maintain v1 field key order as much as possible, 
                    // only including what's present in the underlying data
                    const fieldResult: any = {};
                    const v1Order = [
                        'field_id', 'name', 'description', 'is_system', 'type',
                        'is_unique_identifier', 'is_default', 'hidden', 'hidden_in_form',
                        'is_identifier', 'data', 'default_value', 'required',
                        'placeholder', 'field_name', 'title', 'field_description'
                    ];

                    v1Order.forEach(key => {
                        if (f[key] !== undefined) {
                            if (key === 'data' && Array.isArray(f[key])) {
                                fieldResult[key] = f[key].map((item: any) => {
                                    if (item && typeof item === 'object') {
                                        const newItem: any = {};
                                        if (item.value !== undefined) newItem.value = item.value;
                                        if (item._id !== undefined) newItem._id = item._id;
                                        else if (item.id !== undefined) newItem._id = item.id;
                                        return newItem;
                                    }
                                    return item;
                                });
                            } else {
                                fieldResult[key] = f[key];
                            }
                        }
                    });

                    // Special case for is_system: if missing, v1 shows false
                    if (fieldResult.is_system === undefined) fieldResult.is_system = false;

                    fieldResult._id = _id;
                    return fieldResult;
                }),
        };

        if (options.includeMapToContact) {
            result.map_to_contact = this.map_to_contact || {};
        }

        result.public_id = this.public_id;
        result.created_at = this.created_at;
        result.updated_at = this.updated_at;

        return result;
    }
}
