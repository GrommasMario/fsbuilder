import {BuildPipes} from "./BuildPipes";
import * as fs from 'fs';
import {IHtmlVariables} from "../common/IHtmlVariable";
import {IParsedObject} from "../parser/IParsedObject";
import {Parser} from "../parser/Parser";
import {IParser} from "../parser/IParser";
import {EmptyTags} from "../common/EmptyTags";

const ReadFile = function (path: string): Promise<string> {
    return new Promise((resolve, reject) => {
        fs.readFile(path, (err, data) => {
            if (err) {
                reject(err);

                return;
            }

            resolve(String(data));

            return;
        });
    });
}

const ValueParser = function(path: string, variables: any): boolean {
    let el: any = variables;

    for (const splitElement of path.split('.')) {
        el = el[splitElement];
    }

    return el;
}

const LoadTemplate = async function (path: string): Promise<IParsedObject> {
    const template = await ReadFile(path);

    if (!template) {
        throw new Error(`Not Found Template on path: ${path}`);
    }

    return BuildHelper.Parser.parse(template);
}

const ProcessImport = async function (rootPath: string, template: IParsedObject) {
    if (template.tagName === 'fs-import') {
        const templatePath = template.attribute.get('path');

        if (!templatePath) {
            throw new Error('Path should be include in fs-import');
        }

        template.attribute.delete('path');
        template.children.push(await LoadTemplate(require('path').join(rootPath, templatePath)));
    }

    if (template.children.length) {
        const toPromise = template.children.filter(v => typeof v !== 'string') as IParsedObject[];

        await Promise.all(toPromise.map(v => ProcessImport(rootPath, v)));
    }
}

const BuildAttributes = (attribute: Map<string, any>, variables: IHtmlVariables): Map<string, string> => {
    const result = new Map<string, string>();

    attribute.forEach((attributeValue, attributeName) => {
        result.set(attributeName, BuildHelper.ReplaceVariableStrategy(attributeValue, variables));
    });

    return result;
}

const FormatOutputTag = (v: IParsedObject, value: string): string => {
    if (v.tagName === 'fs-import') {
        return value;
    }
    if (v.tagName === 'fs-empty') {
        return value;
    }

    const attributes = new Map(v.attribute);
    attributes.delete('*fsIf');
    attributes.delete('*fsFor');

    let closeTag = ''
    if(!EmptyTags.has(v.tagName)){
        closeTag = `</${v.tagName}>`
    }

    return `<${v.tagName} ${Array.from(attributes, ([k, v]) => `${k}="${v}"`).join(
        ' ',
    )}>\n${value}\n${closeTag}\n`;
}

const BuildTag = (tag: IParsedObject, variables: IHtmlVariables): string => {
    tag.attribute = new Map(tag.attribute);

    if (tag.attribute.has('*fsIf')) {
        const value = tag.attribute.get('*fsIf') as string;
        const result = Boolean(ValueParser(value, variables))

        if (!result) return '';
    }

    if (tag.attribute.has('*fsFor')) {
        const value = tag.attribute.get('*fsFor');

        const [alias, type, array] = value?.split(' ') || [];

        if (!alias) {
            throw new Error('Need alias in fsFor construction');
        }
        if (!type) {
            throw new Error('Need type [of, in] in fsFor construction');
        }
        if (!array) {
            throw new Error('Need array in fsFor construction');
        }

        const iterableObject = ProcessValueFromObject(variables, array);

        if (!Array.isArray(iterableObject)) {
            throw new Error('Value must be Array type in fsFor construction');
        }

        const arrayBuild = [];
        for (const element of iterableObject) {
            const updatedChild = { ...tag, attribute: new Map(tag.attribute) };
            const variableWithAlias = {
                ...variables,
                [alias]: element,
            }

            updatedChild.attribute.delete('*fsFor');

            updatedChild.attribute = BuildAttributes(updatedChild.attribute, variableWithAlias)
            arrayBuild.push(BuildTag(updatedChild, variableWithAlias));
        }

        return arrayBuild.join('');
    } else {
        BuildAttributes(tag.attribute, variables)
    }

    return FormatOutputTag(tag, tag.children
        .map(v => {
            if(typeof v === 'string'){
                return ReplaceVariablesOrFail(v, variables);
            }

            return BuildTag(v, variables);
        })
        .join('')
    )
}

const ProcessValueFromObject = (object: any, variable: string): unknown => {
    const variablePathKeys = variable.split('.');

    let pipeExist = false;
    let pipes = variable.split(' | ');

    if (pipes.length > 1) {
        pipeExist = true;
        variable = pipes.shift()!;
        pipes = pipes.map(v => v.trim());
    }

    let value: unknown = undefined;
    try {
        console.log(object)
        value = ValueParser(variable, object);
    } catch (e) {
        console.error(e);
        console.log('variables', object);
        throw new Error(
            `Cannot read properties of undefined ( reading '${variablePathKeys.join('.')}')`,
        );
    }

    if (typeof value === 'function') {
        throw new Error(`Properties is function ( checking '${variablePathKeys.join('.')}')`);
    }

    if (value === undefined) {
        console.error(`Properties of undefined ( checking '${variablePathKeys.join('.')}')`);
    }

    if (pipeExist) {
        pipes.forEach(pipe => (value = BuildHelper.Pipes.get(pipe)(value)));
    }

    return value;
}

const FindVariablePoint = (html: string): Set<string> => {
    const variables: Set<string> = new Set();
    let pointer = 0;

    while (pointer < html.length) {
        if (html[pointer] === '{' && html[pointer + 1] === '{') {
            pointer += 2;
            const variable: string[] = [];
            let existed = 2;
            while (existed !== 0) {
                if (html[pointer] === '}') {
                    existed = existed - 1;
                    if (existed === 0) {
                        const prePush = variable.join('');
                        if (prePush !== '') {
                            variables.add(prePush);
                        }
                    }
                } else {
                    variable.push(html[pointer]);
                }
                pointer += 1;
            }
        }

        pointer += 1;
    }

    return variables;
}

const ReplaceVariablesOrFail = (html: string, variables: IHtmlVariables): string => {
    let newHtml = html;
    const variablePoints = FindVariablePoint(newHtml);

    variablePoints.forEach(variableToReplace => {
        const value = BuildHelper.ValueFromObject(variables, variableToReplace);

        if (value === undefined) {
            throw new Error(`Variable is undefined: ${variableToReplace}`);
        }
        if (variableToReplace.split('|').length > 1) {
            variableToReplace = variableToReplace.replace(/\|/gm, '\\|');
        }
        if (variableToReplace.split('[').length > 1) {
            variableToReplace = variableToReplace.replace(/\[/gm, '\\[');
        }

        const regex = new RegExp(`{{${variableToReplace}}}`, 'gm');
        newHtml = newHtml.replace(regex, String(value));
    });

    return newHtml;
}

export abstract class BuildHelper {
    static Parser: IParser = new Parser();
    static ImportStrategy = ProcessImport;
    static ReplaceVariableStrategy: (html: string, variables: IHtmlVariables) => string = ReplaceVariablesOrFail;
    static BuildStrategy: (tag: IParsedObject, variables: IHtmlVariables) => string = BuildTag;
    static ValueFromObject: (object: IHtmlVariables, path: string) => unknown = ProcessValueFromObject;
    static readonly Pipes = BuildPipes
}
