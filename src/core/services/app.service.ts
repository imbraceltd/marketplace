import logger from '../../server/logging/logger';
/* eslint-disable @typescript-eslint/ban-ts-comment */
import { AppType, IApp, IAppCredentials } from '../domains/interface/app';
import {
  IDataObject,
} from '../domains/interface/types';
import _Error, { handleServiceError } from '../../utils/error';
import IUserContext from '../domains/interface/userContext';
import axios, { Method } from 'axios';
import { ISubmission, UI } from '../domains/interface/ui';
import {
  IAppTemplate,
} from '../domains/interface/template';

import {
  deleteAssistants,
  getWorkflowsRelatedToAssistant,
} from '../repositories/ai.repository';
import { unlinkAssistantFromAllSchemas } from '../repositories/dataBoard.repository';
import { IStoredChannel, testIfChannelOk } from './channel.service';
import { deleteAllForms } from './form.service';
import { getPrefixId } from '../../db/models/utils';
import { deleteSchedulersByAppId } from '../repositories/scheduler.repository';
import { wildcardToRegex } from '../../utils/query';
import { AppRepositoryFactory } from '../../infrastructure/repositories/factories/AppRepositoryFactory';

// Create repository instances
const appRepository = AppRepositoryFactory.create();

export const appId = () => {
  return getPrefixId('app_');
};

export const createApp = async (userContext: IUserContext, app: IApp) => {
  try {
    const { org_id, business_unit_id, user_id } = userContext;
    logger.info('app type', {
      received: app.app_type,
      default: AppType.CustomizationApp,
      actual: app.app_type || AppType.CustomizationApp,
    });

    const newCome = {
      ...app,
      organization_id: org_id,
      business_unit_id,
      created_by: user_id,
      updated_by: user_id,
      app_type: app.app_type ? app.app_type : AppType.CustomizationApp,
      categories: app.categories || [],
      channels_or_platforms: app.channels_or_platforms || [],
    };

    // save app using repository
    const newApp = await appRepository.create(newCome);

    return newApp;
  } catch (error) {
    throw handleServiceError(error);
  }
};

export const getAppById = async (userContext: IUserContext, id: string) => {
  try {
    const { org_id } = userContext;
    const app = await appRepository.findById(id);
    if (!app) {
      throw new _Error('App not found', 400);
    }

    // Check if App is belong to the organization
    if (app.organization_id !== org_id) {
      throw new _Error('App not found', 400);
    }

    return {
      ...app,
    };
  } catch (error) {
    throw handleServiceError(error);
  }
};

export const getAppUISettingsByAppId = async (
  userContext: IUserContext | undefined,
  id: string
): Promise<UI | null> => {
  const app = (await appRepository.findById(id)) as IApp;
  if (!app) {
    throw new _Error('App not found', 400);
  }

  if (!app.ui) {
    return null;
  }

  if (!userContext) {
    // only return UI settings with not required auth submissions

    const returnedSubmission = app?.ui?.submission?.filter(
      (s: ISubmission) => !s.needAuthorized
    );

    return {
      ...app.ui,
      submission: returnedSubmission,
    };
  }

  return app.ui;
};

