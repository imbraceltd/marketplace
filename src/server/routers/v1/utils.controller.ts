import { Request, Response } from 'express';
import _Error, { handleControllerError } from '../../../utils/error';
import authorize from '../../middleware/authorize.middleware';
import { AppRepositoryFactory } from '../../../infrastructure/repositories/factories/AppRepositoryFactory';

const appRepository = AppRepositoryFactory.create();
type IReport = {
  [key: string]: boolean;
};

type IResult = {
  [key: string]: IReport | boolean;
};

const generateReport = (
  apps: Array<{
    product_id: string;
    channels_or_platforms: string[];
    tags: string[];
  }>
) => {
  const result: IResult = {};

  apps.forEach((app) => {
    const { product_id, channels_or_platforms, tags } = app;
    if (!product_id) {
      return;
    }

    if (channels_or_platforms.length === 0) {
      return;
    }

    channels_or_platforms.forEach((platform) => {
      if (!result[platform]) {
        if (tags.length > 0) {
          result[platform] = {};
          tags.forEach((tag) => {
            result[platform][tag] = true;
          });
        }
      }

      result[platform] = true;
    });
  });

  return result;
};

const utilController = {
  getResourceUsage: [
    authorize,
    async (req: Request, res: Response) => {
      try {
        const org_id = req.userContext.org_id;

        if (!org_id) {
          throw new _Error('Organization not found', 400);
        }

        // Fetch apps, only show active apps
        const allAppsRaw = await appRepository.search(org_id, { is_active: true });
        const allApps = allAppsRaw.map((app: any) => ({
          product_id: app.product_id,
          channels_or_platforms: app.channels_or_platforms || [],
          tags: app.tags || [],
        }));

        const appReport = generateReport(allApps);

        return res.json(appReport);
      } catch (error) {
        const { message, code } = handleControllerError(error);
        return res.status(code).json({ message });
      }
    },
  ],
};

export default utilController;
