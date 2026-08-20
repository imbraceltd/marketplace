import axios from "axios";
import config from "../../config";
import { Automation } from "../domains/interface/automation";
import { handleServiceError } from "../../utils/error";

// Board-automation (crmboard) storage moved out of legacy IPS into
// data-board's PG-backed crmboard table during the 2026-05-19→05-21
// migration (data-board commits 9af2e40, 42bbcc5, 1999f96 — "drop legacy
// IPS forward"). The runtime AP-dispatch reads from data-board only; the
// UI reads from data-board too. Marketplace was left pointing at the
// dead IPS surface until 2026-05-24 — this module is the rewire.
//
// Sandbox is intentionally on the OLD legacy path because its data-board
// has not yet been migrated to PG (no /api/v1/crmboard routes). Toggle
// via CRMBOARD_USE_DATABOARD env: set to "true" on dev + prodv2 to use
// data-board (`${KNOWLEDGE_HUB}/api/v1/crmboard/...`); leave unset on
// sandbox / demo / nokia / cyberport to stay on the legacy IPS surface
// (`${PLATFORM_HOST}/v1/organization/:orgId/ips/crmboard/...`).
// KNOWLEDGE_HUB must also be set for the data-board URL to be used.
const useCrmboardOnDataBoard = () => Boolean(config.knowledgeHub.host && process.env.CRMBOARD_USE_DATABOARD === "true");

const crmboardListUrl = (orgId: string) =>
    useCrmboardOnDataBoard()
        ? `${config.knowledgeHub.host}/api/v1/crmboard/organization/board`
        : `${config.platform.host}/v1/organization/${orgId}/ips/crmboard/organization/board`;

const crmboardByBoardUrl = (orgId: string, boardId: string) =>
    useCrmboardOnDataBoard()
        ? `${config.knowledgeHub.host}/api/v1/crmboard/${boardId}`
        : `${config.platform.host}/v1/organization/${orgId}/ips/crmboard/${boardId}`;

const crmboardCreateUrl = (orgId: string) =>
    useCrmboardOnDataBoard()
        ? `${config.knowledgeHub.host}/api/v1/crmboard`
        : `${config.platform.host}/v1/organization/${orgId}/ips/crmboard`;

export const getAutomationByOrgId = async (orgId: string): Promise<Automation[]> => {
    try {
        const url = crmboardListUrl(orgId);
        const { data } = await axios.get(url, {
            headers: {
                'content-type': 'application/json',
                'x-organization-id': orgId,
            },
        });

        return data?.filter((automation: Automation) => automation.type !== 'scheduled' && automation.type !== 'condition');
    } catch (e) {
        throw handleServiceError(e);
    }
}

export const getAutomationByOrgIdV2 = async (orgId: string): Promise<Automation[]> => {
     try {
        const url = crmboardListUrl(orgId);
        const { data } = await axios.get(url, {
            headers: {
                'content-type': 'application/json',
                'x-organization-id': orgId,
            },
        });

        return data?.filter((automation: Automation) => automation.type !== 'scheduled' && automation.type !== 'condition');
    } catch (e) {
        throw handleServiceError(e);
    }
}

export const getAutomationByBoardId = async (orgId: string, boardId: string): Promise<Automation[]> => {
    try {
        const url = crmboardByBoardUrl(orgId, boardId);
        const { data } = await axios.get(url, {
            headers: {
                'content-type': 'application/json',
                'x-organization-id': orgId,
            },
        });

        return data?.filter((automation: Automation) => automation.type !== 'scheduled' && automation.type !== 'condition');
    } catch (e) {
        throw handleServiceError(e);
    }
}

export const createBoardAutomation = async (orgId: string, automation: Automation): Promise<Automation> => {
    try {
        delete automation._id;
        const url = crmboardCreateUrl(orgId);
        const { data } = await axios.post(url, { ...automation }, {
            headers: {
                'content-type': 'application/json',
                'x-organization-id': orgId,
            },
        });

        return data;
    } catch (e) {
        throw handleServiceError(e);
    }
}
