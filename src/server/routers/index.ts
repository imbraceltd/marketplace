import logger from '../logging/logger';
import { Router } from 'express';
import appController from './v1/app.controllers';
import { parseUserContext } from '../middleware/authorize.middleware';
import marketPlaceControllers from './v1/marketPlace.controllers';
import emailControllers from './v1/email.controllers';
import emailTemplateController from './v1/email_template.controllers';
import multer from 'multer';
import fileController from './v1/file.controller';
import formController from './v1/form.controllers';
import config from '../../config';
import fileControllerV2 from './v1/file.controllerv2';
import fs from 'fs';
import templateController from './v1/template.controller';
import useCaseController from './v1/useCase.controllers';


logger.info(
  config.use_local_storage
    ? 'file upload to local storage'
    : 'file upload to s3'
);

const upload = multer({
  storage: config.use_local_storage
    ? multer.diskStorage({
      destination: (req, file, cb) => {
        const path =
          config.file.path + '/' + req.userContext.org_id || './uploads';
        logger.info('path', path);
        if (!fs.existsSync(path)) {
          fs.mkdirSync(path, { recursive: true });
        }
        req.fileUploadPath = path;
        cb(null, path);
      },
      filename: (req, file, cb) => {
        req.fileUploadName = file.originalname;
        cb(null, file.originalname);
      },
    })
    : multer.memoryStorage(),

  // limit 25mb
  limits: {
    fileSize: 25 * 1024 * 1024,
  },
});

const apiRouter = Router();

apiRouter.use(parseUserContext);



apiRouter.get('/', (req, res) => {
  const { userContext } = req;
  res.json({
    userContext,
    message: 'Welcome to the API',
  });
});

apiRouter.post('/files', upload.single('file'), fileControllerV2.uploadFile);
apiRouter.get('/files/:short_path', fileControllerV2.downloadFile);
apiRouter.delete('/files/:id', fileControllerV2.deleteFile);
// file details
apiRouter.get('/file-details/:id', fileController.getFileDetails);

/**
 * App Util apis
 */
apiRouter.get(
  '/apps/utils/board-template/:boardId',
  appController.getBoardTemplate
);
apiRouter.get(
  '/apps/utils/required-credentials/:appId',
  appController.getRequiredCredentials
);
// - get unsubscribe link

/**
 * App apis
 */

// forms
// - template form
apiRouter.get('/apps/forms/template', formController.defaultForm);
// - submit form
apiRouter.post('/apps/forms/submit/:formId', formController.submitForm);
// - create form
apiRouter.post('/apps/forms', formController.createForm);
// - get forms
apiRouter.get('/apps/forms', formController.search);
// -get public forms
apiRouter.get('/apps/forms/public/:id', formController.getPublicForms);
// - get form by id
apiRouter.get('/apps/forms/:id', formController.getFormById);
// - update form
apiRouter.put('/apps/forms/:id', formController.updateForm);
// - delete form
apiRouter.delete('/apps/forms/:id', formController.deleteForm);
// - delete team forms
apiRouter.delete('/apps/forms/team/:teamId', formController.deleteTeamForms);

// - get forms related to a data board
apiRouter.get('/apps/forms/board/:boardId', formController.getFormsByBoardId);

// submit
apiRouter.post('/apps/submit/:appId', appController.submit);

// submit test
apiRouter.post('/apps/submit-test/:appId', appController.submitTest);

// app settings
// - update app settings
apiRouter.put('/apps/settings/:id', appController.updateAppSettings);

// - get app settings by workflow id
apiRouter.get('/apps/settings/:id', appController.getAppSettingsByWorkflowId);

// - get app settings by app id
apiRouter.get('/apps/app-setting/:id', appController.getAppSettingsById);
/**
 * Subscriptions apis
 */
apiRouter.post('/apps/subscriptions', emailControllers.handleSubscription);
apiRouter.post('/apps/opts', emailControllers.handleOpts);

/**
 * Email template apis
 */
// - create email template
apiRouter.post('/apps/email-templates', emailControllers.createEmailTemplate);
// - get email templates
apiRouter.get('/apps/email-templates', emailControllers.getEmailTemplates);

// - get email template by id
apiRouter.get(
  '/apps/email-templates/:id',
  emailControllers.getEmailTemplateById
);
// - update email template
apiRouter.put(
  '/apps/email-templates/:id',
  emailControllers.updateEmailTemplate
);
// - delete email template
apiRouter.delete(
  '/apps/email-templates/:id',
  emailControllers.deleteEmailTemplate
);

/**
 * Emails Sender apis
 */
// - create email sender
apiRouter.post('/apps/email-senders', emailControllers.createEmailSender);
// - get email senders
apiRouter.get('/apps/email-senders', emailControllers.getEmailSenders);
// - update email sender
apiRouter.put('/apps/email-senders/:id', emailControllers.updateEmailSender);
// - delete email sender
apiRouter.delete('/apps/email-senders/:id', emailControllers.deleteEmailSender);

