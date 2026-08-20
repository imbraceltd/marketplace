import logger from '../../server/logging/logger';
import _Error, { ErrorCode, handleServiceError } from '../../utils/error';
import { IQuery } from '../domains/interface/IQuery';
import IUserContext from '../domains/interface/userContext';
import { IDataObject } from '../domains/interface/types';
import {
  Form,
  Field,
  notAllowToOverrideFields,
  generateBoardTemplateForForm,
  FormSubmitData,
} from '../domains/interface/form';
import {
  checkDuplicate,
  createOrUpdateBoardV2,
  createRecord,
  getBoardById,
  getBoards,
  updateBoard,
} from '../repositories/boards.repository';
import {
  BoardItem,
  BoardSchema,
  CreateFieldPayload,
  Journey,
} from '../domains/interface/databoard';
import {
  FormOwner,
  SubmissionSource,
  SubmissionTime,
  templateForm,
  UTM,
} from '../repositories/form.repository';
import {
  getTeamById,
  getTeamsByOrgId,
  getUserInfo,
} from '../repositories/team_users';
import { getOrgInfo } from '../repositories/account.repository';
import { v4 as uuid } from 'uuid';

import kafka from '../../kafka';
import { TOPIC_OUTGOING_MESSAGE } from '../../kafka/constant';
import { IApp } from '../domains/interface/app';
import { FormRepositoryFactory } from '../../infrastructure/repositories/factories/FormRepositoryFactory';
import { AppRepositoryFactory } from '../../infrastructure/repositories/factories/AppRepositoryFactory';

// Create module-level repository instances
const formRepository = FormRepositoryFactory.create();
const appRepository = AppRepositoryFactory.create();

export const CONTACT_TABLE_NAME = 'Contacts';

export interface I_ACL {
  teams?: {
    team_id: string;
    team_name: string;
  }[];
  owner?: {
    user_id: string;
    user_name: string;
  };
}

export const searchForms = async (
  userContext: IUserContext,
  query?: IQuery
) => {
  try {
    const { org_id, user_id } = userContext;
    if (!org_id || !user_id) {
      throw new _Error('Unauthorized', 401);
    }

    query = query || {};
    const { app_id, search, skip, limit, ...restQuery } = query as IQuery;

    const _skip = skip ? parseInt(skip as string) : 0;
    const _limit = limit ? parseInt(limit as string) : 0;

    let userInfo = null;
    try {
      userInfo = await getUserInfo(org_id, userContext.user_id as string);
    } catch (e) {
      logger.error('Error fetching userInfo in searchForms:', e);
    }
    const teamIds = userInfo ? userInfo.team.map((t) => t.team_id) : [];

    // final query
    const theQuery: IDataObject = {
      ...(app_id && { app_id }),
      organization_id: org_id,
      ...restQuery,

      // not is_system
      is_system: { $ne: true },

      // All form in teamIds
      // All form has undefined teams
      // All form has undefined owner
      // All form that created_by user_id || undefined
      // All form that owner.user_id === user_id
      $or: [
        // teams in teamIds
        {
          teams: {
            $elemMatch: {
              team_id: {
                $in: teamIds,
              },
            },
          },
        },
        // teams is []
        { teams: { $size: 0 } },
        { teams: { $exists: false } },
        { owner: { $exists: false } },
        // owner is null
        { owner: null },
        { created_by: user_id },
        { 'owner.user_id': user_id },
      ],
    };

    if (search) {
      theQuery.$or = [
        { name: { $regex: search, $options: 'i' } },
        { description: { $regex: search, $options: 'i' } },
        { board_name: { $regex: search, $options: 'i' } },
      ];
    }

    const forms = await formRepository.search(org_id, {
      ...theQuery,
      skip: _skip,
      limit: _limit,
      search,
    });

    // Filter forms to match ACL rules and search criteria
    let filteredForms = forms;
    if (Array.isArray(forms)) {
      filteredForms = forms.filter((form) => {
        // Filter is_system: false
        if (form.is_system === true) return false;

        // Apply search filter
        if (search) {
          const searchLower = search.toLowerCase();
          return (
            form.name?.toLowerCase().includes(searchLower) ||
            form.description?.toLowerCase().includes(searchLower) ||
            form.board_name?.toLowerCase().includes(searchLower)
          );
        }

        // Apply ACL filter
        const hasTeamAccess =
          form.teams &&
          form.teams.some((t: any) =>
            teamIds.includes(t.team_id || t.id)
          );
        const hasNoTeams = !form.teams || form.teams.length === 0;
        const hasNoOwner = !form.owner;
        const isCreatedByUser = form.created_by === user_id;
        const isOwnedByUser = form.owner?.user_id === user_id;

        return (
          hasTeamAccess ||
          hasNoTeams ||
          hasNoOwner ||
          isCreatedByUser ||
          isOwnedByUser
        );
      });

      // Filter out system fields
      filteredForms = filteredForms.map((form) => ({
        ...form,
        fields: form.fields
          ? form.fields.filter((f: any) => !f.is_system)
          : [],
      }));
    }

    // For pagination, assume repository returns all matching records
    // We'll handle sorting and pagination in memory
    const sorted = filteredForms.sort((a: any, b: any) => {
      // Sort by is_active descending, then by updated_at descending
      if ((a.is_active || false) !== (b.is_active || false)) {
        return (b.is_active ? 1 : 0) - (a.is_active ? 1 : 0);
      }
      return (
        new Date(b.updated_at || 0).getTime() -
        new Date(a.updated_at || 0).getTime()
      );
    });

    const total = sorted.length;
    if (_limit > 0) {
      const paginatedForms = sorted.slice(_skip, _skip + _limit);
      return {
        total,
        limit: _limit,
        skip: _skip,
        has_more: _skip + _limit < total,
        data: paginatedForms,
      };
    }

    return { data: sorted };
  } catch (error) {
    throw handleServiceError(error);
  }
};