export const getApps = async (
  userContext: IUserContext,
  query?: IDataObject
) => {
  try {
    const { org_id } = userContext;
    const {
      include_hidden = false as boolean,
      include_checking = true as boolean,
      search,
      ...restOfQuery
    } = query || {};

    if (search) {
      const regex = wildcardToRegex(search as string);
      logger.debug(`Search term: "${search}", Regex: ${regex}`);
      restOfQuery['title'] = { $regex: regex };
    }

    const hiddenQuery = include_hidden ? {} : { is_hidden: false };
    const apps = await appRepository.findByOrganizationId(org_id);

    // Filter based on hidden status
    const filteredApps = apps.filter((app) => {
      if (!include_hidden && app.is_hidden) {
        return false;
      }
      // Apply additional filters from restOfQuery
      for (const key in restOfQuery) {
        if (app[key as keyof IApp] !== restOfQuery[key]) {
          return false;
        }
      }
      return true;
    });

    if (!include_checking) {
      return filteredApps;
    }

    // If all app's channels are not deleted
    const isChannelOkPromises = filteredApps.map((app) => {
      if (app.channel && app.channel.id) {
        return testIfChannelOk(userContext, app.channel as IStoredChannel);
      }

      return Promise.resolve(null);
    });

    const channels = (await Promise.allSettled(isChannelOkPromises)).map(
      (result) => {
        if (result.status === 'fulfilled') {
          return result.value;
        }
        return null;
      }
    );

    // Handle App's errors: 'missing_channel'
    for (let i = 0; i < filteredApps.length; i++) {
      const app = filteredApps[i] as IApp;
      if (app.app_type === AppType.CustomizationApp) {
        continue;
      }

      if (!app.channel || (app.channel && !app.channel?.id)) {
        continue;
      }

      if (app.channel?.id && !channels[i]?.ok) {
        app.error = channels[i]?.error_code;
      }

      if (app.error) {
        app.is_active = false;
      }
    }

    const activeApps: Array<IDataObject> = [];
    const deactivatedApps: Array<IDataObject> = [];
    const inprogressApps: Array<IDataObject> = [];
    const errorApps: Array<IDataObject> = [];
    filteredApps.forEach((app) => {
      // Error apps
      if (app?.error) {
        errorApps.push(app);
        return;
      }

      // In progress apps
      if (app['user_progress'] && app['user_progress']['finished'] === false) {
        inprogressApps.push(app);
        return;
      }

      // Active apps
      if (app.is_active) {
        activeApps.push(app);
        return;
      }

      // Deactivated apps
      deactivatedApps.push(app);
    });

    return [...activeApps, ...deactivatedApps, ...inprogressApps, ...errorApps];
  } catch (error) {
    throw handleServiceError(error);
  }
};

export const updateAppById = async (
  userContext: IUserContext,
  id: string,
  newCome: IDataObject
) => {
  const { org_id } = userContext;
  const excludeFields = ['is_active'];

  const canUpdate: IDataObject = {};
  Object.keys(newCome).forEach((key) => {
    if (excludeFields.indexOf(key) === -1) {
      canUpdate[key] = newCome[key];
    }
  });

  const current = await appRepository.findById(id);

  try {
    if (!current) {
      throw new _Error('App not found', 400);
    }

    // Check if App is belong to the organization
    if (current.organization_id !== org_id) {
      throw new _Error('App not found', 400);
    }

    const newToUpdated = {
      ...current,
      ...canUpdate,
      updated_at: new Date(),
    };

    logger.info('newToUpdated', newToUpdated);

    const updated = await appRepository.update(id, newToUpdated);

    return updated;
  } catch (error) {
    throw handleServiceError(error);
  }
};

export const updateAppSettingsById = async (
  userContext: IUserContext,
  id: string,
  options: {
    [key: string]: string | number | boolean | IDataObject;
  },
  credentials: IAppCredentials,
  user_progress: IDataObject,
  channel: {
    id: string;
    name: string;
    channel_type: string;
  }
) => {
  const { org_id } = userContext;
  try {
    const current = await appRepository.findById(id);
    if (!current) {
      throw new _Error('App not found', 400);
    }

    // Check if App is belong to the organization
    if (current.organization_id !== org_id) {
      throw new _Error('App not found', 400);
    }

    const newCome = current;
    options && (newCome.options = options);
    credentials && (newCome.credentials = credentials);
    user_progress && (newCome.user_progress = user_progress);
    channel && (newCome.channel = channel);
    newCome.updated_at = new Date();

    logger.info('newCome', JSON.stringify(newCome, null, 2));

    const updated = await appRepository.update(id, newCome);

    return {
      options: updated ? updated.options : {},
      credentials: updated ? updated.credentials : {},
      user_progress: updated ? updated.user_progress : {},
      channel: channel ? channel : {},
    };
  } catch (error) {
    throw handleServiceError(error);
  }
};


