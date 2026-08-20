import { Request, Response } from 'express';
import { UseCaseRepositoryFactory } from '../../../../infrastructure/repositories/factories';
import { SearchUseCasesUseCase } from '../../../../application/usecases/SearchUseCasesUseCase';
import { GetUseCaseByIdUseCase } from '../../../../application/usecases/GetUseCaseByIdUseCase';
import { GetUseCaseByAssistantIdUseCase } from '../../../../application/usecases/GetUseCaseByAssistantIdUseCase';
import { CreateUseCaseUseCase } from '../../../../application/usecases/CreateUseCaseUseCase';
import { UpdateUseCaseUseCase } from '../../../../application/usecases/UpdateUseCaseUseCase';
import { DeleteUseCaseUseCase } from '../../../../application/usecases/DeleteUseCaseUseCase';
import { CreateCustomUseCaseUseCase } from '../../../../application/usecases/CreateCustomUseCaseUseCase';
import { CreateCustomUseCaseV2UseCase } from '../../../../application/usecases/CreateCustomUseCaseV2UseCase';
import { UpdateCustomUseCaseUseCase } from '../../../../application/usecases/UpdateCustomUseCaseUseCase';
import { DeleteUseCaseV2UseCase } from '../../../../application/usecases/DeleteUseCaseV2UseCase';
import { getBuiltinAssistantById } from '../../../../core/services/builtin_agent.service';
import _Error, { handleControllerError } from '../../../../utils/error';

export class UseCaseController {
    private static repository = UseCaseRepositoryFactory.create();

    static async getAll(req: Request, res: Response) {
        try {
            const organizationId = ((req as any).userContext?.org_id) as string;
            if (!organizationId) {
                return res.status(400).json({ message: 'Use cases not found' });
            }
            const useCase = new SearchUseCasesUseCase(UseCaseController.repository);
            const result: any = await useCase.execute(req.query, organizationId);
            // v1 returns: { data: useCases }
            // If result is an array, we return it directly in data
            // If result is an object with 'usecases', we use that (for pagination)
            const data = Array.isArray(result) ? result : result.usecases;
            return res.status(200).json({ data });
        } catch (error: any) {
            const { code, message } = handleControllerError(error);
            return res.status(code).json({ message });
        }
    }

    static async getById(req: Request, res: Response) {
        try {
            const orgId = ((req as any).userContext?.org_id) as string;
            if (!orgId) {
                return res.status(400).json({ message: 'Use cases not found' });
            }
            const useCase = new GetUseCaseByIdUseCase();
            const result = await useCase.execute(req.params.id, orgId);
            return res.status(200).json({ data: result });
        } catch (error: any) {
            const { code, message } = handleControllerError(error);
            return res.status(code).json({ message });
        }
    }

    static async getByAssistantId(req: Request, res: Response) {
        try {
            const orgId = ((req as any).userContext?.org_id) as string;
            const { assistant_id } = req.params;
            if (!orgId || !assistant_id) {
                return res.status(400).json({ message: 'Use cases not found' });
            }
            const useCase = new GetUseCaseByAssistantIdUseCase();
            const result = await useCase.execute(assistant_id, orgId);
            return res.status(200).json({ data: result });
        } catch (error: any) {
            const { code, message } = handleControllerError(error);
            return res.status(code).json({ message });
        }
    }

    static async create(req: Request, res: Response) {
        try {
            const useCase = new CreateUseCaseUseCase();
            const result = await useCase.execute((req as any).userContext, req.body);
            return res.status(200).json({ data: result });
        } catch (error: any) {
            const { code, message } = handleControllerError(error);
            return res.status(code).json({ message });
        }
    }

    static async createCustom(req: Request, res: Response) {
        try {
            const userContext = (req as any).userContext;
            const { usecase, assistant } = req.body;
            if (!userContext?.org_id || !usecase || !assistant) {
                throw new _Error('missing usecase or assistant payload', 400);
            }
            const useCase = new CreateCustomUseCaseUseCase();
            const result = await useCase.execute(userContext, req.body);
            return res.status(200).json({ data: result });
        } catch (error: any) {
            const { code, message } = handleControllerError(error);
            return res.status(code).json({ message });
        }
    }

    static async createCustomV2(req: Request, res: Response) {
        try {
            const userContext = (req as any).userContext;
            const { usecase, assistant } = req.body;
            if (!userContext?.org_id || !usecase || !assistant) {
                throw new _Error('missing usecase or assistant payload', 400);
            }
            const useCase = new CreateCustomUseCaseV2UseCase();
            const result = await useCase.execute(userContext, req.body);
            return res.status(200).json({ data: result });
        } catch (error: any) {
            const { code, message } = handleControllerError(error);
            return res.status(code).json({ message });
        }
    }

    static async update(req: Request, res: Response) {
        try {
            const orgId = ((req as any).userContext?.org_id) as string;
            if (!orgId) {
                return res.status(400).json({ message: 'Use cases not found' });
            }
            const useCase = new UpdateUseCaseUseCase();
            const result = await useCase.execute(req.params.id, orgId, req.body);
            return res.status(200).json({ data: result });
        } catch (error: any) {
            const { code, message } = handleControllerError(error);
            return res.status(code).json({ message });
        }
    }

    static async updateCustom(req: Request, res: Response) {
        try {
            const userContext = (req as any).userContext;
            const { usecase, assistant } = req.body;
            if (!userContext?.org_id || !usecase || !assistant) {
                throw new _Error('missing usecase or assistant payload', 400);
            }
            const useCase = new UpdateCustomUseCaseUseCase();
            const result = await useCase.execute(req.params.id, userContext, req.body);
            return res.status(200).json({ data: result });
        } catch (error: any) {
            const { code, message } = handleControllerError(error);
            return res.status(code).json({ message });
        }
    }

    static async delete(req: Request, res: Response) {
        try {
            const orgId = ((req as any).userContext?.org_id) as string;
            if (!orgId) {
                return res.status(400).json({ message: 'Use cases not found' });
            }
            const useCase = new DeleteUseCaseUseCase();
            await useCase.execute(req.params.id, orgId);
            return res.status(200).json({ message: 'UseCase deleted successfully' });
        } catch (error: any) {
            const { code, message } = handleControllerError(error);
            return res.status(code).json({ message });
        }
    }

    static async deleteV2(req: Request, res: Response) {
        try {
            const orgId = ((req as any).userContext?.org_id) as string;
            if (!orgId) {
                return res.status(400).json({ message: 'Use cases not found' });
            }
            const useCase = new DeleteUseCaseV2UseCase();
            await useCase.execute(req.params.id, orgId);
            return res.status(200).json({ message: 'UseCase deleted successfully' });
        } catch (error: any) {
            const { code, message } = handleControllerError(error);
            return res.status(code).json({ message });
        }
    }

    static async getBuiltinAssistantById(req: Request, res: Response) {
        try {
            const { assistant_id } = req.params;
            if (!assistant_id) {
                throw new _Error('assistant_id is required', 400);
            }
            const doc = await getBuiltinAssistantById(assistant_id);
            return res.status(200).json({ data: doc });
        } catch (error: any) {
            const { code, message } = handleControllerError(error);
            return res.status(code).json({ message });
        }
    }
}
