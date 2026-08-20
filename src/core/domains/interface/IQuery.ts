import { IDataObject } from './workflow';
export interface IQuery {
    search?: string;
    limit?: string;
    skip?: string;
    sort?: string;
    [key: string]: number | string | boolean | string[] | number[] | boolean[] | undefined | IDataObject | null | undefined | object;
}