import logger from '../../logging/logger';
import { Request, Response } from 'express';
import _Error, { handleControllerError } from '../../../utils/error';
import authorize from '../../middleware/authorize.middleware';
import { IDataObject } from '../../../core/domains/interface/types';
import {
  createUseCase,
  getUseCases,
  getUseCaseById,
  getUseCaseByAssistantId,
  updateUseCase,
  deleteUseCase,
  createCustomUseCase,
  updateCustomUseCase,
  createCustomUseCaseV2,
  deleteUseCaseV2,
} from '../../../core/services/use_case.service';
import { getBuiltinAssistantById } from '../../../core/services/builtin_agent.service';

const useCaseController = {
  createUseCase: [
    authorize,
    async (req: Request, res: Response) => {
      try {
        const userContext = req.userContext || {};
        const useCase = await createUseCase(userContext, req.body);
        return res.status(200).json({ data: useCase });
      } catch (error) {
        logger.error('Error creating use case:', error);
        const { message, code } = handleControllerError(error);
        return res.status(code).json({ message });
      }
    },
  ],
  createCustomUseCase: [
    authorize,
    async (req: Request, res: Response) => {
      try {
        const userContext = req.userContext || {};
        const { usecase, assistant } = req.body;
        if (!userContext || !userContext.org_id) {
          throw new _Error('missing usecase or assistant payload', 400);
        }
        if (!usecase || !assistant) {
          throw new _Error('missing usecase or assistant payload', 400);
        }
        const useCase = await createCustomUseCase(userContext, usecase, assistant);
        return res.status(200).json({ data: useCase });
      } catch (error) {
        logger.error('Error creating agent use case:', error);
        const { message, code } = handleControllerError(error);
        return res.status(code).json({ message });
      }
    }
  ],
  createCustomUseCaseV2: [
    authorize,
    async (req: Request, res: Response) => {
      try {
        const userContext = req.userContext || {};
        const { usecase, assistant } = req.body;
        if (!userContext || !userContext.org_id) {
          throw new _Error('missing usecase or assistant payload', 400);
        }
        if (!usecase || !assistant) {
          throw new _Error('missing usecase or assistant payload', 400);
        }
        const useCase = await createCustomUseCaseV2(userContext, usecase, assistant);
        return res.status(200).json({ data: useCase });
      } catch (error) {
        logger.error('Error creating agent use case v2:', error);
        const { message, code } = handleControllerError(error);
        return res.status(code).json({ message });
      }
    }
  ],
  getUseCases: [
    authorize,
    async (req: Request, res: Response) => {
      try {
        const userContext = req.userContext || {};
        if (!userContext || !userContext.org_id) {
          throw new _Error('Use cases not found', 400);
        }
        const query = req.query as IDataObject;
        const useCases = await getUseCases(query, userContext.org_id);
        return res.status(200).json({ data: useCases });
      } catch (error) {
        logger.error('Error getting use cases:', error);
        const { message, code } = handleControllerError(error);
        return res.status(code).json({ message });
      }
    },
  ],

  getUseCaseById: [
    authorize,
    async (req: Request, res: Response) => {
      try {
        const userContext = req.userContext || {};
        const { id } = req.params;
        if (!id || !userContext || !userContext.org_id) {
          throw new _Error('Use cases not found', 400);
        }
        const useCase = await getUseCaseById(id, userContext.org_id);
        return res.status(200).json({ data: useCase });
      } catch (error) {

        logger.error('Error getting use case by id:', error);
        const { message, code } = handleControllerError(error);
        return res.status(code).json({ message });
      }
    },
  ],

  getUseCaseByAssistantId: [
    authorize,
    async (req: Request, res: Response) => {
      try {
        const userContext = req.userContext || {};
        const { assistant_id } = req.params;
        if (!assistant_id || !userContext || !userContext.org_id) {
          throw new _Error('Use cases not found', 400);
        }
        const useCase = await getUseCaseByAssistantId(
          assistant_id,
          userContext.org_id,
        );
        return res.status(200).json({ data: useCase });
      } catch (error) {
        logger.error('Error getting use case by assistant id:', error);
        const { message, code } = handleControllerError(error);
        return res.status(code).json({ message });
      }
    },
  ],

  updateUseCase: [
    authorize,
    async (req: Request, res: Response) => {
      try {
        const userContext = req.userContext || {};
        const { id } = req.params;
        if (!id || !userContext || !userContext.org_id) {
          throw new _Error('Use cases not found', 400);
        }
        const useCase = await updateUseCase(id, req.body);
        return res.status(200).json({ data: useCase });
      } catch (error) {
        logger.error('Error updating use case:', error);
        const { message, code } = handleControllerError(error);
        return res.status(code).json({ message });
      }
    },
  ],

  updateCustomUseCase: [
    authorize,
    async (req: Request, res: Response) => {
      try {
        const userContext = req.userContext || {};
        const { id } = req.params;
        if (!id || !userContext || !userContext.org_id) {
          throw new _Error('Use cases not found', 400);
        }

        const { usecase, assistant } = req.body;
        if (!usecase || !assistant) {
          throw new _Error('missing usecase or assistant payload', 400);
        }

        const useCase = await updateCustomUseCase(userContext, id, usecase, assistant);
        return res.status(200).json({ data: useCase });
      } catch (error) {
        logger.error('Error updating custom use case:', error);
        const { message, code } = handleControllerError(error);
        return res.status(code).json({ message });
      }
    },
  ],

  deleteUseCase: [
    authorize,
    async (req: Request, res: Response) => {
      try {
        const userContext = req.userContext || {};
        const { id } = req.params;
        if (!id || !userContext || !userContext.org_id) {
          throw new _Error('Use cases not found', 400);
        }
        await deleteUseCase(id);
        return res.status(200).json({ message: 'UseCase deleted successfully' });
      } catch (error) {
        logger.error('Error deleting use case:', error);
        const { message, code } = handleControllerError(error);
        return res.status(code).json({ message });
      }
    },
  ],
    deleteUseCaseV2: [
    authorize,
    async (req: Request, res: Response) => {
      try {
        const userContext = req.userContext || {};
        const { id } = req.params;
        if (!id || !userContext || !userContext.org_id) {
          throw new _Error('Use cases not found', 400);
        }
        await deleteUseCaseV2(id);
        return res.status(200).json({ message: 'UseCase deleted successfully' });
      } catch (error) {
        logger.error('Error deleting use case v2:', error);
        const { message, code } = handleControllerError(error);
        return res.status(code).json({ message });
      }
    },
  ],

  getBuiltinAssistantById: [
    authorize,
    async (req: Request, res: Response) => {
      try {
        const { assistant_id } = req.params;
        if (!assistant_id) {
          throw new _Error('assistant_id is required', 400);
        }
        const doc = await getBuiltinAssistantById(assistant_id);
        return res.status(200).json({ data: doc });
      } catch (error) {
        logger.error('Error getting builtin assistant by id:', error);
        const { message, code } = handleControllerError(error);
        return res.status(code).json({ message });
      }
    },
  ],
};

export default useCaseController;
