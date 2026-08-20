export default interface IEmailSender {
    _id?: string;
    created_at?: string;
    updated_at?: string;
    deleted_at?: string;
    title?: string;
    description?: string;
    email: string;
    user_id: string;
    app_id?: string;
    organization_id?: string;
}