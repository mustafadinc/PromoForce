export type PublishPayload = {
  caption: string;
  hashtags: string[];
  mediaUrls: string[];
  mediaBuffers?: Buffer[];
  mimeTypes?: string[];
};

export type PublishResult = {
  externalPostId: string;
  platform: string;
  permalink?: string;
};

export type SocialPublisher = {
  publish(payload: PublishPayload): Promise<PublishResult>;
};
