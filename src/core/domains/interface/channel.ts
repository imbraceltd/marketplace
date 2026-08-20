import Schema from './schema';
import { IDataObject } from './workflow';

export interface IChannel {
  _id?: string;
  doc_name: string;
  name: string;
  type?: string;
  active: boolean;
  is_deleted?: boolean;
  bot_id: string;
  business_unit_id?: string;
  organization_id: string;
  config: IDataObject;
  public_id?: string;
  created_at?: string;
  credential_id?: string;
  updated_at?: string;
  workflow_id?: string;
  is_init: boolean;
  errorCode?: number;
  errorMessage?: string;
  touchpoints: IDataObject[];
  id?: string;
}

export interface IPageInfo {
  channel: IChannel;
  organization: Schema & {
    partition?: number;
  };
}
