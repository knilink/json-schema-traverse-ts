import { JSONSchema7Definition, JSONSchema7 } from 'json-schema';

declare type Hook = (
  schema: JSONSchema7Definition,
  jsonPtr: string,
  rootSchema: JSONSchema7,
  parentJsonPtr?: string,
  parentKeyword?: string,
  parentSchema?: JSONSchema7Definition,
  keyIndex?: string | number
) => void;

interface Options {
  allKeys?: boolean;
  cb?: { pre?: Hook; post?: Hook } | Hook;
}

const keywords: (keyof Pick<
  JSONSchema7,
  'additionalItems' | 'items' | 'contains' | 'additionalProperties' | 'propertyNames' | 'not' | 'if' | 'then' | 'else'
>)[] = ['additionalItems', 'items', 'contains', 'additionalProperties', 'propertyNames', 'not', 'if', 'then', 'else'];

const arrayKeywords: (keyof Pick<JSONSchema7, 'items' | 'allOf' | 'anyOf' | 'oneOf'>)[] = [
  'items',
  'allOf',
  'anyOf',
  'oneOf',
];

const propsKeywords: (keyof Pick<
  JSONSchema7,
  'definitions' | 'properties' | 'patternProperties' | 'dependencies'
>)[] = ['definitions', 'properties', 'patternProperties', 'dependencies'];

export function traverse(schema: JSONSchema7, opts: Options | Hook, cb?: Hook) {
  const _opts: Options = typeof opts === 'function' ? { cb: opts } : typeof cb === 'function' ? { ...opts, cb } : opts;

  const _cb = _opts.cb || function() {};

  const pre = typeof _cb === 'function' ? _cb : _cb.pre || function() {};
  const post = (typeof _cb !== 'function' && _cb.post) || function() {};

  _traverse(_opts, pre, post, schema, '', schema);
}

function _traverse(
  opts: Options,
  pre: Hook,
  post: Hook,
  schema: JSONSchema7Definition,
  jsonPtr: string,
  rootSchema: JSONSchema7,
  parentJsonPtr?: string,
  parentKeyword?: string,
  parentSchema?: JSONSchema7Definition,
  keyIndex?: string | number
) {
  if (schema && typeof schema === 'object' && !Array.isArray(schema)) {
    pre(schema, jsonPtr, rootSchema, parentJsonPtr, parentKeyword, parentSchema, keyIndex);
    for (const key of propsKeywords) {
      const sch: { [key: string]: JSONSchema7Definition | string[] } | undefined = schema[key];
      if (sch && typeof sch == 'object') {
        for (const prop in sch) {
          const child = sch[prop];
          if (Array.isArray(child) || typeof child !== 'object') continue;
          _traverse(
            opts,
            pre,
            post,
            child,
            jsonPtr + '/' + key + '/' + escapeJsonPtr(prop),
            rootSchema,
            jsonPtr,
            key,
            schema,
            prop
          );
        }
      }
    }

    for (const key of arrayKeywords) {
      const sch: JSONSchema7Definition[] | JSONSchema7Definition | undefined = schema[key];
      if (!Array.isArray(sch)) continue;
      for (const i in Array.isArray(sch) ? sch : [sch]) {
        _traverse(opts, pre, post, sch[i], jsonPtr + '/' + key + '/' + i, rootSchema, jsonPtr, key, schema, i);
      }
    }

    for (const key of keywords) {
      const sch: JSONSchema7Definition[] | JSONSchema7Definition | undefined = schema[key];
      if (!sch || Array.isArray(sch)) continue;
      _traverse(opts, pre, post, sch, jsonPtr + '/' + key, rootSchema, jsonPtr, key, schema);
    }
    post(schema, jsonPtr, rootSchema, parentJsonPtr, parentKeyword, parentSchema, keyIndex);
  }
}

function escapeJsonPtr(str: string): string {
  return str.replace(/~/g, '~0').replace(/\//g, '~1');
}

export default traverse;
