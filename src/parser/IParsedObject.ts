export type IParsedResult = IParsedObject | string

export interface IParsedObject {
    tagName: string;
    attribute: Map<string, string>;
    children: IParsedResult[]
}

