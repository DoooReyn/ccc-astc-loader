import { gfx, director, Asset, ImageAsset, SpriteFrame } from "cc";

export namespace ASTC {
  /** 压缩纹理原始信息 */
  interface CompressedTextureInfo {
    _compressed: boolean;
    _data: Uint8Array;
    format: gfx.Format;
    width: number;
    height: number;
  }

  /** 目标纹理格式 */
  export const TARGET_FORMAT = gfx.Format.ASTC_RGBA_6X6;

  /**
   * 是否支持指定的纹理格式
   * @param format 纹理格式
   * @returns
   */
  export function IsFormatSuported(format: gfx.Format) {
    return (
      (director.root.device.getFormatFeatures(format) &
        gfx.FormatFeatureBit.SAMPLED_TEXTURE) >
      0
    );
  }

  /**
   * 平台是否支持目标纹理格式
   * @returns
   */
  export function IsPlatformSupported() {
    return IsFormatSuported(TARGET_FORMAT);
  }

  /**
   * 创建精灵帧
   * @param asset 资源
   */
  export function CreateSpriteFrameFromRemote(
    asset: Asset & {
      _nativeData?: CompressedTextureInfo;
    }
  ) {
    if (asset._nativeData) {
      return CreateSpriteFrameByInfo(asset._nativeData);
    }
    return null;
  }

  /**
   * 创建精灵帧
   * @param asset 资源
   */
  export function CreateSpriteFrameFromDynamic(
    asset: Asset & {
      _file?: CompressedTextureInfo;
    }
  ) {
    if (asset._file) {
      return CreateSpriteFrameByInfo(asset._file);
    }
    return null;
  }

  /**
   * 创建精灵帧
   * @param info 压缩纹理原始信息
   */
  export function CreateSpriteFrameByInfo(info: CompressedTextureInfo) {
    if (IsFormatSuported(info.format)) {
      const image = (<any>ImageAsset).parseCompressedTextures(
        info._data.buffer,
        2
      );
      return SpriteFrame.createWithImage(image);
    }
    return null;
  }
}