export const deleteAppById = async (userContext: IUserContext, id: string) => {
  try {
    const { org_id } = userContext;

    const current = await appRepository.findById(id);
    if (!current) {
      throw new _Error('App not found', 400);
    }

    if (current.app_type === AppType.CustomizationApp) {
      throw new _Error('Can not delete customized app', 400);
    }

    if (
      current.product_type === 'ai_assistant' ||
      current.channel?.channel_type === 'openai'
    ) {
      return _deleteAIApp(current as IApp);
    }

    // Check if App is belong to the organization
    if (current.organization_id !== org_id) {
      throw new _Error('App not found', 400);
    }

    // delete related resources
    await _deleteRelatedResources(current as IApp);
    await appRepository.delete(id);

    return {
      app_id: id,
    };
  } catch (error) {
    throw handleServiceError(error);
  }
};

const _deleteAIApp = async (app: IApp) => {
  try {
    // Get assistants related to this app
    const relatedResources = await getWorkflowsRelatedToAssistant(
      app.organization_id
    );
    const assistantIds = relatedResources.map(
      (resource) => resource.assistant_id
    );

    // delete assistants
    const deletedAssistantIds = await deleteAssistants(
      app.organization_id,
      assistantIds
    );

    // Prune deleted assistants from data-board doc-schemas (best-effort).
    await Promise.all(
      deletedAssistantIds.map(async (assistantId) => {
        try {
          await unlinkAssistantFromAllSchemas(app.organization_id, assistantId);
        } catch (err) {
          console.error('Failed to unlink assistant from data-board schemas, continuing:', err);
        }
      })
    );

    // delete app
    await appRepository.delete(app._id as string);
    return {
      assistant_id: deletedAssistantIds,
      app_id: app._id,
    };
  } catch (error) {
    logger.error('Error deleting AI app', error);
    throw handleServiceError(error);
  }
};

export const activateApp = async (userContext: IUserContext, id: string) => {
  const { org_id } = userContext;

  const current = await appRepository.findById(id);
  if (!current) {
    throw new _Error('App not found', 400);
  }

  // Check if App is belong to the organization
  if (current.organization_id !== org_id) {
    throw new _Error('App not found', 400);
  }

  try {
    const updated = await appRepository.update(id, {
      ...current,
      is_active: true,
    });

    return updated;
  } catch (error) {
    throw handleServiceError(error);
  }
};

export const deActivateApp = async (userContext: IUserContext, id: string) => {
  const { org_id } = userContext;

  const current = await appRepository.findById(id);
  if (!current) {
    throw new _Error('App not found', 400);
  }

  // Check if App is belong to the organization
  if (current.organization_id !== org_id) {
    throw new _Error('App not found', 400);
  }

  // Not deactivate app if it is customized app
  if (current.app_type === AppType.CustomizationApp) {
    throw new _Error('Can not deactivate customized app', 400);
  }

  try {
    const updated = await appRepository.update(id, {
      ...current,
      is_active: false,
    });

    return updated;
  } catch (error) {
    throw new _Error('Somethings went wrong', 500);
  }
};

export const getAppSettingsByWorkflowId = async (
  userContext: IUserContext,
  workflowId: string
) => {
  try {
    if (!workflowId) {
      throw new _Error('App not found', 400);
    }

    const app = await appRepository.findByWorkflowId(workflowId);

    if (!app) {
      throw new _Error('App not found', 400);
    }

    return {
      options: app.options,
      credentials: app.credentials,
      user_progress: app.user_progress,
      channel: app.channel,
    };
  } catch (error) {
    logger.error('Error when deleting AI app: ', error);
    throw handleServiceError(error);
  }
};

