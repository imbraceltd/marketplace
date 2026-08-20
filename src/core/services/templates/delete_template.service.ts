import logger from '../../../server/logging/logger';
import { handleServiceError } from "../../../utils/error";
import { TemplateRepositoryFactory } from "../../../infrastructure/repositories/factories/TemplateRepositoryFactory";

const templateRepository = TemplateRepositoryFactory.create();

export const deleteTemplate = async (templateId: string) => {
    try {
        const template = await templateRepository.findById(templateId);
        if (!template) {
            throw new Error("Template not found");
        }

        const result = await templateRepository.delete(templateId);
        return result;

    } catch (error) {
        logger.info('deleteTemplate Error: ', { error });
        throw handleServiceError(error);
    }
}