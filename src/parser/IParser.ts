import {IParsedObject} from "./IParsedObject";

export interface IParser {
    parse(body: string): IParsedObject
}
