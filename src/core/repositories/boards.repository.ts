import logger from '../../server/logging/logger';
import config from '../../config';
import {
  CreateFieldPayload,
  BoardSchema,
  Field,
  UpdateFieldPayload,
  BoardItem,
  Board,
} from '../domains/interface/databoard';
import { IBoardTemplate } from '../domains/interface/template';
import axios from 'axios';
import _Error, { ErrorCode } from '../../utils/error';
import { IDataObject } from '../domains/interface/types';
import crypto from 'crypto';

const databoardBase = () => `${config.knowledgeHub.host}/api`;

const orgHeaders = (orgId: string) => ({ 'x-organization-id': orgId });

export const createOrUpdateBoard = async (
  orgId: string,
  board: IBoardTemplate
): Promise<BoardSchema> => {
  try {
    const { data: current } = await axios.get(`${databoardBase()}/boards`, {
      headers: orgHeaders(orgId),
      params: { name: board.boardName },
    });

    const theBoard = current.data.find(
      (b: BoardSchema) => b.name === board.boardName
    );

    if (
      board.boardName === 'Contacts' ||
      board.boardName === 'Opt-out' ||
      board.boardName === 'Opportunities' ||
      board.boardName === 'Tasks' ||
      board.boardName === 'Companies'
    ) {
      return theBoard;
    }

    if (!theBoard) {
      if (!board.type || board.type === '') {
        board.type = 'System';
      }
      return createNewBoardV2(orgId, board);
    }

    theBoard.type = board.type;
    theBoard.team_ids = board.team_ids;

    await updateBoard(orgId, theBoard._id || theBoard.id, {
      name: board.boardName,
      team_ids: board.team_ids,
      organization_id: orgId,
    });

    const boardId = theBoard._id || theBoard.id;
    const incomingFields = board.fields as Field[];
    const currentFields = theBoard.fields as Field[];
    const missingFields = incomingFields.filter(
      (field) => !currentFields.find((f) => f.name === field.name)
    );

    if (missingFields.length > 0) {
      await Promise.all(
        missingFields.map((field) =>
          addNewField(orgId, boardId, {
            ...field,
            is_identifier: field.name === 'Name',
          })
        )
      );
      return getBoardById(orgId, boardId);
    }

    return theBoard;
  } catch (error) {
    logger.info('createOrUpdateBoard', { error });
    throw error;
  }
};

export const createOrUpdateBoardV2 = async (
  orgId: string,
  board: IBoardTemplate
): Promise<BoardSchema> => {
  try {
    const { data: current } = await axios.get(`${databoardBase()}/boards`, {
      headers: orgHeaders(orgId),
      params: { name: board.boardName },
    });

    const theBoard = current.data.find(
      (b: BoardSchema) => b.name === board.boardName
    );

    if (
      board.boardName === 'Contacts' ||
      board.boardName === 'Opt-out' ||
      board.boardName === 'Opportunities' ||
      board.boardName === 'Tasks' ||
      board.boardName === 'Companies'
    ) {
      return theBoard;
    }

    if (!theBoard) {
      return createNewBoardV2(orgId, board);
    }

    theBoard.type = board.type;
    theBoard.team_ids = board.team_ids;

    if (theBoard.type !== 'System') {
      throw new _Error('Board Exist', 400, ErrorCode.board_exist);
    }

    await updateBoard(orgId, theBoard._id || theBoard.id, {
      name: board.boardName,
      team_ids: board.team_ids,
      organization_id: orgId,
    });

    const boardId = theBoard._id || theBoard.id;
    const incomingFields = board.fields as Field[];
    const currentFields = theBoard.fields as Field[];
    const missingFields = incomingFields.filter(
      (field) => !currentFields.find((f) => f.name === field.name)
    );

    if (missingFields.length > 0) {
      await Promise.all(
        missingFields.map((field) => addNewField(orgId, boardId, field))
      );
      return getBoardById(orgId, boardId);
    }

    return theBoard;
  } catch (error) {
    logger.info('createOrUpdateBoardV2', { error });
    throw error;
  }
};

