import IUserContext from './src/core/domains/interface/userContext';
import IWebhookContext from './src/core/domains/interface/webhooks/IWebHookContext';

// to make the file a module and avoid the TypeScript error
export {};

// Extend Express Interfaces  
declare global {
  namespace Express {
    export interface Request {
      userContext: IUserContext;
      webhookContext?: IWebhookContext; 
      rawBody: string;
      wfURL?: string;
      webhookId?: string;
      fileUploadName?: string;
      fileUploadPath?: string;
    }
  }
}
