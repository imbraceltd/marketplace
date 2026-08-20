import { Request, Response } from 'express';
import { EmailTemplateRepositoryFactory } from '../../../../infrastructure/repositories/factories';
import { SearchEmailTemplatesUseCase } from '../../../../application/usecases/SearchEmailTemplatesUseCase';
import { AdvancedSearchEmailTemplatesUseCase } from '../../../../application/usecases/AdvancedSearchEmailTemplatesUseCase';
import { CreateEmailTemplateUseCase } from '../../../../application/usecases/CreateEmailTemplateUseCase';
import { UpdateEmailTemplateUseCase } from '../../../../application/usecases/UpdateEmailTemplateUseCase';
import { DeleteEmailTemplateUseCase } from '../../../../application/usecases/DeleteEmailTemplateUseCase';
import { GetEmailTemplateByIdUseCase } from '../../../../application/usecases/GetEmailTemplateByIdUseCase';
import { handleControllerError } from '../../../../utils/error';

export class EmailTemplateController {
    private static repository = EmailTemplateRepositoryFactory.create();

    static async getAll(req: Request, res: Response) {
        try {
            const useCase = new SearchEmailTemplatesUseCase(
                EmailTemplateController.repository
            );
            const userContext = (req as any).userContext;
            const result = await useCase.execute(userContext, req.query);
            return res.status(200).json(result);
        } catch (error) {
            const { message, code } = handleControllerError(error);
            return res.status(code).json({ message });
        }
    }

    static async search(req: Request, res: Response) {
        try {
            const useCase = new AdvancedSearchEmailTemplatesUseCase(
                EmailTemplateController.repository
            );
            const userContext = (req as any).userContext;
            const result = await useCase.execute(userContext, req.query);
            return res.status(200).json(result);
        } catch (error) {
            const { message, code } = handleControllerError(error);
            return res.status(code).json({ message });
        }
    }

    static async getById(req: Request, res: Response) {
        try {
            const useCase = new GetEmailTemplateByIdUseCase(
                EmailTemplateController.repository
            );
            const userContext = (req as any).userContext;
            const template = await useCase.execute(userContext, req.params.id);
            return res.status(200).json({ data: template });
        } catch (error) {
            const { message, code } = handleControllerError(error);
            return res.status(code).json({ message });
        }
    }

    static async create(req: Request, res: Response) {
        try {
            const useCase = new CreateEmailTemplateUseCase(EmailTemplateController.repository);
            const userContext = (req as any).userContext;
            const template = await useCase.execute(userContext, req.body);
            return res.status(200).json({ data: template.toJSON() });
        } catch (error) {
            const { message, code } = handleControllerError(error);
            return res.status(code).json({ message });
        }
    }

    static async update(req: Request, res: Response) {
        try {
            const useCase = new UpdateEmailTemplateUseCase(EmailTemplateController.repository);
            const userContext = (req as any).userContext;
            const template = await useCase.execute(userContext, req.params.id, req.body);
            return res.status(200).json({ data: template?.toJSON() });
        } catch (error) {
            const { message, code } = handleControllerError(error);
            return res.status(code).json({ message });
        }
    }

    static async delete(req: Request, res: Response) {
        try {
            const useCase = new DeleteEmailTemplateUseCase(EmailTemplateController.repository);
            const userContext = (req as any).userContext;
            const deleted = await useCase.execute(userContext, req.params.id);
            return res.status(200).json({ data: deleted ? deleted.toJSON() : null });
        } catch (error) {
            const { message, code } = handleControllerError(error);
            return res.status(code).json({ message });
        }
    }
}
