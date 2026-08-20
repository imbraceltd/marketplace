import Schema from './schema';
import { GenericValue, IDataObject } from './workflow';

export enum FieldType {
  Phone = 'Phone',
  ShortText = 'ShortText',
  LongText = 'LongText',
  Email = 'Email',
  Number = 'Number',
  Date = 'Date',
  DateTime = 'DateTime',
  Time = 'Time',
  Currency = 'Currency',
  Priority = 'Priority',
  SingleSelection = 'SingleSelection',
  MultipleSelection = 'MultipleSelection',
  Assignee = 'Assignee',
  Link = 'Link',
  Origin = 'Origin',
}

export type Field = Schema & {
  name: string;
  description: string;
  type: string;
  is_unique_identifier: boolean;
  is_default: boolean;
  hidden: boolean;
  is_identifier: boolean;
  default_field_name: string;
  contact_field?: string;
  settings?: object;
  data: {
    value: string;
    _id: string;
  }[];
  id: string;
  _id?: string;
  child_board_fields?: {
    name: string;
    type: string;
    is_unique_identifier: boolean;
    is_default: boolean;
    hidden: boolean;
    hidden_on_record: boolean;
    is_deprecated?: boolean;
    settings?: object;
    data: { value: string; _id: string }[];
    _id?: string;
  }[];
};

export type CreateFieldPayload = {
  board_field_id: string;
  value: IDataObject | string;
};

export type UpdateFieldPayload = {
  key: string;
  value: GenericValue;
};

export type Board = Schema & {
  board_id: string;
  business_unit_id: string;
  order: number;
  name: string;
  hidden: boolean;
  type: string;
  organization_id?: string;
  fields: {
    [key: string]: string;
  }[];
  id: string;
};

export interface Journey {
  id: string;
  name: string;
  type: string;
  extra?: Record<string, unknown>;
}

export type BoardSchema = Schema & {
  board_id: string;
  business_unit_id?: string;
  organization_id?: string;
  order: number;
  name: string;
  hidden: boolean;
  type: string;
  fields: Field[];
  id: string;
  journey?: Journey;
  close_default_field?: boolean;
  team_ids?: string[];
};

export type BoardItem = Schema & {
  board_item_id: string;
  board_id: string;
  created_type: string;
  fields: {
    [key: string]: string;
  };
  conversation_ids: string[];
  public_id: string;
  created_at: string;
  contacts: string[];
  id: string;
};

export type Segment = Schema & {
  board_id: string;
  business_unit_id: string;
  organization_id: string;
  user_id: string;
  name: string;
  description: string;
  filters: {
    field_id: string;
    operator: string;
    value: string[];
    condition: string;
    _id: string;
  }[];
  public_id: string;
  created_at: string;
  id: string;
};

// Parameters for AutomateDataBoard
export interface IBoardFieldsParameters {
  field: string; // name if template; id if actual workflow
  value: string;
  type: string;
  icsTitle: string;
}

export interface IAutomateDataBoardParameters {
  board: string;
  boardId?: string;
  chooseAction: string;
  additionalFields?: {
    actionPairs: IBoardFieldsParameters[];
  };
}

// Covert from BoardSchema to AutomateDataBoardParameters
// boardSchema will be load from database
// parameters will be used to replace with current node parameters in template
export const convertBoardSchemaToAutomateDataBoardParameters = (
  boardSchema: BoardSchema
): IAutomateDataBoardParameters => {
  const additionalFields: IBoardFieldsParameters[] = [];
  boardSchema.fields.forEach((field) => {
    additionalFields.push({
      field: field._id || '',
      value: field.data[0].value,
      type: field.type,
      icsTitle: field.name,
    });
  });

  return {
    board: boardSchema.board_id,
    chooseAction: 'create',
    additionalFields: {
      actionPairs: additionalFields,
    },
  };
};

export interface IOriginData {
  type: string | 'channel' | 'customized' | 'journey';
  data: {
    id?: string; // journey id
    name: string; // journey name (product_name)
    type: string; // journey type (product_code)
  };
}