export const createForm = async (userContext: IUserContext, form: Form) => {
  try {
    const { org_id, user_id } = userContext;
    if (!org_id || !user_id) {
      throw new _Error('Unauthorized', 401);
    }

    const { app_id } = form;
    if (!app_id) {
      throw new _Error('App ID is required', 400, ErrorCode.missing_app_id);
    }

    // Validate app, form name, and fields
    const [app, templateForm, acl, contactDataBoard] = await Promise.all([
      appRepository.findById(app_id),
      form.extended_from
        ? formRepository.findById(form.extended_from)
        : null,
      _acl(org_id, form),
      _findContactBoard(org_id),
    ]);

    // Verify app belongs to organization
    if (app && app.organization_id !== org_id) {
      throw new _Error('App not found', 404, ErrorCode.not_found);
    }

    // Verify template form belongs to organization
    if (templateForm && templateForm.organization_id !== org_id) {
      throw new _Error('Template form not found', 404, ErrorCode.template_form_not_found);
    }

    // Validate app, contact data board, form name, and fields
    if (!app) {
      throw new _Error('App not found', 404, ErrorCode.not_found);
    }
    if (!contactDataBoard) {
      throw new _Error(
        'Contact data board not found',
        404,
        ErrorCode.not_found
      );
    }
    if (!form.name) {
      throw new _Error(
        'Form name is required',
        400,
        ErrorCode.missing_form_name
      );
    }
    if (!form.fields || form.fields.length === 0) {
      throw new _Error(
        'Form fields are required',
        400,
        ErrorCode.invalid_request
      );
    }
    if (form.extended_from && !templateForm) {
      throw new _Error(
        'Template form not found',
        404,
        ErrorCode.template_form_not_found
      );
    }

    // Set up form data
    form.teams = acl.teams;
    form.owner = acl.owner;
    form.organization_id = org_id;
    form.created_by = user_id;
    form._id = form._id || uuid();

    // Sync databoard
    const dataBoard = await _syncDataboard(
      { ...userContext, acl },
      // Journey
      {
        id: app_id,
        name: (app.title as string) || 'App',
        type: (app.product_code as string) || 'customized_app',
        extra: { form_id: form._id, form_name: form.name },
      },
      form,
      templateForm as Form
    );

    // Update form with databoard info
    form.data_board_id = dataBoard._id as string;
    form.contact_board_id = contactDataBoard._id as string;
    form.board_name = form.board_name || form.name;

    // Update form fields
    form.fields = form.fields.map((field) => {
      const matchedField = dataBoard.fields.find((f) => f.name === field.name);
      return {
        ...field,
        field_name: field.name.toString().toLowerCase().replace(/ /g, '_'),
        field_id: matchedField?._id as string,
        settings: matchedField?.settings,
      };
    });

    // Create form
    const newForm = await formRepository.create(form);

    // Update contact field map with new form field IDs
    const contactFieldMap = _createContactFieldMap(contactDataBoard, newForm);

    // Update form with contact field map
    const finalForm = await formRepository.update(newForm._id || newForm.id, {
      ...newForm,
      map_to_contact: new Map(Object.entries(contactFieldMap)),
    });

    return finalForm
      ? {
        ...finalForm,
        fields: finalForm.fields ? finalForm.fields.filter((field: any) => !field.is_system) : [],
      }
      : null;
  } catch (error) {
    throw handleServiceError(error);
  }
};

