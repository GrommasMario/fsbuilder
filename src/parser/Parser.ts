import {IParser} from "./IParser";
import {IParsedObject, IParsedResult} from "./IParsedObject";
import {DefaultParserOutput} from "./DefaultParserOutput";
import {EmptyTags} from "../common/EmptyTags";

export class Parser implements IParser {
    private position = -1;
    private body!: string;

    constructor() {}

    parse(body: string): IParsedObject {
        this.body = body;
        this.clearComment();

        const defaultParse = new DefaultParserOutput()
        defaultParse.children = this.parseNodes();
        this.position = -1;
        return defaultParse;
    }

    private parseError(error: string) {
        const str = this.body.substring(
            this.position - 200 || 0,
            this.position + 200 > this.body.length ? this.body.length : this.position + 100,
        );
        console.log('...', str, '...');
        console.log('Position: ', this.position);
        console.error(error);
    }

    private clearComment(): void {
        this.body = this.body.replace(/<!--.*-->/gm, '');
    }

    private nextChar(): string {
        return this.body.charAt(this.position + 1);
    }

    private eof(): boolean {
        return this.body.length <= this.position;
    }

    private consumeChar(): string {
        this.position += 1;

        return this.body.charAt(this.position);
    }

    private consumeWhile(char: string[]) {
        const result: string[] = [];
        while (!this.eof() && char.includes(this.nextChar())) {
            result.push(this.consumeChar());
        }

        return result.join('');
    }
    private consumeWhileNot(char: string[]) {
        const result: string[] = [];
        while (!this.eof() && !char.includes(this.nextChar())) {
            result.push(this.consumeChar());
        }

        return result.join('');
    }

    private consumeWhileNotFs(): string {
        const result: string[] = [];
        while (true) {
            if (!this.eof()) {
                if (['<'].includes(this.nextChar())) {
                    break;
                }

                result.push(this.consumeChar());
            } else {
                break;
            }
        }

        return result.join('');
    }

    private consumeWhiteSpace() {
        return this.consumeWhile([' ', '\n']);
    }

    private parseNode(): IParsedResult {
        const char = this.nextChar();
        if (char === '<') {
            return this.parseElement();
        }

        return this.parseText();
    }

    private parseNodes(): IParsedResult[] {
        const nodes: IParsedResult[] = [];

        while (true) {
            this.consumeWhiteSpace();
            if (this.eof() || this.body.startsWith('</', this.position + 1)) {
                break;
            }
            nodes.push(this.parseNode());
        }

        return nodes;
    }

    private parseElement(): IParsedObject {
        this.consumeChar(); // Char start
        const tagName = this.parseTagName();
        const attribute = this.parseAttributes();
        this.consumeChar(); // Char end

        let children: IParsedResult[] = [];
        if(!EmptyTags.has(tagName)){{
            children = this.parseNodes();

            if (!this.eof()) {
                if (this.consumeChar() !== '<') throw new Error('<') && this.parseError('expected <');
                if (this.consumeChar() !== '/') throw new Error('/') && this.parseError('expected /');
                if (this.parseTagName() !== tagName)
                    throw new Error(`tag ${tagName}`) && this.parseError(`tag ${tagName}`);
                if (this.consumeChar() !== '>') throw new Error('>') && this.parseError('expected >');
            }
        }
        } else {
            this.consumeWhiteSpace();
        }

        return {
            tagName,
            attribute,
            children,
            // variables: this.htmlVariable,
        };
    }

    private parseTagName(): string {
        return this.consumeWhileNot([' ', '\n', '>']);
    }

    private parseAttributeName(): string {
        return this.consumeWhileNot([' ', '=']);
    }

    private parseAttributes(): Map<string, any> {
        const attributes = new Map<string, any>();
        while (true) {
            this.consumeWhiteSpace();
            if (this.nextChar() === '>') {
                break;
            }
            const [key, value] = this.parseAttr();

            attributes.set(key, value);
        }

        return attributes;
    }

    private parseAttrValue(): string {
        const char = this.consumeChar();
        let result = '';

        if (char === `"`) {
            result = this.consumeWhileNot([`"`]);
            this.consumeChar();
        } else if (char === `'`) {
            result = this.consumeWhileNot([`'`]);
            this.consumeChar();
        } else {
            throw new Error('expectly quote');
        }

        return result;
    }

    private parseAttr(): [string, string] {
        const key = this.parseAttributeName();

        if (this.consumeChar() !== '=') {
            throw new Error('= in attribute') && this.parseError('= in attribute');
        }

        const value = this.parseAttrValue();

        return [key, value];
    }

    private parseText(): string {
        return this.consumeWhileNotFs();
    }
}
