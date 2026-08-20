import { Router } from 'express';
import multer from 'multer';
import config from '../../../config';
import fs from 'fs';
import { AppController } from './controllers/AppController';
import { EmailSenderController } from './controllers/EmailSenderController';
import { EmailTemplateController } from './controllers/EmailTemplateController';
import { FileController } from './controllers/FileController';
import { FormController } from './controllers/FormController';
import { TemplateController } from './controllers/TemplateController';
import { MarketplaceTemplateController } from './controllers/MarketplaceTemplateController';
import { UseCaseController } from './controllers/UseCaseController';
import { WebhookController } from './controllers/WebhookController';
import { MarketPlaceController } from './controllers/MarketPlaceController';
import authorize from '../../middleware/authorize.middleware';

const upload = multer({
    storage: config.use_local_storage
        ? multer.diskStorage({
            destination: (req: any, file, cb) => {
                const path = (config as any).file.path + '/' + req.userContext.org_id || './uploads';
                if (!fs.existsSync(path)) {
                    fs.mkdirSync(path, { recursive: true });
                }
                cb(null, path);
            },
            filename: (req, file, cb) => {
                cb(null, file.originalname);
            },
        })
        : multer.memoryStorage(),
    limits: {
        fileSize: 25 * 1024 * 1024,
    },
});

// Dedicated memory-storage multer for ZIP endpoints: we need the file in
// memory regardless of `FILE_PATH` env, because JSZip + S3 upload work off Buffer.
const zipUpload = multer({
    storage: multer.memoryStorage(),
    limits: { fileSize: 25 * 1024 * 1024 },
});

const router = Router();

// Forms
router.get('/apps/forms/template', FormController.getTemplate);
router.post('/apps/forms/submit/:formId', FormController.submit);
router.get('/apps/forms/public/:id', FormController.getPublic);
router.delete('/apps/forms/team/:teamId', authorize, FormController.deleteTeamForms);
router.get('/apps/forms/board/:boardId', authorize, FormController.getFormsByBoardId);
router.get('/apps/forms', authorize, FormController.getAll);
router.get('/apps/forms/:id', authorize, FormController.getById);
router.post('/apps/forms', authorize, FormController.create);
router.put('/apps/forms/:id', authorize, FormController.update);
router.delete('/apps/forms/:id', authorize, FormController.delete);


// Email Senders
router.get('/apps/email-senders', authorize, EmailSenderController.getAll);
router.get('/apps/email-senders/:id', authorize, EmailSenderController.getById);
router.post('/apps/email-senders', authorize, EmailSenderController.create);
router.put('/apps/email-senders/:id', authorize, EmailSenderController.update);
router.delete('/apps/email-senders/:id', authorize, EmailSenderController.delete);

// Email Templates
router.get('/apps/email-templates/search', authorize, EmailTemplateController.search);
router.get('/apps/email-templates', authorize, EmailTemplateController.getAll);
router.get('/apps/email-templates/:id', authorize, EmailTemplateController.getById);
router.post('/apps/email-templates', authorize, EmailTemplateController.create);
router.put('/apps/email-templates/:id', authorize, EmailTemplateController.update);
router.delete('/apps/email-templates/:id', authorize, EmailTemplateController.delete);

router.get('/market-places/email-templates/search', authorize, EmailTemplateController.search);
router.get('/market-places/email-templates', authorize, EmailTemplateController.getAll);
router.get('/market-places/email-templates/:id', authorize, EmailTemplateController.getById);
router.post('/market-places/email-templates', authorize, EmailTemplateController.create);
router.put('/market-places/email-templates/:id', authorize, EmailTemplateController.update);
router.delete('/market-places/email-templates/:id', authorize, EmailTemplateController.delete);

// /email-templates/* without prefix — served at /v2/email-templates/... via app.use('/v2', v3ApiRouter)
router.get('/email-templates/search', authorize, EmailTemplateController.search);
router.get('/email-templates', authorize, EmailTemplateController.getAll);
router.get('/email-templates/:id', authorize, EmailTemplateController.getById);
router.post('/email-templates', authorize, EmailTemplateController.create);
router.put('/email-templates/:id', authorize, EmailTemplateController.update);
router.delete('/email-templates/:id', authorize, EmailTemplateController.delete);

// Email subscriptions
router.post('/apps/subscriptions', AppController.handleSubscription);
router.post('/apps/opts', AppController.handleOpts);
router.get('/apps/org-members-email', authorize, AppController.getOrgUserList);

// Apps
// App Utils & Settings (must be before /apps/:id)
router.patch('/apps/activate/:id', authorize, AppController.activate);
router.patch('/apps/de-activate/:id', authorize, AppController.deactivate);
router.put('/apps/settings/:id', authorize, AppController.updateSettings);
router.get('/apps/settings/:id', authorize, AppController.getSettingsByWorkflowId);
router.get('/apps/app-setting/:id', authorize, AppController.getSettingsById);
router.get('/apps/credentials/:id', authorize, AppController.getRequiredCredentials); // alias for /apps/utils/required-credentials/:appId
router.get('/apps/utils/required-credentials/:appId', authorize, AppController.getRequiredCredentials);
router.get('/apps/utils/board-template/:boardId', authorize, AppController.getBoardTemplate);
router.post('/apps/submit/:appId', AppController.submit);
router.post('/apps/submit-test/:appId', AppController.submitTest);
router.get('/apps/used-channels', authorize, AppController.getUsedChannels);
router.get('/apps/used-channels-v2', authorize, AppController.getUsedChannelsV2);
router.get('/apps/status', authorize, AppController.getStatus);

