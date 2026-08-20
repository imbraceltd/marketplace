import logger from '../../server/logging/logger';
/* eslint-disable no-case-declarations */
import { ErrorCode, handleServiceError } from '../../utils/error';
import IUserContext from '../domains/interface/userContext';
import { IEmailTemplate } from '../domains/interface/emailTemplate';
import { IDataObject } from '../domains/interface/types';
import _Error from '../../utils/error';

import { htmlToText } from 'html-to-text';

import { EmailTemplateRepositoryFactory } from '../../infrastructure/repositories/factories/EmailTemplateRepositoryFactory';
import { getBoards } from '../repositories/boards.repository';
// Categories domain has been removed — stub out to avoid runtime errors
type ICategoryV2 = { _id: string; name: string; [key: string]: any };
const getCategories = async (_orgId: string, _opts?: any): Promise<ICategoryV2[]> => [];
const getCategoryById = async (_id: string): Promise<ICategoryV2 | null> => null;
import { BoardSchema } from '../domains/interface/databoard';

const emailTemplateRepository = EmailTemplateRepositoryFactory.create();

export const createEmailTemplate = async (
  userContext: IUserContext,
  email: IEmailTemplate
) => {
  try {
    const org_id = userContext.org_id;

    if (!org_id) throw new _Error('Organization id is required', 401);
    email.organization_id = org_id;

    const { name, subject, body, category } = email;
    if (category === '') delete email.category;
    if (!name)
      throw new _Error('Email name is required', 400, ErrorCode.missing_name);
    if (!subject)
      throw new _Error(
        'Email subject is required',
        400,
        ErrorCode.missing_subject
      );
    if (!body)
      throw new _Error('Email body is required', 400, ErrorCode.missing_body);

    // validate email template
    const emailTemplate = await emailTemplateRepository.create(email);

    return emailTemplate;
  } catch (error) {
    throw handleServiceError(error);
  }
};

export const getEmailTemplates = async (
  userContext: IUserContext,
  query: IDataObject
) => {
  try {
    // build query
    const {
      search,
      search_title,
      search_body,
      skip,
      limit,
      sort,
      ...restQuery
    } = query;
    const _skip = skip ? parseInt(skip as string) : 0;
    const _limit = limit ? parseInt(limit as string) : 0;
    const theQuery: IDataObject = {
      ...restQuery,
    };

    let _sortBy: {
      [key: string]: -1 | 1 | 'asc' | 'ascending' | 'desc' | 'descending';
    } = {
      'category.category_name': 1,
    };
    const isSortByBoardName =
      sort && typeof sort === 'string' && sort.indexOf('board') !== -1;

    if (isSortByBoardName) {
      return await _getTemplateSortByBoardName(userContext, query);
    }

    if (search) {
      const regex = new RegExp(search as string, 'i');
      // search not match
      theQuery['$or'] = [
        { name: { $regex: regex } },
        { subject: { $regex: regex } },
        { body: { $regex: regex } },
      ];
    }

    if (search_title) {
      theQuery['name'] = { $regex: search_title, $options: 'i' };
    }

    if (search_body) {
      theQuery['body'] = { $regex: search_body, $options: 'i' };
    }

    // GET ALL Tables
    const allTables = await getBoards(userContext.org_id);
    if (sort && typeof sort === 'string' && sort.indexOf('board') === -1) {
      // make sure sort is a string
      // '-' means descending
      const sortString = sort.trim();
      if (sortString.startsWith('-')) {
        const sortKey = sortString.substring(1);
        _sortBy = {
          [sortKey]: -1,
        };
      } else {
        _sortBy = {
          [sortString]: 1,
        };
      }
    }

    // total count
    const count = await emailTemplateRepository.countByOrganizationId(
      userContext.org_id,
      theQuery
    );

    // If search, search category name as well
    let categories: ICategoryV2[] = [];
    categories = search
      ? await getCategories(userContext.org_id, {
          search: search as string,
        })
      : [];

    // Get email templates
    // sort by name and
    const emailTemplateQuery = {
      ...theQuery,
      category: categories.length > 0
        ? { $in: categories.map((category) => category._id) }
        : undefined,
    };
    const emailTemplates = await emailTemplateRepository.findByOrganizationId(
      userContext.org_id,
      {
        ...emailTemplateQuery,
        skip: _skip,
        limit: _limit,
        sort: _sortBy,
      }
    );

    const allCategories =
      emailTemplates && emailTemplates.length > 0
        ? await getCategories(userContext.org_id)
        : [];

    // decorate templates with categories and board names
    const decoratedTemplates = emailTemplates.map((emailTemplate) => {
      const board = allTables.find(
        (board) => board._id === emailTemplate.board_id
      );
      const category = allCategories.find(
        (category) => category._id === emailTemplate.category
      );
      return {
        ...emailTemplate,
        board_name: board?.name,
        category: category
          ? {
              id: category._id,
              name: category.name,
            }
          : undefined,
      };
    });

    return {
      emailTemplates: _decorateWithCategories(
        decoratedTemplates,
        allCategories
      ),
      meta: {
        count,
        skip: _skip,
        limit: _limit,
        total: _limit > 0 ? Math.ceil(count / _limit) : 1,
        has_more: _skip + _limit !== 0 && _skip + _limit < count,
      },
    };
  } catch (error) {
    throw handleServiceError(error);
  }
};

