import IUserContext from '../domains/interface/userContext';
import { getChannelById } from '../repositories/channel.repository';
import { EmailSenderRepositoryFactory } from '../../infrastructure/repositories/factories/EmailSenderRepositoryFactory';

const emailSenderRepository = EmailSenderRepositoryFactory.create();

export enum ChannelType {
  MarketPlaceEmailSender = 'marketplace_email_sender',
  OrgMemberEmailSender = 'email_sender',
  Imbrace_Channel = 'imbrace_channel',
  Workflow_Credential = 'workflow_credential',
}

export interface IStoredChannel {
  id: string;
  name: string;
  channel_type: string;
}

export const assertChannelType = (channel: IStoredChannel): ChannelType => {
  if (
    channel.channel_type === 'email_sender' ||
    channel.channel_type === 'marketplace_email_sender'
  ) {
    return channel.channel_type as ChannelType;
  }

  if (channel.id.startsWith('ch_')) {
    return ChannelType.Imbrace_Channel;
  }

  return ChannelType.Workflow_Credential;
};

export const testIfChannelOk = async (
  userContext: IUserContext,
  channel: IStoredChannel
): Promise<{
  ok: boolean;
  error_code?: string;
}> => {
  const channelType = assertChannelType(channel);
  if (channelType === ChannelType.Workflow_Credential) {
    return {
      ok: false,
      error_code: 'credential_not_found',
    };
  }

  if (channelType === ChannelType.Imbrace_Channel) {
    const _channel = await getChannelById(userContext.org_id, channel.id);
    if (!_channel || !_channel.id || _channel.is_deleted === true) {
      return {
        ok: false,
        error_code: 'channel_missing',
      };
    }

    if (_channel && _channel.errorCode && _channel.errorCode === 1 || _channel.errorCode === 2) {
      return {
        ok: false,
        error_code: 'reconnection_needed',
      };
    }

    return {
      ok: true,
    };
  }

  if (channelType === ChannelType.MarketPlaceEmailSender || channelType === ChannelType.OrgMemberEmailSender) {
    const email = await emailSenderRepository.findById(channel.id);

    return {
      ok: !!email && !email.deleted_at,
      error_code: 'channel_missing',
    };
  }

  return {
    ok: false,
    error_code: 'channel_missing',
  };
};

export const testIfChannelOkV3 = async (
  userContext: IUserContext,
  channel: IStoredChannel
): Promise<{
  ok: boolean;
  error_code?: string;
}> => {
  const channelType = assertChannelType(channel);
  if (channelType === ChannelType.Workflow_Credential) {
    return {
      ok: false,
      error_code: 'credential_not_found',
    };
  }

  if (channelType === ChannelType.Imbrace_Channel) {
    const _channel = await getChannelById(userContext.org_id, channel.id);
    if (!_channel || !_channel.id || _channel.is_deleted === true) {
      return {
        ok: false,
        error_code: 'channel_missing',
      };
    }

    if (_channel && _channel.errorCode && _channel.errorCode === 1 || _channel.errorCode === 2) {
      return {
        ok: false,
        error_code: 'reconnection_needed',
      };
    }

    return {
      ok: true,
    };
  }

  if (channelType === ChannelType.MarketPlaceEmailSender || channelType === ChannelType.OrgMemberEmailSender) {
    const email = await emailSenderRepository.findById(channel.id);

    return {
      ok: !!email && !email.deleted_at,
      error_code: 'channel_missing',
    };
  }

  return {
    ok: false,
    error_code: 'channel_missing',
  };
};
