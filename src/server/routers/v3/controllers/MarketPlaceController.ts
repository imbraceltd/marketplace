import { Request, Response } from 'express';
import { GetUsedChannelsUseCase } from '../../../../application/usecases/GetUsedChannelsUseCase';
import { handleControllerError } from '../../../../utils/error';

export class MarketPlaceController {
    static async getUsedChannels(req: Request, res: Response) {
        try {
            const useCase = new GetUsedChannelsUseCase();
            const userContext = (req as any).userContext;
            let ids: string[] = [];
            if (req.query.ids) {
                ids = Array.isArray(req.query.ids) ? (req.query.ids as string[]) : (req.query.ids as string).split(',');
            }
            const productId = req.query.product_id as string;
            const result = await useCase.execute(userContext, ids, productId);
            return res.status(200).json({ data: result });
        } catch (error: any) {
            const { code, message } = handleControllerError(error);
            return res.status(code).json({ message });
        }
    }

    static async installChannelWorkflow(req: Request, res: Response) {
        return res.status(410).json({ message: 'Channel workflow installation is no longer supported' });
    }
}