export const searchEmailTemplates = async (
  userContext: IUserContext,
  query: IDataObject
) => {
  try {
    const { field, q = '', skip, limit, sort, ...restQuery } = query;

    // handle sort
    let _sortBy: {
      [key: string]: -1 | 1 | 'asc' | 'ascending' | 'desc' | 'descending';
    } = {
      updated_at: -1,
    };

    if (sort && typeof sort === 'string') {
      const sortWay = sort.startsWith('-') ? -1 : 1;
      const sortKey = sortWay === -1 ? sort.substring(1) : sort;

      _sortBy = {
        [sortKey]: sortWay,
      };
    }

    // field: all, name, subject, body
    const theQuery: IDataObject = {
      ...restQuery,
      organization_id: userContext.org_id,
    };
    switch (field) {
      case 'name':
      case 'title':
        theQuery['name'] = { $regex: q, $options: 'i' };
        break;
      case 'subject':
        theQuery['subject'] = { $regex: q, $options: 'i' };
        break;
      case 'body':
        theQuery['body'] = { $regex: q, $options: 'i' };
        break;
      case 'content':
        theQuery['$or'] = [
          { subject: { $regex: q, $options: 'i' } },
          { body: { $regex: q, $options: 'i' } },
        ];
        break;
      case 'all':
        theQuery['$or'] = [
          { name: { $regex: q, $options: 'i' } },
          { body: { $regex: q, $options: 'i' } },
        ];
        break;
      default:
        theQuery['$or'] = [
          { name: { $regex: q, $options: 'i' } },
          { subject: { $regex: q, $options: 'i' } },
          { body: { $regex: q, $options: 'i' } },
        ];
        break;
    }

    const _skip = skip ? parseInt(skip as string) : 0;
    const _limit = limit ? parseInt(limit as string) : 0;
    const categories = await getCategories(userContext.org_id);

    if (field !== 'title' && field !== 'name' && field !== 'subject') {
      const allEmailTemplates = await emailTemplateRepository.findByOrganizationId(
        userContext.org_id,
        {
          ...theQuery,
          sort: _sortBy,
        }
      );

      const filteredEmailTemplates = allEmailTemplates.filter((email) => {
        const plainTextBody = htmlToText(email.body, {
          wordwrap: false,
        });
        return (
          (field === 'all' && new RegExp(q as string, 'i').test(email.name)) ||
          new RegExp(q as string, 'i').test(email.subject) ||
          (field === 'content' &&
            new RegExp(q as string, 'i').test(email.subject)) ||
          new RegExp(q as string, 'i').test(
            plainTextBody.replace(/\[https?:\/\/[^\]]+\]/g, '')
          )
        );
      });

      const count = filteredEmailTemplates.length;
      const _skip = skip ? parseInt(skip as string) : 0;
      const _limit = limit ? parseInt(limit as string) : 0;
      const emailTemplates =
        _limit !== 0
          ? filteredEmailTemplates.slice(_skip, _skip + _limit)
          : filteredEmailTemplates;
      const emailTemplatesWithCategories = _decorateWithCategories(
        emailTemplates,
        categories
      );

      const boards = await getBoards(userContext.org_id);
      const emailTemplatesWithBoardName = _decorateWithBoardName(
        emailTemplatesWithCategories,
        boards
      );

      const sortedEmailTemplates = _sortTemplates(emailTemplatesWithBoardName, _sortBy);
      logger.info('sortedEmailTemplates', sortedEmailTemplates);
      return {
        emailTemplates: sortedEmailTemplates,
        meta: {
          count,
          skip: _skip,
          limit: _limit,
          total: _limit > 0 ? Math.ceil(count / _limit) : 1,
          has_more: _skip + _limit !== 0 && _skip + _limit < count,
        },
      };
    }

    // total count
    const count = await emailTemplateRepository.countByOrganizationId(
      userContext.org_id,
      theQuery
    );

    const emailTemplates = await emailTemplateRepository.findByOrganizationId(
      userContext.org_id,
      {
        ...theQuery,
        skip: _skip,
        limit: _limit,
        sort: _sortBy,
      }
    );

    const emailTemplatesWithCategories = await _decorateWithCategories(
      emailTemplates,
      categories
    );

    // databoards
    const allTables = await getBoards(userContext.org_id);
    const emailTemplatesWithBoardName = _decorateWithBoardName(
      emailTemplatesWithCategories,
      allTables
    );

    return {
      emailTemplates: _sortTemplates(emailTemplatesWithBoardName, _sortBy),
      meta: {
        count,
        skip: _skip,
        limit: _limit,
        total: _limit > 0 ? Math.ceil(count / _limit) : 1,
        has_more: _skip + _limit !== 0 && _skip + _limit < count,
      },
    };
  } catch (error) {
    throw handleServiceError(error);
  }
};

