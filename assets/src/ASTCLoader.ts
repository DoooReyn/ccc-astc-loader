import {
  _decorator,
  assetManager,
  Color,
  Component,
  Label,
  resources,
  Sprite,
  SpriteFrame,
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
    if (ASTC.IsPlatformSupported()) {
      this.title.string = "ASTC is supported on this platform.";
      this.title.color = Color.GREEN;
      this.dynamicLoadAstc();
      setTimeout(() => {
        this.remoteLoadAstc();
      }, 2000);
      setTimeout(() => {
        this.anyLoadAstc();
      }, 4000);
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
}
