import logger from '../../../server/logging/logger';
import {
  FieldType,
  IAutomateDataBoardParameters,
  BoardSchema,
  Journey,
} from './databoard';
import { IWorkflowParameters } from './workflow';
import { IAppCredentials, IApp, IAppOptions } from './app';

// Data Board
export interface IBoardFieldTemplate {
  _id?: string;
  name: string | FieldType;
  description?: string;
  type: string;
  is_unique_identifier: boolean;
  is_default: boolean;
  hidden: boolean;
  is_identifier: boolean;
  data: {
    value: string;
    _id?: string;
  }[];
}

export interface IBoardTemplate {
  boardName: string;
  name: string;
  board_id?: string;
  organization_id: string;
  fields: IBoardFieldTemplate[];
  type?: string;
  journey?: Journey;
  team_ids?: string[];
}

// Map Of Node Name and Automate Data Board Parameters (replace field by field name)
export interface INodeBoardParameters {
  [key: string]: IAutomateDataBoardParameters; // field will be field name (field.name) instead of field's id (filed._id)
}

// App Template
export interface IAppCredentialsTemplate {
  [key: string]: string[]; // node name and credential type array
}

export interface IAppTemplate {
  credentials_template?: IAppCredentials;
  workflow_template?: IWorkflowParameters;
  root_channel_workflow_template?: IWorkflowParameters;
  board_templates?: IBoardTemplate[];
  node_board_parameters?: INodeBoardParameters;
  inherit_info: Partial<IApp>;
  url?: string;
  options?: IAppOptions;
  product_type: string;
}

export const replaceFieldIdByFieldName = (
  board: BoardSchema,
  parametersFromWF: IAutomateDataBoardParameters
): IAutomateDataBoardParameters => {
  const boardName = board.name;
  const actionPairs = parametersFromWF.additionalFields?.actionPairs;

  if (actionPairs) {
    const newActionPairs = actionPairs.map((actionPair) => {
      const field = board.fields.find(
        (field) => field._id === actionPair.field
      );

      logger.info('field', { field });

      if (!field)
        throw new Error(
          `Field ${actionPair.field} not found in board ${boardName}`
        );

      return {
        ...actionPair,
        field: field.name,
      };
    });

    return {
      ...parametersFromWF,
      additionalFields: {
        actionPairs: newActionPairs,
      },
      board: boardName,
    };
  }

  return {
    ...parametersFromWF,
    board: boardName,
  };
};

export const replaceFieldNameByFieldId = (
  board: BoardSchema,
  parametersFromWF: IAutomateDataBoardParameters
): IAutomateDataBoardParameters => {
  const boardId = board.id;
  const actionPairs = parametersFromWF.additionalFields?.actionPairs;

  if (actionPairs) {
    const newActionPairs = actionPairs.map((actionPair) => {
      const fieldId = board.fields.find(
        (field) => field.name === actionPair.field
      )?._id;
      if (!fieldId)
        throw new Error(
          `Field ${actionPair.field} not found in board ${parametersFromWF.board}`
        );
      return {
        ...actionPair,
        field: fieldId,
      };
    });

    return {
      ...parametersFromWF,
      board: boardId,
      boardId: boardId,
      additionalFields: {
        actionPairs: newActionPairs,
      },
    };
  }

  return {
    ...parametersFromWF,
    board: boardId,
    boardId: boardId,
  };
};