export const searchEmailTemplatesV2 = async (
  userContext: IUserContext,
  query: IDataObject
) => {
  try {
    const { field, q = '', skip, limit, sort, ...restQuery } = query;

    // handle sort
    let _sortBy: {
      [key: string]: -1 | 1 | 'asc' | 'ascending' | 'desc' | 'descending';
    } = {
      updated_at:  -1,
    };

    if (sort && typeof sort === 'string') {
      const sortWay = sort.startsWith('-') ? -1 : 1;
      const sortKey = sortWay === -1 ? sort.substring(1) : sort;

      _sortBy = {
        [sortKey]: sortWay,
      };
    }

    // field: all, name, subject, body
    const theQuery: IDataObject = {
      ...restQuery,
      organization_id: userContext.org_id,
    };
    switch (field) {
      case 'name':
      case 'title':
        theQuery['name'] = { $regex: q, $options: 'i' };
        break;
      case 'subject':
        theQuery['subject'] = { $regex: q, $options: 'i' };
        break;
      case 'body':
        theQuery['body'] = { $regex: q, $options: 'i' };
        break;
      case 'content':
        theQuery['$or'] = [
          { subject: { $regex: q, $options: 'i' } },
          { body: { $regex: q, $options: 'i' } },
        ];
        break;
      case 'all':
        theQuery['$or'] = [
          { name: { $regex: q, $options: 'i' } },
          { body: { $regex: q, $options: 'i' } },
        ];
        break;
      default:
        theQuery['$or'] = [
          { name: { $regex: q, $options: 'i' } },
          { subject: { $regex: q, $options: 'i' } },
          { body: { $regex: q, $options: 'i' } },
        ];
        break;
    }

    const _skip = skip ? parseInt(skip as string) : 0;
    const _limit = limit ? parseInt(limit as string) : 0;
    const categories = await getCategories(userContext.org_id);
    const databoards = await getBoards(userContext.org_id);

    const allEmailTemplates = await emailTemplateRepository.findByOrganizationId(
      userContext.org_id,
      {
        ...theQuery,
        sort: _sortBy,
      }
    );

    let count = allEmailTemplates.length;
    // convert allEmailTemplates to IEmailTemplate[]
    const emailTemplates: IEmailTemplate[] = allEmailTemplates;

    // handle decoration
    const emailTemplatesWithCategories = _decorateWithCategories(
      emailTemplates,
      categories
    );

    const emailTemplatesWithBoardName = _decorateWithBoardName(
      emailTemplatesWithCategories,
      databoards
    );

    // sort
    const sortedEmailTemplates = _sortTemplates(
      emailTemplatesWithBoardName,
      _sortBy
    );

    // handle search
    if (field !== 'title' && field !== 'name' && field !== 'subject') {
      const filteredEmailTemplates = sortedEmailTemplates.filter((email) => {
        const plainTextBody = htmlToText(email.body || '', {
          wordwrap: false,
        });
        return (
          (field === 'all' && new RegExp(q as string, 'i').test(email.name)) ||
          new RegExp(q as string, 'i').test(email.subject || '') ||
          (field === 'content' &&
            new RegExp(q as string, 'i').test(email.subject || '')) ||
          new RegExp(q as string, 'i').test(
            plainTextBody.replace(/\[https?:\/\/[^\]]+\]/g, '')
          )
        );
      });

      count = filteredEmailTemplates.length;

      return {
        emailTemplates:
          _limit > 0
            ? filteredEmailTemplates.slice(_skip, _skip + _limit)
            : filteredEmailTemplates,
        meta: {
          count,
          skip: _skip,
          limit: _limit,
          total: _limit > 0 ? Math.ceil(count / _limit) : 1,
          has_more: _skip + _limit !== 0 && _skip + _limit < count,
        },
      };
    }

    return {
      emailTemplates: sortedEmailTemplates,
      meta: {
        count,
        skip: _skip,
        limit: _limit,
        total: _limit > 0 ? Math.ceil(count / _limit) : 1,
        has_more: _skip + _limit !== 0 && _skip + _limit < count,
      },
    };
  } catch (error) {
    throw handleServiceError(error);
  }
};

