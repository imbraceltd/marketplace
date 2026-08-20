import logger from '../../../../server/logging/logger';
import { ITag } from "../../interface/tags";
import { IConnections, IDataObject, INode, IWorkflowParameters, IWorkflowSettings } from "../../interface/types";
import { IResource } from "../interface";



export interface IWorkflowPayload extends IWorkflowParameters { }

export class Workflow {
  id?: string;

  name: string | undefined;

  nodes: Array<INode>;

  connections: IConnections;

  active: boolean;

  settings: IWorkflowSettings;

  tags: Array<ITag>;

  staticData?: IDataObject;

  boardIds?: string[];

  assistantIds?: {
    assistantId: string;
    workflowId: string;
  }[];

  version?: unknown

   metadata?:{
        tags? :Array<ITag>;
    }

  // Constructor to initialize a Workflow instance
  constructor(parameters: IWorkflowParameters) {
    this.id = parameters.id;
    this.name = parameters.name;
    this.nodes = parameters.nodes;
    this.connections = parameters.connections;
    this.active = parameters.active;
    this.settings = parameters.settings;
    this.tags = parameters.tags;
    this.boardIds = parameters.boardIds;
    this.assistantIds = parameters.assistantIds;
    this.version = parameters?.version;
    this.metadata = parameters?.metadata;
  }

  toWorkflowParameters(): IWorkflowParameters {
    return {
      id: this.id,
      name: this.name,
      nodes: this.nodes,
      connections: this.connections,
      active: this.active,
      settings: this.settings,
      tags: this?.tags ? this.tags.map(tag => tag) : [],
      boardIds: this.boardIds,
      assistantIds: this.assistantIds,
      version: this?.version,
      metadata: this?.metadata,
    };
  }

  // Method to clone the current Workflow instance
  clone(): this {
    return new Workflow(this.toWorkflowParameters()) as this;
  }

  add(...resources: IResource[]): void {
    logger.info(resources);
    return;
  }
}