# ASTC 支持

> 测试用例：不支持 ASTC 时，使用 PNG 显示；支持 ASTC 时，使用 ASTC 显示。下图左边是 PC 端网页，右边是安卓端网页，分别显示了不支持 ASTC 和支持 ASTC 的情况。

![ASTC](image.png)

## 判断平台是否支持 ASTC

```typescript
import { gfx, director, Asset, ImageAsset, SpriteFrame } from "cc";

export namespace ASTC {
    /** 目标纹理格式 */
    export const TARGET_FORMAT = gfx.Format.ASTC_RGBA_6X6;

    /**
     * 是否支持指定的纹理格式
     * @param format 纹理格式
     * @returns
     */
    export function IsFormatSuported(format: gfx.Format) {
        return (director.root.device.getFormatFeatures(format) & gfx.FormatFeatureBit.SAMPLED_TEXTURE) > 0;
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
    export function CreateSpriteFrame(asset: Asset) {
        const file = (<any>asset)._file;
        const data: Uint8Array = file._data;
        const image = (<any>ImageAsset).parseCompressedTextures(data.buffer, 2);
        return SpriteFrame.createWithImage(image);
    }
}
```

## 加载 ASTC

```typescript
resources.load("path/to/astc", (err, asset) => {
    if (err) return console.error(err);
    this.sprite.spriteFrame = ASTC.CreateSpriteFrame(asset);
});
```
