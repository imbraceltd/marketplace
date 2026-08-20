import authorize from '../../middleware/authorize.middleware';
import { Request, Response } from 'express';
import {
  createEmailSender,
  deleteEmailSender,
  getEmailSenders,
  updateEmailSender,
  createEmailTemplate,
  deleteEmailTemplate,
  getEmailTemplateById,
  getEmailTemplates,
  updateEmailTemplate,
  handleSubscription,
  getOrgUserList,
  searchEmailTemplates,
  handleSubscriptionV2,
} from '../../../core/services/email.service';
import { handleControllerError } from '../../../utils/error';

const emailControllers = {
  handleSubscription: [
    async (req: Request, res: Response) => {
      const { body } = req;
      try {
        const data = await handleSubscription(body);
        res.status(200).json({
          data: data,
        });
      } catch (error) {
        const { code, message } = handleControllerError(error);
        res.status(code).json({
          message,
        });
      }
    },
  ],

  handleOpts: [
    async (req: Request, res: Response) => {
      const { body } = req;
      try {
        const data = await handleSubscriptionV2(body);
        res.status(200).json({
          data: data,
        });
      } catch (error) {
        const { code, message, error_code } = handleControllerError(error);
        res.status(code).json({
          message,
          error_code,
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
  getEmailTemplates: [
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

  searchEmailTemplates: [
    authorize,
    async (req: Request, res: Response) => {
      const { userContext, query } = req;
      try {
        const { emailTemplates, meta } = await searchEmailTemplates(
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
  createEmailSender: [
    authorize,
    async (req: Request, res: Response) => {
      const { userContext, body } = req;
      try {
        const emailSender = await createEmailSender(userContext, body);

        res.status(200).json({
          data: emailSender,
        });
      } catch (error) {
        const { code, message } = handleControllerError(error);
        res.status(code).json({
          message,
        });
      }
    },
  ],
  getEmailSenders: [
    authorize,
    async (req: Request, res: Response) => {
      const { userContext, query } = req;
      try {
        const emailSenders = await getEmailSenders(userContext, query);

        res.status(200).json({
          data: emailSenders,
        });
      } catch (error) {
        const { code, message } = handleControllerError(error);
        res.status(code).json({
          message,
        });
      }
    },
  ],
  updateEmailSender: [
    authorize,
    async (req: Request, res: Response) => {
      const { userContext, params, body } = req;
      try {
        const emailSender = await updateEmailSender(
          userContext,
          params.id,
          body
        );

        res.status(200).json({
          data: emailSender,
        });
      } catch (error) {
        const { code, message } = handleControllerError(error);
        res.status(code).json({
          message,
        });
      }
    },
  ],
  deleteEmailSender: [
    authorize,
    async (req: Request, res: Response) => {
      const { userContext, params } = req;
      try {
        const emailSender = await deleteEmailSender(userContext, params.id);

        res.status(200).json({
          data: emailSender,
        });
      } catch (error) {
        const { code, message } = handleControllerError(error);
        res.status(code).json({
          message,
        });
      }
    },
  ],

  getOrgUserList: [
    authorize,
    async (req: Request, res: Response) => {
      const { userContext } = req;
      try {
        const data = await getOrgUserList(userContext);
        res.status(200).json({
          data: data,
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

export default emailControllers;
