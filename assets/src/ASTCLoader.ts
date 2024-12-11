import { _decorator, BufferAsset, Color, Component, gfx, ImageAsset, Label, resources, Sprite, SpriteFrame } from "cc";
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
            resources.load(EXTENSIONS.ASTC, (err, asset) => {
                if (err) return console.error(err);
                this.sprite.spriteFrame = ASTC.CreateSpriteFrame(asset);
            });
        } else {
            this.title.string = "ASTC is not supported on this platform!";
            this.title.color = Color.RED;
            resources.load(EXTENSIONS.PNG + "/spriteFrame", SpriteFrame, (err, asset) => {
                if (err) return console.error(err);
                this.sprite.spriteFrame = asset;
            });
        }
    }
}