export const getEmailTemplateById = async (
  userContext: IUserContext,
  emailTemplateId: string
) => {
  try {
    // validate email template
    if (!emailTemplateId || emailTemplateId === '')
      throw new _Error('Email template id is required', 400);

    const org_id = userContext.org_id;
    if (!org_id) throw new _Error('Organization id is required', 401);

    const emailTemplate = await emailTemplateRepository.findById(emailTemplateId);

    if (!emailTemplate || emailTemplate.organization_id !== org_id) {
      return null;
    }

    if (emailTemplate?.category) {
      const category = await getCategoryById(
        userContext.org_id,
        emailTemplate.category
      );

      // @ts-expect-error category is added
      emailTemplate['category'] = category
        ? {
            id: category._id,
            name: category.name,
          }
        : null;

      return emailTemplate;
    }

    return emailTemplate;
  } catch (error) {
    throw handleServiceError(error);
  }
};

export const updateEmailTemplate = async (
  userContext: IUserContext,
  emailTemplateId: string,
  email: IEmailTemplate
) => {
  try {
    // validate email template
    if (!emailTemplateId || emailTemplateId === '')
      throw new _Error('Email template id is required', 400);

    const org_id = userContext.org_id;
    if (!org_id) throw new _Error('Organization id is required', 401);

    const current = await emailTemplateRepository.findById(emailTemplateId);

    if (!current || current.organization_id !== org_id) {
      throw new _Error('Email template not found', 404);
    }

    const newCome = {
      ...current,
      ...email,
      updated_at: new Date(),
    };

    if (newCome.category === '') delete newCome.category;

    const emailTemplate = await emailTemplateRepository.update(
      emailTemplateId,
      newCome
    );

    return emailTemplate;
  } catch (error) {
    throw handleServiceError(error);
  }
};

export const deleteEmailTemplate = async (
  userContext: IUserContext,
  emailTemplateId: string
) => {
  try {
    // validate email template
    if (!emailTemplateId || emailTemplateId === '')
      throw new _Error('Email template id is required', 400);

    const org_id = userContext.org_id;
    if (!org_id) throw new _Error('Organization id is required', 401);

    const current = await emailTemplateRepository.findById(emailTemplateId);

    if (!current || current.organization_id !== org_id) {
      throw new _Error('Email template not found', 404);
    }

    const emailTemplate = await emailTemplateRepository.delete(emailTemplateId);

    return emailTemplate;
  } catch (error) {
    throw handleServiceError(error);
  }
};

export const handleDeleteCategory = async (message: {
  organization_id: string;
  categoryId: string;
}) => {
  try {
    // update email template
    if (!message.organization_id || !message.categoryId) {
      throw new _Error('Organization id and category id are required', 400);
    }
    await emailTemplateRepository.updateMany(
      { organization_id: message.organization_id },
      { category: null }
    );

    return true;
  } catch (error) {
    logger.error('Error handling delete category', error);
  }
};

const _decorateWithCategories = (
  templates: IEmailTemplate[],
  categories: ICategoryV2[]
) => {
  const decorated = templates.map((template) => {
    const category = categories.find(
      (category) => category._id === template.category
    );
    if (category) {
      template['category'] = {
        id: category._id as string,
        name: category.name,
      };
    } else {
      delete template['category'];
    }

    return template;
  });

  return decorated;
};

