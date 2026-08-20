import { Request, Response } from 'express';
import { MarketplaceTemplateRepositoryFactory } from '../../../../infrastructure/repositories/factories/MarketplaceTemplateRepositoryFactory';
import { ImportMarketplaceTemplateUseCase } from '../../../../application/usecases/marketplace/ImportMarketplaceTemplateUseCase';
import { ListMarketplaceTemplatesUseCase } from '../../../../application/usecases/marketplace/ListMarketplaceTemplatesUseCase';
import { UpdateMarketplaceTemplateUseCase } from '../../../../application/usecases/marketplace/UpdateMarketplaceTemplateUseCase';
import { InstallMarketplaceTemplateUseCase } from '../../../../application/usecases/marketplace/InstallMarketplaceTemplateUseCase';
import { handleControllerError } from '../../../../utils/error';

export class MarketplaceTemplateController {
    private static repository = MarketplaceTemplateRepositoryFactory.create();

    static async list(req: Request, res: Response) {
        try {
            const useCase = new ListMarketplaceTemplatesUseCase(MarketplaceTemplateController.repository);
            const result = await useCase.execute(req.query as Record<string, string | undefined>);
            return res.status(200).json({ data: result.data, total: result.total, skip: result.skip, limit: result.limit, has_more: result.has_more });
        } catch (error: any) {
            const { code, message } = handleControllerError(error);
            return res.status(code).json({ message });
        }
    }

    static async getById(req: Request, res: Response) {
        try {
            const row = await MarketplaceTemplateController.repository.findById(req.params.id);
            if (!row) return res.status(404).json({ message: 'Marketplace template not found' });
            return res.status(200).json({ data: row });
        } catch (error: any) {
            const { code, message } = handleControllerError(error);
            return res.status(code).json({ message });
        }
    }

    static async import(req: Request, res: Response) {
        try {
            const userContext = (req as any).userContext;
            const fileBuffer = req.file?.buffer;
            const useCase = new ImportMarketplaceTemplateUseCase();
            const created = await useCase.execute(userContext, fileBuffer, req.body ?? {});
            return res.status(200).json({ data: created });
        } catch (error: any) {
            const { code, message } = handleControllerError(error);
            return res.status(code).json({ message });
        }
    }

    static async update(req: Request, res: Response) {
        try {
            const useCase = new UpdateMarketplaceTemplateUseCase();
            const updated = await useCase.execute(req.params.id, req.body ?? {});
            return res.status(200).json({ data: updated });
        } catch (error: any) {
            const { code, message } = handleControllerError(error);
            return res.status(code).json({ message });
        }
    }

    static async install(req: Request, res: Response) {
        try {
            const userContext = (req as any).userContext;
            const useCase = new InstallMarketplaceTemplateUseCase();
            const result = await useCase.execute(userContext, req.params.id, req.body ?? {});
            return res.status(200).json(result);
        } catch (error: any) {
            const { code, message } = handleControllerError(error);
            return res.status(code).json({ message });
        }
    }

    static async delete(req: Request, res: Response) {
        try {
            const removed = await MarketplaceTemplateController.repository.delete(req.params.id);
            if (!removed) return res.status(404).json({ message: 'Marketplace template not found' });
            return res.status(200).json({ success: true });
        } catch (error: any) {
            const { code, message } = handleControllerError(error);
            return res.status(code).json({ message });
        }
    }
}
