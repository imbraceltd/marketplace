/**
 * Built-in (non-DB-template) use cases.
 *
 * Sourced from the `builtin_agents` Postgres table (seeded by
 * `builtin_agent_seed.service.ts` from `./builtin-agents/*.json` at boot).
 * Surfaced through `getUseCases` for every organization without a row in
 * `UseCaseModel`. Once an org forks via `createCustomUseCaseV2`, the resulting
 * `UseCase` doc carries `template_id = <builtin_id>` and `getUseCases` filters
 * the original out — see `use_case.service.ts:getUseCases`.
 */

import { IDataObject } from '../domains/interface/types';
import { getPgDb, pgBuiltinAgents } from '../../infrastructure/database/drizzle';

export interface BuiltinUseCase {
  _id: string;
  doc_name: 'UseCase';
  title: string;
  name: string;
  short_description?: string;
  description?: string;
  type: 'default';
  assistant_id: string;
  agent_type?: string;
  thumbnail_url?: string;
  hover_thumbnail_url?: string;
  media?: string[];
  features?: string[];
  tags?: string[];
  suggestion_prompts?: string[];
  is_deleted: false;
  is_builtin: true;
  organization_id: '__builtin__';
  version: 2;
  created_at: Date;
  updated_at: Date;
}

/**
 * Reproduce the wildcard search behaviour from `use_case.service.getUseCases`
 * so a `?title=` filter applies consistently across DB and built-in entries.
 */
function matchesWildcard(value: string | undefined, search: string): boolean {
  if (!value) return false;
  const escaped = search.replace(/[-\/\\^$+?.()|[\]{}]/g, '\\$&');
  const pattern = '.*' + escaped.replace(/\*/g, '.*') + '.*';
  return new RegExp(pattern, 'i').test(value);
}

interface BuiltinAgentDoc {
  _id: string;
  assistant_id: string;
  title: string;
  name?: string;
  short_description?: string;
  description?: string;
  agent_type?: string;
  thumbnail_url?: string;
  hover_thumbnail_url?: string;
  suggestion_prompts?: string[];
  created_at?: Date;
  updated_at?: Date;
}

function toBuiltinUseCase(doc: BuiltinAgentDoc): BuiltinUseCase {
  return {
    _id: doc._id,
    doc_name: 'UseCase',
    title: doc.title,
    name: doc.name ?? doc.title,
    short_description: doc.short_description,
    description: doc.description,
    type: 'default',
    assistant_id: doc.assistant_id,
    agent_type: doc.agent_type,
    thumbnail_url: doc.thumbnail_url,
    hover_thumbnail_url: doc.hover_thumbnail_url,
    media: [],
    features: [],
    tags: [],
    suggestion_prompts: doc.suggestion_prompts ?? [],
    is_deleted: false,
    is_builtin: true,
    organization_id: '__builtin__',
    version: 2,
    created_at: doc.created_at ?? new Date(0),
    updated_at: doc.updated_at ?? new Date(0),
  };
}

export async function getBuiltinUseCases(
  query: IDataObject = {}
): Promise<BuiltinUseCase[]> {
  const title = typeof query['title'] === 'string' ? query['title'] : undefined;
  const agentType =
    typeof query['agent_type'] === 'string' ? query['agent_type'] : undefined;

  const rows = await getPgDb().select().from(pgBuiltinAgents);
  const docs: BuiltinAgentDoc[] = rows.map((row) => {
    const { id, suggestion_prompts, ...rest } = row;
    return {
      ...rest,
      _id: id,
      suggestion_prompts: Array.isArray(suggestion_prompts)
        ? (suggestion_prompts as string[])
        : [],
    } as BuiltinAgentDoc;
  });

  return docs
    .map(toBuiltinUseCase)
    .filter((uc) => {
      if (title && !matchesWildcard(uc.title, title)) return false;
      if (agentType && !matchesWildcard(uc.agent_type, agentType)) return false;
      return true;
    });
}
