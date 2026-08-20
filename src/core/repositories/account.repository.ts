import logger from '../../server/logging/logger';
import config from '../../config';
import axios from 'axios';
import { Organization } from '../domains/interface/organization';

export const getOrgInfo = async (orgId: string): Promise<Organization> => {
    try {
        const url = `${config.platform.host}/v1/organization/${orgId}/accounts`;
        const { data } = await axios.get(url);
        return data;
    } catch (error) {
        logger.info('getOrgInfo', { error });
        throw error;
    }
};

export const isPaidUser = async (accountId: string): Promise<boolean> => {
    try {
        const url = `${config.platform.host}/v1/organization/${accountId}/is-paid-user`;
        const { data } = await axios.get(url);
        return data;
    } catch (error) {
        logger.info('isPaidUser', { error });
        throw error;
    }
};