export const createNewBoard = async (
  orgId: string,
  board: IBoardTemplate
): Promise<BoardSchema> => {
  try {
    const { data } = await axios.post(
      `${databoardBase()}/boards`,
      {
        ...board,
        name: board.boardName || board.name,
        organization_id: orgId,
      },
      { headers: orgHeaders(orgId) }
    );
    return data.data;
  } catch (error) {
    logger.info('createNewBoard', { error });
    throw error;
  }
};

export const createNewBoardV2 = async (
  orgId: string,
  board: IBoardTemplate
): Promise<BoardSchema> => {
  try {
    const _board = {
      name: board.boardName || board.name,
      organization_id: orgId,
      type: board.type || 'General',
      team_ids: board.team_ids,
      journey: board.journey,
    };
    logger.info(JSON.stringify(_board));
    const { data } = await axios.post(`${databoardBase()}/boards`, _board, {
      headers: orgHeaders(orgId),
    });
    const newBoard = data.data;

    const fields = board.fields as Field[];
    for (const field of fields) {
      if (field.name === 'Name') continue;
      if (field.is_identifier) field.is_identifier = false;
      await addNewField(orgId, newBoard._id || newBoard.id, field);
    }

    return getBoardById(orgId, newBoard._id || newBoard.id);
  } catch (error) {
    logger.info('createNewBoardV2', { error });
    throw error;
  }
};

export const getBoardById = async (
  orgId: string,
  boardId: string
): Promise<BoardSchema> => {
  try {
    logger.info('getBoardById', { orgId, boardId });
    const { data } = await axios.get(`${databoardBase()}/boards/${boardId}`, {
      headers: orgHeaders(orgId),
    });
    return data.data;
  } catch (error) {
    logger.info('getBoardById', { error });
    throw error;
  }
};

export const updateBoard = async (
  orgId: string,
  board_id: string,
  board: Partial<BoardSchema>
) => {
  try {
    const { data } = await axios.patch(
      `${databoardBase()}/boards/${board_id}`,
      board,
      { headers: orgHeaders(orgId) }
    );
    return data.data;
  } catch (error) {
    logger.info('updateBoard', { error });
    throw error;
  }
};

export const addNewField = async (
  orgId: string,
  board_id: string,
  field: Field
) => {
  try {
    const { data } = await axios.post(
      `${databoardBase()}/boards/${board_id}/fields`,
      field,
      { headers: orgHeaders(orgId) }
    );
    return data.data;
  } catch (error) {
    logger.info('addNewField', { error });
    throw error;
  }
};

export const getBoardTemplateById = async (
  orgId: string,
  boardId: string
): Promise<IBoardTemplate> => {
  try {
    const { data } = await axios.get(`${databoardBase()}/boards/${boardId}`, {
      headers: orgHeaders(orgId),
    });
    const board = data.data;

    if (!board) {
      throw new _Error('Board not found', 404);
    }

    const template: IBoardTemplate = {
      boardName: board.name,
      name: board.name,
      organization_id: orgId,
      fields: (board.fields || []).map((field: Field) => ({
        name: field.name,
        type: field.type,
        data: field.data || [],
      })),
    };

    return template;
  } catch (error) {
    logger.info('getBoardTemplateById', { error });
    throw error;
  }
};

export const getBoards = async (orgId: string): Promise<BoardSchema[]> => {
  try {
    const { data } = await axios.get(`${databoardBase()}/boards`, {
      headers: orgHeaders(orgId),
    });
    return data.data;
  } catch (error) {
    logger.info('getBoards', { error });
    throw error;
  }
};

export const searchRecords = async (boardId: string, query: IDataObject) => {
  try {
    const url = `${databoardBase()}/search/${boardId}`;
    logger.info('searchRecords', { url, query: JSON.stringify(query) });
    const { data } = await axios.post(url, { ...query });
    return data;
  } catch (error) {
    logger.info('searchRecords', { error });
    throw error;
  }
};

export const createBoardField = async (
  boardId: string,
  fields: CreateFieldPayload[]
): Promise<Field[]> => {
  try {
    const { data } = await axios.post(
      `${databoardBase()}/boards/${boardId}/items`,
      { fields }
    );
    return data.data;
  } catch (error) {
    logger.info('createBoardFields', { error });
    throw error;
  }
};

