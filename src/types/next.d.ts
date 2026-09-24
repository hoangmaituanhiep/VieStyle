/**
 * Ambient type declarations for Next.js API route templates.
 * Provides TypeScript definitions for NextApiRequest, NextApiResponse, NextRequest, and NextResponse.
 */

declare module 'next' {
  export interface NextApiRequest {
    method?: string;
    body: any;
    query: Record<string, string | string[]>;
    headers: Record<string, string | string[] | undefined>;
  }
  export interface NextApiResponse {
    status(code: number): NextApiResponse;
    json(body: any): void;
  }
}

declare module 'next/server' {
  export class NextRequest {
    json(): Promise<any>;
    method: string;
    url: string;
    headers: Headers;
  }
  export class NextResponse {
    static json(body: any, init?: { status?: number; headers?: HeadersInit }): NextResponse;
  }
}