export const getAppSettingsById = async (
  userContext: IUserContext,
  id: string
) => {
  try {
    const { org_id } = userContext;
    if (!org_id || !id) {
      throw new _Error('App not found', 400);
    }

    const app = await appRepository.findById(id);

    if (!app) {
      throw new _Error('App not found', 400);
    }

    // Check if App is belong to the organization
    if (app.organization_id !== org_id) {
      throw new _Error('App not found', 400);
    }

    return {
      options: app.options,
      credentials: app.credentials,
      user_progress: app.user_progress,
      channel: app.channel,
    };
  } catch (error) {
    handleServiceError(error);
  }
};

export interface ISubmitReturn {
  result: IDataObject;
  status: number;
}

// Webhook
export const webhook = async (
  app_id: string,
  method: Method,
  data: IDataObject
): Promise<ISubmitReturn | undefined> => {
  try {
    const app = await appRepository.findById(app_id);
    if (!app) {
      throw new _Error('App not found', 400);
    }

    throw new _Error('Workflow not configured', 400);
  } catch (error) {
    throw handleServiceError(error);
  }
};

// Proxy webhook test to the workflow
export const webhookTest = async (
  app_id: string,
  method: Method,
  data: IDataObject
): Promise<ISubmitReturn | undefined> => {
  try {
    const app = await appRepository.findById(app_id);
    if (!app) {
      throw new _Error('App not found', 400);
    }

    throw new _Error('Workflow not configured', 400);
  } catch (error) {
    throw handleServiceError(error);
  }
};

// Get Webhook URL
export const getWebhookUrl = async (
  app_id: string,
  method: Method,
  data: IDataObject,
  files?: Express.Multer.File[]
): Promise<{
  result?: any;
  status?: number;
  baseURL: string;
  webhookId: string;
}> => {
  try {
    const app = await appRepository.findById(app_id);
    if (!app) {
      throw new _Error('App not found', 400);
    }

    throw new _Error('Workflow not configured', 400);
  } catch (error) {
    logger.error('Error getting webhook url', error);
    throw handleServiceError(error);
  }
};

// Export app template from app
export const exportAppTemplate = async (
  userContext: IUserContext,
  app_id: string
): Promise<{
  template: IAppTemplate;
  canPublish: boolean;
}> => {
  try {
    const app = await getAppById(userContext, app_id);

    if (!app) throw new _Error('App not found', 400);

    return {
      template: {
        inherit_info: {
          title: app.title || '',
          description: app.description || '',
          icon: {
            namespace: app.icon?.namespace || '',
            name: app.icon?.name || '',
          },
          url: app.url || '',
          app_type: AppType.MarketplaceApp,
          version: app.version || '',
          organization_id: app.organization_id,
          categories: app.categories || [],
          channels_or_platforms: app.channels_or_platforms || [],
        },
        options: app.options,
        credentials_template: app.credentials,
        url: app.url || '',
        product_type: app.product_type || '',
      },
      canPublish: true,
    };
  } catch (error) {
    throw handleServiceError(error);
  }
};

export const exportAppTemplateV3 = async (
  userContext: IUserContext,
  app_id: string
): Promise<{
  template: IAppTemplate;
  canPublish: boolean;
}> => {
  try {
    const { org_id } = userContext;

    const appRaw = await appRepository.findById(app_id);
    if (!appRaw) throw new _Error('App not found', 400);

    const app = appRaw;

    if (app.organization_id !== org_id) {
      throw new _Error('App not found', 400);
    }

    return {
      template: {
        inherit_info: {
          title: app.title || '',
          description: app.description || '',
          icon: {
            namespace: app.icon?.namespace || '',
            name: app.icon?.name || '',
          },
          url: app.url || '',
          app_type: AppType.MarketplaceApp,
          version: app.version || '',
          organization_id: app.organization_id,
          categories: app.categories || [],
          channels_or_platforms: app.channels_or_platforms || [],
        },
        options: app.options,
        credentials_template: app.credentials,
        url: app.url || '',
        product_type: app.product_type || '',
      },
      canPublish: true,
    };
  } catch (error) {
    throw handleServiceError(error);
  }
};

