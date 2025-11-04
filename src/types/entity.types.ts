export interface BackstageEntity {
  apiVersion: string;
  kind: string;
  metadata: {
    name: string;
    namespace?: string;
    description?: string;
    annotations?: Record<string, string>;
    tags?: string[];
    links?: Array<{ url: string; title?: string }>;
  };
  spec?: {
    lifecycle?: string;
    owner?: string;
    type?: string;
  };
}

