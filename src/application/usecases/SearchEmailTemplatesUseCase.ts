import { IEmailTemplateRepository } from '../interfaces/repositories/IEmailTemplateRepository';
import { getBoards } from '../../core/repositories/boards.repository';
import _Error, { handleServiceError } from '../../utils/error';

export class SearchEmailTemplatesUseCase {
    constructor(
        private repository: IEmailTemplateRepository
    ) { }

    async execute(userContext: any, query: any) {
        try {
            const organizationId = userContext.org_id;
            if (!organizationId) throw new _Error('Organization id is required', 401);

            const { search, skip, limit, sort, ...restQuery } = query;
            const _skip = skip ? parseInt(skip as string) : 0;
            const _limit = limit ? parseInt(limit as string) : 0;

            const isSortByBoardName = sort && typeof sort === 'string' && sort.indexOf('board') !== -1;

            if (isSortByBoardName) {
                return await this.getTemplateSortByBoardName(userContext, query);
            }

            // Build DB options
            const options: any = {
                skip: _skip,
                limit: _limit,
                search,
                query: { ...restQuery }
            };

            // Handle sort logic similar to v1
            if (sort && typeof sort === 'string') {
                const sortWay = sort.startsWith('-') ? -1 : 1;
                const sortKey = sortWay === -1 ? sort.substring(1) : sort;
                options.sort = { [sortKey]: sortWay };
            }

            // Fetch count and templates
            const totalCountMatchingAll = await this.repository.countByOrganizationId(organizationId, options);
            const templates = await this.repository.findByOrganizationId(organizationId, options);

            // Decorate and Populate
            const allBoards = await getBoards(organizationId);
            const populated = templates.map((t) => {
                const json = t.toJSON();
                // Add board name
                const board = allBoards.find(b => b._id === json.board_id);
                if (board) json.board_name = board.name;
                return json;
            });

            return {
                data: populated,
                meta: {
                    count: totalCountMatchingAll,
                    skip: _skip,
                    limit: _limit,
                    total: _limit > 0 ? Math.ceil(totalCountMatchingAll / _limit) : 1,
                    has_more: _limit > 0 && (_skip + _limit < totalCountMatchingAll)
                }
            };
        } catch (error) {
            throw handleServiceError(error);
        }
    }

    private async getTemplateSortByBoardName(userContext: any, query: any) {
        const { search, skip, limit, sort, ...restQuery } = query;
        const _skip = skip ? parseInt(skip as string) : 0;
        const _limit = limit ? parseInt(limit as string) : 0;
        const isSortDESC = sort && typeof sort === 'string' && sort.startsWith('-');

        const organizationId = userContext.org_id;

        // Fetch ALL matching templates to sort in memory
        const templates = await this.repository.findByOrganizationId(organizationId, {
            search,
            query: restQuery,
            limit: 0
        });

        const allBoards = await getBoards(organizationId);

        let decorated = templates.map((t) => {
            const json = t.toJSON();
            // Add board name
            const board = allBoards.find(b => b._id === json.board_id);
            if (board) json.board_name = board.name;
            return json;
        });

        // Sort by board name
        decorated.sort((a, b) => {
            const boardNameA = a.board_name || '';
            const boardNameB = b.board_name || '';
            if (!boardNameA) return 1;
            if (!boardNameB) return -1;
            if (isSortDESC) return boardNameB.localeCompare(boardNameA);
            return boardNameA.localeCompare(boardNameB);
        });

        const count = decorated.length;
        const result = _limit > 0 ? decorated.slice(_skip, _skip + _limit) : decorated;

        return {
            data: result,
            meta: {
                count,
                skip: _skip,
                limit: _limit,
                total: _limit > 0 ? Math.ceil(count / _limit) : 1,
                has_more: _limit > 0 && (_skip + _limit < count)
            }
        };
    }
}
