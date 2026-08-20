import Schema from '../schema';
import { IDataObject } from '../workflow';
export interface IWebhook extends Schema {
  config: IWebhookConfig; // this is interface for webhook config
  verify: () => Promise<boolean>; // this is interface for webhook verify
}

export interface IWebhookConfig extends Schema {
  app_id?: string;
  app_name?: string;
  app_version?: string;
  secret?: string;
  token?: string;
  options?: IDataObject;
}
