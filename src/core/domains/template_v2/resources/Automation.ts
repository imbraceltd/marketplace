import logger from '../../../../server/logging/logger';
import { IResource } from "../interface";

export type AutomationType = 'create' | 'update' | 'delete' | 'scheduled';
export type TriggerFrequencyUnitType = 'minutes' | 'hours' | 'days' | 'weeks' | 'months' | 'years';

export interface AutomationParameters {
    _id: string;
    board_id: string;
    organization_id: string;
    name: string;
    description: string;
    workflow_id: string;
    trigger_frequency_unit?: TriggerFrequencyUnitType;
    trigger_frequency_value?: number;
    trigger_day_of_week?: string;
    trigger_day_of_month?: string;
    trigger_month_and_day?: string;
    trigger_time?: string;
    start_datetime?: string;
    field_id: string;
    is_paused?: boolean;
    updateNeeded?: boolean;
    type: AutomationType;
}

export class Automation {
    _id: string;
    board_id: string;
    organization_id: string;
    name: string;
    description: string;
    workflow_id: string;
    trigger_frequency_unit?: TriggerFrequencyUnitType;
    trigger_frequency_value?: number;
    trigger_day_of_week?: string;
    trigger_day_of_month?: string;
    trigger_month_and_day?: string;
    trigger_time?: string;
    start_datetime?: string;
    field_id: string;
    is_paused?: boolean;
    updateNeeded?: boolean;
    type: AutomationType;

    constructor(parameters: AutomationParameters) {
        this._id = parameters._id;
        this.board_id = parameters.board_id;
        this.organization_id = parameters.organization_id;
        this.name = parameters.name;
        this.description = parameters.description;
        this.workflow_id = parameters.workflow_id;
        this.trigger_frequency_unit = parameters.trigger_frequency_unit;
        this.trigger_frequency_value = parameters.trigger_frequency_value;
        this.trigger_day_of_week = parameters.trigger_day_of_week;
        this.trigger_day_of_month = parameters.trigger_day_of_month;
        this.trigger_month_and_day = parameters.trigger_month_and_day;
        this.trigger_time = parameters.trigger_time;
        this.start_datetime = parameters.start_datetime;
        this.field_id = parameters.field_id;
        this.is_paused = parameters.is_paused;
        this.updateNeeded = parameters.updateNeeded;
        this.type = parameters.type;
    }

    toAutomationParameters(): AutomationParameters {
        return {
            _id: this._id,
            board_id: this.board_id,
            organization_id: this.organization_id,
            name: this.name,
            description: this.description,
            workflow_id: this.workflow_id,
            trigger_frequency_unit: this.trigger_frequency_unit,
            trigger_frequency_value: this.trigger_frequency_value,
            trigger_day_of_week: this.trigger_day_of_week,
            trigger_day_of_month: this.trigger_day_of_month,
            trigger_month_and_day: this.trigger_month_and_day,
            trigger_time: this.trigger_time,
            start_datetime: this.start_datetime,
            field_id: this.field_id,
            type: this.type,
        };
    }

    toAutomationEventParameters(): AutomationParameters {
        return {
            _id: this._id,
            board_id: this.board_id,
            organization_id: this.organization_id,
            name: this.name,
            description: this.description,
            workflow_id: this.workflow_id,
            field_id: this.field_id,
            type: this.type,
        };
    }

    toAutomationMinutesParameters(): AutomationParameters {
        return {
            _id: this._id,
            board_id: this.board_id,
            organization_id: this.organization_id,
            name: this.name,
            description: this.description,
            workflow_id: this.workflow_id,
            trigger_frequency_unit: this.trigger_frequency_unit,
            trigger_frequency_value: this.trigger_frequency_value,
            start_datetime: this.start_datetime,
            field_id: this.field_id,
            type: this.type,
        };
    }

    toAutomationHoursParameters(): AutomationParameters {
        return {
            _id: this._id,
            board_id: this.board_id,
            organization_id: this.organization_id,
            name: this.name,
            description: this.description,
            workflow_id: this.workflow_id,
            trigger_frequency_unit: this.trigger_frequency_unit,
            trigger_frequency_value: this.trigger_frequency_value,
            start_datetime: this.start_datetime,
            field_id: this.field_id,
            type: this.type,
        };
    }

    toAutomationDaysParameters(): AutomationParameters {
        return {
            _id: this._id,
            board_id: this.board_id,
            organization_id: this.organization_id,
            name: this.name,
            description: this.description,
            workflow_id: this.workflow_id,
            trigger_frequency_unit: this.trigger_frequency_unit,
            trigger_frequency_value: this.trigger_frequency_value,
            trigger_time: this.trigger_time,
            start_datetime: this.start_datetime,
            field_id: this.field_id,
            type: this.type,
        };
    }

    toAutomationWeeksParameters(): AutomationParameters {
        return {
            _id: this._id,
            board_id: this.board_id,
            organization_id: this.organization_id,
            name: this.name,
            description: this.description,
            workflow_id: this.workflow_id,
            trigger_frequency_unit: this.trigger_frequency_unit,
            trigger_frequency_value: this.trigger_frequency_value,
            trigger_day_of_week: this.trigger_day_of_week,
            trigger_time: this.trigger_time,
            start_datetime: this.start_datetime,
            field_id: this.field_id,
            type: this.type,
        };
    }

    toAutomationMonthsParameters(): AutomationParameters {
        return {
            _id: this._id,
            board_id: this.board_id,
            organization_id: this.organization_id,
            name: this.name,
            description: this.description,
            workflow_id: this.workflow_id,
            trigger_frequency_unit: this.trigger_frequency_unit,
            trigger_frequency_value: this.trigger_frequency_value,
            trigger_day_of_month: this.trigger_day_of_month,
            trigger_time: this.trigger_time,
            start_datetime: this.start_datetime,
            field_id: this.field_id,
            type: this.type,
        };
    }

    toAutomationYearsParameters(): AutomationParameters {
        return {
            _id: this._id,
            board_id: this.board_id,
            organization_id: this.organization_id,
            name: this.name,
            description: this.description,
            workflow_id: this.workflow_id,
            trigger_frequency_unit: this.trigger_frequency_unit,
            trigger_frequency_value: this.trigger_frequency_value,
            trigger_month_and_day: this.trigger_month_and_day,
            trigger_time: this.trigger_time,
            start_datetime: this.start_datetime,
            field_id: this.field_id,
            type: this.type,
        };
    }

    clone(): this {
        if (this.type === 'scheduled') {
            switch (this.trigger_frequency_unit) {
                case 'minutes':
                    return new Automation(this.toAutomationMinutesParameters()) as this;
                case 'hours':
                    return new Automation(this.toAutomationHoursParameters()) as this;
                case 'days':
                    return new Automation(this.toAutomationDaysParameters()) as this;
                case 'weeks':
                    return new Automation(this.toAutomationWeeksParameters()) as this;
                case 'months':
                    return new Automation(this.toAutomationMonthsParameters()) as this;
                case 'years':
                    return new Automation(this.toAutomationYearsParameters()) as this;
                default:
                    throw new Error('Invalid trigger frequency unit');
            }
        }

        if (this.type === 'create' || this.type === 'update' || this.type === 'delete') {
            return new Automation(this.toAutomationEventParameters()) as this;
        }

        return new Automation(this.toAutomationParameters()) as this;
    }

    add(...resources: IResource[]): void {
        logger.info(resources);
        return;
    }
}
