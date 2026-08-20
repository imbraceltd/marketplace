import logger from '../../server/logging/logger';
import config from '../../config';
import axios from 'axios';
import { IChannel } from '../domains/interface/channel';

const channelHost = () => config.channelService.host || config.backend.host;

// Channel-service stores IDs as plain UUIDs; callers may pass prefixed IDs like "ch_<uuid>"
const normalizeChannelId = (id: string) => id.startsWith('ch_') ? id.slice(3) : id;

// Headers for service-to-service calls — org identity via header, not URL path
const internalHeaders = (orgId: string, userId?: string) => ({
  'X-Internal-Request': 'true',
  'x-organization-id': orgId,
  ...(userId ? { 'x-user-id': userId } : {}),
});

export const getChannelById = async (
  orgId: string,
  channelId: string
): Promise<IChannel> => {
  try {
    const url = `${channelHost()}/v1/channels/${normalizeChannelId(channelId)}`;
    const { data } = await axios.get(url, { headers: internalHeaders(orgId) });
    return data.data ?? data;
  } catch (error) {
    logger.info('getChannelById', { error });
    throw error;
  }
};

export const getChannels = async (orgId: string, type?: string): Promise<IChannel[]> => {
  try {
    const params: { active: boolean; type?: string; is_deleted: boolean } = { active: true, is_deleted: false };
    if (type) {
      params.type = type;
    }
    const url = `${channelHost()}/v1/channels/organization`;

    const { data } = await axios.get(url, {
      params,
      headers: internalHeaders(orgId),
    });
    return data.data?.filter((channel: IChannel) => channel.active && !channel.is_deleted);
  } catch (error) {
    logger.info('getChannels', { error });
    throw error;
  }
}

export const createChannel = async (
  orgId: string,
  channel: IChannel
): Promise<IChannel> => {
  try {
    const url = `${channelHost()}/v1/channels/_web`;
    delete channel._id;
    delete channel.id;
    const { data } = await axios.post(url, {
      name: channel.name,
      config: channel.config,
      is_init: true,
      active: true
    }, { headers: internalHeaders(orgId) });
    return data.data ?? data;
  } catch (error) {
    logger.info('createChannel', { error });
    throw error;
  }
}

export const createChannelV2 = async (
  orgId: string,
  channel: IChannel
): Promise<IChannel> => {
  try {
    const url = `${channelHost()}/v1/channels/_web`;
    delete channel._id;
    delete channel.id;
    const { data } = await axios.post(url, {
      name: channel.name,
      config: channel.config,
      is_init: true,
      active: true
    }, { headers: internalHeaders(orgId) });
    return data.data ?? data;
  } catch (error) {
    logger.info('createChannelV2', { error });
    throw error;
  }
}

export const createAgentChannel = async (orgId: string, name: string, assistant_id: string) => {
  try {
    const url = `${channelHost()}/v1/channels/agent_channel`;
    const { data } = await axios.post(url, {
      name,
      assistant_id,
      is_init: true,
      active: true
    }, { headers: internalHeaders(orgId) });
    return data.data ?? data;
  } catch (error) {
    logger.info('createAgentChannel', { error });
    throw error;
  }
}

export const createAgentChannelV2 = async (orgId: string, name: string, assistant_id: string) => {
  try {
    const url = `${channelHost()}/v1/channels/agent_channel`;
    const { data } = await axios.post(url, {
      name,
      assistant_id,
      is_init: true,
      active: true
    }, { headers: internalHeaders(orgId) });
    return data.data ?? data;
  } catch (error) {
    logger.info('createAgentChannelV2', { error });
    throw error;
  }
}

export const removeAgentChannel = async (orgId: string, channelId: string) => {
  try {
    const url = `${channelHost()}/v1/channels/${channelId}`;
    const { data } = await axios.delete(url, { headers: internalHeaders(orgId) });
    return data;
  } catch (error) {
    logger.info('removeAgentChannel', { error });
    throw error;
  }
}

export const removeAgentChannelV2 = async (orgId: string, channelId: string) => {
  try {
    const url = `${channelHost()}/v1/channels/${channelId}`;
    const { data } = await axios.delete(url, { headers: internalHeaders(orgId) });
    return data;
  } catch (error) {
    logger.info('removeAgentChannelV2', { error });
    throw error;
  }
}
