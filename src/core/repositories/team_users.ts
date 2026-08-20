import logger from '../../server/logging/logger';
import config from '../../config';
import axios, { Axios } from 'axios';
import _Error, { ErrorCode } from '../../utils/error';

export interface IUser {
  _id: string;
  doc_name: string;
  public_id: string;
  organization_id: string;
  email: string;
  role: string;
  display_name: string;
  avatar_url: string;
  gender: string;
  first_name: string;
  last_name: string;
  address_line1: string;
  address_line2: string;
  area_code: string;
  phone_number: string;
  language: string;
  status: string;
  is_active: boolean;
  is_archived: boolean;
  is_bot: boolean;
  is_admin: boolean;
  created_at: string;
  updated_at: string;
  _language: string;
  team: Array<{
    _id: string;
    doc_name: string;
    public_id: string;
    organization_id: string;
    business_unit_id: string;
    team_id: string;
    user_id: string;
    role: string;
    state: string;
    applicant: string;
    approver: string;
    approver_at: string;

    created_at: string;
    updated_at: string;
    updater: string;
    wait_leave: boolean;
  }>;
}

export interface ITeamUser {
  object_name: string;
  id: string;
  organization_id: string;
  business_unit_id: string;
  team_id: string;
  user_id: string;
  role: string;
  state: string;
  user: IUser;
  team: {
    object_name: string;
    id: string;
    organization_id: string;
    business_unit_id: string;
    name: string;
    mode: string;
    icon_url: string;
    description: string;
    is_default: boolean;
    user_state: string;
    created_at: string;
    updated_at: string;
    is_disabled: boolean;
  };
}

export interface IBaseTeam {
  _id: string;
  id: string;
  organization_id: string;
  business_unit_id: string;
  name: string;
  mode: string;
  icon_url: string;
  description: string;
  is_default: boolean;
  user_state: string;
  created_at: string;
  updated_at: string;
  is_disabled: boolean;
}

export interface ITeam extends IBaseTeam {
  team_user_ids: string[];
  team_users: Partial<ITeamUser>[];
}

export const getUserInfo = async (
  orgId: string,
  userId: string
): Promise<IUser | null> => {
  try {
    const url = `${config.platform.host}/v1/organization/${orgId}/user/${userId}`;

    const { data } = await axios.get(url);

    return data;
  } catch (error) {
    logger.info('getUserInfo', { error });
    // handle 404
    if (axios.isAxiosError(error) && error.response?.status === 404) {
      throw new _Error('User not found', 404, ErrorCode.not_found);
    }
    throw error;
  }
};
export interface IUserResponse {
  items: IUser[];
}

export const getAllOrgMembers = async (ordId: string): Promise<IUser[]> => {
  try {
    const url = `${config.platform.host}/v1/organization/${ordId}/users`;

    const { data } = await axios.get(url);

    return data?.items || [];
  } catch (error) {
    logger.info('getAllOrgMembers', { error });
    throw error;
  }
};

// get team by id
export const getTeamById = async (
  orgId: string,
  teamId: string
): Promise<ITeam | null> => {
  try {
    if (!teamId) {
      throw new _Error('required team ID', 400, ErrorCode.missing_team);
    }

    const url = `${config.backend.host}/v1/team/${teamId}`;

    const { data } = await axios.get(url);

    if (data.organization_id !== orgId) {
      return null;
    }

    return data;
  } catch (error) {
    logger.info('getTeamById: ', teamId, { error });
    throw error;
  }
};

// get user info
export const getTeamUserInfo = async (
  orgId: string,
  userId: string
): Promise<ITeamUser | null> => {
  try {
    const url = `${config.backend.host}/v1/team/users/${userId}`;

    const { data } = await axios.get(url);

    if (data.organization_id !== orgId) {
      return null;
    }

    return data;
  } catch (error) {
    logger.info('getUserInfo', { error });

    // Handle 404
    if (axios.isAxiosError(error) && error.response?.status === 404) {
      throw new _Error('User not found', 404, ErrorCode.not_found);
    }

    throw error;
  }
};


// get teams by organization id
export const getTeamsByOrgId = async (orgId: string): Promise<IBaseTeam[]> => {
  try {
    const url = `${config.platform.host}/v1/organization/${orgId}/teams`;

    const { data } = await axios.get(url);

    return data || [];
  } catch (error) {
    logger.info('getTeamsByOrgId', { error });
    throw error;
  }
};