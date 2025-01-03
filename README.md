# ASTC 支持

> 测试用例：不支持 ASTC 时，使用 PNG 显示；支持 ASTC 时，使用 ASTC 显示。下图左边是 PC 端网页，右边是安卓端网页，分别显示了不支持 ASTC 和支持 ASTC 的情况。

![ASTC](image.png)

## 判断平台是否支持 ASTC

```typescript
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
```

## 加载 ASTC

```typescript
/** 通过 resources.load 加载 */
private dynamicLoadAstc() {
    resources.load(EXTENSIONS.ASTC, (err, asset) => {
        if (err) return console.error(err);
        this.title.string = "通过 resources.load 加载成功！";
        this.sprite.spriteFrame = ASTC.CreateSpriteFrameFromDynamic(asset);
    });
}

/** 通过 loadAny 加载 */
private anyLoadAstc() {
    assetManager.loadAny({ url: REMOTE_ADDR }, (err, data) => {
        if (err) return console.error(err);
        this.sprite.spriteFrame = ASTC.CreateSpriteFrameByInfo(data);
        this.title.string = "通过 loadAny 加载成功！";
    });
}

/** 通过 loadRemote 加载 */
private remoteLoadAstc() {
    assetManager.loadRemote(REMOTE_ADDR, (err, data) => {
        if (err) return console.error(err);
        this.sprite.spriteFrame = ASTC.CreateSpriteFrameFromRemote(data);
        this.title.string = "通过 loadRemote 加载成功！";
    });
}
```
