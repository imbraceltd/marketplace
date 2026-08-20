import { IDataObject } from "./workflow";
export interface ICredential {
    id?: string;
    doc_name?: string;
    name: string;
    type: string;
    data: IDataObject;
    nodesAccess: string[];
    createdAt?: string;
    updatedAt?: string;
}