export const updateForm = async (
  userContext: IUserContext,
  form_id: string,
  form: Partial<
    Form & {
      teams: string[];
    }
  >
) => {
  try {
    const { org_id } = userContext;

    const formInDb = await formRepository.findById(form_id);

    if (!formInDb || formInDb.organization_id !== org_id) {
      throw new _Error('Form not found', 404, ErrorCode.not_found);
    }

    const app = await appRepository.findById(formInDb.app_id);

    if (!app || app.organization_id !== org_id) {
      throw new _Error('App not found', 404, ErrorCode.not_found);
    }

    // Can update data
    const canUpdateData: Partial<Form> & {
      [key: string]: IDataObject;
    } = {};
    Object.keys(form).forEach((key) => {
      if (!notAllowToOverrideFields.includes(key)) {
        // @ts-expect-error : don't know how to fix this
        const value = form[key];
        canUpdateData[key] = value;
      }
    });

    if (canUpdateData.fields) {
      canUpdateData.fields = canUpdateData.fields.map((field) => {
        const matchedField = formInDb.fields.find((f) => f.name === field.name);
        return {
          ...field,
          field_id: matchedField?._id as string,
          settings: matchedField?.settings,
        };
      });
    }
    const acl = await _acl(org_id, form);

    canUpdateData.teams = acl.teams;
    canUpdateData.owner = acl.owner;

    const upcomingForm = {
      ...formInDb,
      ...canUpdateData,
      updated_at: new Date(),
    };

    // sync databoard
    const board = await _syncDataboard(
      {
        ...userContext,
        acl,
      },
      // Journey
      {
        id: app._id as string,
        name: app.title as string,
        type: app.product_code as string,
        extra: {
          form_id: form_id,
          form_name: formInDb.name,
        },
      },
      upcomingForm,
      formInDb
    );

    const contactDataBoard = await _findContactBoard(org_id);
    if (!contactDataBoard) {
      throw new _Error(
        'Contact data board not found',
        404,
        ErrorCode.not_found
      );
    }

    // decorate form field.field_id with board field._id
    upcomingForm.fields.forEach((field) => {
      const matchedField = board.fields.find((f) => f.name === field.name);
      if (matchedField) {
        field.field_id = matchedField._id as string;
        field.settings = matchedField.settings;
        field.field_name = field.name
          .toString()
          .toLowerCase()
          .replace(/ /g, '_'); // this is used for form name
      }
    });

    // decorate settings from Contact board fields
    upcomingForm.fields.forEach((field) => {
      const matchedField = contactDataBoard.fields.find(
        (f) => f.name === field.name
      );
      if (matchedField) {
        field.settings = matchedField.settings;
      }
    });

    // Update form with upcoming data
    const updatedFormStep1 = await formRepository.update(form_id, upcomingForm);

    if (!updatedFormStep1) {
      throw new _Error('Form not found', 404, ErrorCode.not_found);
    }

    // sync map_to_contact
    const contactFieldMap: { [key: string]: string } = _createContactFieldMap(
      contactDataBoard,
      updatedFormStep1
    );

    // update form.map_to_contact with field._id: contact_field_id
    const updatedFormStep2 = await formRepository.update(form_id, {
      ...updatedFormStep1,
      map_to_contact: new Map(Object.entries(contactFieldMap)),
      contact_board_id: contactDataBoard._id as string,
    });

    let returnedForm = null;
    if (updatedFormStep2) {
      const _fields = updatedFormStep2.fields
        ? updatedFormStep2.fields.filter((field: any) => !field.is_system)
        : [];
      returnedForm = {
        ...updatedFormStep2,
        fields: _fields,
      };
    }

    return returnedForm;
  } catch (error) {
    throw handleServiceError(error);
  }
};

