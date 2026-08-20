import Schema from './schema';
import { IDataObject } from './workflow';

export type Organization = Schema & {
  name: string;
  public_id: string;
  modules: {
    conversation: boolean;
    campaign: boolean;
    workflows: boolean;
    channels: boolean;
    credentials: boolean;
    analytics: boolean;
    teams: boolean;
    member: boolean;
    message_templates: boolean;
    databoards: boolean;
    marketplace: boolean;
    apps: boolean;
  };
  organization_lock_features: {
    teams?: {
      assign_mode: string[];
    };
    analytics?: {
      widget: {
        operation: string[];
      };
    };
    channels?: IDataObject;
    credentials?: {
      each_channel_count: number;
    };
    workflows?: {
      channel_workflow: IDataObject;
      connector_groups: string[];
      connectors: IDataObject;
      automation_workflow: {
        operation: string[];
      };
      data_boards_automation: {
        operation: string[];
      };
    };
  };
  support?: {
    customer: {
      channel_id: string;
      touchpoint_id: string;
    };
    app: {
      touchpoint_id: string;
    };
  };
  apps?: {
    _id: string;
    icon: {
      namespace: string;
      name: string;
    };
    url: string;
    title: string;
    type: string;
    description: string;
  }[];
  partition?: number;
};
