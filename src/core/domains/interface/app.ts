import { IDataObject, INodeCredentials } from './workflow';
import Schema from './schema';
import { UI } from './ui';
import { ICredential } from './credential';
export enum AppType {
  CustomizationApp = 'customization',
  MarketplaceApp = 'marketplace',
  RootApp = 'root', // Root app is the app that is created by developers
}
export interface ILegacyApp extends Schema {
  icon?: {
    namespace: string;
    name: string;
  };
  app_type?: string;
  title: string;
  description?: string;
  url: string;
  organization_id: string;
  business_unit_id: string;
  user_id?: string;
}

/**
 * Credentials is map of Node Name and INodeCredentials {credential type: {id and name}}
 * {
 *     "Whatsapp1": {
 *         "whatsAppApi": {
 *             "id": "947",
 *             "name": "WhatsApp Api - Demo"
 *         }
 *     }
 * }
 */
export interface IAppCredentials {
  [key: string]: INodeCredentials;
}

export interface IDefaultCredentials {
  [key: string]: {
    // key Node Name
    [key: string]: ICredential; // Key is the credential type
  };
}

export const fromDefaultCredentialsToAppCredentials = (
  defaultCredentials: IDefaultCredentials,
  credentials: Array<ICredential>
): IAppCredentials => {
  const appCredentials: IAppCredentials = {};

  for (const nodeName of Object.keys(defaultCredentials)) {
    appCredentials[nodeName] = {};
    for (const credentialType of Object.keys(defaultCredentials[nodeName])) {
      const credentialName = defaultCredentials[nodeName][credentialType].name;
      const credential = credentials.find(
        (credential) => credential.name === credentialName
      );

      if (credential) {
        const _id = credential.id;
        if (!_id) continue;
        appCredentials[nodeName][credentialType] = {
          id: _id,
          name: credential.name,
        };
      }
    }
  }

  return appCredentials;
};

export interface IAppOptions {
  [key: string]: string | number | boolean | IDataObject;
}

export interface IAppSettings {
  credentials?: IAppCredentials;
  options?: IAppOptions;
}

export interface IApp extends ILegacyApp {
  version: string | null | undefined;
  workflow_id: string;

  // Options for the app
  options?: IAppOptions;

  // this is the data that will be used to create the workflow
  credentials?: IAppCredentials;

  // default credentials: map of node name and credentials {id}
  default_credentials?: IDefaultCredentials;

  // Reference to the product that this app install from
  product_id?: string;

  // App type
  app_type?: AppType;

  // Categories
  categories?: string[];

  // Channels or Platforms
  channels_or_platforms?: string[];

  // ui
  ui?: UI;

  // banner image
  banner_image?: string;

  //icon_image
  icon_image?: string;

  // app status
  is_active?: boolean;

  // app deleted
  is_deleted?: boolean;

  // errors
  error?: string;

  // channel 1:1 app
  channel?: {
    id: string;
    name: string;
    channel_type: string;
  };

  // sub workflows
  sub_workflows?: string[];

  // product_type
  product_type?: string;

  // is hidden
  is_hidden?: boolean;

  // root channel workflow id
  root_channel_workflow_id?: string;

  // product_code
  product_code?: string;

  // direct_data_board
  direct_data_board?: Array<{
    board_id: string;
    board_name: string;
  }>;
  // created by
  created_from?: string;

  [key: string]: unknown;
}
