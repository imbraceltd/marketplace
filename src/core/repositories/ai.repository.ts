import logger from '../../server/logging/logger';
import axios from 'axios';
import config from '../../config';
import { AIAssistant, GuardRail } from '../domains/interface/aiAssistant';

const aiBase = () => `${config.ai.v2Host}/api/v1`;
const orgHeaders = (orgId: string) => ({ 'x-organization-id': orgId });

// Get all workflows related to the organization
export const getWorkflowsRelatedToAssistant = async (
  orgId: string
): Promise<Array<{ assistant_id: string; workflow_id: string }>> => {
  try {
    const { data } = await axios.get(`${aiBase()}/workflows`, {
      headers: orgHeaders(orgId),
    });
    return data;
  } catch (error) {
    logger.info('getWorkflows', { error });
    throw error;
  }
};

// Bulk delete AI assistants
export const deleteAssistants = async (
  orgId: string,
  assistantIds: Array<string>
): Promise<Array<string>> => {
  try {
    const { data } = await axios.delete(`${aiBase()}/assistants`, {
      headers: orgHeaders(orgId),
      data: assistantIds,
    });
    return data;
  } catch (error) {
    logger.info('deleteAssistants', { error });
    throw error;
  }
};

// Delete a single assistant app
export const deleteAssistant = async (
  orgId: string,
  assistantId: string
): Promise<Array<string>> => {
  try {
    const { data } = await axios.delete(
      `${aiBase()}/assistant_apps/${assistantId}`,
      { headers: orgHeaders(orgId) }
    );
    return data;
  } catch (error) {
    logger.info('deleteAssistant', { error });
    throw error;
  }
};

export const getAssistants = async (orgId: string): Promise<Array<AIAssistant>> => {
  try {
    const { data } = await axios.get(`${aiBase()}/assistants`, {
      headers: orgHeaders(orgId),
    });
    const list = Array.isArray(data) ? data : [];
    return list.map((a: any) => ({ ...a, id: a.assistant_id ?? a.id }));
  } catch (error) {
    logger.info('getAssistants', { error });
    throw error;
  }
};

export const getAssistantById = async (
  orgId: string,
  assistantId: string,
): Promise<AIAssistant | null> => {
  try {
    const { data } = await axios.get(
      `${aiBase()}/assistants/${assistantId}`,
      { headers: orgHeaders(orgId) },
    );
    if (!data) return null;
    return { ...data, id: data.assistant_id ?? data.id };
  } catch (error: any) {
    if (error?.response?.status === 404) return null;
    logger.info('getAssistantById', { error: error?.message, assistantId });
    return null;
  }
};

export const createAssistant = async (
  orgId: string,
  assistant: AIAssistant
): Promise<AIAssistant> => {
  try {
    const { data } = await axios.post(
      `${aiBase()}/assistant_apps`,
      { ...assistant, credential_name: `${assistant?.mode} | ${assistant?.name}` },
      { headers: orgHeaders(orgId) }
    );
    return data;
  } catch (error) {
    logger.info('createAssistant', { error });
    throw error;
  }
};

export const updateAssistant = async (
  orgId: string,
  assistantId: string,
  assistant: AIAssistant
): Promise<AIAssistant> => {
  try {
    const { data } = await axios.put(
      `${aiBase()}/assistant_apps/${assistantId}`,
      { ...assistant, credential_name: `${assistant?.mode} | ${assistant?.name}` },
      { headers: orgHeaders(orgId) }
    );
    return data;
  } catch (error) {
    logger.info('updateAssistant', { error });
    throw error;
  }
};

export const getGuardRail = async (orgId: string, guardRailId: string): Promise<GuardRail> => {
  try {
    const { data } = await axios.get(`${aiBase()}/guardrail/${guardRailId}`, {
      headers: orgHeaders(orgId),
    });
    return data;
  } catch (error) {
    logger.info('getGuardRail', { error });
    throw error;
  }
};

export const getGuardRails = async (orgId: string): Promise<GuardRail[]> => {
  try {
    const { data } = await axios.get(`${aiBase()}/guardrail/all`, {
      headers: orgHeaders(orgId),
    });
    return data;
  } catch (error) {
    logger.info('getGuardRails', { error });
    throw error;
  }
};

export const createGuardRail = async (orgId: string, guardRail: GuardRail) => {
  try {
    const { data } = await axios.post(
      `${aiBase()}/guardrail/create`,
      { ...guardRail },
      { headers: orgHeaders(orgId) }
    );
    return data;
  } catch (error) {
    logger.info('createGuardRail', { error });
    throw error;
  }
};

// NOTE: cloneAssistantFiles has no equivalent in chat-ai yet — keeping as-is
export const cloneAssistantFiles = async (
  orgId: string,
  assistantId: string,
  originalAssistantId: string
) => {
  try {
    const { data } = await axios.post(
      `${config.platform.host}/v1/organization/${orgId}/ai/files/clone`,
      { assistant_id: assistantId, original_assistant_id: originalAssistantId },
      { headers: orgHeaders(orgId) }
    );
    return data;
  } catch (error) {
    logger.info('cloneAssistantFiles', { error });
    throw error;
  }
};
