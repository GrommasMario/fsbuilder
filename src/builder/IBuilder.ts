import {IHtmlVariables} from "../common/IHtmlVariable";

export interface IBuilder {
    build(body: string, variables: IHtmlVariables): string | Promise<string>;
}