export const deleteForm = async (
  userContext: IUserContext,
  form_id: string
) => {
  try {
    const { org_id } = userContext;
    if (!org_id) {
      throw new _Error('Unauthorized', 401);
    }

    const form = await formRepository.findById(form_id);

    if (!form || form.organization_id !== org_id) {
      throw new _Error('Form not found', 404, ErrorCode.not_found);
    }

    const boardId = form.data_board_id;

    await formRepository.delete(form_id);

    // check if any form is using this board
    const allForms = await formRepository.findByOrganizationId(org_id);
    const allFormUsingThisBoards = allForms.filter(
      (f: any) => f.data_board_id === boardId
    );

    if (allFormUsingThisBoards.length === 0) {
      // update board from 'System' to 'General' one

      const board = await getBoardById(org_id, boardId);

      if (!board) {
        logger.info('Board not found ===> Ignore');
      }

      // update board if current type 'System'
      if (board.type === 'System') {
        await updateBoard(org_id, boardId, {
          ...board,
          type: 'General',
          organization_id: org_id,
          close_default_field: true,
          journey: {
            id: board.journey?.id as string,
            name: board.journey?.name as string,
            type: board.journey?.type as string,
            extra: {},
          },
        });
      }
    }

    return { message: 'Form deleted' };
  } catch (error) {
    throw handleServiceError(error);
  }
};

export const getFormById = async (
  userContext: IUserContext,
  form_id: string
) => {
  try {
    const { org_id } = userContext;
    if (!org_id) {
      throw new _Error('Unauthorized', 401);
    }

    const form = await formRepository.findById(form_id);

    if (!form || form.organization_id !== org_id) {
      return null;
    }

    // remove field.is_system: true
    const cleanedFields = (form.fields || [])
      .filter((field: any) => !field.is_system)
      .map((field: any) => {
        const { is_system, ...rest } = field;
        return rest;
      });

    form.fields = cleanedFields;

    // Remove map_to_contact from response
    const { map_to_contact, ...returnForm } = form;

    return returnForm;
  } catch (error) {
    throw handleServiceError(error);
  }
};

export const getPublishedForm = async (id: string) => {
  try {
    const form = await formRepository.findById(id);

    if (!form || !form.is_active) {
      throw new _Error('Form not found', 404, ErrorCode.not_found);
    }

    // remove field.is_system: true
    const cleanedFields = (form.fields || [])
      .filter((field: any) => !field.is_system)
      .map((field: any) => {
        const { is_system, ...rest } = field;
        return rest;
      });

    // Return limited fields for public form
    const publicForm = {
      _id: form._id,
      id: form.id,
      name: form.name,
      description: form.description,
      fields: cleanedFields,
      header: form.header,
      sub_header: form.sub_header,
      footer: form.footer,
      banner_image: form.banner_image,
      submit_button_text: form.submit_button_text,
      use_captcha: form.use_captcha,
      app_id: form.app_id,
    };

    return publicForm;
  } catch (error) {
    throw handleServiceError(error);
  }
};

export const submit = async (
  data: FormSubmitData,
  form_id: string,
  userContext?: IUserContext
) => {
  try {
    const { public_id, mode: requestMode, data: submitData } = data;

    // There are 2 mode: _id, field_name
    // _id: use field._id to fill data which is harder for human reading
    // field_name: use field.field_name to fill data which is easier for human reading
    // this provide flexibility for user to fill form in different ways
    const mode = requestMode && requestMode === '_id' ? '_id' : 'field_name';

    if (!form_id && !public_id) {
      throw new _Error('Form ID is required', 400, ErrorCode.missing_form_id);
    }

    const form = await formRepository.findById(form_id);

    if (!form || !form.is_active) {
      throw new _Error('Form not found', 404, ErrorCode.not_found);
    }

    if (!form.is_active && !userContext) {
      throw new _Error('Form is not published', 400, ErrorCode.invalid_request);
    }

    const app = await appRepository.findById(form.app_id);

    if (!app) {
      throw new _Error('App not found', 404, ErrorCode.not_found);
    }

    if (!app.is_active) {
      throw new _Error('Form is not published', 400, ErrorCode.invalid_request);
    }

    // Fill data into boards
    const [contactRecord, dataRecord] = await Promise.all([
      _fillToContactBoard(
        form,
        submitData,
        mode,
        app as IApp
      ),
      _fillToDataBoard(form, submitData, mode),
    ]);

    // increase submitted_count
    const updatedForm = await formRepository.update(form._id || form.id, {
      ...form,
      submitted_count: (form.submitted_count || 0) + 1,
    });

    // Trigger workflow
    try {
      await _triggerWorkflow(form, contactRecord, dataRecord);
    } catch (error) {
      logger.error('Error while triggering workflow', error);
    }

    return {
      message: 'Form submitted',
      data: {
        contact_id: contactRecord._id,
        data_id: dataRecord._id,
      },
    };
  } catch (error) {
    throw handleServiceError(error);
  }
};

