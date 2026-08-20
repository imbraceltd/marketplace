export default interface IWebhookContext {
    org_id?: string;
    channel_id?: string;
    partition?: number;
    wf_base_url?: string;
    business_unit_id?: string;
    app_secret?: string;
}