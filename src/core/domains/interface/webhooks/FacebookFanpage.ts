import { IChannel } from "../channel";

export interface IFacebookWebhookEntry {
  id: string;
  time: number;
  messaging?: IFacebookWebhookMessaging[];
  changes?: {
    value: {
      from: {
        name: string;
        id: string;
      };
      post: {
        id: string;
        permalink_url: string;
        promotion_status: string;
        is_published: boolean;
        updated_time: string;
        status_type: string;
      };
      post_id: string;
      verb: string;
      item: string;
      message?: string;
      comment_id?: string;
      parent_id?: string;
      created_time?: number;
      is_hidden?: boolean;
    };
    field: string;
  }[];
}

export interface IFacebookWebhookMessaging {
  sender: {
    id: string;
  };
  recipient: {
    id: string;
  };
  timestamp: number;
  message?: {
    mid: string;
    text: string;
    quick_reply?: {
      payload: string;
    };
  };
  postback?: {
    payload: string;
  };
  read?: {
    watermark: number;
    seq: number;
  };
  delivery?: {
    mids: string[];
    watermark: number;
    seq: number;
  };
}

export interface IFacebookWebhook {
  object: string;
  entry: IFacebookWebhookEntry[];
}


export interface IFacebookPageChanges {
  channel: IChannel;
  message: IFacebookWebhookEntry;
  partition?: number;
}