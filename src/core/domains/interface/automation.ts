export interface Automation {
    _id?: string;
    board_id: string;
    organization_id: string;
    name: string;
    description: string;
    workflow_id: string;
    trigger_frequency_unit?: string;
    trigger_frequency_value?: number;
    trigger_day_of_week?: string;
    trigger_day_of_month?: string;
    trigger_month_and_day?: string;
    trigger_time?: string;
    start_datetime?: string;
    field_id: string;
    is_paused?: boolean;
    updateNeeded?: boolean;
    type: string;
}