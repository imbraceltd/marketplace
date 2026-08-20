import logger from '../../server/logging/logger';
/* eslint-disable no-case-declarations */
import { ErrorCode, handleServiceError } from '../../utils/error';
import IUserContext from '../domains/interface/userContext';
import { IEmailTemplate } from '../domains/interface/emailTemplate';
import { IDataObject } from '../domains/interface/types';
import _Error from '../../utils/error';
import IEmailSender from '../domains/interface/emailSender';

import { htmlToText } from 'html-to-text';

import { getBoards, searchRecords } from '../repositories/boards.repository';
import {
  getBoardById,
  createBoardField,
  updateBoardField,
} from '../repositories/boards.repository';
import { Field } from '../domains/interface/databoard';
import { getAllOrgMembers } from '../repositories/team_users';
import { EmailTemplateRepositoryFactory } from '../../infrastructure/repositories/factories/EmailTemplateRepositoryFactory';
import { EmailSenderRepositoryFactory } from '../../infrastructure/repositories/factories/EmailSenderRepositoryFactory';
import { AppRepositoryFactory } from '../../infrastructure/repositories/factories/AppRepositoryFactory';

// Create module-level repository instances
const emailTemplateRepository = EmailTemplateRepositoryFactory.create();
const emailSenderRepository = EmailSenderRepositoryFactory.create();
const appRepository = AppRepositoryFactory.create();

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
    if (!name) throw new _Error('Email name is required', 400);
    if (!subject) throw new _Error('Email subject is required', 400);
    if (!body) throw new _Error('Email body is required', 400);

    // validate email template
    const emailTemplate = await emailTemplateRepository.create(email);

    return emailTemplate;
  } catch (error) {
    throw handleServiceError(error);
  }
};
const getTemplateSortByBoardName = async (
  userContext: IUserContext,
  query: {
    [key: string]: any;
  }
) => {
  const { search, skip, limit, sort, ...restQuery } = query;
  const _skip = skip ? parseInt(skip as string) : 0;
  const _limit = limit ? parseInt(limit as string) : 0;

  // check ascending or descending
  const isSortDESC = sort && typeof sort === 'string' && sort.startsWith('-');

  // GET ALL Tables
  const allTables = await getBoards(userContext.org_id);

  // Get all templates for this organization
  const allTemplates = await emailTemplateRepository.findByOrganizationId(userContext.org_id);

  // Filter templates based on search
  let filteredTemplates = allTemplates;
  if (search) {
    const regex = new RegExp(search, 'i');

    filteredTemplates = allTemplates.filter((template) => {
      const matchesName = regex.test(template.name || '');
      const matchesSubject = regex.test(template.subject || '');
      const matchesBody = regex.test(template.body || '');

      return matchesName || matchesSubject || matchesBody;
    });
  }

  const count = filteredTemplates.length;

  // add board name and sort by board name
  const emailTemplatesWithBoardName = filteredTemplates.map((emailTemplate) => {
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
    const boardNameA = a['board_name'] as string;
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

export const getEmailTemplates = async (
  userContext: IUserContext,
  query: {
    [key: string]: any;
  }
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

    const isSortByBoardName =
      sort && typeof sort === 'string' && sort.indexOf('board') !== -1;

    if (isSortByBoardName) {
      return await getTemplateSortByBoardName(userContext, query);
    }

    // GET ALL Tables
    const allTables = await getBoards(userContext.org_id);

    // Get all templates for organization
    let emailTemplates = await emailTemplateRepository.findByOrganizationId(
      userContext.org_id
    );

    // Apply search and filter logic
    const regex = search ? new RegExp(search, 'i') : null;
    const titleRegex = search_title ? new RegExp(search_title, 'i') : null;
    const bodyRegex = search_body ? new RegExp(search_body, 'i') : null;

    emailTemplates = emailTemplates.filter((template) => {
      // Apply search filters
      if (search) {
        const matchesName = regex!.test(template.name || '');
        const matchesSubject = regex!.test(template.subject || '');
        const matchesBody = regex!.test(template.body || '');

        if (!matchesName && !matchesSubject && !matchesBody) {
          return false;
        }
      }

      // Apply title search
      if (search_title && !titleRegex!.test(template.name || '')) {
        return false;
      }

      // Apply body search
      if (search_body && !bodyRegex!.test(template.body || '')) {
        return false;
      }

      return true;
    });

    const count = emailTemplates.length;

    // Apply sorting
    let _sortBy: {
      [key: string]: -1 | 1 | 'asc' | 'ascending' | 'desc' | 'descending';
    } = {
      'category.category_name': 1,
    };

    if (sort && typeof sort === 'string' && sort.indexOf('board') === -1) {
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

    // Apply sorting manually
    const sortKey = Object.keys(_sortBy)[0];
    const sortOrder = _sortBy[sortKey] as -1 | 1;
    emailTemplates.sort((a, b) => {
      const aVal = a[sortKey] || '';
      const bVal = b[sortKey] || '';
      if (aVal < bVal) return sortOrder === 1 ? -1 : 1;
      if (aVal > bVal) return sortOrder === 1 ? 1 : -1;
      return 0;
    });

    // add board name
    emailTemplates.forEach((emailTemplate) => {
      const board = allTables.find(
        (board) => board._id === emailTemplate.board_id
      );
      if (board) {
        emailTemplate['board_name'] = board.name;
      }
    });

    // Apply pagination
    const paginatedTemplates = _limit > 0
      ? emailTemplates.slice(_skip, _skip + _limit)
      : emailTemplates;

    return {
      emailTemplates: paginatedTemplates,
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
      created_at: -1,
    };

    if (sort && typeof sort === 'string') {
      const sortWay = sort.startsWith('-') ? -1 : 1;
      const sortKey = sortWay === -1 ? sort.substring(1) : sort;

      _sortBy = {
        [sortKey]: sortWay,
      };
    }

    const _skip = skip ? parseInt(skip as string) : 0;
    const _limit = limit ? parseInt(limit as string) : 0;

    // Get all templates for organization
    let allEmailTemplates = await emailTemplateRepository.findByOrganizationId(
      userContext.org_id
    );

    // Apply field-specific filtering
    const regex = new RegExp(q as string, 'i');

    switch (field) {
      case 'name':
      case 'title':
        allEmailTemplates = allEmailTemplates.filter((email) =>
          regex.test(email.name || '')
        );
        break;
      case 'subject':
        allEmailTemplates = allEmailTemplates.filter((email) =>
          regex.test(email.subject || '')
        );
        break;
      case 'body':
        allEmailTemplates = allEmailTemplates.filter((email) =>
          regex.test(email.body || '')
        );
        break;
      case 'content':
        allEmailTemplates = allEmailTemplates.filter((email) =>
          regex.test(email.subject || '') || regex.test(email.body || '')
        );
        break;
      case 'all':
        allEmailTemplates = allEmailTemplates.filter((email) =>
          regex.test(email.name || '') || regex.test(email.body || '')
        );
        break;
      default:
        allEmailTemplates = allEmailTemplates.filter((email) =>
          regex.test(email.name || '') ||
          regex.test(email.subject || '') ||
          regex.test(email.body || '')
        );
        break;
    }

    // Apply additional filtering for body/content search with HTML to text conversion
    if (field !== 'title' && field !== 'name' && field !== 'subject') {
      const filteredEmailTemplates = allEmailTemplates.filter((email) => {
        const plainTextBody = htmlToText(email.body, {
          wordwrap: false,
        });
        const cleanedBody = plainTextBody.replace(/\[https?:\/\/[^\]]+\]/g, '');

        return (
          (field === 'all' && regex.test(email.name || '')) ||
          regex.test(email.subject || '') ||
          (field === 'content' && regex.test(email.subject || '')) ||
          regex.test(cleanedBody)
        );
      });

      // Apply sorting
      filteredEmailTemplates.sort((a, b) => {
        const sortKey = Object.keys(_sortBy)[0];
        const sortOrder = _sortBy[sortKey] as -1 | 1;
        const aVal = a[sortKey] || '';
        const bVal = b[sortKey] || '';
        if (aVal < bVal) return sortOrder === 1 ? -1 : 1;
        if (aVal > bVal) return sortOrder === 1 ? 1 : -1;
        return 0;
      });

      const count = filteredEmailTemplates.length;
      const emailTemplates =
        _limit !== 0
          ? filteredEmailTemplates.slice(_skip, _skip + _limit)
          : filteredEmailTemplates;

      return {
        emailTemplates,
        meta: {
          count,
          skip: _skip,
          limit: _limit,
          total: _limit > 0 ? Math.ceil(count / _limit) : 1,
          has_more: _skip + _limit !== 0 && _skip + _limit < count,
        },
      };
    }

    // Apply sorting for name/title/subject searches
    allEmailTemplates.sort((a, b) => {
      const sortKey = Object.keys(_sortBy)[0];
      const sortOrder = _sortBy[sortKey] as -1 | 1;
      const aVal = a[sortKey] || '';
      const bVal = b[sortKey] || '';
      if (aVal < bVal) return sortOrder === 1 ? -1 : 1;
      if (aVal > bVal) return sortOrder === 1 ? 1 : -1;
      return 0;
    });

    const count = allEmailTemplates.length;
    const emailTemplates = allEmailTemplates
      .slice(_skip, _skip + _limit);

    return {
      emailTemplates,
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

    // Check if template belongs to the organization
    if (!emailTemplate || emailTemplate.organization_id !== org_id) {
      return null;
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

    if (!current || current.organization_id !== org_id)
      throw new _Error('Email template not found', 404);

    const newCome = {
      ...current,
      ...email,
      updated_at: new Date(),
    };

    if (newCome.category === '') delete newCome.category;

    const emailTemplate = await emailTemplateRepository.update(emailTemplateId, newCome);

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

    if (!current || current.organization_id !== org_id)
      throw new _Error('Email template not found', 404);

    const emailTemplate = await emailTemplateRepository.delete(emailTemplateId);

    return emailTemplate;
  } catch (error) {
    throw handleServiceError(error);
  }
};

/**
 * EMAIL SENDER
 */

export const createEmailSender = async (
  userContext: IUserContext,
  emailSender: IEmailSender
) => {
  try {
    const org_id = userContext.org_id;

    if (!org_id) throw new _Error('Organization id is required', 401);
    emailSender.organization_id = org_id;

    const { email, user_id } = emailSender;
    if (!email) throw new _Error('Email sender email is required', 400);
    if (!validateEmail(email))
      throw new _Error('Email sender email is invalid', 400);

    if (!user_id) throw new _Error('User id is required', 400);

    // create email sender
    const emailSenderCreated = await emailSenderRepository.create(emailSender);

    return emailSenderCreated;
  } catch (error) {
    throw handleServiceError(error);
  }
};

export const getEmailSenders = async (
  userContext: IUserContext,
  query: IDataObject
) => {
  try {
    // build query
    const { search, skip, limit, ...restQuery } = query;
    const _skip = skip ? parseInt(skip as string) : 0;
    const _limit = limit ? parseInt(limit as string) : 0;

    // Get all email senders for organization
    let emailSenders = await emailSenderRepository.findByOrganizationId(
      userContext.org_id
    );

    // Filter out deleted senders
    emailSenders = emailSenders.filter((sender) => !sender.deleted_at);

    // Apply search filter
    if (search) {
      const searchRegex = new RegExp(search, 'i');
      emailSenders = emailSenders.filter((sender) =>
        searchRegex.test(sender.email || '') ||
        searchRegex.test(sender.title || '') ||
        searchRegex.test(sender.description || '')
      );
    }

    // Check if need to sync email sender with org users
    const emailSenderWithOutUserIdCount = emailSenders.filter(
      (sender) => !sender.user_id
    ).length;

    if (emailSenderWithOutUserIdCount > 0) {
      logger.info(
        `Sender count: ${emailSenderWithOutUserIdCount}\n Sync email sender with org users`
      );
      await syncEmailSenderWithOrgUsers(userContext);
      // Refresh email senders after sync
      emailSenders = await emailSenderRepository.findByOrganizationId(
        userContext.org_id
      );
      emailSenders = emailSenders.filter((sender) => !sender.deleted_at);
    } else {
      logger.info('No need to sync email sender with org users');
    }

    // Get app which channel has channel_type: "email_sender"
    const apps = await appRepository.findByOrganizationId(userContext.org_id);
    const emailSenderApps = apps.filter((app) => {
      const channel = app.channel;
      return channel && channel.channel_type === 'email_sender';
    });

    // Apply pagination
    const paginatedEmailSenders = _limit > 0
      ? emailSenders.slice(_skip, _skip + _limit)
      : emailSenders;

    // filter in-use email senders
    const emailSenderFiltered = paginatedEmailSenders.map((emailSender) => {
      const app = emailSenderApps.find((app) => {
        const channel = app.channel;
        return channel && channel.id === (emailSender.id || emailSender._id);
      });

      const inUse = app ? true : false;
      const app_id = app ? (app.id || app._id) : undefined;
      return {
        ...emailSender,
        in_use: inUse,
        app_id,
        user_progress: app ? app.user_progress : undefined,
      };
    });

    return emailSenderFiltered;
  } catch (error) {
    throw handleServiceError(error);
  }
};

export const getEmailSenderById = async (
  userContext: IUserContext,
  emailSenderId: string
) => {
  try {
    // validate email sender
    if (!emailSenderId || emailSenderId === '')
      throw new _Error('Email sender id is required', 400);

    const org_id = userContext.org_id;
    if (!org_id) throw new _Error('Organization id is required', 401);

    const emailSender = await emailSenderRepository.findById(emailSenderId);

    // Check if sender belongs to the organization
    if (!emailSender || emailSender.organization_id !== org_id) {
      return null;
    }

    return emailSender;
  } catch (error) {
    throw handleServiceError(error);
  }
};

export const updateEmailSender = async (
  userContext: IUserContext,
  emailSenderId: string,
  emailSender: IEmailSender
) => {
  try {
    // validate email sender
    if (!emailSenderId || emailSenderId === '')
      throw new _Error('Email sender id is required', 400);

    const org_id = userContext.org_id;
    if (!org_id) throw new _Error('Organization id is required', 401);

    const { title, description, email, user_id } = emailSender;
    const current = await emailSenderRepository.findById(emailSenderId);

    if (!current || current.organization_id !== org_id)
      throw new _Error('Email sender not found', 404);

    const newCome = {
      ...current,
      user_id,
    };
    if (title) newCome.title = title;
    if (description) newCome.description = description;
    if (email) {
      if (!validateEmail(email))
        throw new _Error('Email sender email is invalid', 400);
      newCome.email = email;
    }

    const emailSenderUpdated = await emailSenderRepository.update(
      emailSenderId,
      newCome
    );

    return emailSenderUpdated;
  } catch (error) {
    throw handleServiceError(error);
  }
};

export const deleteEmailSender = async (
  userContext: IUserContext,
  emailSenderId: string
) => {
  try {
    // validate email sender
    if (!emailSenderId || emailSenderId === '')
      throw new _Error('Email sender id is required', 400);

    const org_id = userContext.org_id;
    if (!org_id) throw new _Error('Organization id is required', 401);

    const current = await emailSenderRepository.findById(emailSenderId);

    if (!current || current.organization_id !== org_id)
      throw new _Error('Email sender not found', 404);

    const emailSender = await emailSenderRepository.delete(emailSenderId);

    return emailSender;
  } catch (error) {
    throw handleServiceError(error);
  }
};

export const validateEmail = (email: string) => {
  const re = /^[a-zA-Z\d._%-]+@[[a-zA-Z\d.\-@]+\.[a-zA-Z]{2,4}$/;
  return re.test(email);
};

export const handleSubscription = async (body: {
  app_id: string;
  email: string;
  subscribe?: boolean;
  source?: string;
}) => {
  try {
    const { app_id, email, source = 'Whatsapp', subscribe = true } = body;
    if (!app_id) throw new _Error('App id is required', 400);
    const emailRegex = /^[a-zA-Z\d._%-]+@[[a-zA-Z\d.\-@]+\.[a-zA-Z]{2,4}$/;
    if (!email || !email.match(emailRegex))
      throw new _Error('Email is required', 400);
    const app = await _getAppById(body.app_id);
    if (!app) throw new _Error('App not found', 404);

    const EMAIL_CAMPAIGN_TABLE = 'Email Campaign';

    const emailCampaignBoard = Object.keys(app.data_board).find(
      (boardId) => app.data_board[boardId].board_name === EMAIL_CAMPAIGN_TABLE
    );

    if (!emailCampaignBoard) throw new _Error('Email campaign not found', 404);

    // Search for email
    const boardDetails = app.data_board[emailCampaignBoard];

    const emailField = boardDetails.fields.find(
      (field) => field.name === 'Email'
    );

    if (!emailField) throw new _Error('Email field not found', 404);

    const subscriptionField = boardDetails.fields.find(
      (field) => field.name === 'Subscription'
    );

    if (!subscriptionField)
      throw new _Error('Subscription field not found', 404);

    const subscribedDate = boardDetails.fields.find(
      (field) => field.name === 'Subscribed Date'
    );

    if (!subscribedDate)
      throw new _Error('Subscribed Date field not found', 404);

    const sourceField = boardDetails.fields.find(
      (field) => field.name === 'Source'
    );

    if (!sourceField) throw new _Error('Source field not found', 404);
    const { message, success } = await searchRecords(emailCampaignBoard, {
      limit: 20,
      matchingStrategy: 'all',
      offset: 0,
      // filter: "fields.65b9ca3e1d547dade48cec23 = 'khonggo@gmail.com'",
      filter: `fields.${emailField._id} = '${email}'`,
    });

    if (!success) throw new _Error(message, 500);

    // if subscribe and message is empty, create new record
    if (message.hits.length === 0) {
      const fields = [
        {
          board_field_id: emailField._id as string,
          value: email,
        },
        {
          board_field_id: subscriptionField._id as string,
          value: subscribe ? 'Subscribed' : 'Unsubscribed',
        },
        {
          board_field_id: subscribedDate._id as string,
          value: new Date().toISOString(),
        },
        {
          board_field_id: sourceField._id as string,
          value: source || 'Whatsapp',
        },
      ];

      return await createBoardField(emailCampaignBoard, fields);
    }

    // update record
    if (message.hits.length != 0) {
      const record = message.hits[0];
      const fields = [
        {
          key: subscriptionField._id as string,
          value: subscribe ? 'Subscribed' : 'Unsubscribed',
        },
      ];

      return await updateBoardField(emailCampaignBoard, record._id, fields);
    }

    throw new _Error('Email not found', 404);
  } catch (error) {
    throw handleServiceError(error);
  }
};

export const handleSubscriptionV2 = async (body: {
  app_id: string;
  email: string;
  opt_in?: boolean;
  source?: string;
}) => {
  try {
    const { email, source, opt_in: subscribe = true, app_id } = body;
    if (!app_id) throw new _Error('App id is required', 400);

    const app = await _getAppById(body.app_id);
    if (!app) {
      throw new _Error('App not found', 404, ErrorCode.app_not_found);
    }

    const emailRegex = /^[a-zA-Z\d._%-]+@[[a-zA-Z\d.\-@]+\.[a-zA-Z]{2,4}$/;
    if (!email || !email.match(emailRegex))
      throw new _Error('Email is required', 400, ErrorCode.missing_email);

    const CONTACTS_TABLE = 'Contacts';

    const allBoards = await getBoards(app.organization_id);

    const contactsDataboard = allBoards.find(
      (board) => board.name === CONTACTS_TABLE
    );

    if (!contactsDataboard)
      throw new _Error('Contacts Data Board not found', 404);

    const emailField = contactsDataboard.fields.find(
      (field) => field.name === 'Email'
    );

    if (!emailField) throw new _Error('Email field not found', 404);

    const subscriptionField = contactsDataboard.fields.find(
      (field) => field.name === 'Opt-Out Status'
    );

    if (!subscriptionField)
      throw new _Error('Subscription field not found', 404);

    const sourceField = contactsDataboard.fields.find(
      (field) => field.name === 'Origin'
    );

    // identifier
    const identifierField = contactsDataboard.fields.find(
      (field) => field.is_identifier === true
    );
    if (!identifierField) throw new _Error('Identifier field not found', 404);

    const { message, success } = await searchRecords(
      contactsDataboard._id as string,
      {
        limit: 20,
        matchingStrategy: 'all',
        offset: 0,
        // filter: "fields.65b9ca3e1d547dade48cec23 = 'khonggo@gmail.com'",
        filter: `fields.${emailField._id} = '${email}'`,
      }
    );

    if (!success) throw new _Error(message, 500);

    if (message.hits.length === 0 && !subscribe) {
      throw new _Error(
        `Email not found`,
        400,
        ErrorCode.email_opt_out_not_found
      );
    }

    // if subscribe and message is empty, create new record
    if (message.hits.length === 0) {
      const fields = [
        {
          board_field_id: emailField._id as string,
          value: email,
        },
        {
          board_field_id: subscriptionField._id as string,
          value: subscribe ? 'Opt-in' : 'Opt-out',
        },
        {
          board_field_id: identifierField._id as string,
          value: email,
        },
      ];

      if (source && source !== "" && sourceField) {
        fields.push({
          board_field_id: sourceField._id as string,
          value: source,
        });
      }

      return await createBoardField(contactsDataboard._id as string, fields);
    }

    // update record
    if (message.hits.length != 0) {
      const record = message.hits[0];
      const fields = [
        {
          key: subscriptionField._id as string,
          value: subscribe ? 'Opt-in' : 'Opt-out',
        },
      ];

      return await updateBoardField(
        contactsDataboard._id as string,
        record._id,
        fields
      );
    }

    throw new _Error('Email not found', 404);
  } catch (error) {
    throw handleServiceError(error);
  }
};

const _getAppById = async (id: string) => {
  try {
    const app = await appRepository.findById(id);
    if (!app) {
      throw new _Error('App not found', 400);
    }

    return {
      ...app,
      data_board: {},
      webhook_id: '',
    };
  } catch (error) {
    throw handleServiceError(error);
  }
};

export const getOrgUserList = async (userContext: IUserContext) => {
  try {
    const users = await getAllOrgMembers(userContext.org_id);
    const emailSenders = await emailSenderRepository.findByOrganizationId(
      userContext.org_id
    );

    // filter out: remove users that are already email senders
    const filteredUsers = users.filter((user) => {
      return !emailSenders.find(
        (emailSender) => emailSender.user_id === (user._id || user.id)
      );
    });

    // is_bot must be false
    return filteredUsers.filter((user) => !user.is_bot);
  } catch (error) {
    throw handleServiceError(error);
  }
};

export const syncEmailSenderWithOrgUsers = async (
  userContext: IUserContext
) => {
  try {
    const users = await getAllOrgMembers(userContext.org_id);
    let emailSenders = await emailSenderRepository.findByOrganizationId(
      userContext.org_id
    );

    // Filter out deleted senders
    emailSenders = emailSenders.filter((sender) => !sender.deleted_at);

    // Update matched email senders
    const emailSenderPromises = emailSenders.map(async (emailSender) => {
      if (emailSender.user_id) return emailSender;
      const user = users.find((user) => user.email === emailSender.email);

      // if user not found, delete email sender by marking deleted_at
      if (!user) {
        return emailSenderRepository.update(
          emailSender.id || emailSender._id,
          {
            ...emailSender,
            deleted_at: new Date(),
          }
        );
      }

      // Update with user_id
      return emailSenderRepository.update(
        emailSender.id || emailSender._id,
        {
          ...emailSender,
          user_id: user._id || user.id,
        }
      );
    });

    return await Promise.all(emailSenderPromises);
  } catch (error) {
    throw handleServiceError(error);
  }
};