// - get org members email
apiRouter.get('/apps/org-members-email', emailControllers.getOrgUserList);

// - get required credentials by app id
apiRouter.get('/apps/credentials/:id', appController.getRequiredCredentials);

// - activate app
apiRouter.patch('/apps/activate/:id', appController.activateApp);
apiRouter.patch('/apps/de-activate/:id', appController.deActivateApp);

// - credentials
apiRouter.get('/apps/used-channels', appController.getUsedChannels);

//apps status
apiRouter.get('/apps/status', appController.getAppStatus);

// apps
apiRouter.post('/apps', appController.createApp);
apiRouter.get('/apps', appController.getApps);
apiRouter.get('/apps/:id', appController.getAppById);
apiRouter.put('/apps/:id', appController.updateApp);
apiRouter.delete('/apps/:id', appController.deleteApp);

// used channels
apiRouter.get(
  '/market-places/used-channels',
  marketPlaceControllers.getUsedChannelsV2
);

// email templates v2
// - get email templates version 2
apiRouter.get(
  '/market-places/email-templates/search',
  emailTemplateController.searchEmailTemplates
);

// same routes without /market-places prefix — served at /v2/email-templates/... via app.use('/v2', v1Handlers)
apiRouter.get('/email-templates/search', emailTemplateController.searchEmailTemplates);

apiRouter.get(
  '/market-places/email-templates',
  emailTemplateController.getEmailTemplates
);

// - create email template
apiRouter.post(
  '/market-places/email-templates',
  emailTemplateController.createEmailTemplate
);

// - get email template by id
apiRouter.get(
  '/market-places/email-templates/:id',
  emailTemplateController.getEmailTemplateById
);
// - update email template
apiRouter.put(
  '/market-places/email-templates/:id',
  emailTemplateController.updateEmailTemplate
);
// - delete email template
apiRouter.delete(
  '/market-places/email-templates/:id',
  emailTemplateController.deleteEmailTemplate
);

apiRouter.get('/email-templates', emailTemplateController.getEmailTemplates);
apiRouter.post('/email-templates', emailTemplateController.createEmailTemplate);
apiRouter.get('/email-templates/:id', emailTemplateController.getEmailTemplateById);
apiRouter.put('/email-templates/:id', emailTemplateController.updateEmailTemplate);
apiRouter.delete('/email-templates/:id', emailTemplateController.deleteEmailTemplate);

// mind maps
apiRouter.post(
  '/market-places/channel-workflows',
  marketPlaceControllers.installRootChannelWorkflow
);

apiRouter.post(
  '/market-places/files',
  upload.single('file'),
  fileControllerV2.uploadFile
);
apiRouter.get('/market-places/files/:short_path', fileController.downloadFile);
apiRouter.delete('/market-places/files/:id', fileController.deleteFile);
// file details
apiRouter.get('/market-places/file-details/:id', fileController.getFileDetails);

apiRouter.post('/market-places/templates', templateController.create);
apiRouter.post('/market-places/templates/install-from-json', templateController.installFromJson);
apiRouter.post('/market-places/templates/:id', templateController.install);
apiRouter.delete('/market-places/templates/:id', templateController.remove);
apiRouter.patch('/market-places/templates/:id', templateController.update);
apiRouter.get('/market-places/templates', templateController.getAll);
apiRouter.get('/market-places/templates/public', templateController.getPublic);
apiRouter.get('/market-places/templates/:id', templateController.getById);

// Use Cases
apiRouter.post('/use-cases/v2/custom', useCaseController.createCustomUseCaseV2);
apiRouter.post('/use-cases/custom', useCaseController.createCustomUseCase);
apiRouter.post('/use-cases', useCaseController.createUseCase);
apiRouter.get('/use-cases', useCaseController.getUseCases);
// Order matters: literal "builtin-assistants" must precede the param route
// so Express doesn't capture it as `:id`.
apiRouter.get(
  '/use-cases/builtin-assistants/:assistant_id',
  useCaseController.getBuiltinAssistantById
);
apiRouter.get(
  '/use-cases/by-assistant/:assistant_id',
  useCaseController.getUseCaseByAssistantId
);
apiRouter.get('/use-cases/:id', useCaseController.getUseCaseById);
apiRouter.patch('/use-cases/:id/custom', useCaseController.updateCustomUseCase);
apiRouter.patch('/use-cases/:id', useCaseController.updateUseCase);
apiRouter.delete('/use-cases/v2/:id', useCaseController.deleteUseCaseV2);
apiRouter.delete('/use-cases/:id', useCaseController.deleteUseCase);


export default apiRouter;
