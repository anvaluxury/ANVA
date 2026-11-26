// Minimal typings for the lazily loaded ffmpeg.wasm packages (so the project type-checks before/after `npm install`).
declare module '@ffmpeg/ffmpeg' {
  export class FFmpeg {
    loaded: boolean
    load(cfg: { coreURL: string; wasmURL: string }): Promise<boolean>
    writeFile(name: string, data: Uint8Array): Promise<boolean>
    readFile(name: string): Promise<Uint8Array | string>
    deleteFile(name: string): Promise<boolean>
    exec(args: string[], timeout?: number): Promise<number>
    on(event: 'progress', cb: (e: { progress: number }) => void): void
    on(event: 'log', cb: (e: { message: string }) => void): void
    off(event: 'progress' | 'log', cb: (e: never) => void): void
    terminate(): void
  }
}
declare module '@ffmpeg/util' {
  export function fetchFile(src: string | File | Blob): Promise<Uint8Array>
  export function toBlobURL(url: string, mime: string): Promise<string>
}
