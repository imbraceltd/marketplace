import { Journey } from './databoard';
import { IBoardTemplate } from './template';
import { IDataObject } from './workflow';

// Form Field type
export enum FieldType {
  ShortText = 'ShortText',
  SingleSelection = 'SingleSelection',
  MultiSelection = 'MultipleSelection',
  Date = 'Date',
  Time = 'Time',
  DateTime = 'Datetime',
  LongText = 'LongText',
  Number = 'Number',
  Email = 'Email',
  Phone = 'Phone',
  Link = 'Link',
  Priority = 'Priority',
  Assignee = 'Assignee',
  Country = 'Country',
}
export type TurnstileServerValidationErrorCode =
  | 'missing-input-secret'
  | 'invalid-input-secret'
  | 'missing-input-response'
  | 'invalid-input-response'
  | 'invalid-widget-id'
  | 'invalid-parsed-secret'
  | 'bad-request'
  | 'timeout-or-duplicate'
  | 'internal-error';
export interface TurnstileServerValidationResponse {
  success: boolean;
  'error-codes': TurnstileServerValidationErrorCode[];
  challenge_ts?: string;
  hostname?: string;
  action?: string;
  cdata?: string;
  metadata?: {
    interactive: boolean;
  };
  messages?: string[];
}
export type Field = {
  _id?: string;
  field_id?: string; // this is id in databoard
  name: string;
  description: string;
  type: FieldType;
  is_unique_identifier: boolean;
  is_default: boolean;
  hidden: boolean;
  hidden_in_form?: boolean;
  is_identifier: boolean;
  is_system?: boolean;
  data: {
    value: string;
    _id: string;
  }[];
  default_value: string;
  required: boolean;
  placeholder: string;
  field_name: string;
  title: string;
  field_description: string;
  settings?: object;
};

export type Form = {
  name: string;
  description: string;
  extended_from: string;
  board_id: string;
  board_name: string;
  type: string;
  engagement_count: number;
  submitted_count: number;
  logo: string;
  teams?: Array<{
    _id?: string;
    team_name: string;
    team_id: string;
  }>;

  owner?: {
    _id?: string;
    user_name: string;
    user_id: string;
  };

  organization_id: string;
  created_by: string;
  start_date: string;
  end_date: string;
  app_id: string;
  is_active: boolean;
  hidden: boolean;
  id: string;
  data_board_id: string;
  contact_board_id: string;
  submit_button_text: string;
  footer: string;
  header: string;
  sub_header: string;
  banner_image: string;
  fields: Field[];
  map_to_contact: Map<string, string>;
  _id: string;
};

export const generateBoardTemplateForForm = (
  form: Form,
  journey: Journey,
  isSystem: boolean = false
): IBoardTemplate => {
  return {
    boardName: form.board_name || form.name,
    type: isSystem ? 'System' : 'General',
    journey: journey,
    fields: form.fields.map((field) => {
      return {
        _id: field._id,
        name: field.name,
        description: field.description,
        type: field.type,
        is_unique_identifier: field.is_unique_identifier,
        is_default: field.is_default,
        hidden: field.hidden,
        is_identifier: field.is_identifier,
        data: field.data,
      };
    }),
  };
};

const _contactFillableFields = [
  'Name',
  'Position',
  'Company',
  'Phone',
  'Email',
  'Location',
  'Source',
];

export const generateContactBoard = (): IBoardTemplate => {
  return {
    boardName: 'Contact',
    fields: _contactFillableFields.map((field) => {
      return {
        name: field,
        type: FieldType.ShortText,
        is_unique_identifier: false,
        is_default: false,
        hidden: false,
        is_identifier: false,
        data: [],
      };
    }),
  };
};

export const notAllowToOverrideFields = [
  '_id',
  'id',
  'organization_id',
  'app_id',
  'data_board_id',
  'contact_board_id',
  'type',
  'extended_from',
];

export type FormSubmitData = {
  form_id?: string;
  public_id?: string;
  mode?: '_id' | 'field_name';
  // Key is the field_name
  data: {
    [key: string]: IDataObject;
  };
};