export const getRequiredCredentials = async (
  userContext: IUserContext,
  appId: string
) => {
  try {
    if (!appId || appId === '') {
      throw new _Error('App ID is required', 400);
    }

    const app = await getAppById(userContext, appId);

    if (!app) {
      throw new _Error('App not found', 400);
    }

    return [];
  } catch (error) {
    throw handleServiceError(error);
  }
};

export const getUsedChannels = async (
  userContext: IUserContext,
  ids: string[],
  productId?: string
) => {
  try {
    logger.debug('getUsedChannels', { ids, productId });
    const apps = await appRepository.findByOrganizationId(userContext.org_id);

    // Filter apps by channel id and optionally by product_id
    const filteredApps = apps.filter((app) => {
      const hasChannelId = app.channel?.id && ids.includes(app.channel.id);
      const hasProductId = !productId || app.product_id === productId;
      return hasChannelId && hasProductId;
    });

    const mapOfChannelAndUsedState: {
      [key: string]: {
        app_id: string;
        product_id?: string;
        app_settings: IDataObject;
      };
    } = {};
    ids.forEach((id) => {
      const app = filteredApps.find((app) => app.channel?.id === id);
      if (!app) {
        mapOfChannelAndUsedState[id] = {
          app_id: '',
          app_settings: {},
        };
        return;
      }

      ids.indexOf(id) !== -1 &&
        (mapOfChannelAndUsedState[id] = {
          app_id: app._id as string,
          product_id: app.product_id as string,
          app_settings: {
            options: app.options,
            credentials: app.credentials,
            user_progress: app.user_progress,
            channel: app.channel,
          },
        });
    });

    return {
      ...mapOfChannelAndUsedState,
    };
  } catch (error) {
    throw handleServiceError(error);
  }
};

export const getUsedChannelsV2 = async (
  userContext: IUserContext,
  ids: string[]
) => {
  try {
    logger.debug('getUsedChannels', { ids });
    const apps = await appRepository.findByOrganizationId(userContext.org_id);
    const filteredApps = apps.filter((app) => app.channel?.id && ids.includes(app.channel.id));

    const mapOfChannelAndUsedState: {
      [key: string]: {
        object_type: 'app';
        is_used: boolean;
        id: string;
        settings: IDataObject;
        product_id?: string;
      };
    } = {};
    const checkedIDs: string[] = [];
    filteredApps.forEach((app) => {
      if (app?.channel?.id && ids.indexOf(app?.channel?.id) !== -1) {
        if (checkedIDs.indexOf(app.channel.id) === -1) {
          checkedIDs.push(app.channel.id);
          mapOfChannelAndUsedState[app.channel.id] = {
            object_type: 'app',
            is_used: true,
            product_id: app.product_id as string,
            id: app._id as string,
            settings: {
              options: app.options,
              credentials: app.credentials,
              user_progress: app.user_progress,
              channel: app.channel,
            },
          };
        }
      }
    });

    ids.forEach((id) => {
      if (!mapOfChannelAndUsedState[id]) {
        mapOfChannelAndUsedState[id] = {
          object_type: 'app',
          is_used: false,
          id: '',
          settings: {},
        };
      }
    });

    return {
      ...mapOfChannelAndUsedState,
    };
  } catch (error) {
    throw handleServiceError(error);
  }
};

/**
 * PRIVATE
 */

const _deleteRelatedResources = async (app: IApp) => {
  if (app.product_code === 'form_management') {
    // delete forms
    await deleteAllForms(app.organization_id);
  }

  // delete schedulers
  await deleteSchedulersByAppId(app?.organization_id, app?._id as string);
};
