import {BuildHelper} from "./BuildHelper";
import {IBuilder} from "./IBuilder";
import {IHtmlVariables} from "../common/IHtmlVariable";
import {IParsedObject} from "../parser/IParsedObject";
import {IParser} from "../parser/IParser";

// *fsIf="value" -> view if value is true
// *fsFor="element of iterableElement" -> create field element from iterableElement

export class Builder implements IBuilder {
    private initialElement!: IParsedObject;

    set parser(parser: IParser){
        BuildHelper.Parser = parser;
    }

    constructor(public readonly root: string) {}

    async build(body: string, variables: IHtmlVariables): Promise<string> {
        this.initialElement = BuildHelper.Parser.parse(body)

        if (!this.initialElement) {
            throw new Error('Not Found Initial Element');
        }

        await BuildHelper.ImportStrategy(this.root, this.initialElement);
        const res = BuildHelper.BuildStrategy(this.initialElement, variables);

        if (!res) return '';

        return res;
    }
}
