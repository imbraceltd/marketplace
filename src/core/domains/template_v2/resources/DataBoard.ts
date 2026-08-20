import logger from '../../../../server/logging/logger';
import { IResource } from '../interface';

// Interface representing a field in the data board
export interface Field {
  _id?: string;
  name: string;
  description?: string;
  type: string;
  is_unique_identifier: boolean;
  is_default: boolean;
  hidden: boolean;
  hidden_on_record: boolean;
  is_identifier?: boolean;
  default_field_name: string;
  contact_field?: string;
  settings?: object;
  data: {
    value: string;
    _id: string;
  }[];
  id?: string;
  csvData?: string;
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
}

// Interface representing the parameters required to create a DataBoard
export interface IDataBoardParameters {
  id: string;
  doc_name: string;
  order: number;
  name: string;
  hidden: boolean;
  type: string;
  organization_id?: string;
  fields: Field[];
  csvData?: string;
}

// Class representing a DataBoard
export class DataBoard {
  id: string;
  doc_name: string;
  order: number;
  name: string;
  hidden: boolean;
  type: string;
  organization_id?: string;
  fields: Field[];
  csvData?: string;

  // Constructor to initialize a DataBoard instance
  constructor(parameters: IDataBoardParameters) {
    this.id = parameters.id;
    this.doc_name = parameters.doc_name;
    this.order = parameters.order;
    this.name = parameters.name;
    this.hidden = parameters.hidden;
    this.type = parameters.type;
    this.organization_id = parameters.organization_id;
    this.fields = parameters.fields;
    this.csvData = parameters.csvData;
  }

  toDataBoardParameters(): IDataBoardParameters {
    return {
      id: this.id,
      doc_name: this.doc_name,
      order: this.order,
      name: this.name,
      hidden: this.hidden,
      type: this.type,
      organization_id: this.organization_id,
      fields: this.fields,
      csvData: this.csvData,
    };
  }

  toKnowledgeHubKnowledgeHubParameters(): IDataBoardParameters {
    return {
      id: this.id,
      doc_name: this.doc_name,
      order: this.order,
      name: this.name,
      hidden: this.hidden,
      type: this.type,
      organization_id: this.organization_id,
      fields: this.fields,
      csvData: this.csvData,
    };
  }

  // Method to clone the current DataBoard instance
  clone(): this {
    return new DataBoard(this.toDataBoardParameters()) as this;
  }

  // Method to add resources to the data board
  add(...resources: IResource[]): void {
    logger.info(resources);
    return;
  }
}
