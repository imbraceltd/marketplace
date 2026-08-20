import { ITag } from './tags';

export interface INodes {
  [key: string]: INode;
}

export interface INode {
  id?: string;
  name: string;
  typeVersion: number;
  type: string;
  position: [number, number];
  disabled?: boolean;
  notes?: string;
  notesInFlow?: boolean;
  retryOnFail?: boolean;
  maxTries?: number;
  waitBetweenTries?: number;
  alwaysOutputData?: boolean;
  executeOnce?: boolean;
  continueOnFail?: boolean;
  parameters: INodeParameters;
  credentials?: INodeCredentials;
  webhookId?: string;
  extendsCredential?: string;
}

export interface INodeCredentials {
  [key: string]: INodeCredentialsDetails;
}

export interface INodeCredentialsDetails {
  id: string | null;
  name: string;
}

export interface INodeTypeCredentials {
  name: string;
  required: boolean;
}

export interface INodeParameters {
  [key: string]: NodeParameterValueType;
}

export type NodeParameterValue = string | number | boolean | undefined | null;

export type NodeParameterValueType =
  | NodeParameterValue
  | INodeParameters
  | NodeParameterValue[]
  | INodeParameters[];

export interface IObservableObject {
  [key: string]: any;
  __dataChanged: boolean;
}

export interface IDataObject {
  [key: string]: GenericValue | IDataObject | GenericValue[] | IDataObject[];
}

export type GenericValue =
  | string
  | object
  | number
  | boolean
  | undefined
  | null;

export type CallerPolicy =
  | 'any'
  | 'none'
  | 'workflowsFromAList'
  | 'workflowsFromSameOwner';
export type SaveDataExecution = 'DEFAULT' | 'all' | 'none';

export interface IWorkflowSettings {
  timezone?: 'DEFAULT' | string;
  errorWorkflow?: string;
  callerIds?: string;
  callerPolicy?: CallerPolicy;
  saveDataErrorExecution?: SaveDataExecution;
  saveDataSuccessExecution?: SaveDataExecution;
  saveManualExecutions?: 'DEFAULT' | boolean;
  saveExecutionProgress?: 'DEFAULT' | boolean;
  executionTimeout?: number;
  executionOrder?: 'v0' | 'v1';
}

export interface IConnections {
  [key: string]: INodeConnections;
}

export interface INodeConnections {
  [key: string]: NodeInputConnections;
}

export type NodeInputConnections = IConnection[][];

export interface INodeConnection {
  sourceIndex: number;
  destinationIndex: number;
}

export interface IConnection {
  node: string;
  type: string;
  index: number;
}

export interface IWorkflowParameters {
  id?: string;
  name: string | undefined;
  nodes: Array<INode>;
  connections: IConnections;
  active: boolean;
  settings: IWorkflowSettings;
  tags: Array<ITag>;
  staticData?: IDataObject;
  boardIds?: string[];
  version?: unknown;
  metadata?: {
    tags?: Array<ITag>;
  };
  assistantIds?: {
    assistantId: string;
    workflowId: string;
  }[];
}