export const getDefaultForm = async () => {
  try {
    const form = templateForm();

    if (!form) {
      throw new _Error('Default form not found', 404, ErrorCode.not_found);
    }

    return form;
  } catch (error) {
    throw handleServiceError(error);
  }
};

export const getFormsByBoardId = async (
  userContext: IUserContext,
  boardId: string
) => {
  try {
    const { org_id } = userContext;
    if (!org_id) {
      throw new _Error('Unauthorized', 401);
    }

    const allForms = await formRepository.findByOrganizationId(org_id);
    const forms = allForms
      .filter((f: any) => f.data_board_id === boardId)
      .map((f: any) => ({
        _id: f._id || f.id,
        id: f.id || f._id,
        name: f.name,
      }));

    return forms;
  } catch (error) {
    throw handleServiceError(error);
  }
};

export const deleteAllForms = async (org_id: string) => {
  try {
    if (!org_id) {
      throw new _Error('Unauthorized', 401);
    }

    const forms = await formRepository.findByOrganizationId(org_id);

    const boardIds: string[] = forms.map((form: any) => form.data_board_id);

    if (boardIds.length > 0) {
      // update board from 'System' to 'General' one
      const boards = await getBoards(org_id);

      const updateList = boards.filter((board) => {
        return (
          boardIds.includes(board._id as string) && board.type === 'System'
        );
      });

      const updateBoards = updateList.map((board) => {
        return updateBoard(org_id, board._id as string, {
          name: board.name,
          type: 'General',
          organization_id: board.organization_id,
        });
      });

      await Promise.all(updateBoards);
    }

    // Delete all forms for this organization
    const deletePromises = forms.map((form: any) =>
      formRepository.delete(form._id || form.id)
    );
    await Promise.all(deletePromises);

    return { message: 'All forms deleted' };
  } catch (error) {
    throw handleServiceError(error);
  }
};

export const deleteTeamForms = async (team_id: string) => {
  try {
    // Get all forms that have this team
    const allForms = await formRepository.findByTeamId(team_id);
    const formIds = allForms.map((form: any) => form._id || form.id);

    // remove that team from forms
    const updateForms = allForms.map(async (form: any) => {
      let updatedTeams =
        form.teams && form.teams.filter((t: any) => (t.team_id || t.id) !== team_id);

      if (!updatedTeams || updatedTeams.length === 0) {
        // change team to General

        const allOrgTeams = await getTeamsByOrgId(form.organization_id);

        const generalTeam = allOrgTeams.find((t) => t.name === 'general');

        if (generalTeam) {
          updatedTeams = [
            {
              team_id: generalTeam.id as string,
              team_name: generalTeam.name,
            },
          ];
        }
      }

      // check if user still in team
      if (form.owner && form.owner.user_id) {
        const owner = await getUserInfo(
          form.organization_id,
          form.owner.user_id
        );

        if (!owner) {
          form.owner = undefined;
        } else {
          const isUserInTeam =
            updatedTeams &&
            updatedTeams.some((t: any) =>
              owner.team.find((ot) => (ot.team_id || ot.id) === (t.team_id || t.id))
            );

          if (
            // no owner.team inside form.team
            owner.team &&
            updatedTeams &&
            !isUserInTeam
          ) {
            form.owner = undefined;
          }
        }
      }

      return formRepository.update(form._id || form.id, {
        ...form,
        teams: updatedTeams,
        owner: form.owner,
      });
    });

    await Promise.all(updateForms);

    return formIds;
  } catch (error) {
    throw handleServiceError(error);
  }
};

/**
 * PRIVATE FUNCTIONS
 */

interface _UserContextWithAcl extends IUserContext {
  acl?: I_ACL;
}

