import { ITemplateRepository } from '../interfaces/repositories/ITemplateRepository';

export class SearchTemplatesUseCase {
    constructor(private repository: ITemplateRepository) { }

    async execute(query: any) {
        const queryOptions: any = {};

        if (query.name) {
            queryOptions.search = query.name;
        }

        const skip = query.skip ? parseInt(query.skip, 10) : 0;
        const limit = query.limit ? parseInt(query.limit, 10) : 0;
        queryOptions.skip = skip;
        queryOptions.limit = limit;

        const sort = query.sort || { created_at: -1 };
        queryOptions.sort = sort;

        const templates = await this.repository.findAll(queryOptions);

        const data = templates.map((t: any) => {
            const json = t.toJSON ? t.toJSON() : t;
            delete json.graph;
            delete json.updated_at;
            return json;
        });

        if (limit > 0) {
            const total = await this.repository.countAll(queryOptions);
            return {
                data,
                total,
                limit,
                skip,
                has_more: skip + templates.length < total
            };
        }

        return { data };
    }
}
