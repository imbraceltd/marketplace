import { Request, Response } from 'express';
import { handleControllerError } from '../../../utils/error';
import authorize from '../../middleware/authorize.middleware';
import { getUsedChannelsV2 } from '../../../core/services/app.service';

// array of controller and middleware functions
const marketPlaceControllers = {
  getUsedChannelsV2: [
    authorize,
    async (req: Request, res: Response) => {
      try {
        const userContext = req.userContext;
        let ids = req.query.ids as string[];

        if (!ids) {
          const _Error = (await import('../../../utils/error')).default;
          throw new _Error('Ids are required', 400);
        }

        if (!Array.isArray(ids) && typeof ids === 'string' && ids !== '') {
          ids = [ids];
        }

        if (ids.length === 0) {
          return res.status(200).json({
            data: {},
          });
        }

        const channels = await getUsedChannelsV2(userContext, ids);
        return res.status(200).json({ data: channels });
      } catch (error) {
        const { message, code } = handleControllerError(error);
        return res.status(code).json({ message });
      }
    },
  ],

  installRootChannelWorkflow: [
    authorize,
    async (req: Request, res: Response) => {
      return res.status(410).json({ message: 'Channel workflow installation is no longer supported' });
    },
  ],
};

export default marketPlaceControllers;
