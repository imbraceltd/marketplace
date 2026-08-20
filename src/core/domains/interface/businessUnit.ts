import { IDataObject } from './workflow';

export default interface IBusinessUnit {
  object_name: string;
  data: {
    object_name: string;
    id: string;
    organization_id: string;
    name: string;
    created_at: string;
    updated_at: string;
  }[];
  nested: {
    [key: string]: IDataObject | string | number | boolean | null;
  };
  has_more: boolean;
  count: number;
  total: number;
}