export const updateBoardField = async (
  boardId: string,
  recordId: string,
  fields: UpdateFieldPayload[]
): Promise<Board> => {
  try {
    const { data } = await axios.patch(
      `${databoardBase()}/boards/${boardId}/items/${recordId}`,
      { data: fields }
    );
    return data.data;
  } catch (error) {
    logger.info('updateBoardFields', { error });
    throw error;
  }
};

export const createRecord = async (
  boardId: string,
  fields: CreateFieldPayload[]
): Promise<BoardItem> => {
  try {
    const { data } = await axios.post(
      `${databoardBase()}/boards/${boardId}/items`,
      { fields }
    );
    return data.data;
  } catch (error) {
    logger.info('createRecord', { error });
    throw error;
  }
};

export const checkDuplicate = async (
  boardId: string,
  query: IDataObject
): Promise<{ exists: boolean; data?: BoardItem }> => {
  try {
    const found = await searchRecords(boardId, query);
    if (found.message?.hits?.length > 0) {
      return { exists: true, data: found.message.hits[0] };
    }
    return { exists: false };
  } catch (error) {
    logger.info('duplicateBoardField', { error });
    throw error;
  }
};

export const updateDataboardField = async (
  board_id: string,
  field_id: string,
  field: Partial<Field>
) => {
  try {
    const { data } = await axios.patch(
      `${databoardBase()}/boards/${board_id}/fields/${field_id}`,
      field
    );
    logger.info('updateDataboardField', { data });
    return data.data;
  } catch (error) {
    logger.info('updateDataboardFields', { error });
    throw error;
  }
};

export const createBoardAndFieldV3 = async (
  orgId: string,
  board: IBoardTemplate
): Promise<BoardSchema> => {
  try {
    const boardName = board.boardName || board.name;
    const payload = {
      ...board,
      name: boardName,
      organization_id: orgId,
      type: board.type || 'General',
      team_ids: [],
    };

    let newBoard: BoardSchema;
    try {
      const { data } = await axios.post(`${databoardBase()}/boards`, payload, {
        headers: orgHeaders(orgId),
      });
      newBoard = data.data as BoardSchema;
    } catch (error: any) {
      // 409 Conflict = board name already exists
      if (error.response?.status === 409) {
        const suffix = crypto.randomBytes(2).toString('hex');
        const { data } = await axios.post(
          `${databoardBase()}/boards`,
          { ...payload, name: `${boardName} ${suffix}` },
          { headers: orgHeaders(orgId) }
        );
        newBoard = data.data as BoardSchema;
      } else {
        throw error;
      }
    }

    if (!newBoard) {
      throw new _Error('Board not found', 404);
    }

    return newBoard;
  } catch (error) {
    logger.info('createBoardAndFieldV3', { error });
    throw error;
  }
};

export const getDefaultBoards = async (orgId: string): Promise<BoardSchema[]> => {
  try {
    const { data } = await axios.get(`${databoardBase()}/boards`, {
      headers: orgHeaders(orgId),
      params: { default: true },
    });
    return data.data;
  } catch (error) {
    logger.info('getDefaultBoards', { error });
    throw error;
  }
};

export const exportCSV = async (
  orgId: string,
  id: string
): Promise<{ download_url: string }> => {
  try {
    const { data } = await axios.get(
      `${databoardBase()}/boards/${id}/export?return_content=true&all=true`,
      { headers: orgHeaders(orgId) }
    );
    return data;
  } catch (error) {
    logger.info('exportBoardItemToCSV', { error });
    throw error;
  }
};

export const importCSV = async (
  id: string,
  fileUrl: string
): Promise<BoardItem> => {
  try {
    const { data } = await axios.post(
      `${databoardBase()}/boards/${id}/import`,
      { fileUrl }
    );
    return data;
  } catch (error) {
    logger.info('importBoardItemFromCSV', { error });
    throw error;
  }
};

export const importCSVByContent = async (
  id: string,
  fileContent: string
): Promise<BoardItem> => {
  try {
    const { data } = await axios.post(
      `${databoardBase()}/boards/${id}/import`,
      { csvContent: fileContent, format: 'csv' }
    );
    return data;
  } catch (error) {
    logger.info('importCSVByContent', { error });
    throw error;
  }
};

// ───────────────────────────────────────────────────────────────────────────
// Document AI — doc schemas & categories (data_board service)
//   GET  /api/schemas/:id   POST /api/schemas
//   GET  /api/categories    POST /api/categories
// Used by Document AI agent export/import to capture and recreate the
// `doc_schemas` (extraction schemas) and their `doc_categories`.
// ───────────────────────────────────────────────────────────────────────────

