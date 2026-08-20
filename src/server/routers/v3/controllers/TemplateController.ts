import logger from '../../../logging/logger';
import { Request, Response } from 'express';
import { TemplateRepositoryFactory } from '../../../../infrastructure/repositories/factories';
import { SearchTemplatesUseCase } from '../../../../application/usecases/SearchTemplatesUseCase';
import { GetTemplateByIdUseCase } from '../../../../application/usecases/GetTemplateByIdUseCase';
import { CreateTemplateUseCase } from '../../../../application/usecases/CreateTemplateUseCase';
import { UpdateTemplateUseCase } from '../../../../application/usecases/UpdateTemplateUseCase';
import { DeleteTemplateUseCase } from '../../../../application/usecases/DeleteTemplateUseCase';
import { InstallTemplateUseCase } from '../../../../application/usecases/InstallTemplateUseCase';
import { InstallTemplateFromJsonUseCase } from '../../../../application/usecases/InstallTemplateFromJsonUseCase';
import { InstallTemplateFromZipUseCase } from '../../../../application/usecases/InstallTemplateFromZipUseCase';
import { ImportTemplateFromZipUseCase } from '../../../../application/usecases/ImportTemplateFromZipUseCase';
import { ExportTemplateZipUseCase } from '../../../../application/usecases/ExportTemplateZipUseCase';
import { readTemplateZipBuffer } from '../../../../core/services/templates/template_zip_storage.service';
import { handleControllerError } from '../../../../utils/error';
import JSZip from 'jszip';

export class TemplateController {
    private static repository = TemplateRepositoryFactory.create();

    static async getAll(req: Request, res: Response) {
        try {
            const useCase = new SearchTemplatesUseCase(TemplateController.repository);
            const result = await useCase.execute(req.query);
            // v1 returns: { data: result.templates }
            return res.status(200).json({ data: result.data });
        } catch (error: any) {
            const { code, message } = handleControllerError(error);
            return res.status(code).json({ message });
        }
    }

    static async getPublic(req: Request, res: Response) {
        try {
            const { name, skip, limit } = req.query as Record<string, string | undefined>;
            const options = {
                search: name,
                skip: skip ? parseInt(skip, 10) : 0,
                limit: limit ? parseInt(limit, 10) : 0,
                sort: { created_at: -1 },
            };
            const templates = await TemplateController.repository.findByOrganizationId('template_org', options);
            const data = templates.map((t: { toJSON?: () => Record<string, unknown> }) => {
                const json = t.toJSON ? t.toJSON() : (t as Record<string, unknown>);
                delete json.graph;
                delete json.updated_at;
                return json;
            });
            return res.status(200).json({ data });
        } catch (error: any) {
            const { code, message } = handleControllerError(error);
            return res.status(code).json({ message });
        }
    }

    static async getById(req: Request, res: Response) {
        try {
            const useCase = new GetTemplateByIdUseCase();
            const template = await useCase.execute(req.params.id);

            const zipKey = (template as { zip_s3_key?: string | null }).zip_s3_key ?? undefined;
            let zip: { metadata: unknown; files: Array<Record<string, unknown>> } | null = null;
            if (zipKey) {
                try {
                    const buffer = await readTemplateZipBuffer(zipKey);
                    const archive = await JSZip.loadAsync(new Uint8Array(buffer));

                    let metadata: unknown = null;
                    const archiveComment = (archive as unknown as { comment?: string }).comment;
                    if (archiveComment) {
                        try {
                            metadata = JSON.parse(archiveComment);
                        } catch {
                            metadata = null;
                        }
                    }

                    const files = Object.values(archive.files).map((f) => {
                        const internal = f as unknown as {
                            _data?: { uncompressedSize?: number; compressedSize?: number };
                        };
                        return {
                            name: f.name,
                            dir: f.dir,
                            date: f.date,
                            uncompressed_size: internal._data?.uncompressedSize,
                            compressed_size: internal._data?.compressedSize,
                        };
                    });

                    zip = { metadata, files };
                } catch (err: any) {
                    logger.warn('getById: failed to read zip', { id: req.params.id, err: err?.message });
                }
            }

            return res.status(200).json({ data: { ...(template as Record<string, unknown>), zip } });
        } catch (error: any) {
            const { code, message } = handleControllerError(error);
            return res.status(code).json({ message });
        }
    }

    static async create(req: Request, res: Response) {
        try {
            const useCase = new CreateTemplateUseCase();
            const userContext = (req as any).userContext;
            const template = await useCase.execute(userContext, req.body);
            return res.status(200).json({ data: template });
        } catch (error: any) {
            const { code, message } = handleControllerError(error);
            return res.status(code).json({ message });
        }
    }

    static async update(req: Request, res: Response) {
        try {
            const useCase = new UpdateTemplateUseCase();
            const userContext = (req as any).userContext;
            const template = await useCase.execute(req.params.id, req.body, userContext);
            return res.status(200).json({ data: template });
        } catch (error: any) {
            const { code, message } = handleControllerError(error);
            return res.status(code).json({ message });
        }
    }

    static async delete(req: Request, res: Response) {
        try {
            const useCase = new DeleteTemplateUseCase();
            const success = await useCase.execute(req.params.id);
            return res.status(200).json({ success: success ? true : false });
        } catch (error: any) {
            const { code, message } = handleControllerError(error);
            return res.status(code).json({ message });
        }
    }

    static async install(req: Request, res: Response) {
        try {
            const useCase = new InstallTemplateUseCase();
            const userContext = (req as any).userContext;
            const result = await useCase.execute(userContext, req.params.id, req.body);
            return res.status(200).json(result);
        } catch (error: any) {
            const { code, message } = handleControllerError(error);
            return res.status(code).json({ message });
        }
    }

    static async installFromJson(req: Request, res: Response) {
        try {
            const useCase = new InstallTemplateFromJsonUseCase();
            const userContext = (req as any).userContext;
            const result = await useCase.execute(userContext, req.body);
            return res.status(200).json(result);
        } catch (error: any) {
            const { code, message } = handleControllerError(error);
            return res.status(code).json({ message });
        }
    }

    static async installFromZip(req: Request, res: Response) {
        try {
            const userContext = (req as any).userContext;
            const fileBuffer = req.file?.buffer;
            const useCase = new InstallTemplateFromZipUseCase();
            const result = await useCase.execute(userContext, fileBuffer, req.body);
            return res.status(200).json(result);
        } catch (error: any) {
            const { code, message } = handleControllerError(error);
            return res.status(code).json({ message });
        }
    }

    static async importFromZip(req: Request, res: Response) {
        try {
            const userContext = (req as any).userContext;
            const fileBuffer = req.file?.buffer;
            const useCase = new ImportTemplateFromZipUseCase();
            const created = await useCase.execute(userContext, fileBuffer, req.body);
            return res.status(200).json({ data: created });
        } catch (error: any) {
            const { code, message } = handleControllerError(error);
            return res.status(code).json({ message });
        }
    }

    static async exportZip(req: Request, res: Response) {
        try {
            const userContext = (req as any).userContext;
            const useCase = new ExportTemplateZipUseCase();
            const result = await useCase.execute(userContext, req.params.id);
            return res.status(200).json({ data: result });
        } catch (error: any) {
            const { code, message } = handleControllerError(error);
            return res.status(code).json({ message });
        }
    }

}