const _syncDataboard = async (
  userContext: _UserContextWithAcl,
  journey: Journey,
  comingForm: Form,
  currentForm?: Form
): Promise<BoardSchema> => {
  let theForm: Form = comingForm;
  const { acl } = userContext;

  const team_ids = acl?.teams?.map((t) => t.team_id) || undefined;
  try {
    if (currentForm) {
      const templateForm = currentForm;

      if (!templateForm) {
        throw new _Error('Template form not found', 404, ErrorCode.not_found);
      }

      const unfilteredFields = comingForm.fields.map((f) => ({ ...f })); // clone fields

      // Need to create fields:
      // Not have: _id, field_name, name, is_default
      // Need: same name
      const needToCreateFields: Field[] = [];
      comingForm.fields.forEach((field, index) => {
        // If has has field_id
        if (
          field.field_id ||
          field._id ||
          field.field_name ||
          field.is_default
        ) {
          return;
        }

        // If same name
        if (templateForm.fields.find((f) => f.name === field.name)) {
          return;
        }

        needToCreateFields.push(field);
        // remove from comingFields
        unfilteredFields.splice(index, 1);
      });

      // Need to update fields
      // - not: is_default:true
      // - has as least: _id, field_name
      // - has different data
      const needToUpdateFields: Field[] = [];
      templateForm.fields.forEach((field, index) => {
        if (field.is_default) {
          // not allow to update those board fields
          return;
        }

        // find matched field
        const comingMatchedField = comingForm.fields.find(
          (f) => f._id === field._id || f.field_name === field.field_name
        );

        if (comingMatchedField) {
          let neededToUpdate = false;

          // map of current _id and value
          const dataHashSet: {
            [key: string]: string | undefined | null;
          } = {};

          field.data.forEach((d) => {
            const _id =
              d._id || d.value.toString().toLowerCase().replace(/ /g, '_');
            dataHashSet[_id] = d.value;
          });

          // keep all data from field
          // Add new data from comingMatchedField, but must not duplicate with field.data
          comingMatchedField.data.forEach((d) => {
            const _id =
              d._id || d.value.toString().toLowerCase().replace(/ /g, '_');
            const comingValue = d.value;
            if (!dataHashSet[_id] && comingValue !== dataHashSet[_id]) {
              neededToUpdate = true;
              field.data.push({
                _id,
                value: d.value,
              });
            }
          });

          if (neededToUpdate) {
            needToUpdateFields.push(field);
            unfilteredFields.splice(index, 1);
          }
        }
      });

      theForm = {
        ...comingForm,
        board_name: templateForm.board_name,
        board_id: templateForm.board_id,
        fields: [
          ...needToCreateFields,
          ...needToUpdateFields,
          ...unfilteredFields,
        ],
      };
    }

    // checking missing fields: "Name", "Submission Source", "Submission Time", "Owner"
    const requiredFields = [
      'Full Name',
      'Submission Source',
      'Submission Time',
      'Owner',
      'UTM',
    ];
    const missingFields = requiredFields.filter(
      (f) => !theForm.fields.find((field) => field.name === f)
    );

    // Make some fields in correct order
    if (missingFields.length > 0) {
      missingFields.forEach((f) => {
        if (f === 'Submission Source') {
          theForm.fields.splice(1, 0, SubmissionSource);
        } else if (f === 'Submission Time') {
          theForm.fields.splice(2, 0, SubmissionTime);
        } else if (f === 'Owner') {
          theForm.fields.push(FormOwner);
        } else if (f === 'UTM') {
          // After Name And Before Submission Source
          theForm.fields.splice(3, 0, UTM);
        }
      });
    }

    const comingBoard = generateBoardTemplateForForm(theForm, journey, true);

    // covert comingBoard field with is_default: true to currentForm field
    comingBoard.fields = comingBoard.fields.map((field) => {
      return {
        ...field,
        is_default: true,
      };
    });

    // Create or update fields
    const dataBoard = await createOrUpdateBoardV2(userContext.org_id, {
      ...comingBoard,
      team_ids,
    });

    return dataBoard;
  } catch (error) {
    throw handleServiceError(error);
  }
};

// Fill data into Contact board
const _contactFillableFields = [
  'name',
  'position',
  'company',
  'phone',
  'email',
  'location',
  'origin',
];