export interface DocSchema {
  _id?: string;
  id?: string;
  organization_id?: string;
  name: string;
  category_id?: string | null;
  access_teams?: string[];
  attributes?: any[];
  agent_ids?: string[];
  databoard_ids?: string[];
}

export interface DocCategoryNode {
  id: string;
  name: string;
  subCategories?: DocCategoryNode[];
}

export const getDocSchemaById = async (
  orgId: string,
  schemaId: string
): Promise<DocSchema | null> => {
  try {
    const { data } = await axios.get(
      `${databoardBase()}/schemas/${schemaId}`,
      { headers: orgHeaders(orgId) }
    );
    return data.data ?? null;
  } catch (error) {
    if (axios.isAxiosError(error) && error.response?.status === 404) {
      console.warn(`Doc schema ${schemaId} not found; skipping`);
      return null;
    }
    console.log('getDocSchemaById', { error });
    throw error;
  }
};

export type DocCategoryType = 'schema' | 'databoard';

// Find an existing doc_schema by exact name (case-insensitive, trimmed) in the
// org. Used on import to reuse a schema that already exists instead of failing
// on the per-org unique-name constraint. Returns null when none matches.
export const findDocSchemaByName = async (
  orgId: string,
  name: string
): Promise<DocSchema | null> => {
  try {
    const target = name.trim().toLowerCase();
    const { data } = await axios.get(`${databoardBase()}/schemas`, {
      headers: orgHeaders(orgId),
      params: { search: name },
    });
    const rows: DocSchema[] = data.data ?? [];
    return (
      rows.find((s) => (s.name ?? '').trim().toLowerCase() === target) ?? null
    );
  } catch (error) {
    console.log('findDocSchemaByName', { error });
    return null;
  }
};

export const createDocSchema = async (
  orgId: string,
  payload: {
    name: string;
    category?: string | null;
    accessTeams?: string[];
    attributes?: any[];
    agents?: string[];
    databoards?: string[];
  }
): Promise<DocSchema> => {
  try {
    const { data } = await axios.post(`${databoardBase()}/schemas`, payload, {
      headers: orgHeaders(orgId),
    });
    return data.data;
  } catch (error) {
    console.log('createDocSchema', { error });
    throw error;
  }
};

// Provision a board per schema (sets the board's from_schema_id + fields from
// the schema attributes + category + team managers) AND links the schema to the
// assistant (appends agent_ids + databoard_ids). Returns [{board_id, schema_id}].
export const linkAssistantSchemas = async (
  orgId: string,
  assistantId: string,
  schemas: Array<{
    schema_id: string;
    data_board_name?: string;
    board_category_id?: string;
    board_deployment_access?: string[];
  }>
): Promise<Array<{ board_id: string; schema_id: string }>> => {
  try {
    const { data } = await axios.post(
      `${databoardBase()}/schemas/_link-assistant`,
      { assistant_id: assistantId, schemas },
      { headers: orgHeaders(orgId) }
    );
    return data.data ?? [];
  } catch (error) {
    console.log('linkAssistantSchemas', { error });
    throw error;
  }
};

export const getDocCategories = async (
  orgId: string,
  type: DocCategoryType = 'schema'
): Promise<DocCategoryNode[]> => {
  try {
    const { data } = await axios.get(`${databoardBase()}/categories`, {
      headers: orgHeaders(orgId),
      params: { type },
    });
    return data.data ?? [];
  } catch (error) {
    console.log('getDocCategories', { error });
    throw error;
  }
};

export const createDocCategory = async (
  orgId: string,
  payload: { name: string; parentId?: string | null; type?: DocCategoryType }
): Promise<DocCategoryNode> => {
  try {
    const { data } = await axios.post(
      `${databoardBase()}/categories`,
      {
        name: payload.name,
        type: payload.type ?? 'schema',
        parentId: payload.parentId ?? null,
      },
      { headers: orgHeaders(orgId) }
    );
    const created = data.data;
    return { id: created._id ?? created.id, name: created.name };
  } catch (error) {
    console.log('createDocCategory', { error });
    throw error;
  }
};
