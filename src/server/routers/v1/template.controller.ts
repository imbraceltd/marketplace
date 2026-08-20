import { createTemplate, installTemplate, updateTemplate } from "../../../core/services/templates/create_template.service";
import { getTemplate, getTemplates } from "../../../core/services/templates/get_template.service";
import { handleControllerError } from "../../../utils/error";
import authorize from "../../middleware/authorize.middleware";
import { Request, Response } from 'express';
import { deleteTemplate } from "../../../core/services/templates/delete_template.service";

const templateController = {
    create: [
        authorize,
        async (req: Request, res: Response) => {
            try {
                const userContext = req.userContext;
                const { name, type, id, description = "", active = false } = req.body;

                const result = await createTemplate(userContext, { name, type, id, description, active });

                return res.status(200).json({ data: result });
            } catch (error) {
                const { message, code } = handleControllerError(error);
                return res.status(code).json({ message });
            }
        }
    ],
    update: [
        authorize,
        async (req: Request, res: Response) => {
            try {
                const { id } = req.params;
                const { name, type, description, active, updateGraph = false } = req.body;

                const result = await updateTemplate({ id, name, type, description, active, updateGraph });

                return res.status(200).json({ data: result });
            } catch (error) {
                const { message, code } = handleControllerError(error);
                return res.status(code).json({ message });
            }
        }
    ],
    install: [
        authorize,
        async (req: Request, res: Response) => {
            try {
                const userContext = req.userContext;
                const { body } = req;
                const { id } = req.params;
                const { is_disabled_id_generated = false, is_clone_board_items = false } = body;

                const result = await installTemplate(userContext, id, is_disabled_id_generated, is_clone_board_items);

                return res.status(200).json({ success: result ? true : false });
            } catch (error) {
                const { message, code } = handleControllerError(error);
                return res.status(code).json({ message });
            }
        }
    ],
    installFromJson: [
        authorize,
        async (req: Request, res: Response) => {
            try {
                const userContext = req.userContext;
                const { body } = req;
                const { template, is_disabled_id_generated = false, is_clone_board_items = false } = body;

                if (!template || !template.graph) {
                    return res.status(400).json({ message: "Invalid template data. 'template' and 'template.graph' are required." });
                }

                // Create a template-like object with the provided JSON data
                const templateData = {
                    graph: template.graph,
                    deps: template.deps || {}
                };

                const result = await installTemplate(userContext, null, is_disabled_id_generated, is_clone_board_items, templateData);

                return res.status(200).json({ success: result ? true : false });
            } catch (error) {
                const { message, code } = handleControllerError(error);
                return res.status(code).json({ message });
            }
        }
    ],
    remove: [
        authorize,
        async (req: Request, res: Response) => {
            try {
                const { id } = req.params;

                const result = await deleteTemplate(id);

                return res.status(200).json({ success: result ? true : false });
            } catch (error) {
                const { message, code } = handleControllerError(error);
                return res.status(code).json({ message });
            }
        }],
    getAll: [
        authorize,
        async (req: Request, res: Response) => {
            try {
                const templates = await getTemplates({ ...req.query });
                return res.status(200).json({ data: templates.templates });
            } catch (error) {
                const { message, code } = handleControllerError(error);
                return res.status(code).json({ message });
            }
        }
    ],
    getById: [
        authorize,
        async (req: Request, res: Response) => {
            try {
                const { id } = req.params;
                const template = await getTemplate(id);
                if (!template) {
                    return res.status(404).json({ message: "Template not found" });
                }
                return res.status(200).json({ data: template });
            } catch (error) {
                const { message, code } = handleControllerError(error);
                return res.status(code).json({ message });
            }
        }
    ],
    getPublic: [
        async (req: Request, res: Response) => {
            try {
                const templates = await getTemplates({ ...req.query, organization_id: 'template_org' });
                return res.status(200).json({ data: templates.templates });
            } catch (error) {
                const { message, code } = handleControllerError(error);
                return res.status(code).json({ message });
            }
        }
    ]
};

export default templateController