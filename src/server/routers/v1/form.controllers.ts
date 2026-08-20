import { Request, Response } from 'express';
import authorize, {
  getUserContextOnly,
} from '../../middleware/authorize.middleware';
import { ErrorCode, handleControllerError } from '../../../utils/error';

import {
  searchForms,
  getFormById,
  createForm,
  updateForm,
  deleteForm,
  submit,
  getDefaultForm,
  getPublishedForm,
  getFormsByBoardId,
  deleteAllForms,
  deleteTeamForms,
} from '../../../core/services/form.service';
import { TurnstileServerValidationResponse } from '../../../core/domains/interface/form';

const Controller = {
  search: [
    authorize,
    async (req: Request, res: Response) => {
      try {
        const { query, userContext } = req;

        const result = await searchForms(userContext, query);

        res.status(200).json(result);
      } catch (error) {
        const { message, code } = handleControllerError(error);
        res.status(code).json({ message });
      }
    },
  ],
  createForm: [
    authorize,
    async (req: Request, res: Response) => {
      try {
        const { body, userContext } = req;

        const result = await createForm(userContext, body);

        res.status(200).json({
          data: result,
        });
      } catch (error) {
        const { message, code } = handleControllerError(error);
        res.status(code).json({ message });
      }
    },
  ],
  updateForm: [
    authorize,
    async (req: Request, res: Response) => {
      try {
        const { body, userContext } = req;
        const form_id = req.params.id;

        const result = await updateForm(userContext, form_id, body);

        res.status(200).json({
          data: result,
        });
      } catch (error) {
        const { message, code } = handleControllerError(error);
        res.status(code).json({ message });
      }
    },
  ],
  deleteForm: [
    authorize,
    async (req: Request, res: Response) => {
      try {
        const { userContext } = req;
        const form_id = req.params.id;

        const result = await deleteForm(userContext, form_id);

        res.status(200).json({
          data: result,
        });
      } catch (error) {
        const { message, code } = handleControllerError(error);
        res.status(code).json({ message });
      }
    },
  ],
  getFormById: [
    getUserContextOnly,
    async (req: Request, res: Response) => {
      try {
        const { userContext } = req;
        const form_id = req.params.id;

        const result = await getFormById(userContext, form_id);

        res.status(200).json({
          data: result,
        });
      } catch (error) {
        const { message, code } = handleControllerError(error);
        res.status(code).json({ message });
      }
    },
  ],

  getPublicForms: [
    async (req: Request, res: Response) => {
      try {
        const form_id = req.params.id;
        const result = await getPublishedForm(form_id);
        res.status(200).json({
          data: result,
        });
      } catch (error) {
        const { message, code } = handleControllerError(error);
        res.status(code).json({ message });
      }
    },
  ],

  submitForm: [
    getUserContextOnly,
    async (req: Request, res: Response) => {
      try {
        const verifyEndpoint =
          'https://challenges.cloudflare.com/turnstile/v0/siteverify';
        const secret = process.env.TURNSTILE_SECRET_KEY as string;

        const { body, userContext } = req;
        const form_id = req.params.formId;
        if (!body.token) {
          const result = await submit(body, form_id, userContext);

          return res.status(200).json({
            data: result,
          });
        }

        const response = await fetch(verifyEndpoint, {
          method: 'POST',
          body: `secret=${encodeURIComponent(
            secret
          )}&response=${encodeURIComponent(body.token)}`,
          headers: {
            'content-type': 'application/x-www-form-urlencoded',
          },
        });

        const data =
          (await response.json()) as TurnstileServerValidationResponse;
        if (data.success) {
          const result = await submit(body, form_id, userContext);

          return res.status(200).json({
            data: result,
          });
        }
        return res.status(400).json({
          message: 'Captcha verification failed',
          error_code: ErrorCode.captcha_failed,
        });
      } catch (error) {
        const { message, code, error_code } = handleControllerError(error);
        res.status(code).json({ message, error_code });
      }
    },
  ],
  defaultForm: [
    async (req: Request, res: Response) => {
      try {
        const result = await getDefaultForm();
        res.status(200).json({
          data: result,
        });
      } catch (error) {
        const { message, code } = handleControllerError(error);
        res.status(code).json({ message });
      }
    },
  ],
  getFormsByBoardId: [
    authorize,
    async (req: Request, res: Response) => {
      try {
        const { userContext } = req;
        const board_id = req.params.boardId;

        const result = await getFormsByBoardId(userContext, board_id);

        res.status(200).json({
          data: result,
        });
      } catch (error) {
        const { message, code } = handleControllerError(error);
        res.status(code).json({ message });
      }
    },
  ],
  deleteTeamForms: [
    authorize,
    async (req: Request, res: Response) => {
      try {
        const team_id = req.params.teamId;

        const result = await deleteTeamForms(team_id);

        res.status(200).json({
          data: result,
        });
      } catch (error) {
        const { message, code } = handleControllerError(error);
        res.status(code).json({ message });
      }
    },
  ],
};

export default Controller;