// Fill data into Data board
const _fillToContactBoard = async (
  form: Form,
  submitData: IDataObject,
  mode: '_id' | 'field_name',
  app: IApp
): Promise<BoardItem> => {
  try {
    logger.info('Mode', mode);
    // Fill data into Contact board
    const mappedFields = form.map_to_contact;
    const contactData: IDataObject = {};

    // Handle Name
    const nameFormField = form.fields.find(
      (f) => f.name === 'Name' || f.field_name === 'name'
    );

    if (nameFormField) {
      const nameToCheck = submitData[nameFormField[mode] as string];

      if (!nameToCheck) {
        // do check here
        throw new _Error('Name is required', 400, ErrorCode.missing_name);
      }
    }

    for (const [key, value] of mappedFields.entries()) {
      const fieldId = value as string;

      if (!fieldId || !submitData[key]) {
        continue;
      }

      contactData[fieldId] = submitData[key];
    }

    // Add source
    // --> Previous
    // contactData[
    //   form.map_to_contact.get('origin') as string
    // ] = `Form Management - ${form.name}`;

    contactData[form.map_to_contact.get('origin') as string] = {
      type: 'journey',
      data: {
        id: app._id,
        name: app.title,
        type: app.product_code,
      },
    };

    // Add position
    const positionFieldId = form.map_to_contact.get('position') ? form.map_to_contact.get('position') : form.map_to_contact.get('title');
    if (!positionFieldId) {
      const positionField = form.fields.find(
        (f) => f.name === 'title' || f.name === 'position'
      );

      if (positionField) {
        contactData[positionField.field_id as string] =
          submitData[positionField[mode] as string];
      }
    }

    // handle duplicate check phone and email
    // - phone
    const phoneFormField = form.fields.find(
      (f) => f.name === 'Phone' || f.field_name === 'phone'
    );

    if (phoneFormField) {
      const phoneToCheck = submitData[phoneFormField[mode] as string];
      const _id = phoneFormField['_id'] as string;
      const contactBoardPhoneFieldId = mappedFields.get(_id.toString());
      const phone =
        // @ts-expect-error : don't know how to fix this
        phoneToCheck && (phoneToCheck['calling_code_with_number'] as string);

      const { exists: isPhoneExist, data } = await checkDuplicate(
        form.contact_board_id,
        {
          limit: 1,
          q: '',
          matchingStrategy: 'all',
          offset: 0,
          filter: `fields.${contactBoardPhoneFieldId}.calling_code_with_number = '${phone}'`,
        }
      );

      if (isPhoneExist) {
        return data as BoardItem;
      }
    }

    // - email
    const emailFormField = form.fields.find(
      (f) => f.name === 'Email' || f.field_name === 'email'
    );

    if (emailFormField) {
      const emailToCheck = submitData[emailFormField[mode] as string];
      const contactBoardEmailFieldId = mappedFields.get(
        emailFormField['_id']?.toString() as string
      );
      if (emailToCheck) {
        // do check here
        const { exists: isEmailExist, data } = await checkDuplicate(
          form.contact_board_id,
          {
            limit: 1,
            q: '',
            matchingStrategy: 'all',
            offset: 0,
            filter: `fields.${contactBoardEmailFieldId} = '${emailToCheck}'`,
          }
        );

        if (isEmailExist) {
          return data as BoardItem;
        }
      }
    }

    const createRecordPayload: CreateFieldPayload[] = Object.keys(
      contactData
    ).map((fieldId) => {
      return {
        board_field_id: fieldId,
        value: contactData[fieldId],
      };
    });
    const record = await createRecord(
      form.contact_board_id,
      createRecordPayload
    );

    return record;
  } catch (error) {
    throw handleServiceError(error);
  }
};

// Fill data into Data board
const _fillToDataBoard = async (
  form: Form,
  submitData: IDataObject,
  mode: '_id' | 'field_name'
): Promise<BoardItem> => {
  // Fill data into Data board
  try {
    const createRecordPayload: CreateFieldPayload[] = [];

    // data board
    const dataBoard = await getBoardById(
      form.organization_id,
      form.data_board_id
    ); // get data board

    form.fields.forEach((field) => {
      if (!submitData[field[mode] as string]) {
        return;
      }

      createRecordPayload.push({
        board_field_id: field.field_id as string,
        value: submitData[field[mode] as string],
      });
    });

    // decorate submit data with:
    // - Submission Source
    const sourceField = dataBoard.fields.find(
      (f) => f.name === 'Submission Source'
    );

    if (sourceField) {
      createRecordPayload.push({
        board_field_id: sourceField._id as string,
        value: `Form Management - ${form.name}`,
      });
    }

    // - Submission Time
    const timeField = dataBoard.fields.find(
      (f) => f.name === 'Submission Time'
    );

    if (timeField) {
      createRecordPayload.push({
        board_field_id: timeField._id as string,
        value: new Date().toISOString(),
      });
    }

    // - Owner
    const ownerField = dataBoard.fields.find((f) => f.name === 'Form Owner');

    if (ownerField && form.owner?.user_id) {
      createRecordPayload.push({
        board_field_id: ownerField._id as string,
        value: form.owner?.user_id,
      });
    }

    const record = await createRecord(form.data_board_id, createRecordPayload);

    return record;
  } catch (error) {
    throw handleServiceError(error);
  }
};