router.get('/apps', authorize, AppController.getAll);
router.get('/apps/:id', authorize, AppController.getById);
router.post('/apps', authorize, AppController.create);
router.put('/apps/:id', authorize, AppController.update);
router.delete('/apps/:id', authorize, AppController.delete);

// Market-places extras
router.get('/market-places/used-channels', authorize, MarketPlaceController.getUsedChannels);
router.post('/market-places/channel-workflows', authorize, MarketPlaceController.installChannelWorkflow);
router.post('/market-places/files', authorize, upload.single('file'), FileController.uploadFile);
router.get('/market-places/files/:short_path', FileController.downloadFile); // download might not need authorize if public
router.delete('/market-places/files/:id', authorize, FileController.delete);
router.get('/market-places/file-details/:id', FileController.getById);

// Templates
router.get('/market-places/templates', authorize, TemplateController.getAll);
router.get('/market-places/templates/public', TemplateController.getPublic);
router.post('/market-places/templates/install-from-json', authorize, TemplateController.installFromJson);
router.post('/market-places/templates/install-from-zip', authorize, zipUpload.single('file'), TemplateController.installFromZip);
router.post('/market-places/templates/import-from-zip', zipUpload.single('file'), TemplateController.importFromZip);
router.get('/market-places/templates/:id/export-zip', authorize, TemplateController.exportZip);
router.post('/market-places/templates/:id', authorize, TemplateController.install);
router.get('/market-places/templates/:id', authorize, TemplateController.getById);
router.post('/market-places/templates', authorize, TemplateController.create);
router.patch('/market-places/templates/:id', authorize, TemplateController.update);
router.delete('/market-places/templates/:id', authorize, TemplateController.delete);

// Marketplace Templates (v2 — dedicated `marketplace_templates` table)
router.post('/market-places/v2/templates/import', zipUpload.single('file'), MarketplaceTemplateController.import);
router.get('/market-places/v2/templates', MarketplaceTemplateController.list);
router.post('/market-places/v2/templates/:id/install', authorize, MarketplaceTemplateController.install);
router.get('/market-places/v2/templates/:id', MarketplaceTemplateController.getById);
router.patch('/market-places/v2/templates/:id', authorize, MarketplaceTemplateController.update);
router.delete('/market-places/v2/templates/:id', authorize, MarketplaceTemplateController.delete);

// UseCases
router.get('/usecases', authorize, UseCaseController.getAll);
// Order matters: literal "builtin-assistants" must precede the param route
// so Express doesn't capture it as `:id`.
router.get('/usecases/builtin-assistants/:assistant_id', authorize, UseCaseController.getBuiltinAssistantById);
router.get('/usecases/by-assistant/:assistant_id', authorize, UseCaseController.getByAssistantId);
router.get('/usecases/:id', authorize, UseCaseController.getById);
router.post('/usecases', authorize, UseCaseController.create);
router.post('/usecases/custom', authorize, UseCaseController.createCustom);
router.post('/usecases/v2/custom', authorize, UseCaseController.createCustomV2);
router.patch('/usecases/:id', authorize, UseCaseController.update);
router.patch('/usecases/:id/custom', authorize, UseCaseController.updateCustom);
router.delete('/usecases/:id', authorize, UseCaseController.delete);
router.delete('/usecases/v2/:id', authorize, UseCaseController.deleteV2);

// UseCases (alias with hyphen - matches v1 route pattern)
router.get('/use-cases', authorize, UseCaseController.getAll);
router.get('/use-cases/builtin-assistants/:assistant_id', authorize, UseCaseController.getBuiltinAssistantById);
router.get('/use-cases/by-assistant/:assistant_id', authorize, UseCaseController.getByAssistantId);
router.get('/use-cases/:id', authorize, UseCaseController.getById);
router.post('/use-cases', authorize, UseCaseController.create);
router.post('/use-cases/custom', authorize, UseCaseController.createCustom);
router.post('/use-cases/v2/custom', authorize, UseCaseController.createCustomV2);
router.patch('/use-cases/:id', authorize, UseCaseController.update);
router.patch('/use-cases/:id/custom', authorize, UseCaseController.updateCustom);
router.delete('/use-cases/:id', authorize, UseCaseController.delete);
router.delete('/use-cases/v2/:id', authorize, UseCaseController.deleteV2);

// Files
router.get('/files', authorize, FileController.getAll);
router.post('/files', authorize, upload.single('file'), FileController.uploadFile);
router.get('/files/:short_path', FileController.downloadFile);
router.delete('/files/:id', authorize, FileController.delete);
router.get('/file-details/:id', FileController.getById); // matches v1 route pattern
router.get('/files/details/:id', FileController.getById); // alias compatible with v3
router.put('/files/:id', authorize, FileController.update);

// Webhooks
router.get('/webhooks/facebook', WebhookController.verify);
router.post('/webhooks/facebook', WebhookController.handle);

export default router;
