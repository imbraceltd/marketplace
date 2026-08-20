import authorize from '../../middleware/authorize.middleware';
import { Request, Response } from 'express';
import {
  deleteEmailTemplate,
  getEmailTemplateById,
  updateEmailTemplate,
  searchEmailTemplatesV2,
  getEmailTemplates,
  createEmailTemplate,
} from '../../../core/services/email_template_v2.service';
import { handleControllerError } from '../../../utils/error';

const emailTemplateController = {
    searchEmailTemplates: [
        authorize,
        async (req: Request, res: Response) => {
          const { userContext, query } = req;
          try {
            const { emailTemplates, meta } = await searchEmailTemplatesV2(
              userContext,
              query
            );
    
            res.status(200).json({
              data: emailTemplates,
              meta,
            });
          } catch (error) {
            const { code, message } = handleControllerError(error);
            res.status(code).json({
              message,
            });
          }
        },
      ],

      getEmailTemplates:[
        authorize,
        async (req: Request, res: Response) => {
            const { userContext, query } = req;
            try {
                const { emailTemplates, meta } = await getEmailTemplates(
                userContext,
                query
                );
        
                res.status(200).json({
                data: emailTemplates,
                meta,
                });
            } catch (error) {
                const { code, message } = handleControllerError(error);
                res.status(code).json({
                message,
                });
            }
        },
      ],
    
      getEmailTemplateById: [
        authorize,
        async (req: Request, res: Response) => {
          const { userContext, params } = req;
          try {
            const emailTemplate = await getEmailTemplateById(
              userContext,
              params.id
            );
    
            res.status(200).json({
              data: emailTemplate,
            });
          } catch (error) {
            const { code, message } = handleControllerError(error);
            res.status(code).json({
              message,
            });
          }
        },
      ],
      updateEmailTemplate: [
        authorize,
        async (req: Request, res: Response) => {
          const { userContext, params, body } = req;
          try {
            const emailTemplate = await updateEmailTemplate(
              userContext,
              params.id,
              body
            );
    
            res.status(200).json({
              data: emailTemplate,
            });
          } catch (error) {
            const { code, message } = handleControllerError(error);
            res.status(code).json({
              message,
            });
          }
        },
      ],
      deleteEmailTemplate: [
        authorize,
        async (req: Request, res: Response) => {
          const { userContext, params } = req;
          try {
            const emailTemplate = await deleteEmailTemplate(userContext, params.id);
    
            res.status(200).json({
              data: emailTemplate,
            });
          } catch (error) {
            const { code, message } = handleControllerError(error);
            res.status(code).json({
              message,
            });
          }
        },
      ],
      createEmailTemplate: [
        authorize,
        async (req: Request, res: Response) => {
          const { userContext, body } = req;
          try {
            const emailTemplate = await createEmailTemplate(userContext, body);
    
            res.status(200).json({
              data: emailTemplate,
            });
          } catch (error) {
            const { code, message } = handleControllerError(error);
            res.status(code).json({
              message,
            });
          }
        },
      ],
};

export default emailTemplateController; 