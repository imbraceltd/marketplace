import axios from 'axios';
import IBusinessUnit from '../domains/interface/businessUnit';
import config from '../../config';

export const getBusinessUnitByOrgId = async (
  orgId: string
): Promise<IBusinessUnit> => {
  const url = `${config.backend}/business-units?orgId=${orgId}`;
    const {data} = await axios.get(url);
    return data;
};
