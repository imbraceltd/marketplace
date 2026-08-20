import logger from '../../server/logging/logger';
import axios from 'axios';
import config from '../../config';
import { IDataObject } from '../domains/interface/types';
import FormData from 'form-data';

const dataBoardHost = () => config.dataBoard.host;

const schedulerHeaders = (orgId: string, userId: string) => ({
    'x-organization-id': orgId,
    'x-user-id': userId,
});

export const createScheduler = async (orgId: string, userId: string, inputs: IDataObject) => {
    try {
        const url = `${dataBoardHost()}/api/v1/schedulers`;
        const { data } = await axios.post(url, { ...inputs }, { headers: schedulerHeaders(orgId, userId) });
        return { result: data, status: 200 };
    } catch (error) {
        logger.info('createScheduler', { error });
        if (error instanceof axios.AxiosError) {
            return { result: { message: error?.response?.data?.detail?.message ?? error?.response?.data?.message }, status: error.response?.status || 500 };
        }
        throw error;
    }
}

export const createSchedulerWithFiles = async (orgId: string, userId: string, inputs: IDataObject, files?: Express.Multer.File[]) => {
    try {
        const url = `${dataBoardHost()}/api/v1/schedulers/files`;
        const form = new FormData();

        // Append payload to form-data
        form.append('payload', JSON.stringify(inputs));

        // Append files to form-data
        if (files && files?.length > 0) {
            files.forEach(file => {
                form.append('files', file.buffer, file.originalname);
            });
        }

        const headers = {
            ...form.getHeaders(),
            ...schedulerHeaders(orgId, userId),
            'accept': 'application/json, text/plain, */*',
            'content-type': 'multipart/form-data',
        };

        const { data } = await axios.post(url, form, { headers });
        return { result: data, status: 200 };
    } catch (error) {
        logger.info('createSchedulerWithFiles', { error });
        if (axios.isAxiosError(error)) {
            return { result: { message: error?.response?.data?.detail?.message ?? error?.response?.data?.message }, status: error.response?.status || 500 };
        }
        throw error;
    }
}

export const deleteSchedulersByAppId = async (orgId: string, appId: string) => {
    try {
        const url = `${dataBoardHost()}/api/v1/schedulers/apps/${appId}`;
        const { data } = await axios.delete(url, { headers: schedulerHeaders(orgId, 'admin') });
        return { result: data, status: 200 };
    } catch (error) {
        logger.info('deleteSchedulersByAppId', { error });
        if (error instanceof axios.AxiosError) {
            return { result: { message: error?.response?.data?.detail?.message ?? error?.response?.data?.message }, status: error.response?.status || 500 };
        }
        throw error;
    }
}