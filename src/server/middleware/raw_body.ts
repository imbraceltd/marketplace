import { Request, Response } from 'express';

const rawBodySaver = (
  req: Request,
  res: Response,
  buf: Buffer,
  encoding: BufferEncoding
) => {
  if (buf && buf.length) {
    req['rawBody'] = buf.toString(encoding || 'utf8');
  }
};

export default rawBodySaver;
