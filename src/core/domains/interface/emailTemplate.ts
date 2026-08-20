import ICategory from './category';

export interface IEmailVariable {
  name: string;
  board_id?: string;
  field_id?: string;
  value?: string;
}

export interface IEmailLink {
  link: string;
  text: string;
  brief?: string;
  description?: string;
}

// Attachment
export interface IAttachment {
  name: string;
  url?: string; // used for full path (https://...)
  file_id?: string; // used for short path
}

export interface IEmailTemplate {
  _id?: string;
  organization_id?: string;
  doc_name?: string;
  subject?: string;
  body?: string;
  created_at?: Date;
  updated_at: Date;
  name: string;
  description?: string;
  url?: string;
  file_id?: string;
  variables: {
    [key: string]: IEmailVariable; // Map of name and value
  };
  status?: string;
  deleted_at?: Date;
  category?:
    | string
    | {
        id: string;
        name: string;
      };
  unsubscribe_link?: string;
  unsubscribe_text?: string;
  links?: Array<IEmailLink>;
  attachments?: Array<string>;
  board_id?: string;
}
