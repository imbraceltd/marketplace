import logger from '../../server/logging/logger';
import AppModel from '../models/App.model';
import EmailTemplateModel from '../models/EmailTemplate.model';

const baseURL = process.env.WCS_BASE_URL || 'http://localhost:8080';

const emailIteration = async (): Promise<void> => {
  // This is a placeholder for the migration code
  logger.info('Migration Placeholder: 001_email_iteration');
  // First, remove the "templates" index from the menu
  const deletedTemplates = await AppModel.updateMany(
    { product_code: 'email_campaign' },
    {
      $pull: { 'options.menu': { index: 'templates' } },
    }
  );

  // Second, update the subscribe and unsubscribe URLs
  const updatedUrls = await AppModel.updateMany(
    { product_code: 'email_campaign', 'options.menu.index': 'share_urls' },
    {
      $set: {
        'options.menu.$[elem].options.subscribe': `${baseURL}/email-campaign/opt-in`,
        'options.menu.$[elem].options.unsubscribe': `${baseURL}/email-campaign/opt-out`,
      },
    },
    {
      arrayFilters: [{ 'elem.index': 'share_urls' }],
    }
  );

  // #3 remove board_id in email template
  logger.info('Removing board_id from email templates');
  const templates = await EmailTemplateModel.find({
    board_id: { $exists: true },
  });
  
  for (const template of templates) {
    const updatedBody = template.body
      .replace(/data-board-id="[^"]*"/g, 'data-board-id=""')
      .replace(/data-field-id="[^"]*"/g, 'data-field-id=""');
  
    await EmailTemplateModel.updateOne(
      { _id: template._id },
      {
        $set: { body: updatedBody },
        $unset: { board_id: "" }, // Remove the `board_id` field
      }
    );
  }
  logger.info("Migration 001_email_iteration completed");
};

export default emailIteration;
