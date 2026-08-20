import logger from '../../../server/logging/logger';
import { handleServiceError } from "../../../utils/error";
import { IDataObject } from "../../domains/interface/types";
import { TemplateRepositoryFactory } from "../../../infrastructure/repositories/factories/TemplateRepositoryFactory";

const templateRepository = TemplateRepositoryFactory.create();

export const getTemplates = async (
    query: IDataObject) => {
    try {
        const { name, skip, limit } = query;
        const _skip = skip ? parseInt(skip as string) : 0;
        const _limit = limit ? parseInt(limit as string) : 0;

        const searchOptions = {
            search: name as string | undefined,
            skip: _skip,
            limit: _limit,
        };

        const total = await templateRepository.countAll({ search: searchOptions.search });
        const templates = await templateRepository.findAll(searchOptions);
        const has_more = _skip + templates.length < total;

        return {
            templates,
            skip: _skip,
            limit: _limit,
            total,
            has_more,
        }

    } catch (error) {
        logger.info('getTemplates Error: ', { error });
        throw handleServiceError(error);

    }
}

export const getTemplate = async (id: string) => {
    try {
        const template = await templateRepository.findById(id);
        return template;
    } catch (error) {
        logger.info('getTemplate Error: ', { error });
        throw handleServiceError(error);

    }
}