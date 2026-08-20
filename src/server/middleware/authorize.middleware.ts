import logger from '../logging/logger';
import { NextFunction, Request, Response } from "express";

export const parseUserContext = (req: Request, res: Response, next: NextFunction) => {

    logger.info({headers: req.headers})

    const orgId = req.headers["x-organization-id"] as string;
    const userId = req.headers["x-user-id"] as string;
    const business_unit_id = req.headers["x-business-unit-id"] as string;
    const role = req.headers["x-user-role"] as string;
    // add userContext to request
    req.userContext = {
        org_id: orgId,
        business_unit_id,
        user_id: userId,
        role,
    };

    next();
}

// get orgId and userId from request
const authorize = (req: Request, res: Response, next: NextFunction) => {
    const userContext = req.userContext;
    if (!userContext) {
        return res.status(401).json({ message: "Missing user context" });
    }

    const { org_id: orgId, user_id: userId, business_unit_id, role } = userContext;
    if (!orgId) {
        return res.status(401).json({ message: "Missing organization info" });
    }

    // add userContext to request
    req.userContext = {
        org_id: orgId,
        business_unit_id,
        user_id: userId,
        role,
    };

    next();
};

// get orgId and userId from request
export const getUserContextOnly = (req: Request, res: Response, next: NextFunction) => {
    const userContext = req.userContext;
    const { org_id: orgId, user_id: userId, business_unit_id, role } = userContext;
    // add userContext to request
    req.userContext = {
        org_id: orgId,
        business_unit_id,
        user_id: userId,
        role,
    };

    next();
};

export default authorize;