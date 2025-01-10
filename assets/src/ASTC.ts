import {
  gfx,
  director,
  Asset,
  ImageAsset,
  SpriteFrame,
  sys,
  AssetManager,
  assetManager,
  __private,
  js,
} from "cc";

export namespace ASTC {
  /** 纹理原始信息 */
  type IMemoryImageSource =
    __private._cocos_asset_assets_image_asset__IMemoryImageSource;

  /** 目标纹理格式 */
  export const TARGET_FORMAT = gfx.Format.ASTC_RGBA_6X6;

  var parseCompressedTextures_ = (<any>ImageAsset).parseCompressedTextures;

  /** 日志开关 */
  const dumpSwitcher = true;

  /** 输出内容 */
  function dump(log: string, ...args: any) {
    if (dumpSwitcher) console.log(log, ...args);
  }

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

  export function Init() {
    if (sys.isBrowser) return;

    // ----------------------------------------- ASTC 解析预备开始 -----------------------------------------
    const COMPRESSED_MIPMAP_MAGIC = 0x50494d43;
    const COMPRESSED_HEADER_LENGTH = 4;
    const COMPRESSED_MIPMAP_DATA_SIZE_LENGTH = 4;
    const COMPRESSED_MIPMAP_LEVEL_COUNT_LENGTH = 4;
    const ASTC_MAGIC = 0x5ca1ab13;
    const ASTC_HEADER_LENGTH = 16; // The header length
    const ASTC_HEADER_MAGIC = 4;
    const ASTC_HEADER_SIZE_X_BEGIN = 7;
    const ASTC_HEADER_SIZE_Y_BEGIN = 10;
    const CUSTOM_PIXEL_FORMAT = 1024;
    var Format = gfx.Format;

    function parseCompressedTextures(
      file: ArrayBuffer | ArrayBufferView,
      type: number
    ): IMemoryImageSource {
      const out: IMemoryImageSource = {
        _data: new Uint8Array(0),
        _compressed: true,
        width: 0,
        height: 0,
        format: 0,
        mipmapLevelDataSize: [],
      };

      const buffer = file instanceof ArrayBuffer ? file : file.buffer;
      const bufferView = new DataView(buffer);
      // Get a view of the arrayBuffer that represents compress header.
      const magicNumber = bufferView.getUint32(0, true);
      // Do some sanity checks to make sure this is a valid compress file.
      if (magicNumber === COMPRESSED_MIPMAP_MAGIC) {
        // Get a view of the arrayBuffer that represents compress document.
        const mipmapLevelNumber = bufferView.getUint32(
          COMPRESSED_HEADER_LENGTH,
          true
        );
        const mipmapLevelDataSize = bufferView.getUint32(
          COMPRESSED_HEADER_LENGTH + COMPRESSED_MIPMAP_LEVEL_COUNT_LENGTH,
          true
        );
        const fileHeaderByteLength =
          COMPRESSED_HEADER_LENGTH +
          COMPRESSED_MIPMAP_LEVEL_COUNT_LENGTH +
          mipmapLevelNumber * COMPRESSED_MIPMAP_DATA_SIZE_LENGTH;

        // Get a view of the arrayBuffer that represents compress chunks.
        parseCompressedTexture(
          file,
          0,
          fileHeaderByteLength,
          mipmapLevelDataSize,
          type,
          out
        );
        let beginOffset = fileHeaderByteLength + mipmapLevelDataSize;

        for (let i = 1; i < mipmapLevelNumber; i++) {
          const endOffset = bufferView.getUint32(
            COMPRESSED_HEADER_LENGTH +
              COMPRESSED_MIPMAP_LEVEL_COUNT_LENGTH +
              i * COMPRESSED_MIPMAP_DATA_SIZE_LENGTH,
            true
          );
          parseCompressedTexture(file, i, beginOffset, endOffset, type, out);
          beginOffset += endOffset;
        }
      } else {
        parseCompressedTexture(file, 0, 0, 0, type, out);
      }
      return out;
    }

    function parseCompressedTexture(
      file: ArrayBuffer | ArrayBufferView,
      levelIndex: number,
      beginOffset: number,
      endOffset: number,
      type: number,
      out: IMemoryImageSource
    ): void {
      parseASTCTexture(file, levelIndex, beginOffset, endOffset, out);
    }

    function parseASTCTexture(
      file: ArrayBuffer | ArrayBufferView,
      levelIndex: number,
      beginOffset: number,
      endOffset: number,
      out: IMemoryImageSource
    ): void {
      const buffer = file instanceof ArrayBuffer ? file : file.buffer;
      const header = new Uint8Array(buffer, beginOffset, ASTC_HEADER_LENGTH);

      const magicval =
        header[0] + (header[1] << 8) + (header[2] << 16) + (header[3] << 24);
      if (magicval !== ASTC_MAGIC) {
        throw new Error("Invalid magic number in ASTC header");
      }

      const xdim = header[ASTC_HEADER_MAGIC];
      const ydim = header[ASTC_HEADER_MAGIC + 1];
      const zdim = header[ASTC_HEADER_MAGIC + 2];
      if (
        (xdim < 3 ||
          xdim > 6 ||
          ydim < 3 ||
          ydim > 6 ||
          zdim < 3 ||
          zdim > 6) &&
        (xdim < 4 ||
          xdim === 7 ||
          xdim === 9 ||
          xdim === 11 ||
          xdim > 12 ||
          ydim < 4 ||
          ydim === 7 ||
          ydim === 9 ||
          ydim === 11 ||
          ydim > 12 ||
          zdim !== 1)
      ) {
        throw new Error("Invalid block number in ASTC header");
      }

      const format = getASTCFormat(xdim, ydim);
      const byteOffset = beginOffset + ASTC_HEADER_LENGTH;
      const length = endOffset - ASTC_HEADER_LENGTH;
      if (endOffset > 0) {
        const srcView = new Uint8Array(buffer, byteOffset, length);
        const dstView = new Uint8Array(
          out._data!.byteLength + srcView.byteLength
        );
        dstView.set(out._data as Uint8Array);
        dstView.set(srcView, out._data!.byteLength);
        out._data = dstView;
        out.mipmapLevelDataSize![levelIndex] = length;
      } else {
        out._data = new Uint8Array(buffer, byteOffset);
      }
      out.width =
        levelIndex > 0
          ? out.width
          : header[ASTC_HEADER_SIZE_X_BEGIN] +
            (header[ASTC_HEADER_SIZE_X_BEGIN + 1] << 8) +
            (header[ASTC_HEADER_SIZE_X_BEGIN + 2] << 16);
      out.height =
        levelIndex > 0
          ? out.height
          : header[ASTC_HEADER_SIZE_Y_BEGIN] +
            (header[ASTC_HEADER_SIZE_Y_BEGIN + 1] << 8) +
            (header[ASTC_HEADER_SIZE_Y_BEGIN + 2] << 16);
      out.format = format;
    }

    enum PixelFormat {
      /**
       * @en
       * 16-bit pixel format containing red, green and blue channels
       * @zh
       * 包含 RGB 通道的 16 位纹理。
       */
      RGB565 = Format.R5G6B5,
      /**
       * @en
       * 16-bit pixel format containing red, green, blue channels with 5 bits per channel and one bit alpha channel: RGB5A1
       * @zh
       * 包含 RGB（分别占 5 bits）和 1 bit 的 alpha 通道的 16 位纹理：RGB5A1。
       */
      RGB5A1 = Format.RGB5A1,
      /**
       * @en
       * 16-bit pixel format containing red, green, blue and alpha channels: RGBA4444
       * @zh
       * 包含 RGBA 通道的 16 位纹理：RGBA4444。
       */
      RGBA4444 = Format.RGBA4,
      /**
       * @en
       * 24-bit pixel format containing red, green and blue channels: RGB888
       * @zh
       * 包含 RGB 通道的 24 位纹理：RGB888。
       */
      RGB888 = Format.RGB8,
      /**
       * @en
       * 32-bit float pixel format containing red, green and blue channels: RGBA32F
       * @zh
       * 包含 RGB 通道的 32 位浮点数像素格式：RGBA32F。
       */
      RGB32F = Format.RGB32F,
      /**
       * @en
       * 32-bit pixel format containing red, green, blue and alpha channels: RGBA8888
       * @zh
       * 包含 RGBA 四通道的 32 位整形像素格式：RGBA8888。
       */
      RGBA8888 = Format.RGBA8,
      /**
       * @en
       * 32-bit float pixel format containing red, green, blue and alpha channels: RGBA32F
       * @zh
       * 32位浮点数像素格式：RGBA32F。
       */
      RGBA32F = Format.RGBA32F,
      /**
       * @en
       * 8-bit pixel format used as masks
       * @zh
       * 用作蒙版的8位纹理。
       */
      A8 = Format.A8,
      /**
       * @en
       * 8-bit intensity pixel format
       * @zh
       * 8位强度纹理。
       */
      I8 = Format.L8,
      /**
       * @en
       * 16-bit pixel format used as masks
       * @zh
       * 用作蒙版的16位纹理。
       */
      AI8 = Format.LA8,
      /**
       * @en A pixel format containing red, green, and blue channels that is PVR 2bpp compressed.
       * @zh 包含 RGB 通道的 PVR 2BPP 压缩纹理格式
       */
      RGB_PVRTC_2BPPV1 = Format.PVRTC_RGB2,
      /**
       * @en A pixel format containing red, green, blue, and alpha channels that is PVR 2bpp compressed.
       * @zh 包含 RGBA 通道的 PVR 2BPP 压缩纹理格式
       */
      RGBA_PVRTC_2BPPV1 = Format.PVRTC_RGBA2,
      /**
       * @en A pixel format containing red, green, blue, and alpha channels that is PVR 2bpp compressed.
       * RGB_A_PVRTC_2BPPV1 texture is a 2x height RGB_PVRTC_2BPPV1 format texture.
       * It separate the origin alpha channel to the bottom half atlas, the origin rgb channel to the top half atlas.
       * @zh 包含 RGBA 通道的 PVR 2BPP 压缩纹理格式
       * 这种压缩纹理格式贴图的高度是普通 RGB_PVRTC_2BPPV1 贴图高度的两倍，使用上半部分作为原始 RGB 通道数据，下半部分用来存储透明通道数据。
       */
      RGB_A_PVRTC_2BPPV1 = CUSTOM_PIXEL_FORMAT,
      /**
       * @en A pixel format containing red, green, and blue channels that is PVR 4bpp compressed.
       * @zh 包含 RGB 通道的 PVR 4BPP 压缩纹理格式
       */
      RGB_PVRTC_4BPPV1 = Format.PVRTC_RGB4,
      /**
       * @en A pixel format containing red, green, blue and alpha channels that is PVR 4bpp compressed.
       * @zh 包含 RGBA 通道的 PVR 4BPP 压缩纹理格式
       */
      RGBA_PVRTC_4BPPV1 = Format.PVRTC_RGBA4,
      /**
       * @en A pixel format containing red, green, blue, and alpha channels that is PVR 4bpp compressed.
       * RGB_A_PVRTC_4BPPV1 texture is a 2x height RGB_PVRTC_4BPPV1 format texture.
       * It separate the origin alpha channel to the bottom half atlas, the origin rgb channel to the top half atlas.
       * @zh 包含 RGBA 通道的 PVR 4BPP 压缩纹理格式
       * 这种压缩纹理格式贴图的高度是普通 RGB_PVRTC_4BPPV1 贴图高度的两倍，使用上半部分作为原始 RGB 通道数据，下半部分用来存储透明通道数据。
       */
      RGB_A_PVRTC_4BPPV1 = CUSTOM_PIXEL_FORMAT + 1,
      /**
       * @en A pixel format containing red, green, and blue channels that is ETC1 compressed.
       * @zh 包含 RGB 通道的 ETC1 压缩纹理格式
       */
      RGB_ETC1 = Format.ETC_RGB8,
      /**
       * @en A pixel format containing red, green, blue, and alpha channels that is ETC1 compressed.
       * @zh 包含 RGBA 通道的 ETC1 压缩纹理格式
       */
      RGBA_ETC1 = CUSTOM_PIXEL_FORMAT + 2,
      /**
       * @en A pixel format containing red, green, and blue channels that is ETC2 compressed.
       * @zh 包含 RGB 通道的 ETC2 压缩纹理格式
       */
      RGB_ETC2 = Format.ETC2_RGB8,
      /**
       * @en A pixel format containing red, green, blue, and alpha channels that is ETC2 compressed.
       * @zh 包含 RGBA 通道的 ETC2 压缩纹理格式
       */
      RGBA_ETC2 = Format.ETC2_RGBA8,

      /**
       * @en A pixel format containing red, green, blue, and alpha channels that is ASTC compressed with 4x4 block size.
       * @zh 包含 RGBA 通道的 ASTC 压缩纹理格式，压缩分块大小为 4x4
       */
      RGBA_ASTC_4x4 = Format.ASTC_RGBA_4X4,
      /**
       * @en A pixel format containing red, green, blue, and alpha channels that is ASTC compressed with 5x4 block size.
       * @zh 包含 RGBA 通道的 ASTC 压缩纹理格式，压缩分块大小为 5x4
       */
      RGBA_ASTC_5x4 = Format.ASTC_RGBA_5X4,
      /**
       * @en A pixel format containing red, green, blue, and alpha channels that is ASTC compressed with 5x5 block size.
       * @zh 包含 RGBA 通道的 ASTC 压缩纹理格式，压缩分块大小为 5x5
       */
      RGBA_ASTC_5x5 = Format.ASTC_RGBA_5X5,
      /**
       * @en A pixel format containing red, green, blue, and alpha channels that is ASTC compressed with 6x5 block size.
       * @zh 包含 RGBA 通道的 ASTC 压缩纹理格式，压缩分块大小为 6x5
       */
      RGBA_ASTC_6x5 = Format.ASTC_RGBA_6X5,
      /**
       * @en A pixel format containing red, green, blue, and alpha channels that is ASTC compressed with 6x6 block size.
       * @zh 包含 RGBA 通道的 ASTC 压缩纹理格式，压缩分块大小为 6x6
       */
      RGBA_ASTC_6x6 = Format.ASTC_RGBA_6X6,
      /**
       * @en A pixel format containing red, green, blue, and alpha channels that is ASTC compressed with 8x5 block size.
       * @zh 包含 RGBA 通道的 ASTC 压缩纹理格式，压缩分块大小为 8x5
       */
      RGBA_ASTC_8x5 = Format.ASTC_RGBA_8X5,
      /**
       * @en A pixel format containing red, green, blue, and alpha channels that is ASTC compressed with 8x6 block size.
       * @zh 包含 RGBA 通道的 ASTC 压缩纹理格式，压缩分块大小为 8x6
       */
      RGBA_ASTC_8x6 = Format.ASTC_RGBA_8X6,
      /**
       * @en A pixel format containing red, green, blue, and alpha channels that is ASTC compressed with 8x8 block size.
       * @zh 包含 RGBA 通道的 ASTC 压缩纹理格式，压缩分块大小为 8x8
       */
      RGBA_ASTC_8x8 = Format.ASTC_RGBA_8X8,
      /**
       * @en A pixel format containing red, green, blue, and alpha channels that is ASTC compressed with 10x5 block size.
       * @zh 包含 RGBA 通道的 ASTC 压缩纹理格式，压缩分块大小为 10x5
       */
      RGBA_ASTC_10x5 = Format.ASTC_RGBA_10X5,
      /**
       * @en A pixel format containing red, green, blue, and alpha channels that is ASTC compressed with 10x6 block size.
       * @zh 包含 RGBA 通道的 ASTC 压缩纹理格式，压缩分块大小为 10x6
       */
      RGBA_ASTC_10x6 = Format.ASTC_RGBA_10X6,
      /**
       * @en A pixel format containing red, green, blue, and alpha channels that is ASTC compressed with 10x8 block size.
       * @zh 包含 RGBA 通道的 ASTC 压缩纹理格式，压缩分块大小为 10x8
       */
      RGBA_ASTC_10x8 = Format.ASTC_RGBA_10X8,
      /**
       * @en A pixel format containing red, green, blue, and alpha channels that is ASTC compressed with 10x10 block size.
       * @zh 包含 RGBA 通道的 ASTC 压缩纹理格式，压缩分块大小为 10x10
       */
      RGBA_ASTC_10x10 = Format.ASTC_RGBA_10X10,
      /**
       * @en A pixel format containing red, green, blue, and alpha channels that is ASTC compressed with 12x10 block size.
       * @zh 包含 RGBA 通道的 ASTC 压缩纹理格式，压缩分块大小为 12x10
       */
      RGBA_ASTC_12x10 = Format.ASTC_RGBA_12X10,
      /**
       * @en A pixel format containing red, green, blue, and alpha channels that is ASTC compressed with 12x12 block size.
       * @zh 包含 RGBA 通道的 ASTC 压缩纹理格式，压缩分块大小为 12x12
       */
      RGBA_ASTC_12x12 = Format.ASTC_RGBA_12X12,
    }

    function getASTCFormat(xdim, ydim) {
      if (xdim === 4) {
        return PixelFormat.RGBA_ASTC_4x4;
      }
      if (xdim === 5) {
        if (ydim === 4) {
          return PixelFormat.RGBA_ASTC_5x4;
        }
        return PixelFormat.RGBA_ASTC_5x5;
      }
      if (xdim === 6) {
        if (ydim === 5) {
          return PixelFormat.RGBA_ASTC_6x5;
        }
        return PixelFormat.RGBA_ASTC_6x6;
      }
      if (xdim === 8) {
        if (ydim === 5) {
          return PixelFormat.RGBA_ASTC_8x5;
        }
        if (ydim === 6) {
          return PixelFormat.RGBA_ASTC_8x6;
        }
        return PixelFormat.RGBA_ASTC_8x8;
      }
      if (xdim === 10) {
        if (ydim === 5) {
          return PixelFormat.RGBA_ASTC_10x5;
        }
        if (ydim === 6) {
          return PixelFormat.RGBA_ASTC_10x6;
        }
        if (ydim === 8) {
          return PixelFormat.RGBA_ASTC_10x8;
        }
        return PixelFormat.RGBA_ASTC_10x10;
      }
      if (ydim === 10) {
        return PixelFormat.RGBA_ASTC_12x10;
      }
      return PixelFormat.RGBA_ASTC_12x12;
    }

    parseCompressedTextures_ = parseCompressedTextures;
    // ----------------------------------------- ASTC 解析预备结束 -----------------------------------------

    type Downloader = AssetManager.Downloader & {
      _downloadArrayBuffer: (
        url: string,
        options: Record<string, any>,
        oncomplete: (err: Error | null, data?: any) => void
      ) => void;
    };
    const downloader = assetManager.downloader as Downloader;
    const parser = assetManager.parser;
    const factory = assetManager.factory;
    downloader.register(".astc", (url, options, oncomplete) => {
      downloader._downloadArrayBuffer(
        url,
        options,
        (err: any, data: ArrayBuffer) => {
          data && dump("ASTC下载成功", url, js.getClassName(data));
          oncomplete && oncomplete(err, { file: data, url });
        }
      );
    });
    parser.register(".astc", function (data, options, oncomplete) {
      if (data && data.file instanceof ArrayBuffer) {
        const u8 = new Uint8Array(data.file);
        const astc = parseCompressedTextures(u8, 2);
        dump("ASTC解析成功", data.url, js.getClassName(astc));
        oncomplete && oncomplete(null, { file: astc, url: data.url });
      } else {
        dump("ASTC解析失败", data.url);
        oncomplete && oncomplete(null, null);
      }
    });
    // 注册 astc 资源工厂
    factory.register(".astc", (id, data, options, onComplete) => {
      let out: ImageAsset | null = null;
      let err: Error | null = null;
      try {
        out = new ImageAsset();
        out._nativeUrl = id;
        out._nativeAsset = data.file;
        dump("ASTC创建压成功", data.url, out);
      } catch (e) {
        err = e as Error;
        dump("ASTC创建失败", data.url);
      }
      onComplete(err, out);
    });
  }

  /**
   * 创建精灵帧
   * @param info 压缩纹理原始信息
   */
  export function CreateSpriteFrameByInfo(
    info: IMemoryImageSource | ImageAsset
  ) {
    dump("创建精灵帧", info);
    if (info instanceof ImageAsset) {
      return createWithImageAsset(info);
    } else if (IsFormatSuported(info.format)) {
      const image = parseCompressedTextures_(info._data.buffer, 2);
      return createWithImageAsset(image);
    }
    return null;
  }

  /** 根据 ImageAsset 创建精灵帧 */
  function createWithImageAsset(image: ImageAsset) {
    return SpriteFrame.createWithImage(image);
  }
}
