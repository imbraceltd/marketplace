import { Request, Response } from 'express';
import { FormRepositoryFactory, AppRepositoryFactory } from '../../../../infrastructure/repositories/factories';
import { SearchFormsUseCase } from '../../../../application/usecases/SearchFormsUseCase';
import { SubmitFormUseCase } from '../../../../application/usecases/SubmitFormUseCase';
import { GetFormTemplateUseCase } from '../../../../application/usecases/GetFormTemplateUseCase';
import { GetPublicFormUseCase } from '../../../../application/usecases/GetPublicFormUseCase';
import { CreateFormUseCase } from '../../../../application/usecases/CreateFormUseCase';
import { UpdateFormUseCase } from '../../../../application/usecases/UpdateFormUseCase';
import { DeleteFormUseCase } from '../../../../application/usecases/DeleteFormUseCase';
import { GetFormByIdUseCase } from '../../../../application/usecases/GetFormByIdUseCase';
import { DeleteTeamFormsUseCase } from '../../../../application/usecases/DeleteTeamFormsUseCase';
import { GetFormsByBoardIdUseCase } from '../../../../application/usecases/GetFormsByBoardIdUseCase';
import { handleControllerError } from '../../../../utils/error';

export class FormController {
    private static repository = FormRepositoryFactory.create();
    private static appRepository = AppRepositoryFactory.create();

    static async getAll(req: Request, res: Response) {
        try {
            const useCase = new SearchFormsUseCase(FormController.repository);
            const userContext = (req as any).userContext;
            const result = await useCase.execute(userContext, req.query);
            // v1 search specifically returns the whole object (total, limit, etc) at top level or wrapped in data
            return res.status(200).json(result);
        } catch (error: any) {
            const { code, message } = handleControllerError(error);
            return res.status(code).json({ message });
        }
    }

    static async getById(req: Request, res: Response) {
        try {
            const useCase = new GetFormByIdUseCase(FormController.repository);
            const userContext = (req as any).userContext;
            const form = await useCase.execute(userContext, req.params.id);
            if (!form) return res.status(404).json({ message: 'Form not found' });
            return res.status(200).json({ data: form });
        } catch (error: any) {
            const { code, message } = handleControllerError(error);
            return res.status(code).json({ message });
        }
    }

    static async create(req: Request, res: Response) {
        try {
            const useCase = new CreateFormUseCase(FormController.repository, FormController.appRepository);
            const userContext = (req as any).userContext;
            const form = await useCase.execute(userContext, req.body);
            return res.status(200).json({ data: form.toJSON({ includeMapToContact: true }) });
        } catch (error: any) {
            const { code, message } = handleControllerError(error);
            return res.status(code).json({ message });
        }
    }

    static async update(req: Request, res: Response) {
        try {
            const useCase = new UpdateFormUseCase(FormController.repository, FormController.appRepository);
            const userContext = (req as any).userContext;
            const form = await useCase.execute(userContext, req.params.id, req.body);
            return res.status(200).json({ data: form.toJSON({ includeMapToContact: true }) });
        } catch (error: any) {
            const { code, message } = handleControllerError(error);
            return res.status(code).json({ message });
        }
    }

    static async delete(req: Request, res: Response) {
        try {
            const useCase = new DeleteFormUseCase(FormController.repository);
            const userContext = (req as any).userContext;
            const result = await useCase.execute(userContext, req.params.id);
            return res.status(200).json({ data: result });
        } catch (error: any) {
            const { code, message } = handleControllerError(error);
            return res.status(code).json({ message });
        }
    }

    static async getPublic(req: Request, res: Response) {
        try {
            const useCase = new GetPublicFormUseCase(FormController.repository);
            const result = await useCase.execute(req.params.id);
            return res.status(200).json({ data: result });
        } catch (error: any) {
            const { code, message } = handleControllerError(error);
            return res.status(code).json({ message });
        }
    }

    static async getTemplate(req: Request, res: Response) {
        try {
            const useCase = new GetFormTemplateUseCase();
            const result = await useCase.execute();
            return res.status(200).json({ data: result });
        } catch (error: any) {
            const { code, message } = handleControllerError(error);
            return res.status(code).json({ message });
        }
    }

    static async submit(req: Request, res: Response) {
        try {
            const verifyEndpoint = 'https://challenges.cloudflare.com/turnstile/v0/siteverify';
            const secret = process.env.TURNSTILE_SECRET_KEY as string;

            const { body } = req;
            const form_id = req.params.formId;
            const userContext = (req as any).userContext;

            const useCase = new SubmitFormUseCase(FormController.repository, FormController.appRepository);

            // Turnstile logic from v1
            if (body.token) {
                const response = await fetch(verifyEndpoint, {
                    method: 'POST',
                    body: `secret=${encodeURIComponent(
                        secret
                    )}&response=${encodeURIComponent(body.token)}`,
                    headers: {
                        'content-type': 'application/x-www-form-urlencoded',
                    },
                });

                const data = (await response.json()) as any;
                if (!data.success) {
                    return res.status(400).json({
                        message: 'Captcha verification failed',
                        error_code: 'captcha_failed',
                    });
                }
            }

            const result = await useCase.execute(body, form_id, userContext);
            return res.status(200).json({ data: result });
        } catch (error: any) {
            const { code, message } = handleControllerError(error);
            return res.status(code).json({ message });
        }
    }

    static async deleteTeamForms(req: Request, res: Response) {
        try {
            const useCase = new DeleteTeamFormsUseCase(FormController.repository);
            const deletedIds = await useCase.execute(req.params.teamId);
            return res.status(200).json({ data: deletedIds });
        } catch (error: any) {
            const { code, message } = handleControllerError(error);
            return res.status(code).json({ message });
        }
    }

    static async getFormsByBoardId(req: Request, res: Response) {
        try {
            const useCase = new GetFormsByBoardIdUseCase(FormController.repository);
            const userContext = (req as any).userContext;
            const forms = await useCase.execute(userContext.org_id, req.params.boardId);
            return res.status(200).json({ data: forms });
        } catch (error: any) {
            const { code, message } = handleControllerError(error);
            return res.status(code).json({ message });
        }
    }
}
