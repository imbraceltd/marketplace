import logger from '../../server/logging/logger';
import config from '../../config';
import axios from 'axios';

export type IKnowledgeHubFolder = {
  _id: string;
  name: string;
  organization_id: string;
  description?: string;
  tags: string[];
  parent_folder_id: string;
  source_type: string;
  file_count: number;
  path: string;
  createdAt?: string;
  updatedAt?: string;
};

export type ICreateKnowledgeHubFolder = {
  name: string;
  description?: string;
  tags?: string[];
  parent_folder_id: string;
  source_type?: string;
  auto_tagging?: boolean;
};

export const getFolders = async (orgId: string = ""): Promise<IKnowledgeHubFolder[]> => {
  try {
    const url = `${config.knowledgeHub.host}/api/folders`;
    const { data } = await axios.get(url, {
      params: {
        organization_id: orgId,
      },
    });
    return data.data;
  } catch (error) {
    logger.info('getFolders', { error });
    throw error;
  }
};

export const createFolder = async (orgId: string = "", folder: ICreateKnowledgeHubFolder): Promise<IKnowledgeHubFolder> => {
  try {
    const url = `${config.knowledgeHub.host}/api/folders`;
    const { data } = await axios.post(url, {
      ...folder,
      organization_id: orgId,
    });
    return data.data;
  } catch (error) {
    logger.info('createFolder', { error });
    throw error;
  }
};
