import { IEmailTemplateRepository } from '../interfaces/repositories/IEmailTemplateRepository';
import { htmlToText } from 'html-to-text';
import _Error, { handleServiceError } from '../../utils/error';

export class AdvancedSearchEmailTemplatesUseCase {
    constructor(
        private repository: IEmailTemplateRepository
    ) { }

    async execute(userContext: any, query: any) {
        try {
            const organizationId = userContext.org_id;
            if (!organizationId) throw new _Error('Organization id is required', 401);

            const { field, q = '', skip, limit, sort, ...restQuery } = query;
            const _skip = skip ? parseInt(skip as string) : 0;
            const _limit = limit ? parseInt(limit as string) : 0;
            const qStr = String(q || '');

            const options: any = {
                query: { ...restQuery },
                sort: sort && typeof sort === 'string' ? {
                    [sort.startsWith('-') ? sort.substring(1) : sort]: sort.startsWith('-') ? -1 : 1
                } : { created_at: -1 }
            };

            const isInMemorySearch = field !== 'title' && field !== 'name' && field !== 'subject';

            let count = 0;
            let result: any[] = [];

            if (isInMemorySearch) {
                const allMatching = await this.repository.findByOrganizationId(organizationId, {
                    ...options,
                    limit: 0
                });

                const filtered = allMatching.filter((email) => {
                    const plainTextBody = htmlToText(email.body || '', { wordwrap: false });
                    const regex = new RegExp(qStr, 'i');

                    return (
                        (field === 'all' && regex.test(email.name || '')) ||
                        regex.test(email.subject || '') ||
                        (field === 'content' && regex.test(email.subject || '')) ||
                        regex.test(plainTextBody.replace(/\[https?:\/\/[^\]]+\]/g, ''))
                    );
                });

                count = filtered.length;
                const templates = _limit > 0 ? filtered.slice(_skip, _skip + _limit) : filtered;
                result = templates.map(t => (t.toJSON ? t.toJSON() : t));
            } else {
                options.skip = _skip;
                options.limit = _limit;
                options.field = field;
                options.q = qStr;

                count = await this.repository.countByOrganizationId(organizationId, options);
                const templates = await this.repository.findByOrganizationId(organizationId, options);
                result = templates.map(t => t.toJSON());
            }

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
        } catch (error) {
            throw handleServiceError(error);
        }
    }
}
