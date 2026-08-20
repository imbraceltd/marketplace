import { v4 as uuid } from 'uuid';

export default function appUUID(): string {
    return `app_${uuid()}`;
}


export function genWebhookID(): string {
    return `webhook_${uuid()}`;
}

export function isDefaultWebhook(webhookId: string): boolean {
    return webhookId.includes('webhook_');
}