// find Contact board
const _findContactBoard = async (org_id: string) => {
  const boards = await getBoards(org_id);
  return boards.find((board) => board.type === 'Contacts');
};

// trigger workflow
const _triggerWorkflow = async (
  form: Form,
  contactRecord: BoardItem,
  dataRecord: BoardItem
) => {
  try {
    const org_id = form.organization_id;

    // Get Org info
    const orgInfo = await getOrgInfo(org_id);

    const partition = orgInfo.partition || 0;

    const app = await appRepository.findById(form.app_id);

    if (!app || app.organization_id !== org_id) {
      throw new _Error('App not found', 404, ErrorCode.not_found);
    }

    const message = {
      partition,
      value: JSON.stringify({
        app_id: app._id || app.id,
        workflow_id: app.workflow_id,
        contactRecord,
        dataRecord,
      }),
    };

    // Trigger workflow
    await kafka.send(TOPIC_OUTGOING_MESSAGE, [message]);
  } catch (error) {
    throw handleServiceError(error);
  }
};

const _acl = async (org_id: string, form: Partial<Form>) => {
  let _teams:
    | Array<{
      team_id: string;
      team_name: string;
    }>
    | undefined = undefined;
  if (form.teams && form.teams.length > 0) {
    // decorate team with team_name
    const teams = await Promise.all(
      form.teams.map((t) => getTeamById(org_id, t.team_id))
    );

    _teams = teams.map((team) => {
      if (!team) {
        throw new _Error('Team not found', 404, ErrorCode.team_not_found);
      }

      return {
        team_id: team.id as string,
        team_name: team.name,
      };
    });
  }

  let _owner:
    | {
      user_id: string;
      user_name: string;
    }
    | undefined = undefined;
  if (form.owner && form.owner.user_id) {
    const owner = await getUserInfo(org_id, form.owner.user_id);
    if (!owner) {
      throw new _Error('Owner not found', 404, ErrorCode.not_found);
    }
    const isUserInTeam =
      form.teams &&
      form.teams.some((t) => owner.team.find((ot) => ot.team_id === t.team_id));
    // if owner not in team
    if (
      // no owner.team inside form.team
      owner.team &&
      form.teams &&
      // flat 2 array
      !isUserInTeam
    ) {
      _owner = undefined;
    } else {
      _owner = {
        user_id: owner._id as string,
        user_name: owner.first_name,
      };
    }
  }

  return { teams: _teams, owner: _owner };
};

// create contact field map
// field name in form -> contact field id
// field id in form -> contact field id
const _createContactFieldMap = (contactDataBoard: BoardSchema, form: Form) => {
  const fieldMap: { [key: string]: string } = {};

  const mapOfContactDefaultFieldNameAndFormFieldName: {
    [key: string]: string;
  } = {
    name: 'name',
    position: 'title',
    company: 'company',
    phone: 'phone',
    email: 'email',
    location: 'location',
    origin: 'source',
  };

  _contactFillableFields.forEach((field) => {
    const matchedField = contactDataBoard.fields.find(
      (f) => f.default_field_name === field
    );

    // Case contact field name is not in form but populate by system
    // - origin/source
    if (field === 'origin') {
      fieldMap[field] = matchedField?._id as string;
      return;
    }

    const fieldInForm = form.fields.find(
      (f) =>
        f.field_name === mapOfContactDefaultFieldNameAndFormFieldName[field]
    );

    if (matchedField && fieldInForm) {
      // map field._id to contact field._id
      if (fieldInForm._id) {
        fieldMap[fieldInForm._id as string] = matchedField._id as string;
      }

      // map field.field_name to contact field._id
      fieldMap[fieldInForm.field_name as string] = matchedField._id as string;
    }
  });

  return fieldMap;
};
