import logger from '../../server/logging/logger';
import _Error, { handleServiceError } from '../../utils/error';
import IUserContext from '../domains/interface/userContext';
import { IDataObject } from '../domains/interface/types';
import IUseCase from '../domains/interface/useCase';
import { AIAssistant } from '../domains/interface/aiAssistant';
import {
  createAssistant,
  deleteAssistant,
  updateAssistant,
} from '../repositories/ai.repository';
import {
  createAgentChannel,
  createAgentChannelV2,
  removeAgentChannel,
  removeAgentChannelV2,
} from '../repositories/channel.repository';
import { unlinkAssistantFromAllSchemas } from '../repositories/dataBoard.repository';
import { UseCaseRepositoryFactory } from '../../infrastructure/repositories/factories/UseCaseRepositoryFactory';
import UseCaseModel from '../../db/models/UseCase.model';

const useCaseRepository = UseCaseRepositoryFactory.create();

// Best-effort: prune a deleted assistant from data-board doc-schemas so its
// agent_ids don't dangle. Never throws — cleanup must not block deletion.
const unlinkAgentBestEffort = async (orgId: string, assistantId: string) => {
  try {
    await unlinkAssistantFromAllSchemas(orgId, assistantId);
  } catch (err) {
    console.error('Failed to unlink assistant from data-board schemas, continuing:', err);
  }
};
import { getBuiltinUseCases } from './builtin_use_cases';

function wildcardToRegex(search: string): RegExp {
  // Escape special regex characters except for the wildcard asterisk
  const escaped = search.replace(/[-\/\\^$+?.()|[\]{}]/g, '\\$&');
  // Replace wildcard '*' with '.*'
  const pattern = '.*' + escaped.replace(/\*/g, '.*') + '.*';
  return new RegExp(pattern, 'i'); // 'i' for case insensitive
}

export const createUseCase = async (
  userContext: IUserContext,
  payload: Omit<
    IUseCase,
    'organization_id' | 'business_unit_id' | 'user_id' | 'is_deleted'
  >,
) => {
  try {
    const allUseCases = await useCaseRepository.findByOrganizationId(
      userContext?.org_id,
      { search: payload?.title },
    );
    const existingUseCase = allUseCases.find(
      (uc: any) => uc.title === payload?.title && !uc.is_deleted,
    );
    if (existingUseCase) {
      throw new _Error(
        `UseCase with title ${payload?.title} already exists in organization ${userContext?.org_id}`,
        400,
      );
    }
    const newUseCase = await useCaseRepository.create({
      ...payload,
      user_id: userContext.user_id,
      organization_id: userContext.org_id,
    });

    return newUseCase;
  } catch (error) {
    throw handleServiceError(error);
  }
};

export const createCustomUseCase = async (
  userContext: IUserContext,
  usecasePayload: Omit<
    IUseCase,
    'organization_id' | 'business_unit_id' | 'user_id' | 'is_deleted'
  >,
  assistantPayload: AIAssistant,
) => {
  try {
    const allUseCases = await useCaseRepository.findByOrganizationId(
      userContext?.org_id,
      { search: usecasePayload?.title },
    );
    const existingUseCase = allUseCases.find(
      (uc: any) => uc.title === usecasePayload?.title && !uc.is_deleted,
    );
    if (existingUseCase) {
      throw new _Error(
        `UseCase with title ${usecasePayload?.title} already exists in organization ${userContext?.org_id}`,
        400,
      );
    }

    const createdAIassistant = await createAssistant(
      userContext?.org_id,
      assistantPayload,
    );
    if (!createdAIassistant) {
      throw new _Error('Failed to create AI assistant', 500);
    }

    const createdAgentChannel = await createAgentChannel(
      userContext?.org_id,
      usecasePayload?.title,
      createdAIassistant?.id ?? '',
    );

    if (!createdAgentChannel) {
      throw new _Error('Failed to create agent channel', 500);
    }

    const newUseCase = await useCaseRepository.create({
      ...usecasePayload,
      user_id: userContext.user_id,
      organization_id: userContext.org_id,
      assistant_id: createdAIassistant?.id,
      channel_id: '',
      type: 'custom',
      demo_url: `${usecasePayload.demo_url}?channel_id=${createdAgentChannel?.id}`,
    });

    return newUseCase;
  } catch (error) {
    throw handleServiceError(error);
  }
};

