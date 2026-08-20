import { IDataObject } from '../../core/domains/interface/types';
import { IAppCredentials } from '../../core/domains/interface/app';

// This payload is used to configure the App from UI
// app/:appId/settings [PATCH]
export default interface appSettings {
  options?: {
    [key: string]: string | number | boolean | IDataObject;
  };
  credentials?: IAppCredentials;
  user_progress?: {
    [key: string]: string | number | boolean | IDataObject;
  };

  // one channel id 1:1 app
  channel: {
    id: string;
    name: string;
    channel_type: string;
  }
}
