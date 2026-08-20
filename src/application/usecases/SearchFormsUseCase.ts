import logger from '../../server/logging/logger';
import { IFormRepository } from '../interfaces/repositories/IFormRepository';
import IUserContext from '../../core/domains/interface/userContext';
import { getUserInfo } from '../../core/repositories/team_users';
import _Error, { handleServiceError } from '../../utils/error';

export class SearchFormsUseCase {
    constructor(private repository: IFormRepository) { }

    async execute(userContext: IUserContext, query: any) {
        try {
            const { org_id, user_id } = userContext;
            if (!org_id || !user_id) {
                throw new _Error('Unauthorized', 401);
            }

            const limit = query.limit ? parseInt(query.limit as string) : 0;
            const skip = query.skip ? parseInt(query.skip as string) : 0;

            let userInfo = null;
            try {
                userInfo = await getUserInfo(org_id, user_id as string);
            } catch (e) {
                logger.error('Error fetching userInfo in searchForms:', e);
            }
            const teamIds = userInfo ? userInfo.team.map((t: any) => t.team_id) : [];

            // repository search implementation should handle the complex MongoDB-style $or logic for teams/owner
            const result = await this.repository.search(org_id, {
                ...query,
                limit,
                skip,
                teamIds,
                userId: user_id
            });

            if (limit > 0) {
                return {
                    total: result.total,
                    limit: limit,
                    skip: skip,
                    has_more: skip + limit < result.total,
                    data: result.data.map(f => f.toJSON())
                };
            }

            return { data: result.data.map(f => f.toJSON()) };
        } catch (error) {
            throw handleServiceError(error);
        }
    }
}