export const createCustomUseCaseV2 = async (
  userContext: IUserContext,
  usecasePayload: Omit<
    IUseCase,
    'organization_id' | 'business_unit_id' | 'user_id' | 'is_deleted'
  >,
  assistantPayload: AIAssistant,
) => {
  try {
    const allUseCases = await useCaseRepository.findByOrganizationId(
      userContext?.org_id,
      { search: usecasePayload?.title },
    );
    const existingUseCase = allUseCases.find(
      (uc: any) => uc.title === usecasePayload?.title && !uc.is_deleted,
    );
    if (existingUseCase) {
      throw new _Error(
        `UseCase with title ${usecasePayload?.title} already exists in organization ${userContext?.org_id}`,
        400,
      );
    }

    const createdAIassistant = await createAssistant(
      userContext?.org_id,
      assistantPayload,
    );
    if (!createdAIassistant) {
      throw new _Error('Failed to create AI assistant', 500);
    }

    const createdAgentChannel = await createAgentChannelV2(
      userContext?.org_id,
      usecasePayload?.title,
      createdAIassistant?.id ?? '',
    );

    if (!createdAgentChannel) {
      throw new _Error('Failed to create agent channel', 500);
    }

    const newUseCase = await useCaseRepository.create({
      ...usecasePayload,
      user_id: userContext.user_id,
      organization_id: userContext.org_id,
      assistant_id: createdAIassistant?.id,
      channel_id: createdAgentChannel?.id,
      version: 2,
      type: 'custom',
      demo_url: `${usecasePayload.demo_url}?channel_id=${createdAgentChannel?.id}`,
    });

    return newUseCase;
  } catch (error) {
    throw handleServiceError(error);
  }
};

export const getUseCases = async (query: IDataObject = {}, orgId: string) => {
  try {
    // Reason: keep the original query intact for built-in filtering — it does
    // its own wildcard matching on the raw string instead of a Mongo $regex.
    const builtinCandidates = await getBuiltinUseCases(query);

    const { title, agent_type } = query;
    const dbQuery: IDataObject = { ...query };

    if (title) {
      const regex = wildcardToRegex(title as string);
      logger.debug(`Search term: "${title}", Regex: ${regex}`);
      dbQuery['title'] = { $regex: regex };
    }

    if (agent_type) {
      const regex = wildcardToRegex(agent_type as string);
      logger.debug(`Search term: "${agent_type}", Regex: ${regex}`);
      dbQuery['agent_type'] = { $regex: regex };
    }

    const dbResults = await UseCaseModel.find({
      is_deleted: false,
      organization_id: orgId,
      ...dbQuery,
    });

    // Hide a built-in once this org has forked it via createCustomUseCaseV2.
    // The fork stores the built-in's _id in its `template_id` field, so its
    // presence in dbResults proves the org already has a customized copy and
    // we should drop the original card to avoid two near-identical entries.
    const forkedBuiltinIds = new Set(
      dbResults
        .map((uc) => (uc as { template_id?: string }).template_id)
        .filter((id): id is string => typeof id === 'string' && id.length > 0),
    );
    const builtinResults = builtinCandidates.filter(
      (b) => !forkedBuiltinIds.has(b._id),
    );

    // Built-ins are surfaced after DB results so existing per-org templates
    // keep their visual ordering; FE renders the list as-is.
    return [...dbResults, ...builtinResults];
  } catch (error) {
    throw handleServiceError(error);
  }
};

export const getUseCaseById = async (id: string, orgId: string) => {
  try {
    const useCase = await useCaseRepository.findById(id);

    if (!useCase || useCase.is_deleted || useCase.organization_id !== orgId) {
      throw new _Error('UseCase not found', 404);
    }

    return useCase;
  } catch (error) {
    throw handleServiceError(error);
  }
};

export const getUseCaseByAssistantId = async (
  assistantId: string,
  orgId: string,
) => {
  try {
    const useCases = await useCaseRepository.findByAssistantIds([assistantId]);
    const useCase = useCases.find((uc) => uc.organization_id === orgId);

    if (!useCase) {
      throw new _Error('UseCase not found', 404);
    }

    return useCase;
  } catch (error) {
    throw handleServiceError(error);
  }
};

export const updateUseCase = async (
  id: string,
  payload: Partial<
    Omit<
      IUseCase,
      'organization_id' | 'business_unit_id' | 'user_id' | 'is_deleted'
    >
  >,
) => {
  try {
    const useCase = await useCaseRepository.update(id, {
      ...payload,
      updated_at: new Date(),
    });

    if (!useCase) {
      throw new _Error('UseCase not found', 404);
    }

    return useCase;
  } catch (error) {
    throw handleServiceError(error);
  }
};

