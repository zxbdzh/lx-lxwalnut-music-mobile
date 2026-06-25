declare module 'react-native-local-media-metadata' {
  export interface MusicMetadata {
    title?: string;
    artist?: string;
    album?: string;
    albumArtist?: string;
    genre?: string;
    year?: number;
    trackNumber?: number;
    trackCount?: number;
    discNumber?: number;
    discCount?: number;
    duration?: number;
    bitrate?: number;
    sampleRate?: number;
    cover?: string;
    [key: string]: any;
  }
  export interface MusicMetadataFull extends MusicMetadata {}
  export function readMetadata(filePath: string): Promise<MusicMetadata>
  export function writeMetadata(filePath: string, metadata: Partial<MusicMetadata>, isCover: boolean): Promise<void>
  export function writePic(filePath: string, picPath: string): Promise<void>
  export function readPic(filePath: string, cachePath: string): Promise<string>
  export function writeLyric(filePath: string, lyric: string): Promise<void>
  export function readLyric(filePath: string): Promise<string>
  const _default: any
  export default _default
}
