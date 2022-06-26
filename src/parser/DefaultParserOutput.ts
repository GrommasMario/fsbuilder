import {IParsedObject, IParsedResult} from "./IParsedObject";

export class DefaultParserOutput implements IParsedObject {
    attribute: Map<string, string> = new Map();
    children: IParsedResult[] = [];
    tagName: string = 'fs-empty';
}
