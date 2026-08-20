import { FieldType } from "./databoard";

export interface IUIBasic {
    header?: string | MultiLangTitle;
    footer?: string | MultiLangTitle;
    iconUrl?: string;
    subHeader?: string | MultiLangTitle;
    timezone?: string;
    color?: string;
    backgroundColor?: string;
    config?: string;
    submitMessage?: string | MultiLangTitle;
    boardId?: string;
    type?: string;
}

export type Method = 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH';
export interface ISubmission {
    workflowId?: string; // the workflow id to be used for the submission
    id: string; // webhook id
    method: Method;
    default?: boolean;
    needAuthorized?: boolean; // if true, request must be checked for authorization by the server
}

export interface UI extends IUIBasic {
    questions: Array<IFormField>;
    references?: Array<IReference>;
    submission: ISubmission[];
    callbackUrl?: string; // the url to be called after the submission
    homeUrl?: string; // the url to be called after the submission
}

export interface MultiLangTitle {
    [key: string]: string;
}


export enum RenderType {
    FixedCollections = 'fixedCollection', // render a fixed collection of questions
    Stepper = 'stepper', // render a stepper of questions
}

// define if question be rendered based on the value of another question's answer
export interface IDependency {
    name: string;
    value?: string;
}

// Option can be provided in form config or fetched from an endpoint or fetch databoard if provided field is a databoard field
export interface IFormField {
    title: string | MultiLangTitle;
    description?: string | MultiLangTitle;
    placeholder?: string | MultiLangTitle;
    type?: FieldType;
    required?: boolean;
    validation?: string; // should be a regex
    name?: string;
    dependOn?: IDependency; // if provided, the question will be rendered based on the value of another question's answer
    renderType?: RenderType;
    questions?: Array<IFormField>;
    default: number | string | boolean | Array<string | number> | null | undefined;
    options?: Array<string | IOption>; // if options is provided, then fetchOptionsEndpoint and fetchOptionsField will be ignored
    field?: string; // the field to be used to fetch options from databoard
    fetchOptionsEndpoint?: string; // the endpoint to be used to fetch options (end point will be config from workflow)
    showToggleButton?: boolean; // if true, a toggle button will be shown to toggle between options and fetchOptionsEndpoint
}


export interface IDataboardField {
    value: string;
    is_identifier?: 'true' | 'false';
}

export interface IOption {
    text: string ;
    disabled?: boolean;
    value: string | number | object;
    icon?: string;
    color?: string;
    description?: string;
    fixedAtFooter?: boolean;
    tooltipText?: string;
}

// Specify the endpoint to be used to fetch options
// How to map data to response
export interface IReference {
    name: string;
    value?: string;
    boardId?: string;
    fieldMap?: {
        [key: string]: string;
    };
    endPoint?: string;
    method?: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH'; 
}

// return title in english if title is not found in the specified language
export const titleLangAsserter = (title: string | MultiLangTitle, language: string): string => {
    // if title is string, return it
    if (typeof title === 'string') {
        return title;
    } 
    
    // if title is object, return the value of the specified language
    return title[language] || title['en'];
}