const _decorateWithBoardName = (
  templates: IEmailTemplate[],
  boards: BoardSchema[]
) => {
  return templates.map((template) => {
    const board = boards.find((board) => board._id === template.board_id);
    if (board) {
      // @ts-expect-error board_name is added by set
      template['board_name'] = board.name;
    }

    return template;
  });
};

const _sortTemplates = (
  templates: IEmailTemplate[],
  sort: {
    [key: string]: -1 | 1 | 'asc' | 'ascending' | 'desc' | 'descending';
  }
) => {
  const key = Object.keys(sort)[0];
  const ASC =
    sort[key] === 1 || sort[key] === 'asc' || sort[key] === 'ascending';

  switch (key) {
    case 'audience':
      return templates.sort((a, b) => {
        // @ts-expect-error audience is added by set
        const aBoardName = a.board_name || '';
        // @ts-expect-error audience is added by set
        const bBoardName = b.board_name || '';

        if (ASC) {
          return aBoardName.localeCompare(bBoardName);
        }

        return bBoardName.localeCompare(aBoardName);
      });

    case 'category':
      return templates.sort((a, b) => {
        // @ts-expect-error category is added by set
        const aCategory = a.category?.name || '';
        // @ts-expect-error category is added by set
        const bCategory = b.category?.name || '';

        if (ASC) {
          return aCategory.localeCompare(bCategory);
        }

        return bCategory.localeCompare(aCategory);
      });

    default:
      return templates;
  }
};

const _getTemplateSortByBoardName = async (
  userContext: IUserContext,
  query: IDataObject
) => {
  const { search, skip, limit, sort, ...restQuery } = query;
  const _skip = skip ? parseInt(skip as string) : 0;
  const _limit = limit ? parseInt(limit as string) : 0;
  const theQuery: IDataObject = {
    ...restQuery,
  };

  // check ascending or descending
  const isSortDESC = sort && typeof sort === 'string' && sort.startsWith('-');

  if (search) {
    const regex = new RegExp(search as string, 'i');
    // search not match
    theQuery['$or'] = [
      { name: { $regex: regex } },
      { subject: { $regex: regex } },
      { body: { $regex: regex } },
    ];
  }

  // If search, search category name as well
  let categories: ICategoryV2[] = [];
  if (search) {
    categories = await getCategories(userContext.org_id, {
      search: search as string,
    });
  }

  // GET ALL Tables
  const allTables = await getBoards(userContext.org_id);
  // total count
  const count = await emailTemplateRepository.countByOrganizationId(
    userContext.org_id,
    theQuery
  );

  const emailTemplateQuery = {
    ...theQuery,
    category: categories.length > 0
      ? { $in: categories.map((category) => category._id) }
      : undefined,
  };

  const emailTemplates = (
    await emailTemplateRepository.findByOrganizationId(
      userContext.org_id,
      emailTemplateQuery
    )
  ).map((emailTemplate) => {
    // map with category
    const category = categories.find(
      (category) => category._id === emailTemplate.category
    );
    if (category) {
      return {
        ...emailTemplate,
        category: {
          id: category._id,
          name: category.name,
        },
      };
    }
    return emailTemplate;
  });

  // add board name and sort by board name
  const emailTemplatesWithBoardName = emailTemplates.map((emailTemplate) => {
    const board = allTables.find(
      (board) => board._id === emailTemplate.board_id
    );
    if (board) {
      return {
        ...emailTemplate,
        board_name: board.name,
      };
    }
    return emailTemplate;
  });

  // sort by board name
  const sortedEmailTemplates = emailTemplatesWithBoardName.sort((a, b) => {
    // @ts-expect-error board_name is added by set
    const boardNameA = a['board_name'] as string;
    // @ts-expect-error board_name is added by set
    const boardNameB = b['board_name'] as string;
    // if !boardNameA, boardNameB is null, put it to the end
    if (!boardNameA) return 1;
    if (!boardNameB) return -1;
    if (isSortDESC) {
      return boardNameB.localeCompare(boardNameA);
    }
    return boardNameA.localeCompare(boardNameB);
  });

  return {
    emailTemplates:
      _limit > 0
        ? sortedEmailTemplates.slice(_skip, _skip + _limit)
        : sortedEmailTemplates,
    meta: {
      count,
      skip: _skip,
      limit: _limit,
      total: _limit > 0 ? Math.ceil(count / _limit) : 1,
      has_more: _skip + _limit !== 0 && _skip + _limit < count,
    },
  };
};
