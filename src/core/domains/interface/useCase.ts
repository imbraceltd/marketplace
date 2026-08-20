import Schema from "./schema";

export default interface IUseCase extends Schema {
  title: string;
  short_description: string;
  description: string;
  features: string[];
  thumbnail_url: string;
  hover_thumbnail_url: string;
  media: string[];
  tags: string[];
  video_url: string;
  demo_url: string;
  demo_image_url: string;
  how_it_works?: {
    title: string;
    details: string[];
  }[];
  suggestion_prompts: string[];
  supported_channels: {
    title: string;
    icon: string;
  }[];
  integrations: {
    title: string;
    icon: string;
  }[];
  template_id: string;
  assistant_id: string;
  user_id?: string;
  agent_type?: string;
  is_deleted: boolean;
}