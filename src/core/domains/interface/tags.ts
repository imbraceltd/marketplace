// name: , idea, journey,board, automation, web, facebook, whatsapp, line, wechat, instagram, email, preset
export interface ITag {
  id?: string;
  name: string;
  usageCount?: number;
  [key: string]: string | number | undefined;
}