export const updateCustomUseCase = async (
  userContext: IUserContext,
  id: string,
  usecasePayload: Partial<
    Omit<
      IUseCase,
      'organization_id' | 'business_unit_id' | 'user_id' | 'is_deleted'
    >
  >,
  assistantPayload: AIAssistant,
) => {
  try {
    const existingUseCase = await useCaseRepository.findById(id);
    if (
      !existingUseCase ||
      existingUseCase.is_deleted ||
      existingUseCase.organization_id !== userContext?.org_id
    ) {
      throw new _Error(`UseCase with id ${id} doesn't exist`, 404);
    }

    const updatedAssistant = await updateAssistant(
      userContext?.org_id,
      existingUseCase.assistant_id ?? '',
      assistantPayload,
    );
    if (!updatedAssistant) {
      throw new _Error('Failed to update AI assistant', 500);
    }

    // Dynamically build the update object
    const updateFields: Record<
      string,
      | string
      | Date
      | {
          title: string;
          icon: string;
        }[]
    > = {};
    if (usecasePayload.short_description !== undefined) {
      updateFields.short_description = usecasePayload.short_description;
    }
    if (usecasePayload.description !== undefined) {
      updateFields.description = usecasePayload.description;
    }
    if (usecasePayload.title !== undefined) {
      updateFields.title = usecasePayload.title;
    }

    if (usecasePayload.supported_channels !== undefined) {
      updateFields.supported_channels = usecasePayload.supported_channels;
    }

    if (usecasePayload?.agent_type !== undefined) {
      updateFields.agent_type = usecasePayload.agent_type;
    }

    // Add the updated_at field
    updateFields.updated_at = new Date();

    const useCase = await useCaseRepository.update(id, updateFields);

    if (!useCase) {
      throw new _Error('UseCase not found', 404);
    }

    return useCase;
  } catch (error) {
    throw handleServiceError(error);
  }
};

export const deleteUseCase = async (id: string) => {
  try {
    const existingUseCase = await useCaseRepository.findById(id);
    if (!existingUseCase || existingUseCase.is_deleted) {
      throw new _Error(`UseCase with id ${id} doesn't exist`, 404);
    }

    const { version } = existingUseCase;
    logger.info('Use case version:', version);
    if (version && version > 1) {
      await deleteUseCaseV2(id);
      return;
    }

    if (existingUseCase?.channel_id && existingUseCase?.type !== 'default') {
      const deletedChannel = await removeAgentChannel(
        existingUseCase?.organization_id,
        existingUseCase.channel_id ?? '',
      );
      if (!deletedChannel) {
        throw new _Error('Failed to delete agent channel', 500);
      }
    }

    if (existingUseCase?.assistant_id && existingUseCase?.type !== 'default') {
      const deletedAssistant = await deleteAssistant(
        existingUseCase?.organization_id,
        existingUseCase.assistant_id ?? '',
      );
      if (!deletedAssistant) {
        throw new _Error('Failed to delete AI assistant', 500);
      }
      await unlinkAgentBestEffort(
        existingUseCase?.organization_id,
        existingUseCase.assistant_id ?? '',
      );
    }

    await useCaseRepository.update(id, {
      is_deleted: true,
      updated_at: new Date(),
    });

    const useCase = await useCaseRepository.delete(id);

    if (!useCase) {
      throw new _Error('UseCase not found', 404);
    }

    return useCase;
  } catch (error) {
    throw handleServiceError(error);
  }
};

export const deleteUseCaseV2 = async (id: string) => {
  try {
    const existingUseCase = await useCaseRepository.findById(id);
    if (!existingUseCase || existingUseCase.is_deleted) {
      throw new _Error(`UseCase with id ${id} doesn't exist`, 404);
    }

    if (existingUseCase?.channel_id && existingUseCase?.type !== 'default') {
      try {
        await removeAgentChannelV2(
          existingUseCase?.organization_id,
          existingUseCase.channel_id ?? '',
        );
      } catch (channelError) {
        logger.error(
          'Failed to delete agent channel, continuing with use case deletion:',
          channelError,
        );
      }
    }

    if (existingUseCase?.assistant_id && existingUseCase?.type !== 'default') {
      const deletedAssistant = await deleteAssistant(
        existingUseCase?.organization_id,
        existingUseCase.assistant_id ?? '',
      );
      if (!deletedAssistant) {
        throw new _Error('Failed to delete AI assistant', 500);
      }
      await unlinkAgentBestEffort(
        existingUseCase?.organization_id,
        existingUseCase.assistant_id ?? '',
      );
    }

    await useCaseRepository.update(id, {
      is_deleted: true,
      updated_at: new Date(),
    });

    const useCase = await useCaseRepository.delete(id);

    if (!useCase) {
      throw new _Error('UseCase not found', 404);
    }

    return useCase;
  } catch (error) {
    throw handleServiceError(error);
  }
};
