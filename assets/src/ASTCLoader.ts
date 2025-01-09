import {
  _decorator,
  assetManager,
  Color,
  Component,
  ImageAsset,
  Label,
  resources,
  Sprite,
  SpriteFrame,
  sys,
} from "cc";
import { ASTC } from "./ASTC";
const { ccclass, property } = _decorator;
const EXTENSIONS = { PNG: "CE_PNG", ASTC: "CE_ASTC" };
const REMOTE_ADDR = "http://192.168.1.172:3700/astc/CE_ASTC.astc";

@ccclass("ASTCLoader")
export class ASTCLoader extends Component {
  @property(Sprite)
  sprite: Sprite = null;

  @property(Label)
  title: Label = null;

  start() {
    console.log("操作系统", sys.os);
    console.log("是否原生", sys.isNative);
    console.log("是否浏览器", sys.isBrowser);
    console.log("是否移动端", sys.isMobile);

    ASTC.Init();

    if (ASTC.IsPlatformSupported()) {
      this.title.string = "ASTC is supported on this platform.";
      this.title.color = Color.GREEN;
      this.dynamicLoadAstc();
      setTimeout(() => {
        this.remoteLoadAstc();
      }, 3000);
      setTimeout(() => {
        this.anyLoadAstc();
      }, 60000);
    } else {
      this.title.string = "ASTC is not supported on this platform!";
      this.title.color = Color.RED;
      this.dynamicLoadImage();
    }
  }

  /** 动态加载普通图像 */
  private dynamicLoadImage() {
    resources.load(
      EXTENSIONS.PNG + "/spriteFrame",
      SpriteFrame,
      (err, asset) => {
        if (err) return console.error(err);
        this.sprite.spriteFrame = asset;
      }
    );
  }

  /** 通过 resources.load 加载 */
  private dynamicLoadAstc() {
    resources.load(EXTENSIONS.ASTC, (err, data: any) => {
      if (err) return console.error(err);
      this.title.string = "通过 resources.load 加载成功！";
      const info = sys.isBrowser ? data._file : data._file["file"];
      this.sprite.spriteFrame = ASTC.CreateSpriteFrameByInfo(info);
    });
  }

  /** 通过 loadAny 加载 */
  private anyLoadAstc() {
    assetManager.loadAny({ url: REMOTE_ADDR }, (err, data) => {
      if (err) return console.error(err);
      const info = sys.isBrowser ? data : data.file;
      this.sprite.spriteFrame = ASTC.CreateSpriteFrameByInfo(info);
      this.title.string = "通过 loadAny 加载成功！";
    });
  }

  /** 通过 loadRemote 加载 */
  private remoteLoadAstc() {
    assetManager.loadRemote(REMOTE_ADDR, (err, data: any) => {
      if (err) return console.error(err);
      const info = data instanceof ImageAsset ? data : data._nativeData;
      const frame = ASTC.CreateSpriteFrameByInfo(info);
      this.sprite.spriteFrame = frame;
      this.title.string = "通过 loadRemote 加载成功！";
    });
  }
}
