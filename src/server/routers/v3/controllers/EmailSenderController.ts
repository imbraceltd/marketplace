import { Request, Response } from 'express';
import { EmailSenderRepositoryFactory, AppRepositoryFactory } from '../../../../infrastructure/repositories/factories';
import { SearchEmailSendersUseCase } from '../../../../application/usecases/SearchEmailSendersUseCase';
import { CreateEmailSenderUseCase } from '../../../../application/usecases/CreateEmailSenderUseCase';
import { UpdateEmailSenderUseCase } from '../../../../application/usecases/UpdateEmailSenderUseCase';
import { DeleteEmailSenderUseCase } from '../../../../application/usecases/DeleteEmailSenderUseCase';
import _Error, { handleControllerError } from '../../../../utils/error';

export class EmailSenderController {
    private static repository = EmailSenderRepositoryFactory.create();
    private static appRepository = AppRepositoryFactory.create();

    static async getAll(req: Request, res: Response) {
        try {
            const useCase = new SearchEmailSendersUseCase(EmailSenderController.repository, EmailSenderController.appRepository);
            const userContext = (req as any).userContext;
            const result = await useCase.execute(userContext, req.query);
            return res.status(200).json({ data: result });
        } catch (error) {
            const { message, code } = handleControllerError(error);
            return res.status(code).json({ message });
        }
    }

    static async getById(req: Request, res: Response) {
        try {
            const organizationId = (req as any).userContext?.org_id;
            const sender = await EmailSenderController.repository.findById(req.params.id);
            if (!sender || (organizationId && sender.organization_id !== organizationId)) {
                throw new _Error('Email sender not found', 404);
            }
            return res.status(200).json({ data: sender.toJSON() });
        } catch (error) {
            const { message, code } = handleControllerError(error);
            return res.status(code).json({ message });
        }
    }

    static async create(req: Request, res: Response) {
        try {
            const useCase = new CreateEmailSenderUseCase(EmailSenderController.repository);
            const userContext = (req as any).userContext;
            const sender = await useCase.execute(userContext, req.body);
            return res.status(200).json({ data: sender.toJSON() });
        } catch (error) {
            const { message, code } = handleControllerError(error);
            return res.status(code).json({ message });
        }
    }

    static async update(req: Request, res: Response) {
        try {
            const useCase = new UpdateEmailSenderUseCase(EmailSenderController.repository);
            const userContext = (req as any).userContext;
            const sender = await useCase.execute(userContext, req.params.id, req.body);
            return res.status(200).json({ data: sender?.toJSON() });
        } catch (error) {
            const { message, code } = handleControllerError(error);
            return res.status(code).json({ message });
        }
    }

    static async delete(req: Request, res: Response) {
        try {
            const useCase = new DeleteEmailSenderUseCase(EmailSenderController.repository);
            const userContext = (req as any).userContext;
            const deleted = await useCase.execute(userContext, req.params.id);
            return res.status(200).json({
                data: deleted ? deleted.toJSON() : null
            });
        } catch (error) {
            const { message, code } = handleControllerError(error);
            return res.status(code).json({ message });
        }
    }
}
