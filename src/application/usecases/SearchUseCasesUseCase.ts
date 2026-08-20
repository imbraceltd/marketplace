import { IUseCaseRepository } from '../interfaces/repositories/IUseCaseRepository';
import { getBuiltinUseCases } from '../../core/services/builtin_use_cases';

export class SearchUseCasesUseCase {
    constructor(private repository: IUseCaseRepository) { }

    async execute(query: any, organizationId?: string) {
        const queryOptions: any = {};

        if (query.title) {
            queryOptions.search = query.title;
        }

        const skip = query.skip ? parseInt(query.skip, 10) : 0;
        const limit = query.limit ? parseInt(query.limit, 10) : 0;
        queryOptions.skip = skip;
        queryOptions.limit = limit;

        const sort = query.sort || { created_at: -1 };
        queryOptions.sort = sort;

        let usecases;
        let total = 0;

        if (organizationId) {
            usecases = await this.repository.findByOrganizationId(organizationId, queryOptions);
            total = await this.repository.countByOrganizationId(organizationId, queryOptions);
        } else {
            usecases = await this.repository.findAll(queryOptions);
            total = await this.repository.countAll(queryOptions);
        }

        const usecasesData = usecases.map((u: any) => u.toJSON ? u.toJSON() : u);

        // Merge built-in use cases (mirrors v1 `getUseCases` in use_case.service.ts).
        // Hide a built-in once this org has forked it via createCustomUseCaseV2 — the
        // fork stores the built-in's `_id` in its `template_id` field, so its presence
        // in DB results proves a customized copy exists.
        const builtinCandidates = await getBuiltinUseCases(query);
        const forkedBuiltinIds = new Set(
            usecasesData
                .map((uc: any) => uc?.template_id)
                .filter((id: any): id is string => typeof id === 'string' && id.length > 0),
        );
        const builtinResults = builtinCandidates.filter((b) => !forkedBuiltinIds.has(b._id));

        if (limit > 0) {
            return {
                usecases: [...usecasesData, ...builtinResults],
                total: total + builtinResults.length,
                limit,
                skip,
                has_more: skip + usecases.length < total,
            };
        }

        return [...usecasesData, ...builtinResults];
    }
}
