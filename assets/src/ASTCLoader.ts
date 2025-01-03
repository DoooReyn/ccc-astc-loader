import {
  _decorator,
  assetManager,
  BufferAsset,
  Color,
  Component,
  gfx,
  ImageAsset,
  Label,
  resources,
  Sprite,
  SpriteFrame,
} from "cc";
import { ASTC } from "./ASTC";
const { ccclass, property } = _decorator;
const EXTENSIONS = { PNG: "CE_PNG", ASTC: "CE_ASTC" };

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

  private anyLoadAstc() {
    assetManager.loadAny(
      { url: "http://192.168.1.172:3700/astc/CE_ASTC.astc" },
      (err, data) => {
        if (err) return console.error(err);
        console.log("远程", data);
        this.sprite.spriteFrame = ASTC.CreateSpriteFrameByInfo(data);
        this.title.string = "loadAny 创建成功！";
      }
    );
  }

  private remoteLoadAstc() {
    assetManager.loadRemote(
      "http://192.168.1.172:3700/astc/CE_ASTC.astc",
      (err, data) => {
        if (err) return console.error(err);
        console.log("远程", data);
        this.sprite.spriteFrame = ASTC.CreateSpriteFrameFromRemote(data);
        this.title.string = "loadRemote 创建成功！";
      }
    );
  }

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

  private dynamicLoadAstc() {
    resources.load(EXTENSIONS.ASTC, (err, asset) => {
      if (err) return console.error(err);
      console.log("动态", asset);
      this.title.string = "resources 创建成功！";
      this.sprite.spriteFrame = ASTC.CreateSpriteFrameFromDynamic(asset);
    });
  }
}
