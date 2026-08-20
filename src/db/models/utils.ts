import {PreSaveMiddlewareFunction} from 'mongoose';
import { v4 as UUID } from 'uuid';

export const BoardTypeEnum = {
    CONTACTS: 'Contacts',
    COMPANIES: 'Companies',
    OPPORTUNITIES: 'Opportunities',
    TASKS: 'Tasks',
    PRODUCTS: 'Products',
    GENERAL: 'General',
};
export const BoardFieldEnum = {
    SHORT_TEXT: 'ShortText', // less than 150 characters
    LONG_TEXT: 'LongText',
    SINGLE_SELECTION: 'SingleSelection',
    MULTI_SELECTION: 'MultipleSelection',
    NUMBER: 'Number',
    TIME: 'Time',
    DATE: 'Date',
    LINK: 'Link',
    PRIORITY: 'Priority',
    ASSIGNEE: 'Assignee',
    EMAIL: 'Email',
    PHONE: 'Phone',
};

export const schemaOption = {
    versionKey: false,
    toObject: {
        virtuals: true,
    },
    toJSON: {
        virtuals: true,
    },
};

export const generalPreSaveMiddleware: PreSaveMiddlewareFunction = function (next) {
    // 12 digit SHA1 hash
    this.public_id = UUID();
    const now = new Date();
    if (this.created_at) {
        // update
        this.updated_at = now;
    } else {
        // first time creation
        this.created_at = now;
        this.updated_at = now; 
    }
    next();
};

export const getPrefixId = (prefix:string) => (prefix + UUID());
export const getIdSchema = (prefix:string) => ({ type: String, default: () => getPrefixId(prefix) });


export const generalSchemaFactory = (doc_name: string, prefix:string) => {
    return {
        _id: getIdSchema(prefix),
        doc_name: { type: String, default: doc_name },
        public_id: String, // same with _id
        updated_at: { type: Date, index: true, default: Date.now},
        created_at: { type: Date, index: true },
    };
};

export const getGeneralSchema = (doc_name: string) => {
    return {
        doc_name: { type: String, default: doc_name },
        public_id: String, // same with _id
        updated_at: { type: Date },
        created_at: { type: Date, index: true },
    }
};